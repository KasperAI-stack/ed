"use client";

import type { Bundle } from "@/lib/types";
import { formatKr } from "@/lib/brain";
import { CloseIcon } from "./Icons";
import { EdLogo } from "./EdLogo";

export function QuoteModal({ bundle, onClose }: { bundle: Bundle; onClose: () => void }) {
  const today = new Date().toLocaleDateString("da-DK", { day: "numeric", month: "long", year: "numeric" });
  const valid = new Date(Date.now() + 14 * 864e5).toLocaleDateString("da-DK", { day: "numeric", month: "long", year: "numeric" });
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-navy/40 p-4 md:p-10" onClick={onClose}>
      <div className="w-full max-w-3xl rounded-3xl bg-white p-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="no-print flex items-center justify-between">
          <span className="rounded-full bg-light px-3 py-1 text-sm font-semibold text-coral-dark">Tilbudsudkast</span>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-light" aria-label="Luk">
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 flex flex-wrap justify-between gap-6">
          <div>
            <EdLogo className="h-9 w-auto" />
            <div className="text-sm text-muted">Konceptdemo, ikke et rigtigt tilbud</div>
          </div>
          <div className="text-sm">
            <div>
              <span className="text-muted">Dato:</span> {today}
            </div>
            <div>
              <span className="text-muted">Gyldigt til:</span> {valid}
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-light p-4 text-sm">
          <div className="text-muted">Til</div>
          <div className="font-semibold">[Kundens navn]</div>
          <div>[Kontaktperson]</div>
        </div>

        <h2 className="mt-6 text-xl font-bold">{bundle.title}</h2>
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-muted">
              <th className="py-2 pr-2 font-medium">Vare</th>
              <th className="py-2 pr-2 font-medium">Varenr.</th>
              <th className="py-2 pr-2 text-right font-medium">Antal</th>
              <th className="py-2 pr-2 text-right font-medium">Demopris</th>
              <th className="py-2 text-right font-medium">I alt</th>
            </tr>
          </thead>
          <tbody>
            {bundle.lines.map((l) => (
              <tr key={l.product.id} className="border-b border-line/60 align-top">
                <td className="py-2 pr-2">
                  <div className="font-semibold">{l.product.name}</div>
                  <div className="text-xs text-muted">{l.status_text}</div>
                </td>
                <td className="py-2 pr-2 text-muted">{l.product.id}</td>
                <td className="py-2 pr-2 text-right">{l.qty}</td>
                <td className="py-2 pr-2 text-right">{formatKr(l.product.demo_price)}</td>
                <td className="py-2 text-right font-semibold">{formatKr(l.line_total)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4} className="pt-3 text-right font-semibold">
                I alt ekskl. moms
              </td>
              <td className="pt-3 text-right text-lg font-bold">{formatKr(bundle.total)}</td>
            </tr>
          </tfoot>
        </table>

        <p className="mt-6 rounded-2xl border-2 border-coral bg-light px-4 py-3 font-semibold">
          Udkast. Godkendes af din kontaktperson hos ed, før det sendes.
        </p>
        <p className="mt-2 text-xs text-muted">Alle priser er demopriser og ikke eds priser.</p>

        <div className="no-print mt-6 flex gap-2">
          <button onClick={() => window.print()} className="rounded-full bg-navy px-5 py-2.5 font-semibold text-white">
            Udskriv eller gem som PDF
          </button>
          <button onClick={onClose} className="rounded-full border-2 border-navy px-5 py-2 font-semibold">
            Luk
          </button>
        </div>
      </div>
    </div>
  );
}
