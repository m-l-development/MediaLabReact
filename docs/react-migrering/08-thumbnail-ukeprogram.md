# Verktøy 8 og 9: Thumbnail Studio og Ukeprogram Loop (editoren)

Status: ferdig og verifisert. Alle verktøy er nå migrert.

- `media-lab-react/thumbnail-studio.dc.html`, `studio-editor.dc.html` + `src/pages/…`. `loop-editor.dc.html` er en uendret kopi av omdirigeringen til editoren.
- **`ukeloop-engine.js` lastes uendret som klassisk skript** (`?url`-import + `loadClassic`, se `CLASSIC` i `dc2jsx.mjs`). Motoren bygger den eksporterte, frittstående spiller-HTML-en med `Function.prototype.toString()`, og en minifisert modul ville gitt en annen fil. Vite kopierer filen byte for byte (kontrollert med `cmp`). Den lastes før siden monteres, som i originalen.
- qrcode-generator lastes fortsatt fra jsDelivr med SRI i `<head>`.

## Verifisering
- `tests/compare.spec.js`: editoren og `loop-editor` sammenlignes med **styrt klokke** og fast `Date.now` i begge, siden forhåndsvisningen spiller video. Når maskinen er presset, kan tidtakere og bildelasting komme i ulik rekkefølge. Da går klokken videre og nye bilder tas (inntil fire ganger).
- `tests/thumbnail-studio.spec.js`: 2 frø × 120 handlinger × desktop/mobil.
- `tests/studio-editor.spec.js`: alle fire maler (`?mal=week|sunday|youth|blank`), til sammen 150 + 3 × 50 handlinger × desktop/mobil, med styrt klokke.
- Nedlastinger:
  - **Spiller-HTML** (`…-2026-09-29.html`) og sikkerhetskopi (JSON): byte for byte like.
  - **PNG/JPG**: nettleserens bildekoder gir av og til ulike bytes for samme bilde, også originalen mot seg selv. Ved ulike bytes sammenlignes pikslene. Avrunding på høyst 4 enheter per piksel tillates (målt: alfa 50 mot 51 i to av 2 millioner piksler).
  - **MP4** (1080p, 4K, stående, sanntidsopptak): lik oppløsning, varighet innen 0,2 s (sanntidsopptak) og 0 % avvik i dekodede bilder.

## Stabilitet i testene (funnet underveis)
Alle disse varierer også når **originalen kjøres mot seg selv** (`SELVTEST=1`), så de er ikke forskjeller mellom versjonene:
- **Rulleposisjon** i paneler etter at Playwright har rullet inn elementer. Er den ulik, settes React-versjonens posisjon lik originalens før tekst og skjermbilde sammenlignes på nytt.
- **Kontroller som legges inn forsinket** (lys/mørk-knappen fra theme.js etter 900 ms): sjekkes på nytt.
- **Filstørrelse etter videoeksport** («Ferdig på 2 s · 26.4 MB»): tas ut av tekstsammenligningen.

## Samlet resultat
`npx playwright test` (106 tester, 12 filer): alle grønne.
