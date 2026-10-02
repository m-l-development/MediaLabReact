-- ConnectHub · Trinn 18 (med trinn 11): koblinger mellom to menigheter med egen Samarbeidsfiler-mappe, og strengere
-- filtilgang. Vanlig PostgreSQL. Ingen eksisterende rader endres; de gamle samarbeidstabellene (spaces, space_members,
-- space_files) står urørt, men deling av vanlige filer gjennom dem er skrudd av.
--
-- Grunnkrav: menigheter ser aldri hverandres filer. Eneste unntak er KOPIER i Samarbeidsfiler-mappen til en aktiv kobling
-- mellom nøyaktig to menigheter. Bare Moderator oppretter, avslutter og gjenåpner koblinger.
--   A1: Developer har bare tilgang til filer i menigheter der Developer er medlem (stabsleddet fjernes).
--   A2: Moderator ser bare metadata for Samarbeidsfiler (via link_files_meta), aldri filrader eller innhold.
--   A3: Samarbeidsfiler er en egen mappe ('samarbeid') per kobling; filer kommer dit bare som kopi.
--   M1 (trinn 11): Faste (faste/logoer/bakgrunner/mockups) forvaltes bare av Admin i egen menighet.

-- ---------- Roller ----------
-- Samarbeidsansvarlig er nå bare Moderator (med MFA via has_global_role). Developer har ingen egen samarbeidstilgang.
create or replace function app.is_collab_admin() returns boolean language sql stable set search_path = '' as $$ select app.is_moderator() $$;

-- Om menigheten kan bruke abonnementsavhengige funksjoner (opplasting, samarbeid). Foreløpig: menigheten er aktiv.
-- Trinn 15 utvider dette med utløpt abonnement. Regnes ut ved hver kontroll – ingen bufret tilstand.
create or replace function app.church_service_ok(p_church uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.churches c where c.id = p_church and c.status = 'active')
$$;
revoke all on function app.church_service_ok(uuid) from public, anon;
grant execute on function app.church_service_ok(uuid) to authenticated;

-- ---------- Koblinger ----------
-- Menighetene settes til NULL om en menighet slettes for godt (koblingen er da avsluttet; den andre menighetens kopier
-- blir liggende skjult – ingen automatisk sletting).
create table public.church_links (
  id uuid primary key default gen_random_uuid(),
  church_a uuid references public.churches (id) on delete set null,
  church_b uuid references public.churches (id) on delete set null,
  status text not null default 'active' check (status in ('active', 'ended')),
  created_by uuid references public.app_users (id) on delete set null,
  created_at timestamptz not null default now(),
  ended_by uuid references public.app_users (id) on delete set null,
  ended_at timestamptz,
  constraint church_links_pair check (church_a is null or church_b is null or church_a < church_b)
);
create unique index church_links_active_pair on public.church_links (church_a, church_b) where status = 'active';
create index church_links_b_idx on public.church_links (church_b);
alter table public.church_links enable row level security;
revoke all on public.church_links from anon, authenticated;
grant select (id, church_a, church_b, status, created_at, ended_at) on public.church_links to authenticated;

-- Tilgang til en kobling: aktiv, begge menighetene finnes, og brukeren er aktivt medlem av en av dem som kan bruke
-- samarbeid (church_service_ok). Developer får tilgang bare gjennom egne medlemskap (A1).
create or replace function app.link_access(p_link uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.church_links l
                 where l.id = p_link and l.status = 'active' and l.church_a is not null and l.church_b is not null
                   and ((app.is_member(l.church_a) and app.church_service_ok(l.church_a))
                     or (app.is_member(l.church_b) and app.church_service_ok(l.church_b))))
$$;
revoke all on function app.link_access(uuid) from public, anon;
grant execute on function app.link_access(uuid) to authenticated;

create policy church_links_select on public.church_links for select to authenticated using (app.is_collab_admin() or app.link_access(id));

-- ---------- Filer: Samarbeidsfiler-mappe og kopier ----------
alter table public.files
  add column link_id uuid references public.church_links (id) on delete restrict,
  add column source_file_id uuid references public.files (id) on delete set null;
