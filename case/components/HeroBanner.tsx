"use client";

import { PRODUCTS } from "@/lib/brain";
import type { Category } from "@/lib/types";
import { ProductImage } from "./ProductVisual";

/** Ét produkt med billede pr. kategori til banneret */
function pick(category: Category) {
  return PRODUCTS.find((p) => p.category === category && p.image_url && p.stock_qty > 0) ?? PRODUCTS.find((p) => p.category === category)!;
}

export function HeroBanner({ onCta }: { onCta: () => void }) {
  const tiles = [pick("laptop"), pick("monitor"), pick("headset")];
  return (
    <section className="mx-auto max-w-7xl px-4 pt-6 md:px-6">
      <div className="relative overflow-hidden rounded-3xl bg-navy">
        {/* Baggrund: bløde lysfelter i eds farver */}
        <div className="pointer-events-none absolute -right-24 -top-32 h-[420px] w-[420px] rounded-full bg-coral/35 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 left-1/3 h-[360px] w-[360px] rounded-full bg-navy-soft blur-3xl" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />

        <div className="relative grid items-center gap-8 px-8 py-10 md:px-12 lg:grid-cols-[1.15fr_1fr] lg:py-12">
          <div className="text-white">
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-coral">Vælg IT-udstyr efter din rolle</div>
            <h1 className="mt-3 text-4xl font-extrabold leading-[1.1] md:text-5xl">
              Udstyr til nye kolleger, sat sammen efter rolle
            </h1>
            <p className="mt-4 max-w-xl text-lg text-white/85">
              Fortæl os, hvem I er. Rolle-agenten finder bærbar, dock, skærm og headset, tjekker lager og kompatibilitet
              og laver et tilbudsudkast.
            </p>
            <button
              onClick={onCta}
              className="mt-7 rounded-full bg-coral px-7 py-3.5 text-lg font-bold text-white shadow-lg shadow-coral/30 hover:bg-coral-dark"
            >
              Sammensæt udstyret
            </button>
          </div>

          <div className="relative hidden h-[260px] lg:block" aria-hidden>
            {tiles.map((p, i) => (
              <div
                key={p.id}
                className="absolute w-[210px] rounded-2xl bg-white p-3 shadow-2xl"
                style={{
                  left: ["4%", "38%", "62%"][i],
                  top: ["18%", "0%", "34%"][i],
                  transform: `rotate(${[-6, 3, -2][i]}deg)`,
                }}
              >
                <ProductImage product={p} />
                <div className="mt-2 truncate text-sm font-semibold text-navy">{p.name}</div>
                <div className="text-xs font-medium text-ok">● {p.stock_qty >= 500 ? "500+" : p.stock_qty} på lager</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
