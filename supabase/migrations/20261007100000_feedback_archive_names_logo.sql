-- Tilbakemeldinger kan fjernes fra innboksen (arkiveres), fornavn/etternavn på brukere, og logo per menighet
-- (bare connecthub-dev først). Ingen eksisterende data endres.

-- ---------- 1. Fjerne tilbakemeldingssaker = arkivere (ikke slette) ----------
-- Valg: saken arkiveres i stedet for å slettes. Historikk (feedback_events) og revisjonslogg beholdes og kan ikke
-- brytes; arkiverte saker vises ikke i innboksen, men kan vises med filteret «Arkiverte» og gjenopprettes.
alter table public.feedback add column archived_at timestamptz, add column archived_by uuid references public.app_users (id) on delete set null,
  add column archive_reason text check (char_length(archive_reason) <= 500);
alter table public.feedback_events drop constraint feedback_events_kind_check,
  add constraint feedback_events_kind_check check (kind in ('status', 'note', 'archive', 'restore'));

drop function public.feedback_list();
create function public.feedback_list(p_archived boolean default false)
returns table (id uuid, ref text, kind text, title text, description text, answers jsonb, app text, app_name text, page text, view text,
  marked jsonb, context jsonb, church_id uuid, church_name text, role text, status text, status_reason text,
  created_at timestamptz, updated_at timestamptz, submitter_id uuid, submitter_name text, note_count int, archived_at timestamptz, archive_reason text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if app.current_user_id() is null or not app.feedback_staff() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  return query
    select f.id, f.ref, f.kind, f.title, f.description, f.answers, f.app, f.app_name, f.page, f.view, f.marked, f.context,
           f.church_id, c.name, f.role, f.status, f.status_reason, f.created_at, f.updated_at, f.created_by,
           coalesce(nullif(u.full_name, ''), u.email),
           (select count(*)::int from public.feedback_events e where e.feedback_id = f.id and e.kind = 'note'),
           f.archived_at, f.archive_reason
    from public.feedback f left join public.churches c on c.id = f.church_id left join public.app_users u on u.id = f.created_by
    where (f.archived_at is not null) = coalesce(p_archived, false)
    order by f.created_at desc limit 1000;
end $$;

create or replace function public.archive_feedback(p_id uuid, p_reason text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := app.current_user_id(); f public.feedback; v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if v_actor is null or not app.feedback_staff() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  if char_length(coalesce(v_reason, '')) > 500 then raise exception 'For lang begrunnelse' using errcode = '22023'; end if;
  select * into f from public.feedback where id = p_id for update;
  if f.id is null then raise exception 'Fant ikke saken' using errcode = '22023'; end if;
  if f.archived_at is not null then return; end if;
  v_reason := case when v_reason is not null then app.feedback_scrub_text(v_reason) end;
  update public.feedback set archived_at = now(), archived_by = v_actor, archive_reason = v_reason, updated_at = now(), updated_by = v_actor where id = p_id;
  insert into public.feedback_events (feedback_id, kind, text, actor) values (p_id, 'archive', v_reason, v_actor);
  insert into public.audit_logs (actor_user_id, action, target_type, target_id, meta)
  values (v_actor, 'feedback.archive', 'feedback', p_id::text, jsonb_build_object('ref', f.ref, 'status', f.status));
end $$;

create or replace function public.restore_feedback(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := app.current_user_id(); f public.feedback;
begin
  if v_actor is null or not app.feedback_staff() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  select * into f from public.feedback where id = p_id for update;
  if f.id is null then raise exception 'Fant ikke saken' using errcode = '22023'; end if;
  if f.archived_at is null then return; end if;
  update public.feedback set archived_at = null, archived_by = null, archive_reason = null, updated_at = now(), updated_by = v_actor where id = p_id;
  insert into public.feedback_events (feedback_id, kind, actor) values (p_id, 'restore', v_actor);
  insert into public.audit_logs (actor_user_id, action, target_type, target_id, meta)
  values (v_actor, 'feedback.restore', 'feedback', p_id::text, jsonb_build_object('ref', f.ref));
end $$;

revoke all on function public.feedback_list(boolean), public.archive_feedback(uuid, text), public.restore_feedback(uuid) from public, anon, authenticated;
grant execute on function public.feedback_list(boolean), public.archive_feedback(uuid, text), public.restore_feedback(uuid) to authenticated;

-- ---------- 2. Fornavn og etternavn ----------
-- full_name beholdes som visningsnavn (brukes overalt) og avledes av fornavn/etternavn når de er satt (trigger), så
-- navnet bare finnes ett sted å redigere. Eksisterende brukere uten fornavn/etternavn beholder full_name uendret.
alter table public.app_users add column first_name text check (char_length(first_name) <= 60 and first_name !~ '[[:cntrl:]]'),
  add column last_name text check (char_length(last_name) <= 60 and last_name !~ '[[:cntrl:]]');
create or replace function app.app_users_name() returns trigger language plpgsql set search_path = '' as $$
begin
  new.first_name := nullif(btrim(new.first_name), ''); new.last_name := nullif(btrim(new.last_name), '');
  if new.first_name is not null or new.last_name is not null then new.full_name := concat_ws(' ', new.first_name, new.last_name); end if;
  return new;
end $$;
create trigger app_users_name before insert or update of first_name, last_name, full_name on public.app_users
  for each row execute function app.app_users_name();
grant select (first_name, last_name) on public.app_users to authenticated;
grant update (first_name, last_name) on public.app_users to authenticated;   -- bare egen rad (policy app_users_update_self)

-- Admin (i egen menighet) og stab kan sette navnet på andre brukere. Bare navn – aldri rolle eller e-post.
create or replace function public.set_user_name(p_user uuid, p_first text, p_last text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := app.current_user_id(); v_first text := nullif(btrim(coalesce(p_first, '')), ''); v_last text := nullif(btrim(coalesce(p_last, '')), '');
        v_old text; v_church uuid;
begin
  if v_actor is null then raise exception 'Ikke innlogget' using errcode = '42501'; end if;
  select m.church_id into v_church from public.memberships m
    where m.user_id = p_user and m.status in ('active', 'disabled') and app.is_church_admin(m.church_id) limit 1;
  if not (app.is_staff() or p_user = v_actor or v_church is not null) then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  if v_first is null and v_last is null then raise exception 'Skriv fornavn eller etternavn' using errcode = '22023'; end if;
  if char_length(coalesce(v_first, '')) > 60 or char_length(coalesce(v_last, '')) > 60 then raise exception 'Navnet er for langt (maks 60 tegn)' using errcode = '22023'; end if;
  if coalesce(v_first, '') ~ '[[:cntrl:]<>]' or coalesce(v_last, '') ~ '[[:cntrl:]<>]' then raise exception 'Navnet inneholder ugyldige tegn' using errcode = '22023'; end if;
  select full_name into v_old from public.app_users where id = p_user for update;
  if not found then raise exception 'Ukjent bruker' using errcode = '22023'; end if;
  update public.app_users set first_name = v_first, last_name = v_last where id = p_user;
  insert into public.audit_logs (actor_user_id, action, target_type, target_id, church_id, meta)
  values (v_actor, 'users.name', 'app_users', p_user::text, v_church, jsonb_build_object('old', v_old, 'new', concat_ws(' ', v_first, v_last)));
end $$;
revoke all on function public.set_user_name(uuid, text, text) from public, anon;
grant execute on function public.set_user_name(uuid, text, text) to authenticated;

-- ---------- 3. Logo per menighet ----------
-- Logoen er en vanlig fil i menighetens «Logoer» (lastes opp med den eksisterende, kontrollerte opplastingen: bare
-- bilder, magiske bytes, 4 MB). Menigheten peker på filen; ingen fil kopieres, overskrives eller slettes. Slettes filen,
-- blir logoen tom (on delete set null).
alter table public.churches add column logo_file_id uuid references public.files (id) on delete set null;
grant select (logo_file_id) on public.churches to authenticated;

create or replace function public.set_church_logo(p_church uuid, p_file uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := app.current_user_id(); f public.files; v_old uuid;
begin
  if v_actor is null then raise exception 'Ikke innlogget' using errcode = '42501'; end if;
  if not (app.is_church_admin(p_church) or (app.is_staff() and app.is_member(p_church))) then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
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

-- whoami: også fornavn og etternavn (for velkomstområdet). Ellers som i 20261001120000_identity_functions.sql.
create or replace function public.whoami() returns jsonb
language sql stable security definer set search_path = '' as $$
  select case when u.id is null then null else jsonb_build_object(
    'id', u.id, 'email', u.email, 'full_name', u.full_name, 'first_name', u.first_name, 'last_name', u.last_name, 'phone', u.phone,
    'mfa', app.mfa_ok(),
    'roles', coalesce((select jsonb_agg(jsonb_build_object('role', r.role, 'church_id', r.church_id) order by r.role)
                       from public.user_roles r where r.user_id = u.id and r.revoked_at is null), '[]'::jsonb),
    'churches', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'logo_file_id', c.logo_file_id) order by c.name)
                          from public.memberships m join public.churches c on c.id = m.church_id
                          where m.user_id = u.id and m.status = 'active' and c.status = 'active'), '[]'::jsonb)
  ) end
  from (select app.current_user_id() as uid) x left join public.app_users u on u.id = x.uid
$$;
