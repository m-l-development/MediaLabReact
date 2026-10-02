# Produksjonsplan: åtte migreringer og `connecthub` → `main` (`4d878ac` → `6269992`)

Status: **steg B er gjort (2026-10-02). Ingen produksjonssteg er utført.** `main` og produksjonen står på `4d878ac`. Produksjonsdatabasen har 21 migreringer (til og med `20261003100000`). Hvert steg merket **[godkjenning]** utføres bare etter en egen, konkret godkjenning.

## 0. Hva som publiseres

**Kode:** `4d878ac..6269992`, 15 commits (samarbeidsgrupper `1ad8e2e`, denne planen `ecdd072` og ekstra Admin `6269992`). Dette er en ren fremspoling, siden `4d878ac` er forfar. Kommer det en ny commit med bare dokumentasjon oppå, kan den tas med; den eksakte hashen bekreftes i godkjenningen av steg H.

**Ingen nye miljøvariabler eller Vercel-innstillinger.** Den eneste endringen i `vercel.json` er CSP per vert (se kapittel 4).

**Migreringer, i denne rekkefølgen** (`db push` kjører dem i versjonsrekkefølge, hver i sin egen transaksjon, og stopper ved første feil):

| # | Migrering | Innhold | Endrer data? |
|---|---|---|---|
| 1 | `20261004100000_moderator_access.sql` | Moderator får systemadministrasjon som Developer | Nei, bare funksjoner |
| 2 | `20261005100000_single_church.sql` | Én menighet om gangen, status `removed`, `remove_membership`/`add_membership` | Nei. Bytter statuskontroll, trigger og policy |
| 3 | `20261005100100_removed_member_files.sql` | Fjernede medlemmer mister filtilgang | Nei |
| 4 | `20261006100000_dev_collab_cleanup_roles.sql` | Developer i samarbeid, opprydningskø, rollevakt | Ny tabell `file_cleanup_queue` (tom) |
| 5 | `20261007100000_feedback_archive_names_logo.sql` | Arkivering av saker, fornavn/etternavn, logo | Nye kolonner (tomme). Bytter `feedback_list()` |
| 6 | `20261007100100_delete_ended_links.sql` | Sletting av avsluttede koblinger | Nei |
| 7 | `20261008100000_collab_groups.sql` | Samarbeidsgrupper | Ny tabell, fylt fra eksisterende koblinger med kontroll. `name` fylles |
| 8 | `20261009100000_extra_admin.sql` | Developer/Moderator som ekstra Admin | To nye kolonner (`false`). Regelen «én Admin per menighet» bygges på nytt for faste Admin (eksisterende data oppfyller den allerede) |

**Den gamle koden tåler den nye databasen**, kontrollert for hver endret funksjon:
- `feedback_list` har nå en standardparameter.
- `my_links`/`create_link` finnes fortsatt.
- `link_files_meta` har bare fått flere kolonner.
- Innsetting av medlemskap er fortsatt lov.
- `remove_membership` har samme signatur, og `user_roles` leses med de samme kolonnene.

**Den nye koden tåler ikke den gamle databasen**, fordi den bruker `my_groups` og andre nye funksjoner. Derfor gjelder rekkefølgen **database først, så kode**.

## 1. Sjekkliste

