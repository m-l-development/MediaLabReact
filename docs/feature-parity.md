I |
|
|
|
|
|
|
|
|
|
|
|
|
|
|
|
|
|
|
|
|
|
|
|
|
|
|
|
|
|
|
|
|
|
|P |I |P |I |I |I |I |I |I |
funksjonsregister (feature parity)

Register over all funksjonalitet som den nybygde Media Lab (`web/`) skal bevare eller gjeninnføre.
Et verktøy er ikke ferdig før alle radene i dets omfang har status **Testet**, eller en dokumentert og godkjent unntaksbeslutning.

Sist oppdatert: 2026-10-10 (fase 2: fundament).

Status i `web/` så langt: **T** = testet i ekte Chrome (Playwright) eller manuelt i Chrome (**M**); **I** = implementert og
enhetstestet (**U**), men ikke testet hele veien i nettleser; **P** = påbegynt. Innlogging er bare testet med falske
adaptere (krever `.env.local` for `connecthub-dev`).

Mockups: samme motor som i dag (homografi, skjermgjenkjenning, okklusjon, lys/glans) portert til TypeScript; samme
mockup og design gir samme bilde som dagens app (kontrollert visuelt mot repo A). Innstillinger per mockup bruker
samme nøkkel (`mockups.settings`) som dagens app.

Isolate Subject: MODNet og SlimSAM er kjørt i Chrome mot ekte modeller (fra egen vert). BiRefNet (Objekt, 115 MB)
får tidsavbrudd i headless Chrome, som i dagens app – må testes manuelt i vanlig Chrome.

## Kilder

| Kode | Kilde | Versjon |
|---|---|---|
| **B** | `m-l-development/MediaLabReact`, `media-lab/` | `connecthub` = `feature/onepage-rebuild` @ `674f318` |
| **A** | `m-l-development/MediaLab` (eldre dc-runtime-versjon) | `main` @ `35062cb` (22 commits, 2026-09-28–29) |
| **H** | Git-historikken i B, bl.a. `docs/react-migrering/*` og `legacy-dc/*` fjernet i `fa79781`, gammel admin fjernet i `db76976` | – |
| **D** | Dokumentasjon i B: `CLAUDE.md`, `docs/*.md`, `supabase/migrations/*` | @ `674f318` |

## Hvordan registeret er laget (og hva som ikke er gjort)

- **Gjort:** sammenligning av alle filer i A og B (motorer linje for linje med `diff`), alle slettede filer og «fjern»-commits i B, de fjernede migreringsdokumentene (`docs/react-migrering/01–11`, inkl. funksjonstestlisten), uttrekk av all synlig tekst/knapper/verktøytips fra hver side og alle valglister i motorene.
- **Ikke gjort ennå:** linje-for-linje-lesing av hver `logic.js`/`template.jsx`. Rader merket **E\*** er funnet via UI-tekst, valglister eller dokumentasjon, men detaljene (grenseverdier, kanttilfeller) må leses ut av koden før verktøyet bygges. Dette gjøres som første steg i fase 4 for hvert verktøy, og registeret oppdateres da.

## Statuskoder

| Kode | Betydning |
|---|---|
| **E** | Eksisterer i B, verifisert i kode |
| **E\*** | Eksisterer i B, funnet via UI-tekst/valglister/dokumentasjon; detaljer ikke lest |
| **G** | Gjenfunnet: fantes i A eller historikken, mangler eller er endret i B |
| **U** | Uferdig/planlagt i dokumentasjonen («Gjenstår») |
| **F** | Bevisst fjernet etter dokumentert beslutning – gjeninnføres bare etter ny godkjenning |
| **?** | Ikke verifisert – må undersøkes |

Implementeringsstatus: **–** ikke startet · **P** påbegynt · **I** implementert · **T** testet.
Testtype: **U** enhet · **K** komponent/integrasjon · **E2E** nettlesertest · **M** manuell · **R** regresjon mot gammel app (samme input → samme fil).

---

## 1. Plattform

