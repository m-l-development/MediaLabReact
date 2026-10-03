-- ConnectHub · Fellesmappe uten «Privat (bare meg)»: nye private opplastinger er stengt for alle roller, også via direkte
-- API-kall. Som i 20261002200000_total_storage_limit.sql, men p_private = true avvises alltid (42501). Gjelder både
-- forhåndskontrollen (can_upload) og registreringen (register_file), som begge bruker app.upload_check.
-- Eksisterende private bilder røres ikke: de er fortsatt bare synlige for eieren (app.can_see_file uendret), kan lastes ned
-- og slettes av eieren, og ryddes som før når eieren fjernes fra menigheten. Vanlig PostgreSQL, ingen data endres.

create or replace function app.upload_check(p_actor uuid, p_church uuid, p_folder text, p_private boolean, p_size bigint) returns void
language plpgsql stable security definer set search_path = '' as $$
declare used bigint; quota bigint; member boolean; adm boolean;
begin
  if p_actor is null then raise exception 'Ikke innlogget' using errcode = '42501'; end if;
  if p_folder not in ('bilder', 'logoer', 'bakgrunner', 'mockups', 'faste') then raise exception 'Ugyldig mappe' using errcode = '22023'; end if;
  if p_size is null or p_size <= 0 or p_size > 4194304 then raise exception 'Ugyldig størrelse' using errcode = '22023'; end if;
  select exists (select 1 from public.memberships m join public.churches c on c.id = m.church_id
                 where m.user_id = p_actor and m.church_id = p_church and m.status = 'active' and c.status = 'active') into member;
  select exists (select 1 from public.user_roles r join public.memberships m on m.user_id = r.user_id and m.church_id = r.church_id and m.status = 'active'
                 join public.churches c on c.id = r.church_id and c.status = 'active'
                 where r.user_id = p_actor and r.role = 'church_admin' and r.church_id = p_church and r.revoked_at is null) into adm;
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
