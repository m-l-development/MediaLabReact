# PROJECT_CONTEXT – MediaLab / ConnectHub

Les dette først i hver økt. Hold det kort; oppdater ved viktige endringer og før økten avsluttes. Ikke gjett: sjekk `git status` og relevante filer.

## Prosjektet
Media Lab = verktøy for menigheter (Loop Studio, Thumbnail Studio, Photo Design, Motion Design, Isolate, Mockups). ConnectHub = videreutviklingen med innlogging, menigheter, delte filer, admin og tilbakemeldinger. Brukeren skriver norsk.

## Struktur (hvor ting ligger)
- `web/` – ny React-app (React 19 + TS + Vite), servert på `/app/`. Gamle `.dc.html`-sider i `media-lab/` sender 307 til `/app/`.
  - `src/app/` skall: `AppShell`, `Feedback.tsx` (tilbakemeldingsknapp, skjema, markering `Picker`), `AccountMenu`.
  - `src/features/<verktøy>/` verktøyene; `src/features/admin/` admin (innboks for tilbakemeldinger: `Feedback.tsx`).
  - `src/services/` tjenester (eneste vei til backend); bare adaptere kjenner Supabase.
  - `src/shared/feedback/` tilbakemelding: `layout.ts` (trygt omriss av siden), `LayoutPreview.tsx` (miniatyr i admin), `context.ts` (`elementInfo`, teknisk kontekst), `LayoutPreview.mount.tsx` (bare for e2e).
- `media-lab/` – gammel app + server (`server/`, `api/`, `middleware.js`, `vercel.json`). Vercel bygger herfra.
- `supabase/migrations/` – additive migreringer. Tilbakemeldinger: `20261003100000_feedback.sql` (`submit_feedback`, grense `p_marked` ≤ 4000 byte).
- `docs/` – planer, runbooks, testlogg.

## Arkitektur og valg
- Grener: `connecthub` = utvikling (Preview → Supabase dev `uatpdmhnwwjgzlxaucsx`); `main` = produksjon (auto-deploy). Prod-DB `cmuienhheklcgtfmpvbe` krever godkjenning per steg.
- Utgivelse: push `connecthub` → CI (checks, e2e) → release-gate → bot-PR til `main` → **merge bare med brukerens godkjenning**. Etter merge: rebase på `origin/connecthub` før neste push.
- Tester: `cd web && npm run check` (typecheck, oxlint, vitest, build). E2E: `npx playwright test <spec>` (prosjekter `desktop`, `mobil`; dev-server 5181 uten backend – tilbakemeldingsknappen monteres via `LayoutPreview.mount.tsx`).
- Tilbakemeldingsmarkering: Alt+Shift+M; `marked` = {mode, rect %, px, viewport, scroll, element, layout}. Layout = rader `"k x y w h|etikett"` i promille, budsjett ≤ 3000 byte og alltid under 4000 totalt.