| ID | Funksjon | Kilde | Status | Ny modul | Test | Impl |
|---|---|---|---|---|---|---|
| PLT-01 | Norsk/engelsk språk, valg lagres, alle tekster oversatt (regel: all ny tekst skal ha engelsk) | B `i18n.js`, D | E | `shared/i18n` | U, E2E | – |
| PLT-02 | Lys/mørk modus (mørk standard), lagres i `medialab.theme`, lys modus = dempet off-white `#e4e1da` | B `theme.js`, D | E | `shared/theme` | E2E | – |
| PLT-03 | Flytende knappefelt nede til høyre: tilbakemelding, konto, lys/mørk; ett panel åpent om gangen | B `dock.js`, D | E | `app/dock` | K | – |
| PLT-04 | Varsel om ny versjon: sjekk hvert minutt og når fanen blir synlig; lagrer arbeid; «Oppdater nå»/«Senere» (10 min); aldri tvungen omlasting; verktøy melder `save/busy/note` | B `ml-update.js`, D | E | `app/update` | U, E2E | – |
| PLT-05 | Selvreparasjon ved feilende `/assets/`-filer (hent på nytt forbi cache, last én gang til, sperre mot løkke) | B `vite.config.js` HEAL | E | `app/self-heal` | E2E | – |
| PLT-06 | Husk visning/prosjekt ved F5 og tilbake/fram (ikke ved ny fane) | B `here.js`, D | E | `app/router` | E2E | – |
| PLT-07 | PWA: manifest, installasjonsprompt, «Ikke nå» i 14 dager | B `ml-pwa.js`, H 11 | E | `app/pwa` | E2E | – |
| PLT-08 | Forhåndslasting av neste verktøy ved hover/berøring | B `prefetch.js` | E | `app/router` (lazy + preload) | K | – |
| PLT-09 | Fast topplinje med tilbakeknapp og verktøynavn, også ved rulling; tittel tones ut på startsider | B `sticky-title.js`, D | E | `shared/ui/TopBar` | E2E | – |
| PLT-10 | Animert bakgrunn på menyer/startskjermer, statisk mørk på arbeidsflater; færre bilder på svake enheter; respekterer redusert bevegelse | B `ml-bg.js`, D | E | `shared/ui/Backdrop` | M | – |
| PLT-11 | Footer «Design by Kristen Utvikling» med innfading og valgfri lenke | B `ml-footer.js` | E | `shared/ui/Footer` | K | – |
| PLT-12 | Korte adresser (/home, /loopstudio, /thumbnailstudio, /photodesign, /motiondesign, /isolate, /mockup, /admin, /fellesmappe …) og 307 fra gamle `.dc.html` | B `build/routes.js` | E | `app/router` + `vercel.json` | U, E2E | – |
| PLT-13 | CSP uten CDN og uten `unsafe-inline` for skript; inline-skript med SHA-256; `wasm-unsafe-eval` for ONNX | B `vercel.json`, `build/csp.js` | E | byggeoppsett `web/` | U (byggesjekk) | – |
| PLT-14 | Tredjepartsfiler og fonter fra egen vert, låst med SHA-384 (`vendor-lock.json`): transformers 3.5.1, tesseract 5.1.1 + `nor`, mp4-muxer 5.1.3, qrcode-generator 1.4.4, 10 fontfamilier | B `build/vendor.js` | E | byggeoppsett `web/` | U | – |
| PLT-15 | Hemmelighetsvern i bygget: bare URL + publiseringsnøkkel ved navn, prosjekt-ID per miljø, søk i `dist/` etter hemmeligheter | B `build/env-guard.js` | E | byggeoppsett `web/` (gjenbruk av samme regler) | U | – |
| PLT-16 | Testrolle/rollebytter (bare dev, bare senke rolle, bare UI) | B `test-role.js`, D | E | `features/account` | U | – |
| PLT-17 | Lokale data per bruker (`navn@<bruker-id>`), «Knytt til meg» for gamle data, «Logg ut og fjern mine lokale data» | B `local-user.js`, D | E | `infrastructure/local-user` | U, E2E | – |
| PLT-18 | Rask oppstart: siste `whoami` fra buffer, kontrolleres mot databasen like etter | B `me-cache.js` | E | `services/auth` | U | – |
| PLT-19 | Enhetsvalg (`medialab.units`) – px/mm | B localStorage | E\* | `shared/units` | U | – |
| PLT-20 | Feillogg fra nettleseren til Admin-loggen (`ml-cloud.js` → `api/ml.js`) | A, H `db76976` | F | Erstattet av siste feil i tilbakemeldinger (PLT-21). Gjeninnføres ikke uten beslutning. | – | – |
| PLT-21 | Tilbakemeldingsknapp: fire kategorier, beskrivelse, markér område på skjermen, teknisk kontekst + siste feil, rensing av hemmeligheter, maks 20/døgn | B `feedback-*.js`, D | E | `features/feedback` | U, E2E | – |

## 2. Innlogging og konto

| ID | Funksjon | Kilde | Status | Ny modul | Test | Impl |
|---|---|---|---|---|---|---|
| AUTH-01 | Innlogging obligatorisk for alle verktøy, data og API-er, også direkte URL (sperre foran sider + port i nettleser + RLS) | B `middleware.js`, `gate.js`, `auth-gate.js`, D | E | `app/auth-gate` + uendret server | E2E | – |
| AUTH-02 | Innlogging med e-post/passord, `safeNext`, vern mot omdirigeringssløyfe (`ch.loop`) | B `login/` | E | `features/auth` | E2E | – |
| AUTH-03 | MFA (TOTP), MFA-oppsett for stab, `aal2` | B `login/`, D | E | `features/auth` | E2E | – |
| AUTH-04 | Glemt passord: nøytralt svar, `token_hash`-lenker, MFA-steg, nytt passord med krav og vis/skjul, «Lenken virker ikke lenger» + «Send ny lenke» | B, D | E | `features/auth` | E2E | – |
| AUTH-05 | Bytt passord (ny innlogging, MFA, andre økter logges ut) | B `account-menu.js`, D | E | `features/account` | E2E | – |
| AUTH-06 | Kontovelger på innloggingssiden (bare e-post, navn, initialer) | B `saved-accounts.js` | E | `features/auth` | U | – |
| AUTH-07 | Kontoforespørsel før innlogging (skjemanøkkel, felle-felt, grenser) | B `RequestPanel.jsx`, D | E | `features/auth` | E2E | – |
| AUTH-08 | Kontomeny: Varsler, E-postvarsler (Developer/Moderator), Konto og sikkerhet (Last ned mine data, lokale data, Slett kontoen min), Logg ut | B `account-menu.js`, D | E | `features/account` | E2E | – |
| AUTH-09 | Konto ikke aktiv / ukoblet konto → egen visning | B, D | E | `features/auth` | E2E | – |

## 3. Administrasjon (ConnectHub Admin)

Hele admin-siden bevares funksjonelt. Detaljert underliste lages når Admin bygges (fase 4g).

