/**
 * Henter offentlige produktdata fra shop.ed.dk til konceptdemoen.
 *
 * Regler:
 * - Kun offentlige sider. Intet login og ingen interne API'er.
 * - Respekterer robots.txt og holder mindst 1 sekund mellem kald.
 * - Produkterne findes via sitemap'et, som robots.txt selv henviser til.
 * - Priser gemmes ikke. De ligger bag login.
 *
 * Kør: npm run scrape
 * Resultat: data/products.raw.json
 */
import { gunzipSync } from "node:zlib";
import { writeFileSync, existsSync, readFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = "https://shop.ed.dk";
const UA = "ed-demo-research/1.0 (konceptdemo til en jobsamtale, henter kun offentlige sider)";
const DELAY_MS = 1200;
const OUT = join(__dirname, "..", "data", "products.raw.json");
const CACHE = join(__dirname, "..", ".cache");

type Category =
  | "laptop"
  | "dock"
  | "monitor"
  | "headset"
  | "mouse"
  | "keyboard"
  | "bag"
  | "screen_protection";

/** Hvor mange produkter vi vil have pr. kategori (i alt ca. 100). */
const TARGET: Record<Category, number> = {
  laptop: 20,
  dock: 13,
  monitor: 15,
  headset: 15,
  mouse: 10,
  keyboard: 10,
  bag: 9,
  screen_protection: 8,
};

/**
 * Regler, der finder kandidater ud fra adressen i sitemap'et.
 * Adressen ser sådan ud: /product/<Hovedkategori>/<Underkategori>/<Mærke>/<starten-af-navnet>?prodid=123
 * Kategorien tjekkes bagefter igen på selve produktsiden.
 */
const RULES: Record<Category, { paths: string[]; brands: RegExp; include?: RegExp; exclude?: RegExp }> = {
  laptop: {
    paths: ["Computere/Brbare"],
    brands: /^(Lenovo|HP|Dell|Apple|Microsoft)$/i,
    include: /(ThinkPad|EliteBook|ProBook|ZBook|Latitude|Dell-Pro|MacBook|Surface-Laptop)/i,
    exclude: /(Garanti|Warranty|Refurb|Renew|Brugt)/i,
  },
  dock: {
    paths: ["Tilbehr/Dockinglsninger"],
    brands: /^(Lenovo|HP|Dell|Targus|Kensington|Microsoft|StarTech-com|i-tec|Belkin)$/i,
    exclude: /(Garanti|Warranty|Mount|Beslag|Holder|Bracket|Refurb)/i,
  },
  monitor: {
    paths: ["Monitorer-TV/Monitorer"],
    brands: /^(Lenovo|Dell|HP|Philips|Samsung|LG|EIZO|BenQ|iiyama|AOC|ASUS)$/i,
    exclude: /(Garanti|Warranty|Refurb|Touch|Gaming|Odyssey|ROG|TUF)/i,
  },
  headset: {
    paths: ["Multimedia-Audio/Headset-mikrofoner"],
    brands: /^(Jabra|HP|Poly|EPOS|Yealink|Dell|Logitech|Lenovo|Microsoft)$/i,
    include: /(Evolve|Voyager|Blackwire|Savi|Zone|Impact|Adapt|BH7|UH3|Engage|Headset|WL\d|Pro-Wireless)/i,
    exclude: /(cushion|pude|Charging|Lade|Stand|Link-\d|Adapter|Kabel|Cable|Replacement|Ear-?gel|Spare|Batter|Base-|Taske|Pouch|Case|Garanti|Warranty|Clip|Boom|Headband|Dongle|Hanger|Refurb)/i,
  },
  mouse: {
    paths: ["Tastatur-mus/Mus---Tradls", "Tastatur-mus/Mus---Kabel"],
    brands: /^(Logitech|Microsoft|Contour-Design|Dell|HP|Lenovo|Kensington)$/i,
    exclude: /(Garanti|Warranty|Receiver|Modtager|Batter|Refurb)/i,
  },
  keyboard: {
    paths: ["Tastatur-mus/Tastatur---Tradls", "Tastatur-mus/Mus-tastaturpakke", "Tastatur-mus/Tastatur---Kabel"],
    brands: /^(Logitech|Microsoft|Contour-Design|Dell|HP|Lenovo|Kensington|Cherry)$/i,
    exclude: /(Cover|Folio|iPad|Case|Sleeve|Tablet|Surface-Pro|Galaxy|Garanti|Warranty|Skin|Protector|Numerisk|Numeric|Keypad|Refurb|Gaming|POS)/i,
  },
  bag: {
    paths: ["Tilbehr/Tasker-cover---Brbare"],
    brands: /^(Targus|Lenovo|HP|Dell|Tucano|Mobilis|Samsonite|Thule|Belkin|Wenger|Case-Logic|Kensington|Dicota|Port-Designs|Mobile-Pro)$/i,
    exclude: /(Garanti|Warranty|Refurb)/i,
  },
  screen_protection: {
    paths: ["Tilbehr/Skrm-privatlivsfiltre", "Tilbehr/Tilbehr---Brbare", "Monitorer-TV/Tillbehr---vrigt"],
    brands: /^(PanzerGlass|3M|Kensington|Dicota|Lenovo|HP|Targus|StarTech-com|Fellowes|Dell|PORT-Designs|eSTUFF)$/i,
    include: /(Privacy|Fortrolighed|Filter|Skrmbeskytt|Screen-Protect|Blickschutz|Anti-glare|Antirefleks)/i,
    exclude: /(iPhone|Galaxy|iPad|Watch|Pixel|Mobil|phone|Tablet|Kamera|Camera|Garanti|Warranty|Luft|Air-|Printer|Toner|Rens)/i,
  },
};

/** Kendte erhvervsmodeller kommer først, så demoen viser varer, kunderne genkender. */
const PREFER: Record<Category, RegExp> = {
  laptop: /(ThinkPad-(T14|T16|X1-Carbon|E14|E16|L14)|EliteBook-(8|6|X)|Latitude-(5|7)|Dell-Pro-1[46]|MacBook-Air)/i,
  dock: /(ThinkPad|Thunderbolt|USB-C|Universal|Pro-Dock|WD\d\d)/i,
  monitor: /(ThinkVision-T2|ThinkVision-P2|P2[47]\d\d|U2[47]\d\d|E2[47]\d\d|Series-[57]|ViewFinity|Pro-2[47])/i,
  headset: /(Evolve|Voyager|Blackwire|Zone)/i,
  mouse: /(MX-Master|MX-Anywhere|M705|Signature|Lift|RollerMouse)/i,
  keyboard: /(MX-Keys|MK\d{3}|Signature-Slim|Wave|Ergo|Contour)/i,
  bag: /(Targus|ThinkPad|Professional|Rygsk|Backpack|Topload|Slim|Business)/i,
  screen_protection: /((Notebook|Laptop|Brbar).*(Privacy|Fortrolighed|privatliv)|(Privacy|Fortrolighed).*(Notebook|Laptop|1[3-6]))/i,
};

/** Produkter, der står på shoppens forside, og modellen fra eksempel 2 i demoen. */
const MUST = new Set([
  3766746, 12510602, 11847003, 12996775, 13273764, 3962032, 2637525, 9542895, 11457982, 10994489, 3244465,
  4830124, 1773254, 4751757, 3907076, 12793796, 6999759, 13280205,
]);
const MUST_SLUG = /ThinkPad-T16-Gen-4/i;

function priority(c: Candidate) {
  if (MUST.has(c.prodid)) return 3;
  if (MUST_SLUG.test(c.slug)) return 2;
  if (PREFER[c.category].test(c.slug)) return 1;
  return 0;
}

/** Kategorien på produktsiden, som skal bekræfte vores gæt. */
const SUBCATEGORY_OK: Record<Category, RegExp> = {
  laptop: /^Bærbare/i,
  dock: /Docking/i,
  monitor: /^Monitorer|Skærme/i,
  headset: /Headset/i,
  mouse: /^Mus/i,
  keyboard: /Tastatur|Mus & tastatur|Mus-tastatur/i,
  bag: /Tasker/i,
  screen_protection: /Screen protection|Skærmbeskytt|Tilbehør|Filter|Privacy|privatliv/i,
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let lastCall = 0;

async function politeFetch(url: string): Promise<Response> {
  const wait = lastCall + DELAY_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastCall = Date.now();
  const res = await fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "da-DK,da;q=0.9" } });
  return res;
}

