# ConnectHub – testlogg

Resultater per pakke. Alt kjøres mot `connecthub-dev` med syntetiske data. Produksjonen er ikke rørt.

## P4 – innlogging, sperre og lokale data per bruker (2026-10-01)

**Automatiske tester**
- `npm test`: 25/25 (byggesperrer, konfigurasjon, lokale navn per bruker, JWT-verifisering og sperre).
  JWT-testene dekker: gyldig ES256, utløpt, feil `iss`/`aud`, `service_role`, ukjent `kid`, endret signatur, `alg: none`,
  HS256, feil nøkkel, offentlige stier og at Preview avviser tokens fra produksjonen. Sperren stenger når JWKS ikke kan hentes.
- `supabase/tests/rls_test.sql`: 77/77 (inkl. `whoami` for anon/ukoblet/deaktivert og at `link_identity`/`bootstrap_developer` ikke kan kalles av klienter).
- `npm run build`: bygget går gjennom, og sikkerhetssøket i `dist/` fant ingenting.

**API (Auth i connecthub-dev)**
- Innlogging med e-post: 200 for alle 7 testbrukere. Feil passord: `invalid_credentials`.
- Registrering (`/signup`) og OTP med `create_user`: `signup_disabled`.

**E2E i hodeløs Edge med ny nettleserprofil per kjøring (`vite preview`, samme CSP som Vercel)**
| Test | Resultat |
|---|---|
| Direkte URL uten økt → innlogging med `next` | OK |
| Feil passord → «Feil e-post eller passord.» | OK |
| Riktig passord → tilbake til siden; cookie `ch_at` satt | OK |
| Gamle data fra før innlogging → dialog → «Knytt til meg» → eier satt, data synlige, ingenting kopiert | OK |
| Bruker 2 på samme PC: ingen dialog, ser ikke bruker 1 sine data, får egne navn (`photodesign@<id>`) | OK |
| «Logg ut og fjern mine lokale data» (bruker 2): bare bruker 2 sine data slettes | OK |
| Bruker 1 logger inn igjen: data og gammelt prosjekt intakte | OK |
| Logg ut → cookie fjernet → direkte URL sender til innlogging | OK |
| `next=https://evil…` og `next=//evil…` → standardside på samme vert | OK |
| Deaktivert og ukoblet konto → «Kontoen er ikke aktiv»; direkte URL gir samme | OK |
| Glemt passord med ukjent adresse → nøytral melding | OK |
| Gjenopprettingslenke → velg passord; svakt passord avvises; nytt passord virker; samme lenke igjen avvises | OK |
| Developer uten faktor → MFA-oppsett; feil kode avvises; riktig kode → `mfa: true` | OK |
| Ny innlogging for Developer → krever kode → inne med `mfa: true` | OK |

**Funn og rettinger i P4**
- CSP stoppet alle kall til Supabase. De to eksakte prosjektadressene er lagt i `connect-src`. Det er ingen jokertegn.
- `[auth.email] enable_signup = false` i `config.toml` slo av e-postinnlogging. Rettet i filen. Brukeren slo e-postinnlogging på i dashbordet. Registrering er fortsatt av, verifisert med `signup_disabled`.
- Ved sikkerhetsgjennomgangen ble jokertegnadresser for omdirigering erstattet med eksakte verter.

**Kjente begrensninger**
- Sperren i `middleware.js` er bare enhetstestet. Den må verifiseres på Vercel Preview etter push.
- Skillet mellom brukere i lokal lagring gjelder i appen. Det er ikke kryptering, så den som har tilgang til nettleserprofilen, kan lese dataene.
- Den innebygde e-posttjenesten i Supabase sender bare 2 e-poster per time og bare til teamets adresser. Egen SMTP trengs før ekte bruk (P11, godkjennes separat).
- «Hopp over for nå» ved MFA-oppsett gir tilgang som vanlig bruker. Stabsrettighetene er ikke aktive uten aal2, og det håndheves i databasen.

## P5 – ny administrasjon og invitasjoner (2026-10-01)

**Automatiske tester**
- `npm test`: 33/33. 8 nye for API-et: metode, ukjent handling, manglende oppsett, manglende, falsk og feil token, JSON-krav, størrelsesgrense, at databasen bare får hash av tokenet, at svaret aldri inneholder lenken, at godkjenning bruker kontoens bekreftede e-post og ikke data fra forespørselen, og nøkkelsjekk per prosjekt.
- `supabase/tests/rls_test.sql`: 116/116, med 39 nye. Disse dekker hvem som kan invitere hvilke roller, MFA-krav for stab, én ventende invitasjon per adresse, godkjenning bare fra serveren, feil e-post, gjenbruk, tilbaketrukket og utløpt invitasjon, inviterende som har mistet rollen, én admin per menighet, deaktivering av brukere og systemstatus.

**E2E** (`vite preview` med lokal API, testpostkasse i stedet for e-post, ny nettleserprofil per kjøring)
| Test | Resultat |
|---|---|
| Admin-siden uten økt sender til innlogging | OK |
| Menighetsadmin: ser bare egen menighet. Kan bare invitere «Bruker». Fanen «Brukere» vises ikke | OK |
| Invitasjon sendes. Svaret og siden inneholder ikke lenken | OK |
| API: admin inviterer til annen menighet, som admin eller som developer → 403 | OK |
| Vanlig bruker: admin-ikonet er skjult, API gir 403, uten innlogging 401, falskt token 401 | OK |
| Vanlig bruker prøver å godta en invitasjon til en annen adresse → `wrong_email` | OK |
| Ny bruker klikker lenken i e-posten (Auth-lenke) → invitasjonen godtas → velger passord → medlem av riktig menighet. Tokenet er fjernet fra fanen og adressen | OK |
| Samme invitasjonslenke på nytt → avvist | OK |
| Innlogget med feil konto → «Invitasjonen gjelder en annen e-postadresse» | OK |
| Developer med MFA: brukerliste, systemstatus, logg, alle roller i invitasjonsskjemaet | OK |
| Developer deaktiverer konto → brukeren stenges ute med en gang. Aktivert igjen etterpå | OK |
| Admin-invitasjon til Menighet B → ny bruker blir admin og ser medlemmene i B | OK |

**Sikkerhetsbeslutninger**
- Invitasjonslenken går **bare** til den inviterte på e-post, sendt av Auth-tjenesten. Admin ser den aldri. Godkjenning krever innlogging med bekreftet e-post lik invitasjonens. Det hindrer at noen som får tak i en lenke, overtar en eksisterende konto eller oppretter konto i andres navn.
- Serverfunksjonen bruker Bearer-token, ikke cookies, og er derfor ikke sårbar for CSRF. Den hemmelige nøkkelen brukes bare i `server/adapters/supabase.js`.
- Rettighetene håndheves i databasen (`create_invitation` kalles med brukerens token). Serveren kan ikke gi mer enn brukeren har lov til. `accept_invitation` kan bare kalles av serverrollen og sjekker på nytt at den som inviterte, fortsatt har rett.
- Det gamle `api/ml.js` krever nå også gyldig ConnectHub-innlogging. Det og `admin.dc.html` er **beholdt**. Sletting foreslås i sluttrapporten.

**Kjente begrensninger**
- E-post: den innebygde e-posttjenesten i Supabase sender bare til teamets adresser og maks 2 per time. Invitasjoner til andre lagres, men e-posten feiler («Send på nytt» senere). Egen SMTP i P11.
- Vercel må ha den hemmelige nøkkelen for Preview, `connecthub-devSUPABASE_SECRET_KEY` eller `…_SERVICE_ROLE_KEY` fra integrasjonen. Mangler den, svarer API-et 503 `not_configured`. Jeg har ikke endret noe i Vercel, så dette må sjekkes der.
- Lenker i e-post bruker den faste Preview-adressen (`SITE` i `server/lib/backend.js`). Produksjonsadressen settes i P11.
- I revisjonsloggen står opprettelsen av en ny bruker ved godkjenning med «System» som utfører. Resten av godkjenningen står med den nye brukeren.

## P6 – prosjektmapper i Motion Design (2026-10-01)

**Løsning:** `src/shared/project-folder.js` utvider lagringen i Motion Design (`VF.store`) uten å endre motoren:
- **Prosjektmappe:** prosjektet kan få en mappe på PC-en (File System Access API, Chrome og Edge). Video, bilder og lyd skrives til `<mappe>/media/`, og prosjektet til `<mappe>/prosjekt.motion.json` (uten miniatyrbilde). IndexedDB holder da bare en henvisning.
- **Gamle prosjekter:** «Kopier til prosjektmappe» kopierer hver fil og kontrollerer størrelsen i mappen. **Kopien i nettleseren beholdes.** «Frigjør plass i nettleseren» er et eget valg som må bekreftes, og fjerner bare filer som er kontrollert i mappen.
- **Annen PC:** «Åpne prosjektmappe» åpner prosjektet fra mappen. Stier i prosjektfilen må være `media/<fil>`, så andre stier avvises.
- **Sletting:** et mappeprosjekt fjernes bare fra listen. Filene i mappen slettes aldri.
- **Uten støtte for mappevelger (Safari, Firefox, mobil):** alt virker som før, i nettleseren.
- **Mappehenvisninger:** lagres per bruker (`mlfolders@<bruker-id>`, via `local-user.js`).

**Tester** (hodeløs Edge. Den ekte mappevelgeren kan ikke automatiseres, så en OPFS-mappe med samme API ble brukt)
| Test | Resultat |
|---|---|
| Kopier gammelt prosjekt til mappe: filene og `prosjekt.motion.json` ligger der, og miniatyren er ikke med | OK |
| Kopien i nettleseren er beholdt etter kopiering | OK |
| Filene leses fra mappen (`File` med riktig størrelse) | OK |
| «Frigjør plass»: 2 kontrollerte filer fjernet fra nettleseren, og prosjektet er fortsatt lesbart fra mappen | OK |
| Ny fil i et mappeprosjekt skrives til mappen, ikke til nettleseren | OK |
| Prosjekt uten mappe lagrer i nettleseren som før | OK |
| Prosjektet fjernes fra listen og åpnes fra mappen, slik det ville skjedd på en annen PC | OK |
| `../../hemmelig` i prosjektfilen avvises | OK |
| **Nettverkskall under alle lagringsoperasjonene: 0** (video sendes aldri ut) | OK |
| Grensesnitt: «Åpne prosjektmappe» på startsiden, «Prosjektmappe» i editoren og dialog med forklaring | OK |
| `ml-share.js` («Fra delt mappe») og `motion-engine.js` har ingen nettverkskall (gjennomgått i koden) | OK |

**Tolkning og begrensninger**
- «Prosjektinformasjon privat» er tolket som at prosjektinformasjonen bare lagres lokalt og per bruker, i nettleseren eller i prosjektmappen. **Ingen prosjektinformasjon sendes til skyen.** En privat kopi i skyen er ikke laget. Den kan legges til senere med egen godkjenning.
- Valgfri mappemodus for bilder (Photo Design og andre) er **ikke laget**. Bildene lagres fortsatt lokalt i nettleseren. Det er foreslått som videre arbeid.
- Nettleseren kan be om tilgang til mappen på nytt etter omstart. Da vises «Gi tilgang til mappen».

## P7 – delte filer, bare bilder (2026-10-01)

**Løsning**
- **Database** (`20261001140000_files.sql`):
  - `files` har fått `folder` (bilder, logoer, bakgrunner, mockups, faste) og `visibility` (church eller private).
  - Kvoter: 200 MB per menighet (`churches.storage_quota_mb`) og 50 MB private filer per bruker.
  - `can_upload` (som bruker), `register_file` (bare server, med lås per menighet og ny kontroll), `delete_file`, `file_keys` (signering bare for filer brukeren kan se) og `storage_usage`.
  - Private filer ser bare den som lastet dem opp, ikke admin eller stab.
- **Lagring** (`20261001140100_supabase_storage.sql`): privat bøtte `ch-files`, bare bildeformater, maks 4 MB og **ingen** policyer for klienter. Bare serveren kan lese og skrive.
- **Server** (`server/handlers/files.js` og `server/lib/sniff.js`), i denne rekkefølgen:
  1. innlogging
  2. størrelse (maks 4 MB)
  3. innholdskontroll med magiske bytes: bare PNG, JPEG, WebP og GIF godtas, og video gjenkjennes og avvises (MP4/MOV/3GP, WebM/MKV, AVI, MPEG, WMV, FLV, TS, Ogg) uansett navn
  4. rettighet og kvote med brukerens token
  5. lagring med nøkkel fra serveren
  6. registrering

  Feiler registreringen, slettes filen igjen. Visning skjer med signerte lenker som varer i 10 minutter.
- **Klient**: `src/services/files.js` og `src/shared/ch-cloud.js`. Det siste erstatter den gamle `ml-cloud.js` i alle verktøy (Mockups, Photo Design m.fl.) med samme grensesnitt (`MLCloud.files(mappe)`). Bildene hentes som lokale `blob:`-adresser, så eksport fra lerretet virker og lenkene ikke utløper i verktøyene. Fanen «Filer» på admin-siden har opplasting, miniatyrer, kvote og sletting.

**Funnet og rettet:** RLS-testene viste at `delete_file` og `revoke_invitation` slapp gjennom når opplaster eller oppretter var NULL (NOT NULL er NULL). Det er rettet i `20261001140200_null_safe_checks.sql`, og det er laget test for begge. Alle andre tilgangssjekker er gjennomgått for samme mønster.

**Tester**
- `npm test`: 41/41, med 8 nye. Disse dekker:
  - innholdskontroll for alle bildeformater
  - avvisning av MP4, MOV, WebM og AVI forkledd som bilde, og PNG med videonavn
  - avvisning av SVG, HTML, PDF og tom fil
  - størrelsesgrense
  - at ingenting lagres uten tillatelse
  - at filen ryddes bort når registreringen feiler
  - at signering bare gjelder filer databasen gir
- `rls_test.sql`: 139/139, med 23 nye. Disse dekker mapperettigheter, private filer, kvote, at registrering bare kan gjøres av serveren, videoavvisning i databasen og NULL-sikkerhet.

**E2E** (lokal API mot `connecthub-dev`)
| Test | Resultat |
|---|---|
| Admin: PNG til «logoer» | 200 |
| MP4-innhold kalt `bilde.png` | 415 `video_not_allowed` |
| PNG kalt `film.mp4` | 415 `video_not_allowed` |
| SVG med skript | 415 `type_not_allowed` |
| 5 MB | 413 |
| Annen menighet | 403 |
| Uten innlogging | 401 |
| Medlem: «bilder» 200, «logoer» 403, privat fil 200 | OK |
| Medlem i annen menighet: ser 0 filer, signerte lenker for A sine filer gir `{}`, sletting gir 403 | OK |
| Direkte opplasting til fillagringen med brukertoken → avvist av RLS. Listing av bøtta → `[]` | OK |
| `storage_key` kan ikke leses av klienter (403) | OK |
| Signert lenke gir `200 image/png` | OK |
| Photo Design: `MLCloud.files('logoer')` gir logoen som `blob:` | OK |
| Admin-siden «Filer»: miniatyr vises | OK |

**Begrensninger**
- Maks 4 MB per fil, på grunn av Vercels grense for forespørsler. Større bilder krever direkte opplasting med signert lenke, og den er ikke laget.
- Kvoter er faste standardverdier. Stab kan endre `storage_quota_mb`, men det finnes ikke noe grensesnitt for det ennå.
- Feilet sletting i lagringen etter at raden er slettet, kan gi en foreldreløs fil. Den er ikke synlig for noen, men må ryddes av drift.
- Supabase Free gir 1 GB lagring totalt, så kvotene bør vurderes i P11.

## P8 – herding: egne kopier av skript og fonter, strengere CSP, oppbevaringstid for logg (2026-10-01)

