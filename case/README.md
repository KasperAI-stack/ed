# Én hjerne, tre agenter

Casen til samtalen hos ed. Den består af to sider:

- `/`: case-siden med company brain, problemet og de tre løsninger
- `/demo/`: demoshoppen, hvor rolle-agenten kører i en chat

Online: https://kasperai-stack.github.io/ed/case/ og https://kasperai-stack.github.io/ed/case/demo/

## Sådan virker det

- **Company brain** er to filer: `data/products.json` (produkter) og `data/roles.json` (roller). Alle opslag sker i `lib/brain.ts`. Skal hjernen flyttes til en database (fx Supabase koblet til PIM og ERP), er det kun den fil, der skal skiftes.
- **Rolle-agenten** ligger i `lib/agent.ts` (løkken), `lib/tools.ts` (de seks værktøjer) og `lib/prompt.ts` (systemprompten). Den bruger modellen `claude-sonnet-5-5`.
- **Nøglen**: GitHub Pages kan kun vise filer og har ingen server. Derfor kører agenten i browseren med din egen Anthropic-nøgle, som du sætter ind under "Live" i chatten. Nøglen gemmes kun i den browser og kommer aldrig i koden eller på GitHub.
- **Reserve-tilstand**: uden nøgle, med `?offline=1`, hvis API'et fejler, eller hvis der går over 20 sekunder uden svar, afspilles et af de tre gemte forløb i `data/fallback.json`.

## Data

Produkterne er hentet fra de offentlige sider på shop.ed.dk: forsiden, eds fire rolle-sider, to kampagnesider og sitemap'et. Scriptet respekterer robots.txt og holder mindst 1 sekund mellem kald. Priser ligger bag login og er ikke hentet. `demo_price` er et rundt, opdigtet beløb.

## Kommandoer

Kør dem i mappen `case/`.

| Kommando | Hvad den gør |
| --- | --- |
| `npm install` | Installerer det, projektet skal bruge (første gang) |
| `npm run dev` | Starter siden lokalt på http://localhost:3000 |
| `npm run scrape` | Henter produkter fra shop.ed.dk til `data/products.raw.json` |
| `npm run enrich` | Laver `data/products.json` (kompatibilitet, lager, demopris, danske tekster) |
| `npm run record` | Optager de tre eksempler til `data/fallback.json` |
| `npm run build` | Bygger den statiske side til mappen `out/` |

`enrich` og `record` skal bruge en nøgle: `ANTHROPIC_API_KEY=sk-ant-... npm run record`

Siden lægges automatisk på GitHub Pages, når der pushes til `main` (se `.github/workflows/pages.yml` i roden af repoet).
