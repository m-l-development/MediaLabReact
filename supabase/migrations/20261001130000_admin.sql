-- ConnectHub P5 · Administrasjon: invitasjoner, brukerstatus og systemstatus. Vanlig PostgreSQL.
-- Invitasjoner: serveren lager tokenet og sender e-posten. Databasen får bare SHA-256 av tokenet, og den som oppretter
-- invitasjonen ser aldri selve lenken. Godkjenning krever innlogging med den inviterte, bekreftede e-postadressen (sjekkes
-- av serveren) og skjer i accept_invitation, som bare serveren (service_role) kan kalle.

-- Én ventende invitasjon per e-post, menighet og rolle.
create unique index invitations_pending_uniq on public.invitations
  (lower(email), coalesce(church_id, '00000000-0000-0000-0000-000000000000'::uuid), role) where status = 'pending';
create index invitations_creator_idx on public.invitations (created_by, created_at desc);

-- Har p_actor (uten MFA-sjekk) rett til å invitere til denne rollen? Brukes både ved oppretting (med MFA via JWT) og ved
-- godkjenning (sjekker at den som inviterte fortsatt har rollen sin).
create or replace function app.may_invite(p_actor uuid, p_role text, p_church uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.app_users u where u.id = p_actor and u.status = 'active') and case
    when p_role in ('developer', 'moderator') then p_church is null and exists (
      select 1 from public.user_roles r where r.user_id = p_actor and r.role = 'developer' and r.church_id is null and r.revoked_at is null)
    when p_role = 'church_admin' then p_church is not null and exists (
      select 1 from public.user_roles r where r.user_id = p_actor and r.role in ('developer', 'moderator') and r.church_id is null and r.revoked_at is null)
    when p_role = 'user' then p_church is not null and (
      exists (select 1 from public.user_roles r where r.user_id = p_actor and r.role in ('developer', 'moderator') and r.church_id is null and r.revoked_at is null)
      or exists (select 1 from public.user_roles r join public.memberships m on m.user_id = r.user_id and m.church_id = r.church_id and m.status = 'active'
                 where r.user_id = p_actor and r.role = 'church_admin' and r.church_id = p_church and r.revoked_at is null))
    else false end
$$;
revoke all on function app.may_invite(uuid, text, uuid) from public, anon, authenticated;

-- Oppretter (eller fornyer) en invitasjon. Kalles av serveren med INNLOGGET brukers token, så MFA og roller sjekkes her.
create or replace function public.create_invitation(p_email text, p_church uuid, p_role text, p_token_hash text, p_days int default 7)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := app.current_user_id(); v_email text := lower(btrim(p_email)); v_id uuid; v_name text;
begin
  if v_actor is null then raise exception 'Ikke innlogget' using errcode = '42501'; end if;
  -- Globale roller og alle roller for stab krever MFA (aal2), som ellers i RLS.
  if (p_role in ('developer', 'moderator', 'church_admin') or not app.is_church_admin(p_church)) and not app.mfa_ok() then
    raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  if not app.may_invite(v_actor, p_role, p_church) then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  if p_days is null or p_days < 1 or p_days > 14 then raise exception 'Ugyldig gyldighet' using errcode = '22023'; end if;
  if p_church is not null then
    select name into v_name from public.churches where id = p_church and status = 'active';
    if v_name is null then raise exception 'Menigheten er ikke aktiv' using errcode = '22023'; end if;
  end if;
  if p_role = 'user' and exists (select 1 from public.memberships m join public.app_users u on u.id = m.user_id
      where m.church_id = p_church and m.status = 'active' and lower(u.email) = v_email) then
    raise exception 'Personen er allerede medlem' using errcode = '23505'; end if;
  if (select count(*) from public.invitations where created_by = v_actor and created_at > now() - interval '1 day') >= 100 then
    raise exception 'For mange invitasjoner siste døgn' using errcode = '54000'; end if;
  update public.invitations set status = 'revoked'
    where status = 'pending' and lower(email) = v_email and role = p_role and church_id is not distinct from p_church;
  insert into public.invitations (email, church_id, role, token_hash, expires_at, created_by)
  values (v_email, p_church, p_role, p_token_hash, now() + make_interval(days => p_days), v_actor) returning id into v_id;
  return jsonb_build_object('id', v_id, 'email', v_email, 'church_name', v_name, 'role', p_role);
end $$;

