-- Samarbeid: Moderator (og Developer teknisk) kan endre navn og beskrivelse på et område og slette det.
-- Sletting fjerner bare området, deltakerne og delingene – filene blir liggende i menighetene. Krever at navnet skrives
-- inn som bekreftelse. Alle endringer loggføres. Ingen eksisterende data endres av migreringen.

alter table public.spaces add column if not exists description text
  check (description is null or length(description) <= 500);
grant select (description) on public.spaces to authenticated;

create or replace function public.update_space(p_space uuid, p_name text, p_description text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := app.current_user_id();
begin
  if v_actor is null or not app.is_collab_admin() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  update public.spaces set name = btrim(p_name), description = nullif(btrim(coalesce(p_description, '')), '') where id = p_space;
  if not found then raise exception 'Fant ikke området' using errcode = '22023'; end if;
  insert into public.audit_logs (actor_user_id, action, target_type, target_id, meta)
  values (v_actor, 'spaces.update', 'spaces', p_space::text, jsonb_build_object('name', btrim(p_name)));
end $$;
revoke all on function public.update_space(uuid, text, text) from public, anon;
grant execute on function public.update_space(uuid, text, text) to authenticated;

create or replace function public.delete_space(p_space uuid, p_confirm text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := app.current_user_id(); v_name text; v_members int; v_files int;
begin
  if v_actor is null or not app.is_collab_admin() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  select name into v_name from public.spaces where id = p_space;
  if v_name is null then raise exception 'Fant ikke området' using errcode = '22023'; end if;
  if btrim(coalesce(p_confirm, '')) <> v_name then raise exception 'Navnet stemmer ikke' using errcode = '22023'; end if;
  select count(*) into v_members from public.space_members where space_id = p_space;
  select count(*) into v_files from public.space_files where space_id = p_space;
  delete from public.spaces where id = p_space;   -- deltakere og delinger følger med (on delete cascade); filene røres ikke
  insert into public.audit_logs (actor_user_id, action, target_type, target_id, meta)
  values (v_actor, 'spaces.delete', 'spaces', p_space::text, jsonb_build_object('name', v_name, 'members', v_members, 'shared_files', v_files));
end $$;
revoke all on function public.delete_space(uuid, text) from public, anon;
grant execute on function public.delete_space(uuid, text) to authenticated;

-- Arkivering/åpning loggføres også.
create or replace function public.set_space_status(p_space uuid, p_status text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := app.current_user_id();
begin
  if v_actor is null or not app.is_collab_admin() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  if p_status not in ('active', 'archived') then raise exception 'Ugyldig status' using errcode = '22023'; end if;
  update public.spaces set status = p_status where id = p_space;
  if not found then raise exception 'Fant ikke området' using errcode = '22023'; end if;
  insert into public.audit_logs (actor_user_id, action, target_type, target_id, meta)
  values (v_actor, 'spaces.status', 'spaces', p_space::text, jsonb_build_object('status', p_status));
end $$;
