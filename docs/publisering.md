# Publisering: connecthub → Dev → (godkjenning) → main → produksjon

Oppsettet som faktisk finnes (kontrollert 2026-10-31):

| Del | Hvordan |
|---|---|
| Git | `origin` = github.com/m-l-development/MediaLabReact (offentlig). `connecthub` = utvikling, `main` = produksjon. |
| CI | `.github/workflows/ci.yml`: jobbene «checks» (typekontroll, lint, enhetstester, bygg) og «e2e» (Playwright) ved push til `main`/`connecthub` og ved pull request mot `main`. Ingen hemmeligheter, ingen deploy. |
| Deploy | Vercel-prosjektet `media-lab-react-vyef` (rot `media-lab`) med Git-integrasjon: **produksjonsgrenen er `main`**; alle andre grener blir forhåndsvisninger. `connecthub` = Dev: https://media-lab-react-vyef-git-connecthub-media-lab3.vercel.app/app/ (beskyttet av Vercel-innlogging). |
| Miljøvariabler | Egne sett for produksjon og forhåndsvisning (Dev-databasen connecthub-dev, produksjonsdatabasen er en annen). Endres bare i Vercel, aldri fra skriptene. |
| Database | Migreringer i `supabase/migrations` kjøres **ikke** av deployen. Produksjon bare etter egen godkjenning og kjøreplan (`docs/migration-runbook.md`). |
| Tilbakerulling | Vercel «Instant Rollback» til forrige produksjonsdeploy (Hobby: bare den umiddelbart forrige), deretter `git revert` av merge-commiten. |

Det blir aldri doble deployer: skriptene under pusher bare git; Vercel bygger.

## 1. Til Dev (automatisk etter beståtte kontroller)

```
git add <filene som hører til endringen>      # aldri «git add -A» (usporede filer hører ikke med)
git commit -m "…"
node web/tools/ship-dev.mjs                    # eller --e2e=e2e/motion-ux.spec.ts,…  /  --no-e2e for rene verktøy/dokumenter
```

`ship-dev.mjs` stopper uten push hvis grenen ikke er `connecthub`, hvis sporede filer ikke er committet, hvis
`origin/main` ikke er med, eller hvis `npm run check` (typekontroll, lint, enhetstester, bygg) eller Playwright feiler
(én ny kjøring av de som feilet, fordi last kan gi tidsavbrudd). Ellers pusher den, venter på Vercel-deployen av akkurat
denne commiten (READY) og på CI (success), og skriver commit og Dev-adresse. `--verify` kontrollerer bare at HEAD er
publisert og grønn.

Brukerflyter innlogget i Dev (syntetiske testkontoer, rydder etter seg):
`ML_DEV_SPECS=feedback-cases-dev,motion-dev,mockups-load-dev node web/e2e-dev/run-dev.mjs --remote=<Dev-adressen> --only=user`

## 2. Klar for produksjon? (bare lesing)

```
node web/tools/release-check.mjs               # standard: toppen av origin/connecthub
```

Klar bare når: commiten er toppen av `connecthub` (det som ble testet i Dev), `origin/main` er forfar, CI er grønn,
Dev-deployen av commiten er READY, og det ikke er nye databasemigreringer siden produksjon (finnes det, stopper den og
viser filene). Skriver også miljøvariabler som bare finnes i Dev (navn, aldri verdier) og tilbakerullingsmålet.

## 3. Release connecthub → main (`release.yml`, `release-verify.yml`, `web/tools/release-gate.mjs`)

### Anbefalt modell: automatisk release-forberedelse, menneskelig godkjenning før merge

Alt unntatt selve godkjenningen er automatisk; «Require approvals» på `main` beholdes.