| Steg | Hva | Hvem | Kontrollpunkt / stopp |
|---|---|---|---|
| **A** | Siste gjennomgang av `4d878ac..6269992` (kode, `vercel.json`, migreringer). Denne planen. | Du | Godkjent, eller endringer bestilt. |
| **B** | Generalprøve på tilbakeføring i dev (anbefalt): bygg `4d878ac` lokalt mot dev, som har alle åtte migreringene. Kjør den lesende regresjonen for alle roller. | Claude, i dev | Gammel kode virker mot ny database. Ellers stopp. **Bestått, se 1.2.** |
| **C** **[godkjenning]** | Lesende kontroll i produksjonen: `supabase/checks/prod_precheck.sql` og `prod_fingerprint.sql`. Ta vare på resultatet. | Du kjører (CLI koblet til prod) | `migrations` = 21, `last_migration` = `20261003100000`, `pending_already_applied` = 0, og alle felt under `stopp` = 0. Ellers stopp. |
| **D** **[godkjenning]** | Sikkerhetskopi av produksjonen før migrering (se 2.1). Produksjonen har ingen automatisk kopi på gratisplanen. | Du | Fila finnes og kan leses. Den lagres utenfor repoet. |
| **E** **[godkjenning]** | Tørrkjøring: `supabase link --project-ref cmuienhheklcgtfmpvbe` → `supabase db push --dry-run`. | Du | Listen viser **nøyaktig** de åtte migreringene i rekkefølgen over, og ingen andre. Ellers stopp. |
| **F** **[godkjenning]** | Migrering: `supabase db push`. | Du | «Finished supabase db push» uten feil. Ved feil: stopp, gå til 2.2. Ikke kjør på nytt uten vurdering. |
| **G** | Etterkontroll: `prod_postcheck.sql` og `prod_fingerprint.sql`. Så **koble CLI-en tilbake til dev** med `supabase link --project-ref uatpdmhnwwjgzlxaucsx`. | Du, med meg | `migrations` = 29 og alle `ok` = true. Fingeravtrykket er likt C, bortsett fra `migrations`/`last_migration`. Den gamle siden virker fortsatt (innlogging, oversikt). |
| **H** **[godkjenning]** | Kode: `git push origin 6269992:main` (eller bekreftet hash), en fremspoling uten `--force`. | Du godkjenner, jeg kjører | Vercel bygger produksjonen. Bygget stopper selv ved dev-ID, hemmeligheter eller manglende CSP-hash. |
| **I** | Røyktest uten innlogging (bare lesing): `version.json` = `6269992…`. Alle sider gir 307 til innlogging, og `/api/ch` gir 401. | Claude | Se 1.1. |
| **J** | Kontroll med innlogging (din egen konto, ingen nye data): toppfeltet viser riktig rolle. Oversikt, Brukere, Samarbeid (gruppen(e) vises med navn), Tilbakemeldinger (knappene «Kopier sak»/«Kopier alle saker») og Filer virker. Under Menigheter → en menighet → Medlemmer vises kortet «Ekstra Admin» (ikke trykk uten godkjenning). | Du | Ingen feilmeldinger. Ellers 2.3. |
| **K** | Dev-siden (ConnectHub Dev) virker fortsatt. Logg inn der. | Du | Innlogging virker. Det bekrefter at CSP-regelen for andre verter er i bruk (kapittel 4). |
| **L** **[godkjenning, valgfritt]** | RLS-testsettet i produksjonen. Det kjører i én transaksjon som rulles tilbake. Det samme ble godkjent og kjørt før («test B»). | Du godkjenner | 763/763. |

### 1.1 Kontrollpunkter i steg I
- `curl -s https://media-lab-react-vyef.vercel.app/version.json` → `"v":"6269992…"`.
- Nøyaktig **én** `content-security-policy`-header på `/login.dc.html`. `connect-src` inneholder `cmuienhheklcgtfmpvbe` og **ikke** `uatpdmhnwwjgzlxaucsx`.
- `/connecthub-admin.dc.html` gir 307 til `/login.dc.html?next=…`. `POST /api/ch?a=file.urls` uten token gir 401.

### 1.2 Resultat av steg B (generalprøve, 2026-10-02)
Den gamle koden (`4d878ac`) ble bygget i en egen arbeidskopi og kjørt lokalt mot dev, med alle de nye migreringene brukt. Kontrollen ble kjørt to ganger: med 7 migreringer, og på nytt etter den 8.
- **Gamle sider som bruker endrede funksjoner:** Samarbeid (`my_links`, `link_files_meta`), innboksen (`feedback_list` uten argument, 12 saker), Filer → Samarbeidsfiler (`church_a`/`church_b`) og `whoami`. Alle virker uten feilmeldinger.
- **Lesende regresjon, PC og mobil:** alle admin-sider og fem verktøy for Developer, Moderator, Admin og User. Tilgangene er som i dagens produksjon (gammel kode: Moderator ser bare Samarbeid og Tilbakemeldinger, og Developer ikke Samarbeid).
- **Avvik:** én enkelt 500 på `file.urls` (Admin) i første kjøring. Den lot seg ikke gjenskape: alle `file.urls`-kall på admin-sidene og i fem verktøy gikk gjennom, og den kom ikke i andre kjøring. Trolig et forbigående tidsavbrudd mot lagringen. Ellers bare den kjente 404-en for den valgfrie `mockups/config.json`.
- **Konklusjon:** tilbakeføring til `4d878ac` (Vercel «Instant Rollback») virker med den nye databasen.

