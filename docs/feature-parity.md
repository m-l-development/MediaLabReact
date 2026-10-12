# Media Lab – funksjonsregister (feature parity)

Register over all funksjonalitet som den nybygde Media Lab (`web/`) skal bevare eller gjeninnføre.
Et verktøy er ikke ferdig før alle radene i dets omfang har status **Testet**, eller en dokumentert og godkjent unntaksbeslutning.

Sist oppdatert: 2026-10-10 (fase 2: fundament).

Status i `web/` så langt: **T** = testet i ekte Chrome (Playwright) eller manuelt i Chrome (**M**); **I** = implementert og
enhetstestet (**U**), men ikke testet hele veien i nettleser; **P** = påbegynt. Innlogging er bare testet med falske
adaptere (krever `.env.local` for `connecthub-dev`).

Mockups: samme motor som i dag (homografi, skjermgjenkjenning, okklusjon, lys/glans) portert til TypeScript; samme
mockup og design gir samme bilde som dagens app (kontrollert visuelt mot repo A). Innstillinger per mockup bruker
samme nøkkel (`mockups.settings`) som dagens app.

Isolate Subject: MODNet og SlimSAM er kjørt i Chrome mot ekte modeller (fra egen vert). Objekt bruker nå ormbg (44 MB):
BiRefNet_lite feilet i Chrome 154 både på WebGPU og WASM (TB-7BF5C1, se testlogg 2026-10-12). ormbg og MODNet er kjørt i ekte Chrome.

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
| PLT-01 | Norsk/engelsk språk, valg lagres, alle tekster oversatt (regel: all ny tekst skal ha engelsk) | B `i18n.js`, D | E | `shared/i18n` | U, E2E | T (E2E: engelsk huskes etter ny innlasting; hvert verktøy har test for engelske tekster) |
| PLT-02 | Lys/mørk modus (mørk standard), lagres i `medialab.theme`, lys modus = dempet off-white `#e4e1da` | B `theme.js`, D | E | `shared/theme` | E2E | T (E2E: lys modus huskes) |
| PLT-03 | Flytende knappefelt nede til høyre: tilbakemelding, konto, lys/mørk; ett panel åpent om gangen | B `dock.js`, D | E | `app/dock` | K | I (tilbakemelding, konto og lys/mørk i knappefeltet; ett panel åpent om gangen. Vises bare innlogget, så nettlesertest og skjermbilde mot dagens app er blokkert til testkonto finnes) |
| PLT-04 | Varsel om ny versjon: sjekk hvert minutt og når fanen blir synlig; lagrer arbeid; «Oppdater nå»/«Senere» (10 min); aldri tvungen omlasting; verktøy melder `save/busy/note` | B `ml-update.js`, D | E | `app/update` | U, E2E | T (byggnummer og version.json i bygget; sjekk hvert minutt og når fanen blir synlig; lagrer via verktøyets livssyklus; «Senere» 10 min; venter mens verktøyet er opptatt (enhetstest + E2E med Loop Studio). Virker i drift først når den nye appen publiseres) |
| PLT-05 | Selvreparasjon ved feilende `/assets/`-filer (hent på nytt forbi cache, last én gang til, sperre mot løkke) | B `vite.config.js` HEAL | E | `app/self-heal` | E2E | T (samme innebygde skript som dagens app – hashen står allerede i CSP-en, bygget kontrollerer det; i tillegg reparasjon når et verktøy ikke kan lastes (enhetstest + E2E)) |
| PLT-06 | Husk visning/prosjekt ved F5 og tilbake/fram (ikke ved ny fane) | B `here.js`, D | E | `app/router` | E2E | T (endret etter ønske: «← Media Lab» går alltid til forsiden; nettleserens tilbake går ett nivå opp: mal → kategori → start → forside, aldri inn i sist brukte app) |
| PLT-07 | PWA: manifest, installasjonsprompt, «Ikke nå» i 14 dager | B `ml-pwa.js`, H 11 | E | `app/pwa` | E2E | T (manifest under /app/ med ikonene fra dagens app, meta-tagger, kortet ved installasjonsprompt etter 2,5 s / iPhone-forklaring etter 3 s, «Ikke nå» og avbrutt installasjon skjuler i 14 dager: enhetstester + E2E PC/mobil, norsk/engelsk, mørkt/lyst; skjermbilde sammenlignet med dagens app: likt. Ekte installasjon i nettleser og iPhone er ikke prøvd manuelt. Merk: manifestets id er /app/ (dagens: /media-lab.dc.html), så en allerede installert app regnes som en annen – avklares når publiseringen godkjennes) |
| PLT-08 | Forhåndslasting av neste verktøy ved hover/berøring | B `prefetch.js` | E | `app/router` (lazy + preload) | K | T (verktøyet hentes ved peker, berøring eller fokus på kortet, før klikket; hoppes over ved «spar data»/2G som i dagens app. E2E PC og mobil + enhetstest) |
| PLT-09 | Fast topplinje med tilbakeknapp og verktøynavn, også ved rulling; tittel tones ut på startsider | B `sticky-title.js`, D | E | `shared/ui/TopBar` | E2E | T (sticky-title.js portert: «← Media Lab» står fast i verktøyene, stor tittel tones ut og vises lite ved siden av knappen; felt bak linjen i visninger uten stor tittel; Loop Studio beholder sin egen linje. E2E PC og mobil; skjermbilder ved rulling sammenlignet med dagens app for alle verktøy: likt, bortsett fra at knappen alltid heter «Media Lab» (PLT-06-beslutningen)) |
| PLT-10 | Animert bakgrunn på menyer/startskjermer, statisk mørk på arbeidsflater; færre bilder på svake enheter; respekterer redusert bevegelse | B `ml-bg.js`, D | E | `shared/ui/Backdrop` | M | T (E2E: oversikten i dagens visuelle uttrykk) |
| PLT-11 | Footer «Design by Kristen Utvikling» med innfading og valgfri lenke | B `ml-footer.js` | E | `shared/ui/Footer` | K | T (footer på forside og verktøy-startsider) |
| PLT-12 | Korte adresser (/home, /loopstudio, /thumbnailstudio, /photodesign, /motiondesign, /isolate, /mockup, /admin, /fellesmappe …) og 307 fra gamle `.dc.html` | B `build/routes.js` | E | `app/router` + `vercel.json` | U, E2E | – |
| PLT-13 | CSP uten CDN og uten `unsafe-inline` for skript; inline-skript med SHA-256; `wasm-unsafe-eval` for ONNX | B `vercel.json`, `build/csp.js` | E | byggeoppsett `web/` | U (byggesjekk) | I (den nye appen kjører under produksjonens CSP fra media-lab/vercel.json uten brudd: forsiden, alle verktøy og Loop-editoren, i et testbygg med samme byggeprosess (E2E, negativ kontroll viser at brudd fanges). CSP-en er uendret; regel for /app/ på Vercel hører til det godkjente publiseringstrinnet. Avvik i testen: upgrade-insecure-requests tatt ut (localhost), React i utviklingsutgave) |
| PLT-14 | Tredjepartsfiler og fonter fra egen vert, låst med SHA-384 (`vendor-lock.json`): transformers 3.5.1, tesseract 5.1.1 + `nor`, mp4-muxer 5.1.3, qrcode-generator 1.4.4, 10 fontfamilier | B `build/vendor.js` | E | byggeoppsett `web/` | U | – |
| PLT-15 | Hemmelighetsvern i bygget: bare URL + publiseringsnøkkel ved navn, prosjekt-ID per miljø, søk i `dist/` etter hemmeligheter | B `build/env-guard.js` | E | byggeoppsett `web/` (gjenbruk av samme regler) | U | T (samme hemmelighetsvern som dagens bygg: bare URL + publiseringsnøkkel bakes inn; bygget stoppes ved sb_secret, service_role-JWT, databaseadresse med passord, hemmelige variabelnavn og nå også SMTP-passordets verdi (manglet). Enhetstester av byggevakten) |
| PLT-16 | Testrolle/rollebytter (bare dev, bare senke rolle, bare UI) | B `test-role.js`, D | E | `features/account` | U | I (regler fra test-role.js: bare bygg mot utviklingsprosjektet, aldri produksjon; bare senke rollen; bare grensesnittet – innloggingen gir verktøyene valgt visning (`me`) og beholder `realMe`; rollevelger i kontomenyen og blå testmodus-stripe med «Tilbake til». Regeltester, innloggingstest med falsk adapter og komponenttester. Ikke prøvd innlogget mot connecthub-dev: krever testkonto og .env.local) |
| PLT-17 | Lokale data per bruker (`navn@<bruker-id>`), «Knytt til meg» for gamle data, «Logg ut og fjern mine lokale data» | B `local-user.js`, D | E | `infrastructure/local-user` | U, E2E | I (samme navneregel som local-user.js: verktøyenes innstillinger i localStorage per bruker (Photo, Motion, Thumbnail, effekter; Loop hadde allerede ml2:<bruker>), ny database medialab@<bruker>; «Knytt til meg» spør én gang per bruker og enhet, flytter/sletter ingenting, stopper ved konflikt; «Logg ut og fjern mine lokale data» i kontomenyen sletter bare brukerens egne data. Enhetstester (fake IndexedDB) og komponenttester. Ikke prøvd innlogget i nettleser: krever testkonto) |
| PLT-18 | Rask oppstart: siste `whoami` fra buffer, kontrolleres mot databasen like etter | B `me-cache.js` | E | `services/auth` | U | T (whoami fra buffer for samme bruker, økt og MFA-nivå; kontrolleres mot databasen (enhetstest)) |
| PLT-19 | Enhetsvalg (`medialab.units`) – px/mm | B localStorage | E\* | `shared/units` | U | T (enhetsvalg per tallfelt, husket i `medialab.units`: Thumbnail Studio (px/%) og Loop Studio (% ↔ ×, px for fri tekst). E2E: bytte, omregning og husket valg. Loop leser dagens valg ved første åpning og lagrer deretter i sine egne nøkler, så dagens app ikke endres (bevisst, se LoopStudio.tsx). Ikke px/mm: registerteksten var upresis) |
| PLT-20 | Feillogg fra nettleseren til Admin-loggen (`ml-cloud.js` → `api/ml.js`) | A, H `db76976` | F | Erstattet av siste feil i tilbakemeldinger (PLT-21). Gjeninnføres ikke uten beslutning. | – | – |
| PLT-21 | Tilbakemeldingsknapp: fire kategorier, beskrivelse, markér område på skjermen, teknisk kontekst + siste feil, rensing av hemmeligheter, maks 20/døgn | B `feedback-*.js`, D | E | `features/feedback` | U, E2E | I (skjema, fire kategorier med egne spørsmål, markering av område/element, teknisk kontekst med siste 10 feil, rensing før sending, egen melding ved grensen per døgn: enhetstester mot falsk tjeneste. Innsending mot ConnectHub (`submit_feedback`), markering i nettleser og mobilvisning er ikke testet: krever innlogging/testkonto) |

