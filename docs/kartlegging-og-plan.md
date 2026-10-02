# ConnectHub – kartlegging og plan (fase A og B), versjon 2

Dato: 2026-10-01. Kartleggingen og planen er godkjent som dokumentasjon. **Ingen trinn er godkjent for gjennomføring.**
Hvert trinn under må godkjennes for seg før noe endres. Under arbeidet med denne versjonen er det bare gjort lesende
kontroller, pluss to små undersøkelser beskrevet i punkt 1:
- en midlertidig arbeidskopi av `main` som er fjernet igjen, uten commit
- en innlogging med en syntetisk bruker i dev som ble logget ut igjen

Merkelapper: **[Verifisert]** = kontrollert nå · **[Tidligere rapportert]** · **[Antakelse]** · **[Må undersøkes]**

---

## 0. Forbehold

- **Punkt 17.11 og resten av bestillingen mangler.** Meldingen ble kuttet ved grensen på 50 000 tegn før den nådde meg, og
  teksten finnes ikke i øktloggen **[Verifisert]**. Den kan ikke hentes fram herfra og må limes inn på nytt, gjerne i to
  meldinger. Jeg har ikke gjettet på innholdet. Det som avhenger av den, er merket **«venter på 17.11+»**.
- Ingen separate kravdokumenter fulgte med. Grunnlaget er bestillingen, `CLAUDE.md`, `docs/` og git-historikken.
- Repoet heter `zoefredrikstad-maker/MediaLabReact` (med r) **[Verifisert]**.
- Alt dev-arbeid kjøres fra repoet, som er koblet til `connecthub-dev`, og alltid med `--project-ref`.
  **`G:\MediaLab\supabase-inspect` er koblet til produksjonsdatabasen og brukes ikke.**
- Ingen commit, push, deploy eller destruktiv opprydding uten eksplisitt godkjenning. Denne filen er ikke committet.

## 0a. Siste presiseringer (2026-10-01, kveld) og instruksjoner som er erstattet

Presiseringene under gjelder foran alt annet i dokumentet og i den store instruksen «Komplett prosjektinstruks …».

| # | Tidligere instruksjon | Erstattes av |
|---|---|---|
| E1 | Instruksen §13 og §6: `register_file` skal la **Developer og Moderator** laste opp uten medlemskap | **A1 og M1 beholdes.** Developer har bare tilgang via medlemskap i menigheten. Moderator har ingen egne filrettigheter. Admin forvalter Faste. Trinn 2 er fortsatt utgått, og `register_file` endres ikke. |
| E2 | Instruksen §4: bare Moderator og Developer kan **sende inn** tilbakemelding (Admin og User: nei) | **Alle innloggede** (User, Admin, Moderator og Developer) kan sende inn. **Bare Moderator og Developer** ser innboksen og behandler, med status, prioritet, ansvarlig, interne kommentarer og Claude-prompt. |
| E3 | Instruksen §7: Moderator og Admin er «byttet om» og skal rettes som prioritert feil | **Kontrollert: rolleverdiene er riktige.** Rekkefølgen er Developer → Moderator → Admin → User i database, kode, rollebytter, etiketter og tester. Det er ingen konkret observasjon av ombytting. Ingen endring. Funksjonsfordelingen holdes adskilt fra rangen (se E4). |
| E4 | At høyere rang betyr flere funksjoner | **Rang gir ikke automatisk de underliggende rollenes funksjoner.** Developer har teknisk og systemadministrativ myndighet. Moderator har moderering og samarbeid. Admin har bruker-, menighets- og filadministrasjon i egen menighet. User har de vanlige funksjonene. |
| E5 | At Moderator skal kunne forhåndsvise som Admin i rollebytteren | **Ikke lagt til.** Dagens rollebytter beholdes inntil et konkret behov er dokumentert og en egen plan er godkjent. |
| E6 | Trinn 18 er godkjent med commit og push (tidligere i dag) | **På vent (valg c).** Ingenting fullføres, rulles tilbake, committes eller pushes. De lokale endringene og migreringene i dev står urørt. |
| E7 | Rolleoppgaven tidligere i dag: Admin har ingen tilgang til samarbeid | Gjelder administrasjon av koblinger, som bare Moderator har. **Admin og medlemmer i en koblet menighet ser og bruker Samarbeidsfilene** (7.7.3, avklart før). |
| E8 | Developer har teknisk tilgang til samarbeid | **Erstattet:** Developer ser koblinger og Samarbeidsfiler bare via medlemskap (A1, 7.7.6 spørsmål 6). |

**Dokumentasjonsmangler (registrert, ikke gjettet):**
- «Den nyeste Markdown-statusen» og TXT-filen om tilbakemeldingssystemet er ikke mottatt.
- Fortsettelsen fra punkt 17.11 i «Komplett prosjektgjennomgang» er ikke mottatt.
- Det som avhenger av disse, er merket «venter på 17.11+ / TXT».

## 1. Status

### 1.1 Verifisert
| Område | Funn |
|---|---|
| Git | `connecthub` er ren og lik origin (`56e0bd1`). `main` (`747bc15`) ligger 17 commits bak og har ingen egne commits. Lokalt er `media-lab/GIT-Guide.md` endret av deg. Den er ikke rørt. |
| Preview | Kjører `56e0bd1` og er beskyttet med Vercel Authentication. **Alle funksjoner, også sperren foran sidene (middleware), kjører i `iad1` (Washington).** |
| Production | Kjører `747bc15`: det gamle Media Lab uten ConnectHub og uten innlogging. API-funksjonen `api/ml` kjører i `iad1`. |
| `/api/ml` i produksjon | Henger: ingen svar på 20 s. |
| Vercel Blob | **Teamet `media-lab3` har ingen Blob-butikker** (`vercel blob list-stores`). Variablene `BLOB_READ_WRITE_TOKEN`, `AUTH_SECRET` og `SETUP_CODE` finnes ikke i noe miljø (`vercel env ls`, bare navn). Den gamle admin og Blob har aldri vært i bruk. |
| Miljøvariabler | Preview har dev-variablene (`connecthub-dev…`/`connecthub_dev…` og integrasjonens navn uten prefiks). Production har **hemmelige nøkler med `VITE_`-prefiks**, f.eks. tjenestenøkkel, JWT-hemmelighet og databasepassord. Det er en latent lekkasjerisiko. Production mangler ConnectHub-navnene. Ingen verdier er lest. |
| Produksjonsdatabasen | Tom: 0 tabeller, brukere, bøtter og filer. Ingen migreringer er kjørt. |
| Dev-databasen | 16 migreringer. 15 tabeller med RLS. 21 policyer, 60 funksjoner og 14 triggere. Privat bøtte `ch-files` uten Storage-policyer, slik at bare serveren når den. 0 foreldreløse filer. |
| Tester (kjørt i dag) | `npm test` 77/77. RLS 248/248 (dev og PGlite). Build OK. Sikkerhetssøket fant ingenting. Lint finnes ikke. |
| `amr` i tokenet (30-dagersgrensen) | **Passordtidspunktet beholdes uendret ved tokenfornyelse**, mens `iat` endres. Testet med to fornyelser i dev. Grensen kan derfor håndheves på serveren og i databasen uten Supabase Pro. |
| Hastefiks for `/api/ml` | Laget og testet i en midlertidig arbeidskopi av `main` (fjernet igjen). Den svarer på 2–10 ms (503 `config`) i stedet for å henge, og `main` bygger med den. Patchen er tatt vare på (punkt 4, trinn 1). |
| Mangler | «Husk meg» og hurtiginnlogging, 30-dagersgrensen, tilbakemeldingssystemet og Developer-analysen. Ingen kode eller tabeller finnes. |

### 1.2 Tidligere rapportert (ikke testet på nytt i dag)
- P4–P10.
- Testmodus.
- Ytelsestiltakene.
- Nettlesertestene (E2E) for fire roller, direkte adresser og forfalsket rollebuffer.

E2E kjøres på nytt etter hvert trinn.

### 1.3 Fortsatt åpent
| Hva | Hvordan |
|---|---|
| Vercel-plan for teamet (Hobby eller Pro) og Supabase-plan | Du ser i dashbordene. Påvirker kostnad og sikkerhetskopier (P11). |
| Om regioninnstillingen også flytter sperren (middleware) | Kontrolleres i Preview etter trinn 10 med `vercel inspect`. |

---

## 2. Avklaringer fra deg (innarbeidet)

| Tema | Beslutning |
|---|---|
| Moderator og filer | Følger rollemodellen. `register_file` rettes bare for Developer. Moderator får ingen nye filrettigheter. |
| Tilbakemelding | Alle innloggede kan sende inn. Bare Moderator og Developer kan se og behandle. Kontekst fra valgt element. Redigerbar Claude-prompt som aldri sendes automatisk til eksterne tjenester. Vern mot hemmeligheter og personopplysninger. |
| «Husk innlogging» | Dagens vedvarende innlogging beholdes som standard. Det nye er en hurtiginngang via initialikonet som brukeren velger selv. Ingen passord eller tokener lagres på nye måter. |
| 30 dager | Alternativene utredes (punkt 4, trinn 6a). Ingen større endring uten godkjent plan. |
| Analyse | Bare Developer, under egne innstillinger. «User» er en konto uten rollene Developer, Moderator eller Admin. 90 dager rådata og 24 måneder daglige tall uten bruker-ID er utgangspunktet. |
| K1–K9 (kravdokumentet) | Avklart 2026-10-01, se punkt 7.1. Tilgangsmatrisen i punkt 3 er oppdatert. |

### 2.1 Oversikt over status for kravene

**A. Avklart (beslutning tatt):**
- Moderator: bare samarbeid (K1). `register_file` rettes bare for Developer.
- Faste (K2, endret ved M1): Admin i egen menighet kan se, laste ned, overføre og slette. Brukere kan bare se og laste ned. Developer har bare rettigheter som Admin i en menighet. Moderator har ingen rettigheter. Endring av navn og flytting finnes ikke.
- Maks 4 MB per bilde og ingen undermapper (K3).
- Videofiler lastes aldri opp (K4).
- Samarbeid per menighet, se og last ned (K5).
- Brukeren endrer egen e-post; Admin kan ikke endre andres (K6).
- Admin får lese- og eksporttilgang i deaktivert menighet (K7).
- Vercel-funksjoner beholdes (K8).
- MFA for Developer og Moderator (K9).
- Tilbakemelding: alle kan sende inn, bare Moderator og Developer kan behandle.
- «Husk meg»: vedvarende innlogging som i dag, pluss hurtiginngang som brukeren velger selv.
- Analyse: bare Developer, «User»-definisjonen og oppbevaringen over.
- **Trinn 6c:** 4 timer for Developer og Moderator, 8 timer for Admin og User. Varsel, nedtelling, «Fortsett» og «Logg ut nå». Utlogging ved oppstart hvis nettleseren har vært lukket lenger enn grensen. Ingen passord eller tokener lagres på nye måter.
- **Trinn 15:** «Gratis, 200 MB» uten utløp beholdes. Ved utløp kan Admin bare lese og eksportere (ingen invitasjon eller medlemsadministrasjon). Samarbeidsfiler skjules for den andre menigheten, uten sletting, og kommer tilbake ved forlengelse.
- **Grunnkrav for filer (7.6):** menigheter ser aldri hverandres filer, unntatt Samarbeidsfiler mellom to menigheter som Moderator har koblet sammen.
- **Trinn 18 (7.7):**
  - Bare Moderator oppretter koblinger, og hver kobling får sin egen Samarbeidsfiler-mappe.
  - Overføring til mappen er et bevisst valg.
  - Når koblingen avsluttes, skjules filene uten å slettes.
- **A1–A5:** Developer har bare tilgang til filer i egne menigheter (A1). Moderator har bare tilgang til samarbeidsfiler (A2). Egen mappe (A3). Adskilte paneler i verktøyene (A4). A5 håndteres i trinn 15.

**B. Identifisert, men krever egen plan eller godkjenning før noe gjøres:**

| Trinn | Hva | Status |
|---|---|---|
| 1 | Hastefiks for `/api/ml` | **Gjennomført 2026-10-01** |
| 2 | `register_file` | **Utgått** (avklart 2026-10-01, strider mot A1) |
| 3 | Testdata | Liste klar |
| 4 | Gammel admin | Plan klar |
| 6a | 30 dager | Plan klar |
| 6b | Hurtiginngang | Plan klar |
| 6c | Utlogging etter inaktivitet | Detaljert plan til godkjenning |
| 7 | Analyse | Plan klar |
| 10 | Region | Plan klar |
| 11 | Faste: bare Admin i egen menighet (M1) | Plan klar. **Anbefales slått sammen med 18.** |
| 12 | Endre egen e-post (K6) | Plan klar |
| 13 | Deaktivert menighet (K7) | Plan klar |
| 14 | Dokumentasjonsfiler | Plan klar |
| 15 | Gratis abonnement | Avklart. Endelig plan til godkjenning. |
| 18 | Koblinger og Samarbeidsfiler, A1–A4 og M1 | **På vent (valg c).** Databasen er ferdig i dev, kode og E2E gjenstår. Godkjenning: fullfør eller rull tilbake (7.7.10). |
| 19 | Developer endrer kvote og pris per plan | **Committet og pushet (`d7bd755`).** Nettlesertestene av lagring gjenstår. Plan i 19.8, venter på godkjenning. |
| 1b | Slå `main` inn i `connecthub` | Eget trinn før P11, egen godkjenning |
| 16 | E-postvarsler | Avhenger av P11 |
| 17 | Prosjektbeskrivelser i skyen | Bare identifisert |
| P11 | Produksjon | Separat plan |

Utvidelse av K3 og K5 er satt på vent og har ikke eget trinnummer ennå.

**C. Venter på 17.11+ (teksten mangler fortsatt):**
- trinn 8: tilbakemeldingssystemet, den delen som gjelder brukerens egne tilbakemeldinger, statuser og eventuelle senere punkter
- alt annet bestillingen eventuelt sier etter 17.11, blant annet krav til P11 og sluttrapport

---

## 3. Endelig rolle- og tilgangsmatrise (målbilde, 2026-10-01 kveld)

**Rangen** er Developer (1) → Moderator (2) → Admin (3) → User (4). Rolleverdiene er kontrollert og riktige (E3). Rangen
gir ikke automatisk de underliggende rollenes funksjoner (E4). Der dagens løsning avviker, står trinnet som endrer den.

| Funksjon | Developer (MFA) | Moderator (MFA) | Admin | User |
|---|---|---|---|---|
| **Rang** | 1 | 2 | 3 | 4 |
| Vanlige funksjoner og verktøy | Ja | Ja | Ja | Ja |
| Egne opplysninger (navn og telefon) | Ja | Ja | Ja | Ja |
| Endre egen e-post med bekreftelse | Ja (trinn 12) | Ja (trinn 12) | Ja (trinn 12) | Ja (trinn 12) |
| Endre andres e-post | Nei | Nei | Nei | Nei |
| Brukere, medlemskap og invitasjoner | Systemomfattende | Nei (K1) | Egen menighet. Kan bare invitere vanlige brukere. | Nei |
| Tildele roller | Alle roller | Nei | Nei | Nei |
| Menigheter: opprette, status, kvote og navn | Ja | Nei | Nei (navnet endres ikke av Admin) | Nei |
| Abonnement | Avgjøre forespørsler. Endre kvote og pris per plan og egen kvote per menighet (trinn 19, bare med MFA, loggført). | Nei | Be om eller trekke tilbake i egen menighet. Se egen kvote og forbruk. | Se egen menighets kvote og forbruk |
| Logg | Systemomfattende | Nei | Egen menighet | Nei |
| Deaktivert menighet | Full tilgang | Nei | Les og eksporter (trinn 13; i dag: ingen) | Ingen |
| Faste: se og laste ned | Bare som medlem (A1) | Nei | Egen menighet | Egen menighet |
| Faste: laste opp, slette og overføre til Samarbeidsfiler | Bare som Admin i menigheten | Nei | **Ja, egen menighet (M1)** | Nei |
| Delt mappe | Som medlem (A1) | Nei | Egen menighet (rydder i alt) | Laste opp, slette egne, overføre til Samarbeidsfiler |
| Private filer | Bare egne | Bare egne | Bare egne | Bare egne |
| Andre menigheters vanlige filer | **Aldri uten medlemskap** (A1; i dag i dev: oppfylt etter migreringen) | **Aldri** (A2; oppfylt i dev) | Aldri | Aldri |
| Koblinger: opprette, avslutte og gjenåpne | Nei | **Ja (bare Moderator)** | Nei | Nei |
| Samarbeidsfiler: se og laste ned | Bare som medlem i en koblet menighet | **Bare filnavn og metadata** | Ja, egne koblinger | Ja, egne koblinger |
| Samarbeidsfiler: fjerne (sletter kopien) | Bare som Admin i menigheten | Nei (kan bare avslutte koblingen) | Bare egen menighets bidrag | Nei |
| Filstørrelse og mapper | Maks 4 MB per bilde, ingen undermapper (K3) | | | |
| Video | Aldri i skyen (K4) | | | |
| Tilbakemelding: sende inn (trinn 8) | Ja | Ja | **Ja** (E2) | **Ja** (E2) |
| Tilbakemelding: innboks, status, prioritet, ansvarlig, interne kommentarer og Claude-prompt (trinn 8) | Ja | Ja | Nei | Nei |
| Developer-innstillinger og analyse (trinn 7) | Ja | Nei | Nei | Nei |
| Hendelser som telles i analysen (trinn 7) | Nei | Nei | Nei | Ja |
| Rollebytter (bare grensesnittet) | Alle fire visninger | Moderator og User (E5) | Admin og User | Ingen |
| MFA påkrevd | Ja (K9) | Ja (K9) | Nei | Nei |
| Endringer i produksjon, Vercel og kostnader | Bare med din godkjenning | Nei | Nei | Nei |

Alt håndheves i databasen (RLS og `security definer`-funksjoner) og på serveren. Grensesnittet speiler bare reglene.

---

## 4. Trinn (hvert trinn må godkjennes for seg)

### Trinn 1 – Hastefiks for `/api/ml` (produksjon) – **GJENNOMFØRT 2026-10-01 (godkjent)**

**Resultat:**
- Grenen `hotfix/api-ml` ble laget fra `main` (`747bc15`), med én commit `9c536f9` som bare endrer `media-lab/api/ml.js`.
- Preview ble bygget (Ready).
- `main` ble flyttet fram (fast-forward) til `9c536f9`, og produksjonsdeployen er klar.
- **Kontroll i produksjon:**
  - `/api/ml?a=status` ga 503 `config` fem ganger, på 0,20–0,69 s (før: ikke noe svar på 20 s).
  - Forsiden gir 200.
  - I nettleseren laster forsiden, Mockups, Photo Design og den gamle admin («Serveren mangler oppsett») uten hengende forespørsler og uten JS-feil.
  - Ett `POST ?a=log` ble også sendt som kontroll. Det lagrer ingenting uten Blob.
- Ingen variabler, innstillinger eller data er endret.
- **Gjenstår (egen godkjenning):** `main` skal slås inn i `connecthub` før P11.

Planen slik den ble godkjent:


**Problem [Verifisert 2026-10-01]:**
- `GET https://media-lab-react-vyef.vercel.app/api/ml?a=status` gir ikke svar på 20 s.
- **Årsak:** `api/ml.js` på `main` har en standard-eksport. Vercel tolker den som en Node-funksjon med `(req, res)` og venter på `res.end()`, mens koden returnerer et Web-standard `Response`. Svaret sendes derfor aldri.
- **Berørt i produksjon:**
  - den gamle admin, som står fast på «Kobler til …»
  - skyfilene i Mockups og Photo Design (`ml-cloud.js`), der forespørslene henger

**Den endelige endringen:** bare filen `media-lab/api/ml.js`, 1 linje endret og 12 lagt til. Den bruker ingen ConnectHub-kode, ingen nye variabler og ingen endring i `vercel.json`.
```diff
@@ -256,7 +256,7 @@ async function route(req) {
-export default async function handler(req) {
+async function handler(req) {
   try { return await route(req); }
@@ -265,3 +265,15 @@
+/* Vercel tolker en standard-eksportert funksjon som Node-stil (req, res) … */
+export const config = { maxDuration: 20 };
+const LIMIT_MS = 15000;
+const withLimit = async req => {
+  let t; const late = new Promise(r => { t = setTimeout(() => r(err('Serveren svarte ikke i tide. Prøv igjen.', 504)), LIMIT_MS); });
+  try { return await Promise.race([handler(req), late]); } finally { clearTimeout(t); }
+};
+export const GET = withLimit;
+export const POST = withLimit;
```
Patchen ligger i arbeidsmappen min (`hotfix-api-ml.patch`) og er laget mot `origin/main` (`747bc15`).

**Testresultater (arbeidskopi av `main` med patchen, kjørt i Node 24 uten Vercel, fjernet etterpå):**
| Test | Resultat |
|---|---|
| Eksporter | `GET`, `POST`, `config`, ingen standard-eksport |
| `GET ?a=status` uten oppsett (som i produksjon) | 503 `{"error":"config","missing":["AUTH_SECRET"]}` på 7 ms |
| `GET ?a=status` med `AUTH_SECRET`, uten Blob | 503 `{"missing":["BLOB"]}` på 10 ms |
| `POST ?a=log` uten oppsett | 200 `{"ok":true}` på 6 ms. Begrenset til 30 per minutt, og ingenting lagres uten Blob. |
| Ukjent handling | 503 `config` på 3 ms |
| `vite build` av `main` med patchen | OK. Frontend er uendret, fordi API-filen ikke er med i bygget. |

**Følger etter deploy:**
- `/api/ml` svarer raskt med 503 «config», fordi den gamle backenden aldri er satt opp.
- Den gamle admin viser «Oppsett mangler» i stedet for å henge. Denne tilstanden håndteres allerede i `admin/logic.js` på `main`.
- `ml-cloud.js` tolker svaret som «frakoblet», og verktøyene viser bare de innebygde bildene, uten venting.
- Ingen data eller variabler endres.

**Fremgangsmåte (dette godkjennes):**
1. Grenen `hotfix/api-ml` lages fra `origin/main` (`747bc15`), patchen legges inn, og det gjøres én commit.
2. `push` av grenen. Vercel lager en Preview med dev-variablene. **Du kontrollerer** at `/api/ml?a=status` svarer med JSON (503 config) innen 2 s, fordi Preview er beskyttet med Vercel-innlogging og jeg ikke slipper inn uten en endring i Vercel.
3. Grenen slås inn i `main` (fast-forward) og pushes. Vercel deployer automatisk til Production.
4. **Verifisering i produksjon (bare lesing):**
   - `curl /api/ml?a=status` gir 503 JSON på under 2 s, fem ganger.
   - Forsiden gir 200.
   - `vercel inspect` viser at deployen er klar.
   - Mockups og Photo Design åpnes uten hengende forespørsler (nettleser, CDP).
5. **Etterarbeid (krever egen godkjenning, og kan tas sammen med trinn 4):** `main` slås inn i `connecthub`, slik at historikken er samlet før P11. Konflikten i `api/ml.js` løses ved å beholde `connecthub`-versjonen, som har samme rettelse pluss ConnectHub-sperren.

**Risiko:** lav.
- Endringen gjelder bare eksportformen, som allerede er brukt og testet på `connecthub`.
- `maxDuration: 20` er innenfor grensene til Vercel-planen **[Antakelse: må bekreftes mot teamets plan; standarden er minst 60 s på dagens planer]**.

**Tilbakeføring:**
1. **Raskest:** Vercel → Deployments → forrige produksjonsdeploy (`747bc15`) → «Instant Rollback». Dette gjør du i dashbordet, eller jeg gjør det etter egen godkjenning.
2. **Alternativ:** `git revert <hastefikscommit>` på `main`, push og automatisk deploy.

Ingen data må tilbakeføres.

### Trinn 2 – `register_file` for Developer – **UTGÅTT 2026-10-01**

