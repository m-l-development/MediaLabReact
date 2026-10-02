-- ConnectHub · BARE LESING. Etterkontroll etter migreringen 20261010100000_mail.sql. Alle 'ok'-felt skal være true.
select jsonb_build_object(
  'migrations', (select count(*) from supabase_migrations.schema_migrations),           -- forventet 30
  'last_migration', (select max(version) from supabase_migrations.schema_migrations),    -- forventet 20261010100000
  'ok', jsonb_build_object(
    'tables', (select count(*) = 4 from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r'
      and c.relname in ('email_templates', 'mail_settings', 'email_outbox', 'anon_rate_limits') and c.relrowsecurity),
    'no_client_grants', (select count(*) = 0 from information_schema.role_table_grants where table_schema = 'public'
      and table_name in ('email_templates', 'mail_settings', 'email_outbox', 'anon_rate_limits') and grantee in ('anon', 'authenticated')),
    'functions', (select count(distinct p.proname) = 11 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname in
      ('mail_templates', 'save_mail_template', 'reset_mail_template', 'mail_settings_get', 'set_mail_logo', 'reset_mail_logo', 'mail_logo_key',
       'mail_outbox_recent', 'mail_for_send', 'register_mail', 'anon_rate_hit')),
    'settings_row', (select count(*) = 1 from public.mail_settings where id and logo_key is null),
    'defaults_in_use', (select count(*) = 0 from public.email_templates),
    'outbox_empty', (select count(*) = 0 from public.email_outbox)
  )
) as postcheck;
