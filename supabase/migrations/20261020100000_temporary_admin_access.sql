-- ConnectHub · Midlertidig Admin-tilgang for Developer/Moderator, menighet med logo ved opprettelse (bare connecthub-dev først).
--
-- Menighetens data (logo, filer, innhold, innstillinger) tilhører menigheten og røres aldri av rolleendringer: her endres
-- bare roller og medlemskap. Ingen eksisterende rader endres; nye kolonner er tomme/false som standard.
--
--   * churches.created_by: hvem som opprettet menigheten (settes av databasen). Gir INGEN rettigheter i seg selv.
--   * Logo ved opprettelse (register_church_logo, bare serveren): Developer/Moderator som nettopp opprettet menigheten kan
--     legge ved logoen én gang (innen 15 minutter, før det finnes en logo). Etterpå kan bare menighetens Admin – også en
--     midlertidig Admin mens tilgangen varer – endre logoen (set_church_logo). Logofila tilhører menigheten.
--   * Midlertidig Admin: user_roles (extra_admin) får varighet og utløpstid (servertid, UTC-kalender). Utløpt tilgang avvises
--     direkte i tilgangskontrollen (app.is_church_admin, app.is_member, app.upload_check) – også før oppryddingen har kjørt.
--     Den globale rollen (Developer/Moderator) er en egen rad og endres aldri.
--   * admin_access_requests: forespørsler. Har menigheten en Admin, må en Admin i menigheten godkjenne (med varighet) eller
--     avslå. Har den ingen, gis tilgangen med en gang med valgt varighet. Én ventende forespørsel per person og menighet;
--     en behandlet forespørsel kan ikke behandles igjen. Låser per menighet gjør samtidige forespørsler konsistente.
--   * revoke_admin_access: Admin i menigheten (eller personen selv) fjerner en midlertidig Admin når som helst. Bare den
--     midlertidige rollen (og medlemskapet som fulgte med den) fjernes; kontoen, den globale rollen og alle data består.

-- ---------- 1. Hvem opprettet menigheten ----------
alter table public.churches add column created_by uuid references public.app_users (id) on delete set null;
grant select (created_by) on public.churches to authenticated;

create or replace function app.church_created_by() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.created_by := app.current_user_id();   -- alltid den innloggede (kan ikke settes av klienten)
  return new;
end $$;
revoke all on function app.church_created_by() from public, anon, authenticated;
create trigger churches_created_by before insert on public.churches for each row execute function app.church_created_by();

-- ---------- 2. Varighet og utløp på midlertidige Admin-roller ----------
alter table public.user_roles add column expires_at timestamptz,
  add column duration text check (duration in ('1d', '30d', '6m', '1y', 'indef')),
  add column granted_via uuid;
alter table public.user_roles add constraint user_roles_expiry_extra check ((expires_at is null and duration is null) or extra_admin);
grant select (expires_at, duration) on public.user_roles to authenticated;

-- Utløp fra varighet, regnet i UTC-kalender fra servertiden (ingen sommertid- eller tidssoneglipp). 'indef' = ingen utløp.
create or replace function app.access_expiry(p_from timestamptz, p_duration text) returns timestamptz
language plpgsql immutable set search_path = '' as $$
begin
  return case p_duration
    when '1d' then ((p_from at time zone 'UTC') + interval '1 day') at time zone 'UTC'
    when '30d' then ((p_from at time zone 'UTC') + interval '30 days') at time zone 'UTC'
    when '6m' then ((p_from at time zone 'UTC') + interval '6 months') at time zone 'UTC'
    when '1y' then ((p_from at time zone 'UTC') + interval '1 year') at time zone 'UTC'
    when 'indef' then null
    else null end;
end $$;

create or replace function app.valid_duration(p_duration text) returns boolean
language sql immutable set search_path = '' as $$ select coalesce(p_duration in ('1d', '30d', '6m', '1y', 'indef'), false) $$;

