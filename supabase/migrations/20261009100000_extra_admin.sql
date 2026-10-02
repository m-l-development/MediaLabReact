-- ConnectHub · Developer og Moderator kan legge seg selv til (og fjerne seg selv) som EKSTRA Admin i en menighet
-- (bare connecthub-dev først). Menighetens faste Admin (høyst én, som før) er uendret.
--
--   * user_roles.extra_admin markerer en ekstra Admin-rolle. Den unike regelen «én aktiv Admin per menighet» gjelder nå
--     bare faste Admin-roller, så en ekstra Admin kommer i tillegg.
--   * add_self_as_admin: bare Developer/Moderator med MFA (app.is_staff), bare aktive menigheter. Er brukeren ikke aktivt
--     medlem, legges medlemskapet til (eller gjenopprettes), og det merkes (extra_membership) så det fjernes igjen sammen
--     med rollen. Admin i menigheten varsles. Alt loggføres (user_roles- og memberships-triggerne + roles.extra_admin_*).
--   * remove_self_as_admin: fjerner bare egen ekstra Admin-rolle (og medlemskapet hvis det kom med rollen). Krever ikke
--     MFA – det er alltid trygt å gi fra seg tilgang.
--   * remove_membership: en ekstra Admin kan fjernes uten p_allow_no_admin (menigheten har fortsatt sin faste Admin).
-- Ingen eksisterende rader endres (nye kolonner har standardverdien false).

alter table public.user_roles add column extra_admin boolean not null default false,
  add column extra_membership boolean not null default false;
alter table public.user_roles add constraint user_roles_extra_admin check (not extra_admin or role = 'church_admin');
alter table public.user_roles add constraint user_roles_extra_membership check (not extra_membership or extra_admin);
grant select (extra_admin, extra_membership) on public.user_roles to authenticated;

drop index public.user_roles_one_admin_per_church;
create unique index user_roles_one_admin_per_church on public.user_roles (church_id) where role = 'church_admin' and revoked_at is null and not extra_admin;

create or replace function public.add_self_as_admin(p_church uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := app.current_user_id(); v_cname text; m public.memberships; v_mem boolean := false; v_id uuid; v_who text;
begin
  if v_actor is null or not app.is_staff() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  select name into v_cname from public.churches where id = p_church and status = 'active';
  if v_cname is null then raise exception 'Menigheten må være aktiv' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('ch:membership:' || v_actor::text, 0));   -- samme lås som medlemskaps- og rollevaktene
  if exists (select 1 from public.user_roles where user_id = v_actor and church_id = p_church and role = 'church_admin' and revoked_at is null) then
    return jsonb_build_object('ok', true, 'already', true);
  end if;
  select * into m from public.memberships where user_id = v_actor and church_id = p_church for update;
  if m.user_id is null then
    insert into public.memberships (user_id, church_id) values (v_actor, p_church); v_mem := true;
  elsif m.status <> 'active' then
    update public.memberships set status = 'active' where user_id = v_actor and church_id = p_church; v_mem := true;
  end if;
  insert into public.user_roles (user_id, role, church_id, assigned_by, reason, extra_admin, extra_membership)
  values (v_actor, 'church_admin', p_church, v_actor, 'Ekstra Admin (lagt til av seg selv)', true, v_mem) returning id into v_id;
  select coalesce(nullif(btrim(full_name), ''), email) into v_who from public.app_users where id = v_actor;
  insert into public.audit_logs (actor_user_id, action, target_type, target_id, church_id, meta)
  values (v_actor, 'roles.extra_admin_add', 'user_roles', v_id::text, p_church, jsonb_build_object('church', v_cname, 'membership_added', v_mem));
  perform app.notify(r.user_id, 'message', 'Ekstra Admin i menigheten',
    v_who || ' (' || case when app.is_developer() then 'Developer' else 'Moderator' end || ') er lagt til som ekstra Admin i «' || v_cname || '». Den faste Admin-rollen er uendret.',
    '/connecthub-admin.dc.html#/oversikt', p_church)
  from public.user_roles r where r.church_id = p_church and r.role = 'church_admin' and r.revoked_at is null and r.user_id <> v_actor;
  return jsonb_build_object('ok', true, 'already', false, 'membership_added', v_mem);