| ID | Funksjon | Kilde | Status | Ny modul | Test | Impl |
|---|---|---|---|---|---|---|
| ADM-01 | Oversikt (krever handling, siste hendelser, utviklerkort, PRODUKSJON/UTVIKLING-merke, «Åpne ConnectHub Dev») | B `connecthub-admin/` | E\* | `features/admin` | E2E | – |
| ADM-02 | Brukere: søk, status, roller, profil, medlemskap, invitasjoner, siste aktivitet, navn | B, D | E\* | `features/admin` | E2E | – |
| ADM-03 | Menigheter: ny, navn, kvote, logo, eksport, status og sletting (livsløp) | B, D | E\* | `features/admin` | E2E | – |
| ADM-04 | Medlemmer: én menighet om gangen, fjerning/gjenoppretting, Ekstra Admin, melding til alle | B, D | E\* | `features/admin` | E2E | – |
| ADM-05 | Invitasjoner: opprett, send på nytt, aksepter | B, D | E\* | `features/admin` | E2E | – |
| ADM-06 | Forespørsler-innboks (A/B/C-godkjenning) | B, D | E\* | `features/admin` | E2E | – |
| ADM-07 | Filer: Fellesmappe, Samarbeidsmappe, Faste; opplasting, forhåndsvisning, flervalg, ZIP, eksporter, slett; filer i bruk kan ikke slettes | B `folders.jsx`, D | E\* | `features/files` | E2E | – |
| ADM-08 | Samarbeidsgrupper (2–20 menigheter), kopiering inn, avslutt/gjenåpne/slett | B, D | E\* | `features/admin` | E2E | – |
| ADM-09 | Abonnement, planer, kvoter, samlet lagringsgrense | B, D | E\* | `features/admin` | E2E | – |
| ADM-10 | Logg (søk, type) | B | E\* | `features/admin` | E2E | – |
| ADM-11 | Mail-fanen: maler, logo, testutsending, utsendingslogg, varslingsadresser | B `mail.jsx`, D | E\* | `features/admin` | E2E | – |
| ADM-12 | Tilbakemeldinger: filtre, saksdetaljer, status, notater, arkivering, kopier sak(er) | B `feedback.jsx`, D | E\* | `features/admin` | E2E | – |
| ADM-13 | Opprydning: private filer fra fjernede medlemmer | B `cleanup.jsx`, D | E\* | `features/admin` | E2E | – |
| ADM-14 | Gammel admin (Vercel Blob): oppsettkode, brukere/roller/menigheter, opplasting, **skjul/vis innebygde bilder per menighet**, logg | A, H `db76976` | F | Erstattet av ConnectHub. «Skjul innebygde bilder» har ingen tydelig erstatter – **avklares**. | – | – |

## 4. Felles media og deling

| ID | Funksjon | Kilde | Status | Ny modul | Test | Impl |
|---|---|---|---|---|---|---|
| SHR-01 | Delt mappe mellom verktøy (IndexedDB `medialab-share`, maks 60, maks 2 GB per fil, bilde/video/lyd, miniatyr) | B `ml-share.js` | E | `services/assets` (erstatter, leser gamle data) | U, E2E | – |
| SHR-02 | «Send til …» et annet verktøy, motta ved åpning | B `ml-share.js`, H 11 | E | `services/assets` + `app/router` | E2E | – |
| SHR-03 | Kopier bilde til utklippstavlen, last ned | B `ml-share.js` | E | `services/export` | E2E | – |
| SHR-04 | Velger «Fellesmappe»/«Felles ressurser» (Faste, logoer, bakgrunner) og Samarbeidsfiler; `ch:<fil-id>`-referanser | B `ch-picker.js`, `ch-cloud.js` | E | `features/media-picker`, `services/files` | E2E | – |
| SHR-05 | Skyfiler bare bilder; video avvises (magiske bytes) | B `server/lib/sniff.js`, D | E | uendret server + klientvalidering | U | – |
| SHR-06 | Prosjektmapper på PC (File System Access), media i `<mappe>/media/`, kopier – aldri slett, «Frigjør plass» med bekreftelse | B `project-folder.js`, D | E | `infrastructure/fs-access` | E2E, M | – |
| SHR-07 | Felles grunnoppsett per menighet (`church_settings`), versjon mot samtidige endringer, `merge3` | B `shared-setup.js`, D | E | `services/settings` | U | – |
| SHR-08 | **Video lagres aldri i skyen** | D (fast krav) | E | Håndheves i `services/assets` | U | – |

## 5. Forsiden (dashboard)

| ID | Funksjon | Kilde | Status | Ny modul | Test | Impl |
|---|---|---|---|---|---|---|
| HUB-01 | Kort for Loop Studio, Thumbnail Studio, mappene SoMe (Motion, Photo) og Tools (Isolate, Mockups); `#some`/`#tools` | B `media-lab/` | E | `features/hub` | E2E | – |
| HUB-02 | Snarveier Fellesmappe/Samarbeidsmappe (sistnevnte bare ved aktiv gruppe) | B `folder-links.jsx` | E | `features/hub` | E2E | – |
| HUB-03 | Språkvalg og Admin-lenke | B | E | `features/hub` | E2E | – |

## 6. Loop Studio – startside

| ID | Funksjon | Kilde | Status | Ny modul | Test | Impl |
|---|---|---|---|---|---|---|
| LS-01 | Maler: Ukeprogram, Søndagsmøte, Ungdomsmøte, Tom mal; egne maler (ny, rediger kategori/navn/beskrivelse/knapp, flytt, fjern, tilbakestill) | B `loop-studio/`, H 05 | E | `features/loop-studio/home` | E2E | – |
| LS-02 | Disk: lagrede looper (maks 10), favoritt, slett (også `ukeloop.custom.<id>`) | B, H 05 | E | `features/loop-studio/home` | E2E | – |
| LS-03 | «Se demo (lagres ikke)» med genererte bakgrunner (`gen:N`), «Lagre som grunnoppsett» fra demoen | B, D | E | `features/loop-studio` | E2E | – |
| LS-04 | Grunnoppsett personlig (`loopstudio.bases.v1`) og felles (`loopstudio:bases`), `?grunn=p|f-<id>` | B `loop-bases.js`, D | E | `features/loop-studio` | U, E2E | – |
| LS-05 | Sidetittel kan endres | H 05 | E | `features/loop-studio/home` | E2E | – |

