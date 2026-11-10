/**
 * Rolle-agentens værktøjer. Hvert værktøj er et opslag i company brain (lib/brain.ts).
 * Agenten kan kun anbefale varer, som værktøjerne returnerer.
 */
import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import {
  CATEGORY_LABEL,
  ROLES,
  buildBundle,
  checkStock,
  compact,
  getCompatible,
  getProduct,
  getRole,
  searchProducts,
} from "./brain";
import type { Bundle, Category } from "./types";

const CATEGORIES = Object.keys(CATEGORY_LABEL) as [Category, ...Category[]];

/** Navnet på værktøjet, hvor agenten stiller kunden et opfølgende spørgsmål */
export const ASK_TOOL = "ask_customer";

export const TOOLS: Anthropic.Tool[] = [
  {
    name: ASK_TOOL,
    description:
      "Stiller kunden alle dine opfølgende spørgsmål på én gang og venter på svarene. Brug det, når svarene vil ændre dit valg af udstyr. 1 til 4 spørgsmål, hver med 2 til 4 korte svarmuligheder, som kunden kan klikke på. Kunden kan også svare frit. Kald ikke andre værktøjer i samme tur.",
    input_schema: {
      type: "object",
      properties: {
        intro: { type: "string", description: "Én kort sætning om, hvad du har forstået indtil nu" },
        questions: {
          type: "array",
          description: "1 til 4 spørgsmål",
          items: {
            type: "object",
            properties: {
              question: { type: "string", description: "Spørgsmålet på dansk, én sætning" },
              options: {
                type: "array",
                items: { type: "string" },
                description: "2 til 4 korte svarmuligheder på dansk, fx ['Windows', 'Mac', 'Ved ikke']",
              },
            },
            required: ["question", "options"],
          },
        },
      },
      required: ["questions"],
    },
  },
  {
    name: "get_role",
    description:
      "Henter en rolles behov og basispakke (hvilke kategorier og hvilke krav). Brug den, når du kender medarbejdernes rolle.",
    input_schema: {
      type: "object",
      properties: {
        role_id: { type: "string", enum: ROLES.map((r) => r.id), description: "Rollens id" },
      },
      required: ["role_id"],
    },
  },
  {
    name: "search_products",
    description:
      "Søger produkter i én kategori. Returnerer højst 10 varer med varenummer (id), navn, rå specifikation, lager, forventet levering og demopris. Varer på lager kommer først.",
    input_schema: {
      type: "object",
      properties: {
        category: { type: "string", enum: CATEGORIES },
        query: {
          type: "string",
          description: "Valgfri søgeord, fx 'ThinkPad', 'trådløs ANC', '27 4K' eller 'USB-C'.",
        },
        min_stock: {
          type: "integer",
          description: "Valgfrit. Kun varer med mindst dette antal på lager.",
        },
      },
      required: ["category"],
    },
  },
  {
    name: "get_product",
    description: "Henter én vare ud fra varenummeret.",
    input_schema: {
      type: "object",
      properties: { id: { type: "string", description: "Varenummer" } },
      required: ["id"],
    },
  },
  {
    name: "get_compatible",
    description:
      "Finder tilbehør, der er lavet til en bestemt bærbar (ud fra kompatibilitetsdata), samt universelle dockingstationer, der passer til dens porte.",
    input_schema: {
      type: "object",
      properties: { product_id: { type: "string", description: "Varenummer på den bærbare" } },
      required: ["product_id"],
    },
  },
  {
    name: "check_stock",
    description:
      "Tjekker lager for flere varer på én gang for et bestemt antal. Returnerer status pr. vare og evt. forventet leveringsdato.",
    input_schema: {
      type: "object",
      properties: {
        product_ids: { type: "array", items: { type: "string" }, description: "Varenumre" },
        qty: { type: "integer", description: "Antal stk. der skal bruges af hver vare" },
      },
      required: ["product_ids", "qty"],
    },
  },
  {
    name: "build_bundle",
    description:
      "Bygger den endelige pakke, som kunden ser som produktkort med total, kurv og tilbud. Kald den én gang til sidst, når du har tjekket lager og kompatibilitet. Antal er det samlede antal for hele firmaet.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Kort overskrift, fx 'Pakke til 5 sælgere på farten'" },
        people: { type: "integer", description: "Antal medarbejdere pakken er til" },
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              product_id: { type: "string" },
              qty: { type: "integer", description: "Samlet antal" },
              reason: {
                type: "string",
                description: "Én kort linje på dansk om, hvad varen løser for medarbejderen",
              },
              upsell: { type: "boolean", description: "true for dit ene forslag til mersalg" },
            },
            required: ["product_id", "qty", "reason"],
          },
        },
        note: {
          type: "string",
          description: "Valgfri kort note om lager eller levering, som vises under pakken",
        },
      },
      required: ["title", "people", "items"],
    },
  },
];

const Inputs = {
  get_role: z.object({ role_id: z.string() }),
  search_products: z.object({
    category: z.enum(CATEGORIES),
    query: z.string().optional().nullable(),
    min_stock: z.number().int().optional().nullable(),
  }),
  get_product: z.object({ id: z.string() }),
  get_compatible: z.object({ product_id: z.string() }),
  check_stock: z.object({ product_ids: z.array(z.string()).min(1), qty: z.number().int().min(1) }),
  build_bundle: z.object({
    title: z.string(),
    people: z.number().int().min(1),
    items: z
      .array(
        z.object({
          product_id: z.string(),
          qty: z.number().int().min(1),
          reason: z.string(),
          upsell: z.boolean().optional(),
        }),
      )
      .min(1),
    note: z.string().optional().nullable(),
  }),
} as const;

