-- ConnectHub · BARE LESING. Fingeravtrykk av dataene, kjøres før og etter migreringene (samme resultat forventes,
-- bortsett fra 'migrations'/'last_migration'). Endrer ingenting. Kjøres bare mot produksjonen etter egen godkjenning:
--   supabase db query --linked --project-ref <prosjekt> -f supabase/checks/prod_fingerprint.sql
select jsonb_build_object(
  'migrations', (select count(*) from supabase_migrations.schema_migrations),
  'last_migration', (select max(version) from supabase_migrations.schema_migrations),
  'churches', (select count(*) from public.churches),
  'churches_hash', (select md5(coalesce(string_agg(concat_ws('|', id, name, status, storage_quota_mb), ',' order by id), '')) from public.churches),
  'users', (select count(*) from public.app_users),
  'users_hash', (select md5(coalesce(string_agg(concat_ws('|', id, email, status, full_name, phone), ',' order by id), '')) from public.app_users),
  'memberships', (select coalesce(jsonb_object_agg(status, n), '{}') from (select status, count(*) n from public.memberships group by status) x),
  'memberships_hash', (select md5(coalesce(string_agg(concat_ws('|', user_id, church_id, status), ',' order by user_id, church_id), '')) from public.memberships),
  'roles_hash', (select md5(coalesce(string_agg(concat_ws('|', id, user_id, role, church_id, revoked_at), ',' order by id), '')) from public.user_roles),
  'files', (select count(*) from public.files),
  'files_bytes', (select coalesce(sum(file_size), 0) from public.files),
  'files_hash', (select md5(coalesce(string_agg(concat_ws('|', id, church_id, storage_key, file_size, sha256, folder, visibility, link_id), ',' order by id), '')) from public.files),
  'objects', (select count(*) from storage.objects where bucket_id = 'ch-files'),
  'links', (select count(*) from public.church_links),
  'links_hash', (select md5(coalesce(string_agg(concat_ws('|', id, church_a, church_b, status, created_at, ended_at), ',' order by id), '')) from public.church_links),
  'feedback', (select count(*) from public.feedback),
  'invitations', (select count(*) from public.invitations),
  'subscriptions', (select count(*) from public.church_subscriptions),
  'audit', (select count(*) from public.audit_logs)
) as fingerprint;
