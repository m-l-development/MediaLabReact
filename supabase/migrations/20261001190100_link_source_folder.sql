-- ConnectHub · Trinn 18 (tillegg): en kopi i Samarbeidsfiler husker hvilken mappe originalen lå i (source_folder), så
-- verktøyene kan vise den i riktig, adskilt område (f.eks. en delt logo blant «Samarbeidsfiler» i logopanelet – A4).
-- Vanlig PostgreSQL. Nytt, valgfritt felt; ingen eksisterende rader endres.
alter table public.files add column source_folder text check (source_folder in ('bilder', 'logoer', 'bakgrunner', 'mockups', 'faste'));
alter table public.files add constraint files_link_source_folder check (link_id is null or source_folder is not null);
grant select (source_folder) on public.files to authenticated;

create or replace function public.register_link_copy(p_issuer text, p_subject text, p_file uuid, p_link uuid, p_key text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid; f public.files; v_church uuid; v_id uuid;
begin
  perform set_config('request.jwt.claims', jsonb_build_object('iss', p_issuer, 'sub', p_subject)::text, true);
  v_actor := app.current_user_id();
  select church_id into v_church from public.files where id = p_file;
  if v_church is not null then perform pg_advisory_xact_lock(hashtext('files:' || v_church::text)); end if;   -- samme lås som opplasting (kvote)
  f := app.transfer_check(v_actor, p_file, p_link);
  insert into public.files (church_id, storage_key, file_name, mime_type, file_size, sha256, uploaded_by, folder, visibility, link_id, source_file_id, source_folder)
  values (f.church_id, p_key, f.file_name, f.mime_type, f.file_size, f.sha256, v_actor, 'samarbeid', 'church', p_link, p_file, f.folder)
  returning id into v_id;
  return jsonb_build_object('id', v_id, 'file_name', f.file_name, 'folder', 'samarbeid', 'source_folder', f.folder, 'link_id', p_link, 'file_size', f.file_size);
end $$;
