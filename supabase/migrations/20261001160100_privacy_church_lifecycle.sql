-- ConnectHub P10 · 2/2 · Personvern (eksport og sletting av egen konto) og livsløpet til menigheter. Vanlig PostgreSQL.
-- Sletting skjer i to trinn: brukeren/stab forbereder (rettigheter sjekkes med brukerens token og filnøkler returneres),
-- serveren sletter filene i lagringen og fullfører i databasen (bare serverrollen), og til slutt innloggingskontoen.

-- Revisjonsloggen: i tillegg til sletting etter oppbevaringstid (P8) tillates én bestemt endring – at koblingen til en
-- person fjernes (actor_user_id → NULL) når personen slettes (GDPR). Alt annet i raden må være uendret.
create or replace function app.audit_immutable() returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' and current_setting('connecthub.audit_purge_before', true) is not null
     and current_setting('connecthub.audit_purge_before', true) <> ''
     and old.created_at < current_setting('connecthub.audit_purge_before', true)::timestamptz
     and current_setting('connecthub.audit_purge_before', true)::timestamptz <= now() - interval '12 months' then
    return old;
  end if;
  if tg_op = 'UPDATE' and old.actor_user_id is not null and new.actor_user_id is null
     and (new.id, new.action, new.target_type, new.target_id, new.church_id, new.reason, new.meta, new.created_at)
         is not distinct from (old.id, old.action, old.target_type, old.target_id, old.church_id, old.reason, old.meta, old.created_at) then
    return new;
  end if;
  raise exception 'Revisjonsloggen kan ikke endres eller slettes' using errcode = '42501';
end $$;

-- ---------- Menighetens livsløp ----------
alter table public.churches add column delete_after timestamptz;
grant select (delete_after) on public.churches to authenticated;
revoke update (status) on public.churches from authenticated;     -- status endres bare via set_church_status