export type ToolName = keyof typeof Inputs;

/** Kort beskrivelse af opslaget til "Bag kulissen" i chatten */
export function toolLabel(name: string, input: unknown): { label: string; detail?: string } {
  const i = (input ?? {}) as Record<string, unknown>;
  const name_ = (id: unknown) => {
    const p = getProduct(String(id ?? ""));
    return p ? p.name : String(id ?? "");
  };
  switch (name) {
    case "get_role":
      return { label: "Henter rollens behov", detail: String(i.role_id ?? "") };
    case "search_products": {
      const cat = CATEGORY_LABEL[i.category as Category] ?? "produkter";
      const extra = [i.query ? `"${String(i.query)}"` : null, i.min_stock ? `mindst ${String(i.min_stock)} på lager` : null]
        .filter(Boolean)
        .join(", ");
      return { label: `Søger i ${cat.toLowerCase()}`, detail: extra || undefined };
    }
    case "get_product":
      return { label: "Slår en vare op", detail: name_(i.id) };
    case "get_compatible":
      return { label: "Tjekker kompatibilitet", detail: name_(i.product_id) };
    case "check_stock": {
      const ids = Array.isArray(i.product_ids) ? i.product_ids : [];
      return { label: `Tjekker lager for ${String(i.qty ?? "")} stk.`, detail: `${ids.length} varer` };
    }
    case "build_bundle":
      return { label: "Sammensætter pakken", detail: String(i.title ?? "") };
    default:
      return { label: name };
  }
}

/** content går til Claude, summary vises for kunden under "Bag kulissen" */
export type ToolOutcome = { content: string; summary: string; isError?: boolean; bundle?: Bundle };

export function executeTool(name: string, rawInput: unknown): ToolOutcome {
  if (!(name in Inputs)) return { content: `Ukendt værktøj: ${name}`, summary: "Ukendt opslag", isError: true };
  const parsed = Inputs[name as ToolName].safeParse(rawInput);
  if (!parsed.success) {
    return {
      content: JSON.stringify({ INVALID_INPUT: parsed.error.issues.map((x) => x.message) }),
      summary: "Ugyldigt opslag, agenten prøver igen",
      isError: true,
    };
  }
  const input = parsed.data as any;
  switch (name as ToolName) {
    case "get_role": {
      const r = getRole(input.role_id);
      return r
        ? { content: JSON.stringify(r), summary: `${r.name}: ${Object.keys(r.base_bundle).length} kategorier i basispakken` }
        : { content: "Rollen findes ikke.", summary: "Rollen findes ikke", isError: true };
    }
    case "search_products": {
      const found = searchProducts(input);
      const list = found.map(compact);
      const inStock = found.filter((p) => p.stock_qty > 0).length;
      const top = found.slice(0, 3).map((p) => p.name).join(", ");
      return {
        content: JSON.stringify({ count: list.length, products: list }),
        summary: list.length ? `${list.length} fundet, ${inStock} på lager. Fx ${top}` : "Ingen varer fundet",
      };
    }
    case "get_product": {
      const p = getProduct(input.id);
      return p
        ? { content: JSON.stringify(compact(p)), summary: `${p.name}, ${p.stock_qty > 0 ? `${p.stock_qty} på lager` : "ikke på lager"}` }
        : { content: "Varenummeret findes ikke.", summary: "Varenummeret findes ikke", isError: true };
    }
    case "get_compatible": {
      const r = getCompatible(input.product_id);
      if (!r) return { content: "Varenummeret findes ikke.", summary: "Varenummeret findes ikke", isError: true };
      const parts = [
        `${r.made_for_this_model.length} lavet til ${r.model_key ?? "modellen"}`,
        `${r.universal_docks.length} universelle docks`,
        r.screen_size_inch ? `${r.bags_that_fit_screen_size.length} tasker og ${r.screen_filters_that_fit_screen_size.length} filtre til ${r.screen_size_inch}"` : null,
      ].filter(Boolean);
      return { content: JSON.stringify(r), summary: parts.join(", ") };
    }
    case "check_stock": {
      const rows = checkStock(input.product_ids, input.qty);
      const ok = rows.filter((r) => r.found && r.enough).length;
      const notOk = rows.filter((r) => r.found && !r.enough).map((r) => r.name);
      const unknown = rows.filter((r) => !r.found).length;
      return {
        content: JSON.stringify(rows),
        summary: `${ok} af ${rows.length} kan leveres i ${input.qty} stk.${notOk.length ? ` Ikke nok af: ${notOk.join(", ")}.` : ""}${unknown ? ` ${unknown} varenummer findes ikke.` : ""}`,
      };
    }
    case "build_bundle": {
      const { bundle, missing } = buildBundle(input);
      if (bundle.lines.length === 0) {
        return {
          content: "Ingen af varenumrene findes. Søg igen og brug kun varenumre fra værktøjerne.",
          summary: "Ingen gyldige varenumre, agenten søger igen",
          isError: true,
        };
      }
      const summary = {
        ok: true,
        shown_to_customer: true,
        total_demo_price: bundle.total,
        lines: bundle.lines.map((l) => ({ id: l.product.id, qty: l.qty, status: l.status_text })),
        missing_ids: missing,
      };
      return {
        content: JSON.stringify(summary),
        summary: `${bundle.lines.length} varer, ${bundle.total.toLocaleString("da-DK")} kr. i demopris${missing.length ? `. ${missing.length} ukendte varenumre sorteret fra` : ""}`,
        bundle,
      };
    }
  }
}
