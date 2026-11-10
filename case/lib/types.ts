export type Category =
  | "laptop"
  | "dock"
  | "monitor"
  | "headset"
  | "mouse"
  | "keyboard"
  | "bag"
  | "screen_protection";

/** Ét produkt i company brain. Samme felter som tabellen i casen. */
export type Product = {
  /** Varenummer fra shoppen */
  id: string;
  name: string;
  brand: string;
  category: Category;
  /** Den rå leverandørtekst fra shoppen */
  raw_spec: string;
  /** AI-forbedret dansk tekst fra ad hoc-agenten (kan mangle) */
  description_da: string | null;
  /** Udtrukket fra fx "for ThinkPad T16 Gen 4" */
  compatible_with: string[];
  /** Fra "500+ på lager" -> 500, "Ikke på lager" -> 0 */
  stock_qty: number;
  /** Fordelt på lagre: eds eget lager, lokal distributør (1-2 dage) og fjerndistributør (3-5 dage) */
  stock_ed?: number;
  stock_local?: number;
  stock_remote?: number;
  /** Fra "Indgående, forventes 30-12-26" (ISO-dato) */
  incoming_date: string | null;
  /** Antal på vej til incoming_date */
  incoming_qty?: number;
  /** Skærmstørrelse i tommer (bærbare, skærme, tasker og filtre) */
  size_inch?: number | null;
  /** Rundt, opdigtet beløb. Ikke eds pris. */
  demo_price: number;
  image_url: string | null;
  product_url: string;
  /** Modelnavn for bærbare, fx "ThinkPad T16 Gen 4". Bruges til kompatibilitet. */
  model_key?: string | null;
  /** Porte/standarder, fx ["USB-C", "Thunderbolt 4"] */
  ports?: string[];
  /** Hvor varen er fundet, fx "rolle:design" eller "kampagne:hp-tilbehoer" */
  tags?: string[];
};

export type Role = {
  id: string;
  name: string;
  shop_label: string;
  needs: string;
  base_bundle: Record<string, string>;
};

export type StockStatus = "in_stock" | "partial" | "incoming" | "out_of_stock";

export type BundleLine = {
  product: Product;
  qty: number;
  reason: string;
  status: StockStatus;
  status_text: string;
  line_total: number;
  upsell?: boolean;
};

export type Bundle = {
  title: string;
  people: number;
  lines: BundleLine[];
  total: number;
  note?: string | null;
};

/** Begivenheder fra agenten til brugerfladen. Bruges også til de optagede forløb. */
export type AgentEvent =
  /** Claudes tankegang (resumé), mens den tænker */
  | { type: "thinking"; delta: string }
  /** Agenten slår op i company brain */
  | { type: "tool_call"; id: string; name: string; label: string; detail?: string }
  /** Hvad opslaget gav */
  | { type: "tool_result"; id: string; summary: string; ok: boolean }
  | { type: "text"; delta: string }
  | { type: "bundle"; bundle: Bundle }
  /** Alle opfølgende spørgsmål til kunden på én gang, hver med svarmuligheder */
  | { type: "question"; id: string; intro?: string; questions: { question: string; options: string[] }[] }
  /** Kundens svar. Bruges kun i optagede forløb, så de kan afspilles med flere ture */
  | { type: "user_answer"; text: string }
  | { type: "turn_end" }
  | { type: "error"; message: string };

/** Et gemt forløb til reserve-tilstanden */
export type Recording = {
  id: string;
  label: string;
  prompt: string;
  recorded_at: string;
  events: AgentEvent[];
};
