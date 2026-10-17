# Lansering av den nye appen (`/app/`)

Status 2026-10-17. **Ingenting er publisert, merget eller endret i produksjonen.** Grenen `feature/onepage-rebuild` er klar for en samlet gjennomgang; punktene merket **[godkjenning]** krever din beslutning.

## Anbefalt: myk lansering (minste trygge steg)

Den nye appen publiseres **ved siden av** dagens app, på samme domene, under `/app/`. Dagens app (`/home`, `/admin`, korte adresser, e-postlenker) er uendret og fungerer som før. Brukerne får lenken til `/app/`. Når den nye appen har vært i bruk en stund, flyttes de korte adressene dit i et eget steg (PLT-12).

Hvorfor: ingen eksisterende lenke, installasjon eller e-postlenke brytes; dagens admin er fortsatt tilgjengelig for handlinger som ennå ikke er prøvd mot ekte data i den nye appen; tilbakeføring er bare å fjerne `/app/` igjen.

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

### C. Produksjonen – brukergrensen (**[godkjenning] for hvert steg**, før koden publiseres)

| # | Handling | Endrer? | Forventet |
|---|---|---|---|
| C1 | Sikkerhetskopi: `supabase db dump --linked` (skjema) og `--data-only` (data), se `docs/produksjonsplan-samarbeidsgrupper.md` 2.1 | Leser databasen; lager lokale filer – datafila har personopplysninger, lagres utenfor repoet og slettes når alt er stabilt | To filer |
| C2 | `npx supabase@latest db push --linked --project-ref cmuienhheklcgtfmpvbe --dry-run` | Ingen dataendring (CLI-en oppretter en midlertidig innloggingsrolle for tilkoblingen) | **Bare** `20261018100000_member_limit.sql`. Alt annet: stopp |
| C3 | Samme kommando uten `--dry-run` | **Ja** – ny kolonne, funksjoner og triggere; ingen eksisterende rader endres | «Applying migration 20261018100000_member_limit.sql» uten feil |
| C4 | Verifisering: B1 (nå **39**), B2 (samme antall per menighet, grense 10) og B3 (likt med før, bortsett fra `migrations`/`last_migration`) | Bare lesing | Som forventet |

Mellom C3 og publiseringen (D) bruker produksjonen fortsatt dagens kode. Den tåler migreringen; den eneste forskjellen er at en menighet som allerede er på eller over grensen, får en generell feilmelding ved ny invitasjon (den tydelige teksten kommer med koden). B2 viser om noen menighet berøres.

### D. Publisering (**[godkjenning]**)

| # | Handling | Merknad |
|---|---|---|
| D1 | Merge `feature/onepage-rebuild` → `main` | Publiserer den nye appen under `/app/`, brukergrensen i begge appene og rettelsene i dagens app (utklipp med ormbg/TB-7BF5C1, ingen automatisk sletting i delt mappe, `/app/assets` i sperren) |
| D2 | Kontroller i Vercel at produksjonsdeploymenten bygger merge-commiten, og at den er «Ready» | |
| D3 | Etter publisering: logg inn, åpne `/app/`, ett verktøy, Dine medier og Admin → menighetens innstillinger (telleren); sjekk at `/home` og `/admin` virker som før | 5–10 minutter |

### E. Tilbakeføring

- **Koden:** Vercel → Deployments → forrige produksjonsdeployment → «Instant Rollback» (sekunder, ingen git-endring). Deretter `git revert` av merge-commiten. Databasen kan bli stående – dagens kode tåler den.
- **Brukergrensen i databasen:** `supabase/checks/rollback_20261018100000.sql` fjerner triggerne og funksjonene; ingen medlemskap eller invitasjoner endres (testet lokalt). Bare etter egen godkjenning.
- **Data:** gjenoppretting fra sikkerhetskopien (C1) bare hvis data faktisk er skadet, og bare etter egen godkjenning. Migreringen sletter eller overskriver ingen rader.

## Kan vente til etter lansering

| Punkt | Hvorfor det kan vente |
|---|---|
| PLT-12 korte adresser til den nye appen | Myk lansering: dagens adresser beholdes |
| PWA-identitet (`docs/pwa-identitet.md`) | Den nye appen kan installeres i tillegg (mulig to ikoner); avklares når dagens app tas ned |
| Developer/Moderator med MFA mot dev, endrende admin-handlinger (invitasjoner, e-post, roller, opplasting, sletting), kontosletting | Bygget og testet med falske tjenester; dagens admin er tilgjengelig i mellomtiden. Bør prøves mot dev med egne testkontoer før dagens admin tas ned |
| Tilbakemelding fra innsending til innboks mot dev | Test klar (`web/e2e-dev/feedback-dev.spec.ts`, krever `ML_DEV_ALLOW_FEEDBACK=JA`); innboksen krever stab med MFA |
| Livets Ord-standarder for nye menigheter | Forslag i `docs/ny-menighet-standardinnhold.md`; berører bare menigheter som opprettes etter endringen |
| Photo Design «hvitt bilde» | Ikke gjenskapt uten innlogging (alle formater, maler, store bilder, gjenåpning tegner riktig); diagnosetest `web/e2e-dev/photo-dev.spec.ts` kan kjøres innlogget, også med ditt eget bilde (`ML_DEV_IMAGE`) |
| Pensel, grønn «behold», flere SlimSAM-punkter | Manuell sjekkliste levert; ikke kjørt med ekte modell |
