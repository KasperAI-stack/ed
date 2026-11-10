/**
 * Rolle-agenten: en løkke, hvor Claude kalder værktøjerne i lib/tools.ts, indtil pakken er bygget
 * eller agenten stiller kunden et opfølgende spørgsmål.
 *
 * Kører i browseren med brugerens egen nøgle (nøglen ligger kun i browseren).
 *
 * Gangen i én tur:
 * 1. Claude tænker (resuméet vises som "tankegang" i chatten) og kalder værktøjer.
 * 2. Værktøjerne slår op i company brain, og et kort resultat vises under "Bag kulissen".
 * 3. Kalder Claude ask_customer, stopper turen, og alle spørgsmålene vises på én gang med svarknapper.
 *    Kundens svar sendes samlet som resultatet af ask_customer i næste tur.
 * 4. Kalder Claude build_bundle, vises pakken som produktkort i chatten.
 */
import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT } from "./prompt";
import { ASK_TOOL, TOOLS, executeTool, toolLabel } from "./tools";
import type { AgentEvent } from "./types";

export const MODEL = "claude-sonnet-5-5";
const MAX_STEPS = 14;

export type AgentMessage = Anthropic.Beta.Messages.BetaMessageParam;
type ToolResult = Anthropic.Beta.Messages.BetaToolResultBlockParam;
type ToolUse = Anthropic.Beta.Messages.BetaToolUseBlock;

/** Et spørgsmål, der venter på kundens svar */
export type PendingQuestion = { toolUseId: string; otherResults: ToolResult[] };

export type RunOptions = {
  apiKey: string;
  /** Samtalen indtil nu. Den nye kundebesked tilføjes af runAgent. */
  history: AgentMessage[];
  /** Kundens nye besked (eller svar på et spørgsmål) */
  userText: string;
  /** Hvis agenten har stillet et spørgsmål, er kundens besked svaret på det */
  pending?: PendingQuestion | null;
  onEvent: (e: AgentEvent) => void;
  /** Kaldes ved hvert tegn på liv fra API'et (bruges til 20-sekunders vagten) */
  onActivity?: () => void;
  signal?: AbortSignal;
  /** Kun til test: en anden adresse end Anthropics */
  baseURL?: string;
};

export type RunResult = { history: AgentMessage[]; pending: PendingQuestion | null };

/**
 * Valgfrie felter: refusal-fallback og automatisk caching. Afviser API'et dem med en 400,
 * prøver agenten igen uden dem og husker det resten af besøget.
 */
let useExtras = true;

/** Bygger kundens besked. Svar på et spørgsmål sendes som resultatet af ask_customer. */
function userMessage(text: string, pending?: PendingQuestion | null): AgentMessage {
  if (!pending) return { role: "user", content: text };
  return {
    role: "user",
    content: [...pending.otherResults, { type: "tool_result", tool_use_id: pending.toolUseId, content: `Kundens svar:\n${text}` }],
  };
}

