-- ConnectHub · BARE LESING. Forhåndskontroll før 20261121100000_parish_accounts + 20261121100100_supabase_parish_auth
-- (Menighetsbruker). Endrer ingenting. Alle felt under 'stopp' må være false/0, ellers stopper vi før noe kjøres.
select jsonb_build_object(
  'migrations', (select count(*) from supabase_migrations.schema_migrations),                 -- forventet 50
  'last_migration', (select max(version) from supabase_migrations.schema_migrations),          -- forventet 20261108100000
  'stopp', jsonb_build_object(
    'already_applied', (select count(*) from supabase_migrations.schema_migrations where version >= '20261121100000'),
    'tables_exist', (select count(*) from pg_tables where schemaname = 'public' and tablename in ('parish_accounts', 'parish_inbox', 'parish_inbox_pending')),
    'bucket_exists', (select count(*) from storage.buckets where id = 'ch-inbox'),
    'internal_keys_in_use', (select count(*) from auth.users where email like '%@menighetsbruker.invalid'),
    -- rettighetene til eieren av funksjonene (postgres), ikke til den som leser
    'auth_sessions_not_deletable', not has_table_privilege('postgres', 'auth.sessions', 'DELETE'),
    'auth_password_not_readable', not has_column_privilege('postgres', 'auth.users', 'encrypted_password', 'SELECT')
  ),
  'info', jsonb_build_object(
    'users', (select count(*) from public.app_users),
    'churches', (select count(*) from public.churches),
    'memberships_active', (select count(*) from public.memberships where status = 'active'),
    'files', (select count(*) from public.files)
  )
) as precheck;
