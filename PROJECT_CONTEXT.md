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
**Grønn, venter på godkjenning for merge:** PR #36 (6a1d642, TB-7D30CC scrolling i skjemaet under markering).
**Pågår (lokalt på `connecthub`, ikke pushet ennå ved skriving):**
- TB-1591A7: grunnoppsett-banneret i Loop flyttes ned på mobil (`loop-studio/Page.module.css`, `LoopStudio.tsx`).
- Forhåndsvisning i innboksen: skjemaet holdes utenfor omrisset, plassbudsjett mot 4000-grensen, ryddig miniatyr (etiketter bare når de får plass, rammen øverst med elementnavn), omtrentlig side for saker uten omriss i stedet for tom ramme (`LayoutPreview.tsx`, `layout.ts`, `app/Feedback.tsx`, `admin/Feedback.tsx`, `admin/texts.ts`).
- Tester: `e2e/feedback-verify.spec.ts` (ny), `e2e/feedback-preview.spec.ts` (utvidet).
**Gjenstår:**
- Ikke verifisert (trenger ekte ConnectHub; dev-DB utilgjengelig): TB-143BF7, TB-B4A133, TB-A43E52 (Loop-delen).
- Migreringen `item_shares` er ikke kjørt på dev (dev-DB utilgjengelig).

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
- Gren `connecthub`, siste commit `6a1d642` (før endringene over).
- Neste: commit + push endringene over til `connecthub`, vent på CI, rapporter status, be om godkjenning til merge.
