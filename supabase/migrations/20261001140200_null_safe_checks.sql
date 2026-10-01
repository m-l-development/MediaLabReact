-- ConnectHub P7 · Rettelse funnet av RLS-testene: tilgangssjekker av typen «if not (a = b or …)» slapp gjennom når a var NULL
-- (f.eks. fil uten opplaster eller invitasjon uten oppretter), fordi NOT NULL er NULL og ikke utløser avvisningen.
-- Sjekkene er nå NULL-sikre (is not distinct from + coalesce), og bare eksplisitt tillatelse gir tilgang.

create or replace function public.delete_file(p_id uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := app.current_user_id(); f public.files; ok boolean;
begin
  if v_actor is null then raise exception 'Ikke innlogget' using errcode = '42501'; end if;
  select * into f from public.files where id = p_id for update;
  if not found then raise exception 'Fant ikke filen' using errcode = '22023'; end if;
  ok := coalesce(f.uploaded_by is not distinct from v_actor and f.uploaded_by is not null, false)
     or coalesce(f.visibility = 'church' and (app.is_church_admin(f.church_id) or app.is_staff()), false);
  if not ok then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  delete from public.files where id = p_id;
  return f.storage_key;
end $$;

create or replace function public.revoke_invitation(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := app.current_user_id(); i public.invitations; ok boolean;
begin
  if v_actor is null then raise exception 'Ikke innlogget' using errcode = '42501'; end if;
  select * into i from public.invitations where id = p_id and status = 'pending' for update;
  if not found then raise exception 'Fant ikke ventende invitasjon' using errcode = '22023'; end if;
  ok := coalesce(app.is_staff(), false)
     or coalesce(i.created_by is not null and i.created_by = v_actor, false)
     or coalesce(i.role = 'user' and i.church_id is not null and app.is_church_admin(i.church_id), false);
  if not ok then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  update public.invitations set status = 'revoked' where id = p_id;
end $$;
