-- ConnectHub · Forespørsler om brukerkonto (bare connecthub-dev først). Plan: docs/plan-foresporsler-epost-konto.md kap. 2 og 3.2.
-- Innsending skjer før innlogging via serveren (service_role, med grenser og felle). Ingen konto opprettes automatisk.
-- Developer/Moderator med MFA behandler forespørslene i «Forespørsler» og oppretter bruker via eksisterende invitasjoner
-- (create_invitation – samme regler for rolle, menighet, MFA og én menighet om gangen), i én transaksjon.
-- Personopplysninger ligger bare i account_requests (RLS uten policyer, ingen klienttilgang). Loggen har bare ID-er.
-- Ingen eksisterende rader endres.

create table public.account_requests (
  id uuid primary key default gen_random_uuid(),
  name text check (name is null or char_length(name) between 2 and 100),
  phone text check (phone is null or phone ~ '^[0-9+ ()-]{8,20}$'),
  email text check (email is null or char_length(email) <= 254),
  church_text text check (church_text is null or char_length(church_text) between 2 and 200),
  status text not null default 'new' check (status in ('new', 'in_progress', 'approved', 'rejected')),
  resubmits int not null default 0,
  ip_hash text check (ip_hash is null or ip_hash ~ '^[0-9a-f]{64}$'),
  invitation_id uuid references public.invitations (id) on delete set null,
  church_id uuid references public.churches (id) on delete set null,
  decided_by uuid references public.app_users (id) on delete set null,
  decided_at timestamptz,
  decision_note text check (decision_note is null or char_length(decision_note) <= 500),
  anonymized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index account_requests_email_idx on public.account_requests (lower(email)) where status in ('new', 'in_progress');
create table public.account_request_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.account_requests (id) on delete cascade,
  kind text not null check (kind in ('submitted', 'resubmitted', 'status', 'note', 'approved', 'rejected')),
  actor uuid references public.app_users (id) on delete set null,
  old_status text, new_status text,
  text text check (text is null or char_length(text) <= 1000),
  created_at timestamptz not null default now()
);
create index account_request_events_req_idx on public.account_request_events (request_id, created_at);
alter table public.account_requests enable row level security;
alter table public.account_request_events enable row level security;
revoke all on public.account_requests, public.account_request_events from anon, authenticated;

-- Varsler i ConnectHub (kontomenyen) og e-postmaler for forespørsler.
alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in ('invitation_accepted', 'space_invite', 'space_joined', 'subscription', 'church_status', 'message', 'church_link', 'storage', 'request'));
alter table public.email_templates drop constraint email_templates_key_check;
alter table public.email_templates add constraint email_templates_key_check check (key in ('welcome', 'password', 'request_received', 'request_notify'));
alter table public.email_outbox drop constraint email_outbox_kind_check;
alter table public.email_outbox add constraint email_outbox_kind_check check (kind in ('invite', 'recovery', 'test', 'request_received', 'request_notify'));
alter table public.email_outbox drop constraint email_outbox_template_check;
alter table public.email_outbox add constraint email_outbox_template_check check (template is null or template in ('welcome', 'password', 'request_received', 'request_notify'));
-- Ekstra mottakere av varsel om nye forespørsler (i tillegg til ConnectHubs avsenderadresse).
alter table public.mail_settings add column notify_extra text[] not null default '{}'
  check (cardinality(notify_extra) <= 3);

