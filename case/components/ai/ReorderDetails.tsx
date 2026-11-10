"use client";

import { useMemo, useState } from "react";
import { formatKr, getCompatible, getProduct } from "@/lib/brain";
import type { Product } from "@/lib/types";
import { useCart } from "../Cart";
import { ProductImage, StockBadge, productStock } from "../ProductVisual";

/** Demodata: en opdigtet kunde med ordrer bygget af rigtige varer fra hjernen */
const ORDERS: { no: string; when: string; lines: [string, number][] }[] = [
  { no: "Ordre 1043", when: "marts 2024", lines: [["CY14H", 10], ["DELL-WD25", 10], ["DELL-P2425HHF", 10]] },
  { no: "Ordre 1188", when: "januar 2025", lines: [["27599-999-999", 6], ["920-008683", 6]] },
  { no: "Ordre 1302", when: "september 2025", lines: [["22AW005EMX", 4]] },
];

const MAILFLOWS = [
  {
    t: "Klar til udskiftning",
    s: "Kunder med bærbare, der nærmer sig deres udskiftningstid, får et forslag til nye maskiner med det tilbehør, de allerede har.",
  },
  {
    t: "Nyt tilbehør til jeres model",
    s: "Når der kommer en dock, taske eller et filter til en model, kunden har købt, får kontaktpersonen besked.",
  },
  {
    t: "Forbrugsvarer ved at slippe op",
    s: "Kunder, der køber toner eller andet forbrug fast, får en påmindelse, inden det slipper op.",
  },
];

