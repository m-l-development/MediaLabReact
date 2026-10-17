# Gjenoppretting – tapte, endrede og utestede funksjoner

Arbeidsliste for gjenoppbyggingen (`web/`). Hele funksjonsregisteret står i [feature-parity.md](feature-parity.md);
denne listen samler det som **forsvant eller ble endret i tidligere overganger**, og det som er **bygget, men ikke
kontrollert**. Oppdateres fortløpende.

Status: **Mangler** · **Implementert** (bygget, ikke testet) · **Testet** (automatisk test) · **Verifisert**
(kontrollert i ekte bruk: ekte innlogging, ekte nettleser, mikrofon …) · **Blokkert** (venter på noe utenfor koden) ·
**Beslutning** (bevisst fjernet tidligere; gjeninnføres bare etter godkjenning).

## Kilder som er sammenlignet

| Kilde | Hva | Hvordan |
|---|---|---|
| A | `m-l-development/MediaLab` `main` @ `35062cb` (eldre dc-versjon) | Sammenlignet fil for fil med B da registeret ble laget (se feature-parity.md) |
| B | `MediaLabReact/media-lab/` (dagens app) | Leses linje for linje per verktøy før det bygges |
| H | Git-historikken i B (slettede filer, «fjern»-commits) | Som over |
| Tidlig Loop | `F:\Ukeprogram Loop videogenererator\media-lab` (24.09.2026, eldre enn A) | Synlige tekster sammenlignet med B (2026-10-11): 32 av 424 tekster finnes ikke i B; se L-1–L-7 |
| Prototype | `F:\ReactProjects\media-lab-react` | Skjelett med plassholdere («Kommer snart»); ingen funksjoner som ikke står i registeret |

## Tapt eller endret

| ID | Funksjon | Kilde | Status | Merknad |
|---|---|---|---|---|
| MK-13 | Lokale mockups vises før skysynk; galleriet venter aldri på skyen | A `a8515e9`, `e385c67` | Testet | `useMockupLibrary` |
| ADM-14 | Gammel admin, bl.a. **skjul/vis innebygde bilder per menighet** | A, H `db76976` | Beslutning | Gammel admin ble erstattet av ConnectHub-admin. Om «skjul/vis innebygde bilder» finnes der, kontrolleres når admin bygges; mangler det, foreslås det for godkjenning |
| PLT-20 | Feillogg fra nettleseren til Admin-loggen | A, H `db76976` | Beslutning | Tilbakemeldingsknappen (PLT-21) tar med siste feil; gjeninnføring krever godkjenning (ny API) |
| LE-34 | Fonter i spiller-HTML fra Google Fonts | A | Beslutning | Erstattet av egne fontfiler (personvern). Kontroller at Loop-spilleren bygger inn de egne fontene |
| TS-19 | Innebygde standardmaler med `asset:`-logoer | A | Beslutning | Gamle `asset:`-logoer vises fortsatt i maler som bruker dem |
| L-1 | Takt-stiler «Groove» og «Rolig» (overganger, ord og kamera på takt) | Tidlig Loop | Implementert | Finnes i B som takt-stilene groove/calm (sjangrene velger dem); motoren er portert uendret, og takt-effektene tegnes i enhetstest |
| L-2 | Bevegelse etter lydstyrke og overlegg etter tempo | Tidlig Loop | Implementert | `energy`/`energyAdaptive` og «Farten følger tempoet i musikken» i B; portert uendret |
| L-3 | Nyttår: fyrverkeri på slagene | Tidlig Loop | Implementert | Overlegget «Konfetti» (`newyear`) følger slagene når takt-synk er på; tegnes i enhetstest |
| L-4 | Vignett-åpning: klikk i bildet for å velge hvor vignetten åpner seg | Tidlig Loop | Testet | E2E `e2e/loop-studio-ui.spec.ts` (2026-10-17): punktet dras og bildet endres, Styrke, «+ Legg til vignett», innstillingene huskes. **Funnet og rettet:** uten slides gjorde knappen ingenting – nå vises en forklaring |
| L-5 | Fokusområde: klikk i bakgrunnsbildet for å velge utsnitt | Tidlig Loop | Testet | E2E `e2e/loop-studio-ui.spec.ts` (2026-10-17): beskjæringsdialogen ved valg av bakgrunnsbilde, «Beskjær / flytt bilde» → «Flytt utsnitt» flytter det som vises |
| L-6 | Lyd av/på i forhåndsvisningen (påvirker ikke eksporten) | Tidlig Loop | Testet | E2E `e2e/loop-studio-ui.spec.ts` (2026-10-17): uten musikk sender knappen til Stil; med musikk demp og slå på igjen |
| L-7 | «Mørk toning bak teksten» / «Vignett og mørk toning på alle slides» | Tidlig Loop | Implementert | Heter «Vignett bak teksten» og «Vignett på alle slides» i B; portert |
| LS-T | Loop Studio i lyst tema (dagens app farget om sidene med theme.js) | B | Testet | Samme omregning (`mapRGB`) portert til `light-theme.ts`, avgrenset til Loop-siden og dens stilark; enhetstest mot verdiene i dagens `theme.js` og E2E. Skjermbilder i lyst tema sammenlignet med dagens app (start og editor): like |
| LE-03c | Ukeprogram fra bilde via Claude (`window.claude.complete`) | B `logic.js:2169` | Beslutning | Finnes bare i Claude-artefaktmiljøet, aldri i Media Lab-appen. Ikke tatt med; tekstgjenkjenning med tesseract er med |
| PLT-07-id | Web-appens identitet (`id`/`start_url`/`scope`) | B `manifest.webmanifest` | Beslutning | Besluttet 2026-10-17: «A med omdirigering» – installert app åpner `/home` → 307 til `/app/` ([pwa-identitet.md](pwa-identitet.md)). Ikke publisert |
| PLT-19-u | Enhetsvalg i Loop Studio lagres i egne nøkler | B `studio-editor/logic.js` | Endret | Dagens valg (`medialab.units`) kopieres ved første åpning; den nye appen skriver aldri til dagens innstillinger. Ingen valg går tapt (nøklene er ulike per verktøy) |
| AUTH-links | E-postlenker (nytt passord, invitasjon, innloggingslenke) og godkjenning av invitasjon | B `LoginPage.jsx` | Testet | E-postlenkene lander fortsatt på `/login.dc.html` → `/login` (samme innlogging); etter godkjenning sendes brukeren til `/app/`. Invitasjonslenke godtatt mot connecthub-dev 2026-10-17 (`lifecycle-dev`) |