create or replace function public.set_church_status(p_church uuid, p_status text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := app.current_user_id(); cur text; v_name text;
begin
  if v_actor is null or not app.is_staff() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  select status, name into cur, v_name from public.churches where id = p_church for update;
  if cur is null then raise exception 'Ukjent menighet' using errcode = '22023'; end if;
  if not ((cur = 'active' and p_status in ('temporarily_disabled', 'pending_deletion'))
       or (cur = 'temporarily_disabled' and p_status in ('active', 'pending_deletion'))
       or (cur = 'pending_deletion' and p_status = 'active')) then
    raise exception 'Ugyldig overgang' using errcode = '22023'; end if;
  update public.churches set status = p_status, delete_after = case when p_status = 'pending_deletion' then now() + interval '30 days' end where id = p_church;
  perform app.notify(a, 'church_status', 'Menighetens status er endret',
    case p_status when 'active' then 'Menigheten er aktiv igjen.' when 'temporarily_disabled' then 'Menigheten er midlertidig deaktivert.' else 'Menigheten er satt til sletting om 30 dager.' end,
    '/connecthub-admin.dc.html', p_church)
  from (select r.user_id a from public.user_roles r where r.church_id = p_church and r.role = 'church_admin' and r.revoked_at is null) x;
end $$;

-- Eksport av en menighets data (admin i menigheten eller stab). Filinnhold legges til av serveren som signerte lenker.
create or replace function public.export_church(p_church uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not (app.is_church_admin(p_church) or app.is_staff()) then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  return jsonb_build_object(
    'exported_at', now(), 'format', 'connecthub-church-export/1',
    'church', (select to_jsonb(c) - 'storage_quota_mb' from public.churches c where c.id = p_church),
    'subscription', (select to_jsonb(s) - 'updated_by' from public.church_subscriptions s where s.church_id = p_church),
    'members', coalesce((select jsonb_agg(jsonb_build_object('name', u.full_name, 'email', u.email, 'membership', m.status, 'since', m.created_at,
        'admin', exists (select 1 from public.user_roles r where r.user_id = u.id and r.church_id = p_church and r.role = 'church_admin' and r.revoked_at is null)))
      from public.memberships m join public.app_users u on u.id = m.user_id where m.church_id = p_church), '[]'),
    'invitations', coalesce((select jsonb_agg(jsonb_build_object('email', i.email, 'role', i.role, 'status', i.status, 'created_at', i.created_at, 'accepted_at', i.accepted_at))
      from public.invitations i where i.church_id = p_church), '[]'),
    'files', coalesce((select jsonb_agg(jsonb_build_object('id', f.id, 'name', f.file_name, 'type', f.mime_type, 'size', f.file_size, 'folder', f.folder, 'sha256', f.sha256, 'created_at', f.created_at))
      from public.files f where f.church_id = p_church and f.visibility = 'church'), '[]'),
    'spaces', coalesce((select jsonb_agg(jsonb_build_object('name', s.name, 'owner', s.owner_church_id = p_church, 'status', sm.status))
      from public.space_members sm join public.spaces s on s.id = sm.space_id where sm.church_id = p_church), '[]'),
    'audit', coalesce((select jsonb_agg(jsonb_build_object('at', l.created_at, 'action', l.action, 'meta', l.meta) order by l.created_at desc)
      from (select * from public.audit_logs where church_id = p_church order by created_at desc limit 1000) l), '[]'));
end $$;

-- Forberedelse til endelig sletting: stab med MFA, menigheten må stå til sletting, og navnet må bekreftes. Gir filnøkler.
create or replace function public.prepare_church_purge(p_church uuid, p_confirm_name text) returns text[]
language plpgsql stable security definer set search_path = '' as $$
declare c public.churches;
begin
  if not app.is_staff() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  select * into c from public.churches where id = p_church;
  if c.id is null or c.status <> 'pending_deletion' then raise exception 'Menigheten må først settes til sletting' using errcode = '22023'; end if;
  if p_confirm_name is distinct from c.name then raise exception 'Navnet stemmer ikke' using errcode = '22023'; end if;
  return array(select storage_key from public.files where church_id = p_church);
end $$;

-- Endelig sletting (bare serveren, etter at filene er fjernet fra lagringen). Revisjonsloggen beholdes (uten personopplysninger).
create or replace function public.purge_church(p_church uuid, p_issuer text, p_subject text, p_aal text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare c public.churches; n_files int; n_members int;
begin
  perform set_config('request.jwt.claims', jsonb_build_object('iss', p_issuer, 'sub', p_subject, 'aal', p_aal)::text, true);   -- aal fra det verifiserte tokenet
  if not app.is_staff() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  select * into c from public.churches where id = p_church for update;
  if c.id is null or c.status <> 'pending_deletion' then raise exception 'Menigheten må først settes til sletting' using errcode = '22023'; end if;
  delete from public.files where church_id = p_church; get diagnostics n_files = row_count;
  delete from public.memberships where church_id = p_church; get diagnostics n_members = row_count;
  update public.invitations set email = 'slettet-' || id || '@slettet.invalid' where church_id = p_church;
  delete from public.churches where id = p_church;     -- roller, invitasjoner, abonnement og områder følger med (cascade)
  insert into public.audit_logs (actor_user_id, action, target_type, target_id, church_id, meta)
  values (app.current_user_id(), 'churches.purge', 'churches', p_church::text, p_church, jsonb_build_object('files', n_files, 'members', n_members));
  return jsonb_build_object('ok', true, 'files', n_files, 'members', n_members);
end $$;

-- ---------- Personvern for den enkelte ----------
create or replace function public.export_my_data() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v uuid := app.current_user_id(); u public.app_users;
begin
  if v is null then raise exception 'Ikke innlogget' using errcode = '42501'; end if;
  select * into u from public.app_users where id = v;
  return jsonb_build_object(
    'exported_at', now(), 'format', 'connecthub-my-data/1',
    'note', 'Prosjekter, videoer og innstillinger i verktøyene ligger bare lokalt på PC-en din (nettleseren eller prosjektmappen) og er ikke med her.',
    'user', to_jsonb(u),
    'identities', coalesce((select jsonb_agg(jsonb_build_object('provider', provider, 'created_at', created_at)) from public.user_identities where user_id = v), '[]'),
    'memberships', coalesce((select jsonb_agg(jsonb_build_object('church', c.name, 'status', m.status, 'since', m.created_at)) from public.memberships m join public.churches c on c.id = m.church_id where m.user_id = v), '[]'),
    'roles', coalesce((select jsonb_agg(jsonb_build_object('role', role, 'church_id', church_id, 'assigned_at', assigned_at, 'revoked_at', revoked_at)) from public.user_roles where user_id = v), '[]'),
    'invitations_received', coalesce((select jsonb_agg(jsonb_build_object('role', role, 'church_id', church_id, 'status', status, 'created_at', created_at)) from public.invitations where lower(email) = lower(u.email)), '[]'),
    'invitations_sent', coalesce((select jsonb_agg(jsonb_build_object('email', email, 'role', role, 'status', status, 'created_at', created_at)) from public.invitations where created_by = v), '[]'),
    'files_uploaded', coalesce((select jsonb_agg(jsonb_build_object('name', file_name, 'size', file_size, 'folder', folder, 'visibility', visibility, 'created_at', created_at)) from public.files where uploaded_by = v), '[]'),
    'notifications', coalesce((select jsonb_agg(jsonb_build_object('title', title, 'body', body, 'created_at', created_at, 'read_at', read_at)) from public.notifications where user_id = v), '[]'),
    'activity', coalesce((select jsonb_agg(jsonb_build_object('at', created_at, 'action', action) order by created_at desc) from (select * from public.audit_logs where actor_user_id = v order by created_at desc limit 1000) l), '[]'));
end $$;

-- Forberedelse til sletting av egen konto. Den siste aktive Developer kan ikke slette seg selv (ellers låses systemet).
create or replace function public.prepare_account_deletion() returns text[]
language plpgsql stable security definer set search_path = '' as $$
declare v uuid := app.current_user_id();
begin
  if v is null then raise exception 'Ikke innlogget' using errcode = '42501'; end if;
  if exists (select 1 from public.user_roles where user_id = v and role = 'developer' and revoked_at is null)
     and not exists (select 1 from public.user_roles r join public.app_users u on u.id = r.user_id
                     where r.role = 'developer' and r.revoked_at is null and r.user_id <> v and u.status = 'active') then
    raise exception 'Du er den eneste Developer. Gi rollen til en annen før kontoen slettes.' using errcode = '22023'; end if;
  return array(select storage_key from public.files where uploaded_by = v and visibility = 'private');
end $$;

-- Sletting av egen konto (bare serveren). Private filer slettes; fellesfiler i menigheten beholdes uten navn på opplaster.
-- Invitasjoner til adressen anonymiseres. Loggen beholdes uten kobling til personen.
create or replace function public.delete_account(p_issuer text, p_subject text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v uuid; v_email text;
begin
  perform set_config('request.jwt.claims', jsonb_build_object('iss', p_issuer, 'sub', p_subject)::text, true);
  select i.user_id, u.email into v, v_email from public.user_identities i join public.app_users u on u.id = i.user_id where i.provider = p_issuer and i.subject = p_subject;
  if v is null then return jsonb_build_object('ok', true, 'note', 'no_user'); end if;
  delete from public.files where uploaded_by = v and visibility = 'private';
  update public.invitations set email = 'slettet-' || id || '@slettet.invalid' where lower(email) = lower(v_email);
  insert into public.audit_logs (action, target_type, target_id) values ('account.delete', 'app_users', v::text);
  perform set_config('request.jwt.claims', '', true);
  delete from public.app_users where id = v;    -- identiteter, medlemskap, roller og varsler følger med (cascade)
  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.set_church_status(uuid, text), public.export_church(uuid), public.prepare_church_purge(uuid, text),
  public.purge_church(uuid, text, text, text), public.export_my_data(), public.prepare_account_deletion(), public.delete_account(text, text) from public, anon, authenticated;
grant execute on function public.set_church_status(uuid, text), public.export_church(uuid), public.prepare_church_purge(uuid, text),
  public.export_my_data(), public.prepare_account_deletion() to authenticated;
do $$ begin if exists (select 1 from pg_roles where rolname = 'service_role') then
  execute 'grant execute on function public.purge_church(uuid, text, text, text), public.delete_account(text, text) to service_role';
end if; end $$;