**Endringer**
- **Ingen skript eller fonter fra CDN.** `build/vendor.js` henter nøyaktige pakkeversjoner fra npm-registeret (`npm pack`) under bygging, kopierer bare nettleserfilene til `dist/vendor/` og `dist/fonts/` og kontrollerer alle 57 filene mot `build/vendor-lock.json` (SHA-384). Avvik stopper bygget. Pakkene som hentes:
  - transformers.js 3.5.1 med ONNX-wasm
  - tesseract.js 5.1.1 med kjerne 5.1.1 og norske språkdata
  - mp4-muxer 5.1.3
  - qrcode-generator 1.4.4
  - 9 fontfamilier fra Fontsource (OFL, bare latin og latin-ext)

  Kontroll av kildene: SHA-384 fra npm for `qrcode.js`, `tesseract.min.js` og `mp4-muxer.js` er identiske med SRI-hashene som sto i koden fra jsDelivr. Skriptene lastes fortsatt med SRI.
- **CSP:** jsDelivr, Google Fonts og tessdata er fjernet.
  - `script-src` har ikke lenger `'unsafe-inline'`. De to faste inline-skriptene er tillatt med SHA-256, og bygget stopper hvis et inline-skript mangler i CSP-en.
  - `connect-src` tillater bare egen vert, de to Supabase-prosjektene og Hugging Face (AI-modeller, som er data og ikke kode).
- **Innloggingssperren** slipper `/vendor/` og `/fonts/` gjennom, slik at innloggingssiden får fontene sine. Mellomlagring: `/vendor/` i ett år (versjonerte mapper), `/fonts/` i 30 dager.
- **Revisjonsloggen** (`20261001150000_log_retention.sql`): oppbevaringstiden er 24 måneder som standard og minst 12. `app.purge_audit_logs()` kan bare kjøres av drift, og slettingen loggføres selv. Nyere hendelser kan fortsatt aldri slettes.
- Retting av eksisterende feil: Loop Studio forhåndslastet to filer som ikke finnes lenger, og det ga 404.

**Tester**
- `npm test`: 44/44, med 3 nye. Disse dekker fontparseren, at låsen dekker alt, og CSP-regler (ingen CDN, ingen `unsafe-inline` eller `unsafe-eval` for skript).
- `rls_test.sql`: 144/144, med 5 nye for oppbevaringstiden.
- `npm run build`: tredjepartsfilene er kontrollert, og alle inline-skript står i CSP-en.

**E2E** (samme CSP som Vercel, alle sider)
| Test | Resultat |
|---|---|
| Innloggingssiden: Archivo lastet fra `/fonts/`, ingen eksterne verter | OK |
| 10 sider etter innlogging: bare egen vert og `connecthub-dev` som eksterne verter | OK |
| qrcode og mp4-muxer fra `/vendor/` med SRI | OK |
| Tesseract OCR med norske språkdata fra egen vert: leste «SØNDAG 11» | OK |
| transformers.js og ONNX-wasm fra `/vendor/`, MODNet fra Hugging Face: bakgrunnsfjerning kjørte (96×96, 4 kanaler) | OK |

**Begrensninger**
- Fonter dekker latin og latin-ext. Andre skriftsystemer faller tilbake til systemfont.
- Bygget henter pakkene fra npm-registeret (som `npm install`). Uten nett feiler bygget. Hurtigbufferen ligger i `node_modules/.ch-vendor`.
- `dist/` er 57 MB, hovedsakelig ONNX-wasm på 21 MB.
- Server- og funksjonslogger hos Vercel følger Vercels oppbevaringstid. Det finnes ingen egen klientfeillogg lenger, fordi den gamle var knyttet til `api/ml.js` og aldri brukt.
- Automatisk kjøring av sletting etter oppbevaringstid (pg_cron) er ikke slått på. Det vurderes i P11.

## P9 – tester for leverandørbytte (2026-10-01)

**Kontrakttester** (`src/services/contract.test.js`)
- Samme testsett kjøres mot den falske adapteren i minnet (`src/services/adapters/fake/data.js`) og mot den ekte Supabase-adapteren mot `connecthub-dev` med en syntetisk vanlig bruker. Den ekte kjøres når `CH_LIVE_*` er satt.
- Testsettet dekker:
  - valgte kolonner, filter, sortering, grense og `inList`
  - databasefunksjoner
  - at ukjent funksjon gir `not_found`
  - at nektet innsetting og hemmelig kolonne gir `forbidden`
  - at oppdatering av rader brukeren ikke har lov til å endre, gir `[]` uten endring
- Resultat: falsk adapter 3/3, Supabase 3/3. En ny leverandør må bestå det samme testsettet.
- Tjenestelaget er testet mot den falske adapteren: `admin.members` slår sammen data riktig, og `files.upload` stopper video, feil type og for store filer før noe sendes.
- Feilkoder er gjort like for begge: Supabase sine `PGRST202`/`PGRST205` og PostgreSQL sine `42P01`/`42883` gir `not_found`.

**Gjenopprettingsøvelse i vanlig PostgreSQL** (`build/restore-drill.mjs`, `npm run drill`)
- PGlite (`@electric-sql/pglite` 0.5.8, devDependency, Apache-2.0) er en ekte PostgreSQL (versjon 18.3) kompilert til WebAssembly. Den kjører i Node uten installasjon, Docker, nett eller kostnad, og brukes bare i tester.
- Resultat:
  - Alle 9 leverandørnøytrale migreringer kjører uendret. To Supabase-spesifikke ble hoppet over (`bootstrap_developer` og fillagringsbøtta).
  - Hele RLS-testsettet består: **144/144**. Testen av `bootstrap_developer` er gjort betinget.
  - Data eksportert fra `connecthub-dev` (bare syntetiske data, kontrollert) ble gjenopprettet. Alle 8 tabellene har samme radantall, og **8/8 brukere ser nøyaktig sine egne menigheter gjennom RLS**. Det betyr at tilgangsreglene virker uendret i en annen PostgreSQL.
- Skjemadelen kjører også i `npm test`, uten nett.
- **Begrensning:** eksporten er en JSON-eksport av tabellene, ikke `pg_dump`. Den fanger ikke opp Auth-brukere eller filinnhold. Fullverdig sikkerhetskopi og gjenoppretting (PITR, `pg_dump` og filer) hører til P11, der Supabase Pro er planlagt.

**Røyktest av statisk hosting** (`build/static-serve.mjs`)
- `dist/` servert av en vanlig Node-server med headerne fra `vercel.json`:
  - CSP og andre headere sendes, og wasm sendes med riktig type.
  - Stivandring (`../`) gir 404.
  - Direkte URL sender til innlogging, og innlogging virker.
  - Photo Design og Motion Design starter, og fonter lastes.
  - Admin leser data via RLS. Det eneste eksterne kallet går til Supabase.
- Uten Vercel finnes ikke `middleware.js` og `api/` (404, som forventet). En ny vert må koble inn `server/lib/gate.js` og `server/handlers/ch.js`, som allerede er Web-standard (`Request → Response`).

**Automatisk testkjøring:** malen ligger i `docs/ci/github-actions-ci.yml` og er **ikke aktivert**, fordi GitHub Actions er en ekstern tjeneste som krever egen godkjenning.

**Samlet:** `npm test` 51/51, RLS i Supabase 144/144 og RLS i vanlig PostgreSQL 144/144.

## P10 – samarbeid, abonnement, varsler, personvern og menighetens livsløp (2026-10-01)

**Database** (`20261001160000_…`, `20261001160100_…`, vanlig PostgreSQL)
- **Varsler** (`notifications`):
  - Hver bruker ser og kan merke bare sine egne varsler.
  - Varsler lages bare av databasen: når en invitasjon godtas, ved invitasjon til samarbeid, ved avgjørelse om abonnement, ved endret menighetsstatus, og ved melding fra admin til alle medlemmer (maks 20 per døgn).
- **Samarbeidsområder** (`spaces`, `space_members`, `space_files`):
  - Admin oppretter et område og inviterer andre menigheter. Admin i den inviterte menigheten godtar eller avslår, og menigheten kan senere forlate området.
  - Bare fellesbilder kan deles, aldri private filer. Video kan uansett ikke lagres.
  - Deltakerne ser bare filene som er delt. Forlater en menighet området, fjernes filene den har delt.
  - Navnelisten over menigheter (`church_directory`) gir bare id og navn, og bare til admin og stab.
- **Abonnement uten betaling** (`plans`, `church_subscriptions`, `subscription_requests`): admin ber om en plan eller om gratis abonnement, og stab med MFA godkjenner. Godkjenning setter lagringskvoten. Alt loggføres.
- **Menighetens livsløp**:
  - Status kan bare endres via `set_church_status` og bare av stab. Mulige overganger er aktiv, midlertidig deaktivert og «venter på sletting» (30 dager).
  - Eksport (`export_church` og serverhandlingen `church.export`) kan gjøres av admin og stab. Filene følger med som lenker som virker i 1 time.
  - Endelig sletting krever stab med MFA (aal fra det verifiserte tokenet), status «venter på sletting» og at navnet bekreftes. Filene i lagringen slettes, revisjonsloggen beholdes og selve slettingen loggføres.
- **Personvern**:
  - `export_my_data` gir egne opplysninger. Prosjekter og video ligger lokalt og er derfor ikke med.
  - «Slett kontoen min» (`privacy.delete_me`) sletter private filer, ConnectHub-brukeren og innloggingskontoen, og anonymiserer invitasjoner til adressen. Fellesbilder beholdes uten opplaster. Den siste Developer kan ikke slette seg selv.
  - Revisjonsloggen tillater nå akkurat én endring: at koblingen til en slettet person fjernes. Alt annet i loggen er fortsatt uforanderlig.
- **Grensesnitt:**
  - Admin har fått fanene «Samarbeid» og «Abonnement».
  - Under «Menigheter» kan admin eksportere, og stab kan i tillegg endre status og slette for godt.
  - Under «Medlemmer» kan admin sende melding til alle medlemmer.
  - Kontomenyen har fått varsler med teller for uleste, «Last ned mine data» og «Slett kontoen min».

**Tester**
- `rls_test.sql`: **209/209** i Supabase (`connecthub-dev`) og **209/209** i vanlig PostgreSQL (PGlite). 65 tester er nye.
- `npm test`: 55/55, med 4 nye for serverhandlingene. De dekker rekkefølgen ved kontosletting, at et avslag stopper alt, at eksporten bare får lenker til tillatte filer, og at aal hentes fra tokenet.

**E2E** (lokal API mot `connecthub-dev`, syntetiske brukere)
| Test | Resultat |
|---|---|
| Admin A oppretter område, inviterer B og deler et fellesbilde | OK |
| Admin B får varsel (1 ulest), godtar, og B deltar | OK |
| Medlem i B ser bare det delte bildet fra A, ingen andre filer | OK |
| Admin sender melding (3 mottakere). Medlem ser teller og varsel, og «Merk alle som lest» nullstiller | OK |
| Admin ber om gratis Standard, og Developer (MFA) godkjenner. Kvoten er 1024 MB | OK |
| Eksport av menighet: 4 medlemmer og 2 filer med lenke. Admin kan ikke slette menigheten (403) | OK |
| Developer: ny menighet → venter på sletting (31.10.2026) → feil navn avvist → riktig navn slettet | OK |
| new1: eksport av egne data, så «Slett kontoen min». Logget ut, innlogging avvist, innloggingskontoen borte | OK |
| Databasekontroll etterpå: 0 foreldreløse og 0 manglende filer i lagringen. Begge slettingene er loggført | OK |

**Begrensninger**
- Varsler hentes hvert 2. minutt og når fanen blir synlig. Det er ikke sanntid, for å holde appen uavhengig av leverandør.
- Det finnes ingen betaling. `price_nok_month` er bare informasjon, og betaling krever egen adapter og godkjenning (P11 eller senere).
- Endelig sletting etter 30 dager kjøres ikke automatisk. Stab må utføre den.
- Meldinger kommer bare som varsler i appen. E-post krever SMTP (P11).

## Ytelse – hele ConnectHub (2026-10-01)

Målt med Edge (headless) mot lokal `vite preview` og `connecthub-dev`. «Kald» betyr ny nettleserprosess for hver side, som når man åpner et nytt vindu. Mobil er 390 px bred med CPU strupet ×4.

**Flaskehalser som ble funnet**
- **Ordboken (`i18n.js`):** bygget et regulært uttrykk med 2630 alternativer ved hver sidelasting, også på norsk. Det kostet ca. 0,6 s blokkert JS på PC og ca. 3 s på mobil per kald sidelasting.
- **Innloggingsporten:** ventet på `whoami` (databasekall) før noe ble vist, ved hvert sidebytte.
- **Admin, låser og venting:**
  - En global lås avviste alle klikk stille så lenge noe lastet i bakgrunnen, og knappene ga ingen tilbakemelding.
  - Oversikten hentet loggen to ganger.
  - Moderatorens oversikt hentet område for område etter hverandre.
- **Filer og samarbeid:** viste ingenting før alle bildene (originaler på opptil 4 MB, opptil 60 stk.) var lastet ned. Ved hvert mappebytte ble alt hentet på nytt.
- **Varsler:** ble hentet samtidig med sidens egne data på hver side.
- **Motion Design:** tegnet hele forhåndsvisningen 60 ganger i sekundet også når editoren sto i ro.
- **Bakgrunnsanimasjonene:** forsiden og Loop Studio lagde 44 fargeoverganger per bilde. Ingen av bakgrunnene tok hensyn til svake enheter.

**Resultater**
| Måling | Før | Etter |
|---|---|---|
| Kald sidelasting, PC: appen synlig | 780–1160 ms | 110–165 ms |
| Kald sidelasting, PC: blokkert JS | 560–660 ms per side | 0 ms (Photo Design 70 ms) |
| Kald sidelasting, mobil: appen synlig | 3400–3700 ms | 420–650 ms |
| Kald sidelasting, mobil: blokkert JS | 3100–3800 ms | 340–1040 ms |
| Vanlig sidebytte, PC: appen synlig | 107–145 ms | 53–126 ms (venter ikke på databasen) |
| Klikk i admin-menyen | 21–23 ms | 21–23 ms (uendret) |
| Mappebytte i Filer | ny henting av alt, inkl. alle originaler | markert på 6 ms; kjent mappe vises fra hurtigbuffer |
| Motion Design i ro | ca. 60 tegninger/s | 4/s (ved bruk og avspilling fortsatt 61/s) |

**Tester**
- `npm test` 77/77, 7 tester er nye:
  - ordboken gir samme resultat som før på ca. 10 000 tekster, og oppstarten tar under 150 ms
  - hurtigbufferen for «hvem er jeg» gjelder bare samme bruker, økt og MFA-nivå, og utløper og fjernes ved utlogging
  - forhåndslastingen bruker bare egne sider og filer
- Rolletestene i nettleseren for alle fire rollene og for testmodus: uendret resultat.
- Hurtigbufferen for «hvem er jeg»:
  - Forfalskede roller i bufferen ble rettet av databasen ved neste sidelasting, og serveren avviste kallet med 403.
  - Etter utlogging er bufferen fjernet, og en direkte adresse går til innloggingssiden.
- Admin på mobil:
  - Miniatyrbildene lastes.
  - Knappen viser at den jobber, og tre raske klikk gir én nedlasting.
  - Fremdriftslinjen vises, og klikk under lasting blir ikke lenger avvist.

**Gjenstår**
- API-funksjonene på Vercel har ingen fast region, så de kjører trolig i Vercels standardregion i USA, mens databasen ligger i Stockholm (`eu-north-1`). Det gjelder opplasting, bildelenker og invitasjoner. Region krever endring i Vercel-oppsettet og egen godkjenning.
- Målingene er gjort lokalt. Vercel Preview er beskyttet av Vercel-innlogging og kunne ikke måles direkte.

## Samarbeid: Moderator kan endre og slette områder (2026-10-01)

- **Migrering `20261001180000_space_edit.sql`:**
  - Ny kolonne `spaces.description` (valgfri, maks 500 tegn).
  - Ny funksjon `update_space` endrer navn og beskrivelse.
  - Ny funksjon `delete_space` sletter området. Den krever at navnet skrives inn som bekreftelse, fjerner deltakere og delinger, men ikke filene.
  - `set_space_status` loggfører nå også arkivering.
  - Bare Moderator (med MFA) og Developer har tilgang.
- **Databasetester:** 248/248 på `connecthub-dev` og i PGlite. 19 tester er nye. De viser blant annet:
  - Medlem, Admin og Moderator uten MFA blir nektet.
  - Feil navn avvises ved sletting.
  - Filen som var delt, finnes fortsatt etter sletting.
  - Endring og sletting blir loggført.
