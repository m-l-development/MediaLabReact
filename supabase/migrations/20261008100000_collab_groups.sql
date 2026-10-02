-- ConnectHub · Samarbeidsgrupper med to eller flere menigheter (bare connecthub-dev først). Plan: docs/plan-samarbeidsgrupper.md.
--
-- church_links beholdes som GRUPPEN (alle kopier beholder sin files.link_id – ingen filer flyttes eller kopieres), og en ny
-- tabell church_link_members holder menighetene i gruppen. church_a/church_b blir stående (bakoverkompatibilitet og
-- tilbakeføring), men brukes ikke av ny kode.
--
-- Regler (håndheves her, ikke i klienten):
--   * en gruppe har 2–20 aktive medlemsmenigheter; endringer tar lås på gruppen (FOR UPDATE), så samtidige tillegg ikke kan gi 21
--     og samtidige fjerninger ikke kan gi færre enn 2;
--   * synlighet regnes ut ved hvert oppslag: gruppen er aktiv, menigheten som BIDRO er aktivt medlem og kan bruke tjenesten,
--     og den som ser, er medlem av en menighet som også er aktivt medlem (RLS, nedlastingslenker og verktøyene bruker samme
--     app.can_see_file);
--   * fjerning av en menighet skjuler kopiene den har bidratt med (ingenting slettes); gjeninnmelding viser dem igjen;
--   * Admin i en fjernet menighet kan ikke slette de skjulte kopiene (v1) – de ryddes når gruppen slettes;
--   * Developer/Moderator (app.is_collab_admin, med MFA) administrerer og ser bare metadata.
-- Ingen eksisterende rader slettes. Eksisterende koblinger blir grupper med sine to menigheter (kontrollert under).

-- ---------- Gruppen: navn og beskrivelse; parkontrollen fjernes ----------
alter table public.church_links add column name text, add column description text;
alter table public.church_links drop constraint church_links_pair;
drop index public.church_links_active_pair;

update public.church_links l set name = left(concat_ws(' – ',
    coalesce((select c.name from public.churches c where c.id = l.church_a), '(slettet menighet)'),
    coalesce((select c.name from public.churches c where c.id = l.church_b), '(slettet menighet)')), 80);
alter table public.church_links alter column name set not null;
alter table public.church_links add constraint church_links_name check (char_length(btrim(name)) between 2 and 80);
alter table public.church_links add constraint church_links_description check (description is null or char_length(description) <= 500);
grant select (name, description) on public.church_links to authenticated;

-- ---------- Medlemsmenigheter ----------
create table public.church_link_members (
  link_id uuid not null references public.church_links (id) on delete cascade,
  church_id uuid not null references public.churches (id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'left')),
  joined_by uuid references public.app_users (id) on delete set null,
  joined_at timestamptz not null default now(),
  left_by uuid references public.app_users (id) on delete set null,
  left_at timestamptz,
  primary key (link_id, church_id),
  constraint church_link_members_left check ((status = 'left') = (left_at is not null))
);
create index church_link_members_church_idx on public.church_link_members (church_id);
alter table public.church_link_members enable row level security;
revoke all on public.church_link_members from anon, authenticated;   -- ingen policyer: lesing bare via my_groups, skriving bare via funksjonene

insert into public.church_link_members (link_id, church_id, status, joined_by, joined_at)
select l.id, x.church_id, 'active', l.created_by, l.created_at
from public.church_links l cross join lateral (values (l.church_a), (l.church_b)) x (church_id)
where x.church_id is not null;

-- Kontroll: hver kobling er blitt en gruppe med sine menigheter (2 der begge finnes; aktive koblinger har alltid begge).
do $$
declare n_links int; n_bad int;
begin
  select count(*) into n_links from public.church_links;
  select count(*) into n_bad from public.church_links l
  where (select count(*) from public.church_link_members m where m.link_id = l.id)
        <> (l.church_a is not null)::int + (l.church_b is not null)::int
     or (l.status = 'active' and (select count(*) from public.church_link_members m where m.link_id = l.id and m.status = 'active') <> 2);
  if n_bad > 0 then raise exception 'Overføring av koblinger til grupper feilet for % av % koblinger', n_bad, n_links; end if;
  raise notice 'Samarbeidsgrupper: % koblinger overført', n_links;
end $$;

