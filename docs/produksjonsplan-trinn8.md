# Produksjonsplan: gammel admin fjernet, «Åpne ConnectHub Dev», tilbakemeldinger og CSP per miljø

Status: **forslag**. Ingen av stegene under er utført i produksjon. Hvert steg merket «Godkjenning» krever brukerens egen, uttrykkelige godkjenning av akkurat det steget.

## 0. Hva som publiseres

`main` (`c6757e8`) spoles fram til `connecthub`. Det er en ren fast-forward uten fletting.

| Commit | Innhold |
|---|---|
| `db76976` | Gammel admin fjernet (`admin.dc.html`, `api/ml.js`, `ml-cloud.js`, `@vercel/blob`). Test som hindrer at den kommer tilbake. |
| `a3a7029` | Merket «UTVIKLING · connecthub-dev» utenfor produksjon. I produksjon har Developer-kortet merket «PRODUKSJON» og knappen «Åpne ConnectHub Dev». |
| `4d878ac` | Tilbakemeldingssystemet med migreringen `20261003100000_feedback.sql`. |
| (denne runden) | CSP per vert, norske e-postmaler (filer som ikke er i bruk ennå) og dokumentasjon. |

## 1. Kontroller før publisering (lesing, ingen endringer)

1. `git log origin/main..origin/connecthub` skal vise nøyaktig commitene over, og `git merge-base --is-ancestor origin/main origin/connecthub` skal godtas (fast-forward).
2. Testene på `connecthub`:
   - `npm test`: 111/111.
   - RLS i PGlite og i dev: 455/455.
   - `npm run build`: sikkerhetssøket har ingen funn, og alle inline-skript står i begge CSP-ene.
   - Vercel Preview: grønn.
3. Liste over migreringer i produksjonen (`supabase migration list --project-ref cmuienhheklcgtfmpvbe`): 20 er brukt, og bare `20261003100000_feedback.sql` mangler.
4. Øyeblikksbilde av produksjonen før endringen (bare lesing, samme felt som i P11): brukere, menigheter, medlemskap, roller, filer, objekter og planer.

## 2. Databaseendring i produksjon — Godkjenning

1. Kjør `npx supabase@latest db push --project-ref cmuienhheklcgtfmpvbe --dry-run`. Den skal vise bare `20261003100000_feedback.sql`, ellers stopper vi.
2. Kjør `npx supabase@latest db push --project-ref cmuienhheklcgtfmpvbe`.
3. Ta øyeblikksbildet på nytt. Alle felt skal være like, fordi migreringen bare legger til to nye, tomme tabeller og funksjoner.
4. Valgfritt, med egen godkjenning: kjør RLS-testsettet mot produksjonen. Det kjøres i én transaksjon som alltid rulles tilbake, så ingenting lagres.

**Rekkefølge:** migreringen legges inn **før** koden publiseres. Endringen bare legger til, så den nåværende produksjonskoden påvirkes ikke.

**Tilbakeføring:**
- Tabellene `feedback` og `feedback_events` er tomme til noen sender inn. Hvis vi må rulle tilbake før publiseringen, kan de og funksjonene fjernes med et eget, godkjent SQL-skript.
- Etter at saker er sendt inn, beholdes tabellene. Da settes bare koden tilbake.

## 3. Publisering av koden — Godkjenning

1. Spol `main` fram til `connecthub` og push. Vercel bygger produksjonen automatisk.
2. Byggekontrollen (`env-guard`) stopper bygget hvis dev-prosjektets ID havner i produksjonsbygget, hvis det finnes hemmelige nøkler i koden, eller hvis et inline-skript mangler i CSP-en.
3. Kontroller etter publisering (lesing):
   - GitHub-status for commiten er «success».
   - CSP på `https://media-lab-react-vyef.vercel.app/login.dc.html`: `connect-src` inneholder `cmuienhheklcgtfmpvbe` og **ikke** `uatpdmhnwwjgzlxaucsx`.
   - `/admin.dc.html` og `/api/ml` gir 404.
   - `version.json` har det nye byggnummeret.
4. Kontroller i nettleseren, gjort av brukeren:
   - Innlogging med MFA virker.
   - Tilbakemeldingsikonet vises nede til høyre.
   - Oversikten har merket «PRODUKSJON» og knappen «Åpne ConnectHub Dev», som åpner dev i ny fane.
   - «Tilbakemeldinger» står i menyen for Developer.