## Status
**Ferdig (i produksjon via PR #35, b43d1de):** miniatyr av siden (TB-53E3CF), global markering, delte maler i Photo Design.
**I produksjon via PR #36 (merge de4eeba, 2026-11-08; Release verify grønn, version.json = de4eeba):**
- TB-7D30CC: skjemaet kan scrolles under markering.
- TB-1591A7: grunnoppsett-banneret i Loop flyttes ned på mobil (`loop-studio/Page.module.css`, `LoopStudio.tsx`).
- Forhåndsvisning i innboksen: skjemaet holdes utenfor omrisset, plassbudsjett mot 4000-grensen, ryddig miniatyr (etiketter bare når de får plass, rammen øverst med elementnavn), omtrentlig side for saker uten omriss i stedet for tom ramme (`LayoutPreview.tsx`, `layout.ts`, `app/Feedback.tsx`, `admin/Feedback.tsx`, `admin/texts.ts`).
- Tester: `e2e/feedback-verify.spec.ts` (ny), `e2e/feedback-preview.spec.ts` (utvidet).
**Forhåndsvisning med den ekte siden** (merget til `main` 2026-11-09 sammen med lastefarten)
- Innboksen viser den ekte appen i en ramme i skrivebeskyttet modus (`web/src/shared/feedback/LivePreview.tsx`, `web/src/app/preview.ts`, `web/src/app/preview-services.ts`): ingen backend, nøytrale plassholdere, localStorage i minnet, egne midlertidige IndexedDB-baser, bare GET av egne filer, ingen klikk.
- Bygges fra sakens felt (app, side, visning, rolle, vindu, scroll, markering) + `marked.ui` (visning uten adresse, f.eks. «edit»; register i `shared/feedback/views.ts`). Eldre saker: visningen velges etter det markerte elementet. Omrisset (`layout`) er bare reserve, maks 1500 byte.
- Lastefart: én lasting per sak (også «Forstørr»: samme ramme), venting på endringer i siden (MutationObserver, ingen faste pauser), nye saker har `ui: ''` for startvisningen (ingen prøving), eldre saker prøver start/redigering parallelt, Loop åpnes uten demo, ingen oppdaterings-/installasjonskort i rammen. Klar når `main` finnes og ingen `[data-spinner]` vises. Målt (utviklingsserver): ca. 30–60 % raskere.
**Isolate Subject: «Fyll med omgivelser» med AI, «Gjør uskarp» separat** (2026-11-11)
- Før: push-pull-pyramide (gjennomsnitt + støy) → uskarp flekk. Nå: LaMa (`Carve/LaMa-ONNX`, Apache 2.0, 208 MB fp32, 512×512) via transformers.js `AutoModel` i egen tråd (`engine/fill.worker.ts`, `engine/fill.ts`, `engine/lama.ts`): utsnitt rundt området, innsetting bare i området, fargejustering mot kanten, 2 px myk overgang. WebGPU først, ellers WASM (ca. 30 s uten GPU). Reserve uten modell: innholdsbevisst utfylling (PatchMatch, `engine/inpaint.ts`), med melding.
- «Gjør uskarp» er eget valg (`engine/blur.ts`) med styrke. Resultatet vises før det brukes (Bruk/Avbryt/Lag på nytt, «Utvid kanten»). Gjør om (redo) lagt til. Originalen endres aldri (nytt lerret; historikken har forrige).
- Tester: `engine.test.ts` (striper fortsetter, LaMa-innsetting, uskarp), `e2e/isolate-fill.spec.ts` (AI stengt ute → reserve; uskarp; Angre/Gjør om/Avbryt). Ekte AI kontrollert manuelt på brukerens bilde («Menigheten – Guds hus»), ikke i CI (nedlasting).
**Photo Design: fargekurve-gradienten redigeres uten å lages på nytt** (2026-11-11)
- Før: hver glider sendte `mode: 'curves'` → å bevege en glider laget en gradient; «Fargestyrke» var metning (ingen virkning på gråtoner); ingen av/på eller fjern (bare Angre).
- Nå (`shared/fill/CurveGradient.tsx`, `fill.ts`): opprettes bare med «Lag gradient» eller et forhåndsvalg; kontrollene sender bare feltet som endres. Nye valgfrie felt i `Fill`: `cint` (fargestyrke 0–200 %, også gråtoner) og `off` (av/på, `fillOn()`; avslått tegnes ikke i visning eller eksport, ◎ skjules). Plassering med glidere (i tillegg til ◎), tall for alle verdier, «Tilbakestill» (retning/plassering/styrke/metning), «Nullstill kurvene», «Fjern gradient». Metning beholdt som egen glider. Egne Angre-steg per handling/glider (`putFill(p, key)`).
- Tester: `curve.test.ts` (styrke, av/på), `e2e/photo-gradient.spec.ts` (PC: alt inkl. lagring/omlasting og Angre/Gjør om; mobil: Rediger-skuffen).
**Gjenstår:**
- TB-143BF7, TB-B4A133, TB-A43E52 (Loop): verifisert mot connecthub-dev 2026-11-08 (`run-dev.mjs --only=par`, 7/7 grønne; ny test i `loop-sharing-dev.spec.ts`).
- Migreringen `item_shares` er ikke kjørt på dev: API og data virker, men Supabase avviser CLI-rollene (PAM authentication failed for cli_login_postgres / supabase_read_only_user), så DDL er blokkert. Produksjon har den allerede (20261108100000 registrert, tabellen finnes).

## Teste Loop-sakene (når dev-DB svarer)
- Krav: `connecthub-dev` (`uatpdmhnwwjgzlxaucsx`) tilgjengelig, Supabase-CLI innlogget, `web/.env.local` mot dev. Aldri prod.
- Kjør: `cd web && node e2e-dev/run-dev.mjs --only=par` (to syntetiske kontoer i «CH-test Menighet A»: Admin A og Bruker B; oppsettet kopieres og legges tilbake).
- Dekket av eksisterende spesifikasjoner: felles grunnoppsett A→B og oppdatering (`loop-sharing-dev.spec.ts`), lasting/lagring av serie fra felles grunnoppsett (`loop-base-load-dev.spec.ts`).
- Dekket av testen «personlig grunnoppsett, Del med menigheten og egne bilder» i `loop-sharing-dev.spec.ts`:
  - TB-143BF7: A lagrer felles grunnoppsett med eget bilde (`img-`) → bildet lastes opp til menighetens filer (`ch:`-referanse i `loopstudio:bases`) → B ser bildet.
  - TB-B4A133: «felles for menigheten» er standardvalget når brukeren har menighet; personlig grunnoppsett ses bare av eieren.
  - TB-A43E52 (Loop): «Del med menigheten» på et personlig grunnoppsett → kopi med ny ID i felles liste, det personlige beholdes, bilder synlige for B.
- Kode: `features/loop-studio/bases.ts`, `controller.ts` (~l. 907–931), `LoopBases.tsx`.

## Teststatus / kjente feil
- Lokalt (2026-11-08): `npm run check` grønn (556 tester); `feedback-preview.spec.ts` og `feedback-verify.spec.ts` grønne på desktop og mobil.
- Årsak til tomme rammer i innboksen: saker sendt fra den gamle widgeten (`media-lab/src/shared/feedback-widget.js`) eller før omrisset fantes har ikke `layout`; disse får nå en omtrentlig side.

## Ikke endre uten grunn / faste regler
- Ingen deploy/merge til `main` uten separat godkjenning. Ingen force-push, ikke omgå release-gate. `gh`: `C:\Program Files\GitHub CLI\gh.exe`.
- Ikke endre produksjonsdata, Supabase-innstillinger, miljøvariabler, Vercel-innstillinger/billing; ikke slett deployments eller backuper (`F:\ML-backup\…`).
- Databaser: bare additive migreringer; stopp og spør før noe eksisterende endres eller slettes.
- Aldri commit: `web/e2e-dev/mockups-cloud-logo-dev.spec.ts`, `web/e2e/feature-gaps-2.spec.ts`, `web/e2e/site-pages.spec.ts`.
- Ikke endre desktop-versjonen uten uttrykkelig ønske. Avansert modus er additiv.
- Miniatyren er alltid et forenklet omriss, aldri skjermbilde eller brukerinnhold.

## Siste commit / neste steg
- `main` og `connecthub` = de4eeba (merge av PR #36), pluss denne statuscommiten på `connecthub`.
- Neste: kjør `item_shares` på dev når Supabase godtar CLI-innlogging igjen (`npx supabase@latest db push --project-ref uatpdmhnwwjgzlxaucsx --dry-run`, så uten --dry-run). Ikke tilbakestill databasepassordet uten godkjenning.
