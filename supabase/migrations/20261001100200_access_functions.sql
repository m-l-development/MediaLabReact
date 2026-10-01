-- ConnectHub P3 · 3/4 · Tilgangsfunksjoner, logging og rollehåndtering. Vanlig PostgreSQL.
-- Alle tilgangsregler går gjennom app.current_user_id(), som leser iss/sub fra request.jwt.claims (PostgREST-standard)
-- og slår opp i user_identities. Ingen policy nevner leverandøren. Status sjekkes ved hvert kall, så en deaktivert
-- bruker eller tilbakekalt rolle mister tilgang umiddelbart – også med et gyldig token.
-- Developer og Moderator krever MFA (aal2 i tokenet).

create or replace function app.jwt_claims() returns jsonb
language sql stable set search_path = '' as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb)
$$;

create or replace function app.current_user_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select u.id
  from public.user_identities i
  join public.app_users u on u.id = i.user_id
  where i.provider = app.jwt_claims() ->> 'iss'
    and i.subject = app.jwt_claims() ->> 'sub'
    and u.status = 'active'
$$;

create or replace function app.mfa_ok() returns boolean
language sql stable set search_path = '' as $$
  select coalesce(app.jwt_claims() ->> 'aal' = 'aal2', false)
$$;

create or replace function app.has_global_role(p_role text) returns boolean
language sql stable security definer set search_path = '' as $$
  select app.mfa_ok() and exists (
    select 1 from public.user_roles r
    where r.user_id = app.current_user_id() and r.role = p_role and r.church_id is null and r.revoked_at is null)
$$;

create or replace function app.is_developer() returns boolean language sql stable set search_path = '' as $$ select app.has_global_role('developer') $$;
create or replace function app.is_moderator() returns boolean language sql stable set search_path = '' as $$ select app.has_global_role('moderator') $$;
create or replace function app.is_staff() returns boolean language sql stable set search_path = '' as $$ select app.is_developer() or app.is_moderator() $$;

create or replace function app.is_member(p_church uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships m join public.churches c on c.id = m.church_id
    where m.user_id = app.current_user_id() and m.church_id = p_church and m.status = 'active' and c.status = 'active')
$$;

create or replace function app.is_church_admin(p_church uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.user_roles r
    join public.memberships m on m.user_id = r.user_id and m.church_id = r.church_id and m.status = 'active'
    join public.churches c on c.id = r.church_id and c.status = 'active'
    where r.user_id = app.current_user_id() and r.role = 'church_admin' and r.church_id = p_church and r.revoked_at is null)
$$;

