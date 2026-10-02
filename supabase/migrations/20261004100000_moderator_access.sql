-- Moderator får de vanlige administrasjonsfunksjonene som Developer har (bare connecthub-dev først).
--
-- Rettigheter, eksplisitt per rolle (begge krever MFA via app.has_global_role):
--
--   Funksjon                                                     Developer  Moderator
--   Systemadministrasjon (app.is_staff): brukere, menigheter,       ja         ja      (NY for Moderator)
--     medlemskap, invitasjoner, logg, abonnement, menighetens
--     status/eksport/sletting, systemstatus, meldinger
--   Gi/fjerne Admin-rollen i en menighet                            ja         ja      (NY for Moderator)
--   Kvoter, planer og samlet lagring                                ja         ja      (NY for Moderator)
--   Tilbakemeldinger (innboks og behandling)                        ja         ja      (uendret)
--   Samarbeid: koblinger mellom menigheter (app.is_collab_admin)    nei        ja      (uendret)
--   Gi, fjerne eller invitere Developer/Moderator                   ja         NEI
--   Deaktivere/aktivere en konto som har Developer/Moderator        ja         NEI     (NY sperre)
--   Endre egne roller eller egen status                             nei        nei     (uendret)
--   Filer: bare i menigheter der personen er medlem (A1/A2),        –          –       (uendret – ingen filregler endres)
--     Moderator ser bare metadata for Samarbeidsfiler
--
-- Ingen rolle-arv: app.is_staff() lister begge rollene, og hvert unntak sjekker app.is_developer() direkte.
-- Ingen tabeller, data eller filregler endres.

-- 1. Systemadministrasjon = Developer eller Moderator (eksplisitt).
create or replace function app.is_staff() returns boolean language sql stable set search_path = '' as $$ select app.is_developer() or app.is_moderator() $$;

-- 2. Invitasjoner: Admin-rollen inviteres av Developer eller Moderator; Developer/Moderator bare av Developer;
--    vanlige brukere av Developer, Moderator eller Admin i menigheten. (MFA kreves fortsatt i create_invitation/reissue_invitation.)
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

