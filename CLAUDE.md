# Ukeprogram Loop / Media Lab – prosjektnotater

Brukeren skriver norsk. Svar kort og direkte på norsk.

GitHub: `zoefredrikstad-maker/MediaLabReact`. `main` = produksjon (Vercel Production). `connecthub` = ConnectHub-utvikling (Vercel Preview → Supabase `connecthub-dev`).

## ConnectHub (videreutvikling av Media Lab) – faste regler
- Arbeid skjer på grenen `connecthub` og mot `connecthub-dev` (`uatpdmhnwwjgzlxaucsx`). **Aldri** endringer i `main`, produksjonsdatabasen `connecthub` (`cmuienhheklcgtfmpvbe`), Vercel-innstillinger eller miljøvariabler uten uttrykkelig godkjenning. Produksjon (P11) og kostnader godkjennes alltid separat.
- Innlogging er obligatorisk for alle verktøy, data og API-er, også ved direkte URL. Ingen åpen registrering.
- **Video lagres aldri i skyen** (verken felles eller privat) – bare i prosjektmappe på brukerens PC.
- Eksisterende lokale prosjekter bevares og knyttes til riktig bruker. Ikke slett gamle løsninger, data eller variabler uten godkjenning.
- Leverandøruavhengighet: sider bruker bare `src/services/`; bare `src/services/adapters/` kjenner Supabase. Se `docs/architecture-and-portability.md` og `docs/migration-runbook.md`.
- Innlogging (P4): `login.dc.html` (`src/pages/login/`), port i `src/shared/auth-gate.js` (kalles av `mountPage`), sperre foran sidene i `media-lab/middleware.js` → `server/lib/gate.js` (cookie `ch_at`, JWKS-verifisering), kontomeny `src/shared/account-menu.js`. Lokale data per bruker: `src/shared/local-user.js` (`navn@<bruker-id>`; gamle data knyttes uten kopiering via `ch.local.owner`). Testresultater i `docs/testlogg.md`.
- Admin (P5): `connecthub-admin.dc.html` (`src/pages/connecthub-admin/`), tjenester i `src/services/admin.js` (via dataporten `src/services/port.js`). Serverfunksjoner: `api/ch.js` (tynn) → `server/handlers/ch.js` (`?a=invite.create|invite.resend|invite.accept`, Bearer-token), Supabase-kall bare i `server/adapters/supabase.js`. Lokalt: `chApiLocal` i vite.config.js (hemmelig nøkkel bare fra skallets miljø). Gammel admin er fjernet (se under).
- Prosjektmapper (P6): `src/shared/project-folder.js` utvider `VF.store` i Motion Design (File System Access; media i `<mappe>/media/`, `prosjekt.motion.json`); kopier aldri-slett, egen bekreftet «Frigjør plass».
- Delte filer (P7): bare bilder, privat bøtte `ch-files` (bare serveren), `server/handlers/files.js` + `server/lib/sniff.js` (magiske bytes, video avvises), `src/services/files.js`, `src/shared/ch-cloud.js` erstatter `ml-cloud.js` (samme `MLCloud.files(mappe)`, blob-URL-er).
- E-postmaler (Supabase Auth) på norsk i `supabase/templates/` (invitasjon, innloggingslenke, nytt passord, bekreftelse, bytte av e-post, bekreftelseskode; lenkene er `{{ .ConfirmationURL }}`). Kommentert ut i `supabase/config.toml`: Supabase avviser malendring på gratisplanen uten egen SMTP (dev). Produksjonen (Gmail-SMTP) får dem etter egen godkjenning, se `docs/produksjonsplan-trinn8.md`.
- Hemmeligheter når aldri nettleseren: `build/env-guard.js` + `connecthubEnv` i `vite.config.js` leser bare URL og publiseringsnøkkel ved navn, sjekker prosjekt-ID per miljø og søker i bygget. `npm test` kjører testene.

