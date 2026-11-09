"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { runAgent, describeError, type AgentMessage } from "./agent";
import { QUICK_PROMPTS, pickRecording, playRecording, saveLocalRecording } from "./fallback";
import { KEY_STORAGE, readLocal, takeRateLimitSlot, writeLocal } from "./storage";
import type { AgentEvent, Bundle } from "./types";

/** Et svar består af dele i den rækkefølge, de kom: tekst, statuslinjer og produktkort */
export type Part = { type: "text"; text: string } | { type: "status"; text: string } | { type: "bundle"; bundle: Bundle };

export type ChatItem =
  | { id: number; role: "user"; text: string }
  | {
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

const SLOW_MS = 20_000;
let nextId = 1;

export function useRoleAgent() {
  const [items, setItems] = useState<ChatItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [apiKey, setApiKeyState] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const history = useRef<AgentMessage[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setApiKeyState(readLocal(KEY_STORAGE));
    setOffline(new URLSearchParams(window.location.search).get("offline") === "1");
  }, []);

  const setApiKey = useCallback((key: string | null) => {
    writeLocal(KEY_STORAGE, key);
    setApiKeyState(key);
  }, []);

  const live = !!apiKey && !offline;

  const updateLast = useCallback((fn: (a: Extract<ChatItem, { role: "assistant" }>) => Partial<Extract<ChatItem, { role: "assistant" }>>) => {
    setItems((prev) => {
      const copy = [...prev];
      const last = copy[copy.length - 1];
      if (last?.role !== "assistant") return prev;
      copy[copy.length - 1] = { ...last, ...fn(last) };
      return copy;
    });
  }, []);

  const handleEvent = useCallback(
    (e: AgentEvent) => {
      switch (e.type) {
        case "status":
          updateLast((a) => ({ parts: [...a.parts, { type: "status", text: e.text }] }));
          break;
        case "text":
          updateLast((a) => {
            const last = a.parts[a.parts.length - 1];
            if (last?.type === "text") return { parts: [...a.parts.slice(0, -1), { type: "text", text: last.text + e.delta }] };
            return { parts: [...a.parts, { type: "text", text: e.delta }] };
          });
          break;
        case "bundle":
          updateLast((a) => ({ parts: [...a.parts, { type: "bundle", bundle: e.bundle }] }));
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
          live
            ? { error: "Der er ingen gemte forløb endnu.", done: true }
            : { notice: undefined, needsKey: true, done: true },
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
        ...prev,
        { id: nextId++, role: "user", text: msg },
        { id: nextId++, role: "assistant", parts: [], done: false, source: live ? "live" : "recorded" },
      ]);

      try {
        if (!live) {
          await playFallback(msg, offline ? "Offline-tilstand: gemt forløb." : "Gemt forløb. Live-agenten er ikke slået til på denne computer.");
          return;
        }
        const slot = takeRateLimitSlot();
        if (!slot.ok) {
          await playFallback(msg, "Grænsen på 20 kald i timen er nået, så her er det gemte forløb.");
          return;
        }

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

        const recorded: AgentEvent[] = [];
        const firstTurn = history.current.length === 0;
        try {
          history.current = await runAgent({
            apiKey: apiKey!,
            messages: [...history.current, { role: "user", content: msg }],
            onEvent: (e) => {
              last = Date.now();
              recorded.push(e);
              handleEvent(e);
            },
            onActivity: () => {
              last = Date.now();
            },
            signal: ctrl.signal,
          });
          updateLast(() => ({ done: true }));
          // Gem et vellykket live-forløb af et af de tre eksempler som reserve på denne computer
          const quick = QUICK_PROMPTS.find((q) => q.prompt === msg);
          if (quick && firstTurn && recorded.some((e) => e.type === "bundle") && !recorded.some((e) => e.type === "error")) {
            saveLocalRecording({ id: quick.id, label: quick.label, prompt: quick.prompt, recorded_at: new Date().toISOString(), events: recorded });
          }
        } catch (err) {
          if (ctrl.signal.aborted && !tooSlow) {
            updateLast(() => ({ done: true, error: "Stoppet." }));
            return;
          }
          const why = tooSlow ? "Svaret tog over 20 sekunder" : describeError(err);
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
    setItems([]);
  }, []);

  /** Hurtigknapperne starter altid en ny samtale, så forløbet kan gemmes som reserve */
  const startFresh = useCallback(
    (text: string) => {
      if (busy) return;
      history.current = [];
      setItems([]);
      void send(text);
    },
    [busy, send],
  );

  return { items, busy, send, startFresh, stop, reset, live, offline, apiKey, setApiKey };
}
