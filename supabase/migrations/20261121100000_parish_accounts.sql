-- Menighetsbruker: én fast fellesbruker per menighet (menighetens PC på kontoret) med innboks for filer.
--
-- Bare tillegg for eksisterende data: nye tabeller og funksjoner. Eneste endrede funksjon er app.current_user_id(), som
-- i tillegg avviser en Menighetsbruker som er deaktivert, har passord eldre enn 12 måneder eller ikke består
-- app.parish_auth_ok (Supabase-delen: økten finnes fortsatt, og passord/innloggingsnøkkel er bare endret via ConnectHub).
-- For alle andre brukere gir funksjonen nøyaktig samme svar som før.
--
-- Innlogging uten e-post: kontoen er en vanlig innloggingskonto hos leverandøren (samme passordhashing og økter).
-- Leverandøren krever en e-postadresse som nøkkel; vi bruker en intern nøkkel i det reserverte domenet .invalid
-- (RFC 2606/6761 – kan aldri leveres), som aldri vises, aldri får e-post og aldri kan brukes til «Glemt passord».
-- Brukernavnet slås opp på serveren (parish.login), så nøkkelen sendes aldri til nettleseren.

create table if not exists public.parish_accounts (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null unique references public.churches (id) on delete cascade,
  user_id uuid unique references public.app_users (id) on delete cascade,
  username text not null check (username ~ '^[a-z0-9][a-z0-9._-]{2,39}$'),
  login_email text not null unique check (login_email ~ '^p-[0-9a-f-]{36}@menighetsbruker\.invalid$'),
  status text not null default 'pending' check (status in ('pending', 'active', 'disabled')),
  pw_changed_at timestamptz,
  pw_hash text,
  created_by uuid references public.app_users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status = 'pending' or (user_id is not null and pw_changed_at is not null))
);
create unique index if not exists parish_accounts_username_uniq on public.parish_accounts (lower(username));
create trigger parish_accounts_touch before update on public.parish_accounts for each row execute function app.touch_updated_at();
alter table public.parish_accounts enable row level security;
revoke all on public.parish_accounts from public, anon, authenticated;

-- Innboksen: filer sendt til menighetens Menighetsbruker. Innholdet ligger i den private bøtta ch-inbox (bare serveren).
create table if not exists public.parish_inbox (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches (id) on delete cascade,
  from_user uuid references public.app_users (id) on delete set null,
  from_name text not null check (char_length(from_name) between 1 and 120),
  storage_key text not null unique,
  file_name text not null check (char_length(file_name) between 1 and 200),
  mime_type text not null check (char_length(mime_type) between 3 and 100),
  kind text not null check (kind in ('image', 'document', 'video', 'project', 'other')),
  file_size bigint not null check (file_size > 0 and file_size <= 31457280),
  status text not null default 'new' check (status in ('new', 'archived')),
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists parish_inbox_church_idx on public.parish_inbox (church_id, created_at desc);
alter table public.parish_inbox enable row level security;
revoke all on public.parish_inbox from public, anon, authenticated;

create table if not exists public.parish_inbox_pending (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users (id) on delete cascade,
  church_id uuid not null references public.churches (id) on delete cascade,
  storage_key text not null unique,
  file_name text not null,
  mime_type text not null,
  file_size bigint not null check (file_size > 0 and file_size <= 31457280),
  created_at timestamptz not null default now(),
  taken_at timestamptz
);
create index if not exists parish_inbox_pending_user_idx on public.parish_inbox_pending (user_id, created_at desc);
alter table public.parish_inbox_pending enable row level security;
revoke all on public.parish_inbox_pending from public, anon, authenticated;

-- ---------- Leverandørdelen (overstyres i 20261121100100_supabase_parish_auth.sql) ----------
-- Vanlig PostgreSQL har ingen innloggingstabeller: alt godtas, ingen hash, ingen økter å tilbakekalle.
create or replace function app.parish_auth_ok(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$ select true $$;
create or replace function app.parish_session_ok() returns boolean
language sql stable security definer set search_path = '' as $$ select true $$;
create or replace function app.parish_pw_hash(p_user uuid) returns text
language sql stable security definer set search_path = '' as $$ select null::text $$;
create or replace function app.parish_session_count(p_user uuid) returns int
language sql stable security definer set search_path = '' as $$ select null::int $$;
create or replace function app.parish_revoke_sessions(p_user uuid, p_keep uuid) returns int
language sql volatile security definer set search_path = '' as $$ select 0 $$;

-- Passordet må byttes etter 12 måneder.
create or replace function app.parish_pw_due(p_changed timestamptz) returns boolean
language sql stable set search_path = '' as $$ select p_changed is null or p_changed <= now() - interval '12 months' $$;

-- Den sentrale kontrollen: alle rettigheter i databasen går via app.current_user_id().
create or replace function app.current_user_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select u.id
  from public.user_identities i
  join public.app_users u on u.id = i.user_id
  where i.provider = app.jwt_claims() ->> 'iss'
    and i.subject = app.jwt_claims() ->> 'sub'
    and u.status = 'active'
    and not exists (select 1 from public.parish_accounts p where p.user_id = u.id
                    and (p.status <> 'active' or app.parish_pw_due(p.pw_changed_at) or not app.parish_auth_ok(u.id)))
$$;

-- Menighetsbrukeren kan ikke få roller (Admin, Developer, Moderator).
create or replace function app.parish_role_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.parish_accounts where user_id = new.user_id) then
    raise exception 'Menighetsbrukeren kan ikke få roller' using errcode = '42501'; end if;
  return new;
end $$;
drop trigger if exists user_roles_parish_guard on public.user_roles;
create trigger user_roles_parish_guard before insert or update on public.user_roles for each row execute function app.parish_role_guard();

-- Menighetsbrukeren kan bare være medlem i sin egen menighet.
create or replace function app.parish_membership_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.parish_accounts where user_id = new.user_id and church_id <> new.church_id) then
    raise exception 'Menighetsbrukeren tilhører bare sin egen menighet' using errcode = '42501'; end if;
  return new;
