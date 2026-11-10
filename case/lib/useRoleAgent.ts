"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { runAgent, describeError, type AgentMessage, type PendingQuestion } from "./agent";
import { QUICK_PROMPTS, pickRecording, playRecording, saveLocalRecording } from "./fallback";
import { KEY_STORAGE, readLocal, takeRateLimitSlot, writeLocal } from "./storage";
import type { AgentEvent, Bundle } from "./types";

/** Et svar består af dele i den rækkefølge, de kom */
export type Part =
  | { type: "text"; text: string }
  | { type: "thinking"; text: string }
  | { type: "tool"; id: string; label: string; detail?: string; summary?: string; ok?: boolean }
  | { type: "bundle"; bundle: Bundle }
  | { type: "question"; id: string; intro?: string; questions: { question: string; options: string[] }[] };

export type AssistantItem = {
  id: number;
  role: "assistant";
  parts: Part[];
  done: boolean;
  source: "live" | "recorded";
  notice?: string;
  error?: string;
  /** Agenten er ikke tændt i denne browser, og der er intet gemt forløb */
  needsKey?: boolean;
};
export type ChatItem = { id: number; role: "user"; text: string } | AssistantItem;

const SLOW_MS = 20_000;
let nextId = 1;
const newAssistant = (source: "live" | "recorded"): AssistantItem => ({ id: nextId++, role: "assistant", parts: [], done: false, source });