-- Aktiv rolle: ikke tilbakekalt og ikke utløpt.
create or replace function app.role_live(r public.user_roles) returns boolean
language sql stable set search_path = '' as $$ select r.revoked_at is null and (r.expires_at is null or r.expires_at > now()) $$;

-- Som før, men utløpt midlertidig tilgang gir ingen Admin-rettigheter.
create or replace function app.is_church_admin(p_church uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.user_roles r
    join public.memberships m on m.user_id = r.user_id and m.church_id = r.church_id and m.status = 'active'
    join public.churches c on c.id = r.church_id and c.status = 'active'
    where r.user_id = app.current_user_id() and r.role = 'church_admin' and r.church_id = p_church
      and r.revoked_at is null and (r.expires_at is null or r.expires_at > now()))
$$;

-- Medlemskap som bare kom med en midlertidig Admin-rolle, gjelder ikke etter at rollen er utløpt.
create or replace function app.temp_membership_ended(p_user uuid, p_church uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.user_roles r where r.user_id = p_user and r.church_id = p_church and r.role = 'church_admin'
                   and r.extra_membership and r.revoked_at is null and r.expires_at is not null and r.expires_at <= now())
$$;
revoke all on function app.temp_membership_ended(uuid, uuid) from public, anon;
grant execute on function app.temp_membership_ended(uuid, uuid) to authenticated;

create or replace function app.is_member(p_church uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships m join public.churches c on c.id = m.church_id
    where m.user_id = app.current_user_id() and m.church_id = p_church and m.status = 'active' and c.status = 'active')
    and not app.temp_membership_ended(app.current_user_id(), p_church)
$$;

-- Som i 20261015100100_no_private_uploads.sql, men utløpt midlertidig tilgang teller ikke (medlem eller Admin).
create or replace function app.upload_check(p_actor uuid, p_church uuid, p_folder text, p_private boolean, p_size bigint) returns void
language plpgsql stable security definer set search_path = '' as $$
declare used bigint; quota bigint; member boolean; adm boolean;
begin
  if p_actor is null then raise exception 'Ikke innlogget' using errcode = '42501'; end if;
  if p_folder not in ('bilder', 'logoer', 'bakgrunner', 'mockups', 'faste') then raise exception 'Ugyldig mappe' using errcode = '22023'; end if;
  if p_size is null or p_size <= 0 or p_size > 4194304 then raise exception 'Ugyldig størrelse' using errcode = '22023'; end if;
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

-- whoami: utløpte roller vises ikke (ellers som i 20261018110000_church_legacy_defaults.sql).
create or replace function public.whoami() returns jsonb
language sql stable security definer set search_path = '' as $$
  select case when u.id is null then null else jsonb_build_object(
    'id', u.id, 'email', u.email, 'full_name', u.full_name, 'first_name', u.first_name, 'last_name', u.last_name, 'phone', u.phone,
    'mfa', app.mfa_ok(),
    'roles', coalesce((select jsonb_agg(jsonb_build_object('role', r.role, 'church_id', r.church_id, 'expires_at', r.expires_at) order by r.role)
                       from public.user_roles r where r.user_id = u.id and r.revoked_at is null and (r.expires_at is null or r.expires_at > now())), '[]'::jsonb),
    'churches', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'logo_file_id', c.logo_file_id, 'legacy_defaults', c.legacy_defaults) order by c.name)
                          from public.memberships m join public.churches c on c.id = m.church_id
                          where m.user_id = u.id and m.status = 'active' and c.status = 'active' and not app.temp_membership_ended(u.id, c.id)), '[]'::jsonb)
  ) end
  from (select app.current_user_id() as uid) x left join public.app_users u on u.id = x.uid
$$;