end $$;
drop trigger if exists memberships_parish_guard on public.memberships;
create trigger memberships_parish_guard before insert or update on public.memberships for each row execute function app.parish_membership_guard();

create or replace function app.parish_json(p public.parish_accounts) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', p.id, 'church_id', p.church_id, 'username', p.username, 'status', p.status,
    'pw_changed_at', p.pw_changed_at, 'pw_due_at', p.pw_changed_at + interval '12 months',
    'created_at', p.created_at, 'sessions', case when p.user_id is null then 0 else app.parish_session_count(p.user_id) end)
$$;

-- ---------- Administrasjon (Admin i menigheten) ----------
create or replace function app.parish_admin_check(p_church uuid) returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare v_actor uuid := app.current_user_id();
begin
  if v_actor is null or p_church is null or not app.is_church_admin(p_church) then
    raise exception 'Bare menighetens admin kan administrere Menighetsbrukeren' using errcode = '42501'; end if;
  return v_actor;
end $$;

-- Menighetsbrukeren i menigheten (null hvis ingen). Bare Admin i menigheten.
create or replace function public.parish_account_get(p_church uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare p public.parish_accounts;
begin
  perform app.parish_admin_check(p_church);
  select * into p from public.parish_accounts where church_id = p_church and status <> 'pending';
  return case when p.id is null then null else app.parish_json(p) end;
end $$;

-- Steg 1 av opprettelsen (med Admins token): kontroller og reserver brukernavnet. En påbegynt opprettelse som aldri ble
-- fullført, erstattes. Serveren lager deretter innloggingskontoen med den interne nøkkelen og kaller parish_activate.
create or replace function public.parish_prepare(p_church uuid, p_username text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := app.parish_admin_check(p_church); v_name text := lower(btrim(coalesce(p_username, ''))); v_id uuid := gen_random_uuid(); v_email text;
begin
  if v_name !~ '^[a-z0-9][a-z0-9._-]{2,39}$' then raise exception 'Ugyldig brukernavn' using errcode = '22023'; end if;
  if exists (select 1 from public.parish_accounts where church_id = p_church and status <> 'pending') then
    raise exception 'Menigheten har allerede en Menighetsbruker' using errcode = 'CH040'; end if;
  delete from public.parish_accounts where church_id = p_church and status = 'pending';
  if exists (select 1 from public.parish_accounts where lower(username) = v_name) then
    raise exception 'Brukernavnet er i bruk' using errcode = 'CH041'; end if;
  v_email := 'p-' || v_id::text || '@menighetsbruker.invalid';
  insert into public.parish_accounts (id, church_id, username, login_email, created_by) values (v_id, p_church, v_name, v_email, v_actor);
  return jsonb_build_object('id', v_id, 'login_email', v_email);
end $$;

-- Steg 2 (bare serveren): koble innloggingskontoen, opprett brukeren og medlemskapet. Feiler noe (f.eks. brukergrensen),
-- rulles alt tilbake og serveren sletter innloggingskontoen igjen.
create or replace function public.parish_activate(p_id uuid, p_issuer text, p_subject text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare p public.parish_accounts; v_user uuid; v_church text;
begin
  select * into p from public.parish_accounts where id = p_id and status = 'pending' for update;
  if p.id is null then raise exception 'Ukjent opprettelse' using errcode = '22023'; end if;
  if exists (select 1 from public.user_identities where provider = p_issuer and subject = p_subject) then
    raise exception 'Innloggingskontoen er allerede i bruk' using errcode = '22023'; end if;
  select name into v_church from public.churches where id = p.church_id and status = 'active';
  if v_church is null then raise exception 'Menigheten er ikke aktiv' using errcode = '42501'; end if;
  insert into public.app_users (email, full_name, first_name, last_name) values (p.login_email, left(v_church || ' – Menighetsbruker', 120), left(v_church, 60), 'Menighetsbruker')
  returning id into v_user;
  insert into public.user_identities (provider, subject, user_id) values (p_issuer, p_subject, v_user);
  update public.parish_accounts set user_id = v_user, status = 'active', pw_changed_at = now(), pw_hash = app.parish_pw_hash(v_user) where id = p.id
  returning * into p;
  insert into public.memberships (user_id, church_id) values (v_user, p.church_id);
  insert into public.audit_logs (actor_user_id, action, target_type, target_id, church_id, meta)
  values (p.created_by, 'parish.create', 'parish_accounts', p.id::text, p.church_id, jsonb_build_object('username', p.username));
  return app.parish_json(p);
end $$;

create or replace function public.parish_abort(p_id uuid) returns void
language sql security definer set search_path = '' as $$ delete from public.parish_accounts where id = p_id and status = 'pending' $$;

-- Endringer fra Admin: rename (gjøres her), password/revoke (serveren gjør innloggingsdelen), disable/enable.
-- Svarer med det serveren trenger (innloggingskontoens subject) – aldri til andre enn Admin i menigheten.
create or replace function public.parish_manage(p_church uuid, p_action text, p_username text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := app.parish_admin_check(p_church); p public.parish_accounts; v_name text := lower(btrim(coalesce(p_username, ''))); v_sub text;
begin
  select * into p from public.parish_accounts where church_id = p_church and status <> 'pending' for update;
  if p.id is null then raise exception 'Menigheten har ingen Menighetsbruker' using errcode = '22023'; end if;
  if p_action = 'rename' then
    if v_name !~ '^[a-z0-9][a-z0-9._-]{2,39}$' then raise exception 'Ugyldig brukernavn' using errcode = '22023'; end if;
    if exists (select 1 from public.parish_accounts where lower(username) = v_name and id <> p.id) then
      raise exception 'Brukernavnet er i bruk' using errcode = 'CH041'; end if;
    update public.parish_accounts set username = v_name where id = p.id returning * into p;
  elsif p_action = 'disable' then
    update public.parish_accounts set status = 'disabled' where id = p.id returning * into p;
  elsif p_action = 'enable' then
    update public.parish_accounts set status = 'active' where id = p.id returning * into p;
  elsif p_action not in ('password', 'revoke') then
    raise exception 'Ugyldig handling' using errcode = '22023';
  end if;
  insert into public.audit_logs (actor_user_id, action, target_type, target_id, church_id, meta)
  values (v_actor, 'parish.' || p_action, 'parish_accounts', p.id::text, p_church, case when p_action = 'rename' then jsonb_build_object('username', p.username) else '{}'::jsonb end);
  select i.subject into v_sub from public.user_identities i where i.user_id = p.user_id limit 1;
  return app.parish_json(p) || jsonb_build_object('subject', v_sub, 'user_id', p.user_id);
end $$;

-- Bare serveren: nytt passord er satt hos leverandøren – lagre tidspunktet (ny 12-månedersperiode) og hashen.
create or replace function public.parish_pw_record(p_id uuid, p_by text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare p public.parish_accounts;
begin
  update public.parish_accounts set pw_changed_at = now(), pw_hash = app.parish_pw_hash(user_id) where id = p_id and status <> 'pending' returning * into p;
  if p.id is null then raise exception 'Ukjent konto' using errcode = '22023'; end if;
  insert into public.audit_logs (actor_user_id, action, target_type, target_id, church_id, meta)
  values (case when p_by = 'self' then p.user_id else null end, 'parish.password_changed', 'parish_accounts', p.id::text, p.church_id, jsonb_build_object('by', left(coalesce(p_by, ''), 20)));
  return app.parish_json(p);
end $$;

-- Bare serveren: logg ut øktene (unntatt p_keep).
create or replace function public.parish_revoke(p_id uuid, p_keep uuid) returns int
language plpgsql security definer set search_path = '' as $$
declare v_user uuid;
begin
  select user_id into v_user from public.parish_accounts where id = p_id;
  if v_user is null then return 0; end if;
  return app.parish_revoke_sessions(v_user, p_keep);
end $$;

-- Bare serveren: brukernavn → intern innloggingsnøkkel (ved innlogging).
create or replace function public.parish_login_lookup(p_username text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', p.id, 'login_email', p.login_email, 'status', p.status, 'church_status', c.status)
  from public.parish_accounts p join public.churches c on c.id = p.church_id
  where lower(p.username) = lower(btrim(coalesce(p_username, ''))) and p.status <> 'pending'
$$;

-- Menighetsbrukerens egen status (også når tilgangen er sperret, så appen kan vise passordbyttet). Bare for kontoen selv.
create or replace function public.parish_self() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', p.id, 'church_id', p.church_id, 'church_name', c.name, 'username', p.username, 'status', p.status,
    'user_status', u.status, 'pw_changed_at', p.pw_changed_at, 'pw_due', app.parish_pw_due(p.pw_changed_at), 'auth_ok', app.parish_auth_ok(u.id),
    'session_ok', app.parish_session_ok())
  from public.user_identities i
  join public.app_users u on u.id = i.user_id
  join public.parish_accounts p on p.user_id = u.id
  join public.churches c on c.id = p.church_id
  where i.provider = app.jwt_claims() ->> 'iss' and i.subject = app.jwt_claims() ->> 'sub' and p.status <> 'pending'
$$;

-- ---------- Innboksen ----------
-- Hvem kan lese menighetens innboks: Menighetsbrukeren selv og Admin i menigheten.
create or replace function app.inbox_reader(p_church uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_church is not null and (
    exists (select 1 from public.parish_accounts p where p.church_id = p_church and p.status = 'active' and p.user_id = app.current_user_id())
    or app.is_church_admin(p_church))
$$;

-- Avsender: aktivt medlem av menigheten (ikke Menighetsbrukeren selv), menigheten har en aktiv Menighetsbruker,
-- innenfor menighetens kvote og den samlede grensen. Høyst 200 filer per døgn per avsender.
create or replace function app.inbox_check(p_actor uuid, p_church uuid, p_size bigint) returns void
language plpgsql stable security definer set search_path = '' as $$
declare used bigint; quota bigint; inbox_total bigint;
begin
  if p_actor is null then raise exception 'Ikke innlogget' using errcode = '42501'; end if;
  if p_size is null or p_size <= 0 then raise exception 'Ugyldig størrelse' using errcode = '22023'; end if;
  if p_size > 31457280 then raise exception 'Filen er for stor' using errcode = 'CH030'; end if;
  if not exists (select 1 from public.memberships m join public.churches c on c.id = m.church_id
                 where m.user_id = p_actor and m.church_id = p_church and m.status = 'active' and c.status = 'active')
     or app.temp_membership_ended(p_actor, p_church) then
    raise exception 'Ingen tilgang til menigheten' using errcode = '42501'; end if;
  if not exists (select 1 from public.parish_accounts where church_id = p_church and status = 'active' and user_id <> p_actor) then
    raise exception 'Menigheten har ingen aktiv Menighetsbruker' using errcode = '42501'; end if;
  if (select count(*) from public.parish_inbox_pending where user_id = p_actor and created_at > now() - interval '1 day') >= 200 then
    raise exception 'For mange sendinger' using errcode = '54000'; end if;
  select coalesce(sum(file_size), 0) into inbox_total from public.parish_inbox;
  select coalesce((select sum(file_size) from public.files where church_id = p_church), 0)
       + coalesce((select sum(file_size) from public.parish_inbox where church_id = p_church), 0) into used;
  select storage_quota_mb::bigint * 1048576 into quota from public.churches where id = p_church;
  if used + p_size > quota then raise exception 'Menighetens lagringskvote er brukt opp' using errcode = '54000'; end if;
  perform app.total_check(inbox_total + p_size);
end $$;

-- Menighetene du kan sende til (dine aktive menigheter med en aktiv Menighetsbruker).
create or replace function public.parish_targets() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('church_id', c.id, 'church_name', c.name, 'username', p.username) order by c.name), '[]'::jsonb)
  from public.memberships m
  join public.churches c on c.id = m.church_id and c.status = 'active'
  join public.parish_accounts p on p.church_id = c.id and p.status = 'active'
  where m.user_id = app.current_user_id() and m.status = 'active' and p.user_id <> m.user_id
    and not app.temp_membership_ended(m.user_id, c.id)
$$;

create or replace function public.inbox_can_send(p_church uuid, p_size bigint) returns boolean
language plpgsql stable security definer set search_path = '' as $$
begin perform app.inbox_check(app.current_user_id(), p_church, p_size); return true; end $$;

-- Bare serveren: påbegynt sending (signert opplastingslenke til én nøkkel), kontrollert på nytt.
create or replace function public.inbox_begin(p_issuer text, p_subject text, p_church uuid, p_key text, p_name text, p_mime text, p_size bigint) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid; v_id uuid;
begin
  perform set_config('request.jwt.claims', jsonb_build_object('iss', p_issuer, 'sub', p_subject)::text, true);
  v_actor := app.current_user_id();
  if p_church is null or p_key is null or left(p_key, length('p/' || p_church::text || '/')) <> 'p/' || p_church::text || '/' then
    raise exception 'Ugyldig lagringssted' using errcode = '22023'; end if;
  perform app.inbox_check(v_actor, p_church, p_size);
  insert into public.parish_inbox_pending (user_id, church_id, storage_key, file_name, mime_type, file_size)
  values (v_actor, p_church, p_key, left(coalesce(nullif(btrim(p_name), ''), 'fil'), 200), left(coalesce(p_mime, ''), 100), p_size) returning id into v_id;
  return v_id;
end $$;

-- Bare serveren: tar en påbegynt sending (bare egen, bare én gang, innen 3 timer).
create or replace function public.inbox_take(p_id uuid, p_issuer text, p_subject text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid; r public.parish_inbox_pending;
begin
  perform set_config('request.jwt.claims', jsonb_build_object('iss', p_issuer, 'sub', p_subject)::text, true);
  v_actor := app.current_user_id();
  update public.parish_inbox_pending set taken_at = now()
   where id = p_id and user_id = v_actor and taken_at is null and created_at > now() - interval '3 hours'
  returning * into r;
  if r.id is null then raise exception 'Ukjent opplasting' using errcode = '42501'; end if;
  return jsonb_build_object('church_id', r.church_id, 'storage_key', r.storage_key, 'file_name', r.file_name, 'mime_type', r.mime_type, 'file_size', r.file_size);
end $$;

-- Bare serveren: registrerer filen etter innholdskontrollen, varsler Menighetsbrukeren.
create or replace function public.inbox_register(p_id uuid, p_name text, p_mime text, p_kind text, p_size bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r public.parish_inbox_pending; v_id uuid; v_parish uuid; v_from text;
begin
  select * into r from public.parish_inbox_pending where id = p_id and taken_at is not null for update;
  if r.id is null then raise exception 'Ukjent opplasting' using errcode = '42501'; end if;
  if p_size is null or p_size <= 0 or p_size > 31457280 then raise exception 'Filen er for stor' using errcode = 'CH030'; end if;
  v_from := app.member_label(r.user_id);
  insert into public.parish_inbox (church_id, from_user, from_name, storage_key, file_name, mime_type, kind, file_size)
  values (r.church_id, r.user_id, left(v_from, 120), r.storage_key, left(coalesce(nullif(btrim(p_name), ''), 'fil'), 200), p_mime, p_kind, p_size)
  returning id into v_id;
  delete from public.parish_inbox_pending where id = p_id;
  select user_id into v_parish from public.parish_accounts where church_id = r.church_id and status = 'active';
  if v_parish is not null then
    perform app.notify(v_parish, 'message', 'Ny fil i innboksen', v_from || ' har sendt «' || left(p_name, 120) || '».', '/app/innboks', r.church_id);
  end if;
  insert into public.audit_logs (actor_user_id, action, target_type, target_id, church_id, meta)
  values (r.user_id, 'inbox.send', 'parish_inbox', v_id::text, r.church_id, jsonb_build_object('kind', p_kind, 'size', p_size));
  return jsonb_build_object('id', v_id, 'name', p_name);
end $$;

-- Bare serveren: påbegynte sendinger som aldri ble fullført (nøklene slettes fra lagringen).
create or replace function public.inbox_expired_take(p_limit int) returns text[]
language sql security definer set search_path = '' as $$
  with d as (delete from public.parish_inbox_pending where id in (
      select id from public.parish_inbox_pending where created_at < now() - interval '3 hours' order by created_at limit greatest(1, least(coalesce(p_limit, 20), 100)))
    returning storage_key)
  select coalesce(array_agg(storage_key), '{}') from d
$$;

-- Innboksen (uten lagringsnøkler), nyeste først.
create or replace function public.inbox_list(p_church uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not app.inbox_reader(p_church) then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'name', x.file_name, 'mime', x.mime_type, 'kind', x.kind, 'size', x.file_size,
      'status', x.status, 'from_name', x.from_name, 'created_at', x.created_at, 'read_at', x.read_at) order by x.created_at desc)
    from public.parish_inbox x where x.church_id = p_church), '[]'::jsonb);
end $$;

-- Nøkler for åpning/nedlasting (serveren lager kortlivede lenker). Bare filer du har tilgang til; åpning merker som lest.
create or replace function public.inbox_keys(p_ids uuid[]) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v jsonb;
begin
  if p_ids is null or cardinality(p_ids) > 100 then raise exception 'Ugyldig' using errcode = '22023'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'key', x.storage_key, 'name', x.file_name, 'mime', x.mime_type)), '[]'::jsonb) into v
  from public.parish_inbox x where x.id = any(p_ids) and app.inbox_reader(x.church_id);
  update public.parish_inbox x set read_at = now() where x.id = any(p_ids) and x.read_at is null and app.inbox_reader(x.church_id);
  return v;
