-- ConnectHub · større opplastinger: bilder og filer høyst 30 MB, logoer høyst 10 MB (bare connecthub-dev først).
--
-- Vercel-funksjoner tar imot høyst 4,5 MB per forespørsel, så større filer kan ikke sendes gjennom serveren. Ny flyt:
--   1. upload.start (serveren): kontroll av type, størrelse, rettighet og kvote med brukerens token → påbegynt opplasting
--      registreres her (upload_begin) → kortlivet signert opplastingslenke til én bestemt nøkkel i den private bøtta.
--   2. Nettleseren laster opp direkte til lagringen (bøtta godtar bare bildeformater og høyst 30 MB).
--   3. upload.finish (serveren): tar den påbegynte opplastingen (upload_take, bare egen og én gang), henter filen,
--      kontrollerer innholdet (magiske bytes, video avvises), størrelse og type, beregner SHA-256 og registrerer den med
--      de vanlige funksjonene (ny kontroll med lås). Ellers slettes filen.
--   Påbegynte opplastinger som aldri fullføres, ryddes bort (upload_expired_take) – filen slettes fra lagringen.
-- Ingen eksisterende rader endres.

-- ---------- 1. Grenser ----------
create or replace function app.upload_limit(p_folder text) returns bigint
language sql immutable set search_path = '' as $$
  select case when p_folder = 'logoer' then 10485760::bigint else 31457280::bigint end
$$;
revoke all on function app.upload_limit(text) from public, anon, authenticated;

-- Som i 20261020100000_temporary_admin_access.sql; størrelsen avhenger nå av mappen (logoer 10 MB, ellers 30 MB).
create or replace function app.upload_check(p_actor uuid, p_church uuid, p_folder text, p_private boolean, p_size bigint) returns void
language plpgsql stable security definer set search_path = '' as $$
declare used bigint; quota bigint; member boolean; adm boolean;
begin
  if p_actor is null then raise exception 'Ikke innlogget' using errcode = '42501'; end if;
  if p_folder not in ('bilder', 'logoer', 'bakgrunner', 'mockups', 'faste') then raise exception 'Ugyldig mappe' using errcode = '22023'; end if;
  if p_size is null or p_size <= 0 then raise exception 'Ugyldig størrelse' using errcode = '22023'; end if;
  if p_size > app.upload_limit(p_folder) then raise exception 'Filen er for stor' using errcode = case when p_folder = 'logoer' then 'CH031' else 'CH030' end; end if;
  select exists (select 1 from public.memberships m join public.churches c on c.id = m.church_id
                 where m.user_id = p_actor and m.church_id = p_church and m.status = 'active' and c.status = 'active')
         and not app.temp_membership_ended(p_actor, p_church) into member;
  select exists (select 1 from public.user_roles r join public.memberships m on m.user_id = r.user_id and m.church_id = r.church_id and m.status = 'active'
                 join public.churches c on c.id = r.church_id and c.status = 'active'
                 where r.user_id = p_actor and r.role = 'church_admin' and r.church_id = p_church and r.revoked_at is null
                   and (r.expires_at is null or r.expires_at > now())) into adm;
  if p_private then
    raise exception 'Nye private opplastinger er stengt' using errcode = '42501';
  elsif p_folder = 'bilder' then
    if not member then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  elsif not adm then raise exception 'Bare admin kan legge filer i denne mappen' using errcode = '42501';
  end if;
  select coalesce(sum(file_size), 0) into used from public.files where church_id = p_church;
  select storage_quota_mb::bigint * 1048576 into quota from public.churches where id = p_church;
  if used + p_size > quota then raise exception 'Menighetens lagringskvote er brukt opp' using errcode = '54000'; end if;
  perform app.total_check(p_size);
end $$;
revoke all on function app.upload_check(uuid, uuid, text, boolean, bigint) from public, anon, authenticated;

