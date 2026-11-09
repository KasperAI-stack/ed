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

export const TOOLS: Anthropic.Tool[] = [
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

/** Kort statuslinje til brugerfladen, mens værktøjet kører */
export function toolStatus(name: string, input: unknown): string {
  const i = (input ?? {}) as Record<string, unknown>;
  switch (name) {
    case "get_role":
      return "Henter rollens behov";
    case "search_products": {
      const cat = CATEGORY_LABEL[i.category as Category] ?? "produkter";
      return `Søger i ${cat.toLowerCase()}${i.query ? `: ${String(i.query)}` : ""}`;
    }
    case "get_product":
      return `Slår varenummer ${String(i.id ?? "")} op`;
    case "get_compatible":
      return "Tjekker kompatibilitet med den bærbare";
    case "check_stock":
      return `Tjekker lager for ${String(i.qty ?? "")} stk.`;
    case "build_bundle":
      return "Sammensætter pakken";
    default:
      return "Arbejder";
  }
}

export type ToolOutcome = { content: string; isError?: boolean; bundle?: Bundle };

export function executeTool(name: string, rawInput: unknown): ToolOutcome {
  if (!(name in Inputs)) return { content: `Ukendt værktøj: ${name}`, isError: true };
  const parsed = Inputs[name as ToolName].safeParse(rawInput);
  if (!parsed.success) {
    return { content: JSON.stringify({ INVALID_INPUT: parsed.error.issues.map((x) => x.message) }), isError: true };
  }
  const input = parsed.data as any;
  switch (name as ToolName) {
    case "get_role": {
      const r = getRole(input.role_id);
      return r ? { content: JSON.stringify(r) } : { content: "Rollen findes ikke.", isError: true };
    }
    case "search_products": {
      const list = searchProducts(input).map(compact);
      return { content: JSON.stringify({ count: list.length, products: list }) };
    }
    case "get_product": {
      const p = getProduct(input.id);
      return p ? { content: JSON.stringify(compact(p)) } : { content: "Varenummeret findes ikke.", isError: true };
    }
    case "get_compatible": {
      const r = getCompatible(input.product_id);
      return r ? { content: JSON.stringify(r) } : { content: "Varenummeret findes ikke.", isError: true };
    }
    case "check_stock":
      return { content: JSON.stringify(checkStock(input.product_ids, input.qty)) };
    case "build_bundle": {
      const { bundle, missing } = buildBundle(input);
      if (bundle.lines.length === 0) {
        return { content: "Ingen af varenumrene findes. Søg igen og brug kun varenumre fra værktøjerne.", isError: true };
      }
      const summary = {
        ok: true,
        shown_to_customer: true,
        total_demo_price: bundle.total,
        lines: bundle.lines.map((l) => ({ id: l.product.id, qty: l.qty, status: l.status_text })),
        missing_ids: missing,
      };
      return { content: JSON.stringify(summary), bundle };
    }
  }
}
