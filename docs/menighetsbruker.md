# Menighetsbruker (felleskonto per menighet)

En fast fellesbruker for menighetens PC på kontoret, eid og administrert av menighetens Admin, med egen innboks der
medlemmene kan sende filer. Innført 2026-11-21.

## Slik brukes den

| Hvem | Hvor | Hva |
|---|---|---|
| Admin i menigheten | Admin → **Brukere** → kortet «Menighetsbruker (felleskonto)» | **Opprett menighetsbruker** (brukernavn, passord, bekreft passord – ingen e-post). Deretter: endre passord, endre brukernavn, logg ut alle innlogginger, deaktiver/aktiver. Kortet viser brukernavn, status, når passordet ble endret og må byttes, og antall aktive innlogginger. |
| Menighetens PC | Innloggingen → **Menighetsbruker** | Brukernavn + passord. Kontoen huskes som eget, merket valg («Menighetsbruker · Felleskonto») på enheten. Økten varer til den logges ut (ingen utlogging ved inaktivitet). |
| Menighetsbrukeren | Forsiden → **Menighetens innboks** (`/app/innboks`) | Innkommende, Bilder, Dokumenter, Videoer, Prosjekter, Tidligere mottatt, Alle; søk; åpne, last ned (én eller flere), flytt, gi nytt navn, slett. Avsender og tidspunkt vises. |
| Alle medlemmer | Forsiden → **Send til menighet**, Dine medier (kortmeny «Send til menighet …»), Thumbnail Studio (Eksporter → «Send til menighet») | Velg menighet (dine menigheter med en Menighetsbruker), én eller flere filer (høyst 20, 30 MB per fil), send. |

Årlig passordbytte: når passordet er 12 måneder gammelt, viser appen «Nå er det tid for å bytte passord» i stedet for
resten av appen (ingen lukkeknapp). Etter byttet fortsetter PC-en uten ny innlogging; alle andre økter logges ut.
Menighetsbrukeren har ellers ingen «Bytt passord» og kan ikke slette kontoen.

## Sikkerhetsmodell

- **Samme innloggingssystem:** kontoen er en vanlig konto hos leverandøren (Supabase Auth: samme passordhashing,
  økter og tokens). Leverandøren krever en e-postadresse som nøkkel; vi bruker en intern nøkkel
  `p-<uuid>@menighetsbruker.invalid` (reservert domene, kan aldri leveres). Den vises aldri, får aldri e-post
  (`server/lib/mail.js` stopper den) og sendes aldri til nettleseren: brukernavnet slås opp på serveren (`parish.login`,
  grense 20/time per IP og 10/time per brukernavn).
- **Håndhevet i databasen:** `app.current_user_id()` (som alle rettigheter går gjennom) gir ingen bruker for en
  Menighetsbruker som er deaktivert, har passord eldre enn 12 måneder, eller ikke består `app.parish_auth_ok`:
  økten i tokenet må finnes (Admin kan logge ut – virker med en gang, ikke først når tokenet utløper), og
  passordhashen/nøkkelen må være de ConnectHub satte (passord eller e-post endret direkte hos leverandøren sperrer
  kontoen til Admin setter nytt passord).
- **Admin-handlinger:** rettigheten avgjøres av databasen med Admins token (`parish_prepare`, `parish_manage`: bare
  Admin i menigheten); deretter gjør serveren innloggingsdelen (opprette, passord, sperre `ban_duration`, utlogging).
  Nytt passord fra Admin logger alltid ut alle økter (leverandøren gjør det også).
- **Én per menighet, unikt brukernavn:** unike indekser (`church_id`, `lower(username)`); CH040/CH041. Kontoen kan ikke
  få roller eller bli medlem av en annen menighet (triggere).
- **Innboksen:** egen privat bøtte `ch-inbox` (bare serveren; kortlivede signerte lenker). Lesing: Menighetsbrukeren og
  Admin i menigheten (`app.inbox_reader`). Sending: aktive medlemmer av menigheten (`app.inbox_check`), innenfor
  menighetens kvote og den samlede grensen, 200 filer per døgn. Innholdet kontrolleres på serveren (magiske bytes;
  HTML/SVG/programfiler avvises). Video godtas bare her (eiers krav); Fellesmappen avviser fortsatt video.

## Filer

- Database: `supabase/migrations/20261121100000_parish_accounts.sql` (nøytral), `…100100_supabase_parish_auth.sql`
  (auth.users/auth.sessions, bøtta). Tilbakeføring: `supabase/checks/rollback_20261121100000.sql` (beholder tabellene).
- Server: `media-lab/server/handlers/parish.js` (`parish.create|manage|login|rotate`, `inbox.start|finish|urls|delete`),
  `lib/sniff.js` (`checkInbox`), adapterens `createAuthUser/updateAuthUser/passwordGrant/inbox*`.
- App: `services/parish.ts`, `services/auth/auth-service.ts` (`signInParish`, `rotateParishPassword`, tilstandene
  `parish-password`/`parish-blocked`, ny kontroll hvert 15. minutt og når fanen blir synlig), `features/auth/SignIn.tsx`,
  `features/auth/ParishPassword.tsx`, `features/admin/ParishAccount.tsx`, `features/parish/` (innboks og send-dialog).

## Tester

- `supabase/tests/rls_test.sql`: opprettelse, rettigheter, én per menighet, unikt brukernavn, 12-månedersperren,
  deaktivering, sending, isolering mellom menigheter, organisering/sletting; på Supabase også økt- og hashkontrollene.
- `media-lab/server/handlers/parish.test.js`, `privacy.test.js`; `web/src/services/auth/parish-auth.test.ts`.
- Ende til ende mot dev: `node web/e2e-dev/run-dev.mjs --only=menighet` (`web/e2e-dev/parish-dev.spec.ts`).

## Drift

- Kontoen glemt passord: Admin setter nytt passord i kortet (ingen e-post).
- PC-en stjålet/mistet: Admin → «Logg ut alle innlogginger» (og eventuelt nytt passord eller «Deaktiver»).
- Begrensning: Menighetsbrukeren teller som et medlem i menighetens brukergrense.
