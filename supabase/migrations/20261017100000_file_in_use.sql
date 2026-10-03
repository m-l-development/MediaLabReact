-- ConnectHub · Filer i bruk kan ikke slettes. Vanlig PostgreSQL. Ingen data endres.
-- Som i 20261015100000_collab_folder_upload.sql, men en felles fil (Fellesmappe, Faste, Logoer, Bakgrunner, Mockups) som
-- brukes i menighetens felles grunnoppsett (church_settings, referanse «ch:<id>») eller som menighetens logo
-- (churches.logo_file_id), kan ikke slettes: CH012 (file_in_use). Den må først fjernes der den brukes, så slettingen ikke
-- ødelegger innhold andre i menigheten bruker. Tilgangskontrollen kjøres først (ingen avsløring for uvedkommende).
-- Private filer og Samarbeidsfiler kan ikke refereres fra grunnoppsettet (church_settings_save) og påvirkes ikke.
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
  if f.visibility = 'church' and f.folder <> 'samarbeid' and (
       exists (select 1 from public.church_settings s where s.church_id = f.church_id and position(('ch:' || f.id::text) in lower(s.data::text)) > 0)
    or exists (select 1 from public.churches c where c.logo_file_id = f.id)) then
    raise exception 'Filen er i bruk i menighetens grunnoppsett eller som logo' using errcode = 'CH012';
  end if;
  delete from public.files where id = p_id;
  return f.storage_key;
end $$;