5. Valgfritt, med egen godkjenning: send én tilbakemelding i produksjon, behandle den og kopier den til Claude. Saken blir liggende som ekte data (eller slettes etter egen godkjenning).

**Tilbakeføring:** i Vercel → Deployments, gjør forrige produksjonsdeployment (`c6757e8`) til produksjon igjen («Promote»). Den nye databaseendringen påvirker ikke den gamle koden.

## 4. CSP per vert (følger med i steg 3)

`vercel.json` har nå to CSP-regler som utelukker hverandre:
- Produksjonsadressen (`has host = media-lab-react-vyef.vercel.app`) får CSP-en uten dev-prosjektet.
- Alle andre verter (ConnectHub Dev, deployment-adresser og lokalt) får dagens CSP med begge prosjektene.

Testes i `build/csp.test.js` og lokalt med `build/static-serve.mjs`: produksjonsverten får uten dev-ref, de andre får med.

**Ufarlig feil:** hvis Vercel ikke kjenner igjen vertsbetingelsen, får produksjonen dagens CSP (med begge prosjektene). Ingenting brytes.

**Kontroll:**
- Produksjon: med `curl -I` (steg 3).
- ConnectHub Dev (bak Vercel-innlogging): brukeren åpner dev og ser at innloggingen virker. Eventuelt sjekkes `Content-Security-Policy` i nettleserens utviklerverktøy.

## 5. Norske e-postmaler i produksjon — Godkjenning

- Malene ligger i `supabase/templates/`: invitasjon, innloggingslenke, nytt passord, bekreftelse, bytte av e-post og bekreftelseskode.
- Lenkene er de samme som før (`{{ .ConfirmationURL }}`), så innloggingsflyten er uendret.
- Produksjonen har egen SMTP (Gmail), så Supabase tillater malene der. Dev har ikke egen SMTP, og der ble malene avvist.

Fremgangsmåte:
1. Lag en midlertidig mappe med en `supabase/config.toml` som bare har `[auth.email.template.*]` (emne og `content_path`) og malfilene. Ingen andre innstillinger tas med, og innstillinger som ikke står i filen, røres ikke av `config push`.
2. Kjør `npx supabase@latest config diff --project-ref cmuienhheklcgtfmpvbe --workdir <mappe>`. Den skal bare vise emner og innhold for de seks malene.
3. Kjør `npx supabase@latest config push --project-ref cmuienhheklcgtfmpvbe --workdir <mappe>`.
4. Test: brukeren trykker «Glemt passordet?» med sin egen adresse og sjekker at e-posten er norsk og at lenken virker.

**Tilbakeføring:** push Supabase sine standardmaler på samme måte, eller tilbakestill dem i Supabase-dashbordet (Auth → Emails).

## 6. Planverdier i produksjon — Godkjenning

| Plan | Nå (produksjon) | Ønsket |
|---|---|---|
| Gratis | 1 MB, pris ikke satt | 200 MB, 0 kr |
| Standard | 0 MB, Avtales | 200 MB (prisen uendret: Avtales) |
| Utvidet | 1 MB, aktiv | Se beslutning under |

- **Endres av brukeren selv**, siden bare brukerens konto er Developer i produksjon: ConnectHub Admin → Abonnement → Planer → «Endre» for Gratis og Standard. Bekreftelsen viser gammel og ny verdi.
- Hver endring loggføres (`plans.update`). Menighetenes faktiske kvoter endres ikke; menighet «12» har fortsatt sin kvote.
- **Kontroll:** Planer-kortet viser 200 MB for begge planene, og Logg viser to `plans.update`.

**Beslutning om Utvidet:** planen ble opprettet av den første databasemigreringen og finnes i både dev og produksjon. Den er ikke laget av brukeren. Ingen menigheter eller forespørsler bruker den i dev (ikke kontrollert i produksjon). Den er ikke endret. Alternativer:
- **(a)** La den stå som den er.
- **(b)** Skjul den med `active = false`. Det krever en liten migrering, fordi direkte skriving er stengt.

## 7. Vercel-variabler — Godkjenning (brukeren utfører i Vercel)

Koden leser bare disse (kontrollert i `build/env-guard.js`, `server/lib/backend.js` og `vite.config.js`):