end $$;

-- Organisering: Innkommende (new) ↔ Tidligere mottatt (archived), og nytt navn.
create or replace function public.inbox_set_status(p_ids uuid[], p_status text) returns int
language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  if p_status not in ('new', 'archived') or p_ids is null or cardinality(p_ids) > 500 then raise exception 'Ugyldig' using errcode = '22023'; end if;
  update public.parish_inbox x set status = p_status where x.id = any(p_ids) and app.inbox_reader(x.church_id);
  get diagnostics n = row_count;
  return n;
end $$;

create or replace function public.inbox_rename(p_id uuid, p_name text) returns void
language plpgsql security definer set search_path = '' as $$
declare v text := btrim(coalesce(p_name, ''));
begin
  if char_length(v) not between 1 and 200 or v ~ '[[:cntrl:]/\\]' then raise exception 'Ugyldig navn' using errcode = '22023'; end if;
  update public.parish_inbox x set file_name = v where x.id = p_id and app.inbox_reader(x.church_id);
  if not found then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
end $$;

-- Sletting: radene fjernes, nøklene gis til serveren som sletter innholdet.
create or replace function public.inbox_delete(p_ids uuid[]) returns text[]
language plpgsql security definer set search_path = '' as $$
declare v text[]; v_church text;
begin
  if p_ids is null or cardinality(p_ids) > 500 then raise exception 'Ugyldig' using errcode = '22023'; end if;
  with d as (delete from public.parish_inbox x where x.id = any(p_ids) and app.inbox_reader(x.church_id) returning x.storage_key, x.church_id)
  select coalesce(array_agg(storage_key), '{}'), min(church_id::text) into v, v_church from d;
  if cardinality(v) > 0 then
    insert into public.audit_logs (actor_user_id, action, target_type, church_id, meta)
    values (app.current_user_id(), 'inbox.delete', 'parish_inbox', v_church::uuid, jsonb_build_object('count', cardinality(v)));
  end if;
  return v;