> Utgått fordi det strider mot A1: Developer skal bare ha tilgang til filer i menigheter der Developer er medlem. Som medlem kan Developer allerede laste opp. Beskrivelsen under beholdes som dokumentasjon av årsaken.

- **Årsak [Verifisert]:**
  - `register_file` kalles av serveren og setter bare `iss`/`sub` i kravene, ikke `aal`.
  - `app.is_staff()` krever MFA og blir derfor usann.
  - `can_upload`, som bruker brukerens eget token, godtar opplastingen, men registreringen feiler med 42501 og filen fjernes igjen.
- **Endring:**
  - Ny migrering `…190000_register_file_aal.sql`. Den erstatter `register_file` med en ny parameter `p_aal`, som settes i kravene.
  - Den gamle signaturen fjernes, slik at ingen kan kalle den uten `aal`. Bare `service_role` har tilgang, som før.
  - `server/handlers/files.js` sender `p_aal: ctx.claims.aal`. `aal` kommer fra tokenet som serveren allerede har verifisert mot JWKS.
  - `app.upload_check` er uendret: Developer med MFA kan gjøre alt i aktive menigheter.
  - Moderator er ikke med i `is_staff()` siden rollemigreringen, så Moderator nektes fortsatt.
  ```sql
  create or replace function public.register_file(p_issuer text, p_subject text, p_aal text, p_church uuid, …) …
    perform set_config('request.jwt.claims', jsonb_build_object('iss', p_issuer, 'sub', p_subject, 'aal', p_aal)::text, true);
  ```
- **Berørt:** migreringen, `server/handlers/files.js`, `server/handlers/files.test.js`, `supabase/tests/rls_test.sql`. Ingen data endres.
- **Tester:**
  - **Tillatt:** Developer med MFA uten medlemskap kan laste opp til Faste og Delt i en annen menighet.
  - **Nektet:**
    - Developer uten MFA.
    - Moderator med MFA, i både Faste og Delt.
    - Admin i en annen menighet.
    - User i Faste.
    - Ukjent `aal`.
    - Direkte kall av `register_file` fra klienten (42501, som før).
  - Det samme testes via API-et (E2E). Eksisterende filer og deres metadata er uendret (antall og sjekksum før og etter).
- **Risiko:** lav. Rettelsen gjør bare at en allerede godkjent rolleregel virker.
- **Tilbakeføring:** migrering som gjenoppretter den gamle funksjonen, pluss revert av serverlinjen.

### Trinn 3 – Opprydding av testdata i dev (**ikke godkjent**)
**Bevares (kontrollert):**
- Kontoen din (`783a8a9f…`, aktiv).
- Menigheten «12» (`bb810b51…`, aktiv, 1 medlem).
- Skjermbildet (`d56368a3…`, 128 381 byte).
- Alle testbrukere, testmenigheter og testfilene `ch-test-logo/medlem/privat.png`, fordi E2E bruker dem.
- Revisjonsloggen, som ikke kan endres, og varslene.

**Foreslås fjernet eller trukket tilbake (nøyaktig liste):**
| # | Objekt | ID | Detaljer | Metode | Konsekvens |
|---|---|---|---|---|---|
| 1 | Område «CH-test rollebytte» | `c5dc9cda-6473-4880-86a5-d1864a71ebfa` | Arkivert. Opprettet av `ch-test-mod`. 1 deltakerrad (Menighet A, «left»). 0 delte filer. | `delete_space` som syntetisk Moderator | Ingen. Filene røres ikke. Loggført. |
| 2 | Område «CH-test rollebytte» | `63a2db8e-fe76-4568-8e46-075d3d7bf156` | Som over. | Som over | Ingen |
| 3 | Område «CH-test samarbeid» | `c380dac3-6eba-4bd4-94e3-e49909c037b5` | Arkivert. Opprettet av `ch-test-admin`. **Deltakerrader for Menighet A, B og «12» (alle «left»).** 0 delte filer. | Som over | Raden som viser at «12» tidligere var med, forsvinner. **Du velger: slette eller beholde.** |
| 4 | Fil `ch-test-admin-faste.png` | `c63c57f2-736f-439d-911d-c9fbca288e9d` | Faste, Menighet A, 107 byte, lagret som `c/44ebdf65…/225b6587….png`, ikke delt | `file.delete` som syntetisk Admin (fjerner rad og lagringsobjekt) | Ingen |
| 5 | Invitasjon `ch-test-new2@example.com` | `6e9214e9-8066-4fa6-8bed-6940f59e3f4d` | Venter, utløper 8. okt. | `revoke_invitation` (status endres, ingen sletting) | Ingen |
| 6 | Invitasjon `ch-test-new3@example.com` | `577b7376-c104-4e47-9c04-e02115094ed0` | Som over | Som over | Ingen |

**Kontroll etterpå (lesende):**
- 0 testområder igjen.
- Fil #4 er borte både som rad og som lagringsobjekt.
- Invitasjon #5 og #6 har status `revoked`.
- 0 foreldreløse lagringsobjekter.
- Dine tre objekter er uendret.

Du kan godkjenne hele lista eller utvalgte numre.

### Trinn 4 – Fjerne gammel admin og Blob-kode på `connecthub` (**ikke godkjent**)
- **Grunnlag [Verifisert]:** Blob er aldri brukt (ingen butikker eller variabler). `admin.dc.html` er den eneste brukeren av `api/ml.js`, `ml-cloud.js` og `@vercel/blob`. Alle verktøy bruker `ch-cloud.js`.
- **Fjernes:**
  - `admin.dc.html`
  - `src/pages/admin/` (4 filer)
  - `src/legacy/ml-cloud.js`
  - `api/ml.js`
  - `@vercel/blob` i `package.json` og `package-lock.json`
  - testen for gammel `api/ml.js` i `server/handlers/timeouts.test.js` (de andre testene i filen beholdes)
  - lenkene «Gammel admin» i `connecthub-admin/AdminPage.jsx` (to steder)
  - i18n-tekster som bare brukes der
  - beskrivelsene i `CLAUDE.md` og `docs/architecture-and-portability.md`
- **Påvirkes ikke:**
  - ConnectHub-admin (brukere, menigheter, invitasjoner, filer, abonnement, logg og samarbeid er uavhengige av den gamle).
  - `ch-cloud.js` (`MLCloud.files` til verktøyene), sperren og `vercel.json`.
- **Funksjoner som forsvinner:** «skjul innebygde bilder» og klientfeillogg til Blob fantes bare i den gamle løsningen. De har aldri virket i produksjon og har ingen data. Ønskes de, planlegges de separat.
- **Ikke i dette trinnet:** endringer i Vercel (variabler eller butikker finnes uansett ikke). `main` røres ikke. Der forsvinner den gamle løsningen først ved P11.
- **Tester:**
  - Build, `npm test` og RLS.
  - E2E: Mockups og Photo Design henter skyfiler, ConnectHub-admin for alle roller, og `/admin.dc.html` gir 404.
- **Tilbakeføring:** `git revert`.

### Trinn 6a – Passordbekreftelse etter 30 dager (endrer autentiseringen, **plan til godkjenning**)
**Dagens løsning [Verifisert]:**
- Økten fornyes i det uendelige (Supabase refresh-token), og ingenting krever nytt passord.
- Tilgangstokenet varer i 1 time.
- `amr` (metode og tidspunkt for innlogging) følger med ved fornyelse.

**Alternativer:**
| | A: `amr`-kontroll (anbefalt) | B: Supabase «time-boxed sessions» | C: bare klient |
|---|---|---|---|
| Hvordan | Databasen, API-et og sperren avviser tokener der passordinnloggingen er eldre enn 30 dager. Klienten ber om passordet. | Supabase avslutter økter etter 30 dager. | Dato i nettleseren |
| Sikkerhet | Håndheves på serveren og i RLS. Kan ikke omgås ved å endre klientdata, fordi tokenet er signert. | Sikker, men et allerede utstedt token virker i opptil 1 time. | **Uakseptabelt:** kan omgås |
| Kostnad | Ingen | Krever Supabase Pro (ca. 25 USD/mnd **[Antakelse]**) | – |
| Leverandøruavhengighet | God (vanlig JWT-krav) | Bundet til Supabase | – |

**Plan for A:**
1. Ny funksjon `app.password_fresh()`: sann hvis `amr` har `password` med tidspunkt nyere enn 30 dager.
   - Grensen settes ett sted, som en konstant i databasen og serveren.
   - Kunstig gamle tidspunkter kan brukes i tester.
2. `app.current_user_id()` gir `null` når passordet ikke er ferskt. Dermed nekter all RLS og alle funksjoner automatisk.
   - `whoami()` får et eget svar `{"reauth": true}` slik at appen kan forklare hva som skjer.
   - **Dette er kjernen i tilgangsmodellen og den største risikoen.** Den dekkes av RLS-tester for alle roller.
3. Sperren (`server/lib/gate.js`) og API-et (`server/handlers/ch.js`) sjekker det samme:
   - Sider sendes til `login.dc.html?reason=reauth&next=…`.
   - API-et svarer 401 `reauth_required`.
4. **Klient:** innloggingssiden viser «Bekreft passordet ditt» med e-posten utfylt. Ny innlogging gir en ny økt med ferskt `amr`, og den gamle økten avsluttes. Developer og Moderator må bekrefte MFA på nytt, som i dag.
5. **Invitasjon og glemt passord:** etter at passordet er satt via e-postlenke, logges brukeren automatisk inn med det nye passordet, slik at `amr` blir `password`. Ellers ville brukeren straks blitt bedt om passordet igjen.

**Risiko og tester:**
- **Risiko:** feil i trinn 2 kan stenge alle ute.
- **Risikodemping:** dev først, RLS-tester med gamle og ferske `amr` for alle roller, og E2E for innlogging, invitasjon, glemt passord og MFA. Ved feil tilbakeføres migreringen og serverendringen, og tilgangen virker straks igjen.
- **Tester:** at tokenfornyelse ikke nullstiller grensen (verifisert at `amr` er uendret), og at et token med `amr` eldre enn 30 dager avvises i RLS, API og sperre.
- Merk: en utlogget eller tilbakekalt økt avvises allerede av Supabase ved fornyelse.

**Berørt:**
- ny migrering
- `server/lib/gate.js`, `server/handlers/ch.js`
- `src/shared/auth-gate.js`, `src/pages/login/LoginPage.jsx`
- `services/auth.js`, `adapters/supabase/auth.js`
- i18n og testene

### Trinn 6b – «Husk meg» og hurtiginngang via initialikon (**plan til godkjenning**)
- **Uendret:** økten lagres vedvarende som i dag (Supabase i localStorage, beskyttet av streng CSP uten inline-skript).
- **Nytt, og bare etter brukerens eget valg:**
  - Etter innlogging vises én gang et lite kort «Vis meg som hurtiginngang på denne enheten?». Det kan også slås av og på i kontomenyen.
  - Ved ja lagres et **hint** lokalt (`ch.quick`): initialer og e-postadresse. Ingen passord og ingen tokener.
  - Innloggingssiden viser bare initialikonet. Navn og e-post vises ikke før man trykker.
  - Trykk på ikonet:
    - Med en gyldig økt der passordet fortsatt er ferskt (trinn 6a): rett inn.
    - Ellers: passordfeltet med e-posten utfylt.
    - Etter vanlig utlogging er økten avsluttet, så det kreves alltid passord.
  - «Glem denne enheten» finnes i kontomenyen og som en liten lukkeknapp på ikonet. «Logg ut og fjern mine lokale data» fjerner også hintet.
- **Vurdert, men ikke foreslått:**
  - Økt i HttpOnly-cookie via egen server: større arkitekturendring.
  - Passnøkler (WebAuthn): ikke innebygd i Supabase Auth i dag **[Antakelse]**.
- **Tester:**
  - Av som standard.
  - Valget slås på og av.
  - Ikonet vises bare med hint.
  - Ikonet gir aldri tilgang uten gyldig økt.
  - Etter utlogging kreves passord.
  - Utløpt eller tilbakekalt økt.
  - Ingen nettverksforbindelse.
  - To kontoer på samme enhet: hvert hint gjelder sin konto.
  - Tastatur og skjermleser.
- **Berørt:** `LoginPage.jsx`, `account-menu.js`, ny `src/shared/quick-login.js`, i18n og tester. Ingen databaseendring.

### Trinn 6c – Utlogging etter inaktivitet (egen sikkerhetsfunksjon, **detaljert plan til godkjenning**)

Dette er adskilt fra 30-dagersgrensen (6a). 6a krever nytt passord senest 30 dager etter innlogging uansett bruk. 6c logger
ut når enheten **ikke er i bruk** en viss tid, for å beskytte en PC som står ulåst.

**Forslag til konkrete tidsgrenser (du godkjenner tallene):**
| Rolle | Standard | Developer kan sette |
|---|---|---|
| Developer og Moderator (privilegerte) | **4 timer (avklart)** | Forslag: 1–8 timer |
| Admin og User | **8 timer (avklart)** | Forslag: 1–24 timer |

- **Avklart:** varsel, nedtelling og «Fortsett» beholdes.
- **Avklart:** har nettleseren vært lukket lenger enn grensen, logges brukeren ut ved neste oppstart.
- At Developer kan justere grensene og «av», er fortsatt bare forslag.

- Grensene lagres i en ny tabell `system_settings`. Bare Developer kan endre dem, og endringer loggføres.
- Klienten leser grensen ved oppstart.
- Den strengeste av de ekte rollene gjelder. Testmodus påvirker ikke dette.

**Hvordan aktivitet måles:**
- **Teller som aktivitet:** tastetrykk, museklikk, rulling, berøring og musebevegelse (registreres høyst én gang per 10 s).
- **Teller ikke:** at fanen bare står åpen, bakgrunnsarbeid som eksport, avspilling eller automatisk lagring, og at varsler hentes.
- **Lange jobber:** eksport og AI-arbeid holder økten aktiv mens de pågår, slik at ingen blir logget ut midt i en lang videoeksport.
- **Flere faner og vinduer deler tidspunktet** for siste aktivitet (localStorage og `BroadcastChannel`), så aktivitet i én fane holder alle i live.
- **Ved oppstart:** hvis nettleseren har vært lukket lenger enn grensen (siste aktivitet er lagret lokalt), logges økten ut før siden vises.

**Varsel før utlogging:**
- 2 minutter før vises en dialog: «Du logges ut om 2:00 på grunn av inaktivitet».
- Den har nedtelling, knappene «Fortsett» og «Logg ut nå», og leses opp av skjermleser (`aria-live`).
- All aktivitet avbryter nedtellingen.

**Utlogging:**
- Før utlogging kalles verktøyenes lagring (de samme `onUpdate({ save })`-krokene som oppdateringsvarselet bruker), slik at arbeid ikke går tapt.
- Deretter avsluttes økten **også på serveren** for denne enheten (`signOut({ scope: 'local' })` tilbakekaller refresh-tokenet).
- Innloggingssiden viser «Du ble logget ut etter X minutter uten aktivitet.»
- Lokale prosjekter blir liggende.

**Samspill med vedvarende innlogging og «Husk meg» (6b):**
- Vedvarende innlogging betyr at økten overlever når nettleseren lukkes. **Inaktivitetsgrensen gjelder likevel**, også ved oppstart.
- Med 8 timer for vanlige brukere kan man lukke nettleseren og komme tilbake senere samme dag uten ny innlogging. Neste dag kreves passord.
- «Husk meg» med initialikonet gjør ny innlogging rask: ett trykk og passord, med e-posten utfylt. Det omgår aldri inaktivitetsgrensen.

**Begrensninger (viktig):**
- **Grensen håndheves i nettleseren.**
  - Den beskytter mot at noen bruker en forlatt, ulåst PC.
  - Den beskytter **ikke** mot at noen har kopiert tokenet fra nettleseren. Et kopiert tilgangstoken virker til det utløper (inntil 1 time). Et kopiert refresh-token virker til økten tilbakekalles ved utlogging, eller til 30-dagersgrensen (6a) slår inn.
  - Hvis PC-en er avslått eller uten nett når grensen passeres, skjer utloggingen ved neste oppstart. Det er før siden vises, så det er trygt for den som bruker PC-en, men serverøkten lever til da.
  - Manipulering av klokken eller lokal lagring kan forsinke utloggingen. Det krever tilgang til PC-en, og 6a gjelder uansett.
- **Sikrere alternativ (ikke foreslått nå):**
  - Serveren lagrer siste aktivitet per økt og avviser forespørsler etter grensen, på samme måte som 6a.
  - Det gir én databaseskriving per bruker per økt og time, og er en større endring.
  - Supabase Pro har en innebygd «inactivity timeout» som koster penger.
  - Kan vurderes senere hvis kravet skjerpes.

**Berørt:**
- ny `src/shared/idle-logout.js`, kalt fra `auth-gate.js`, slik at den gjelder alle sider
- kontomenyen (viser grensen)
- `LoginPage.jsx` (melding)
- ny migrering (`system_settings`, funksjoner for å lese og sette)
- Developer-innstillingene i admin (felt for grensene)
- i18n og tester

**Tester:**
- Tidtaker med falsk klokke.
- Aktivitet nullstiller tidtakeren. Musebevegelse begrenses til én registrering per 10 s.
- Varsel etter riktig tid, «Fortsett» og «Logg ut nå».
- Flere faner holder hverandre i live.
- Oppstart etter lukket nettleser.
- Lang eksport holder økten aktiv.
- Lagring før utlogging.
- Serverøkten er tilbakekalt: refresh-tokenet avvises etterpå.
- Bare Developer kan endre grensene (RLS og API).
- Strengeste rolle gjelder, og testmodus påvirker ikke.
- Tastatur og skjermleser.

**Tilbakeføring:** grensen settes til «av», eller endringen reverteres. Ingen data påvirkes.

### Trinn 7 – Developer-analyse (**plan til godkjenning**, i tre deler)

**7a – Datamodell og logging (dev)**
- **Tabellen `usage_events`:**
  - Felter: `id`, `at`, `kind` (`page`/`action`), `name` (fra en fast liste), `user_key` (ConnectHub-bruker-ID).
  - Ingen URL-parametere, IP-adresse, nettleser eller innhold.
  - Ingen kan lese tabellen direkte (RLS uten select). Bare funksjoner skriver og leser.
- **`log_event(kind, name)`:**
  - Avgjør på serveren om kontoen er User (ingen aktiv rolle som Developer, Moderator eller Admin). Ellers lagres **ingenting**.
  - Testmodus påvirker ikke dette.
  - Ukjente navn avvises.
  - Duplikater stoppes: samme side innen 30 s, samme handling innen 2 s.
- **`usage_daily`:** dag, type, navn, antall hendelser og antall unike brukere per dag. **Uten bruker-ID**, beholdes i 24 måneder.
- **Vedlikehold:**
  - Funksjonen `usage_maintenance()` lager dagstall for dager som mangler, og sletter rådata eldre enn 90 dager.
  - Den kan kjøres flere ganger uten skade og berører bare analysedata.
  - Kjøres daglig med `pg_cron`. Utvidelsen må slås på i dev og senere i produksjon. Det er gratis **[Antakelse]**.
- **Sletting av konto (`delete_me`):** brukerens rå hendelser slettes. Dagstallene er allerede uten bruker-ID.

**Hendelser (forslag):**
- **Sidevisninger:** forsiden, Loop Studio (start og editor), Thumbnail Studio, Photo Design, Motion Design, Isolate Subject, Mockups, og ConnectHub (oversikt, menigheter, filer, samarbeid).
- **Funksjonshendelser:** eksport per verktøy (Photo, Thumbnail, Motion, Loop, Mockups), nedlasting i Isolate Subject, opplasting og nedlasting av fil, nedlasting fra samarbeid, tilbakemelding sendt.

Til sammen ca. 25 navn. Ingen tastetrykk eller detaljer.

**7b – Aggregering og tilgang**
- `usage_summary(fra, til, type, navn)` og `usage_series(...)` er bare for Developer med MFA. All aggregering skjer i databasen.
- Den gir aldri ut bruker-ID.
- **Unike brukere under 3 vises som «<3».**
- For perioder lenger enn 90 dager vises bare hendelser og daglig gjennomsnitt av unike brukere. Unike brukere over hele perioden kan ikke regnes uten rådata. Dette står forklart i visningen.

**7c – Visning**
- Ny seksjon **«Utvikler»** i ConnectHub-admin, bare for Developer, med fanene «Innstillinger» (dagens utviklerkort) og «Analyse».
- Perioder: 7, 30 (standard) og 90 dager eller egendefinert. Filtre for type og navn.
- Innhold: nøkkeltall, aktivitet over tid, mest brukte sider og funksjoner, endring mot forrige periode.
- Diagrammer som enkel SVG uten nye biblioteker. Tydelige tomtilstander. Tydelig merket fra når loggingen startet.

**Personvern:**
- Rådata er **pseudonymiserte**, ikke anonyme, i 90 dager. De har tilgangsbegrensning og slettes automatisk.
- Dagstallene er aggregerte uten ID.
- Formålet er generell produktforståelse.
- Personverninformasjonen i kontomenyen oppdateres med en setning om dette.

**Tester:**
- Tilgang for alle roller via grensesnitt, adresse, API og RLS.
- Bare User-hendelser telles.
- Interne roller lagres ikke, også i testmodus.
- Duplikater, tomme perioder, unike brukere og «<3».
- Vedlikehold kjørt to ganger gir samme resultat.
- `delete_me` sletter brukerens hendelser.
- Ingen bruker-ID i svarene.

**Berørt:**
- ny migrering
- `src/services/analytics.js`, `src/shared/analytics.js` (logging)
- `dc.jsx` og admin (sidevisninger)
- utvalgte eksport- og nedlastingspunkter i verktøyene
- ny seksjon i `connecthub-admin`, i18n og tester

### Trinn 8 – Tilbakemeldingssystem (**plan til godkjenning**, deler av det venter på 17.11+)

**8a – Datamodell (dev)**
- **Tabellen `feedback`:**
  - **Felter:** `id`, `ref` (kort referanse, f.eks. `TB-7K3Q9`), `kind` (`bug`/`feature_request`/`improvement`), `area` (fra en fast liste over ConnectHub-funksjoner), tekstfeltene fra 17.3–17.5 (maks 2000 tegn), `severity` (innsenderens vurdering, bare for feil), `priority` (internt), `status`, `context` (jsonb, se 8c), `created_by`, `created_at`, `updated_at`.
  - Statuslisten **venter på 17.11+**.
- **Tabellen `feedback_notes`:** interne notater, bare for Moderator og Developer.
- **Innsending:** `submit_feedback(...)` for alle aktive innloggede.
  - Fjerner kjente hemmelighetsmønstre i databasen før lagring, se 8e.
  - Grense på 20 innsendinger per bruker per døgn.
- **Lesing og behandling:** bare Moderator og Developer med MFA (RLS og funksjonene `set_feedback_status`, `set_feedback_priority`, `add_feedback_note`). Alt loggføres.
- Brukerens egne innsendinger (17.11) **venter på 17.11+**.

**8b – Ikon og dialog**
- Fast ikon nede til høyre, ved siden av tema- og kontoknappene, på alle innloggede sider.
- Tooltip «Tilbakemelding», `aria-label`, synlig fokus og en trykkflate på 44 px på mobil.
- Kompakt dialog med de tre typene (17.2–17.5), validering, lastetilstand, vern mot dobbel innsending og bekreftelse med referanse-ID (17.10).

**8c – Valgmodus for skjermelement**
- Et eget gjennomsiktig lag dekker skjermen og fanger alle klikk og trykk. Siden under får aldri hendelsene, så ingen handling kan utløses.
- `document.elementsFromPoint` finner elementet under laget. Tilbakemeldingsdialogen og laget selv er unntatt.
- Markeringsramme. Escape og «Avbryt» avslutter. Alle lyttere og lag fjernes når modusen avsluttes.
- **Kontekst som lagres, fra en fast liste:**
  - rute og sti uten parametere, der UUID-er blir `:id`
  - HTML-tag og rolle
  - `aria-label`, bare for knapper, lenker, faner og overskrifter, aldri for skjemafelt
  - nærmeste `data-debug-id` og `data-debug-area`
  - posisjon og størrelse i prosent
  - bygge-ID
  - grov nettleser- og skjermkategori
