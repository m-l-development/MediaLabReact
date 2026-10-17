-- ConnectHub · Livets Ord-standarder bare for menigheter som fantes før endringen (docs/ny-menighet-standardinnhold.md,
-- besluttet 2026-10-17: «felt i databasen»).
--   * churches.legacy_defaults: true for alle menigheter som finnes når migreringen kjøres, false for nye.
--     Appen viser de innebygde Livets Ord-standardene (kategorien og grunnoppsettet «Kveldsbibelskole») bare når feltet er true.
--   * Ingen andre data endres. Menighetenes egne maler, logoer og filer påvirkes ikke.
--   * whoami returnerer feltet for brukerens menigheter (ellers som i 20261007100000_feedback_archive_names_logo.sql).
alter table public.churches add column legacy_defaults boolean not null default false;
update public.churches set legacy_defaults = true;

create or replace function public.whoami() returns jsonb
language sql stable security definer set search_path = '' as $$
  select case when u.id is null then null else jsonb_build_object(
    'id', u.id, 'email', u.email, 'full_name', u.full_name, 'first_name', u.first_name, 'last_name', u.last_name, 'phone', u.phone,
    'mfa', app.mfa_ok(),
    'roles', coalesce((select jsonb_agg(jsonb_build_object('role', r.role, 'church_id', r.church_id) order by r.role)
                       from public.user_roles r where r.user_id = u.id and r.revoked_at is null), '[]'::jsonb),
    'churches', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'logo_file_id', c.logo_file_id, 'legacy_defaults', c.legacy_defaults) order by c.name)
                          from public.memberships m join public.churches c on c.id = m.church_id
                          where m.user_id = u.id and m.status = 'active' and c.status = 'active'), '[]'::jsonb)
  ) end
  from (select app.current_user_id() as uid) x left join public.app_users u on u.id = x.uid
$$;
