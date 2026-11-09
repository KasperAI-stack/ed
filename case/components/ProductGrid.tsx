"use client";

import { useMemo, useState } from "react";
import { PRODUCTS, CATEGORY_LABEL } from "@/lib/brain";
import type { Product } from "@/lib/types";
import { DemoPrice, ProductImage, StockBadge, productStock } from "./ProductVisual";
import { useCart } from "./Cart";
import { NAV } from "./ShopChrome";

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

export function ProductGrid({ query, nav }: { query: string; nav: string | null }) {
  const list = useMemo(() => {
    const cats = nav ? NAV.find((n) => n.id === nav)?.cats ?? [] : null;
    const q = query.trim().toLowerCase();
    return PRODUCTS.filter((p) => !cats || cats.includes(p.category))
      .filter(
        (p) =>
          !q ||
          `${p.brand} ${p.name} ${p.raw_spec} ${p.id}`.toLowerCase().includes(q) ||
          q.split(/\s+/).every((t) => `${p.brand} ${p.name} ${p.raw_spec} ${p.id}`.toLowerCase().includes(t)),
      )
      .sort((a, b) => Number(b.stock_qty > 0) - Number(a.stock_qty > 0));
  }, [query, nav]);

  const title = nav ? NAV.find((n) => n.id === nav)?.label : query ? `Søgeresultater for "${query}"` : "Populære produkter";
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 md:px-6">
      <div className="flex items-baseline justify-between">
        <h2 className="text-2xl font-bold">{title}</h2>
        <span className="text-sm text-muted">{list.length} varer</span>
      </div>
      {list.length === 0 ? (
        <p className="mt-6 text-muted">Ingen varer matcher søgningen.</p>
      ) : (
        <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {list.slice(0, 40).map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </ul>
      )}
    </section>
  );
}
