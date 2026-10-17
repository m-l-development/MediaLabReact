# Lansering av den nye appen (`/app/`)

Status 2026-10-17. **Ingenting er publisert, merget eller endret i produksjonen.** Grenen `feature/onepage-rebuild` er klar for en samlet gjennomgang; punktene merket **[godkjenning]** krever din beslutning.

## Besluttet: full overgang til den nye appen

Den nye appen publiseres under `/app/` på samme domene, og **de korte adressene går dit** (beslutning 2026-10-17): `/` og `/home` → `/app/`, `/loopstudio` → `/app/loop-studio`, `/thumbnailstudio`, `/photodesign`, `/motiondesign`, `/isolate`, `/mockup`, `/admin` og mappeadressene (`/fellesmappe`, `/samarbeidsmappe`, `/fastebilder`, `/ressurser`) til sine sider i den nye appen. Gamle `.dc.html`-adresser og bokmerker følger med. Innloggingen (`/login`) og e-postlenkene er de samme som i dag.

- Alle omdirigeringer er **midlertidige (307)**, så nettlesere husker dem ikke: tilbakeføring virker straks.
- PWA: den installerte appen åpner `/home` → omdirigeres til `/app/` (`docs/pwa-identitet.md`, «A med omdirigering»).
- Én kilde for rutene: `media-lab/build/routes.js`, speilet i `vercel.json` og kontrollert av `build/routes.test.js`.

## Det som er gjort for publisering (på grenen, ikke publisert)

| Del | Endring | Kontroll |
|---|---|---|
| Bygget | `media-lab` `npm run build` bygger også `web/` til `dist/app` (`media-lab/build/web-app.js`); stopper med tydelig feil hvis `web/` mangler | Fullt bygg lokalt (rc 0): dagens app + `/app/`, sikkerhetssøk uten funn i begge; `build/web-app.test.js` |
| Ruter | `/app` og `/app/*` → `app/index.html` (filer leveres direkte) – én kilde i `media-lab/build/routes.js`, speilet i `vercel.json` | `build/routes.test.js` (vercel.json = routes.js; /app-stier) |
| Headere | `/app/assets/*` hurtigbuffer 1 år (immutable), `/app/manifest.webmanifest` riktig type og no-cache; eksisterende sikkerhetsheadere og CSP gjelder også `/app/` | Røyktest av bygget med headerne fra vercel.json i ekte Chrome: `/app/`, `/app/admin`, `/app/photo-design` 200, 0 CSP-brudd, ingen feil; headere som forventet |
| Sperren (middleware) | `/app/assets/` åpen som `/assets/` i dag; `/app/` og alle sider under krever innlogging. Uten innlogging → dagens `/login?next=/app/…`, deretter tilbake (samme øktnøkkel `ch.auth`, samme domene) | `server/lib/gate.test.js` (9/9) |
| CSP | Uendret: den nye appen kjører under produksjonens CSP uten brudd | `web/e2e/csp.spec.ts` (PLT-13) |

## Hva som er bekreftet

- **Automatisk:** hele kontrollen i `web/` (typesjekk, lint, enhetstester, bygg, nettlesertester PC/mobil) og `media-lab` `npm test` – se testloggen for siste tall.
- **Mot connecthub-dev (ekte innlogging, 2026-10-12):** vanlig bruker og Admin – innlogging/utlogging, meny per rolle, tilgang håndhevet i databasen og på serveren (lesende kall). Se `docs/testlogg.md`.
- **Brukergrensen (maks 10 per menighet) i connecthub-dev:** migrering, 972/972 databasetester, samtidighetstest og begge appene – se `docs/plan-brukergrense.md` og testloggen.
- **Ekte Chrome med ekte AI-modeller:** Isolate Subject, Photo Design, Thumbnail Studio (Objekt/Person), SlimSAM (ett punkt).

## Før publisering

Alt under kjøres **av deg**, eller av meg først etter at du har godkjent **det enkelte steget**. Ingenting her er gjort i produksjonen.

### A. Forhåndsvisning (connecthub-dev, ingen produksjonsdata)

| # | Handling | Merknad |
|---|---|---|
| A1 | Gå gjennom sjekklisten for Vercel-forhåndsvisningen (`feature/onepage-rebuild`) med testkonto | Commit og byggestatus kontrolleres i GitHub/Vercel |

### B. Produksjonen – bare lesing (ingen endring)

| # | Handling | Forventet |
|---|---|---|
| B1 | Supabase-panelet → produksjonsprosjektet `cmuienhheklcgtfmpvbe` → **Database → Migrations** | **38** migreringer, siste `20261017100000_file_in_use`. Mangler noe: stopp |
| B2 | Panelets SQL-redigering: innholdet i `supabase/checks/member_limit_report.sql` (bare `select`; viser bare menighetsnavn og tall) | Liste over menigheter og antall. Menigheter med over 10 beholder alle sine; noter dem |
| B3 | Samme sted: `supabase/checks/prod_fingerprint.sql` (bare `select`) – lagre svaret | Fingeravtrykk før migreringen |

### C. Produksjonen – brukergrensen og Livets Ord-standarder (**[godkjenning] for hvert steg**, før koden publiseres)

