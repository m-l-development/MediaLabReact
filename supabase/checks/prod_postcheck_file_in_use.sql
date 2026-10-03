-- ConnectHub · BARE LESING. Etterkontroll etter 20261017100000 (filer i bruk kan ikke slettes). Alle 'ok'-felt skal være true.
select jsonb_build_object(
  'last_migration', (select max(version) from supabase_migrations.schema_migrations),   -- forventet 20261017100000
  'ok', jsonb_build_object(
    'in_use_check', (select prosrc like '%CH012%' and prosrc like '%church_settings%' and prosrc like '%logo_file_id%' from pg_proc where proname = 'delete_file'),
    'access_first', (select position('Ingen tilgang' in prosrc) < position('CH012' in prosrc) from pg_proc where proname = 'delete_file'),
    'still_granted', has_function_privilege('authenticated', 'public.delete_file(uuid)', 'execute')
  )
) as postcheck;