/** Læser robots.txt og returnerer en funktion, der siger, om en sti må hentes. */
async function loadRobots(): Promise<(path: string) => boolean> {
  const res = await politeFetch(`${BASE}/robots.txt`);
  const text = await res.text();
  const disallow: string[] = [];
  let applies = false;
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    const [key, ...rest] = line.split(":");
    const value = rest.join(":").trim();
    if (/^user-agent$/i.test(key)) applies = value === "*";
    else if (applies && /^disallow$/i.test(key) && value) disallow.push(value);
  }
  console.log(`robots.txt: ${disallow.length} forbudte stier for alle robotter: ${disallow.join(", ")}`);
  return (path: string) => !disallow.some((d) => path.startsWith(d));
}

function cached(name: string): Buffer | null {
  const p = join(CACHE, name);
  return existsSync(p) ? readFileSync(p) : null;
}
function saveCache(name: string, data: Buffer | string) {
  mkdirSync(CACHE, { recursive: true });
  writeFileSync(join(CACHE, name), data);
}

async function getSitemapUrls(): Promise<string[]> {
  const res = await politeFetch(`${BASE}/sitemapindex.xml.gz`);
  const buf = Buffer.from(await res.arrayBuffer());
  const xml = tryGunzip(buf);
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => decode(m[1]));
}

