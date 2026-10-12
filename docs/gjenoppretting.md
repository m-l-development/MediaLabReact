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
| L-4 | Vignett-åpning: klikk i bildet for å velge hvor vignetten åpner seg | Tidlig Loop | Implementert | I B: vignettdialogen (dra punktet, åpning og størrelse); portert. Dialogen er ikke testet |
| L-5 | Fokusområde: klikk i bakgrunnsbildet for å velge utsnitt | Tidlig Loop | Implementert | I B erstattet av «Beskjær / flytt bilde» (utsnitt) og vignettpunktet; portert. Ikke testet |
| L-6 | Lyd av/på i forhåndsvisningen (påvirker ikke eksporten) | Tidlig Loop | Implementert | Lydknappen ved spilleknappen; ikke testet |
| L-7 | «Mørk toning bak teksten» / «Vignett og mørk toning på alle slides» | Tidlig Loop | Implementert | Heter «Vignett bak teksten» og «Vignett på alle slides» i B; portert |
| LS-T | Loop Studio i lyst tema (dagens app farget om sidene med theme.js) | B | Testet | Samme omregning (`mapRGB`) portert til `light-theme.ts`, avgrenset til Loop-siden og dens stilark; enhetstest mot verdiene i dagens `theme.js` og E2E. Skjermbilder i lyst tema sammenlignet med dagens app (start og editor): like |
| LE-03c | Ukeprogram fra bilde via Claude (`window.claude.complete`) | B `logic.js:2169` | Beslutning | Finnes bare i Claude-artefaktmiljøet, aldri i Media Lab-appen. Ikke tatt med; tekstgjenkjenning med tesseract er med |
| PLT-07-id | Web-appens identitet (`id`/`start_url`/`scope`) | B `manifest.webmanifest` | Beslutning | Ny app har egen identitet `/app/` (dagens: `/media-lab.dc.html`, omfang `/`). Ikke endret eller publisert. Alternativer og hvordan eksisterende installasjoner oppfører seg: [pwa-identitet.md](pwa-identitet.md) |
| PLT-19-u | Enhetsvalg i Loop Studio lagres i egne nøkler | B `studio-editor/logic.js` | Endret | Dagens valg (`medialab.units`) kopieres ved første åpning; den nye appen skriver aldri til dagens innstillinger. Ingen valg går tapt (nøklene er ulike per verktøy) |
| AUTH-links | E-postlenker (nytt passord, invitasjon, innloggingslenke) og godkjenning av invitasjon | B `LoginPage.jsx` | Beslutning | Lander fortsatt på dagens offentlige `/login.dc.html` (tillatt omdirigeringsadresse hos leverandøren). Den nye appen under `/app/` er bak sperren og kan ikke ta imot lenkene uten endret ruting, omdirigeringsadresser og lenker i serverens e-poster – krever godkjent publiseringstrinn. Skal porteres før dagens innloggingsside fjernes |

## Bygget, men ikke kontrollert

