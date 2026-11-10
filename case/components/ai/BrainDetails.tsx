"use client";

import Link from "next/link";
import { CATEGORY_LABEL, PRODUCTS, ROLES, getProduct, stockStatus } from "@/lib/brain";
import type { Category } from "@/lib/types";

const sum = (f: (p: (typeof PRODUCTS)[number]) => number) => PRODUCTS.reduce((s, p) => s + f(p), 0);

/** Company Brain: hvad hjernen ved lige nu, hvor den henter fra, og hvem der bruger den */
export function BrainDetails() {
  const cats = Object.keys(CATEGORY_LABEL) as Category[];
  const tiles = [
    { n: PRODUCTS.length, t: "varer med varenummer og rå leverandørtekst" },
    { n: PRODUCTS.filter((p) => p.stock_qty > 0).length, t: "varer på lager lige nu" },
    { n: PRODUCTS.filter((p) => p.incoming_date).length, t: "varer på vej med forventet dato" },
    { n: PRODUCTS.filter((p) => p.compatible_with.length).length, t: "varer med kompatibilitet fundet i teksten" },
    { n: PRODUCTS.filter((p) => p.size_inch).length, t: "varer med skærmstørrelse til tasker og filtre" },
    { n: ROLES.length, t: "roller med behov og basispakke" },
  ];
  const example = getProduct("40B00300EU")!;
  const ex = stockStatus(example, 10);

  return (
    <div className="space-y-12">
      <div>
        <h2 className="text-3xl font-extrabold">Det ved hjernen lige nu</h2>
        <p className="mt-2 max-w-3xl text-navy/80">
          I demoen er hjernen hentet fra de offentlige sider på shop.ed.dk den 9. november 2026: forsiden, eds fire
          rolle-sider, to kampagnesider og sitemap&apos;et. Alle tal herunder kommer fra de data.
        </p>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tiles.map((t) => (
            <li key={t.t} className="rounded-2xl border border-line bg-white p-5">
              <div className="text-4xl font-extrabold text-navy">{t.n.toLocaleString("da-DK")}</div>
              <div className="mt-1 text-sm text-navy/75">{t.t}</div>
            </li>
          ))}
        </ul>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-line bg-white p-5">
            <div className="text-sm font-bold uppercase tracking-wide text-muted">Varer pr. kategori</div>
            <ul className="mt-3 space-y-2">
              {cats.map((c) => {
                const n = PRODUCTS.filter((p) => p.category === c).length;
                const inStock = PRODUCTS.filter((p) => p.category === c && p.stock_qty > 0).length;
                return (
                  <li key={c} className="grid grid-cols-[150px_1fr_70px] items-center gap-3 text-sm">
                    <span>{CATEGORY_LABEL[c]}</span>
                    <span className="h-2.5 overflow-hidden rounded-full bg-light">
                      <span className="block h-full rounded-full bg-navy" style={{ width: `${(inStock / 20) * 100}%` }} />
                    </span>
                    <span className="text-right text-muted">
                      {inStock} af {n}
                    </span>
                  </li>
                );
              })}
            </ul>
            <div className="mt-3 text-xs text-muted">Bjælken viser varer på lager.</div>
          </div>
          <div className="rounded-2xl border border-line bg-white p-5">
            <div className="text-sm font-bold uppercase tracking-wide text-muted">Stk. på lager pr. lager</div>
            <ul className="mt-3 space-y-3 text-sm">
              {[
                { l: "eds eget lager", n: sum((p) => p.stock_ed ?? 0) },
                { l: "Lokal distributør, levering 1-2 dage", n: sum((p) => p.stock_local ?? 0) },
                { l: "Fjerndistributør, levering 3-5 dage", n: sum((p) => p.stock_remote ?? 0) },
                { l: "På vej med forventet dato", n: sum((p) => p.incoming_qty ?? 0) },
              ].map((r) => (
                <li key={r.l} className="flex justify-between gap-3 border-b border-line pb-2">
                  <span>{r.l}</span>
                  <span className="font-semibold">{r.n.toLocaleString("da-DK")} stk.</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 text-xs text-muted">Shoppen viser højst 500+ pr. lager, så de rigtige tal kan være højere.</div>
          </div>
        </div>
      </div>

      {/* Fra kilde til agent */}
      <div>
        <h2 className="text-3xl font-extrabold">Én hjerne, som alle agenterne henter fra</h2>
        <div className="mt-6 grid items-center gap-4 lg:grid-cols-[1fr_auto_1.1fr_auto_1fr]">
          <ul className="space-y-2">
            {[
              { t: "shop.ed.dk", s: "Produkter, lager og leverancer. Kilden i demoen." },
              { t: "PIM", s: "Specifikationer og billeder. I drift." },
              { t: "ERP", s: "Priser, kundeaftaler og ordrer. I drift." },
              { t: "HubSpot", s: "Kunder, mails og kampagner. I drift." },
            ].map((x) => (
              <li key={x.t} className="rounded-2xl border border-line bg-white px-4 py-3">
                <div className="font-semibold">{x.t}</div>
                <div className="text-xs text-muted">{x.s}</div>
              </li>
            ))}
          </ul>
          <div className="hidden text-2xl text-line lg:block" aria-hidden>
            →
          </div>
          <div className="relative rounded-3xl border-[3px] border-navy bg-white p-6">
            <span className="absolute -right-2 -top-2 h-5 w-5 rounded-full border-2 border-white bg-coral" aria-hidden />
            <div className="text-xs font-bold uppercase tracking-wide text-coral">Company Brain</div>
            <div className="mt-1 text-xl font-extrabold">Ét sandt svar</div>
            <ul className="mt-3 space-y-1 text-sm text-navy/80">
              <li>Specifikationer og kompatibilitet</li>
              <li>Lager pr. lager og varer på vej</li>
              <li>Leveringstid</li>
              <li>Roller og basispakker</li>
            </ul>
          </div>
          <div className="hidden text-2xl text-line lg:block" aria-hidden>
            →
          </div>
          <ul className="space-y-2">
            {[
              { t: "Rolle-agenten", s: "Sammensætter udstyr efter rolle", href: "/demo/?agent=1" },
              { t: "Ad hoc-agenten", s: "Produkttekster, fotos, lager og pris", href: "/demo/produkt/ad-hoc-agenten/" },
              { t: "Trend-agenten", s: "Mandagsrapport til indkøb og marketing", href: "/demo/produkt/trend-agenten/" },
              { t: "Genkøbs-agenten", s: "Genkøb og forslag ud fra udstyret", href: "/demo/produkt/genkoebs-agenten/" },
            ].map((x) => (
              <li key={x.t}>
                <Link href={x.href} className="block rounded-2xl border border-line bg-white px-4 py-3 hover:border-coral">
                  <div className="font-semibold">{x.t}</div>
                  <div className="text-xs text-muted">{x.s}</div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Ét rigtigt eksempel fra hjernen */}
      <div>
        <h2 className="text-3xl font-extrabold">Sådan ser én vare ud i hjernen</h2>
        <p className="mt-2 max-w-3xl text-navy/80">
          På shoppen står kompatibiliteten gemt i en lang tekst. I hjernen er den trukket ud, så agenterne kan bruge den.
        </p>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-line bg-white p-5">
            <div className="text-xs font-bold uppercase tracking-wide text-muted">På shoppen</div>
            <div className="mt-2 font-semibold">{example.name}</div>
            <p className="mt-1 text-sm text-navy/70">{example.raw_spec}</p>
          </div>
          <div className="rounded-2xl border-[3px] border-navy bg-white p-5">
            <div className="text-xs font-bold uppercase tracking-wide text-coral">I hjernen</div>
            <dl className="mt-2 grid grid-cols-[150px_1fr] gap-y-1.5 text-sm">
              <dt className="text-muted">Varenummer</dt>
              <dd className="font-semibold">{example.id}</dd>
              <dt className="text-muted">Kategori</dt>
              <dd>{CATEGORY_LABEL[example.category]}</dd>
              <dt className="text-muted">Passer til</dt>
              <dd className="font-semibold">{example.compatible_with.join(", ")}</dd>
              <dt className="text-muted">Porte</dt>
              <dd>{example.ports?.join(", ")}</dd>
              <dt className="text-muted">Lager</dt>
              <dd>
                eds lager {example.stock_ed}, lokalt {example.stock_local}, fjernlager {example.stock_remote}
              </dd>
              <dt className="text-muted">10 stk. kan leveres</dt>
              <dd>{ex.text}</dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