-- Som i 20261015100000_collab_folder_upload.sql, med 30 MB.
create or replace function app.link_upload_check(p_actor uuid, p_link uuid, p_church uuid, p_size bigint) returns void
language plpgsql stable security definer set search_path = '' as $$
declare used bigint; quota bigint;
begin
  if p_actor is null then raise exception 'Ikke innlogget' using errcode = '42501'; end if;
  if p_size is null or p_size <= 0 then raise exception 'Ugyldig størrelse' using errcode = '22023'; end if;
  if p_size > app.upload_limit('bilder') then raise exception 'Filen er for stor' using errcode = 'CH030'; end if;
  if not exists (select 1 from public.memberships m join public.churches c on c.id = m.church_id
                 where m.user_id = p_actor and m.church_id = p_church and m.status = 'active' and c.status = 'active') then
    raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  if not exists (select 1 from public.church_links l where l.id = p_link and l.status = 'active') or not app.group_member_ok(p_link, p_church) then
    raise exception 'Ingen tilgang til samarbeidsgruppen' using errcode = '42501'; end if;
  select coalesce(sum(file_size), 0) into used from public.files where church_id = p_church;
  select storage_quota_mb::bigint * 1048576 into quota from public.churches where id = p_church;
  if used + p_size > quota then raise exception 'Menighetens lagringskvote er brukt opp' using errcode = '54000'; end if;
  perform app.total_check(p_size);
end $$;
revoke all on function app.link_upload_check(uuid, uuid, uuid, bigint) from public, anon, authenticated;

-- Som i 20261020100000_temporary_admin_access.sql, med logo høyst 10 MB.
create or replace function public.create_church_with_logo(p_issuer text, p_subject text, p_aal text, p_church uuid, p_name text, p_key text,
  p_file_name text, p_mime text, p_size bigint, p_sha256 text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid; v_church uuid; v_file uuid; v_before bigint; quota bigint;
begin
  perform set_config('request.jwt.claims', jsonb_build_object('iss', p_issuer, 'sub', p_subject, 'aal', coalesce(p_aal, 'aal1'))::text, true);
  v_actor := app.current_user_id();
  if v_actor is null or not app.is_staff() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  if char_length(btrim(coalesce(p_name, ''))) not between 2 and 120 or p_name ~ '[[:cntrl:]]' then
    raise exception 'Menighetens navn må ha 2–120 tegn' using errcode = '22023'; end if;
  if p_mime not in ('image/png', 'image/jpeg', 'image/webp', 'image/gif') then raise exception 'Logoen må være et bilde (PNG, JPG, WebP eller GIF)' using errcode = '22023'; end if;
  if p_size is null or p_size <= 0 then raise exception 'Ugyldig størrelse' using errcode = '22023'; end if;
  if p_size > app.upload_limit('logoer') then raise exception 'Logoen kan være høyst 10 MB' using errcode = 'CH031'; end if;
  if p_church is null or p_key is null or left(p_key, length('c/' || p_church::text || '/')) <> 'c/' || p_church::text || '/' then
    raise exception 'Ugyldig lagringssted for logoen' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(hashtext('files:all'));
  insert into public.churches (id, name) values (p_church, btrim(p_name)) returning id, storage_quota_mb::bigint * 1048576 into v_church, quota;
  if p_size > quota then raise exception 'Menighetens lagringskvote er brukt opp' using errcode = '54000'; end if;
  perform app.total_check(p_size);
  v_before := app.total_used_bytes();
  insert into public.files (church_id, storage_key, file_name, mime_type, file_size, sha256, uploaded_by, folder, visibility)
  values (v_church, p_key, p_file_name, p_mime, p_size, p_sha256, v_actor, 'logoer', 'church') returning id into v_file;
  update public.churches set logo_file_id = v_file where id = v_church;
  perform app.total_threshold_notify(v_before, v_before + p_size);
  insert into public.audit_logs (actor_user_id, action, target_type, target_id, church_id, meta)
  values (v_actor, 'churches.create_with_logo', 'churches', v_church::text, v_church, jsonb_build_object('logo', v_file));
  return jsonb_build_object('id', v_church, 'name', btrim(p_name), 'logo_file_id', v_file);
end $$;
revoke all on function public.create_church_with_logo(text, text, text, uuid, text, text, text, text, bigint, text) from public, anon, authenticated;

-- ---------- 2. Påbegynte opplastinger (bare serveren) ----------
create table public.pending_uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users (id) on delete cascade,
  kind text not null check (kind in ('file', 'link', 'church_logo')),
  church_id uuid not null,
  folder text,
  link_id uuid,
  storage_key text not null unique,
  file_name text not null,
  mime_type text not null check (mime_type in ('image/png', 'image/jpeg', 'image/webp', 'image/gif')),
  file_size bigint not null check (file_size > 0 and file_size <= 31457280),
  created_at timestamptz not null default now(),
  taken_at timestamptz   -- satt når serveren har tatt opplastingen (upload.finish); raden blir stående til oppryddingen
);
alter table public.pending_uploads enable row level security;   -- ingen direkte tilgang; bare via funksjonene under
create index pending_uploads_created on public.pending_uploads (created_at);
create index pending_uploads_user on public.pending_uploads (user_id, created_at);

