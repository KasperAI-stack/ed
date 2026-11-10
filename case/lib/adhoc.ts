/**
 * Ad hoc-agenten: gør rå leverandørtekst til en dansk produkttekst, skrevet til en bestemt rolle.
 * Kører i browseren med brugerens egen nøgle. Teksterne gemmes i browseren, så de kan vises uden net.
 */
import Anthropic from "@anthropic-ai/sdk";
import { MODEL } from "./agent";
import { readLocal, writeLocal } from "./storage";
import type { Product } from "./types";

export const AD_HOC_PROMPT = `Du er produkttekstforfatter hos en dansk IT-forhandler, der sælger til virksomheder.
Du får en rå leverandørtekst, ofte på halvt engelsk, og den rolle, kunden har.
Skriv en dansk produkttekst til en produktside i præcis dette format:

Linje 1: en kort overskrift på højst 8 ord, der siger, hvad varen gør for medarbejderen.
Linje 2: tom.
Linje 3: to korte sætninger om, hvad varen løser i rollens hverdag.
Linje 4: tom.
Linje 5 til 7: tre punkter, der starter med "• ", med de vigtigste specifikationer skrevet med danske ord.

Regler: Dansk. Ingen tankestreger som pause. Ingen salgsfloskler eller superlativer. Opfind ingen specifikationer, der ikke står i teksten. Ingen anden tekst før eller efter.`;

export const ADHOC_ROLES = [
  { id: "salg", label: "Salg på farten" },
  { id: "administration", label: "Administration og kundeservice" },
  { id: "design", label: "Design og marketing" },
  { id: "it", label: "IT og udvikling" },
] as const;

const STORE = "ed-demo-adhoc-texts";
type Saved = Record<string, { text: string; at: string }>;

const keyOf = (productId: string, roleId: string) => `${productId}::${roleId}`;

export function savedText(productId: string, roleId: string): string | null {
  try {
    const all = JSON.parse(readLocal(STORE) ?? "{}") as Saved;
    return all[keyOf(productId, roleId)]?.text ?? null;
  } catch {
    return null;
  }
}

function saveText(productId: string, roleId: string, text: string) {
  let all: Saved = {};
  try {
    all = JSON.parse(readLocal(STORE) ?? "{}");
  } catch {
    all = {};
  }
  all[keyOf(productId, roleId)] = { text, at: new Date().toISOString() };
  writeLocal(STORE, JSON.stringify(all));
}

/** Skriver teksten og streamer den ud, mens den bliver skrevet */
export async function writeProductText(opts: {
  apiKey: string;
  product: Product;
  roleId: string;
  roleLabel: string;
  onDelta: (t: string) => void;
  signal?: AbortSignal;
}): Promise<string> {
  const client = new Anthropic({ apiKey: opts.apiKey, dangerouslyAllowBrowser: true, maxRetries: 1, timeout: 60_000 });
  const p = opts.product;
  const stream = client.messages.stream(
    {
      model: MODEL,
      max_tokens: 2000,
      system: AD_HOC_PROMPT,
      output_config: { effort: "low" },
      messages: [
        {
          role: "user",
          content: `Rolle: ${opts.roleLabel}\nMærke: ${p.brand}\nNavn: ${p.name}\nKategori: ${p.category}\nRå leverandørtekst: ${p.raw_spec}`,
        },
      ],
    },
    { signal: opts.signal },
  );
  stream.on("text", (d) => opts.onDelta(d));
  const msg = await stream.finalMessage();
  const text = msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .replace(/\s[–—]\s/g, ", ")
    .trim();
  saveText(p.id, opts.roleId, text);
  return text;
}
