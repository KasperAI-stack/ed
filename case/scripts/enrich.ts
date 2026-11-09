/**
 * Beriger de rå produktdata til company brain.
 *
 * - compatible_with: udtrækkes fra den rå tekst ("for ThinkPad T16 Gen 4") med regex.
 *   Claude bruges som reserve for tilbehør uden tydelig "for ..." i teksten.
 * - stock_qty og incoming_date: fra lagerdata ("500+ på lager" -> 500)
 * - demo_price: rundt, tydeligt opdigtet beløb. Rigtige priser ligger bag login og gemmes ikke.
 * - description_da: dansk produkttekst skrevet af ad hoc-agenten (Claude), hvis ANTHROPIC_API_KEY er sat.
 *
 * Kør: npm run enrich
 * Læser data/products.raw.json og skriver data/products.json
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { Category, Product } from "../lib/types";

const RAW = join(__dirname, "..", "data", "products.raw.json");
const OUT = join(__dirname, "..", "data", "products.json");
const MODEL = "claude-sonnet-5-5";

type RawStock = {
  stockText: string | null;
  isInStock: boolean;
  isIncomingStock: boolean;
  incomingDate: string | null;
  incoming: any;
};
type Raw = {
  prodid: number;
  part_no: string;
  name: string;
  raw_spec: string;
  brand: string;
  category: Category;
  stock: RawStock[];
  product_url: string;
  image_url?: string | null;
  tags?: string[];
};

// ---------- Lager ----------

/** "500+" -> 500, "323" -> 323, "Ikke på lager" -> 0 */
export function parseQty(text: string | null | undefined): number {
  if (!text) return 0;
  const m = String(text).replace(/\./g, "").match(/(\d+)\s*\+?/);
  return m ? Number(m[1]) : 0;
}

