# Tjenestelaget (`src/services/`)

Sidene i ConnectHub snakker **bare** med modulene her, aldri direkte med Supabase, Vercel eller andre leverandører.
Bare `adapters/<leverandør>/` kjenner leverandøren. Se `docs/architecture-and-portability.md`.

| Modul | Status | Ansvar |
|---|---|---|
| `config.js` | P2 ✅ | Offentlig konfigurasjon (URL, publiseringsnøkkel, prosjekt-ID, mål), lagt inn ved bygging og kontrollert av `build/env-guard.js` |
| `adapters/supabase/client.js` | P2 ✅ | Eneste import av `@supabase/supabase-js` |
| `auth.js` | P4 | `signIn`, `signOut` (alle økter), `currentUser`, `onSessionChange`, `requestPasswordReset`, `setPassword`. Bruker intern bruker-ID fra `app_users`, ikke leverandørens ID |
| `data/*.js` | P3–P5 | Domenefunksjoner: `churches`, `members`, `roles`, `invitations`, `audit` |
| `files.js` | P7 | Opplasting (bare bilder – video avvises alltid), liste, signert nedlastingslenke, slett, flytt. Filer har egne ID-er; leverandørens nøkkel lagres separat |
| `local/` | P4/P6 | Lokale data per innlogget bruker, prosjektmapper på egen PC (videoer forblir lokalt) |

Regler:
- Grensesnittene beskrives med JSDoc og returnerer egne datatyper, ikke leverandørens objekter.
- Hver modul har tester med en falsk adapter (`node:test`), og de samme testene kjøres mot den ekte adapteren (kontrakttester).
- Ingen modul leser miljøvariabler; bare `config.js` får offentlige verdier fra bygget.
