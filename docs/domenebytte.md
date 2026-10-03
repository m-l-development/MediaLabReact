# Domenebytte og korte nettadresser

ConnectHub bruker korte, relative adresser internt. Domenet er bare konfigurasjon, ikke en del av koden.

## Korte adresser (build/routes.js)

| Adresse | Side |
| --- | --- |
| `/` | sendes til `/home` |
| `/home` | `media-lab.dc.html` (forsiden) |
| `/login` | `login.dc.html` (eneste offentlige side) |
| `/loopstudio` | `loop-studio.dc.html` (Loop Studio – maler og grunnoppsett) |
| `/loopeditor` | `studio-editor.dc.html` (Loop Studio – editoren) |
| `/thumbnailstudio` | `thumbnail-studio.dc.html` |
| `/photodesign` | `photo-design.dc.html` |
| `/motiondesign` | `motion-design.dc.html` |
| `/isolate` | `isolate-subject.dc.html` |
| `/mockup` | `mockups.dc.html` (`/mockups/` er en statisk mappe) |
| `/admin` | `connecthub-admin.dc.html` |
| `/fellesmappe`, `/samarbeidsmappe`, `/fastebilder`, `/ressurser` | admin-siden, åpner riktig visning |

- Gamle `*.dc.html`-adresser sendes videre (307) til den korte adressen med samme spørring; `#`-delen beholdes av nettleseren.
  Bokmerker, varsler i databasen (`/connecthub-admin.dc.html#/filer`) og lenker i e-post virker derfor fortsatt.
- `vercel.json` (`rewrites`/`redirects`) må stemme med `build/routes.js` – `build/routes.test.js` stopper testene ellers.
  Lokalt gjør `vite dev/preview` og `build/static-serve.mjs` det samme.
- Alle korte sider krever innlogging (`server/lib/gate.js`, `middleware.js`); bare `/login` og `/login.dc.html` er offentlige.
  «next» etter innlogging godtar bare interne stier og aldri innloggingssiden.
- Adressen som sendes til innloggingsleverandøren (Supabase) for «Glemt passord» og lenkene i e-post bruker fortsatt
  `/login.dc.html`, fordi den står i leverandørens liste over tillatte adresser. Den sendes videre til `/login`.

## Hva som er domeneavhengig i dag

| Sted | Hva | Ved domenebytte |
| --- | --- | --- |
| `server/lib/backend.js` `SITE` / `siteUrl()` | Adressen i e-postlenker (invitasjon, glemt passord, varsler) | Sett `CONNECTHUB_SITE_URL=https://<nytt domene>` i Vercel (Production). Bare https + rent vertsnavn godtas; ellers brukes standard. |
| `vercel.json` (CSP-regel med `has`/`missing` host) | Produksjonsverten får CSP uten utviklingsprosjektet | Bytt `media-lab-react-vyef.vercel.app` til det nye vertsnavnet i begge reglene (og `build/csp.js`-testene). Uten dette får det nye domenet CSP-en som også tillater utviklingsdatabasen. |
| Supabase Auth (produksjon) | Site URL og tillatte omdirigeringsadresser | Legg til `https://<nytt domene>/login.dc.html` (og `/login`) som eksakte adresser. Aldri jokertegn i vertsnavnet. |
| `build/env-guard.js` `DEV_SITE`, `SITE.preview` | ConnectHub Dev (Preview) | Uendret ved bytte av produksjonsdomene. |
| `supabase/config.toml` | Bare utviklingsprosjektet | Uendret. |

## Manuelle steg ved bytte til eget domene (f.eks. `connecthub.no`)

1. Vercel: legg domenet til prosjektet (Production) og sett DNS-postene Vercel oppgir. Behold den gamle Vercel-adressen i en overgangsperiode.
2. Vercel: sett `CONNECTHUB_SITE_URL=https://connecthub.no` for Production og publiser på nytt.
3. Supabase (produksjon): Site URL og tillatte omdirigeringsadresser (se tabellen). E-postmalene bruker `{{ .ConfirmationURL }}` og trenger ingen endring.
4. `vercel.json`: CSP-regelen for produksjonsverten (se tabellen), test og publiser.
5. Test innlogging, «Glemt passord», invitasjon, e-postlenker og at gamle `.dc.html`-adresser sendes videre.
6. **Lokale data:** prosjekter og innstillinger som bare ligger i nettleseren (Loop Studio-serier, Thumbnail-maler, Photo/Motion-prosjekter, personlige grunnoppsett) er knyttet til domenet. Be brukerne lagre dem (prosjektmappe/«Lagre på Disk»/sikkerhetskopi) på det gamle domenet før de bytter, eller la det gamle domenet fortsatt fungere en periode. Alt i ConnectHub (filer, menighetens grunnoppsett) følger med uten videre.
7. Innloggingen (cookien `ch_at` og økten) er per domene: alle må logge inn på nytt én gang.

## Tilbakeføring

- Kode: i Vercel, «Promote» forrige produksjonsdeployment (umiddelbart), eller `git revert` av commitene på `main` og push.
  Korte adresser kan fjernes ved å ta bort `rewrites`/`redirects` i `vercel.json`; gamle `.dc.html`-adresser virker alltid.
- Migrering `20261017100000_file_in_use.sql` (filer i bruk): `supabase/checks/rollback_20261017100000.sql` gjenoppretter forrige
  `delete_file` (ingen data endres).
