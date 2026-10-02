-- ConnectHub · E-postsystem (bare connecthub-dev først). Plan: docs/plan-foresporsler-epost-konto.md, kapittel 3 og 1.3 A.
-- ConnectHub sender selv e-post for invitasjoner (velkomst) og «Glemt passord» via SMTP på serveren. Lenkene lages av
-- serveren (Supabase generate_link) og settes inn i malens lenkeboks – de lagres aldri her.
--   email_templates  – redigerte maler (rad mangler = standardmalen i koden, src/shared/mail-render.js)
--   mail_settings    – én rad: valgfri egen logo (lagringsnøkkel i den private bøtta)
--   email_outbox     – logg over utsendinger (type, mottaker, status, feilkode – aldri lenker eller innhold)
--   anon_rate_limits – tellere for handlinger før innlogging («Glemt passord»), bare hasher
-- Bare Developer/Moderator med MFA (app.is_staff) leser og endrer maler og logo; serveren (service_role) leser malen ved
-- utsending og registrerer utsendinger. Ingen direkte tabelltilgang for klienter. Alle endringer loggføres.
-- Ingen eksisterende tabeller eller rader endres.

create table public.email_templates (
  key text primary key check (key in ('welcome', 'password')),
  subject text not null,
  blocks jsonb not null,
  updated_by uuid references public.app_users (id) on delete set null,
  updated_at timestamptz not null default now()
);
create table public.mail_settings (
  id boolean primary key default true check (id),
  logo_key text check (logo_key is null or logo_key ~ '^mail/logo-[0-9a-f-]{36}\.(png|jpg)$'),
  logo_mime text check (logo_mime is null or logo_mime in ('image/png', 'image/jpeg')),
  updated_by uuid references public.app_users (id) on delete set null,
  updated_at timestamptz
);
insert into public.mail_settings default values;
create table public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('invite', 'recovery', 'test')),
  template text check (template is null or template in ('welcome', 'password')),
  to_email text not null check (char_length(to_email) <= 254),
  related_id uuid,
  actor uuid references public.app_users (id) on delete set null,
  status text not null check (status in ('sent', 'failed')),
  error_code text check (error_code is null or char_length(error_code) <= 60),
  created_at timestamptz not null default now()
);
create index email_outbox_created_idx on public.email_outbox (created_at desc);
create table public.anon_rate_limits (
  key_hash text not null check (key_hash ~ '^[0-9a-f]{64}$'),
  window_start timestamptz not null,
  hits int not null default 0,
  primary key (key_hash, window_start)
);
alter table public.email_templates enable row level security;
alter table public.mail_settings enable row level security;
alter table public.email_outbox enable row level security;
alter table public.anon_rate_limits enable row level security;
revoke all on public.email_templates, public.mail_settings, public.email_outbox, public.anon_rate_limits from anon, authenticated;

-- Samme regler som templateProblem() i src/shared/mail-render.js.
create or replace function app.mail_template_ok(p_subject text, p_blocks jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select p_subject is not null and char_length(btrim(p_subject)) between 1 and 150 and char_length(p_subject) <= 150 and p_subject !~ '[\r\n]'
    and jsonb_typeof(p_blocks) = 'array' and jsonb_array_length(p_blocks) between 1 and 30
    and not exists (select 1 from jsonb_array_elements(p_blocks) b where jsonb_typeof(b) <> 'object'
      or coalesce(b ->> 't', '') not in ('logo', 'h', 'p', 'link', 'small', 'hr')
      or (b ->> 't' = 'h' and (char_length(btrim(coalesce(b ->> 'text', ''))) = 0 or char_length(b ->> 'text') > 200))
      or (b ->> 't' in ('p', 'small') and (char_length(btrim(coalesce(b ->> 'text', ''))) = 0 or char_length(b ->> 'text') > 2000))
      or (b ->> 't' = 'link' and (char_length(btrim(coalesce(b ->> 'label', ''))) = 0 or char_length(b ->> 'label') > 60 or b ->> 'label' ~ '[\r\n]')))
    and (select count(*) from jsonb_array_elements(p_blocks) b where b ->> 't' = 'link') = 1
    and (select count(*) from jsonb_array_elements(p_blocks) b where b ->> 't' = 'logo') <= 1
$$;
revoke all on function app.mail_template_ok(text, jsonb) from public, anon, authenticated;

-- Lagret blokkliste uten ukjente felt (bare t/text/label beholdes).
create or replace function app.mail_blocks_clean(p_blocks jsonb) returns jsonb
language sql immutable set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object('t', b ->> 't', 'text', b -> 'text', 'label', b -> 'label')) order by n), '[]'::jsonb)
  from jsonb_array_elements(p_blocks) with ordinality x (b, n)
