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
| L-1 | Takt-stiler «Groove» og «Rolig» (overganger, ord og kamera på takt) | Tidlig Loop | Mangler | `groove` finnes i B; kontrolleres linje for linje i Loop-porteringen |
| L-2 | Bevegelse etter lydstyrke og overlegg etter tempo | Tidlig Loop | Mangler | `energy` finnes i B-motoren; kontrolleres i Loop-porteringen |
| L-3 | Nyttår: fyrverkeri på slagene | Tidlig Loop | Mangler | `newyear` finnes i B; kontrolleres i Loop-porteringen |
| L-4 | Vignett-åpning: klikk i bildet for å velge hvor vignetten åpner seg | Tidlig Loop | Mangler | `vigX`/`vigY` i B; kontrolleres i Loop-porteringen |
| L-5 | Fokusområde: klikk for å velge (langsom zoom) | Tidlig Loop | Mangler | `focus` i B; kontrolleres i Loop-porteringen |
| L-6 | Lyd av/på i forhåndsvisningen (påvirker ikke eksporten) | Tidlig Loop | Mangler | Finnes i B med annen tekst; bygges i Loop |
| L-7 | «Mørk toning bak teksten» / «Vignett og mørk toning på alle slides» | Tidlig Loop | Mangler | Kontrolleres i Loop-porteringen |

## Bygget, men ikke kontrollert

| ID | Hva | Status | Hva som trengs |
|---|---|---|---|
| MD-11 | AI-undertekster (Whisper i nettleseren) | Implementert | Ekte Chrome med nett (modellnedlasting) og et videoklipp med tale |
| MD-12 | Voiceover | Implementert | Mikrofon i ekte nettleser |
| MD-17 | Velge prosjektmappe (File System Access-dialogen) | Implementert | Manuell test i Chrome/Edge; lagringen bak er enhetstestet |
| MD-10 | Logo fra Fellesmappe i Motion design | Blokkert | Innlogging mot ConnectHub (`.env.local`) |
| MD-15 | Eksport 1080p60 og 4K | Implementert | Ekte Chrome (samme kodevei som testet 1080p30) |
| IS-03, IS-04, IS-06, IS-07 | AI-modellene i Isolate Subject | Implementert | Ekte Chrome med nett; BiRefNet krasjer i headless Chrome |
| TS-10, PD-10 | AI-utklipp i Thumbnail og Photo | Implementert | Som over |
| PD-17, SHR-04 | Fellesmappe som bildekilde | Blokkert | Innlogging mot ConnectHub |
| AUTH-* | Innlogging, MFA, glemt passord mot ekte ConnectHub | Blokkert | `.env.local` for `connecthub-dev`; bare testet med falske adaptere |

## Gjenstår (ikke bygget ennå)

Loop Studio (LS-*, LE-*), plattform (PLT-03 knappefelt med tilbakemelding, PLT-04 oppdateringsvarsel, PLT-05
selvreparasjon, PLT-07 PWA, PLT-08 forhåndslasting, PLT-17 lokale data per bruker, PLT-21 tilbakemelding m.fl.),
innlogging/konto (AUTH-*) og admin (ADM-*). Rekkefølge: Loop Studio → plattform → innlogging og konto → admin.
