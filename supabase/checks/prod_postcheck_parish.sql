-- ConnectHub · BARE LESING. Etterkontroll etter 20261121100000 + 20261121100100 (Menighetsbruker). Alle 'ok'-felt skal
-- være true. Endrer ingenting.
select jsonb_build_object(
  'migrations', (select count(*) from supabase_migrations.schema_migrations),                 -- forventet 52
  'last_migration', (select max(version) from supabase_migrations.schema_migrations),          -- forventet 20261121100100
  'ok', jsonb_build_object(
    'tables_rls_no_client_grants', (select bool_and(c.relrowsecurity) from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relname in ('parish_accounts', 'parish_inbox', 'parish_inbox_pending'))
      and (select count(*) = 0 from information_schema.role_table_grants where table_schema = 'public'
        and table_name in ('parish_accounts', 'parish_inbox', 'parish_inbox_pending') and grantee in ('anon', 'authenticated')),
    'functions', (select count(distinct p.proname) = 20 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname in
      ('parish_account_get', 'parish_prepare', 'parish_activate', 'parish_abort', 'parish_manage', 'parish_pw_record', 'parish_revoke', 'parish_login_lookup',
       'parish_self', 'parish_targets', 'inbox_can_send', 'inbox_begin', 'inbox_take', 'inbox_register', 'inbox_expired_take', 'inbox_list', 'inbox_keys',
       'inbox_set_status', 'inbox_rename', 'inbox_delete')),
    'server_only_functions', (select bool_and(not has_function_privilege('authenticated', p.oid, 'EXECUTE') and not has_function_privilege('anon', p.oid, 'EXECUTE'))
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname in
      ('parish_activate', 'parish_abort', 'parish_pw_record', 'parish_revoke', 'parish_login_lookup', 'inbox_begin', 'inbox_take', 'inbox_register', 'inbox_expired_take')),
    'supabase_auth_check', (select count(*) = 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'app' and p.proname = 'parish_auth_ok'
      and pg_get_functiondef(p.oid) like '%auth.users%'),
    'current_user_id_guards_parish', (select pg_get_functiondef('app.current_user_id()'::regprocedure) like '%parish_accounts%'),
    'whoami_has_parish', (select pg_get_functiondef('public.whoami()'::regprocedure) like '%''parish''%'),
    'guards', (select count(*) = 2 from pg_trigger where not tgisinternal and tgname in ('user_roles_parish_guard', 'memberships_parish_guard')),
    'bucket', (select count(*) = 1 from storage.buckets where id = 'ch-inbox' and not public and file_size_limit = 31457280),
    'empty', (select count(*) = 0 from public.parish_accounts) and (select count(*) = 0 from public.parish_inbox)
  ),
  'info', jsonb_build_object(
    'users', (select count(*) from public.app_users),
    'churches', (select count(*) from public.churches),
    'memberships_active', (select count(*) from public.memberships where status = 'active'),
    'files', (select count(*) from public.files)
  )
) as postcheck;
