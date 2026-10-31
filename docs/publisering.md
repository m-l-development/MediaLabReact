# Publisering: connecthub → Dev → (godkjenning) → main → produksjon

Oppsettet som faktisk finnes (kontrollert 2026-10-31):

| Del | Hvordan |
|---|---|
| Git | `origin` = github.com/m-l-development/MediaLabReact (offentlig). `connecthub` = utvikling, `main` = produksjon. |
| CI | `.github/workflows/ci.yml`: typekontroll, lint, enhetstester og bygg ved push til `main`/`connecthub` og ved pull request mot `main`. Ingen hemmeligheter, ingen deploy. |
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

## 3. Automatisk release connecthub → main (`.github/workflows/release.yml`)

Kjører ved hver push til `connecthub` (bare `GITHUB_TOKEN`; endrer aldri innstillinger eller beskyttelse):

1. Venter på CI for commiten: `checks` (typekontroll, lint, enhetstester, bygg) **og** `e2e` (Playwright, én ny kjøring
   av en test som feiler) må være grønne.
2. Venter på Vercels Dev-deploy av samme commit (GitHub-deployment «Preview» = success).
3. Krever at commiten fortsatt er toppen av `connecthub`, at `main` er med, og at det ikke er nye databasemigreringer
   (da stopper den – migreringer har egen godkjenning og kjøreplan).
4. Med `AUTO_MERGE: 'true'`: pull request `connecthub → main` og merge (vanlig merge-commit) **gjennom** beskyttelsen på
   `main` (påkrevd kontroll «checks»). Vercel publiserer `main` til produksjon; jobben venter på
   GitHub-deployment «Production» = success, sjekker `/app/version.json` og hovedadressene.
5. Ved feil stopper den (jobben feiler) – ingenting omgås.
6. Etter verifisert produksjon spoles `connecthub` fram til merge-commiten (bare fast-forward), så neste ship-dev har
   `main` med. En kjøring avbrytes aldri underveis; en nyere push venter i køen.

`AUTO_MERGE` står til `'false'` (tørrkjøring: alle kontroller, ingen merge) til eieren har godkjent første automatiske
release.

### Regler per gren

| Gren | Beskyttelse (GitHub) | Hvordan endringer kommer inn |
|---|---|---|
| `connecthub` | ingen | `node web/tools/ship-dev.mjs` lokalt (kvalitetssperre før push); Vercel deployer Dev |
| `main` | påkrevd kontroll «checks» for alle | bare via pull request fra `connecthub` (release.yml eller manuelt) |

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

- GitHub → Actions → «Release»: annotasjonen «FERDIG: produksjonen kjører <commit> …» (eller «STOPP: …»).
- `https://api.github.com/repos/m-l-development/MediaLabReact/deployments?environment=Production&per_page=1` → nyeste
  produksjonsdeploy (vercel[bot]) og `statuses_url` med `success`.
- `/app/version.json` på produksjonsadressen begynner med merge-commiten.
- Til slutt spoles `connecthub` fram til merge-commiten (bare fast-forward). Lokalt: `git pull` på `connecthub`.

### Rettigheter workflowene bruker (bare `GITHUB_TOKEN`, ingen andre nøkler)

| Workflow | Rettighet | Hvorfor |
|---|---|---|
| ci.yml | `contents: read` | sjekke ut koden |
| release.yml | `contents: write` | merge av pull requesten; fast-forward av `connecthub` |
| release.yml | `pull-requests: write` | lage pull request `connecthub → main` |
| release.yml | `checks: read`, `deployments: read` | lese CI-resultatene og Vercels deploystatus |

Workflowen godkjenner aldri pull requests og endrer ingen innstillinger. Standardrettighetene for `GITHUB_TOKEN` i
repoet kan stå på «Read repository contents»: release.yml ber selv om rettighetene over.

### Kontrollert 2026-10-31 (bare lesing, ingen endringer i Vercel eller GitHub)

| Punkt | Resultat |
|---|---|
| Vercel-prosjekt | Bare `media-lab-react-vyef` er koblet til `m-l-development/MediaLabReact` (de to andre prosjektene i teamet hører til andre repoer). Rot `media-lab`, `vercel.json` styrer bygg (`npm run build`, `dist`, region arn1), ingen «Ignored Build Step». |
| Grener | Produksjon = `main` (76b93d9, `dpl_8mit13NFTQKxBrw5y15txG7QpJUr`, READY); Dev = `connecthub` (siste forhåndsvisning READY). Forhåndsvisninger bak Vercel-innlogging («Standard Protection»), produksjonsadressen offentlig. |
| GitHub-kobling | Vercel lager GitHub-deployments («Preview»/«Production», vercel[bot]) med status – det release-gate venter på. |
| Miljøvariabler | SMTP (`CONNECTHUB_SMTP_HOST/PORT/USER/PASSWORD`, `CONNECTHUB_MAIL_FROM_NAME`) finnes for Production (satt 2026-10-18, før produksjonsdeployen 2026-10-20) og Preview; koden leser nøyaktig disse navnene. Selve utsendingen er ikke prøvd (ingen ekte e-post). Variablene med prefikset `VITE_` i Production er ubrukte: begge byggene har `envPrefix: 'CONNECTHUB_NEVER_EXPOSED_'`, og produksjonens JavaScript inneholder ingen hemmelig nøkkel (bare supabase-js' prefikssjekk). Bør ryddes av eieren en gang (ikke nødvendig for release). |
| Beskyttelse `main` | påkrevd kontroll «checks» (GitHub Actions), gjelder alle. Om godkjenning av kodegjennomgang kreves, kan bare en administrator se. |

### Aktivering av automatisk merge til main (krever eieren av repoet)

1. GitHub → Settings → Actions → General → Workflow permissions: kryss av **«Allow GitHub Actions to create and approve
   pull requests»** → Save. (Uten dette stopper release.yml med «kunne ikke lage pull request (403)».)
2. GitHub → Settings → Branches → regelen for `main`: kontroller at **«Require approvals»** er av (eller 0) og at
   «Restrict who can push» ikke stenger ute GitHub Actions. En pull request laget av `GITHUB_TOKEN` kan ikke godkjennes
   av samme bruker. «Require status checks» med «checks» skal stå; legg gjerne til **`e2e`** (strengere, valgfritt).
3. Sett `AUTO_MERGE: 'true'` i `.github/workflows/release.yml` (commit på `connecthub` via ship-dev). Neste push som
   består alt, slipper hele connecthub til produksjon.

### Hva skjer ved første aktivering

Commiten som setter `AUTO_MERGE: 'true'` pushes med ship-dev. CI (checks + e2e) og Dev-deploy kjører for den; består
alt, lages pull request `connecthub → main` med **alle** commits siden 76b93d9 (49 per 2026-10-31 + aktiveringscommiten),
den merges, Vercel bygger produksjon, og jobben kontrollerer produksjonen og spoler `connecthub` fram. Fra da av går hver
push som består, rett til produksjon.

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

Merge-commiten lages av github-actions[bot]. Repoet er offentlig, så Vercel (Hobby) deployer den; første automatiske
release skal likevel følges (release.yml venter på «Production» og version.json og feiler ellers).

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
