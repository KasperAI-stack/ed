"use client";

import { useState } from "react";
import type { Bundle } from "@/lib/types";
import { CATEGORY_LABEL, formatKr } from "@/lib/brain";
import { DemoPrice, ProductImage, StockBadge } from "./ProductVisual";
import { useCart } from "./Cart";
import { QuoteModal } from "./QuoteModal";

export function BundleView({ bundle }: { bundle: Bundle }) {
  const { add, setOpen } = useCart();
  const [added, setAdded] = useState(false);
  const [quote, setQuote] = useState(false);

  return (
    <section className="rise rounded-3xl border border-line bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-lg font-bold">{bundle.title}</h3>
        <span className="text-sm text-muted">
          {bundle.people} {bundle.people === 1 ? "medarbejder" : "medarbejdere"}
        </span>
      </div>

      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {bundle.lines.map((l) => (
          <li
            key={l.product.id}
            className={`flex gap-3 rounded-2xl border p-3 ${l.upsell ? "border-coral bg-light" : "border-line bg-white"}`}
          >
            <ProductImage product={l.product} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
                {CATEGORY_LABEL[l.product.category]}
                {l.upsell && <span className="rounded-full bg-coral px-2 py-0.5 text-white normal-case">Forslag</span>}
              </div>
              <div className="font-semibold leading-snug">
                {l.product.name.startsWith(l.product.brand) ? l.product.name : `${l.product.brand} ${l.product.name}`}
              </div>
              <p className="mt-1 text-sm text-navy/80">{l.reason}</p>
              <div className="mt-2 flex flex-wrap items-end justify-between gap-2">
                <StockBadge status={l.status} text={l.status_text} />
                <div className="text-right">
                  <div className="text-sm font-bold">
                    {l.qty} × {formatKr(l.product.demo_price)}
                  </div>
                  <div className="text-[11px] text-muted">Demopris</div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {bundle.note && <p className="mt-4 rounded-2xl bg-light px-4 py-3 text-sm">{bundle.note}</p>}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-4">
        <DemoPrice amount={bundle.total} />
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
            className="rounded-full border-2 border-navy px-5 py-2 font-semibold text-navy hover:bg-navy hover:text-white"
          >
            Lav tilbud
          </button>
        </div>
      </div>
      {quote && <QuoteModal bundle={bundle} onClose={() => setQuote(false)} />}
    </section>
  );
}