alter table public.files drop constraint if exists files_folder_check;
alter table public.files add constraint files_folder_check check (folder in ('bilder', 'logoer', 'bakgrunner', 'mockups', 'faste', 'samarbeid'));
alter table public.files add constraint files_link_folder check ((folder = 'samarbeid') = (link_id is not null));
alter table public.files add constraint files_link_visibility check (link_id is null or visibility = 'church');
create unique index files_link_source_uq on public.files (link_id, source_file_id) where link_id is not null and source_file_id is not null;
create index files_link_idx on public.files (link_id) where link_id is not null;
grant select (link_id, source_file_id) on public.files to authenticated;

-- Hvem ser en fil (samme regel i RLS og for nedlastingslenker):
--   vanlige mapper: medlem (inkl. Admin) av menigheten – aldri stab eller samarbeid (A1, A2);
--   private filer: bare eieren;
--   Samarbeidsfiler: medlem av en av de to menighetene i en aktiv kobling, og menigheten som bidro kan bruke samarbeid.
create or replace function app.can_see_file(p_church uuid, p_folder text, p_visibility text, p_owner uuid, p_link uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select case
    when p_visibility = 'private' then p_owner = app.current_user_id()
    when p_folder = 'samarbeid' then app.link_access(p_link) and app.church_service_ok(p_church)
    else app.is_member(p_church) or app.is_church_admin(p_church) end
$$;
revoke all on function app.can_see_file(uuid, text, text, uuid, uuid) from public, anon;
grant execute on function app.can_see_file(uuid, text, text, uuid, uuid) to authenticated;

drop policy files_select on public.files;
create policy files_select on public.files for select to authenticated
  using (app.can_see_file(church_id, folder, visibility, uploaded_by, link_id));

create or replace function app.visible_file_keys(p_ids uuid[]) returns table (id uuid, storage_key text, mime_type text)
language sql stable security definer set search_path = '' as $$
  select f.id, f.storage_key, f.mime_type from public.files f
  where f.id = any (p_ids) and app.can_see_file(f.church_id, f.folder, f.visibility, f.uploaded_by, f.link_id)
$$;
revoke all on function app.visible_file_keys(uuid[]) from public, anon, authenticated;

-- Opplasting: stabsleddet er fjernet (A1). Faste bare for Admin i menigheten (M1). Samarbeidsfiler kan ikke lastes opp
-- direkte – bare kopieres inn (copy_to_link).
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
end $$;
revoke all on function app.upload_check(uuid, uuid, text, boolean, bigint) from public, anon, authenticated;

-- Sletting:
--   private filer: eieren;
--   Delt mappe ('bilder'): den som lastet opp, eller Admin i menigheten;
--   Faste: bare Admin i menigheten (M1) – ikke den som lastet opp uten Admin-rolle, ikke Developer uten Admin-rolle;
--   Samarbeidsfiler: bare Admin i menigheten som bidro med kopien (originalen røres ikke).
create or replace function public.delete_file(p_id uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := app.current_user_id(); f public.files; ok boolean;
begin
  if v_actor is null then raise exception 'Ikke innlogget' using errcode = '42501'; end if;
  select * into f from public.files where id = p_id for update;
  if not found then raise exception 'Fant ikke filen' using errcode = '22023'; end if;
  ok := case
    when f.visibility = 'private' then f.uploaded_by = v_actor
    when f.folder = 'bilder' then f.uploaded_by = v_actor or app.is_church_admin(f.church_id)
    else app.is_church_admin(f.church_id) end;    -- Faste og Samarbeidsfiler
  if not coalesce(ok, false) then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  delete from public.files where id = p_id;
  return f.storage_key;
end $$;

-- Forbruk: bare medlemmer og Admin i menigheten (A1).
create or replace function public.storage_usage(p_church uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select case when app.is_member(p_church) or app.is_church_admin(p_church) then jsonb_build_object(
    'used_bytes', (select coalesce(sum(file_size), 0) from public.files where church_id = p_church),
    'quota_bytes', (select storage_quota_mb::bigint * 1048576 from public.churches where id = p_church),
    'my_private_bytes', (select coalesce(sum(file_size), 0) from public.files where uploaded_by = app.current_user_id() and visibility = 'private'),
    'my_private_quota_bytes', 52428800) end
$$;

-- ---------- Koblinger: opprette, avslutte, gjenåpne (bare Moderator) ----------
alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in ('invitation_accepted', 'space_invite', 'space_joined', 'subscription', 'church_status', 'message', 'church_link'));
create or replace function app.notify_link(p_link uuid, p_title text, p_body text) returns void
language sql security definer set search_path = '' as $$
  select app.notify(r.user_id, 'church_link', p_title, p_body, '/connecthub-admin.dc.html#/filer', r.church_id)
  from public.church_links l join public.user_roles r on r.church_id in (l.church_a, l.church_b) and r.role = 'church_admin' and r.revoked_at is null
  where l.id = p_link
$$;
revoke all on function app.notify_link(uuid, text, text) from public, anon, authenticated;

create or replace function public.create_link(p_church1 uuid, p_church2 uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := app.current_user_id(); v uuid; a uuid := least(p_church1, p_church2); b uuid := greatest(p_church1, p_church2);
begin
  if v_actor is null or not app.is_collab_admin() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  if a is null or b is null or a = b then raise exception 'Velg to ulike menigheter' using errcode = '22023'; end if;
  if (select count(*) from public.churches where id in (a, b) and status = 'active') <> 2 then
    raise exception 'Begge menighetene må være aktive' using errcode = '22023'; end if;
  insert into public.church_links (church_a, church_b, created_by) values (a, b, v_actor) returning id into v;
  insert into public.audit_logs (actor_user_id, action, target_type, target_id, meta)
  values (v_actor, 'links.create', 'church_links', v::text, jsonb_build_object('church_a', a, 'church_b', b));
  perform app.notify_link(v, 'Ny samarbeidskobling', 'Menigheten har fått en felles Samarbeidsfiler-mappe med en annen menighet.');
  return v;
end $$;

create or replace function public.end_link(p_link uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := app.current_user_id();
begin
  if v_actor is null or not app.is_collab_admin() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  update public.church_links set status = 'ended', ended_by = v_actor, ended_at = now() where id = p_link and status = 'active';
  if not found then raise exception 'Fant ingen aktiv kobling' using errcode = '22023'; end if;
  insert into public.audit_logs (actor_user_id, action, target_type, target_id) values (v_actor, 'links.end', 'church_links', p_link::text);
  perform app.notify_link(p_link, 'Samarbeidskobling avsluttet', 'Samarbeidsfilene er skjult for begge menighetene. Ingen filer er slettet.');
end $$;

create or replace function public.reopen_link(p_link uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := app.current_user_id(); l public.church_links;
begin
  if v_actor is null or not app.is_collab_admin() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  select * into l from public.church_links where id = p_link and status = 'ended' for update;
  if l.id is null then raise exception 'Fant ingen avsluttet kobling' using errcode = '22023'; end if;
  if l.church_a is null or l.church_b is null or (select count(*) from public.churches where id in (l.church_a, l.church_b) and status = 'active') <> 2 then
    raise exception 'Begge menighetene må finnes og være aktive' using errcode = '22023'; end if;
  update public.church_links set status = 'active', ended_by = null, ended_at = null where id = p_link;   -- finnes en annen aktiv kobling for paret: 23505
  insert into public.audit_logs (actor_user_id, action, target_type, target_id) values (v_actor, 'links.reopen', 'church_links', p_link::text);
  perform app.notify_link(p_link, 'Samarbeidskobling gjenåpnet', 'Samarbeidsfilene er synlige igjen for begge menighetene.');
end $$;

-- Koblinger brukeren kan se, med navn på begge menighetene (navnene på andre menigheter er ellers ikke lesbare).
-- Moderator: alle (også avsluttede). Andre: bare aktive koblinger for egne menigheter (Developer bare via medlemskap).
create or replace function public.my_links() returns table (id uuid, church_a uuid, church_a_name text, church_b uuid, church_b_name text,
  status text, created_at timestamptz, ended_at timestamptz, my_church uuid)
language sql stable security definer set search_path = '' as $$
  select l.id, l.church_a, ca.name, l.church_b, cb.name, l.status, l.created_at, l.ended_at,
         case when app.is_member(l.church_a) then l.church_a when app.is_member(l.church_b) then l.church_b end
  from public.church_links l left join public.churches ca on ca.id = l.church_a left join public.churches cb on cb.id = l.church_b
  where app.is_collab_admin() or app.link_access(l.id)
  order by l.status, ca.name, cb.name
$$;

-- Moderator: bare metadata for filene i en kobling (ingen innhold, ingen nedlasting, ingen lagringsnøkkel).
create or replace function public.link_files_meta(p_link uuid) returns table (id uuid, file_name text, mime_type text, file_size bigint, church_id uuid, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not app.is_collab_admin() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  return query select f.id, f.file_name, f.mime_type, f.file_size, f.church_id, f.created_at
    from public.files f where f.link_id = p_link order by f.created_at desc;
end $$;

-- ---------- Overføring til Samarbeidsfiler (kopi) ----------
-- Regler: originalen er en fellesfil (ikke privat, ikke Samarbeidsfiler) i en menighet som er med i en aktiv kobling;
-- begge menighetene kan bruke samarbeid; fra Delt mappe kan alle medlemmer kopiere, fra Faste bare Admin (M1);
-- kvoten til menigheten som bidro holder. Returnerer originalens metadata.
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
  return f;
end $$;
revoke all on function app.transfer_check(uuid, uuid, uuid) from public, anon, authenticated;

-- Forhåndskontroll (serveren, med brukerens token): gir lagringsnøkkelen til originalen så serveren kan kopiere.
create or replace function public.can_transfer(p_file uuid, p_link uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare f public.files;
begin
  f := app.transfer_check(app.current_user_id(), p_file, p_link);
  return jsonb_build_object('storage_key', f.storage_key, 'church_id', f.church_id, 'mime_type', f.mime_type, 'file_size', f.file_size, 'sha256', f.sha256);
end $$;

-- Registrering av kopien (bare serveren, etter at kopien er laget i lagringen). Kontrolleres på nytt med lås.
create or replace function public.register_link_copy(p_issuer text, p_subject text, p_file uuid, p_link uuid, p_key text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid; f public.files; v_church uuid; v_id uuid;
begin
  perform set_config('request.jwt.claims', jsonb_build_object('iss', p_issuer, 'sub', p_subject)::text, true);
  v_actor := app.current_user_id();
  select church_id into v_church from public.files where id = p_file;
  if v_church is not null then perform pg_advisory_xact_lock(hashtext('files:' || v_church::text)); end if;   -- samme lås som opplasting (kvote)
  f := app.transfer_check(v_actor, p_file, p_link);
  insert into public.files (church_id, storage_key, file_name, mime_type, file_size, sha256, uploaded_by, folder, visibility, link_id, source_file_id)
  values (f.church_id, p_key, f.file_name, f.mime_type, f.file_size, f.sha256, v_actor, 'samarbeid', 'church', p_link, p_file)
  returning id into v_id;
  return jsonb_build_object('id', v_id, 'file_name', f.file_name, 'folder', 'samarbeid', 'link_id', p_link, 'file_size', f.file_size);
end $$;

revoke all on function public.create_link(uuid, uuid), public.end_link(uuid), public.reopen_link(uuid), public.my_links(),
  public.link_files_meta(uuid), public.can_transfer(uuid, uuid), public.register_link_copy(text, text, uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.create_link(uuid, uuid), public.end_link(uuid), public.reopen_link(uuid), public.my_links(),
  public.link_files_meta(uuid), public.can_transfer(uuid, uuid) to authenticated;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'grant execute on function public.register_link_copy(text, text, uuid, uuid, text) to service_role';
  end if;
end $$;

-- ---------- Den gamle samarbeidsmodellen: deling av vanlige filer er skrudd av (A3) ----------
create or replace function public.share_file_to_space(p_file uuid, p_space uuid, p_share boolean default true) returns void
language plpgsql security definer set search_path = '' as $$
begin raise exception 'Erstattet av koblinger og Samarbeidsfiler' using errcode = '42501'; end $$;
create or replace function public.invite_to_space(p_space uuid, p_church uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin raise exception 'Erstattet av koblinger og Samarbeidsfiler' using errcode = '42501'; end $$;

-- ---------- Livsløp ----------
-- Eksport: Developer som ikke er medlem får filoversikten (metadata), men aldri nedlastingslenker – de lages av serveren
-- med brukerens token og følger app.can_see_file. Koblinger tas med.
create or replace function public.export_church(p_church uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not (app.is_church_admin(p_church) or app.is_staff()) then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  return jsonb_build_object(
    'exported_at', now(), 'format', 'connecthub-church-export/2',
    'church', (select to_jsonb(c) - 'storage_quota_mb' from public.churches c where c.id = p_church),
    'subscription', (select to_jsonb(s) - 'updated_by' from public.church_subscriptions s where s.church_id = p_church),
    'members', coalesce((select jsonb_agg(jsonb_build_object('name', u.full_name, 'email', u.email, 'membership', m.status, 'since', m.created_at,
        'admin', exists (select 1 from public.user_roles r where r.user_id = u.id and r.church_id = p_church and r.role = 'church_admin' and r.revoked_at is null)))
      from public.memberships m join public.app_users u on u.id = m.user_id where m.church_id = p_church), '[]'),
    'invitations', coalesce((select jsonb_agg(jsonb_build_object('email', i.email, 'role', i.role, 'status', i.status, 'created_at', i.created_at, 'accepted_at', i.accepted_at))
      from public.invitations i where i.church_id = p_church), '[]'),
    'files', coalesce((select jsonb_agg(jsonb_build_object('id', f.id, 'name', f.file_name, 'type', f.mime_type, 'size', f.file_size, 'folder', f.folder, 'link_id', f.link_id, 'sha256', f.sha256, 'created_at', f.created_at))
      from public.files f where f.church_id = p_church and f.visibility = 'church'), '[]'),
    'links', coalesce((select jsonb_agg(jsonb_build_object('id', l.id, 'other_church', c.name, 'status', l.status, 'created_at', l.created_at, 'ended_at', l.ended_at))
      from public.church_links l left join public.churches c on c.id = case when l.church_a = p_church then l.church_b else l.church_a end
      where p_church in (l.church_a, l.church_b)), '[]'),
    'spaces', coalesce((select jsonb_agg(jsonb_build_object('name', s.name, 'owner', s.owner_church_id = p_church, 'status', sm.status))
      from public.space_members sm join public.spaces s on s.id = sm.space_id where sm.church_id = p_church), '[]'),
    'audit', coalesce((select jsonb_agg(jsonb_build_object('at', l.created_at, 'action', l.action, 'meta', l.meta) order by l.created_at desc)
      from (select * from public.audit_logs where church_id = p_church order by created_at desc limit 1000) l), '[]'));
end $$;

-- Endelig sletting av en menighet: koblingene avsluttes først. Menighetens egne filer (også kopiene den har bidratt med)
-- slettes som før; den andre menighetens kopier blir liggende skjult i den avsluttede koblingen (ingen automatisk sletting).
create or replace function public.purge_church(p_church uuid, p_issuer text, p_subject text, p_aal text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare c public.churches; n_files int; n_members int;
begin
  perform set_config('request.jwt.claims', jsonb_build_object('iss', p_issuer, 'sub', p_subject, 'aal', p_aal)::text, true);   -- aal fra det verifiserte tokenet
  if not app.is_staff() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  select * into c from public.churches where id = p_church for update;
  if c.id is null or c.status <> 'pending_deletion' then raise exception 'Menigheten må først settes til sletting' using errcode = '22023'; end if;
  update public.church_links set status = 'ended', ended_at = coalesce(ended_at, now()) where p_church in (church_a, church_b) and status = 'active';
  delete from public.files where church_id = p_church; get diagnostics n_files = row_count;
  delete from public.memberships where church_id = p_church; get diagnostics n_members = row_count;
  update public.invitations set email = 'slettet-' || id || '@slettet.invalid' where church_id = p_church;
  delete from public.churches where id = p_church;     -- roller, invitasjoner, abonnement og områder følger med (cascade); koblinger får NULL
  insert into public.audit_logs (actor_user_id, action, target_type, target_id, church_id, meta)
  values (app.current_user_id(), 'churches.purge', 'churches', p_church::text, p_church, jsonb_build_object('files', n_files, 'members', n_members));
  return jsonb_build_object('ok', true, 'files', n_files, 'members', n_members);
end $$;
