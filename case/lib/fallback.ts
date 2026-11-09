/**
 * Reserve-tilstand: afspiller et gemt forløb, hvis API'et fejler, er langsomt,
 * hvis der ikke er en nøgle, eller hvis adressen har ?offline=1.
 */
import recordingsData from "@/data/fallback.json";
import type { AgentEvent, Recording } from "./types";

export const RECORDINGS = recordingsData as Recording[];

export const QUICK_PROMPTS = [
  {
    id: "saelgere",
    label: "5 nye sælgere på farten",
    prompt: "Vi har 5 nye sælgere, der starter 1. december. De er meget på farten.",
  },
  {
    id: "thinkpad",
    label: "10 ThinkPad T16 Gen 4. Hvad mangler vi?",
    prompt: "Vi har lige købt 10 ThinkPad T16 Gen 4. Hvad mangler vi?",
  },
  {
    id: "grafiker",
    label: "Grafiker, budget ca. 20.000 kr.",
    prompt: "En grafiker til vores marketingteam, budget omkring 20.000 kr.",
  },
] as const;

/** Finder det gemte forløb, der passer bedst til en besked */
export function pickRecording(text: string): Recording | null {
  if (RECORDINGS.length === 0) return null;
  const t = text.toLowerCase();
  const exact = RECORDINGS.find((r) => r.prompt.toLowerCase() === t.trim());
  if (exact) return exact;
  const rules: [RegExp, string][] = [
    [/thinkpad|t16|købt|mangler/, "thinkpad"],
    [/grafiker|design|marketing|kreativ|budget/, "grafiker"],
    [/sælger|salg|farten|rejs/, "saelgere"],
  ];
  for (const [re, id] of rules) {
    if (re.test(t)) {
      const r = RECORDINGS.find((x) => x.id === id);
      if (r) return r;
    }
  }
  return RECORDINGS[0];
}

const wait = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve) => {
    const id = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(id);
      resolve();
    });
  });

/** Afspiller et forløb med realistisk tempo */
export async function playRecording(rec: Recording, onEvent: (e: AgentEvent) => void, signal?: AbortSignal) {
  // Saml tekststykker, så de kan skrives ud i et jævnt tempo
  const merged: AgentEvent[] = [];
  for (const e of rec.events) {
    const last = merged[merged.length - 1];
    if (e.type === "text" && last?.type === "text") last.delta += e.delta;
    else merged.push(e.type === "text" ? { type: "text", delta: e.delta } : e);
  }
  for (const e of merged) {
    if (signal?.aborted) return;
    if (e.type === "text") {
      const chunk = 4;
      for (let i = 0; i < e.delta.length; i += chunk) {
        if (signal?.aborted) return;
        onEvent({ type: "text", delta: e.delta.slice(i, i + chunk) });
        await wait(14, signal);
      }
    } else if (e.type === "status") {
      onEvent(e);
      await wait(550, signal);
    } else if (e.type === "bundle") {
      await wait(300, signal);
      onEvent(e);
      await wait(400, signal);
    } else {
      onEvent(e);
    }
  }
}