## 7. Loop Studio – editor (Ukeprogram Loop)

| ID | Funksjon | Kilde | Status | Ny modul | Test | Impl |
|---|---|---|---|---|---|---|
| LE-01 | Ukeprogram fra tekst (én linje per møte; «Ekstra:»; dato-linjer blir egne slides), skjema «Legg til møte» (ukedag, dato, tid, navn, sted) | B `studio-editor/` | E\* | `features/loop-studio/program` | U | – |
| LE-02 | Ukeprogram fra fil (.txt/.csv/.tsv) | B, H 11 | E | `features/loop-studio/program` | U, R | – |
| LE-03 | Ukeprogram fra bilde: tesseract (`nor`) med forbehandling; bruker `window.claude.complete` når den finnes (bare i Claude-artefaktmiljø) | B `logic.js:2169` | E | `features/loop-studio/program` (+ `services/ai`) | R, M | – |
| LE-04 | Standard uke (lagre, endre, tilbakestill; menighetens egen, aldri automatisk), `loopstudio:week` | B, D | E\* | `features/loop-studio` | E2E | – |
| LE-05 | Faste bilder per møtenavn (lengste treff vinner; husker per møte; nye møter får sist brukte bilde på samme ukedag); bare Admin endrer felles | B, D | E\* | `features/loop-studio` | U | – |
| LE-06 | Slides: legg til, dupliser, flytt, slett, vis i loopen, varighet; typer Tekst, Kontakt med QR, Avslutning | B | E\* | `features/loop-studio/slides` | K | – |
| LE-07 | Tekstfelt per slide (merkelapp, tid-merke, undertekst, overskrift, e-post, telefon, tittel) med egen tekstfarge | B | E\* | `features/loop-studio/slides` | K | – |
| LE-08 | QR-kode (lenke/mailto/tel), plassering, størrelse, tekst under, runde hjørner, eksempelkode, flytter seg unna logo | B, qrcode-generator | E\* | `features/loop-studio/qr` | U, R | – |
| LE-09 | Fritt plasserte elementer (tekst, bilde, logo, QR): dra, hjørner endrer størrelse, dobbeltklikk redigerer tekst, Delete sletter | B | E\* | `features/loop-studio/canvas` | E2E | – |
| LE-10 | Bakgrunn per slide: bilde (lokal, Fellesmappe, delt mappe), beskjær/flytt utsnitt, rotasjon, bildestyrke, kobling til fast bilde | B | E\* | `features/loop-studio/slides` | E2E | – |
| LE-11 | Bakgrunnsfarge/gradient: 17 typer (solid, linear, mirror, radial, conic, mesh, stripes, wave, ellipse, corner, spot, glow, conicRep, conicMirror, rays, conicCorner, none), fargestopp, snu, fordel jevnt, skarp/myk, gjentakelser | B `FILLM` | E | `shared/fill` (felles med Photo/Thumb der lik) | U | – |
| LE-12 | Video på slide (maks 5 min) i stedet for bilde, lyd fra video vs loop-musikk, videovolum | B | E\* | `features/loop-studio/slides` | E2E | – |
| LE-13 | Grunnvideo bak alle slides | B | E\* | `features/loop-studio` | E2E | – |
| LE-14 | Logo: bytt, vis/skjul per slide, plassering vannrett/loddrett | B | E\* | `features/loop-studio` | E2E | – |
| LE-15 | Stilpakker (Rolig, Energisk, Glitch, Promo, Kino, Minimal, Skyv, Feiring) og «Overrask meg» | B | E\* | `features/loop-studio/style` | U | – |
| LE-16 | 100+ fargepaletter, tilfeldig farge (bare trykkbar), aksentfarge, standardfarger | B `PALS`, D | E\* | `features/loop-studio/style` | U | – |
| LE-17 | Overganger: Toning, Via svart, Skyv, Zoom, Glitch, Paneler, Kutt | B `transOpts` | E | `features/loop-studio/engine` | R | – |
| LE-18 | Tekstanimasjon: Avdekk, Ton inn, Gli inn, Uskarp, Sprett, Glitch, Ingen; fart | B `textOpts` | E | `features/loop-studio/engine` | R | – |
| LE-19 | Overlegg: Filmkorn, Lyslekkasje, Bokeh, Snø, Konfetti, Linjer; egen farge, gjennomsiktighet, per slide/alle | B `OVT` | E | `features/loop-studio/engine` | R | – |
| LE-20 | Vignett-editor: typer auto/round/oval/bottom/top/cinema/sides/left/even, flere vignetter, rotasjon, størrelse, diffus 0–200 % (S-kurve over 50 %), «Alle slides» fjerner overstyringer | B `VIGT`, D | E | `features/loop-studio/vignette` | U, R | – |
| LE-21 | Fargepaneler (overgang «Paneler») med farger, synlighet per panel, per slide | B | E\* | `features/loop-studio/engine` | R | – |
| LE-22 | Fargefilter på bilder (farge, blanding, styrke), per slide; toning/varme, fargehjul, pipette, metning/lysstyrke, fargetone | B | E\* | `features/loop-studio/engine` | R | – |
| LE-23 | Langsom zoom (Ken Burns), lysstripe ved skifte, rolig dybde | B | E | `features/loop-studio/engine` | R | – |
| LE-24 | Lydspor (MP3/M4A/WAV), lydbibliotek med sjanger, volum, inn-/uttoning, start i sangen | B | E\* | `features/loop-studio/audio` | E2E | – |
| LE-25 | Looping-modus: Auto/strekk til sangen/takt; takt-analyse (BPM, halv/dobbel, ±1, finjuster slaget), takt-synk av tekst/bilde/skifter, beat-ekstra | B, H 11 | E\* | `features/loop-studio/beat` | U, R | – |
| LE-26 | Skrift for titler og øvrig tekst, overskrift/merkelapp globalt, ukestripe nederst, strek ved ukedag | B | E\* | `features/loop-studio/style` | K | – |
| LE-27 | Formater/oppløsning for video (liggende/stående, 1080p/4K) | B, H 08 | E\* | `features/loop-studio/export` | R | – |
| LE-28 | Eksport: fullskjerm-spiller (.html, frittstående; videoer på slides blir ikke med), rask MP4 (WebCodecs + mp4-muxer, 1080p/4K, med lyd), sanntidsopptak (MediaRecorder) som reserve | B, H 08 | E | `features/loop-studio/export` | R (HTML byte-likt, MP4 dekodede bilder) | – |
| LE-29 | Forhåndsvisning: spill/pause, spol, fullskjerm, zoom/flytt, hjelpelinjer (Sneglehus, Fibonacci, Tredeling, snu), «Tester effekten på slide» (`testSlide`) | B, D | E\* | `features/loop-studio/preview` | E2E | – |
| LE-30 | Angre/gjør om, autolagring av/på, lagre på Disk / «Lagre som ny» | B | E\* | `services/projects` + `features/loop-studio` | E2E | – |
| LE-31 | Lyd synkronisert mellom faner (`BroadcastChannel('ukeloop-audio')`) | B `logic.js:61` | E\* | **avklares** (trengs det i én SPA?) | M | – |
| LE-32 | Gammelt autolagret eksempelinnhold legges til side og kan hentes tilbake | B `e09f4c3` | E\* | `infrastructure/legacy-import` | U | – |
| LE-33 | Spiller-HTML bygges med `Function.toString()` av motoren | B, H 08 | E | Nytt: egen, bygget spiller-modul (krav: frittstående fil) | R | – |
| LE-34 | Innbygging av fonter i spiller-HTML fra Google Fonts | A `ukeloop-engine.js` | F | Erstattet av egne fontfiler (P8). Verifiser at spilleren fortsatt bygger inn fontene. | R | – |

