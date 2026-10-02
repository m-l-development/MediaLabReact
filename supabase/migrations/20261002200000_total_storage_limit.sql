-- ConnectHub · Trinn 20: samlet lagringsgrense for hele ConnectHub (standard 1 GB). Vanlig PostgreSQL.
--   - Grensen gjelder summen av alle filer (alle menigheter, også private filer og kopier i Samarbeidsfiler).
--   - Den kontrolleres ved opplasting (app.upload_check) og ved kopi til Samarbeidsfiler (app.transfer_check), ETTER
--     menighetens egen kvote. Full samlet plass gir egen feilkode SQLSTATE 53100 («storage_full»), adskilt fra
--     menighetens kvote (54000).
--   - Registrering av filer og kopier tar én felles lås, så samtidige opplastinger i ulike menigheter ikke kan gå over
--     grensen til sammen.
--   - Overbooking er tillatt (avklart): summen av menighetenes kvoter kan være større enn den samlede grensen; den samlede
--     sperren stopper da opplastingen. Developer ser summen og får varsel ved 80 % og 90 % bruk.
--   - Bare Developer med MFA endrer grensen (loggført med gammel og ny verdi). Ingen kvoter, planer eller filer endres.
--   - Lagringsobjekter uten filrad (opprydding som feilet) telles ikke; de er ikke i bruk i dag (kontrollert: 0).

-- ---------- Innstilling (én rad) ----------
create table public.storage_settings (
  id boolean primary key default true check (id),
  total_limit_mb int not null default 1024 check (total_limit_mb between 1 and 1048576),
  updated_by uuid references public.app_users (id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.storage_settings enable row level security;
revoke all on public.storage_settings from anon, authenticated;
insert into public.storage_settings (id, total_limit_mb) values (true, 1024) on conflict (id) do nothing;

create or replace function app.total_limit_bytes() returns bigint language sql stable security definer set search_path = '' as $$
  select coalesce((select total_limit_mb from public.storage_settings where id), 1024)::bigint * 1048576
$$;
create or replace function app.total_used_bytes() returns bigint language sql stable security definer set search_path = '' as $$
  select coalesce(sum(file_size), 0)::bigint from public.files
$$;
-- Kaster storage_full (53100) hvis en ny fil på p_size byte ville gått over den samlede grensen.
create or replace function app.total_check(p_size bigint) returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if app.total_used_bytes() + coalesce(p_size, 0) > app.total_limit_bytes() then
    raise exception 'Den samlede lagringsplassen i ConnectHub er brukt opp' using errcode = '53100';
  end if;
end $$;
-- Varsler Developer når samlet bruk passerer 80 % eller 90 % (én gang per passering).
create or replace function app.total_threshold_notify(p_before bigint, p_after bigint) returns void
language plpgsql security definer set search_path = '' as $$
declare lim bigint := app.total_limit_bytes(); t int;
begin
  foreach t in array array[90, 80] loop
    if p_before * 100 < lim * t and p_after * 100 >= lim * t then
      perform app.notify(r.user_id, 'storage', 'Samlet lagring over ' || t || ' %',
        'ConnectHub har brukt ' || round(p_after / 1048576.0) || ' av ' || (lim / 1048576) || ' MB. Opplasting stoppes når plassen er full.',
        '/connecthub-admin.dc.html#/abonnement', null)
      from (select distinct user_id from public.user_roles where role = 'developer' and revoked_at is null) r;
      exit;
    end if;
  end loop;
end $$;
revoke all on function app.total_limit_bytes(), app.total_used_bytes(), app.total_check(bigint), app.total_threshold_notify(bigint, bigint) from public, anon, authenticated;

alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in ('invitation_accepted', 'space_invite', 'space_joined', 'subscription', 'church_status', 'message', 'church_link', 'storage'));

-- ---------- Opplasting: menighetens kvote først, så den samlede grensen (ellers uendret fra trinn 18) ----------
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
                 join public.churches c on c.id = r.church_id and c.status = 'active'
                 where r.user_id = p_actor and r.role = 'church_admin' and r.church_id = p_church and r.revoked_at is null) into adm;
  if p_private then
    if not member then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  elsif p_folder = 'bilder' then
    if not member then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  elsif not adm then raise exception 'Bare admin kan legge filer i denne mappen' using errcode = '42501';
  end if;
  select coalesce(sum(file_size), 0) into used from public.files where church_id = p_church;
  select storage_quota_mb::bigint * 1048576 into quota from public.churches where id = p_church;
  if used + p_size > quota then raise exception 'Menighetens lagringskvote er brukt opp' using errcode = '54000'; end if;
  if p_private then
    select coalesce(sum(file_size), 0) into mine from public.files where uploaded_by = p_actor and visibility = 'private';
    if mine + p_size > 52428800 then raise exception 'Din private kvote (50 MB) er brukt opp' using errcode = '54000'; end if;
  end if;
  perform app.total_check(p_size);