### 1.3 Generelle stoppregler
- Ett steg om gangen, med eget resultat. Ingen steg slås sammen.
- Alt som avviker fra forventet resultat, stopper planen til du har avgjort hva som skjer.
- Ingen testdata opprettes i produksjonen uten egen godkjenning.

## 2. Tilbakeføringsplan

### 2.1 Sikkerhetskopi (steg D)
Kjør med CLI-en koblet til produksjonen:

```
supabase db dump --linked -f prod-schema-2026-10-xx.sql
supabase db dump --linked --data-only -f prod-data-2026-10-xx.sql
```

Fila med data inneholder personopplysninger. Den lagres bare lokalt utenfor repoet (aldri i git) og slettes når publiseringen er bekreftet stabil. Lagringsfilene i bøtta `ch-files` påvirkes ikke av migreringene, så de trenger ingen egen kopi for denne runden.

### 2.2 Hvis en migrering feiler (steg F)
- **Tilstanden:** migreringene før den som feilet, er brukt. Den som feilet, er rullet tilbake, og de senere er ikke kjørt.
- **Siden virker:** produksjonskoden er fortsatt `4d878ac`, og den tåler alle delmengder av de åtte migreringene. Ingen hast.
- **Ikke** rediger en migrering som allerede er brukt, og ikke kjør `db push` på nytt uten å vite årsaken.
- **Retting framover:** finn årsaken med lesende spørringer, lag rettingen i dev (ny migrering eller forhåndsrydding), test der, og ta den gjennom steg C–G på nytt.
- **Gjenoppretting fra kopien (2.1):** bare hvis data faktisk er skadet, og bare etter egen godkjenning. Ingen av migreringene sletter eller overskriver eksisterende rader. Den eneste oppdateringen er utfyllingen av `church_links.name`.

### 2.3 Hvis koden feiler etter publisering (steg H–J)
1. **Raskest, uten git-endring:** Vercel → Deployments → forrige produksjonsdeployment (`4d878ac`) → «Instant Rollback». Siden går tilbake på sekunder, og databasen blir stående (den gamle koden tåler den).
2. Deretter avgjør du om `main` skal tilbake:
   - en `git revert`-commit (anbefalt, ingen omskriving), eller
   - `git push --force-with-lease origin 4d878ac:main`, som krever uttrykkelig godkjenning.
3. Feilen rettes på `connecthub`, testes i dev og publiseres på nytt med samme sjekkliste.

### 2.4 Hvis databasen må tilbake
Det er ingen ned-migreringer. Ny database-tilstand rulles tilbake med nye migreringer (forover), eller i verste fall med gjenoppretting fra kopien (2.1) etter egen godkjenning.

Merk at gjenoppretting fra kopien fjerner alt som er gjort i produksjonen etter at kopien ble tatt. Gjør derfor kopien rett før steg F.

## 3. Risiko

| Risiko | Sannsynlighet | Tiltak |
|---|---|---|
| En migrering feiler på produksjonsdata som ikke finnes i dev | Lav (produksjonen har lite data) | Forhåndskontroll C, tørrkjøring E, og 2.2 |
| Vercel bruker vertsreglene for CSP annerledes enn forventet | Lav (Preview-bygget for `1ad8e2e` godtok `vercel.json`) | Kontrollpunkt I og K. Se kapittel 4 |
| CLI-en blir stående koblet til produksjonen | Middels | Steg G: koble tilbake til dev med en gang |
| Gammel nettleserfane med gammel kode | Lav | `ml-update.js` varsler om ny versjon. Den gamle koden tåler den nye databasen |

