# Forslag: jevnlig eksport av ConnectHub (fram til Supabase Pro)

Status: **forslag**. Ingenting er satt opp eller aktivert, og produksjonen er ikke lest for dette.

**Bakgrunn:** 2026-10-02 hadde både dev og produksjon `backups: []` og `pitr_enabled: false`. Det betyr at det ikke finnes noen sikkerhetskopi som kan gjenopprettes. Supabase Pro kjøpes om omtrent ett år.

## 1. Hva som eksporteres

| Del | Innhold | Hvordan |
|---|---|---|
| Roller | Databaseroller og rettigheter | `supabase db dump --role-only` |
| Struktur | Tabeller, funksjoner, RLS-regler, triggere (også i `app`) | `supabase db dump` (struktur) |
| Data | Alt i `public` og `app`, pluss Supabase sine `auth`-tabeller (kontoer, passord-hasher, MFA-faktorer, identiteter) og `storage.objects` (filregisteret) | `supabase db dump --data-only` |
| Filer | Alle bildene i den private bøtta `ch-files` (maks 4 MB per fil, aldri video) | Eget skript som laster ned med servernøkkelen og kontrollerer hver fil mot `files.sha256` |
| Manifest | Dato, commit, radantall per tabell, antall filer og SHA-256 for alt i kopien | Lages av skriptet |

**Ikke med:**
- **Hemmeligheter:** Vercel-variabler og Supabase-nøkler finnes allerede i Vercel/Supabase og skal ikke ligge i kopien.
- **Video:** lagres aldri i skyen.
- **Lokale prosjekter på brukernes PC:** dette er den enkelte brukerens eget ansvar.
- **Auth-innstillinger:** SMTP, adresser og e-postmaler. Disse dokumenteres og settes inn på nytt for hånd. Malene ligger allerede i git.

## 2. Hvor det lagres

- **Krypteres i én fil:** en 7-Zip-fil med AES-256 og krypterte filnavn (`-mhe=on`). Passordet ligger i passordbehandleren din, aldri sammen med kopien.
- **Kopi 1:** egen mappe på PC-en utenfor repoet og utenfor synkroniserte mapper, f.eks. `D:\ConnectHub-sikkerhetskopi\`. PC-disken bør ha BitLocker.
- **Kopi 2:** ekstern disk som oppbevares et annet sted.
- **Valgfritt:** den *krypterte* filen kan også ligge i en skytjeneste (f.eks. OneDrive). Aldri ukryptert, og aldri i git.
- **Mellomfiler:** ukrypterte dump-filer finnes bare i en midlertidig mappe under kjøringen og slettes etterpå.

## 3. Hvor ofte og hvor lenge

- Hver uke, og alltid rett før en produksjonsendring (databaseendring eller publisering).
- **Oppbevaring:** de 4 siste ukentlige og de 3 siste månedlige kopiene, det vil si omtrent 3 måneder. Eldre kopier slettes.
- **Personvern:** en konto eller menighet som er slettet, finnes i eldre kopier til de er rotert ut, høyst cirka 3 måneder. Ved gjenoppretting må slettinger som er gjort etter kopidatoen, gjentas. De står i revisjonsloggen (`privacy.*`, `church.purge`). Dette bør stå i personvernerklæringen.

## 4. Slik kjøres det

Ett PowerShell-skript (f.eks. `ops/backup/eksport.ps1`) som **du kjører selv**. Planlagt kjøring via Windows Oppgaveplanlegger kan komme senere hvis du ønsker det.

1. Bekrefter prosjekt-ID og at du er logget inn i Supabase CLI. Skriptet skriver aldri ut passord eller nøkler.
2. Tar ut roller, struktur og data, i tre filer.
3. Laster ned alle filene i `ch-files` og kontrollerer SHA-256.
4. Lager manifestet og krypterer alt til én fil.
5. Sletter mellomfilene, åpner den krypterte filen igjen for kontroll og viser en kort oppsummering (antall rader og filer, størrelse).

**Det trengs (alt er gratis):**
- **PostgreSQL 17-klientverktøy** (`pg_dump`/`psql`, bare «Command Line Tools» fra installasjonen), eller Docker Desktop. Supabase CLI bruker et av dem. Ingen av dem er installert på PC-en i dag.
- **7-Zip.**

## 5. Gjenoppretting

**Hovedregel:** kopien legges aldri rett over produksjonen. Den gjenopprettes først et annet sted og kontrolleres. Bytte av produksjon krever egen godkjenning.

1. Opprett et nytt, tomt Supabase-prosjekt (gratis) eller en lokal PostgreSQL.
2. Kjør rollene, så strukturen, og til slutt dataene med `session_replication_role = replica`, slik at triggere ikke kjøres på nytt.
3. Last opp filene til `ch-files` med de samme nøklene (`c/<menighet>/<uuid>.<ext>`) og kontroller SHA-256.
4. Kontroller:
   - radantall mot manifestet
   - RLS-testsettet (455 tester, kjøres i en transaksjon som rulles tilbake)
   - innlogging med en testkonto
5. **Bare hvis produksjonen skal erstattes (egen godkjenning):**
   - Pek Vercel-variablene `connecthubSUPABASE_*` og `REFS.production` i koden mot det nye prosjektet.
   - Sett Auth-adresser, SMTP og e-postmaler.
   - Publiser.

   Brukerne beholder passord og MFA (de ligger i `auth`), men må logge inn på nytt.

**Øvelse:** én gang i måneden gjenopprettes siste kopi lokalt, uten nett. `npm run drill` kan utvides til å ta i mot dump-filene i stedet for JSON. Det er en egen liten oppgave.

## 6. Kostnader

- **Penger:** 0 kr. All programvare er gratis, og lagringen er lokal. Kopien er i dag under 1 MB og kan vokse til høyst omtrent 1 GB, som er den samlede lagringsgrensen.
- **Tid:** omtrent 5–10 minutter i uken, og omtrent 30 minutter for den månedlige øvelsen.
- **Senere:** med Supabase Pro (omtrent 25 USD/mnd) kommer daglige kopier i 7 dager. Den egne eksporten kan da reduseres til hver måned, som en kopi utenfor Supabase.

## 7. Sikkerhetshensyn

Kopien er like følsom som databasen. Den inneholder:
- e-postadresser, navn og telefonnummer
- passord-hasher
- **MFA-hemmeligheter.** Med dem kan noen lage innloggingskoder, så kopien må behandles som en hovednøkkel.
- invitasjons-hasher, revisjonslogg og tilbakemeldinger
- alle bildene

Derfor:
- **Kryptering:** kopien krypteres alltid. Bare Developer har tilgang og kjenner passordet.
- **Oppbevaring:** krypteringspassordet ligger aldri sammen med kopien.
- **Skriptet:**
  - Servernøkkelen for filnedlasting hentes fra Supabase CLI og ligger bare i minnet, som i testskriptene.
  - Ingen hemmeligheter skrives til disk eller logg.
- **Bruk:** kopien brukes aldri til testing i dev. Dev har bare syntetiske data.
- **Tapt passord:** mister du krypteringspassordet, er kopien ubrukelig. Lag en forseglet reserve, f.eks. papir i en safe.

## 8. Neste steg (hvis du godkjenner)

1. Lage skriptet i repoet og teste det mot **dev**: eksport, kryptering og gjenoppretting lokalt.
2. Du installerer PostgreSQL-klientverktøy og 7-Zip.
3. Første eksport av produksjonen kjører du selv, etter egen godkjenning, helst rett før neste produksjonssteg.