- Alt merkes som «bekreftet», «estimert» eller «mangler».
- **Aldri lagret:** tekstinnhold, feltverdier, HTML eller skjermbilder.
- `data-debug-id` legges bare på sentrale elementer (ca. 30).

**8d – Innboks og Claude-prompt**
- Ny seksjon «Tilbakemelding» i ConnectHub-admin (Moderator og Developer), med liste, filtre, detaljer, status, prioritet og interne notater.
- **«Lag Claude-prompt»** lages i nettleseren fra en fast mal:
  - type, område og beskrivelse (allerede renset)
  - teknisk kontekst
  - en oversikt fra `data-debug-id` til filer i repoet
  - prosjektreglene: `connecthub`, bare dev og ingen produksjon
- Prompten vises i et redigerbart felt med «Kopier». Den sendes **aldri** noe sted og lagres ikke.

**8e – Vern mot hemmeligheter og personopplysninger**
- Den samme rensingen kjøres i klienten før sending, i databasen ved lagring, og når prompten lages. Den fjerner:
  - JWT (`eyJ…`)
  - Supabase-nøkler (`sb_secret_`, `sb_publishable_`)
  - lange tilfeldige strenger
  - e-postadresser
  - telefonnumre
  - adresseparametere
- Brukeren ser en advarsel: «Ikke skriv passord eller personopplysninger.»

**Tester:**
- Alle roller kan sende inn, og bare Moderator og Developer ser innboksen (grensesnitt, adresse, API og RLS).
- Validering og dobbel innsending.
- Valgmodus: ingen handling utløses (testet på lenke, knapp, skjema og kontomeny), Escape, opprydding uten lekkasje av lyttere, og mobil.
- Konteksten inneholder ikke tekst eller feltverdier.
- Rensing av hemmeligheter, testet med syntetiske nøkkelmønstre.
- Prompten inneholder ikke e-post eller ID-er.

### Trinn 10 – Vercel-region Stockholm (`arn1`) (**plan til godkjenning**)
- **Funn [Verifisert]:**
  - `api/ch`, `api/ml` **og sperren foran sidene (middleware)** kjører i `iad1` (Washington).
  - Databasen og innloggingen ligger i Stockholm (`eu-north-1`).
  - Hver sidelasting og hvert API-kall går derfor fra Norge til USA, og serveren går tilbake til Stockholm for databasekall. Det gir en ekstra rundtur over Atlanteren, og API-kall med flere databasekall i rekkefølge gir flere.
- **Endring:**
  - Én linje i `vercel.json`: `"regions": ["arn1"]`.
  - Gjelder bare nye deployer fra grenen der den ligger. På `connecthub` påvirkes **bare Preview**, og produksjonen først ved P11.
  - Ingen endring i dashbordet.
- **Kostnad:** én region er inkludert på både Hobby og Pro **[Antakelse, må bekreftes mot teamets plan og Vercels prisside]**. Ingen nye tjenester.
- **Risiko:** lav. Variabler og funksjoner er de samme. Sperrens Edge/Node-kjøring må bekreftes i `vercel inspect` (punkt 1.3).
- **Tester:**
  - `vercel inspect` viser `[arn1]`.
  - E2E i Preview (innlogging, filer, samarbeid).
  - Måling av svartid før og etter.
- **Tilbakeføring:** fjern linjen og deploy på nytt.

### Trinn 11 – Faste: bare Admin i egen menighet forvalter (M1) (**plan til godkjenning. Anbefales slått sammen med trinn 18**)
- **Avklart (M1, 2026-10-01):**
  - **Admin** kan se, laste ned, overføre (kopi til Samarbeidsfiler) og **slette** bilder i Faste i egen menighet.
  - **Vanlige brukere** kan se og laste ned, men ikke overføre eller slette.
  - **Developer** har ingen generell tilgang til Faste i menigheter der Developer ikke er medlem. Developer har ingen egen sletterett i Faste, bare Admin-rettighetene i en menighet der Developer også er Admin.
  - **Moderator** kan ikke overføre eller slette i Faste.
  - Endring av navn finnes ikke, og flytting er en mulig separat funksjon (7.2). Ingen av delene legges til.
- **Dagens regel [Verifisert]:** `delete_file` tillater sletting for
  - den som lastet opp,
  - Admin i menigheten (fellesfiler),
  - Developer (fellesfiler i alle menigheter).
- **Avvik som må rettes i Faste:**
  - Developer kan slette i alle menigheter uten å være Admin (A1).
  - Den som lastet opp kan slette selv om vedkommende ikke lenger er Admin, f.eks. en tidligere Admin.
- **Endring:**
  - Migreringen gjør at `delete_file` for Faste (`faste`, `logoer`, `bakgrunner`, `mockups`) bare tillater `app.is_church_admin(menighet)`. Leddene for den som lastet opp og for stab fjernes for Faste.
  - Delt mappe (`bilder`) beholder sine regler: den som lastet opp sletter egne, og Admin rydder. Stabsleddet fjernes også her (A1, trinn 18).
  - Private filer er uendret: bare eieren.
- **Opplasting til Faste (forslag i tråd med M1, bekreft):** bare Admin i menigheten. Stabsleddet i `app.upload_check` fjernes, slik at en Developer som bare er medlem, ikke kan laste opp i Faste.
- **Grensesnitt:** «Slett» i Faste vises bare for Admin i menigheten.
- **Tester (RLS og API):**
  - **Tillatt:** Admin sletter Faste-fil i egen menighet (både egen og andres opplasting).
  - **Nektet:**
    - Admin i en annen menighet.
    - User.
    - Developer som bare er medlem.
    - Developer uten medlemskap.
    - Moderator.
    - Den som lastet opp, men ikke lenger er Admin.
  - **Tillatt:** Developer som også er Admin i menigheten.
  - Delt mappe virker som før.
  - Antall filer og lagringsobjekter er ellers uendret.
- **Hvorfor slå det sammen med trinn 18:** begge endrer `delete_file` og `upload_check` (A1). Det gir én migrering, ett testløp og én tilbakeføring.
- **Risiko:** lav. **Tilbakeføring:** migrering som gjenoppretter den gamle `delete_file` og `upload_check`.

### Trinn 12 – Endre egen e-post (K6) (**plan til godkjenning**)
- **I dag:**
  - Ingen endring av e-post i appen.
  - Supabase har slått på dobbel bekreftelse (`double_confirm_changes = true`), som sender lenke til både gammel og ny adresse.
  - `app_users.email` er en kopi som må holdes lik Auth.
- **Flyt:**
  1. Brukeren velger «Endre e-post» i kontomenyen og må bekrefte passordet først (vern mot overtakelse av en åpen økt).
  2. Klienten ber Supabase om endringen, og Supabase sender lenker til begge adressene.
  3. Når begge er bekreftet, gjør ny innlogging at serveren (`account.sync_email`) leser **den verifiserte adressen fra Auth** (aldri fra klienten) og oppdaterer `app_users.email`. Endringen loggføres.
  4. Kollisjon med en annen konto eller en ventende invitasjon avvises med forklaring.
- **Admin:** ingen funksjon for å endre andres e-post. Det testes at et direkte kall mot `app_users.email` avvises av RLS.
- **Avhengigheter:**
  - E-post fra Supabase i dev når bare teamets adresser (2 per time).
  - E2E bruker derfor lenker generert via serverens admin-API med syntetiske brukere.
  - I produksjon kreves egen SMTP (P11).
- **Berørt:** kontomenyen, `services/auth.js`, adapteren, `LoginPage.jsx` (lenketype `email_change`), `server/handlers` (ny handling), migrering (funksjon for synkronisering), i18n og tester.
- **Tester:**
  - Feil passord stopper endringen.
  - Synkronisering bruker bare verifisert Auth-adresse.
  - Kollisjon avvises.
  - Admin og andre kan ikke endre e-post.
  - Logging skjer.
  - Invitasjoner og innlogging virker etterpå.
- **Risiko:** middels (kontoidentitet). **Tilbakeføring:** revert. E-postadresser som allerede er endret, beholdes, siden de er bekreftet.

### Trinn 13 – Admin i deaktivert menighet (K7) (**plan til godkjenning**)
- **I dag [Verifisert]:**
  - `app.is_church_admin()` krever at menigheten er aktiv.
  - Admin i en deaktivert menighet eller en menighet som venter på sletting mister all tilgang, også til `export_church`.
- **Endring:**
  - Ny funksjon `app.is_church_admin_readonly(church)` (samme rolle og medlemskap, men gjelder også statusene `temporarily_disabled` og `pending_deletion`). Den brukes **bare** i lesepolicyer for medlemmer, brukere, invitasjoner, filmetadata og logg, samt i `export_church` og `file_keys` (nedlasting ved eksport).
  - Alle endringsfunksjoner bruker fortsatt `is_church_admin` og avvises.
  - Vanlige medlemmer har fortsatt ingen tilgang.
  - Grensesnittet viser menigheten med banneret «Deaktivert – bare lesing og eksport».
- **Tester:**
  - Admin i en deaktivert menighet kan lese og eksportere.
  - Alle endringer avvises: invitasjon, medlemskap, filer og melding.
  - Medlemmer har ingen tilgang.
  - Admin i en annen menighet har ingen tilgang.
  - Etter reaktivering er alt som før.
- **Risiko:** middels (RLS for lesing utvides). **Tilbakeføring:** migrering som gjenoppretter policyene.

### Trinn 14 – Fire dokumentasjonsfiler (**plan til godkjenning**, bare dokumentasjon)
| Fil | Innhold |
|---|---|
| `docs/database-schema.md` | Alle tabeller og felter med typer, nøkler, indekser, begrensninger og regler for sletting, samt relasjoner (diagram i tekst). Forenklingene i 7.2 begrunnes. |
| `docs/database-migrations.md` | Migreringene i rekkefølge, med formål, hva som kan reverteres, og hvordan de kjøres mot dev og prod (alltid `--project-ref`, aldri `supabase-inspect`). |
| `docs/security-and-rls.md` | Policy for policy, med hvem som kan lese, opprette, endre og slette. Hva som håndheves av RLS, av funksjoner, av serveren og av lagringen. Tilgangsmatrisen. Testdekning. |
| `docs/data-migration.md` | At det ikke finnes data fra den gamle løsningen (verifisert), koblingen av lokale data (P4), og en mal for eksport og import ved fremtidig bytte av leverandør. |
- **Risiko:** ingen.
- **Test:** innholdet sammenlignes mot databasen i dev med en lesende spørring, slik at dokumentasjonen og den faktiske løsningen stemmer.

### Trinn 15 – Utløp av gratis abonnement (**planretning godkjent, endelig plan til godkjenning**)

**Avklart virkning ved utløp:**
- Brukerne kan fortsatt laste ned bilder.
- Opplasting og samarbeid stoppes.
- Admin kan lese og eksportere.
- De lokale verktøyene i Media Lab virker som før.

**Avklart 2026-10-01:**
- Menigheter uten registrert abonnement har fortsatt **«Gratis, 200 MB» uten utløp** og påvirkes ikke.
- Bare abonnementer med utløpsdato kan utløpe.
- Når et abonnement er utløpt, kan Admin **ikke** invitere eller administrere medlemmer. Medlemsadministrasjonen begrenses også, slik at Admin bare kan lese og eksportere.
- Bilder som menigheten har delt via Samarbeidsfiler, **skjules for de andre menighetene**. De slettes ikke (se også 7.6 og trinn 18).

**Opprinnelig forutsetning (nå besvart):**
- I dag har menigheter uten registrert abonnement standardplanen «Gratis, 200 MB» **uten utløp** **[Verifisert i grensesnittet: «standard: Gratis, 200 MB»]**.
- Skal denne standarden fortsatt finnes?
  - **Hvis ja:** bare abonnementer med utløpsdato utløper. Når de utløper, faller menigheten **ikke** tilbake til standarden, men får status «utløpt» med begrensningene over.
  - **Hvis nei:** alle menigheter må ha et registrert abonnement. Da må eksisterende menigheter i dev, og ved P11 de første i produksjon, få et abonnement ved oppstart.

**Database:**
- Nye felt i `church_subscriptions`:
  - `starts_at`
  - `expires_at` (tom = uten utløp)
  - status utvides med `expired`
- Ny tabell `subscription_events` (historikk): hendelse, utført av, tidspunkt, begrunnelse, gammel og ny utløpsdato.
- Ny funksjon `app.church_service_ok(church)`: sann hvis abonnementet er aktivt og ikke utløpt. Den regnes ut ved hver kontroll, så det finnes ingen bufret tilstand som kan bli feil.
- **Håndheves i:**
  - `app.upload_check`, brukt av `can_upload` og `register_file`: opplasting avvises med feilkoden `subscription_expired`.
  - `app.in_space`: medlemmer av en utløpt menighet ser ikke samarbeidsområder.
  - `invite_to_space` og `share_file_to_space`: en utløpt menighet kan ikke få tilgang eller dele.
- **Påvirkes ikke:** nedlasting (`files_select` og `file_keys`), Admins lesing og eksport, og innlogging.
- **Avklart:** Admin kan ikke invitere eller endre medlemskap. Det håndheves i `create_invitation`, `reissue_invitation`, oppdatering av medlemskap og `send_church_message` via `app.church_service_ok`. Lesing og eksport er tillatt.
- **Avklart:** delte bilder fra en menighet med utløpt abonnement skjules for andre i `files_select`, `visible_file_keys` og `space_files`. Delingsradene blir liggende, så alt kommer tilbake ved forlengelse.

**API:**
- `file.upload` gir 403 `subscription_expired` med feilmeldingen «Abonnementet er utløpt. Opplasting er stoppet.».
- Andre API-handlinger er uendret.

**Grensesnitt (bare hjelp for brukeren, rettighetene håndheves over):**
- Banner i ConnectHub og i filpanelene i verktøyene: «Abonnementet utløp [dato]. Opplasting og samarbeid er stoppet. Kontakt menighetens admin.»
- Knappene for opplasting er deaktivert med forklaring. Samarbeid viser en forklaring i stedet for områdene.

**Varsling:**
- Varsel i appen til menighetens admin 14 dager og 3 dager før utløp, og på utløpsdagen. Varsel til medlemmene på utløpsdagen.
- Developer ser en liste over abonnementer som utløper innen 30 dager.
- E-post kommer i tillegg når trinn 16 er på plass.
- Jobben kjøres daglig med `pg_cron`, samme utvidelse som i trinn 7. Den kan kjøres flere ganger uten skade.

**Fornyelse og forlengelse:**
- **Admin:** «Be om forlengelse» bruker den eksisterende forespørselsflyten (ny type `renewal`).
- **Developer:**
  - `extend_subscription(church, ny_utløpsdato, begrunnelse)` gir status `active`.
  - `end_subscription(church, begrunnelse)` avslutter og setter utløpsdatoen til i dag.
  - Begge loggføres i `subscription_events` og revisjonsloggen.
  - Moderator kan ikke forlenge eller avslutte.
- **Ved forlengelse gjenopprettes alt med en gang:**
  - Opplasting og samarbeid åpnes igjen.
  - Deltakelse i områder er ikke fjernet underveis, så tidligere tilganger og delinger kommer tilbake.
  - Ingen data er slettet eller endret under utløpet.

**Tester:**
- Bare Developer kan forlenge eller avslutte. Moderator, Admin og User nektes.
- Utløp på riktig dato (kunstig dato i testene).
- Opplasting nektes etter utløp (RLS og API). Nedlasting virker. Admin kan eksportere.
- Medlemmer ser ikke samarbeid etter utløp.
- Forlengelse gjenoppretter alt.
- Varsler blir sendt (én gang, også når jobben kjøres to ganger).
- Menigheter uten utløpsdato påvirkes ikke.
- Historikken er komplett.

**Risiko:** middels, fordi en feil dato eller regel kan stoppe opplasting for en hel menighet. **Risikodemping:** begrensningen er regnet ut i sanntid og kan oppheves straks med `extend_subscription`.

**Tilbakeføring:** migrering som fjerner kontrollen i `upload_check` og `in_space`. Feltene og historikken kan bli liggende uten virkning, og ingen data går tapt.

### Trinn 16 – E-postvarsler (**avhenger av e-postleverandør i P11**)
- **I dag:** bare varsler i appen (`notifications`). Invitasjoner sendes via Supabase sin innebygde e-post (begrenset).
- **Forslag:**
  - Tabellen `notification_preferences`: type og kanal per bruker. Obligatoriske sikkerhets- og kontovarsler kan ikke slås av.
  - En adapter for utsending på serveren (`server/adapters/mail-…`), slik at leverandøren kan byttes.
  - Kø og nye forsøk ved feil.
- **Avhengighet:**
  - Valg av leverandør, med alternativer, kostnad og databehandleravtale. Det legges fram i P11, som kravdokumentet §9 sier.
  - Ingenting integreres før det.
- **Tester:** obligatoriske varsler kan ikke slås av, innstillingene respekteres, feil fra leverandøren håndteres, og ingen hemmeligheter står i loggene.

### Trinn 17 – Prosjektbeskrivelser i skyen (K4) (**bare identifisert**)
- **Mulighet:** Motion Design-prosjekter (`prosjekt.motion.json`, uten mediefiler) lagres privat per bruker i skyen, slik at prosjektet kan åpnes på en annen PC. Mediefilene må da finnes i prosjektmappen der.
- **Ikke planlagt.** Det krever egen vurdering av personvern, lagring og konflikthåndtering, pluss godkjenning. Videofiler lastes aldri opp.

---

### Trinn 19 – Developer endrer lagringskvote og pris per abonnementsplan (**IMPLEMENTERT I DEV 2026-10-01, ikke committet. Se 19.7.**)

**Beslutninger (2026-10-01, siste):**
- Developer skal kunne **redigere pris og lagringskvote per plan** i administrasjonspanelet. Funksjonen klargjøres nå, men **verdiene settes av deg senere**.
- **Dagens verdier beholdes** (Gratis 200 MB / 0 kr, Standard 1024 MB / «Avtales», Utvidet 5120 MB / «Avtales»). **Ingen nye standardverdier, beløp eller kvoter** legges inn, og migreringen endrer ingen plan- eller kvoteverdier.
- **Gratis-planen og menigheter uten registrert abonnement:** dagens oppførsel beholdes. Det er **ingen automatisk kobling** (alternativ G1). Nye menigheter får fortsatt 200 MB fra standardverdien på feltet.
- **Avsluttede abonnementer:** dagens oppførsel beholdes. Kvoten blir stående og endres ikke av planendringer.
- Kravene om MFA, logg (gammel og ny verdi, hvem og når), forhåndsvisning, beskyttelse av egne kvoter og ingen sletting av filer står ved lag (punkt 1–6 under).

**Avklarte krav (2026-10-01):**
1. Bare **Developer med bekreftet MFA** kan endre planenes kvote og pris.
2. Alle endringer **loggføres med gammel verdi, ny verdi, tidspunkt og hvem** som utførte dem.
3. Det skal være **tydelig hvilke menigheter som berøres** av en endring i kvoten, og det skal vises *før* endringen lagres.
4. **Egne kvoter for enkeltmenigheter skal ikke overskrives automatisk.**
5. **Ingen filer slettes** når kvoten reduseres. Nye opplastinger blokkeres bare når forbruket er over kvoten.
6. Endringene valideres og testes for alle roller, også ved **direkte kall** mot databasefunksjonen og tabellene.
7. Det er **ikke avgjort** at endringer skal gjelde menigheter uten registrert abonnement (se 19.3).

#### 19.1 Slik er det i dag [Verifisert i kode og dev-databasen]
| Hva | Hvordan |
|---|---|
| Planene | Tabellen `plans`: `gratis` 200 MB / 0 kr, `standard` 1024 MB / tom («Avtales»), `utvidet` 5120 MB / tom. Alle innloggede kan lese. **Ingen kan endre** (ingen skriverettigheter, bare via migrering). |
| Menighetens kvote | Feltet `churches.storage_quota_mb` (0–10 240 MB). Det er **den eneste kvoten som brukes** ved opplasting (`app.upload_check`), overføring (`app.transfer_check`) og visning (`storage_usage`). |
| Når et abonnement godkjennes | `decide_subscription_request` kopierer planens kvote til menighetens felt. Etterpå er det ingen kobling, så endrer planen seg, endres ikke menigheten. |
| Egen kvote for en menighet | Developer endrer feltet direkte (Menighet → Innstillinger; RLS: bare stab kan oppdatere `churches`). **Det finnes ikke noe merke** som skiller en egen kvote fra en plankvote. |
| Logg i dag | Den generelle loggen (`churches.update`) registrerer *at* menigheten er endret, men **ikke** gammel og ny kvote. Planene har ingen logg (de kan ikke endres). |
| Dev-data nå | `CH-test Menighet A`: abonnement `standard`, 1024 MB (lik planen). `CH-test Menighet B` og `12`: **ikke registrert abonnement**, 200 MB (standardverdien). |

#### 19.2 Teknisk omfang
**Database (ny migrering, ingen eksisterende verdier endres ved kjøring):**
- **Nytt felt `churches.quota_custom`** (sann/usann, standard usann). Det markerer at Developer har satt en egen kvote, og en slik kvote endres aldri automatisk.
  - **Ved migreringen** settes merket bare der kvoten avviker fra det den skal være etter dagens regler. Det vil si: lik planens kvote ved aktivt abonnement, og 200 MB uten abonnement.
  - I dev gjelder det **ingen** av de tre menighetene. Prod er tom.
  - Feltet påvirker ikke kvoten selv.
- **`update_plan(kode, kvote_mb, pris_kr_mnd, oppdater_menigheter)`**:
  - Bare Developer med MFA (`app.is_developer()`, som krever `aal2`).
  - **Validering:** kjent plan; kvote 0–10 240 MB (samme grense som i dag); pris 0 eller mer, eller tom («Avtales»).
  - **Logg:** `plans.update` med `{plan, gammel: {kvote, pris}, ny: {kvote, pris}, menigheter_oppdatert: n}`. Utført av (`actor_user_id`) og tidspunkt (`created_at`) føres automatisk, og loggen kan ikke endres (P3/P8).
  - **Når `oppdater_menigheter` er valgt**, settes ny kvote bare for menigheter med **aktivt abonnement på planen**, `quota_custom = usann` og kvote **lik planens gamle kvote**.
  - Hver menighet som endres, får sin egen loggrad `churches.quota` med gammel og ny kvote og årsaken «plan endret».
  - Menigheter **uten** registrert abonnement og menigheter med **avsluttet** abonnement berøres aldri (G1, 19.3). Forhåndsvisningen viser dem som «hoppes over» med årsak.
- **`plan_change_preview(kode, ny_kvote)`:** bare Developer med MFA, bare lesing. Gir én rad per menighet som ville blitt berørt, med:
  - navn og nåværende kvote
  - forbruk og ny kvote
  - «over kvoten etter endring» (ja/nei)
  - om den hoppes over, og hvorfor: egen kvote, annen plan eller ikke registrert abonnement

  Grensesnittet viser dette før lagring.
- **`set_church_quota(menighet, kvote_mb)`:** erstatter dagens direkte oppdatering av menighetens kvote.
  - Bare Developer med MFA. Setter `quota_custom = sann`.
  - Logg `churches.quota` med gammel og ny verdi og årsaken «egen kvote».
  - Rettigheten til direkte `update (storage_quota_mb)` på `churches` **trekkes tilbake**, slik at alle kvoteendringer går gjennom logget funksjon.
- **`decide_subscription_request` (godkjenning):** som i dag settes planens kvote. **Spørsmål:** skal en godkjenning også fjerne en egen kvote?
  - Forslag: nei. Egen kvote beholdes, og godkjenningen viser «egen kvote beholdes (X MB)».