end $$;

create or replace function public.remove_self_as_admin(p_church uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := app.current_user_id(); r public.user_roles;
begin
  if v_actor is null then raise exception 'Ikke innlogget' using errcode = '42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended('ch:membership:' || v_actor::text, 0));
  select * into r from public.user_roles where user_id = v_actor and church_id = p_church and role = 'church_admin' and revoked_at is null and extra_admin for update;
  if r.id is null then raise exception 'Du er ikke ekstra Admin i denne menigheten' using errcode = '22023'; end if;
  update public.user_roles set revoked_at = now(), revoked_by = v_actor where id = r.id;
  if r.extra_membership then
    update public.memberships set status = 'removed' where user_id = v_actor and church_id = p_church and status = 'active';
  end if;
  insert into public.audit_logs (actor_user_id, action, target_type, target_id, church_id, meta)
  values (v_actor, 'roles.extra_admin_remove', 'user_roles', r.id::text, p_church, jsonb_build_object('membership_removed', r.extra_membership));
  return jsonb_build_object('ok', true, 'membership_removed', r.extra_membership);
end $$;

revoke all on function public.add_self_as_admin(uuid), public.remove_self_as_admin(uuid) from public, anon;
grant execute on function public.add_self_as_admin(uuid), public.remove_self_as_admin(uuid) to authenticated;

-- Som i 20261005100000_single_church.sql, men en EKSTRA Admin kan fjernes uten p_allow_no_admin (den faste Admin er igjen).
create or replace function public.remove_membership(p_user uuid, p_church uuid, p_reason text default null, p_allow_no_admin boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := app.current_user_id(); m public.memberships; v_admin uuid; v_extra boolean := false; v_left int;
begin
  if v_actor is null then raise exception 'Ikke innlogget' using errcode = '42501'; end if;
  if not (app.is_staff() or app.is_church_admin(p_church)) then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  if p_user = v_actor then raise exception 'Du kan ikke fjerne deg selv fra en menighet' using errcode = '42501'; end if;
  select * into m from public.memberships where user_id = p_user and church_id = p_church for update;
  if not found or m.status = 'removed' then raise exception 'Fant ikke medlemskapet' using errcode = '22023'; end if;
  select id, extra_admin into v_admin, v_extra from public.user_roles where user_id = p_user and church_id = p_church and role = 'church_admin' and revoked_at is null;
  if v_admin is not null then
    if not app.is_staff() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
    if not coalesce(p_allow_no_admin, false) and not v_extra then
      raise exception 'Brukeren er Admin i menigheten. Menigheten står da uten Admin.' using errcode = 'CH003'; end if;
    update public.user_roles set revoked_at = now(), revoked_by = v_actor, reason = 'Fjernet fra menigheten' where id = v_admin;
  end if;
  update public.memberships set status = 'removed' where user_id = p_user and church_id = p_church;
  select count(*) into v_left from public.memberships where user_id = p_user and status = 'active';
  insert into public.audit_logs (actor_user_id, action, target_type, target_id, church_id, reason, meta)
  values (v_actor, 'memberships.remove', 'memberships', p_user::text || ':' || p_church::text, p_church, left(p_reason, 500),
          jsonb_build_object('previous_status', m.status, 'admin_role_revoked', v_admin is not null, 'extra_admin', v_extra, 'active_memberships_left', v_left));
  return jsonb_build_object('ok', true, 'admin_role_revoked', v_admin is not null, 'active_memberships_left', v_left,
    'church_without_admin', v_admin is not null and not v_extra);
end $$;
