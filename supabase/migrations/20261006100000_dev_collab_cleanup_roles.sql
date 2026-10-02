-- Developer i Samarbeid, opprydning av private filer fra fjernede medlemmer, og sikker fjerning av globale roller
-- (bare connecthub-dev først). Ingen eksisterende data endres av denne migreringen.

-- ---------- 1. Samarbeid: Developer og Moderator (eksplisitt, begge med MFA via has_global_role) ----------
-- Gjelder alle koblingsfunksjoner (create/end/reopen_link, my_links, link_files_meta, church_directory) og den gamle
-- områdemodellen. Filinnhold er uendret: can_see_file/file_keys krever fortsatt medlemskap (A1/A2) – link_files_meta
-- gir bare metadata.
create or replace function app.is_collab_admin() returns boolean language sql stable set search_path = '' as $$ select app.is_moderator() or app.is_developer() $$;

-- ---------- 2. Rolleendring: en global rolle kan ikke fjernes fra en bruker med flere aktive medlemskap ----------
-- Developer/Moderator er unntatt fra «én menighet om gangen». Fjernes den siste globale rollen (User/Admin igjen), må
-- brukeren først ha høyst ett aktivt medlemskap. Triggeren tar samme lås per bruker som medlemskapstriggeren
-- (single_church_guard), så samtidig rolleendring og ny aktivering av medlemskap køes og ser hverandre.
-- Ingen medlemskap fjernes eller flyttes automatisk. SQLSTATE CH004.
create or replace function app.global_role_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_user uuid := old.user_id; v_active int;
begin
  if old.role not in ('developer', 'moderator') or old.church_id is not null or old.revoked_at is not null then
    return case when tg_op = 'DELETE' then old else new end; end if;
  if tg_op = 'UPDATE' and new.revoked_at is null then return new; end if;
  perform pg_advisory_xact_lock(hashtextextended('ch:membership:' || v_user::text, 0));
  if not exists (select 1 from public.user_roles r where r.user_id = v_user and r.id <> old.id and r.role in ('developer', 'moderator')
                 and r.church_id is null and r.revoked_at is null) then
    select count(*) into v_active from public.memberships where user_id = v_user and status = 'active';
    if v_active > 1 then
      raise exception 'Brukeren har % aktive medlemskap. Som User eller Admin kan brukeren bare ha ett. Fjern medlemskap først.', v_active
        using errcode = 'CH004'; end if;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;
revoke all on function app.global_role_guard() from public, anon, authenticated;
create trigger user_roles_global_guard before update of revoked_at or delete on public.user_roles
  for each row execute function app.global_role_guard();

-- Aktive medlemskap per bruker (for grensesnittet: hvorfor en rolle ikke kan fjernes). Stab ser alle; ellers egne.
create or replace function public.active_memberships_of(p_user uuid) returns table (church_id uuid, church_name text, is_admin boolean)
language sql stable security definer set search_path = '' as $$
  select m.church_id, c.name, exists (select 1 from public.user_roles r where r.user_id = m.user_id and r.church_id = m.church_id and r.role = 'church_admin' and r.revoked_at is null)
  from public.memberships m join public.churches c on c.id = m.church_id
  where m.user_id = p_user and m.status = 'active' and (app.is_staff() or p_user = app.current_user_id())
  order by c.name
$$;

-- ---------- 3. Opprydning av private filer fra fjernede medlemmer ----------
-- Kø for lagrede filer som skal fjernes etter at radene er slettet. Gjør slettingen etterprøvbar: feiler fjerningen i
-- lagringen, står oppføringen som «failed» og kan prøves igjen. Ingen klienttilgang (bare via funksjonene).
create table public.file_cleanup_queue (
  id uuid primary key default gen_random_uuid(),
  file_id uuid not null,
  church_id uuid not null references public.churches (id) on delete cascade,
  storage_key text not null,
  file_name text not null,
  file_size bigint not null,
  former_owner uuid references public.app_users (id) on delete set null,
  requested_by uuid references public.app_users (id) on delete set null,
  requested_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending', 'done', 'failed')),
  attempts int not null default 0,
  last_error text,
  finished_at timestamptz
);
alter table public.file_cleanup_queue enable row level security;
revoke all on public.file_cleanup_queue from anon, authenticated;

