-- ConnectHub · Tilbakemeldinger (trinn 8, førsteversjon). Vanlig PostgreSQL.
--   - Alle aktive, innloggede brukere kan sende inn (submit_feedback). Grense: 20 per bruker per døgn.
--   - Bare Moderator og Developer (begge med MFA) kan lese og behandle – kun via funksjonene under.
--     Tabellene har RLS uten policyer og ingen rettigheter for anon/authenticated: ingen direkte lesing eller skriving.
--   - Hemmeligheter (tokens, nøkler, passord-fraser, adresseparametere) fjernes i databasen før lagring; i brukerens
--     egen tekst fjernes også e-postadresser og telefonnumre. Klienten gjør det samme før sending og ved kopiering.
--   - Statusendringer og interne notater lagres som hendelser (hvem, når, gammel og ny status, begrunnelse/notat).
--   - Opprettelse, statusendringer og notater loggføres i audit_logs (uten innholdet).

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique,
  kind text not null check (kind in ('bug', 'improvement', 'feature', 'other')),
  title text check (char_length(title) <= 140),
  description text not null check (char_length(description) between 3 and 4000),
  answers jsonb not null default '{}'::jsonb,
  app text check (app ~ '^[a-z0-9-]{1,60}$'),
  app_name text check (char_length(app_name) <= 80),
  page text check (char_length(page) <= 300),
  view text check (char_length(view) <= 200),
  marked jsonb,
  context jsonb not null default '{}'::jsonb,
  church_id uuid references public.churches (id) on delete set null,
  role text check (role in ('developer', 'moderator', 'admin', 'user')),
  status text not null default 'new' check (status in ('new', 'in_progress', 'needs_info', 'resolved', 'rejected')),
  status_reason text check (char_length(status_reason) <= 1000),
  created_by uuid references public.app_users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.app_users (id) on delete set null,
  constraint feedback_rejected_reason check (status <> 'rejected' or char_length(coalesce(status_reason, '')) >= 3)
);
create index feedback_created_idx on public.feedback (created_at desc);
create index feedback_by_idx on public.feedback (created_by, created_at desc);

create table public.feedback_events (
  id uuid primary key default gen_random_uuid(),
  feedback_id uuid not null references public.feedback (id) on delete cascade,
  kind text not null check (kind in ('status', 'note')),
  old_status text, new_status text,
  text text check (char_length(text) <= 2000),
  actor uuid references public.app_users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index feedback_events_idx on public.feedback_events (feedback_id, created_at);

alter table public.feedback enable row level security;
alter table public.feedback_events enable row level security;
revoke all on public.feedback, public.feedback_events from anon, authenticated;

-- ---------- Fjerning av hemmeligheter ----------
-- Trygt for JSON-tekst (ingen mønstre spiser anførselstegn eller skråstrek).
create or replace function app.feedback_scrub_secrets(t text) returns text language sql immutable set search_path = '' as $$
  select regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(
    coalesce(t, ''),
    '-----BEGIN [A-Z ]*PRIVATE KEY-----.*?-----END [A-Z ]*PRIVATE KEY-----', '[fjernet: privat nøkkel]', 'g'),
    'eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}', '[fjernet: token]', 'g'),
    'sb_(secret|publishable)_[A-Za-z0-9_-]{6,}', '[fjernet: nøkkel]', 'g'),
    '(sk|pk|rk)_(live|test)_[A-Za-z0-9]{8,}|AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{20,}|xox[baprs]-[A-Za-z0-9-]{10,}', '[fjernet: nøkkel]', 'g'),
    '([Bb]earer)[ ]+[A-Za-z0-9._~+/=-]{16,}', '\1 [fjernet]', 'g'),
    '([?&#;](access_token|refresh_token|id_token|token|code|key|apikey|api_key|secret|password|passord|pwd|token_hash)=)[^&#[:space:]"\\]+', '\1[fjernet]', 'gi'),
    '(postgres(ql)?://[^:/[:space:]"\\]+:)[^@[:space:]"\\]+@', '\1[fjernet]@', 'gi'),
    '[A-Za-z0-9_+/=]{40,}', '[fjernet: lang streng]', 'g')
$$;
-- Brukerens egen tekst: hemmeligheter + passord-fraser, e-postadresser og telefonnumre.
create or replace function app.feedback_scrub_text(t text) returns text language sql immutable set search_path = '' as $$
  select regexp_replace(regexp_replace(regexp_replace(
    app.feedback_scrub_secrets(t),
    '(\m(passord|password|pwd|pin)\M[[:space:]]*[:=][[:space:]]*)[^[:space:]]+', '\1[fjernet]', 'gi'),
    '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}', '[e-post fjernet]', 'g'),
    '(\+47[ ]?)?(^|[^0-9])[49][0-9]{2}[ ]?[0-9]{2}[ ]?[0-9]{3}([^0-9]|$)', '\2[telefon fjernet]\3', 'g')
