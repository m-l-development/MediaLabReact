# Lansering av den nye appen (`/app/`)

Status 2026-10-12. **Ingenting er publisert, merget eller endret i produksjonen.** Grenen `feature/onepage-rebuild` er klar for en samlet gjennomgang; punktene merket **[godkjenning]** krever din beslutning.

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
- **Ekte Chrome med ekte AI-modeller:** Isolate Subject, Photo Design, Thumbnail Studio (Objekt/Person), SlimSAM (ett punkt).

## Før publisering

| # | Handling | Hvem | Merknad |
|---|---|---|---|
| 1 | **Vercel-forhåndsvisning av grenen** (Vercel bygger forhåndsvisninger for grener ved push, mot connecthub-dev – kontroller i Vercel at det finnes en for `feature/onepage-rebuild`; ellers start en for grenen): åpne `/app/` og `/home`, logg inn med testkonto | Du | Bekrefter at Vercel bygger `web/` (krever at prosjektet tar med filer utenfor rotmappen `media-lab` – standard for Git-prosjekter; ellers stopper bygget med melding) |
| 2 | **Produksjonsdatabasen har alle migreringene** grenen bruker: `npx supabase migration list --project-ref cmuienhheklcgtfmpvbe` (bare lesing) | Du | Grenen har ingen nye migreringer i forhold til `main`, men `main` sin siste (`20261017100000_file_in_use.sql`) må være kjørt i produksjonen |
| 3 | **[godkjenning]** Merge `feature/onepage-rebuild` → `main` (= publisering til produksjon) | Du | Tar også med rettelsene i dagens app: Isolate/Photo/Thumbnail-utklipp (ormbg, TB-7BF5C1), ingen automatisk sletting i delt mappe, `/app/assets` i sperren |
| 4 | Etter publisering: logg inn på produksjonen, åpne `/app/`, ett verktøy og Dine medier; sjekk at `/home` fortsatt virker | Du | 5 minutter |
| 5 | Tilbakeføring ved feil: revert av merge-commiten på `main` | Du | Dagens app påvirkes ikke av `/app/` |

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