-- Kandidat: privat fil der opplasteren har medlemskap med status «fjernet» i filens menighet.
-- Klar for sletting bare når ingenting annet peker på filen. Ellers vises årsaken, og slettingen blokkeres.
create or replace function app.cleanup_block_reason(p_file uuid) returns text
language sql stable security definer set search_path = '' as $$
  select case
    when f.id is null then 'Filen finnes ikke lenger'
    when f.visibility <> 'private' then 'Filen er ikke privat'
    when f.uploaded_by is null then 'Eieren er ukjent'
    when not exists (select 1 from public.memberships m where m.user_id = f.uploaded_by and m.church_id = f.church_id and m.status = 'removed')
      then 'Eieren er ikke fjernet fra menigheten'
    when (select status from public.churches where id = f.church_id) <> 'active' then 'Menigheten er ikke aktiv'
    when exists (select 1 from public.files c where c.source_file_id = f.id) then 'Filen er kilde for en kopi i Samarbeidsfiler'
    when exists (select 1 from public.space_files s where s.file_id = f.id) then 'Filen er delt i et samarbeidsområde'
    when exists (select 1 from public.file_cleanup_queue q where q.file_id = f.id and q.status <> 'done') then 'Filen er allerede under sletting'
  end
  from (select 1) x left join public.files f on f.id = p_file
$$;
revoke all on function app.cleanup_block_reason(uuid) from public, anon, authenticated;


-- Oversikt per menighet for stab: antall og størrelse (ingen filnavn). Filnavn vises bare der stab selv er medlem.
create or replace function public.cleanup_overview() returns table (church_id uuid, church_name text, candidates int, candidate_bytes bigint,
  ready int, ready_bytes bigint, can_view boolean, queue_pending int, queue_failed int)
language plpgsql stable security definer set search_path = '' as $$
begin
  if app.current_user_id() is null or not app.is_staff() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  return query
  with cand as (
    select f.church_id, f.file_size, app.cleanup_block_reason(f.id) is null as ok
    from public.files f
    where f.visibility = 'private' and exists (select 1 from public.memberships m where m.user_id = f.uploaded_by and m.church_id = f.church_id and m.status = 'removed'))
  select c.id, c.name,
    (select count(*)::int from cand x where x.church_id = c.id), (select coalesce(sum(x.file_size), 0)::bigint from cand x where x.church_id = c.id),
    (select count(*)::int from cand x where x.church_id = c.id and x.ok), (select coalesce(sum(x.file_size), 0)::bigint from cand x where x.church_id = c.id and x.ok),
    app.is_member(c.id),
    (select count(*)::int from public.file_cleanup_queue q where q.church_id = c.id and q.status = 'pending'),
    (select count(*)::int from public.file_cleanup_queue q where q.church_id = c.id and q.status = 'failed')
  from public.churches c
  where exists (select 1 from cand x where x.church_id = c.id) or exists (select 1 from public.file_cleanup_queue q where q.church_id = c.id and q.status <> 'done')
  order by c.name;
end $$;

