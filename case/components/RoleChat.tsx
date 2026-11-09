"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatItem } from "@/lib/useRoleAgent";
import { QUICK_PROMPTS } from "@/lib/fallback";
import { BundleView } from "./BundleView";
import { SendIcon, SparkIcon } from "./Icons";

type Props = {
  items: ChatItem[];
  busy: boolean;
  live: boolean;
  offline: boolean;
  onSend: (text: string) => void;
  onQuick: (text: string) => void;
  onStop: () => void;
  onReset: () => void;
  onOpenSettings: () => void;
  prefill: string;
};

/** Fjerner tankestreger, hvis modellen alligevel skriver en */
const clean = (t: string) => t.replace(/\s[–—]\s/g, ", ").replace(/\n{3,}/g, "\n\n").trim();

export function RoleChat({ items, busy, live, offline, onSend, onQuick, onStop, onReset, onOpenSettings, prefill }: Props) {
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (prefill) setText(prefill);
  }, [prefill]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [items]);

  const send = (t: string) => {
    if (!t.trim() || busy) return;
    onSend(t);
    setText("");
  };

  return (
    <div className="flex h-full flex-col rounded-3xl border border-line bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-4">
        <div>
          <div className="flex items-center gap-2 font-bold">
            <SparkIcon className="h-5 w-5 text-coral" />
            Rolle-agenten
          </div>
          <div className="text-sm text-muted">Fortæl os, hvem I er, så sammensætter vi udstyret.</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSettings}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${live ? "bg-ok/10 text-ok" : "bg-light text-coral-dark"}`}
            title="Indstillinger for live-agenten"
          >
            {live ? "● Live" : offline ? "● Offline" : "● Gemte forløb"}
          </button>
          {items.length > 0 && (
            <button onClick={onReset} className="text-xs font-semibold text-muted underline">
              Ny samtale
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 px-5 pt-4">
        {QUICK_PROMPTS.map((q) => (
          <button
            key={q.id}
            disabled={busy}
            onClick={() => {
              setText("");
              onQuick(q.prompt);
            }}
            className="rounded-full border border-coral bg-light px-3.5 py-1.5 text-sm font-semibold text-navy hover:bg-coral hover:text-white disabled:opacity-50"
          >
            {q.label}
          </button>
        ))}
      </div>

      <div ref={scrollRef} className="min-h-[320px] flex-1 space-y-4 overflow-y-auto px-5 py-4" aria-live="polite">
        {items.length === 0 && (
          <div className="rounded-2xl bg-light p-4 text-sm text-navy/80">
            Skriv fx hvor mange I er, hvilken rolle I har, og hvad I allerede har. Agenten slår op i produkter, lager og
            kompatibilitet og sammensætter en pakke pr. person.
          </div>
        )}
        {items.map((it) =>
          it.role === "user" ? (
            <div key={it.id} className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-br-md bg-navy px-4 py-2.5 text-white">{it.text}</div>
            </div>
          ) : (
            <div key={it.id} className="space-y-3">
              {it.notice && <div className="text-xs font-medium text-coral-dark">{it.notice}</div>}
              {it.statuses.length > 0 && (
                <ul className="space-y-1">
                  {it.statuses.map((s, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs text-muted">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${!it.done && i === it.statuses.length - 1 ? "animate-pulse bg-coral" : "bg-ok"}`}
                      />
                      {s}
                    </li>
                  ))}
                </ul>
              )}
              {(it.text || !it.done) && (
                <div
                  className={`max-w-[95%] whitespace-pre-wrap rounded-2xl rounded-bl-md bg-light px-4 py-3 leading-relaxed ${!it.done ? "typing-caret" : ""}`}
                >
                  {clean(it.text) || (!it.done ? "Et øjeblik, jeg kigger på det." : "")}
                </div>
              )}
              {it.bundles.map((b, i) => (
                <BundleView key={i} bundle={b} />
              ))}
              {it.error && <div className="text-sm text-bad">{it.error}</div>}
            </div>
          ),
        )}
        <div ref={endRef} />
      </div>

      <form
        className="flex gap-2 border-t border-line p-4"
        onSubmit={(e) => {
          e.preventDefault();
          send(text);
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Fx: Vi har 3 nye i kundeservice, der starter i januar"
          className="flex-1 rounded-full border border-line px-5 py-3 outline-none focus:border-coral"
          aria-label="Besked til rolle-agenten"
        />
        {busy ? (
          <button type="button" onClick={onStop} className="rounded-full border-2 border-navy px-5 font-semibold">
            Stop
          </button>
        ) : (
          <button
            disabled={!text.trim()}
            className="flex items-center gap-2 rounded-full bg-coral px-5 font-semibold text-white hover:bg-coral-dark disabled:opacity-50"
          >
            Send <SendIcon className="h-4 w-4" />
          </button>
        )}
      </form>
    </div>
  );
}