## 4. CSP-endringen (fra `fe06354`)

**Hva den gjør:** de to regelene i `vercel.json` er like, med ett unntak: produksjonsverten `media-lab-react-vyef.vercel.app` får `connect-src` uten dev-prosjektet `uatpdmhnwwjgzlxaucsx`. Alle andre verter får begge prosjektene.
- **Inline-skriptene:** hashene er identiske i begge regler, og bygget kontrollerer begge.
- **Tester:** `build/csp.test.js` (3 tester).
- **Vercel:** Preview-bygget for `1ad8e2e` lyktes, altså godtar Vercel regelformatet (`has`/`missing` med `{ "eq": … }`).

**Risiko og avvik:**
1. **Ikke kontrollert på en ekte Vercel-vert ennå.** Dev-siden er beskyttet av Vercel-innlogging, og `vercel curl` skal ikke brukes. Derfor kontrollpunkt I (produksjonen) og K (du logger inn på Dev-siden).
2. **Rettelse av produksjonsplan-trinn8, kapittel 4 («ufarlig feil»).** Hvis Vercel ignorerte *begge* vertsbetingelsene, ville begge CSP-ene bli sendt, og nettleseren håndhever begge.
   - For produksjonen er det ufarlig, fordi den uansett bare skal snakke med produksjonsprosjektet.
   - For Dev ville det stoppe kall til dev-prosjektet, så innlogging på Dev ville feile.
   - Det oppdages i steg K og rettes på Dev uten å påvirke produksjonen.
3. **Egne domener blir mindre strenge.** Får produksjonen et eget domene eller en ny alias, får den adressen den *mindre* strenge CSP-en (med dev-prosjektet). Det virker, men da må vertsregelen oppdateres.

## 5. Knappetekstene (`2e8f44c`) og rolletittelen (`051fcd1`)

**Knappetekster:** «Kopier sak», «Kopier alle saker», «Kopier valgte saker» og kortet «Kopier saker».
- Engelsk finnes i `i18n.js`.
- Bare tekst. Kopiformatet og rensingen er uendret.
- **Avvik:** `CLAUDE.md` (Tilbakemeldinger) sier fortsatt «Kopier sak til Claude». Det er en ren dokumentasjonsrettelse.

**Rolletittel:** `brandOf()` i `access.js` gir «CONNECTHUB · DEVELOPER / MODERATOR / ADMIN / BRUKER».
- Testet i `access.test.js`. «BRUKER» → «USER» på engelsk, og de andre er like på begge språk.
- Tittelen viser den *effektive* rollen. Rollebytteren er av i produksjonen (`switcherAllowed`), så der er det alltid den ekte rollen.
- Tittelen vises bare til den innloggede selv. Ingen risiko funnet.

## 6. Testkontoen `ch-test-userb@example.com` (dev)

**Kontoen har:**
- en innloggingskonto
- en ConnectHub-bruker
- en identitet
- et aktivt medlemskap i CH-test Menighet B

Den har ingen filer og ingen roller. Loggradene fra opprettelsen kan ikke slettes, og blir stående.

**Trygg fjerning, foretrukket:** logg inn som `ch-test-userb` på dev → kontomenyen → Personvern → «Slett kontoen min» (skriv `SLETT`).
- Det bruker den vanlige, testede veien (`privacy.delete_me`): private filer (ingen), ConnectHub-brukeren, identiteten og innloggingskontoen, med loggrad `account.delete`.
- Ingenting annet berøres.

**Alternativ uten sletting:** Admin/stab fjerner medlemskapet (`remove_membership`, status `removed`) og deaktiverer kontoen. Det kan reverseres, og radene blir stående.

**Kontroll etterpå (bare lesing):**
- ingen rader for e-posten i `app_users`/`user_identities`
- antall medlemskap i B er redusert med én
- fingeravtrykket for de andre tabellene er uendret
