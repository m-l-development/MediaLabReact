# Fase 5: sammenslåing til én mappe (utført lokalt – ikke deployet ennå)

`media-lab/` er nå én React/Vite-app. `media-lab-react/` er fjernet, og filene er flyttet med `git mv`, så historikken er med.

## Struktur
| Mappe/fil | Innhold |
|---|---|
| `*.dc.html`, `index.html` | React-sidene (samme adresser som før) |
| `src/pages/<id>/` | JSX-mal, logikk, pseudo-CSS og inngang per side – **kilden fra nå av** |
| `src/shared/` | `dc.jsx` (vert), `runtime-quirks.js`, `dc-base.css` |
| `src/legacy/` | i18n, theme, ml-*, *-engine (uendrede filer) |
| `public/` | `images/`, `mockups/`, `favicon.ico`, `manifest.webmanifest` |
| `api/ml.js` | Vercel-funksjonen (uendret) |
| `legacy-dc/` | originalsidene med dc-runtime + `support.js`, bare for sammenligning (`/_original/…` i dev/preview). Deployes ikke |
| `tests/` | Playwright-testene + grunnlinjebildene (`tests/__baseline__/`) |
| `tests-grunnlinje/` | skript som tok grunnlinjebildene av originalene |

## Endringer
- `package.json`: React 18.3.1, Vite 8, `@vercel/blob`. Skriptene er `dev`, `build` (mockup-indeks + `vite build`), `preview`, `test` og `convert`. `engines.node: 22.x` (Vite 8 krever Node ≥ 20.19).
- `vercel.json`: `buildCommand: npm run build`, `outputDirectory: dist`. CSP uten `'unsafe-eval'` og `https://unpkg.com`, som bare `support.js` brukte. `/assets/*` (filnavn med hash) hurtigbufres i ett år.
- `scripts/mockup-index.mjs` leser `public/images/mockups/` og skriver adresser som `images/mockups/…`.
- Preview-serveren sender samme CSP som Vercel til React-sidene, så testene avslører alt som ville blitt blokkert.

## Verifisering
- `npm run convert` fra `legacy-dc/` gir de samme sidene. Bare kommentaren om kilden endret seg.
- `npm run build` fungerer: 11 sider, `dist/images/mockups/index.json` med 12 bilder.
- `npm test`: **106 av 106 grønne** under den strenge CSP-en.

## Kjent mulig forskjell (bør sjekkes manuelt)
- Motion Design på mobil: i noen testkjøringer hoppet sporlisten i tidslinjen til toppen etter «Eksporter MP4» i React, men ikke i originalen. Skjermbildet var likt, fordi listen ligger bak eksportvinduet. Årsaken er ikke funnet, og i siste fullstendige kjøring skjedde det ikke. Rulleposisjon logges nå som advarsel, fordi den også varierer i originalen mot seg selv. Synlige forskjeller fanges fortsatt av pikselsammenligningen.

## Gjenstår
Deploy: se «Slik legges den ut» i svaret til brukeren / README-en i `media-lab/`.
