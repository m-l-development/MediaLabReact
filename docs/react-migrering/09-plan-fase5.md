# Fase 5: sammenslåing til én mappe og deploy (plan – ikke utført)

Denne planen gjennomføres først når alle verktøy er migrert og godkjent, og etter klarsignal. Den endrer det som ligger ute på nettsiden.

## Mål
Én mappe (`media-lab/`) med React-kildekode som Vercel bygger. Samme adresser som i dag (`media-lab.dc.html`, `admin.dc.html` osv.), slik at bokmerker, PWA og lenker mellom verktøyene virker uendret. API og lagring er uendret.

## Steg
1. **Flytt React-prosjektet inn i `media-lab/`** i en egen commit:
   - `src/`, `scripts/dc2jsx.mjs`, `vite.config.js`, sidene `*.dc.html` + `index.html` (fra `media-lab-react/`).
   - Felles skript (`i18n.js`, `theme.js`, `ml-*.js`, `*-engine.js`) flyttes til `src/legacy/` og importeres derfra (`@ml` peker dit). De er fortsatt uendrede filer.
   - Statiske filer (`images/`, `mockups/`, `favicon.ico`, `manifest.webmanifest`) flyttes til `public/`. Vite kopierer dem uendret til `dist/`.
   - `api/ml.js` blir liggende i `api/` (Vercel-funksjon, uendret).
   - Originalene (`*.dc.html` med dc-runtime + `support.js`) arkiveres i `legacy-dc/` for sammenligning. De deployes ikke.
2. **Bygg på Vercel:** `buildCommand`: `node scripts/mockup-index.mjs && vite build`, `outputDirectory`: `dist`. `mockup-index.mjs` må peke på `public/images/mockups` og skrive `index.json` før Vite kopierer.
3. **CSP (`vercel.json`) strammes inn:**
   - Fjern `'unsafe-eval'` og `https://unpkg.com`. Bare `support.js` brukte `new Function` og React fra unpkg.
   - Behold `'wasm-unsafe-eval'` (onnxruntime), `https://cdn.jsdelivr.net` (transformers.js, qrcode-generator, mp4-muxer) og Hugging Face-domenene.
   - Vurder å fjerne `'unsafe-inline'` for skript. `loop-editor.dc.html` har et lite inline-skript (omdirigering) som i så fall må flyttes til en fil.
4. **Hurtigbuffer:** `?v=`-cache-busting erstattes av Vites filnavn med hash (`assets/*-[hash].js`). HTML beholder `no-cache`, og `assets/` kan få `Cache-Control: public, max-age=31536000, immutable`.
5. **Preview-deploy først** (egen Vercel-preview fra branchen), og deretter:
   - Kjør hele testsettet mot preview-adressen (skjermbilder, flyttester, utforskning) med originalen som referanse.
   - Test Admin mot ekte API og Blob (innlogging, opplasting, logger).
   - Test PWA-installasjon, feillogging til API og Safari/Firefox manuelt.
6. **Produksjon** når preview er godkjent. Tidligere deploy kan settes tilbake i Vercel med ett klikk hvis noe går galt.

## Risiko
| Risiko | Tiltak |
|---|---|
| Tapt lagret arbeid | Samme IndexedDB-/localStorage-nøkler (bekreftet i testene). Samme origin (domene) må brukes. |
| Service worker/PWA peker på gamle filer | `manifest.webmanifest` er uendret; sjekk at det ikke finnes en gammel service worker som hurtigbufrer `support.js`. |
| Mockups-listen mangler | `mockup-index.mjs` kjøres før Vite-bygget; test `/images/mockups/index.json` på preview. |
| Byggesteget feilet tidligere på Vercel | Test bygget lokalt med `vercel build` før preview. |
