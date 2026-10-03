-- ConnectHub · TILBAKEFØRING av 20261017100000_file_in_use.sql (kjøres bare ved behov, manuelt).
-- Gjenoppretter delete_file slik den var i 20261015100000_collab_folder_upload.sql (uten sperren for filer i bruk).
-- Ingen data endres; rettighetene på funksjonen beholdes (create or replace).
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
