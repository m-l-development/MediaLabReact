# ConnectHub – arkitektur og leverandøruavhengighet

ConnectHub videreutvikles fra Media Lab (React 18 + Vite, `media-lab/`). Første versjon bruker Vercel (hosting og
serverfunksjoner) og Supabase (PostgreSQL, Auth, Storage), men skal kunne flyttes til andre leverandører uten
omfattende omskriving. Dette dokumentet beskriver hvordan, og holdes oppdatert for hver pakke (P2–P11).

## Faste krav
1. **Innlogging er obligatorisk** for alle verktøy, data og API-er – også ved direkte URL eller API-kall. Ingen åpen registrering; kontoer opprettes eller inviteres av noen med riktig rolle.
2. **Video lagres aldri i skyen** – verken felles eller privat. Videofiler ligger i en prosjektmappe på brukerens egen PC. Bare prosjektinformasjon kan lagres privat.
3. **Eksisterende lokale prosjekter bevares** og knyttes til riktig innlogget bruker; ingenting slettes uten brukerens valg.
4. **Hemmeligheter når aldri nettleseren.** Bare URL og publiseringsnøkkel (offentlige) legges inn i koden, ved navn, aldri via prefiks.
5. **Leverandørbindinger isoleres** og dokumenteres her.

## Lag
| Lag | Plassering | Kjenner leverandør? |
|---|---|---|
| Sider og verktøy | `media-lab/src/pages/` | Nei |
| Tjenestelag (domenefunksjoner) | `media-lab/src/services/` | Nei |
| Adaptere | `media-lab/src/services/adapters/<leverandør>/` | **Ja – eneste sted** |
| Offentlig konfigurasjon | `media-lab/src/services/config.js` (fra bygget) | Nei (bare verdier) |
| Byggesperrer | `media-lab/build/env-guard.js` + plugin i `vite.config.js` | Variabelnavn (tabell) |
| Serverregler (fra P4/P5) | `media-lab/server/` – Web-standard `(Request) → Response` | Nei |
| Serverinnganger | `media-lab/api/*.js` (2–3 linjer) | Ja (Vercel) |
| Sperre foran sider (P4) | én fil for Edge Middleware | Ja (Vercel), isolert |
| Database | `supabase/migrations/*.sql` – vanlig PostgreSQL | Nesten ikke (se under) |

## Brukeridentitet og RLS
- Alle tabeller peker til **egen** `app_users.id` (UUID), aldri til leverandørens brukertabell.
- `user_identities (provider, subject, user_id)` kobler innloggingsleverandøren til vår bruker (som OpenID Connect `iss`/`sub`).
- Alle RLS-policyer bruker **`app.current_user_id()`**. Den leser `sub`/`iss` fra `request.jwt.claims` (PostgREST-standard) og slår opp i `user_identities`. Ingen policy nevner Supabase.
- RLS-policyer, funksjoner og triggere er vanlig PostgreSQL og følger med `pg_dump`.

## Databasen (P3)
| Tabell | Innhold | Hvem ser | Hvem skriver |
|---|---|---|---|
| `app_users` | Egen bruker-ID, e-post, navn, telefon, status | Seg selv, stab, admin i felles menighet | Navn/telefon: bare seg selv |
| `user_identities` | Kobling `iss`/`sub` → `app_users` | Bare egne | Server (P4/P5) |
| `churches` | Menigheter og status | Medlemmer, admin, stab | Stab (Developer/Moderator) |
| `memberships` | Bruker ↔ menighet, status | Egne, admin i menigheten, stab | Opprettes av stab (invitasjoner i P5); status av admin/stab, aldri eget |
| `user_roles` | `developer`/`moderator` (globale), `church_admin` (per menighet) | Egne, admin i menigheten, stab | Bare `assign_role`/`revoke_role` |
| `invitations` | Hash av token, utløp, status | Stab, admin i menigheten, oppretter | Server (P5); token-hash aldri lesbar |
| `audit_logs` | Hvem gjorde hva, uten persondata i `meta` | Stab, admin for egen menighet | Bare triggere; kan aldri endres/slettes |
| `files` | Metadata for bilder | Medlemmer, admin, stab | Server (P7); video avvises av databasen |

Rolleregler: ingen kan endre egne roller; Developer/Moderator krever MFA (aal2); bare Developer gir `developer`/`moderator`;
Developer eller Moderator gir `church_admin` til aktive medlemmer; én aktiv admin per menighet; alt loggføres.
Status (bruker, medlemskap, menighet, rolle) sjekkes ved hvert kall – tilbakekalling virker umiddelbart, også med gyldig token.

