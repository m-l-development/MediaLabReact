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

### Modell: automatisk forberedelse, menneskelig godkjenning før merge

`release.yml` står i modus `RELEASE_PR: 'true'`, `AUTO_MERGE: 'false'` (eierens krav 2026-11-01): alt er automatisk unntatt
godkjenning og merge, som et menneske gjør i pull requesten. Boten merger aldri og godkjenner aldri.

Første release (PR #18, 402f756 → merge-commit bac9268, 2026-10-31) gikk med `AUTO_MERGE: 'true'` og ble merget av
github-actions[bot] uten godkjenning, fordi `main` ikke krever godkjenning. Det er slått av igjen.

### Rekkefølge

1. **Push til `connecthub`** (ship-dev) → Vercel bygger Dev; CI (`ci.yml`) kjører jobbene `checks` og `e2e`.
2. **release.yml** (én kjøring om gangen, gruppen `release`, avbrytes aldri):
   1. avslutter rolig hvis commiten ikke lenger er toppen av `connecthub` (status `release-gate` = error «erstattet»);
   2. stopper hvis `main` ikke er med i commiten eller det finnes nye databasemigreringer;
   3. setter `release-gate` = **pending**;
   4. venter på **nyeste** CI-kjøring av `ci.yml` ved push til `connecthub` i dette repoet for **nøyaktig** commiten, og
      krever at jobbene `checks` og `e2e` i det **nyeste forsøket** er success (`web/tools/release-decide.mjs`, testet);
   5. venter på Vercels **nyeste** Dev-deploy (GitHub-deployment «Preview») av commiten = success;
   6. sjekker igjen at commiten er toppen, lager eller oppdaterer pull request `connecthub → main`, og krever at pull
      requesten er åpen med base `main` og head `connecthub` i dette repoet og viser **nøyaktig** commiten (viser den en
      nyere commit, er kjøringen foreldet og avslutter);
   7. sjekker en siste gang at commiten er toppen, setter **først da** `release-gate` = **success**, og leser statusen
      tilbake: er den ikke lenger gjeldende success (samtidig oppdatering), feiler jobben.
   8. Feiler eller stoppes jobben (også tidsgrensen), gjør et eget steg en hengende `pending` om til `error`; en ferdig
      status røres ikke.

   En pull request er ikke en godkjenning: `release-gate` = success betyr bare at kontrollene før merge er bestått.
3. **Et menneske** godkjenner pull requesten og merger med «Create a merge commit».
4. **Vercel** bygger produksjon fra `main`.
5. **release-verify.yml** (utløses av Vercels `deployment_status` for «Production» = success; gruppen `release-verify`):
   1. gjør ingenting hvis commiten ikke er toppen av `main`;
   2. krever at Vercels nyeste produksjonsdeploy av commiten er success, at `/app/version.json` (hentet uten
      mellomlager) begynner med commitens første 10 tegn og at prefikset er **entydig** i repoet, at 7 hovedadresser
      svarer, og at den **aktive** produksjonen er denne deployen: nyeste produksjonsdeploy (alle commits) er commiten og
      fortsatt success (ikke `inactive`, ikke en nyere deploy av en annen commit). Uklart eller motstridende ⇒ feil;
   3. leser toppen av `main` og `connecthub` på nytt og spoler `connecthub` fram til merge-commiten **bare** hvis den
      fortsatt er toppen av `main` og GitHubs sammenligning viser at `connecthub` ligger bak (fast-forward,
      `force: false`). Ellers en advarsel og ingen endring.

   Oppdateringen er ikke en atomisk «sammenlign og bytt» mot forventet gammel verdi (GitHubs REST-API har ingen slik
   betingelse). Det som er atomisk, er GitHubs egen sjekk ved oppdateringen: `force: false` avviser alt som ikke er
   fast-forward fra grenens verdi *i det øyeblikket*, så en commit noen har pushet til `connecthub` i mellomtiden kan
   aldri forsvinne. Går `main` videre mellom kontrollen og oppdateringen, spoles `connecthub` til en commit som fortsatt
   er forfar til `main` – trygt, og neste produksjonsdeploy spoler videre.

### Obligatoriske kontroller

| Kontroll | Kilde | Kontrollert av release-flyten | Påkrevd av beskyttelsen på `main` |
|---|---|---|---|
| `checks` | ci.yml, jobb `checks` (GitHub Actions) | ja (nyeste kjøring/forsøk) | **ja** (i dag) |
| `e2e` | ci.yml, jobb `e2e` (GitHub Actions) | ja (nyeste kjøring/forsøk) | nei – må legges til av administrator |
| `release-gate` | commit-status fra release.yml (github-actions[bot]) | – (settes av flyten) | nei – må legges til av administrator |
| Godkjenning | menneske i pull requesten | – | nei – må slås på av administrator |

`release-gate` = success betyr «alle kontroller før merge er bestått for akkurat denne commiten». Den settes til slutt i
kjøringen, etter at pull requesten er laget, og bare hvis commiten fortsatt er toppen. Kommer en ny push, får den nye
commiten sin egen `release-gate` (pending → success/failure), og pull requesten viser den – en grønn status på en eldre
commit kan ikke brukes til å merge en nyere. Pull requester laget av boten starter ikke CI på nytt; `checks` og `e2e`
fra push-kjøringen på samme commit er det GitHub håndhever.

### Feil, kansellering og samtidige pushes

- **CI feiler:** `release-gate` = failure, jobben feiler med lenke til CI-kjøringen. Rett feilen og push på nytt.
- **CI avbrutt** (en nyere push kansellerte kjøringen, `ci.yml` har `cancel-in-progress`): er commiten erstattet,
  avslutter release-kjøringen rolig (status error «erstattet»); ellers failure.
- **Ny kjøring av en CI-jobb:** bare det nyeste forsøket teller; en eldre vellykket kjøring kan ikke skjule en nyere feil.
- **Samtidige pushes:** release-kjøringene står i kø; en ventende kjøring erstattes av den nyeste. Den som kjører,
  sjekker toppen før start, etter kontrollene og rett før grønn status.
- **Tidsavbrudd** (CI 75 min, Vercel 30 min): failure. **Avbrutt jobb** (Actions-tidsgrense 120 min): statusen blir
  stående pending og blokkerer merge – kjør «Release» på nytt (Actions → Release → «Run workflow» på `connecthub`).
- **Vercel-deployen av produksjon feiler:** Vercel beholder forrige produksjon. Ingen `deployment_status` success ⇒
  release-verify kjører ikke, `connecthub` spoles ikke fram. Rett feilen på `connecthub` etter `git merge origin/main`.
- **Produksjonskontrollen feiler** (version.json eller adresser): release-verify feiler og skriver
  tilbakerullingsmålet; `connecthub` spoles ikke fram; ingen automatisk tilbakerulling.

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
- `/app/version.json` på produksjonsadressen begynner med merge-commitens første 10 tegn. Lokalt også
  `node web/tools/release-gate.mjs <merge-commit> --after-deploy` (leser bare, og spoler bare fram når det er trygt).
- `connecthub` er spolt fram til merge-commiten. Lokalt: `git pull` på `connecthub`.

### Rettigheter workflowene bruker (bare `GITHUB_TOKEN`, ingen andre nøkler)

| Workflow | Rettighet | Hvorfor |
|---|---|---|
| ci.yml | `contents: read` | sjekke ut koden |
| release.yml | `pull-requests: write` | lage og oppdatere pull request `connecthub → main` |
| release.yml | `statuses: write` | commit-status `release-gate` |
| release.yml | `actions: read` | lese CI-kjøringene og jobbene (nyeste forsøk) |
| release.yml | `checks: read`, `deployments: read` | lese Vercels deploystatus |
| release.yml | `contents: write` | bare `AUTO_MERGE` (ikke i bruk): merge og fast-forward |
| release-verify.yml | `contents: write`, `deployments: read` | fast-forward av `connecthub`; lese deploystatus |

Workflowene godkjenner aldri pull requests og endrer ingen innstillinger.

### Moduser i release.yml

| `RELEASE_PR` | `AUTO_MERGE` | Gjør |
|---|---|---|
| `'false'` | `'false'` | tørrkjøring – bare kontrollene, annotasjon «TØRRKJØRING …» |
| `'true'` | `'false'` | **i bruk:** + pull request og status `release-gate`; et menneske godkjenner og merger |
| – | `'true'` | merge av boten gjennom beskyttelsen (krever beskyttelsen godkjenning, venter pull requesten); ikke i bruk |

### Manuelle handlinger som kreves (administrator av repoet)

| Innstilling | Hvor | Status |
|---|---|---|
| «Allow GitHub Actions to create and approve pull requests» | Settings → Actions → General → Workflow permissions | **på** (bekreftet: PR #18 ble laget av boten) |
| «Require a pull request before merging» + «Require approvals» (1) | Settings → Branches → regel for `main` | **av** (bekreftet: PR #18 ble merget uten godkjenning) – må slås på for påkrevd menneskelig godkjenning |
| «Dismiss stale pull request approvals when new commits are pushed» | samme sted | må slås på (en godkjenning gjelder commitene som ble vist) |
| «Require status checks to pass»: `checks` (finnes), `e2e`, `release-gate` | samme sted | `e2e` og `release-gate` må legges til (begge har rapportert, så de kan velges) |
| «Do not allow bypassing the above settings» | samme sted | behold på (kontrollen gjelder i dag for alle, også administratorer) |

Ingen av disse kan leses eller endres med `GITHUB_TOKEN` eller fra denne maskinen; de er kontrollert gjennom faktiske
kjøringer der det står «bekreftet».

### Kontrollert 2026-10-31 (bare lesing, ingen endringer i Vercel eller GitHub)

| Punkt | Resultat |
|---|---|
| Vercel-prosjekt | Bare `media-lab-react-vyef` er koblet til `m-l-development/MediaLabReact` (de to andre prosjektene i teamet hører til andre repoer). Rot `media-lab`, `vercel.json` styrer bygg (`npm run build`, `dist`, region arn1), ingen «Ignored Build Step». |
| Grener | Produksjon = `main` (76b93d9, `dpl_8mit13NFTQKxBrw5y15txG7QpJUr`, READY); Dev = `connecthub` (siste forhåndsvisning READY). Forhåndsvisninger bak Vercel-innlogging («Standard Protection»), produksjonsadressen offentlig. |
| GitHub-kobling | Vercel lager GitHub-deployments («Preview»/«Production», vercel[bot]) med status – det release-gate venter på. |
| Miljøvariabler | SMTP (`CONNECTHUB_SMTP_HOST/PORT/USER/PASSWORD`, `CONNECTHUB_MAIL_FROM_NAME`) finnes for Production (satt 2026-10-18, før produksjonsdeployen 2026-10-20) og Preview; koden leser nøyaktig disse navnene. Selve utsendingen er ikke prøvd (ingen ekte e-post). Variablene med prefikset `VITE_` i Production er ubrukte: begge byggene har `envPrefix: 'CONNECTHUB_NEVER_EXPOSED_'`, og produksjonens JavaScript inneholder ingen hemmelig nøkkel (bare supabase-js' prefikssjekk). Bør ryddes av eieren en gang (ikke nødvendig for release). |
| Beskyttelse `main` | påkrevd kontroll «checks» (GitHub Actions), gjelder alle. Om godkjenning av kodegjennomgang kreves, kan bare en administrator se. |

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
