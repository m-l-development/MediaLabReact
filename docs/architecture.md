# Media Lab (ny) – arkitektur

Status: fase 1 (2026-10-10). Gjelder den nybygde appen i `web/`. Den gamle appen i `media-lab/` er spesifikasjonen
(se `docs/feature-parity.md`) og kjører uendret til hvert verktøy er erstattet.

Relaterte dokumenter: `docs/media-model.md` (objekter, media og prosjektformat), `docs/migration-plan.md` (brukerdata),
`docs/testing.md` (teststrategi).

## 1. Mål og prinsipper

1. **Én plattform, ikke ni sider.** Ett app-skall, én innlogging, ett mediebibliotek og ett prosjektlager som alle verktøy bruker.
2. **Ny kode, gammel oppførsel.** Ingen kode fra `media-lab/src/pages` eller `src/legacy` kopieres inn. Den gamle appen brukes som spesifikasjon og som fasit i regresjonstester (samme input → sammenlign resultatet).
3. **Backend gjenbrukes uendret.** Database, RLS, Supabase Auth, `api/ch.js`, `server/` og sperren i `middleware.js` er felles for gammel og ny app. Ingen nye migreringer uten egen godkjenning.
4. **Typer ved alle grenser.** Domenetyper i `domain/`, validering når data kommer inn (lagring, filer, API).
5. **Bare det som brukes, lastes.** Hvert verktøy, hver AI-modell og hver koder lastes ved behov og frigjøres når verktøyet lukkes.
6. **Enkleste løsning som oppfyller kravene.** Ingen abstraksjon før den brukes av minst to verktøy med samme semantikk.

## 2. Plassering i repoet

```
MediaLabReact/
  media-lab/          gammel app (uendret) + backend: api/, server/, middleware.js, build/, vercel.json
  supabase/           database (uendret)
  web/                NY app – egen package.json
  docs/               felles dokumentasjon
```

Begrunnelse: den gamle appen bruker React 18 og egen byggekjede. En egen pakke for den nye appen gir React 19,
TypeScript og React Compiler uten å røre den gamle, og begge kan bygges og testes hver for seg.
Backend-koden i `media-lab/server` brukes av den nye appen (lokalt via samme handler som `chApiLocal`), ikke kopiert.

## 3. Teknologi (kontrollert 2026-10-10)

| Område | Valg | Merknad |
|---|---|---|
| UI | React 19.x + React DOM | Gammel app: 18.3.1 |
| Språk | TypeScript 6.0 (`strict`) | Ingen `any` uten begrunnelse |
| Bygg | Vite 8 + `@vitejs/plugin-react` 6 | Samme major som gammel app |
| Optimalisering | React Compiler 1.0 (babel-plugin) | Verifisert aktiv i bygget (memo-cache i utdata) |
| Lint | Oxlint | + `tsc --noEmit` |
| Enhetstester | Vitest (+ happy-dom for komponenter) | Ny avhengighet, begrunnelse i `docs/testing.md` |
| Nettlesertester | Playwright | Ny avhengighet, også for regresjon mot gammel app |
| Backend-klient | `@supabase/supabase-js` 2.117.2 | Samme versjon som gammel app, bare i `infrastructure/supabase` |
| Tredjeparts (lastes fra egen vert) | transformers 3.5.1, tesseract 5.1.1, mp4-muxer 5.1.3, qrcode-generator 1.4.4, fonter | Samme `vendor-lock.json`-mekanisme; aldri CDN |

Ingen tilstandsbibliotek (Redux, Zustand), ingen UI-rammeverk og ingen ruter-pakke i første omgang (se ADR-3).

## 4. Mappestruktur (`web/src`)

```
app/              oppstart, skall (sidelinje/topplinje), ruter, auth-port, feilgrenser, oppdatering, PWA
features/
  hub/            dashboard
  auth/           innlogging, MFA, glemt passord, forespørsel
  account/        kontomeny, varsler, konto og sikkerhet
  admin/          ConnectHub Admin
  files/          Fellesmappe, Samarbeidsmappe, Faste
  media-library/  felles mediebibliotek, velger, «Åpne i …»
  loop-studio/    startside, editor, motor, eksport
  thumbnail-studio/
  photo-design/
  motion-design/
  isolate-subject/
  mockups/
  fx/             felles effektmotor (Photo, senere Motion)
domain/           typer og regler uten avhengigheter: Asset, Project, Layer, Timeline, ids, validering
services/         applikasjonstjenester: assets, projects, export, ai, settings, auth, files, i18n, theme
infrastructure/   adaptere: idb, supabase, fs-access, workers, legacy-import, api (callServer)
shared/           designsystem (ui/), canvas-editor, layers, crop, fill, image-adjust, text, hooks, lib
```

Avhengighetsretning (kontrolleres av lint/test): `features → services → domain`, `services → infrastructure → domain`.
`domain` importerer ingenting fra resten. Ingen verktøy importerer fra et annet verktøy; deling går via `services`
eller `shared`.

## 5. Verktøymodul-kontrakten

```ts
interface ToolModule {
  id: ToolId                              // 'loop-studio' | 'thumbnail-studio' | 'photo-design' | ...
  title: MessageKey                       // i18n-nøkkel
  accepts: readonly AssetKind[]           // hva «Åpne i …» kan sende inn
  load: () => Promise<{ default: ComponentType<ToolProps> }>
}
interface ToolProps {
  route: ToolRoute                        // f.eks. { projectId?, assetId? }
  registerLifecycle: (h: ToolLifecycle) => void  // save(), isBusy(), dispose()
}
```