- **Nettlesertest:**
  - Moderator oppretter et område, endrer navn og beskrivelse og gir Menighet A tilgang.
  - Medlemmet ser beskrivelsen, men får ingen redigering, og sletting via API gir 403.
  - Moderator prøver å slette med feil navn, og det avvises. Med riktig navn slettes området.

## Trinn 19 – Developer endrer pris og lagringskvote per abonnementsplan (2026-10-01/02, connecthub-dev)

**Endringer:**
- Migreringen `20261001200000_plan_editing.sql`: `update_plan`, `plan_change_preview`, `set_church_quota`, `follow_plan_quota` og `churches.quota_custom`. Egen kvote beholdes ved godkjenning, og alt loggføres. Direkte skriving til kvoter og planer er stengt.
- Grensesnittet under Abonnement: redigering for Developer med forhåndsvisning og bekreftelse. Merket «Egen kvote», «Følg planen igjen» og «Egen kvote beholdes (X MB)».
- Ingen pris- eller kvoteverdier er endret. Gratis 200 MB / 0 kr, Standard 1024 MB / Avtales og Utvidet 5120 MB / Avtales er beholdt.
- Ingen kobling til Gratis-planen (G1).

**Tester:**
- **Databasetester:** 59 nye. De dekker alle roller, Developer uten MFA, ikke innlogget, direkte skriving, validering, logg med gammel og ny verdi og hvem, forhåndsvisning, beskyttelse av egne kvoter, avsluttede abonnementer og menigheter uten abonnement. Lavere kvote stopper opplasting uten å slette filer, og egen kvote beholdes ved godkjenning.
- **Tjenestetest:** kvote og pris endres bare via funksjoner, aldri ved direkte skriving.
- **Nettleser:** Developer med MFA får redigering, validering og forhåndsvisning (uten å lagre). Admin, Moderator og User får 403 på alle funksjoner og på direkte skriving.
- **Sjekksum:** plan- og kvoteverdier, filer og lagringsobjekter er uendret.

### Nettlesertester med lagring (plan 19.8, godkjent 2026-10-02)

**Miljø:**
- Lokal `vite preview` av den committede versjonen `d7bd755`, i en egen arbeidskopi uten trinn 18-koden. Kontrollert: ingen `my_links` i bygget.
- Kjørt mot `connecthub-dev` med lokal API.
- Kontoer: bare de syntetiske kontoene `ch-test-dev` (MFA), `ch-test-admin` og `ch-test-user2`.

| Test | Resultat |
|---|---|
| 1. Utvidet: forhåndsvisning før lagring | «Ingen menigheter er knyttet til planen.» |
| 1. Lagre 5121 MB / 1 kr/mnd | Bekreftelsen viser «5120 MB → 5121 MB / Avtales → 1 kr/mnd / 0 menigheter får ny kvote». Verdiene vises i lista og etter ny lasting, og ligger slik i databasen. **OK** |
| 1. Logg | `plans.update` med gammel `{5120, null}`, ny `{5121, 1}`, `churches_updated 0` og hvem (`ch-test-dev`). **OK** |
| 1. Gjenoppretting | 5120 MB / «Avtales» i lista og i databasen, og loggført. **OK** |
| 2. A får egen kvote 1000 MB | Merket «Egen kvote» vises. 1000 MB med egen kvote i databasen. **OK** |
| 2. Admin A ber om Standard, gratis | «Forespørselen er sendt.» **OK** |
| 2. Developer ser forespørselen | Merket «Egen kvote beholdes (1000 MB)» vises. Godkjent. **OK** |
| 2. Etter godkjenning | A har fortsatt 1000 MB med egen kvote. Abonnementet er Standard, gratis og aktivt. Loggen sier «abonnement «standard» godkjent – egen kvote beholdt». **OK** |
| 2. Gjenoppretting | «Følg planen igjen» → 1024 MB uten egen kvote, loggført «følger planen igjen». **OK** |
| 3. user2 laster opp `ch-test-kvotetest.png` i B sin Delt mappe | Lastet opp, 685 byte. SHA-256 `347db23a…5d89c9d` er lik i nettleseren og i databasen. **OK** |
| 3. B får egen kvote 0 MB | 0 MB med egen kvote. **OK** |
| 3. Opplasting av `ch-test-kvotetest-2.png` ved 0 MB | **Blokkert** (HTTP 429). Ingen ny rad og intet nytt lagringsobjekt (fortsatt 6 og 6). **OK, men se avvik 1** |
| 3. Nedlasting ved 0 MB | Virker: 685 byte med samme SHA-256 `347db23a…5d89c9d` som ved opplasting. Filen står fortsatt i lista. **OK** |
| 3. Gjenoppretting | «Følg planen igjen» → B har 200 MB uten egen kvote (G1, uten abonnement). user2 slettet testfilen («Filen er slettet.»), og raden og lagringsobjektet er borte. **OK** |

**Sjekksum før og etter** (plan- og kvoteverdier, merket for egen kvote, abonnementer, menigheter, medlemskap, roller, brukere, alle filrader, alle lagringsobjekter, menigheten «12», kontoen din og skjermbildet ditt):
- **Alt er identisk.**
- Testfiler etterpå: 0.
- Eneste forskjell: abonnementsforespørsler 1 → 2. Det er den godkjente forespørselen fra test 2 og et forventet spor.
- Andre forventede spor: nytt tidspunkt og ny utfører på A sitt abonnement (innholdet er likt), varsler til Admin A, nye loggrader, og TOTP-faktoren til `ch-test-dev` er lagt inn på nytt (som i tidligere E2E).

**Avvik:**
1. **Misvisende feilmelding når kvoten er brukt opp.**
   - Databasen avviser med «Menighetens lagringskvote er brukt opp» (SQLSTATE 54000).
   - `server/lib/http.js` (`dbError`) gjør alle 54000 om til `429 rate_limited`, så brukeren ser «For mange forsøk. Vent litt.».
   - Sperren virker. Bare teksten er feil.
   - Feilen fantes før trinn 19 og gjelder også private kvoter.
   - **Ikke rettet** (ikke en del av godkjenningen). Forslag: egen kode, f.eks. `quota_exceeded` med teksten «Lagringskvoten er brukt opp.», for kvotefeil.
2. **Underveis i testskriptet:** to selektorer traff ikke (menighetslista, og navigasjon før siden var lastet).
   - Ingenting ble lagret i de forsøkene, og databasen var uendret (kontrollert).
   - Rettet i skriptet og kjørt på nytt.

**Gjenstår:** ingenting for trinn 19 utover avvik 1, som krever egen godkjenning.

### Feilretting av avvik 1: egen melding når lagringskvoten er brukt opp (2026-10-02)

**Retting:**
- 54000 med kvotemelding fra databasen gir `413 quota_exceeded` og meldingen «Lagringskvoten er brukt opp.» (EN: «The storage quota has been used up.»).
- Andre 54000-feil gir fortsatt `429 rate_limited` med «For mange forsøk. Vent litt.».
- Ingen databaseendring.

**Tester:** `server/handlers/quota-error.test.js` har 9 tester, alle bestått:
- `dbError` for menighetens og den private kvoten
- uendret svar for hastighetsgrenser, feil uten melding og andre SQLSTATE
- alle 54000-meldinger i migreringene klassifiseres riktig
- serveradapteren tar med databasens melding
- opplasting avvist i `can_upload` og i `register_file` (lagret fil ryddes)
- databasens melding sendes ikke til nettleseren
- nedlasting påvirkes ikke
- tekst og engelsk oversettelse

**Resultater:**

| Kjøring | Resultat |
|---|---|
| `npm test` i arbeidskopien (med trinn 18-filene) | 91/91 |
| Isolert: `d7bd755` + bare denne rettingen, `npm test` | 87/87 |
| Isolert: `npm run build` | OK. Sikkerhetssøket i bygget har ingen funn, og alle inline-skript står i CSP. |

**Siste kontroll før commit** (etter trinn 18, 20 og 21): `npm test` 97/97 (`quota-error.test.js` og `storage-full.test.js` 13/13), RLS i PGlite 411/411, bygg OK. Den samlede grensen (trinn 20, SQLSTATE 53100 → `storage_full`) påvirkes ikke: bare 54000 med kvotemelding blir `quota_exceeded`.

**Ikke prøvd mot dev:** kvotefeilen kan ikke utløses der uten å endre kvoter eller laste opp mye, siden filer er maks 4 MB og kvotene er minst 200 MB. Enhetstestene bruker PostgREST sitt feilformat (`{code, details, hint, message}`).

## Trinn 18 – Koblinger og Samarbeidsfiler mellom to menigheter (2026-10-02, connecthub-dev)

**Omfang:**
- Koblinger mellom nøyaktig to menigheter med egen Samarbeidsfiler-mappe. Bare Moderator oppretter, avslutter og gjenåpner.
- Overføring som kopi:
  - fra Delt mappe av alle medlemmer
  - fra Faste bare av Admin
  - aldri private filer
- Fjerning bare av Admin i menigheten som bidro.
- **Filtilgang:**
  - A1: Developer bare via medlemskap
  - A2: Moderator bare metadata
  - M1: Faste bare for Admin
- Verktøyene viser Samarbeidsfiler i et eget område (A4). Feilen der Mockups aldri viste skybilder (`f.path`), er rettet.

**Tester:**

| Kjøring | Resultat |
|---|---|
| `npm test` (kandidat: 123b529 + trinn 18) | 83/83 |
| RLS i PGlite | 381/381 |
| RLS mot dev | 381/381 |
| Bygg | OK. Sikkerhetssøket har ingen funn. |

**Nettleser** (lokal `vite preview` av kandidaten mot dev, bare syntetiske kontoer og CH-test-menighetene):

| Steg | Resultat |
|---|---|
| Moderator oppretter koblingen A–B | «Koblingen er opprettet». Samme par igjen gir 409. Menyen viser Oversikt og Samarbeid. |
| Medlem i A | **Fanen Samarbeidsfiler vises.** Kopi fra Delt mappe med dialogen «… mellom A og B … Originalen blir liggende i «Delt mappe»». **Ingen kopiknapp:** på privat fil eller i Faste. **Avvist:** API-kopi fra Faste (403). **Ingen fjerningsknapp** for medlem. |
| Admin A | Kopi av logoen fra Faste (Logoer). «Fjern fra Samarbeidsfiler» vises på egne bidrag. `create_link` gir 403. |
| Medlem i B | **Ser kopiene** under «Fra CH-test Menighet A», uten fjerningsknapp. **Nedlasting:** SHA-256 er lik originalene (`94f01e35…`, `f3d9fa1a…`). **Ser aldri A sine vanlige filer** (REST tom). **Avvist:** `can_transfer` for A sin fil (403) og fjerning av A sin kopi (403). **Verktøy:** Photo Design-skyen gir gruppen «… – …» med begge kopiene, og vanlige logoer er tomme for B. |
| Moderator | Bare filnavn, størrelse, menighet og dato. Ingen miniatyrer, ingen filrader (REST tom) og ingen nedlastingslenker (`urls: {}`). |
| Developer (medlem av A, ikke av B) | Menyen har ikke Samarbeid. Ser Samarbeidsfiler i A, uten fjerning (ikke Admin). B gir «Du er ikke medlem av denne menigheten …». `create_link` gir 403. |
| Bruker uten medlemskap | Samarbeidsfiler og `my_links` er tomme. |
| Avslutt og gjenåpne | Avsluttet: fanen er borte for B, og REST er tom. Gjenåpnet: begge kopiene er synlige igjen. Ingenting er slettet. |
| Opprydding | Admin A fjernet begge kopiene. Bekreftelsen nevner originalmappen, og originalene finnes. Koblingen er avsluttet. |

**Data:**
- Øyeblikksbildet før og etter (planer, kvoter, menigheter, abonnementer, medlemskap, roller, brukere, filrader og lagringsobjekter med sjekksum, «12», kontoen din og skjermbildet ditt): **alle 14 felt er identiske**.
- **Varige spor:** én avsluttet testkobling (CH-test A–B), loggrader og varsler til de syntetiske Admin-kontoene.

## Trinn 20 – Samlet lagringsgrense for hele ConnectHub (2026-10-02, connecthub-dev)

**Omfang:**
- Grensen `storage_settings.total_limit_mb` er 1024 MB som standard og gjelder alle filer til sammen.
- **Kontroll ved opplasting og kopi til Samarbeidsfiler:** først menighetens kvote (54000), så den samlede grensen (53100).
- **Server:** `507 storage_full` med meldingen «Lagringsplassen i ConnectHub er full. Kontakt Developer.».
- **Lås:** én felles lås ved registrering.
- **Overbooking** er tillatt.
- **Developer med MFA:** oversikt og endring (loggført), og varsel ved 80 % og 90 %.
- **Måleren** viser det minste av ledig kvote og ledig samlet plass.

**Tester:**

| Kjøring | Resultat |
|---|---|
| `npm test` (kandidat: 6aca85c + trinn 20) | 88/88 |
| RLS i PGlite | 411/411 |
| RLS mot dev | 411/411 |
| Bygg | OK. Sikkerhetssøket har ingen funn. |

**Migreringen i dev:**
- Tørrkjøringen viste bare `20261002200000_total_storage_limit.sql`.
- Øyeblikksbildet før og etter: alle 14 felt er identiske.

**RLS-testene for trinn 20 (30 nye) dekker:**
- **Tilgang:** anon, User, Admin, Moderator og Developer uten MFA kan ikke endre grensen eller se oversikten, og direkte lesing og skriving avvises. Ugyldige verdier avvises. Endringen loggføres med gammel og ny verdi og hvem.
- **Full samlet plass med ledig kvote:** medlemmet ser 0 ledig samlet plass. Opplasting, kopi til Samarbeidsfiler og serverregistrering gir 53100, og ingen rad opprettes. Nedlasting virker. Menighetens kvote kontrolleres først (54000).
- **Sletting** frigjør plass.
- **Varsel:** Developer får varsel ved 80 %, og andre roller får det ikke.

**Nettleser** (lokal `vite preview` av kandidaten mot dev):

| Steg | Resultat |
|---|---|
| Developer: Abonnement | Kortet «Samlet lagringsplass» viser «Brukt 0.1 MB av 1024 MB», «Summen av alle menighetenes kvoter: 1424 MB (3 menigheter) · Overbooket». |
| Developer setter grensen til 1 MB (midlertidig) | Bekreftelsen viser «1024 MB → 1 MB … Ingen filer slettes». «Den samlede lagringsgrensen er endret.» Innstillingene for A viser varsel om overbooking. |
| Medlem i A | Måleren viser «Ledig: 0.9 MB (begrenset av samlet lagringsplass i ConnectHub)». Opplasting av et bilde på 1,9 MB stoppes med «Lagringsplassen i ConnectHub er full. Kontakt Developer.» (507). |
| Developer setter grensen tilbake til 1024 MB | OK |

**Data:**
- Grensen er tilbake på 1024 MB.
- Alle 14 felt i øyeblikksbildet er identiske med tilstanden før migreringen.
- **Varige spor:** to loggrader (`storage.limit` 1024 → 1 → 1024). Ingen varsler (80 % ble ikke passert).

## P11 – ConnectHub i produksjon (2026-10-02)

**Godkjent med «Ja, start siste ting».** Nettadressen er `https://media-lab-react-vyef.vercel.app` (fast Vercel-adresse), og regionen er `arn1`.