1. **Push til `connecthub`** (ship-dev) → Vercel bygger Dev, CI kjører `checks` + `e2e`.
2. **release.yml** (`RELEASE_PR: 'true'`) venter på CI (nyeste kjøring per kontroll) og Dev-deployen av samme commit,
   krever at commiten er toppen av `connecthub`, at `main` er med og at det ikke er nye migreringer. Så lager eller
   oppdaterer den pull request `connecthub → main` med resultatene og setter commit-status **`release-gate`** = success på
   commiten. Ved feil: status failure, og jobben stopper.
3. **Eieren** leser pull requesten, godkjenner og merger med «Create a merge commit» (eller «Enable auto-merge», så
   merger GitHub når påkrevde kontroller er grønne). Branch protection håndhever godkjenning og kontroller.
4. **Vercel** bygger produksjon fra `main`.
5. **release-verify.yml** (utløses av Vercels `deployment_status` = success for «Production», uansett hvem som merget):
   kontrollerer at commiten er toppen av `main`, at deployen er success, at `/app/version.json` viser commiten og at 7
   hovedadresser svarer; **først da** spoles `connecthub` fram til merge-commiten (bare fast-forward).

Hvorfor det går med påkrevd godkjenning: pull requesten lages av github-actions[bot], så eieren er ikke forfatter og kan
godkjenne den. Workflowen godkjenner aldri selv.

### Alternativer (ikke anbefalt)

| Modell | Hva må endres | Konsekvens |
|---|---|---|
| Full automatikk (`AUTO_MERGE: 'true'`) | «Require approvals» av (boten kan ikke godkjenne egen pull request) | ingen menneskelig kontroll før produksjon; en feil som CI ikke fanger, går rett ut |
| Automatisk godkjenning med en annen identitet (GitHub App eller token for en annen konto) | ny hemmelighet i repoet | godkjenningen blir en formalitet og en ny nøkkel må beskyttes; omgår hensikten med regelen |
| GitHub-miljø «production» med påkrevd godkjenner i Actions | «Require approvals» av | godkjenningen flyttes fra koden (pull request) til et knappetrykk i Actions; ingen kodegjennomgang håndhevet av `main` |
| Merge queue | – | finnes ikke for repoer eid av en personlig konto |

### Moduser i release.yml

| `RELEASE_PR` | `AUTO_MERGE` | Gjør |
|---|---|---|
| `'false'` | `'false'` | tørrkjøring – bare kontrollene, annotasjon «TØRRKJØRING …» |
| `'true'` | `'false'` | anbefalt: + pull request og status `release-gate`; et menneske merger |
| – | `'true'` | **aktiv fra 2026-10-31 (eierens beslutning):** merge gjennom beskyttelsen på `main`. Krever beskyttelsen godkjenning, avviser GitHub boten og pull requesten venter på et menneske (annotasjon «VENTER PÅ GODKJENNING»); etter merge kontrollerer release-verify.yml produksjonen |

### Samspill og sikkerhet (gjennomgått i kode)

- **Kø:** `release` og `release-verify` har hver sin kø uten avbrudd (`cancel-in-progress: false`). GitHub kjører én om
  gangen og beholder bare den nyeste ventende. En kjøring hvis commit ikke lenger er toppen av `connecthub`, avslutter
  uten feil (også når CI-en dens ble avbrutt av en nyere push).
- **Riktig commit:** CI-resultatet er den nyeste kjøringen per kontroll, så en ny kjøring eller CI på pull requesten for
  samme commit kan ikke skjule en feil. Full automatikk merger med `sha` (GitHub avviser hvis pull requesten har fått nye
  commits). I anbefalt modell sørger «Dismiss stale pull request approvals» for at en godkjenning gjelder commitene som
  ble vist.
- **Fast-forward av `connecthub`:** skjer bare etter at produksjonen er verifisert (en feil stopper jobben før), bare når
  den deployede commiten er toppen av `main`, og med `force: false`: GitHub avviser alt som ikke er fast-forward, så
  nyere arbeid på `connecthub` aldri overskrives (da kommer en advarsel, og main hentes inn manuelt).