/** "30-12-26" eller "30-12-2026" -> "2026-12-30" */
export function parseDanishDate(text: string | null | undefined): string | null {
  if (!text) return null;
  const m = String(text).match(/(\d{1,2})[-./](\d{1,2})[-./](\d{2,4})/);
  if (m) {
    const [, d, mo, y] = m;
    const year = y.length === 2 ? 2000 + Number(y) : Number(y);
    return `${year}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const iso = String(text).match(/(\d{4})-(\d{2})-(\d{2})/);
  return iso ? `${iso[1]}-${iso[2]}-${iso[3]}` : null;
}

/** Lager pr. lager: eds eget lager, lokal distributør (1-2 dage) og fjerndistributør (3-5 dage) */
function stockOf(r: Raw) {
  let qty = 0;
  let ed = 0;
  let local = 0;
  let remote = 0;
  let incoming: string | null = null;
  let incomingQty = 0;
  for (const s of r.stock as (RawStock & { warehouseLabel?: string | null })[]) {
    const label = (s.warehouseLabel ?? "").toLowerCase();
    if (s.isInStock) {
      const n = parseQty(s.stockText);
      qty += n;
      if (label.includes("ed-lager")) ed += n;
      else if (label.includes("fjern")) remote += n;
      else local += n;
    }
    // Varer på vej: { items: [{ qty, eta: "23-11-26" }] }
    const items: { qty?: number; eta?: string }[] = s.incoming?.items ?? [];
    for (const it of items) {
      const date = parseDanishDate(it.eta);
      if (date && (!incoming || date < incoming)) {
        incoming = date;
        incomingQty = Number(it.qty) || 0;
      }
    }
    const d2 = parseDanishDate(s.incomingDate);
    if (s.isIncomingStock && d2 && (!incoming || d2 < incoming)) {
      incoming = d2;
      incomingQty = parseQty(s.stockText);
    }
  }
  return {
    stock_qty: Math.min(qty, 9999),
    stock_ed: ed,
    stock_local: local,
    stock_remote: remote,
    incoming_date: incoming,
    incoming_qty: incoming ? incomingQty : 0,
  };
}

// ---------- Kompatibilitet ----------

/** Finder "for ThinkPad T16 Gen 4 21QN; ThinkPad P16s Gen 3" i den rå tekst */
export function extractCompatible(spec: string): string[] {
  const out: string[] = [];
  const re = /\bfor\s+([^]+?)(?=\s+-\s+|$)/gi;
  for (const m of spec.matchAll(re)) {
    const part = m[1].trim();
    // Spring generiske ord over, fx "for kontoret"
    if (!/[A-Z0-9]/.test(part)) continue;
    for (const piece of part.replace(/\(([^)]*)\)/g, (m) => m.replace(/,/g, "·")).split(/\s*[;,/]\s*|\s+og\s+|\s+and\s+/)) {
      const p = piece.replace(/\s+/g, " ").trim();
      if (p.length >= 3 && /[A-Za-z]/.test(p) && /\d|Mac|Surface|Book|Pad/.test(p)) out.push(p);
    }
  }
  return [...new Set(out)];
}

/** Modelnavn til kompatibilitet, fx "ThinkPad T16 Gen 4" */
export function modelKey(name: string): string | null {
  const patterns = [
    /ThinkPad\s+[A-Z]\d+[a-z]?(?:\s+(?:Carbon|Yoga|Nano|2-in-1))?(?:\s+Gen\s+\d+)?/i,
    /EliteBook\s+(?:\d+\s+)?(?:\w+\s+)?G\d+[a-z]?/i,
    /ProBook\s+\d+\s+G\d+/i,
    /ZBook\s+\w+(?:\s+\w+)?\s+G\d+/i,
    /Latitude\s+\d{4}/i,
    /Dell\s+Pro\s+\d+(?:\s+(?:Plus|Premium|Essential))?/i,
    /MacBook\s+(?:Air|Pro)/i,
    /Surface\s+Laptop/i,
    /XPS\s+\d+/i,
  ];
  for (const re of patterns) {
    const m = name.match(re);
    if (m) return m[0].replace(/\s+/g, " ").trim();
  }
  return null;
}

function portsOf(r: Raw): string[] {
  const t = `${r.name} ${r.raw_spec}`;
  const ports: string[] = [];
  const tb = t.match(/Thunderbolt\s*(\d)/i);
  if (tb) ports.push(`Thunderbolt ${tb[1]}`);
  else if (/Thunderbolt/i.test(t)) ports.push("Thunderbolt");
  if (/USB-C|USB Type-C|USB4/i.test(t)) ports.push("USB-C");
  // Moderne erhvervsbærbare har USB-C med strøm og skærm. Det er grundlaget for universelle docks.
  if (r.category === "laptop" && !ports.includes("USB-C")) ports.push("USB-C");
  return ports;
}

function sizeInch(t: string, largest = false): number | null {
  const all = [...t.matchAll(/(\d{2}(?:[.,]\d)?)\s*(?:"|″|''|tommer|inch|in\b)/gi)].map((m) => Number(m[1].replace(",", ".")));
  if (!all.length) return null;
  // En taske til "13" - 16"" passer op til 16 tommer
  return largest ? Math.max(...all) : all[0];
}

// ---------- Demopris ----------

const roundTo = (n: number, step: number) => Math.round(n / step) * step;

/** Rundt, tydeligt opdigtet beløb pr. kategori. Ikke eds pris. */
export function demoPrice(r: Raw): number {
  const t = `${r.name} ${r.raw_spec}`;
  switch (r.category) {
    case "laptop": {
      let p = 9000;
      if (/Ultra 7|Ultra 9|i7|Ryzen 7|Ryzen AI 7|M\d Pro|M\d Max/i.test(t)) p += 2500;
      if (/32 ?GB/i.test(t)) p += 2000;
      if (/64 ?GB/i.test(t)) p += 4000;
      if (/1 ?TB|2 ?TB/i.test(t)) p += 1000;
      if (/X1|EliteBook (8|X)|MacBook Pro|XPS|ZBook|Premium/i.test(t)) p += 2500;
      if (/5G|LTE|4G/i.test(t)) p += 1000;
      return roundTo(p, 500);
    }
    case "dock":
      if (/WorkStation|230 ?W|Thunderbolt 5/i.test(t)) return 3500;
      if (/Thunderbolt/i.test(t)) return 2500;
      return 1500;
    case "monitor": {
      const s = sizeInch(t) ?? 24;
      let p = s >= 34 ? 5000 : s >= 31 ? 4000 : s >= 27 ? 2500 : 1500;
      if (/4K|5K|UHD|3840/i.test(t)) p += 1000;
      if (/webcam|USB-C/i.test(t)) p += 500;
      return p;
    }
    case "headset": {
      if (/Evolve\d? 85|Evolve3 85|Voyager Focus|Zone Wireless 2/i.test(t)) return 2500;
      let p = 1000;
      if (/trådløs|wireless|Bluetooth/i.test(t)) p += 500;
      if (/støjfjern|ANC|noise/i.test(t)) p += 500;
      return p;
    }
    case "mouse":
      if (/MX Master|RollerMouse/i.test(t)) return /RollerMouse/i.test(t) ? 2500 : 700;
      return /trådløs|wireless|Bluetooth/i.test(t) ? 400 : 200;
    case "keyboard":
      if (/Contour|Balance/i.test(t)) return 1200;
      if (/MX Keys/i.test(t)) return /Combo|mus/i.test(t) ? 1200 : 800;
      if (/mus|Combo|Desktop/i.test(t)) return 500;
      return 400;
    case "bag":
      return /Rolling|Trolley|Premium|Professional/i.test(t) ? 900 : 500;
    case "screen_protection":
      return 500;
  }
}

// ---------- Claude (ad hoc-agenten) ----------

const DescSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      description_da: z.string(),
      compatible_with: z.array(z.string()),
    }),
  ),
});

const AD_HOC_PROMPT = `Du er produkttekstforfatter hos en dansk IT-forhandler, der sælger til virksomheder.
Du får rå leverandørtekster, ofte på halvt engelsk. Skriv for hver vare en kort dansk produkttekst på to sætninger (højst 40 ord):
første sætning siger, hvad varen er og hvad den gør for medarbejderen, anden sætning nævner de vigtigste specifikationer med danske ord.
Regler: Dansk. Ingen tankestreger som pause. Ingen salgsfloskler eller superlativer. Opfind ingen specifikationer, der ikke står i teksten.
Udfyld også compatible_with med de konkrete modeller, varen er lavet til, hvis det fremgår af teksten. Er varen universel, så returnér en tom liste.`;

async function adHocAgent(products: Product[]) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    console.log("Ingen ANTHROPIC_API_KEY. Springer danske tekster og Claude-kompatibilitet over.");
    return;
  }
  const client = new Anthropic();
  const todo = products.filter((p) => !p.description_da);
  for (let i = 0; i < todo.length; i += 12) {
    const batch = todo.slice(i, i + 12);
    const input = batch.map((p) => ({ id: p.id, brand: p.brand, name: p.name, raw_spec: p.raw_spec, category: p.category }));
    const res = await client.messages.parse({
      model: MODEL,
      max_tokens: 8000,
      system: AD_HOC_PROMPT,
      output_config: { format: zodOutputFormat(DescSchema), effort: "low" },
      messages: [{ role: "user", content: JSON.stringify(input, null, 1) }],
    });
    const out = res.parsed_output;
    if (!out) {
      console.log(`  batch ${i / 12 + 1}: intet svar (${res.stop_reason})`);
      continue;
    }
    for (const it of out.items) {
      const p = products.find((x) => x.id === it.id);
      if (!p) continue;
      p.description_da = it.description_da.replace(/\s[–—]\s/g, ", ");
      // Claude som reserve: kun hvis regex ikke fandt noget, og kun for tilbehør
      if (p.compatible_with.length === 0 && ["dock", "bag", "screen_protection"].includes(p.category)) {
        p.compatible_with = it.compatible_with.filter((c) => c.length > 2);
      }
    }
    console.log(`  batch ${i / 12 + 1}: ${out.items.length} tekster`);
  }
}

async function main() {
  const raw: Raw[] = JSON.parse(readFileSync(RAW, "utf8"));
  const previous: Product[] = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : [];
  const prevById = new Map(previous.map((p) => [p.id, p]));

  // Ret kategori: en mus fra en tastatur-kategori på shoppen (fx Contour RollerMouse) er en mus
  for (const r of raw) {
    if (r.category === "keyboard" && /^(Centreret mus|Mus\b|Trackpad)/i.test(r.raw_spec) && !/Sæt med/i.test(r.raw_spec)) r.category = "mouse";
  }

  const products: Product[] = raw.map((r) => {
    const stock = stockOf(r);
    const prev = prevById.get(r.part_no);
    const name = r.name.trim();
    return {
      id: r.part_no,
      name,
      brand: r.brand,
      category: r.category,
      raw_spec: r.raw_spec,
      description_da: prev?.description_da ?? null,
      compatible_with: extractCompatible(r.raw_spec),
      ...stock,
      demo_price: demoPrice(r),
      size_inch: sizeInch(`${name} ${r.raw_spec}`, r.category === "bag"),
      image_url: r.image_url ?? null,
      product_url: r.product_url,
      tags: r.tags ?? [],
      model_key: r.category === "laptop" ? modelKey(name) : null,
      ports: portsOf(r),
    };
  });

  // Behold Claude-kompatibilitet fra en tidligere kørsel
  for (const p of products) {
    const prev = prevById.get(p.id);
    if (p.compatible_with.length === 0 && prev?.compatible_with.length) p.compatible_with = prev.compatible_with;
  }

  await adHocAgent(products);

  writeFileSync(OUT, JSON.stringify(products, null, 2));
  const byCat = products.reduce<Record<string, number>>((a, p) => ((a[p.category] = (a[p.category] ?? 0) + 1), a), {});
  console.log(`Gemt ${products.length} produkter i ${OUT}`, byCat);
  console.log(
    "Med kompatibilitet:",
    products.filter((p) => p.compatible_with.length).map((p) => `${p.name}: ${p.compatible_with.join(" | ")}`),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
