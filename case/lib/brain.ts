/**
 * Company brain: de data, agenterne slår op i.
 *
 * I demoen ligger data i to JSON-filer i projektet. I drift ville det være en database
 * koblet til PIM, ERP og HubSpot. Det er kun denne fil, der skal skiftes, hvis det sker.
 */
import productsData from "@/data/products.json";
import rolesData from "@/data/roles.json";
import type { Bundle, BundleLine, Category, Product, Role, StockStatus } from "./types";

export const PRODUCTS = productsData as Product[];
export const ROLES = rolesData as Role[];

const BY_ID = new Map(PRODUCTS.map((p) => [p.id.toLowerCase(), p]));

export const CATEGORY_LABEL: Record<Category, string> = {
  laptop: "Bærbare",
  dock: "Dockingstationer",
  monitor: "Skærme",
  headset: "Headsets",
  mouse: "Mus",
  keyboard: "Tastatur",
  bag: "Tasker",
  screen_protection: "Skærmbeskyttelse",
};

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[“”"″]/g, '"')
    .replace(/[^a-z0-9æøå".+ ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export function getProduct(id: string): Product | null {
  return BY_ID.get(String(id).toLowerCase().trim()) ?? null;
}

export function getRole(id: string): Role | null {
  const key = norm(id);
  return ROLES.find((r) => r.id === key || norm(r.name).includes(key)) ?? null;
}

/** Søger i produkter. Varer på lager kommer først. */
export function searchProducts(opts: {
  category?: string | null;
  query?: string | null;
  min_stock?: number | null;
  limit?: number;
}): Product[] {
  const { category, query, min_stock } = opts;
  let list = PRODUCTS.filter((p) => !category || p.category === category);
  if (min_stock != null && min_stock > 0) list = list.filter((p) => p.stock_qty >= min_stock);

  if (query && query.trim()) {
    const tokens = norm(query).split(" ").filter((t) => t.length > 1);
    const scored = list
      .map((p) => {
        const hay = norm(`${p.brand} ${p.name} ${p.raw_spec} ${p.description_da ?? ""} ${p.compatible_with.join(" ")}`);
        const hits = tokens.filter((t) => hay.includes(t)).length;
        return { p, hits };
      })
      .filter((x) => x.hits > 0)
      .sort((a, b) => b.hits - a.hits || b.p.stock_qty - a.p.stock_qty);
    // Kræv helst alle ord. Ellers de bedste delvise træf.
    const all = scored.filter((x) => x.hits === tokens.length);
    list = (all.length ? all : scored).map((x) => x.p);
  } else {
    list = [...list].sort((a, b) => Number(b.stock_qty > 0) - Number(a.stock_qty > 0) || a.demo_price - b.demo_price);
  }
  return list.slice(0, opts.limit ?? 10);
}

/** Tilbehør, der passer til et produkt (typisk en bærbar). */
export function getCompatible(productId: string) {
  const base = getProduct(productId);
  if (!base) return null;
  const model = base.model_key ? norm(base.model_key) : null;
  const ports = new Set((base.ports ?? []).map((x) => x.toLowerCase()));

  const specific: Product[] = [];
  const universal: Product[] = [];
  for (const p of PRODUCTS) {
    if (p.id === base.id || p.category === "laptop") continue;
    const compat = p.compatible_with.map(norm);
    const modelMatch =
      model != null &&
      compat.some((c) => c.includes(model) || (c.length > 8 && model.includes(c)));
    if (modelMatch) {
      specific.push(p);
      continue;
    }
    if (p.compatible_with.length === 0 && p.category === "dock") {
      // En universel dock passer, hvis den bærbare har porten
      const needs = (p.ports ?? []).map((x) => x.toLowerCase());
      if (needs.length === 0 || needs.some((n) => ports.has(n) || (n === "usb-c" && [...ports].some((x) => x.startsWith("thunderbolt"))))) {
        universal.push(p);
      }
    }
  }
  // Tasker og skærmfiltre passer ud fra skærmstørrelsen
  const size = base.size_inch ?? null;
  const bags = size
    ? PRODUCTS.filter((p) => p.category === "bag" && p.size_inch != null && p.size_inch >= size - 0.2 && p.size_inch <= size + 2.5)
    : [];
  const filters = size
    ? PRODUCTS.filter(
        (p) => p.category === "screen_protection" && p.size_inch != null && Math.abs(p.size_inch - size) <= 0.3 && !specific.includes(p),
      )
    : [];
  return {
    product: compact(base),
    model_key: base.model_key ?? null,
    screen_size_inch: size,
    made_for_this_model: specific.map(compact),
    universal_docks: universal.slice(0, 6).map(compact),
    bags_that_fit_screen_size: bags.map(compact),
    screen_filters_that_fit_screen_size: filters.map(compact),
    note:
      "Headsets, mus, tastaturer og skærme er generelt universelle via USB-C, Bluetooth, HDMI eller DisplayPort. Tasker og skærmfiltre skal passe til skærmstørrelsen.",
  };
}

const fmtQty = (n: number) => (n >= 500 ? "500+" : String(n));

/** Lagerstatus for et antal, inkl. leveringstid ud fra hvilket lager varen ligger på */
export function stockStatus(p: Product, qty: number): { status: StockStatus; text: string; delivery: string | null } {
  const near = (p.stock_ed ?? 0) + (p.stock_local ?? 0);
  const total = p.stock_qty;
  const inc = p.incoming_date ? formatDate(p.incoming_date) : null;
  if (near >= qty) return { status: "in_stock", text: `${fmtQty(total)} på lager, levering 1-2 dage`, delivery: "1-2 dage" };
  if (total >= qty) return { status: "in_stock", text: `${fmtQty(total)} på lager, levering 3-5 dage`, delivery: "3-5 dage" };
  if (total > 0)
    return {
      status: "partial",
      text: `${total} af ${qty} på lager${inc && (p.incoming_qty ?? 0) > 0 ? `, ${fmtQty(p.incoming_qty ?? 0)} mere forventes ${inc}` : ""}`,
      delivery: null,
    };
  if (inc) return { status: "incoming", text: `${fmtQty(p.incoming_qty ?? 0)} på vej, forventes ${inc}`, delivery: null };
  return { status: "out_of_stock", text: "Ikke på lager", delivery: null };
}

export function checkStock(ids: string[], qty: number) {
  return ids.map((id) => {
    const p = getProduct(id);
    if (!p) return { id, found: false, message: "Varenummeret findes ikke i databasen." };
    const s = stockStatus(p, qty);
    return {
      id: p.id,
      found: true,
      name: `${p.brand === p.name.split(" ")[0] ? "" : p.brand + " "}${p.name}`.trim(),
      requested: qty,
      stock_qty: p.stock_qty,
      enough: s.status === "in_stock",
      status: s.status,
      status_text: s.text,
      delivery: s.delivery,
      stock_by_warehouse: { ed_lager: p.stock_ed ?? 0, lokal_1_2_dage: p.stock_local ?? 0, fjern_3_5_dage: p.stock_remote ?? 0 },
      incoming_qty: p.incoming_qty ?? 0,
      incoming_date: p.incoming_date,
    };
  });
}

export function buildBundle(input: {
  title: string;
  people: number;
  items: { product_id: string; qty: number; reason: string; upsell?: boolean }[];
  note?: string | null;
}): { bundle: Bundle; missing: string[] } {
  const missing: string[] = [];
  const lines: BundleLine[] = [];
  for (const it of input.items) {
    const p = getProduct(it.product_id);
    if (!p) {
      missing.push(it.product_id);
      continue;
    }
    const qty = Math.max(1, Math.round(it.qty));
    const s = stockStatus(p, qty);
    lines.push({
      product: p,
      qty,
      reason: it.reason,
      status: s.status,
      status_text: s.text,
      line_total: qty * p.demo_price,
      upsell: !!it.upsell,
    });
  }
  const total = lines.reduce((sum, l) => sum + l.line_total, 0);
  return {
    bundle: { title: input.title, people: Math.max(1, Math.round(input.people)), lines, total, note: input.note ?? null },
    missing,
  };
}

/** Kort udgave til agenten, så den ikke får mere tekst end nødvendigt. */
export function compact(p: Product) {
  return {
    id: p.id,
    name: p.name,
    brand: p.brand,
    category: p.category,
    spec: p.raw_spec,
    compatible_with: p.compatible_with,
    model_key: p.model_key ?? undefined,
    ports: p.ports?.length ? p.ports : undefined,
    size_inch: p.size_inch ?? undefined,
    stock_qty: p.stock_qty,
    delivery: stockStatus(p, 1).delivery,
    incoming_qty: p.incoming_qty || undefined,
    incoming_date: p.incoming_date,
    demo_price: p.demo_price,
  };
}

export function formatDate(iso: string) {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("da-DK", { day: "numeric", month: "long", year: "numeric" });
}

export function formatKr(n: number) {
  return n.toLocaleString("da-DK", { maximumFractionDigits: 0 }) + " kr.";
}