- **Ingen filer røres.**
  - Opplasting og overføring sjekker allerede `brukt + ny fil > kvote` og avviser med «kvoten er brukt opp» (54000).
  - Lavere kvote betyr bare at nye opplastinger stoppes til forbruket er under kvoten.
  - Nedlasting, visning og eksport virker som før.

**RLS og rettigheter:**
| Objekt | Lese | Skrive |
|---|---|---|
| `plans` | Alle innloggede (uendret) | **Ingen direkte.** Bare `update_plan` (Developer med MFA). |
| `churches.storage_quota_mb` og `quota_custom` | Som i dag: medlemmer og Admin i egen menighet, Developer alle | **Ingen direkte** (rettigheten trekkes tilbake). Bare `set_church_quota`, `update_plan` og godkjenning av abonnement (Developer med MFA). |
| `plan_change_preview` | Developer med MFA | – |
| Logg (`audit_logs`) | Som i dag: Developer alle, Admin egen menighet | Bare automatisk. Kan ikke endres. |

**Server:** ingen endring. Alt går direkte mot databasen med brukerens token.

**Grensesnitt (`connecthub-admin/sections.jsx`, bare for Developer):**
- Abonnement → Planer: «Endre» per plan, med felter for lagring (MB) og pris (kr/mnd, tom = «Avtales»).
- Avkrysning for «Oppdater også menigheter på planen».
- **Forhåndsvisning** av berørte og overhoppede menigheter, med varsel om de som kommer over kvoten. Deretter en bekreftelse.
- Menighet → Innstillinger: «Lagringskvote» bruker `set_church_quota` og viser merket «egen kvote». Knappen «Følg planen igjen» fjerner merket og setter planens kvote, og den loggføres.
- Teksten «stab godkjenner» rettes til «Developer godkjenner».
- Engelske tekster legges i i18n.
- **Avgrensning:** valuta (NOK) og frekvens (måned) er som i dag. En full prismodell hører til trinn 15 og en senere betalingsplan (kravdokumentet §10).

**Tilgangsmatrise for trinn 19:**
| Handling | Developer (MFA) | Developer uten MFA | Moderator | Admin | User |
|---|---|---|---|---|---|
| Se planer, kvoter og priser | Ja | Ja | Ja | Ja | Ja |
| Endre kvote og pris for en plan | **Ja** | Nei | Nei | Nei | Nei |
| Se forhåndsvisning av berørte menigheter | **Ja** | Nei | Nei | Nei | Nei |
| Sette egen kvote for en menighet | **Ja** | Nei | Nei | Nei | Nei |
| Se egen menighets kvote og forbruk | Som medlem | Som medlem | Nei | Ja | Ja |
| Lese logg over endringene | Ja | Ja | Nei | Bare egen menighets kvoteendringer | Nei |

#### 19.3 Gratis-planen og menigheter uten registrert abonnement – **avgjort: G1 (ingen kobling, dagens oppførsel)**

> Alternativene under er beholdt som dokumentasjon. **Valgt: G1.** Endringer i Gratis-planen påvirker bare nye godkjenninger av Gratis-forespørsler. Menigheter uten registrert abonnement og menigheter med avsluttet abonnement endres ikke. G2 og G3 krever en egen, senere beslutning.

**Slik identifiseres de i dag:** menigheter **uten rad** i `church_subscriptions`. I dev gjelder det `CH-test Menighet B` og `12`.
- Avsluttede abonnementer (`status = 'cancelled'`) behandles i dag ikke som «uten abonnement». Kvoten blir stående på siste plan.
- **Spørsmål:** skal avsluttede også regnes som «uten abonnement»?

**Slik får de 200 MB i dag:** bare fra **standardverdien på feltet** (`default 200`), satt da menigheten ble opprettet. Det finnes **ingen kobling til Gratis-planen**. Gratis-planens 200 MB og standardverdien er like nå, men uavhengige.

**Alternativer:**
| | **G1: Ingen kobling (som i dag)** | **G2: Nye menigheter følger Gratis-planen** | **G3: Alle uten abonnement følger Gratis-planen** |
|---|---|---|---|
| Hva endres når Gratis-kvoten endres | Bare nye godkjenninger av Gratis-forespørsler | I tillegg får **nye** menigheter den gjeldende Gratis-kvoten | I tillegg oppdateres **eksisterende** menigheter uten abonnement og uten egen kvote, etter forhåndsvisning og bekreftelse |
| Eksisterende menigheter uten abonnement | Uendret | Uendret | Endres (bare de uten egen kvote) |
| Nye menigheter | Får fortsatt 200 MB | Får Gratis-planens kvote | Får Gratis-planens kvote |
| Fordel | Enklest. Ingen menighet endres uten egen handling. | Planlisten og nye menigheter stemmer. Ingen eksisterende påvirkes. | Alt er konsistent: «Gratis, X MB» betyr det samme for alle |
| Ulempe | Planlisten kan vise f.eks. «Gratis, 500 MB» mens menigheter uten abonnement har 200 MB. Det er forvirrende. | Gamle og nye menigheter uten abonnement kan få ulik kvote | Én endring kan påvirke mange menigheter samtidig. En lavere kvote kan stoppe opplasting mange steder. Det dempes med forhåndsvisning og bekreftelse. |
| Teknisk | Ingen tillegg | Standardverdien erstattes av en trigger som leser Gratis-planen ved opprettelse | Som G2, pluss egen gruppe i forhåndsvisningen og i `update_plan` |

Uansett alternativ slettes ingen filer, egne kvoter overskrives ikke, og hver endrede menighet loggføres med gammel og ny kvote.

#### 19.4 Tester
**RLS og databasefunksjoner (PGlite og dev), alle roller, også direkte kall:**
- **`update_plan`:**
  - Developer med MFA: tillatt.
  - Developer uten MFA, Moderator, Admin, User og ikke innlogget: **nektet (42501)**.
- **Direkte skriving:** `update`/`insert`/`delete` på `plans` og `update churches set storage_quota_mb` er **nektet for alle roller**, også Developer.
- **Validering:** ukjent plan, kvote under 0 eller over 10 240, og negativ pris avvises (22023/23514). Tom pris godtas.
- **Logg:** `plans.update` har gammel og ny kvote og pris, utført av og tidspunkt. `churches.quota` finnes per endret menighet. Loggen kan ikke endres.
- **Oppdatering av menigheter:**
  - Bare menigheter på planen med standardkvote endres.
  - Egen kvote, en annen plan, menigheter uten abonnement og avsluttede abonnementer er urørt (G1).
- **Ingen verdier endres ved migreringen:** planenes kvote og pris og alle menigheters kvoter er like før og etter (kontrollert med sjekksum i dev).
- **Forhåndsvisningen** gir de samme menighetene som faktisk endres, og markerer korrekt de som kommer over kvoten.
- **`set_church_quota`:** setter merket og logger. Bare Developer med MFA.
- **Lavere kvote enn forbruket:**
  - Ingen filer slettes (antall og sjekksum før og etter).
  - Ny opplasting avvises (54000).
  - Nedlasting virker.
  - Etter at kvoten er hevet igjen, virker opplasting.

**Grensesnitt og E2E:**
- Developer endrer pris og kvote, ser forhåndsvisningen og bekrefter. Visningen oppdateres.
- Moderator, Admin og User ser ingen «Endre»-knapp, og direkte RPC-kall fra deres økt gir 403.

#### 19.5 Risiko og tilbakeføring
- **Risiko: lav til middels.**
  - Feil utvalg av menigheter kan endre kvoter som ikke skulle endres. Det dempes med merket for egen kvote, forhåndsvisning, bekreftelse og tester.
  - En lavere kvote kan stoppe opplasting. Det vises før lagring og kan rettes straks.
  - Ingen data slettes.
- **Tilbakeføring:**
  - En migrering fjerner `update_plan`, `plan_change_preview` og `set_church_quota`, og gir tilbake den direkte oppdateringsrettigheten på kvoten.
  - `quota_custom` kan bli liggende uten virkning. Å fjerne feltet krever egen godkjenning.
  - Endrede plan- og menighetsverdier kan settes tilbake ut fra loggen, som har gamle verdier.
  - Produksjonen påvirkes ikke før P11.
- **Avhengigheter:** uavhengig av trinn 18 og 15. Trinn 15 (utløp) bygger senere på de samme kvotefeltene.

#### 19.6 Endelig omfang og hva som trengs før implementering
**Endelig omfang (når det godkjennes):**
- **Én ny migrering** i `connecthub-dev`:
  - feltet `churches.quota_custom`
  - funksjonene `update_plan`, `plan_change_preview` og `set_church_quota`
  - justert `decide_subscription_request`, slik at egen kvote beholdes (se under)
  - direkte oppdatering av `storage_quota_mb` trekkes tilbake
  - **ingen endring av verdier**
- **Grensesnitt:**
  - Abonnement → Planer: redigering for Developer med forhåndsvisning og bekreftelse.
  - Menighet → Innstillinger: egen kvote via logget funksjon, merket «egen kvote» og «Følg planen igjen».
  - Rettet tekst «Developer godkjenner» og i18n.
- **Tester:**
  - RLS og funksjoner i PGlite og dev, for alle roller og med direkte kall (19.4).
  - Tjenestetest av `admin`/`subscriptions` mot den falske adapteren.
  - E2E for Developer, og avvisning for Moderator, Admin og User.
  - Kontroll med sjekksum av at ingen verdier og filer er endret.
- **Commit og push:** først etter egen godkjenning.

**Trenger fra deg:**
1. **Egen kvote ved godkjenning av abonnement:** forslaget er at en egen kvote **beholdes** når Developer godkjenner en abonnementsforespørsel, og at godkjenningen viser «egen kvote beholdes (X MB)». Uten egen kvote settes planens kvote som i dag. Bekreft, eller velg at godkjenningen skal overskrive.
2. **Uttrykkelig godkjenning av implementeringen av trinn 19** i `connecthub-dev`. Commit og push godkjennes separat.

#### 19.7 Resultat (implementert i `connecthub-dev`, ikke committet)
**Endret eller nytt:**
- **Migrering** `supabase/migrations/20261001200000_plan_editing.sql`, kjørt i dev:
  - feltet `churches.quota_custom`
  - funksjonene `set_church_quota`, `follow_plan_quota`, `plan_change_preview` og `update_plan`
  - `decide_subscription_request` beholder egen kvote og logger
  - `app.log_quota`
  - direkte `update (storage_quota_mb)` er trukket tilbake
- **Tjenester:** `services/admin.js` (`setQuota` via funksjon, `followPlanQuota`, `quota_custom`) og `services/community.js` (`updatePlan`, `planPreview`).
- **Grensesnitt:**
  - `connecthub-admin/sections.jsx`: `PlanEditor` med validering, forhåndsvisning, bekreftelse og avbryt.
  - Egen kvote: merket «Egen kvote», «Følg planen igjen».
  - «Egen kvote beholdes (X MB)» ved godkjenning.
  - Rettet tekst «Developer godkjenner».
  - Loggnavnene `plans.update` og `churches.quota`.
  - `admin.css`.
- **Tekster:** 38 nye engelske tekster i `i18n.js`.
- **Tester:**
  - `supabase/tests/rls_test.sql`: ny blokk med 59 tester, uavhengig av trinn 18.
  - `src/services/contract.test.js`: 1 ny tjenestetest.

**Tester kjørt (gren `connecthub`, miljø `connecthub-dev` og lokalt):**
| Test | Resultat |
|---|---|
| RLS og funksjoner i PGlite | **347/347** |
| RLS og funksjoner i `connecthub-dev` | **347/347** |
| `npm test` | **82/82** |
| `npm run build` og sikkerhetssøk i bygget | OK, ingen funn. Alle inline-skript står i CSP. |
| E2E Developer (MFA) | «Endre» på 3 planer. Lagre er av uten endring. Ugyldig kvote gir feilmelding. Forhåndsvisning kreves før lagring («CH-test Menighet A: 1024 → 2048 MB, Endres»). Bekreftelsen viser endringen. **Ikke lagret** (avvist med vilje). Innstillinger viser teksten om kvote og logg. |
| E2E Admin | Ingen «Endre». `update_plan`, `plan_change_preview` og `set_church_quota` gir 403. Direkte PATCH av `plans` og `churches.storage_quota_mb` gir 403. |
| E2E Moderator (MFA) og User | Abonnement gir «Ingen tilgang». De samme fem kallene gir 403. |
| Verdier og filer | **Uendret** før og etter migrering og alle tester (sjekksum): plan- og kvoteverdier, 5 filer og 5 lagringsobjekter. Ingen menighet ble merket med egen kvote. |

**Gjenstående test før trinn 19 regnes som fullstendig verifisert (registrert 2026-10-02):**
- I nettleseren i `connecthub-dev` må tre ting verifiseres:
  1. at en planendring faktisk lagres
  2. at godkjenning av et abonnement beholder egen kvote («Egen kvote beholdes (X MB)»)
  3. at en lavere kvote stopper opplasting uten å slette filer
- Det krever at testverdier settes og settes tilbake i dev, f.eks. på en egen testmenighet. Det må godkjennes for seg, fordi verdiene i dev ellers ikke skal endres.
- Til da er dette bare verifisert i databasetestene, som rulles tilbake.

**Avvik og begrensninger:**
- Det å *lagre* en planendring, lavere kvote (opplasting stoppes, nedlasting virker, ingen filer slettes) og godkjenning med egen kvote er testet i databasetestene, som rulles tilbake. Det er **ikke** testet i nettleseren, fordi de faktiske verdiene i dev ikke skal endres.
- Developer uten MFA er testet i databasetestene. I nettleseren går innloggingen alltid via MFA.
- **Felles filer med trinn 18:** begge trinnene endrer `services/community.js`, `supabase/tests/rls_test.sql` og `i18n.js`. Ved commit må endringene for trinn 19 tas med for seg, med delvis staging (`git add -p`), mens trinn 18 står på vent. Alternativt committes begge sammen når trinn 18 er ferdig. Testblokken for trinn 19 er gjort uavhengig av trinn 18.
- Det lokale bygget inneholder også de ufullstendige endringene for trinn 18. Menyen for Developer viser fortsatt «Samarbeid», fordi skjermbildene for trinn 18 ikke er laget.

#### 19.8 Plan for de gjenstående nettlesertestene i `connecthub-dev` (**til godkjenning, ikke startet**)

**Miljø:**
- Lokal `vite preview` bygget fra den committede versjonen `d7bd755`, i en ren arbeidskopi uten trinn 18-koden. Den kjøres mot `connecthub-dev`.
- Lokal API med dev-nøkkelen fra Supabase CLI, som bare finnes i prosessens minne, som i tidligere E2E.
- Vercel Preview brukes ikke, fordi den er beskyttet.
- Trinn 18 (lokale filer og dev-migreringene) røres ikke.

**Kontoer (bare syntetiske):**
- `ch-test-dev` (Developer med MFA)
- `ch-test-admin` (Admin i A)
- `ch-test-user2` (medlem i B)

Testskriptet gjenoppretter TOTP-faktorene for den syntetiske Developer-kontoen, som i alle tidligere E2E-kjøringer. Det er ingen andre endringer i brukere eller roller.
> Admin i B (`ch-test-new4`) kan ikke brukes, fordi testskriptene ikke har innloggingsdata for den kontoen. Testen av godkjenning bruker derfor A.

**Menigheter og filer:**
| Menighet | ID | Nå | Brukes til |
|---|---|---|---|
| CH-test Menighet A | `44ebdf65-…` | Standard (aktiv, gratis), 1024 MB, uten egen kvote, 4 filer | Test 2 (egen kvote ved godkjenning). **A sine 4 filer røres ikke.** |
| CH-test Menighet B | `44dd779b-…` | Uten abonnement, 200 MB, uten egen kvote, 0 filer | Test 3 (redusert kvote) med én ny testfil |
| Planen «Utvidet» | – | 5120 MB, pris tom («Avtales»), **0 abonnenter** (kontrollert) | Test 1 (lagring av planendring) |
| «12», kontoen din og skjermbildet ditt | `bb810b51-…` | – | **Røres ikke.** Kontrolleres før og etter. |

**Testfiler:** genereres i nettleseren som små PNG-bilder (ca. 1 kB) med navnene `ch-test-kvotetest.png` og `ch-test-kvotetest-2.png`. De lastes bare opp til B sin Delt mappe og slettes igjen til slutt. Ingen eksisterende filer brukes som testobjekter.

**Test 1 – planendring lagres (Utvidet, ingen abonnenter):**
1. Developer: Abonnement → Utvidet → «Endre».
   - Ny kvote 5121 MB og pris 1 kr/mnd.
   - Forhåndsvisningen skal vise **ingen menigheter**. Viser den noen, avbrytes testen.
   - Lagre.
2. Kontroller:
   - Lista viser 5121 MB / 1 kr/mnd, også etter at siden er lastet på nytt.
   - Loggen viser «Abonnementsplan endret» med gammel og ny verdi og hvem.
3. **Gjenoppretting:** «Endre» → 5120 MB, tom pris → lagre. Kontroller 5120 MB / «Avtales» og at også dette er loggført.

**Test 2 – egen kvote beholdes ved godkjenning (A):**
1. Developer: Menighet A → Innstillinger → egen kvote **1000 MB**. Merket «Egen kvote» vises.
2. Admin A: Abonnement → ber om **Standard, gratis**. Det er samme plan som A har nå, så abonnementet endres ikke i innhold.
3. Developer: Abonnement → forespørselen viser **«Egen kvote beholdes (1000 MB)»** → Godkjenn.
4. Kontroller:
   - A har fortsatt **1000 MB** og merket for egen kvote.
   - Abonnementet er fortsatt Standard, gratis og aktivt.
   - Loggen har «… godkjent – egen kvote beholdt».
5. **Gjenoppretting:** Developer: Menighet A → «Følg planen igjen» → A får **1024 MB** uten egen kvote, og det loggføres.

**Test 3 – redusert kvote stopper opplasting, nedlasting virker, ingen sletting (B):**
1. Medlem i B laster opp `ch-test-kvotetest.png` i Delt mappe. Det skal lykkes, og jeg noterer filens ID og SHA-256.
2. Developer: Menighet B → egen kvote **0 MB**.
3. Medlem i B prøver å laste opp `ch-test-kvotetest-2.png`. Det skal **avvises** med «kvoten er brukt opp», og ingen ny fil eller nytt lagringsobjekt skal opprettes.
4. Medlem i B laster ned `ch-test-kvotetest.png`. Det skal **virke**, med samme SHA-256 som ved opplasting. Filen er fortsatt i lista, og filtellingen er uendret.
5. **Gjenoppretting:**
   - Developer: Menighet B → «Følg planen igjen» → **200 MB** uten egen kvote, siden B ikke har abonnement (G1).
   - Medlem i B sletter sin egen testfil, slik at raden og lagringsobjektet fjernes.

**Kontroll av at ingenting annet endres:**
- **Før start** tas et øyeblikksbilde (bare lesing) av:
  - plan- og kvoteverdier, merket for egen kvote, abonnementer (plan, gratis, status), menigheter og medlemskap
  - alle filrader (sjekksum), alle lagringsobjekter (navn, størrelse og eTag, sjekksum)
  - menigheten «12», kontoen din og skjermbildet ditt
- **Etter siste steg** tas det samme øyeblikksbildet. **Alt skal være identisk.**
- **Kjente, varige spor** (forventet og dokumentert):
  - én ny godkjent abonnementsforespørsel for A
  - nytt tidspunkt og ny utfører på A sitt abonnement (innholdet er likt)
  - nye varsler til Admin A
  - nye loggrader, som ikke kan slettes etter design
- **Stoppregel:** hvis noe avviker fra forventet (f.eks. at forhåndsvisningen viser andre menigheter, uventet feil, eller at en fil eller verdi endres), stopper jeg og gjenoppretter det som er endret i testen. Deretter rapporterer jeg før noe mer gjøres.

**Ikke med:** spredning av en planendring til menigheter via planen (aktivt abonnement). Det ville endret A sin kvote via Standard. Det er dekket av databasetestene, og kan tas som egen test om du ønsker.

**Varighet:** ca. 15 minutter. **Resultatet** føres i `docs/testlogg.md`. Ingen commit uten egen godkjenning.

**Status 2026-10-02:** gjennomført og bestått. Alt er gjenopprettet, og øyeblikksbildene før og etter er identiske, bortsett fra de forventede sporene. Se `docs/testlogg.md`. Ett avvik ble funnet, se 19.9.

#### 19.9 Feilretting: egen feilmelding når lagringskvoten er brukt opp (**rettet lokalt 2026-10-02, ikke committet**)

**Avvik:**
- Databasen bruker SQLSTATE 54000 både for kvotesperrene og for hastighetsgrensene (invitasjoner og meldinger).
- `dbError` gjorde alle 54000 om til `429 rate_limited`, så brukeren så «For mange forsøk. Vent litt.».

**Retting (ingen databaseendring):**
- `server/adapters/supabase.js`: databasens melding tas vare på som `e.dbMessage`. Den sendes aldri til nettleseren.
- `server/lib/http.js`: 54000 med kvotemelding (`QUOTA_MESSAGE`) gir `413 quota_exceeded`. Alle andre 54000 gir `429 rate_limited` som før.
- `connecthub-admin/ui.jsx`: `quota_exceeded` gir «Lagringskvoten er brukt opp.», med engelsk oversettelse i `i18n.js`.
- Sperrelogikken er uendret.

**Tester:** `server/handlers/quota-error.test.js` (9 tester). En av dem går gjennom alle `raise … errcode = '54000'` i migreringene og kontrollerer at kvotefeil og hastighetsgrenser klassifiseres riktig.

**Senere forbedring:** egne SQLSTATE-koder for kvotefeil, slik at meldingsteksten ikke trengs. Det krever at `app.upload_check` defineres på nytt, og den er også endret av trinn 18. Bør derfor vente til trinn 18 er avklart. Kan tas sammen med trinn 20.

### Trinn 20 – Samlet lagringsgrense på 1 GB for hele ConnectHub (**FERDIG 2026-10-02: `f138d2b`, kjørt i dev, testet. Overbooking tillatt (A). Se `docs/testlogg.md`.**)

**Krav:** ConnectHub har maks 1 GB lagringsplass totalt, fordelt på alle menighetene. En menighet kan ikke regne med å bruke hele sin kvote hvis den samlede plassen er brukt opp.

#### 20.1 Dagens oppførsel [Verifisert i kode og i dev-databasen, bare lesing]

**1. Håndheves en samlet grense på 1 GB? Nei.**
- `app.upload_check` kontrollerer bare to ting:
  - menighetens egen bruk (`sum(file_size)` for menigheten) mot `churches.storage_quota_mb`
  - den private kvoten (50 MB per bruker)
- Ingenting summerer på tvers av menighetene.
- Bøtta `ch-files` har bare grense per fil (4 MB) og tillatte bildetyper. Den har ingen samlet grense.
- Serveren (`file.upload`) har heller ingen samlet kontroll.

**2. Hvordan kontrolleres samlet forbruk ved opplasting? Det gjør det ikke.**
- Rekkefølgen er:
  1. `can_upload` (brukerens token)
  2. filen lagres i bøtta (`storagePut`)
  3. `register_file` kontrollerer på nytt og registrerer
- Låsen i `register_file` er per menighet (`pg_advisory_xact_lock('files:' || menighet)`). Samtidige opplastinger i ulike menigheter ser derfor ikke hverandre.
- Admin-oversikten for stab viser total filstørrelse (`files_bytes`), men bare som visning.

**3. Kvotene er ikke begrenset av totalen:**
- `storage_quota_mb` kan være 0–10 240 per menighet.
- Planene er:
  - Gratis: 200 MB
  - Standard: 1024 MB, altså hele den samlede plassen
  - Utvidet: 5120 MB, altså 5 ganger den samlede plassen