| Steg | Resultat |
|---|---|
| `main` (hastefiks `9c536f9`) slått inn i `connecthub` | `d3b3d13`. Konflikten i `api/ml.js` er løst med `connecthub`-versjonen, uten innholdsendring. |
| Produksjonsadresse og region | `e74abc5`: `SITE.production` er satt, og `vercel.json` har `"regions": ["arn1"]`. |
| Lokalt produksjonsbygg før publisering | **Avdekket feil:** rollebytteren hadde utviklingsprosjektets ID i koden, og byggevakten stoppet bygget. Rettet i `c6757e8`: ID-en settes bare inn i bygg som ikke er produksjon. Produksjonsbygget har 0 treff på dev-ID og er godkjent av vakten. 97/97 tester. |
| Supabase-produksjon (`cmuienhheklcgtfmpvbe`), migreringer | Databasen var tom før kjøring. Tørrkjøringen viste nøyaktig 20 migreringer, og alle 20 er kjørt. 17 tabeller, alle med RLS. Bøtta `ch-files` er privat, med 4 MB grense og bare bildetyper. Planene er 200/1024/5120 og samlet grense 1024 MB. |
| RLS mot produksjon | **411/411.** Transaksjonen rulles tilbake, og ingen data ble igjen. |
| Auth-innstillinger | Lagt inn med en egen produksjonskonfigurasjon, ikke repoets dev-fil. **Endret (6 innstillinger):** Site URL `https://media-lab-react-vyef.vercel.app`, Redirect URL `https://media-lab-react-vyef.vercel.app/**`, registrering av, minst 10 tegn med bokstaver og tall, og sikker passordendring. TOTP er på. Ikke-deklarerte innstillinger (SSL, tilkoblingsgrenser) er urørt. |
| Vercel Production | `connecthubSUPABASE_URL` og `connecthubSUPABASE_PUBLISHABLE_KEY` er lagt inn (Config), og `connecthubSUPABASE_SECRET_KEY` som **Secret**. Verdiene gikk direkte fra Supabase CLI til Vercel og ble aldri vist. Integrasjonens `VITE_SUPABASE_*`-variabler er ikke slettet (se merknad). |
| Publisering | `main` er spolt fram til `c6757e8`. Produksjonsbygget ble «Ready». |
| Røyktest uten innlogging | Alle sider gir 307 til `/login.dc.html?next=…`. Innloggingssiden gir 200, med CSP og HSTS. `X-Vercel-Id` er `arn1`, og `version.json` er `c6757e8`. `/api/ch` og `/api/ml` gir 401 uten gyldig innlogging. Nettleserkoden peker bare mot produksjonsprosjektet (0 treff på dev-ID, ingen nøkler). |
| Første Developer | Innloggingskontoen er opprettet med bekreftet e-post og **uten passord**. Den er koblet med `app.bootstrap_developer` (rolle `developer`, loggført). Produksjonen har 1 bruker, 0 menigheter og 0 filer. |

**Merknad om `VITE_SUPABASE_*`:**
- Variablene fra Supabase-integrasjonen (blant annet hemmelige nøkler) finnes fortsatt i Vercel Production. De blir aldri med i bygget, fordi `vite.config.js` låser Vite-eksponeringen til et prefiks ingen variabel bruker, og byggevakten søker etter nøkler.
- De er ikke slettet, fordi de styres av integrasjonen. Fjerning bør gjøres i integrasjonsinnstillingene ved en senere anledning.

**Gjenstår (brukeren):**
1. Legg inn SMTP for Gmail i Supabase.
2. Sett passord via «Glemt passordet?».
3. Første innlogging med totrinnsbekreftelse.
4. Opprett menigheter og send invitasjoner.

## Tilbakemeldinger (trinn 8), førsteversjon (2026-10-02, connecthub-dev)

**Implementert:**
- **Knapp på alle innloggede sider.** Kontrollert på Photo Design, Mockups, forsiden og ConnectHub Admin.
- **Skjema:**
  - fire kategorier med tilpassede spørsmål
  - markering av element eller område med mus og berøring
  - automatisk teknisk kontekst og feilfangst
- **Innboks for Moderator og Developer:** filtre, saksdetaljer, status og notater med historikk, «Kopier sak til Claude» og «Kopier alle saker til Claude» (alle viste eller avhukede, med oppdeling av store eksporter).
- **Ikke med:** skjermbilde. Det er utsatt fordi det krever et tredjepartsbibliotek eller nettleser-API med samtykke.

**Tester:**

| Kjøring | Resultat |
|---|---|
| `npm test` | 108/108 (`feedback-core.test.js` 8, tjenestetest 1, menytilgang 1 ny) |
| RLS (PGlite og dev) | 455/455. 44 nye: tilgang for alle roller, MFA, direkte tabelltilgang, validering, rensing, menighet bare ved medlemskap, statusflyt, avvisning med begrunnelse, historikk, logg og grense på 20 per døgn. |
| Bygg | OK. Sikkerhetssøket har ingen funn. |
| Migrering i dev | Bare `20261003100000_feedback.sql`. Alle 14 felt i øyeblikksbildet er like før og etter. |

**Nettleser (lokal preview mot dev, syntetiske kontoer):**

| Rolle | Resultat |
|---|---|
| User, PC | Ikonet står ved kontoknappen uten overlapp. Spørsmålene tilpasses kategorien. Markering med mus identifiserer knappen «Instagram 1:1 …», og klikket går ikke gjennom til siden. Teknisk kontekst inneholder miljø, bygg, commit/gren, nettleser og skjerm. Ved nettverksfeil vises en melding, og teksten beholdes. Bekreftelse og referanse vises først etter lagring. Feil, forbedring og ny funksjon er sendt inn. For kort beskrivelse gir en melding. Lukking med tekst krever bekreftelse. Innboksen er avvist via API og tabell (403). |
| User, mobil (390×844, berøring) | Skjemaet fyller skjermen. Område markert med berøring, «velg på nytt», «fjern markering» og innsending virker. |
| Admin | Menyen har ikke Tilbakemeldinger. Direkte adresse gir «Ingen tilgang». API-et gir 403. Admin kan sende inn. |
| Moderator | Nyeste øverst. Filtrene for kategori, applikasjon, miljø og dato virker. «Kopier sak» gir 6 seksjoner uten e-post, nøkkel eller navn. «Kopier alle» og utvalg gir riktig antall. Kopiering endrer ingen data. Mislykket kopiering viser et reservevindu. Status og notat lagres med historikk. Innboksen virker på mobil. |
| Developer | «Trenger mer informasjon». Avvisning uten begrunnelse stoppes med melding. Avvisning med begrunnelse lagres med historikk. |

**Testdata i dev:** 11 syntetiske tilbakemeldinger fra testkontoene.

## Planverdier, CSP per miljø, e-postmaler og regresjon (2026-10-02, connecthub-dev)

**Planverdier i dev:**
- Standard er endret fra 1024 til 200 MB i nettleseren av den syntetiske Developer-kontoen med MFA (Abonnement → Endre). Endringen er loggført som `plans.update`.
- Gratis var allerede 200 MB / 0 kr. Utvidet (5120 MB, opprettet av den første migreringen) er ikke rørt.
- Øyeblikksbildet før og etter viser bare endringen i `plans`. Menighetenes kvoter er uendret.

**Kvoten håndheves:**
- Menighet A fikk midlertidig 1 MB egen kvote.
- En liten opplasting (0,02 MB) ble godtatt.
- En stor opplasting (2,8 MB) ble stoppet med «ch-test-reg-stor.png: Lagringskvoten er brukt opp.». Den samme opplastingen direkte mot serveren gir `413 quota_exceeded`.
- Menighet A er satt tilbake til egen kvote 1024 MB, som var startverdien.

**CSP per vert (`vercel.json` + `build/csp.js`):**
- Produksjonsadressen får CSP uten `uatpdmhnwwjgzlxaucsx`. Alle andre verter får begge prosjektene. Nøyaktig én CSP per svar.
- `build/csp.test.js` (3 tester), og lokalt med `static-serve`:
  - produksjonsverten: uten dev-ref
  - ConnectHub Dev-verten og localhost: med dev-ref
- Bygget sjekker at alle inline-skript står i begge CSP-ene.

**Norske e-postmaler (`supabase/templates/`):**
- `config push` til dev ble avvist av Supabase: «Email template modification is not available for free tier projects using the default email provider». Ingenting ble endret, og `config diff` er som før.
- Malene er derfor kommentert ut i `supabase/config.toml` til dev får egen SMTP. Produksjonen (Gmail-SMTP): se `docs/produksjonsplan-trinn8.md` §5.

**Sikkerhetskopi og lekkede passord (bare lesing):**
- `supabase backups list` for dev og produksjon: `backups: []` og `pitr_enabled: false`.
- Beskyttelse mot lekkede passord krever Supabase Pro.

**Vercel-variabler (bare navn, ingen verdier lest):**
- Ubrukte variabler: 19 i Production (`VITE_SUPABASE_*` / `NEXT_PUBLIC_VITE_SUPABASE_*`) og 14 i Preview. Ingen er fjernet; listen står i produksjonsplanen §7.
- Produksjonens offentlige filer er søkt gjennom uten funn av nøkler, JWT med service_role eller database-URL med passord.

**Regresjon (lokal preview av arbeidskopien mot dev, syntetiske kontoer):**

| Område | Resultat |
|---|---|
| Innlogging og MFA | User, User2 og Admin med passord. Developer og Moderator med TOTP gir `aal2`. |
| Roller | User: Oversikt, Menigheter, Filer. Innboksen gir «Ingen tilgang», og invitasjon gir 403. Admin: uten Tilbakemeldinger. Developer: alt utenom Samarbeid. Moderator: Oversikt, Samarbeid, Tilbakemeldinger. Moderator får 403 på `set_church_quota` og `update_plan`. |
| Filtilgang | User2 (Menighet B) leser Menighet A sine filer → `[]`. Opplasting til A → 403. `MLCloud.files` viser bare egen menighet. |
| Invitasjon | Admin inviterer → e-post til testpostkassen. Invitasjon til annen menighet eller som Developer → 403. Lenken → «Invitasjonen er godtatt. Velg passord» → innlogget som medlem av Menighet A. Tokenet er fjernet fra fanen. Samme lenke på nytt → 400 (kan ikke brukes igjen). |
| Gammel admin | `/admin.dc.html` og `/api/ml` → 404. |
| Dev-merke | «UTVIKLING · connecthub-dev» vises. «Åpne ConnectHub Dev» vises ikke utenfor produksjon (som forventet). |
| Tilbakemeldinger på mobil (390×844, berøring) | Ikonet er 30×30. Trykkflaten når 6 px ut til venstre og oppover. Mot kontoknappen deler de mellomrommet, og begge kan trykkes. Panelet åpnes med berøring, og innsending gir referanse. |
| Automatiske tester | `npm test` 111/111. RLS mot dev 455/455. |

**Testdata lagt til i dev:**
- Filen `ch-test-reg-liten.png` (Delt mappe, Menighet A).
- Den syntetiske brukeren `ch-test-reg…@example.com` (medlem av Menighet A).
- 1 tilbakemelding, til sammen 12. Alle 12 er fra testkontoer, og 4 hendelser er knyttet til dem. Bare `feedback_events` peker på `feedback`, og loggradene (`feedback.*`) kan ikke slettes.

Dine data (konto, menighet «12» og skjermbildet) er uendret.

## Produksjon: tilbakemeldingssystemet publisert (2026-10-02)

**Databaseendringen:** `20261003100000_feedback.sql` ble kjørt av brukeren med `db push` (bare den, kontrollert med tørrkjøring). Kontroll etterpå, bare lesing:
- 21/21 databaseendringer registrert.
- Alle 14 kontrollfeltene er like før og etter.
- Strukturen er identisk med dev: tabeller, kolonner, rettigheter, RLS-regler, 98 funksjoner og triggere.
- `feedback` og `feedback_events` var tomme, med RLS og uten regler eller tabelltilgang for klienter.

**Publiseringen:** `main` ble spolt fram til `4d878ac`:
- gammel admin fjernet
- «Åpne ConnectHub Dev»
- tilbakemeldinger

Ikke med: CSP, e-postmaler og `2e8f44c`.

Før publisering ble `4d878ac` bygget lokalt som produksjonsbygg:
- sikkerhetssøket hadde ingen funn
- ingen dev-ID i bygget
- 108/108 tester

Etter publisering:
- Vercel-bygget er grønt, og `version.json` = `4d878ac…`.
- `/api/ml` → 404.
- `/admin.dc.html` → 307 til innlogging uten økt (sperren gjør det samme for alle sider). Filen finnes ikke i bygget.

**Test B (uten innlogging, offentlig nøkkel og falskt token):**
- `feedback_list`, `feedback_events_for`, `set_feedback_status`, `add_feedback_note` og `submit_feedback`, kalt med ugyldige verdier → 401 `permission denied`.
- Direkte lesing av `feedback` og `feedback_events` → 401.
- Falskt token → 401 `PGRST301`.
- ConnectHub Admin → 307 til innlogging.
- Øyeblikksbildet før og etter: ingen felt endret (1 tilbakemelding, 0 hendelser, 1 loggrad `feedback.*`, alt fra brukerens egen test).

**RLS-testsettet mot produksjon: ikke kjørt.** Testene skriver loggrader som rulles tilbake, men telleren for `audit_logs.id` (identity) går ikke tilbake. Revisjonsloggen ville få hull i nummereringen. Venter på brukerens beslutning.

**Dev (`connecthub`), ikke publisert:**
- Kopiknappene heter nå «Kopier sak», «Kopier alle saker» og «Kopier valgte saker» (`2e8f44c`).
- Toppfeltet viser rollen: «CONNECTHUB · BRUKER / ADMIN / MODERATOR / DEVELOPER» (`brandOf` i `access.js`, testet). Kontrollert i nettleseren for alle fire rollene.

## Moderator med systemadministrasjon (2026-10-02, connecthub-dev)

**Migrering `20261004100000_moderator_access.sql` (dev):**
- `app.is_staff()` = Developer eller Moderator.
- `app.may_invite`: Admin-rollen kan inviteres av Developer eller Moderator, Developer/Moderator bare av Developer.
- `set_user_status`: bare Developer kan endre kontoer med rollen Developer eller Moderator.
- Kvote, planer og samlet lagring (`church_quota_overview`, `plans_admin`, `reset_church_quota`, `set_church_quota`, `set_storage_limit`, `storage_overview`, `update_plan`) godtar Developer eller Moderator. Funksjonskroppene er ellers uendret.
- Ingen tabeller, data eller filregler er endret.
- Tørrkjøring: bare denne filen.

**RLS:** 462/462 i PGlite og i dev.
- Tilpasset: Moderator-testene som nå skal godtas. De kjøres med den nye hjelperen `ch_test.ok_rb`, som ruller handlingen tilbake.
- Nye: Moderator kan ikke tilbakekalle Developer, fjerne egen moderatorrolle, gi seg selv Developer, invitere Moderator/Developer, deaktivere Developer, endre egen status eller deaktivere en annen Moderator.
- Filtestene A1/A2 er uendret: Moderator ser ingen filrader og får ingen nedlastingsnøkler.

**`npm test`:** 112/112.
- `access.test.js`: Moderator har samme meny som Developer, pluss Samarbeid.
- `test-role.test.js`: Moderator har ikke rollebytteren.

**Nettleser (lokal preview mot dev, egne syntetiske kontoer):**

| Rolle | Resultat |
|---|---|
| Moderator | **Meny:** Oversikt, Brukere, Menigheter, Invitasjoner, Filer, Samarbeid, Abonnement, Tilbakemeldinger og Logg. Tittel «CONNECTHUB · MODERATOR». Oversikten har Samarbeid-kortet, men verken Utvikler-kortet, «Åpne ConnectHub Dev» eller Testrolle. `#/utvikler` viser Oversikt uten utviklerkort.<br>**Tilgang:** alle menigheter (med «Ny menighet»), innstillinger med kvoteskjema, Abonnement med «Samlet lagringsplass» og Endre, Logg, alle 9 brukere. Filer: «Du er ikke medlem … også for Developer og Moderator.» Ny invitasjon tilbyr bare `user` og `church_admin`. Koblingen A–B ble gjenåpnet og avsluttet igjen, og står som før. RPC `system_status`, `plans_admin`, `storage_overview` og `feedback_list` → 200.<br>**Avvist (403):** gjøre en bruker til Developer eller Moderator, gi seg selv Developer, fjerne Developer-rollen, deaktivere Developer («Bare Developer kan endre en Developer eller Moderator»), invitere Moderator eller Developer via serveren, skrive direkte i `user_roles`. Developer-kontoen viser ingen rolle- eller kontoknapper, bare forklaring. En vanlig konto viser «Deaktiver konto». Med developer-rolle lagt inn i `CH.me` → serveren svarer fortsatt 403. Med `ch.testRole=developer` i sessionStorage er visningen fortsatt Moderator uten utviklerverktøy. |
| Developer | Meny uten Samarbeid (`#/samarbeid` → «Ingen tilgang», uendret). Utvikler-kortet, merknaden «Du er i ConnectHub Dev» og Testrolle vises. Moderator-kontoen viser «Fjern», «Gjør til Developer» og «Deaktiver konto». Ny invitasjon tilbyr `user`, `church_admin`, `moderator` og `developer`. `plans_admin` og `church_quota_overview` → 200. |
| Admin | Menyen er uendret, uten Samarbeid og Tilbakemeldinger (direkte adresse → «Ingen tilgang»). Ny invitasjon tilbyr bare `user`. `system_status`, `plans_admin`, `assign_role`, `set_user_status` og `create_link` → 403. |
| User | Oversikt, Menigheter, Filer. `#/brukere` og `#/abonnement` → «Ingen tilgang». `system_status` og å gi seg selv Moderator → 403. Ser bare Menighet B, og filene i A → `[]`. |