-- Filene i én menighet (bare metadata – aldri lagringsnøkkel eller lenke). Krever at stab er aktivt medlem (menighetssperren).
create or replace function public.cleanup_candidates(p_church uuid) returns table (id uuid, file_name text, mime_type text, file_size bigint,
  uploaded_at timestamptz, former_member text, removed_at timestamptz, ready boolean, reason text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if app.current_user_id() is null or not app.is_staff() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  if not app.is_member(p_church) then raise exception 'Du må være medlem av menigheten for å se filene' using errcode = '42501'; end if;
  return query
  select f.id, f.file_name, f.mime_type, f.file_size, f.created_at, coalesce(nullif(u.full_name, ''), u.email), m.updated_at,
         app.cleanup_block_reason(f.id) is null, app.cleanup_block_reason(f.id)
  from public.files f join public.memberships m on m.user_id = f.uploaded_by and m.church_id = f.church_id and m.status = 'removed'
  left join public.app_users u on u.id = f.uploaded_by
  where f.church_id = p_church and f.visibility = 'private'
  order by f.created_at;
end $$;

-- Sletting (kalles av serveren med brukerens token). Alt eller ingenting: hver fil kontrolleres på nytt med lås, og
-- antall og samlet størrelse må stemme med det brukeren bekreftet (ellers er utvalget endret: CH006). En fil som ikke er
-- klar, stopper hele slettingen (CH005). Radene slettes og lagringsnøklene legges i køen i samme transaksjon; serveren
-- fjerner så filene fra lagringen og melder resultatet (cleanup_queue_done). Loggført som files.cleanup.
create or replace function public.cleanup_private_files(p_church uuid, p_ids uuid[], p_expected_count int, p_expected_bytes bigint)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := app.current_user_id(); v_ids uuid[] := array(select distinct x from unnest(p_ids) x where x is not null);
        f record; v_reason text; v_bytes bigint := 0; v_q uuid[] := '{}'; v_files jsonb := '[]'; v_qid uuid;
begin
  if v_actor is null or not app.is_staff() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  if not app.is_member(p_church) then raise exception 'Du må være medlem av menigheten for å rydde filene' using errcode = '42501'; end if;
  if coalesce(array_length(v_ids, 1), 0) = 0 or array_length(v_ids, 1) > 200 then raise exception 'Velg mellom 1 og 200 filer' using errcode = '22023'; end if;
  perform 1 from public.files where id = any (v_ids) for update;
  for f in select * from public.files where id = any (v_ids) loop
    if f.church_id <> p_church then raise exception 'Filen tilhører en annen menighet' using errcode = '42501'; end if;
  end loop;
  if (select count(*) from public.files where id = any (v_ids)) <> array_length(v_ids, 1) then
    raise exception 'En eller flere filer finnes ikke lenger' using errcode = 'CH006'; end if;
  for f in select * from public.files where id = any (v_ids) loop
    v_reason := app.cleanup_block_reason(f.id);
    if v_reason is not null then raise exception '%: %', f.file_name, v_reason using errcode = 'CH005'; end if;
    v_bytes := v_bytes + f.file_size;
  end loop;
  if p_expected_count is distinct from array_length(v_ids, 1) or p_expected_bytes is distinct from v_bytes then
    raise exception 'Utvalget er endret siden du bekreftet. Last siden på nytt.' using errcode = 'CH006'; end if;
  for f in select * from public.files where id = any (v_ids) order by created_at loop
    insert into public.file_cleanup_queue (file_id, church_id, storage_key, file_name, file_size, former_owner, requested_by)
    values (f.id, f.church_id, f.storage_key, f.file_name, f.file_size, f.uploaded_by, v_actor) returning id into v_qid;
    v_q := v_q || v_qid;
    v_files := v_files || jsonb_build_object('id', f.id, 'name', f.file_name, 'size', f.file_size, 'former_owner', f.uploaded_by);
  end loop;
  delete from public.files where id = any (v_ids);
  insert into public.audit_logs (actor_user_id, action, target_type, target_id, church_id, meta)
  values (v_actor, 'files.cleanup', 'files', p_church::text, p_church,
          jsonb_build_object('count', array_length(v_ids, 1), 'bytes', v_bytes, 'files', v_files, 'result', 'rows_deleted_storage_pending'));
  return jsonb_build_object('ok', true, 'count', array_length(v_ids, 1), 'bytes', v_bytes, 'queue', to_jsonb(v_q));
end $$;

-- Stab ber om nytt forsøk for ventende/feilede oppføringer (returnerer bare kø-ID-er, aldri nøkler).
create or replace function public.cleanup_retry_ids(p_church uuid default null) returns uuid[]
language plpgsql stable security definer set search_path = '' as $$
begin
  if app.current_user_id() is null or not app.is_staff() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  return array(select q.id from public.file_cleanup_queue q where q.status in ('pending', 'failed')
               and (p_church is null or q.church_id = p_church) and app.is_member(q.church_id) order by q.requested_at limit 200);
end $$;

-- Bare serveren: henter lagringsnøklene for kø-oppføringer og melder resultatet.
create or replace function public.cleanup_queue_claim(p_ids uuid[]) returns table (id uuid, storage_key text)
language sql security definer set search_path = '' as $$
  update public.file_cleanup_queue q set attempts = q.attempts + 1 where q.id = any (p_ids) and q.status in ('pending', 'failed')
  returning q.id, q.storage_key
$$;
create or replace function public.cleanup_queue_done(p_id uuid, p_ok boolean, p_error text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare q public.file_cleanup_queue;
begin
  update public.file_cleanup_queue set status = case when p_ok then 'done' else 'failed' end, last_error = case when p_ok then null else left(p_error, 300) end,
    finished_at = case when p_ok then now() end where id = p_id returning * into q;
  if q.id is null then return; end if;
  insert into public.audit_logs (actor_user_id, action, target_type, target_id, church_id, meta)
  values (q.requested_by, 'files.cleanup_storage', 'files', q.file_id::text, q.church_id,
          jsonb_build_object('file', q.file_name, 'size', q.file_size, 'result', case when p_ok then 'storage_deleted' else 'storage_failed' end, 'attempts', q.attempts));
end $$;

revoke all on function public.active_memberships_of(uuid), public.cleanup_overview(), public.cleanup_candidates(uuid),
  public.cleanup_private_files(uuid, uuid[], int, bigint), public.cleanup_retry_ids(uuid), public.cleanup_queue_claim(uuid[]),
  public.cleanup_queue_done(uuid, boolean, text) from public, anon, authenticated;
grant execute on function public.active_memberships_of(uuid), public.cleanup_overview(), public.cleanup_candidates(uuid),
  public.cleanup_private_files(uuid, uuid[], int, bigint), public.cleanup_retry_ids(uuid) to authenticated;
do $$ begin if exists (select 1 from pg_roles where rolname = 'service_role') then
  execute 'grant execute on function public.cleanup_queue_claim(uuid[]), public.cleanup_queue_done(uuid, boolean, text) to service_role';
end if; end $$;
