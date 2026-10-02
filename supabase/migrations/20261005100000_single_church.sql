-- Én menighet om gangen for User og Admin, og fjerning av medlemskap (bare connecthub-dev først).
--
-- Regler:
--   * En bruker uten global rolle (Developer/Moderator) kan ha høyst ÉTT aktivt medlemskap. Deaktiverte og fjernede
--     medlemskap teller ikke, men kan ikke aktiveres igjen så lenge brukeren er aktiv i en annen menighet.
--     Developer og Moderator er unntatt (uendret: de kan være medlem av flere menigheter).
--   * Håndheves av en trigger på public.memberships, så ALLE veier stoppes: invitasjoner (accept_invitation),
--     direkte innsetting/oppdatering via API, add_membership og aktivering av deaktiverte medlemskap.
--     Triggeren tar en transaksjonslås per bruker, så samtidige forsøk køes og det andre ser det første.
--   * Ny status 'removed' (fjernet): raden og historikken beholdes, men gir ingen tilgang (alle tilgangssjekker krever
--     status = 'active'). Fjerning skjer bare via remove_membership; direkte oppdatering til/fra 'removed' er stengt.
--   * Eksisterende medlemskap endres ikke av denne migreringen.
--
-- Egne feilkoder (SQLSTATE): CH001 = allerede medlem av en annen menighet, CH003 = menigheten blir stående uten Admin.

alter table public.memberships drop constraint memberships_status_check,
  add constraint memberships_status_check check (status in ('active', 'disabled', 'removed'));

-- Har brukeren en aktiv global rolle (Developer/Moderator)? Uavhengig av MFA – det gjelder hvem brukeren ER, ikke økten.
create or replace function app.has_global_role_row(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.user_roles r where r.user_id = p_user and r.role in ('developer', 'moderator')
                 and r.church_id is null and r.revoked_at is null)
$$;
revoke all on function app.has_global_role_row(uuid) from public, anon, authenticated;

-- Aktivt medlem av en ANNEN menighet enn p_church (og ikke unntatt)?
create or replace function app.member_elsewhere(p_user uuid, p_church uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select not app.has_global_role_row(p_user) and exists (
    select 1 from public.memberships m where m.user_id = p_user and m.church_id <> p_church and m.status = 'active')
$$;
revoke all on function app.member_elsewhere(uuid, uuid) from public, anon, authenticated;

create or replace function app.single_church_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'active' and (tg_op = 'INSERT' or old.status is distinct from 'active') then
    -- Kø per bruker: et samtidig forsøk venter til dette er ferdig, og ser da resultatet.
    perform pg_advisory_xact_lock(hashtextextended('ch:membership:' || new.user_id::text, 0));
    if app.member_elsewhere(new.user_id, new.church_id) then
      raise exception 'Brukeren er allerede medlem av en annen menighet' using errcode = 'CH001'; end if;
  end if;
  return new;
end $$;
revoke all on function app.single_church_guard() from public, anon, authenticated;
create trigger memberships_single_church before insert or update of status on public.memberships
  for each row execute function app.single_church_guard();

-- Direkte oppdatering (Admin/stab via API): bare mellom 'active' og 'disabled'. Fjernede rader kan ikke røres direkte.
drop policy memberships_update on public.memberships;
create policy memberships_update on public.memberships for update to authenticated
  using (status <> 'removed' and ((app.is_church_admin(church_id) and user_id <> app.current_user_id()) or app.is_staff()))
  with check (status in ('active', 'disabled') and ((app.is_church_admin(church_id) and user_id <> app.current_user_id()) or app.is_staff()));

-- Stab legger en bruker til i en menighet (ny rad, eller en fjernet/deaktivert rad aktiveres igjen). Regelen om én
-- menighet håndheves av triggeren.
create or replace function public.add_membership(p_user uuid, p_church uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := app.current_user_id();
begin
  if v_actor is null or not app.is_staff() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  if not exists (select 1 from public.app_users where id = p_user and status = 'active') then
    raise exception 'Ukjent eller deaktivert bruker' using errcode = '22023'; end if;
  if not exists (select 1 from public.churches where id = p_church and status = 'active') then
    raise exception 'Menigheten er ikke aktiv' using errcode = '22023'; end if;
  insert into public.memberships (user_id, church_id) values (p_user, p_church)
    on conflict (user_id, church_id) do update set status = 'active' where public.memberships.status <> 'active';
end $$;

-- Fjern en bruker fra en menighet. Stab (Developer/Moderator med MFA): alle. Admin: andre medlemmer i egen menighet.
-- Ingen kan fjerne seg selv. Er brukeren Admin i menigheten, fjernes Admin-rollen samtidig – men bare stab kan gjøre
-- det, og bare med p_allow_no_admin = true (menigheten står da uten Admin til stab utnevner en ny).
create or replace function public.remove_membership(p_user uuid, p_church uuid, p_reason text default null, p_allow_no_admin boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := app.current_user_id(); m public.memberships; v_admin uuid; v_left int;
begin
  if v_actor is null then raise exception 'Ikke innlogget' using errcode = '42501'; end if;
  if not (app.is_staff() or app.is_church_admin(p_church)) then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  if p_user = v_actor then raise exception 'Du kan ikke fjerne deg selv fra en menighet' using errcode = '42501'; end if;
  select * into m from public.memberships where user_id = p_user and church_id = p_church for update;
  if not found or m.status = 'removed' then raise exception 'Fant ikke medlemskapet' using errcode = '22023'; end if;
  select id into v_admin from public.user_roles where user_id = p_user and church_id = p_church and role = 'church_admin' and revoked_at is null;
  if v_admin is not null then
    if not app.is_staff() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
    if not coalesce(p_allow_no_admin, false) then
      raise exception 'Brukeren er Admin i menigheten. Menigheten står da uten Admin.' using errcode = 'CH003'; end if;
    update public.user_roles set revoked_at = now(), revoked_by = v_actor, reason = 'Fjernet fra menigheten' where id = v_admin;
  end if;
  update public.memberships set status = 'removed' where user_id = p_user and church_id = p_church;
  select count(*) into v_left from public.memberships where user_id = p_user and status = 'active';
  insert into public.audit_logs (actor_user_id, action, target_type, target_id, church_id, reason, meta)
  values (v_actor, 'memberships.remove', 'memberships', p_user::text || ':' || p_church::text, p_church, left(p_reason, 500),
          jsonb_build_object('previous_status', m.status, 'admin_role_revoked', v_admin is not null, 'active_memberships_left', v_left));
  return jsonb_build_object('ok', true, 'admin_role_revoked', v_admin is not null, 'active_memberships_left', v_left,
    'church_without_admin', v_admin is not null);
end $$;

-- Invitasjon: avvis med en gang hvis personen (eksisterende konto) allerede er aktiv i en annen menighet.
-- Ellers som før (20261001130000_admin.sql).
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

-- Godkjenning: gir en tydelig feil (og invitasjonen blir stående) hvis personen allerede er aktiv i en annen menighet.
-- Triggeren stopper også samtidige godkjenninger. Ellers som før (20261001130000_admin.sql).
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
  end;
  update public.invitations set status = 'accepted', accepted_at = now(), accepted_by = v where id = i.id;
  return jsonb_build_object('ok', true, 'user_id', v, 'role', i.role, 'church_id', i.church_id);
end $$;

revoke all on function public.add_membership(uuid, uuid), public.remove_membership(uuid, uuid, text, boolean) from public, anon;
grant execute on function public.add_membership(uuid, uuid), public.remove_membership(uuid, uuid, text, boolean) to authenticated;
