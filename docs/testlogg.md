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
