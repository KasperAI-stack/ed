"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatItem, Part } from "@/lib/useRoleAgent";
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

type Assistant = Extract<ChatItem, { role: "assistant" }>;

/** Viser svaret i den rækkefølge, det kom: statuslinjer, tekst og produktkort */
function AssistantMessage({ item }: { item: Assistant }) {
  // Saml statuslinjer, der står lige efter hinanden, til én liste
  const blocks: (Part | { type: "statuses"; list: string[] })[] = [];
  for (const p of item.parts) {
    const last = blocks[blocks.length - 1];
    if (p.type === "status") {
      if (last?.type === "statuses") last.list.push(p.text);
      else blocks.push({ type: "statuses", list: [p.text] });
    } else if (p.type === "text" && !clean(p.text)) {
      continue;
    } else {
      blocks.push(p);
    }
  }
  const lastBlock = blocks[blocks.length - 1];
  const waiting = !item.done && (!lastBlock || lastBlock.type !== "text");

  return (
    <div className="space-y-3">
      {item.notice && <div className="text-xs font-medium text-coral-dark">{item.notice}</div>}
      {blocks.map((b, i) => {
        if (b.type === "statuses")
          return (
            <ul key={i} className="space-y-1">
              {b.list.map((s, j) => {
                const active = !item.done && i === blocks.length - 1 && j === b.list.length - 1;
                return (
                  <li key={j} className="flex items-center gap-2 text-xs text-muted">
                    <span className={`h-1.5 w-1.5 rounded-full ${active ? "animate-pulse bg-coral" : "bg-ok"}`} />
                    {s}
                  </li>
                );
              })}
            </ul>
          );
        if (b.type === "text")
          return (
            <div
              key={i}
              className={`max-w-[95%] whitespace-pre-wrap rounded-2xl rounded-bl-md bg-light px-4 py-3 leading-relaxed ${
                !item.done && i === blocks.length - 1 ? "typing-caret" : ""
              }`}
            >
              {clean(b.text)}
            </div>
          );
        if (b.type === "bundle") return <BundleView key={i} bundle={b.bundle} />;
        return null;
      })}
      {waiting && (
        <div className="flex w-fit items-center gap-1.5 rounded-2xl rounded-bl-md bg-light px-4 py-3" aria-label="Agenten arbejder">
          <span className="h-2 w-2 animate-bounce rounded-full bg-coral [animation-delay:-0.3s]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-coral [animation-delay:-0.15s]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-coral" />
        </div>
      )}
      {item.error && <div className="text-sm text-bad">{item.error}</div>}
    </div>
  );
}

export function RoleChat({ items, busy, live, offline, onSend, onQuick, onStop, onReset, onOpenSettings, prefill }: Props) {
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (prefill) setText(prefill);
  }, [prefill]);

  // Rul med, mens agenten skriver. Når produktkortene kommer, vises toppen af dem i stedet.
  const stick = useRef(true);
  const seen = useRef({ items: 0, bundles: 0 });
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const bundles = el.querySelectorAll("[data-bundle]");
    if (items.length !== seen.current.items) stick.current = true;
    if (bundles.length > seen.current.bundles) {
      // Chatfeltet er "relative", så offsetTop er målt fra toppen af feltet
      const top = (bundles[bundles.length - 1] as HTMLElement).offsetTop - 12;
      el.scrollTo({ top, behavior: "smooth" });
      stick.current = false;
    } else if (stick.current) {
      el.scrollTop = el.scrollHeight;
    }
    seen.current = { items: items.length, bundles: bundles.length };
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

      <div className="flex flex-wrap gap-2 border-b border-line px-5 py-3">
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

      <div
        ref={scrollRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        className="relative min-h-[320px] flex-1 space-y-4 overflow-y-auto px-5 py-4"
        aria-live="polite"
      >
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
            <AssistantMessage key={it.id} item={it} />
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
