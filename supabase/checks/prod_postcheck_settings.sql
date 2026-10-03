-- ConnectHub · BARE LESING. Etterkontroll etter migreringen 20261016100000 (felles grunnoppsett per menighet).
-- Alle 'ok'-felt skal være true.
select jsonb_build_object(
  'migrations', (select count(*) from supabase_migrations.schema_migrations),           -- forventet 37
  'last_migration', (select max(version) from supabase_migrations.schema_migrations),    -- forventet 20261016100000
  'settings_rows', (select count(*) from public.church_settings),                        -- forventet 0 rett etter migrering
  'ok', jsonb_build_object(
    'table_rls', (select relrowsecurity from pg_class where oid = 'public.church_settings'::regclass),
    'no_client_grants', (select count(*) = 0 from information_schema.role_table_grants where table_schema = 'public'
      and table_name = 'church_settings' and grantee in ('anon', 'authenticated')),
    'functions', (select count(*) = 3 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where (n.nspname, p.proname) in (('public', 'church_settings_get'), ('public', 'church_settings_save'), ('app', 'settings_admin_keys'))),
    'members_only', has_function_privilege('authenticated', 'public.church_settings_save(uuid, text, jsonb, int)', 'execute')
      and not has_function_privilege('anon', 'public.church_settings_save(uuid, text, jsonb, int)', 'execute'),
    'admin_keys', (select app.settings_admin_keys('loopstudio:week') = array['imgRules'])
  )
) as postcheck;
