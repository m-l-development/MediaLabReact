-- ConnectHub · Loop Studio: delt disk for menigheten (TB-BB67CB), i tillegg til den personlige disken i nettleseren.
-- Alle aktive medlemmer i menigheten kan lese og lagre (nye og endrede looper); bare Admin i menigheten kan slette.
-- Hver loop har sitt eget versjonsnummer: en lagring mot en eldre versjon avvises (CH011), så en eldre kopi aldri
-- overskriver en nyere. Video og musikk deles aldri: lokale video-, lyd- og bildereferanser avvises; bilder må være
-- menighetens egne felles filer («ch:<id>»). Ny tabell og nye funksjoner – ingen eksisterende tabeller eller rader endres.

create table public.loop_disk (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches (id) on delete cascade,
  name text not null check (length(name) between 1 and 60),
  base text not null check (base in ('week', 'sunday', 'youth', 'blank')),
  data jsonb not null check (jsonb_typeof(data) = 'object' and octet_length(data::text) <= 524288),
  version int not null default 1,
  created_by uuid references public.app_users (id) on delete set null,
  updated_by uuid references public.app_users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index loop_disk_church_idx on public.loop_disk (church_id, updated_at desc);
alter table public.loop_disk enable row level security;
revoke all on public.loop_disk from public, anon, authenticated;
grant select on public.loop_disk to authenticated;
create policy loop_disk_select_member on public.loop_disk for select to authenticated using (app.is_member(church_id));

-- Lagre: ny loop (p_id null) eller endring av en eksisterende med versjonen brukeren har sett. → { id, version }
create or replace function public.loop_disk_save(p_church uuid, p_id uuid, p_name text, p_base text, p_data jsonb, p_version int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := app.current_user_id(); r public.loop_disk; v_ref text; v_id uuid; v_ver int; v_name text := btrim(coalesce(p_name, ''));
begin
  if v_actor is null or not app.is_member(p_church) then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  if length(v_name) < 1 or length(v_name) > 60 then raise exception 'Ugyldig navn' using errcode = '22023'; end if;
  if p_base is null or p_base not in ('week', 'sunday', 'youth', 'blank') then raise exception 'Ugyldig mal' using errcode = '22023'; end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object' or octet_length(p_data::text) > 524288 then raise exception 'Ugyldig innhold' using errcode = '22023'; end if;
  -- video og musikk deles aldri; lokale filer (bare på én PC) kan ikke deles
  if p_data::text ~ '"(vid-|aud-|img-|blob:|data:)' then raise exception 'Video, musikk og lokale filer kan ikke deles' using errcode = '22023'; end if;
  for v_ref in select distinct m[1] from regexp_matches(p_data::text, 'ch:([0-9a-fA-F-]{36})', 'g') m loop
    if not exists (select 1 from public.files f where f.id = v_ref::uuid and f.church_id = p_church and f.visibility = 'church' and f.folder <> 'samarbeid') then
      raise exception 'Bildet tilhører ikke menigheten' using errcode = '42501'; end if;
  end loop;
  perform pg_advisory_xact_lock(hashtext('loopdisk:' || p_church::text));
  if p_id is null then
    if (select count(*) from public.loop_disk where church_id = p_church) >= 30 then raise exception 'Menighetens disk er full (30)' using errcode = '54000'; end if;
    insert into public.loop_disk (church_id, name, base, data, created_by, updated_by) values (p_church, v_name, p_base, p_data, v_actor, v_actor)
      returning id, version into v_id, v_ver;
  else
    select * into r from public.loop_disk where id = p_id for update;
    if r.id is null or r.church_id <> p_church then raise exception 'Fant ikke loopen' using errcode = '22023'; end if;
    if r.version <> coalesce(p_version, -1) then raise exception 'Loopen er endret av en annen bruker' using errcode = 'CH011'; end if;
    update public.loop_disk set name = v_name, base = p_base, data = p_data, version = r.version + 1, updated_by = v_actor, updated_at = now()
      where id = p_id returning id, version into v_id, v_ver;
  end if;
  insert into public.audit_logs (actor_user_id, action, target_type, target_id, church_id, meta)
  values (v_actor, 'loopdisk.save', 'loop_disk', v_id::text, p_church, jsonb_build_object('version', v_ver, 'name', v_name));
  return jsonb_build_object('id', v_id, 'version', v_ver);
end $$;

-- Slette: bare Admin i menigheten (også ekstra Admin).
create or replace function public.loop_disk_delete(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := app.current_user_id(); r public.loop_disk;
begin
  if v_actor is null then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  select * into r from public.loop_disk where id = p_id;
  if r.id is null or not app.is_member(r.church_id) then raise exception 'Fant ikke loopen' using errcode = '22023'; end if;
  if not app.is_church_admin(r.church_id) then raise exception 'Bare Admin kan slette' using errcode = '42501'; end if;
  delete from public.loop_disk where id = p_id;
  insert into public.audit_logs (actor_user_id, action, target_type, target_id, church_id, meta)
  values (v_actor, 'loopdisk.delete', 'loop_disk', p_id::text, r.church_id, jsonb_build_object('name', r.name));
end $$;

revoke all on function public.loop_disk_save(uuid, uuid, text, text, jsonb, int), public.loop_disk_delete(uuid) from public, anon;
grant execute on function public.loop_disk_save(uuid, uuid, text, text, jsonb, int), public.loop_disk_delete(uuid) to authenticated;