## 2. Innlogging og konto

| ID | Funksjon | Kilde | Status | Ny modul | Test | Impl |
|---|---|---|---|---|---|---|
| AUTH-01 | Innlogging obligatorisk for alle verktøy, data og API-er, også direkte URL (sperre foran sider + port i nettleser + RLS) | B `middleware.js`, `gate.js`, `auth-gate.js`, D | E | `app/auth-gate` + uendret server | E2E | I (port i appen (AuthGate) + uendret sperre på serveren og RLS; utlogget vises innlogging. Enhetstester med falske adaptere; sperren på Vercel hører til publiseringstrinnet. Ikke prøvd mot connecthub-dev) |
| AUTH-02 | Innlogging med e-post/passord, `safeNext`, vern mot omdirigeringssløyfe (`ch.loop`) | B `login/` | E | `features/auth` | E2E | I (e-post/passord i ny innloggingsvisning; feilmeldinger. Enhetstester med falsk adapter. Ikke prøvd mot connecthub-dev) **Verifisert mot connecthub-dev 2026-10-12 (vanlig bruker og Admin, begge uten MFA):** ekte innlogging og utlogging i Chrome på PC og mobil (`e2e-dev/admin-dev.spec.ts`). |
| AUTH-03 | MFA (TOTP), MFA-oppsett for stab, `aal2` | B `login/`, D | E | `features/auth` | E2E | I (MFA-kode ved aal1 med faktor, MFA-oppsett for stab uten faktor. Enhetstester med falsk adapter. Ikke prøvd mot connecthub-dev) |
| AUTH-04 | Glemt passord: nøytralt svar, `token_hash`-lenker, MFA-steg, nytt passord med krav og vis/skjul, «Lenken virker ikke lenger» + «Send ny lenke» | B, D | E | `features/auth` | E2E | I (forespørselen: samme nøytrale svar, ConnectHub sender via auth.recover, ellers leverandørens e-post. Tester med falsk tjeneste/server. Lenkene i e-posten (nytt passord, MFA-steg, «Lenken virker ikke lenger») lander fortsatt på dagens offentlige /login.dc.html: å flytte dem krever endret ruting/omdirigering hos leverandøren = godkjent publiseringstrinn) |
| AUTH-05 | Bytt passord (ny innlogging, MFA, andre økter logges ut) | B `account-menu.js`, D | E | `features/account` | E2E | I (samme flyt som i dag: gammelt passord kontrolleres med ny innlogging, MFA-kode ved faktor, løpende krav, andre økter logges ut. Tjeneste- og komponenttester med falske adaptere. Ikke prøvd mot connecthub-dev) |
| AUTH-06 | Kontovelger på innloggingssiden (bare e-post, navn, initialer) | B `saved-accounts.js` | E | `features/auth` | U | I (kontovelger som i dag: bare e-post, navn og initialer, høyst 5, «Husk denne kontoen», fjern med bekreftelse; fjernes også når kontoen slettes. Enhets- og komponenttester) |
| AUTH-07 | Kontoforespørsel før innlogging (skjemanøkkel, felle-felt, grenser) | B `RequestPanel.jsx`, D | E | `features/auth` | E2E | I (forespørsel om konto som i dag: skjemanøkkel, felle-felt, skjemaregler, utløpt skjema gir ny nøkkel; samme anonyme serverhandlinger. Komponenttester med falsk server. Ikke prøvd mot connecthub-dev) |
| AUTH-08 | Kontomeny: Varsler, E-postvarsler (Developer/Moderator), Konto og sikkerhet (Last ned mine data, lokale data, Slett kontoen min), Logg ut | B `account-menu.js`, D | E | `features/account` | E2E | I (kontomeny som i dag: varsler med antall uleste (hentes hvert 2. min/ved synlig fane), e-postvarsler for Developer/Moderator, Konto og sikkerhet: bytt passord, last ned mine data, fjern lokale data, slett kontoen min (se docs/konto-sletting.md). Komponenttester med falske adaptere. Ikke prøvd mot connecthub-dev) |
| AUTH-09 | Konto ikke aktiv / ukoblet konto → egen visning | B, D | E | `features/auth` | E2E | I (egen visning for konto som ikke er koblet, og ved nettfeil. Enhetstest) |

## 3. Administrasjon (ConnectHub Admin)

Hele admin-siden bevares funksjonelt. Detaljert underliste lages når Admin bygges (fase 4g).

