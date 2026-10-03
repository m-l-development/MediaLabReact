-- ConnectHub · Fellesmappe og Samarbeidsmappe: direkte opplasting til Samarbeidsmappen (gruppens Samarbeidsfiler).
-- Vanlig PostgreSQL. Bare tillegg: ny kolonne med standardverdi (ingen eksisterende rader endres), to nye funksjoner og
-- en utvidet sletteregel. Kopier fra Delt mappe/Faste (register_link_copy) virker som før.
--   - Alle aktive medlemmer i en menighet som er aktivt medlem av en AKTIV gruppe (og kan bruke tjenesten), kan laste opp
--     bilder direkte til gruppens Samarbeidsmappe. Filen tilhører menigheten som bidro (teller i dens kvote og i den samlede
--     grensen), merkes link_upload = true og source_folder = 'bilder' (verktøyene viser den blant bildene).
--   - Sletting: Admin i menigheten som bidro (som før), og i tillegg den som lastet opp en fil direkte – mens filen er
--     synlig (aktiv gruppe, menigheten er aktivt medlem) og opplasteren fortsatt er aktivt medlem av menigheten.
--     Kopier kan fortsatt bare fjernes av Admin i menigheten som bidro.
--   - Fjernes menigheten fra gruppen, avsluttes eller slettes gruppen, gjelder samme regler som for kopier (skjules; slettes
--     med gruppen via køen).

alter table public.files add column link_upload boolean not null default false;
alter table public.files add constraint files_link_upload check (not link_upload or (link_id is not null and source_file_id is null));
grant select (link_upload) on public.files to authenticated;

-- Kontroll for opplasting til en gruppe (felles for forhåndskontrollen og registreringen). Samme feilkoder som ellers:
-- 42501 ingen tilgang (også for grupper som ikke finnes eller er avsluttet – avslører ikke hvilke grupper som finnes),
-- 22023 ugyldig størrelse, 54000 menighetens kvote, 53100 samlet grense (app.total_check).
create or replace function app.link_upload_check(p_actor uuid, p_link uuid, p_church uuid, p_size bigint) returns void
language plpgsql stable security definer set search_path = '' as $$
declare used bigint; quota bigint;
begin
  if p_actor is null then raise exception 'Ikke innlogget' using errcode = '42501'; end if;
  if p_size is null or p_size <= 0 or p_size > 4194304 then raise exception 'Ugyldig størrelse' using errcode = '22023'; end if;
  if not exists (select 1 from public.memberships m join public.churches c on c.id = m.church_id
                 where m.user_id = p_actor and m.church_id = p_church and m.status = 'active' and c.status = 'active') then
    raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  if not exists (select 1 from public.church_links l where l.id = p_link and l.status = 'active') or not app.group_member_ok(p_link, p_church) then
    raise exception 'Ingen tilgang til samarbeidsgruppen' using errcode = '42501'; end if;
  select coalesce(sum(file_size), 0) into used from public.files where church_id = p_church;
  select storage_quota_mb::bigint * 1048576 into quota from public.churches where id = p_church;
  if used + p_size > quota then raise exception 'Menighetens lagringskvote er brukt opp' using errcode = '54000'; end if;
  perform app.total_check(p_size);
end $$;
revoke all on function app.link_upload_check(uuid, uuid, uuid, bigint) from public, anon, authenticated;

-- Forhåndskontroll med brukerens token (serveren kaller den før filen lagres).
create or replace function public.can_upload_link(p_link uuid, p_church uuid, p_size bigint) returns boolean
language plpgsql stable security definer set search_path = '' as $$
begin perform app.link_upload_check(app.current_user_id(), p_link, p_church, p_size); return true; end $$;

-- Registrering (bare serveren): gruppen låses (FOR SHARE) som ved kopi, så en samtidig fjerning/avslutning/sletting venter,
-- og samme felles lås som all annen opplasting (kvote og samlet grense). Kontrollen kjøres på nytt etter låsene.
create or replace function public.register_link_upload(p_issuer text, p_subject text, p_link uuid, p_church uuid,
  p_key text, p_name text, p_mime text, p_size bigint, p_sha256 text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid; v_id uuid; v_before bigint;
begin
  perform set_config('request.jwt.claims', jsonb_build_object('iss', p_issuer, 'sub', p_subject)::text, true);
  v_actor := app.current_user_id();
  perform 1 from public.church_links where id = p_link for share;
  perform pg_advisory_xact_lock(hashtext('files:all'));
  perform app.link_upload_check(v_actor, p_link, p_church, p_size);
  v_before := app.total_used_bytes();
  insert into public.files (church_id, storage_key, file_name, mime_type, file_size, sha256, uploaded_by, folder, visibility, link_id, source_folder, link_upload)
  values (p_church, p_key, p_name, p_mime, p_size, p_sha256, v_actor, 'samarbeid', 'church', p_link, 'bilder', true)
  returning id into v_id;
  perform app.total_threshold_notify(v_before, v_before + p_size);
  return jsonb_build_object('id', v_id, 'file_name', p_name, 'folder', 'samarbeid', 'link_id', p_link, 'file_size', p_size, 'link_upload', true);
end $$;

-- Som i 20261008100000_collab_groups.sql, men den som lastet opp en fil DIREKTE til Samarbeidsmappen kan også slette den
-- (mens den er synlig og opplasteren fortsatt er aktivt medlem av menigheten). Alt annet er uendret.
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
    when f.folder = 'samarbeid' then app.group_access(f.link_id) and app.group_member_ok(f.link_id, f.church_id)
      and (app.is_church_admin(f.church_id) or (f.link_upload and f.uploaded_by = v_actor and app.is_member(f.church_id)))
    else app.is_church_admin(f.church_id) end;    -- Faste
  if not coalesce(ok, false) then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  delete from public.files where id = p_id;
  return f.storage_key;
end $$;

revoke all on function public.can_upload_link(uuid, uuid, bigint), public.register_link_upload(text, text, uuid, uuid, text, text, text, bigint, text)
  from public, anon, authenticated;
grant execute on function public.can_upload_link(uuid, uuid, bigint) to authenticated;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'grant execute on function public.register_link_upload(text, text, uuid, uuid, text, text, text, bigint, text) to service_role';
  end if;
end $$;
