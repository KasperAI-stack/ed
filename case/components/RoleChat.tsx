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
type Step = Extract<Part, { type: "thinking" | "tool" }>;
type Block = Exclude<Part, Step> | { type: "steps"; list: Step[] };

/** Bag kulissen: Claudes tankegang og hvert opslag i company brain, mens agenten arbejder */
function BehindScenes({ steps, running }: { steps: Step[]; running: boolean }) {
  const [open, setOpen] = useState(true);
  const lookups = steps.filter((s) => s.type === "tool").length;
  return (
    <div className="rounded-2xl border border-line bg-white">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-navy">
          <span className={`h-2 w-2 rounded-full ${running ? "animate-pulse bg-coral" : "bg-ok"}`} />
          Bag kulissen
          <span className="font-semibold normal-case tracking-normal text-muted">
            {lookups > 0 ? `${lookups} opslag i company brain` : "tankegang"}
          </span>
        </span>
        <span className="text-xs font-semibold text-muted">{open ? "Skjul" : "Vis"}</span>
      </button>
      {open && (
        <ol className="space-y-2 border-t border-line px-4 py-3">
          {steps.map((s, i) => {
            const active = running && i === steps.length - 1;
            if (s.type === "thinking")
              return (
                <li key={i} className="flex gap-2.5">
                  <span className="mt-0.5 shrink-0 text-xs font-bold text-coral">Tænker</span>
                  <p className={`whitespace-pre-wrap text-xs italic leading-relaxed text-navy/70 ${active ? "typing-caret" : ""}`}>
                    {s.text.trim()}
                  </p>
                </li>
              );
            return (
              <li key={i} className="flex gap-2.5">
                <span
                  className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                    s.summary == null ? "animate-pulse bg-coral" : s.ok === false ? "bg-bad" : "bg-ok"
                  }`}
                />
                <div className="min-w-0 text-xs leading-relaxed">
                  <span className="font-semibold text-navy">{s.label}</span>
                  {s.detail && <span className="text-muted"> · {s.detail}</span>}
                  {s.summary && <div className="text-navy/70">→ {s.summary}</div>}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

/** Opfølgende spørgsmål med svarknapper */
function QuestionCard({
  q,
  canAnswer,
  onAnswer,
}: {
  q: Extract<Part, { type: "question" }>;
  canAnswer: boolean;
  onAnswer: (t: string) => void;
}) {
  return (
    <div className="max-w-[95%] rounded-2xl rounded-bl-md border-2 border-coral bg-light px-4 py-3">
      <div className="font-semibold leading-snug">{q.question}</div>
      {q.options.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {q.options.map((o) => (
            <button
              key={o}
              disabled={!canAnswer}
              onClick={() => onAnswer(o)}
              className="rounded-full border border-coral bg-white px-3.5 py-1.5 text-sm font-semibold text-navy hover:bg-coral hover:text-white disabled:cursor-default disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-navy"
            >
              {o}
            </button>
          ))}
        </div>
      )}
      {canAnswer && <div className="mt-2 text-xs text-muted">Eller skriv dit eget svar nedenfor.</div>}
    </div>
  );
}

/** Viser svaret i den rækkefølge, det kom: tankegang og opslag, tekst, spørgsmål og produktkort */
function AssistantMessage({
  item,
  isLast,
  busy,
  onOpenSettings,
  onAnswer,
}: {
  item: Assistant;
  isLast: boolean;
  busy: boolean;
  onOpenSettings: () => void;
  onAnswer: (t: string) => void;
}) {
  const blocks: Block[] = [];
  for (const p of item.parts) {
    const last = blocks[blocks.length - 1];
    if (p.type === "thinking" || p.type === "tool") {
      if (p.type === "thinking" && !p.text.trim()) continue;
      if (last?.type === "steps") last.list.push(p);
      else blocks.push({ type: "steps", list: [p] });
    } else if (p.type === "text" && !clean(p.text)) {
      continue;
    } else {
      blocks.push(p);
    }
  }
  const lastBlock = blocks[blocks.length - 1];
  const waiting = !item.done && (!lastBlock || lastBlock.type === "bundle");

  return (
    <div className="space-y-3">
      {item.notice && <div className="text-xs font-medium text-coral-dark">{item.notice}</div>}
      {blocks.map((b, i) => {
        if (b.type === "steps") return <BehindScenes key={i} steps={b.list} running={!item.done && i === blocks.length - 1} />;
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
        if (b.type === "question")
          return <QuestionCard key={i} q={b} canAnswer={isLast && !busy && i === blocks.length - 1} onAnswer={onAnswer} />;
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
      {item.needsKey && <TurnOn onOpenSettings={onOpenSettings} />}
    </div>
  );
}

/** Vises, når agenten ikke er tændt i denne browser */
function TurnOn({ onOpenSettings }: { onOpenSettings: () => void }) {
  return (
    <div className="rounded-2xl border-2 border-coral bg-light p-4">
      <div className="font-bold">Agenten er ikke tændt i denne browser</div>
      <p className="mt-1 text-sm text-navy/80">
        Den kører med din egen Anthropic-nøgle, som kun gemmes her på computeren. Instruktionerne og produktdatabasen er
        allerede bygget ind.
      </p>
      <button onClick={onOpenSettings} className="mt-3 rounded-full bg-coral px-5 py-2 font-semibold text-white hover:bg-coral-dark">
        Tænd agenten
      </button>
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
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              live ? "bg-ok/10 text-ok" : offline ? "bg-light text-coral-dark" : "bg-coral text-white hover:bg-coral-dark"
            }`}
            title="Indstillinger for live-agenten"
          >
            {live ? "● Live" : offline ? "● Offline" : "Tænd agenten"}
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
        {items.length === 0 && !live && !offline && <TurnOn onOpenSettings={onOpenSettings} />}
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
            <AssistantMessage
              key={it.id}
              item={it}
              isLast={it === items[items.length - 1]}
              busy={busy}
              onOpenSettings={onOpenSettings}
              onAnswer={(t) => send(t)}
            />
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