function tryGunzip(buf: Buffer): string {
  try {
    return gunzipSync(buf).toString("utf8");
  } catch {
    return buf.toString("utf8");
  }
}

function decode(s: string) {
  return s.replace(/&amp;/g, "&").replace(/&#x3D;/g, "=").replace(/&quot;/g, '"');
}

type Candidate = { url: string; brandDir: string; slug: string; prodid: number; category: Category };

function classify(url: string): Candidate | null {
  const m = url.match(/\/product\/([^/]+)\/([^/]+)\/([^/]+)\/([^?]+)\?.*prodid=(\d+)/);
  if (!m) return null;
  const [, main, sub, brandDir, slug, id] = m;
  const path = `${main}/${sub}`;
  for (const cat of Object.keys(RULES) as Category[]) {
    const r = RULES[cat];
    if (!r.paths.includes(path)) continue;
    if (!r.brands.test(brandDir)) continue;
    if (r.include && !r.include.test(slug)) continue;
    if (r.exclude && r.exclude.test(slug)) continue;
    return { url, brandDir, slug, prodid: Number(id), category: cat };
  }
  return null;
}

type StockItem = {
  stockText: string | null;
  isInStock: boolean;
  isIncomingStock: boolean;
  isNotInStock: boolean;
  incomingDate: string | null;
  warehouseLabel: string | null;
  onStockText: string | null;
  incoming: unknown;
};

export type RawProduct = {
  prodid: number;
  part_no: string | null;
  name: string;
  raw_spec: string;
  brand: string;
  category: Category;
  shop_main_category: string | null;
  shop_sub_category: string | null;
  stock: StockItem[];
  ean: string | null;
  product_url: string;
  fetched_at: string;
};

function parseProductPage(html: string, cand: Candidate): RawProduct | null {
  const idx = html.indexOf("var nodeData = ");
  if (idx < 0) return null;
  const start = html.indexOf("{", idx);
  let data: any;
  try {
    data = rawDecode(html.slice(start));
  } catch {
    return null;
  }
  if (!data || data.noProduct) return null;
  const sub = html.match(/"subCategory":"([^"]*)"/)?.[1] ?? null;
  const main = html.match(/"mainCategory":"([^"]*)"/)?.[1] ?? null;
  return {
    prodid: data.id,
    part_no: data.partNos?.first?.partNo ?? null,
    name: String(data.labelStart ?? "").trim(),
    raw_spec: String(data.labelEnd ?? "").trim(),
    brand: String(data.manufacturer ?? cand.brandDir).trim(),
    category: cand.category,
    shop_main_category: main ? unescapeJson(main) : null,
    shop_sub_category: sub ? unescapeJson(sub) : null,
    stock: (data.stock?.items ?? []).map((s: any) => ({
      stockText: s.stockText ?? null,
      isInStock: !!s.isInStock,
      isIncomingStock: !!s.isIncomingStock,
      isNotInStock: !!s.isNotInStock,
      incomingDate: s.incomingDate ?? null,
      warehouseLabel: s.warehouseLabel ?? null,
      onStockText: s.onStockText ?? null,
      incoming: s.incoming ?? null,
    })),
    ean: data.cnetCloudImages?.eanCode ?? null,
    product_url: cand.url,
    fetched_at: new Date().toISOString(),
  };
}

