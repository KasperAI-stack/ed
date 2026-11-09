/**
 * Rolle-agenten: en løkke, hvor Claude kalder værktøjerne i lib/tools.ts,
 * indtil pakken er bygget. Kører i browseren med brugerens egen nøgle
 * (nøglen ligger kun i browseren) og i Node, når forløbene optages.
 */
import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT } from "./prompt";
import { TOOLS, executeTool, toolStatus } from "./tools";
import type { AgentEvent } from "./types";

export const MODEL = "claude-sonnet-5-5";
const MAX_STEPS = 12;

export type AgentMessage = Anthropic.Beta.Messages.BetaMessageParam;

export type RunOptions = {
  apiKey: string;
  /** Hele samtalen indtil nu, inkl. kundens nye besked til sidst */
  messages: AgentMessage[];
  onEvent: (e: AgentEvent) => void;
  /** Kaldes ved hvert tegn på liv fra API'et (bruges til 20-sekunders vagten) */
  onActivity?: () => void;
  signal?: AbortSignal;
};

/** Kører én tur for agenten og returnerer den opdaterede samtale. */
export async function runAgent(opts: RunOptions): Promise<AgentMessage[]> {
  const { apiKey, onEvent, onActivity, signal } = opts;
  const client = new Anthropic({
    apiKey,
    dangerouslyAllowBrowser: true, // nøglen er brugerens egen og ligger kun i hans browser
    maxRetries: 1,
    timeout: 90_000,
  });
  const messages: AgentMessage[] = [...opts.messages];

  for (let step = 0; step < MAX_STEPS; step++) {
    const stream = client.beta.messages.stream(
      {
        model: MODEL,
        max_tokens: 16000,
        system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
        tools: TOOLS as Anthropic.Beta.Messages.BetaTool[],
        messages,
        cache_control: { type: "ephemeral" },
        output_config: { effort: "medium" },
        // Afviser modellen af sikkerhedsgrunde, prøver API'et selv en anden model
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
      },
      { signal },
    );

    stream.on("streamEvent", () => onActivity?.());
    let wroteText = false;
    stream.on("text", (delta) => {
      wroteText = true;
      onEvent({ type: "text", delta });
    });
    stream.on("contentBlock", (block) => {
      if (block.type === "tool_use") onEvent({ type: "status", text: toolStatus(block.name, block.input) });
    });

    const message = await stream.finalMessage();
    messages.push({ role: "assistant", content: message.content });

    if (message.stop_reason === "refusal") {
      onEvent({ type: "error", message: "Agenten kunne ikke svare på den forespørgsel." });
      return messages;
    }

    const toolUses = message.content.filter(
      (b): b is Anthropic.Beta.Messages.BetaToolUseBlock => b.type === "tool_use",
    );

    if (toolUses.length === 0) {
      onEvent({ type: "turn_end" });
      return messages;
    }
    if (message.stop_reason === "max_tokens") {
      onEvent({ type: "error", message: "Svaret blev for langt. Prøv igen." });
      return messages;
    }

    const results: Anthropic.Beta.Messages.BetaToolResultBlockParam[] = [];
    for (const tu of toolUses) {
      const out = executeTool(tu.name, tu.input);
      if (out.bundle) onEvent({ type: "bundle", bundle: out.bundle });
      results.push({ type: "tool_result", tool_use_id: tu.id, content: out.content, is_error: out.isError });
    }
    messages.push({ role: "user", content: results });
    // Linjeskift mellem tekst fra forskellige trin
    if (wroteText) onEvent({ type: "text", delta: "\n\n" });
  }

  onEvent({ type: "error", message: "Agenten brugte for mange trin. Prøv at formulere det lidt mere præcist." });
  return messages;
}

/** Fejltekst til brugeren ud fra SDK'ets fejltyper */
export function describeError(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError) return "Nøglen virker ikke. Tjek den under indstillinger.";
  if (err instanceof Anthropic.PermissionDeniedError) return "Nøglen har ikke adgang til modellen.";
  if (err instanceof Anthropic.RateLimitError) return "For mange kald lige nu.";
  if (err instanceof Anthropic.APIConnectionError) return "Ingen forbindelse til Claude.";
  if (err instanceof Anthropic.APIError) return `Claude svarede med fejl ${err.status ?? ""}.`.trim();
  if (err instanceof Error && err.name === "AbortError") return "Afbrudt.";
  return "Noget gik galt.";
}
