"use client";

import { useState } from "react";
import Anthropic from "@anthropic-ai/sdk";
import { MODEL } from "@/lib/agent";
import { QUICK_PROMPTS, RECORDINGS, downloadRecordings, localRecordings } from "@/lib/fallback";
import { CloseIcon } from "./Icons";

export function SettingsModal({
  apiKey,
  onSave,
  onClose,
}: {
  apiKey: string | null;
  onSave: (key: string | null) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState("");
  const [state, setState] = useState<"idle" | "testing" | "ok" | "fail">("idle");
  const [msg, setMsg] = useState("");
  const [local] = useState(() => localRecordings());

  async function test(key: string) {
    setState("testing");
    try {
      const client = new Anthropic({ apiKey: key, dangerouslyAllowBrowser: true, maxRetries: 0 });
      await client.models.retrieve(MODEL);
      setState("ok");
      setMsg("Nøglen virker. Live-agenten er slået til i denne browser.");
      onSave(key);
    } catch (e) {
      setState("fail");
      setMsg(e instanceof Anthropic.AuthenticationError ? "Nøglen blev afvist." : "Kunne ikke nå Claude. Tjek nettet og prøv igen.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-3xl bg-white p-7 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Live-agent</h2>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-light" aria-label="Luk">
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-3 text-sm text-navy/80">
          Agenten kører i browseren med en Anthropic-nøgle. Nøglen gemmes kun i denne browser på denne computer og
          sendes kun til Anthropic. Uden nøgle afspiller demoen gemte forløb.
        </p>

        {apiKey ? (
          <div className="mt-5 rounded-2xl bg-light p-4">
            <div className="text-sm font-semibold text-ok">Live-agenten er slået til.</div>
            <div className="mt-1 text-xs text-muted">Nøgle: {apiKey.slice(0, 10)}…{apiKey.slice(-4)}</div>
            <div className="mt-3 flex gap-2">
              <button onClick={() => test(apiKey)} className="rounded-full border-2 border-navy px-4 py-1.5 text-sm font-semibold">
                Test nøglen
              </button>
              <button
                onClick={() => {
                  onSave(null);
                  setState("idle");
                  setMsg("Nøglen er slettet fra browseren.");
                }}
                className="rounded-full px-4 py-1.5 text-sm font-semibold text-coral-dark underline"
              >
                Slet nøglen
              </button>
            </div>
          </div>
        ) : (
          <form
            className="mt-5"
            onSubmit={(e) => {
              e.preventDefault();
              if (value.trim()) test(value.trim());
            }}
          >
            <label className="text-sm font-semibold" htmlFor="key">
              Anthropic-nøgle
            </label>
            <input
              id="key"
              type="password"
              autoComplete="off"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="sk-ant-..."
              className="mt-1 w-full rounded-xl border border-line px-4 py-2.5 outline-none focus:border-coral"
            />
            <button
              disabled={!value.trim() || state === "testing"}
              className="mt-3 rounded-full bg-coral px-5 py-2.5 font-semibold text-white disabled:opacity-50"
            >
              {state === "testing" ? "Tester…" : "Gem og test"}
            </button>
          </form>
        )}
        {msg && <p className={`mt-3 text-sm ${state === "fail" ? "text-bad" : "text-navy"}`}>{msg}</p>}
        <div className="mt-6 border-t border-line pt-4">
          <div className="text-sm font-semibold">Gemte forløb til reserve-tilstanden</div>
          <ul className="mt-2 space-y-1 text-sm">
            {QUICK_PROMPTS.map((q) => {
              const here = local.find((r) => r.id === q.id);
              const bundled = RECORDINGS.find((r) => r.id === q.id);
              return (
                <li key={q.id} className="flex justify-between gap-3">
                  <span>{q.label}</span>
                  <span className={here || bundled ? "text-ok" : "text-bad"}>
                    {here ? "optaget i denne browser" : bundled ? "følger med siden" : "mangler"}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-xs text-muted">
            Når du kører et af de tre eksempler live, gemmes forløbet automatisk her og bruges, hvis nettet svigter.
          </p>
          <button onClick={downloadRecordings} className="mt-3 rounded-full border-2 border-navy px-4 py-1.5 text-sm font-semibold">
            Hent forløbene som fil
          </button>
        </div>
        <p className="mt-5 text-xs text-muted">
          Tip: Tilføj <code className="rounded bg-light px-1">?offline=1</code> til adressen for altid at bruge de gemte forløb.
        </p>
      </div>
    </div>
  );
}
