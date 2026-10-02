-- ConnectHub · BARE LESING. Etterkontroll etter de åtte migreringene (20261004100000–20261009100000). Alle 'ok'-felt skal være true. Endrer ingenting.
select jsonb_build_object(
  'migrations', (select count(*) from supabase_migrations.schema_migrations),             -- forventet 29
  'last_migration', (select max(version) from supabase_migrations.schema_migrations),      -- forventet 20261009100000
  'ok', jsonb_build_object(
    'functions', (select count(distinct p.proname) = 16 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname in
      ('remove_membership', 'add_membership', 'cleanup_overview', 'cleanup_private_files', 'archive_feedback', 'restore_feedback', 'set_user_name',
       'set_church_logo', 'delete_link', 'create_group', 'update_group', 'add_group_church', 'remove_group_church', 'my_groups', 'add_self_as_admin', 'remove_self_as_admin')),
    'feedback_list_new', (select count(*) = 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'feedback_list' and p.pronargs = 1),
    'triggers', (select count(*) = 3 from pg_trigger where not tgisinternal and tgname in ('memberships_single_church', 'user_roles_global_guard', 'app_users_name')),
    'rls_new_tables', (select bool_and(c.relrowsecurity) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname in ('church_link_members', 'file_cleanup_queue')),
    'no_client_grants_members', (select count(*) = 0 from information_schema.role_table_grants where table_schema = 'public' and table_name = 'church_link_members' and grantee in ('anon', 'authenticated')),
    'every_link_is_group', (select count(*) = 0 from public.church_links l where (l.church_a is not null and not exists (select 1 from public.church_link_members m where m.link_id = l.id and m.church_id = l.church_a))
        or (l.church_b is not null and not exists (select 1 from public.church_link_members m where m.link_id = l.id and m.church_id = l.church_b))),
    'pair_rules_gone', (select count(*) = 0 from pg_constraint where conname = 'church_links_pair') and (select count(*) = 0 from pg_indexes where indexname = 'church_links_active_pair'),
    'extra_admin_columns', (select count(*) = 2 from information_schema.columns where table_schema = 'public' and table_name = 'user_roles' and column_name in ('extra_admin', 'extra_membership')),
    'one_regular_admin_rule', (select count(*) = 1 from pg_indexes where indexname = 'user_roles_one_admin_per_church' and indexdef like '%extra_admin%'),
    'no_extra_admins_yet', (select count(*) = 0 from public.user_roles where extra_admin and revoked_at is null),
    'queue_empty', (select count(*) = 0 from public.file_cleanup_queue)
  )
) as postcheck;
