# Vercel Deployment Storage – kartlegging og forslag (2026-10-17)

Status: **bare undersøkt**. Ingenting er slettet eller endret i Vercel. Alle tall er hentet med lesende kall (`vercel api` GET, `vercel inspect`, `vercel project ls`) mot teamet `media-lab3` (Hobby).

## Hvordan Vercel teller (kilder nederst)

- Deployment Storage = byggeresultat og statiske filer for hver **beholdt** deployment. Funksjoner telles separat (Functions Storage).
- Måles som høyeste mengde per prosjekt **per dag**; dashbordet oppdateres omtrent daglig. En sletting synes derfor tidligst neste døgn.
- Hobby: 10 GB inkludert. **Over grensen slettes ubeskyttede deployments umiddelbart, og nye deployments kan bli blokkert** til plass er frigjort.
- Hobby-standard: 30 dagers oppbevaring for alle typer. Beskyttet uansett alder: gjeldende produksjon, 3 siste produksjon (Ready), 3 siste i prosjektet, deployments med produksjons- eller egendefinert alias, og siste preview for en aktiv gren.
- Slettede deployments kan gjenopprettes i 30 dager (Settings → Security → Recently Deleted). Vercel sier ikke uttrykkelig om de teller med i lagringen i den perioden. Et forum-tilfelle (Hobby) viste at tallet nesten ikke falt etter sletting av 2/3 av deployments, uten offisiell forklaring. **Gevinsten av sletting må derfor måles i Usage dagen etter, ikke antas.**
- Instant Rollback på Hobby: bare til **den umiddelbart forrige** produksjons-deploymenten.

## Hva som bruker plassen

| Prosjekt | Repo | Deployments (Ready / Error / Canceled) | Domene | Merknad |
|---|---|---|---|---|
| `media-lab-react-vyef` | `m-l-development/MediaLabReact` (109) og tidligere `zoefredrikstad-maker/MediaLabReact` (54) | 126 / 37 / 0 | `media-lab-react-vyef.vercel.app` (produksjon) | **Produksjonen.** Rotmappe `media-lab`, output `dist` |
| `lab-media` | `zoefredrikstad-maker/LabMedia` | 48 / 26 / 0 | `lab-media-theta.vercel.app` | eldre prosjekt, siste deploy for 19 dager siden |
| `medialab-media-lab` | `zoefredrikstad-maker/MediaLab` | 22 / 0 / 1 | `medialab-media-lab-seven.vercel.app` | eldre prosjekt, output «.» (hele repoet), siste deploy for 19 dager siden |

Størrelse per deployment (Vercel oppgir ikke statisk størrelse via API; anslått fra bygget): `media-lab-react-vyef` ≈ 58–60 MB per vellykket deployment (lokalt `dist` 60 MB: `vendor` 32 MB – mest `transformers` WASM 20,6 MB – bilder 22 MB, app og fonter 5 MB; `main` har samme `vendor`). Funksjonene er små (`api/ch` 397 KB, middleware 10 KB). 126 × ~58 MB ≈ **7,3 GB**, som forklarer det meste av 7,98 GB. De to eldre prosjektene utgjør resten. ERROR/CANCELED har normalt ingen lagret output.

Ingen deployment er eldre enn 23 dager, så 30-dagersregelen har ennå ikke slettet noe – mye forsvinner av seg selv de neste to ukene (se tabellen).

## Det som må beholdes

| Deployment | Prosjekt | Hvorfor |
|---|---|---|
| `dpl_8PvjVcp3h2VoKrBPHKXHnx81KEHP` (main `2a1484b`, 3. okt.) | media-lab-react-vyef | **Gjeldende produksjon.** Etter lansering er dette tilbakeføringsmålet (Hobby kan bare rulle tilbake til forrige) |
| `dpl_4yzeiTLVctSz3Y27CeQ7npNDPkYX` (main `e6947a8`), `dpl_6LvHL2E1dp7rdt9mcZA7JCpKdrvH` (main `c7163dd`) | media-lab-react-vyef | blant 3 siste produksjon (beskyttet) |
| `dpl_5RFm9cCAK4KvWAGmnRVUsqpVvMfS` (`7798aa5`) | media-lab-react-vyef | **Preview vi tester** (`feature/onepage-rebuild`, siste) – `media-lab-react-vyef-hb425ecr1-media-lab3.vercel.app` |
| `dpl_3dqV5XxCy53GFv2J2zkobLJZtTQE` (`e3e913f`), `dpl_8ULFWQETCQp6YEdP5y5MbYH7AJzn` (`ade515b`) | media-lab-react-vyef | 3 siste i prosjektet |
| `dpl_B5BEC3ddcAZCGfYQdQMu2ebiu5HL` (connecthub), `dpl_59aGooZshGMsvCuhJZLeNiE7JMWn` (hotfix/api-ml) | media-lab-react-vyef | siste preview for grenen (beskyttet mens grenen er aktiv) |
| gjeldende produksjon + 2–3 siste i `lab-media` og `medialab-media-lab` | de eldre prosjektene | beskyttet; avklar om prosjektene fortsatt brukes |

