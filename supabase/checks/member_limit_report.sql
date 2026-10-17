-- ConnectHub · BARE LESING. Brukergrense per menighet (docs/plan-brukergrense.md): hvor mange som teller i hver menighet,
-- og hvilke som er over 10. Virker både før og etter migreringen 20261018100000_member_limit.sql (grensen vises når
-- kolonnen finnes). Viser bare menighetsnavn og tall – ingen e-postadresser eller andre personopplysninger.
--   npx supabase@latest db query --linked --project-ref uatpdmhnwwjgzlxaucsx -f supabase/checks/member_limit_report.sql
with m as (
  select ms.church_id, lower(u.email) as e from public.memberships ms join public.app_users u on u.id = ms.user_id where ms.status = 'active'
), i as (
  select distinct iv.church_id, lower(iv.email) as e from public.invitations iv
  where iv.status = 'pending' and iv.expires_at > now() and iv.church_id is not null and iv.role in ('user', 'church_admin')
), per as (
  select c.id, c.name, c.status, coalesce((to_jsonb(c) ->> 'member_limit')::int, 10) as lim,
    (select count(*) from m where m.church_id = c.id) as active,
    (select count(*) from i where i.church_id = c.id and i.e not in (select e from m where m.church_id = c.id)) as pending
  from public.churches c
)
select jsonb_build_object(
  'migrated', exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'churches' and column_name = 'member_limit'),
  'churches', (select count(*) from per),
  'over_limit', (select count(*) from per where active + pending > lim),
  'at_limit', (select count(*) from per where active + pending = lim),
  'max_count', (select coalesce(max(active + pending), 0) from per),
  'list', (select coalesce(jsonb_agg(jsonb_build_object('name', name, 'status', status, 'active', active, 'pending', pending, 'count', active + pending, 'limit', lim) order by active + pending desc, name), '[]') from per)
) as member_limit_report;
