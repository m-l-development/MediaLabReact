# ConnectHub – database (Supabase / PostgreSQL)

Migreringene er vanlig PostgreSQL og kan kjøres mot enhver PostgreSQL med rollene `anon` og `authenticated`.

| Fil | Innhold |
|---|---|
| `migrations/20261001100000_hardening.sql` | Fjerner Supabase sine standardrettigheter for `anon`/`authenticated`, skjemaet `app`, hendelsestrigger som slår på RLS for alle nye tabeller |
| `migrations/20261001100100_core_tables.sql` | `app_users`, `user_identities`, `churches`, `memberships`, `user_roles`, `invitations`, `audit_logs`, `files` (video avvises) |
| `migrations/20261001100200_access_functions.sql` | `app.current_user_id()` m.fl., revisjonslogg (bare tillegg), `assign_role`/`revoke_role` |
| `migrations/20261001100300_grants_policies.sql` | Kolonnerettigheter og RLS-policyer |
| `migrations/20261001120000_identity_functions.sql` | `public.whoami()` (egen profil/roller/menigheter, `null` for ukoblet/deaktivert), `app.link_identity` (bare server/drift) |
| `migrations/20261001120100_supabase_bootstrap.sql` | `app.bootstrap_developer` – første Developer (Supabase-spesifikk, leser `auth.users`, bare drift) |
| `migrations/20261001130000_admin.sql` | Invitasjoner (`create_invitation`, `reissue_invitation`, `revoke_invitation`, `accept_invitation` bare for serveren), `set_user_status`, `system_status` |
| `tests/rls_test.sql` | 116 tester for roller, menighetsskille, MFA, logg, videosperre, identitet og invitasjoner. Rulles alltid tilbake |
| `config.toml` | Auth-innstillinger for **utviklingsprosjektet** (registrering av, adresser, passordkrav). `[auth] enable_signup = false` sperrer registrering; `[auth.email] enable_signup = true` betyr bare at e-postinnlogging er på |

## Første Developer (etter at personen har bekreftet e-posten sin i Auth)
```
-- kjøres av driftspersonell med db query, aldri fra klienten
select app.bootstrap_developer('person@eksempel.no', 'https://<prosjekt-id>.supabase.co/auth/v1');
```
Personen må deretter sette opp totrinnsbekreftelse ved første innlogging før Developer-rettighetene virker.

## Syntetiske testdata i `connecthub-dev`
Brukere `ch-test-*@example.com` (user, user2, admin, dev, mod, unlinked, disabled) og menighetene «CH-test Menighet A/B».
Bare til testing; kan fjernes når som helst. Passord ligger aldri i repoet.

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