## Kandidater for opprydding (ikke slettet)

Full liste med deployment-id, commit og alder: [vercel-kandidater.txt](vercel-kandidater.txt). Gruppert:

| Nr. | Prosjekt / gren / repo | Antall | Alder | Utløper uansett om | Konsekvens ved sletting | Vurdering |
|---|---|---|---|---|---|---|
| 1 | media-lab-react-vyef / preview / `connecthub` (begge repoer) | 71 Ready | 14–17 d | 13–16 d | gamle preview-adresser for `connecthub` slutter å virke; den nyeste beholdes | **trygg** – ≈ 4 GB |
| 2 | media-lab-react-vyef / produksjon / main, eldre enn de 3 siste (20 fra `zoefredrikstad-maker`, 3 fra `m-l-development`) | 23 Ready | 15–18 d | 12–15 d | kan ikke lenger åpnes; Hobby kan uansett ikke rulle tilbake til dem | **trygg** – ≈ 1,3 GB |
| 3 | media-lab-react-vyef / preview / `feature/onepage-rebuild`, eldre enn de 3 siste | 24 Ready | 0–6 d | 24–30 d | eldre preview-versjoner av grenen kan ikke sammenlignes | trygg for lanseringen – ≈ 1,4 GB |
| 4 | media-lab-react-vyef / ERROR (feature-grenen) | 37 | 5–7 d | 23–25 d | byggeloggene forsvinner | gir trolig ~0 GB |
| 5 | lab-media / main + 2 `claude/*`-grener | 43 Ready + 25 Error | 19–23 d | 7–11 d | eldre versjoner av LabMedia forsvinner | **avklar først** om prosjektet brukes |
| 6 | medialab-media-lab / main | 19 Ready + 1 Canceled | 19 d | 11 d | eldre versjoner av MediaLab forsvinner | **avklar først** om prosjektet brukes |

Anslått gevinst for gruppe 1+2: ≈ 5 GB (usikkert til Usage er sjekket dagen etter). Ingen av gruppene berører produksjonen, tilbakeføringen eller previewen vi tester.

## Anbefaling

1. **Ingen sletting er nødvendig for lanseringen** så lenge vi holder oss under 10 GB: ~2 GB rom ≈ 30–35 nye bygg av hovedprosjektet. Hvert push til grenen lager ett.
2. For sikkerhetsmargin før merge: slett gruppe 1 og 2 (etter din godkjenning), og kontroller **Usage → Deployment Storage** dagen etter.
3. Avklar om `lab-media` og `medialab-media-lab` fortsatt brukes. Hvis ikke: la dem utløpe (7–11 dager) eller slett gruppe 5–6. Selve prosjektene trenger ikke slettes.
4. Mindre forbruk fremover (forslag, ikke gjort):
   - **Færre preview-bygg:** `git.deploymentEnabled` i `vercel.json` kan slå av automatiske bygg for andre grener enn `main` og `feature/onepage-rebuild`. Alternativt «Ignored Build Step» (`ignoreCommand`) som hopper over bygg når bare `docs/` eller testfiler er endret. Påvirker bare nye bygg.
   - **Mindre bygg:** bildene i `media-lab/public/images` (22 MB, bl.a. `tirsdag.png` 6,4 MB) kan komprimeres uten å endre filnavn. `transformers`-WASM (20,6 MB) er bevisst egenvertet (PLT-14, låst med SHA-384) og bør bli.
   - **Kortere oppbevaring av preview** (prosjektinnstilling, f.eks. 7–14 dager) – endrer prosjektoppsettet og krever din godkjenning.

## Kilder

- [Deployment Storage](https://vercel.com/docs/deployment-storage) · [Optimize Deployment Storage](https://vercel.com/docs/deployment-storage/optimize) · [Deployment Retention](https://vercel.com/docs/deployment-retention) · [Instant Rollback](https://vercel.com/docs/instant-rollback)
- [Hobby projects now retain fewer deployments](https://vercel.com/changelog/hobby-projects-now-retain-fewer-deployments-to-free-up-storage) · [Deployment Storage keeps your deployments rollback-ready](https://vercel.com/changelog/deployment-storage-keeps-your-deployments-rollback-ready)
- Forum: [Hobby – Deployment Storage stuck at 17 GB after deleting 2/3 of deployments](https://community.vercel.com/t/hobby-deployment-storage-stuck-at-17-gb-after-deleting-2-3-of-the-projects-deployments/49569)
