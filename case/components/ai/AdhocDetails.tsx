"use client";

import { useEffect, useRef, useState } from "react";
import { getProduct, stockStatus } from "@/lib/brain";
import { ADHOC_ROLES, savedText, writeProductText } from "@/lib/adhoc";
import { describeError } from "@/lib/agent";
import { ProductImage, StockBadge } from "../ProductVisual";

/** Fem rigtige varer fra shoppen med rå leverandørtekst */
const PICKS = ["40B00300EU", "DELL-WD25", "9T5B2AA#UUW", "4XJ1U03944", "36699-999-899"];

export function AdhocDetails({ apiKey, onOpenSettings }: { apiKey: string | null; onOpenSettings: () => void }) {
  const [pid, setPid] = useState(PICKS[0]);
  const [role, setRole] = useState<(typeof ADHOC_ROLES)[number]>(ADHOC_ROLES[0]);
  const [text, setText] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [approved, setApproved] = useState<Record<string, boolean>>({});
  const abort = useRef<AbortController | null>(null);
  const product = getProduct(pid)!;
  const stock = stockStatus(product, 1);
  const approvalKey = `${pid}::${role.id}`;

  // Vis en tekst, der allerede er skrevet i denne browser
  useEffect(() => {
    abort.current?.abort();
    setBusy(false);
    setErr("");
    setText(savedText(pid, role.id) ?? "");
  }, [pid, role]);

  async function write() {
    if (!apiKey) return onOpenSettings();
    setBusy(true);
    setErr("");
    setText("");
    const ctrl = new AbortController();
    abort.current = ctrl;
    try {
      const t = await writeProductText({
        apiKey,
        product,
        roleId: role.id,
        roleLabel: role.label,
        onDelta: (d) => setText((x) => x + d),
        signal: ctrl.signal,
      });
      setText(t);
    } catch (e) {
      if (!ctrl.signal.aborted) setErr(describeError(e));
    } finally {
      setBusy(false);
    }
  }

  const [headline, , ...rest] = text.split("\n");
  const body = rest.filter((l) => !l.startsWith("•")).join(" ").trim();
  const bullets = rest.filter((l) => l.startsWith("•")).map((l) => l.replace(/^•\s*/, ""));

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-extrabold">Prøv agenten på rigtige varer</h2>
        <p className="mt-2 max-w-3xl text-navy/80">
          Vælg en vare og en rolle. Til venstre står leverandørens tekst, som den står på shoppen i dag. Til højre skriver
          agenten en dansk produkttekst til den rolle. Teksten gemmes i denne browser, så den også kan vises uden net.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {PICKS.map((id) => {
          const p = getProduct(id)!;
          return (
            <button
              key={id}
              onClick={() => setPid(id)}
              className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                pid === id ? "border-navy bg-navy text-white" : "border-line bg-white hover:border-coral"
              }`}
            >
              {p.name.length > 34 ? p.name.slice(0, 32) + "…" : p.name}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-muted">Skriv til</span>
        {ADHOC_ROLES.map((r) => (
          <button
            key={r.id}
            onClick={() => setRole(r)}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold ${
              role.id === r.id ? "border-coral bg-coral text-white" : "border-coral bg-light text-navy hover:bg-coral hover:text-white"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="grid items-stretch gap-4 lg:grid-cols-[1fr_auto_1fr]">
        <div className="rounded-3xl border border-line bg-white p-6 opacity-90">
          <div className="text-xs font-bold uppercase tracking-wide text-muted">Før · leverandørens tekst</div>
          <div className="mt-3 flex gap-4">
            <ProductImage product={product} size="sm" />
            <div>
              <div className="font-semibold">{product.name}</div>
              <div className="text-xs text-muted">Varenr. {product.id}</div>
            </div>
          </div>
          <p className="mt-4 font-mono text-sm leading-relaxed text-navy/70">{product.raw_spec}</p>
        </div>
        <div className="hidden items-center text-3xl text-navy lg:flex" aria-hidden>
          →
        </div>
        <div className="rounded-3xl border-[3px] border-navy bg-white p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs font-bold uppercase tracking-wide text-coral">Efter · til {role.label.toLowerCase()}</div>
            {text && !busy && (
              <button onClick={write} className="text-xs font-semibold text-muted underline">
                Skriv igen
              </button>
            )}
          </div>
          {text ? (
            <div className={`mt-3 ${busy ? "typing-caret" : ""}`}>
              {busy ? (
                <p className="whitespace-pre-wrap leading-relaxed">{text}</p>
              ) : (
                <>
                  <h3 className="text-xl font-bold leading-snug">{headline}</h3>
                  {body && <p className="mt-2 leading-relaxed text-navy/85">{body}</p>}
                  {bullets.length > 0 && (
                    <ul className="mt-3 space-y-1 text-sm">
                      {bullets.map((b) => (
                        <li key={b} className="flex gap-2">
                          <span className="text-coral">●</span>
                          {b}
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl bg-light p-4">
              <p className="text-sm text-navy/80">
                {apiKey
                  ? "Agenten har ikke skrevet en tekst til denne vare og rolle endnu."
                  : "Agenten kører med din Anthropic-nøgle, ligesom rolle-agenten. Tænd den for at prøve."}
              </p>
              <button
                onClick={write}
                disabled={busy}
                className="mt-3 rounded-full bg-coral px-5 py-2.5 font-semibold text-white hover:bg-coral-dark disabled:opacity-50"
              >
                {busy ? "Skriver…" : apiKey ? "Lad agenten skrive teksten" : "Tænd agenten"}
              </button>
            </div>
          )}
          {err && <p className="mt-3 text-sm text-bad">{err}</p>}
          {text && !busy && (
            <div className="mt-5 flex items-center gap-3 border-t border-line pt-4">
              {approved[approvalKey] ? (
                <span className="text-sm font-semibold text-ok">● Godkendt. Klar til at gå live.</span>
              ) : (
                <>
                  <button
                    onClick={() => setApproved((a) => ({ ...a, [approvalKey]: true }))}
                    className="rounded-full bg-navy px-5 py-2 text-sm font-semibold text-white"
                  >
                    Godkend
                  </button>
                  <span className="text-xs text-muted">Intet går live, før et menneske har godkendt.</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tjek, agenten laver på hver vare */}
      <div>
        <h3 className="text-xl font-bold">Det tjekker agenten også</h3>
        <ul className="mt-4 grid gap-4 md:grid-cols-3">
          <li className="rounded-2xl border border-line bg-white p-5">
            <div className="text-xs font-bold uppercase tracking-wide text-muted">Lagertjek</div>
            <div className="mt-2">
              <StockBadge status={stock.status} text={stock.text} />
            </div>
            <p className="mt-2 text-sm text-navy/75">
              Hentet fra hjernen. Står varen til udsolgt i lang tid, foreslår agenten et alternativ på produktsiden.
            </p>
          </li>
          <li className="rounded-2xl border border-line bg-white p-5">
            <div className="text-xs font-bold uppercase tracking-wide text-muted">Produktfoto</div>
            <div className="mt-2 text-sm font-semibold">
              {product.image_url ? "Billede fundet på shoppen" : "Mangler billede på shoppen"}
            </div>
            <p className="mt-2 text-sm text-navy/75">
              I drift fritlægger agenten billedet på hvid baggrund og laver ens beskæring, så alle produktsider ser ens ud.
            </p>
          </li>
          <li className="relative rounded-2xl border border-coral bg-white p-5">
            <span className="absolute -right-1.5 -top-1.5 h-4 w-4 rounded-full border-2 border-white bg-coral" aria-hidden />
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted">
              Pristjek <span className="rounded-full bg-light px-2 py-0.5 normal-case text-coral-dark">Eksempel</span>
            </div>
            <div className="mt-2 text-sm font-semibold">Afvigelse fra leverandørens liste</div>
            <p className="mt-2 text-sm text-navy/75">
              Priserne ligger bag login, så demoen har ingen rigtige priser. I drift sammenligner agenten jeres pris med
              leverandørens liste, flager afvigelser og foreslår en ny pris, som et menneske godkender.
            </p>
          </li>
        </ul>
      </div>
    </div>
  );
}
