-- ConnectHub · BARE LESING. Etterkontroll etter migreringene 20261015100000 (Samarbeidsmappe: direkte opplasting) og
-- 20261015100100 (nye private opplastinger stengt). Alle 'ok'-felt skal være true.
select jsonb_build_object(
  'migrations', (select count(*) from supabase_migrations.schema_migrations),           -- forventet 36
  'last_migration', (select max(version) from supabase_migrations.schema_migrations),    -- forventet 20261015100100
  'files', (select count(*) from public.files),                                          -- skal være uendret fra sikkerhetskopien
  'private_files', (select count(*) from public.files where visibility = 'private'),     -- skal være uendret fra sikkerhetskopien
  'ok', jsonb_build_object(
    'link_upload_column', (select count(*) = 1 from information_schema.columns where table_schema = 'public' and table_name = 'files'
      and column_name = 'link_upload' and is_nullable = 'NO' and column_default = 'false'),
    'existing_rows_unmarked', (select count(*) = 0 from public.files where link_upload),
    'link_upload_check', (select count(*) = 1 from pg_constraint where conname = 'files_link_upload'),
    'functions', (select count(*) = 3 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where (n.nspname, p.proname) in (('public', 'can_upload_link'), ('public', 'register_link_upload'), ('app', 'link_upload_check'))),
    'can_upload_link_for_users', has_function_privilege('authenticated', 'public.can_upload_link(uuid, uuid, bigint)', 'execute'),
    'register_link_upload_server_only', not has_function_privilege('authenticated', 'public.register_link_upload(text, text, uuid, uuid, text, text, text, bigint, text)', 'execute')
      and not has_function_privilege('anon', 'public.register_link_upload(text, text, uuid, uuid, text, text, text, bigint, text)', 'execute'),
    'delete_rule_extended', (select prosrc like '%link_upload%' from pg_proc where proname = 'delete_file'),
    'private_uploads_closed', (select prosrc like '%Nye private opplastinger er stengt%' from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'app' and p.proname = 'upload_check')
  )
) as postcheck;
