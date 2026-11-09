"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { Product } from "@/lib/types";
import { CloseIcon, CartIcon } from "./Icons";
import { ProductImage } from "./ProductVisual";
import { formatKr } from "@/lib/brain";

type Line = { product: Product; qty: number };
type CartCtx = {
  lines: Line[];
  count: number;
  total: number;
  add: (items: { product: Product; qty: number }[]) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
  open: boolean;
  setOpen: (v: boolean) => void;
};

const Ctx = createContext<CartCtx | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<Line[]>([]);
  const [open, setOpen] = useState(false);

  const add = useCallback((items: { product: Product; qty: number }[]) => {
    setLines((prev) => {
      const next = [...prev];
      for (const it of items) {
        const i = next.findIndex((l) => l.product.id === it.product.id);
        if (i >= 0) next[i] = { ...next[i], qty: next[i].qty + it.qty };
        else next.push({ product: it.product, qty: it.qty });
      }
      return next;
    });
  }, []);

  const setQty = useCallback((id: string, qty: number) => {
    setLines((prev) => (qty <= 0 ? prev.filter((l) => l.product.id !== id) : prev.map((l) => (l.product.id === id ? { ...l, qty } : l))));
  }, []);

  const value = useMemo<CartCtx>(
    () => ({
      lines,
      count: lines.reduce((s, l) => s + l.qty, 0),
      total: lines.reduce((s, l) => s + l.qty * l.product.demo_price, 0),
      add,
      setQty,
      clear: () => setLines([]),
      open,
      setOpen,
    }),
    [lines, add, setQty, open],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart uden CartProvider");
  return c;
}

export function CartButton() {
  const { count, total, setOpen } = useCart();
  return (
    <button
      onClick={() => setOpen(true)}
      className="flex items-center gap-3 rounded-full border border-line bg-white px-4 py-2 text-navy hover:bg-light"
    >
      <span className="relative">
        <CartIcon className="h-6 w-6" />
        {count > 0 && (
          <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-coral px-1 text-xs font-bold text-white">
            {count}
          </span>
        )}
      </span>
      <span className="text-left leading-tight">
        <span className="block text-sm font-semibold">{formatKr(total)}</span>
        <span className="block text-[11px] text-muted">Demokurv ekskl. moms</span>
      </span>
    </button>
  );
}

export function CartDrawer() {
  const { lines, total, setQty, clear, open, setOpen } = useCart();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-navy/30" onClick={() => setOpen(false)}>
      <aside
        className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        aria-label="Demokurv"
      >
        <div className="flex items-center justify-between border-b border-line px-6 py-5">
          <h2 className="text-xl font-bold">Demokurv</h2>
          <button onClick={() => setOpen(false)} className="rounded-full p-2 hover:bg-light" aria-label="Luk">
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {lines.length === 0 && <p className="text-muted">Kurven er tom.</p>}
          <ul className="space-y-4">
            {lines.map((l) => (
              <li key={l.product.id} className="flex gap-3">
                <ProductImage product={l.product} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{l.product.name}</div>
                  <div className="text-xs text-muted">Varenr. {l.product.id}</div>
                  <div className="mt-1 flex items-center gap-2">
                    <button className="h-7 w-7 rounded-full border border-line" onClick={() => setQty(l.product.id, l.qty - 1)}>
                      −
                    </button>
                    <span className="w-6 text-center text-sm font-semibold">{l.qty}</span>
                    <button className="h-7 w-7 rounded-full border border-line" onClick={() => setQty(l.product.id, l.qty + 1)}>
                      +
                    </button>
                  </div>
                </div>
                <div className="text-right text-sm font-semibold">{formatKr(l.qty * l.product.demo_price)}</div>
              </li>
            ))}
          </ul>
        </div>
        <div className="border-t border-line px-6 py-5">
          <div className="flex items-baseline justify-between">
            <span className="font-semibold">I alt (demopriser ekskl. moms)</span>
            <span className="text-xl font-bold">{formatKr(total)}</span>
          </div>
          <p className="mt-2 text-xs text-muted">Konceptdemo. Der er ingen betaling, og priserne er opdigtede.</p>
          {lines.length > 0 && (
            <button onClick={clear} className="mt-3 text-sm font-medium text-coral-dark underline">
              Tøm kurven
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}
