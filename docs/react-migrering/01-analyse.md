# React-migrering – fase 1: analyse og plan

Status: analyse ferdig, ingen kode endret. Grunnlinje: git-commit `cbbe593`.

## 1. Viktigste funn: Media Lab kjører allerede på React

Alle sider er `.dc.html`-filer som tolkes av `support.js` («dc-runtime», generert fra `dc-runtime/src/*.ts`, som ikke finnes i prosjektet):

- React 18.3.1 og ReactDOM lastes fra unpkg (UMD, med SRI) når siden starter.
- `<x-dc>` inneholder en HTML-mal med `{{ uttrykk }}`, `<sc-if>` (440 stk.), `<sc-for>` (219 stk.), `ref=`, `onClick=` og `<helmet>` for `<head>`-innhold.
- `<script type="text/x-dc" data-dc-script>` inneholder `class Component extends DCLogic` med `state`, `setState`, livssyklusmetoder og `renderVals()`, som gir malen verdiene sine. Den kjøres med `new Function`.
- Malen kompileres til `React.createElement` i nettleseren hver gang siden lastes.
- Runtimen har en redigeringsbro (`__dcUpdate`, `__dcAnnotatedTemplate`, `postMessage` til parent). Formatet er altså laget for et visuelt design-/redigeringsverktøy.

**Konsekvens:** En migrering handler ikke om å gå fra vanilla JS til React. Den handler om å gå fra runtime-kompilerte maler (uten byggesteg) til vanlig JSX med Vite-bygg. Da kan filene ikke lenger åpnes eller redigeres i verktøyet som bruker dc-formatet. Dette må avklares før fase 2 (se punkt 8).

## 2. Sider

| Rotfil | Deploy-fil (`media-lab/`) | Mal | Logikk | Metoder | Motor |
|---|---|---|---|---|---|
| Mediaverktøy | media-lab.dc.html (+ index.html → redirect) | 23 KB | 5 KB | 7 | – |
| Loop Studio | loop-studio.dc.html, loop-editor.dc.html | 20 KB | 13 KB | 12 | ukeloop-engine.js |
| Ukeprogram Loop | studio-editor.dc.html | 255 KB | 273 KB | ~159 | ukeloop-engine.js, qrcode-generator (CDN) |
| Isolate Subject | isolate-subject.dc.html | 29 KB | 48 KB | 31 | transformers.js (CDN) |
| Thumbnail Studio | thumbnail-studio.dc.html | 93 KB | 108 KB | ~119 | thumb-engine.js |
| Motion Design | motion-design.dc.html | 85 KB | 139 KB | ~85 | motion-engine.js |
| Photo Design | photo-design.dc.html | 88 KB | 81 KB | ~52 | photo-engine.js, ml-fx.js |
| Mockups | mockups.dc.html | 21 KB | 19 KB | 19 | mockup-engine.js |
| Admin | admin.dc.html | 30 KB | 17 KB | 9 | api/ml.js |
| Videofy | (bare en omdirigering, 206 B) | – | – | – | – |

Hver side er én stor klassekomponent. Ukeprogram Loop (528 KB) og Motion Design (224 KB) er de største og har høyest risiko.

## 3. Felles moduler (globale `window`-objekter)

| Fil | Global | Rolle | Brukes av |
|---|---|---|---|
| support.js | `DCLogic`, React | dc-runtime | alle |
| i18n.js | `MLI18N` | NO→EN-ordbok (122 KB), hendelsen `medialab-lang` | alle |
| theme.js | `MLTheme` | lys/mørk, `medialab.theme`, `data-ml-href` på lenker | alle |
| ml-pwa.js | `MLPWA` | installasjonsprompt | alle unntatt Admin |
| ml-footer.js | `MLFooter` | footer | alle unntatt Admin |
| ml-cloud.js | `MLCloud` | skyfiler + JS-feillogg til API | alle |
| ml-bg.js | `MLBg` | animert/statisk bakgrunn (`data-ml-bg`) | alle verktøy |
| ml-share.js | `MLShare` | delt mappe mellom verktøy (IndexedDB `medialab-share`), «send til» | Isolate, Mockups, Motion, Photo, Thumb, Loop |
| ml-fx.js | `MLFX` | effektmotor (13 typer) | Photo Design |
| ukeloop-/thumb-/motion-/photo-/mockup-engine.js | `UkeLoop`, `TS`, `VF`, `PD`, `MK` | ren logikk: canvas, eksport, lagring | hvert sitt verktøy |