/** Læser ét JSON-objekt fra starten af en streng (resten af HTML'en ignoreres). */
function rawDecode(s: string): any {
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return JSON.parse(s.slice(0, i + 1));
    }
  }
  throw new Error("Ufuldstændig JSON");
}

function unescapeJson(s: string) {
  try {
    return JSON.parse(`"${s}"`);
  } catch {
    return s;
  }
}

/** Offentlige sider, som forsiden linker til: eds egne rolle-sider og kampagner */
const SEED_PAGES: { path: string; tag: string }[] = [
  { path: "/", tag: "forside" },
  { path: "/promotion_products?id=2692", tag: "rolle:administration" },
  { path: "/promotion_products?id=2693", tag: "rolle:design" },
  { path: "/promotion_products?id=2694", tag: "rolle:it" },
  { path: "/promotion_products?id=2695", tag: "rolle:ledelse-salg" },
  { path: "/promotion_products?id=2703", tag: "kampagne:contour-ergonomi" },
  { path: "/promotion_products?id=2708", tag: "kampagne:hp-tilbehoer" },
];

/** Kategori ud fra stien på shoppen (bruges til varer fra rolle- og kampagnesider) */
const PATH_CATEGORY: Record<string, Category> = {
  "Computere/Brbare": "laptop",
  "Tilbehr/Dockinglsninger": "dock",
  "Monitorer-TV/Monitorer": "monitor",
  "Multimedia-Audio/Headset-mikrofoner": "headset",
  "Tastatur-mus/Mus---Tradls": "mouse",
  "Tastatur-mus/Mus---Kabel": "mouse",
  "Tastatur-mus/vrige": "mouse",
  "Tastatur-mus/Tastatur---Tradls": "keyboard",
  "Tastatur-mus/Tastatur---Kabel": "keyboard",
  "Tastatur-mus/Mus-tastaturpakke": "keyboard",
  "Tilbehr/Tasker-cover---Brbare": "bag",
};

type Seed = { url: string; prodid: number; category: Category; slug: string; brandDir: string; image: string | null; tags: Set<string> };

async function collectSeeds(allowed: (p: string) => boolean): Promise<Map<number, Seed>> {
  const seeds = new Map<number, Seed>();
  for (const page of SEED_PAGES) {
    if (!allowed(page.path.split("?")[0])) continue;
    const name = "seed-" + page.tag.replace(/[^a-z0-9]+/gi, "_") + ".html";
    let html = cached(name)?.toString("utf8");
    if (!html) {
      const res = await politeFetch(BASE + page.path);
      if (!res.ok) continue;
      html = await res.text();
      saveCache(name, html);
    }
    // Hvert produktkort: <a href="/product/Hoved/Under/Mærke/navn?prodid=123"> ... <img src="..." alt="...">
    const re = /href="(\/product\/([^/"]+)\/([^/"]+)\/([^/"]+)\/([^"?]+)\?prodid(?:=|&#x3D;)(\d+))"[^>]*>\s*(?:<img[^>]+src="([^"]+)")?/g;
    let n = 0;
    for (const m of html.matchAll(re)) {
      const [, href, main, sub, brandDir, slug, id, img] = m;
      const cat = PATH_CATEGORY[`${main}/${sub}`];
      if (!cat) continue;
      const prodid = Number(id);
      const image = img ? decode(img.startsWith("/") ? BASE + img.replace(/\/150\/150$/, "/400/400") : img) : null;
      const s = seeds.get(prodid);
      if (s) {
        s.tags.add(page.tag);
        if (!s.image && image) s.image = image;
      } else {
        seeds.set(prodid, { url: BASE + decode(href), prodid, category: cat, slug, brandDir, image, tags: new Set([page.tag]) });
        n++;
      }
    }
    console.log(`  ${page.tag}: ${n} nye varer`);
  }
  return seeds;
}

async function fetchProduct(cand: Candidate, allowed: (p: string) => boolean): Promise<RawProduct | null> {
  const path = new URL(cand.url).pathname;
  if (!allowed(path)) return null;
  const cacheName = `p-${cand.prodid}.html`;
  let html = cached(cacheName)?.toString("utf8");
  if (!html) {
    const res = await politeFetch(cand.url);
    if (!res.ok) return null;
    html = await res.text();
    saveCache(cacheName, html);
  }
  return parseProductPage(html, cand);
}