| Miljø | Brukes |
|---|---|
| Production | `connecthubSUPABASE_URL`, `connecthubSUPABASE_PUBLISHABLE_KEY` (bygg), `connecthubSUPABASE_SECRET_KEY` (server) |
| Preview | `connecthub-devSUPABASE_URL`, `connecthub-devSUPABASE_PUBLISHABLE_KEY` (bygg), `connecthub_devSUPABASE_SECRET_KEY`, `connecthub_devSUPABASE_PUBLISHABLE_KEY` (server) |

**Kan fjernes (ikke i bruk):**
- **Production (19):**
  - `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`
  - `VITE_SUPABASE_SUPABASE_URL`, `_ANON_KEY`, `_PUBLISHABLE_KEY`, `_SECRET_KEY`, `_SERVICE_ROLE_KEY`, `_JWT_SECRET`
  - `VITE_SUPABASE_POSTGRES_URL`, `_URL_NON_POOLING`, `_PRISMA_URL`, `_HOST`, `_USER`, `_PASSWORD`, `_DATABASE`
  - `NEXT_PUBLIC_VITE_SUPABASE_SUPABASE_URL`, `_ANON_KEY`, `_PUBLISHABLE_KEY`
- **Preview (14):**
  - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`
  - `POSTGRES_URL`, `POSTGRES_URL_NON_POOLING`, `POSTGRES_PRISMA_URL`, `POSTGRES_HOST`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DATABASE`
  - `connecthub-devSUPABASE_ANON_KEY`

**Hvorfor det er trygt:**
- Ingen kode leser navnene.
- Vite eksponerer ingen variabler automatisk (`envPrefix: 'CONNECTHUB_NEVER_EXPOSED_'`).
- Byggesperren leser bare de navngitte variablene.

**Har nøklene vært eksponert?** Ingen tegn til det:
- Koden i produksjon før ConnectHub (`747bc15`, `9c536f9`) brukte aldri `import.meta.env`, så Vite la ingen `VITE_`-variabler inn i koden.
- Alle ConnectHub-bygg har låst prefiks og sikkerhetssøk.
- Produksjonens offentlige filer er søkt gjennom 2026-10-02 uten funn: ingen `sb_secret_`, ingen service_role-JWT, ingen database-URL med passord og ingen variabelnavn.

**Merk:** variablene ble trolig opprettet av Supabase-integrasjonen i Vercel. Fjern dem enten i Vercel → Settings → Environment Variables eller via integrasjonens innstillinger (prefiks/tilkobling), så integrasjonen ikke legger dem inn igjen.

**Kontroll etter fjerning:**
1. Neste bygg av hvert miljø er grønt. Variabler leses ved bygging, så endringen gjelder først fra neste deployment.
2. Innlogging virker.
3. En invitasjon kan opprettes. Det bruker server-nøkkelen.
4. `vercel env ls` viser bare variablene som brukes.

**Tilbakeføring:** Supabase-integrasjonen kan synkronisere variablene på nytt, eller de legges inn manuelt fra Supabase-dashbordet.

## 8. Sikkerhetskopi (status, ingen endring)

- `supabase backups list`: både dev og produksjon har `backups: []` og `pitr_enabled: false`. Det tyder på Supabase sin gratisplan, som ikke har sikkerhetskopier som kan gjenopprettes.
- **Anbefaling (beslutning):**
  - **(a)** Gå over til Supabase Pro (daglige kopier i 7 dager). Det koster penger og må godkjennes separat.
  - **(b)** Ta en jevnlig logisk eksport med `supabase db dump` til en kryptert, lokal plassering. Det inneholder personopplysninger og krever egen godkjenning og et eget lagringssted.
- Lagringsbøtten (`ch-files`) er ikke med i noen av dem og må eventuelt kopieres for seg.

## 9. Beskyttelse mot lekkede passord

- Supabase: «Leaked password protection is available on the Pro Plan and above.»
- Med dagens plan er den ikke tilgjengelig. Vi har allerede minst 10 tegn med bokstaver og tall, MFA for Developer/Moderator og ingen åpen registrering.
- Hvis vi oppgraderer til Pro (punkt 8a), slås beskyttelsen på i Auth → Providers → Email, i både dev og produksjon.
