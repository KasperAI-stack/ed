"use client";

import { useEffect, useRef, useState } from "react";
import type { Product, StockStatus } from "@/lib/types";
import { CategoryIcon } from "./Icons";
import { stockStatus } from "@/lib/brain";

/** Produktbillede fra shoppen, med et ikon som reserve, hvis billedet mangler eller ikke kan hentes */
export function ProductImage({ product, size = "md" }: { product: Product; size?: "sm" | "md" }) {
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  // Fejler billedet, før siden er startet, når onError ikke at blive kaldt. Derfor tjekkes det også her.
  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) setFailed(true);
  }, []);
  const box = size === "sm" ? "h-16 w-16" : "h-28 w-full";
  if (product.image_url && !failed) {
    return (
      <div className={`${box} flex items-center justify-center rounded-xl bg-white`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={product.image_url}
          alt={product.name}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="max-h-full max-w-full object-contain"
        />
      </div>
    );
  }
  return (
    <div className={`${box} flex items-center justify-center rounded-xl bg-light text-coral`}>
      <CategoryIcon category={product.category} className={size === "sm" ? "h-9 w-9" : "h-14 w-14"} />
    </div>
  );
}

const STATUS_STYLE: Record<StockStatus, string> = {
  in_stock: "text-ok",
  partial: "text-warn",
  incoming: "text-warn",
  out_of_stock: "text-bad",
};

export function StockBadge({ status, text }: { status: StockStatus; text: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${STATUS_STYLE[status]}`}>
      <span className="h-2 w-2 rounded-full bg-current" aria-hidden />
      {text}
    </span>
  );
}

/** Lagerstatus for ét stk., som på shoppens produktkort */
export function productStock(p: Product): { status: StockStatus; text: string } {
  return stockStatus(p, 1);
}

export function DemoPrice({ amount, className }: { amount: number; className?: string }) {
  return (
    <div className={className}>
      <div className="text-lg font-bold text-navy">{amount.toLocaleString("da-DK")} kr.</div>
      <div className="text-xs font-medium uppercase tracking-wide text-muted">Demopris ekskl. moms</div>
    </div>
  );
}