- **Feil i Vercel-deployen:** Vercel beholder forrige produksjonsdeploy live. Uten `deployment_status` success kjører
  ikke release-verify, og `connecthub` spoles ikke fram. `main` har da merge-commiten uten at den er i produksjon: rett
  feilen på `connecthub` etter `git merge origin/main`, ship-dev, ny pull request.
- **Feil etter deploy** (version.json eller adresser): jobben feiler og skriver målet; ingen automatisk tilbakerulling.

### Status: hva er verifisert

| Verifisert av eksisterende kjøringer | Bare gjennomgått i kode | Ikke verifisert |
|---|---|---|
| Tørrkjøringen (f252e4e): venter på checks + e2e og Dev-deploy, toppkontroll, tilbakerullingsmål – annotasjon «TØRRKJØRING» | `--pr` (pull request, status `release-gate`), `--merge`, `--after-deploy`, fast-forward | at GitHub tillater Actions å lage pull requests (innstilling) |
| Stopp ved feil: 0ac5f1e, «CI: e2e=failure» | valg av nyeste CI-kjøring; avslutning ved utdatert commit (skrevet etter siste kjøring) | at Vercels `deployment_status` starter release-verify.yml |
| Vercel melder «Preview»/«Production» til GitHub (vercel[bot], success) | release-verify.yml og den nye release.yml (YAML ikke tolket lokalt; ingen parser installert) | at Vercel deployer en merge laget av en bot (bare full automatikk) |
| CI checks + e2e grønne for f252e4e; produksjon 76b93d9 READY | – | e-post i produksjon; logo-bufferen kjørt på nytt |

### Regler per gren

| Gren | Beskyttelse (GitHub) | Hvordan endringer kommer inn |
|---|---|---|
| `connecthub` | ingen | `node web/tools/ship-dev.mjs` lokalt (kvalitetssperre før push); Vercel deployer Dev; release-verify spoler fram etter release |
| `main` | påkrevd kontroll «checks» for alle (i dag) | bare via godkjent pull request fra `connecthub` |

### Tilbakerulling

Ingen automatisk tilbakerulling: feiler kontrollen av produksjonen, feiler jobben med målet i meldingen, og eieren
bestemmer.

1. **Raskest:** Vercel → Deployments → forrige produksjonsdeploy → «Instant Rollback» (Hobby: bare den umiddelbart
   forrige; release.yml skriver den som «Tilbakerullingsmål» i annotasjonen, `release-check.mjs` med deploy-id). Fra denne
   maskinen også `npx vercel rollback <deploy-id>`.
2. **Kontroller:** `curl -s https://media-lab-react-vyef.vercel.app/app/version.json` skal begynne med målets commit;
   `node web/tools/release-verify.mjs <commit>` sjekker deploystatus, version.json og hovedadressene.
3. **Merk:** etter «Instant Rollback» slutter Vercel å flytte produksjonsadressen til nye deployer fra `main` til noen
   trykker «Undo Rollback» / «Promote». En ny release ville da stoppe ved version.json-kontrollen (feiler trygt).
4. **Varig:** `git revert -m 1 <merge-commit>` på `connecthub` og vanlig release (ship-dev → release.yml), eller en
   manuell pull request til `main`. En automatisk revert direkte på `main` er ikke mulig: `main` er beskyttet, og
   endringer laget med `GITHUB_TOKEN` starter ikke CI, så påkrevd kontroll ville aldri bli grønn.
5. **Data:** ingen migreringer i releasen ⇒ databasen trenger ingen tilbakerulling. Motion-prosjekter (lagres i
   nettleseren) som har fått effekter, keyframes, prosjektvarighet eller dempede spor, mister disse feltene hvis de
   lagres på nytt i den gamle versjonen; selve klippene beholdes.

### Etter en release (status som kan kontrolleres uten innlogging)