end $$;

revoke all on function app.parish_auth_ok(uuid), app.parish_session_ok(), app.parish_pw_hash(uuid), app.parish_session_count(uuid), app.parish_revoke_sessions(uuid, uuid),
  app.parish_role_guard(), app.parish_membership_guard(), app.parish_json(public.parish_accounts), app.parish_admin_check(uuid),
  app.inbox_reader(uuid), app.inbox_check(uuid, uuid, bigint) from public, anon, authenticated;
grant execute on function app.parish_auth_ok(uuid), app.parish_pw_due(timestamptz) to authenticated;
revoke all on function public.parish_account_get(uuid), public.parish_prepare(uuid, text), public.parish_activate(uuid, text, text), public.parish_abort(uuid),
  public.parish_manage(uuid, text, text), public.parish_pw_record(uuid, text), public.parish_revoke(uuid, uuid), public.parish_login_lookup(text),
  public.parish_self(), public.parish_targets(), public.inbox_can_send(uuid, bigint), public.inbox_begin(text, text, uuid, text, text, text, bigint),
  public.inbox_take(uuid, text, text), public.inbox_register(uuid, text, text, text, bigint), public.inbox_expired_take(int), public.inbox_list(uuid),
  public.inbox_keys(uuid[]), public.inbox_set_status(uuid[], text), public.inbox_rename(uuid, text), public.inbox_delete(uuid[]) from public, anon;