export function useRoleAgent() {
  const [items, setItems] = useState<ChatItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [apiKey, setApiKeyState] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const history = useRef<AgentMessage[]>([]);
  const pending = useRef<PendingQuestion | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  /** Optagelse af et af de tre eksempler, så det kan bruges som reserve */
  const recording = useRef<{ quickId: string; events: AgentEvent[] } | null>(null);

  useEffect(() => {
    setApiKeyState(readLocal(KEY_STORAGE));
    setOffline(new URLSearchParams(window.location.search).get("offline") === "1");
  }, []);

  const setApiKey = useCallback((key: string | null) => {
    writeLocal(KEY_STORAGE, key);
    setApiKeyState(key);
  }, []);

  const live = !!apiKey && !offline;

  const updateLast = useCallback((fn: (a: AssistantItem) => Partial<AssistantItem>) => {
    setItems((prev) => {
      const i = prev.length - 1;
      const last = prev[i];
      if (last?.role !== "assistant") return prev;
      const copy = [...prev];
      copy[i] = { ...last, ...fn(last) };
      return copy;
    });
  }, []);

  const handleEvent = useCallback(
    (e: AgentEvent) => {
      switch (e.type) {
        case "thinking":
        case "text": {
          const kind = e.type;
          const add = e.delta;
          updateLast((a) => {
            const last = a.parts[a.parts.length - 1];
            if (last?.type === kind) return { parts: [...a.parts.slice(0, -1), { type: kind, text: last.text + add }] };
            return { parts: [...a.parts, { type: kind, text: add }] };
          });
          break;
        }
        case "tool_call":
          updateLast((a) => ({ parts: [...a.parts, { type: "tool", id: e.id, label: e.label, detail: e.detail }] }));
          break;
        case "tool_result":
          updateLast((a) => ({
            parts: a.parts.map((p) => (p.type === "tool" && p.id === e.id ? { ...p, summary: e.summary, ok: e.ok } : p)),
          }));
          break;
        case "bundle":
          updateLast((a) => ({ parts: [...a.parts, { type: "bundle", bundle: e.bundle }] }));
          break;
        case "question": {
          // Ældre optagelser havde ét spørgsmål pr. begivenhed
          const legacy = e as unknown as { question?: string; options?: string[] };
          const questions = e.questions ?? (legacy.question ? [{ question: legacy.question, options: legacy.options ?? [] }] : []);
          updateLast((a) => ({ parts: [...a.parts, { type: "question", id: e.id, intro: e.intro, questions }] }));
          break;
        }
        case "user_answer":
          // Kun i optagede forløb: kundens svar og et nyt svar fra agenten
          setItems((prev) => {
            const copy = prev.map((it, i) => (i === prev.length - 1 && it.role === "assistant" ? { ...it, done: true } : it));
            return [...copy, { id: nextId++, role: "user", text: e.text }, newAssistant("recorded")];
          });
          break;
        case "error":
          updateLast(() => ({ error: e.message }));
          break;
        case "turn_end":
          break;
      }
    },
    [updateLast],
  );

  const playFallback = useCallback(
    async (text: string, notice?: string) => {
      const rec = pickRecording(text);
      updateLast(() => ({ parts: [], error: undefined, source: "recorded", notice }));
      if (!rec) {
        updateLast(() =>
          live ? { error: "Der er ingen gemte forløb endnu.", done: true } : { notice: undefined, needsKey: true, done: true },
        );
        return;
      }
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      await playRecording(rec, handleEvent, ctrl.signal);
      updateLast(() => ({ done: true }));
    },
    [handleEvent, live, updateLast],
  );

  const send = useCallback(
    async (text: string) => {
      const msg = text.trim();
      if (!msg || busy) return;
      setBusy(true);
      setItems((prev) => [
        ...prev.map((it) => (it.role === "assistant" ? { ...it, done: true } : it)),
        { id: nextId++, role: "user", text: msg },
        newAssistant(live ? "live" : "recorded"),
      ]);

      try {
        if (!live) {
          await playFallback(msg, offline ? "Offline-tilstand: gemt forløb." : "Gemt forløb. Agenten er ikke tændt på denne computer.");
          return;
        }
        const slot = takeRateLimitSlot();
        if (!slot.ok) {
          await playFallback(msg, "Grænsen på 20 kald i timen er nået, så her er det gemte forløb.");
          return;
        }

        const rec = recording.current;
        if (rec && rec.events.length > 0) rec.events.push({ type: "user_answer", text: msg });

        const ctrl = new AbortController();
        abortRef.current = ctrl;
        let last = Date.now();
        let tooSlow = false;
        const watchdog = setInterval(() => {
          if (Date.now() - last > SLOW_MS) {
            tooSlow = true;
            ctrl.abort();
          }
        }, 1000);

        try {
          const result = await runAgent({
            apiKey: apiKey!,
            history: history.current,
            userText: msg,
            pending: pending.current,
            onEvent: (e) => {
              last = Date.now();
              rec?.events.push(e);
              handleEvent(e);
            },
            onActivity: () => {
              last = Date.now();
            },
            signal: ctrl.signal,
          });
          history.current = result.history;
          pending.current = result.pending;
          updateLast(() => ({ done: true }));

          // Når et af de tre eksempler har vist en pakke, gemmes hele forløbet som reserve på denne computer
          if (rec && rec.events.some((e) => e.type === "bundle") && !rec.events.some((e) => e.type === "error")) {
            const lastBundle = rec.events.map((e) => e.type).lastIndexOf("bundle");
            const events = rec.events.filter((e, i) => !(i > lastBundle && e.type === "question"));
            const q = QUICK_PROMPTS.find((x) => x.id === rec.quickId)!;
            saveLocalRecording({ id: q.id, label: q.label, prompt: q.prompt, recorded_at: new Date().toISOString(), events });
            recording.current = null;
          }
        } catch (err) {
          if (ctrl.signal.aborted && !tooSlow) {
            updateLast(() => ({ done: true, error: "Stoppet." }));
            return;
          }
          recording.current = null;
          const why = tooSlow ? "Svaret tog over 20 sekunder." : describeError(err);
          await playFallback(msg, `${why} Her er det gemte forløb i stedet.`);
        } finally {
          clearInterval(watchdog);
        }
      } finally {
        setBusy(false);
        abortRef.current = null;
      }
    },
    [apiKey, busy, handleEvent, live, offline, playFallback, updateLast],
  );

  const stop = useCallback(() => abortRef.current?.abort(), []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    history.current = [];
    pending.current = null;
    recording.current = null;
    setItems([]);
  }, []);

  /** Hurtigknapperne starter altid en ny samtale, så forløbet kan gemmes som reserve */
  const startFresh = useCallback(
    (text: string) => {
      if (busy) return;
      history.current = [];
      pending.current = null;
      const q = QUICK_PROMPTS.find((x) => x.prompt === text);
      recording.current = q && live ? { quickId: q.id, events: [] } : null;
      setItems([]);
      void send(text);
    },
    [busy, live, send],
  );

  return { items, busy, send, startFresh, stop, reset, live, offline, apiKey, setApiKey };
}
