-- ConnectHub · Brukerens valg: valgfrie e-poster på/av (bare connecthub-dev først). Standard er På (eksisterende oppførsel).
-- Nødvendige e-poster (invitasjon, «Glemt passord», sikkerhetsmeldinger) sendes alltid. Bare brukeren selv kan endre valget
-- (set_my_email_optional på egen rad – ingen kolonnerettighet for direkte skriving, heller ikke for stab). Serveren spør
-- mail_optional_allowed før en valgfri e-post sendes, og registrerer «skipped» i utsendingsloggen når valget er Av.

alter table public.app_users add column email_optional boolean not null default true;
grant select (email_optional) on public.app_users to authenticated;

create or replace function public.set_my_email_optional(p_on boolean) returns boolean
language plpgsql security definer set search_path = '' as $$
declare v uuid := app.current_user_id();
begin
  if v is null then raise exception 'Ikke innlogget' using errcode = '42501'; end if;
  if p_on is null then raise exception 'Ugyldig valg' using errcode = '22023'; end if;
  update public.app_users set email_optional = p_on where id = v;   -- loggføres av revisjonstriggeren (app_users.update)
  return p_on;
end $$;
revoke all on function public.set_my_email_optional(boolean) from public, anon;
grant execute on function public.set_my_email_optional(boolean) to authenticated;

-- Bare serveren: får adressen valgfrie e-poster? Ukjent adresse = ja (ingen konto å ha et valg på).
create or replace function public.mail_optional_allowed(p_email text) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select u.email_optional from public.app_users u where lower(u.email) = lower(btrim(p_email)) limit 1), true)
$$;
revoke all on function public.mail_optional_allowed(text) from public, anon, authenticated;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then execute 'grant execute on function public.mail_optional_allowed(text) to service_role'; end if;
end $$;

alter table public.email_outbox drop constraint email_outbox_status_check;
alter table public.email_outbox add constraint email_outbox_status_check check (status in ('sent', 'failed', 'skipped'));
