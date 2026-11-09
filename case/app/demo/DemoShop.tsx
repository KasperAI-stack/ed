"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { CartDrawer, CartProvider } from "@/components/Cart";
import { ConceptBanner, ShopHeader } from "@/components/ShopChrome";
import { ProductGrid } from "@/components/ProductGrid";
import { RoleChat } from "@/components/RoleChat";
import { SettingsModal } from "@/components/SettingsModal";
import { useRoleAgent } from "@/lib/useRoleAgent";

const ROLE_TILES = [
  {
    title: "Administration, kundeservice og HR",
    text: "Enkle og stabile arbejdsredskaber til hverdagens opgaver.",
    prompt: "Vi har 3 nye i kundeservice, der starter i januar. De sidder fast på kontoret og har mange opkald.",
  },
  {
    title: "Ledelse, finans og salg",
    text: "Effektive løsninger til analyse, planlægning og forretningskritiske opgaver.",
    prompt: "Vi skal udstyre en ny økonomichef, der rejser en del og arbejder med fortrolige tal.",
  },
  {
    title: "Design, grafik og marketing",
    text: "Kraftfulde computere og skærme i høj kvalitet til kreative workflows.",
    prompt: "En grafiker til vores marketingteam, budget omkring 20.000 kr.",
  },
  {
    title: "IT, udvikling og drift",
    text: "Pålideligt udstyr til udvikling, drift, support og infrastruktur.",
    prompt: "Vi ansætter 2 udviklere. De skal have to skærme og kører tunge programmer.",
  },
];

export function DemoShop() {
  const agent = useRoleAgent();
  const [query, setQuery] = useState("");
  const [nav, setNav] = useState<string | null>(null);
  const [settings, setSettings] = useState(false);
  const [prefill, setPrefill] = useState("");
  const chatRef = useRef<HTMLDivElement>(null);

  return (
    <CartProvider>
      <ConceptBanner />
      <ShopHeader
        query={query}
        onQuery={setQuery}
        nav={nav}
        onNav={(id) => {
          setNav(id);
          document.getElementById("produkter")?.scrollIntoView({ behavior: "smooth" });
        }}
      />

      <main className="flex-1">
        <section className="bg-light">
          <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 md:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <div>
              <h1 className="text-3xl font-extrabold leading-tight">Vælg IT-udstyr efter din rolle</h1>
              <p className="mt-2 text-navy/80">
                Vælg en rolle, eller skriv til rolle-agenten. Den sammensætter en pakke pr. person ud fra produkter,
                lager og kompatibilitet.
              </p>
              <ul className="mt-5 space-y-3">
                {ROLE_TILES.map((r) => (
                  <li key={r.title}>
                    <button
                      onClick={() => {
                        setPrefill(r.prompt + " ");
                        chatRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                      className="group w-full rounded-2xl border border-line bg-white p-4 text-left transition hover:border-coral hover:shadow-md"
                    >
                      <div className="font-bold group-hover:text-coral-dark">{r.title}</div>
                      <div className="mt-1 text-sm text-navy/75">{r.text}</div>
                    </button>
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-xs text-muted">
                Produkter, varenumre og lager er hentet fra de offentlige sider på shop.ed.dk den 9. november 2026.
                Priserne er opdigtede demopriser.
              </p>
            </div>

            <div ref={chatRef} className="h-[720px] scroll-mt-16 lg:h-[calc(100vh-225px)] lg:min-h-[600px]">
              <RoleChat
                items={agent.items}
                busy={agent.busy}
                live={agent.live}
                offline={agent.offline}
                onSend={agent.send}
                onQuick={agent.startFresh}
                onStop={agent.stop}
                onReset={agent.reset}
                onOpenSettings={() => setSettings(true)}
                prefill={prefill}
              />
            </div>
          </div>
        </section>

        <div id="produkter">
          <ProductGrid query={query} nav={nav} />
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
      {settings && <SettingsModal apiKey={agent.apiKey} onSave={agent.setApiKey} onClose={() => setSettings(false)} />}
    </CartProvider>
  );
}
