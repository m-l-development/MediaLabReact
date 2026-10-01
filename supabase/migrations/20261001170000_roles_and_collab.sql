-- ConnectHub · Roller og samarbeid (etter brukerens ønske, 2026-10-01). Vanlig PostgreSQL. Ingen data slettes.
-- Fire separate roller:
--   Developer  – teknisk utvikling og systemadministrasjon (alt det «stab» kunne før). Kan også feilsøke samarbeid.
--   Moderator  – setter opp og administrerer samarbeid. Har IKKE lenger admin-rettigheter (brukere, menigheter, filer,
--                invitasjoner, abonnement, menighetens livsløp).
--   Admin      – (church_admin) brukere og filer i egen menighet. Har IKKE tilgang til samarbeid, heller ikke lesing.
--   User       – medlem: delte filer, nedlasting fra Faste, og samarbeid som Moderator har gjort tilgjengelig.

-- «Stab» betyr nå systemadministrasjon = Developer. Alle eksisterende policyer og funksjoner som bruker app.is_staff()
-- følger automatisk med (menigheter, medlemskap, roller, invitasjoner, brukerstatus, filer, abonnement, livsløp, logg).
create or replace function app.is_staff() returns boolean language sql stable set search_path = '' as $$ select app.is_developer() $$;
-- Samarbeidsansvarlig: Moderator (eller Developer for teknisk tilgang). Krever MFA som før (has_global_role).
create or replace function app.is_collab_admin() returns boolean language sql stable set search_path = '' as $$ select app.is_moderator() or app.is_developer() $$;
revoke all on function app.is_collab_admin() from public, anon;
grant execute on function app.is_collab_admin() to authenticated;

-- Invitasjoner: Admin-rollen og Moderator/Developer inviteres bare av Developer; vanlige brukere av Developer eller Admin.
create or replace function app.may_invite(p_actor uuid, p_role text, p_church uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.app_users u where u.id = p_actor and u.status = 'active') and case
    when p_role in ('developer', 'moderator', 'church_admin') then (p_role = 'church_admin') = (p_church is not null) and exists (
      select 1 from public.user_roles r where r.user_id = p_actor and r.role = 'developer' and r.church_id is null and r.revoked_at is null)
    when p_role = 'user' then p_church is not null and (
      exists (select 1 from public.user_roles r where r.user_id = p_actor and r.role = 'developer' and r.church_id is null and r.revoked_at is null)
      or exists (select 1 from public.user_roles r join public.memberships m on m.user_id = r.user_id and m.church_id = r.church_id and m.status = 'active'
                 where r.user_id = p_actor and r.role = 'church_admin' and r.church_id = p_church and r.revoked_at is null))
    else false end
$$;

-- ---------- Samarbeid: bare Moderator (og Developer) administrerer; Admin har ingen tilgang ----------
alter table public.spaces alter column owner_church_id drop not null;   -- områder eies ikke lenger av en menighet

-- Medlem i en menighet som deltar aktivt – men ikke i rollen Admin for den menigheten (Admin har ikke samarbeid).
create or replace function app.in_space(p_space uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.space_members sm join public.spaces s on s.id = sm.space_id and s.status = 'active'
                 where sm.space_id = p_space and sm.status = 'active' and app.is_member(sm.church_id) and not app.is_church_admin(sm.church_id))
$$;
create or replace function app.space_admin(p_space uuid) returns boolean language sql stable security definer set search_path = '' as $$ select app.is_collab_admin() $$;
create or replace function app.can_see_space(p_space uuid) returns boolean language sql stable security definer set search_path = '' as $$ select app.in_space(p_space) or app.is_collab_admin() $$;

-- Filer: deltakere ser delte filer; samarbeidsansvarlig ser fellesfiler i menigheter som deltar (for å velge hva som deles).
drop policy files_select on public.files;
create policy files_select on public.files for select to authenticated using (
  (visibility = 'church' and (app.is_member(church_id) or app.is_church_admin(church_id) or app.is_staff()))
  or (visibility = 'private' and uploaded_by = app.current_user_id())
  or (visibility = 'church' and exists (select 1 from public.space_files sf where sf.file_id = files.id and app.in_space(sf.space_id)))
  or (visibility = 'church' and app.is_collab_admin() and exists (select 1 from public.space_members sm where sm.church_id = files.church_id and sm.status = 'active')));
create or replace function app.visible_file_keys(p_ids uuid[]) returns table (id uuid, storage_key text, mime_type text)
language sql stable security definer set search_path = '' as $$
  select f.id, f.storage_key, f.mime_type from public.files f
  where f.id = any (p_ids) and (
    (f.visibility = 'church' and (app.is_member(f.church_id) or app.is_church_admin(f.church_id) or app.is_staff()))
    or (f.visibility = 'private' and f.uploaded_by = app.current_user_id())
    or (f.visibility = 'church' and exists (select 1 from public.space_files sf where sf.file_id = f.id and app.in_space(sf.space_id)))
    or (f.visibility = 'church' and app.is_collab_admin() and exists (select 1 from public.space_members sm where sm.church_id = f.church_id and sm.status = 'active')))
$$;

-- Navneliste over menigheter: for systemadministrasjon og samarbeidsansvarlige (ikke Admin – Admin har ikke samarbeid).
create or replace function public.church_directory() returns table (id uuid, name text)
language sql stable security definer set search_path = '' as $$
  select c.id, c.name from public.churches c where c.status = 'active' and app.is_collab_admin() order by c.name
