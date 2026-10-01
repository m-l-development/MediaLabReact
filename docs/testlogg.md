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
