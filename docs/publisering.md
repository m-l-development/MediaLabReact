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

## 3. Produksjon – krever uttrykkelig godkjenning

1. Eieren tester i Dev og godkjenner en bestemt commit.
2. Pull request `connecthub → main` (lenken skrives av `release-check`), CI kjører på pull requesten.
3. Merge (vanlig merge-commit, som #13–#17). **Dette er godkjenningssteget; det gjøres aldri automatisk.**
4. Vercel publiserer `main` til produksjon automatisk.
5. `node web/tools/release-verify.mjs <commit>`: venter på produksjonsdeployen, sjekker `/app/version.json` og
   hovedadressene, og skriver tilbakerullingsmålet.
6. Ved feil: «Instant Rollback» i Vercel, deretter `git revert -m 1 <merge-commit>` via ny pull request.

Databasemigreringer, nye miljøvariabler for produksjon og endringer i Supabase-innstillinger er egne steg med egen
godkjenning før punkt 3.