## 8. Thumbnail Studio

| ID | Funksjon | Kilde | Status | Ny modul | Test | Impl |
|---|---|---|---|---|---|---|
| TS-01 | Lerret 1920×1080 (16:9) | B, D | E | `features/thumbnail-studio` | U | – |
| TS-02 | Kategorier (Søndagsmøte, Kveldsbibelskole, Ungdomsmøte + egne; ny, gi nytt navn, beskrivelse, slett), felles for menigheten (`thumbstudio:cats`) | B `DEFAULT_CATS`, D | E | `features/thumbnail-studio` | E2E | – |
| TS-03 | Grunnoppsett per kategori, flere per kategori (`layouts[]`, `defaultLayout`, `baseName`), rediger, gjør til standard, tilbakestill | B, D | E | `features/thumbnail-studio` | E2E | – |
| TS-04 | Maler: maks 5 per kategori, maks 5 bilder per mal; ny, dupliser, overskriv, slett, lagre | B, D | E | `features/thumbnail-studio` | U, E2E | – |
| TS-05 | 28 oppsett (Blank, Stor krok, Delt i høyden, Nummerert tips, To personer, Sitat og person, Navneskilt, Tre/Fire i panel, Ansikt til ansikt, Episode, Lydbølge, Gjest, Plakat, Stor dato, Infobokser, Person og tittel, Tittel i midten, Bibelvers, Skrå fargeflate, Sterk farge, Bilde med ramme, Film, Cover, Live, Sangliste, Vinyl, Toppliste); «Bytt oppsett» beholder person/navn/tema/bilder | B UI | E\* | `features/thumbnail-studio/layouts` | R | – |
| TS-06 | Lag: tekst, bilde, form, strek, lys, logo, «Flere elementer» (overskrifter, sitat, punktlister med underpunkt, bokser og merker, navneskilt, dato, bildefelt) | B `addBtns` | E\* | `features/thumbnail-studio/layers` | K | – |
| TS-07 | Lagliste: rekkefølge, ↺ tilbake til grunnoppsett, kobling av lag (dra over hverandre), lagnavn (dobbeltklikk) | B, D | E\* | `shared/layers` (felles med Photo) | E2E | – |
| TS-08 | Flytt/skaler/roter, Shift endrer forhold, hjelpelinjer, zoom | B | E\* | `shared/canvas-editor` | E2E | – |
| TS-09 | Beskjær bilde (dobbeltklikk), fjern tomme kanter, vis hele bildet | B, H 11 | E | `shared/crop` | R | – |
| TS-10 | AI-utklipp (Person = MODNet, Objekt = BiRefNet), bruk originalbildet | B, H 11 | E | `services/ai` | R, M | – |
| TS-11 | Fargekombinasjoner (11: Standard, Svart på hvit, …), farge på nye elementer, egen farge, understrek som følger teksten | B `COMBOS` | E | `features/thumbnail-studio` | U | – |
| TS-12 | Bakgrunn (farge, gradient, bilde med zoom/posisjon/blur/demping) og vignett | B `emptyDoc` | E | `shared/fill` | R | – |
| TS-13 | Eksport: PNG/JPG, 1080p/4K, gjennomsiktig PNG, råd («YouTube = JPG 1080p < 2 MB», varsel over 2 MB) | B, H 11 | E | `services/export` | R | – |
| TS-14 | Kopier, «Send til …», delt mappe og Fellesmappe som bildekilde | B | E | `services/assets` | E2E | – |
| TS-15 | Sikkerhetskopi: last ned fil og gjenopprett (erstatter kategorier og maler i nettleseren) | B, H 11 | E | `services/projects` | R | – |
| TS-16 | Autolagring av/på, angre/gjør om, «ikke lagret»-varsel ved tilbake | B | E | `services/projects` | E2E | – |
| TS-17 | Egen visning: dra paneler mellom kolonner, faner, tilbakestill | B UI | E\* | `features/thumbnail-studio/layout-editor` | E2E | – |
| TS-18 | Enkel visning på mobil (bytt person, navn, tema, bakgrunn, last ned) | B UI | E\* | `features/thumbnail-studio` | E2E (mobil) | – |
| TS-19 | Innebygde standardmaler med logoene `logo-symbol`/`logo-kbs` og `asset:`-referanser | A `thumb-engine.js` | F | Fjernet bevisst (D: «ingen forhåndsinnlagte standardbilder/logoer»). Filene i `public/images` beholdes, så gamle prosjekter virker → må støttes ved import. | R | – |

