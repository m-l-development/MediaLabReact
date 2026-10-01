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
