import type { Metadata } from "next";
import { DemoShop } from "./DemoShop";

export const metadata: Metadata = {
  title: "ed demo · Vælg IT-udstyr efter din rolle",
  description: "Konceptdemo bygget af Kasper Asmussen til samtalen hos ed. Ikke ed's officielle webshop.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <DemoShop />;
}