- Nytt verktøy = ny mappe i `features/` + én linje i `app/tools.ts`.
- `ToolLifecycle.save()` brukes av oppdateringsvarselet (PLT-04) og ved verktøybytte; `dispose()` frigjør modeller,
  Workers, lyttere og object-URL-er. Testes eksplisitt (åpne/lukke 20 ganger, minnet skal ikke vokse).

## 6. Tilstand

| Type tilstand | Hvor | Eksempel |
|---|---|---|
| Server-/kontodata | `services/*` med enkel buffer, eksponert via `useSyncExternalStore` | `whoami`, menigheter |
| Delte domeneobjekter | `services/assets`, `services/projects` (IndexedDB er kilden) | medier, prosjekter |
| Editor-tilstand | per verktøy: redusering + historikk (`shared/history`) | lag, valg, angre/gjør om |
| Lett UI-tilstand | React-tilstand / Context | åpent panel, aktivt verktøy |

React Context brukes bare for å gi tilgang til tjenester (`ServicesProvider`) og lett UI-tilstand. Binære data ligger
aldri i React; komponenter får `AssetId` og henter en kortlevd URL med `useAssetUrl(id)`.

## 7. Backend og sikkerhet

- **Uendret:** tre lag med sperre (middleware + port i nettleser + RLS), MFA, roller, API-kontrakter (`/api/ch?a=…`).
- `infrastructure/supabase` er eneste sted som kjenner `@supabase/supabase-js`; `services/auth`, `services/files`,
  `services/settings` osv. har nøytrale grensesnitt og feilkoder (`forbidden`, `conflict`, `invalid`, `rate_limited`,
  `not_found`, `network`) som i dagens `src/services`.
- **Kontrakttest:** den nye adapteren skal bestå de samme kontraktene som `media-lab/src/services/contract.test.js`
  (portes til TypeScript), mot en falsk adapter og – med `CH_LIVE_*` – mot `connecthub-dev`.
- **Hemmeligheter:** samme regler som `build/env-guard.js`. `web/vite.config.ts` gjenbruker modulen (import, ikke kopi)
  og søker i `dist/` etter hemmeligheter. Bare URL og publiseringsnøkkel bakes inn.
- **CSP:** samme policy; ingen inline-skript uten hash, ingen CDN.

## 8. Ruter og lasting

- Stier, ikke hash: `/app`, `/app/loop-studio`, `/app/thumbnail-studio`, … (ADR-3). Dypelenker og bokmerker virker,
  og sperren i `middleware.js` beskytter dem (matcher allerede alt utenom statiske filer og `/login`).
- Hvert verktøy er en egen JS-del (`React.lazy`) med forhåndslasting ved hover/fokus. Importfeil fanges av en
  feilgrense med «Prøv igjen» og kobles til selvreparasjonen (PLT-05).
- Bare ett verktøy er montert om gangen. Før bytte kalles `save()` og så `dispose()`; tilstanden ligger i prosjektet,
  så verktøyet åpner der brukeren var (PLT-06).

## 9. Ytelse – mål settes i fase 0/5

Måles for gammel og ny app med samme metode (Playwright + `performance`-API, Chrome, middels maskin):
JS ved første visning (kB gzip), tid til dashboard synlig, tid fra klikk til verktøy klart, minne etter 20 verktøybytter.
Grense i CI: hovedbunten må ikke vokse mer enn 10 % uten begrunnelse.

## 10. Utrulling

- Under utvikling: `web/` bygges og testes lokalt og i CI.
- Preview (fase 6): forslag er at `media-lab`-bygget også bygger `web/` til `dist/app/`, slik at samme Vercel-prosjekt,
  sperre og CSP gjelder. Dette endrer `media-lab/vite.config.js`, `build/routes.js` og `vercel.json` og legges fram
  som et eget trinn før det gjøres.
- Bytte fra gammelt til nytt verktøy skjer ved å peke den korte adressen (f.eks. `/mockup`) til `/app/mockups`,
  ett verktøy om gangen, etter godkjenning. Produksjon krever egen godkjenning.

## 11. Arkitekturbeslutninger (ADR)

| # | Beslutning | Begrunnelse | Status |
|---|---|---|---|
| ADR-1 | Ny app i `web/` med egen pakke | Ingen konflikt med React 18-appen; uavhengig bygg og test | Vedtatt |
| ADR-2 | Backend gjenbrukes uendret, adapterlag i `infrastructure/` | Krav om å bevare brukere, RLS og API | Vedtatt |
| ADR-3 | Egen liten, typet ruter (History API) i stedet for en ruterpakke | ~10 ruter + spørringsparametre; mindre bunt; kan byttes ut bak `app/router` | Foreslått |
| ADR-4 | Innhold lagres etter SHA-256 (`BlobStore`), metadata separat | Ingen duplikater; samme fil i mange prosjekter | Vedtatt |
| ADR-5 | Ny IndexedDB per bruker; gamle databaser bare leses | Gamle data skal aldri endres eller slettes | Vedtatt |
| ADR-6 | AI og videokoding i Web Workers med `AbortSignal` | UI skal ikke fryse; kan avbrytes og frigjøres | Vedtatt |
| ADR-7 | Felles 2D-lagmodell for Photo Design og Thumbnail Studio | Samme semantikk (tekst/bilde/form, transform, maske) | Foreslått – bekreftes når begge er lest i detalj |
| ADR-8 | Mens begge appene kjører, skrives `church_settings` i dagens format | Gammel app må fortsatt virke for andre i menigheten | Vedtatt |