**Merk:** brukerens egen Developer-konto slettet skjermbildet i menighet «12» i dev (`files.delete`, 2026-10-02 11:32 UTC) og endret kvoten der. Det skjedde under dette arbeidet, men ble ikke gjort av migreringen eller testene.

## Én menighet om gangen, fjerning av medlemskap og samarbeid (2026-10-02, connecthub-dev)

**Migreringer (dev):**
- **`20261005100000_single_church.sql`:**
  - Ny status `removed` på medlemskap.
  - Triggeren `memberships_single_church` (lås per bruker, SQLSTATE `CH001`).
  - Policyen `memberships_update` endrer bare mellom `active` og `disabled`.
  - `add_membership`, `remove_membership` (`CH003` når menigheten ville stått uten Admin) og `memberships.remove` i loggen.
  - `create_invitation` og `accept_invitation` gir `already_member_elsewhere`.
- **`20261005100100_removed_member_files.sql`:** etter fjerning ser eller sletter eieren ikke lenger egne filer i den menigheten (`app.can_see_file`, `delete_file`).
- Begge er tørrkjørt (bare én fil hver gang), og alle 14 kontrollfelt er like før og etter.

**Eksisterende medlemskap:** ingen konflikter, ingen bruker uten global rolle er aktiv i mer enn én menighet.
- `ch-test-user2` er aktiv i «12» (som Admin) og har et deaktivert medlemskap i B. Det er lov, men B kan ikke aktiveres igjen så lenge «12» er aktiv.
- Produksjonen har én bruker (Developer) og er ikke lest.

**RLS:** 510/510 i PGlite og i dev, hvorav 48 nye: User og Admin i en annen menighet (direkte i databasen, via API, `add_membership`, invitasjon, godkjenning, ny aktivering av deaktivert medlemskap), Developer og Moderator unntatt, samtidige invitasjoner (bare én godtas, den andre står fortsatt som ventende), fjerning av Admin og vanlig medlem, rettigheter, logg, at fjernet medlemskap ikke kan aktiveres direkte, tilgang etter fjerning (menighet, filer, egne filer, nedlastingsnøkler, sletting, whoami), og at medlemskapet kan legges til igjen.

**Samtidighet (ekte, to databaseøkter mot dev):** økt 1 la `ch-test-reg…` inn i B og holdt transaksjonen åpen i 5 s. Økt 2 prøvde å aktivere A og ventet 3,9 s på låsen. Deretter: «AVVIST CH001». Testbrukeren er satt tilbake: aktiv i A, med en ny rad «fjernet» i B.

**`npm test`:** 116/116 (`members.test.js`: 4 nye).

**Nettleser (lokal preview mot dev):**

| Rolle | Resultat |
|---|---|
| Admin (A) | Brukerskuffen viser Bruker, Konto, Rolle og Menighet. Handlinger: «Deaktiver midlertidig» og «Fjern fra menigheten». Avbryt i bekreftelsen endrer ingenting. Invitasjon av en som er medlem i en annen menighet → 409 `already_member_elsewhere`, og skjemaet viser forklaringen. Fjerning bekreftet: «User Test er fjernet fra CH-test Menighet A. Brukeren har nå ingen aktiv menighet.» Etterpå vises «Ingen aktiv menighet» og «Tidligere medlem av: CH-test Menighet A». |
| User (fjernet) | `CH.me.churches` = []. Oversikten: «Du er ikke medlem av noen menighet ennå». Menighet A og filene der → [] (også egen private fil, etter tilleggsmigreringen). Opplasting → 403. |
| Moderator | Brukerlisten viser «Ingen aktiv menighet». Brukeren ble lagt tilbake i A, med melding. `add_membership` til B → `CH001`. Admin-kontoen viser «Fjern admin-rollen», «Deaktiver midlertidig» og «Fjern fra menigheten». Bekreftelsen varsler at menigheten står uten Admin, og avbryt endrer ingenting. Medlemslisten har filteret «Fjernet (tidligere medlemmer)». |
| Developer | Samme brukerskuff, med «Gjør til admin» i tillegg. Samarbeid er fortsatt «Ingen tilgang» (uendret). |

**Samarbeid:** feilen er gjenskapt og rettet i grensesnittet.
- Knappene ble kuttet i Koblinger-kortet. Nå er alle innenfor.
- Man kunne opprette en ny kobling for et par med en avsluttet kobling, og «Gjenåpne» på den gamle ga en misvisende feil. Nå tilbys «Gjenåpne koblingen», og konflikten gir en presis melding.
- Under feilsøkingen ble det opprettet én ekstra kobling A–B. Den er avsluttet igjen.
- **Gjenstår (beslutning):** Developer har ikke tilgang til Samarbeid.

## Developer i Samarbeid, opprydning av private filer og sikker rolleendring (2026-10-02, connecthub-dev)

**Migrering `20261006100000_dev_collab_cleanup_roles.sql` (dev).** Tørrkjøring viste bare denne filen, og alle 14 kontrollfelt er like før og etter.
- **Samarbeid:** `app.is_collab_admin()` = Moderator eller Developer (eksplisitt). Det gjelder alle koblingsfunksjoner og den gamle områdemodellen. Filtilgangen er uendret: `can_see_file` og `file_keys` krever medlemskap, og `link_files_meta` gir bare metadata.
- **Rolleendring:** triggeren `user_roles_global_guard` (før `revoked_at`-oppdatering eller sletting av en global rolle) stopper fjerning av den siste globale rollen når brukeren har mer enn ett aktivt medlemskap (CH004). Den bruker samme lås per bruker som medlemskapstriggeren.
  - `active_memberships_of(user)` brukes til forklaringen i grensesnittet.
  - Ingen medlemskap fjernes automatisk.
- **Opprydning:**
  - Køtabellen `file_cleanup_queue` (RLS, ingen klienttilgang).
  - `app.cleanup_block_reason`, `cleanup_overview` (stab: antall og størrelse per menighet, ingen filnavn) og `cleanup_candidates` (bare metadata, krever at stab er aktivt medlem).
  - `cleanup_private_files`: lås, ny kontroll, antall og byte må stemme med bekreftelsen (CH006), blokkerte filer stopper alt (CH005). Radene slettes og nøklene legges i kø i én transaksjon, og hendelsen loggføres som `files.cleanup`.
  - `cleanup_retry_ids`, og for serveren `cleanup_queue_claim` / `cleanup_queue_done` (loggført som `files.cleanup_storage`).
- **Kandidat:** en privat fil der eieren har status «fjernet» i filens menighet. **Blokkert** (vises med årsak) når filen er kilde for en kopi, er delt i et samarbeidsområde, menigheten ikke er aktiv, eller filen allerede står i kø.

**Server:** `file.cleanup` og `file.cleanup_retry` (`server/handlers/files.js`). Lagringsnøkler går aldri til nettleseren. Hver fil fjernes fra lagringen og registreres som «done» eller «failed», og feilede kan prøves igjen.

**Grensesnitt:**
- Developer har Samarbeid i menyen og Samarbeid-kortet på oversikten.
- Ny seksjon «Opprydning» for Developer og Moderator: oversikt per menighet, filnavn bare der du er medlem, valg av klare filer, oppsummering og bekreftelse, og nytt forsøk ved lagringsfeil.
- Brukerskuffen: «Fjern» på en global rolle viser en sperre med antall og menigheter, forklaring og «Gå til medlemskapene» (hver fjerning bekreftes for seg), og deretter «Fjern rollen».

**RLS:** 566/566 i PGlite og i dev, hvorav 56 nye eller endrede:
- Developer i koblinger og områder, og bare metadata (ingen private filer, ingen nedlastingsnøkler, ingen sletting).
- Rolleendring: Developer eller Moderator med flere medlemskap til User eller Admin blir blokkert; med ett eller ingen medlemskap er det lov. Direkte oppdatering eller sletting i databasen stoppes. Manuell fjerning, deretter rolleendring. Medlemskap der brukeren er Admin krever egen bekreftelse. Ingen User eller Admin har mer enn ett aktivt medlemskap.
- Opprydning: Admin, User og Moderator uten MFA avvises. Menighetssperren. Ingen filtilgang gjennom verktøyet. Endret utvalg, ikke klar fil, aktivt medlems fil og filer fra en annen menighet stoppes. Sletting, kvote, kø, logg og serverens resultat.

**Samtidighet (ekte, to databaseøkter, ny syntetisk bruker `ch-test-conc@example.com` uten innlogging):**
- Rollen fjernes først, nytt medlemskap samtidig: ventet 3,6 s, så CH001.
- Medlemskap aktiveres først, rollen fjernes samtidig: ventet 4,7 s, så CH004.
- Brukeren står som Moderator med A og B aktive, som testdata for rollesperren.

**`npm test`:** 121/121 (`files.test.js` +3 for opprydning på serveren, `members.test.js` +1 for `roleBlocked`, `access.test.js` oppdatert).

**Nettleser (lokal preview mot dev):**
- **User:** lastet opp en ny privat testfil (`ch-test-opprydning.png`, 190 B).
- **Admin:** fjernet User fra A. Opprydning og Samarbeid gir «Ingen tilgang», og API-ene 403.
- **Moderator (ikke medlem av A):** ser A med 2 filer, men «Bare for medlemmer av menigheten». Fillisten og slettingen gir 403.
- **Developer (medlem av A):** Samarbeid i menyen og på oversikten. Gjenåpnet og avsluttet A–B igjen, med bare metadata, og ingen private filer via API. Opprydning i A viste `ch-test-privat.png` (eksisterende) og `ch-test-opprydning.png`, begge «Klar». Bare testfilen ble slettet: bekreftelsen viste antall, størrelse og filnavn, lagringsbruken i A gikk fra 17256 til 17066 B, og loggen har `files.cleanup` og `files.cleanup_storage` med `storage_deleted`.
- **Rollesperren** for `ch-test-conc` viste 2 medlemskap (A, B) og forklaringen, og «Gå til medlemskapene» virket. Direkte `revoke_role` gir CH004.
- **User2:** Opprydning «Ingen tilgang», `create_link` 403.
- **Gjenopprettet:** `ch-test-user` er lagt tilbake i A, så `ch-test-privat.png` er ikke lenger kandidat. Koblingen A–B er avsluttet igjen.
- **Regresjon** av Moderator-testene for alle fire roller: grønn. User2 er Admin i «12» etter brukerens egne endringer, og vises derfor som Admin.

**Testdata lagt til i dev:**
- `ch-test-conc@example.com` (Moderator, A og B).
- Kø-oppføringen for den slettede testfilen.
- Loggrader.

Ingen eksisterende filer er slettet.

## Knapper, tilbakemeldingsvinduet, fjerning av saker, navn, logo, velkomst og sletting av koblinger (2026-10-02, connecthub-dev)

**Migreringer (dev):**
- **`20261007100000_feedback_archive_names_logo.sql`:**
  - `feedback.archived_at/archived_by/archive_reason` og hendelsestypene `archive`/`restore`.
  - `feedback_list(p_archived)`, `archive_feedback` og `restore_feedback` (Moderator/Developer med MFA, loggført).
  - `app_users.first_name/last_name`, der triggeren `app_users_name` avleder `full_name`, og `set_user_name` (Admin i brukerens menighet, eller stab, loggført `users.name`).
  - `churches.logo_file_id`, som peker på en fil i Logoer-mappen og blir tom om filen slettes, og `set_church_logo` (Admin, eller stab som er medlem, loggført `churches.logo`).
  - `whoami` med navn og logo-ID.
- **`20261007100100_delete_ended_links.sql`:** `delete_link`. Bare avsluttede koblinger kan slettes. Kopiene i koblingen slettes og legges i køen for lagringen, originalene røres ikke, og hendelsen loggføres som `links.delete`.

Begge er tørrkjørt (bare disse to filene), og alle 14 kontrollfelt er like før og etter.

**Valg:** «Fjern sak» betyr *arkivering*, ikke sletting. Historikk og revisjonslogg kan da ikke brytes, og saken kan gjenopprettes under «Fjernede saker».

**Grensesnitt:**
- **Knappene:** tilbakemelding, konto og lys/mørk ligger i ett felles felt (`src/shared/dock.js`), så de aldri overlapper. Forsidens egen lys/mørk-knapp får plass (`data-ch-dock-reserve`). Sider som ruller, får luft nederst, og bare én meny eller ett panel er åpent om gangen.
- **Tilbakemeldingsvinduet:** tydelig X (36 px), bakgrunn som lukker ved trykk utenfor, og Escape. Med innhold eller markering spør det først. Trykk inne i vinduet lukker aldri.
- **Innboksen:** valget «Innboks / Fjernede saker», og feltet «Fjern saken» med bekreftelse og «Gjenopprett».
- **Velkomstområdet** øverst på oversikten: «Velkommen, …», hovedrolle og menighet(er) med logo. Uten navn, logo eller menighet brukes reservevisning. Det samme gjelder på mobil.
- **Brukerskuffen:** fornavn og etternavn, med «Du redigerer navnet til …». Brukeren redigerer sitt eget navn, og Admin eller stab andres.
- **Innstillinger:** kortet «Logo» med forhåndsvisning, «Last opp / Bytt logo» og «Fjern logo». Opplastingen bruker den vanlige, kontrollerte filopplastingen.
- **Samarbeid:** «Slett» på avsluttede koblinger, med antall kopier i bekreftelsen.

**Tester:**
- **RLS:** 606/606 i PGlite og i dev, hvorav 40 nye. Dekker arkivering og avvisning for Admin, User og uten MFA, navn (egen og annen menighet, validering, logg, whoami, ingen rolleendring), logo (egen eller annen menighets fil, mappe, medlem eller ikke-medlem, tom etter sletting av filen) og sletting av kobling (Admin og uten MFA avvises, aktiv kobling kan ikke slettes, kopi slettet, original urørt, kø og logg).
- **`npm test`:** 122/122 (`members.test.js`: navn, velkomst og rolle; `contract.test.js`: arkivering).

**Nettleser (lokal preview mot dev):**
- **Knapper (8 sider × PC 1440 og mobil 390):** ingen overlapp, og ingen knapper over innhold når siden er rullet helt ned.
- **Tilbakemeldingsvinduet på PC:**
  - Tomt skjema: trykk utenfor lukker uten spørsmål.
  - Kategori, skriving og markering lukker ikke vinduet, og teksten beholdes etter markering.
  - Med tekst spør trykk utenfor, Escape og X «Forkaste teksten du har skrevet?». «Avbryt» beholder teksten.
  - Kontomenyen og tilbakemeldingen er aldri åpne samtidig.
- **Tilbakemeldingsvinduet på mobil:** 390×844 fullskjerm, X lukker med berøring, og trykk inne i boksen lukker ikke.
- **Moderator:** fjernet TB-05A5AF med bekreftelse (avbryt beholdt saken). Saken lå i «Fjernede saker» med historikk og ble gjenopprettet. Statusendring fjerner ikke saken.
- **Admin:**
  - Navneskjema for `ch-test-user`: `<x>` ga «Navnet inneholder ugyldige tegn.», og lagring ga «Navnet er lagret.». Annen menighet → 403.
  - Logo: tekst forkledd som PNG ble avvist («Bare bilder …»), og en ekte PNG ble lagret med forhåndsvisning. Logo for B → 403.
  - Velkomstområdet viser logoen med en gang.
