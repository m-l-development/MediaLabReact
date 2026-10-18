-- ConnectHub · Varsler (TB-D9DE93): «Merk alle som lest», «Fjern leste» og «Tøm varslingsloggen» for brukerens egne varsler.
-- Brukerne har bare lese- og read_at-rettighet på tabellen; sletting skjer bare gjennom disse funksjonene, og bare for
-- egne varsler (user_id = innlogget bruker). Ingen andre tabeller røres. Ingen eksisterende rader endres av migreringen.

create or replace function public.mark_my_notifications_read() returns integer
language plpgsql security definer set search_path = '' as $$
declare v uuid := app.current_user_id(); n int;
begin
  if v is null then raise exception 'Ikke innlogget' using errcode = '42501'; end if;
  update public.notifications set read_at = now() where user_id = v and read_at is null;
  get diagnostics n = row_count;
  return n;
end $$;

-- p_only_read = true: bare leste varsler fjernes («Fjern leste»); false: alle egne varsler («Tøm varslingsloggen»).
create or replace function public.clear_my_notifications(p_only_read boolean) returns integer
language plpgsql security definer set search_path = '' as $$
declare v uuid := app.current_user_id(); n int;
begin
  if v is null then raise exception 'Ikke innlogget' using errcode = '42501'; end if;
  if p_only_read is null then raise exception 'Mangler valg' using errcode = '22023'; end if;
  delete from public.notifications where user_id = v and (not p_only_read or read_at is not null);
  get diagnostics n = row_count;
  return n;
end $$;

revoke all on function public.mark_my_notifications_read(), public.clear_my_notifications(boolean) from public, anon;
grant execute on function public.mark_my_notifications_read(), public.clear_my_notifications(boolean) to authenticated;
