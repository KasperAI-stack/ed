import type { Category } from "@/lib/types";

type P = { className?: string };
const base = "fill-none stroke-current";
const sw = { strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export function CategoryIcon({ category, className }: { category: Category } & P) {
  switch (category) {
    case "laptop":
      return (
        <svg viewBox="0 0 48 48" className={`${base} ${className ?? ""}`} {...sw}>
          <rect x="10" y="11" width="28" height="19" rx="2" />
          <path d="M5 35h38l-3 4H8z" />
        </svg>
      );
    case "dock":
      return (
        <svg viewBox="0 0 48 48" className={`${base} ${className ?? ""}`} {...sw}>
          <rect x="8" y="18" width="32" height="14" rx="3" />
          <path d="M14 25h3M21 25h3M28 25h6M24 18v-6M20 12h8" />
        </svg>
      );
    case "monitor":
      return (
        <svg viewBox="0 0 48 48" className={`${base} ${className ?? ""}`} {...sw}>
          <rect x="6" y="8" width="36" height="24" rx="2" />
          <path d="M24 32v6M16 40h16" />
        </svg>
      );
    case "headset":
      return (
        <svg viewBox="0 0 48 48" className={`${base} ${className ?? ""}`} {...sw}>
          <path d="M10 28v-4a14 14 0 0 1 28 0v4" />
          <rect x="7" y="27" width="7" height="11" rx="3" />
          <rect x="34" y="27" width="7" height="11" rx="3" />
          <path d="M37 38c0 3-4 5-9 5h-3" />
        </svg>
      );
    case "mouse":
      return (
        <svg viewBox="0 0 48 48" className={`${base} ${className ?? ""}`} {...sw}>
          <rect x="15" y="8" width="18" height="32" rx="9" />
          <path d="M24 8v10M15 19h18" />
        </svg>
      );
    case "keyboard":
      return (
        <svg viewBox="0 0 48 48" className={`${base} ${className ?? ""}`} {...sw}>
          <rect x="4" y="14" width="40" height="20" rx="3" />
          <path d="M10 20h2M16 20h2M22 20h2M28 20h2M34 20h4M10 25h2M16 25h2M22 25h2M28 25h2M34 25h4M14 30h20" />
        </svg>
      );
    case "bag":
      return (
        <svg viewBox="0 0 48 48" className={`${base} ${className ?? ""}`} {...sw}>
          <rect x="6" y="15" width="36" height="24" rx="4" />
          <path d="M18 15v-3a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v3M6 24h36" />
        </svg>
      );
    case "screen_protection":
      return (
        <svg viewBox="0 0 48 48" className={`${base} ${className ?? ""}`} {...sw}>
          <path d="M24 6l14 5v10c0 9-6 16-14 20-8-4-14-11-14-20V11z" />
          <path d="M18 23l4 4 8-8" />
        </svg>
      );
  }
}

export function CartIcon({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" className={`${base} ${className ?? ""}`} {...sw}>
      <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6.2" />
      <circle cx="10" cy="20" r="1.3" />
      <circle cx="17" cy="20" r="1.3" />
    </svg>
  );
}

export function SearchIcon({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" className={`${base} ${className ?? ""}`} {...sw}>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-4-4" />
    </svg>
  );
}

export function SparkIcon({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" className={`${base} ${className ?? ""}`} {...sw}>
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
      <path d="M19 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z" />
    </svg>
  );
}

export function GearIcon({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" className={`${base} ${className ?? ""}`} {...sw}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  );
}

export function CloseIcon({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" className={`${base} ${className ?? ""}`} {...sw}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function SendIcon({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" className={`${base} ${className ?? ""}`} {...sw}>
      <path d="M4 12l16-8-6 16-2.5-6.5z" />
    </svg>
  );
}
