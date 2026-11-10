"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CartDrawer, CartProvider } from "@/components/Cart";
import { ConceptBanner, ShopHeader } from "@/components/ShopChrome";
import { HeroBanner } from "@/components/HeroBanner";
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
  const [open, setOpen] = useState(false);
  const [scrollTick, setScrollTick] = useState(0);

  // Links fra produktsiderne: ?kat=ai viser AI-agenterne, ?agent=1 åbner rolle-agenten
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("kat")) setNav(q.get("kat"));
    if (q.get("agent") === "1") {
      setOpen(true);
      setScrollTick((n) => n + 1);
    }
  }, []);

  // Rul ned til rolle-agenten, når den foldes ud
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => document.getElementById("rolle-agent")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
    return () => clearTimeout(t);
  }, [open, scrollTick]);

  const openAgent = () => {
    setOpen(true);
    setScrollTick((n) => n + 1);
  };

  const panel = (
    <div className="grid gap-5 rounded-3xl border border-line bg-light p-4 md:p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,2.4fr)]">
      <div>
        <h2 className="text-2xl font-extrabold leading-tight">Hvem skal have udstyr?</h2>
        <p className="mt-2 text-sm text-navy/80">
          Vælg en rolle, eller skriv frit. Agenten sammensætter en pakke pr. person og viser produkterne i chatten.
        </p>
        <ul className="mt-4 space-y-2.5">
          {ROLE_TILES.map((r) => (
            <li key={r.title}>
              <button
                onClick={() => setPrefill(r.prompt + " ")}
                className="group w-full rounded-2xl border border-line bg-white p-3.5 text-left transition hover:border-coral hover:shadow-md"
              >
                <div className="font-bold group-hover:text-coral-dark">{r.title}</div>
                <div className="mt-0.5 text-sm text-navy/75">{r.text}</div>
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-muted">
          Produkter, varenumre og lager er hentet fra de offentlige sider på shop.ed.dk den 9. november 2026. Priserne
          er opdigtede demopriser.
        </p>
      </div>
      <div className="h-[calc(100vh-110px)] max-h-[860px] min-h-[600px]">
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
  );

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
        <HeroBanner onCta={openAgent} />
        <div id="produkter" className="scroll-mt-10">
          <ProductGrid query={query} nav={nav} open={open} onToggle={() => (open ? setOpen(false) : openAgent())} panel={panel} />
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
