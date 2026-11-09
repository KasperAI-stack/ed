/**
 * Reserve-tilstand: afspiller et gemt forløb, hvis API'et fejler, er langsomt,
 * hvis der ikke er en nøgle, eller hvis adressen har ?offline=1.
 */
import recordingsData from "@/data/fallback.json";
import { readLocal, writeLocal } from "./storage";
import type { AgentEvent, Recording } from "./types";

/** Forløb, der følger med siden (optaget på forhånd) */
export const RECORDINGS = recordingsData as Recording[];

const LOCAL_RECORDINGS = "ed-demo-recordings";

/** Forløb optaget live i denne browser. De bruges før de medfølgende. */
export function localRecordings(): Recording[] {
  try {
    const data = JSON.parse(readLocal(LOCAL_RECORDINGS) ?? "{}") as Record<string, Recording>;
    return QUICK_PROMPTS.map((q) => data[q.id]).filter(Boolean);
  } catch {
    return [];
  }
}

export function saveLocalRecording(rec: Recording) {
  let data: Record<string, Recording> = {};
  try {
    data = JSON.parse(readLocal(LOCAL_RECORDINGS) ?? "{}");
  } catch {
    data = {};
  }
  data[rec.id] = rec;
  writeLocal(LOCAL_RECORDINGS, JSON.stringify(data));
}

/** Alle forløb: lokale først, derefter de medfølgende for de eksempler, der mangler */
export function allRecordings(): Recording[] {
  const local = localRecordings();
  const ids = new Set(local.map((r) => r.id));
  return [...local, ...RECORDINGS.filter((r) => !ids.has(r.id))];
}

/** Hent forløbene som fil i samme format som data/fallback.json */
export function downloadRecordings() {
  const list = QUICK_PROMPTS.map((q) => allRecordings().find((r) => r.id === q.id)).filter(Boolean);
  const blob = new Blob([JSON.stringify(list, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "fallback.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

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
  const RECORDINGS = allRecordings();
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
  // Saml tekst og tankegang, så de kan skrives ud i et jævnt tempo
  const merged: AgentEvent[] = [];
  for (const e of rec.events) {
    const last = merged[merged.length - 1];
    if ((e.type === "text" || e.type === "thinking") && last?.type === e.type) last.delta += e.delta;
    else merged.push(e.type === "text" || e.type === "thinking" ? { ...e } : e);
  }
  for (const e of merged) {
    if (signal?.aborted) return;
    if (e.type === "text" || e.type === "thinking") {
      // Tankegangen vises hurtigere end teksten
      const chunk = e.type === "thinking" ? 12 : 4;
      for (let i = 0; i < e.delta.length; i += chunk) {
        if (signal?.aborted) return;
        onEvent({ type: e.type, delta: e.delta.slice(i, i + chunk) });
        await wait(14, signal);
      }
    } else if (e.type === "tool_call") {
      onEvent(e);
      await wait(350, signal);
    } else if (e.type === "tool_result") {
      onEvent(e);
      await wait(250, signal);
    } else if (e.type === "question") {
      onEvent(e);
      await wait(1400, signal);
    } else if (e.type === "user_answer") {
      onEvent(e);
      await wait(500, signal);
    } else if (e.type === "bundle") {
      await wait(300, signal);
      onEvent(e);
      await wait(400, signal);
    } else {
      onEvent(e);
    }
  }
}
