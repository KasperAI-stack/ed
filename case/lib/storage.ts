/** localStorage kan mangle eller kaste fejl (privat vindue, blokeret). Derfor altid try/catch. */
export function readLocal(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeLocal(key: string, value: string | null) {
  try {
    if (value == null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    /* ignorér */
  }
}

export const KEY_STORAGE = "ed-demo-anthropic-key";
const CALLS_STORAGE = "ed-demo-agent-calls";
export const MAX_CALLS_PER_HOUR = 20;

/** Simpel grænse: højst 20 agentkald pr. time i denne browser. Forbrugsloftet hos Anthropic er den rigtige sikring. */
export function takeRateLimitSlot(): { ok: boolean; left: number } {
  const now = Date.now();
  let calls: number[] = [];
  try {
    calls = JSON.parse(readLocal(CALLS_STORAGE) ?? "[]");
  } catch {
    calls = [];
  }
  calls = calls.filter((t) => now - t < 60 * 60 * 1000);
  if (calls.length >= MAX_CALLS_PER_HOUR) return { ok: false, left: 0 };
  calls.push(now);
  writeLocal(CALLS_STORAGE, JSON.stringify(calls));
  return { ok: true, left: MAX_CALLS_PER_HOUR - calls.length };
}
