# Kasper til ed

En personlig landingpage til ansøgningen som E-commerce Coordinator hos ed A/S i Skødstrup. Siden er bygget på koden fra Understory-siden (repoet understory, som bygger på Cozze, Maki og hey-kasper.dk) med ny tekst, eds farver og eds logo.

## Mappen

- site/: selve hjemmesiden. Det er kun denne mappe, der kommer online.
  - index.html: forsiden med al teksten
  - cv.html og ansoegning.html: CV'et og ansøgningen, bygget op som PDF'erne i assets/pdf/. De kommer, når PDF'erne til ed er klar. Indtil da viser linkene 404-siden.
  - css/dokument.css: designet til CV og ansøgning
  - en/: de engelske udgaver. Sprogvælgeren DA/EN i toppen skifter mellem dem.
  - 404.html: siden, der vises, hvis adressen er forkert
  - css/styles.css: farver og design. eds farver (marineblå #1A1D56 og koral #FF7456) står øverst under `:root`.
  - js/main.js: små forbedringer, fx agentvælgeren i toppen og temaknappen
  - assets/ed-logo.svg: eds logo i marineblå (#1A1D56), hentet fra ed.dk
  - assets/og-image.jpg og og-image-en.jpg: billedet, der vises, når linket deles på LinkedIn eller i en mail
- netlify.toml: fortæller Netlify, at site/ skal publiceres.

## Linket

Siden ligger på GitHub Pages: https://kasperai-stack.github.io/ed/ (engelsk: https://kasperai-stack.github.io/ed/en/)

Den bliver opdateret automatisk, hver gang der pushes til main (se .github/workflows/pages.yml). Første gang skal GitHub Pages slås til én gang: Settings → Pages → Source: "GitHub Actions".

## Se siden på din egen computer

1. Åbn en terminal i mappen.
2. Skriv `npx serve site` og åbn adressen, der vises i terminalen.

## Godt at vide

- Siden skal ikke kunne findes på Google. Den har `noindex` i HTML'en, i netlify.toml og i robots.txt.
- Der er ingen Google Tag Manager, cookies eller formular på siden. Kontakt sker via "Kald til samtale" (mail til kasmussen80@gmail.com) og telefon.
- Teksten følger Kaspers stemme: "I" og "jer" til ed, ingen tankestreger og ingen opdigtede tal. Fakta kommer fra jobopslaget, ed.dk og Kaspers CV.