| ID | Hva | Status | Hva som trengs |
|---|---|---|---|
| MD-11 | AI-undertekster (Whisper i nettleseren) | Blokkert | Testet 2026-10-11 i hodeløs Chrome: modellen lastes ned (100 %), WebGPU finner ingen adapter, appen faller tilbake til WASM, men tolkingen var ikke ferdig etter 9 min. Må prøves i ekte Chrome med et klipp med tale (`RUN_AI=1 npx playwright test e2e/motion-ai.spec.ts`) |
| MD-12 | Voiceover | Testet | Chromes falske mikrofon (E2E). Ekte mikrofon og lydkvalitet bør høres på manuelt |
| MD-17 | Velge prosjektmappe (File System Access-dialogen) | Implementert | Alt etter valget er testet med et ekte mappehåndtak (OPFS): kopiering, frigjøring og åpning. Selve dialogen kan ikke styres i en test: manuell test i Chrome/Edge |
| MD-10 | Logo fra Fellesmappe i Motion design | Blokkert | Innlogging mot ConnectHub (`.env.local`) |
| MD-15 | Eksport 1080p60 og 4K | Testet | Bildefrekvens og størrelse kontrollert i MP4-filen (E2E) |
| IS-03, IS-04, IS-06, IS-07 | AI-modellene i Isolate Subject | Implementert | Ekte Chrome med nett; TB-7BF5C1: Objekt byttet fra BiRefNet_lite (feilet i Chrome 154) til ormbg; React-versjonen kjørt automatisk i ekte Chrome med ekte modeller 2026-10-12 (se testlogg); dagens app ikke kjørt (krever innlogging), ikke manuelt verifisert av bruker |
| TS-10, PD-10 | AI-utklipp i Thumbnail og Photo | Testet | Ekte Chrome 154 med ekte modeller (ormbg/MODNet) 2026-10-12, se testlogg; ikke manuelt verifisert |
| PD-17, SHR-04 | Fellesmappe som bildekilde | Blokkert | Innlogging mot ConnectHub |
| SHR-01 | Delt mappe: dagens app sletter de eldste filene over 60 automatisk; Dine medier sletter aldri automatisk | Beslutning | Bevisst avvik (originaler slettes aldri uten brukeren), venter på din godkjenning |
| SHR-02 | «Send til» direkte fra Photo Design, Thumbnail Studio og Motion design (manglet; bare via Dine medier) | Testet | «Bruk i …» lagt til, E2E PC/mobil 2026-10-12 |
| SHR-07 | Felles grunnoppsett ved samtidige endringer (versjon, sammenslåing) | Blokkert | Enhetstestet med falsk tjeneste; mot connecthub-dev krever to innloggede testkontoer |
| LE-28, LE-27 | Loop Studio: MP4 i 4K, stående format og opptak i sanntid | Testet | E2E, størrelsen kontrollert i filen |
| LE-03 | Loop Studio: ukeprogram fra bilde (tekstgjenkjenning) | Testet | E2E med et generert bilde; et fotografi av et ekte program bør prøves manuelt |
| LE-12, LE-13 | Loop Studio: video på slide og grunnvideo | Testet | E2E med WebM laget i nettleseren; lagres bare lokalt |
| LS-04, LE-05 | Loop Studio: felles grunnoppsett, faste bilder og Fellesmappe | Blokkert | Innlogging mot ConnectHub |
| AUTH-*, ADM-* | Innlogging, MFA, kontomeny og hele admin (varsler, e-postvarsler, bytt passord, last ned mine data, slett kontoen) mot ekte ConnectHub | Blokkert | Bygget og testet med falske adaptere. Trenger `.env.local` for `connecthub-dev` (URL + publiseringsnøkkel), og testkontoer: én vanlig bruker, én Admin, én Developer med MFA (TOTP-hemmelighet til testene), og én **engangskonto som kan slettes**. «Glemt passord», kontovelger og kontoforespørsel (AUTH-04/06/07) går foreløpig til dagens /login |
| PLT-03, PLT-21 | Knappefelt og tilbakemeldingsknapp | Blokkert | Implementert og enhetstestet mot falsk tjeneste. Vises bare innlogget: nettlesertest, innsending til `submit_feedback` og mobilvisning krever testkonto mot connecthub-dev |
| PLT-16 | Testrolle (rollebytter) | Blokkert | Regler, innlogging (falsk adapter) og grensesnitt testet. Vises bare i bygg mot utviklingsprosjektet og innlogget: krever testkonto (Developer og Admin) mot connecthub-dev |
| PLT-17 | Lokale data per bruker, «Knytt til meg», «Fjern mine lokale data» | Blokkert | Enhetstestet med fake IndexedDB og komponenttester. Ekte flyt (to brukere på samme PC) krever to testkontoer |

## Gjenstår (ikke bygget ennå)

Plattform: PLT-03/04/05/07/09/16/17/19/21 er bygget (se registeret for hva som er testet og hva som er blokkert av innlogging). PLT-12/13/14 (publisering, CSP, ruting) hører til et eget, godkjent publiseringstrinn. PLT-08 (forhåndslasting) er bygget, ikke kontrollert. Innlogging/konto (AUTH-*) og alle admin-seksjonene (ADM-01–13) er bygget under /app/admin og testet med falske tjenester; ingenting er prøvd mot connecthub-dev ennå (blokkert, se AUTH-*). Loop Studio er bygget (se LS-/LE-radene). Neste: ekte prøving mot connecthub-dev når .env.local og testkontoer finnes.