Motorene har ingen DOM-mal og kan brukes uendret fra React.

## 4. Lagring og kommunikasjon mellom sider

- **IndexedDB:** `ukeloop`, `thumbstudio`, `motiondesign`, `photodesign`, `mockuplib`, `medialab-share`
- **localStorage:** `medialab.theme`, `medialab.units`, `medialab.advanced`, `medialab.fx.*`, `loopstudio.disk.v1`, `loopstudio.tpls.v1`, `ukeloop.tpl`, `ukeloop.guide`, `ukeloop.guideFlip`, `thumbstudio.autosave`, `photodesign.autosave/cats/newcol`, `motiondesign.autosave/sections`
- **sessionStorage:** `motiondesign.open`
- **URL:** `?disk=`, `?id=`, `?mal=`, `#some`/`#tools` på forsiden
- **BroadcastChannel:** `ukeloop-audio`
- **Filnavn-avhengighet:** `ml-share.js` velger URL etter om filnavnet matcher deploy-mønsteret (`loop-studio.dc.html`) eller rot-mønsteret (`Loop Studio.dc.html`).

Alle nøkler, databasenavn og skjemaer må beholdes nøyaktig, ellers mister brukerne lagret arbeid.

## 5. API (`media-lab/api/ml.js`, 21 KB, Vercel-funksjon)

Handlinger via `?a=`: status, setup, login, logout, password, users, adduser, deluser, setrole, resetpw, orgs, addorg, delorg, renameorg, files, file, upload, delfile, hide, log, logs, clearlogs, sys.
Kontrakten (cookie `ml_s`, header `x-ml: 1`, AES-GCM-db, Blob-stier) er uavhengig av frontend og beholdes uendret.

## 6. Deploy

- Vercel, `outputDirectory: "."`, ingen bygging (`buildCommand` er tom i praksis fordi byggesteget feilet), statiske filer med `?v=`-cache-busting.
- CSP tillater `'unsafe-eval'` og `unpkg.com`, fordi runtimen trenger dem. Med Vite-bygg kan begge strammes inn.
- GitHub: `zoefredrikstad-maker/LabMedia` (main). Det finnes tre kopier av deploy-mappen: `media-lab/`, `MediaLab/` og `git-oppdatering/media-lab/`. `photo-design.dc.html` er ulik i alle tre.
- Rot-sider og `media-lab/` skiller seg bare i lenker, ikon-tagger og `?v=`, bortsett fra `loop-editor.dc.html`, som er en egen fil.

## 7. Risiko

| Risiko | Tiltak |
|---|---|
| Visuelle avvik (all stil er inline i malene) | Mekanisk mal→JSX-konvertering, ingen håndskrevet CSS-omskriving; skjermbildesammenligning før/etter |
| Tap av lagret arbeid | Samme IndexedDB-/localStorage-nøkler; ingen endringer i motorene |
| Oppførselsendring i klassekomponentene | Beholde klasselogikken uendret i første runde (se 8B) |
| Mangler tester | Playwright-røyktester og skjermbilder mot dagens versjon før migrering |
| Lenker mellom verktøy (`ml-share`, footer, forsiden) | Samle ruter i `data/tools.js` |
| Vercel-oppsettet endres (byggesteg) | Preview-deploy før produksjon |
| Tre ulike deploy-kopier | Avklare hvilken som gjelder, før ny struktur |
| Redigeringsverktøyet for dc-formatet slutter å virke | Avklares (punkt 8) |

## 8. Anbefalt arkitektur og strategi

**A. Beslutning først:** Brukes et visuelt verktøy til å redigere `.dc.html`-filene? I så fall bryter en Vite/JSX-migrering den arbeidsflyten.

