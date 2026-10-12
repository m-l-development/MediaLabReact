# Teste serverhandlingene lokalt

Hva som trengs for å prøve serverhandlingene (`/api/ch?a=…`) fra `http://localhost:5180/app/` mot **connecthub-dev**, uten at hemmelige nøkler havner i Git, i filer i prosjektet, i logger eller i chatten. Kartlagt 2026-10-12 fra koden; ingenting her er endret i produksjon.

## Slik er det koblet i dag

- Utviklingsserveren i `web/` kjører **samme handler som Vercel** (`media-lab/server/handlers/ch.js`) via et Vite-mellomlag (`web/vite.config.ts`, `connecthubApiLocal`).
- Lokalt (uten `VERCEL_ENV`) går serverkoden **alltid mot connecthub-dev** (`media-lab/server/lib/backend.js`, `targetOf`). Det finnes ingen vei fra lokal maskin til produksjonsdatabasen i denne koden.
- Den offentlige nøkkelen og adressen leses fra `media-lab/.env.local` (ignorert av Git, allerede på plass).
- Den **hemmelige** nøkkelen leses **bare fra skallets miljø** (`CONNECTHUB_SUPABASE_SECRET_KEY`). Den slettes bevisst om den står i en `.env`-fil (`vite.config.ts`, `media-lab/vite.config.js`).
- En eldre `service_role`-JWT avvises hvis den gjelder et annet prosjekt enn connecthub-dev (`secret_key_wrong_project`). Nye `sb_secret_…`-nøkler kan ikke kontrolleres slik; en feil nøkkel gir da bare `unauthorized` fra Supabase.
- Svar ved manglende oppsett er `503 not_configured` med bare navnet på feilen (`secret_key_missing` osv.), aldri verdier.
- Byggene søkes for hemmelighetsmønstre etter bygging (stopper bygget ved funn).

## Hva hver handling trenger

| Handling | Hva den gjør | Trenger hemmelig nøkkel | Trenger SMTP | Endrer data |
|---|---|---|---|---|
| `request.form`, `request.submit` | «Send forespørsel om opprettelse av bruker» (uten innlogging) | Ja (signerer skjemaet) | Nei | Lagrer en forespørsel |
| `request.approve` | Godkjenne forespørsel (admin) | Ja | Ja (sender invitasjon) | Oppretter invitasjon |
| `auth.recover` | «Glemt passord» | Ja | Ja | Nei |
| `invite.create`, `invite.resend`, `invite.accept` | Invitasjoner | Ja | Ja (create/resend) | Ja |
| `mail.status`, `mail.test` | Mail-fanen i admin | Ja | Ja (`mail.test` sender en ekte e-post) | Nei |
| `file.upload`, `file.urls` | Fellesmappe, logoer, tilbakemeldingsbilder | Ja | Nei | Ja (lagring) |
| `file.delete`, `file.cleanup`, `link.delete` | Slette filer og delingslenker | Ja | Nei | **Ja, sletter** |
| `church.export` | Eksport av menighetens data | Ja | Nei | Nei |
| `church.purge` | Slette menighetens data | Ja | Nei | **Ja, sletter permanent** |

Uten hemmelig nøkkel gir alle disse `not_configured`. Innlogging, lesing av egne data, admin-oversikten og alt som går direkte mot Supabase med brukerens egen innlogging virker uten den (verifisert av deg 2026-10-12).

## Det du må gjøre (én gang per økt)

1. **Lag en egen nøkkel for lokal utvikling** i Supabase: connecthub-dev → Project Settings → API Keys → Secret keys → «Create new secret key», kall den f.eks. `lokal_utvikling` (bare små bokstaver, tall og _). Da kan den trekkes tilbake alene uten å påvirke Vercel. Bruk aldri produksjonsprosjektets nøkler.
2. **Start utviklingsserveren med nøkkelen bare i terminalens minne** (PowerShell; nøkkelen vises ikke og havner ikke i historikken):

   ```powershell
   $s = Read-Host "Hemmelig nøkkel for connecthub-dev" -AsSecureString
   $env:CONNECTHUB_SUPABASE_SECRET_KEY = [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($s))
   cd F:\ReactProjects\MediaLabReact\web
   npx vite --port 5180 --strictPort
   ```

   Variabelen forsvinner når terminalen lukkes. Ikke legg den i `.env.local`, i et skript i prosjektet eller i chatten.