grant execute on function public.parish_account_get(uuid), public.parish_prepare(uuid, text), public.parish_manage(uuid, text, text), public.parish_self(),
  public.parish_targets(), public.inbox_can_send(uuid, bigint), public.inbox_list(uuid), public.inbox_keys(uuid[]), public.inbox_set_status(uuid[], text),
  public.inbox_rename(uuid, text), public.inbox_delete(uuid[]) to authenticated;
revoke all on function public.parish_activate(uuid, text, text), public.parish_abort(uuid), public.parish_pw_record(uuid, text), public.parish_revoke(uuid, uuid),
  public.parish_login_lookup(text), public.inbox_begin(text, text, uuid, text, text, text, bigint), public.inbox_take(uuid, text, text),
  public.inbox_register(uuid, text, text, text, bigint), public.inbox_expired_take(int) from authenticated;
do $$ begin if exists (select 1 from pg_roles where rolname = 'service_role') then
  execute 'grant execute on function public.parish_activate(uuid, text, text), public.parish_abort(uuid), public.parish_pw_record(uuid, text), public.parish_revoke(uuid, uuid),
    public.parish_login_lookup(text), public.inbox_begin(text, text, uuid, text, text, text, bigint), public.inbox_take(uuid, text, text),
    public.inbox_register(uuid, text, text, text, bigint), public.inbox_expired_take(int) to service_role';
