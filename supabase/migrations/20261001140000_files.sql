-- ConnectHub P7 · Delte filer (bare bilder). Vanlig PostgreSQL. Selve filene ligger i fillagringen (se *_supabase_storage.sql);
-- her er metadata, rettigheter og kvoter. Video avvises allerede av tabellen (P3) – og av serveren før lagring.
-- Mapper: «bilder» (felles, alle medlemmer kan legge til), «logoer», «bakgrunner», «mockups», «faste» (felles, bare admin/stab).
-- Synlighet: «church» (menigheten) eller «private» (bare den som lastet opp).

alter table public.files
  add column folder text not null default 'bilder' check (folder in ('bilder', 'logoer', 'bakgrunner', 'mockups', 'faste')),
  add column visibility text not null default 'church' check (visibility in ('church', 'private'));
create index files_church_folder_idx on public.files (church_id, folder, created_at desc);
create index files_owner_idx on public.files (uploaded_by) where visibility = 'private';

alter table public.churches add column storage_quota_mb int not null default 200 check (storage_quota_mb between 0 and 10240);
grant select (storage_quota_mb) on public.churches to authenticated;
grant update (storage_quota_mb) on public.churches to authenticated;  -- RLS: bare stab kan oppdatere menigheter

grant select (folder, visibility) on public.files to authenticated;
drop policy files_select on public.files;
create policy files_select on public.files for select to authenticated using (
  (visibility = 'church' and (app.is_member(church_id) or app.is_church_admin(church_id) or app.is_staff()))
  or (visibility = 'private' and uploaded_by = app.current_user_id()));

-- Kontroll før opplasting (kalles av serveren med brukerens token, og igjen inni register_file).
create or replace function app.upload_check(p_actor uuid, p_church uuid, p_folder text, p_private boolean, p_size bigint) returns void
language plpgsql stable security definer set search_path = '' as $$
declare used bigint; quota bigint; mine bigint; member boolean; adm boolean;
begin
  if p_actor is null then raise exception 'Ikke innlogget' using errcode = '42501'; end if;
  if p_folder not in ('bilder', 'logoer', 'bakgrunner', 'mockups', 'faste') then raise exception 'Ugyldig mappe' using errcode = '22023'; end if;
  if p_size is null or p_size <= 0 or p_size > 4194304 then raise exception 'Ugyldig størrelse' using errcode = '22023'; end if;
  select exists (select 1 from public.memberships m join public.churches c on c.id = m.church_id
                 where m.user_id = p_actor and m.church_id = p_church and m.status = 'active' and c.status = 'active') into member;
  select exists (select 1 from public.user_roles r join public.memberships m on m.user_id = r.user_id and m.church_id = r.church_id and m.status = 'active'
                 where r.user_id = p_actor and r.role = 'church_admin' and r.church_id = p_church and r.revoked_at is null) into adm;
  adm := adm or (app.is_staff() and exists (select 1 from public.churches where id = p_church and status = 'active'));
  if p_private then
    if not member then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  elsif p_folder = 'bilder' then
    if not (member or adm) then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  elsif not adm then raise exception 'Bare admin kan legge filer i denne mappen' using errcode = '42501';
  end if;
  select coalesce(sum(file_size), 0) into used from public.files where church_id = p_church;
  select storage_quota_mb::bigint * 1048576 into quota from public.churches where id = p_church;
  if used + p_size > quota then raise exception 'Menighetens lagringskvote er brukt opp' using errcode = '54000'; end if;
  if p_private then
    select coalesce(sum(file_size), 0) into mine from public.files where uploaded_by = p_actor and visibility = 'private';
    if mine + p_size > 52428800 then raise exception 'Din private kvote (50 MB) er brukt opp' using errcode = '54000'; end if;
  end if;
end $$;
revoke all on function app.upload_check(uuid, uuid, text, boolean, bigint) from public, anon, authenticated;

create or replace function public.can_upload(p_church uuid, p_folder text, p_private boolean, p_size bigint) returns boolean
language plpgsql stable security definer set search_path = '' as $$
begin perform app.upload_check(app.current_user_id(), p_church, p_folder, p_private, p_size); return true; end $$;