## Leverandørbindinger (gjenstående og bevisste)
| Binding | Hvor | Ved bytte |
|---|---|---|
| Supabase-klient | `src/services/adapters/supabase/` | Ny adapter med samme grensesnitt |
| Variabelnavn fra Vercel-integrasjonen (`connecthubSUPABASE_*`, `connecthub-devSUPABASE_*`) | `build/env-guard.js` → `ENV_NAMES` | Endre tabellen (andre verter: `CONNECTHUB_SUPABASE_*`) |
| Miljøgjenkjenning (`VERCEL_ENV`) | `build/env-guard.js` → `targetOf` | Tilsvarende variabel hos ny vert |
| Rollene `anon`/`authenticated` i PostgreSQL | migreringer | Opprett rollene hos ny leverandør (skript i runbook) |
| Auth-innstillinger (registrering av, adresser, passordkrav) | Supabase-dashbordet | Gjenskapes hos ny leverandør; listet i runbook |
| Sikkerhetsheadere og CSP | `media-lab/vercel.json` | Samme headere i vertens konfigurasjon (nginx, `_headers` o.l.) |
| Serverinnganger | `media-lab/api/*.js` | Ny inngang hos ny vert; logikken i `server/` gjenbrukes |
| Gammel API (`api/ml.js` + `@vercel/blob`) | aldri tatt i bruk | Fjernes i P5 etter egen godkjenning |

## Hva må endres ved bytte
| Bytte | Filer/steder |
|---|---|
| **Hosting** | `vercel.json` → vertens header-oppsett; `api/*.js`-innganger; `ENV_NAMES`/`targetOf`; sperre-filen (P4). `npm run build` gir statiske filer i `dist/`. |
| **Database** (annen PostgreSQL) | `pg_dump`/`pg_restore`; opprett rollene; enten selvdriftet PostgREST (uendret adapter) eller ny dataadapter mot eget API som setter `SET LOCAL ROLE` og `request.jwt.claims` per forespørsel. |
| **Autentisering** | `adapters/<ny>/auth`; ny rad i `user_identities` per bruker etter bekreftet e-post. Passord kan ikke flyttes – brukerne setter nytt passord. |
| **Fillagring** | `adapters/<ny>/storage` mot S3-standarden; filer har egne ID-er; kopiering kontrolleres med SHA-256. |
| **Serverfunksjoner** | Bare inngangene i `api/`; `server/` gjenbrukes. |
| **Betaling** (senere) | Egen adapter; abonnementstatus endres bare via verifiserte serverhendelser. |

## Hemmeligheter og miljøvariabler
- Vite eksponerer **ingen** miljøvariabler automatisk (`envPrefix` er satt til et prefiks ingen bruker).
- `build/env-guard.js` leser **bare** URL og publiseringsnøkkel ved navn, per miljø, og stopper bygget hvis:
  prosjekt-ID ikke stemmer med miljøet (Preview = `uatpdmhnwwjgzlxaucsx`, Production = `cmuienhheklcgtfmpvbe`, lokalt = utvikling),
  nøkkelen ikke er `sb_publishable_…` (hemmelige nøkler, `service_role`-JWT og eldre anon-nøkler avvises), eller
  en variabel mangler på Vercel.
- Etter bygging søkes `dist/` etter `sb_secret_…`, PostgreSQL-URL med passord, `service_role`-JWT, navn på hemmelige variabler og feil prosjekt-ID.
  **Begrensning:** søket finner bare kjente mønstre, ikke vilkårlige hemmeligheter.
- Serverhemmeligheter (fra P4/P5) ligger bare i serverens miljø og brukes i én modul.
- Integrasjonsprefikset i Vercel må **aldri** settes til `VITE_` eller tilsvarende.

## Testing av leverandøruavhengighet (bygges ut i P9)
- `npm test` (`node:test`): byggesperrer, konfigurasjon; senere tjenestelag med falsk adapter.
- Kontrakttester: samme testsett mot falsk og ekte adapter.
- Gjenopprettingsøvelse: `pg_dump` fra `connecthub-dev` → vanlig PostgreSQL → RLS-testene.
- Statisk hosting: `dist/` servert uten Vercel, med headerne herfra.

## Miljøer
| Miljø | Git | Supabase | Vercel |
|---|---|---|---|
| Produksjon | `main` | `connecthub` (`cmuienhheklcgtfmpvbe`) | Production |
| Utvikling/test | `connecthub` | `connecthub-dev` (`uatpdmhnwwjgzlxaucsx`) | Preview (låst bak Vercel-innlogging) |
| Lokalt | valgfri gren | `connecthub-dev` via `.env.local` | – |
