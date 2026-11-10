"use client";

import { formatDate, getProduct } from "@/lib/brain";
import { ProductImage } from "../ProductVisual";

/** Varer med rigtige lager- og leveringsdata fra hjernen */
const WATCH = ["36699-999-899", "AV4P1AA#ABB", "920-010931", "4XJ1U03944"];

/** Eksempler på signaler. Der findes ingen offentlige søgetal, så de vises uden tal. */
const SIGNALS = [
  { t: "Headsets med aktiv støjdæmpning til åbne kontorer", s: "Stigende" },
  { t: "Bærbare, der er klar til 5G", s: "Stigende" },
  { t: "Privacy-filtre til 14 tommer", s: "Stabil" },
];

export function TrendDetails() {
  const items = WATCH.map((id) => getProduct(id)).filter((p): p is NonNullable<typeof p> => !!p);
  // Headsettet, der får flest stk. ind, bruges i kampagneforslaget
  const coming = getProduct("AV4P1AA#ABB");
  const evolve = getProduct("36699-999-899");

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-3xl font-extrabold">Mandagsrapporten</h2>
          <p className="mt-2 max-w-3xl text-navy/80">
            Hver mandag sender agenten en kort plan til indkøb og marketing. Lager og varer på vej herunder er rigtige tal
            fra hjernen. Søgetrends er eksempler, fordi der ikke findes offentlige søgetal for shoppen.
          </p>
        </div>
        <span className="rounded-full bg-light px-3 py-1 text-sm font-semibold text-coral-dark">Eksempel på en rapport</span>
      </div>

      <article className="relative">
        {/* Tidligere uger bagved */}
        <div className="absolute inset-0 translate-x-4 -translate-y-4 rounded-3xl border border-line bg-white opacity-40" aria-hidden />
        <div className="absolute inset-0 translate-x-2 -translate-y-2 rounded-3xl border border-line bg-white opacity-70" aria-hidden />
        <div className="relative rounded-3xl border border-line bg-white p-6 shadow-sm md:p-8">
          <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-wide text-muted">Trend-agenten · mandag i uge 46</div>
              <h3 className="mt-1 text-2xl font-extrabold">Ugens plan til indkøb og marketing</h3>
            </div>
            <div className="text-sm text-muted">Til: Indkøb, Marketing</div>
          </header>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <section>
              <h4 className="text-sm font-bold uppercase tracking-wide text-muted">1. Det søger markedet efter</h4>
              <ul className="mt-3 space-y-3">
                {SIGNALS.map((s, i) => (
                  <li key={s.t} className="rounded-2xl bg-light p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold">{s.t}</span>
                      {i === 0 && <span className="h-3 w-3 shrink-0 rounded-full bg-coral" aria-label="Markeret" />}
                    </div>
                    <svg viewBox="0 0 120 28" className="mt-2 h-7 w-full" aria-hidden>
                      <polyline
                        points={s.s === "Stigende" ? (i === 0 ? "0,24 20,22 40,23 60,19 80,18 95,8 120,6" : "0,22 30,21 60,18 90,15 120,12") : "0,16 30,15 60,17 90,15 120,16"}
                        fill="none"
                        stroke={i === 0 ? "#ff7456" : "#1a1d56"}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <div className="text-xs text-muted">{s.s} · eksempel</div>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h4 className="text-sm font-bold uppercase tracking-wide text-muted">2. Lager og varer på vej</h4>
              <ul className="mt-3 space-y-3">
                {items.map((p) => (
                  <li key={p.id} className="flex gap-3 rounded-2xl border border-line p-3">
                    <ProductImage product={p} size="sm" />
                    <div className="min-w-0 text-sm">
                      <div className="font-semibold leading-snug">{p.name}</div>
                      <div className="text-ok">● {p.stock_qty.toLocaleString("da-DK")} på lager</div>
                      {p.incoming_date && (p.incoming_qty ?? 0) > 0 && (
                        <div className="text-navy/75">
                          {(p.incoming_qty ?? 0).toLocaleString("da-DK")} på vej, forventes {formatDate(p.incoming_date)}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-2 text-xs text-muted">Rigtige tal fra shop.ed.dk den 9. november 2026.</div>
            </section>

            <section>
              <h4 className="text-sm font-bold uppercase tracking-wide text-muted">3. Forslag til næste kampagne</h4>
              <div className="mt-3 rounded-2xl border-[3px] border-navy p-4">
                <div className="text-lg font-bold leading-snug">Headsets til åbne kontorer</div>
                <p className="mt-2 text-sm text-navy/80">
                  Søgningen efter støjdæmpning stiger, og {evolve?.name} har{" "}
                  {evolve?.stock_qty.toLocaleString("da-DK")} på lager.
                  {coming?.incoming_date
                    ? ` ${coming.name} får ${(coming.incoming_qty ?? 0).toLocaleString("da-DK")} stk. ind ${formatDate(coming.incoming_date)}.`
                    : ""}{" "}
                  Der er varer nok til en kampagne.
                </p>
                <ul className="mt-3 space-y-2 text-sm">
                  {[
                    "Indkøb: bekræft leveringen af varerne på vej",
                    "Marketing: banner på forsiden og nyhedsbrev",
                    "Salg: ring til kunder, der har købt bærbare det seneste år",
                  ].map((t, i) => (
                    <li key={t} className="flex gap-2">
                      <span
                        className={`mt-0.5 inline-block h-4 w-4 shrink-0 rounded border-2 border-navy ${i < 2 ? "bg-navy" : ""}`}
                        aria-hidden
                      />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          </div>
        </div>
      </article>

      <div className="rounded-2xl bg-light p-5 text-sm text-navy/80">
        <span className="font-semibold text-navy">Det samme mønster står allerede på shoppen.</span> Forsiden kører lige
        nu et HP-banner for uge 46 og et banner for Jabra Evolve3. I dag sættes den slags op i hånden på tværs af indkøb og
        marketing. Trend-agenten laver forarbejdet hver mandag, så teamet kun skal tage stilling.
      </div>
    </div>
  );
}