-- Registrering etter at serveren har kontrollert og lagret filen. BARE serveren. Sjekkes på nytt med lås per menighet,
-- så samtidige opplastinger ikke kan sprenge kvoten.
create or replace function public.register_file(p_issuer text, p_subject text, p_church uuid, p_folder text, p_private boolean,
  p_key text, p_name text, p_mime text, p_size bigint, p_sha256 text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid; v_id uuid;
begin
  perform set_config('request.jwt.claims', jsonb_build_object('iss', p_issuer, 'sub', p_subject)::text, true);
  v_actor := app.current_user_id();
  perform pg_advisory_xact_lock(hashtext('files:' || p_church::text));
  perform app.upload_check(v_actor, p_church, p_folder, p_private, p_size);
  insert into public.files (church_id, storage_key, file_name, mime_type, file_size, sha256, uploaded_by, folder, visibility)
  values (p_church, p_key, p_name, p_mime, p_size, p_sha256, v_actor, p_folder, case when p_private then 'private' else 'church' end)
  returning id into v_id;
  return jsonb_build_object('id', v_id, 'file_name', p_name, 'folder', p_folder, 'visibility', case when p_private then 'private' else 'church' end, 'file_size', p_size);
end $$;

-- Sletting: den som lastet opp, admin i menigheten (fellesfiler) eller stab. Returnerer lagringsnøkkelen så serveren kan
-- fjerne selve filen.
create or replace function public.delete_file(p_id uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := app.current_user_id(); f public.files;
begin
  if v_actor is null then raise exception 'Ikke innlogget' using errcode = '42501'; end if;
  select * into f from public.files where id = p_id for update;
  if not found then raise exception 'Fant ikke filen' using errcode = '22023'; end if;
  if not (f.uploaded_by = v_actor or (f.visibility = 'church' and (app.is_church_admin(f.church_id) or app.is_staff()))) then
    raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  delete from public.files where id = p_id;
  return f.storage_key;
end $$;

-- Lagringsnøkler for filer brukeren kan se (for signerte lenker). Kalles av serveren med brukerens token. storage_key er
-- ikke lesbar som kolonne for klienter, så synligheten sjekkes her med samme regel som RLS-policyen.
create or replace function app.visible_file_keys(p_ids uuid[]) returns table (id uuid, storage_key text, mime_type text)
language sql stable security definer set search_path = '' as $$
  select f.id, f.storage_key, f.mime_type from public.files f
  where f.id = any (p_ids) and (
    (f.visibility = 'church' and (app.is_member(f.church_id) or app.is_church_admin(f.church_id) or app.is_staff()))
    or (f.visibility = 'private' and f.uploaded_by = app.current_user_id()))
$$;
revoke all on function app.visible_file_keys(uuid[]) from public, anon, authenticated;
create or replace function public.file_keys(p_ids uuid[]) returns table (id uuid, storage_key text, mime_type text)
language sql stable security definer set search_path = '' as $$
  select * from app.visible_file_keys(p_ids[1:100])
$$;

revoke all on function public.can_upload(uuid, text, boolean, bigint), public.register_file(text, text, uuid, text, boolean, text, text, text, bigint, text),
  public.delete_file(uuid), public.file_keys(uuid[]) from public, anon, authenticated;
grant execute on function public.can_upload(uuid, text, boolean, bigint), public.delete_file(uuid), public.file_keys(uuid[]) to authenticated;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'grant execute on function public.register_file(text, text, uuid, text, boolean, text, text, text, bigint, text) to service_role';
  end if;
end $$;

-- Systemstatus teller nå også private filer (uendret funksjon); kvoter vises per menighet:
create or replace function public.storage_usage(p_church uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select case when app.is_member(p_church) or app.is_church_admin(p_church) or app.is_staff() then jsonb_build_object(
    'used_bytes', (select coalesce(sum(file_size), 0) from public.files where church_id = p_church),
    'quota_bytes', (select storage_quota_mb::bigint * 1048576 from public.churches where id = p_church),
    'my_private_bytes', (select coalesce(sum(file_size), 0) from public.files where uploaded_by = app.current_user_id() and visibility = 'private'),
    'my_private_quota_bytes', 52428800) end
$$;
revoke all on function public.storage_usage(uuid) from public, anon, authenticated;
grant execute on function public.storage_usage(uuid) to authenticated;
