# React-migrering – fase 3 og første verktøy: forsiden (Media Lab)

Status: ferdig og verifisert. Originalfilene er ikke endret.

## Oppsett (`media-lab-react/`)

React-appen ligger i en egen mappe ved siden av `media-lab/`, slik at dagens deploy ikke påvirkes før fase 5.

- Vite 8 + @vitejs/plugin-react, React/ReactDOM **18.3.1** (samme versjon som runtimen lastet fra unpkg). Ingen StrictMode, fordi den dobbeltkjører effekter.
- `vite.config.js`: flersides-bygg (hver `*.html` i rotmappen er én side). Filer som ikke er migrert (bilder, manifest, andre `.dc.html`-sider) serveres fra `../media-lab/` i dev og preview. `@ml/…` peker på `../media-lab/`.
- `src/shared/dc.jsx`: erstatter `support.js`. `DCLogic` og verten oppfører seg som runtimen: synkron logikk-state, feil i livssyklusmetoder logges uten å velte siden, samme `#dc-root > .sc-host`-DOM og samme hjelpere (`I` for `{{ }}` i tekst → `span.sc-interp`, `css`/`sty` for stilstrenger, `val`/`chk`, `list`, `cx`).
- `src/shared/dc-base.css`: runtimens grunnstil (utskrift, feilboks, full høyde).
- Felles moduler (`ml-pwa`, `i18n`, `ml-footer`, `ml-cloud`, `theme`) importeres uendret fra `media-lab/` i samme rekkefølge som før. Det finnes altså bare én kopi av dem.

## Konverteringsscript (`scripts/dc2jsx.mjs`)

`npm run convert [side-id]` oversetter en `.dc.html`-side regel for regel etter `support.js`:

| dc-runtime | React |
|---|---|
| `<x-dc>`-mal | `src/pages/<id>/template.jsx` (funksjon av `renderVals()`) |
| `<script data-dc-script>` | `src/pages/<id>/logic.js`, klassen ordrett |
| `{{ a.b[c] }}`, `!`, `===` osv. | null-sikker JS (`v.a?.b?.[v.c]`) med samme grammatikk |
| `sc-if` / `sc-for` | `? <>…</> : null` / `list(…).map` med indeks-nøkler |
| `style="…"` | stilobjekt (samme `cssToObj`) |
| `style-hover` / `style-focus` | `pseudo.css` med de samme `!important`-reglene |
| `<head>` + `<helmet>` | `<id>.html` |
| lokale `<script src>` i head | `import '@ml/…'` i `main.jsx` |

Filene under `src/pages/` er generert. De skal ikke redigeres for hånd før siden er sammenlignet og godkjent. Etter det kan komponenter trekkes ut (fase 6).

## Forsiden

`index.html` + `src/pages/media-lab/` (fra `media-lab/media-lab.dc.html`).

## Verifisering

- `npm run build` bygger uten feil eller advarsler.
- `npx playwright test` (preview-serveren på port 4174):
  - `tests/compare.spec.js`: 12 skjermbilder (forside, `#some`, `#tools` × mørk/lys × desktop/mobil) er like grunnlinjen i `media-lab/tests/__baseline__/`, med toleranse 0,2 % og ingen konsollfeil. En negativkontroll (feil skjermbilde) feiler som forventet.
  - `tests/forside.spec.js`: 16 funksjonstester kjøres mot både originalen og React-versjonen. De dekker mapper, Tilbake, nettleserens tilbake/frem, NO/EN (lagres og oversetter), lys/mørk (lagres og gir riktig bakgrunn), hover, `data-ml-href` på lenker, Admin-lenke og navigasjon til et annet verktøy.
- Bakgrunnsanimasjonen kjører når redusert bevegelse er av (sjekket manuelt i test).

## Ikke verifisert

- Ekte Vercel-deploy: `dist/` inneholder bare React-sidene. Sammenslåing med `media-lab/`, ruter og CSP skjer i fase 5.
- PWA-installasjonsprompt (`ml-pwa.js`) er ikke testet i nettleser. Skriptet er uendret og lastes på samme måte.
- Feillogging til `/api/ml` er ikke testet, fordi den krever https og API.
- Safari og Firefox er ikke testet. Alle testene kjører i Chrome.