## Filer
All kode ligger i `media-lab/` (React 18 + Vite, deployes til Vercel). Navnene under viser til sidene i `media-lab/`; felles skript/motorer ligger i `media-lab/src/legacy/`, bilder/mockups i `media-lab/public/`.

**Struktur (React, migrert fra dc-runtime; originalene og sammenligningstestene er fjernet, men finnes i git-historikken før commit «Fjern test- og migreringsfiler»):**
- `*.dc.html` (samme filnavn som før) → `src/pages/<id>/main.jsx` + `logic.js` (klassen fra originalen, `extends DCLogic`) + `template.jsx` (JSX av `renderVals()`) + `pseudo.css` (hover/focus). **Rediger disse filene direkte** – de er nå kilden.
- `src/shared/dc.jsx` (vert som erstatter dc-runtime), `src/shared/runtime-quirks.js` (etterligner synlige særheter fra runtimen: footer og lys modus).
- `src/shared/layer-name.jsx`: lagnavn i laglister (Photo Design, Thumbnail Studio) – dobbeltklikk gir nytt navn. Tekstlag vises som «Navn – teksten» (`display`), men bare navnet redigeres (`value`). Thumbnail Studio lagrer det i `l.name` (tomt = automatisk navn fra innholdet).
- `src/shared/here.js`: `hereGet(app)`/`hereSet(app, v)` husker visning/prosjekt i sessionStorage (`medialab.here.*`). Gjenopprettes bare ved oppdatering (F5) eller tilbake/fram; ny fane eller vanlig navigering starter på første side. Brukes av Photo Design (åpent prosjekt), Thumbnail Studio (kategori/mal/grunnoppsett), Motion Design (åpent prosjekt) og Mockups (valgt mockup). Loop Studio-editoren og forsidens mapper står allerede i URL-en.
- `src/shared/ml-update.js` (lastes via dc.jsx på alle sider): varsler om ny versjon. `vite.config.js` gir hvert bygg et nummer (`__ML_BUILD__`) og skriver `dist/version.json`; siden sjekker hvert minutt og når fanen blir synlig. Ved ny versjon lagres arbeidet og et kort med «Oppdater nå»/«Senere» (10 min) vises – aldri tvungen omlasting. Appene melder seg på med `onUpdate({ save, busy, note })` i `componentDidMount`. Av i `npm run dev`; test med `npm run build` + `npm run preview` og bygg på nytt. Uavhengig av Vercel.
- Selvreparasjon (`selfHeal` i vite.config.js, inline-skript i alle sider): Vercel sender `immutable` også på 404 under `/assets/`, så en 404 like under publisering ble husket i nettleseren → svart side. Feiler en `/assets/`-fil, hentes alle sidens filer med `cache: 'reload'` og siden lastes én gang til (flagg `medialab.heal` i sessionStorage, fjernes av `mountPage`).
- `src/shared/sticky-title.js`: fast topplinje. Topplinjen merkes `data-ml-bar`, den store tittelen `data-ml-title`. Startsidene: tittelen tones ut under linjen og vises liten ved tilbakeknappen – **aldri noe felt/boks bak linjen på startsidene** (brukerens ønske). Editorene (uten `data-ml-title`): tett felt bak linjen når siden er rullet. Tilbakeknapp + appnavn skal stå fast i alle verktøy og visninger, også ved rulling i sidepaneler.
- `src/legacy/*.js`: i18n, theme, ml-*, *-engine – uendrede filer, importeres via `@ml/…`. `ukeloop-engine.js` lastes som klassisk skript (`?url`), fordi spiller-HTML bygges med `Function.toString()`.
- `npm run dev` / `npm run build` (vite build → `dist/`; lager også `public/images/mockups/index.json`) / `npm run preview`. Dev og preview sender samme CSP som Vercel.

