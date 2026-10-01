-- ConnectHub P4 · Identitet: «hvem er jeg» og kobling av innloggingskonto → ConnectHub-bruker. Vanlig PostgreSQL.

-- whoami(): innlogget brukers egne opplysninger, aktive roller og aktive menigheter. null = ikke koblet eller deaktivert.
-- Rollene vises uansett MFA; selve rettighetene i RLS krever fortsatt aal2 for developer/moderator.
create or replace function public.whoami() returns jsonb
language sql stable security definer set search_path = '' as $$
  select case when u.id is null then null else jsonb_build_object(
    'id', u.id, 'email', u.email, 'full_name', u.full_name, 'phone', u.phone,
    'mfa', app.mfa_ok(),
    'roles', coalesce((select jsonb_agg(jsonb_build_object('role', r.role, 'church_id', r.church_id) order by r.role)
                       from public.user_roles r where r.user_id = u.id and r.revoked_at is null), '[]'::jsonb),
    'churches', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name) order by c.name)
                          from public.memberships m join public.churches c on c.id = m.church_id
                          where m.user_id = u.id and m.status = 'active' and c.status = 'active'), '[]'::jsonb)
  ) end
  from (select app.current_user_id() as uid) x left join public.app_users u on u.id = x.uid
$$;
revoke all on function public.whoami() from public, anon;
grant execute on function public.whoami() to authenticated;

-- Kobler en verifisert identitet (iss/sub) til en ConnectHub-bruker. Finnes brukeren (samme e-post), gjenbrukes den.
-- Kalles bare av serveren (service_role) etter at e-posten er bekreftet, eller av driftspersonell. Ingen klienttilgang.
create or replace function app.link_identity(p_issuer text, p_subject text, p_email text, p_full_name text default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v uuid;
begin
  select user_id into v from public.user_identities where provider = p_issuer and subject = p_subject;
  if v is not null then return v; end if;
  select id into v from public.app_users where lower(email) = lower(p_email);
  if v is null then
    insert into public.app_users (email, full_name) values (p_email, nullif(btrim(p_full_name), '')) returning id into v;
  end if;
  insert into public.user_identities (provider, subject, user_id) values (p_issuer, p_subject, v);
  return v;
end $$;
revoke all on function app.link_identity(text, text, text, text) from public, anon, authenticated;