create or replace function public.upload_begin(p_issuer text, p_subject text, p_kind text, p_church uuid, p_folder text, p_link uuid,
  p_key text, p_name text, p_mime text, p_size bigint) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid; v_id uuid;
begin
  perform set_config('request.jwt.claims', jsonb_build_object('iss', p_issuer, 'sub', p_subject)::text, true);
  v_actor := app.current_user_id();
  if v_actor is null then raise exception 'Ikke innlogget' using errcode = '42501'; end if;
  if p_church is null or p_key is null or left(p_key, length('c/' || p_church::text || '/')) <> 'c/' || p_church::text || '/' then
    raise exception 'Ugyldig lagringssted' using errcode = '22023'; end if;
  if p_size > app.upload_limit(case when p_kind = 'church_logo' then 'logoer' else p_folder end) then
    raise exception 'Filen er for stor' using errcode = case when p_kind = 'church_logo' or p_folder = 'logoer' then 'CH031' else 'CH030' end; end if;
  if (select count(*) from public.pending_uploads where user_id = v_actor and created_at > now() - interval '3 hours') >= 30 then
    raise exception 'For mange påbegynte opplastinger' using errcode = '54000'; end if;
  insert into public.pending_uploads (user_id, kind, church_id, folder, link_id, storage_key, file_name, mime_type, file_size)
  values (v_actor, p_kind, p_church, p_folder, p_link, p_key, left(coalesce(p_name, 'bilde'), 200), p_mime, p_size) returning id into v_id;
  return v_id;
end $$;

-- Tar en påbegynt opplasting (bare egen, bare én gang, bare innen 3 timer); serveren registrerer eller sletter filen.
-- Raden blir stående (taken_at) til oppryddingen, så en fil som lastes opp på nytt med samme lenke også blir fjernet.
create or replace function public.upload_take(p_id uuid, p_issuer text, p_subject text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid; r public.pending_uploads;
begin
  perform set_config('request.jwt.claims', jsonb_build_object('iss', p_issuer, 'sub', p_subject)::text, true);
  v_actor := app.current_user_id();
  if v_actor is null then raise exception 'Ikke innlogget' using errcode = '42501'; end if;
  update public.pending_uploads set taken_at = now()
    where id = p_id and user_id = v_actor and taken_at is null and created_at > now() - interval '3 hours' returning * into r;
  if r.id is null then return null; end if;
  return to_jsonb(r);
end $$;

-- Påbegynte opplastinger eldre enn 3 timer (lenken varer i 2) fjernes. Nøklene som IKKE er registrert som filer, returneres,
-- så serveren sletter dem fra lagringen (uferdige, avviste eller lastet opp på nytt etter avvisning).
create or replace function public.upload_expired_take(p_limit int default 20) returns setof text
language sql security definer set search_path = '' as $$
  with d as (
    delete from public.pending_uploads where id in (
      select id from public.pending_uploads where created_at < now() - interval '3 hours' order by created_at limit least(greatest(coalesce(p_limit, 20), 1), 100)
      for update skip locked)
    returning storage_key)
  select d.storage_key from d where not exists (select 1 from public.files f where f.storage_key = d.storage_key)
$$;

revoke all on function public.upload_begin(text, text, text, uuid, text, uuid, text, text, text, bigint) from public, anon, authenticated;
revoke all on function public.upload_take(uuid, text, text) from public, anon, authenticated;
revoke all on function public.upload_expired_take(int) from public, anon, authenticated;
do $$ begin if exists (select 1 from pg_roles where rolname = 'service_role') then
  execute 'grant execute on function public.upload_begin(text, text, text, uuid, text, uuid, text, text, text, bigint) to service_role';
  execute 'grant execute on function public.upload_take(uuid, text, text) to service_role';
  execute 'grant execute on function public.upload_expired_take(int) to service_role';
  execute 'grant execute on function public.create_church_with_logo(text, text, text, uuid, text, text, text, text, bigint, text) to service_role';
end if; end $$;