-- Kan innlogget bruker se denne brukerens kontaktopplysninger? (seg selv, stab, eller admin i en felles menighet)
create or replace function app.can_see_user(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_user = app.current_user_id() or app.is_staff() or exists (
    select 1 from public.memberships m where m.user_id = p_user and app.is_church_admin(m.church_id))
$$;

revoke all on function app.jwt_claims(), app.current_user_id(), app.mfa_ok(), app.has_global_role(text), app.is_developer(),
  app.is_moderator(), app.is_staff(), app.is_member(uuid), app.is_church_admin(uuid), app.can_see_user(uuid) from public;
grant execute on function app.jwt_claims(), app.current_user_id(), app.mfa_ok(), app.has_global_role(text), app.is_developer(),
  app.is_moderator(), app.is_staff(), app.is_member(uuid), app.is_church_admin(uuid), app.can_see_user(uuid) to authenticated;

-- updated_at
create or replace function app.touch_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;
create trigger app_users_touch before update on public.app_users for each row execute function app.touch_updated_at();
create trigger churches_touch before update on public.churches for each row execute function app.touch_updated_at();
create trigger memberships_touch before update on public.memberships for each row execute function app.touch_updated_at();

-- Revisjonslogg: skrives automatisk av triggere (også ved direkte endringer), uten personopplysninger i meta.
create or replace function app.audit_row() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
begin
  insert into public.audit_logs (actor_user_id, action, target_type, target_id, church_id, reason, meta)
  values (app.current_user_id(), tg_table_name || '.' || lower(tg_op), tg_table_name,
          coalesce(v ->> 'id', concat_ws(':', v ->> 'user_id', v ->> 'church_id')),
          case when tg_table_name = 'churches' then (v ->> 'id')::uuid else (v ->> 'church_id')::uuid end,
          case when tg_table_name = 'user_roles' then left(v ->> 'reason', 500) end,
          jsonb_strip_nulls(jsonb_build_object('role', v ->> 'role', 'status', v ->> 'status')));
  return null;
end $$;
revoke all on function app.audit_row() from public;
create trigger churches_audit after insert or update or delete on public.churches for each row execute function app.audit_row();
create trigger memberships_audit after insert or update or delete on public.memberships for each row execute function app.audit_row();
create trigger user_roles_audit after insert or update or delete on public.user_roles for each row execute function app.audit_row();
create trigger invitations_audit after insert or update or delete on public.invitations for each row execute function app.audit_row();
create trigger app_users_audit after insert or update or delete on public.app_users for each row execute function app.audit_row();
create trigger files_audit after insert or update or delete on public.files for each row execute function app.audit_row();

-- Loggen kan bare legges til i – aldri endres, slettes eller tømmes.
create or replace function app.audit_immutable() returns trigger language plpgsql set search_path = '' as $$
begin raise exception 'Revisjonsloggen kan ikke endres eller slettes' using errcode = '42501'; end $$;
create trigger audit_logs_no_change before update or delete on public.audit_logs for each row execute function app.audit_immutable();
create trigger audit_logs_no_truncate before truncate on public.audit_logs for each statement execute function app.audit_immutable();

-- Rolletildeling: bare via disse funksjonene. Ingen kan endre egne roller.
-- developer/moderator: bare Developer (med MFA). church_admin: Developer eller Moderator (med MFA), og målet må være aktivt medlem.
create or replace function public.assign_role(p_user uuid, p_role text, p_church uuid default null, p_reason text default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := app.current_user_id(); v_id uuid;
begin
  if v_actor is null then raise exception 'Ikke innlogget' using errcode = '42501'; end if;
  if p_user = v_actor then raise exception 'Du kan ikke endre dine egne roller' using errcode = '42501'; end if;
  if p_role in ('developer', 'moderator') then
    if not app.is_developer() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
    if p_church is not null then raise exception 'Globale roller har ingen menighet' using errcode = '22023'; end if;
  elsif p_role = 'church_admin' then
    if not app.is_staff() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
    if p_church is null or not exists (select 1 from public.memberships m where m.user_id = p_user and m.church_id = p_church and m.status = 'active') then
      raise exception 'Brukeren må være aktivt medlem av menigheten' using errcode = '22023'; end if;
  else
    raise exception 'Ugyldig rolle' using errcode = '22023';
  end if;
  if not exists (select 1 from public.app_users u where u.id = p_user and u.status = 'active') then
    raise exception 'Ukjent eller deaktivert bruker' using errcode = '22023'; end if;
  insert into public.user_roles (user_id, role, church_id, assigned_by, reason)
  values (p_user, p_role, p_church, v_actor, left(p_reason, 500)) returning id into v_id;
  return v_id;
end $$;

create or replace function public.revoke_role(p_role_id uuid, p_reason text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := app.current_user_id(); r public.user_roles;
begin
  if v_actor is null then raise exception 'Ikke innlogget' using errcode = '42501'; end if;
  select * into r from public.user_roles where id = p_role_id and revoked_at is null;
  if not found then raise exception 'Fant ikke aktiv rolle' using errcode = '22023'; end if;
  if r.user_id = v_actor then raise exception 'Du kan ikke endre dine egne roller' using errcode = '42501'; end if;
  if (r.role in ('developer', 'moderator') and not app.is_developer()) or (r.role = 'church_admin' and not app.is_staff()) then
    raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  update public.user_roles set revoked_at = now(), revoked_by = v_actor, reason = coalesce(left(p_reason, 500), reason) where id = p_role_id;
end $$;

revoke all on function public.assign_role(uuid, text, uuid, text), public.revoke_role(uuid, text) from public, anon;
grant execute on function public.assign_role(uuid, text, uuid, text), public.revoke_role(uuid, text) to authenticated;