- GitHub → Actions → «Release verify»: annotasjonen «PRODUKSJON VERIFISERT: <commit> …» (eller «STOPP: …»).
- `https://api.github.com/repos/m-l-development/MediaLabReact/deployments?environment=Production&per_page=1` → nyeste
  produksjonsdeploy (vercel[bot]) og `statuses_url` med `success`.
- `/app/version.json` på produksjonsadressen begynner med merge-commiten. Lokalt også
  `node web/tools/release-verify.mjs <commit>`.
- `connecthub` er spolt fram til merge-commiten. Lokalt: `git pull` på `connecthub`.

### Rettigheter workflowene bruker (bare `GITHUB_TOKEN`, ingen andre nøkler)

| Workflow | Rettighet | Hvorfor |
|---|---|---|
| ci.yml | `contents: read` | sjekke ut koden |
| release.yml | `pull-requests: write` | lage og oppdatere pull request `connecthub → main` |
| release.yml | `statuses: write` | commit-status `release-gate` |
| release.yml | `contents: write` | bare full automatikk: merge og fast-forward |
| release.yml | `checks: read`, `deployments: read` | lese CI-resultatene og Vercels deploystatus |
| release-verify.yml | `contents: write`, `deployments: read` | fast-forward av `connecthub`; lese deploystatus |

Workflowene godkjenner aldri pull requests og endrer ingen innstillinger. Standardrettighetene for `GITHUB_TOKEN` kan stå
på «Read repository contents»: hver workflow ber selv om rettighetene over.

### Kontrollert 2026-10-31 (bare lesing, ingen endringer i Vercel eller GitHub)