**B. Migreringsstrategi (anbefalt): mekanisk først, refaktorering etterpå.**
1. Skriv en konverteringsscript som gjør hver `<x-dc>`-mal om til JSX (`{{ x }}` → `{v.x}`, `sc-if` → `&&`, `sc-for` → `.map`, inline-stil → stilobjekt). Runtimen gjør allerede akkurat denne oversettelsen, så den er deterministisk.
2. Klassen blir `class X extends React.Component`, der `render()` = `const v = this.renderVals()` + JSX. Logikken flyttes ordrett.
3. Motorer og felles moduler importeres som ES-moduler og beholder de samme `window`-globalene i overgangen.
4. Sammenlign med skjermbilder. Først når siden er lik, trekkes felles komponenter, hooks (`useTheme`, `useI18n`, `useMLShare`) og tjenester ut, én side om gangen.

**C. Målstruktur** (bare det som faktisk trengs):
```
media-lab/
  index.html, vite.config.js, package.json, vercel.json
  api/ml.js                     (uendret)
  public/images, mockups, favicon, manifest
  src/
    main.jsx, app/router.jsx, data/tools.js
    shared/ (i18n, theme, cloud, share, pwa, bg, footer som moduler + hooks)
    components/ (Button, Chip, Modal, Toast … trukket ut fra malene)
    features/<verktøy>/ (Page.jsx + engine.js + egne komponenter)
  tests/ (Playwright)
```
Hvert verktøy lastes med `React.lazy` (code splitting). Ruter: `/`, `/loop-studio`, `/motion-design` osv., med omdirigering fra gamle `*.dc.html`-URL-er i `vercel.json`, slik at bokmerker og PWA fortsatt virker.

## 9. Faseplan

1. ✅ Analyse (dette dokumentet)
2. Grunnlinje: Playwright-skjermbilder og røyktester av dagens sider (desktop og mobil). Vite-oppsett i en egen branch, `api/` uendret.
3. Felles moduler som ES-moduler + konverteringsscript for maler
4. Verktøy i rekkefølge etter risiko: Forside → Admin → Mockups → Loop Studio → Isolate Subject → Photo Design → Thumbnail Studio → Motion Design → Ukeprogram Loop. Test og commit etter hvert verktøy.
5. Ruting, omdirigeringer, CSP-innstramming, preview-deploy
6. Full sammenligning og retting av avvik
7. Opprydding (dc-runtime, dupliserte deploy-mapper) + dokumentasjon/CLAUDE.md

## 10. Sjekkliste for funksjonstesting (grunnlinje)

- **Felles:** NO/EN-bytte, lys/mørk (lagres), footer, PWA-installasjon, send-til/delt mappe, JS-feil logges til API
- **Forside:** kort, mappene SoMe/Tools, `#some`/`#tools`, bakgrunnsanimasjon, Admin-ikon, redusert bevegelse
- **Loop Studio/Ukeprogram Loop:** maler, tilfeldig farge (100+ paletter), lydbibliotek, vignett-editor «Alle slides», `testSlide`, disk (`?disk=`), QR, videoeksport
- **Isolate Subject:** opplasting → beskjæring → Person/Objekt/Logo/Merk i bildet (SlimSAM, grønn/rød/høyreklikk), fyll med omgivelser, bakgrunn gjennomsiktig/farge, PNG-nedlasting, dialog etter nedlasting
- **Thumbnail Studio:** kategorier (maks 5 maler × 5 bilder), lagtyper, logoer, AI-utklipp, eksport 1080p/4K PNG/JPG, IndexedDB
- **Motion Design:** format → mal → tidslinje, trim/del/flytt, overganger, tekstanimasjoner, undertekster (SRT/Whisper), lydmikser/ducking, voiceover, markører, kurver, grønnskjerm, transformhåndtak, høyreklikkmeny, `.motion`-fil, MP4-eksport 1080p30/60/4K
- **Photo Design:** format → mal → lag, beskjæring, looks, justering, kurver, AI-utklipp + pensel, avansert modus/fx (1920 forhåndsvalg, favoritter), trykk (A3, visittkort, utfallende kant, tosidig, CMYK-PDF), eksport PNG/JPG, autolagring
- **Mockups:** innebygde + `mockups/index.json` + egne opplastinger (`mockuplib`) + sky
- **Admin:** oppsett, innlogging, roller dev/admin/user, menigheter, brukere, filer (opplasting/sletting/skjuling per scope), logger

Denne listen utvides med detaljer per verktøy i fase 4, når hver side leses fullt ut.