- **Velkomst:**
  - User (mobil): «Velkommen, User Test | Bruker | CH-test Menighet A», med logo som bilde.
  - Moderator: ingen menighet, og meldingen vises.
  - Developer: «Developer | CH-test Menighet A».
- **Developer, Samarbeid:** «Slett» bare på avsluttede koblinger. De to avsluttede A–B-testkoblingene er slettet (én via UI, én via direkte kall). Koblingen A – «12» (brukerens egen) er urørt.
- **Rolle-regresjon** for alle fire roller: grønn.

**Testdata lagt til i dev:**
- To logofiler i Menighet A (Logoer). A har nå logo.
- Navnefeltene til `ch-test-user` er satt (User/Test, uendret visningsnavn).
- Historikk for arkivering og gjenoppretting på TB-05A5AF.
- Loggrader.

**Testdata slettet i dev:** to avsluttede A–B-koblinger. Begge var testkoblinger, og ingen av dem hadde filer.

## Samarbeidsgrupper med tre eller flere menigheter (2026-10-02, bare connecthub-dev)

Plan: `docs/plan-samarbeidsgrupper.md` (godkjent). Migrering: `supabase/migrations/20261008100000_collab_groups.sql`. Produksjonen og `main` er ikke rørt.

**Migrering i dev:**
- Tørrkjøring viste bare denne migreringen. Den ble brukt med `db push` mot `uatpdmhnwwjgzlxaucsx`.
- Kontrollen i migreringen (antall koblinger = grupper, riktige medlemmer) gikk gjennom.
- Den eneste koblingen (A – «12») er nå gruppen «CH-test Menighet A – 12». Den har samme ID, 2 aktive medlemmer og bevart `created_at`.
- Øyeblikksbildet før og etter (14 felt + koblinger, kopier og logg) var likt. Eneste forskjell: +1 migrering.
- Parkontrollen og den unike par-indeksen er fjernet. `church_link_members` har RLS uten policyer og uten rettigheter for `anon`/`authenticated`.

**Tester:**
- **RLS:** 735/735 i PGlite og i dev, hvorav 129 nye. Eksisterende koblingstester er tilpasset: samme par kan nå være i flere grupper, og loggnavnene er `groups.*`.
  - **Tre menigheter:** kopier fra alle, G4 utenfor ser ingenting (rader og nedlastingsnøkler), og stab ser bare metadata.
  - **Kopiering og sletting:** Faste bare for Admin, private filer aldri, ingen dobbel kopi, og kopien teller i bidragsyterens kvote. Bare Admin hos bidragsyteren kan fjerne en kopi.
  - **Fjerning:** kopiene til G3 skjules for alle (også nøklene), G3 mister gruppen, og ingenting slettes. Admin i G3 kan ikke slette de skjulte kopiene. Nest siste menighet stoppes (CH007).
  - **Gjeninnmelding:** samme rad blir aktiv igjen, og alle kopier vises, også den som ble delt mens G3 var ute. Dobbel innmelding gir CH009.
  - **Grense:** høyst 20 menigheter (CH008) ved oppretting og tillegg. Det er plass igjen etter en fjerning, og låsen er på gruppen.
  - **Avslutning og gjenåpning:** avsluttet gruppe skjuler alt. Innmelding er lov i en avsluttet gruppe, og gjenåpning viser alt igjen.
  - **Sletting:** bare avsluttede grupper. Alle kopiene, også de som har vært skjult, går til køen, og originalene er urørt.
  - **Endelig sletting av en menighet:** en gruppe med færre enn to medlemmer igjen avsluttes. Andre grupper fortsetter, og bare den slettede menighetens kopier forsvinner.
  - **Deaktivert menighet:** bidragene skjules.
  - **Avvisning:** Admin, User og stab uten MFA avvises i all administrasjon og direkte skriving.
- **`npm test`:** 125/125. Nye servertester:
  - `copy_to_link` der menigheten fjernes før registreringen gir 403, og kopien ryddes bort.
  - `link.delete` med gruppe tømmer køen og sender aldri nøkler til nettleseren.
  - Feilkodene CH007–CH009.

**Nettleser (lokal preview mot dev, bare menighet A og B – ingen «CH-test Menighet C»):**
- **Moderator (PC):**
  - «Opprett gruppe» er av uten valg. Gruppen «CH-test Gruppe E2E» ble opprettet med A og B, og navn og beskrivelse ble endret.
  - «Fjern» er av med bare to menigheter, og det står en forklaring.
  - Ingen vannrett rulling.
- **User i A (mobil):** «Del i Samarbeidsfiler» → valg av gruppe. Teksten viser gruppen og begge menighetene. Kopien ble delt, og Samarbeidsfiler viste gruppevelger, «Fra oss 1» og «Fra CH-test Menighet B 0». `#/samarbeid` gir «Ingen tilgang».
- **User i B (PC og mobil):**
  - Ser bare sin egen gruppe, ikke A – «12».
  - Ser «Fra CH-test Menighet A 1», og miniatyren lastes, altså går nedlastingslenken gjennom.
  - Verktøyene (`MLCloud.collab()` i Photo Design): «CH-test Gruppe E2E 2: 1 fil(er)».
- **Admin i A (mobil):** ser gruppen og menighetene, og har «Fjern fra Samarbeidsfiler» bare på egen kopi. `#/samarbeid` gir «Ingen tilgang».
- **Developer (mobil):** ser lista med antall kopier, og metadata gruppert per menighet uten miniatyrer. Developer avsluttet gruppen. B så deretter ingen Samarbeidsfiler.
- **Moderator gjenåpnet:** B så kopien igjen.
- **Moderator avsluttet og slettet:** bekreftelsen viste «1 kopier … medregnet kopier som er skjult». Gruppen og kopien er borte, køoppføringen er «done», og originalen er urørt. Loggen viser opprettet / endret / avsluttet / gjenåpnet / avsluttet / slettet.
- **Funnet og rettet under testen:**
  - Søkefeltet i «Ny samarbeidsgruppe» ble en høy boks (`flex-basis` i kolonne).
  - Gammel undertittel «Koblinger mellom to menigheter».
  - Lista ble oppdatert etter meldingen i stedet for før.
- **Regresjon (lesende):** alle admin-sider og fem verktøysider for Developer, Moderator, Admin og User på PC 1440 og mobil 390. Riktig tilgang og avvisning, ingen feilmeldinger og ingen vannrett rulling. Eneste konsollfeil er den kjente 404-en for den valgfrie `mockups/config.json`.

**Testdata i dev:**
- Ny syntetisk konto `ch-test-userb@example.com` (User i CH-test Menighet B). B hadde ingen testkonto med kjent passord. Den kan fjernes etter godkjenning.
- Testgruppen «CH-test Gruppe E2E 2» ble opprettet og slettet igjen, sammen med sin ene kopi.
- Loggrader og varsler.
- Gruppen «CH-test Menighet A – 12», menigheten «12», kontoen din og skjermbildet ditt er urørt.

**Avvik fra planen:**
- `church_directory` trengte ingen endring.
- `export_church` er endret (format `/3`, `groups` i stedet for `links`), siden den brukte `church_a`/`church_b`.
- `delete_file` krever nå at en kopi i Samarbeidsfiler er synlig (aktiv gruppe, bidragsyteren er med). Det håndhever beslutningen om at skjulte kopier ikke kan slettes i v1, og gjelder også kopier i avsluttede grupper.
- Fjerning av nest siste menighet stoppes også i avsluttede grupper.
- Gjenåpning krever 2–20 aktive medlemmer som alle er aktive menigheter.
- Fjerning og gjeninnmelding i nettleseren krever en tredje menighet. De er dekket av RLS-testene til «CH-test Menighet C» eventuelt godkjennes.

## Generalprøve på tilbakeføring (steg B) og ekstra Admin (2026-10-02, bare connecthub-dev)

**Steg B, gammel kode mot ny database:**
- `4d878ac` ble bygget i en egen arbeidskopi (samme avhengigheter) og kjørt med `vite preview` mot dev, med alle de nye migreringene brukt. Kontrollen ble kjørt to ganger: med 7 migreringer, og på nytt etter den 8. (`20261009100000`).
- **Gamle sider med endrede funksjoner, uten feil:**
  - Samarbeid (Moderator): `my_links` og `link_files_meta`, gruppen A – «12» vises som kobling.
  - Innboks: `feedback_list` uten argument, 12 saker.
  - Filer → Samarbeidsfiler (User, mobil): `church_a`/`church_b`.
  - `whoami`.
- **Lesende regresjon (alle admin-sider og fem verktøy, PC og mobil, fire roller):** tilgangene er som i dagens produksjon.
- **Avvik:** én 500 på `file.urls` (Admin) i første kjøring. Den lot seg ikke gjenskape (alle kall på admin-sidene og i fem verktøy gikk gjennom) og kom ikke igjen i andre kjøring. Ellers bare den kjente 404-en for `mockups/config.json`.
- **Konklusjon:** tilbakeføring av koden til `4d878ac` virker med den nye databasen. Arbeidskopien er fjernet.

**Ekstra Admin (`supabase/migrations/20261009100000_extra_admin.sql`, commit `6269992`):**
- **Migrering i dev:** tørrkjøring viste bare denne migreringen. Fingeravtrykket før og etter var likt, bortsett fra migreringstallet.
- **RLS:** 763/763 i PGlite og i dev, hvorav 28 nye.
  - Admin, User og stab uten MFA avvises.
  - Developer og Moderator legger seg til (medlemskap legges til). Å gjøre det to ganger er ufarlig.
  - Den faste Admin er uendret, og en ny fast Admin gir fortsatt 23505. `assign_role` på seg selv avvises.
  - Fast Admin varsles, og alt loggføres.
  - Fast Admin kan ikke fjerne en ekstra Admin. Stab kan fjerne en ekstra Admin uten CH003, mens den faste fortsatt krever bekreftelsen.
  - Fjerning av seg selv virker også uten MFA, og medlemskapet som kom med rollen, fjernes.
  - Er man allerede medlem (B), beholdes medlemskapet.
- **`npm test`:** 125/125.
- **Nettleser:**
  - Developer (PC) la seg til i CH-test Menighet A (allerede medlem), og `whoami` fikk Admin-rollen.
  - Fast Admin (mobil) ser «Admin» + «ekstra» på Developer og fikk varsel.
  - Developer (mobil) fjernet seg. Medlemskapet i A beholdes, og den faste Admin er uendret.
  - Moderator (mobil) ser kortet.
  - Ingen vannrett rulling.
- **Testdata i dev:** én tilbakekalt ekstra Admin-rad for Developer i A, ett varsel til fast Admin og to loggrader.

**Kontrollspørringene:** `prod_postcheck.sql` er oppdatert til 8 migreringer, 16 funksjoner og regelen for ekstra Admin. Kontrollen for grupper tåler nå også grupper som er endret etter migreringen. Prøvekjørt mot dev: alt `ok`, bortsett fra `queue_empty`, som er riktig i dev, der køen har behandlede rader.

**Merk:** i dev ble CH-test Menighet B lagt til i gruppen «CH-test Menighet A – 12» og fjernet igjen med din konto (21:01). Det er gyldige data og ikke en feil.

## Undersøkelse av «Glemt passord» (2026-10-03, dev, bare lesing)

Lokal preview mot dev, hodeløs nettleser uten tidligere økt. Ingen data er endret.

| Tilfelle | Resultat i dag |
|---|---|
| Tilbakestillingslenke (PKCE-kode) åpnet i en annen nettleser enn den som ba om den (`?code=…&flow=recovery`) | «Noe gikk galt. Prøv igjen.», innloggingssiden, **ingen** passordskjema. Supabase-kode `pkce_code_verifier_not_found` mangler tekst. **Samme symptom som rapportert.** |
| Utløpt eller brukt lenke (`#error_code=otp_expired`) | «Lenken er utløpt eller allerede brukt. Be om en ny.», men brukeren havner på innloggingssiden uten skjemaet for ny lenke. |
| Manipulert `token_hash` | `verify` gir 403, med meldingen «Lenken er utløpt …». |

**Årsak:**
- Lenken virker bare i nettleseren som ba om den (PKCE-verifikatoren ligger i den nettleserens `localStorage`).
- I tillegg krever Supabase en MFA-økt (`aal2`) for å lagre nytt passord når kontoen har MFA. Det gjelder Developer og Moderator, og den feilen (`insufficient_aal`) har heller ingen tekst.

Løsningen står i `docs/plan-foresporsler-epost-konto.md`, kapittel 1.

## «Glemt passord» – klientdelen (steg 1a i plan-foresporsler-epost-konto.md, 2026-10-03, bare dev)

**Endret:**
- `src/pages/login/LoginPage.jsx`:
  - egen visning for tilbakestillingslenker (først «Fortsett», så brukes lenken)
  - MFA-steg før nytt passord (`aal2`)
  - «Nytt passord» og «Bekreft nytt passord» med vis/skjul og løpende krav
  - «Passordet er endret» (alle økter logges ut)
  - «Lenken virker ikke lenger» med skjemaet «Send ny lenke»
  - vis/skjul også på innloggingen
  - norske og engelske tekster for alle Supabase-koder
- `src/services/adapters/supabase/auth.js`: nettverksfeil gir `network`, og unntak fra lenkehåndteringen fanges.
- `src/services/auth.js`: `passwordChecks`.
- Ingen databaseendringer.

**Lenkeformatet er uendret i denne delen.** «Glemt passord» bruker fortsatt PKCE, så en lenke åpnet i en annen nettleser gir nå en forklaring og skjemaet «Send ny lenke» i stedet for en ukjent feil. Lenker som virker i alle nettlesere, kommer med e-postsystemet (B1).

**Nettleser (lokal preview mot dev):** ekte engangslenker laget med Admin API (`generate_link`, ingen e-post sendt). Lenker og passord ble aldri skrevet ut.
- **User, PC (`token_hash`-lenke):**
  - Lenken vises ikke i adresse eller lagring.
  - Uten nett gir «Fortsett» «Fikk ikke kontakt …», og lenken er ikke brukt opp. Med nett virker den.
  - Kravene oppdateres mens man skriver, og vis/skjul virker per felt.
  - Ulike passord avvises.
  - Etter lagring vises «Passordet er endret», og ingen økt er igjen.
  - «Til innlogging» har e-posten fylt ut, og innlogging med nytt passord slipper brukeren inn i Media Lab.
  - Samme lenke en gang til gir «Lenken virker ikke lenger» med skjemaet for ny lenke.
  - API-kontroll: nytt passord virker, gammelt er avvist.
- **User, mobil (Supabase-standardlenke, `#access_token`):** samme flyt, uten vannrett rulling. Nytt passord virker, gammelt er avvist.
- **Developer med MFA, PC:**
  - Etter «Fortsett» kommer «Bekreft at det er deg». Feil kode gir «Feil kode. Prøv igjen.», og riktig kode gir «Nytt passord».
  - Lagret, logget ut, og ny innlogging med nytt passord og kode slipper inn i Media Lab.
- **Feilsider (mobil):**
  - PKCE-lenke åpnet i en annen nettleser (det rapporterte tilfellet) gir «Lenken må åpnes i samme nettleser …» med e-postfelt og «Send ny lenke».
  - Utløpt eller brukt lenke (`otp_expired`) og manipulert lenke gir «Lenken er utløpt eller allerede brukt».
  - «Send ny lenke» til ukjent adresse gir nøytralt svar.
- **Innlogging:** øyeknappen ligger inne i feltet (`aria-pressed`, «Vis/Skjul passord»), og det er ingen vannrett rulling.

**Tester:** `npm test` 125/125. Bygget går.

**Testdata i dev:** nye passord for `ch-test-user` og `ch-test-dev`, lagret bare i testlegitimasjonen i scratchpad. MFA-faktoren til `ch-test-dev` er satt opp på nytt.

## E-postsystemet og Mail-fanen (2026-10-03, dev; plan-foresporsler-epost-konto.md kapittel 1.3 A og 3)

