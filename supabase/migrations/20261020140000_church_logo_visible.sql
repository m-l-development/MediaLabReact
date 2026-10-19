-- ConnectHub · menighetslogoer vises for alle som kan se menigheten (bare connecthub-dev først).
--
-- Feil: logoen ligger som en fil i menighetens «logoer», og filer kan bare hentes av medlemmer og Admin i menigheten
-- (app.can_see_file). Developer og Moderator ser alle menigheter i oversikten (churches_select), men fikk ikke hente
-- logoene til menigheter de ikke er medlem av – derfor viste oversikten forbokstaver.
-- Retting: en fil som er en menighets valgte logo (churches.logo_file_id), kan hentes av den som kan se menigheten
-- (samme regel som churches_select). Andre filer er uendret. Ingen rader endres.
-- Som i 20261001190000_church_links.sql, med logo-regelen i tillegg.
create or replace function app.visible_file_keys(p_ids uuid[]) returns table (id uuid, storage_key text, mime_type text)
language sql stable security definer set search_path = '' as $$
  select f.id, f.storage_key, f.mime_type from public.files f
  where f.id = any (p_ids)
    and (app.can_see_file(f.church_id, f.folder, f.visibility, f.uploaded_by, f.link_id)
         or exists (select 1 from public.churches c where c.logo_file_id = f.id and c.id = f.church_id
                    and (app.is_member(c.id) or app.is_church_admin(c.id) or app.is_staff())))
$$;
revoke all on function app.visible_file_keys(uuid[]) from public, anon, authenticated;
