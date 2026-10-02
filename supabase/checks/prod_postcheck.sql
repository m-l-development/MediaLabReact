-- ConnectHub · BARE LESING. Etterkontroll etter de sju migreringene. Alle 'ok'-felt skal være true. Endrer ingenting.
select jsonb_build_object(
  'migrations', (select count(*) from supabase_migrations.schema_migrations),             -- forventet 28
  'last_migration', (select max(version) from supabase_migrations.schema_migrations),      -- forventet 20261008100000
  'ok', jsonb_build_object(
    'functions', (select count(distinct p.proname) = 14 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname in
      ('remove_membership', 'add_membership', 'cleanup_overview', 'cleanup_private_files', 'archive_feedback', 'restore_feedback', 'set_user_name',
       'set_church_logo', 'delete_link', 'create_group', 'update_group', 'add_group_church', 'remove_group_church', 'my_groups')),
    'feedback_list_new', (select count(*) = 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'feedback_list' and p.pronargs = 1),
    'triggers', (select count(*) = 3 from pg_trigger where not tgisinternal and tgname in ('memberships_single_church', 'user_roles_global_guard', 'app_users_name')),
    'rls_new_tables', (select bool_and(c.relrowsecurity) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname in ('church_link_members', 'file_cleanup_queue')),
    'no_client_grants_members', (select count(*) = 0 from information_schema.role_table_grants where table_schema = 'public' and table_name = 'church_link_members' and grantee in ('anon', 'authenticated')),
    'every_link_is_group', (select count(*) = 0 from public.church_links l where (select count(*) from public.church_link_members m where m.link_id = l.id)
        <> (l.church_a is not null)::int + (l.church_b is not null)::int),
    'pair_rules_gone', (select count(*) = 0 from pg_constraint where conname = 'church_links_pair') and (select count(*) = 0 from pg_indexes where indexname = 'church_links_active_pair'),
    'queue_empty', (select count(*) = 0 from public.file_cleanup_queue)
  )
) as postcheck;
