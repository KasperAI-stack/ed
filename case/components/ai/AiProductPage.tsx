"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AI_PRODUCTS, aiBySlug } from "@/lib/aiProducts";
import { KEY_STORAGE, readLocal, writeLocal } from "@/lib/storage";
import { CartButton, CartDrawer, CartProvider } from "../Cart";
import { ConceptBanner } from "../ShopChrome";
import { AiArt } from "../AiIllustrations";
import { StockBadge } from "../ProductVisual";
import { SettingsModal } from "../SettingsModal";
import { BrainDetails } from "./BrainDetails";
import { AdhocDetails } from "./AdhocDetails";
import { TrendDetails } from "./TrendDetails";
import { ReorderDetails } from "./ReorderDetails";

export function AiProductPage({ slug }: { slug: string }) {
  const p = aiBySlug(slug)!;
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [settings, setSettings] = useState(false);
  useEffect(() => setApiKey(readLocal(KEY_STORAGE)), []);
  const saveKey = (k: string | null) => {
    writeLocal(KEY_STORAGE, k);
    setApiKey(k);
  };
  const others = AI_PRODUCTS.filter((x) => x.slug !== slug);

  return (
    <CartProvider>
      <ConceptBanner />
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-4 md:px-6">
          <Link href="/demo/" className="flex items-baseline gap-1.5" aria-label="ed demo, forsiden">
            <span className="text-3xl font-extrabold tracking-tight text-navy">ed</span>
            <span className="rounded-md bg-coral px-1.5 py-0.5 text-xs font-bold uppercase tracking-wide text-white">demo</span>
          </Link>
          <nav className="flex flex-1 gap-1 text-sm font-semibold">
            <Link href="/demo/" className="rounded-full px-4 py-2 hover:bg-light">
              Alle produkter
            </Link>
            <Link href="/demo/?kat=ai" className="rounded-full bg-navy px-4 py-2 text-white">
              AI-agenter
            </Link>
          </nav>
          <Link href="/" className="hidden text-sm font-semibold underline-offset-4 hover:underline md:block">
            Om casen
          </Link>
          <CartButton />
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <nav className="py-4 text-sm text-muted" aria-label="Brødkrummer">
            <Link href="/demo/" className="hover:underline">
              Alle produkter
            </Link>{" "}
            ›{" "}
            <Link href="/demo/?kat=ai" className="hover:underline">
              AI-agenter
            </Link>{" "}
            › <span className="text-navy">{p.name}</span>
          </nav>

          {/* Toppen af produktsiden, som på shoppen */}
          <section className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
            <div className="self-start overflow-hidden rounded-3xl border border-line bg-[#f2f2f8]">
              <AiArt kind={p.illustration} className="block aspect-[520/330] h-auto w-full" />
            </div>
            <div className="flex flex-col">
              <div className="text-sm font-semibold uppercase tracking-wide text-muted">ed · AI-agenter</div>
              <h1 className="mt-1 text-4xl font-extrabold leading-tight">{p.name}</h1>
              <p className="mt-4 text-lg leading-relaxed text-navy/85">{p.shortText}</p>
              <div className="mt-5 space-y-1 text-sm">
                <div>
                  <span className="text-muted">Varenummer</span> <span className="font-semibold">{p.id}</span>
                </div>
                <StockBadge status="in_stock" text={p.stockText} />
              </div>
              <div className="mt-6 rounded-2xl bg-light p-5">
                <div className="text-2xl font-bold">Efter aftale</div>
                <div className="text-xs font-medium uppercase tracking-wide text-muted">Pris</div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <a href="#saadan-virker-det" className="rounded-full bg-coral px-6 py-3 font-semibold text-white hover:bg-coral-dark">
                    {p.cta}
                  </a>
                  <a
                    href="mailto:kasmussen80@gmail.com?subject=Agenter%20til%20ed"
                    className="rounded-full border-2 border-navy px-6 py-2.5 font-semibold hover:bg-navy hover:text-white"
                  >
                    Kontakt Kasper
                  </a>
                </div>
              </div>
              <div className="mt-6">
                <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Specifikationer</h2>
                <table className="mt-2 w-full text-sm">
                  <tbody>
                    {p.specs.map((s) => (
                      <tr key={s} className="border-b border-line">
                        <td className="py-2 pr-3 text-ok">●</td>
                        <td className="w-full py-2">{s.charAt(0).toUpperCase() + s.slice(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section id="saadan-virker-det" className="scroll-mt-14 py-12">
            {p.illustration === "brain" && <BrainDetails />}
            {p.illustration === "adhoc" && <AdhocDetails apiKey={apiKey} onOpenSettings={() => setSettings(true)} />}
            {p.illustration === "trend" && <TrendDetails />}
            {p.illustration === "reorder" && <ReorderDetails />}
          </section>

          <section className="border-t border-line py-10">
            <h2 className="text-2xl font-bold">Andre agenter, der henter fra samme hjerne</h2>
            <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {others.map((o) => (
                <li key={o.slug}>
                  <Link href={`/demo/produkt/${o.slug}/`} className="block rounded-2xl border border-line bg-white p-4 hover:shadow-md">
                    <div className="h-24 overflow-hidden rounded-xl bg-[#f2f2f8]">
                      <AiArt kind={o.illustration} className="h-full w-full" />
                    </div>
                    <div className="mt-3 font-semibold">{o.name}</div>
                    <div className="text-xs text-muted">Varenr. {o.id}</div>
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/demo/?agent=1" className="flex h-full flex-col justify-between rounded-2xl bg-navy p-4 text-white hover:shadow-md">
                  <div className="text-xs font-semibold uppercase tracking-wide text-coral">Kører live</div>
                  <div>
                    <div className="mt-2 font-semibold">Rolle-agenten</div>
                    <div className="text-sm text-white/80">Vælg IT-udstyr efter din rolle, i chatten i shoppen.</div>
                  </div>
                </Link>
              </li>
            </ul>
          </section>
        </div>
      </main>

      <footer className="border-t border-line bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-muted md:px-6">
          <span>Konceptdemo bygget af Kasper Asmussen til samtalen hos ed. Ikke ed&apos;s officielle webshop.</span>
          <Link href="/" className="font-semibold text-navy underline">
            Tilbage til casen
          </Link>
        </div>
      </footer>
      <CartDrawer />
      {settings && <SettingsModal apiKey={apiKey} onSave={saveKey} onClose={() => setSettings(false)} />}
    </CartProvider>
  );
}