| ID | Funksjon | Kilde | Status | Ny modul | Test | Impl |
|---|---|---|---|---|---|---|
| ADM-01 | Oversikt (krever handling, siste hendelser, utviklerkort, PRODUKSJON/UTVIKLING-merke, «Åpne ConnectHub Dev») | B `connecthub-admin/` | E\* | `features/admin` | E2E | I (ramme under /app/admin med #-adresser som i dag, meny per rolle (regler og tester portert fra access.js), rolle i toppfeltet, UTVIKLING-merke, velkomst, tall, «Krever handling», siste hendelser, utviklerkort og samarbeidskort. Komponenttester med falsk database. Seksjoner som ikke er flyttet, sier det og lenker til dagens /admin. Ikke prøvd mot connecthub-dev) **Verifisert mot connecthub-dev 2026-10-12 (vanlig bruker):** menyen gir Oversikt, Menigheter og Filer; de ni andre seksjonene viser «Ingen tilgang» på PC og mobil. Tilgangen håndheves også i databasen: direkte kall med brukerens økt ble nektet (42501) for system_status, mail_settings_get, cleanup_overview og export_church (egen og fremmed menighet); user_roles og invitations ga 0 rader, app_users nektet (`e2e-dev/access-dev.spec.ts`). 503 fra /api/ch på Oversikt og Filer (logoer/miniatyrer) fordi den hemmelige nøkkelen ikke var satt – serverhandlingene er ikke prøvd. **Admin (samme dag):** Brukere, Menigheter, Invitasjoner, Filer, Abonnement og Logg vises; Samarbeid, Tilbakemeldinger, Opprydning, Forespørsler og Mail viser «Ingen tilgang» (PC og mobil). I databasen: stabsfunksjonene nektet (42501), export_church tillatt for egen menighet og nektet for fremmed id, user_roles (2) og invitations (6) bare i egen menighet. Ny kjøring med hemmelig nøkkel: churches (1), memberships (6) og audit_logs (201) har 0 rader utenfor egen menighet; ingen 503 lenger på Oversikt og Filer. |
| ADM-02 | Brukere: søk, status, roller, profil, medlemskap, invitasjoner, siste aktivitet, navn | B, D | E\* | `features/admin` | E2E | I (brukerliste med søk og filtre, brukerdetalj: navn, medlemskap (én menighet om gangen, fjern/deaktiver med bekreftelse), globale roller med sperre for siste rolle, deaktiver konto, invitasjoner og aktivitet. Regler og komponenttester med falsk database. Ikke prøvd mot connecthub-dev) |
| ADM-03 | Menigheter: ny, navn, kvote, logo, eksport, status og sletting (livsløp) | B, D | E\* | `features/admin` | E2E | I (liste med søk/status, medlemmer, admin og lagring (stab), ny menighet; detalj med faner; innstillinger: logo (opplasting til Logoer), navn, egen kvote/tilbakestill, overbooking-varsel, eksport, status, sett til sletting, slett for godt med navnebekreftelse. Komponenttester med falsk database/server. Fanene Filer og Abonnement lenker til dagens admin til de er flyttet. Ikke prøvd mot connecthub-dev) |
| ADM-04 | Medlemmer: én menighet om gangen, fjerning/gjenoppretting, Ekstra Admin, melding til alle | B, D | E\* | `features/admin` | E2E | I (medlemsliste med søk/filter, Gjør til admin/fjern admin, deaktiver/aktiver, fjern med bekreftelse, ekstra Admin for stab med bekreftelse, melding til alle. Komponenttester med falsk database. Ikke prøvd mot connecthub-dev) |
| ADM-05 | Invitasjoner: opprett, send på nytt, aksepter | B, D | E\* | `features/admin` | E2E | I (Ny invitasjon via serveren; liste med søk/status/rolle/menighet, utløpte, send på nytt (invite.resend, varsel når e-posten ikke ble sendt), trekk tilbake. Komponenttester med falsk server. Godkjenning av invitasjon skjer på dagens /login (AUTH-links)) |
| ADM-06 | Forespørsler-innboks (A/B/C-godkjenning) | B, D | E\* | `features/admin` | E2E | I (innboks med åpne/godkjente/avslåtte, detalj, under behandling, notat, historikk, avslå med begrunnelse, slett med bekreftelse, «Opprett bruker» A/B/C via serveren (request.approve) med roller etter rolle; eksisterende konto sperrer. Komponenttester med falsk database/server. Ikke prøvd mot connecthub-dev) |
| ADM-07 | Filer: Fellesmappe, Samarbeidsmappe, Faste; opplasting, forhåndsvisning, flervalg, ZIP, eksporter, slett; filer i bruk kan ikke slettes | B `folders.jsx`, D | E\* | `features/files` | E2E | I (Fellesmappe, Samarbeidsmappe per aktiv gruppe og Faste (fire mapper); snarveier på oversikten; forbruk mot kvote og samlet plass; opplasting (også dra-og-slipp, bare bilder, video avvises), forhåndsvisning med bla og Esc, flervalg, Last ned (ZIP ved flere; zip portert og byte-lik med dagens), Eksporter, Slett med bekreftelse etter rettigheter (egne / Admin), Del kopi i Samarbeidsmappe; filer bare for medlemmer, også for stab. Komponent- og byggtester med falske tjenester. Ikke prøvd mot connecthub-dev) |
| ADM-08 | Samarbeidsgrupper (2–20 menigheter), kopiering inn, avslutt/gjenåpne/slett | B, D | E\* | `features/admin` | E2E | I (grupper med 2–20 menigheter: opprett med søk og avkrysning, endre navn/beskrivelse, legg til/fjern (minst to, kopier skjules), avslutt/gjenåpne med bekreftelse, slett avsluttet gruppe via serveren (link.delete) med antall kopier i bekreftelsen; filnavn og opplysninger per menighet, aldri innhold. Komponenttester med falsk database/server. Ikke prøvd mot connecthub-dev) |
| ADM-09 | Abonnement, planer, kvoter, samlet lagringsgrense | B, D | E\* | `features/admin` | E2E | I (planer (veiledende lagring kun for Developer), planendring med bekreftelse, samlet lagringsgrense med overbooking, menighetens lagring (storage_usage), forespørsel om abonnement (Admin), godkjenn/avslå/trekk tilbake. Også i menighetens Abonnement-fane. Komponenttester med falsk database. Ikke prøvd mot connecthub-dev) |
| ADM-10 | Logg (søk, type) | B | E\* | `features/admin` | E2E | I (siste 200 hendelser med søk og type, navn på hendelser og roller; menighetsvelger for Admin. Komponenttest med falsk database) |
| ADM-11 | Mail-fanen: maler, logo, testutsending, utsendingslogg, varslingsadresser | B `mail.jsx`, D | E\* | `features/admin` | E2E | I (maler med blokker, fast lenkeboks, emne, flytt (dra/piler), lagre/angre/gjenopprett, send test, logo (last opp/standard), varslingsadresser, siste utsendinger; forhåndsvisning i sandkasset iframe med gjengivelse som er kontrollert lik serverens mail-render.js (byggtest). Komponenttester med falsk database/server. Ikke prøvd mot connecthub-dev) |
| ADM-12 | Tilbakemeldinger: filtre, saksdetaljer, status, notater, arkivering, kopier sak(er) | B `feedback.jsx`, D | E\* | `features/admin` | E2E | I (innboks og fjernede saker, filtre (kategori, applikasjon, status, miljø, datoer) og søk, Kopier sak / Kopier alle / valgte / i deler (formatCase portert med testene, kodehenvisning også til den nye appen), sak med markering, teknisk kontekst, status med begrunnelse ved avvisning, notater, historikk, arkiver/gjenopprett med bekreftelse. Komponent- og enhetstester med falsk database. Ikke prøvd mot connecthub-dev) |
| ADM-13 | Opprydning: private filer fra fjernede medlemmer | B `cleanup.jsx`, D | E\* | `features/admin` | E2E | I (oversikt med totalsum og kø, filnavn bare for menigheter der du er medlem, bare klare filer kan velges, sletting med bekreftelse via serveren (file.cleanup med forventet antall/størrelse), nytt forsøk for lagringen. Komponenttester med falsk database/server. Ikke prøvd mot connecthub-dev) |
| ADM-14 | Gammel admin (Vercel Blob): oppsettkode, brukere/roller/menigheter, opplasting, **skjul/vis innebygde bilder per menighet**, logg | A, H `db76976` | F | Erstattet av ConnectHub. «Skjul innebygde bilder» har ingen tydelig erstatter – **avklares**. | – | – |

## 4. Felles media og deling

| ID | Funksjon | Kilde | Status | Ny modul | Test | Impl |
|---|---|---|---|---|---|---|
| SHR-01 | Delt mappe mellom verktøy (IndexedDB `medialab-share`, maks 60, maks 2 GB per fil, bilde/video/lyd, miniatyr) | B `ml-share.js` | E | `services/assets` (erstatter, leser gamle data) | U, E2E | T (E2E: opplastet bilde lagres med miniatyr og finnes etter ny innlasting; 300 ulike filer beholdes alle (ingen 60-grense), varsel om stor samling, bruksoversikt «N fil(er) · X i nettleseren», manuell sletting med bekreftelse virker. Målt i ekte Chrome (testserver i utviklingsmodus) 2026-10-12: opplasting av 300 filer 3,3 s (55 s før oppdateringene ble slått sammen), innlasting av Dine medier 1,4 s. U: samme fil én gang, filtyper, 2 GB / video 4 GB, varselgrenser (300 filer, 2 GB, 80 % av nettleserens kvote), import fra dagens delte mappe uten å endre den. **Beslutning godkjent 2026-10-12:** ingen automatisk sletting – fjernet også i dagens delte mappe, så ingenting slettes før det er hentet over) |
| SHR-02 | «Send til …» et annet verktøy, motta ved åpning | B `ml-share.js`, H 11 | E | `services/assets` + `app/router` | E2E | T (E2E PC/mobil: «Bruk i …» fra Isolate Subject → Mockups, Photo Design → Isolate, Thumbnail Studio → Mockups, Motion design (stillbilde) → Isolate; «Åpne i …» fra Dine medier. Mottakeren åpnes med `?asset=` uten ny opplasting. Video fra Motion design tilbys bare verktøy som tar imot video (Loop Studio) etter eksport – ikke egen E2E. Lim inn (Ctrl+V) som bildekilde er brukt i Isolate-kjøringen i ekte Chrome) |
| SHR-03 | Kopier bilde til utklippstavlen, last ned | B `ml-share.js` | E | `services/export` | E2E | T (E2E PC/mobil: «Kopier» i Isolate legger PNG med gjennomsiktighet på utklippstavlen, «Last ned PNG» gir riktig fil. Kopier finnes også i Mockups, Photo Design og Thumbnail Studio – der ikke egen E2E for utklippstavlen) |
| SHR-04 | Velger «Fellesmappe»/«Felles ressurser» (Faste, logoer, bakgrunner) og Samarbeidsfiler; `ch:<fil-id>`-referanser | B `ch-picker.js`, `ch-cloud.js` | E | `features/media-picker`, `services/files` | E2E | I (`features/cloud-picker`, `ch:<fil-id>` i Thumbnail Studio og Photo Design; komponenttester med falsk database. **Blokkert:** ikke prøvd mot connecthub-dev – krever innlogging med testkonto og serverens hemmelige nøkkel for `file.urls`, se docs/lokal-servertest.md) |
| SHR-05 | Skyfiler bare bilder; video avvises (magiske bytes) | B `server/lib/sniff.js`, D | E | uendret server + klientvalidering | U | I (U: `precheckUpload` – bare PNG/JPEG/WebP/GIF ≤ 4 MB, video avvist etter type og filnavn; serverens innholdskontroll uendret med egne tester i `media-lab/server` (video forkledd som bilde avvises). Ikke prøvd mot connecthub-dev) |
| SHR-06 | Prosjektmapper på PC (File System Access), media i `<mappe>/media/`, kopier – aldri slett, «Frigjør plass» med bekreftelse | B `project-folder.js`, D | E | `infrastructure/fs-access` | E2E, M | T (E2E: kopier til prosjektmappe, frigjør plass i nettleseren og åpne fra mappen igjen (Motion design); U: filer som bare ligger i mappen, leses derfra; kopien i nettleseren fjernes bare når filen også ligger i mappen. Ekte mappevalg (File System Access-dialogen) er ikke prøvd manuelt) |
| SHR-07 | Felles grunnoppsett per menighet (`church_settings`), versjon mot samtidige endringer, `merge3` | B `shared-setup.js`, D | E | `services/settings` | U | I (U: `merge3`, og `SharedSetup` med falsk tjeneste: samlede lagringer, versjonskonflikt → sammenslåing og ny lagring, konflikt i samme felt meldes, admin-felt holdes tilbake, manglende rettighet beholder endringen. **Blokkert:** ikke prøvd mot connecthub-dev med to brukere samtidig) |
| SHR-08 | **Video lagres aldri i skyen** | D (fast krav) | E | Håndheves i `services/assets` | U | I (U: aldri sky-sted for video i mediebiblioteket, `precheckUpload` avviser video, serveren avviser video også forkledd som bilde. Ingen E2E mot ekte server) |

## 5. Forsiden (dashboard)

| ID | Funksjon | Kilde | Status | Ny modul | Test | Impl |
|---|---|---|---|---|---|---|
| HUB-01 | Kort for Loop Studio, Thumbnail Studio, mappene SoMe (Motion, Photo) og Tools (Isolate, Mockups); `#some`/`#tools` | B `media-lab/` | E | `features/hub` | E2E | T (E2E: mappene og verktøy-lenker) |
| HUB-02 | Snarveier Fellesmappe/Samarbeidsmappe (sistnevnte bare ved aktiv gruppe) | B `folder-links.jsx` | E | `features/hub` | E2E | – |
| HUB-03 | Språkvalg og Admin-lenke | B | E | `features/hub` | E2E | T (E2E: språkvalg; Admin-lenke vises bare for admin, ikke testet med ekte innlogging) |

## 6. Loop Studio – startside

| ID | Funksjon | Kilde | Status | Ny modul | Test | Impl |
|---|---|---|---|---|---|---|
| LS-01 | Maler: Ukeprogram, Søndagsmøte, Ungdomsmøte, Tom mal; egne maler (ny, rediger kategori/navn/beskrivelse/knapp, flytt, fjern, tilbakestill) | B `loop-studio/`, H 05 | E | `features/loop-studio/home` | E2E | T (malkort: ny, sidetittel, flytt, fjern, tilbakestill (E2E)) |
| LS-02 | Disk: lagrede looper (maks 10), favoritt, slett (også `ukeloop.custom.<id>`) | B, H 05 | E | `features/loop-studio/home` | E2E | T (lagre, åpne, favoritt, slett (E2E)) |
| LS-03 | «Se demo (lagres ikke)» med genererte bakgrunner (`gen:N`), «Lagre som grunnoppsett» fra demoen | B, D | E | `features/loop-studio` | E2E | I (demo og «Avslutt demo» testet (E2E); «Lagre som grunnoppsett» ikke testet) |
| LS-04 | Grunnoppsett personlig (`loopstudio.bases.v1`) og felles (`loopstudio:bases`), `?grunn=p|f-<id>` | B `loop-bases.js`, D | E | `features/loop-studio` | U, E2E | I (felles grunnoppsett krever innlogging mot ConnectHub; ikke testet) |
| LS-05 | Sidetittel kan endres | H 05 | E | `features/loop-studio/home` | E2E | T |

## 7. Loop Studio – editor (Ukeprogram Loop)

| ID | Funksjon | Kilde | Status | Ny modul | Test | Impl |
|---|---|---|---|---|---|---|
| LE-01 | Ukeprogram fra tekst (én linje per møte; «Ekstra:»; dato-linjer blir egne slides), skjema «Legg til møte» (ukedag, dato, tid, navn, sted) | B `studio-editor/` | E\* | `features/loop-studio/program` | U | T (tekst, «Ekstra:», skjemaet «Legg til møte» (E2E)) |
| LE-02 | Ukeprogram fra fil (.txt/.csv/.tsv) | B, H 11 | E | `features/loop-studio/program` | U, R | T (.txt (E2E)) |
| LE-03 | Ukeprogram fra bilde: tesseract (`nor`) med forbehandling; bruker `window.claude.complete` når den finnes (bare i Claude-artefaktmiljø) | B `logic.js:2169` | E | `features/loop-studio/program` (+ `services/ai`) | R, M | T (tesseract `nor` fra /vendor, bilde med to programlinjer gir to møter (E2E). `window.claude.complete` er bevisst utelatt, se docs/gjenoppretting.md) |
| LE-04 | Standard uke (lagre, endre, tilbakestill; menighetens egen, aldri automatisk), `loopstudio:week` | B, D | E\* | `features/loop-studio` | E2E | T (lagre, tøm, hent standarduke (E2E); felles standarduke for menigheten krever innlogging) |
| LE-05 | Faste bilder per møtenavn (lengste treff vinner; husker per møte; nye møter får sist brukte bilde på samme ukedag); bare Admin endrer felles | B, D | E\* | `features/loop-studio` | U | I (ikke testet; gamle faste bilder hentes med importen (testet)) |
| LE-06 | Slides: legg til, dupliser, flytt, slett, vis i loopen, varighet; typer Tekst, Kontakt med QR, Avslutning | B | E\* | `features/loop-studio/slides` | K | T (legg til, dupliser, flytt, slett, angre (E2E)) |
| LE-07 | Tekstfelt per slide (merkelapp, tid-merke, undertekst, overskrift, e-post, telefon, tittel) med egen tekstfarge | B | E\* | `features/loop-studio/slides` | K | I (tekstfelt endret og vist (E2E); tekstfarger ikke testet) |
| LE-08 | QR-kode (lenke/mailto/tel), plassering, størrelse, tekst under, runde hjørner, eksempelkode, flytter seg unna logo | B, qrcode-generator | E\* | `features/loop-studio/qr` | U, R | I (QR-koden lages fra lenken (E2E); plassering og størrelse ikke testet) |
| LE-09 | Fritt plasserte elementer (tekst, bilde, logo, QR): dra, hjørner endrer størrelse, dobbeltklikk redigerer tekst, Delete sletter | B | E\* | `features/loop-studio/canvas` | E2E | I (frie elementer i motoren enhetstestet; dra/størrelse ikke testet) |
| LE-10 | Bakgrunn per slide: bilde (lokal, Fellesmappe, delt mappe), beskjær/flytt utsnitt, rotasjon, bildestyrke, kobling til fast bilde | B | E\* | `features/loop-studio/slides` | E2E | I (eget bilde med beskjæringsdialog testet (E2E); Fellesmappe krever innlogging; utsnitt ikke testet) |
| LE-11 | Bakgrunnsfarge/gradient: 17 typer (solid, linear, mirror, radial, conic, mesh, stripes, wave, ellipse, corner, spot, glow, conicRep, conicMirror, rays, conicCorner, none), fargestopp, snu, fordel jevnt, skarp/myk, gjentakelser | B `FILLM` | E | `shared/fill` (felles med Photo/Thumb der lik) | U | I (alle 16 typer tegnes uten feil (enhetstest); editoren ikke testet) |
| LE-12 | Video på slide (maks 5 min) i stedet for bilde, lyd fra video vs loop-musikk, videovolum | B | E\* | `features/loop-studio/slides` | E2E | T (video på slide, sliden får videoens lengde, videolyd av (E2E); lagres bare lokalt) |
| LE-13 | Grunnvideo bak alle slides | B | E\* | `features/loop-studio` | E2E | T (grunnvideo velges og er der etter omlasting (E2E); lagres bare lokalt) |
| LE-14 | Logo: bytt, vis/skjul per slide, plassering vannrett/loddrett | B | E\* | `features/loop-studio` | E2E | T (logo vises i bildet og skjules (E2E, pikselkontroll)) |
| LE-15 | Stilpakker (Rolig, Energisk, Glitch, Promo, Kino, Minimal, Skyv, Feiring) og «Overrask meg» | B | E\* | `features/loop-studio/style` | U | T (stilpakke «Promo» setter skrift og stil (E2E)) |
| LE-16 | 100+ fargepaletter, tilfeldig farge (bare trykkbar), aksentfarge, standardfarger | B `PALS`, D | E\* | `features/loop-studio/style` | U | I (ikke testet) |
| LE-17 | Overganger: Toning, Via svart, Skyv, Zoom, Glitch, Paneler, Kutt | B `transOpts` | E | `features/loop-studio/engine` | R | T (alle overganger tegnes (enhetstest)) |
| LE-18 | Tekstanimasjon: Avdekk, Ton inn, Gli inn, Uskarp, Sprett, Glitch, Ingen; fart | B `textOpts` | E | `features/loop-studio/engine` | R | T (alle teksteffekter tegnes (enhetstest)) |
| LE-19 | Overlegg: Filmkorn, Lyslekkasje, Bokeh, Snø, Konfetti, Linjer; egen farge, gjennomsiktighet, per slide/alle | B `OVT` | E | `features/loop-studio/engine` | R | T (overleggsdialogen, «Snø» på sliden (E2E); alle overlegg tegnes (enhetstest)) |
| LE-20 | Vignett-editor: typer auto/round/oval/bottom/top/cinema/sides/left/even, flere vignetter, rotasjon, størrelse, diffus 0–200 % (S-kurve over 50 %), «Alle slides» fjerner overstyringer | B `VIGT`, D | E | `features/loop-studio/vignette` | U, R | T (vignettdialogen, type «Oval» (E2E); alle typer tegnes (enhetstest)) |
| LE-21 | Fargepaneler (overgang «Paneler») med farger, synlighet per panel, per slide | B | E\* | `features/loop-studio/engine` | R | I (ikke testet) |
| LE-22 | Fargefilter på bilder (farge, blanding, styrke), per slide; toning/varme, fargehjul, pipette, metning/lysstyrke, fargetone | B | E\* | `features/loop-studio/engine` | R | I (egen fargevelger med hex-kode testet (E2E); fargefilter og pipette ikke testet) |
| LE-23 | Langsom zoom (Ken Burns), lysstripe ved skifte, rolig dybde | B | E | `features/loop-studio/engine` | R | I (ikke testet) |
| LE-24 | Lydspor (MP3/M4A/WAV), lydbibliotek med sjanger, volum, inn-/uttoning, start i sangen | B | E\* | `features/loop-studio/audio` | E2E | T (lydspor, lydbibliotek med to lyder, bytte, beholdt etter omlasting (E2E)) |
| LE-25 | Looping-modus: Auto/strekk til sangen/takt; takt-analyse (BPM, halv/dobbel, ±1, finjuster slaget), takt-synk av tekst/bilde/skifter, beat-ekstra | B, H 11 | E\* | `features/loop-studio/beat` | U, R | I (takt-analyse og «Følg takten» testet (E2E); takt-effektene tegnes (enhetstest), også «glow» som feilet i dagens app) |
| LE-26 | Skrift for titler og øvrig tekst, overskrift/merkelapp globalt, ukestripe nederst, strek ved ukedag | B | E\* | `features/loop-studio/style` | K | I (ikke testet) |
| LE-27 | Formater/oppløsning for video (liggende/stående, 1080p/4K) | B, H 08 | E\* | `features/loop-studio/export` | R | T (stående 1080 × 1920 og 4K 2160 × 3840 kontrollert i filen (E2E)) |
| LE-28 | Eksport: fullskjerm-spiller (.html, frittstående; videoer på slides blir ikke med), rask MP4 (WebCodecs + mp4-muxer, 1080p/4K, med lyd), sanntidsopptak (MediaRecorder) som reserve | B, H 08 | E | `features/loop-studio/export` | R (HTML byte-likt, MP4 dekodede bilder) | T (HTML-spiller, MP4 1080p med lyd, 4K og opptak i sanntid (E2E)) |
| LE-29 | Forhåndsvisning: spill/pause, spol, fullskjerm, zoom/flytt, hjelpelinjer (Sneglehus, Fibonacci, Tredeling, snu), «Tester effekten på slide» (`testSlide`) | B, D | E\* | `features/loop-studio/preview` | E2E | I (ikke testet) |
| LE-30 | Angre/gjør om, autolagring av/på, lagre på Disk / «Lagre som ny» | B | E\* | `services/projects` + `features/loop-studio` | E2E | T (angre/gjør om og Disk (E2E)) |
| LE-31 | Lyd synkronisert mellom faner (`BroadcastChannel('ukeloop-audio')`) | B `logic.js:61` | E\* | **avklares** (trengs det i én SPA?) | M | T (to faner: den ene stopper når den andre spiller (E2E)) |
| LE-32 | Gammelt autolagret eksempelinnhold legges til side og kan hentes tilbake | B `e09f4c3` | E\* | `infrastructure/legacy-import` | U | T (gammelt eksempel legges til side og hentes tilbake (E2E)) |
| LE-33 | Spiller-HTML bygges med `Function.toString()` av motoren | B, H 08 | E | Nytt: egen, bygget spiller-modul (krav: frittstående fil) | R | T (spiller-HTML bygges av kildeteksten til motoren, uavhengig av minifisering (enhetstest + E2E)) |
| LE-34 | Innbygging av fonter i spiller-HTML fra Google Fonts | A `ukeloop-engine.js` | F | Erstattet av egne fontfiler (P8). Verifiser at spilleren fortsatt bygger inn fontene. | R | I (egne fontfiler bygges inn som før; ikke kontrollert i test) |

## 8. Thumbnail Studio

| ID | Funksjon | Kilde | Status | Ny modul | Test | Impl |
|---|---|---|---|---|---|---|
| TS-01 | Lerret 1920×1080 (16:9) | B, D | E | `features/thumbnail-studio` | U | T |
| TS-02 | Kategorier (Søndagsmøte, Kveldsbibelskole, Ungdomsmøte + egne; ny, gi nytt navn, beskrivelse, slett), felles for menigheten (`thumbstudio:cats`) | B `DEFAULT_CATS`, D | E | `features/thumbnail-studio` | E2E | T (deling i menigheten: I, krever backend) |
| TS-03 | Grunnoppsett per kategori, flere per kategori (`layouts[]`, `defaultLayout`, `baseName`), rediger, gjør til standard, tilbakestill | B, D | E | `features/thumbnail-studio` | E2E | I |
| TS-04 | Maler: maks 5 per kategori, maks 5 bilder per mal; ny, dupliser, overskriv, slett, lagre | B, D | E | `features/thumbnail-studio` | U, E2E | I (ny mal og lagre testet (E2E); dupliser, overskriv, slett og grensene 5/5 enhetstestet delvis) |
| TS-05 | 28 oppsett (Blank, Stor krok, Delt i høyden, Nummerert tips, To personer, Sitat og person, Navneskilt, Tre/Fire i panel, Ansikt til ansikt, Episode, Lydbølge, Gjest, Plakat, Stor dato, Infobokser, Person og tittel, Tittel i midten, Bibelvers, Skrå fargeflate, Sterk farge, Bilde med ramme, Film, Cover, Live, Sangliste, Vinyl, Toppliste); «Bytt oppsett» beholder person/navn/tema/bilder | B UI | E\* | `features/thumbnail-studio/layouts` | R | T |
| TS-06 | Lag: tekst, bilde, form, strek, lys, logo, «Flere elementer» (overskrifter, sitat, punktlister med underpunkt, bokser og merker, navneskilt, dato, bildefelt) | B `addBtns` | E\* | `features/thumbnail-studio/layers` | K | I |
| TS-07 | Lagliste: rekkefølge, ↺ tilbake til grunnoppsett, kobling av lag (dra over hverandre), lagnavn (dobbeltklikk) | B, D | E\* | `shared/layers` (felles med Photo) | E2E | I |
| TS-08 | Flytt/skaler/roter, Shift endrer forhold, hjelpelinjer, zoom | B | E\* | `shared/canvas-editor` | E2E | I (dra på lerretet testet (E2E); roter, Shift, hjelpelinjer og zoom ikke testet) |
| TS-09 | Beskjær bilde (dobbeltklikk), fjern tomme kanter, vis hele bildet | B, H 11 | E | `shared/crop` | R | I |
| TS-10 | AI-utklipp (Person = MODNet, Objekt = ormbg; var BiRefNet), bruk originalbildet | B, H 11 | E | `services/ai` | R, M | T (ekte Chrome 154 med ekte modeller, Playwright 2026-10-12: Objekt (ormbg) ferdig etter 15 s, Person (MODNet) etter 4,5 s, «Bakgrunnen er fjernet», utklippet kontrollert på skjermbilde, ingen sidefeil. Ikke prøvd manuelt) |
| TS-11 | Fargekombinasjoner (11: Standard, Svart på hvit, …), farge på nye elementer, egen farge, understrek som følger teksten | B `COMBOS` | E | `features/thumbnail-studio` | U | T |
| TS-12 | Bakgrunn (farge, gradient, bilde med zoom/posisjon/blur/demping) og vignett | B `emptyDoc` | E | `shared/fill` | R | I |
| TS-13 | Eksport: PNG/JPG, 1080p/4K, gjennomsiktig PNG, råd («YouTube = JPG 1080p < 2 MB», varsel over 2 MB) | B, H 11 | E | `services/export` | R | T |
| TS-14 | Kopier, «Send til …», delt mappe og Fellesmappe som bildekilde | B | E | `services/assets` | E2E | I («Send til …» = «Lagre i Dine medier»; delt mappe = Dine medier) |
| TS-15 | Sikkerhetskopi: last ned fil og gjenopprett (erstatter kategorier og maler i nettleseren) | B, H 11 | E | `services/projects` | R | T |
| TS-16 | Autolagring av/på, angre/gjør om, «ikke lagret»-varsel ved tilbake | B | E | `services/projects` | E2E | T |
| TS-17 | Egen visning: dra paneler mellom kolonner, faner, tilbakestill | B UI | E\* | `features/thumbnail-studio/layout-editor` | E2E | I |
| TS-18 | Enkel visning på mobil (bytt person, navn, tema, bakgrunn, last ned) | B UI | E\* | `features/thumbnail-studio` | E2E (mobil) | I |
| TS-19 | Innebygde standardmaler med logoene `logo-symbol`/`logo-kbs` og `asset:`-referanser | A `thumb-engine.js` | F | Fjernet bevisst (D: «ingen forhåndsinnlagte standardbilder/logoer»). Filene i `public/images` beholdes, så gamle prosjekter virker → må støttes ved import. | R | I (gamle asset:-logoer vises fortsatt) |

## 9. SoMe – Photo Design

| ID | Funksjon | Kilde | Status | Ny modul | Test | Impl |
|---|---|---|---|---|---|---|
| PD-01 | Formater: Instagram 1:1, 4:5, Story 9:16, 16:9, A4, A3, Visittkort, egendefinert | B `FORMATS` | E | `features/photo-design` | U | T |
| PD-02 | Maler (9): Tomt, Visittkort tosidig, Bilde med tittel, Sitat, Arrangement, Ukeprogram, Dagsprogram, Ukeprogram (lys), Kunngjøring; egne maler i kategorier (maks 5 per kategori) | B `TEMPLATES` | E | `features/photo-design` | R | I (de 9 malene testet (E2E); egne maler i kategorier er bygget, ikke testet) |
| PD-03 | Lag: bilde, tekst, form (19 + avrundet rektangel), fx | B `SHAPES` | E | `shared/layers` | U | T |
| PD-04 | Flytt/skaler/roter/kanter, flipp, beskjær (`cz/cx/cy`), bytt bilde ved å dra oppå bildeplass | B | E | `shared/canvas-editor` | E2E | I (bygget; ikke egen test) |
| PD-05 | Flervalg (ramme, Shift/Ctrl-klikk), grupper (Ctrl+G / Ctrl+Shift+G), gruppeskalering og sidehåndtak | B, D | E | `shared/canvas-editor` | U, E2E | T (E2E: Ctrl+A, Ctrl+G, slett, angre) |
| PD-06 | Hjelpelinjer: lerret og andre lag, lik avstand med merke (#9b1c3c), Alt = uten festing | B, D | E | `shared/canvas-editor/snap` | U | T (U: festing og Alt) |
| PD-07 | Formatbytte med smart omplassering og tilbakevending | B `changeFormat`, D | E | `features/photo-design` | U | T (U: frem og tilbake gir samme oppsett) |
| PD-08 | Tekst: font (9), tykkelse, store bokstaver, kontur, understrek, skygge, linjehøyde, sperring | B | E\* | `shared/text` | R | I (bygget; ikke egen test) |
| PD-09 | Blandingsmodus (7), looks (12), justering (piksel-LUT, Safari-trygt), kurve | B `BLENDS`, `LOOKS` | E | `shared/image-adjust` | R | I (kurven enhetstestet; blanding/looks ikke testet) |
| PD-10 | AI-utklipp (Person/Objekt) + pensel på masken (fjern/gjenopprett, Alt), inverter, fjern maske | B, H 11 | E | `services/ai` + `shared/mask` | R | T for AI-utklippet (ekte Chrome 154 med ekte modeller 2026-10-12: Objekt 14 s, Person 3,7 s, «Motivet er klippet ut», kontrollert på skjermbilde). Penselen på masken: I (ikke E2E) |
| PD-11 | Avansert modus: 13 effekttyper (`ml-fx`), 1920 forhåndsvalg (80 looks × 8 paletter × 3 styrker), favoritter, nylig, egne (eksport/import JSON, gi nytt navn, slett), søk | B `ml-fx.js`, D | E | `features/fx` (felles motor) | R | T (felles motor i `shared/fx`; U: 1920 forhåndsvalg; E2E: effekt blir eget lag) |
| PD-12 | Bakgrunn/gradient og vignett (samme sett som Loop) | B | E | `shared/fill` | R | I (fyll enhetstestet; vignett ikke testet) |
| PD-13 | Koblede farger (endrer alle lag med samme farge), farge på nye elementer, tilfeldige farger | B UI | E\* | `features/photo-design` | U | I (bygget; ikke egen test) |
| PD-14 | Trykk: A3/visittkort (mm), utfallende 3 mm, tosidig (`doc.back`), CMYK-felt, «PDF trykk» (CMYK, 300 dpi, TrimBox/BleedBox, rendres i bånd) | B, D | E | `services/export/pdf` | R | T (E2E: PDF med /DeviceCMYK) |
| PD-15 | Eksport PNG/JPG 1×/2×, gjennomsiktig, kopier, send til | B | E | `services/export` | R | T (E2E: PNG 1080, JPG 2× 2160; lagre i Dine medier) |
| PD-16 | Prosjekter i IndexedDB `photodesign`, autolagring (av som standard), sikkerhetskopi last ned/gjenopprett, angre/gjør om, Ctrl+S | B | E | `services/projects` | R | T (prosjekter i ProjectService; gamle `photodesign`-prosjekter kopieres inn; autolagring er AV som standard, slik den gamle koden faktisk gjør) |
| PD-17 | Bildebibliotek: delt mappe, Fellesmappe, Samarbeidsfiler; lim inn med Ctrl/Cmd+V, dra inn | B | E | `features/media-picker` | E2E | I (Dine medier og filvelger testet; Fellesmappe krever innlogging, ikke testet; lim inn/dra inn ikke testet) |
| PD-18 | Avansert modus: keyframes/tidslinje via `t`, sporing, penselmaling med maske på fx-lag | D «Gjenstår» | U | Planlegges, ikke krav for paritet | – | – |

## 10. SoMe – Motion Design

| ID | Funksjon | Kilde | Status | Ny modul | Test | Impl |
|---|---|---|---|---|---|---|
| MD-01 | Formater: Instagram innlegg/portrett, Story/Reels, Facebook/YouTube, Facebook-cover, egendefinert 240–4096 | B `FORMATS` | E | `features/motion-design` | U | T (E2E: 5 formater og egendefinert 240–4096) |
| MD-02 | Maler (8): Møtepromo, Arrangement/konferanse, Sitat/vers, Nedtelling, Talerpresentasjon, Musikk/lovsang, Kunngjøring, Tom | B `TEMPLATES` | E | `features/motion-design` | R | T (U: alle 8 maler gir gyldige prosjekter; E2E: malvalg) |
| MD-03 | Tidslinje med spor tekst, overlegg, video, undertekster, musikk; lås/skjul spor; zoom; markører (M, på takten) | B `tracks`, D | E | `features/motion-design/timeline` | U, E2E | T (E2E: spor, lag, markør med M; U: lag-plassering) |
| MD-04 | Trim, del ved spillehodet (S), flytt, kobling av elementer (gruppe, maks ett videoklipp), høyreklikkmeny | B, D | E | `features/motion-design/timeline` | U | I (del med S, kobling og meny testet (E2E); dra og trim ikke testet) |
| MD-05 | Overganger (31): Ingen, Toning, Via svart/hvitt, Blits, Skyv ×4, Dekk ×4, Sveip, Zoom inn/ut, Snurr, Visk ×4, Sirkel, Diamant, Klokke, Persienner, Striper, Dører, Uskarp, Glitch, Piksler, Kryss-zoom, Fartsrampe, Match cut, Maskering, Chroma …; dra til tidslinjen, snapper mellom/start/slutt | B `TRANS`, D | E | `features/motion-design/render` | R | T (alle 36 typer i motoren; E2E: overgang mellom klipp og «Fjern overgang») |
| MD-06 | Tekstanimasjoner (17): Ton inn, Stig opp, Sprett, Skyv inn, Fra uskarp, Skrivemaskin, Ord for ord, Bokstav for bokstav, Hopp inn, Bølge, Glitch, Zoom inn fra stor, Fall ned, Vend, Trekk sammen, Avdekk | B `ANIMS` | E | `features/motion-design/render` | R | I (17 animasjoner bygget; ikke testet hver for seg) |
| MD-07 | Looks (12) og RGB-kurver (m/r/g/b, monoton spline), fallback uten `ctx.filter` (Safari) | B `LOOKS`, D | E | `shared/image-adjust` | R | I (kurve enhetstestet; looks og Safari-fallback ikke testet) |
| MD-08 | Grønnskjerm på overlegg (keyOn/keyColor/keySim/keySmooth/keySpill) | B, D | E | `features/motion-design/render` | R | I (bygget; ikke testet) |
| MD-09 | Transformhåndtak (dobbeltklikk → 8 punkter + rotasjon; igjen → beskjær), bilde-i-bilde | B, D | E | `shared/canvas-editor` | E2E | I (bygget; ikke testet) |
| MD-10 | Logo (Fellesmappe/opplasting), flyttbar, størrelse, gjennomsiktighet | B, D | E | `features/motion-design` | E2E | I (opplasting av logo bygget; Fellesmappe krever innlogging, ikke testet) |
| MD-11 | Undertekster: egne, importer/last ned .srt, AI (Whisper i nettleseren), stil | B, H 11 | E | `features/motion-design/subs` + `services/ai` | R (srt byte-likt), M (Whisper) | I (talemodellen lastes ned, men tolkingen ble ikke ferdig i hodeløs Chrome; må prøves i ekte Chrome med tale, se docs/gjenoppretting.md) |
| MD-12 | Lyd: musikk (bibliotek/tidslinje), lydmikser med ducking (`p.mix`), utjevn lyd, voiceover (mikrofon → WAV) | B, D | E | `features/motion-design/audio` | R, M | T (voiceover med Chromes falske mikrofon legges på lydsporet (E2E)) |
| MD-13 | Kopier/lim inn farge og lyd mellom klipp | B, D | E | `features/motion-design` | U | I (bygget; ikke testet) |
| MD-14 | Fargeflate, frys bilde, erstatt fil i klipp | B UI | E\* | `features/motion-design` | E2E | T (E2E: frys bilde deler videoklippet i tre; fargeflate og bytt media) |
| MD-15 | Eksport MP4 H.264 + lyd: 1080p30/60, 4K30 (WebCodecs + mp4-muxer); avbryt; send stillbilde/video | B, H 11 | E | `services/export/video` (Worker) | R | T (1080p30 med lyd, 1080p60 og 4K30; bildefrekvens og størrelse kontrollert i MP4-filen (E2E)) |
| MD-16 | Prosjektfil `.motion` (binær: `VFY1`, lengde, JSON, filer) lagre/åpne | B `VF.pack`, H 11 | E | `services/projects/formats/motion` | R (byte-likt) | T (U: VFY1-format fram og tilbake; E2E: lagre og åpne .motion) |
| MD-17 | Prosjektmappe på PC (`prosjekt.motion.json`, media i `media/`) | B `project-folder.js`, D | E | `infrastructure/fs-access` | E2E, M | I (kopier til mappe, frigjør plass og åpning igjen testet med et ekte mappehåndtak fra nettleserens private filsystem (E2E); selve mappevelgeren må prøves for hånd) |
| MD-18 | Prosjekter i IndexedDB `motiondesign`, autolagring (av som standard), angre/gjør om, Ctrl+S, dra filer inn | B | E | `services/projects` | E2E | T (E2E: lagre og åpne igjen etter omlasting, angre/gjør om; gamle `motiondesign`-prosjekter kopieres inn (U); autolagring AV som standard, som i dagens kode) |
| MD-19 | Forhåndsvisning 4 bilder/s i ro, full fart ved bruk/avspilling; hover-forhåndsvisning av video i biblioteket | B, D | E | `features/motion-design/preview` | M | I (bygget; ikke testet) |
| MD-20 | LUT, fargehjul, former/emoji, proxy, flereksport, gjennomsiktig eksport, stabilisering | D «Gjenstår» | U | Planlegges, ikke krav for paritet | – | – |

## 11. Isolate Subject

| ID | Funksjon | Kilde | Status | Ny modul | Test | Impl |
|---|---|---|---|---|---|---|
| IS-01 | Opplasting (JPG/PNG/WebP/AVIF/GIF/BMP), dra inn, lim inn, delt mappe | B | E | `features/isolate-subject` | E2E | T (E2E: filvelger og Dine medier; dra inn og lim inn er bygget, ikke egen test) |
| IS-02 | Beskjæringssteg etter opplasting (hjørner, flytt, ny ramme, 16:9, hopp over, beskjær på nytt) | B, H 06 | E | `shared/crop` | R | T (E2E: beskjæringssteg; «hopp over» og «beskjær på nytt» bygget) |
| IS-03 | Person – MODNet | B, D | E | `services/ai` (Worker) | R (byte-likt) | T (ekte Chrome 154 med ekte modell, Playwright 2026-10-12: WebGPU ferdig etter 3,9 s; simulert WebGPU-feil → CPU-reserve uten feilmelding, 4,5 s; ny økt uten ny nedlasting. Ikke prøvd manuelt) |
| IS-04 | Objekt – ormbg uint8, 44 MB (var BiRefNet_lite 115/224 MB; byttet 2026-10-12, TB-7BF5C1) | B, H 06 | E | `services/ai` | M | T (Playwright i ekte Chrome 2026-10-12). BiRefNet_lite feilet i ekte Chrome 154 i alle 6 varianter (WebGPU: shaderfeil; WASM: tom for minne etter ~35 s), også med transformers.js 3.8.1 og 4.3.1. ormbg (Apache 2.0): 14 s første gang, ingen ny nedlasting i ny økt; to bildebytter under nedlasting gir én nedlasting; uten GPU virker. Gjelder også Photo Design og Thumbnail Studio. Dagens app: rettet, men ikke prøvd i ekte Chrome (krever innlogging) **Byttet til ormbg godkjent 2026-10-12.** |
| IS-05 | Logo/Tekst – fargenøkkel fra kantfarge (også inni bokstaver), fallback ormbg | B, D | E | `features/isolate-subject` | R | T (E2E: fargenøkkel gir gjennomsiktig PNG i full oppløsning, motivet uendret) |
| IS-06 | Merk i bildet – SlimSAM: trykk/firkant, grønn behold, rød/høyreklikk fjern, nullstill merker | B, D | E | `services/ai` | R | T (ekte Chrome 154, ekte SlimSAM (kvantisert, 2 filer) 2026-10-12: ett trykk på mobilen → «Fjern» ferdig etter 12,6 s; mobil og hånd gjennomsiktige, bakgrunn og hjørne urørt. Firkant uten AI: E2E. Grønn «behold» og flere punkter er ikke kjørt med ekte modell) |
| IS-07 | Fjern objekt med «Fyll med omgivelser» (push-pull-innfylling + støy) – eneste operasjon som endrer piksler | B, D | E | `features/isolate-subject` | R | I (innfylling bygget og enhetstestet i motoren; ikke E2E) |
| IS-08 | Ellers endres motivet aldri, kun alfa-masken | D (krav) | E | `features/isolate-subject` | U (pikselsjekk) | T (E2E: motivet uendret, bare alfa) |
| IS-09 | Bakgrunn: gjennomsiktig, palettfarge, egen farge | B | E | `features/isolate-subject` | R | T (E2E: farget bakgrunn) |
| IS-10 | Finjuster: beskjær til motivet, myke kanter, stram inn kantene | B | E | `features/isolate-subject` | R | T (E2E: beskjær til motivet; myke kanter og stram inn bygget) |
| IS-11 | Sammenlign før/etter, angre siste steg, tilbake til originalen | B | E | `features/isolate-subject` | E2E | T (E2E: angre gir det fjernede tilbake; før/etter og tilbakestill bygget) |
| IS-12 | Last ned PNG, kopier, «Send til …»; dialog etter nedlasting: nytt bilde / annet motiv i samme bilde | B, H 11 | E | `services/export` + `services/assets` | E2E | T (E2E: lagre i Dine medier som ny versjon; last ned, kopier og dialog etter nedlasting bygget) |

## 12. Mockups

| ID | Funksjon | Kilde | Status | Ny modul | Test | Impl |
|---|---|---|---|---|---|---|
| MK-01 | 14 innebygde fotomockups (iMac ×2, MacBook ×2, iPhone ×3, TV ×2, kort ×2, papir …) med `config.json` (hjørner, okklusjon, `keepHoles`, sideforhold) | B `public/images/mockups` | E | `features/mockups/catalog` | U | T (E2E: galleri med innebygde mockups) |
| MK-02 | Brukerens mappe `public/mockups/index.json` (håndskrevet) | B | E | `features/mockups/catalog` | U | T (E2E: samme index.json som dagens app) |
| MK-03 | Egne mockup-bilder i IndexedDB `mockuplib` (legg til, slett), skjermen finnes automatisk | B, H 04 | E | `features/mockups` | E2E | T (E2E: egne mockup-bilder) |
| MK-04 | Kategorier inkl. «Samarbeidsfiler»; galleri; forrige/neste (piltaster) | B, D | E | `features/mockups` | E2E | T (E2E: kategorier; piltaster bygget) |
| MK-05 | Design: last opp (maks 60 MB), dra inn, lim inn, delt mappe; fjern design | B | E | `features/mockups` | E2E | T (E2E: design; maks 60 MB, lim inn bygget) |
| MK-06 | Plassering: fyll/vis hele, zoom, flytt | B, H 04 | E | `features/mockups` | R | T (E2E: juster plassering) |
| MK-07 | Realisme: skygger, glans, behold fingre og ting foran skjermen (okklusjon) | B, H 04 | E | `features/mockups/render` | R | T (E2E: eksport med designet i skjermen; skygge/glans/okklusjon i samme motor) |
| MK-08 | Skjerm: dra fire hjørner (lagres per bilde), finn automatisk, tilbakestill | B, H 04 | E | `features/mockups` | R | T (E2E: hjørner, finn automatisk, tilbakestill) |
| MK-09 | Bakgrunnsfarge, forgrunn av/på | H 04 | E | `features/mockups` | R | I (bygget; ikke egen test) |
| MK-10 | Eksport PNG/JPG (byte-likt i forrige migrering), kopier, send til | B, H 04 | E | `services/export` | R | T (E2E: eksport i full oppløsning; lagre i Dine medier) |
| MK-11 | Husker valgt mockup ved F5 | B `here.js` | E | `app/router` | E2E | I (valgt mockup i adressen `?mockup=`; ikke egen test for F5) |
| MK-12 | Dobbeltklikk på glidebryter nullstiller | B UI | E | `shared/ui/Slider` | K | I (dobbeltklikk nullstiller; ikke egen test) |
| MK-13 | Lokale mockups lastes før skysynk; galleriet blokkeres ikke av skysynk | A `a8515e9`, `e385c67` | G | `features/mockups` (krav) | E2E | T (lokale mockups vises før skyen er hentet; galleriet venter aldri på skyen – E2E kjører uten sky) |

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