export function ReorderDetails() {
  const { add, setOpen } = useCart();
  const [input, setInput] = useState("");
  const [customer, setCustomer] = useState<string | null>(null);
  const [added, setAdded] = useState<string | null>(null);

  const orders = useMemo(
    () =>
      ORDERS.map((o) => ({
        ...o,
        items: o.lines.flatMap(([id, qty]) => {
          const product = getProduct(id);
          return product ? [{ product, qty }] : [];
        }),
      })),
    [],
  );

  // Forslag ud fra udstyret, kunden har: tilbehør lavet til modellen eller i den rigtige størrelse
  const suggestions = useMemo(() => {
    const owned = new Set(orders.flatMap((o) => o.items.map((i) => i.product.id)));
    const out: { product: Product; why: string }[] = [];
    for (const o of orders)
      for (const { product } of o.items) {
        if (product.category !== "laptop") continue;
        const c = getCompatible(product.id);
        if (!c) continue;
        const add = (list: { id: string }[], why: string, n: number) => {
          const ok = list
            .map((x) => getProduct(x.id))
            .filter((p): p is Product => !!p && !owned.has(p.id) && p.stock_qty > 0 && !out.some((y) => y.product.id === p.id));
          for (const p of ok.slice(0, n)) out.push({ product: p, why });
        };
        add(c.made_for_this_model, `Lavet til jeres ${product.name}`, 1);
        add(c.screen_filters_that_fit_screen_size, `Passer til ${c.screen_size_inch}" skærmen på jeres ${product.name}`, 1);
        add(c.bags_that_fit_screen_size, `Passer til jeres ${product.name}`, 1);
      }
    return out.slice(0, 4);
  }, [orders]);

  if (!customer) {
    return (
      <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <h2 className="text-3xl font-extrabold">Prøv med et kundenummer</h2>
          <p className="mt-2 text-navy/80">
            Kunden logger ind eller skriver sit kundenummer og ser sine tidligere ordrer, kan genbestille med ét klik og får
            forslag, der passer til det udstyr, de allerede har.
          </p>
          <form
            className="mt-5 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setCustomer(input.trim() || "10042");
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Fx 10042"
              inputMode="numeric"
              className="flex-1 rounded-full border border-line px-5 py-3 outline-none focus:border-coral"
              aria-label="Kundenummer"
            />
            <button className="rounded-full bg-coral px-6 font-semibold text-white hover:bg-coral-dark">Vis mine ordrer</button>
          </form>
          <p className="mt-2 text-xs text-muted">Alle kundenumre viser den samme demokunde. Ordrerne er opdigtede, varerne er rigtige.</p>
        </div>
        <MailFlows />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-muted">Kundenummer {customer}</div>
          <h2 className="text-3xl font-extrabold">Velkommen tilbage, Demokunde ApS</h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-light px-3 py-1 text-sm font-semibold text-coral-dark">Demodata</span>
          <button onClick={() => setCustomer(null)} className="text-sm font-semibold text-muted underline">
            Skift kunde
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <section>
          <h3 className="text-sm font-bold uppercase tracking-wide text-muted">Tidligere ordrer</h3>
          <ul className="mt-3 space-y-3">
            {[...orders].reverse().map((o, i) => {
              const total = o.items.reduce((s, x) => s + x.qty * x.product.demo_price, 0);
              return (
                <li key={o.no} className={`rounded-2xl border border-line bg-white p-4 ${i > 0 ? "opacity-90" : ""}`}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div className="font-semibold">
                      {o.no} <span className="font-normal text-muted">· {o.when}</span>
                    </div>
                    <div className="text-sm font-semibold">{formatKr(total)}</div>
                  </div>
                  <ul className="mt-3 space-y-2">
                    {o.items.map(({ product, qty }) => {
                      const s = productStock(product);
                      return (
                        <li key={product.id} className="flex items-center gap-3 text-sm">
                          <ProductImage product={product} size="sm" />
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold leading-snug">
                              {qty} × {product.name}
                            </div>
                            <StockBadge status={s.status} text={s.text} />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  <button
                    onClick={() => {
                      add(o.items.map((x) => ({ product: x.product, qty: x.qty })));
                      setAdded(o.no);
                      setOpen(true);
                    }}
                    className="mt-4 rounded-full bg-coral px-5 py-2 text-sm font-semibold text-white hover:bg-coral-dark"
                  >
                    {added === o.no ? "Lagt i kurv" : "Genbestil med ét klik"}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="space-y-6">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-muted">Passer til jeres udstyr</h3>
            <ul className="mt-3 space-y-3">
              {suggestions.map(({ product, why }) => {
                const s = productStock(product);
                return (
                  <li key={product.id} className="relative flex gap-3 rounded-2xl border border-coral bg-white p-3">
                    <span className="absolute -right-1.5 -top-1.5 h-4 w-4 rounded-full border-2 border-white bg-coral" aria-hidden />
                    <ProductImage product={product} size="sm" />
                    <div className="min-w-0 flex-1 text-sm">
                      <div className="font-semibold leading-snug">{product.name}</div>
                      <div className="text-navy/75">{why}</div>
                      <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                        <StockBadge status={s.status} text={s.text} />
                        <button
                          onClick={() => {
                            add([{ product, qty: 1 }]);
                            setOpen(true);
                          }}
                          className="rounded-full border-2 border-navy px-3 py-1 text-xs font-semibold hover:bg-navy hover:text-white"
                        >
                          Læg i kurv
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="mt-2 text-xs text-muted">Forslagene kommer fra hjernens kompatibilitet og skærmstørrelser.</p>
          </div>
          <MailFlows />
        </section>
      </div>
    </div>
  );
}

function MailFlows() {
  return (
    <div>
      <h3 className="text-sm font-bold uppercase tracking-wide text-muted">De samme data i mails til kundegrupper</h3>
      <ul className="mt-3 space-y-3">
        {MAILFLOWS.map((m, i) => (
          <li key={m.t} className="flex gap-3 rounded-2xl border border-line bg-white p-4" style={{ opacity: [1, 0.9, 0.8][i] }}>
            <svg viewBox="0 0 34 26" className="h-7 w-9 shrink-0" aria-hidden>
              <rect x="1" y="1" width="32" height="24" rx="5" fill="#fff" stroke="#1a1d56" strokeWidth="2" />
              <path d="M6 7 L17 15 L28 7" fill="none" stroke="#1a1d56" strokeWidth="2" strokeLinejoin="round" />
            </svg>
            <div className="text-sm">
              <div className="font-semibold">{m.t}</div>
              <div className="text-navy/75">{m.s}</div>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-muted">Kundegrupper og mails sendes via HubSpot.</p>
    </div>
  );
}