## Bygget, men ikke kontrollert

| ID | Hva | Status | Hva som trengs |
|---|---|---|---|
| MD-11 | AI-undertekster (Whisper i nettleseren) | Testet | Ekte Chrome med WebGPU (`e2e-real/motion-subs.spec.ts`, 2026-10-17): ekte tale (engelsk, laget lokalt med Windows-talesyntese) → «undertekster er laget» på 9–11 s, 5 av 5 ord riktig, to kjøringer. Norsk tale er ikke prøvd automatisk (ingen norsk stemme på maskinen) – bør høres på manuelt |
| MD-12 | Voiceover | Testet | Chromes falske mikrofon (E2E). Ekte mikrofon og lydkvalitet bør høres på manuelt |
| MD-17 | Velge prosjektmappe (File System Access-dialogen) | Implementert | Alt etter valget er testet med et ekte mappehåndtak (OPFS): kopiering, frigjøring og åpning. Selve dialogen kan ikke styres i en test: manuell test i Chrome/Edge |
| MD-10 | Logo fra Fellesmappe i Motion design | Testet | Ekte innlogging mot connecthub-dev 2026-10-17: logo fra Felles ressurser valgt i Motion design (`e2e-dev/sources-dev.spec.ts`, publiseringsbygget) |
| MD-15 | Eksport 1080p60 og 4K | Testet | Bildefrekvens og størrelse kontrollert i MP4-filen (E2E) |
| IS-03, IS-04, IS-06, IS-07 | AI-modellene i Isolate Subject | Implementert | Ekte Chrome med nett; TB-7BF5C1: Objekt byttet fra BiRefNet_lite (feilet i Chrome 154) til ormbg; React-versjonen kjørt automatisk i ekte Chrome med ekte modeller 2026-10-12 (se testlogg); dagens app ikke kjørt (krever innlogging), ikke manuelt verifisert av bruker |
| TS-10, PD-10 | AI-utklipp i Thumbnail og Photo | Testet | Ekte Chrome 154 med ekte modeller (ormbg/MODNet) 2026-10-12, se testlogg; ikke manuelt verifisert |
| PD-17, SHR-04 | Fellesmappe som bildekilde | Testet | Ekte innlogging mot connecthub-dev 2026-10-17: Photo Design (logo) og Thumbnail Studio (logo) henter testbildet fra Fellesmappe/Felles ressurser (`e2e-dev/sources-dev.spec.ts`) |
| SHR-01 | Delt mappe: dagens app slettet de eldste filene over 60 automatisk | Testet | Godkjent 2026-10-12: ingen automatisk sletting i Dine medier eller i dagens delte mappe; varsel ved stor samling og bruksoversikt; E2E med 300 filer |
| SHR-02 | «Send til» direkte fra Photo Design, Thumbnail Studio og Motion design (manglet; bare via Dine medier) | Testet | «Bruk i …» lagt til, E2E PC/mobil 2026-10-12 |
| SHR-07 | Felles grunnoppsett ved samtidige endringer (versjon, sammenslåing) | Testet | Mot connecthub-dev 2026-10-17 med to ekte økter (`e2e-dev/shared-setup-dev.spec.ts`): databasen – nøyaktig én av to samtidige lagringer lykkes, den andre CH011; eldre versjon kan aldri overskrive. Grensesnittet – Thumbnail Studio hos Admin og Bruker samtidig: **feil funnet og rettet**: kategorilisten ble slått sammen som ett felt, så den enes endring gikk tapt; nå slås lister med id-er sammen element for element (begge appene, enhetstester). Etter rettelsen: begge endringene beholdes, «slått sammen» vises, Admin får endringen. Menighetens oppsett lagt tilbake etter hver kjøring |
| ADM-03, SHR-04 | Ny menighet starter tom (maler, grunnoppsett, Faste/Felles), men Livets Ord-innhold er innebygd for alle | Testet | Besluttet 2026-10-17: `churches.legacy_defaults` (migrering 20261018110000, kjørt i dev). Nye menigheter får ikke «Kveldsbibelskole» (enhetstester `features/legacy-defaults.test.ts`); eksisterende uendret. Produksjon: venter på godkjenning |
| Publisering | Den nye appen var ikke koblet inn i bygget eller rutene på Vercel | Testet | Bygget tar med web/ til dist/app, ruter og headere for /app, sperren slipper /app/assets; fullt bygg og røyktest lokalt 2026-10-12. Venter på Vercel-forhåndsvisning og godkjenning (docs/lansering.md) |
| Brukergrense | Maks 10 brukere per menighet (aktive + ventende invitasjoner), atomisk i databasen, overstyring for stab | Verifisert | connecthub-dev 2026-10-12: migrering kjørt, 972/972 databasetester, samtidighetstest (ventet 5,8 s → CH013), Admin i ny app: teller, sperret knapp, 409 member_limit. Produksjon gjenstår (godkjenning) |
| LE-28, LE-27 | Loop Studio: MP4 i 4K, stående format og opptak i sanntid | Testet | E2E, størrelsen kontrollert i filen |
| LE-03 | Loop Studio: ukeprogram fra bilde (tekstgjenkjenning) | Testet | E2E med et generert bilde; et fotografi av et ekte program bør prøves manuelt |
| LE-12, LE-13 | Loop Studio: video på slide og grunnvideo | Testet | E2E med WebM laget i nettleseren; lagres bare lokalt |
| LS-04, LE-05 | Loop Studio: felles grunnoppsett, faste bilder og Fellesmappe | Testet | Ekte innlogging mot connecthub-dev 2026-10-17: bakgrunn fra Faste bilder og logo fra Felles ressurser i Loop Studio (`e2e-dev/sources-dev.spec.ts`) |
| AUTH-*, ADM-* | Innlogging, MFA, kontomeny og hele admin (varsler, e-postvarsler, bytt passord, last ned mine data, slett kontoen) mot ekte ConnectHub | Testet | Ekte innlogging mot connecthub-dev 2026-10-17 (`node web/e2e-dev/run-dev.mjs`, syntetiske kontoer): innlogging og utlogging for Bruker/Admin/Developer/Moderator; MFA-oppsett med TOTP og tilgang før/etter MFA; invitasjon (testpostkasse), lenken fra e-posten godtatt, passord valgt; rolle gitt og trukket tilbake; medlemskap fjernet; «Slett kontoen min» (innlogging avvist etterpå); «Glemt passord»; opplasting/sletting; video avvist; brukergrense; tilbakemeldinger behandlet; e-post-testutsending. Ingen ekte e-post sendt |
| PLT-03, PLT-21 | Knappefelt og tilbakemeldingsknapp | Testet | Ekte innlogging mot connecthub-dev 2026-10-17: tilbakemelding sendt fra knappen (`feedback-dev`), funnet i stabens innboks og behandlet (status, notat, arkiv) i `staff-dev` |
| PLT-16 | Testrolle (rollebytter) | Testet | Mot connecthub-dev 2026-10-17 (`e2e-dev/test-role-dev.spec.ts`): Developer fire valg, Admin- og User-visning begrenser grensesnittet mens serveren gir Developer-svar, gjelder bare fanen, «Tilbake til Developer»; Moderator og Bruker ingen rollebytter; Admin får Admin/User |
| PLT-17 | Lokale data per bruker, «Knytt til meg», «Fjern mine lokale data» | Testet | Mot connecthub-dev 2026-10-17 i én nettleserprofil (`e2e-dev/local-data-dev.spec.ts`): eierløse data → konto 1 «Knytt til meg» og ser dem; konto 2 får ikke spørsmålet og ser verken dem eller konto 1s prosjekt; «Fjern mine lokale data» fjerner bare konto 2s data; konto 1 har alt sitt etterpå |

## Gjenstår (ikke bygget ennå)

Plattform: PLT-03/04/05/07/09/16/17/19/21 er bygget (se registeret for hva som er testet og hva som er blokkert av innlogging). PLT-12/13/14 (publisering, CSP, ruting) hører til et eget, godkjent publiseringstrinn. PLT-08 (forhåndslasting) er bygget, ikke kontrollert. Innlogging/konto (AUTH-*) og alle admin-seksjonene (ADM-01–13) er bygget under /app/admin og testet med falske tjenester; ingenting er prøvd mot connecthub-dev ennå (blokkert, se AUTH-*). Loop Studio er bygget (se LS-/LE-radene). Neste: ekte prøving mot connecthub-dev når .env.local og testkontoer finnes.