3. **For e-post** (valgfritt): sett i samme terminal `CONNECTHUB_SMTP_HOST`, `CONNECTHUB_SMTP_PORT` (465/587), `CONNECTHUB_SMTP_USER`, `CONNECTHUB_SMTP_PASSWORD` (app-passord) og eventuelt `CONNECTHUB_MAIL_FROM_NAME` på samme måte. SMTP-oppsettet leses bare fra miljøvariabler (på Vercel: prosjektets miljø), ikke fra databasen (`media-lab/server/lib/mail.js`). Om det faktisk er satt på Vercel, er ikke kontrollert herfra. Uten disse gir e-posthandlingene `mail_not_configured`, resten virker.

## Testregler

- Bruk **testkontoer og testdata** i connecthub-dev. `church.purge`, `file.delete`, `file.cleanup`, `link.delete` og kontosletting prøves bare på data laget for testen.
- `mail.test` og invitasjoner sender ekte e-post: send bare til egne adresser.
- Resultater føres i `docs/feature-parity.md` / `docs/gjenoppretting.md` som **manuelt verifisert** med dato, adskilt fra automatiske tester (som bruker falske tjenester).

## Hva som fortsatt mangler før dette kan prøves

- Den hemmelige nøkkelen for connecthub-dev må settes i terminalen av deg (punkt 2). Jeg har den ikke og skal ikke ha den.
- SMTP-verdiene hvis e-post skal prøves lokalt (punkt 3).
- Testkontoer: vanlig bruker, Admin, Developer (med MFA) og en konto som kan slettes.

## Verifisere innlogging, admin, tilgang og serverhandlinger (bare lesing)

Tre tester i `web/e2e-dev/` (ikke med i den vanlige kontrollen). Alle logger inn på dev-serveren (5180, ekte connecthub-dev) med en testkonto **uten MFA**, trykker ingen knapper som endrer data, og skriver aldri ut passord, token eller persondata – bare antall, statuskoder og feilkoder.

| Test | Hva den viser |
|---|---|
| `admin-dev.spec.ts` | Alle admin-seksjonene på PC og mobil: overskrift, feilmeldinger i siden, konsollfeil, mislykkede kall; utlogging |
| `access-dev.spec.ts` | At tilgang **håndheves i databasen**, ikke bare skjules: kaller databasen direkte med brukerens økt (stabsfunksjoner, eksport av egen og fremmed menighet, roller og invitasjoner) og sammenligner med reglene i migreringene |
| `photo-dev.spec.ts` | Diagnose «hvitt bilde» i Photo Design: legger inn et testbilde (og ditt eget via `ML_DEV_IMAGE=<sti>`) og måler om bildeplassen viser bildet. Bildet blir bare i Playwrights midlertidige profil |
| `feedback-dev.spec.ts` | **Endrer data:** sender én merket testsak («[E2E-TEST …]») og sjekker referansen og at innsenderen ikke kan lese innboksen. Kjører bare med `$env:ML_DEV_ALLOW_FEEDBACK = "JA"` etter godkjenning; arkiver saken i Admin → Tilbakemeldinger etterpå |
| `server-dev.spec.ts` | Serverhandlingene som bare leser (`request.form`, `mail.status`, `church.export` egen/fremmed, uten innlogging). Krever den hemmelige nøkkelen i terminalen som startet dev-serveren; ellers hoppes den over med beskjed |

Kjør én gang per konto (vanlig bruker, deretter Admin):

```powershell
cd F:\ReactProjects\MediaLabReact\web
$env:ML_DEV_EMAIL = "ch-test-…@example.com"   # testkonto, ikke en ekte bruker
$s = Read-Host "Passord" -AsSecureString
$env:ML_DEV_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($s))
npx playwright test -c e2e-dev
```

Resultattabellene skrives i terminalen og ligger som vedlegg i rapporten; skjermbilder i `web/test-results/dev/` (ignorert av Git). Testene gjør ingen sletting, sender ingen e-post og lager ingen invitasjoner – det krever en egen testkonto og din uttrykkelige bekreftelse.