$$;
revoke all on function app.mail_blocks_clean(jsonb) from public, anon, authenticated;

-- ---------- Maler (Developer/Moderator med MFA) ----------
create or replace function public.mail_templates() returns table (key text, subject text, blocks jsonb, updated_at timestamptz, updated_by_name text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not app.is_staff() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  return query select t.key, t.subject, t.blocks, t.updated_at, coalesce(nullif(btrim(u.full_name), ''), u.email)
    from public.email_templates t left join public.app_users u on u.id = t.updated_by order by t.key;
end $$;

create or replace function public.save_mail_template(p_key text, p_subject text, p_blocks jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := app.current_user_id(); o public.email_templates; v_blocks jsonb;
begin
  if v_actor is null or not app.is_staff() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  if p_key not in ('welcome', 'password') then raise exception 'Ukjent mal' using errcode = '22023'; end if;
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
  if p_key not in ('welcome', 'password') then raise exception 'Ukjent mal' using errcode = '22023'; end if;
  delete from public.email_templates where key = p_key returning * into o;
  if o.key is null then return; end if;   -- bruker allerede standardmalen
  insert into public.audit_logs (actor_user_id, action, target_type, target_id, meta)
  values (v_actor, 'mail.template_reset', 'email_templates', p_key, jsonb_build_object('old_subject', o.subject, 'old_blocks', o.blocks));
end $$;

-- ---------- Logo ----------
create or replace function public.mail_settings_get() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not app.is_staff() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  return (select jsonb_build_object('custom_logo', s.logo_key is not null, 'logo_mime', s.logo_mime, 'updated_at', s.updated_at,
    'updated_by_name', (select coalesce(nullif(btrim(u.full_name), ''), u.email) from public.app_users u where u.id = s.updated_by)) from public.mail_settings s where s.id);
end $$;

-- Serveren lagrer filen og kaller så denne med brukerens token. Gir den gamle nøkkelen tilbake (serveren sletter filen).
create or replace function public.set_mail_logo(p_key text, p_mime text) returns text
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := app.current_user_id(); v_old text;
begin
  if v_actor is null or not app.is_staff() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  if p_key !~ '^mail/logo-[0-9a-f-]{36}\.(png|jpg)$' or p_mime not in ('image/png', 'image/jpeg') then raise exception 'Ugyldig logo' using errcode = '22023'; end if;
  select logo_key into v_old from public.mail_settings where id for update;
  update public.mail_settings set logo_key = p_key, logo_mime = p_mime, updated_by = v_actor, updated_at = now() where id;
  insert into public.audit_logs (actor_user_id, action, target_type, target_id, meta)
  values (v_actor, 'mail.logo_update', 'mail_settings', 'logo', jsonb_build_object('old_custom', v_old is not null, 'mime', p_mime));
  return v_old;
end $$;

create or replace function public.reset_mail_logo() returns text
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := app.current_user_id(); v_old text;
begin
  if v_actor is null or not app.is_staff() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  select logo_key into v_old from public.mail_settings where id for update;
  if v_old is null then return null; end if;
  update public.mail_settings set logo_key = null, logo_mime = null, updated_by = v_actor, updated_at = now() where id;
  insert into public.audit_logs (actor_user_id, action, target_type, target_id, meta)
  values (v_actor, 'mail.logo_reset', 'mail_settings', 'logo', '{}'::jsonb);
  return v_old;
end $$;

-- Lagringsnøkkel til egen logo for visning i Mail-fanen (serveren lager en kortlivet lenke).
create or replace function public.mail_logo_key() returns text
language plpgsql stable security definer set search_path = '' as $$
begin
  if not app.is_staff() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  return (select logo_key from public.mail_settings where id);
end $$;

-- ---------- Utsendingslogg ----------
create or replace function public.mail_outbox_recent() returns table (id uuid, kind text, template text, to_email text, status text, error_code text, created_at timestamptz, actor_name text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not app.is_staff() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  return query select o.id, o.kind, o.template, o.to_email, o.status, o.error_code, o.created_at, coalesce(nullif(btrim(u.full_name), ''), u.email)
    from public.email_outbox o left join public.app_users u on u.id = o.actor order by o.created_at desc limit 50;
end $$;

-- ---------- Bare serveren (service_role) ----------
create or replace function public.mail_for_send(p_key text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('subject', t.subject, 'blocks', t.blocks, 'logo_key', s.logo_key, 'logo_mime', s.logo_mime)
  from public.mail_settings s left join public.email_templates t on t.key = p_key where s.id
$$;

create or replace function public.register_mail(p_kind text, p_template text, p_to text, p_related uuid, p_actor uuid, p_status text, p_error text) returns void
language sql security definer set search_path = '' as $$
  insert into public.email_outbox (kind, template, to_email, related_id, actor, status, error_code)
  values (p_kind, p_template, left(lower(btrim(p_to)), 254), p_related, p_actor, p_status, left(p_error, 60))
$$;

-- Teller for handlinger før innlogging. true = tillatt. Nøkkelen er en hash (ingen IP-er eller e-poster lagres).
create or replace function public.anon_rate_hit(p_key_hash text, p_limit int, p_window_seconds int) returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_start timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds); v_hits int;
begin
  if p_key_hash !~ '^[0-9a-f]{64}$' or p_limit < 1 or p_window_seconds < 60 or p_window_seconds > 86400 then raise exception 'Ugyldig' using errcode = '22023'; end if;
  delete from public.anon_rate_limits where window_start < now() - interval '2 days';
  insert into public.anon_rate_limits (key_hash, window_start, hits) values (p_key_hash, v_start, 1)
  on conflict (key_hash, window_start) do update set hits = public.anon_rate_limits.hits + 1 returning hits into v_hits;
  return v_hits <= p_limit;
end $$;

-- Oppbevaring: utsendingsloggen (med mottakeradresser) slettes etter 30 dager. Kjøres manuelt eller planlagt.
create or replace function app.purge_email_outbox() returns int
language sql security definer set search_path = '' as $$
  with d as (delete from public.email_outbox where created_at < now() - interval '30 days' returning 1) select count(*)::int from d
$$;
revoke all on function app.purge_email_outbox() from public, anon, authenticated;

revoke all on function public.mail_templates(), public.save_mail_template(text, text, jsonb), public.reset_mail_template(text),
  public.mail_settings_get(), public.set_mail_logo(text, text), public.reset_mail_logo(), public.mail_logo_key(), public.mail_outbox_recent(),
  public.mail_for_send(text), public.register_mail(text, text, text, uuid, uuid, text, text), public.anon_rate_hit(text, int, int) from public, anon, authenticated;
grant execute on function public.mail_templates(), public.save_mail_template(text, text, jsonb), public.reset_mail_template(text),
  public.mail_settings_get(), public.set_mail_logo(text, text), public.reset_mail_logo(), public.mail_logo_key(), public.mail_outbox_recent() to authenticated;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'grant execute on function public.mail_for_send(text), public.register_mail(text, text, text, uuid, uuid, text, text), public.anon_rate_hit(text, int, int) to service_role';
  end if;
end $$;