-- Ny lenke for en ventende invitasjon (gammel lenke slutter å virke).
create or replace function public.reissue_invitation(p_id uuid, p_token_hash text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := app.current_user_id(); i public.invitations; v_name text;
begin
  if v_actor is null then raise exception 'Ikke innlogget' using errcode = '42501'; end if;
  select * into i from public.invitations where id = p_id and status = 'pending' for update;
  if not found then raise exception 'Fant ikke ventende invitasjon' using errcode = '22023'; end if;
  if (i.role in ('developer', 'moderator', 'church_admin') or not app.is_church_admin(i.church_id)) and not app.mfa_ok() then
    raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  if not app.may_invite(v_actor, i.role, i.church_id) then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  update public.invitations set token_hash = p_token_hash, expires_at = now() + interval '7 days' where id = p_id;
  select name into v_name from public.churches where id = i.church_id;
  return jsonb_build_object('id', i.id, 'email', i.email, 'church_name', v_name, 'role', i.role);
end $$;

create or replace function public.revoke_invitation(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := app.current_user_id(); i public.invitations;
begin
  if v_actor is null then raise exception 'Ikke innlogget' using errcode = '42501'; end if;
  select * into i from public.invitations where id = p_id and status = 'pending' for update;
  if not found then raise exception 'Fant ikke ventende invitasjon' using errcode = '22023'; end if;
  if not (app.is_staff() or i.created_by = v_actor or (i.role = 'user' and app.is_church_admin(i.church_id))) then
    raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  update public.invitations set status = 'revoked' where id = p_id;
end $$;

-- Godkjenning. BARE serveren: den har verifisert at innlogget konto har bekreftet e-post lik invitasjonens.
-- Returnerer {ok:false,error} i stedet for å kaste, så utløp kan lagres.
create or replace function public.accept_invitation(p_token_hash text, p_issuer text, p_subject text, p_email text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare i public.invitations; v uuid;
begin
  select * into i from public.invitations where token_hash = p_token_hash for update;
  if not found or i.status <> 'pending' then return jsonb_build_object('ok', false, 'error', 'invitation_invalid'); end if;
  if i.expires_at < now() then
    update public.invitations set status = 'expired' where id = i.id;
    return jsonb_build_object('ok', false, 'error', 'invitation_expired'); end if;
  if lower(btrim(p_email)) <> lower(i.email) then return jsonb_build_object('ok', false, 'error', 'wrong_email'); end if;
  if not app.may_invite(i.created_by, i.role, i.church_id) then return jsonb_build_object('ok', false, 'error', 'inviter_lost_access'); end if;
  if i.church_id is not null and not exists (select 1 from public.churches where id = i.church_id and status = 'active') then
    return jsonb_build_object('ok', false, 'error', 'church_inactive'); end if;
  v := app.link_identity(p_issuer, p_subject, i.email);
  if exists (select 1 from public.app_users where id = v and status <> 'active') then
    return jsonb_build_object('ok', false, 'error', 'user_disabled'); end if;
  -- Resten av transaksjonen loggføres med den nye brukeren som utfører.
  perform set_config('request.jwt.claims', jsonb_build_object('iss', p_issuer, 'sub', p_subject)::text, true);
  if i.church_id is not null then
    insert into public.memberships (user_id, church_id) values (v, i.church_id)
      on conflict (user_id, church_id) do update set status = 'active' where public.memberships.status <> 'active';
  end if;
  begin
    if i.role in ('church_admin', 'developer', 'moderator') and not exists (select 1 from public.user_roles
        where user_id = v and role = i.role and church_id is not distinct from i.church_id and revoked_at is null) then
      insert into public.user_roles (user_id, role, church_id, assigned_by, reason) values (v, i.role, i.church_id, i.created_by, 'Invitasjon');
    end if;
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'error', 'admin_exists');
  end;
  update public.invitations set status = 'accepted', accepted_at = now(), accepted_by = v where id = i.id;
  return jsonb_build_object('ok', true, 'user_id', v, 'role', i.role, 'church_id', i.church_id);
end $$;

-- Aktivere/deaktivere en bruker globalt. Bare stab (med MFA). Moderator kan ikke endre Developer. Ingen kan endre seg selv.
create or replace function public.set_user_status(p_user uuid, p_status text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := app.current_user_id();
begin
  if v_actor is null or not app.is_staff() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  if p_user = v_actor then raise exception 'Du kan ikke endre din egen status' using errcode = '42501'; end if;
  if p_status not in ('active', 'disabled') then raise exception 'Ugyldig status' using errcode = '22023'; end if;
  if not app.is_developer() and exists (select 1 from public.user_roles where user_id = p_user and role = 'developer' and revoked_at is null) then
    raise exception 'Bare Developer kan endre en Developer' using errcode = '42501'; end if;
  update public.app_users set status = p_status where id = p_user;
  if not found then raise exception 'Ukjent bruker' using errcode = '22023'; end if;
end $$;

-- Systemstatus for stab.
create or replace function public.system_status() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not app.is_staff() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  return jsonb_build_object(
    'users', (select count(*) from public.app_users where status = 'active'),
    'users_disabled', (select count(*) from public.app_users where status <> 'active'),
    'churches', (select count(*) from public.churches where status = 'active'),
    'churches_other', (select count(*) from public.churches where status <> 'active'),
    'invitations_pending', (select count(*) from public.invitations where status = 'pending' and expires_at > now()),
    'files', (select count(*) from public.files),
    'files_bytes', (select coalesce(sum(file_size), 0) from public.files),
    'audit_last_24h', (select count(*) from public.audit_logs where created_at > now() - interval '1 day'),
    'db_time', now());
end $$;

revoke all on function public.create_invitation(text, uuid, text, text, int), public.reissue_invitation(uuid, text),
  public.revoke_invitation(uuid), public.accept_invitation(text, text, text, text), public.set_user_status(uuid, text),
  public.system_status() from public, anon, authenticated;
grant execute on function public.create_invitation(text, uuid, text, text, int), public.reissue_invitation(uuid, text),
  public.revoke_invitation(uuid), public.set_user_status(uuid, text), public.system_status() to authenticated;
-- accept_invitation: bare serveren. (service_role finnes hos Supabase; ved bytte: rollen serveren bruker.)
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'grant execute on function public.accept_invitation(text, text, text, text) to service_role';
  end if;
end $$;