-- ---------- Tilgang ----------
-- Menigheten er aktivt medlem av gruppen og kan bruke tjenesten.
create or replace function app.group_member_ok(p_link uuid, p_church uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.church_link_members m where m.link_id = p_link and m.church_id = p_church and m.status = 'active')
     and app.church_service_ok(p_church)
$$;
revoke all on function app.group_member_ok(uuid, uuid) from public, anon;
grant execute on function app.group_member_ok(uuid, uuid) to authenticated;

-- Brukeren har tilgang til gruppen: gruppen er aktiv, og brukeren er aktivt medlem av en menighet som er aktivt medlem og
-- kan bruke tjenesten. Developer/Moderator får innhold bare gjennom egne medlemskap (A1/A2).
create or replace function app.group_access(p_link uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.church_links l join public.church_link_members m on m.link_id = l.id and m.status = 'active'
                 where l.id = p_link and l.status = 'active' and app.is_member(m.church_id) and app.church_service_ok(m.church_id))
$$;
revoke all on function app.group_access(uuid) from public, anon;
grant execute on function app.group_access(uuid) to authenticated;

-- Gammelt navn (brukes av policyen church_links_select) – nå samme regel som group_access.
create or replace function app.link_access(p_link uuid) returns boolean
language sql stable security definer set search_path = '' as $$ select app.group_access(p_link) $$;