| # | Handling | Endrer? | Forventet |
|---|---|---|---|
| C1 | Sikkerhetskopi: `supabase db dump --linked` (skjema) og `--data-only` (data), se `docs/produksjonsplan-samarbeidsgrupper.md` 2.1 | Leser databasen; lager lokale filer – datafila har personopplysninger, lagres utenfor repoet og slettes når alt er stabilt | To filer |
| C2 | `npx supabase@latest db push --linked --project-ref cmuienhheklcgtfmpvbe --dry-run` | Ingen dataendring (CLI-en oppretter en midlertidig innloggingsrolle for tilkoblingen) | **Bare** `20261018100000_member_limit.sql` og `20261018110000_church_legacy_defaults.sql`. Alt annet: stopp |
| C3 | Samme kommando uten `--dry-run` | **Ja** – to nye kolonner (`member_limit`, `legacy_defaults`), funksjoner og triggere; `whoami` får feltet `legacy_defaults`. Eksisterende menigheter merkes `legacy_defaults = true` (beholder Livets Ord-innholdet); ingen andre rader endres | «Applying migration …» for begge, uten feil |
| C4 | Verifisering: B1 (nå **40**), B2 (samme antall per menighet, grense 10) og B3 (likt med før, bortsett fra `migrations`/`last_migration`) | Bare lesing | Som forventet |

Mellom C3 og publiseringen (D) bruker produksjonen fortsatt dagens kode. Den tåler migreringen; den eneste forskjellen er at en menighet som allerede er på eller over grensen, får en generell feilmelding ved ny invitasjon (den tydelige teksten kommer med koden). B2 viser om noen menighet berøres.

### D. Publisering (**[godkjenning]**)

| # | Handling | Merknad |
|---|---|---|
| D1 | Merge `feature/onepage-rebuild` → `main` | Publiserer den nye appen under `/app/` med de korte adressene, brukergrensen i begge appene og rettelsene i dagens app (utklipp med ormbg/TB-7BF5C1, ingen automatisk sletting i delt mappe, `/app/assets` i sperren) |
| D2 | Kontroller i Vercel at produksjonsdeploymenten bygger merge-commiten, og at den er «Ready» | |
| D3 | Etter publisering: logg inn, åpne `/app/`, ett verktøy, Dine medier og Admin → menighetens innstillinger (telleren); sjekk at `/home`, `/admin` og `/fellesmappe` sender til riktig side i den nye appen (307), og at en installert app åpner den nye appen | 5–10 minutter |

### E. Tilbakeføring

- **Koden:** Vercel → Deployments → forrige produksjonsdeployment → «Instant Rollback» (sekunder, ingen git-endring). Deretter `git revert` av merge-commiten. Databasen kan bli stående – dagens kode tåler den.
- **Korte adresser:** Instant Rollback over gir dagens adresser tilbake straks (omdirigeringene er 307 og huskes ikke).
- **Brukergrensen i databasen:** `supabase/checks/rollback_20261018100000.sql` fjerner triggerne og funksjonene; ingen medlemskap eller invitasjoner endres (testet lokalt). Bare etter egen godkjenning.
- **Livets Ord-feltet:** `supabase/checks/rollback_20261018110000.sql` gir `whoami` tilbake uten feltet (appen tolker manglende felt som Livets Ord-innhold). Kolonnen kan stå. Bare etter egen godkjenning.
- **Data:** gjenoppretting fra sikkerhetskopien (C1) bare hvis data faktisk er skadet, og bare etter egen godkjenning. Migreringen sletter eller overskriver ingen rader.

## Status per område (2026-10-17)

| Område | Status | Bevis |
|---|---|---|
| Korte adresser og PWA (PLT-12, PLT-07-id) | Ferdig på grenen, ikke publisert | `build/routes.test.js`, `e2e/platform.spec.ts`, `e2e-dev/integration-dev.spec.ts` |
| Livets Ord-standarder for nye menigheter | Ferdig; migrering kjørt i dev, venter på produksjon (C) | `features/legacy-defaults.test.ts`, `rls_test.sql` |
| Brukergrense i begge appene | Ferdig; dev verifisert, venter på produksjon (C) | `member-limit-dev`, `MemberLimit.test.tsx`, `rls_test.sql` |
| Developer/Moderator med MFA, tilbakemelding fra innsending til innboks | Testet mot dev | `staff-dev`, `feedback-dev` |
| Adminhandlinger som endrer data (invitasjon, e-post, rolle, medlemskap, opplasting, sletting, kontosletting) | Testet mot dev | `admin-write-dev`, `lifecycle-dev` |
| Fellesmappe som bildekilde i verktøyene | Testet mot dev | `sources-dev` |
| Pensel, grønn «behold», SlimSAM-punkter | Testet med ekte modeller | `e2e-real/ai-tools.spec.ts` |
| Sikkerhetsgjennomgang | Utført; ett innstillingspunkt hos deg (lekkede passord) | `supabase/checks/security_audit.sql`, `docs/testlogg.md` |
| Photo Design «hvitt bilde» | **Ikke gjenskapt** – trenger bildet eller fremgangsmåten | `e2e-dev/photo-dev.spec.ts` (`ML_DEV_IMAGE`) |
