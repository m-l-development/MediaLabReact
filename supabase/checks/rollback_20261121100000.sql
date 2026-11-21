-- ConnectHub · TILBAKEFØRING av 20261121100000_parish_accounts.sql og 20261121100100_supabase_parish_auth.sql
-- (Menighetsbruker). Kjøres bare ved behov, manuelt, etter egen godkjenning.
-- 1) app.current_user_id() og whoami() settes tilbake til definisjonene før Menighetsbrukeren (samme svar for alle
--    andre brukere som før). 2) Vaktene og funksjonene fjernes. 3) Tabellene BEHOLDES (data slettes aldri her):
--    Menighetsbrukerne mister bare tilgangen. Innboksens filer ligger fortsatt i bøtta ch-inbox; slett dem bare etter
--    egen beslutning. Innloggingskontoene hos leverandøren fjernes ikke av dette skriptet.
create or replace function app.current_user_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select u.id
  from public.user_identities i
  join public.app_users u on u.id = i.user_id
  where i.provider = app.jwt_claims() ->> 'iss'
    and i.subject = app.jwt_claims() ->> 'sub'
    and u.status = 'active'
    and not exists (select 1 from public.parish_accounts p where p.user_id = u.id)   -- Menighetsbrukere har ingen tilgang etter tilbakeføringen
$$;
create or replace function public.whoami() returns jsonb
language sql stable security definer set search_path = '' as $$
  select case when u.id is null then null else jsonb_build_object(
    'id', u.id, 'email', u.email, 'full_name', u.full_name, 'first_name', u.first_name, 'last_name', u.last_name, 'phone', u.phone,
    'mfa', app.mfa_ok(),
    'roles', coalesce((select jsonb_agg(jsonb_build_object('role', r.role, 'church_id', r.church_id, 'expires_at', r.expires_at) order by r.role)
                       from public.user_roles r where r.user_id = u.id and r.revoked_at is null and (r.expires_at is null or r.expires_at > now())), '[]'::jsonb),
    'churches', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'logo_file_id', c.logo_file_id, 'legacy_defaults', c.legacy_defaults) order by c.name)
                          from public.memberships m join public.churches c on c.id = m.church_id
                          where m.user_id = u.id and m.status = 'active' and c.status = 'active' and not app.temp_membership_ended(u.id, c.id)), '[]'::jsonb)
  ) end
  from (select app.current_user_id() as uid) x left join public.app_users u on u.id = x.uid
$$;
drop trigger if exists user_roles_parish_guard on public.user_roles;
drop trigger if exists memberships_parish_guard on public.memberships;
drop function if exists public.parish_account_get(uuid), public.parish_prepare(uuid, text), public.parish_activate(uuid, text, text), public.parish_abort(uuid),
  public.parish_manage(uuid, text, text), public.parish_pw_record(uuid, text), public.parish_revoke(uuid, uuid), public.parish_login_lookup(text),
  public.parish_self(), public.parish_targets(), public.inbox_can_send(uuid, bigint), public.inbox_begin(text, text, uuid, text, text, text, bigint),
  public.inbox_take(uuid, text, text), public.inbox_register(uuid, text, text, text, bigint), public.inbox_expired_take(int), public.inbox_list(uuid),
  public.inbox_keys(uuid[]), public.inbox_set_status(uuid[], text), public.inbox_rename(uuid, text), public.inbox_delete(uuid[]);
drop function if exists app.parish_role_guard(), app.parish_membership_guard(), app.parish_json(public.parish_accounts), app.parish_admin_check(uuid),
  app.inbox_reader(uuid), app.inbox_check(uuid, uuid, bigint), app.parish_pw_due(timestamptz), app.parish_auth_ok(uuid), app.parish_session_ok(), app.parish_pw_hash(uuid),
  app.parish_session_count(uuid), app.parish_revoke_sessions(uuid, uuid);
select jsonb_build_object(
  'functions_left', (select count(*) from pg_proc where proname like 'parish\_%' or proname like 'inbox\_%'),
  'triggers_left', (select count(*) from pg_trigger where tgname like '%parish%' and tgname <> 'parish_accounts_touch'),
  'tables_kept', (select count(*) from pg_tables where schemaname = 'public' and tablename in ('parish_accounts', 'parish_inbox', 'parish_inbox_pending'))
) as rollback_parish;