## 9. SoMe – Photo Design

| ID | Funksjon | Kilde | Status | Ny modul | Test | Impl |
|---|---|---|---|---|---|---|
| PD-01 | Formater: Instagram 1:1, 4:5, Story 9:16, 16:9, A4, A3, Visittkort, egendefinert | B `FORMATS` | E | `features/photo-design` | U | – |
| PD-02 | Maler (9): Tomt, Visittkort tosidig, Bilde med tittel, Sitat, Arrangement, Ukeprogram, Dagsprogram, Ukeprogram (lys), Kunngjøring; egne maler i kategorier (maks 5 per kategori) | B `TEMPLATES` | E | `features/photo-design` | R | – |
| PD-03 | Lag: bilde, tekst, form (19 + avrundet rektangel), fx | B `SHAPES` | E | `shared/layers` | U | – |
| PD-04 | Flytt/skaler/roter/kanter, flipp, beskjær (`cz/cx/cy`), bytt bilde ved å dra oppå bildeplass | B | E | `shared/canvas-editor` | E2E | – |
| PD-05 | Flervalg (ramme, Shift/Ctrl-klikk), grupper (Ctrl+G / Ctrl+Shift+G), gruppeskalering og sidehåndtak | B, D | E | `shared/canvas-editor` | U, E2E | – |
| PD-06 | Hjelpelinjer: lerret og andre lag, lik avstand med merke (#9b1c3c), Alt = uten festing | B, D | E | `shared/canvas-editor/snap` | U | – |
| PD-07 | Formatbytte med smart omplassering og tilbakevending | B `changeFormat`, D | E | `features/photo-design` | U | – |
| PD-08 | Tekst: font (9), tykkelse, store bokstaver, kontur, understrek, skygge, linjehøyde, sperring | B | E\* | `shared/text` | R | – |
| PD-09 | Blandingsmodus (7), looks (12), justering (piksel-LUT, Safari-trygt), kurve | B `BLENDS`, `LOOKS` | E | `shared/image-adjust` | R | – |
| PD-10 | AI-utklipp (Person/Objekt) + pensel på masken (fjern/gjenopprett, Alt), inverter, fjern maske | B, H 11 | E | `services/ai` + `shared/mask` | R | – |
| PD-11 | Avansert modus: 13 effekttyper (`ml-fx`), 1920 forhåndsvalg (80 looks × 8 paletter × 3 styrker), favoritter, nylig, egne (eksport/import JSON, gi nytt navn, slett), søk | B `ml-fx.js`, D | E | `features/fx` (felles motor) | R | – |
| PD-12 | Bakgrunn/gradient og vignett (samme sett som Loop) | B | E | `shared/fill` | R | – |
| PD-13 | Koblede farger (endrer alle lag med samme farge), farge på nye elementer, tilfeldige farger | B UI | E\* | `features/photo-design` | U | – |
| PD-14 | Trykk: A3/visittkort (mm), utfallende 3 mm, tosidig (`doc.back`), CMYK-felt, «PDF trykk» (CMYK, 300 dpi, TrimBox/BleedBox, rendres i bånd) | B, D | E | `services/export/pdf` | R | – |
| PD-15 | Eksport PNG/JPG 1×/2×, gjennomsiktig, kopier, send til | B | E | `services/export` | R | – |
| PD-16 | Prosjekter i IndexedDB `photodesign`, autolagring (på som standard), sikkerhetskopi last ned/gjenopprett, angre/gjør om, Ctrl+S | B | E | `services/projects` | R | – |
| PD-17 | Bildebibliotek: delt mappe, Fellesmappe, Samarbeidsfiler; lim inn med Ctrl/Cmd+V, dra inn | B | E | `features/media-picker` | E2E | – |
| PD-18 | Avansert modus: keyframes/tidslinje via `t`, sporing, penselmaling med maske på fx-lag | D «Gjenstår» | U | Planlegges, ikke krav for paritet | – | – |

## 10. SoMe – Motion Design

| ID | Funksjon | Kilde | Status | Ny modul | Test | Impl |
|---|---|---|---|---|---|---|
| MD-01 | Formater: Instagram innlegg/portrett, Story/Reels, Facebook/YouTube, Facebook-cover, egendefinert 240–4096 | B `FORMATS` | E | `features/motion-design` | U | – |
| MD-02 | Maler (8): Møtepromo, Arrangement/konferanse, Sitat/vers, Nedtelling, Talerpresentasjon, Musikk/lovsang, Kunngjøring, Tom | B `TEMPLATES` | E | `features/motion-design` | R | – |
| MD-03 | Tidslinje med spor tekst, overlegg, video, undertekster, musikk; lås/skjul spor; zoom; markører (M, på takten) | B `tracks`, D | E | `features/motion-design/timeline` | U, E2E | – |
| MD-04 | Trim, del ved spillehodet (S), flytt, kobling av elementer (gruppe, maks ett videoklipp), høyreklikkmeny | B, D | E | `features/motion-design/timeline` | U | – |
| MD-05 | Overganger (31): Ingen, Toning, Via svart/hvitt, Blits, Skyv ×4, Dekk ×4, Sveip, Zoom inn/ut, Snurr, Visk ×4, Sirkel, Diamant, Klokke, Persienner, Striper, Dører, Uskarp, Glitch, Piksler, Kryss-zoom, Fartsrampe, Match cut, Maskering, Chroma …; dra til tidslinjen, snapper mellom/start/slutt | B `TRANS`, D | E | `features/motion-design/render` | R | – |
| MD-06 | Tekstanimasjoner (17): Ton inn, Stig opp, Sprett, Skyv inn, Fra uskarp, Skrivemaskin, Ord for ord, Bokstav for bokstav, Hopp inn, Bølge, Glitch, Zoom inn fra stor, Fall ned, Vend, Trekk sammen, Avdekk | B `ANIMS` | E | `features/motion-design/render` | R | – |
| MD-07 | Looks (12) og RGB-kurver (m/r/g/b, monoton spline), fallback uten `ctx.filter` (Safari) | B `LOOKS`, D | E | `shared/image-adjust` | R | – |
| MD-08 | Grønnskjerm på overlegg (keyOn/keyColor/keySim/keySmooth/keySpill) | B, D | E | `features/motion-design/render` | R | – |
| MD-09 | Transformhåndtak (dobbeltklikk → 8 punkter + rotasjon; igjen → beskjær), bilde-i-bilde | B, D | E | `shared/canvas-editor` | E2E | – |
| MD-10 | Logo (Fellesmappe/opplasting), flyttbar, størrelse, gjennomsiktighet | B, D | E | `features/motion-design` | E2E | – |
| MD-11 | Undertekster: egne, importer/last ned .srt, AI (Whisper i nettleseren), stil | B, H 11 | E | `features/motion-design/subs` + `services/ai` | R (srt byte-likt), M (Whisper) | – |
| MD-12 | Lyd: musikk (bibliotek/tidslinje), lydmikser med ducking (`p.mix`), utjevn lyd, voiceover (mikrofon → WAV) | B, D | E | `features/motion-design/audio` | R, M | – |
| MD-13 | Kopier/lim inn farge og lyd mellom klipp | B, D | E | `features/motion-design` | U | – |
| MD-14 | Fargeflate, frys bilde, erstatt fil i klipp | B UI | E\* | `features/motion-design` | E2E | – |
| MD-15 | Eksport MP4 H.264 + lyd: 1080p30/60, 4K30 (WebCodecs + mp4-muxer); avbryt; send stillbilde/video | B, H 11 | E | `services/export/video` (Worker) | R | – |
| MD-16 | Prosjektfil `.motion` (binær: `VFY1`, lengde, JSON, filer) lagre/åpne | B `VF.pack`, H 11 | E | `services/projects/formats/motion` | R (byte-likt) | – |
| MD-17 | Prosjektmappe på PC (`prosjekt.motion.json`, media i `media/`) | B `project-folder.js`, D | E | `infrastructure/fs-access` | E2E, M | – |
| MD-18 | Prosjekter i IndexedDB `motiondesign`, autolagring, angre/gjør om, Ctrl+S, dra filer inn | B | E | `services/projects` | E2E | – |
| MD-19 | Forhåndsvisning 4 bilder/s i ro, full fart ved bruk/avspilling; hover-forhåndsvisning av video i biblioteket | B, D | E | `features/motion-design/preview` | M | – |
| MD-20 | LUT, fargehjul, former/emoji, proxy, flereksport, gjennomsiktig eksport, stabilisering | D «Gjenstår» | U | Planlegges, ikke krav for paritet | – | – |

## 11. Isolate Subject

| ID | Funksjon | Kilde | Status | Ny modul | Test | Impl |
|---|---|---|---|---|---|---|
| IS-01 | Opplasting (JPG/PNG/WebP/AVIF/GIF/BMP), dra inn, lim inn, delt mappe | B | E | `features/isolate-subject` | E2E | – |
| IS-02 | Beskjæringssteg etter opplasting (hjørner, flytt, ny ramme, 16:9, hopp over, beskjær på nytt) | B, H 06 | E | `shared/crop` | R | – |
| IS-03 | Person – MODNet | B, D | E | `services/ai` (Worker) | R (byte-likt) | – |
| IS-04 | Objekt – BiRefNet_lite (115 MB; krasjer i headless Chrome) | B, H 06 | E | `services/ai` | M | – |
| IS-05 | Logo/Tekst – fargenøkkel fra kantfarge (også inni bokstaver), fallback BiRefNet | B, D | E | `features/isolate-subject` | R | – |
| IS-06 | Merk i bildet – SlimSAM: trykk/firkant, grønn behold, rød/høyreklikk fjern, nullstill merker | B, D | E | `services/ai` | R | – |
| IS-07 | Fjern objekt med «Fyll med omgivelser» (push-pull-innfylling + støy) – eneste operasjon som endrer piksler | B, D | E | `features/isolate-subject` | R | – |
| IS-08 | Ellers endres motivet aldri, kun alfa-masken | D (krav) | E | `features/isolate-subject` | U (pikselsjekk) | – |
| IS-09 | Bakgrunn: gjennomsiktig, palettfarge, egen farge | B | E | `features/isolate-subject` | R | – |
| IS-10 | Finjuster: beskjær til motivet, myke kanter, stram inn kantene | B | E | `features/isolate-subject` | R | – |
| IS-11 | Sammenlign før/etter, angre siste steg, tilbake til originalen | B | E | `features/isolate-subject` | E2E | – |
| IS-12 | Last ned PNG, kopier, «Send til …»; dialog etter nedlasting: nytt bilde / annet motiv i samme bilde | B, H 11 | E | `services/export` + `services/assets` | E2E | – |

## 12. Mockups

| ID | Funksjon | Kilde | Status | Ny modul | Test | Impl |
|---|---|---|---|---|---|---|
| MK-01 | 14 innebygde fotomockups (iMac ×2, MacBook ×2, iPhone ×3, TV ×2, kort ×2, papir …) med `config.json` (hjørner, okklusjon, `keepHoles`, sideforhold) | B `public/images/mockups` | E | `features/mockups/catalog` | U | – |
| MK-02 | Brukerens mappe `public/mockups/index.json` (håndskrevet) | B | E | `features/mockups/catalog` | U | – |
| MK-03 | Egne mockup-bilder i IndexedDB `mockuplib` (legg til, slett), skjermen finnes automatisk | B, H 04 | E | `features/mockups` | E2E | – |
| MK-04 | Kategorier inkl. «Samarbeidsfiler»; galleri; forrige/neste (piltaster) | B, D | E | `features/mockups` | E2E | – |
| MK-05 | Design: last opp (maks 60 MB), dra inn, lim inn, delt mappe; fjern design | B | E | `features/mockups` | E2E | – |
| MK-06 | Plassering: fyll/vis hele, zoom, flytt | B, H 04 | E | `features/mockups` | R | – |
| MK-07 | Realisme: skygger, glans, behold fingre og ting foran skjermen (okklusjon) | B, H 04 | E | `features/mockups/render` | R | – |
| MK-08 | Skjerm: dra fire hjørner (lagres per bilde), finn automatisk, tilbakestill | B, H 04 | E | `features/mockups` | R | – |
| MK-09 | Bakgrunnsfarge, forgrunn av/på | H 04 | E | `features/mockups` | R | – |
| MK-10 | Eksport PNG/JPG (byte-likt i forrige migrering), kopier, send til | B, H 04 | E | `services/export` | R | – |
| MK-11 | Husker valgt mockup ved F5 | B `here.js` | E | `app/router` | E2E | – |
| MK-12 | Dobbeltklikk på glidebryter nullstiller | B UI | E | `shared/ui/Slider` | K | – |
| MK-13 | Lokale mockups lastes før skysynk; galleriet blokkeres ikke av skysynk | A `a8515e9`, `e385c67` | G | `features/mockups` (krav) | E2E | – |

## 13. Data og lagringsformater som må leses (bevares)

| ID | Data | Format | Kilde | Status |
|---|---|---|---|---|
| DAT-01 | IndexedDB `medialab-share` (`items`) | `{ id, name, type, size, from, created, thumb, blob }` | B | E |
| DAT-02 | IndexedDB `ukeloop` (`media`) + localStorage `loopstudio.disk.v1`, `loopstudio.tpls.v1`, `loopstudio.bases.v1`, `ukeloop.tpl`, `ukeloop.guide`, `ukeloop.guideFlip`, `ukeloop.custom.<id>` | `{ programText, cfg, slides[] }` | B | E |
| DAT-03 | IndexedDB `thumbstudio` (`kv`, `img`) + `thumbstudio.autosave` | `{ v:1, bg, vig, layers[] }`, kategorier `{ baseDoc, layouts[] }` | B | E |
| DAT-04 | IndexedDB `photodesign` (`projects`, `media`) + `photodesign.autosave/cats/tplcat/newcol` | `{ id, name, w, h, bg, layers[], back? }` | B | E |
| DAT-05 | IndexedDB `motiondesign` (`projects`, `media`) + `motiondesign.autosave/sections`, sessionStorage `motiondesign.open` | `{ fmt, w, h, media[], clips[], ov[], texts[], subs[], music[], markers[], logo, tracks }` | B | E |
| DAT-06 | IndexedDB `mockuplib` (`imgs`) | egne mockup-bilder | B | E |
| DAT-07 | Prosjektmappe-håndtak (IndexedDB, store `h`) | `FileSystemDirectoryHandle` | B `project-folder.js` | E |
| DAT-08 | `.motion`-fil | binær `VFY1` + lengde + JSON + filer | B | E |
| DAT-09 | Sikkerhetskopier (Thumbnail, Photo), egne fx-forhåndsvalg | JSON | B | E |
| DAT-10 | Mediereferanser i prosjekter | `ch:<fil-id>`, `gen:N`, `lib:`, `blob:`, `asset:`, `db:` | A, B | E/G |
| DAT-11 | Alle navn over med suffiks `@<bruker-id>` (per bruker), og uten suffiks (gamle data, `ch.local.owner`) | – | B `local-user.js` | E |
| DAT-12 | `church_settings`: `loopstudio:week`, `loopstudio:bases`, `thumbstudio:cats` | JSON med versjon | B, D | E |
| DAT-13 | Øvrige nøkler: `medialab.theme`, `medialab.units`, `medialab.advanced`, `medialab.fx.*`, `medialab.here.*`, `ch.me`, `ch.activeChurch`, `ch.testRole`, `ch.loop`, `medialab.heal` | – | B | E |

## 14. Åpne spørsmål fra kartleggingen

1. **ADM-14:** Den gamle adminen kunne skjule innebygde bilder per menighet. Skal det finnes i ConnectHub?
2. **LE-03:** Bildelesing med `window.claude.complete` virker bare inne i Claude-artefaktmiljøet; i produksjon brukes alltid tesseract. Skal den nye appen bare bruke tesseract, eller få en egen (server-)tjeneste senere?
3. **LE-31:** `BroadcastChannel('ukeloop-audio')` synkroniserer lyd mellom faner. Trengs det i én samlet app?