end $$;
revoke all on function app.upload_check(uuid, uuid, text, boolean, bigint) from public, anon, authenticated;

-- Registrering (bare serveren): felles lås for hele ConnectHub (samlet grense), deretter kontroll og innsetting.
create or replace function public.register_file(p_issuer text, p_subject text, p_church uuid, p_folder text, p_private boolean,
  p_key text, p_name text, p_mime text, p_size bigint, p_sha256 text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid; v_id uuid; v_before bigint;
begin
  perform set_config('request.jwt.claims', jsonb_build_object('iss', p_issuer, 'sub', p_subject)::text, true);
  v_actor := app.current_user_id();
  perform pg_advisory_xact_lock(hashtext('files:all'));
  perform app.upload_check(v_actor, p_church, p_folder, p_private, p_size);
  v_before := app.total_used_bytes();
  insert into public.files (church_id, storage_key, file_name, mime_type, file_size, sha256, uploaded_by, folder, visibility)
  values (p_church, p_key, p_name, p_mime, p_size, p_sha256, v_actor, p_folder, case when p_private then 'private' else 'church' end)
  returning id into v_id;
  perform app.total_threshold_notify(v_before, v_before + p_size);
  return jsonb_build_object('id', v_id, 'file_name', p_name, 'folder', p_folder, 'visibility', case when p_private then 'private' else 'church' end, 'file_size', p_size);
end $$;

-- ---------- Kopi til Samarbeidsfiler: samme samlede grense (ellers uendret fra trinn 18) ----------
create or replace function app.transfer_check(p_actor uuid, p_file uuid, p_link uuid) returns public.files
language plpgsql stable security definer set search_path = '' as $$
declare f public.files; l public.church_links; used bigint; quota bigint;
begin
  if p_actor is null then raise exception 'Ikke innlogget' using errcode = '42501'; end if;
  select * into f from public.files where id = p_file;
  if f.id is null then raise exception 'Fant ikke filen' using errcode = '22023'; end if;
  if f.visibility <> 'church' or f.folder = 'samarbeid' then raise exception 'Bare fellesfiler fra Delt mappe eller Faste kan overføres' using errcode = '42501'; end if;
  select * into l from public.church_links where id = p_link;
  if l.id is null or l.status <> 'active' or l.church_a is null or l.church_b is null then raise exception 'Fant ingen aktiv kobling' using errcode = '22023'; end if;
  if f.church_id not in (l.church_a, l.church_b) then raise exception 'Menigheten er ikke med i koblingen' using errcode = '42501'; end if;
  if not (app.church_service_ok(l.church_a) and app.church_service_ok(l.church_b)) then raise exception 'Samarbeid er ikke tilgjengelig nå' using errcode = '42501'; end if;
  if f.folder = 'bilder' then
    if not app.is_member(f.church_id) then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  elsif not app.is_church_admin(f.church_id) then raise exception 'Bare admin kan overføre fra Faste' using errcode = '42501';
  end if;
  if exists (select 1 from public.files where link_id = p_link and source_file_id = p_file) then
    raise exception 'Bildet ligger allerede i Samarbeidsfiler' using errcode = '23505'; end if;
  select coalesce(sum(file_size), 0) into used from public.files where church_id = f.church_id;
  select storage_quota_mb::bigint * 1048576 into quota from public.churches where id = f.church_id;
  if used + f.file_size > quota then raise exception 'Menighetens lagringskvote er brukt opp' using errcode = '54000'; end if;
  perform app.total_check(f.file_size);
  return f;
end $$;
revoke all on function app.transfer_check(uuid, uuid, uuid) from public, anon, authenticated;

create or replace function public.register_link_copy(p_issuer text, p_subject text, p_file uuid, p_link uuid, p_key text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid; f public.files; v_id uuid; v_before bigint;
begin
  perform set_config('request.jwt.claims', jsonb_build_object('iss', p_issuer, 'sub', p_subject)::text, true);
  v_actor := app.current_user_id();
  perform pg_advisory_xact_lock(hashtext('files:all'));   -- samme lås som opplasting (kvote og samlet grense)
  f := app.transfer_check(v_actor, p_file, p_link);
  v_before := app.total_used_bytes();
  insert into public.files (church_id, storage_key, file_name, mime_type, file_size, sha256, uploaded_by, folder, visibility, link_id, source_file_id, source_folder)
  values (f.church_id, p_key, f.file_name, f.mime_type, f.file_size, f.sha256, v_actor, 'samarbeid', 'church', p_link, p_file, f.folder)
  returning id into v_id;
  perform app.total_threshold_notify(v_before, v_before + f.file_size);
  return jsonb_build_object('id', v_id, 'file_name', f.file_name, 'folder', 'samarbeid', 'source_folder', f.folder, 'link_id', p_link, 'file_size', f.file_size);
end $$;

-- ---------- Forbruk for medlemmer: også ledig samlet plass (bare ett tall; ingen detaljer om andre menigheter) ----------
create or replace function public.storage_usage(p_church uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select case when app.is_member(p_church) or app.is_church_admin(p_church) then jsonb_build_object(
    'used_bytes', (select coalesce(sum(file_size), 0) from public.files where church_id = p_church),
    'quota_bytes', (select storage_quota_mb::bigint * 1048576 from public.churches where id = p_church),
    'my_private_bytes', (select coalesce(sum(file_size), 0) from public.files where uploaded_by = app.current_user_id() and visibility = 'private'),
    'my_private_quota_bytes', 52428800,
    'system_free_bytes', greatest(0, app.total_limit_bytes() - app.total_used_bytes())) end
$$;

-- ---------- Developer: oversikt og endring av grensen ----------
create or replace function public.storage_overview() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if app.current_user_id() is null or not app.is_developer() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  return jsonb_build_object(
    'limit_mb', (select total_limit_mb from public.storage_settings where id),
    'used_bytes', app.total_used_bytes(),
    'quota_sum_mb', (select coalesce(sum(storage_quota_mb), 0) from public.churches where status <> 'deleted'),
    'churches', (select count(*) from public.churches where status <> 'deleted'),
    'updated_at', (select updated_at from public.storage_settings where id));
end $$;

create or replace function public.set_storage_limit(p_mb int) returns void
language plpgsql security definer set search_path = '' as $$
declare v_old int;
begin
  if app.current_user_id() is null or not app.is_developer() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  if p_mb is null or p_mb < 1 or p_mb > 1048576 then raise exception 'Grensen må være mellom 1 MB og 1 TB' using errcode = '22023'; end if;
  select total_limit_mb into v_old from public.storage_settings where id for update;
  update public.storage_settings set total_limit_mb = p_mb, updated_by = app.current_user_id(), updated_at = now() where id;
  insert into public.audit_logs (actor_user_id, action, target_type, target_id, meta)
  values (app.current_user_id(), 'storage.limit', 'storage_settings', 'total', jsonb_build_object('old_mb', v_old, 'new_mb', p_mb));
end $$;

revoke all on function public.storage_overview(), public.set_storage_limit(int) from public, anon, authenticated;
grant execute on function public.storage_overview(), public.set_storage_limit(int) to authenticated;