- Verken `set_church_quota`, `update_plan` eller godkjenning av abonnement sjekker summen.
- **Dev i dag:** 3 menigheter med til sammen 1424 MB i kvote, som er mer enn 1024 MB (overbooket med om lag 39 %). Faktisk bruk er 128 864 byte i 5 objekter. Det er 0 lagringsobjekter uten filrad, og databasen er på 13 MB.

**4. Hva skjer når den samlede plassen er brukt opp, men menigheten har ledig kvote?**
- Databasen godtar opplastingen, fordi bare menighetens kvote kontrolleres. Serveren prøver så å lagre filen.
- Resten avhenger av leverandøren. **Ikke testet**, siden det krever at 1 GB fylles.
  - **a) Lagringen avviser filen:** `storagePut` gir en feil som ikke er en databasefeil. Den blir `502 backend_error`, og brukeren ser «Noe gikk galt. Prøv igjen.». Ingen filrad opprettes.
  - **b) Lagringen godtar filen (overforbruk):** opplastingen går gjennom. Overforbruket merkes først som varsel eller begrensning fra leverandøren. Det kan ramme hele prosjektet, også nedlasting.
- Brukeren får altså verken en presis melding eller en kontrollert sperre.

**5. Annet som påvirker den samlede bruken:**
- Samarbeidsfiler i trinn 18 lagrer **kopier**, så hver overføring øker den fysiske bruken.
- Lagringsobjekter som blir igjen når slettingen i bøtta feiler («ryddes av drift»), telles i lagringen, men ikke i `files`.
- Dev og produksjon er separate prosjekter med hver sin lagring.
- Etter det jeg kjenner til, teller Supabase databasen (500 MB på Free) separat fra fillagringen (1 GB). **Dette bør bekreftes mot avtalen.**

#### 20.2 Mangler
1. Ingen samlet sperre. Summen av opplastinger kan gå over 1 GB.
2. Ingen samlet lås. Samtidige opplastinger i ulike menigheter kan til sammen gå over grensen, selv med en sperre.
3. Kvotene er overbooket, og ingenting varsler om det (gjelder også `plan_change_preview` og innstillingene).
4. Ingen egen feilmelding. Brukeren får en generell feil eller ingen sperre.
5. Ingen varsling til Developer når den samlede bruken nærmer seg grensen.

#### 20.3 Forslag til løsning (krever godkjenning; planer og kvoter endres ikke)
1. **Innstilling for samlet grense**, f.eks. `app.settings.total_storage_mb = 1024`.
   - Bare Developer med MFA kan endre den, og endringen loggføres med gammel og ny verdi, som i trinn 19.
   - Valgfri sikkerhetsmargin, f.eks. sperre ved 97 %, så det er plass til gjenglemte objekter og overhead.
2. **Sperre i `app.upload_check`**, etter menighetens kvote:
   - Hvis total bruk + ny fil er over grensen, avvises opplastingen med egen kode, helst en egen SQLSTATE (f.eks. `CHS01`) i stedet for meldingstekst.
   - Samme sjekk gjelder kopier til Samarbeidsfiler (trinn 18).
