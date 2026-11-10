"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { PRODUCTS, CATEGORY_LABEL } from "@/lib/brain";
import type { Product } from "@/lib/types";
import { DemoPrice, ProductImage, StockBadge, productStock } from "./ProductVisual";
import { useCart } from "./Cart";
import { NAV } from "./ShopChrome";
import { SparkIcon } from "./Icons";
import Link from "next/link";
import { AI_PRODUCTS, type AiProduct } from "@/lib/aiProducts";
import { AiArt } from "./AiIllustrations";

/** Kort til en af agenterne, opbygget som de andre produktkort */
function AiProductCard({ p }: { p: AiProduct }) {
  const href = `/demo/produkt/${p.slug}/`;
  return (
    <li className="flex flex-col rounded-2xl border border-line bg-white p-4 transition hover:shadow-md">
      <Link href={href} className="block h-28 overflow-hidden rounded-xl bg-[#f2f2f8]" aria-label={p.name}>
        <AiArt kind={p.illustration} className="h-full w-full" />
      </Link>
      <div className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-muted">ed · AI-agenter</div>
      <Link href={href} className="mt-0.5 font-semibold leading-snug hover:text-coral-dark">
        {p.name}
      </Link>
      <p className="mt-1 line-clamp-2 text-sm text-navy/70" title={p.shortText}>
        {p.shortText}
      </p>
      <div className="mt-1 text-xs text-muted">Varenr. {p.id}</div>
      <div className="mt-auto pt-3">
        <StockBadge status="in_stock" text={p.stockText} />
        <div className="mt-2 flex items-end justify-between gap-2">
          <div>
            <div className="text-lg font-bold text-navy">Efter aftale</div>
            <div className="text-xs font-medium uppercase tracking-wide text-muted">Pris</div>
          </div>
          <Link href={href} className="rounded-full bg-coral px-4 py-2 text-sm font-semibold text-white hover:bg-coral-dark">
            Se produkt
          </Link>
        </div>
      </div>
    </li>
  );
}

function ProductCard({ p }: { p: Product }) {
  const { add } = useCart();
  const [done, setDone] = useState(false);
  const s = productStock(p);
  return (
    <li className="flex flex-col rounded-2xl border border-line bg-white p-4 transition hover:shadow-md">
      <ProductImage product={p} />
      <div className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-muted">
        {p.brand} · {CATEGORY_LABEL[p.category]}
      </div>
      <div className="mt-0.5 font-semibold leading-snug">{p.name}</div>
      <p className="mt-1 line-clamp-2 text-sm text-navy/70" title={p.raw_spec}>
        {p.raw_spec}
      </p>
      <div className="mt-1 text-xs text-muted">Varenr. {p.id}</div>
      <div className="mt-auto pt-3">
        <StockBadge status={s.status} text={s.text} />
        <div className="mt-2 flex items-end justify-between gap-2">
          <DemoPrice amount={p.demo_price} />
          <button
            onClick={() => {
              add([{ product: p, qty: 1 }]);
              setDone(true);
              setTimeout(() => setDone(false), 1200);
            }}
            className="rounded-full bg-coral px-4 py-2 text-sm font-semibold text-white hover:bg-coral-dark"
          >
            {done ? "Tilføjet" : "Læg i kurv"}
          </button>
        </div>
      </div>
    </li>
  );
}