| Punkt | Resultat |
|---|---|
| Vercel-prosjekt | Bare `media-lab-react-vyef` er koblet til `m-l-development/MediaLabReact` (de to andre prosjektene i teamet hører til andre repoer). Rot `media-lab`, `vercel.json` styrer bygg (`npm run build`, `dist`, region arn1), ingen «Ignored Build Step». |
| Grener | Produksjon = `main` (76b93d9, `dpl_8mit13NFTQKxBrw5y15txG7QpJUr`, READY); Dev = `connecthub` (siste forhåndsvisning READY). Forhåndsvisninger bak Vercel-innlogging («Standard Protection»), produksjonsadressen offentlig. |
| GitHub-kobling | Vercel lager GitHub-deployments («Preview»/«Production», vercel[bot]) med status – det release-gate venter på. |
| Miljøvariabler | SMTP (`CONNECTHUB_SMTP_HOST/PORT/USER/PASSWORD`, `CONNECTHUB_MAIL_FROM_NAME`) finnes for Production (satt 2026-10-18, før produksjonsdeployen 2026-10-20) og Preview; koden leser nøyaktig disse navnene. Selve utsendingen er ikke prøvd (ingen ekte e-post). Variablene med prefikset `VITE_` i Production er ubrukte: begge byggene har `envPrefix: 'CONNECTHUB_NEVER_EXPOSED_'`, og produksjonens JavaScript inneholder ingen hemmelig nøkkel (bare supabase-js' prefikssjekk). Bør ryddes av eieren en gang (ikke nødvendig for release). |
| Beskyttelse `main` | påkrevd kontroll «checks» (GitHub Actions), gjelder alle. Om godkjenning av kodegjennomgang kreves, kan bare en administrator se. |

### Aktiveringsplan (anbefalt modell)

| Steg | Hvem | Hva | Kontroll |
|---|---|---|---|
| 0 | – | tørrkjøring | gjort (f252e4e) |
| 1 | eieren godkjenner, så ship-dev | push de lokale commitene (ny release-gate, release-verify.yml, dokumentasjon); starter CI og tørrkjøring | CI grønn; «TØRRKJØRING» for den nye commiten |
| 2 | eieren | Settings → Actions → General → Workflow permissions: **«Allow GitHub Actions to create and approve pull requests»** (nødvendig for å *lage* pull requesten; workflowen godkjenner aldri) | – |
| 3 | eieren | Settings → Branches → regelen for `main`: **«Require a pull request before merging»** med **«Require approvals» (1)**, **«Dismiss stale pull request approvals when new commits are pushed»**, **«Require approval of the most recent reviewable push»**, **«Do not allow bypassing the above settings»**; behold «checks», legg til **`e2e`**. Valgfritt: Settings → General → «Allow auto-merge» og bare «Allow merge commits» | en pull request uten godkjenning kan ikke merges |
| 4 | eieren godkjenner, så ship-dev | `RELEASE_PR: 'true'` | pull request med status `release-gate` = success |
| 5 | eieren | legg til **`release-gate`** som påkrevd kontroll på `main` (vises i lista først etter at den er rapportert én gang) | – |
| 6 | eieren | les pull requesten (commitlisten, risikotabellen under), godkjenn, «Create a merge commit» | Vercel «Production» success |
| 7 | automatisk | release-verify.yml: produksjonen kontrollert, `connecthub` spolt fram | annotasjon «PRODUKSJON VERIFISERT»; ved feil: tilbakerulling over |

Eieren valgte 2026-10-31 `AUTO_MERGE: 'true'`; påkrevd godkjenning på `main` (steg 3) håndheves fortsatt hvis den er slått på.

### Risikogjennomgang av releasen (2026-10-31, 49 commits 76b93d9..f252e4e, uten nye testkjøringer)

| Område | Funn | Risiko |
|---|---|---|
| Server, API, Supabase, migreringer, `vercel.json`, miljøvariabler | ingen endringer | ingen |
| `media-lab/public` | 12 nye forhåndsvisningsbilder for Mockups (bare tillegg) | lav |
| Lagrede data | ingen nye lagringsnøkler eller serverkall. Motion og Loop får bare valgfrie felt (gamle prosjekter åpnes som før) | lav; se «Data» under tilbakerulling |
| Tilbakemeldingsskjema | nye spørsmål; bare nøkler databasen tillater sendes som svar (`expected`, `steps`, `severity`, `improve`, `feature`, `importance`), resten går i tittel/beskrivelse; nivåene = databasens | lav |
| Felles kode | `shared/lib/zip.ts` omskrevet (samme bytes; Admin-mappenedlasting bruker `zipParts`), `AppShell.module.css` (editorene fyller vinduet), Hub-navigasjon («← Tilbake»), ny `shared/mask` | middels: berører flere verktøy; dekket av CI (checks + e2e grønn for f252e4e) |
| Verktøy | Motion Avansert, Photo Avansert/bildeserie/kategorier, Loop dra-og-slipp, maskeredigering i Isolate/Thumbnail/Photo | middels: stor mengde ny funksjonalitet; testet i CI, lokalt og i Dev |
| Ikke verifisert | e-postutsending i produksjon (ingen ekte e-post); logo-bufferen (336b389, allerede i produksjon) ikke kjørt på nytt; at Vercel deployer en merge-commit laget av github-actions[bot] | – |

## 4. Produksjon manuelt (som før)


1. Eieren tester i Dev og godkjenner en bestemt commit.
2. Pull request `connecthub → main` (lenken skrives av `release-check`), CI kjører på pull requesten.
3. Merge (vanlig merge-commit, som #13–#17). **Dette er godkjenningssteget; det gjøres aldri automatisk.**
4. Vercel publiserer `main` til produksjon automatisk.
5. `node web/tools/release-verify.mjs <commit>`: venter på produksjonsdeployen, sjekker `/app/version.json` og
   hovedadressene, og skriver tilbakerullingsmålet.
6. Ved feil: «Instant Rollback» i Vercel, deretter `git revert -m 1 <merge-commit>` via ny pull request.

Databasemigreringer, nye miljøvariabler for produksjon og endringer i Supabase-innstillinger er egne steg med egen
godkjenning før punkt 3.