-- ---------- Innsending (bare serveren) ----------
-- Gir { id, duplicate }. Åpen forespørsel med samme e-post: ingen ny rad, bare «sendt inn på nytt». Samlet tak 200/døgn.
create or replace function public.submit_account_request(p_name text, p_phone text, p_email text, p_church text, p_ip_hash text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_email text := lower(btrim(p_email)); v_id uuid; r public.account_requests;
begin
  if char_length(btrim(coalesce(p_name, ''))) not between 2 and 100 or btrim(coalesce(p_phone, '')) !~ '^[0-9+ ()-]{8,20}$'
     or v_email !~ '^[^@\s,;<>"]{1,64}@[a-z0-9.-]{1,253}\.[a-z]{2,}$' or char_length(btrim(coalesce(p_church, ''))) not between 2 and 200
     or p_name ~ '[[:cntrl:]]' or p_church ~ '[[:cntrl:]]' then
    raise exception 'Ugyldige opplysninger' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('ch:request:' || v_email, 0));
  select * into r from public.account_requests where lower(email) = v_email and status in ('new', 'in_progress') order by created_at desc limit 1;
  if r.id is not null then
    update public.account_requests set resubmits = resubmits + 1, updated_at = now() where id = r.id;
    insert into public.account_request_events (request_id, kind) values (r.id, 'resubmitted');
    return jsonb_build_object('id', r.id, 'duplicate', true);
  end if;
  if (select count(*) from public.account_requests where created_at > now() - interval '1 day') >= 200 then
    raise exception 'For mange forespørsler siste døgn' using errcode = '54000'; end if;
  insert into public.account_requests (name, phone, email, church_text, ip_hash)
  values (btrim(p_name), btrim(p_phone), v_email, btrim(p_church), p_ip_hash) returning id into v_id;
  insert into public.account_request_events (request_id, kind) values (v_id, 'submitted');
  insert into public.audit_logs (action, target_type, target_id) values ('requests.submit', 'account_requests', v_id::text);
  perform app.notify(r2.user_id, 'request', 'Ny forespørsel om brukerkonto', 'Åpne «Forespørsler» i ConnectHub for å behandle den.', '/connecthub-admin.dc.html#/foresporsler', null)
  from (select distinct ur.user_id from public.user_roles ur join public.app_users u on u.id = ur.user_id and u.status = 'active'
        where ur.role in ('developer', 'moderator') and ur.church_id is null and ur.revoked_at is null) r2;
  return jsonb_build_object('id', v_id, 'duplicate', false);
end $$;

-- ---------- Innboks (Developer/Moderator med MFA) ----------
create or replace function public.account_requests_list() returns table (id uuid, name text, phone text, email text, church_text text, status text,
  resubmits int, created_at timestamptz, updated_at timestamptz, decided_at timestamptz, decided_by_name text, decision_note text,
  invitation_id uuid, church_id uuid, existing_user_id uuid, existing_user_name text, anonymized boolean)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not app.is_staff() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  return query select r.id, r.name, r.phone, r.email, r.church_text, r.status, r.resubmits, r.created_at, r.updated_at, r.decided_at,
    coalesce(nullif(btrim(d.full_name), ''), d.email), r.decision_note, r.invitation_id, r.church_id, u.id, coalesce(nullif(btrim(u.full_name), ''), u.email), r.anonymized_at is not null
    from public.account_requests r left join public.app_users d on d.id = r.decided_by left join public.app_users u on r.email is not null and lower(u.email) = lower(r.email)
    order by (r.status in ('new', 'in_progress')) desc, r.created_at desc;
end $$;