/** Boksen, der står i stedet for et produkt og folder rolle-agenten ud */
function RoleBox({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <li
      className={`relative flex flex-col overflow-hidden rounded-2xl bg-navy p-5 text-white ${open ? "ring-4 ring-coral/50" : ""}`}
    >
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-coral/40 blur-2xl" />
      <div className="relative flex h-28 items-center justify-center rounded-xl bg-white/10">
        <SparkIcon className="h-14 w-14 text-coral" />
      </div>
      <div className="relative mt-3 text-[11px] font-semibold uppercase tracking-wide text-coral">Rolle-agent</div>
      <div className="relative mt-0.5 text-lg font-bold leading-snug">Vælg IT-udstyr efter din rolle</div>
      <p className="relative mt-1 text-sm text-white/80">
        Fortæl os, hvem I er, så sammensætter vi udstyret til hele teamet. Lager og kompatibilitet er tjekket.
      </p>
      <div className="relative mt-auto pt-4">
        <button
          onClick={onToggle}
          aria-expanded={open}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-coral px-4 py-2.5 font-semibold text-white hover:bg-coral-dark"
        >
          {open ? "Luk rolle-agenten" : "Sammensæt udstyret"}
          <span className={`inline-block transition-transform ${open ? "rotate-180" : ""}`} aria-hidden>
            ▾
          </span>
        </button>
      </div>
    </li>
  );
}

/** Antal kolonner i gitteret (samme brudpunkter som Tailwind-klasserne nedenfor) */
function useColumns() {
  const [cols, setCols] = useState(4);
  useEffect(() => {
    const lg = window.matchMedia("(min-width: 1024px)");
    const sm = window.matchMedia("(min-width: 640px)");
    const update = () => setCols(lg.matches ? 4 : sm.matches ? 2 : 1);
    update();
    lg.addEventListener("change", update);
    sm.addEventListener("change", update);
    return () => {
      lg.removeEventListener("change", update);
      sm.removeEventListener("change", update);
    };
  }, []);
  return cols;
}

const BOX_INDEX = 1;

export function ProductGrid({
  query,
  nav,
  open,
  onToggle,
  panel,
}: {
  query: string;
  nav: string | null;
  open: boolean;
  onToggle: () => void;
  panel: ReactNode;
}) {
  const cols = useColumns();
  const q = query.trim().toLowerCase();
  const aiList = useMemo(
    () =>
      nav && nav !== "ai"
        ? []
        : AI_PRODUCTS.filter((p) => !q || q.split(/\s+/).every((t) => `${p.name} ${p.shortText} ${p.specs.join(" ")} ${p.id} ai agent`.toLowerCase().includes(t))),
    [nav, q],
  );
  const list = useMemo(() => {
    if (nav === "ai") return [];
    const cats = nav ? NAV.find((n) => n.id === nav)?.cats ?? [] : null;
    return PRODUCTS.filter((p) => !cats || cats.includes(p.category))
      .filter((p) => !q || q.split(/\s+/).every((t) => `${p.brand} ${p.name} ${p.raw_spec} ${p.id}`.toLowerCase().includes(t)))
      .sort((a, b) => Number(!!b.image_url) - Number(!!a.image_url) || Number(b.stock_qty > 0) - Number(a.stock_qty > 0));
  }, [q, nav]);

  // Boksen står som nr. 2 i gitteret. Panelet foldes ud som en hel række lige under boksens række.
  const shown = list.slice(0, 40);
  const cells: ReactNode[] = [
    ...aiList.map((p) => <AiProductCard key={p.id} p={p} />),
    ...shown.map((p) => <ProductCard key={p.id} p={p} />),
  ];
  const boxAt = Math.min(BOX_INDEX, cells.length);
  cells.splice(boxAt, 0, <RoleBox key="rolebox" open={open} onToggle={onToggle} />);
  if (open) {
    const rowEnd = Math.min((Math.floor(boxAt / cols) + 1) * cols, cells.length);
    cells.splice(
      rowEnd,
      0,
      <li key="rolepanel" id="rolle-agent" className="rise col-span-full scroll-mt-14">
        {panel}
      </li>,
    );
  }

  const title = nav ? NAV.find((n) => n.id === nav)?.label : query ? `Søgeresultater for "${query}"` : "Populære produkter";
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 md:px-6">
      <div className="flex items-baseline justify-between">
        <h2 className="text-2xl font-bold">{title}</h2>
        <span className="text-sm text-muted">{list.length + aiList.length} varer</span>
      </div>
      {list.length + aiList.length === 0 && <p className="mt-3 text-muted">Ingen varer matcher søgningen.</p>}
      <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{cells}</ul>
    </section>
  );
}
