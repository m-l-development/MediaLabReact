-- ConnectHub · BARE LESING. Forhåndskontroll før de åtte migreringene 20261004100000–20261009100000 (dev → produksjon).
-- Hvert felt under 'stopp' må være 0 (eller som angitt), ellers stopper vi og vurderer før noe kjøres. Endrer ingenting.
select jsonb_build_object(
  'migrations', (select count(*) from supabase_migrations.schema_migrations),            -- forventet 21
  'last_migration', (select max(version) from supabase_migrations.schema_migrations),     -- forventet 20261003100000
  'pending_already_applied', (select count(*) from supabase_migrations.schema_migrations where version >= '20261004100000'),  -- forventet 0
  'stopp', jsonb_build_object(
    -- 20261005100000: User/Admin med flere aktive medlemskap (blir ikke stoppet av migreringen, men må ryddes bevisst)
    'users_in_several_churches', (select count(*) from (select m.user_id from public.memberships m where m.status = 'active'
        and not exists (select 1 from public.user_roles r where r.user_id = m.user_id and r.role in ('developer', 'moderator') and r.revoked_at is null)
        group by m.user_id having count(*) > 1) x),
    -- 20261008100000: aktive koblinger må ha begge menighetene (ellers avbryter migreringen selv)
    'active_links_missing_church', (select count(*) from public.church_links where status = 'active' and (church_a is null or church_b is null)),
    -- 20261005100000: medlemskap med ukjent status (kontrollen byttes ut)
    'memberships_odd_status', (select count(*) from public.memberships where status not in ('active', 'disabled'))
  ),
  'info', jsonb_build_object(
    'links', (select count(*) from public.church_links),
    'links_active', (select count(*) from public.church_links where status = 'active'),
    'global_roles', (select count(*) from public.user_roles where role in ('developer', 'moderator') and revoked_at is null),
    'feedback', (select count(*) from public.feedback)
  )
) as precheck;