**Innhold:**
- **E-post fra serveren:** ConnectHub sender selv e-post via SMTP (`server/lib/mail.js` og `server/adapters/smtp.js`, nodemailer 10.0.13 uten kjente sårbarheter).
- **Lenker:** «Glemt passord» (`auth.recover`, tilgjengelig før innlogging, med grenser) og invitasjoner (`invite.create`/`resend`) bruker engangslenker fra `generate_link`, med `token_hash` til vår side. Lenkene virker i alle nettlesere og brukes først ved «Fortsett».
- **Maler:** blokker, felles gjengivelse (`src/shared/mail-render.js`), logo som innebygd vedlegg.
- **Mail-fanen:** bare Developer og Moderator med MFA.
- **Database:** migrering `20261010100000_mail.sql`.
- **Uten SMTP-oppsett:** som før (Supabase sender), se `docs/epostoppsett.md`.

**Tester:**
- **RLS:** 802/802 i PGlite og i dev, hvorav 39 nye.
  - Admin, User og stab uten MFA avvises.
  - Ugyldige maler avvises: ingen eller to lenkebokser, ukjent blokk, linjeskift i emnet, for lang tekst og ukjent mal.
  - Ukjente felt (`href`) fjernes.
  - Standardmalen kan gjenopprettes, og logo kan settes, byttes og tilbakestilles.
  - Alt loggføres med gammel og ny verdi.
  - Bare serveren kan hente maler, registrere utsendinger og bruke grensetelleren.
- **`npm test`:** 142/142, hvorav 17 nye:
  - **Gjengivelse:** escaping, lenke bare fra systemet, og bare trygge adresser.
  - **`auth.recover`:** nøytrale svar, grenser med hasher, reserveløsning, og e-postfeil registreres uten lenke.
  - **Innlogging:** bare «Glemt passord» er åpen før innlogging.
  - **Invitasjon:** `invite`- og `magiclink`-lenker, og reserveløsning.
  - **Logo:** rettighet først, PNG/JPG under 512 kB, og SVG/GIF avvist.
  - **Status og testutsending.**
  - **SMTP-protokoll:** mot en lokal testserver, med innlogging, avsender, HTML/tekst og innebygd logo.
  - **Byggevakten:** stopper ved SMTP-passord i nettleserkoden.

**Nettleser (lokal preview mot dev, testpostkasse – ingen ekte e-post):**
- **«Glemt passord»:**
  - Kvittering, og e-posten har riktig emne, logo og lenke til vår side.
  - Lenken åpnet i **en annen nettleser** (mobil): «Nytt passord», «Fortsett», nytt passord og innlogging. Det gamle passordet er avvist.
- **Mail-fanen, Developer (PC):**
  - Status «sendes fra testpostkasse». Malene og blokkene vises, og lenkeboksen har bare knappetekst.
  - Forhåndsvisningen oppdateres mens man skriver. Den escaper HTML og ligger i en sandkasse uten skript.
  - Tomt emne stopper lagring, og lagring virker.
  - Logo kan lastes opp, og forhåndsvisningen bruker den.
  - Testutsending er registrert i «Siste utsendinger».
  - Ingen vannrett rulling.
- **Invitasjon av ny bruker** (`ch-test-mail1@example.com`, User i CH-test Menighet A):
  - Velkomstmailen har den redigerte malen og egen logo.
  - Lenken åpnet i en ny nettleser: «Velkommen til ConnectHub», så «Fortsett», så «Velg passord». Brukeren er innlogget og medlem av A, og passordet virker.
- **Moderator (mobil):** forhåndsvisning i mobilbredde. Pilene flytter blokker. Standardmalen og standardlogoen gjenopprettes. Ingen vannrett rulling.
- **Admin og User:** `#/mail` gir «Ingen tilgang», det er ingen Mail-meny, og `mail.status`, `mail.test` og `mail.logo_reset` gir 403.
- **Reserveløsning uten SMTP:** serveren svarer `fallback: true`, og nettleseren bruker Supabase sin «Glemt passord» som før. Mail-fanen viser «ikke satt opp», og testknappen er av.

**Ikke testet:** ekte levering via Gmail-SMTP. Det krever variablene i Vercel (`docs/epostoppsett.md`, punkt 3).

**Testdata i dev:**
- ny bruker `ch-test-mail1@example.com` (User i A)
- nytt passord for `ch-test-user`
- rader i utsendingsloggen og grensetelleren
- loggrader for Mail

## Produksjon: e-postsystemet (2026-10-03)

| Steg | Resultat |
|---|---|
| **C** Lesende kontroll | 29 migreringer, siste `20261009100000`. `main` er `cfbecc4`. `25216f4` er en ren fremspoling. |
| **D** Sikkerhetskopi | JSON-kopi av alle 21 tabeller, med antall likt fingeravtrykket (49 loggrader, 9 filer, 2 brukere, 2 medlemskap). Ligger utenfor repoet. |
| **E** Tørrkjøring | Nøyaktig `20261010100000_mail.sql`. |
| **F** Migrering | Brukt uten feil. |
| **G** Etterkontroll | `prod_postcheck_mail.sql`: alle 6 `ok`, 30 migreringer. Fingeravtrykket er uendret, bortsett fra migreringstallet. Kommandolinjeverktøyet er tilbake på dev. |
| **H** Kode | `git push origin 25216f4:main`. Vercel: «Deployment has completed», og `version.json` viser `25216f4`. |
| **I** Røyktest | Se under. |

**Røyktest (steg I):**
- Én CSP-header, uten dev-prosjektet.
- Sidene gir 307 til innlogging.
- `mail.*`, `invite.create` og `file.urls` gir 401 uten innlogging.
- `auth.recover` svarer `fallback: true`. Produksjonen har ikke SMTP-oppsett, så den bruker Supabase som før.
- Ingen nettleserfiler inneholder dev-prosjektet eller SMTP-navn.
- Innloggingssiden lastes i en ekte nettleser uten feil, med vis/skjul og «Glemt passord».

**Ikke verifisert:** ekte levering via Gmail-SMTP. Det krever variablene i Vercel (`docs/epostoppsett.md`).

## Valgfrie e-poster på/av (2026-10-03, dev)

**Løsning:**
- **Database:** `app_users.email_optional` (standard På). Brukeren endrer bare sitt eget valg (`set_my_email_optional`); ingen kan skrive kolonnen direkte, heller ikke stab.
- **Server:** `mail_optional_allowed` brukes før valgfrie e-poster. Er valget Av, registreres e-posten som «skipped». Nødvendige e-poster (invitasjon, «Glemt passord», sikkerhet) sendes alltid.
- **Grensesnitt:** bryter i kontomenyen under «Konto».
- **Migrering:** `20261011100000_email_optional.sql`.

**Tester:**
- **RLS:** 811/811 i PGlite og i dev, hvorav 9 nye.
- **`npm test`:** 1 ny servertest. Valgfri e-post hoppes over når valget er Av, og «Glemt passord» sendes likevel.
- **Nettleser (User, mobil):** standard På. Av lagres, og etter ny innlogging i en ny nettleser står den fortsatt på Av. Satt tilbake til På. Ingen vannrett rulling.

**Merk:** i dag finnes ingen valgfrie e-poster ennå. Valget gjelder for varsler som kommer, f.eks. varsler om forespørsler.

## Forespørsler om brukerkonto (2026-10-03, dev; plan kapittel 2 og 3.2)

**Løsning:**
- **Innloggingssiden:** knappen «Send forespørsel om opprettelse av bruker» åpner et panel under innloggingen (`RequestPanel.jsx`).
- **Serveren:** `request.form` og `request.submit` virker før innlogging, med signert skjemanøkkel (3 sekunder–2 timer), felle-felt, grenser per IP (5/time) og per e-post (3/døgn), og samme svar uansett.
- **Database:** `account_requests`. Duplikater teller i den åpne forespørselen, det er et tak på 200 per døgn, og Developer og Moderator får varsel i ConnectHub.
- **E-post:** kvittering til avsenderen og varsel til stab. Stab får bare navn og menighet, og varselet er en valgfri e-post. Varslingsadresser settes i Mail-fanen.
- **Innboksen «Forespørsler»:** for Developer og Moderator med MFA. Status, notat, historikk, avslag med begrunnelse og sletting.
- **«Opprett bruker»:** A ny menighet, B eksisterende menighet, C uten menighet (bare Developer/Moderator-roller, gitt av Developer). Alt skjer i én transaksjon via `create_invitation`, med velkomstmail.
- **Eksisterende konto:** gir CH010, og det lages ingen ny konto.
- **Oppbevaring:** `app.purge_account_requests`.
- **Migrering:** `20261012100000_account_requests.sql`.

**Tester:**
- **RLS:** 851/851 i PGlite og i dev, hvorav 40 nye. Mail-testen for logo er gjort uavhengig av logoen som tilfeldigvis ligger i dev.
- **`npm test`:** 147/147, hvorav 3 nye servertester. De dekker skjemanøkkel, felle-felt, duplikat, grenser, rekkefølgen «lagre før e-post», at varselet er uten telefon og e-post, godkjenning med invitasjonslenke, og CH010 → 409.
- **Nettleser (lokal preview mot dev, testpostkasse):**
  - Moderator lagret en varslingsadresse.
  - En besøkende på mobil fikk feltvalidering, sendte inn og fikk «Takk!». Avsenderen fikk kvittering, og varselet til stab hadde bare navn og menighet.
  - Moderator på PC så forespørselen i innboksen og satte «Under behandling», la til et notat og opprettet brukeren (B, menighet A, Bruker). Velkomstmailen fikk invitasjonslenke, og historikken ble fullstendig.
  - Admin og User: «Ingen tilgang», og API-et gir 403.

**Valget «A. Ny menighet»** er testet bare i RLS, som rulles tilbake. Det er ikke opprettet noen ny varig menighet i dev.

**Testdata i dev:**
- én forespørsel og én ventende invitasjon for `ch-test-req1@example.com` (User i A)
- varslingsadressen `stab-varsel@example.com`

## Kontomenyen: E-postvarsler, Varsler og Konto og sikkerhet (2026-10-03, dev)

**Løsning:**
- **E-postvarsler, bare for Developer og Moderator:**
  - Av/på og egen mottakeradresse for valgfrie e-poster (`app_users.notify_email`).
  - Bare via `my_email_prefs`, `set_my_email_optional` og `set_my_notify_email` på egen rad, og de krever Developer eller Moderator med MFA. Ingen kolonnerettigheter.
  - Adressen valideres og vises alltid, og lagring gir en bekreftelse.
  - Innloggingsadressen endres aldri. Valgfrie e-poster går til valgt adresse (`mail_optional_address`), mens «Glemt passord» og sikkerhet alltid går til kontoens adresse.
- **Menyen** (`src/shared/account-menu.js`) har visninger:
  - **Hovedmenyen:** navn og rolle, «Varsler» med tall, E-postvarsler (bare stab), «Logg ut» (ett trykk) og «Konto og sikkerhet».
  - **Varsler:** egen visning. Trykk merker varselet som lest og åpner siden hvis varselet har lenke, og «Merk alle som lest» finnes fortsatt.
  - **Konto og sikkerhet:** «Last ned mine data», «Logg ut og fjern mine lokale data» (bekreftelse som forklarer hva som fjernes og hva som blir liggende), og en faresone med «Slett kontoen min». Sletting krever avkrysning før knappen virker, og «Avbryt» er lett tilgjengelig.
- **Migreringer:** `20261013100000_notify_email.sql` og `20261014100000_email_prefs_staff.sql`.

**Tester:**
- **RLS:** 863/863 i PGlite og i dev.
  - User og Admin avvises, og stab uten MFA avvises.
  - Ugyldige og flere adresser avvises, og innloggingsadressen er uendret.
  - Ingen direkte skriving, og andre kan ikke lese adressen.
  - Serveren bruker valgt adresse.
- **`npm test`:** 147/147.
- **Nettleser (User, mobil og PC):**
  - Hovedmenyen viser ikke sletting eller lokale data direkte.
  - Varsler er en egen visning.
  - Fjern lokale data: bekreftelse, så «Avbryt».
  - Slett konto: knappen er av til avkrysning, så «Avbryt». Ingenting ble slettet.
  - «Logg ut» virker med ett trykk, og det er ingen vannrett rulling.
- **Nettleser (roller):**
  - User ser ikke E-postvarsler.
  - Moderator (mobil, MFA) lagret egen adresse og slo av, med bekreftelse. Etter ny innlogging står begge deler, og de er satt tilbake til standard.

## Kontovelger og «Bytt passord» (2026-10-03, dev; plan kapittel 4 og 5)

**Kontovelger** (`src/shared/saved-accounts.js` og innloggingssiden):
- **Lagring:** «Husk denne kontoen på denne enheten» (av som standard) lagrer bare e-post, navn og initialer i `localStorage` `ch.accounts`, høyst 5. Aldri passord, tokens eller roller.
- **Visning:** kontoene vises som ikoner. Valgt konto markeres tydelig, e-posten fylles inn, og markøren settes i passordfeltet. «Bruk en annen konto» tømmer valget.
- **Fjerning:** × fjerner snarveien med bekreftelse. Kontoen slettes ikke.
- **Sletting av konto** fjerner den fra lista på enheten.

**«Bytt passord»** (kontomenyen → Konto og sikkerhet, alle roller):
- **Felt:** gammelt, nytt og bekreft, hver med vis/skjul, og løpende krav.
- **Gammelt passord:** kontrolleres med en ny innlogging, som også oppfyller kravet om fersk innlogging.
- **MFA:** kode fra autentiseringsappen når kontoen har MFA (`aal2` kreves).
- **Etter byttet:** andre økter logges ut (`signOut({ scope: 'others' })`).
- Ingen databaseendringer.

**Tester (nettleser, lokal preview mot dev):**
- **Kontovelger (mobil):**
  - To kontoer ble husket. Valg fyller e-post og flytter fokus, og markeringen flyttes ved bytte.
  - Tomt passord stopper innlogging.
  - Lagringen har bare nøklene `email`, `initials`, `last` og `name`, uten token eller passord.
  - × fjerner én konto, og innlogging via valgt konto virker. Ingen vannrett rulling.
- **«Bytt passord», User (PC):** feil gammelt passord gir «Det gamle passordet er feil.», ulike nye passord gir «Passordene er ikke like.», vis/skjul virker, og byttet gir bekreftelse. API-kontroll: nytt passord virker, gammelt er avvist.
- **«Bytt passord», Developer med MFA (mobil):** det samme, med kode fra appen. Byttet lyktes, og det krever `aal2` hos Supabase. Nytt passord virker, gammelt er avvist.
- **`npm test`:** 147/147.

**Testdata:** nye passord for `ch-test-user` og `ch-test-dev`, bare i testlegitimasjonen.

## Regresjon etter kontofunksjonene (2026-10-03, dev)
Lesende regresjon (`94df725`): alle admin-sider og fem verktøy for Developer, Moderator, Admin og User, på PC 1440 og mobil 390.
- Tilgang og avvisning er riktige.
- Ingen feilmeldinger og ingen vannrett rulling.
- Eneste konsollfeil er den kjente 404-en for den valgfrie `mockups/config.json`.
- De nye sidene («Forespørsler», «Mail») og menyen er testet i egne kjøringer over.

## Produksjon: forespørsler, kontomeny, kontovelger og «Bytt passord» (2026-10-03)

| Steg | Resultat |
|---|---|
| **C** Lesende kontroll | 30 migreringer, siste `20261010100000`. `main` er `25216f4`. `f13c02e` er en ren fremspoling. |
| **D** Sikkerhetskopi | JSON-kopi av alle 25 tabeller. Den er kontrollert som leselig, og antallene er like fingeravtrykket. Gjenoppretting er ikke prøvd. |
| **E** Tørrkjøring | Nøyaktig de fire migreringene `20261011100000`–`20261014100000`. |
| **F** Migrering | Brukt uten feil. |
| **G** Etterkontroll | `prod_postcheck_requests.sql`: alle 8 `ok`, 34 migreringer. Fingeravtrykket er uendret, bortsett fra migreringstallet. Kommandolinjeverktøyet er tilbake på dev. |
| **H** Kode | `git push origin f13c02e:main`. Vercel: «Deployment has completed». |
| **I** Røyktest | Se under. |