- `media-lab.dc.html` – forsiden (Media Lab). Kort: Loop Studio, Isolate Subject, Thumbnail Studio. Språkbytte NO/EN, mørk/lys-knapp nede til høyre (mørk er standard, lys = dempet off-white #e4e1da).
- `loop-studio.dc.html` (+ `loop-editor.dc.html`) / `studio-editor.dc.html` (Ukeprogram Loop) + `ukeloop-engine.js` – loopende video av ukeprogram. Tilfeldig farge-knapp (bare trykkbar, ikke alltid aktiv) med 100+ klassiske fargepaletter, lydbibliotek.
- `isolate-subject.dc.html` (tidl. Remove Background) – AI i nettleseren (transformers.js 3.5.1). Flyt: 1) velg Person (MODNet, Apache 2.0), Objekt (BiRefNet_lite, MIT), Logo/Tekst (fargenøkkel fra kantfarge, fallback BiRefNet) eller trykk i bildet (SlimSAM, Apache 2.0; grønn = behold, rød/høyreklikk = fjern), 2) gjennomsiktig eller farge, 3) last ned PNG → dialog: nytt bilde / annet motiv i samme bilde. Motivet endres aldri, kun alfa-maske — unntak: «Merk i bildet» med «Fyll med omgivelser» fyller fjernede områder (push-pull-innfylling + støy). Etter opplasting kommer et beskjæringssteg (kan hoppes over).
- `thumbnail-studio.dc.html` + `thumb-engine.js` – 16:9-miniatyrbilder (canvas 1920×1080, eksport 1080p/4K PNG/JPG). Kategorier (Søndagsmøte, Kveldsbibelskole, Ungdomsmøte + egne) med grunnoppsett; maks 5 maler per kategori og 5 bilder per mal. Lagres i IndexedDB `thumbstudio`. Lag: tekst, bilde, form, lys, logo (`images/logo-symbol.png`, `logo-kbs.png`, `logo-wol.png`). Valgfri AI-utklipp (MODNet/BiRefNet via transformers.js).
- `motion-design.dc.html` + `motion-engine.js` (tidl. «Videofy», under SoMe) – videoredigering: format → mal (8) → editor med tidslinje (tekst/video/undertekst/musikk), trim/del/flytt, overganger, tekstanimasjoner, logo, undertekster (egen/SRT/AI Whisper via transformers.js), eksport MP4 1080p30/60 og 4K30 (WebCodecs + mp4-muxer). Lagres i IndexedDB `motiondesign`; prosjektfil `.motion` (binær med alle filer). Fase 2 så langt: lydmikser + ducking (`p.mix`), utjevn lyd, voiceover (mikrofon → WAV, `microphone=(self)` i vercel.json), markører på takten, kurver (cS/cM/cH), grønnskjerm på overlegg (keyOn/keyColor/keySim/keySmooth/keySpill). RGB-kurver (`c.curves` {m,r,g,b} punkter, monoton spline), fallback uten ctx.filter (Safari) via piksler, Overganger-fane (dra til tidslinjen, snapper mellom/start `p.tin`/slutt `p.tout`), høyreklikkmeny, transformhåndtak (dobbeltklikk → 8 punkter + rotasjon; igjen → beskjær), flyttbar logo (`logo.x/y`), kopier/lim farge og lyd, hover-forhåndsvisning av video i mediebiblioteket. Gjenstår: LUT, fargehjul, former/emoji, proxy, flereksport, transparent eksport, stabilisering. 
- `photo-design.dc.html` + `photo-engine.js` – bilderedigering: format (1:1, 4:5, 9:16, 16:9, A4, egendefinert) → mal (5) → editor med lag (bilde/tekst/form), flytt/skaler/roter/kanter, beskjær (cz/cx/cy utsnitt), looks, justering (piksel-LUT, Safari-trygt), kurve, AI-utklipp (MODNet/BiRefNet) + pensel på maske, eksport PNG/JPG 1×/2×, kopier/send. IndexedDB `photodesign`. Autolagring av som standard.
- Avansert modus (fase 1–3 ferdig i Photo Design): `ml-fx.js` = felles effektmotor `window.MLFX` (13 typer: sun, spot, moon, fire, smoke, veil, light, streak, atmos, bloom, leak, vign, parts; deterministisk med `seed` + tid `t`, cache per lag-id). Lagtype `fx` i photo-engine (`{fx, p, seed, preset}`; treff bare i midtre 24 %). 1920 forhåndsvalg (80 looks × 8 paletter × 3 styrker), favoritter/nylig/egne i localStorage `medialab.fx.*`, modus i `medialab.advanced`. Av = skjuler kontroller, effekter vises/eksporteres fortsatt. Gjenstår: Motion Design (keyframes/tidslinje via `t`), sporing, penselmaling med maske på fx-lag.
- Photo Design flervalg: dra en ramme fra tomt område/utenfor bildet (eller Shift+dra) for å velge flere lag (`state.multi`, `selIds()`), Shift/Ctrl+klikk legger til/fjerner. Grupper = felles `L.grp` (Ctrl+G / Ctrl+Shift+G); klikk på et gruppemedlem velger hele gruppen, dobbeltklikk eller laglisten velger ett lag. Hjørnehåndtak skalerer alt likt fra motsatt hjørne (`groupScale`: posisjon, size, w, h, strokeW, radius, ls, barH); sidehåndtak strekker i én retning (w/h, tekst via `tsx`/`tsy` i photo-engine). Gjelder både flervalg og enkeltlag.
- Photo Design hjelpelinjer ved flytting (`snapPrep`/`snapAt` i logic.js, `state.guides = { lines, marks }`): fester til lerretets kanter/midte og andre lags kanter/midte (lag som dekker hele lerretet og fx-lag hoppes over), og viser/fester like avstander (lik avstand til naboene, eller samme avstand som et annet nabopar; vinrødt merke med tall, farge #9b1c3c). Justering går foran lik avstand. Alt = uten festing.
- Photo Design formatbytte (`changeFormat` i logic.js): regnes fra oppsettet før forrige bytte hvis ingenting er endret (`_fmtBase`, så frem og tilbake gir samme resultat); lag kant til kant strekkes i den retningen, lag inntil en kant blir liggende der, ellers forholdsmessig plassering og lik skalering (`min(kx, ky)`); baksiden tas med. Editoren er låst til skjermhøyden på PC (`rootMinH`/`rootMaxH`), ellers vokste arbeidsflaten med høye formater og zoomen ble feil.
- Photo Design «Former»-knapp: panel med alle former (ikoner tegnes med `PD.shapePath`, `shapeIcon` i logic.js). `PD.SHAPES` har 19 typer (+ «Avrundet rektangel» = rect med radius); nye: pentagon, octagon, heart, plus, half, parallelogram, trapezoid, chevron, bubble, burst. Standard sideforhold i `SHAPE_AR`.
- Photo Design trykk: formater A3/Visittkort (`mm`), `doc.bleed` (3 mm, `PD.bleedLayers` strekker kant-lag), tosidig `doc.back`/`doc.side` (bytter lag), CMYK-felt (`PD.toCMYK/fromCMYK`), «PDF trykk» = `PD.printPDF` (CMYK, 300 dpi, TrimBox/BleedBox, rendres i bånd).
- Loop Studio vignett-editor: forhåndsvisningen bruker nesten hele vindushøyden på PC (sticky), og hovedlerretet tegnes i høyere oppløsning mens dialogen er åpen. Diffus (`vigSoft`/`soft`) i `vigLayer` (ukeloop-engine.js): 0–50 % som før; over 50 % strekkes overgangen opptil 4× (ytterkanten fast for rund/oval) og toningen går over i en S-kurve (`ease`).
- Loop Studio: «Alle slides» i vignett-editoren fjerner slide-overstyringer for endrede nøkler. Effekt-endring per slide → `testSlide(id)` spiller bare den sliden; `setCfg` stopper testen.
- `theme.js`: flytende lys/mørk-knapp nede til høyre på alle sider (hoppes over hvis `[data-ml-theme]`), og interne lenker får `data-ml-href` ved hover så URL ikke vises i statuslinjen.
- Mockups: innebygde i `public/images/mockups/` (index.json lages av vite.config.js ved `npm run build`) + brukerens mappe `public/mockups/` (index.json skrives for hånd) + egne opplastinger i IndexedDB `mockuplib`.
- Forsiden: mapper SoMe (Motion design, Photo design) og Tools (Isolate Subject, Mockups – kommer). `#some` / `#tools` åpner mappen direkte.
- Gammel admin (`admin.dc.html`, `src/pages/admin/`, `api/ml.js`, `src/legacy/ml-cloud.js`, Vercel Blob/`@vercel/blob`) er fjernet 2026-10-02. All administrasjon skjer i ConnectHub Admin; verktøyenes skyfiler kommer fra `src/shared/ch-cloud.js`. En test (`server/handlers/timeouts.test.js`) passer på at den gamle løsningen ikke kommer tilbake.
- `ml-bg.js` – felles bakgrunn for verktøysidene. Menyer/startskjermer: bevegelig linjefelt i samme palett som forsiden (men annerledes). Arbeidsflater: fast, jevn, mørk tone — merk elementet med `data-ml-bg="static"`. Rot-diven må ha `background:transparent`.
- `ml-footer.js` – footer: innfading av statisk footer + valgfri lenke. Sett `FOOTER_URL` øverst i filen (må være https://) for å gjøre «Design by Kristen Utvikling» klikkbar.
- `i18n.js` (NO→EN-ordbok, `var D = {…}`), `theme.js` (lys/mørk for alle sider, lagres i localStorage `medialab.theme`). Lys modus regner om nøytrale farger per egenskap i `mapRGB`: tekst med kurve (`18 + 210·(1−t)^1.6`) for god kontrast, flater/kanter `228 − 208·t^0.85`.
- `vercel.json`: `buildCommand: npm run build`, `outputDirectory: dist`, CSP uten CDN og uten `unsafe-inline` for skript (inline-skript tillates med SHA-256 – bygget stopper hvis et mangler; `wasm-unsafe-eval` beholdes for onnxruntime), `assets/` hurtigbufres lenge (filnavn med hash). CSP-en står i to regler som utelukker hverandre (`has`/`missing` host = produksjonsadressen): produksjonsadressen får CSP uten utviklingsprosjektet, alle andre verter (Dev, deployment-adresser, lokalt) får begge. Leses via `build/csp.js` (vite-serveren, kontroll av inline-skript i begge, `static-serve.mjs`), testet i `build/csp.test.js`.
- P10: `src/services/community.js` (samarbeidsområder, abonnement uten betaling, varsler, personvern, menighetens livsløp), serverhandlinger i `server/handlers/privacy.js` (`privacy.delete_me`, `church.export`, `church.purge`), varsler og personvern i kontomenyen (`src/shared/account-menu.js`), fanene Samarbeid/Abonnement i admin.
- Tester: `npm test` (inkl. RLS-testsettet i PGlite), `npm run drill`, `node build/static-serve.mjs`; RLS mot dev: `supabase db query --linked --project-ref uatpdmhnwwjgzlxaucsx -f supabase/tests/rls_test.sql`.
- Samarbeid (trinn 18, `supabase/migrations/20261001190000_church_links.sql` + `…190100_link_source_folder.sql`):
  - Grunnkrav: menigheter ser aldri hverandres filer.
  - **Koblinger:** en kobling (`church_links`) gjelder nøyaktig to menigheter. Bare Moderator med MFA oppretter, avslutter og gjenåpner (`create_link`, `end_link`, `reopen_link`; Samarbeid-siden `LinksView`). Navnet vises som «Menighet A – Menighet B».
  - **Samarbeidsfiler:** hver kobling har en egen mappe (`files.folder = 'samarbeid'`, `link_id`, `source_file_id`, `source_folder`).
  - **Kopiering inn:** filer kommer bare inn som KOPI via `file.copy_to_link`: `can_transfer` → `storageCopy`, kontroll mot SHA-256, og `register_link_copy` med lås og kvote. Originalen røres aldri.
    - Delt mappe: alle medlemmer kan kopiere.
    - Faste: bare Admin.
    - Private filer kan aldri kopieres.
  - **Fjerning:** bare Admin i menigheten som bidro, kan fjerne kopien (`delete_file`).
  - **Moderator** ser bare metadata (`link_files_meta`), aldri innhold.
  - **Developer** ser filer bare i menigheter der Developer er medlem (A1).
  - **Faste** forvaltes bare av Admin (M1).
  - **Avsluttet kobling:** alt skjules for begge, og ingenting slettes.
  - **Verktøyene:** `MLCloud.collab()` i `ch-cloud.js` gir Samarbeidsfiler i et eget, merket område (Photo Design-biblioteket, Mockups-kategorien «Samarbeidsfiler»). `files(mappe)` gir bare egne menigheters filer.
  - **De gamle samarbeidsområdene** (`spaces`) er beholdt i databasen, men vises ikke lenger. Deling gjennom dem er skrudd av.
- Lagringskvote (trinn 19 + 21, `supabase/migrations/20261001200000_plan_editing.sql` og `20261002100000_church_quota_standard.sql`):
  - Menighetens faktiske kvote er `churches.storage_quota_mb`. Den er fast standard 200 MB (`app.default_quota_mb()`, `DEFAULT_QUOTA_MB`), eller en egen kvote som Developer med MFA tildeler per menighet (`set_church_quota`).
  - «Tilbakestill til standard (200 MB)» bruker `reset_church_quota`.
  - `churches.quota_custom` utledes alltid av kvoten med trigger (≠ 200 = egen kvote).
  - Planene er bare veiledende. Developer endrer lagring og pris via `update_plan`, og leser planenes lagring via `plans_admin`. Andre roller ser bare plannavn og pris.
  - Verken planendring eller godkjenning av abonnement endrer kvoten.
  - `follow_plan_quota` og `plan_change_preview` er stengt for alle roller, men ikke slettet.
  - Developer ser kvote, merke og brukt plass for alle menigheter via `church_quota_overview`.
  - Direkte skriving til kvoter og planer er stengt. Alt loggføres (`plans.update`, `churches.quota`) med gammel og ny verdi.
  - En lavere kvote stopper bare nye opplastinger.
- Samlet lagringsgrense (trinn 20, `supabase/migrations/20261002200000_total_storage_limit.sql`):
  - `storage_settings.total_limit_mb` (standard 1024 MB) gjelder alle filer i ConnectHub til sammen, også private filer og kopier.
  - **Rekkefølge ved kontroll:** `app.upload_check` og `app.transfer_check` sjekker først menighetens kvote (54000) og så den samlede grensen (`app.total_check`, SQLSTATE 53100).
  - **Feilkode:** serveren gir `507 storage_full` («Lagringsplassen i ConnectHub er full. Kontakt Developer.»).
  - **Lås:** registrering av filer og kopier tar én felles lås (`files:all`).
  - **Overbooking er tillatt:** summen av kvotene kan være større enn grensen.
  - **Developer med MFA:** `storage_overview` og `set_storage_limit` (loggført `storage.limit`), kortet «Samlet lagringsplass» under Abonnement. Varsel (`storage`) ved 80 % og 90 %.
  - **Medlemmer:** `storage_usage.system_free_bytes`. Måleren viser det minste av ledig kvote og ledig samlet plass.
- Testrolle/rollebytter: `src/shared/test-role.js` – bare når bygget er mot connecthub-dev og ikke produksjon (`switcherAllowed`). Kan bare SENKE rollen (Developer → Admin/User, Admin → User); endrer bare grensesnittet (`window.CH.me` = effektiv, `CH.realMe` = ekte). Serveren/RLS bruker alltid ekte innlogging. Valg i sessionStorage `ch.testRole`, banner nederst, valg i kontomenyen.
- ConnectHub Dev og produksjon holdes adskilt: i alle bygg som ikke er produksjon viser ConnectHub Admin merket «UTVIKLING · connecthub-dev» i toppfeltet. I produksjon har Developer-kortet (Oversikt) merket «PRODUKSJON» og knappen «Åpne ConnectHub Dev», som åpner `DEV_SITE` (`build/env-guard.js` = `SITE.preview` i `server/lib/backend.js`, testet) i ny fane. Adressen legges inn ved bygging (`__CH_DEV_SITE__`); utviklingsprosjektets ID gjør aldri det i produksjon (`__CH_DEV_REF__` = null).
- Tilbakemeldinger (trinn 8, `supabase/migrations/20261003100000_feedback.sql`):
  - **Knapp:** snakkeboble med «!» nede til høyre (ved kontoknappen) på alle innloggede sider. `src/shared/feedback-widget.js` monteres av `auth-gate.js`.
  - **Skjema:** fire kategorier med egne spørsmål, obligatorisk beskrivelse, «Marker et område på skjermen» (mus og berøring, element eller dratt område) og teknisk kontekst (miljø, bygg, commit/gren, nettleser, OS, enhet, skjerm, tidssone og de siste feilene fra `feedback-errors.js`).
  - **Ikke med i førsteversjonen:** skjermbilde.
  - **Innsending:** `submit_feedback` for alle aktive innloggede, høyst 20 per døgn.
  - **Innboks (bare Moderator og Developer med MFA):** `feedback_list`, `feedback_events_for`, `set_feedback_status` (avvist krever begrunnelse) og `add_feedback_note`. Ingen direkte tabelltilgang (RLS uten policyer).
  - **Rensing:** hemmeligheter (og e-post/telefon i brukertekst) fjernes i databasen (`app.feedback_scrub_*`) og i nettleseren (`src/shared/feedback-core.js`).
  - **Admin-siden «Tilbakemeldinger»** (`connecthub-admin/feedback.jsx`) har filtre, saksdetaljer, status og notater, «Kopier sak til Claude» og «Kopier alle saker til Claude» (alle viste etter filter, eller avhukede). Store eksporter deles i deler.
  - **Kopiformatet** (`formatCase`/`formatCases`) skiller brukerens opplysninger, automatisk kontekst og interne notater, og tar aldri med avsenderens navn eller e-post.
  - Tester: `feedback-core.test.js`, `contract.test.js` og RLS-blokken «Tilbakemeldinger».
- Ytelse:
  - `src/services/me-cache.js`: siden vises straks med forrige `whoami` for samme bruker, økt og MFA-nivå (localStorage `ch.me`). Porten kontrollerer mot databasen like etter og stopper eller laster siden på nytt ved avvik. Bufferen fjernes ved utlogging.
  - `src/shared/prefetch.js`: henter neste sides skript ved hover eller berøring.
  - `connecthub-admin/thumbs.jsx`: miniatyrer hentes når de vises, skaleres ned og huskes. Nedlasting henter originalen.
  - Admin `act` låser bare knappen eller skjemaet som startet handlingen, og `Btn` viser at den jobber.
  - `i18n.js` bygger aldri ett stort regulært uttrykk (kostet ~0,6 s per sidelasting).
  - Motion Design tegner forhåndsvisningen 4 ganger i sekundet i ro, og som før ved bruk eller avspilling.
  - Bakgrunnsanimasjonene har færre bilder og lavere oppløsning på svake enheter.
  - Målinger i `docs/testlogg.md`.
- Tredjeparts skript og fonter (P8): `build/vendor.js` + `build/vendor-lock.json` (SHA-384) → `/vendor/` (transformers, tesseract, mp4-muxer, qrcode) og `/fonts/fonts.css` (+ `/fonts/<familie>.css`). Ny versjon: endre listen, `npm run vendor:lock`, se gjennom endringen. Aldri CDN-adresser i koden.

## Regler
- All ny tekst må ha engelsk oversettelse i `media-lab/src/legacy/i18n.js`.
- Sikkerhet: valider filtyper/størrelse, ingen hemmelige nøkler i klienten, oppdater CSP ved nye eksterne domener.
