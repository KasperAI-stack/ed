import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Én hjerne, tre agenter · Kasper Asmussen til ed",
  description:
    "Konceptdemo bygget af Kasper Asmussen til samtalen hos ed. Ikke ed's officielle webshop.",
  // Siden skal ikke kunne findes på Google
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="da" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