create or replace function public.account_request_events_for(p_id uuid) returns table (kind text, old_status text, new_status text, text text, actor_name text, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not app.is_staff() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  return query select e.kind, e.old_status, e.new_status, e.text, coalesce(nullif(btrim(u.full_name), ''), u.email), e.created_at
    from public.account_request_events e left join public.app_users u on u.id = e.actor where e.request_id = p_id order by e.created_at;
end $$;

create or replace function public.set_account_request_status(p_id uuid, p_status text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := app.current_user_id(); r public.account_requests;
begin
  if v_actor is null or not app.is_staff() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  if p_status not in ('new', 'in_progress') then raise exception 'Ugyldig status' using errcode = '22023'; end if;
  select * into r from public.account_requests where id = p_id for update;
  if r.id is null or r.status not in ('new', 'in_progress') then raise exception 'Forespørselen er allerede avgjort' using errcode = '22023'; end if;
  if r.status = p_status then return; end if;
  update public.account_requests set status = p_status, updated_at = now() where id = p_id;
  insert into public.account_request_events (request_id, kind, actor, old_status, new_status) values (p_id, 'status', v_actor, r.status, p_status);
  insert into public.audit_logs (actor_user_id, action, target_type, target_id, meta) values (v_actor, 'requests.status', 'account_requests', p_id::text, jsonb_build_object('old', r.status, 'new', p_status));
end $$;

create or replace function public.add_account_request_note(p_id uuid, p_note text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := app.current_user_id();
begin
  if v_actor is null or not app.is_staff() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  if char_length(btrim(coalesce(p_note, ''))) not between 1 and 1000 then raise exception 'Notatet må ha 1–1000 tegn' using errcode = '22023'; end if;
  if not exists (select 1 from public.account_requests where id = p_id) then raise exception 'Fant ikke forespørselen' using errcode = '22023'; end if;
  insert into public.account_request_events (request_id, kind, actor, text) values (p_id, 'note', v_actor, btrim(p_note));
  insert into public.audit_logs (actor_user_id, action, target_type, target_id) values (v_actor, 'requests.note', 'account_requests', p_id::text);
end $$;

create or replace function public.reject_account_request(p_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := app.current_user_id(); r public.account_requests;
begin
  if v_actor is null or not app.is_staff() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  if char_length(btrim(coalesce(p_reason, ''))) not between 2 and 500 then raise exception 'Begrunnelse kreves' using errcode = '22023'; end if;
  select * into r from public.account_requests where id = p_id for update;
  if r.id is null or r.status not in ('new', 'in_progress') then raise exception 'Forespørselen er allerede avgjort' using errcode = '22023'; end if;
  update public.account_requests set status = 'rejected', decided_by = v_actor, decided_at = now(), decision_note = btrim(p_reason), updated_at = now() where id = p_id;
  insert into public.account_request_events (request_id, kind, actor, old_status, new_status, text) values (p_id, 'rejected', v_actor, r.status, 'rejected', btrim(p_reason));
  insert into public.audit_logs (actor_user_id, action, target_type, target_id) values (v_actor, 'requests.reject', 'account_requests', p_id::text);
end $$;

-- Opprett bruker fra en forespørsel: A ny menighet, B eksisterende menighet, C uten menighet (bare Developer/Moderator-
-- roller – dagens modell). Alt i én transaksjon via create_invitation (samme regler). Kontoen opprettes når personen
-- åpner invitasjonslenken og velger passord. Gir invitasjonen ({ id, email, church_name, role }) til serveren (e-post).
create or replace function public.approve_account_request(p_id uuid, p_mode text, p_church_name text, p_church uuid, p_role text, p_token_hash text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := app.current_user_id(); r public.account_requests; v_church uuid; v_inv jsonb;
begin
  if v_actor is null or not app.is_staff() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  select * into r from public.account_requests where id = p_id for update;
  if r.id is null or r.status not in ('new', 'in_progress') then raise exception 'Forespørselen er allerede avgjort' using errcode = '22023'; end if;
  if exists (select 1 from public.app_users u where lower(u.email) = lower(r.email)) then
    raise exception 'E-postadressen har allerede en konto' using errcode = 'CH010'; end if;
  if p_mode = 'new' then
    if p_role not in ('user', 'church_admin') then raise exception 'Ugyldig rolle' using errcode = '22023'; end if;
    if char_length(btrim(coalesce(p_church_name, ''))) not between 2 and 100 or p_church_name ~ '[[:cntrl:]]' then raise exception 'Menighetens navn må ha 2–100 tegn' using errcode = '22023'; end if;
    insert into public.churches (name) values (btrim(p_church_name)) returning id into v_church;   -- loggføres av revisjonstriggeren
  elsif p_mode = 'existing' then
    if p_role not in ('user', 'church_admin') then raise exception 'Ugyldig rolle' using errcode = '22023'; end if;
    v_church := p_church;
  elsif p_mode = 'none' then
    if p_role not in ('developer', 'moderator') then raise exception 'Uten menighet kan bare Developer eller Moderator opprettes' using errcode = '22023'; end if;
    v_church := null;
  else raise exception 'Ugyldig valg' using errcode = '22023';
  end if;
  v_inv := public.create_invitation(r.email, v_church, p_role, p_token_hash, 7);   -- rolle, menighet, MFA og regler som ellers
  update public.account_requests set status = 'approved', decided_by = v_actor, decided_at = now(), invitation_id = (v_inv ->> 'id')::uuid,
    church_id = v_church, updated_at = now() where id = p_id;
  insert into public.account_request_events (request_id, kind, actor, old_status, new_status, text)
  values (p_id, 'approved', v_actor, r.status, 'approved', concat_ws(' · ', case p_mode when 'new' then 'Ny menighet' when 'existing' then 'Eksisterende menighet' else 'Uten menighet' end, v_inv ->> 'church_name', p_role));
  insert into public.audit_logs (actor_user_id, action, target_type, target_id, church_id, meta)
  values (v_actor, 'requests.approve', 'account_requests', p_id::text, v_church, jsonb_build_object('mode', p_mode, 'role', p_role, 'invitation', v_inv ->> 'id'));
  return v_inv;
end $$;

create or replace function public.delete_account_request(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := app.current_user_id();
begin
  if v_actor is null or not app.is_staff() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  delete from public.account_requests where id = p_id;
  if not found then raise exception 'Fant ikke forespørselen' using errcode = '22023'; end if;
  insert into public.audit_logs (actor_user_id, action, target_type, target_id) values (v_actor, 'requests.delete', 'account_requests', p_id::text);
end $$;

-- Oppbevaring: avslåtte slettes etter 30 dager, godkjente anonymiseres etter 90 dager, IP-hash fjernes etter 7 dager.
create or replace function app.purge_account_requests() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare n_del int; n_anon int;
begin
  delete from public.account_requests where status = 'rejected' and decided_at < now() - interval '30 days'; get diagnostics n_del = row_count;
  update public.account_requests set name = null, phone = null, email = null, church_text = null, anonymized_at = now()
    where status = 'approved' and anonymized_at is null and decided_at < now() - interval '90 days'; get diagnostics n_anon = row_count;
  update public.account_requests set ip_hash = null where ip_hash is not null and created_at < now() - interval '7 days';
  return jsonb_build_object('deleted', n_del, 'anonymized', n_anon);
end $$;
revoke all on function app.purge_account_requests() from public, anon, authenticated;

-- ---------- Varslingsadresser (Developer/Moderator med MFA) ----------
create or replace function public.set_mail_notify_extra(p_emails text[]) returns void
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := app.current_user_id(); v_old text[]; v_new text[];
begin
  if v_actor is null or not app.is_staff() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  select coalesce(array_agg(distinct lower(btrim(e))), '{}') into v_new from unnest(coalesce(p_emails, '{}')) e where btrim(e) <> '';
  if cardinality(v_new) > 3 then raise exception 'Høyst 3 ekstra adresser' using errcode = '22023'; end if;
  if exists (select 1 from unnest(v_new) e where e !~ '^[^@\s,;<>"]{1,64}@[a-z0-9.-]{1,253}\.[a-z]{2,}$') then raise exception 'Ugyldig e-postadresse' using errcode = '22023'; end if;
  select notify_extra into v_old from public.mail_settings where id for update;
  update public.mail_settings set notify_extra = v_new, updated_by = v_actor, updated_at = now() where id;
  insert into public.audit_logs (actor_user_id, action, target_type, target_id, meta)
  values (v_actor, 'mail.settings_update', 'mail_settings', 'notify_extra', jsonb_build_object('old_count', cardinality(v_old), 'new_count', cardinality(v_new)));
end $$;

-- mail_settings_get med varslingsadressene; save/reset av maler med de nye nøklene (ellers som i 20261010100000_mail.sql).
create or replace function public.mail_settings_get() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not app.is_staff() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  return (select jsonb_build_object('custom_logo', s.logo_key is not null, 'logo_mime', s.logo_mime, 'updated_at', s.updated_at, 'notify_extra', to_jsonb(s.notify_extra),
    'updated_by_name', (select coalesce(nullif(btrim(u.full_name), ''), u.email) from public.app_users u where u.id = s.updated_by)) from public.mail_settings s where s.id);
end $$;

create or replace function public.save_mail_template(p_key text, p_subject text, p_blocks jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := app.current_user_id(); o public.email_templates; v_blocks jsonb;
begin
  if v_actor is null or not app.is_staff() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  if p_key not in ('welcome', 'password', 'request_received', 'request_notify') then raise exception 'Ukjent mal' using errcode = '22023'; end if;
  v_blocks := app.mail_blocks_clean(p_blocks);
  if not coalesce(app.mail_template_ok(btrim(p_subject), v_blocks), false) then raise exception 'Ugyldig mal' using errcode = '22023'; end if;
  select * into o from public.email_templates where key = p_key for update;
  insert into public.email_templates (key, subject, blocks, updated_by, updated_at) values (p_key, btrim(p_subject), v_blocks, v_actor, now())
  on conflict (key) do update set subject = excluded.subject, blocks = excluded.blocks, updated_by = excluded.updated_by, updated_at = excluded.updated_at;
  insert into public.audit_logs (actor_user_id, action, target_type, target_id, meta)
  values (v_actor, 'mail.template_update', 'email_templates', p_key,
          jsonb_build_object('old_subject', o.subject, 'new_subject', btrim(p_subject), 'old_blocks', o.blocks, 'new_blocks', v_blocks, 'was_default', o.key is null));
end $$;

create or replace function public.reset_mail_template(p_key text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := app.current_user_id(); o public.email_templates;
begin
  if v_actor is null or not app.is_staff() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  if p_key not in ('welcome', 'password', 'request_received', 'request_notify') then raise exception 'Ukjent mal' using errcode = '22023'; end if;
  delete from public.email_templates where key = p_key returning * into o;
  if o.key is null then return; end if;
  insert into public.audit_logs (actor_user_id, action, target_type, target_id, meta)
  values (v_actor, 'mail.template_reset', 'email_templates', p_key, jsonb_build_object('old_subject', o.subject, 'old_blocks', o.blocks));
end $$;

-- Bare serveren: ekstra mottakere av varsel om nye forespørsler.
create or replace function public.mail_notify_extra() returns text[]
language sql stable security definer set search_path = '' as $$ select notify_extra from public.mail_settings where id $$;

revoke all on function public.submit_account_request(text, text, text, text, text), public.account_requests_list(), public.account_request_events_for(uuid),
  public.set_account_request_status(uuid, text), public.add_account_request_note(uuid, text), public.reject_account_request(uuid, text),
  public.approve_account_request(uuid, text, text, uuid, text, text), public.delete_account_request(uuid), public.set_mail_notify_extra(text[]),
  public.mail_notify_extra() from public, anon, authenticated;
grant execute on function public.account_requests_list(), public.account_request_events_for(uuid), public.set_account_request_status(uuid, text),
  public.add_account_request_note(uuid, text), public.reject_account_request(uuid, text), public.approve_account_request(uuid, text, text, uuid, text, text),
  public.delete_account_request(uuid), public.set_mail_notify_extra(text[]) to authenticated;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'grant execute on function public.submit_account_request(text, text, text, text, text), public.mail_notify_extra() to service_role';
  end if;
end $$;
