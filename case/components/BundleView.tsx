"use client";

import { useState } from "react";
import type { Bundle } from "@/lib/types";
import { CATEGORY_LABEL, formatKr } from "@/lib/brain";
import { ProductImage, StockBadge } from "./ProductVisual";
import { useCart } from "./Cart";
import { QuoteModal } from "./QuoteModal";

/** Agentens anbefalinger vist som produktkort direkte i chatten */
export function BundleView({ bundle }: { bundle: Bundle }) {
  const { add, setOpen } = useCart();
  const [added, setAdded] = useState(false);
  const [quote, setQuote] = useState(false);
  const perPerson = bundle.people > 1 ? Math.round(bundle.total / bundle.people / 100) * 100 : null;

  return (
    <section className="space-y-3" aria-label={bundle.title} data-bundle>
      <div className="flex flex-wrap items-baseline justify-between gap-2 px-1">
        <h3 className="font-bold">{bundle.title}</h3>
        <span className="text-xs text-muted">
          {bundle.lines.length} varer · {bundle.people} {bundle.people === 1 ? "medarbejder" : "medarbejdere"}
        </span>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {bundle.lines.map((l, i) => (
          <li
            key={l.product.id}
            style={{ animationDelay: `${i * 90}ms` }}
            className={`rise flex flex-col rounded-2xl border bg-white p-3 ${l.upsell ? "border-coral ring-2 ring-coral/20" : "border-line"}`}
          >
            <div className="relative">
              <ProductImage product={l.product} />
              {l.upsell && (
                <span className="absolute left-2 top-2 rounded-full bg-coral px-2 py-0.5 text-[11px] font-bold text-white">
                  Forslag
                </span>
              )}
              <span className="absolute right-2 top-2 rounded-full bg-navy px-2 py-0.5 text-[11px] font-bold text-white">
                {l.qty} stk.
              </span>
            </div>
            <div className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
              {l.product.brand} · {CATEGORY_LABEL[l.product.category]}
            </div>
            <div className="font-semibold leading-snug">{l.product.name}</div>
            <p className="mt-1 text-sm text-navy/80">{l.reason}</p>
            <div className="mt-auto space-y-1.5 pt-3">
              <StockBadge status={l.status} text={l.status_text} />
              <div className="flex items-baseline justify-between">
                <span className="font-bold">{formatKr(l.product.demo_price)}</span>
                <span className="text-[11px] uppercase tracking-wide text-muted">Demopris</span>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {bundle.note && <p className="rounded-2xl bg-light px-4 py-3 text-sm">{bundle.note}</p>}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-navy px-4 py-3 text-white">
        <div>
          <div className="text-lg font-bold">{formatKr(bundle.total)}</div>
          <div className="text-xs text-white/75">
            Demopris i alt ekskl. moms{perPerson ? `, ca. ${formatKr(perPerson)} pr. person` : ""}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              add(bundle.lines.map((l) => ({ product: l.product, qty: l.qty })));
              setAdded(true);
              setOpen(true);
            }}
            className="rounded-full bg-coral px-5 py-2.5 font-semibold text-white hover:bg-coral-dark"
          >
            {added ? "Lagt i kurv" : "Læg i kurv"}
          </button>
          <button
            onClick={() => setQuote(true)}
            className="rounded-full border-2 border-white px-5 py-2 font-semibold text-white hover:bg-white hover:text-navy"
          >
            Lav tilbud
          </button>
        </div>
      </div>
      {quote && <QuoteModal bundle={bundle} onClose={() => setQuote(false)} />}
    </section>
  );
}
