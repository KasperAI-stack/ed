/**
 * Optager de tre eksempler med den rigtige rolle-agent og gemmer dem i data/fallback.json.
 * Forløbene afspilles, hvis netværket eller API'et svigter under samtalen, eller med ?offline=1.
 *
 * Kør: ANTHROPIC_API_KEY=sk-ant-... npm run record
 * Valgfrit: npm run record -- thinkpad   (optager kun ét eksempel)
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { runAgent } from "../lib/agent";
import { QUICK_PROMPTS } from "../lib/fallback";
import type { AgentEvent, Recording } from "../lib/types";

const OUT = join(__dirname, "..", "data", "fallback.json");

async function main() {
  // I cloud-miljøet indsætter netværksproxyen den rigtige nøgle. Lokalt bruges ANTHROPIC_API_KEY.
  const apiKey = process.env.ANTHROPIC_API_KEY || "sk-ant-proxy-indsaetter-noeglen";
  const only = process.argv[2];
  const existing: Recording[] = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : [];
  const result = new Map(existing.map((r) => [r.id, r]));

  for (const q of QUICK_PROMPTS) {
    if (only && q.id !== only) continue;
    console.log(`\n=== ${q.label} ===\nKunde: ${q.prompt}\n`);
    const events: AgentEvent[] = [];
    const t0 = Date.now();
    let firstEvent = 0;
    // Agenten kan stille opfølgende spørgsmål. Her svares det første tilbudte svar, højst 3 gange.
    let state = { history: [] as Awaited<ReturnType<typeof runAgent>>["history"], pending: null as Awaited<ReturnType<typeof runAgent>>["pending"] };
    let userText: string = q.prompt;
    let lastAnswers: string[] = [];
    for (let turn = 0; turn < 4; turn++) {
    if (turn > 0) {
      events.push({ type: "user_answer", text: userText });
      console.log(`\n  KUNDE: ${userText}`);
    }
    state = await runAgent({
      apiKey,
      history: state.history,
      pending: state.pending,
      userText,
      onEvent: (e) => {
        if (e.type === "question") lastAnswers = e.questions.map((q) => `${q.question} ${q.options[0] ?? "Ved ikke"}`);
        if (!firstEvent) firstEvent = Date.now() - t0;
        events.push(e);
        if (e.type === "tool_call") console.log(`  [${e.label}${e.detail ? `: ${e.detail}` : ""}]`);
        if (e.type === "tool_result") console.log(`    -> ${e.summary}`);
        if (e.type === "question") e.questions.forEach((q) => console.log(`\n  SPØRGSMÅL: ${q.question} ${JSON.stringify(q.options)}`));
        if (e.type === "text") process.stdout.write(e.delta);
        if (e.type === "error") console.log(`\n  FEJL: ${e.message}`);
        if (e.type === "bundle") {
          console.log(`\n  PAKKE: ${e.bundle.title} (${e.bundle.people} pers.), i alt ${e.bundle.total.toLocaleString("da-DK")} kr.`);
          for (const l of e.bundle.lines) {
            console.log(`   - ${l.qty} x ${l.product.name} [${l.product.id}] ${l.status_text}${l.upsell ? " (mersalg)" : ""}`);
            console.log(`       ${l.reason}`);
          }
          if (e.bundle.note) console.log(`   Note: ${e.bundle.note}`);
        }
      },
    });
    if (!state.pending || events.some((e) => e.type === "bundle")) break;
    userText = lastAnswers.length ? lastAnswers.join("\n") : "Lav bare et forslag";
    }
    const secs = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`\n  (første tegn efter ${(firstEvent / 1000).toFixed(1)} s, færdig efter ${secs} s)`);
    if (!events.some((e) => e.type === "bundle")) console.log("  ADVARSEL: ingen pakke i dette forløb");
    result.set(q.id, { id: q.id, label: q.label, prompt: q.prompt, recorded_at: new Date().toISOString(), events });
  }

  const ordered = QUICK_PROMPTS.map((q) => result.get(q.id)).filter(Boolean);
  writeFileSync(OUT, JSON.stringify(ordered, null, 2));
  console.log(`\nGemt ${ordered.length} forløb i ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