$$;

create or replace function public.create_space(p_name text, p_owner uuid default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := app.current_user_id(); v uuid;
begin
  if v_actor is null or not app.is_collab_admin() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  insert into public.spaces (name, owner_church_id, created_by) values (btrim(p_name), p_owner, v_actor) returning id into v;
  if p_owner is not null then insert into public.space_members (space_id, church_id, status, invited_by) values (v, p_owner, 'active', v_actor); end if;
  insert into public.audit_logs (actor_user_id, action, target_type, target_id, church_id) values (v_actor, 'spaces.create', 'spaces', v::text, p_owner);
  return v;
end $$;

-- «Gjør tilgjengelig» for en menighet (aktiv med en gang – Moderator bestemmer). Medlemmene varsles.
create or replace function public.invite_to_space(p_space uuid, p_church uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := app.current_user_id(); v_name text;
begin
  if v_actor is null or not app.is_collab_admin() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  if not exists (select 1 from public.churches where id = p_church and status = 'active') then raise exception 'Menigheten er ikke aktiv' using errcode = '22023'; end if;
  insert into public.space_members (space_id, church_id, status, invited_by) values (p_space, p_church, 'active', v_actor)
    on conflict (space_id, church_id) do update set status = 'active', invited_by = v_actor;
  select name into v_name from public.spaces where id = p_space;
  perform app.notify(m.user_id, 'space_invite', 'Nytt samarbeid', 'Menigheten har fått tilgang til samarbeidsområdet «' || v_name || '».', '/connecthub-admin.dc.html#/samarbeid', p_church)
    from public.memberships m where m.church_id = p_church and m.status = 'active';
  insert into public.audit_logs (actor_user_id, action, target_type, target_id, church_id) values (v_actor, 'spaces.invite', 'spaces', p_space::text, p_church);
end $$;

-- Fjerne eller gjenåpne en menighets tilgang (bare samarbeidsansvarlig). Delte filer fra menigheten tas ut av området.
create or replace function public.set_space_membership(p_space uuid, p_church uuid, p_status text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := app.current_user_id();
begin
  if v_actor is null or not app.is_collab_admin() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  if p_status not in ('active', 'left') then raise exception 'Ugyldig status' using errcode = '22023'; end if;
  update public.space_members set status = p_status where space_id = p_space and church_id = p_church;
  if not found then raise exception 'Menigheten er ikke med i området' using errcode = '22023'; end if;
  if p_status <> 'active' then delete from public.space_files sf using public.files f where sf.space_id = p_space and f.id = sf.file_id and f.church_id = p_church; end if;
  insert into public.audit_logs (actor_user_id, action, target_type, target_id, church_id, meta) values (v_actor, 'spaces.membership', 'spaces', p_space::text, p_church, jsonb_build_object('status', p_status));
end $$;

create or replace function public.share_file_to_space(p_file uuid, p_space uuid, p_share boolean default true) returns void
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := app.current_user_id(); f public.files;
begin
  if v_actor is null or not app.is_collab_admin() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  select * into f from public.files where id = p_file;
  if f.id is null then raise exception 'Fant ikke filen' using errcode = '22023'; end if;
  if p_share then
    if f.visibility <> 'church' then raise exception 'Private filer kan ikke deles' using errcode = '22023'; end if;
    if not exists (select 1 from public.space_members where space_id = p_space and church_id = f.church_id and status = 'active') then
      raise exception 'Menigheten deltar ikke i området' using errcode = '22023'; end if;
    insert into public.space_files (space_id, file_id, shared_by) values (p_space, p_file, v_actor) on conflict do nothing;
  else
    delete from public.space_files where space_id = p_space and file_id = p_file;
  end if;
end $$;

-- Arkivere / gjenåpne et område (bare samarbeidsansvarlig).
create or replace function public.set_space_status(p_space uuid, p_status text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not app.is_collab_admin() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  if p_status not in ('active', 'archived') then raise exception 'Ugyldig status' using errcode = '22023'; end if;
  update public.spaces set status = p_status where id = p_space;
  if not found then raise exception 'Fant ikke området' using errcode = '22023'; end if;
end $$;
revoke all on function public.set_space_status(uuid, text) from public, anon;
grant execute on function public.set_space_status(uuid, text) to authenticated;

-- Systemstatus: Developer (som før «stab», nå bare Developer – følger av app.is_staff()).

-- Abonnement avgjøres nå bare av Developer – varsle bare dem.
create or replace function public.request_subscription(p_church uuid, p_plan text, p_free boolean, p_reason text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := app.current_user_id(); v uuid;
begin
  if v_actor is null or not app.is_church_admin(p_church) then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  if not exists (select 1 from public.plans where code = p_plan and active) then raise exception 'Ukjent plan' using errcode = '22023'; end if;
  insert into public.subscription_requests (church_id, plan, free_of_charge, reason, requested_by)
  values (p_church, p_plan, coalesce(p_free, false), left(p_reason, 1000), v_actor) returning id into v;
  perform app.notify(r.user_id, 'subscription', 'Ny abonnementsforespørsel', 'En menighet ber om «' || p_plan || '».', '/connecthub-admin.dc.html#/abonnement', p_church)
    from public.user_roles r where r.role = 'developer' and r.church_id is null and r.revoked_at is null;
  return v;
end $$;
