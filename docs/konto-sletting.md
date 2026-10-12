# Sletting av egen konto («Slett kontoen min»)

Status 2026-10-12. Den nye appen (`web/src/app/AccountMenu.tsx`) bruker **samme server og database som dagens app**:
`POST /api/ch?a=privacy.delete_me` (`media-lab/server/handlers/privacy.js`) og databasefunksjonene i
`supabase/migrations/20261001160100_privacy_church_lifecycle.sql`. Ingenting på serveren eller i databasen er endret.

## Bekreftelse og kontroll

| Lag | Kontroll |
|---|---|
| Grensesnitt | Egen visning «Slette kontoen?» med forklaring, avkrysning «Jeg forstår at kontoen min slettes permanent …», knappen er av til avkrysningen er gjort. Nås bare via «Konto og sikkerhet» → «Faresone». |
| Server | Krever gyldig innlogging (Bearer-token, JWKS-verifisert) og feltet `confirm: "SLETT"` (ellers `confirm_required`). Brukeren kan bare slette seg selv: identiteten tas fra tokenet (`iss`/`sub`), aldri fra forespørselen. |
| Database | `prepare_account_deletion()` (som brukeren): stopper den siste aktive Developer (`22023` → «Er du den eneste Developer …»), og gir bare nøklene til brukerens **private** filer. `delete_account()` kan bare kjøres med servernøkkel. |

## Hva som skjer med dataene

| Data | Behandling |
|---|---|
| Private filer i lagringen | Slettes (filene, så radene) |
| ConnectHub-brukeren (`app_users`) | Slettes; identiteter, medlemskap, roller og varsler følger med (cascade) |
| Innloggingskontoen (Supabase Auth) | Slettes av serveren |
| Fellesfiler brukeren har lagt i menighetens mapper | **Beholdes** uten navn på opplaster |
| Invitasjoner til brukerens adresse | Adressen anonymiseres (`slettet-<id>@slettet.invalid`) |
| Revisjonslogg | Ny hendelse `account.delete`; eldre hendelser beholdes uten kobling til personen |
| Lokale data i denne nettleseren | Slettes etterpå i nettleseren (`clearMyLocalData`, bare brukerens egne) |
| Data på andre enheter, videoer i prosjektmapper | Røres ikke (ligger utenfor ConnectHub) |

## Testet og ikke testet

- **Automatisk testet (falske adaptere):** grensesnittets flyt (avkrysning kreves, feilmelding for siste Developer, lokale data fjernes og utlogging etter vellykket sletting) og at kallet går til `privacy.delete_me` med brukerens token og `SLETT`.
- **Ikke testet mot ConnectHub:** krever en egen engangs testkonto i `connecthub-dev` (en konto som faktisk kan slettes). Skal **aldri** prøves mot produksjonen.
