-- ConnectHub · TILBAKEFØRING av 20261018110000_church_legacy_defaults.sql (bare ved behov, manuelt, etter egen godkjenning).
-- Gjenoppretter whoami uten legacy_defaults. Kolonnen beholdes (ingen data går tapt); appen behandler manglende felt som «ja» (som før).
create or replace function public.whoami() returns jsonb
language sql stable security definer set search_path = '' as $$
  select case when u.id is null then null else jsonb_build_object(
    'id', u.id, 'email', u.email, 'full_name', u.full_name, 'first_name', u.first_name, 'last_name', u.last_name, 'phone', u.phone,
    'mfa', app.mfa_ok(),
    'roles', coalesce((select jsonb_agg(jsonb_build_object('role', r.role, 'church_id', r.church_id) order by r.role)
                       from public.user_roles r where r.user_id = u.id and r.revoked_at is null), '[]'::jsonb),
    'churches', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'logo_file_id', c.logo_file_id) order by c.name)
                          from public.memberships m join public.churches c on c.id = m.church_id
                          where m.user_id = u.id and m.status = 'active' and c.status = 'active'), '[]'::jsonb)
  ) end
  from (select app.current_user_id() as uid) x left join public.app_users u on u.id = x.uid
$$;
