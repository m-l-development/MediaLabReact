-- ConnectHub · Developer/Moderator får Admin-rettigheter i en menighet BARE via forespørsel (bare connecthub-dev først).
--
-- Rotårsak (sikkerhetsfeil): forespørselen kunne omgås.
--   1. add_self_as_admin (dagens app): ga Admin med en gang (produksjon), og etter 20261020100000 30 dager uten valgt
--      varighet når menigheten manglet Admin.
--   2. Invitasjon: stab kunne invitere sin egen e-post som Admin; accept_invitation ga en FAST Admin-rolle uten godkjenning
--      (når menigheten ikke hadde fast Admin).
--   3. assign_role: en Developer/Moderator kunne gjøre en annen Developer/Moderator til fast Admin.
-- Rettingen håndheves i databasen for alle veier (også fremtidige funksjoner): en trigger på user_roles stopper enhver ny
-- eller gjenåpnet Admin-rolle for en person med global rolle, med mindre den er midlertidig (extra_admin) og knyttet til en
-- forespørsel for samme person og menighet (admin_access_requests). Forespørselen opprettes bare av request_admin_access:
-- godkjent av en Admin i menigheten, eller gitt med valgt varighet når menigheten ikke har noen Admin.
-- Ingen eksisterende rader endres.

-- ---------- 1. Felles vakt for alle veier ----------
create or replace function app.staff_admin_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.role = 'church_admin' and new.revoked_at is null
     and (tg_op = 'INSERT' or old.revoked_at is not null or old.extra_admin is distinct from new.extra_admin or old.granted_via is distinct from new.granted_via) then
    if new.extra_admin then
      if new.granted_via is null or not exists (select 1 from public.admin_access_requests q where q.id = new.granted_via
           and q.requester = new.user_id and q.church_id = new.church_id and q.status in ('pending', 'approved')) then
        raise exception 'Midlertidig Admin-tilgang krever en forespørsel' using errcode = 'CH021'; end if;
    elsif app.has_global_role_row(new.user_id) then
      raise exception 'Developer og Moderator får Admin-tilgang i en menighet bare via forespørsel' using errcode = 'CH021';
    end if;
  end if;
  return new;
end $$;
revoke all on function app.staff_admin_guard() from public, anon, authenticated;
create trigger user_roles_staff_admin_guard before insert or update on public.user_roles
  for each row execute function app.staff_admin_guard();

-- ---------- 2. Den gamle «legg meg til som ekstra Admin» er stengt ----------
create or replace function public.add_self_as_admin(p_church uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  raise exception 'Bruk «Be om midlertidig Admin-tilgang»: Admin i menigheten må godkjenne' using errcode = '42501';
end $$;
revoke all on function public.add_self_as_admin(uuid) from public, anon, authenticated;

-- ---------- 3. Invitasjoner: ingen Admin-invitasjon til seg selv eller til Developer/Moderator ----------
-- Som i 20261005100000_single_church.sql, med to nye kontroller (tydelig feil før noe lagres).
create or replace function public.create_invitation(p_email text, p_church uuid, p_role text, p_token_hash text, p_days int default 7)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := app.current_user_id(); v_email text := lower(btrim(p_email)); v_id uuid; v_name text;
begin
  if v_actor is null then raise exception 'Ikke innlogget' using errcode = '42501'; end if;
  if (p_role in ('developer', 'moderator', 'church_admin') or not app.is_church_admin(p_church)) and not app.mfa_ok() then
    raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  if not app.may_invite(v_actor, p_role, p_church) then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  if p_role = 'church_admin' and exists (select 1 from public.app_users u where u.id = v_actor and lower(u.email) = v_email) then
    raise exception 'Du kan ikke invitere deg selv som Admin' using errcode = '42501'; end if;
  if p_role = 'church_admin' and exists (select 1 from public.app_users u where lower(u.email) = v_email and app.has_global_role_row(u.id)) then
    raise exception 'Developer og Moderator får Admin-tilgang i en menighet bare via forespørsel' using errcode = 'CH021'; end if;
  if p_days is null or p_days < 1 or p_days > 14 then raise exception 'Ugyldig gyldighet' using errcode = '22023'; end if;
  if p_church is not null then
    select name into v_name from public.churches where id = p_church and status = 'active';
    if v_name is null then raise exception 'Menigheten er ikke aktiv' using errcode = '22023'; end if;
  end if;
  if p_role = 'user' and exists (select 1 from public.memberships m join public.app_users u on u.id = m.user_id
      where m.church_id = p_church and m.status = 'active' and lower(u.email) = v_email) then
    raise exception 'Personen er allerede medlem' using errcode = '23505'; end if;
  if p_church is not null and exists (select 1 from public.app_users u where lower(u.email) = v_email and app.member_elsewhere(u.id, p_church)) then
    raise exception 'Personen er allerede medlem av en annen menighet' using errcode = 'CH001'; end if;
  if (select count(*) from public.invitations where created_by = v_actor and created_at > now() - interval '1 day') >= 100 then
    raise exception 'For mange invitasjoner siste døgn' using errcode = '54000'; end if;
  update public.invitations set status = 'revoked'
    where status = 'pending' and lower(email) = v_email and role = p_role and church_id is not distinct from p_church;
  insert into public.invitations (email, church_id, role, token_hash, expires_at, created_by)
  values (v_email, p_church, p_role, p_token_hash, now() + make_interval(days => p_days), v_actor) returning id into v_id;
  return jsonb_build_object('id', v_id, 'email', v_email, 'church_name', v_name, 'role', p_role);
end $$;

-- Som i 20261005100000_single_church.sql; en Admin-invitasjon til en som er (eller er blitt) Developer/Moderator gir
-- en tydelig feil i stedet for en Admin-rolle (vakten over), og invitasjonen blir stående ubrukt.
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
  perform set_config('request.jwt.claims', jsonb_build_object('iss', p_issuer, 'sub', p_subject)::text, true);
  begin
    if i.church_id is not null then
      insert into public.memberships (user_id, church_id) values (v, i.church_id)
        on conflict (user_id, church_id) do update set status = 'active' where public.memberships.status <> 'active';
    end if;
    if i.role in ('church_admin', 'developer', 'moderator') and not exists (select 1 from public.user_roles
        where user_id = v and role = i.role and church_id is not distinct from i.church_id and revoked_at is null) then
      insert into public.user_roles (user_id, role, church_id, assigned_by, reason) values (v, i.role, i.church_id, i.created_by, 'Invitasjon');
    end if;
  exception
    when unique_violation then return jsonb_build_object('ok', false, 'error', 'admin_exists');
    when sqlstate 'CH001' then return jsonb_build_object('ok', false, 'error', 'already_member_elsewhere');
    when sqlstate 'CH021' then return jsonb_build_object('ok', false, 'error', 'staff_use_request');
  end;
  update public.invitations set status = 'accepted', accepted_at = now(), accepted_by = v where id = i.id;
  return jsonb_build_object('ok', true, 'user_id', v, 'role', i.role, 'church_id', i.church_id);
end $$;