-- Som i 20261005100100_removed_member_files.sql, men Samarbeidsfiler krever i tillegg at menigheten som bidro (p_church),
-- fortsatt er aktivt medlem av gruppen. Gjelder RLS (files_select), nedlastingslenker (visible_file_keys → file_keys) og
-- verktøyene (MLCloud.collab()).
create or replace function app.can_see_file(p_church uuid, p_folder text, p_visibility text, p_owner uuid, p_link uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select case
    when p_visibility = 'private' then p_owner = app.current_user_id() and not app.removed_from(p_church)
    when p_folder = 'samarbeid' then app.group_access(p_link) and app.group_member_ok(p_link, p_church)
    else app.is_member(p_church) or app.is_church_admin(p_church) end
$$;

-- Som i 20261005100100_removed_member_files.sql, men en kopi i Samarbeidsfiler kan bare fjernes av Admin i menigheten som
-- bidro MENS kopien er synlig (aktiv gruppe, menigheten er aktivt medlem). Skjulte kopier ryddes når gruppen slettes (v1).
create or replace function public.delete_file(p_id uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := app.current_user_id(); f public.files; ok boolean;
begin
  if v_actor is null then raise exception 'Ikke innlogget' using errcode = '42501'; end if;
  select * into f from public.files where id = p_id for update;
  if not found then raise exception 'Fant ikke filen' using errcode = '22023'; end if;
  ok := case
    when f.visibility = 'private' then f.uploaded_by = v_actor and not app.removed_from(f.church_id)
    when f.folder = 'bilder' then (f.uploaded_by = v_actor and not app.removed_from(f.church_id)) or app.is_church_admin(f.church_id)
    when f.folder = 'samarbeid' then app.is_church_admin(f.church_id) and app.group_access(f.link_id) and app.group_member_ok(f.link_id, f.church_id)
    else app.is_church_admin(f.church_id) end;    -- Faste
  if not coalesce(ok, false) then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  delete from public.files where id = p_id;
  return f.storage_key;
end $$;

-- ---------- Kopi til Samarbeidsfiler ----------
-- Som i 20261002200000_total_storage_limit.sql, men gruppebasert: originalen er en fellesfil i en menighet som er aktivt
-- medlem av en aktiv gruppe og kan bruke tjenesten. Delt mappe: alle medlemmer; Faste: bare Admin; private filer aldri.
create or replace function app.transfer_check(p_actor uuid, p_file uuid, p_link uuid) returns public.files
language plpgsql stable security definer set search_path = '' as $$
declare f public.files; l public.church_links; used bigint; quota bigint;
begin
  if p_actor is null then raise exception 'Ikke innlogget' using errcode = '42501'; end if;
  select * into f from public.files where id = p_file;
  if f.id is null then raise exception 'Fant ikke filen' using errcode = '22023'; end if;
  if f.visibility <> 'church' or f.folder = 'samarbeid' then raise exception 'Bare fellesfiler fra Delt mappe eller Faste kan overføres' using errcode = '42501'; end if;
  select * into l from public.church_links where id = p_link;
  if l.id is null or l.status <> 'active' then raise exception 'Fant ingen aktiv samarbeidsgruppe' using errcode = '22023'; end if;
  if not exists (select 1 from public.church_link_members m where m.link_id = p_link and m.church_id = f.church_id and m.status = 'active') then
    raise exception 'Menigheten er ikke med i samarbeidsgruppen' using errcode = '42501'; end if;
  if not app.church_service_ok(f.church_id) then raise exception 'Samarbeid er ikke tilgjengelig nå' using errcode = '42501'; end if;
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

-- Som i 20261002200000_total_storage_limit.sql, men gruppen låses (FOR SHARE) før kontrollen: en samtidig fjerning,
-- avslutning eller sletting av gruppen venter, og kontrollen ser alltid siste tilstand.
create or replace function public.register_link_copy(p_issuer text, p_subject text, p_file uuid, p_link uuid, p_key text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid; f public.files; v_id uuid; v_before bigint;
begin
  perform set_config('request.jwt.claims', jsonb_build_object('iss', p_issuer, 'sub', p_subject)::text, true);
  v_actor := app.current_user_id();
  perform 1 from public.church_links where id = p_link for share;
  perform pg_advisory_xact_lock(hashtext('files:all'));   -- samme lås som opplasting (kvote og samlet grense)
  f := app.transfer_check(v_actor, p_file, p_link);
  v_before := app.total_used_bytes();
  insert into public.files (church_id, storage_key, file_name, mime_type, file_size, sha256, uploaded_by, folder, visibility, link_id, source_file_id, source_folder)
  values (f.church_id, p_key, f.file_name, f.mime_type, f.file_size, f.sha256, v_actor, 'samarbeid', 'church', p_link, p_file, f.folder)
  returning id into v_id;
  perform app.total_threshold_notify(v_before, v_before + f.file_size);
  return jsonb_build_object('id', v_id, 'file_name', f.file_name, 'folder', 'samarbeid', 'source_folder', f.folder, 'link_id', p_link, 'file_size', f.file_size);
end $$;

-- ---------- Varsler ----------
-- Admin i alle AKTIVE medlemsmenigheter i gruppen.
create or replace function app.notify_link(p_link uuid, p_title text, p_body text) returns void
language sql security definer set search_path = '' as $$
  select app.notify(r.user_id, 'church_link', p_title, p_body, '/connecthub-admin.dc.html#/filer', r.church_id)
  from public.church_link_members m join public.user_roles r on r.church_id = m.church_id and r.role = 'church_admin' and r.revoked_at is null
  where m.link_id = p_link and m.status = 'active'
$$;
-- Admin i én menighet (f.eks. menigheten som er fjernet fra gruppen).
create or replace function app.notify_link_church(p_church uuid, p_title text, p_body text) returns void
language sql security definer set search_path = '' as $$
  select app.notify(r.user_id, 'church_link', p_title, p_body, '/connecthub-admin.dc.html#/filer', r.church_id)
  from public.user_roles r where r.church_id = p_church and r.role = 'church_admin' and r.revoked_at is null
$$;
revoke all on function app.notify_link(uuid, text, text), app.notify_link_church(uuid, text, text) from public, anon, authenticated;

-- ---------- Hjelpere ----------
create or replace function app.group_name_ok(p_name text) returns text
language plpgsql immutable set search_path = '' as $$
declare v text := btrim(coalesce(p_name, ''));
begin
  if char_length(v) < 2 or char_length(v) > 80 then raise exception 'Navnet må ha 2–80 tegn' using errcode = '22023'; end if;
  if v ~ '[[:cntrl:]]' then raise exception 'Navnet inneholder ugyldige tegn' using errcode = '22023'; end if;
  return v;
end $$;
create or replace function app.group_desc_ok(p_desc text) returns text
language plpgsql immutable set search_path = '' as $$
declare v text := nullif(btrim(coalesce(p_desc, '')), '');
begin
  if v is not null and char_length(v) > 500 then raise exception 'Beskrivelsen kan ha høyst 500 tegn' using errcode = '22023'; end if;
  return v;
end $$;
create or replace function app.group_active_count(p_link uuid) returns int
language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.church_link_members where link_id = p_link and status = 'active'
$$;
revoke all on function app.group_name_ok(text), app.group_desc_ok(text), app.group_active_count(uuid) from public, anon, authenticated;

-- ---------- Opprette og endre (bare Developer/Moderator med MFA) ----------
-- p_churches: 2–20 ulike, aktive menigheter. Feil: CH008 (over 20), 22023 (ugyldig).
create or replace function public.create_group(p_name text, p_description text, p_churches uuid[]) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := app.current_user_id(); v uuid; v_name text; v_desc text; v_ids uuid[];
begin
  if v_actor is null or not app.is_collab_admin() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  v_name := app.group_name_ok(p_name); v_desc := app.group_desc_ok(p_description);
  select coalesce(array_agg(distinct x), '{}') into v_ids from unnest(coalesce(p_churches, '{}')) x where x is not null;
  if cardinality(v_ids) < 2 then raise exception 'Velg minst to ulike menigheter' using errcode = '22023'; end if;
  if cardinality(v_ids) > 20 then raise exception 'En samarbeidsgruppe kan ha høyst 20 menigheter' using errcode = 'CH008'; end if;
  if (select count(*) from public.churches where id = any (v_ids) and status = 'active') <> cardinality(v_ids) then
    raise exception 'Alle menighetene må være aktive' using errcode = '22023'; end if;
  insert into public.church_links (name, description, created_by) values (v_name, v_desc, v_actor) returning id into v;
  insert into public.church_link_members (link_id, church_id, joined_by) select v, x, v_actor from unnest(v_ids) x;
  insert into public.audit_logs (actor_user_id, action, target_type, target_id, meta)
  values (v_actor, 'groups.create', 'church_links', v::text, jsonb_build_object('name', v_name, 'churches', to_jsonb(v_ids)));
  perform app.notify_link(v, 'Ny samarbeidsgruppe', 'Menigheten er med i samarbeidsgruppen «' || v_name || '» med en felles Samarbeidsfiler-mappe.');
  return v;
end $$;

create or replace function public.update_group(p_link uuid, p_name text, p_description text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := app.current_user_id(); l public.church_links; v_name text; v_desc text;
begin
  if v_actor is null or not app.is_collab_admin() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  v_name := app.group_name_ok(p_name); v_desc := app.group_desc_ok(p_description);
  select * into l from public.church_links where id = p_link for update;
  if l.id is null then raise exception 'Fant ikke samarbeidsgruppen' using errcode = '22023'; end if;
  if l.name = v_name and l.description is not distinct from v_desc then return; end if;
  update public.church_links set name = v_name, description = v_desc where id = p_link;
  insert into public.audit_logs (actor_user_id, action, target_type, target_id, meta)
  values (v_actor, 'groups.update', 'church_links', p_link::text,
          jsonb_build_object('old_name', l.name, 'new_name', v_name, 'old_description', l.description, 'new_description', v_desc));
end $$;

-- Legger til en menighet, eller melder den inn igjen (samme rad blir aktiv; skjulte kopier vises igjen). Lov også i en
-- avsluttet gruppe (ingenting vises før gruppen gjenåpnes). Lås på gruppen: høyst 20 aktive medlemmer (CH008).
create or replace function public.add_group_church(p_link uuid, p_church uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := app.current_user_id(); l public.church_links; m public.church_link_members; v_cname text; v_rejoin boolean;
begin
  if v_actor is null or not app.is_collab_admin() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  select * into l from public.church_links where id = p_link for update;
  if l.id is null then raise exception 'Fant ikke samarbeidsgruppen' using errcode = '22023'; end if;
  select name into v_cname from public.churches where id = p_church and status = 'active';
  if v_cname is null then raise exception 'Menigheten må være aktiv' using errcode = '22023'; end if;
  select * into m from public.church_link_members where link_id = p_link and church_id = p_church;
  if m.status = 'active' then raise exception 'Menigheten er allerede med i gruppen' using errcode = 'CH009'; end if;
  if app.group_active_count(p_link) >= 20 then raise exception 'En samarbeidsgruppe kan ha høyst 20 menigheter' using errcode = 'CH008'; end if;
  v_rejoin := m.link_id is not null;
  if v_rejoin then
    update public.church_link_members set status = 'active', joined_by = v_actor, joined_at = now(), left_by = null, left_at = null
    where link_id = p_link and church_id = p_church;
  else
    insert into public.church_link_members (link_id, church_id, joined_by) values (p_link, p_church, v_actor);
  end if;
  insert into public.audit_logs (actor_user_id, action, target_type, target_id, church_id, meta)
  values (v_actor, 'groups.add_church', 'church_links', p_link::text, p_church,
          jsonb_build_object('name', l.name, 'church', v_cname, 'rejoin', v_rejoin,
                             'copies_shown', case when v_rejoin then (select count(*) from public.files where link_id = p_link and church_id = p_church) else 0 end));
  perform app.notify_link(p_link, 'Samarbeidsgruppe: ny menighet',
    '«' || v_cname || '» er med i samarbeidsgruppen «' || l.name || '»' || case when v_rejoin then ' igjen. Kopiene den delte tidligere, er synlige igjen.' else '.' end);
end $$;

-- Fjerner en menighet fra gruppen. Kopiene den har bidratt med, SKJULES (slettes ikke). Andre menigheters kopier påvirkes
-- ikke. Gruppen må ha minst 2 aktive medlemmer igjen (CH007 – avslutt gruppen i stedet).
create or replace function public.remove_group_church(p_link uuid, p_church uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := app.current_user_id(); l public.church_links; v_cname text; v_n int;
begin
  if v_actor is null or not app.is_collab_admin() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  select * into l from public.church_links where id = p_link for update;
  if l.id is null then raise exception 'Fant ikke samarbeidsgruppen' using errcode = '22023'; end if;
  if not exists (select 1 from public.church_link_members where link_id = p_link and church_id = p_church and status = 'active') then
    raise exception 'Menigheten er ikke med i gruppen' using errcode = '22023'; end if;
  if app.group_active_count(p_link) <= 2 then
    raise exception 'En samarbeidsgruppe må ha minst to menigheter. Avslutt gruppen i stedet.' using errcode = 'CH007'; end if;
  update public.church_link_members set status = 'left', left_by = v_actor, left_at = now() where link_id = p_link and church_id = p_church;
  select name into v_cname from public.churches where id = p_church;
  select count(*) into v_n from public.files where link_id = p_link and church_id = p_church;
  insert into public.audit_logs (actor_user_id, action, target_type, target_id, church_id, meta)
  values (v_actor, 'groups.remove_church', 'church_links', p_link::text, p_church,
          jsonb_build_object('name', l.name, 'church', v_cname, 'copies_hidden', v_n));
  perform app.notify_link_church(p_church, 'Fjernet fra samarbeidsgruppe',
    'Menigheten er fjernet fra samarbeidsgruppen «' || l.name || '». Kopiene menigheten delte der, er skjult. Ingenting er slettet, og originalene er urørt.');
  perform app.notify_link(p_link, 'Samarbeidsgruppe: menighet fjernet',
    '«' || coalesce(v_cname, 'Menigheten') || '» er fjernet fra samarbeidsgruppen «' || l.name || '». Kopiene den delte, er skjult.');
end $$;

-- ---------- Avslutte, gjenåpne, slette ----------
create or replace function public.end_link(p_link uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := app.current_user_id(); l public.church_links;
begin
  if v_actor is null or not app.is_collab_admin() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  select * into l from public.church_links where id = p_link and status = 'active' for update;
  if l.id is null then raise exception 'Fant ingen aktiv samarbeidsgruppe' using errcode = '22023'; end if;
  update public.church_links set status = 'ended', ended_by = v_actor, ended_at = now() where id = p_link;
  insert into public.audit_logs (actor_user_id, action, target_type, target_id, meta)
  values (v_actor, 'groups.end', 'church_links', p_link::text, jsonb_build_object('name', l.name));
  perform app.notify_link(p_link, 'Samarbeidsgruppe avsluttet', 'Samarbeidsfilene i «' || l.name || '» er skjult for alle menighetene. Ingen filer er slettet.');
end $$;

-- Gjenåpning krever 2–20 aktive medlemmer som alle er aktive menigheter.
create or replace function public.reopen_link(p_link uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := app.current_user_id(); l public.church_links; v_n int; v_ok int;
begin
  if v_actor is null or not app.is_collab_admin() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  select * into l from public.church_links where id = p_link and status = 'ended' for update;
  if l.id is null then raise exception 'Fant ingen avsluttet samarbeidsgruppe' using errcode = '22023'; end if;
  select count(*), count(*) filter (where c.status = 'active') into v_n, v_ok
  from public.church_link_members m join public.churches c on c.id = m.church_id where m.link_id = p_link and m.status = 'active';
  if v_n < 2 then raise exception 'En samarbeidsgruppe må ha minst to menigheter. Legg til en menighet først.' using errcode = 'CH007'; end if;
  if v_n > 20 then raise exception 'En samarbeidsgruppe kan ha høyst 20 menigheter' using errcode = 'CH008'; end if;
  if v_ok <> v_n then raise exception 'Alle menighetene i gruppen må være aktive' using errcode = '22023'; end if;
  update public.church_links set status = 'active', ended_by = null, ended_at = null where id = p_link;
  insert into public.audit_logs (actor_user_id, action, target_type, target_id, meta)
  values (v_actor, 'groups.reopen', 'church_links', p_link::text, jsonb_build_object('name', l.name));
  perform app.notify_link(p_link, 'Samarbeidsgruppe gjenåpnet', 'Samarbeidsfilene i «' || l.name || '» er synlige igjen.');
end $$;

-- Som i 20261007100100_delete_ended_links.sql, men med gruppenavn og medlemsliste i loggen (groups.delete). Medlemsradene
-- følger med (cascade). Kopiene (også skjulte) går til file_cleanup_queue; originalene røres ikke.
create or replace function public.delete_link(p_link uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := app.current_user_id(); l public.church_links; v_n int := 0; v_bytes bigint := 0;
        v_q uuid[] := '{}'; v_qid uuid; f record; v_members jsonb;
begin
  if v_actor is null or not app.is_collab_admin() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  select * into l from public.church_links where id = p_link for update;
  if l.id is null then raise exception 'Fant ikke samarbeidsgruppen' using errcode = '22023'; end if;
  if l.status <> 'ended' then raise exception 'Bare avsluttede grupper kan slettes. Avslutt gruppen først.' using errcode = '22023'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('church_id', m.church_id, 'church', c.name, 'status', m.status) order by c.name), '[]')
    into v_members from public.church_link_members m left join public.churches c on c.id = m.church_id where m.link_id = p_link;
  for f in select * from public.files where link_id = p_link for update loop
    insert into public.file_cleanup_queue (file_id, church_id, storage_key, file_name, file_size, former_owner, requested_by)
    values (f.id, f.church_id, f.storage_key, f.file_name, f.file_size, f.uploaded_by, v_actor) returning id into v_qid;
    v_q := v_q || v_qid; v_n := v_n + 1; v_bytes := v_bytes + f.file_size;
  end loop;
  delete from public.files where link_id = p_link;
  delete from public.church_links where id = p_link;
  insert into public.audit_logs (actor_user_id, action, target_type, target_id, meta)
  values (v_actor, 'groups.delete', 'church_links', p_link::text,
          jsonb_build_object('name', l.name, 'members', v_members, 'copies', v_n, 'bytes', v_bytes, 'created_at', l.created_at, 'ended_at', l.ended_at));
  return jsonb_build_object('ok', true, 'copies', v_n, 'bytes', v_bytes, 'queue', to_jsonb(v_q));
end $$;

-- ---------- Lesing ----------
-- Grupper brukeren kan se.
--   Developer/Moderator: alle (også avsluttede), alle medlemmer (også fjernede) og antall kopier/størrelse (også skjulte).
--   Andre: bare aktive grupper der egen menighet er aktivt medlem; bare aktive medlemmer; ingen tall.
-- members: [{ church_id, name, status, joined_at, left_at, copies?, bytes? }]
create or replace function public.my_groups() returns table (id uuid, name text, description text, status text, created_at timestamptz,
  ended_at timestamptz, my_church uuid, members jsonb, copies bigint, bytes bigint, hidden_copies bigint)
language sql stable security definer set search_path = '' as $$
  with g as (select l.*, app.is_collab_admin() staff from public.church_links l where app.is_collab_admin() or app.group_access(l.id))
  select g.id, g.name, g.description, g.status, g.created_at, g.ended_at,
    (select m.church_id from public.church_link_members m where m.link_id = g.id and m.status = 'active' and app.is_member(m.church_id) order by m.church_id limit 1),
    coalesce((select jsonb_agg(jsonb_build_object('church_id', m.church_id, 'name', coalesce(c.name, '(slettet menighet)'), 'status', m.status,
                'joined_at', m.joined_at, 'left_at', m.left_at)
              || case when g.staff then jsonb_build_object(
                'copies', (select count(*) from public.files f where f.link_id = g.id and f.church_id = m.church_id),
                'bytes', (select coalesce(sum(f.file_size), 0) from public.files f where f.link_id = g.id and f.church_id = m.church_id)) else '{}'::jsonb end
              order by m.status, c.name)
              from public.church_link_members m left join public.churches c on c.id = m.church_id
              where m.link_id = g.id and (g.staff or m.status = 'active')), '[]'::jsonb),
    case when g.staff then (select count(*) from public.files f where f.link_id = g.id) end,
    case when g.staff then (select coalesce(sum(f.file_size), 0) from public.files f where f.link_id = g.id)::bigint end,
    case when g.staff then (select count(*) from public.files f where f.link_id = g.id and not app.group_member_ok(g.id, f.church_id)) end
  from g order by g.status, g.name
$$;

-- Bare Developer/Moderator: metadata for filene i en gruppe (ingen innhold, ingen nedlasting, ingen lagringsnøkkel).
-- hidden = menigheten som bidro, er ikke (lenger) aktivt medlem eller kan ikke bruke tjenesten.
drop function public.link_files_meta(uuid);
create function public.link_files_meta(p_link uuid) returns table (id uuid, file_name text, mime_type text, file_size bigint, church_id uuid,
  church_name text, hidden boolean, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not app.is_collab_admin() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  return query select f.id, f.file_name, f.mime_type, f.file_size, f.church_id, c.name, not app.group_member_ok(p_link, f.church_id), f.created_at
    from public.files f left join public.churches c on c.id = f.church_id where f.link_id = p_link order by f.created_at desc;
end $$;

-- ---------- Kompatibilitet (to menigheter; fjernes i en senere opprydding) ----------
create or replace function public.create_link(p_church1 uuid, p_church2 uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
begin
  if p_church1 is null or p_church2 is null or p_church1 = p_church2 then
    if app.current_user_id() is null or not app.is_collab_admin() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
    raise exception 'Velg to ulike menigheter' using errcode = '22023'; end if;
  return public.create_group(left(concat_ws(' – ', (select name from public.churches where id = least(p_church1, p_church2)),
                                                   (select name from public.churches where id = greatest(p_church1, p_church2))), 80),
                             null, array[p_church1, p_church2]);
end $$;

-- Samme kolonner som før; church_a/church_b = de to første aktive medlemmene (sortert på id).
create or replace function public.my_links() returns table (id uuid, church_a uuid, church_a_name text, church_b uuid, church_b_name text,
  status text, created_at timestamptz, ended_at timestamptz, my_church uuid)
language sql stable security definer set search_path = '' as $$
  select l.id, x.a, ca.name, x.b, cb.name, l.status, l.created_at, l.ended_at,
         (select m.church_id from public.church_link_members m where m.link_id = l.id and m.status = 'active' and app.is_member(m.church_id) order by m.church_id limit 1)
  from public.church_links l
  cross join lateral (select (array_agg(m.church_id order by m.church_id))[1] a, (array_agg(m.church_id order by m.church_id))[2] b
                      from public.church_link_members m where m.link_id = l.id and m.status = 'active') x
  left join public.churches ca on ca.id = x.a left join public.churches cb on cb.id = x.b
  where app.is_collab_admin() or app.group_access(l.id)
  order by l.status, l.name
$$;

-- ---------- Livsløp ----------
-- Som i 20261001190000_church_links.sql, men koblinger → grupper: navnet på gruppen og de andre menighetene.
create or replace function public.export_church(p_church uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not (app.is_church_admin(p_church) or app.is_staff()) then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  return jsonb_build_object(
    'exported_at', now(), 'format', 'connecthub-church-export/3',
    'church', (select to_jsonb(c) - 'storage_quota_mb' from public.churches c where c.id = p_church),
    'subscription', (select to_jsonb(s) - 'updated_by' from public.church_subscriptions s where s.church_id = p_church),
    'members', coalesce((select jsonb_agg(jsonb_build_object('name', u.full_name, 'email', u.email, 'membership', m.status, 'since', m.created_at,
        'admin', exists (select 1 from public.user_roles r where r.user_id = u.id and r.church_id = p_church and r.role = 'church_admin' and r.revoked_at is null)))
      from public.memberships m join public.app_users u on u.id = m.user_id where m.church_id = p_church), '[]'),
    'invitations', coalesce((select jsonb_agg(jsonb_build_object('email', i.email, 'role', i.role, 'status', i.status, 'created_at', i.created_at, 'accepted_at', i.accepted_at))
      from public.invitations i where i.church_id = p_church), '[]'),
    'files', coalesce((select jsonb_agg(jsonb_build_object('id', f.id, 'name', f.file_name, 'type', f.mime_type, 'size', f.file_size, 'folder', f.folder, 'link_id', f.link_id, 'sha256', f.sha256, 'created_at', f.created_at))
      from public.files f where f.church_id = p_church and f.visibility = 'church'), '[]'),
    'groups', coalesce((select jsonb_agg(jsonb_build_object('id', l.id, 'name', l.name, 'status', l.status, 'membership', gm.status,
        'joined_at', gm.joined_at, 'left_at', gm.left_at, 'created_at', l.created_at, 'ended_at', l.ended_at,
        'other_churches', (select coalesce(jsonb_agg(c.name order by c.name), '[]') from public.church_link_members o join public.churches c on c.id = o.church_id
                           where o.link_id = l.id and o.church_id <> p_church and o.status = 'active')))
      from public.church_link_members gm join public.church_links l on l.id = gm.link_id where gm.church_id = p_church), '[]'),
    'spaces', coalesce((select jsonb_agg(jsonb_build_object('name', s.name, 'owner', s.owner_church_id = p_church, 'status', sm.status))
      from public.space_members sm join public.spaces s on s.id = sm.space_id where sm.church_id = p_church), '[]'),
    'audit', coalesce((select jsonb_agg(jsonb_build_object('at', l.created_at, 'action', l.action, 'meta', l.meta) order by l.created_at desc)
      from (select * from public.audit_logs where church_id = p_church order by created_at desc limit 1000) l), '[]'));
end $$;

-- Som i 20261001190000_church_links.sql, men gruppebasert: menighetens egne filer (også kopiene den har bidratt med) slettes
-- som før, medlemsradene forsvinner med menigheten (cascade), og grupper med færre enn 2 aktive medlemmer igjen avsluttes.
-- De andre menighetenes kopier blir liggende (synlige i grupper som fortsatt er aktive).
create or replace function public.purge_church(p_church uuid, p_issuer text, p_subject text, p_aal text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare c public.churches; n_files int; n_members int; v_groups uuid[]; v_ended uuid[];
begin
  perform set_config('request.jwt.claims', jsonb_build_object('iss', p_issuer, 'sub', p_subject, 'aal', p_aal)::text, true);   -- aal fra det verifiserte tokenet
  if not app.is_staff() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  select * into c from public.churches where id = p_church for update;
  if c.id is null or c.status <> 'pending_deletion' then raise exception 'Menigheten må først settes til sletting' using errcode = '22023'; end if;
  select coalesce(array_agg(link_id order by link_id), '{}') into v_groups from public.church_link_members where church_id = p_church;
  perform 1 from public.church_links where id = any (v_groups) order by id for update;
  delete from public.files where church_id = p_church; get diagnostics n_files = row_count;
  delete from public.memberships where church_id = p_church; get diagnostics n_members = row_count;
  update public.invitations set email = 'slettet-' || id || '@slettet.invalid' where church_id = p_church;
  delete from public.churches where id = p_church;     -- roller, invitasjoner, abonnement, områder og gruppemedlemskap følger med (cascade)
  with e as (update public.church_links l set status = 'ended', ended_at = now()
             where l.id = any (v_groups) and l.status = 'active' and app.group_active_count(l.id) < 2 returning l.id)
  select coalesce(array_agg(id), '{}') into v_ended from e;
  insert into public.audit_logs (actor_user_id, action, target_type, target_id, church_id, meta)
  values (app.current_user_id(), 'churches.purge', 'churches', p_church::text, p_church,
          jsonb_build_object('files', n_files, 'members', n_members, 'groups', to_jsonb(v_groups), 'groups_ended', to_jsonb(v_ended)));
  return jsonb_build_object('ok', true, 'files', n_files, 'members', n_members);
end $$;

-- ---------- Rettigheter ----------
revoke all on function public.create_group(text, text, uuid[]), public.update_group(uuid, text, text), public.add_group_church(uuid, uuid),
  public.remove_group_church(uuid, uuid), public.my_groups(), public.link_files_meta(uuid) from public, anon;
grant execute on function public.create_group(text, text, uuid[]), public.update_group(uuid, text, text), public.add_group_church(uuid, uuid),
  public.remove_group_church(uuid, uuid), public.my_groups(), public.link_files_meta(uuid) to authenticated;
