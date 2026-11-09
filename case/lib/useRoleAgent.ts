"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { runAgent, describeError, type AgentMessage } from "./agent";
import { pickRecording, playRecording } from "./fallback";
import { KEY_STORAGE, readLocal, takeRateLimitSlot, writeLocal } from "./storage";
import type { AgentEvent, Bundle } from "./types";

export type ChatItem =
  | { id: number; role: "user"; text: string }
  | {
      id: number;
      role: "assistant";
      text: string;
      statuses: string[];
      bundles: Bundle[];
      done: boolean;
      source: "live" | "recorded";
      notice?: string;
      error?: string;
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
          updateLast((a) => ({ statuses: [...a.statuses, e.text] }));
          break;
        case "text":
          updateLast((a) => ({ text: a.text + e.delta }));
          break;
        case "bundle":
          updateLast((a) => ({ bundles: [...a.bundles, e.bundle] }));
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
      updateLast(() => ({ text: "", statuses: [], bundles: [], error: undefined, source: "recorded", notice }));
      if (!rec) {
        updateLast(() => ({ error: "Der er ingen gemte forløb endnu.", done: true }));
        return;
      }
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      await playRecording(rec, handleEvent, ctrl.signal);
      updateLast(() => ({ done: true }));
    },
    [handleEvent, updateLast],
  );

  const send = useCallback(
    async (text: string) => {
      const msg = text.trim();
      if (!msg || busy) return;
      setBusy(true);
      setItems((prev) => [
        ...prev,
        { id: nextId++, role: "user", text: msg },
        { id: nextId++, role: "assistant", text: "", statuses: [], bundles: [], done: false, source: live ? "live" : "recorded" },
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

        try {
          history.current = await runAgent({
            apiKey: apiKey!,
            messages: [...history.current, { role: "user", content: msg }],
            onEvent: (e) => {
              last = Date.now();
              handleEvent(e);
            },
            onActivity: () => {
              last = Date.now();
            },
            signal: ctrl.signal,
          });
          updateLast(() => ({ done: true }));
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

  return { items, busy, send, stop, reset, live, offline, apiKey, setApiKey };
}
