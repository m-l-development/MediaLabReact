# ConnectHub – runbook for flytting og gjenoppretting

Første versjon (P2). Utvides i P3–P9. Ingenting her kjøres mot produksjon uten egen godkjenning.

## Prinsipper
- **Aldri slett gamle data automatisk.** Kilden beholdes til målet er kontrollert og godkjent.
- **Alltid:** sikkerhetskopi → testflytting → kontroll → sikkerhetstester → omkobling → overvåking. Tilbakeføringsplan klar før start.
- **Persondata:** eksport er tilgangskontrollert, loggført og lagres kryptert; slettes når flyttingen er godkjent.

## Hva som finnes (per P2)
| Data | Kilde | Merknad |
|---|---|---|
| Brukere, roller, menigheter | Supabase `connecthub` (tom per 30.09.2026) | Tabeller kommer i P3 |
| Filer | ingen ennå | Supabase Storage fra P7, bare bilder |
| Video | **brukerens PC** | Aldri i skyen – ingenting å flytte |
| Lokale prosjekter | nettleserens IndexedDB/localStorage | Knyttes til bruker i P4; flyttes ikke til skyen |
| Gammel admin/Blob | aldri brukt | Ingenting å flytte |

## Database
1. `pg_dump --schema=public --schema=app --no-owner` (+ data) fra kilden.
2. Hos målet: opprett rollene `anon` og `authenticated` (eller tilsvarende) før gjenoppretting.
3. `pg_restore` og kontroller: antall rader per tabell, RLS slått på for alle tabeller, alle policyer og funksjoner finnes.
4. Kjør RLS-testene mot målet.

## Brukere og identiteter
1. Eksporter `app_users`, `user_identities`, medlemskap og roller (egne tabeller – leverandøruavhengige).
2. Passord kan **ikke** flyttes. Brukerne får e-post for å sette nytt passord hos ny leverandør.
3. Ved første innlogging hos ny leverandør legges en ny rad i `user_identities` for samme `app_users.id`, men **bare etter bekreftet e-post**.

## Filer
1. List alle filer i kilden (ID, størrelse, SHA-256).
2. Kopier via S3-standarden til målet.
3. Kontroller antall, størrelse og SHA-256 for hver fil; oppdater leverandørnøkkel i filtabellen.

## Hosting
1. `npm ci && npm test && npm run build` → `dist/`.
2. Sett headerne fra `media-lab/vercel.json` i vertens oppsett; sett miljøvariablene fra `docs/architecture-and-portability.md`.
3. Røyktest: innlogging, sperre på direkte URL, API-kall uten økt (skal avvises).

## Tilbakeføring
DNS/domene og miljøvariabler pekes tilbake til forrige oppsett; kilden er uendret fordi ingenting slettes før godkjenning.
