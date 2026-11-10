/**
 * De agenter, Kasper kan bygge til ed, vist som produkter i demoshoppen.
 * Rolle-agenten er den, der kører live i chatten. De andre vises som produkter med en produktside.
 */
export type AiIllustration = "brain" | "adhoc" | "trend" | "reorder";

export type AiProduct = {
  slug: string;
  id: string;
  name: string;
  stockText: string;
  shortText: string;
  /** Som shoppens rå specifikationer: punkter adskilt af " - " */
  specs: string[];
  illustration: AiIllustration;
  /** Knappen øverst på produktsiden */
  cta: string;
};

export const AI_PRODUCTS: AiProduct[] = [
  {
    slug: "company-brain",
    id: "ED-AI-000",
    name: "Company Brain",
    stockText: "Inkluderet i alle agenter",
    shortText:
      "Ét sted, hvor al viden om jeres produkter bor. Specifikationer, lager, leverancer, kompatibilitet og roller samles i én hjerne, som alle agenterne henter fra, så ingen svarer ud fra gamle tal.",
    specs: ["Supabase", "kobles til PIM, ERP og HubSpot", "opdateres løbende", "dansk", "kun jeres egne data"],
    illustration: "brain",
    cta: "Se hvad hjernen ved lige nu",
  },
  {
    slug: "ad-hoc-agenten",
    id: "ED-AI-101",
    name: "Ad hoc-agenten",
    stockText: "Klar til levering",
    shortText:
      "Gør rå leverandørdata til produktsider, der sælger. Agenten skriver danske produkttekster ud fra kundens rolle, renser produktfotos, tjekker lagerstatus og finder priser, der afviger fra leverandørens liste. Du godkender, før noget går live.",
    specs: ["produkttekster", "produktfotos", "lagertjek", "pristjek med godkendelse", "dansk og engelsk", "kører på hele sortimentet"],
    illustration: "adhoc",
    cta: "Prøv agenten på rigtige varer",
  },
  {
    slug: "trend-agenten",
    id: "ED-AI-201",
    name: "Trend-agenten",
    stockText: "Klar til levering",
    shortText:
      "Holder øje med, hvad markedet søger, før kunderne spørger. Agenten finder stigende søgninger og nye produkter, holder dem op mod jeres lager og varer på vej og sender hver mandag en kort plan til indkøb og marketing med forslag til næste kampagne.",
    specs: ["trendovervågning", "lager og indgående varer", "kampagneforslag", "ugentlig rapport", "deles med indkøb og marketing"],
    illustration: "trend",
    cta: "Se mandagsrapporten",
  },
  {
    slug: "genkoebs-agenten",
    id: "ED-AI-301",
    name: "Genkøbs-agenten",
    stockText: "Klar til levering",
    shortText:
      "Får kunderne til at komme igen af sig selv. Kunden indtaster sit kundenummer og ser tidligere ordrer, kan genbestille med ét klik og får forslag til det, der passer til udstyret, de allerede har. De samme data sendes ud i målrettede mails til kundegrupper, fx når tonerne snart er brugt op, eller når de bærbare er klar til udskiftning.",
    specs: [
      "ordrehistorik",
      "genkøb med ét klik",
      "forslag ud fra eksisterende udstyr",
      "mailflows til kundegrupper",
      "“andre købte også”",
      "kobles til HubSpot",
    ],
    illustration: "reorder",
    cta: "Prøv med et kundenummer",
  },
];

export const aiBySlug = (slug: string) => AI_PRODUCTS.find((p) => p.slug === slug) ?? null;