/** Kører agenten, indtil den er færdig med turen eller venter på kundens svar */
export async function runAgent(opts: RunOptions): Promise<RunResult> {
  const { apiKey, onEvent, onActivity, signal } = opts;
  const client = new Anthropic({
    apiKey,
    baseURL: opts.baseURL,
    dangerouslyAllowBrowser: true, // nøglen er brugerens egen og ligger kun i hans browser
    maxRetries: 1,
    timeout: 90_000,
  });
  const messages: AgentMessage[] = [...opts.history, userMessage(opts.userText, opts.pending)];

  for (let step = 0; step < MAX_STEPS; step++) {
    let message: Anthropic.Beta.Messages.BetaMessage;
    let wroteText = false;
    try {
      const stream = client.beta.messages.stream(
        {
          model: MODEL,
          max_tokens: 16000,
          system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
          tools: TOOLS as Anthropic.Beta.Messages.BetaTool[],
          messages,
          // Tankegangen streames som resumé, så den kan vises i chatten
          thinking: { type: "adaptive", display: "summarized" },
          output_config: { effort: "medium" },
          ...(useExtras
            ? {
                cache_control: { type: "ephemeral" as const },
                // Afviser modellen af sikkerhedsgrunde, prøver API'et selv en anden model
                betas: ["server-side-fallback-2026-07-01"],
                fallbacks: "default" as const,
              }
            : {}),
        },
        { signal },
      );

      stream.on("streamEvent", (ev) => {
        onActivity?.();
        if (ev.type === "content_block_delta" && ev.delta.type === "thinking_delta" && ev.delta.thinking) {
          onEvent({ type: "thinking", delta: ev.delta.thinking });
        }
      });
      stream.on("text", (delta) => {
        wroteText = true;
        onEvent({ type: "text", delta });
      });
      stream.on("contentBlock", (block) => {
        if (block.type !== "tool_use" || block.name === ASK_TOOL) return;
        const { label, detail } = toolLabel(block.name, block.input);
        onEvent({ type: "tool_call", id: block.id, name: block.name, label, detail });
      });

      message = await stream.finalMessage();
    } catch (err) {
      if (err instanceof Anthropic.BadRequestError && useExtras) {
        // Prøv samme trin igen uden de valgfrie felter
        useExtras = false;
        step--;
        continue;
      }
      throw err;
    }

    messages.push({ role: "assistant", content: message.content });

    if (message.stop_reason === "refusal") {
      onEvent({ type: "error", message: "Agenten kunne ikke svare på den forespørgsel." });
      return { history: messages, pending: null };
    }

    const toolUses = message.content.filter((b): b is ToolUse => b.type === "tool_use");
    if (toolUses.length === 0) {
      onEvent({ type: "turn_end" });
      return { history: messages, pending: null };
    }
    if (message.stop_reason === "max_tokens") {
      onEvent({ type: "error", message: "Svaret blev for langt. Prøv igen." });
      return { history: messages, pending: null };
    }

    const results: ToolResult[] = [];
    let question: ToolUse | null = null;
    for (const tu of toolUses) {
      if (tu.name === ASK_TOOL && !question) {
        question = tu;
        continue;
      }
      if (tu.name === ASK_TOOL) {
        results.push({ type: "tool_result", tool_use_id: tu.id, content: "Saml alle spørgsmål i ét kald.", is_error: true });
        continue;
      }
      const out = executeTool(tu.name, tu.input);
      onEvent({ type: "tool_result", id: tu.id, summary: out.summary, ok: !out.isError });
      if (out.bundle) onEvent({ type: "bundle", bundle: out.bundle });
      results.push({ type: "tool_result", tool_use_id: tu.id, content: out.content, is_error: out.isError });
    }

    if (question) {
      // Turen stopper her. Kundens svar bliver resultatet af ask_customer i næste tur.
      const input = (question.input ?? {}) as { intro?: unknown; questions?: unknown };
      const list = Array.isArray(input.questions) ? input.questions : [];
      const questions = list
        .map((q) => {
          const x = (q ?? {}) as { question?: unknown; options?: unknown };
          return { question: String(x.question ?? "").trim(), options: Array.isArray(x.options) ? x.options.map(String).slice(0, 4) : [] };
        })
        .filter((q) => q.question)
        .slice(0, 4);
      onEvent({ type: "question", id: question.id, intro: input.intro ? String(input.intro) : undefined, questions });
      onEvent({ type: "turn_end" });
      return { history: messages, pending: { toolUseId: question.id, otherResults: results } };
    }

    messages.push({ role: "user", content: results });
    // Linjeskift mellem tekst fra forskellige trin
    if (wroteText) onEvent({ type: "text", delta: "\n\n" });
  }

  onEvent({ type: "error", message: "Agenten brugte for mange trin. Prøv at formulere det lidt mere præcist." });
  return { history: messages, pending: null };
}

/** Fejltekst til brugeren ud fra SDK'ets fejltyper */
export function describeError(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError) return "Nøglen virker ikke. Tjek den under Tænd agenten.";
  if (err instanceof Anthropic.PermissionDeniedError) return "Nøglen har ikke adgang til modellen.";
  if (err instanceof Anthropic.RateLimitError) return "For mange kald lige nu.";
  if (err instanceof Anthropic.APIConnectionError) return "Ingen forbindelse til Claude.";
  if (err instanceof Anthropic.APIError) return `Claude svarede med fejl ${err.status ?? ""}.`.trim();
  if (err instanceof Error && err.name === "AbortError") return "Afbrudt.";
  return "Noget gik galt.";
}
