# Media Lab (ny) – plan for brukere og data

Status: fase 1 (2026-10-10).

## 1. Grunnregler

1. **Ingenting gammelt endres eller slettes.** Gamle IndexedDB-databaser, localStorage-nøkler, prosjektmapper og
   skydata leses bare. Den gamle appen skal virke uendret ved siden av den nye.
2. **Kopi, ikke flytting.** Import lager nye objekter i `medialab@<bruker-id>` med `legacy`-referanse til kilden.
3. **Brukeren bestemmer.** Import skjer når brukeren velger det (første gang: tilbud på dashboardet), ikke automatisk
   ved oppstart.
4. **Idempotent.** Samme kilde importeres ikke to ganger (`legacy-imports`-loggen holder kilde-ID → ny ID).
5. **Feil stopper bare det ene prosjektet.** Et prosjekt som ikke kan leses, rapporteres med navn og grunn; resten
   importeres.

## 2. Kontoer og skydata

| Data | Tiltak |
|---|---|
| Brukere, roller, menigheter, medlemskap | Ingen endring – samme Supabase Auth og database |
| Skyfiler (`files`, `ch-files`) | Leses via samme API; `ch:<id>` blir `Asset` med `origin.type = 'cloud'` uten kopiering |
| `church_settings` (`loopstudio:week`, `loopstudio:bases`, `thumbstudio:cats`) | Leses og skrives i **dagens format** så lenge den gamle appen er i bruk (ADR-8). Nytt format først etter egen beslutning |

## 3. Lokale data – kilder og lesere

| Kilde | Leser (`infrastructure/legacy-import/`) | Resultat |
|---|---|---|
| `medialab-share` | `share.ts` | Assets (`origin: upload`) |
| `thumbstudio` (`kv`, `img`) | `thumbnail.ts` | Kategorier, grunnoppsett, maler → prosjekter; bilder → assets |
| `photodesign` (`projects`, `media`) + `photodesign.*` | `photo.ts` | Prosjekter + assets + egne maler/kategorier |
| `motiondesign` (`projects`, `media`) + `.motion` | `motion.ts` | Prosjekter + assets (video blir lokal/prosjektmappe) |
| `ukeloop` (`media`) + `loopstudio.*`, `ukeloop.*` | `loop.ts` | Disk-looper, maler, grunnoppsett → prosjekter + assets |
| `mockuplib` | `mockups.ts` | Egne mockup-bilder → assets |
| Prosjektmappe-håndtak | `project-folder.ts` | Tilgang bes på nytt (nettleseren krever det) |
| Innstillinger (`medialab.theme`, `medialab.units`, `medialab.fx.*`, …) | `settings.ts` | Nye innstillinger |

Navnene finnes både med `@<bruker-id>` og uten (gamle data, eid via `ch.local.owner`). Leseren følger samme regel som
`media-lab/src/shared/local-user.js`: bare databaser som tilhører innlogget bruker.

Mediereferanser i gamle prosjekter: `ch:<id>` → sky-asset; `gen:N` → genererte bakgrunner (gjenskapes); `asset:<navn>` →
innebygd fil i `/images/` (filene beholdes); `db:<nøkkel>`/`lib:` → asset fra samme database; `blob:` er ugyldig etter
omlasting og rapporteres som manglende.

## 4. Test av migreringen

- **Testdata:** et skript fyller en tom nettleserprofil med data ved å bruke den gamle appen (Playwright), for hvert verktøy.
- **Kontroller:** antall prosjekter og medier, at hvert importert prosjekt åpnes, og at eksport fra ny og gammel app gir
  samme resultat innen toleransene i `docs/testing.md`.
- **Tilbakeføring:** ingen nødvendig for gamle data (urørt). Ny database kan slettes og importen kjøres på nytt.

## 5. Overgang

1. Gammel og ny app kjører side om side (`/` og `/app`).
2. Når et verktøy er ferdig og testet i ny app, pekes den korte adressen dit (egen godkjenning per verktøy).
3. Gammel kode fjernes først når alle verktøy er erstattet og brukerne har hatt tid til å importere data (egen beslutning).