$$;
-- Rens alle tekstverdier i et JSON-objekt (rekursivt via tekst; mønstrene over er JSON-trygge).
create or replace function app.feedback_scrub_json(j jsonb) returns jsonb language plpgsql immutable set search_path = '' as $$
begin
  if j is null then return null; end if;
  return app.feedback_scrub_secrets(j::text)::jsonb;
exception when others then return '{}'::jsonb;
end $$;
revoke all on function app.feedback_scrub_secrets(text), app.feedback_scrub_text(text), app.feedback_scrub_json(jsonb) from public, anon, authenticated;

-- ---------- Innsending (alle aktive innloggede) ----------
create or replace function public.submit_feedback(p_kind text, p_title text, p_description text, p_answers jsonb,
  p_app text, p_app_name text, p_page text, p_view text, p_marked jsonb, p_context jsonb, p_church uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := app.current_user_id(); v_ref text; v_id uuid; v_role text; v_answers jsonb := '{}'::jsonb; k text; v jsonb;
  v_desc text := btrim(coalesce(p_description, ''));
begin
  if v_actor is null then raise exception 'Ikke innlogget' using errcode = '42501'; end if;
  if p_kind is null or p_kind not in ('bug', 'improvement', 'feature', 'other') then raise exception 'Ukjent kategori' using errcode = '22023'; end if;
  if char_length(v_desc) < 3 or char_length(v_desc) > 4000 then raise exception 'Beskrivelsen må ha 3–4000 tegn' using errcode = '22023'; end if;
  if char_length(coalesce(p_title, '')) > 140 then raise exception 'For lang overskrift' using errcode = '22023'; end if;
  if p_answers is not null and jsonb_typeof(p_answers) <> 'object' then raise exception 'Ugyldige svar' using errcode = '22023'; end if;
  if octet_length(coalesce(p_answers, '{}'::jsonb)::text) > 8000 or octet_length(coalesce(p_marked, '{}'::jsonb)::text) > 4000
     or octet_length(coalesce(p_context, '{}'::jsonb)::text) > 12000 then raise exception 'For mye data' using errcode = '22023'; end if;
  if p_marked is not null and jsonb_typeof(p_marked) <> 'object' then raise exception 'Ugyldig markering' using errcode = '22023'; end if;
  if p_context is not null and jsonb_typeof(p_context) <> 'object' then raise exception 'Ugyldig kontekst' using errcode = '22023'; end if;
  if p_app is not null and p_app !~ '^[a-z0-9-]{1,60}$' then raise exception 'Ugyldig applikasjon' using errcode = '22023'; end if;
  -- Bare kjente svarfelt, som tekst, renset.
  for k, v in select * from jsonb_each(coalesce(p_answers, '{}'::jsonb)) loop
    if k not in ('expected', 'steps', 'improve', 'feature', 'importance', 'severity', 'where') then continue; end if;
    if jsonb_typeof(v) <> 'string' then continue; end if;
    if k in ('importance', 'severity') and (v #>> '{}') not in ('low', 'medium', 'high', 'critical') then continue; end if;
    v_answers := v_answers || jsonb_build_object(k, left(app.feedback_scrub_text(v #>> '{}'), 2000));
  end loop;
  if (select count(*) from public.feedback where created_by = v_actor and created_at > now() - interval '1 day') >= 20 then
    raise exception 'For mange tilbakemeldinger siste døgn' using errcode = '54000'; end if;
  v_role := case when app.is_developer() then 'developer' when app.is_moderator() then 'moderator'
                 when p_church is not null and app.is_church_admin(p_church) then 'admin'
                 when exists (select 1 from public.user_roles r where r.user_id = v_actor and r.role = 'church_admin' and r.revoked_at is null) then 'admin'
                 else 'user' end;
  loop
    v_ref := 'TB-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    exit when not exists (select 1 from public.feedback where ref = v_ref);
  end loop;
  insert into public.feedback (ref, kind, title, description, answers, app, app_name, page, view, marked, context, church_id, role, created_by, updated_by)
  values (v_ref, p_kind, nullif(left(app.feedback_scrub_text(btrim(coalesce(p_title, ''))), 140), ''), left(app.feedback_scrub_text(v_desc), 4000), v_answers,
          p_app, left(app.feedback_scrub_secrets(p_app_name), 80), left(app.feedback_scrub_secrets(p_page), 300), left(app.feedback_scrub_secrets(p_view), 200),
          app.feedback_scrub_json(p_marked), coalesce(app.feedback_scrub_json(p_context), '{}'::jsonb),
          case when p_church is not null and app.is_member(p_church) then p_church end, v_role, v_actor, v_actor)
  returning id into v_id;
  insert into public.audit_logs (actor_user_id, action, target_type, target_id, meta)
  values (v_actor, 'feedback.create', 'feedback', v_id::text, jsonb_build_object('ref', v_ref, 'kind', p_kind, 'app', p_app));
  return jsonb_build_object('id', v_id, 'ref', v_ref);
end $$;

-- ---------- Innboks (bare Moderator og Developer med MFA) ----------
create or replace function app.feedback_staff() returns boolean language sql stable set search_path = '' as $$
  select app.is_developer() or app.is_moderator()
$$;

create or replace function public.feedback_list()
returns table (id uuid, ref text, kind text, title text, description text, answers jsonb, app text, app_name text, page text, view text,
  marked jsonb, context jsonb, church_id uuid, church_name text, role text, status text, status_reason text,
  created_at timestamptz, updated_at timestamptz, submitter_id uuid, submitter_name text, note_count int)
language plpgsql stable security definer set search_path = '' as $$
begin
  if app.current_user_id() is null or not app.feedback_staff() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  return query
    select f.id, f.ref, f.kind, f.title, f.description, f.answers, f.app, f.app_name, f.page, f.view, f.marked, f.context,
           f.church_id, c.name, f.role, f.status, f.status_reason, f.created_at, f.updated_at, f.created_by,
           coalesce(nullif(u.full_name, ''), u.email),
           (select count(*)::int from public.feedback_events e where e.feedback_id = f.id and e.kind = 'note')
    from public.feedback f left join public.churches c on c.id = f.church_id left join public.app_users u on u.id = f.created_by
    order by f.created_at desc limit 1000;
end $$;

create or replace function public.feedback_events_for(p_id uuid)
returns table (id uuid, kind text, old_status text, new_status text, text text, actor_name text, actor_role text, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if app.current_user_id() is null or not app.feedback_staff() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  return query
    select e.id, e.kind, e.old_status, e.new_status, e.text, coalesce(nullif(u.full_name, ''), u.email),
           case when exists (select 1 from public.user_roles r where r.user_id = e.actor and r.role = 'developer' and r.revoked_at is null) then 'developer'
                when exists (select 1 from public.user_roles r where r.user_id = e.actor and r.role = 'moderator' and r.revoked_at is null) then 'moderator' end,
           e.created_at
    from public.feedback_events e left join public.app_users u on u.id = e.actor
    where e.feedback_id = p_id order by e.created_at;
end $$;

create or replace function public.set_feedback_status(p_id uuid, p_status text, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := app.current_user_id(); f public.feedback; v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if v_actor is null or not app.feedback_staff() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  if p_status is null or p_status not in ('new', 'in_progress', 'needs_info', 'resolved', 'rejected') then raise exception 'Ukjent status' using errcode = '22023'; end if;
  if p_status = 'rejected' and char_length(coalesce(v_reason, '')) < 3 then raise exception 'Avvisning krever en begrunnelse' using errcode = '22023'; end if;
  if char_length(coalesce(v_reason, '')) > 1000 then raise exception 'For lang begrunnelse' using errcode = '22023'; end if;
  select * into f from public.feedback where id = p_id for update;
  if f.id is null then raise exception 'Fant ikke saken' using errcode = '22023'; end if;
  if f.status = p_status and coalesce(f.status_reason, '') = coalesce(v_reason, '') then return; end if;
  v_reason := case when v_reason is not null then app.feedback_scrub_text(v_reason) end;
  update public.feedback set status = p_status, status_reason = case when p_status = 'rejected' or v_reason is not null then v_reason end,
    updated_at = now(), updated_by = v_actor where id = p_id;
  insert into public.feedback_events (feedback_id, kind, old_status, new_status, text, actor) values (p_id, 'status', f.status, p_status, v_reason, v_actor);
  insert into public.audit_logs (actor_user_id, action, target_type, target_id, meta)
  values (v_actor, 'feedback.status', 'feedback', p_id::text, jsonb_build_object('ref', f.ref, 'old', f.status, 'new', p_status));
end $$;

create or replace function public.add_feedback_note(p_id uuid, p_note text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := app.current_user_id(); v_ref text; v_note text := btrim(coalesce(p_note, ''));
begin
  if v_actor is null or not app.feedback_staff() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  if char_length(v_note) < 1 or char_length(v_note) > 2000 then raise exception 'Notatet må ha 1–2000 tegn' using errcode = '22023'; end if;
  select ref into v_ref from public.feedback where id = p_id;
  if v_ref is null then raise exception 'Fant ikke saken' using errcode = '22023'; end if;
  insert into public.feedback_events (feedback_id, kind, text, actor) values (p_id, 'note', app.feedback_scrub_text(v_note), v_actor);
  update public.feedback set updated_at = now(), updated_by = v_actor where id = p_id;
  insert into public.audit_logs (actor_user_id, action, target_type, target_id, meta)
  values (v_actor, 'feedback.note', 'feedback', p_id::text, jsonb_build_object('ref', v_ref));
end $$;

revoke all on function app.feedback_staff() from public, anon;
grant execute on function app.feedback_staff() to authenticated;
revoke all on function public.submit_feedback(text, text, text, jsonb, text, text, text, text, jsonb, jsonb, uuid), public.feedback_list(),
  public.feedback_events_for(uuid), public.set_feedback_status(uuid, text, text), public.add_feedback_note(uuid, text) from public, anon, authenticated;
grant execute on function public.submit_feedback(text, text, text, jsonb, text, text, text, text, jsonb, jsonb, uuid), public.feedback_list(),
  public.feedback_events_for(uuid), public.set_feedback_status(uuid, text, text), public.add_feedback_note(uuid, text) to authenticated;