const familyOf = (slug: string) => slug.toLowerCase().replace(/^-+/, "").split("-").slice(0, 4).join("-");

async function main() {
  const allowed = await loadRobots();
  const products: (RawProduct & { image_url: string | null; tags: string[] })[] = [];
  const seenNames = new Set<string>();
  const got: Record<Category, number> = { laptop: 0, dock: 0, monitor: 0, headset: 0, mouse: 0, keyboard: 0, bag: 0, screen_protection: 0 };

  // 1. Varer fra forsiden og eds egne rolle- og kampagnesider
  console.log("Rolle- og kampagnesider:");
  const seeds = await collectSeeds(allowed);
  for (const seed of seeds.values()) {
    const p = await fetchProduct(seed, allowed);
    if (!p || !p.name || !p.part_no) continue;
    products.push({ ...p, image_url: seed.image, tags: [...seed.tags] });
    seenNames.add(familyOf(seed.slug));
    got[seed.category]++;
    console.log(`  + [${[...seed.tags].join(",")}] ${p.name} | ${p.stock.map((s) => s.stockText).join("/")}`);
  }

  // 2. Fyld op fra sitemap'et
  const sitemaps = await getSitemapUrls();
  console.log(`\nSitemap-indeks: ${sitemaps.length} sitemaps`);
  const candidates: Candidate[] = [];
  for (const sm of sitemaps) {
    const name = "sitemap-" + (sm.match(/id=(\d+)/)?.[1] ?? "x") + ".xml";
    let xml: string;
    const c = cached(name);
    if (c) xml = c.toString("utf8");
    else {
      if (!allowed(new URL(sm).pathname)) continue;
      const res = await politeFetch(sm);
      if (!res.ok) continue;
      xml = tryGunzip(Buffer.from(await res.arrayBuffer()));
      saveCache(name, xml);
    }
    for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
      const cand = classify(decode(m[1]));
      if (cand && !seeds.has(cand.prodid)) candidates.push(cand);
    }
  }

  const byCat = new Map<Category, Candidate[]>();
  for (const c of candidates) {
    if (!byCat.has(c.category)) byCat.set(c.category, []);
    byCat.get(c.category)!.push(c);
  }
  const familyTries = new Map<string, number>();
  let mustDone = products.some((p) => /ThinkPad T16 Gen 4/i.test(p.name));

  for (const cat of Object.keys(TARGET) as Category[]) {
    const list = (byCat.get(cat) ?? []).sort((a, b) => priority(b) - priority(a) || b.prodid - a.prodid);
    console.log(`\n${cat}: ${got[cat]} fra rolle-sider, ${list.length} kandidater, mål ${TARGET[cat]}`);
    let tries = 0;
    let outOfStock = 0;
    for (const cand of list) {
      if (got[cat] >= TARGET[cat] || tries >= TARGET[cat] * 5) break;
      const isMust = MUST_SLUG.test(cand.slug);
      if (isMust && mustDone) continue;
      const family = familyOf(cand.slug);
      if (seenNames.has(family) && !isMust) continue;
      const ft = familyTries.get(family) ?? 0;
      if (ft >= (isMust ? 25 : 3)) continue;
      familyTries.set(family, ft + 1);
      tries++;
      const p = await fetchProduct(cand, allowed);
      if (!p || !p.name || !p.part_no || p.raw_spec.length < 15) continue;
      if (p.shop_sub_category && !SUBCATEGORY_OK[cat].test(p.shop_sub_category)) continue;
      const inStock = p.stock.some((s) => s.isInStock);
      // T16 Gen 4 (eksempel 2): vent på en variant på lager
      if (isMust && !inStock) continue;
      // Højst en tredjedel af kategorien må være udsolgt eller på vej (realistisk og godt til demoen)
      if (!inStock && !isMust) {
        if (outOfStock >= Math.floor(TARGET[cat] / 3)) continue;
        outOfStock++;
      }
      if (isMust) mustDone = true;
      seenNames.add(family);
      products.push({ ...p, image_url: null, tags: [] });
      got[cat]++;
      console.log(`  + ${p.name} | ${p.raw_spec.slice(0, 60)} | ${p.stock.map((s) => s.stockText).join("/")}`);
    }
  }

  writeFileSync(OUT, JSON.stringify(products, null, 2));
  console.log(`\nGemt ${products.length} produkter i ${OUT}`, got);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