-- Stab som får midlertidig Admin-tilgang, tar ikke en av menighetens brukerplasser (medlemsgrensen).
create or replace function app.member_count(p_church uuid) returns int
language sql stable security definer set search_path = '' as $$
  with m as (
    select lower(u.email) as e from public.memberships ms join public.app_users u on u.id = ms.user_id
    where ms.church_id = p_church and ms.status = 'active' and not app.has_global_role_row(ms.user_id)
  ), i as (
    select distinct lower(iv.email) as e from public.invitations iv
    where iv.church_id = p_church and iv.status = 'pending' and iv.expires_at > now() and iv.role in ('user', 'church_admin')
  )
  select ((select count(*) from m) + (select count(*) from i where i.e not in (select e from m)))::int
$$;
revoke all on function app.member_count(uuid) from public, anon, authenticated;

create or replace function app.member_limit_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_church uuid; v_email text; v_limit int; v_before int;
begin
  if tg_table_name = 'memberships' then
    if new.status <> 'active' or (tg_op = 'UPDATE' and old.status = 'active') then return new; end if;
    if app.has_global_role_row(new.user_id) then return new; end if;   -- stab (midlertidig Admin) teller ikke
    v_church := new.church_id;
    select email into v_email from public.app_users where id = new.user_id;
  else
    if new.status <> 'pending' or new.church_id is null or new.role not in ('user', 'church_admin') or new.expires_at <= now()
       or (tg_op = 'UPDATE' and old.status = 'pending' and old.expires_at > now()) then return new; end if;
    v_church := new.church_id;
    v_email := new.email;
  end if;
  perform pg_advisory_xact_lock(hashtextextended('ch:church-members:' || v_church::text, 0));
  if v_email is not null and app.member_counted(v_church, v_email) then return new; end if;
  select member_limit into v_limit from public.churches where id = v_church;
  v_before := app.member_count(v_church);
  if v_before + 1 > coalesce(v_limit, 10) then
    raise exception 'Menigheten har nådd grensen på % brukere (% med ventende invitasjoner)', coalesce(v_limit, 10), v_before
      using errcode = 'CH013';
  end if;
  return new;
end $$;
revoke all on function app.member_limit_guard() from public, anon, authenticated;