3. **Samlet lås:** `register_file` tar en felles lås (`files:all`) i stedet for, eller i tillegg til, låsen per menighet. Med fast rekkefølge unngås vranglås. Opplastingsvolumet er lavt, så serialiseringen koster lite.
4. **Feilkode og melding: ja, det trengs egen kode.**
   - Forslag: `storage_full` med «Lagringsplassen i ConnectHub er full. Kontakt Developer.» (EN: «ConnectHub's storage is full. Contact a Developer.»).
   - Den må holdes adskilt fra `quota_exceeded`. Menigheten selv har ledig kvote, så løsningen ligger hos Developer, ikke hos menigheten.
5. **Synlighet:**
   - Menighetens måler viser effektiv ledig plass, altså det minste av ledig kvote og ledig samlet plass.
   - Developer ser samlet bruk mot grensen og summen av kvotene i oversikten.
   - `plan_change_preview` og menighetsinnstillingene viser en advarsel ved overbooking.
6. **Varsling:** Developer får varsel ved 80 % og 90 % samlet bruk.
7. **Avklaring trengs – overbooking:**
   - **(A) Tillat overbooking**, med samlet sperre og varsel. Anbefalt, fordi dagens planer (Standard 1024, Utvidet 5120) ellers ikke kan brukes uten å endres.
   - **(B) Forby** at summen av kvotene går over den samlede grensen.

#### 20.4 Tester (forslag)
- **Database (PGlite og dev, i transaksjon med tilbakerulling):**
  - Grensen settes lavt i testen, f.eks. 1 MB.
  - Opplasting under grensen godtas.
  - Full samlet plass gir `storage_full` selv om menigheten har ledig kvote. Ingen rad opprettes.
  - Menighetens kvote gir fortsatt `quota_exceeded`.
  - Nedlasting og sletting virker, og sletting frigjør plass.
  - Kopi til Samarbeidsfiler sperres også.
  - Bare Developer med MFA kan endre grensen, endringen loggføres, og andre roller avvises.
- **Server:**
  - `dbError` skiller `storage_full`, `quota_exceeded` og `rate_limited`.
  - Feil fra lagringen gir kontrollert feil og rydder opp.
  - Samtidighet: to registreringer i ulike menigheter ved grensen gir bare én godkjent.
- **Grensesnitt:** tekst med engelsk oversettelse, måler med effektiv ledig plass, og advarsel om overbooking.
- **Nettleser i dev** (egen godkjenning): midlertidig lav grense → opplasting sperres, nedlasting virker → gjenopprett og kontroller med øyeblikksbilde.

**Avhengigheter:** bør gjøres etter at trinn 18 er avklart, fordi `app.upload_check` og kopifunksjonen endres der.

### Trinn 21 – Menighetens faktiske lagringskvote: standard 200 MB eller egen kvote, uavhengig av planen (**FERDIG 2026-10-02: `10b7004` + test-retting `123b529`, kjørt i dev, testet. Se 21.6–21.10.**)

**Krav (2026-10-02):**
- 200 MB er standardkvoten for en menighet uten egen kvote.
- Developer kan sette en egen kvote per menighet.
- Planverdiene (Standard 1024 MB, Utvidet 5120 MB) skal ikke automatisk bli menighetens faktiske kvote.
- Det skal være tydelig forskjell på planens verdi og menighetens tildelte kvote.

#### 21.1 Slik fungerer det i dag [Verifisert i kode og dev]

**Beregning:**
- **Faktisk kvote** er `churches.storage_quota_mb` (standard 200). Det er den eneste verdien som håndheves, i `app.upload_check`, og den vises i `storage_usage` som `quota_bytes`.
- **Planen styrer kvoten automatisk:**
  - Ved godkjenning av et abonnement (`decide_subscription_request`) settes kvoten til planens verdi, med mindre menigheten har `quota_custom`.
  - `update_plan` med «Oppdater også menighetene» endrer kvoten for menigheter med aktivt abonnement på planen.
  - `follow_plan_quota` setter kvoten til planens verdi, eller 200 uten abonnement.
- **Egen kvote:** `set_church_quota` (Developer med MFA) setter `quota_custom = true`. Den overskrives aldri automatisk.
- **Dev i dag:**
  - CH-test Menighet A har 1024 MB fra Standard-planen, uten egen kvote. Det er den eneste menigheten der planen har satt kvoten.
  - B og «12» har 200 MB uten abonnement.
  - Produksjonen er tom.

**Visning:**

| Hvor | Hvem | Hva vises i dag |
|---|---|---|
| Filer → måler | Alle medlemmer, også Admin og Developer som er medlem | «Brukt: X / Y MB» (faktisk kvote) |
| Abonnement → Planer | Developer, Admin | Planens «Lagring» (200/1024/5120 MB) uten forklaring, og teksten «Abonnementet bestemmer lagringskvoten.» |
| Abonnement → Nåværende abonnement | Developer, Admin | Plan og gratis, men **ikke** den faktiske kvoten |
| Abonnement → Forespørsler | Developer | «Egen kvote beholdes (X MB)» ved egen kvote |
| Abonnement → Endre plan | Developer | Forhåndsvisning av menigheter som får ny kvote, og valget «Oppdater også menighetene» |
| Menighet → Innstillinger | Bare Developer (kortet «Navn og lagring») | Feltet for kvote, merket «Egen kvote», «Følg planen igjen» og teksten «Kvoten følger planen …» |
| Oversikt | Developer | Totalt antall filer og MB (ikke kvoter) |
| – | Moderator | Ingen kvotevisning. Moderator ser bare Samarbeid, eller Filer som vanlig medlem hvis Moderator også er medlem. |

**Problemet:**
- Admin ser planens 1024 MB og teksten «Abonnementet bestemmer lagringskvoten», men ser ikke menighetens faktiske kvote noe annet sted enn i måleren under Filer.
- Planverdien forveksles derfor lett med tildelt plass.

#### 21.2 Nødvendige endringer (forslag)

**Database (ny migrering, bare dev):**
1. **Godkjenning av abonnement endrer ikke kvoten.** `decide_subscription_request` registrerer bare abonnementet. Kvoten står som før, enten standard eller egen kvote.
2. **Planendring endrer aldri menighetenes kvote.**
   - `update_plan` beholder signaturen, men oppdaterer ingen menigheter (`p_update_churches` avvises eller ignoreres).
   - `plan_change_preview` brukes ikke lenger. Den beholdes, men grensesnittet kaller den ikke.
3. **«Tilbakestill til standard (200 MB)»:**
   - Ny funksjon `reset_church_quota`: setter 200, `quota_custom = false`, og loggføres.
   - `follow_plan_quota` beholdes, men stenges for `authenticated` (slettes ikke), slik at den kan åpnes igjen ved tilbakeføring.
4. **Fast regel i databasen:** `check (quota_custom or storage_quota_mb = 200)`. Uten egen kvote er kvoten alltid 200. Standardverdien defineres ett sted (`app.default_quota_mb()`).
5. **Eksisterende data:** se avklaring A. I dev gjelder det bare menighet A. Ingen filer slettes eller flyttes uansett.

**Grensesnitt:**
- **Planer:**
  - Kolonnen heter «Planens lagring (veiledende)».
  - Teksten «Abonnementet bestemmer lagringskvoten» erstattes med «Menighetens lagringskvote settes av Developer. Standard er 200 MB. Planens verdi gir ikke automatisk mer plass.»
- **Endre plan (Developer):** forhåndsvisningen og «Oppdater også menighetene» fjernes. Teksten blir «Endringen påvirker ikke menighetenes kvoter.»
- **Nåværende abonnement:** ny kolonne «Faktisk kvote» med «200 MB (standard)» eller «X MB (egen kvote)».
- **Forespørsler (Developer):**
  - Merket «Egen kvote beholdes» erstattes med «Nåværende kvote: X MB (standard/egen)».
  - Valgfritt ved godkjenning (avklaring C): avkrysning «Sett egen kvote til planens verdi (1024 MB)». Den er av som standard og loggføres som egen kvote.
- **Menighet → Innstillinger (Developer):**
  - «Faktisk kvote: X MB» med merket «Standard» eller «Egen kvote», og brukt plass.
  - Feltet «Egen kvote (MB)» og knappen «Tilbakestill til standard (200 MB)».
  - Eventuelt «Bruk planens verdi», som setter egen kvote eksplisitt.
- **Menighetslisten (Developer):** kolonne med faktisk kvote, merke og brukt plass.
- **Filer → måler (alle medlemmer):** «Brukt X MB av Y MB · ledig Z MB», med «(standard)» eller «(tildelt)».
- **Tekster:** alle nye tekster får engelsk oversettelse i `i18n.js`.

#### 21.3 Visning per rolle (forslag)

| Rolle | Ser | Kan endre |
|---|---|---|
| **Developer** | Faktisk kvote, merke og brukt plass for alle menigheter (liste og innstillinger). Planenes veiledende verdi og pris. | Egen kvote per menighet, tilbakestilling til 200 MB, planenes pris og veiledende lagring (MFA, loggført) |
| **Admin** | Egen menighet: faktisk kvote (standard/egen), brukt og ledig, under Abonnement og i måleren under Filer. Planene med veiledende verdi og forklaring. | Ingenting med kvoten. Kan be om abonnement, og Developer avgjør kvoten. |
| **Moderator** | Ingen kvotevisning, fordi samarbeid ikke bruker kvoten. Er Moderator medlem i en menighet, gjelder User-visningen der. | Ingenting |
| **User** | Måleren under Filer: brukt og ledig av menighetens faktiske kvote, og egen privat bruk (50 MB). Ser ikke planverdier. | Ingenting |

Tilgangsreglene endres ikke. Admin og User kan allerede lese `storage_quota_mb` og `quota_custom` for egne menigheter (kontrollert i migreringen).

#### 21.4 Tester (forslag)
- **Database (RLS-settet):**
  - Godkjenning endrer ikke kvoten, verken med standard eller egen kvote.
  - `update_plan` endrer aldri menigheter.
  - `reset_church_quota` gir 200, `quota_custom = false`, og loggføres.
  - Regelen `quota_custom or 200` avviser ugyldige kombinasjoner.
  - Bare Developer med MFA kan endre, og andre roller får 403.
  - `follow_plan_quota` er stengt.
  - Opplastingssperren følger faktisk kvote.
  - Trinn 19-testene som forventer at planen styrer kvoten, skrives om.
- **Tjeneste og grensesnitt:**
  - Kvoten endres bare via funksjoner.
  - Visning per rolle i nettleseren: Developer, Admin, Moderator og User.
  - Engelsk oversettelse finnes.
- **Nettleser i dev** (egen godkjenning): øyeblikksbilde før og etter, og gjenoppretting.

#### 21.5 Avklaringer før implementering
- **A. Eksisterende kvoter fra planen** (i dev bare menighet A med 1024 MB):
  - **(a)** beholdes som egen kvote, slik at ingen menighet mister plass. Anbefalt.
  - **(b)** settes til 200 MB.
  - Begge loggføres. Produksjonen er tom.
- **B. Planens lagringsverdi for Admin:**
  - vises som veiledende med forklaring (anbefalt), eller
  - vises bare for Developer.
- **C. Avkrysning ved godkjenning** «Sett egen kvote til planens verdi»: ja (av som standard, anbefalt) eller nei.
- **D. Standardverdien:** fast 200 MB (anbefalt), eller en innstilling Developer kan endre.

**Forhold til andre trinn:**
- Trinn 19 er committet og forutsetter at planen styrer kvoten, så deler av trinn 19 erstattes.
- `rls_test.sql` og `community.js` inneholder trinn 18-endringer, så commit krever deling som før.
- Trinn 20 (samlet grense) startes ikke.

#### 21.6 Resultat (implementert 2026-10-02, ikke committet)

**Endelige avklaringer (2026-10-02):**
- 200 MB er fast standard og kan ikke endres globalt.
- Alt annet enn 200 MB er egen kvote, tildelt per menighet av Developer.
- Planene er bare veiledende, og godkjenning av abonnement endrer ikke kvoten.
- Det kommer ingen avkrysning ved godkjenning.
- Planenes lagring er bare synlig for Developer.
- Eksisterende kvoter over 200 MB bevares som egen kvote, også menighet A med 1024 MB.

**Slik virker det:**
- `churches.storage_quota_mb` er menighetens eneste faktiske kvote, og den håndheves av `app.upload_check`, som er uendret.
- Merket `quota_custom` utledes alltid av kvoten med en trigger: 200 MB gir standard, alt annet gir egen kvote. Det kan derfor aldri bli feil.
- Developer (MFA) bruker `set_church_quota` for egen kvote og `reset_church_quota` for «Tilbakestill til standard (200 MB)». Begge loggføres med gammel og ny verdi.
- Planendringer og godkjenning av abonnement rører aldri kvoten.

**Databaseobjekter** (`supabase/migrations/20261002100000_church_quota_standard.sql`):
- **Nye:**
  - `app.default_quota_mb()` (200)
  - triggeren `churches_quota_class` med `app.churches_quota_class()`
  - `app.classify_church_quotas()`: brukes av migreringen og endrer aldri kvoteverdier
  - `public.reset_church_quota`
  - `public.church_quota_overview` (Developer: kvote, merke og brukt plass for alle menigheter)
  - `public.plans_admin` (Developer: planene med veiledende lagring)
- **Endret:**
  - `set_church_quota`: merket utledes, og årsaken er «standard» eller «egen kvote».
  - `update_plan`: endrer aldri menigheter, `churches_updated` er alltid 0, og `p_update_churches` ignoreres av hensyn til eldre klienter.
  - `decide_subscription_request`: registrerer bare abonnementet.
- **Stengt for alle roller, men ikke slettet:** `follow_plan_quota` og `plan_change_preview`.
- **Tilgang:** `plans.storage_quota_mb` kan ikke lenger leses av `authenticated`. Kode, navn, pris og om planen er aktiv kan fortsatt leses.
- **Data:** ingen kvoteverdier endres. Menigheter med noe annet enn 200 MB får merket for egen kvote, og det loggføres. I dev gjelder det bare menighet A (1024 MB). Ingen filer, lagringsobjekter eller historikk røres.

**Kode:**

| Fil | Endring |
|---|---|
| `src/services/admin.js` | `DEFAULT_QUOTA_MB`, `resetQuota`, `quotaOverview`. `followPlanQuota` er fjernet. |
| `src/services/community.js` | `plans()` uten lagring, ny `plansAdmin()`, `updatePlan` uten oppdatering av menigheter, `planPreview` er fjernet |
| `connecthub-admin/sections.jsx` | Se grensesnittet under |
| `src/legacy/i18n.js` | 19 nye tekster med engelsk oversettelse |

Grensesnittet i `sections.jsx`:
- **Menighetslisten (Developer):** ny kolonne «Lagring» med merke, brukt plass og kvote.
- **Innstillinger (Developer):** faktisk kvote, merke og brukt plass, «Egen kvote (MB)» og «Tilbakestill til standard (200 MB)».
- **Abonnement:**
  - kortet «Menighetens lagring» med faktisk kvote, merke, brukt og ledig plass
  - Developer ser planene som «Planens lagring (veiledende)» med forklaring
  - Admin ser bare plan og pris
  - ny kolonne «Faktisk kvote»
  - forespørsler viser «Nåværende kvote … endres ikke ved godkjenning»
  - forhåndsvisningen og «Oppdater også menighetene» er fjernet
- **Filer:** «Brukt X av Y (standard/egen kvote) · Ledig Z».

**Visning per rolle (som avklart):**
- **Developer:** alt over, og kan endre.
- **Admin:** egen menighets faktiske kvote, brukt og ledig plass (Abonnement og Filer). Ingen planlagring, og kan ikke endre kvoten.
- **Moderator:** ingen kvotevisning. Er Moderator medlem i en menighet, gjelder User-visningen der.
- **User:** måleren under Filer, med egen privat bruk i Delt mappe.

**Tester:**

| Kjøring | Resultat |
|---|---|
| RLS-settet i PGlite, arbeidskopien (med trinn 18) | 381/381 |
| `npm test`, arbeidskopien | 92/92 |
| Bygg, arbeidskopien | OK. Sikkerhetssøket har ingen funn, og alle inline-skript står i CSP. |
| Isolert: HEAD (`d7bd755`) + bare trinn 21, RLS i PGlite | 341/341 |
| Isolert: `npm test` | 79/79 |
| Isolert: bygg | OK. Sikkerhetssøket har ingen funn. |
| Tørrkjøring `db push` mot dev | Bare `20261002100000_church_quota_standard.sql` venter |
| Migreringen mot dev, RLS mot dev, nettlesertester per rolle | Se 21.7 |

**Nye og endrede RLS-tester** (blokken «Planer og kvoter (trinn 19 og 21)» erstatter trinn 19-blokken, pluss én test i P10):
- **Standardkvoten:** standard 200 MB, og abonnement på Standard gir ikke planens 1024 MB.
- **Merket for egen kvote:** følger alltid kvoten og kan ikke settes alene.
- **Migreringen:**
  - 1024 MB med feil merke blir bevart og merket som egen kvote.
  - 200 MB med feil merke blir standard.
  - Klassifiseringen loggføres med uendret verdi, og en ny kjøring gir 0 endringer.
- **Tilgang:**
  - Anon, Developer uten MFA, Moderator, Admin og User avvises for `update_plan`, `set_church_quota`, `reset_church_quota`, `church_quota_overview` og `plans_admin`.
  - Admin og User kan ikke lese planenes lagring, men ser plannavn og pris og egen menighets kvote.
  - User ser ikke andre menigheters kvote.
  - «Følg planen igjen» og forhåndsvisningen er stengt, også for Developer.
  - Direkte skriving avvises.
  - Validering av verdier og ukjent menighet.
- **Egen kvote:**
  - kvoten settes, loggføres med gammel og ny verdi og hvem, og påvirker ikke andre menigheter
  - kvote under 200 MB er lov
  - 200 MB gir standard
  - tilbakestilling gir 200 MB og loggføres
- **Planendringer:** endrer ingen menigheter (også med `p_update_churches = true`), ingen kvotelogg fra planen, og planloggen har gammel og ny verdi og hvem.
- **Godkjenning av abonnement:** endrer verken standard eller egen kvote, og loggfører ingen kvoteendring.
- **Opplastingssperren:**
  - Kvote 0 stopper opplasting, uten at filer slettes, og nedlasting virker fortsatt.
  - 199 MB brukt + 2 MB stoppes ved 200 MB, selv om planen er 1024 MB.

#### 21.7 Kjøring i `connecthub-dev` (godkjent og gjennomført 2026-10-02)

**Før kjøring kontrollert:**
- `uatpdmhnwwjgzlxaucsx` = `connecthub-dev`.
- Kjørt fra `G:\MediaLab\MediaLabReact`.
- Tørrkjøringen viste bare `20261002100000_church_quota_standard.sql`.
- Øyeblikksbildet før kjøring fantes.

Kommandoen var `npx supabase@latest db push --project-ref uatpdmhnwwjgzlxaucsx`.

**Øyeblikksbilde før og etter:**
- Eneste forskjell: menighet A gikk fra `1024|f` til `1024|t`. Kvoten er fortsatt 1024 MB, nå som egen kvote.
- Uendret: planer, menigheter, abonnementer, medlemskap, roller, brukere, filrader og lagringsobjekter (antall og sjekksum), «12», kontoen din og skjermbildet ditt.
- Én loggrad: «klassifisert som egen kvote (trinn 21)» for A (1024 → 1024).
- Etter alle testene er databasen identisk med tilstanden rett etter migreringen.

**Databaseobjekter:**
- Triggeren og de 6 funksjonene finnes.
- `authenticated` kan kjøre `reset_church_quota`, `church_quota_overview`, `plans_admin`, `set_church_quota` og `update_plan`. Funksjonene avgjør selv at bare Developer med MFA får lov.
- `follow_plan_quota` og `plan_change_preview` er stengt.
- `anon` har ingen tilgang.
- `plans.storage_quota_mb` kan ikke leses av `authenticated`.

**RLS-testene mot dev:**

| Kjøring | Resultat |
|---|---|
| Arbeidskopien (med trinn 18) | 380/381 |
| Isolert (HEAD + trinn 21) | 325/341 |

- **Den ene feilen i begge kjøringene** er testen «Godkjenning: ingen kvoteendring er loggført ved godkjenning». Den teller i hele databasen og fant den ekte loggraden fra nettlesertesten for trinn 19 (A, 2026-10-01 22:18, før migreringen). Funksjonen virker. Testen må avgrenses til testmenighetene. **Ikke rettet** (venter på godkjenning).
- **De 15 andre feilene i den isolerte kjøringen** gjelder bare de gamle samarbeidstestene («Erstattet av koblinger og Samarbeidsfiler»). Dev har trinn 18-migreringene, som HEAD-testene ikke kjenner. De har ingen sammenheng med trinn 21. I PGlite uten trinn 18 er den isolerte versjonen 341/341.

**Nettlesertester per rolle** (lokal `vite preview` av HEAD + trinn 21, uten trinn 18, mot dev; bare lesing og kall som skal avvises):

| Rolle | Resultat |
|---|---|
| Developer (MFA) | **Menighetslisten:** «Lagring» viser A Egen kvote 1024 MB, B Standard 200 MB og «12» Standard 200 MB. **Innstillinger:** A viser faktisk kvote 1024 MB, Egen kvote og «Tilbakestill til standard (200 MB)». B er Standard, uten tilbakestillingsknapp. **Planer:** «Planens lagring (veiledende)» med 200/1024/5120 MB. **Planredigering:** uten forhåndsvisning og uten «Oppdater menighetene». `plans_admin` og `church_quota_overview` gir 200. «Følg planen igjen» og forhåndsvisningen gir 403. |
| Admin (A) | «Menighetens lagring»: 1024 MB Egen kvote, Brukt 0.0 MB, Ledig 1024.0 MB. Planer viser bare plan og pris (ingen MB). Faktisk kvote vises i abonnementslisten. Måleren under Filer: «Brukt 0.0 MB av 1024.0 MB (egen kvote) · Ledig 1024.0 MB». Alle kvote- og planfunksjoner og lesing av planlagring gir 403. Plannavn og pris kan leses. |
| Moderator (MFA) | Menyen viser bare Oversikt og Samarbeid. Ingen kvotevisning. Abonnement gir «Ingen tilgang». Ser ingen menigheters kvote. Alle kvote- og planfunksjoner gir 403. |
| User (A) | Måleren: «av 1024.0 MB (egen kvote) · Ledig 1024.0 MB». Abonnement gir «Ingen tilgang», og planlagring vises ikke. Ser bare egen menighets kvote. Alle funksjoner gir 403. |
| User (B) | Måleren: «av 200.0 MB (standard) · Ledig 200.0 MB». Ellers som User (A). |

#### 21.8 Retting av testen «Godkjenning: ingen kvoteendring er loggført ved godkjenning» (godkjent og gjennomført 2026-10-02)

**Retting:**
- Kontrollen teller nå bare logger for testmenighetene A og B i testtransaksjonen (`church_id in ('aaaaaaaa-…a', 'bbbbbbbb-…b')`).
- Ekte logger i dev, som raden fra nettlesertesten for trinn 19 (2026-10-01), påvirker den ikke lenger.
- Ingen logger eller dev-data er slettet eller endret.
- Bare denne ene linjen i `supabase/tests/rls_test.sql` er endret, og samme retting er gjort i trinn 21-blokken som den isolerte versjonen bygges fra. Kontrollert: arbeidskopien = versjonen før trinn 21 + blokken.

**Resultater:**

| Kjøring | Totalt | Trinn 21-settet (94 tester) | Den rettede testen | Andre feil |
|---|---|---|---|---|
| PGlite, arbeidskopien | 381/381 | – | bestått | 0 |
| Dev, arbeidskopien (med trinn 18-testene) | **381/381** | **94/94** | **bestått** | 0 |
| Dev, isolert (HEAD + trinn 21) | 326/341 | **94/94** | **bestått** | 15 |

- **Trinn 21-settet** er trinn 21-blokken pluss P10-testen «godkjenning endrer ikke kvoten».
- **De 15 andre feilene** gjelder bare de gamle samarbeidstestene, som «Erstattet av koblinger og Samarbeidsfiler» og «Menigheten er ikke med i området».
  - De skyldes at dev-databasen allerede har trinn 18-migreringene, som HEAD-testene ikke kjenner.
  - Ingen av dem gjelder trinn 21.
  - Uten trinn 18 (PGlite) er den isolerte versjonen 341/341 (21.6).
- **Testen kan ikke kjøres helt alene**, fordi den bygger på tilstanden fra de foregående stegene i samme transaksjon. Resultatet er derfor hentet ut av kjøringene av hele settet.

**Dev-data:**
- Øyeblikksbildene før og etter testkjøringen er **identiske**, og identiske med tilstanden rett etter migreringen.
- Uendret: kvoter, planer, menigheter, abonnementer, medlemskap, roller, brukere, filrader og lagringsobjekter (5/5, samme sjekksum), «12», kontoen din og skjermbildet ditt.
- Kvoter:
  - A: 1024 MB, egen kvote
  - B: 200 MB, standard
  - «12»: 200 MB, standard
- Testene kjører i én transaksjon som rulles tilbake. Ingen testdata blir igjen.

**Gjenværende risiko:**
- Testen «Plan: ingen kvoteendring er loggført av planendringen» teller også i hele databasen (`reason like 'plan %'`). Den består i dag, men kan i prinsipp treffes av ekte logger senere.
- Den er ikke endret, fordi godkjenningen bare gjaldt den ene testen. Den kan avgrenses på samme måte senere.

#### 21.9 Siste gjennomgang før commit (2026-10-02, ingen kodeendringer)

**1–2. Bare trinn 21 er med:**
- Commit-kandidaten er bygd som `d7bd755` + bare trinn 21-endringene og sammenlignet med arbeidskopien.
- **Fire filer er rene trinn 21-filer og lik arbeidskopien:**
  - `admin.js`
  - `contract.test.js`
  - `sections.jsx`
  - `CLAUDE.md`
- Migreringen `20261002100000_church_quota_standard.sql` er ny og bare trinn 21.
- **Tre filer er blandet.** Arbeidskopien har i tillegg nøyaktig dette:

| Fil | Ekstra i arbeidskopien |
|---|---|
| `supabase/tests/rls_test.sql` | Trinn 18-blokken «Koblinger og Samarbeidsfiler» |
| `src/services/community.js` | Trinn 18-blokken `links`, `linkName` og `otherChurch` |
| `src/legacy/i18n.js` | Feilrettingens tekst «Lagringskvoten er brukt opp.» |

- Kandidaten inneholder ingen av markørene for trinn 18 eller feilrettingen. Søket etter `my_links`, `church_links`, `copy_to_link`, `Samarbeidsfiler`, `koblinger`, `quota_exceeded`, `dbMessage`, `QUOTA_MESSAGE` og «Lagringskvoten er brukt opp» gir samme antall som HEAD, altså 0.

**3. Testen «Plan: ingen kvoteendring er loggført av planendringen»:**
- **Samme svakhet:** den teller alle `churches.quota`-logger med årsak `plan %` i hele databasen.
- **Praktisk risiko er lav:**
  - Dev har 0 slike logger i dag. Kvoteloggene i dev har bare årsakene «egen kvote» ×2, «følger planen igjen» ×2, «abonnement … egen kvote beholdt» ×1 og «klassifisert som egen kvote (trinn 21)» ×1.
  - Trinn 21-koden kan ikke lage slike logger lenger.
  - Bare historiske logger fra trinn 19 med «Oppdater også menighetene» kan treffe testen. Det har aldri skjedd i dev, og produksjonen er tom.
- **Forslag:** avgrens til testmenighetene (A, B, Q, R, S, T, U), som den rettede testen.
- **Lignende avhengighet:** to tester avhenger av de nåværende planverdiene i dev, Standard 1024 og Gratis/Standard/Utvidet 200/1024/5120:
  - «Plan: Developer ser planenes veiledende lagring»
  - «Plan: planendringen er loggført …» (forventer gammel verdi 1024)
  - Endrer Developer planverdiene i dev, feiler disse uten at trinn 21 er feil. Den samme avhengigheten fantes i trinn 19-testene.
  - **Forslag:** les startverdiene inn i en midlertidig tabell i testen.
- Ingenting er endret (krever godkjenning).

**4. Migreringen i dev samsvarer med koden:**
- `supabase_migrations.schema_migrations` har `20261002100000 church_quota_standard` med 19 setninger, og ingen senere migreringer.
- Den lagrede teksten er identisk med filen. Den eneste forskjellen er avsluttende semikolon, som CLI-en fjerner.
- Filen er ikke endret etter kjøringen.

**5. Filer i en eventuell commit** (ferdige kandidatfiler i scratchpad `commit-t21/`):
- `supabase/migrations/20261002100000_church_quota_standard.sql` (ny)
- `supabase/tests/rls_test.sql` (blandet: HEAD + trinn 21)
- `media-lab/src/services/community.js` (blandet: HEAD + trinn 21)
- `media-lab/src/legacy/i18n.js` (blandet: HEAD + 19 trinn 21-tekster)
- `media-lab/src/services/admin.js`
- `media-lab/src/services/contract.test.js`
- `media-lab/src/pages/connecthub-admin/sections.jsx`
- `CLAUDE.md`

De blandede filene legges inn uten trinn 18-delen og feilrettingen, på samme måte som ved trinn 19: `git hash-object -w` + `git update-index --cacheinfo`. Arbeidskopien beholdes uendret.

**Ikke med:**
- trinn 18 (filer og migreringer)
- feilrettingen (`http.js`, `ui.jsx`, `server/adapters/supabase.js`, `quota-error.test.js`)
- `docs/testlogg.md` (trinn 19-nettlesertest og feilrettingen)
- `media-lab/GIT-Guide.md` (dine endringer)
- `build/rls-run.mjs`
- `docs/kartlegging-og-plan.md` (usporet, inneholder også trinn 18, 20 og feilrettingen; egen beslutning)

**6. Testene på nytt (2026-10-02):**

| Kjøring | Resultat |
|---|---|
| Kandidaten: `npm test` | 79/79 |
| Kandidaten: RLS i PGlite | 341/341 |
| Kandidaten: bygg | OK, sikkerhetssøket har ingen funn |
| Dev, kandidaten | 326/341. Trinn 21-settet er 94/94; de 15 feilene er bare de gamle samarbeidstestene (trinn 18 i dev-databasen). |
| Dev, arbeidskopien | 381/381. Trinn 21-settet er 94/94. |

**Data og miljø:**
- Dev-dataene er identiske før og etter testkjøringen, og med tilstanden rett etter migreringen.
- Kvoter: A 1024 MB egen kvote, B og «12» 200 MB standard.
- `origin/main` er fortsatt `9c536f9` (produksjon), og `origin/connecthub` er `d7bd755`.
- Ingen kommando er kjørt mot produksjonsprosjektet.

#### 21.10 Committet og pushet (2026-10-02)

| Commit | Innhold |
|---|---|
| `10b7004` | Trinn 21: 8 filer, bare trinn 21. De blandede filene er lagt inn uten trinn 18 og feilrettingen. Hver blob er kontrollert mot den testede kandidaten. |
| `123b529` | Test-retting: «Plan: ingen kvoteendring er loggført av planendringen» teller bare testmenighetene. Plantestene leser planverdiene ved start (`t21p`) og setter dem tilbake. |

**Kontroll av test-rettingen:**
- I PGlite med endrede planverdier (Gratis 300, Standard 1500, Utvidet 6000) består den nye versjonen **381/381**. Den gamle feilet på nøyaktig de to plantestene.
- **Mot dev:**
  - Arbeidskopien: 381/381.
  - Kandidaten: 326/341. Trinn 21-settet er 94/94, og de 15 feilene er bare de gamle samarbeidstestene, som skyldes trinn 18 i dev.
- Dev-dataene er identiske før og etter.

**Merk:**
- Vercel Preview kjører fortsatt `d7bd755`. Når migreringen er kjørt i dev, kan Abonnement-siden der feile, fordi den gamle koden leser planenes lagring. Det gjelder bare dev og Preview fram til trinn 21 er committet.
- `community.js`, `rls_test.sql` og `i18n.js` (der feilrettingen av kvotemeldingen også har en tekst) må deles opp ved commit. Skriptene som bruker trinn 21-endringene på HEAD, er laget for dette.

## 5. P11 – produksjonsplan (legges fram separat når trinnene over er ferdige)

Planen skal dekke punktene i godkjenningen din, punkt 8:
- separasjon av miljøer og hemmeligheter, inkludert å fjerne hemmelige `VITE_`-variabler i Production
- Supabase- og Vercel-oppsett, planer og kostnader
- invitasjonsflyt, MFA, egen e-post (SMTP) og eksakte redirect-adresser
- RLS, API-er, filer og sikkerhet
- personvern og juridiske forhold
- sikkerhetskopi og gjenoppretting
- migreringsrekkefølge
- tester og overvåking
- utrulling og tilbakeføring
- kontrollert promotering fra `connecthub` til `main`

Produksjonen settes ikke bak innlogging før P11 er godkjent.

## 6. Kostnader (ingen settes i gang uten godkjenning)

| Hva | Når | Kostnad |
|---|---|---|
| Vercel-region `arn1` | Trinn 10 | Trolig ingen **[Må bekreftes]** |
| `pg_cron` (analyse) | Trinn 7 | Ingen (del av Postgres) **[Antakelse]** |
| SMTP for e-post | P11 | Gratisnivå finnes **[Må undersøkes]** |
| Supabase Pro | Bare hvis alternativ B i 6a eller sikkerhetskopier ønskes | Ca. 25 USD/mnd **[Antakelse]** |

## 7. Kravsporing mot det opprinnelige kravdokumentet (mottatt i to deler 2026-10-01)

Dokumentet «Ekstra krav: database, datastruktur og full migrering» og «Helhetlig prosjektkrav» (punkt 1–18) er
kravgrunnlaget fra prosjektstarten. Punkt 17–18 der («kun trinn 0 og 1») gjaldt starten av prosjektet. Arbeidet har
siden gått gjennom P2–P10. **Det er ikke fortsettelsen av 17.11 i den store bestillingen, som fortsatt mangler.**

### 7.1 Konflikter mellom kravdokumentet og senere beslutninger – **avklart 2026-10-01**
| # | Kravdokumentet | Løsningen i dag | **Avgjørelse** | Følge |
|---|---|---|---|---|
| K1 | Moderator administrerer menigheter, brukere, admin og kvoter | Moderator bare samarbeid | **Behold siste modell.** Moderator har samarbeid og administrerer ikke menigheter, brukere eller kvoter automatisk. | Ingen endring |
| K2 | Admin kan ikke slette eller endre navn i Faste | Admin (og den som lastet opp) kan slette i Faste | **Endret ved M1 (2026-10-01): Admin i egen menighet kan slette.** Ingen endring av navn. Den som lastet opp uten Admin-rolle, og Developer uten Admin-rolle, kan ikke slette. | Trinn 11, anbefales slått sammen med 18 |
| K3 | Undermapper og ingen egen størrelsesgrense | Maks 4 MB, ingen undermapper | **Behold dagens løsning** inntil videre | Eventuell utvidelse blir et eget trinn med konsekvenser og tester beskrevet først (ikke planlagt) |
| K4 | Videoprosjekter i skyen | Video bare på PC-en | **Videofiler lastes aldri opp.** Prosjektbeskrivelser i skyen kan bli en separat løsning. | Trinn 17 (bare identifisert, må planlegges og godkjennes) |
| K5 | Samarbeid per bruker eller rolle, med opplasting og redigering | Per menighet, se og last ned | **Behold** | Eventuell utvidelse blir et eget trinn (ikke planlagt) |
| K6 | Admin endrer e-post for medlemmer | Ingen endring av e-post i appen | **Brukeren endrer sin egen e-post med sikker bekreftelse. Admin kan ikke endre andres.** | Trinn 12 (plan til godkjenning) |
| K7 | Admin beholder begrenset tilgang i deaktivert menighet | Admin mister all tilgang | **Admin får begrenset lese- og eksporttilgang, uten full administrativ tilgang** | Trinn 13 (plan til godkjenning) |
| K8 | Supabase Edge Functions | Vercel-funksjoner | **Behold Vercel-funksjonene.** Flytting krever egen teknisk vurdering og godkjenning. | Ingen endring |
| K9 | MFA ikke påkrevd | MFA for Developer og Moderator | **Behold MFA-kravet** | Ingen endring |

### 7.2 Mangler mot kravdokumentet – plan til godkjenning (ikke implementert)
| Mangel | Trinn | Kort |
|---|---|---|
| Utlogging etter inaktivitet | 6c | Må avklares først, se trinn 6c |
| E-postvarsler, varslingsinnstillinger og obligatoriske sikkerhetsvarsler | 16 | Avhenger av valg av e-postleverandør (P11) |
| Gratis abonnement: utløp, forlengelse og avslutning, og begrenset tilgang ved utløp | 15 | Krever avklaring av hva «begrenset tilgang» betyr |
| Fire dokumentasjonsfiler | 14 | Ren dokumentasjon |
| Flytting av filer i Faste (kravdokumentet §7) | – | **Mulig separat funksjon. Ikke planlagt og ikke implementert** (avklart 2026-10-01). |
| Egne tabeller for `roles`/`permissions`, `folders`, `file_permissions` og `subscription_events` | – | Bevisst forenklet. Dokumenteres som et valg i trinn 14. Utvides bare ved et konkret behov (K3 og K5 er satt på vent). |

### 7.3 Migrering fra den gamle løsningen (ekstra krav §6–8) [Verifisert]
- **`sys/db.json` og Vercel Blob finnes ikke:**
  - Teamet har ingen Blob-butikker.
  - Variablene `AUTH_SECRET` og `BLOB_READ_WRITE_TOKEN` har aldri vært satt.
  - Den gamle backenden har derfor aldri lagret brukere, menigheter, roller, filer eller logger.
- **Det er ingenting å migrere.** Det finnes ingen eksisterende kontoer uten e-post, ingen scrypt-passord å overføre og ingen Blob-filer å kopiere.
- Planene i §7–8 for kontoovergang og filkopiering trengs ikke.
- **Lokale data (IndexedDB og localStorage) i nettleserne er de eneste eksisterende dataene.** De kobles til brukeren med samtykke ved første innlogging (P4). Det skjer uten kopiering, og først i produksjon etter P11.

### 7.4 Sikkerhetsfunnene i den gamle løsningen (kravdokumentet §3), prioritert

Alle 15 funnene gjelder den gamle backenden (`api/ml.js`). Den har aldri vært satt opp i produksjon.
- Uten `AUTH_SECRET` svarer den bare «config» (503) på alt unntatt `log`.
- `log` har grense på 30 per minutt og lagrer ingenting uten Blob.

| Prioritet | Funn | Gjelder i dag? | Tiltak |
|---|---|---|---|
| Høy (latent) | Første besøkende kan bli Developer hvis `SETUP_CODE` mangler | Ikke utnyttbart nå, fordi `AUTH_SECRET` mangler. **Blir utnyttbart** hvis noen setter opp Blob og `AUTH_SECRET` uten `SETUP_CODE`. | Fjern den gamle løsningen (trinn 4 på `connecthub`, og i produksjon ved P11). Sett ikke opp variablene. |
| Middels (latent) | Admin kan sette passord for andre, tildele admin og slette admin. Developer kan tømme loggen. Sletting av menighet skjer straks. | Bare i den gamle koden | ConnectHub har ingen av disse: passord via e-postlenke, roller bare via `assign_role` med logging, logg som ikke kan endres, og sletting i to trinn med 30 dagers frist. |
| Lav | Rate limiting per instans, kontolås som kan misbrukes, avsløring av om en konto finnes, samtidighet ved skriving av JSON, utlogging uten tilbakekalling | Bare i den gamle koden | ConnectHub bruker Supabase Auth (felles grenser, samme feilmelding ved feil e-post og feil passord, og global utlogging) og PostgreSQL med låser. |
| Lav | Loggen tar imot data uten innlogging | `POST /api/ml?a=log` svarer `ok` uten innlogging (testet med hastefiksen), men lagrer ingenting uten Blob | Forsvinner med trinn 4 og P11 |
| Info | Admin-ikonet vises for alle. Admin ser siste innlogging. Loggen mangler oppbevaringsregel. Bytte av `AUTH_SECRET` gjør databasen uleselig. | Bare i den gamle koden | ConnectHub viser admin-inngangen bare for Admin, Moderator og Developer. Siste innlogging vises ikke. Loggen har oppbevaringstid (P8). Ingen egen kryptering trengs. |

**Konklusjon:** fjerning av den gamle løsningen (trinn 4, og i produksjon ved P11) lukker alle 15. Det viktigste er at den
aldri settes opp med variabler før den er fjernet.

### 7.5 Trinn 0–1 i kravdokumentet (§17–18)
Disse er gjennomført tidligere i prosjektet og er oppdatert i denne kartleggingen:
- tilgang via Supabase CLI fra repoet
- skjema, RLS og bøtter i dev
- prod er tom
- Auth-oppsett fra `config.toml`

**Ikke undersøkt:** Supabase- og Vercel-plan (kostnad og sikkerhetskopier). Det krever innsyn i dashbordet. Du ser det
under *Organization → Billing* i Supabase og *Settings → Billing* i Vercel.

### 7.6 Filtilgang mellom menigheter – grunnkrav (avklart 2026-10-01), kontroll og avvik

**Grunnkrav (avklart):**
- Menigheter kan ikke se eller laste ned hverandres filer.
- **Eneste unntak:** filer i en egen Samarbeidsfiler-mappe mellom to menigheter som Moderator har koblet sammen.
- Vanlige mapper er bare for brukere med tilgang til menigheten, også når menighetene samarbeider.
- Håndheves i både grensesnitt og database (RLS og funksjoner), slik at det ikke kan omgås.

**Kontroll i dev [Verifisert 2026-10-01]:** RLS ble simulert per syntetisk rolle, og transaksjonene ble rullet tilbake.
- Medlemmer og Admin ser bare sin egen menighet.
- B ser ingenting fra A.
- Private filer er bare synlige for eieren.

**Avvik og avgjørelser:**
| # | Avvik i dag | Avgjørelse (2026-10-01) | Håndteres i |
|---|---|---|---|
| A1 | Developer ser og kan laste ned alle menigheters fellesfiler (`app.is_staff()` i `files_select`, `visible_file_keys` og `export_church` med nedlastingslenker) | Developer får **bare** tilgang til filer i menigheter der Developer er medlem, pluss samarbeidsfiler via egne medlemskap. Driftstilgang til andre filer blir en egen, kontrollert og loggført funksjon. **Den er ikke planlagt nå.** | Trinn 18 |
| A2 | Moderator ser og kan laste ned alle fellesfiler i menigheter som er med i et samarbeid | Moderator får bare tilgang til samarbeidsfiler, etter tilgangsmatrisen (se 7.7) | Trinn 18 |
| A3 | Ikke noe eget område. Moderator deler fra vanlige mapper (`share_file_to_space`). | Egen Samarbeidsfiler-mappe opprettes når Moderator kobler to menigheter. Deling fra vanlige mapper fjernes. | Trinn 18 |
| A4 | Delte filer blandes inn i verktøyenes vanlige skyfilpaneler (`ch-cloud.js` i Photo Design og Mockups) | Panelene viser bare menighetens egne filer. Samarbeidsfiler vises i et eget, tydelig merket område i alle relevante verktøy. | Trinn 18 |
| A5 | Delte filer skjules ikke når et abonnement utløper | Samarbeidsfilene skjules for den andre menigheten. Ingenting slettes, og alt vises igjen ved forlengelse. | Trinn 15, som bygger på 18 |

**Følger av A1 for andre trinn (krever avgjørelse):**
- **Trinn 2 er UTGÅTT** (avklart 2026-10-01), fordi det strider mot A1.
  - Developer kan laste opp som andre i menigheter der Developer er medlem. Det virker allerede, fordi medlemskapet gir tilgang uten stabsregelen.
- **Trinn 11** (bare Developer kan slette i Faste): sammen med A1 betyr det at bare en Developer som er **medlem** av menigheten kan slette der.
  - I menigheter uten et Developer-medlem kan ingen slette i Faste. Developer må da legge seg til som medlem først, noe som loggføres.
  - **Erstattet av M1:** Admin i egen menighet sletter i Faste. Developer sletter bare der Developer også er Admin. Det er ikke krav om en Developer som er medlem.
- **`export_church` utført av Developer:** filoversikten tas med, men **uten nedlastingslenker**, med mindre Developer er medlem.

## 7.7 Trinn 18 – Samarbeidsfiler og koblinger mellom to menigheter (**FERDIG 2026-10-02: `12a8de1` + test-retting `6aca85c`, kjørt i dev, testet. Se 7.7.10 og `docs/testlogg.md`.**)

### 7.7.1 Modell (avklart)
- En **kobling** er alltid mellom **nøyaktig to** aktive menigheter.
  - Bare **Moderator** (med MFA) oppretter, avslutter og gjenåpner. Admin, Developer og medlemmer kan ikke.
  - Det kan være én aktiv kobling per par.
  - Den vises med menighetenes navn, f.eks. «Menighet A – Menighet B». Den har ikke eget navn (avklart).
- Hver kobling har sin egen **Samarbeidsfiler-mappe**, som bare de to menighetene kan se.
  - En kobling gir aldri tilgang til vanlige mapper eller andre koblinger.
  - Én menighet kan ha flere koblinger, hver med sin egen mappe.
- **Ny tabell `church_links`:**
  - `id`, `church_a`, `church_b` (`church_a < church_b`, aldri samme menighet)
  - `status` (`active`/`ended`)
  - `created_by`, `created_at`, `ended_by`, `ended_at`
  - en unik regel for aktivt par
  - RLS og logg for alle endringer
- **`files` får `link_id`** (valgfri) og den nye mappen `samarbeid`. En kontroll sikrer at `folder = 'samarbeid'` gjelder hvis og bare hvis `link_id` er satt.
  - `church_id` er menigheten som bidro. Den eier kopien, og kopien teller i dens kvote.
  - `source_file_id` viser hvilken original kopien er laget fra (bare til sporing. Originalen røres ikke).
- **Den gamle samarbeidsmodellen** (`spaces`, `space_members` og `space_files`):
  - Tabellene beholdes urørt.
  - Deling fra vanlige mapper (`share_file_to_space`, `invite_to_space`) og Moderators innsyn (A2) skrus av.
  - Visningen erstattes.
  - Fjerning av tabellene blir et eget trinn med egen godkjenning.
  - Det er ingenting å flytte (dev har 0 delinger, prod er tom).

### 7.7.2 Overføring (avklart: **kopi**)
- Serveren lager en **kopi** av filen i lagringen, i koblingens Samarbeidsfiler-mappe. **Originalen blir liggende urørt** i menighetens egen mappe og påvirkes ikke om koblingen avsluttes eller kopien fjernes.
- **Kan overføres fra:**
  - **Delt mappe:** alle bildene som er synlige for menigheten der. Private filer aldri.
  - **Faste:** `faste`, `logoer`, `bakgrunner` og `mockups`.
- **Kan aldri overføres:** private filer, filer fra andre menigheter og filer som allerede ligger i Samarbeidsfiler. Video finnes ikke i ConnectHub.
- **Ingen direkte opplasting til Samarbeidsfiler.** Filer kommer bare inn ved overføring.
- **Dialogen** gjør det tydelig hva som skjer: «En kopi av bildet legges i Samarbeidsfiler mellom [egen menighet] og **[annen menighet]**. Begge menighetene kan se og laste den ned. Originalen blir liggende i [mappe].»

### 7.7.3 Tilgangsmatrise (avklart, inkludert M1)
Med «medlem» menes aktivt medlem av menighet A eller B i en aktiv kobling, der begge menighetene er aktive og har abonnementet i orden (se 7.7.5).

| Handling | Moderator (MFA) | Developer | Admin i A eller B | Medlem i A eller B | Andre (alle roller) |
|---|---|---|---|---|---|
| Opprette, avslutte og gjenåpne kobling | **Ja (bare Moderator)** | Nei | Nei | Nei | Nei |
| Se at koblingen finnes | Ja | **Bare koblinger for menigheter der Developer er medlem.** Ingen generell oversikt. | Ja | Ja | Nei |
| Se filnavn og metadata (navn, størrelse, hvilken menighet som bidro, tidspunkt) | **Ja (bare dette)** | Bare som medlem i A eller B | Ja | Ja | Nei |
| Se miniatyrbilder og innhold | **Nei** | Bare som medlem i A eller B | Ja | Ja | Nei |
| Laste ned | **Nei** | Bare som medlem i A eller B | Ja | Ja | Nei |
| Overføre fra Delt mappe (kopi) | Nei | Bare som medlem i A eller B | Ja | **Ja** (avklart) | Nei |
| Overføre fra Faste (kopi) | Nei | Bare som Admin i A eller B | **Ja (bare Admin)** | **Nei** | Nei |
| Fjerne fil fra Samarbeidsfiler (sletter kopien, originalen blir liggende) | **Nei.** Kan bare skjule alt ved å avslutte koblingen. | Bare som Admin i A eller B | **Ja, men bare filer egen menighet har bidratt med** | Nei | Nei |
| Fjerne filer den andre menigheten har bidratt med | Nei | Nei | **Nei.** Knappen vises ikke, og databasen avviser. | Nei | Nei |

**Hvordan Admin unngår å fjerne den andre menighetens filer:**
- Hver fil i Samarbeidsfiler viser tydelig hvem som bidro («Lagt inn av [menighet] · [dato]»).
- Visningen grupperer filene etter menighet: «Fra oss» og «Fra [annen menighet]».
- «Fjern fra Samarbeidsfiler» vises bare på filer fra egen menighet, og bekreftelsen sier: «Den delte kopien slettes for begge menighetene. Originalen i [mappe] blir liggende.»
- Databasen tillater uansett bare Admin i menigheten som bidro, å slette kopien (`church_id` = egen menighet). Alle sletninger loggføres.

**Faste i menighetens egen mappe (ikke Samarbeidsfiler):**
- Medlemmer kan se og laste ned, men ikke laste opp.
- Admin kan laste opp.
- Sletting: **bare Admin i egen menighet (M1).** Developer bare som Admin. Moderator nei.
- Overføring fra Faste: bare Admin.

### 7.7.4 Når koblingen avsluttes (avklart)
- Moderator avslutter, og status blir `ended`.
- **Alle filer i koblingens Samarbeidsfiler skjules for begge menighetene.** Det gjelder også den som bidro. Originalene ligger urørt i egne mapper.
- **Ingen filer slettes.** Moderator kan ikke slette filer, bare avslutte. Kopiene blir liggende skjult og vises igjen hvis Moderator gjenåpner.
- Admin i begge menighetene varsles.
- Skjulte kopier teller fortsatt i kvoten til menigheten som bidro.
  - En regel for endelig opprydding av kopier i avsluttede koblinger foreslås **ikke nå**. Det blir et eget trinn med egen godkjenning.

### 7.7.5 Når et abonnement utløper (avklart, sammen med trinn 15)
- Hvis abonnementet til menighet A utløper:
  - Filene A har bidratt med, skjules for B.
  - A sine medlemmer mister tilgangen til alle koblinger.
  - B ser fortsatt sine egne bidrag.
- Ingenting slettes. Ved forlengelse vises alt igjen med en gang (`app.church_service_ok` regnes ut ved hver forespørsel).
- «Gratis, 200 MB» uten registrert abonnement utløper aldri.

### 7.7.6 Avklaringer (2026-10-01) og en motstrid som gjenstår
| # | Spørsmål | Avgjørelse |
|---|---|---|
| 1 | Kopi, flytting eller referanse? | **Kopi.** Originalen blir liggende. |
| 2 | Hvilke mapper? | **Delt mappe og Faste.** Aldri private filer. |
| 3 | Hvem kan overføre? | **Alle med tilgang til Samarbeidsfiler kan overføre fra Delt mappe.** **Fra Faste kan bare Admin overføre.** Overføring gir ingen rett til å opprette koblinger. |
| 4 | Fjerning | **Admin sletter den delte kopien**, og originalen blir liggende. Bare egen menighets bidrag (se 7.7.3). Moderator kan ikke slette, bare avslutte koblingen. |
| 5 | Moderators innsyn | **Bare filnavn og metadata.** Ingen miniatyrer, innhold eller nedlasting. |
| 6 | Developer og koblinger | **Ingen generell oversikt.** Bare koblinger og filer i menigheter der Developer er medlem. |
| 7 | Trinn 2 | **Utgår** |
| 8 | Sletting i Faste | ~~Krever at Developer er medlem~~. **Erstattet av M1:** Admin i egen menighet sletter. |
| 9 | Navn på koblingen | **«Menighet A – Menighet B»**, uten eget navn |

**M1 – avklart 2026-10-01:**

| Rolle | Faste i egen menighet |
|---|---|
| Admin | Se, laste ned, overføre (kopi) og slette |
| Vanlig bruker | Se og laste ned. Ikke overføre eller slette. |
| Developer | Ingen generell tilgang utenfor egne menigheter. Bare Admin-rettigheter der Developer også er Admin. |
| Moderator | Ikke overføre eller slette |

- K2 og svaret på spørsmål 8 er oppdatert tilsvarende. Trinn 11 er justert og anbefales slått sammen med 18.
- **Bekreft:** opplasting til Faste bare for Admin (Developer bare som Admin). Det er en foreslått følge av M1.

### 7.7.7 Berørte filer og funksjoner

**Database (ny migrering, ingen endring av eksisterende rader):**
- **Nytt:**
  - `church_links`
  - feltene `files.link_id` og `files.source_file_id`, og mappen `samarbeid` med kontroll
  - indeks på `files(link_id)`
- **Funksjoner:**
  - `create_link(a, b)`, `end_link(id)` og `reopen_link(id)`: bare Moderator, alt loggføres, med varsel til Admin i begge menighetene.
  - `link_files_meta(id)`: bare Moderator, bare metadata.
  - `my_links()`: koblinger for egne menigheter.
  - `app.can_transfer(file, link)`: kopiregler etter 7.7.2 og 7.7.3.
  - `register_link_copy(...)`: bare serveren, med kvotekontroll og låsing.
  - `delete_link_copy(id)`: bare Admin i menigheten som bidro.
- **Policyer og funksjoner for filer:**
  - `files_select` og `app.visible_file_keys` mister stabsleddet (A1) og samarbeidsleddet (A2).
  - Nytt ledd: filer i `samarbeid` er synlige for medlemmer i A eller B når koblingen er aktiv og begge menighetene har abonnementet i orden.
  - Moderator får **ikke** lese-tilgang til filrader. Metadata kommer bare via `link_files_meta`.
- **Endret:**
  - `app.is_collab_admin()` gjelder bare Moderator.
  - `share_file_to_space` og `invite_to_space` avvises.
  - `export_church` gir ikke nedlastingslenker til Developer som ikke er medlem.
  - `storage_usage` krever medlemskap for Developer.
  - `delete_file` følger M1 (trinn 11): Faste bare for Admin i menigheten, og stabsleddet fjernes overalt (A1).
  - `app.upload_check` følger M1: stabsleddet fjernes, og Faste er bare for Admin.
  - Samarbeidsfiler håndteres i `delete_link_copy`.

**Server:**
- `server/handlers/files.js`: ny `file.copy_to_link`.
  - Den kontrollerer `can_transfer` med brukerens token, kopierer i lagringen og registrerer kopien.
  - Mislykkes registreringen, slettes kopien.
  - Den kopierte filen sammenlignes med SHA-256.
- `server/adapters/supabase.js`: ny `storageCopy`. Den er leverandørnøytral i grensesnittet.
- Testene i `files.test.js`.

**Klient:**
- `src/services/files.js` og `community.js` (koblinger og overføring).
- `connecthub-admin/sections.jsx`:
  - Filer får området «Samarbeidsfiler» per kobling, med visning gruppert etter menighet som bidro, en overføringsdialog og fjerning bare av egne bidrag.
  - Samarbeid blir «Koblinger» for Moderator (opprett, avslutt, gjenåpne og bare metadata).
  - Medlemmer ser, laster ned og overfører fra Delt mappe.
- `AdminPage.jsx` og `access.js` (meny per rolle; Developer ser bare koblinger via medlemskap) med tester.
- `src/shared/ch-cloud.js`:
  - `files(folder)` gir **bare egne menigheters** filer (A4).
  - Ny `collabFiles()` gir Samarbeidsfiler merket med koblingen.
- `photo-design` og `mockups` (`logic.js` og `template.jsx`): et eget, merket område «Samarbeidsfiler – [menighet A – menighet B]» i skyfilpanelene.
- i18n, `CLAUDE.md` og `docs/security-and-rls.md` (når trinn 14 er godkjent).

### 7.7.8 Testplan

**RLS (PGlite og dev), alle roller:**
- B ser ingen av A sine vanlige filer (Faste, Delt og privat), heller ikke når A og B er koblet.
- Samarbeidsfiler er synlige for A og B, men ikke for C, heller ikke når C er koblet til A i en annen kobling.
- Bare Moderator kan opprette, avslutte og gjenåpne. Developer, Admin og medlemmer nektes.
- **Moderator:**
  - får metadata via `link_files_meta`
  - ser ingen filrader
  - får ingen nedlastingslenke
  - kan ikke slette
- **Developer:**
  - ser verken filer eller koblinger i menigheter uten medlemskap
  - ser som medlem
  - får eksport uten lenker når Developer ikke er medlem
- **Overføring:**
  - Medlem overfører fra Delt mappe: tillatt.
  - Medlem overfører fra Faste: nektet.
  - Admin overfører fra Faste: tillatt.
- **Faste (trinn 11/M1, hvis det slås sammen):** Admin sletter i egen menighet: tillatt. Nektet for Admin i en annen menighet, User, Developer som bare er medlem, Developer uten medlemskap, Moderator og den som lastet opp uten Admin-rolle. Tillatt for Developer som også er Admin.
  - Private filer, filer fra andre menigheter, filer fra Samarbeidsfiler og overføring til en kobling egen menighet ikke er med i: nektet.
- **Fjerning:**
  - Admin fjerner eget bidrag: kopien slettes, og originalen finnes fortsatt.
  - Admin fjerner den andre menighetens bidrag: nektet.
  - Medlem fjerner: nektet.
  - Moderator fjerner: nektet.
- **Avsluttet kobling** skjuler alt for begge, og ingenting slettes. Gjenåpning viser filene igjen.
- **Utløpt abonnement** skjuler bidragene for den andre, og forlengelse gjenoppretter (sammen med trinn 15).
- Nedlastingslenker (`file_keys`) følger de samme reglene.
- `share_file_to_space` er avvist.

**Server og API:**
- `file.copy_to_link` med tillatt og nektet tilgang.
- Kopien har samme SHA-256 som originalen.
- Originalen er uendret.
- Når registreringen feiler, ryddes kopien bort.
- Kvoten håndheves.
- Samtidige overføringer går ikke over kvoten.

**E2E (nettleser, syntetiske brukere):**
- Moderator kobler A og B og ser bare filnavn.
- Medlem A kopierer fra Delt mappe, og dialogen viser B.
- Admin A kopierer fra Faste.
- Medlem B ser og laster ned.
- Admin B ser ingen «Fjern» på bidraget fra A, men kan fjerne sitt eget.
- Medlem C ser ingenting.
- Verktøyenes paneler viser egne filer i det vanlige panelet og Samarbeidsfiler i et eget område.
- Avslutt og gjenåpne.
- Direkte adresser og API-kall fra feil roller gir 403.

**Data:** antall og SHA-256 for eksisterende filer er like før og etter, og ingen eksisterende rader er endret.

### 7.7.9 Risiko og tilbakeføring
- **Risiko: middels til høy.** Leseregelen for alle filer skrives om. Risikoen dempes slik:
  - tester for alle roller og alle kombinasjoner av koblinger
  - dev først
  - ingen endring av eksisterende rader
  - de gamle tabellene beholdes
- **Konsekvens av A1:** Developer mister innsyn i filer, filoversikt og forbruk for menigheter uten medlemskap, også i admin-visningen.
- **Avhengigheter:**
  - Trinn 3 (testdata) bør tas først, med egen godkjenning.
  - Trinn 15 bygger på `church_service_ok`, som innføres her.
- **Tilbakeføring:**
  - En migrering gjenoppretter dagens policyer og funksjoner.
  - `church_links` og de nye feltene kan bli liggende uten virkning.
  - Kopier i lagringen er bare testdata i dev.
  - Produksjonen påvirkes ikke før P11.

### 7.7.10 Endelig omfang for trinn 18 og status (på vent, valg c)

**Hvorfor på vent:** etter E6 skal ingenting fullføres, rulles tilbake, committes eller pushes før denne planen er godkjent.
De lokale endringene og migreringene i dev står urørt.

**Omfang (i tråd med E1–E8, A1, A2, A3, A4, M1 og 7.7.1–7.7.9):**
- Koblinger mellom to menigheter med egen Samarbeidsfiler-mappe. Bare Moderator oppretter, avslutter og gjenåpner.
- Overføring lager en kopi:
  - fra Delt mappe av alle medlemmer
  - fra Faste bare av Admin
  - aldri private filer
- Fjerning: bare Admin i menigheten som bidro, og bare kopien slettes.
- Filtilgang: A1 (Developer bare via medlemskap) og A2 (Moderator bare metadata).
- Faste etter M1: bare Admin i egen menighet laster opp, sletter og overfører. Trinn 11 inngår.
- Verktøyene: egne filer i de vanlige panelene og Samarbeidsfiler i et eget område (A4). Feilen der Mockups aldri viste skyfiler (manglende `path`) rettes samtidig.
- **Ikke med:**
  - tilbakemeldingssystemet (trinn 8)
  - abonnement og utløp (trinn 15, som bygger videre)
  - rollebytteren (E5)
  - endringer i `register_file` (E1)

**Status i dag:**
| Del | Status |
|---|---|
| Database: `20261001190000_church_links.sql` og `20261001190100_link_source_folder.sql` | **Kjørt i `connecthub-dev`** (godkjent før E6). Eksisterende rader er uendret, kontrollert med sjekksum: 5 filer og 5 lagringsobjekter. |
| RLS-tester (`supabase/tests/rls_test.sql`, 288 tester, ny blokk for koblinger, Faste og A1/A2) | Lokalt, ikke committet. **288/288 i dev og i PGlite.** |
| Server: `file.copy_to_link` (`server/handlers/files.js`), `storageCopy`/`storageGet` (`server/adapters/supabase.js`) og 3 tester (`files.test.js`) | Lokalt, ikke committet. Testene består. |
| Tjenester: `links` i `src/services/community.js`, `listLink`/`listCollab`/`copyToLink` i `src/services/files.js` | Lokalt, ikke committet |
| Menytilgang: `connecthub-admin/access.js` og testene (Samarbeid bare for Moderator) | Lokalt, ikke committet. 7/7. |
| Hjelpeskript `build/rls-run.mjs` (kjører RLS-testene i PGlite med lesbar feilmelding) | Lokalt, ikke sporet |
| **Gjenstår: grensesnitt** | `AdminPage.jsx`: `collab` bare for Moderator, Moderator-oversikt med koblinger, kortet «Samarbeid» fjernes for User. `sections.jsx`: Samarbeidsfiler under Filer (gruppert «Fra oss / Fra [menighet]», overføringsdialog, fjerning av egne bidrag), «Koblinger» for Moderator (opprett, avslutt, gjenåpne, metadata), og Filer viser at Developer uten medlemskap ikke har tilgang. |
| **Gjenstår: verktøy** | `src/shared/ch-cloud.js`: bare egne menigheters filer, og ny `collab()` gruppert per kobling. `photo-design` og `mockups` (`logic.js`, `template.jsx`) får et eget område «Samarbeidsfiler – A – B». |
| **Gjenstår: tekster og dokumentasjon** | i18n (engelsk for alle nye tekster), `CLAUDE.md`, `docs/testlogg.md` |
| **Gjenstår: tester** | E2E for alle fire roller (de gamle rolletestene må oppdateres: User og Developer har ikke lenger Samarbeid i menyen). Ny E2E for hele flyten med kobling, kopi, fjerning, avslutt og gjenåpne, verktøypanelene og mobil. Sjekksum på eksisterende filer før og etter. |
| **Gjenstår: commit og push** | Til `connecthub` (ny Preview), etter at du godkjenner |

**Database, RLS og tester som trengs i tillegg:** ingen flere databaseendringer er nødvendige. RLS for trinn 18 er ferdig
og testet. Det som gjenstår, er kode og nettlesertester.

**Risiko mens trinn 18 står på vent:**
- Preview kjører fortsatt det gamle grensesnittet mot den nye databasen. Det gamle samarbeidsskjermbildet virker derfor ikke: Moderator kan ikke gi tilgang eller dele, og Developer ser ikke filer i menigheter uten medlemskap. Det siste er riktig etter A1.
- Ingen data er i fare, og produksjonen er ikke berørt.
- Risikoen forsvinner når trinn 18 fullføres eller rulles tilbake.

**Tilbakeføring (hvis du velger det senere):**
- **Database:** en ny migrering gjenoppretter funksjonene og policyene slik de var etter `20261001180000`:
  - `files_select` og `app.visible_file_keys`
  - `app.upload_check`, `delete_file` og `storage_usage`
  - `app.is_collab_admin` (Moderator og Developer)
  - `share_file_to_space` og `invite_to_space`
  - `export_church` og `purge_church`
  - varseltypene
- **Det som blir liggende:** de nye funksjonene trekkes tilbake (revoke). `church_links` og de nye feltene i `files` blir liggende tomme og uten virkning. Å fjerne dem krever egen godkjenning, men det er ingen data i dem utenom testdata.
- **Kode:** de lokale endringene forkastes eller legges til side. Det gjøres først når du ber om det.
- Produksjonen påvirkes ikke.

**Godkjenning som trengs:** «Fullfør trinn 18 etter 7.7.10», som dekker grensesnitt, verktøy, tekster, tester, og commit og push til `connecthub`. Alternativt «Rull tilbake trinn 18».

## 8. Anbefalt rekkefølge

Trinn 1 er gjennomført. Foreslått rekkefølge videre:

1. **Grunnleggende tilgang:** **18 fullføres** (eller rulles tilbake) → 3 (testdata)
2. **Små og lavrisiko:** 4 → 14 → 10. Trinn 11 anbefales slått sammen med 18, og trinn 2 er utgått.
3. **Autentisering:** 6a → 6b → 6c → 12
4. **Tilgang og abonnement:** 19 (ferdig, `d7bd755`; feilretting 19.9 venter på commit) → 13 → 15 (15 bygger på 18) → 20 (samlet lagringsgrense, etter 18)
5. **Nye funksjoner:** 7 → 8 (når 17.11+ er mottatt)
6. **Produksjon:** 1b (`main` inn i `connecthub`) → P11-plan, der 16 (e-post) inngår
7. **Bare identifisert:** 17

Hvert trinn godkjennes for seg. Ingen commit, push, deploy eller produksjonsendring uten godkjenning av det aktuelle trinnet.

## 9. Sluttrapport for trinn 18, 20 og 21 og produksjonssjekkliste (2026-10-02)

### 9.1 Git
| Commit | Innhold |
|---|---|
| `10b7004` | Trinn 21: kvote er standard 200 MB eller egen kvote, og planene er veiledende |
| `123b529` | Trinn 21: plantestene er uavhengige av ekte dev-data |
| `12a8de1` | Trinn 18: koblinger og Samarbeidsfiler mellom to menigheter |
| `6aca85c` | Trinn 18: koblingstesten teller bare testmenighetene |
| `f138d2b` | Trinn 20: samlet lagringsgrense (1 GB) |

**Grenene:**
- Alt er pushet til `connecthub`.
- `main` er urørt på `9c536f9` (produksjon).
- `connecthub` er 23 commits foran `main` og mangler bare hastefiksen `9c536f9` (se P11 steg 1).

**Ikke committet:**
- feilrettingen av kvotemeldingen (venter på egen godkjenning): `server/lib/http.js`, `ui.jsx`, `server/adapters/supabase.js` (én linje), `i18n.js` (én tekst), `quota-error.test.js` og testloggen
- `media-lab/GIT-Guide.md` (dine endringer)
- dette dokumentet (usporet)

### 9.2 Migreringer
- **`connecthub-dev`:** alle 20 migreringer er kjørt, også trinn 18 (`20261001190000`, `…190100`), 21 (`20261002100000`) og 20 (`20261002200000`).
  - Hver gang er det kontrollert med tørrkjøring og med øyeblikksbilde før og etter.
  - Eneste dataendring: menighet A er merket som egen kvote (1024 MB).
- **Produksjon (`cmuienhheklcgtfmpvbe`):** ingen migreringer. Databasen er tom og urørt.

### 9.3 Tester
| Kjøring | Resultat |
|---|---|
| `npm test`, alle trinn + feilrettingen (arbeidskopien) | 97/97 |
| `npm test`, hver commit-kandidat for seg | 79/79 (21), 83/83 (18), 88/88 (20) |
| RLS i PGlite og mot dev | 411/411 |
| Nettleser trinn 21 | alle fire roller |
| Nettleser trinn 18 | hele flyten med kobling, kopi, nedlasting med SHA-256, avslutt, gjenåpne, opprydding, alle roller og verktøy |
| Nettleser trinn 20 | grensen satt midlertidig til 1 MB. Opplasting stoppes med riktig melding (507), grensen satt tilbake. |
| Bygg | OK hver gang. Sikkerhetssøket har ingen funn, og CSP er komplett. |

**Varige testspor i dev (syntetiske):**
- én forespørsel om abonnement (trinn 19)
- én avsluttet kobling CH-test A–B
- loggrader og varsler til syntetiske Admin-kontoer
- to `storage.limit`-loggrader

### 9.4 Vercel Preview
- Alle fem commitene er bygget og publisert («Deployment has completed», GitHub-status `success`).
- Preview er beskyttet av Vercel-innlogging. Den er derfor kontrollert gjennom byggestatus og lokale bygg av nøyaktig de samme filene mot `connecthub-dev`. `vercel curl` er ikke brukt.
- **Merk:** API-et på Preview svarer `not_configured`, så lenge den manuelle variabelen `connecthub_devSUPABASE_SECRET_KEY` ikke finnes i Vercel (se minne og P11).

### 9.5 Produksjonssjekkliste (P11 – utføres først etter «Ja, start siste ting»)

**Avklaringer og godkjenninger som trengs først:**
1. **Produksjonsadresse:** `SITE.production` i `server/lib/backend.js` er `null`. Invitasjonslenker trenger den faste produksjonsadressen (f.eks. Vercel-domenet eller eget domene). Den må også legges inn i Supabase Auth (Site URL og Redirect URLs).
2. **E-post (trinn 16):** invitasjoner sendes med Supabase Auth sin innebygde e-post. Den har svært lav sendegrense. Velg egen SMTP-leverandør. Det kan gi kostnad.
3. **Region (valgfritt):** Vercel-funksjonene går i `iad1`, men Supabase ligger i `eu-north-1`. Forslag: `"regions": ["arn1"]`.
4. **Feilrettingen av kvotemeldingen:** commit før P11, eller utsett.

**Selve produksjonssteget (i denne rekkefølgen):**
1. **Slå `main` inn i `connecthub`** (1b).
   - Én konflikt: `media-lab/api/ml.js`. Behold `connecthub`-versjonen, som allerede har samme retting (`b45a765`, med tidsgrenser).
   - Kjør testene og bygg, og push.
2. **Vercel Production, miljøvariabler** (Vercel-endring):
   - Legg inn `connecthubSUPABASE_URL`, `connecthubSUPABASE_PUBLISHABLE_KEY` og `connecthubSUPABASE_SECRET_KEY` for prosjektet `cmuienhheklcgtfmpvbe`.
   - Fjern eller gi nytt navn til de hemmelige nøklene med `VITE_`-prefiks fra integrasjonen (latent lekkasjerisiko).
   - Byggevakten (`env-guard`) stopper bygget hvis prosjekt-ID eller nøkler er feil.
3. **Supabase produksjon:**
   - **Migreringer:** kjør alle 20 med `supabase db push --project-ref cmuienhheklcgtfmpvbe` fra repoet, etter tørrkjøring.
   - **Auth-innstillinger som i dev:** registrering av, passordkrav, MFA (TOTP) på, Site URL og Redirect URLs for produksjon, SMTP.
   - **Kontroll:**
     - bøtta `ch-files` er privat med grense på 4 MB og bare bildetyper
     - `storage_settings` = 1024 MB
     - planene er 200, 1024 og 5120
   - RLS-testene mot produksjon (rulles tilbake, endrer ingenting).
4. **Første Developer:**
   - Inviter kontoen din via Supabase Auth.
   - Kjør `select app.bootstrap_developer('<e-post>', 'https://cmuienhheklcgtfmpvbe.supabase.co/auth/v1')`.
   - Sett opp MFA.
   - Ingen testdata i produksjon.
5. **Slå `connecthub` inn i `main`** og la Vercel publisere Production.
6. **Røyktest i produksjon:**
   - Innlogging, MFA, og at alle sider krever innlogging.
   - Invitasjon og godkjenning.
   - Opplasting og nedlasting.
   - Video avvises.
   - Kvote og samlet grense.
   - Kobling og Samarbeidsfiler med to egne testmenigheter. Rydd opp etterpå.
   - CSP og `version.json`.
   - De gamle verktøyene (lokale prosjekter knyttes til riktig bruker).
7. **Tilbakeføring:** Vercel «Promote» av forrige produksjonsbygg (`9c536f9`). Produksjonsdatabasen var tom før P11, så den kan bli liggende uten virkning.

**Kostnader:** Supabase Free (1 GB fillagring, 500 MB database), Vercel og SMTP. Ingen kostnader settes i gang uten godkjenning.

### 9.6 Status 2026-10-02 og avklaringer før P11

**Status:**
- Trinn 18, 20 og 21 er bekreftet ferdige og testet.
- Feilrettingen av kvotemeldingen er committet alene: **`0697ed4`** på `connecthub`.
- **Produksjonssteget er IKKE startet.** Det startes først når du skriver «Ja, start siste ting». Til da:
  - ingen produksjonsmigreringer
  - ingen sammenslåing av greiner
  - ingen endring av produksjonsnøkler
  - ingen publisering til produksjon
  - ingen endringer i Vercel

**Kontrollert urørt (2026-10-02, bare lesing):**
- `main` = `9c536f9`.
- Produksjonen i Vercel kjører `9c536f9`, publisert 2026-10-01 kl. 22:47 (den godkjente hastefiksen).
- Produksjonsdatabasen `cmuienhheklcgtfmpvbe` har 0 tabeller, 0 migreringer, 0 brukere, 0 bøtter og 0 objekter.

**Dine valg:**

| # | Avklaring | Valg | Fakta (kontrollert) og hva som gjenstår |
|---|---|---|---|
| 1 | Produksjonsadresse | **Vercel-adressen til prosjektet** | **Adressen:** `https://media-lab-react-vyef.vercel.app`. Det er hovedaliaset til produksjonen i prosjektet `media-lab-react-vyef` (team `media-lab3`). Andre aliaser: `media-lab-react-vyef-media-lab3.vercel.app` og `media-lab-react-vyef-git-main-media-lab3.vercel.app`. **Gjenstår i P11:** sette `SITE.production` i `server/lib/backend.js`, og legge adressen inn i Supabase Auth (Site URL og Redirect URLs). Domenet endres ikke. |
| 2 | E-posttjeneste | **Ekstern tjeneste, valg gjenstår** | Se sammenligningen nedenfor. **Uavklart:** valg av leverandør, og hvilket domene e-posten skal sendes fra. Alle seriøse tjenester krever et domene du styrer DNS for (SPF, DKIM og DMARC). `vercel.app` kan ikke brukes. Teamet har domenet `media-lab.app` i Vercel (lagt til 2026-09-24), men det er ikke satt opp (DNS hos en annen leverandør, peker ikke til Vercel) og brukes ikke av prosjektet. Det kan være aktuelt hvis du styrer DNS for det. |
| 3 | Serverregion | **Stockholm (`arn1`)** | I dag er regionen `iad1` (USA). Endres i P11 med `"regions": ["arn1"]` i `vercel.json` (Vercel-endring). Ikke gjort ennå. |
| 4 | Kvotemeldingen | **Godkjent og committet** | `0697ed4`: `npm test` 97/97, RLS 411/411, bygg OK. |

**Sammenligning av e-posttjenester for invitasjoner** (kilder sjekket 2026-10-02):

Volumet er lite: invitasjoner, tilbakestilling av passord og andre innloggingsmeldinger fra Supabase.

| Tjeneste | Gratis | Betalt fra | Oppsett med Supabase | Levering | Domene | Data |
|---|---|---|---|---|---|---|
| **Resend** | 3 000/mnd (maks 100/dag), 1 domene | ca. 20 USD/mnd | **Egen integrasjon** som fyller inn SMTP-innstillingene i Supabase automatisk | God for transaksjons-e-post | Må verifiseres (DNS) | Kan sende fra Irland, men kontodata (også logger) lagres i USA |
| **Brevo** | 300/dag | 9 USD/mnd | Vanlig SMTP (manuelt) | God når domenet er autentisert. Uten DKIM skrives avsender om til `@brevosend.com`. | Må autentiseres | Fransk selskap |
| **Postmark** | 100/mnd (hard grense) | 15 USD/mnd (10 000) | Vanlig SMTP (manuelt) | Svært god, med egen strøm for transaksjons-e-post | Må verifiseres | USA |
| **Amazon SES** | Ingen fast gratisdel | 0,10 USD per 1 000 | SMTP. Krever AWS-konto og søknad om å komme ut av «sandbox» | God, men krever mer oppsett og oppfølging | Må verifiseres | Kan velge EU-region |
| Supabase innebygd | 2/time, bare til teamets egne adresser | – | Ingen | – | – | Ikke egnet for produksjon |

**Anbefaling: Resend.**
- Den offisielle integrasjonen med Supabase gir minst manuelt oppsett og færrest feilkilder.
- Gratisplanen dekker volumet med god margin.
- Leveringen er god for transaksjons-e-post.
- **Forbehold:** kontodata og logger hos Resend (blant annet mottakeradresser) lagres i USA. Hvis du vil ha EU-lagring som krav, er **Brevo** det beste alternativet (gratis 300/dag, vanlig SMTP). Det betyr litt mer manuelt oppsett.
- **Uansett tjeneste trengs et eget avsenderdomene med DNS-tilgang.**

Kilder:
- [Resend gratisplan](https://automationatlas.io/answers/resend-free-tier-explained-2026/)
- [Resend og Supabase](https://resend.com/changelog/supabase-integration)
- [Resend-regioner](https://www.resend.com/docs/dashboard/domains/regions.md)
- [Postmark-priser](https://automationatlas.io/answers/postmark-pricing-explained-2026/)
- [Brevo gratis/betalt](https://dreamlit.ai/blog/brevo-review)
- [Brevo og DKIM](https://www.captaindns.com/en/blog/brevo-transactional-email-technical-guide)
- [Amazon SES-priser](https://www.saaspricepulse.com/blog/amazon-ses-pricing-per-1000-emails-2026)
- [Supabase innebygd e-post](https://axonbuild.com/blog/supabase-email-rate-limit/)

**Fortsatt uavklart før P11:**
1. Valg av e-posttjeneste.
2. Avsenderdomene og DNS-tilgang (`media-lab.app` eller et annet domene).
3. Avsendernavn og avsenderadresse (f.eks. `ConnectHub <noreply@…>`).

**Fortsatt åpent, men ikke til hinder for P11:**
- Variabelen `connecthub_devSUPABASE_SECRET_KEY` på Preview (opprettes av deg i Vercel).
- Trinn 3 (opprydding av testdata i dev) og de øvrige trinnene i avsnitt 8.

### 9.7 Produksjon på Vercel-adressen uten eget domene (undersøkt 2026-10-02, ingenting endret)

**Konklusjon:** ConnectHub kan settes i produksjon på `https://media-lab-react-vyef.vercel.app`, og innlogging virker uten e-post. Invitasjoner og tilbakestilling av passord trenger e-post. Uten eget domene er en **egen Gmail-konto med app-passord** som SMTP i Supabase den eneste midlertidige løsningen som er både trygg og fungerer.

#### 9.7.0 Dine valg (2026-10-02)
1. **Nettadresse:** ConnectHub beholder `https://media-lab-react-vyef.vercel.app` som fast adresse inntil videre. Da trengs ingen flytting av prosjekter som er lagret i nettleseren.
2. **E-post nå:** en egen Gmail-konto bare for ConnectHub (vanlig, gratis Gmail-konto, «Til eget bruk»): **`medialab.noreply@gmail.com`**.
   - Avsender i Supabase SMTP: `ConnectHub <medialab.noreply@gmail.com>`.
   - SMTP: `smtp.gmail.com`, port 587 (STARTTLS), brukernavn = adressen, passord = app-passordet.
   - Du oppretter kontoen selv, slår på totrinnsbekreftelse og legger app-passordet direkte inn i Supabase (SMTP-innstillingene i produksjonsprosjektet) når det blir aktuelt i P11.
   - Passord og nøkler deles aldri i chatten og legges aldri i koden eller i Vercel.
3. **E-post på sikt:** du vurderer et eget domene **bare til e-post** (Resend eller Brevo med SPF, DKIM og DMARC). Da trengs bare et bytte av SMTP i Supabase og nytt avsendernavn. Nettadressen, koden for lenker og lokale data berøres ikke.
4. **Produksjonssteget** venter på «Ja, start siste ting». Ingenting er endret i produksjon, `main` eller Vercel.

**Gjenværende forbehold:**
- **Gmail som avsender:** Google kan stenge kontoen midlertidig ved uvanlig sending. Da stopper invitasjoner og tilbakestilling av passord, men innlogging virker fortsatt. Grensen er 500 mottakere per døgn.
  - **Tiltak:** kontoen brukes bare til ConnectHub, og du sjekker innboksen for avviste meldinger de første ukene.
- **Gjenoppretting av kontoen (status 2026-10-02):**
  - Totrinnsbekreftelse er på (bekreftet), og kontoen brukes ikke til noe annet.
  - Gjenopprettingsadresse er lagt inn (bekreftet 2026-10-02). Telefon er ikke lagt inn.
  - **Restrisiko (lav):** hvis enheten med autentiseringsappen går tapt og reservekodene mangler, kan gjenopprettingen ta tid. Da stopper invitasjoner og tilbakestilling av passord til SMTP byttes. Innlogging i ConnectHub virker fortsatt.
  - **Anbefaling:** lagre også Google sine reservekoder for totrinnsbekreftelse et trygt sted utenfor PC-en.
- **Mottakers inntrykk:** avsenderen blir en `@gmail.com`-adresse. Noen mottakere kan oppfatte det som mindre offisielt. Gi meldingen et tydelig avsendernavn («ConnectHub») og en norsk tekst i malene.
- **Ingen avsender på eget domene** før et e-postdomene er på plass. SPF, DKIM og DMARC styres da av Gmail.
- **Vercel-adressen** er knyttet til prosjektnavnet `media-lab-react-vyef`. **Ikke gi prosjektet nytt navn og ikke fjern domenet i Vercel** uten å kontrollere at `media-lab-react-vyef.vercel.app` fortsatt er tildelt produksjonen. Mister prosjektet adressen, påvirkes lokale data, innlogging og lenker.
- **Senere domenebytte for selve nettadressen** (ikke planlagt) vil fortsatt kreve tiltakene i 9.7.5.

#### 9.7.1 Adressen [kontrollert i kode og konfigurasjon]
| Del | På `vercel.app` | Endring i P11 |
|---|---|---|
| Innlogging, sesjon og MFA (TOTP) | Virker. Ingen e-post trengs for vanlig innlogging. TOTP er ikke bundet til domene. | – |
| Cookien `ch_at` | Gjelder bare akkurat denne adressen (`Path=/`, `SameSite=Lax`, `Secure`, uten `Domain`). `vercel.app` står på Public Suffix List, så andre `*.vercel.app`-nettsteder kan verken lese eller sette den. | – |
| CSP | `connect-src` har allerede med produksjonsprosjektet (`cmuienhheklcgtfmpvbe.supabase.co`). | – |
| Invitasjonslenker | Bruker `SITE.production` i `server/lib/backend.js`, som er `null` i dag. | Sett til `https://media-lab-react-vyef.vercel.app` (én linje, egen commit). |
| Tilbakestilling av passord | Bruker adressen siden er åpnet fra (`location.origin` + `/login.dc.html?flow=recovery`). | Adressen må stå i Supabase sin liste over tillatte adresser. |
| Supabase Auth | – | Site URL `https://media-lab-react-vyef.vercel.app`. Redirect URLs `https://media-lab-react-vyef.vercel.app/**`. Registrering av, MFA på. |
| Vercel-tilgangsbeskyttelse | Produksjonsadressen er offentlig; tilgangen styres av ConnectHub-innloggingen. Preview er fortsatt beskyttet. | – |
| Lokale data i nettleseren | **Fordel:** dagens produksjon (gamle Media Lab) kjører på samme adresse. Brukernes lokale prosjekter i IndexedDB og localStorage (Photo Design, Motion Design, Thumbnail Studio, Mockups, innstillinger) blir derfor værende og knyttes til riktig bruker (`ch.local.owner`). | – |

#### 9.7.2 Midlertidig e-post uten eget domene [kilder sjekket 2026-10-02]
| Løsning | Virker for invitasjoner til hvem som helst? | Vurdering |
|---|---|---|
| Supabase sin innebygde e-post | **Nei.** Bare 2 per time, og bare til adresser i Supabase-teamet. | Ikke egnet. |
| Resend uten eget domene | **Nei.** `onboarding@resend.dev` sender bare til kontoeierens egen adresse; ellers 403. | Ikke egnet. |
| Brevo uten eget domene | Delvis. Gmail-adresser kan ikke autentiseres, så avsenderen skrives om til Brevo sitt domene. Det gir svakere tillit og levering. | Ikke anbefalt. |
| **Egen Gmail-konto med app-passord** (`smtp.gmail.com:587`, STARTTLS) | **Ja.** Inntil 500 mottakere per døgn. Gmail signerer med DKIM, så levering og DMARC er i orden. | **Anbefalt midlertidig løsning.** |
| Ingen e-post: Admin deler lenken selv | Ja, men det bryter dagens sikkerhetsprinsipp om at invitasjonslenken aldri vises i grensesnittet. Det krever også kodeendring. | Ikke anbefalt. |

**Slik gjøres Gmail-løsningen trygt (i P11, med din godkjenning):**
1. **Egen Gmail-konto bare for ConnectHub** (f.eks. `connecthub.<navn>@gmail.com`). Aldri en personlig konto. Totrinnsbekreftelse på kontoen er påkrevd for app-passord.
2. **App-passordet** legges **bare** inn i Supabase Auth (SMTP-innstillingene i produksjonsprosjektet).
   - Aldri i koden, i Vercel eller i chatten.
   - Det gir bare SMTP-tilgang til denne kontoen og kan trekkes tilbake når som helst.
3. **Avsender:** `ConnectHub <adressen>`. Svar havner i den samme innboksen.
4. **E-postmalene** i Supabase (Invite user, Reset password, Change email) oversettes til norsk og bruker `{{ .ConfirmationURL }}`. Malene endres ikke når domenet byttes.
5. **Forbehold:**
   - Gmail er laget for personlig bruk. Ved uvanlig mye eller mistenkelig sending kan Google stenge kontoen midlertidig, og da stopper invitasjoner og tilbakestilling av passord. Innlogging virker fortsatt.
   - Volumet her (invitasjoner og enkelte tilbakestillinger) er langt under grensen.
   - **Overvåk:** sjekk innboksen for avviste meldinger de første ukene.

#### 9.7.3 Kan gjøres nå (i P11, etter «Ja, start siste ting»)
- Produksjon på Vercel-adressen med alt fra 9.5 (migreringer, nøkler, region `arn1`, Auth-innstillinger, første Developer, røyktest).
- `SITE.production` = `https://media-lab-react-vyef.vercel.app` (egen commit på `connecthub` før sammenslåing).
- E-post via Gmail med app-passord, som over.

#### 9.7.4 Må vente til eget domene
- Profesjonell e-posttjeneste (Resend eller Brevo, se 9.6) med avsender på eget domene og SPF, DKIM og DMARC.
- Merkevare-adresse for ConnectHub.

#### 9.7.5 Endringer når domenet kobles til senere
| Område | Endring |
|---|---|
| Vercel | Legg til domenet og DNS-oppføringer. |
| Kode | `SITE.production` = ny adresse (én linje). |
| Supabase Auth | Ny Site URL. Legg til den nye adressen i Redirect URLs, men **behold den gamle i en overgangsperiode**, slik at lenker som allerede er sendt, fortsatt virker. |
| E-post | Bytt SMTP fra Gmail til Resend eller Brevo, med DNS for domenet. Trekk tilbake Gmail-appassordet. Avsenderen oppdateres. Malene kan stå som de er. |
| Innlogging | Cookien gjelder bare én adresse, så alle må logge inn på nytt på det nye domenet. Kontoer, roller, data og TOTP er uendret. |
| **Lokale data i nettleseren (viktig)** | IndexedDB og localStorage er bundet til adressen. Prosjekter som bare ligger i nettleseren (Photo Design, Motion Design, Thumbnail Studio, egne mockups, innstillinger), vises **ikke** automatisk på et nytt domene. **Tiltak:** la `vercel.app` fortsette å virke i en overgangsperiode (ikke send brukerne videre med en gang), og be dem bruke sikkerhetskopi eller eksport (Photo Design «Sikkerhetskopi», Motion Design `.motion`-fil, prosjektmapper på PC-en) før de bytter. Eventuelt et eget lite trinn for flytting av data. Prosjektmapper på PC-en blir liggende og velges på nytt. |
| CSP, region og database | Ingen endring. |

**Konsekvens for valget av domene:** jo lenger ConnectHub kjører på `vercel.app`, desto flere lokale prosjekter må eventuelt flyttes ved bytte. Et alternativ er å skaffe et domene bare for e-post og la ConnectHub bli på `vercel.app`. Da trengs ingen flytting.

**Kilder:**
- [Supabase innebygd e-post](https://axonbuild.com/blog/supabase-email-rate-limit/)
- [Resend uten domene (403)](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain)
- [Brevo: avsendere og domener](https://developers.brevo.com/docs/getting-started-with-senders-and-domains)
- [Gmail SMTP-grenser 2026](https://serversmtp.com/limits-of-gmail-smtp-server/)
- [Gmail SMTP og app-passord](https://serversmtp.com/smtp-gmail-configuration/)

### 9.8 P11 gjennomført (2026-10-02)

ConnectHub kjører i produksjon på `https://media-lab-react-vyef.vercel.app` (`main` = `c6757e8`, region `arn1`). Detaljer og testresultater står i `docs/testlogg.md` under «P11 – ConnectHub i produksjon».

**Gjort:**
- `main` er slått inn i `connecthub`, og produksjonsadresse og region er satt.
- En feil i produksjonsbygget er rettet: utviklingsprosjektets ID var med.
- Alle 20 migreringer er kjørt i produksjon. RLS 411/411.
- Auth-innstillingene er satt.
- Vercel-nøklene er lagt inn.
- Publisert til produksjon, og røyktestet.
- Developer-kontoen er opprettet uten passord og koblet til Developer-rollen.

**Gjenstår:**
1. **Brukeren:** legg inn SMTP for Gmail i Supabase (produksjonsprosjektet `connecthub`) med app-passordet. Sett så passord via «Glemt passordet?», og logg inn første gang med totrinnsbekreftelse.
2. **Brukeren:** opprett menigheter og inviter Admin og brukere. Gamle Media Lab-brukere har ikke tilgang før de er invitert.
3. **Senere:**
   - norske e-postmaler i Supabase
   - fjerne `VITE_SUPABASE_*`-variablene fra integrasjonen i Vercel
   - variabelen `connecthub_devSUPABASE_SECRET_KEY` på Preview
   - fjerne utviklingsprosjektet fra CSP i produksjon (ufarlig, men unødvendig)
   - trinn 3 og de øvrige trinnene i avsnitt 8

**Tilbakeføring:** Vercel «Promote» av forrige produksjonsdeployment (`9c536f9`, `media-lab-react-vyef-li9rhfjac-media-lab3.vercel.app`). Produksjonsdatabasen kan bli liggende.