-- 3. Kontostatus: Moderator kan ikke deaktivere eller aktivere kontoer som har Developer- eller Moderator-rollen.
create or replace function public.set_user_status(p_user uuid, p_status text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := app.current_user_id();
begin
  if v_actor is null or not app.is_staff() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  if p_user = v_actor then raise exception 'Du kan ikke endre din egen status' using errcode = '42501'; end if;
  if p_status not in ('active', 'disabled') then raise exception 'Ugyldig status' using errcode = '22023'; end if;
  if not app.is_developer() and exists (select 1 from public.user_roles where user_id = p_user and role in ('developer', 'moderator') and church_id is null and revoked_at is null) then
    raise exception 'Bare Developer kan endre en Developer eller Moderator' using errcode = '42501'; end if;
  update public.app_users set status = p_status where id = p_user;
  if not found then raise exception 'Ukjent bruker' using errcode = '22023'; end if;
end $$;

-- 4. Kvoter, planer og samlet lagring: Developer eller Moderator. Kroppene er uendret bortsett fra tilgangssjekken.
-- public.church_quota_overview: som i 20261002100000_church_quota_standard.sql, men Developer ELLER Moderator (app.is_staff).
create or replace function public.church_quota_overview()
returns table (church_id uuid, storage_quota_mb int, quota_custom boolean, used_bytes bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if app.current_user_id() is null or not app.is_staff() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  return query select c.id, c.storage_quota_mb, c.quota_custom,
    (select coalesce(sum(f.file_size), 0)::bigint from public.files f where f.church_id = c.id) from public.churches c order by c.name;
end $$;

-- public.plans_admin: som i 20261002100000_church_quota_standard.sql, men Developer ELLER Moderator (app.is_staff).
create or replace function public.plans_admin()
returns table (code text, name text, storage_quota_mb int, price_nok_month int, active boolean)
language plpgsql stable security definer set search_path = '' as $$
begin
  if app.current_user_id() is null or not app.is_staff() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  return query select p.code, p.name, p.storage_quota_mb, p.price_nok_month, p.active from public.plans p order by p.storage_quota_mb, p.code;
end $$;

-- public.reset_church_quota: som i 20261002100000_church_quota_standard.sql, men Developer ELLER Moderator (app.is_staff).
create or replace function public.reset_church_quota(p_church uuid) returns int
language plpgsql security definer set search_path = '' as $$
declare v_old int;
begin
  if app.current_user_id() is null or not app.is_staff() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  select storage_quota_mb into v_old from public.churches where id = p_church for update;
  if v_old is null then raise exception 'Fant ikke menigheten' using errcode = '22023'; end if;
  update public.churches set storage_quota_mb = app.default_quota_mb() where id = p_church;
  perform app.log_quota(p_church, v_old, app.default_quota_mb(), 'tilbakestilt til standard');
  return app.default_quota_mb();
end $$;

-- public.set_church_quota: som i 20261002100000_church_quota_standard.sql, men Developer ELLER Moderator (app.is_staff).
create or replace function public.set_church_quota(p_church uuid, p_quota_mb int) returns void
language plpgsql security definer set search_path = '' as $$
declare v_old int;
begin
  if app.current_user_id() is null or not app.is_staff() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  if p_quota_mb is null or p_quota_mb < 0 or p_quota_mb > 10240 then raise exception 'Kvoten må være mellom 0 og 10240 MB' using errcode = '22023'; end if;
  select storage_quota_mb into v_old from public.churches where id = p_church for update;
  if v_old is null then raise exception 'Fant ikke menigheten' using errcode = '22023'; end if;
  update public.churches set storage_quota_mb = p_quota_mb where id = p_church;
  perform app.log_quota(p_church, v_old, p_quota_mb, case when p_quota_mb = app.default_quota_mb() then 'standard' else 'egen kvote' end);
end $$;

-- public.set_storage_limit: som i 20261002200000_total_storage_limit.sql, men Developer ELLER Moderator (app.is_staff).
create or replace function public.set_storage_limit(p_mb int) returns void
language plpgsql security definer set search_path = '' as $$
declare v_old int;
begin
  if app.current_user_id() is null or not app.is_staff() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  if p_mb is null or p_mb < 1 or p_mb > 1048576 then raise exception 'Grensen må være mellom 1 MB og 1 TB' using errcode = '22023'; end if;
  select total_limit_mb into v_old from public.storage_settings where id for update;
  update public.storage_settings set total_limit_mb = p_mb, updated_by = app.current_user_id(), updated_at = now() where id;
  insert into public.audit_logs (actor_user_id, action, target_type, target_id, meta)
  values (app.current_user_id(), 'storage.limit', 'storage_settings', 'total', jsonb_build_object('old_mb', v_old, 'new_mb', p_mb));
end $$;

-- public.storage_overview: som i 20261002200000_total_storage_limit.sql, men Developer ELLER Moderator (app.is_staff).
create or replace function public.storage_overview() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if app.current_user_id() is null or not app.is_staff() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  return jsonb_build_object(
    'limit_mb', (select total_limit_mb from public.storage_settings where id),
    'used_bytes', app.total_used_bytes(),
    'quota_sum_mb', (select coalesce(sum(storage_quota_mb), 0) from public.churches where status <> 'deleted'),
    'churches', (select count(*) from public.churches where status <> 'deleted'),
    'updated_at', (select updated_at from public.storage_settings where id));
end $$;

-- public.update_plan: som i 20261002100000_church_quota_standard.sql, men Developer ELLER Moderator (app.is_staff).
create or replace function public.update_plan(p_plan text, p_quota_mb int, p_price_nok_month int, p_update_churches boolean default false) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare p public.plans;
begin
  if app.current_user_id() is null or not app.is_staff() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  select * into p from public.plans where code = p_plan for update;
  if p.code is null then raise exception 'Ukjent plan' using errcode = '22023'; end if;
  if p_quota_mb is null or p_quota_mb < 0 or p_quota_mb > 10240 then raise exception 'Kvoten må være mellom 0 og 10240 MB' using errcode = '22023'; end if;
  if p_price_nok_month is not null and p_price_nok_month < 0 then raise exception 'Prisen kan ikke være negativ' using errcode = '22023'; end if;
  update public.plans set storage_quota_mb = p_quota_mb, price_nok_month = p_price_nok_month where code = p_plan;
  insert into public.audit_logs (actor_user_id, action, target_type, target_id, meta)
  values (app.current_user_id(), 'plans.update', 'plans', p_plan, jsonb_build_object(
    'old', jsonb_build_object('quota_mb', p.storage_quota_mb, 'price_nok_month', p.price_nok_month),
    'new', jsonb_build_object('quota_mb', p_quota_mb, 'price_nok_month', p_price_nok_month),
    'churches_updated', 0));
  return jsonb_build_object('ok', true, 'churches_updated', 0);
end $$;
