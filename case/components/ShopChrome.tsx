"use client";

import Link from "next/link";
import { EdLogo } from "./EdLogo";
import { CartButton } from "./Cart";
import { SearchIcon } from "./Icons";
import { CATEGORY_LABEL } from "@/lib/brain";
import type { Category } from "@/lib/types";

export function ConceptBanner() {
  return (
    <div className="sticky top-0 z-40 bg-navy px-4 py-2 text-center text-sm font-medium text-white">
      Konceptdemo bygget af Kasper Asmussen til samtalen hos ed. Ikke ed&apos;s officielle webshop.
    </div>
  );
}

export const NAV: { id: Category | "mus-tastatur" | "tasker" | "ai"; label: string; cats: Category[] }[] = [
  { id: "ai", label: "AI-agenter", cats: [] },
  { id: "laptop", label: "Bærbare", cats: ["laptop"] },
  { id: "dock", label: "Dockingstationer", cats: ["dock"] },
  { id: "monitor", label: "Skærme", cats: ["monitor"] },
  { id: "headset", label: "Headsets", cats: ["headset"] },
  { id: "mus-tastatur", label: "Mus og tastatur", cats: ["mouse", "keyboard"] },
  { id: "tasker", label: "Tasker og beskyttelse", cats: ["bag", "screen_protection"] },
];

export function ShopHeader({
  query,
  onQuery,
  nav,
  onNav,
}: {
  query: string;
  onQuery: (q: string) => void;
  nav: string | null;
  onNav: (id: string | null) => void;
}) {
  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-4 md:px-6">
        <Link href="/demo/" className="flex items-center" aria-label="ed, til forsiden">
          <EdLogo className="h-9 w-auto" />
        </Link>
        <label className="relative min-w-[220px] flex-1">
          <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Søg efter produkt, mærke eller varenummer"
            className="w-full rounded-full border border-line bg-white py-3 pl-12 pr-4 outline-none focus:border-coral"
          />
        </label>
        <Link href="/" className="hidden text-sm font-semibold text-navy underline-offset-4 hover:underline md:block">
          Om casen
        </Link>
        <CartButton />
      </div>
      <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 pb-3 md:px-6" aria-label="Kategorier">
        <button
          onClick={() => onNav(null)}
          className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ${nav === null ? "bg-navy text-white" : "text-navy hover:bg-light"}`}
        >
          Alle produkter
        </button>
        {NAV.map((n) => (
          <button
            key={n.id}
            onClick={() => onNav(n.id)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ${nav === n.id ? "bg-navy text-white" : "text-navy hover:bg-light"}`}
          >
            {n.label}
          </button>
        ))}
      </nav>
    </header>
  );
}

export { CATEGORY_LABEL };