-- ---------- 3. Logo: bare Admin endrer den; logo ved opprettelse via serveren ----------
-- Før kunne Developer/Moderator som var medlem endre logoen uten Admin-rolle. Nå kreves Admin i menigheten
-- (også midlertidig, mens tilgangen varer). Opprettelse gir ingen rett til å endre logoen senere.
create or replace function public.set_church_logo(p_church uuid, p_file uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := app.current_user_id(); f public.files; v_old uuid;
begin
  if v_actor is null then raise exception 'Ikke innlogget' using errcode = '42501'; end if;
  if not app.is_church_admin(p_church) then raise exception 'Bare menighetens Admin kan endre logoen' using errcode = '42501'; end if;
  select logo_file_id into v_old from public.churches where id = p_church for update;
  if not found then raise exception 'Ukjent menighet' using errcode = '22023'; end if;
  if p_file is not null then
    select * into f from public.files where id = p_file;
    if f.id is null or f.church_id <> p_church then raise exception 'Logoen må være en fil i menighetens egen Logoer-mappe' using errcode = '22023'; end if;
    if f.folder <> 'logoer' or f.visibility <> 'church' then raise exception 'Logoen må ligge i Logoer-mappen og være synlig for menigheten' using errcode = '22023'; end if;
    if f.mime_type not in ('image/png', 'image/jpeg', 'image/webp', 'image/gif') then raise exception 'Logoen må være et bilde (PNG, JPG, WebP eller GIF)' using errcode = '22023'; end if;
  end if;
  update public.churches set logo_file_id = p_file where id = p_church;
  insert into public.audit_logs (actor_user_id, action, target_type, target_id, church_id, meta)
  values (v_actor, 'churches.logo', 'churches', p_church::text, p_church, jsonb_build_object('old', v_old, 'new', p_file));
end $$;
revoke all on function public.set_church_logo(uuid, uuid) from public, anon;
grant execute on function public.set_church_logo(uuid, uuid) to authenticated;

-- Kan innlogget bruker opprette menigheter (Developer/Moderator med MFA)? Serveren spør før bildet lagres.
create or replace function public.can_create_church() returns boolean
language plpgsql stable security definer set search_path = '' as $$
begin
  if app.current_user_id() is null or not app.is_staff() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  return true;
end $$;
revoke all on function public.can_create_church() from public, anon;
grant execute on function public.can_create_church() to authenticated;

-- Opprettelse med logo (bare serveren, etter innholdskontroll av bildet): oppretter menigheten (med id fra serveren, så
-- logoen lagres under menighetens egen sti) og registrerer logoen i én transaksjon. Den som oppretter (Developer/Moderator
-- med MFA – aal fra det verifiserte tokenet) blir verken medlem eller Admin.
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
  if p_size is null or p_size <= 0 or p_size > 4194304 then raise exception 'Logoen kan være høyst 4 MB' using errcode = '22023'; end if;
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
do $$ begin if exists (select 1 from pg_roles where rolname = 'service_role') then
  execute 'grant execute on function public.create_church_with_logo(text, text, text, uuid, text, text, text, text, bigint, text) to service_role';
end if; end $$;

-- ---------- 4. Forespørsler om midlertidig Admin-tilgang ----------
create table public.admin_access_requests (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches (id) on delete cascade,
  requester uuid not null references public.app_users (id) on delete cascade,
  requester_role text not null check (requester_role in ('developer', 'moderator')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  duration text check (duration in ('1d', '30d', '6m', '1y', 'indef')),
  expires_at timestamptz,
  role_id uuid references public.user_roles (id) on delete set null,
  auto_granted boolean not null default false,
  created_at timestamptz not null default now(),
  decided_by uuid references public.app_users (id) on delete set null,
  decided_at timestamptz
);
-- én ventende forespørsel per person og menighet (også ved samtidige klikk)
create unique index admin_access_requests_one_pending on public.admin_access_requests (church_id, requester) where status = 'pending';
create index admin_access_requests_church_idx on public.admin_access_requests (church_id, status);
alter table public.admin_access_requests enable row level security;   -- ingen direkte tilgang; bare via funksjonene under
revoke all on public.admin_access_requests from public, anon, authenticated;

-- Global rolle (Developer/Moderator) for en bruker, uavhengig av MFA i denne økten.
create or replace function app.global_role_of(p_user uuid) returns text
language sql stable security definer set search_path = '' as $$
  select case when exists (select 1 from public.user_roles where user_id = p_user and role = 'developer' and revoked_at is null) then 'developer'
              when exists (select 1 from public.user_roles where user_id = p_user and role = 'moderator' and revoked_at is null) then 'moderator' end
$$;
revoke all on function app.global_role_of(uuid) from public, anon, authenticated;

-- Har menigheten en aktiv Admin (fast eller midlertidig, ikke utløpt), eventuelt utenom p_except?
create or replace function app.church_has_admin(p_church uuid, p_except uuid default null) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.user_roles r join public.memberships m on m.user_id = r.user_id and m.church_id = r.church_id and m.status = 'active'
                 where r.church_id = p_church and r.role = 'church_admin' and r.revoked_at is null
                   and (r.expires_at is null or r.expires_at > now()) and r.user_id is distinct from p_except)
$$;
revoke all on function app.church_has_admin(uuid, uuid) from public, anon, authenticated;

-- Opprydding: utløpte midlertidige roller tilbakekalles (og medlemskapet som kom med dem). Tilgangskontrollen avviser dem
-- uansett; dette rydder bare listene. Trygt å kalle når som helst (rører bare utløpte rader).
create or replace function public.expire_admin_access() returns int
language plpgsql security definer set search_path = '' as $$
declare r public.user_roles; n int := 0;
begin
  for r in select * from public.user_roles where role = 'church_admin' and extra_admin and revoked_at is null
             and expires_at is not null and expires_at <= now() for update skip locked loop
    update public.user_roles set revoked_at = now(), reason = 'Midlertidig Admin-tilgang utløpt' where id = r.id;
    if r.extra_membership then
      update public.memberships set status = 'removed' where user_id = r.user_id and church_id = r.church_id and status = 'active';
    end if;
    insert into public.audit_logs (action, target_type, target_id, church_id, meta)
    values ('roles.temp_admin_expired', 'user_roles', r.id::text, r.church_id, jsonb_build_object('user', r.user_id, 'expires_at', r.expires_at));
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.expire_admin_access() from public, anon;
grant execute on function public.expire_admin_access() to authenticated;

-- Gir midlertidig Admin-tilgang (intern). Medlemskap legges til ved behov og merkes, så det fjernes sammen med rollen.
create or replace function app.grant_temp_admin(p_church uuid, p_user uuid, p_duration text, p_by uuid, p_request uuid) returns public.user_roles
language plpgsql security definer set search_path = '' as $$
declare m public.memberships; v_mem boolean := false; r public.user_roles; v_exp timestamptz := app.access_expiry(now(), p_duration);
begin
  perform pg_advisory_xact_lock(hashtextextended('ch:membership:' || p_user::text, 0));
  select * into m from public.memberships where user_id = p_user and church_id = p_church for update;
  if m.user_id is null then
    insert into public.memberships (user_id, church_id) values (p_user, p_church); v_mem := true;
  elsif m.status <> 'active' then
    update public.memberships set status = 'active' where user_id = p_user and church_id = p_church; v_mem := true;
  end if;
  -- en tidligere utløpt (ikke ryddet) midlertidig rolle avsluttes først (én aktiv rolle per person og menighet)
  update public.user_roles set revoked_at = now(), reason = 'Midlertidig Admin-tilgang utløpt'
   where user_id = p_user and church_id = p_church and role = 'church_admin' and revoked_at is null and expires_at is not null and expires_at <= now();
  insert into public.user_roles (user_id, role, church_id, assigned_by, reason, extra_admin, extra_membership, expires_at, duration, granted_via)
  values (p_user, 'church_admin', p_church, p_by, 'Midlertidig Admin', true, v_mem, v_exp, p_duration, p_request) returning * into r;
  insert into public.audit_logs (actor_user_id, action, target_type, target_id, church_id, meta)
  values (p_by, 'roles.temp_admin_grant', 'user_roles', r.id::text, p_church,
          jsonb_build_object('user', p_user, 'duration', p_duration, 'expires_at', v_exp, 'request', p_request, 'membership_added', v_mem));
  return r;
end $$;
revoke all on function app.grant_temp_admin(uuid, uuid, text, uuid, uuid) from public, anon, authenticated;

-- Developer/Moderator (med MFA) ber om midlertidig Admin-tilgang. Uten Admin i menigheten gis den med en gang med valgt
-- varighet; ellers opprettes en ventende forespørsel som en Admin i menigheten må godkjenne eller avslå.
create or replace function public.request_admin_access(p_church uuid, p_duration text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := app.current_user_id(); v_cname text; v_req uuid; r public.user_roles; v_role text; v_who text;
begin
  if v_actor is null or not app.is_staff() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  perform public.expire_admin_access();
  -- lås menigheten: samtidige forespørsler (også fra andre) behandles én om gangen
  select name into v_cname from public.churches where id = p_church and status = 'active' for update;
  if v_cname is null then raise exception 'Menigheten må være aktiv' using errcode = '22023'; end if;
  v_role := app.global_role_of(v_actor);
  if app.is_church_admin(p_church) then return jsonb_build_object('ok', true, 'state', 'already'); end if;
  select id into v_req from public.admin_access_requests where church_id = p_church and requester = v_actor and status = 'pending';
  if v_req is not null then return jsonb_build_object('ok', true, 'state', 'pending', 'id', v_req, 'already', true); end if;
  if not app.church_has_admin(p_church, v_actor) then
    -- ingen Admin å spørre: midlertidig tilgang med en gang (fortsatt med varighet, og den globale rollen er uendret)
    if not app.valid_duration(p_duration) then raise exception 'Velg varighet' using errcode = '22023'; end if;
    insert into public.admin_access_requests (church_id, requester, requester_role, status, duration, auto_granted, decided_by, decided_at)
    values (p_church, v_actor, v_role, 'approved', p_duration, true, v_actor, now()) returning id into v_req;
    r := app.grant_temp_admin(p_church, v_actor, p_duration, v_actor, v_req);
    update public.admin_access_requests set role_id = r.id, expires_at = r.expires_at where id = v_req;
    return jsonb_build_object('ok', true, 'state', 'granted', 'id', v_req, 'expires_at', r.expires_at, 'duration', p_duration);
  end if;
  insert into public.admin_access_requests (church_id, requester, requester_role) values (p_church, v_actor, v_role) returning id into v_req;
  select coalesce(nullif(btrim(full_name), ''), email) into v_who from public.app_users where id = v_actor;
  insert into public.audit_logs (actor_user_id, action, target_type, target_id, church_id, meta)
  values (v_actor, 'roles.temp_admin_request', 'admin_access_requests', v_req::text, p_church, jsonb_build_object('role', v_role));
  perform app.notify(x.user_id, 'message', 'Forespørsel om Admin-tilgang',
    v_who || ' (' || case v_role when 'developer' then 'Developer' else 'Moderator' end || ') ber om midlertidig Admin-tilgang i «' || v_cname || '».',
    '/app/admin#/oversikt', p_church)
  from (select distinct ur.user_id from public.user_roles ur where ur.church_id = p_church and ur.role = 'church_admin'
          and ur.revoked_at is null and (ur.expires_at is null or ur.expires_at > now())) x;
  return jsonb_build_object('ok', true, 'state', 'pending', 'id', v_req);
end $$;
revoke all on function public.request_admin_access(uuid, text) from public, anon;
grant execute on function public.request_admin_access(uuid, text) to authenticated;

-- Admin i menigheten godkjenner (med varighet) eller avslår. En behandlet forespørsel kan ikke behandles igjen.
create or replace function public.decide_admin_access(p_request uuid, p_approve boolean, p_duration text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := app.current_user_id(); q public.admin_access_requests; r public.user_roles; v_cname text;
begin
  if v_actor is null then raise exception 'Ikke innlogget' using errcode = '42501'; end if;
  perform public.expire_admin_access();
  select * into q from public.admin_access_requests where id = p_request for update;
  if q.id is null then raise exception 'Fant ikke forespørselen' using errcode = '22023'; end if;
  if not app.is_church_admin(q.church_id) then raise exception 'Bare menighetens Admin kan behandle forespørselen' using errcode = '42501'; end if;
  if q.requester = v_actor then raise exception 'Du kan ikke behandle din egen forespørsel' using errcode = '42501'; end if;
  if q.status <> 'pending' then raise exception 'Forespørselen er allerede behandlet' using errcode = 'CH020'; end if;
  select name into v_cname from public.churches where id = q.church_id for update;
  if coalesce(p_approve, false) then
    if not app.valid_duration(p_duration) then raise exception 'Velg varighet' using errcode = '22023'; end if;
    if app.global_role_of(q.requester) is null then raise exception 'Personen er ikke lenger Developer eller Moderator' using errcode = '22023'; end if;
    select * into r from public.user_roles where user_id = q.requester and church_id = q.church_id and role = 'church_admin'
      and revoked_at is null and (expires_at is null or expires_at > now());
    if r.id is null then r := app.grant_temp_admin(q.church_id, q.requester, p_duration, v_actor, q.id); end if;
    update public.admin_access_requests set status = 'approved', duration = p_duration, expires_at = r.expires_at, role_id = r.id,
      decided_by = v_actor, decided_at = now() where id = q.id;
    perform app.notify(q.requester, 'message', 'Admin-tilgang godkjent',
      'Du har fått midlertidig Admin-tilgang i «' || v_cname || '»' ||
      case when r.expires_at is null then ' (ubestemt tid).' else ' til ' || to_char(r.expires_at at time zone 'Europe/Oslo', 'DD.MM.YYYY HH24:MI') || '.' end,
      '/app/admin#/oversikt', q.church_id);
  else
    update public.admin_access_requests set status = 'rejected', decided_by = v_actor, decided_at = now() where id = q.id;
    perform app.notify(q.requester, 'message', 'Admin-tilgang avslått', 'Forespørselen om Admin-tilgang i «' || v_cname || '» er avslått.', '/app/admin#/oversikt', q.church_id);
  end if;
  insert into public.audit_logs (actor_user_id, action, target_type, target_id, church_id, meta)
  values (v_actor, case when p_approve then 'roles.temp_admin_approve' else 'roles.temp_admin_reject' end, 'admin_access_requests', q.id::text, q.church_id,
          jsonb_build_object('requester', q.requester, 'duration', case when p_approve then p_duration end));
  return jsonb_build_object('ok', true, 'status', case when p_approve then 'approved' else 'rejected' end, 'expires_at', r.expires_at);
end $$;
revoke all on function public.decide_admin_access(uuid, boolean, text) from public, anon;
grant execute on function public.decide_admin_access(uuid, boolean, text) to authenticated;

-- Fjerner en midlertidig Admin (Admin i menigheten, eller personen selv). Bare den midlertidige rollen og medlemskapet som
-- fulgte med den; kontoen, den globale rollen, andre Admin og alle menighetens data består.
create or replace function public.revoke_admin_access(p_church uuid, p_user uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := app.current_user_id(); r public.user_roles; v_cname text;
begin
  if v_actor is null then raise exception 'Ikke innlogget' using errcode = '42501'; end if;
  if not (p_user = v_actor or app.is_church_admin(p_church)) then raise exception 'Bare menighetens Admin kan fjerne tilgangen' using errcode = '42501'; end if;
  select name into v_cname from public.churches where id = p_church for update;
  perform pg_advisory_xact_lock(hashtextextended('ch:membership:' || p_user::text, 0));
  select * into r from public.user_roles where user_id = p_user and church_id = p_church and role = 'church_admin' and extra_admin and revoked_at is null for update;
  if r.id is null then raise exception 'Personen har ingen midlertidig Admin-tilgang i menigheten' using errcode = '22023'; end if;
  update public.user_roles set revoked_at = now(), revoked_by = v_actor, reason = 'Midlertidig Admin-tilgang fjernet' where id = r.id;
  if r.extra_membership then
    update public.memberships set status = 'removed' where user_id = p_user and church_id = p_church and status = 'active';
  end if;
  insert into public.audit_logs (actor_user_id, action, target_type, target_id, church_id, meta)
  values (v_actor, 'roles.temp_admin_revoke', 'user_roles', r.id::text, p_church, jsonb_build_object('user', p_user, 'membership_removed', r.extra_membership));
  if p_user <> v_actor then
    perform app.notify(p_user, 'message', 'Admin-tilgang fjernet', 'Den midlertidige Admin-tilgangen din i «' || v_cname || '» er fjernet.', '/app/', p_church);
  end if;
  return jsonb_build_object('ok', true, 'membership_removed', r.extra_membership);
end $$;
revoke all on function public.revoke_admin_access(uuid, uuid) from public, anon;
grant execute on function public.revoke_admin_access(uuid, uuid) to authenticated;

-- Oversikt for Admin i menigheten (og stab): ventende forespørsler, aktive midlertidige Admin og nylig behandlede.
create or replace function public.admin_access_overview(p_church uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if app.current_user_id() is null or not (app.is_church_admin(p_church) or app.is_staff()) then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  perform public.expire_admin_access();
  return jsonb_build_object(
    'pending', coalesce((select jsonb_agg(jsonb_build_object('id', q.id, 'user_id', q.requester, 'name', coalesce(nullif(btrim(u.full_name), ''), u.email),
        'email', u.email, 'role', q.requester_role, 'created_at', q.created_at) order by q.created_at)
      from public.admin_access_requests q join public.app_users u on u.id = q.requester where q.church_id = p_church and q.status = 'pending'), '[]'::jsonb),
    'active', coalesce((select jsonb_agg(jsonb_build_object('user_id', r.user_id, 'name', coalesce(nullif(btrim(u.full_name), ''), u.email), 'email', u.email,
        'role', app.global_role_of(r.user_id), 'granted_at', r.assigned_at, 'duration', r.duration, 'expires_at', r.expires_at,
        'granted_by', coalesce(nullif(btrim(g.full_name), ''), g.email)) order by r.assigned_at)
      from public.user_roles r join public.app_users u on u.id = r.user_id left join public.app_users g on g.id = r.assigned_by
      where r.church_id = p_church and r.role = 'church_admin' and r.extra_admin and r.revoked_at is null
        and (r.expires_at is null or r.expires_at > now())), '[]'::jsonb),
    'recent', coalesce((select jsonb_agg(x.o order by x.t desc) from (
        select jsonb_build_object('id', q.id, 'name', coalesce(nullif(btrim(u.full_name), ''), u.email), 'role', q.requester_role, 'status', q.status,
          'duration', q.duration, 'auto', q.auto_granted, 'decided_at', q.decided_at, 'decided_by', coalesce(nullif(btrim(d.full_name), ''), d.email)) as o,
          q.decided_at as t
        from public.admin_access_requests q join public.app_users u on u.id = q.requester left join public.app_users d on d.id = q.decided_by
        where q.church_id = p_church and q.status <> 'pending' order by q.decided_at desc limit 20) x), '[]'::jsonb),
    'has_admin', app.church_has_admin(p_church));
end $$;
revoke all on function public.admin_access_overview(uuid) from public, anon;
grant execute on function public.admin_access_overview(uuid) to authenticated;

-- Min status per menighet (for Developer/Moderator): ventende forespørsel eller aktiv midlertidig tilgang med utløp.
create or replace function public.my_admin_access() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(x.o), '[]'::jsonb) from (
    select jsonb_build_object('church_id', q.church_id, 'state', 'pending', 'id', q.id, 'created_at', q.created_at) as o
      from public.admin_access_requests q where q.requester = app.current_user_id() and q.status = 'pending'
    union all
    select jsonb_build_object('church_id', r.church_id, 'state', 'active', 'expires_at', r.expires_at, 'duration', r.duration)
      from public.user_roles r where r.user_id = app.current_user_id() and r.role = 'church_admin' and r.extra_admin
        and r.revoked_at is null and (r.expires_at is null or r.expires_at > now())) x
$$;
revoke all on function public.my_admin_access() from public, anon;
grant execute on function public.my_admin_access() to authenticated;

-- Eldre klienter (dagens app): «legg meg til som ekstra Admin» følger nå de samme reglene – en forespørsel som Admin må
-- godkjenne, eller 30 dager når menigheten ikke har noen Admin. Svaret har de gamle feltene i tillegg.
create or replace function public.add_self_as_admin(p_church uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v jsonb;
begin
  v := public.request_admin_access(p_church, '30d');
  return v || jsonb_build_object('already', v ->> 'state' = 'already', 'membership_added', false);
end $$;
