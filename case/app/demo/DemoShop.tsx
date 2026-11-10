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

export function DemoShop() {
  const agent = useRoleAgent();
  const [query, setQuery] = useState("");
  const [nav, setNav] = useState<string | null>(null);
  const [settings, setSettings] = useState(false);
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

  // Rolle-agenten som én bred chat. Den åbner med spørgsmålet "Hvad er din titel?"
  const panel = (
    <div className="h-[calc(100vh-110px)] max-h-[880px] min-h-[620px]">
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
        prefill=""
      />
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
