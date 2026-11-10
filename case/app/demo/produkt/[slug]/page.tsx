import type { Metadata } from "next";
import { AI_PRODUCTS, aiBySlug } from "@/lib/aiProducts";
import { AiProductPage } from "@/components/ai/AiProductPage";

// Siden er statisk: én side pr. agent, bygget på forhånd til GitHub Pages
export const dynamicParams = false;

export function generateStaticParams() {
  return AI_PRODUCTS.map((p) => ({ slug: p.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = aiBySlug(slug);
  return {
    title: `${p?.name ?? "Agent"} · ed demo`,
    description: p?.shortText,
    robots: { index: false, follow: false },
  };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  return <AiProductPage slug={slug} />;
}
