-- Fjernet fra menigheten = ingen tilgang til menighetens filer, heller ikke egne opplastinger (bare connecthub-dev først).
-- Før: eieren så og kunne slette sine private filer (og slette egne bilder i Delt mappe) uavhengig av medlemskap.
-- Nå: gjelder ikke når medlemskapet i den menigheten er FJERNET (status 'removed'). Midlertidig deaktiverte medlemmer
-- (status 'disabled') beholder dagens regel, som før. Filene slettes ikke; de ligger i menighetens lagring som før.

create or replace function app.removed_from(p_church uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.memberships m where m.user_id = app.current_user_id() and m.church_id = p_church and m.status = 'removed')
$$;
revoke all on function app.removed_from(uuid) from public, anon;
grant execute on function app.removed_from(uuid) to authenticated;

-- Som i 20261001190000_church_links.sql, men private filer krever at eieren ikke er fjernet fra menigheten.
create or replace function app.can_see_file(p_church uuid, p_folder text, p_visibility text, p_owner uuid, p_link uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select case
    when p_visibility = 'private' then p_owner = app.current_user_id() and not app.removed_from(p_church)
    when p_folder = 'samarbeid' then app.link_access(p_link) and app.church_service_ok(p_church)
    else app.is_member(p_church) or app.is_church_admin(p_church) end
$$;

-- Som i 20261001190000_church_links.sql, men eier-regelen gjelder ikke etter at eieren er fjernet fra menigheten.
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
    else app.is_church_admin(f.church_id) end;    -- Faste og Samarbeidsfiler
  if not coalesce(ok, false) then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  delete from public.files where id = p_id;
  return f.storage_key;
end $$;