end if; end $$;

-- whoami som før (20261020100000_temporary_admin_access.sql), med «parish» for Menighetsbrukeren (appen viser felleskontoen
-- tydelig, skjuler passordendring/sletting og kontrollerer det årlige passordbyttet). null for alle andre.
create or replace function public.whoami() returns jsonb
language sql stable security definer set search_path = '' as $$
  select case when u.id is null then null else jsonb_build_object(
    'id', u.id, 'email', u.email, 'full_name', u.full_name, 'first_name', u.first_name, 'last_name', u.last_name, 'phone', u.phone,
    'mfa', app.mfa_ok(),
    'roles', coalesce((select jsonb_agg(jsonb_build_object('role', r.role, 'church_id', r.church_id, 'expires_at', r.expires_at) order by r.role)
                       from public.user_roles r where r.user_id = u.id and r.revoked_at is null and (r.expires_at is null or r.expires_at > now())), '[]'::jsonb),
    'churches', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'logo_file_id', c.logo_file_id, 'legacy_defaults', c.legacy_defaults) order by c.name)
                          from public.memberships m join public.churches c on c.id = m.church_id
                          where m.user_id = u.id and m.status = 'active' and c.status = 'active' and not app.temp_membership_ended(u.id, c.id)), '[]'::jsonb),
    'parish', (select jsonb_build_object('username', p.username, 'church_id', p.church_id, 'pw_due_at', p.pw_changed_at + interval '12 months')
               from public.parish_accounts p where p.user_id = u.id and p.status = 'active')
  ) end
  from (select app.current_user_id() as uid) x left join public.app_users u on u.id = x.uid
$$;