**Kontroll C – avvik som ble forklart:** 10 lagringsobjekter mot 9 filer, og én ny loggrad. Det var en egen e-postlogo lastet opp i Mail-fanen kl. 02:54 (`mail.logo_update`, objekt under `mail/`). Det er vanlig bruk og ikke et avvik.

**Røyktest (steg I):**
- Én CSP-header, uten dev-prosjektet.
- Sidene gir 307 til innlogging.
- `request.approve`, `mail.*`, `file.urls` og `invite.create` gir 401 uten innlogging.
- `request.form` gir en signert nøkkel, og `request.submit` med falsk nøkkel gir `form_expired`, så ingenting lagres.
- Ingen nettleserfiler inneholder dev-prosjektet eller SMTP-navn.
- **Innloggingssiden i ekte nettleser (mobil):** vis/skjul, «Husk denne kontoen», knappen «Send forespørsel om opprettelse av bruker» og panelet med 5 felt (skjemanøkkel hentet) er på plass. Ingen vannrett rulling, og ingen feil.
- Ingen forespørsel ble sendt, så det ble ikke laget data i produksjon.

**Kjent begrensning:** produksjonen har ikke SMTP-oppsett. Forespørsler lagres, og stab varsles i ConnectHub, men det sendes ingen e-post før `docs/epostoppsett.md` er fulgt.

## Fellesmappe og Samarbeidsmappe (2026-10-03, dev)
- Migrering `20261015100000_collab_folder_upload.sql` kjørt i dev (bare tillegg: kolonnen `files.link_upload`, `can_upload_link`, `register_link_upload`, utvidet `delete_file`).
- RLS: 902/902 i PGlite og 902/902 mot connecthub-dev (39 nye: opplasting for egen menighet, annen menighet/utenfor gruppen/ikke innlogget/ugyldig størrelse/ukjent gruppe avvist, bare serveren registrerer, synlighet og lenker, sletting (opplaster, Admin, ikke andre, ikke Moderator, kopier fortsatt bare Admin), kvote 54000, deaktivert medlem, avsluttet gruppe skjuler og stopper alt, ingenting slettes).
- `npm test`: 153/153 (3 nye servertester for `file.upload_link`, 3 ZIP-tester). `npm run build`: OK, sikkerhetssøk uten funn.
- E2E (vite preview mot dev, syntetiske kontoer, testbildene slettet igjen – 0 e2e-filer igjen):
  - Forsiden: User i A og User i B ser «Fellesmappe» og «Samarbeidsmappe» (gruppen er aktiv).
  - Fellesmappe: opplasting av 2 bilder, video avvist med melding, Slett bare på egne filer.
  - Samarbeidsmappe: gruppeinfo, opplasting av 2 bilder, «Fra oss»/«Fra …», forhåndsvisning (original, blaing, Esc), flervalg → ZIP (2 filer, gyldig arkiv), Eksporter → ZIP, kopi fra Fellesmappe.
  - User B (mobil 390 px): ser A sine filer med bare «Last ned», ingen Slett i verktøylinjen, nedlasting OK, tom Fellesmappe gir tom-melding og Last opp, ingen vannrett rulling.
  - Sletting: bekreftelsesdialog (antall, «kan ikke angres», kopien hoppes over for vanlig medlem), Admin fjerner kopien.
  - API: uten innlogging 401; opplasting for annen menighet 403; Moderator uten medlemskap 403 og 0 lenker; B får lenke til samarbeidsfil men ikke til A sin Fellesmappe; B og Moderator kan ikke slette (403).

## Nye private opplastinger stengt (2026-10-03, dev)
- Migrering `20261015100100_no_private_uploads.sql` (dev): `app.upload_check` avviser `p_private = true` (42501) – gjelder `can_upload` og `register_file`. Ingen data endres; eksisterende private bilder er bare synlige for eieren som før.
- Server: `file.upload` avviser `private` ≠ `0` med `403 private_not_allowed` før noe leses eller lagres, og sender alltid `p_private: false`.
- RLS 911/911 (PGlite og dev). `npm test` 154/154. Bygg OK.
- Direkte API (preview mot dev): User og Admin med `private=1`/`true` → 403 (også i Faste); vanlig opplasting → 200 (felles); antall private filer uendret (1/1); eieren får lenke til sitt eksisterende private bilde, Admin ikke. Testfilene slettet.
- Regresjon: hele E2E for Fellesmappe og Samarbeidsmappe på nytt – alt som før, 0 e2e-filer igjen.

## Produksjon: Fellesmappe og Samarbeidsmappe (2026-10-03)
- Godkjent av brukeren. Før: prod 34 migreringer (sist 20261014100000); ny logisk sikkerhetskopi (27 tabeller, 9 filer, 0 private, 2 brukere, 1 menighet, 0 grupper).
- Tørrkjøring mot `cmuienhheklcgtfmpvbe`: nøyaktig `20261015100000_collab_folder_upload.sql` og `20261015100100_no_private_uploads.sql`. Migrert; CLI koblet tilbake til dev.
- Etterkontroll (`supabase/checks/prod_postcheck_folders.sql`): 36 migreringer, alle ok-felt true; filer 9 og private 0 uendret; radantall i alle 27 tabeller lik sikkerhetskopien. Tidligere etterkontroll (forespørsler) fortsatt ok.
- `main` fast-forward f13c02e → c7163dd. Vercel Production: `version.json` = c7163dd.
- Røyktest i prod (uten innlogging; ingen testkontoer i prod): `file.upload_link`, `file.upload` (privat), `file.urls`, `file.delete` → 401, ugyldig token → 401, Filer-siden → 307 til innlogging, innloggingssiden som før.

## Felles grunnoppsett, Faste/Felles ressurser i verktøyene og ingen standardbilder (2026-10-03, dev)
- Migrering `20261016100000_church_settings.sql` kjørt i dev (ny tabell `church_settings`, `church_settings_get/save`, `app.settings_admin_keys`). Ingen eksisterende data endret.
- RLS 935/935 (PGlite og dev; 24 nye: første lagring, Admin og medlem ser samme versjon, CH011 ved utdatert versjon, eldre versjon kan ikke overskrive nyere, medlem kan ikke endre Faste bilder (imgRules), Admin kan, referanse til annen menighets fil/ukjent fil avvises, for stort/ugyldig område avvises, annen menighet kan verken lese eller lagre, Moderator uten medlemskap og ikke innlogget avvises, ingen direkte tabelltilgang, deaktivert medlem avvises, logg uten innhold).
- `npm test` 160/160 (6 nye for sammenslåing og samtidige lagringer). `npm run build` OK.
- E2E (preview mot dev, syntetiske kontoer):
  - Loop Studio (Admin i A): ingen standardlogo eller standardbilder; Faste bilder → «Fellesmappe» viser Felles ressurser (faste/logoer) og Fellesmappe; valgt bilde lagres som referanse i menighetens grunnoppsett; logo fra Fellesmappe vises i panel og video.
  - Loop Studio (User i A): ser Admins Faste bilder og logo, Faste bilder skrivebeskyttet (ingen slett/legg til, merknad); endret overskrift lagres felles; Admin ser endringen etter ny innlogging.
  - API: User endrer Faste bilder → 403 «Bare Admin kan endre dette»; gammel versjon → CH011; User i B leser/lagrer A → 403; B har sitt eget (tomt) oppsett.
  - Admin sletter fast bilde: bekreftelse («Originalbildet … blir liggende»), fjernet fra oppsettet, originalene i Faste/Logoer urørt.
  - Thumbnail Studio: User i A endrer kategorinavn → felles (thumbstudio:cats), Admin i A ser det, User i B ser sitt eget; ingen gamle innebygde logoer i det delte grunnoppsettet. Testendringer tilbakestilt.
  - Velgeren på mobil (User i B): bare B sine filer (tom-meldinger), Esc lukker, ingen vannrett rulling.
  - Regresjon Fellesmappe/Samarbeidsmappe og private opplastinger: som før, 0 e2e-filer igjen.

## Produksjon: felles grunnoppsett og Fellesmappe i verktøyene (2026-10-03)
- Godkjent av brukeren. `connecthub` = e6947a8, ren arbeidskopi; c7163dd..e6947a8 = 3 commits, 22 filer, én migrering (`20261016100000_church_settings.sql`), tidligere migreringer uendret.
- Før: prod 36 migreringer (sist 20261015100100), `church_settings` fantes ikke, avhengigheter (churches, app_users, files, audit_logs, app.is_member/is_church_admin/current_user_id) på plass.
- Sikkerhetskopi (logisk JSON, alle 27 public-tabeller, 85 rader) av `cmuienhheklcgtfmpvbe` tatt 2026-10-03 11:28:08 UTC; lesbar og radantall lik databasen.
- Gjennomgang: bare `create table public.church_settings` + 3 nye funksjoner; ingen drop/delete/update/truncate eller endring av eksisterende tabeller. FK churches (cascade) og app_users (set null), PK (church_id, scope), RLS uten policyer, ingen klientrettigheter.
- Tørrkjøring: nøyaktig `20261016100000_church_settings.sql`. Migrert uten feil; CLI koblet tilbake til dev.
- Etterkontroll (`prod_postcheck_settings.sql`): 37 migreringer, alle ok-felt true, 0 grunnoppsett. Ekstra: registrert, medlemskontroll i get/save, versjonskontroll (CH011), Admin-felt, bare egne fellesfiler, security definer, FK/PK. Radantall i alle 27 tabeller lik sikkerhetskopien. Forrige etterkontroll (Fellesmappe) fortsatt true.
- `main` fast-forward c7163dd → e6947a8. Vercel Production: `version.json` = e6947a8.
- Røyktest uten innlogging: forsiden, Filer og Loop Studio → 307 til innlogging; `file.upload_link`, `file.upload`, `file.urls`, `file.delete` → 401; `church_settings_get/save` og tabellen som anonym → 42501; innloggingssiden som før.
- Ikke testet i prod (ingen testkontoer): innlogget bruk av felles grunnoppsett, «Fellesmappe»-velgeren, isolasjon mellom menigheter i praksis og Fellesmappe/Samarbeidsmappe i grensesnittet. Dekket i dev (RLS 935/935 og E2E).

## Tom start, demo, bildekilder, filer i bruk og grunnoppsett per kategori (2026-10-03, dev)
- Migrering `20261017100000_file_in_use.sql` kjørt i dev: `delete_file` avviser felles filer som brukes i menighetens grunnoppsett (`church_settings`) eller som menighetens logo (CH012 `file_in_use`); tilgangskontrollen først. Ingen data endret.
- RLS 942/942 (PGlite og dev; 7 nye). `npm test` 160/160. `npm run build` OK, sikkerhetssøk uten funn.
- E2E (preview mot dev):
  - Loop Studio, ny bruker (tømt nettleser): tom lysbildeserie, ingen programtekst, ingen standardbilder; status «Ingen slides ennå …».
  - Demo («Se demo (lagres ikke)» på startsiden, `?demo=1`): merket banner, eksempelslides med genererte bakgrunner (ingen fotografier/logoer), endringer lagres ikke (prosjektdata uendret), «Avslutt demo» → egen tom serie.
  - Bildekilder: velgeren har Faste bilder / Felles ressurser / Fellesmappe; valgt bilde viser «Kilde: menighetens filer i ConnectHub …» og er der etter ny innlasting.
  - Filer i bruk: Admin legger et Faste-bilde i Loop Studios Faste bilder → sletting av originalen gir 409 `file_in_use`; User 403; etter at bildet er tatt ut, finnes filen fortsatt.
  - Thumbnail Studio: User i A lager «Grunnoppsett 2/3» og gjør et til standard (bare Søndagsmøte endres); Admin i A ser dem og sletter; standard faller tilbake til «Grunnoppsett». Testoppsett ryddet. Feil funnet og rettet: forhåndslasting av et delt oppsett kunne kaste feil, slik at siden falt tilbake til lokalt oppsett.
  - Nettbrett (820 px): Loop Studio-demo, Thumbnail Studio og Fellesmappe uten vannrett rulling (visuelt kontrollert).
  - Regresjon: Fellesmappe/Samarbeidsmappe (ZIP, eksport, sletting, API-sperrer) og stengte private opplastinger som før; 0 e2e-filer igjen.

## Loop Studio: gammelt eksempelinnhold og «Standard uke» (2026-10-03, dev)
- Årsak:
  1. Tidligere versjoner autolagret eksempelinnholdet (eksempeluke, tekstslides, gamle innebygde bilder) som brukerens prosjekt første gang Loop Studio ble åpnet; det ble lastet som aktiv serie ved hver innlasting, innlogging og på mobil.
  2. «Standard uke» brukte en innebygd eksempeltekst når menigheten ikke hadde lagret en, og «Oppdater videoen» med tom tekstboks fylte den inn automatisk.
  3. Gamle standardbilder og -logo (`images/…`) lå i lokalt oppsett og ble satt på møteslidene.
- Retting (`studio-editor/logic.js`): et lagret prosjekt som er helt likt eksempelinnholdet, legges til side (`ukeloop.arkiv.*`, aldri slettet) med «Hent tilbake» (merkes da som brukerens eget); endrede prosjekter lastes som før. Standarduken er bare menighetens egen (`cfg.standard`), hentes bare ved trykk, og tom tekst fyller aldri inn noe. Gamle standardbilder/-logo fjernes fra lokalt oppsett; egne Faste bilder beholdes.
- Tester (preview mot dev, gammelt prosjekt bygget slik den gamle versjonen lagret det): PC (User i A) og mobil (User i B): tom serie og melding ved første åpning, fortsatt tom etter oppdatering; «Standard uke» uten lagret uke gir melding; «Oppdater videoen» med tom tekst gir melding; «Hent tilbake» gir de 7 slidene tilbake og de blir værende etter ny oppdatering; endret prosjekt beholdes uendret; gamle standardbilder borte fra Faste bilder, eget beholdt. Ny bruker: tom serie; demo merket, lagrer ingenting; «Avslutt demo» → tom serie. `npm test` 160/160, bygg OK. Testdata ryddet.
- Merk: produksjonen (e6947a8) har fortsatt den eldre versjonen uten tom start; rettingen krever publisering.

## Etterkontroll av e09f4c3: mobil, felles oppsett og samspill (2026-10-03, dev)
- e09f4c3 og alle funksjonene (legge til side, «Hent tilbake», standarduke, opprydning av gammelt lokalt oppsett, demo) finnes i `connecthub`; ingenting implementert på nytt.
- Migrering `20261017100000_file_in_use.sql` (dev, bare lesing): registrert; avhengigheter finnes (church_settings, churches.logo_file_id, files.link_upload, app.removed_from/group_access/group_member_ok/is_church_admin); én `delete_file` med alle tidligere regler; security definer, rettighet for innloggede, ikke anon. Eneste nye migrering siden `main` (e6947a8). Ikke kjørt mot produksjon.
- Mobil (User i B): gammelt eksempel lagt til side; i «Rediger»: «Standard uke» uten lagret uke gir melding og fyller ingenting; «Oppdater videoen» med tom tekst gir melding; eget program gir «Fant 1 møte …»; ingen vannrett rulling.
- Felles oppsett, menighet A (har oppsett): endret gammelt prosjekt beholdes, oppsettet kommer fra menigheten, ingen gamle bilder/lokale referanser sendt dit.
- Felles oppsett, menighet B (uten oppsett): første endring lager menighetens oppsett uten gamle standardbilder, lokale bilder eller gamle Faste bilder (B sitt testoppsett tilbakestilt etterpå).
- Feil funnet og rettet (`src/shared/shared-setup.js`): sammenligningen tok hensyn til feltrekkefølge, så samme innhold i annen rekkefølge ble lagret som ny versjon. Nå uavhengig av rekkefølge; to nye tester. Etter retting: ingen ny versjon når ingenting endres.
- Regresjon: Faste bilder/Felles ressurser i Loop Studio (Admin legger til og sletter med bekreftelse, User låst, API-sperrer 403/CH011), Thumbnail Studio (felles kategorier, grunnoppsett per kategori) – alt som før. Developer med MFA: Fellesmappe i egen menighet (ser ikke andres private), Faste bilder låst (ikke Admin i A), Thumbnail-kategorier vises.
- `npm test` 162/162, bygg OK.
