# ConnectHub – database (Supabase / PostgreSQL)

Migreringene er vanlig PostgreSQL og kan kjøres mot enhver PostgreSQL med rollene `anon` og `authenticated`.

| Fil | Innhold |
|---|---|
| `migrations/20261001100000_hardening.sql` | Fjerner Supabase sine standardrettigheter for `anon`/`authenticated`, skjemaet `app`, hendelsestrigger som slår på RLS for alle nye tabeller |
| `migrations/20261001100100_core_tables.sql` | `app_users`, `user_identities`, `churches`, `memberships`, `user_roles`, `invitations`, `audit_logs`, `files` (video avvises) |
| `migrations/20261001100200_access_functions.sql` | `app.current_user_id()` m.fl., revisjonslogg (bare tillegg), `assign_role`/`revoke_role` |
| `migrations/20261001100300_grants_policies.sql` | Kolonnerettigheter og RLS-policyer |
| `tests/rls_test.sql` | 68 tester for roller, menighetsskille, MFA, logg og videosperre. Rulles alltid tilbake |
| `config.toml` | Auth-innstillinger for **utviklingsprosjektet** (registrering av, adresser, passordkrav) |

## Kommandoer (alltid med eksplisitt prosjekt-ID)
```
npx supabase db push    --project-ref uatpdmhnwwjgzlxaucsx --dry-run   # se hva som kjøres
npx supabase db push    --project-ref uatpdmhnwwjgzlxaucsx             # bare utvikling
npx supabase db query   --linked --project-ref uatpdmhnwwjgzlxaucsx -f supabase/tests/rls_test.sql
npx supabase db advisors --linked --project-ref uatpdmhnwwjgzlxaucsx --type all
npx supabase config diff --project-ref uatpdmhnwwjgzlxaucsx            # før config push
```
**Produksjon (`cmuienhheklcgtfmpvbe`) brukes aldri her** – den settes opp i P11 etter egen godkjenning.

## Godtatte advarsler fra `db advisors`
`public.assign_role` og `public.revoke_role` er `SECURITY DEFINER` og kan kalles av innloggede. Det er tilsiktet: de er den eneste
veien til rolleendringer og kontrollerer selv utfører (aktiv bruker), MFA (aal2) og reglene. Testene i `tests/rls_test.sql` dekker
både tillatte og avviste kall.
