-- ConnectHub · BARE LESING. Etterkontroll etter migreringene 20261011100000–20261014100000 (e-postvarsler, forespørsler,
-- varselsadresse, e-postvarsler bare for stab). Alle 'ok'-felt skal være true.
select jsonb_build_object(
  'migrations', (select count(*) from supabase_migrations.schema_migrations),           -- forventet 34
  'last_migration', (select max(version) from supabase_migrations.schema_migrations),    -- forventet 20261014100000
  'ok', jsonb_build_object(
    'request_tables', (select count(*) = 2 from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r'
      and c.relname in ('account_requests', 'account_request_events') and c.relrowsecurity),
    'no_client_grants', (select count(*) = 0 from information_schema.role_table_grants where table_schema = 'public'
      and table_name in ('account_requests', 'account_request_events') and grantee in ('anon', 'authenticated')),
    'functions', (select count(distinct p.proname) = 17 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname in
      ('submit_account_request', 'account_requests_list', 'account_request_events_for', 'set_account_request_status', 'add_account_request_note',
       'reject_account_request', 'approve_account_request', 'delete_account_request', 'set_mail_notify_extra', 'mail_notify_extra',
       'set_my_email_optional', 'mail_optional_allowed', 'my_email_prefs', 'set_my_notify_email', 'mail_optional_address', 'mail_settings_get', 'save_mail_template')),
    'user_columns', (select count(*) = 2 from information_schema.columns where table_schema = 'public' and table_name = 'app_users' and column_name in ('email_optional', 'notify_email')),
    'defaults_kept', (select count(*) = 0 from public.app_users where not email_optional or notify_email is not null),
    'no_requests_yet', (select count(*) = 0 from public.account_requests),
    'notify_extra_empty', (select cardinality(notify_extra) = 0 from public.mail_settings where id),
    'prefs_staff_only', (select prosrc like '%is_staff%' from pg_proc where proname = 'set_my_notify_email')
  )
) as postcheck;
