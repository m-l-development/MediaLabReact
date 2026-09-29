# Verktøy 5: Isolate Subject

Status: ferdig og verifisert, med ett unntak (Objekt/BiRefNet, se under).

- `media-lab-react/isolate-subject.dc.html` + `src/pages/isolate-subject/`. transformers.js 3.5.1 lastes fortsatt med `import()` fra jsDelivr når en AI-modus brukes, og Vite lar URL-en stå urørt.

## Verifisering
- `tests/compare.spec.js`: sider med bølgebakgrunn (ml-bg) sammenlignes nå mot originalen i samme kjøring, med bølgelerretet maskert i begge. Bølgene tegnes etter tiden siden ml-bg.js startet, og originalen starter det senere (etter at React er lastet fra CDN), så to kjøringer av originalen kan også avvike. Sider uten ml-bg sammenlignes fortsatt mot grunnlinjebildene.
- `tests/isolate-subject.spec.js`: 29 steg, desktop og mobil. Stegene er opplasting, beskjæring (16:9, hopp over, beskjær på nytt), Logo og Tekst (fargenøkkel), bakgrunn (farge, farge fra paletten, egen farge), myk kant/stramhet, sammenligning, beskjær til motivet, «Annet motiv i samme bilde», tilbake til originalen, nytt bilde, **Person (MODNet)**, **Merk i bildet (SlimSAM)** med behold/fjern, fyll med omgivelser, angre og gjennomsiktig, engelsk og lys modus. Tekst, felt, lenker, localStorage og skjermbilde er like etter hvert steg. **Alle nedlastede PNG-er, også AI-resultatene, er byte for byte like.**
- Modellene og transformers.js hentes via en lokal buffer i testen (`.cache/cdn`, ikke i git), så de bare lastes ned én gang. Innholdet er uendret.
- Tunge AI-steg kjøres etter hverandre (`{ seq: true }`) for å spare minne.

## Ikke verifisert
- **Objekt (BiRefNet_lite, 115 MB):** også originalen krasjer med denne modellen i headless Chrome (minne), så den kan ikke sammenlignes automatisk. Koden er flyttet ordrett, men bør prøves manuelt i en vanlig nettleser.
