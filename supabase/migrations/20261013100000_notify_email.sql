-- ConnectHub · E-postvarsler: egen adresse for valgfrie e-poster (bare connecthub-dev først).
-- Brukeren kan velge en annen adresse for valgfrie e-poster (varsler). Innloggingsadressen endres ikke, og «Glemt passord»
-- og sikkerhetsmeldinger går alltid til kontoens adresse. Bare brukeren selv leser og endrer valget (funksjoner på egen
-- rad – ingen kolonnerettigheter, heller ikke for stab). Serveren spør mail_optional_address før en valgfri e-post sendes.

alter table public.app_users add column notify_email text
  check (notify_email is null or (char_length(notify_email) <= 254 and notify_email ~ '^[^@\s,;<>"]{1,64}@[a-z0-9.-]{1,253}\.[a-z]{2,}$'));

-- { on, notify_email (null = kontoens adresse), account_email } for innlogget bruker.
create or replace function public.my_email_prefs() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('on', u.email_optional, 'notify_email', u.notify_email, 'account_email', u.email)
  from public.app_users u where u.id = app.current_user_id()
$$;

-- Tom/null = bruk kontoens adresse. Gir adressen som brukes.
create or replace function public.set_my_notify_email(p_email text) returns text
language plpgsql security definer set search_path = '' as $$
declare v uuid := app.current_user_id(); v_email text := nullif(lower(btrim(coalesce(p_email, ''))), ''); v_account text;
begin
  if v is null then raise exception 'Ikke innlogget' using errcode = '42501'; end if;
  if v_email is not null and (char_length(v_email) > 254 or v_email !~ '^[^@\s,;<>"]{1,64}@[a-z0-9.-]{1,253}\.[a-z]{2,}$') then
    raise exception 'Ugyldig e-postadresse' using errcode = '22023'; end if;
  select email into v_account from public.app_users where id = v;
  if v_email = lower(v_account) then v_email := null; end if;   -- samme som kontoens adresse = standard
  update public.app_users set notify_email = v_email where id = v;
  return coalesce(v_email, v_account);
end $$;

-- Bare serveren: adressen en valgfri e-post til denne kontoen skal sendes til (ukjent adresse = uendret).
create or replace function public.mail_optional_address(p_email text) returns text
language sql stable security definer set search_path = '' as $$
  select coalesce((select coalesce(u.notify_email, u.email) from public.app_users u where lower(u.email) = lower(btrim(p_email)) limit 1), lower(btrim(p_email)))
$$;

revoke all on function public.my_email_prefs(), public.set_my_notify_email(text), public.mail_optional_address(text) from public, anon, authenticated;
grant execute on function public.my_email_prefs(), public.set_my_notify_email(text) to authenticated;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then execute 'grant execute on function public.mail_optional_address(text) to service_role'; end if;
end $$;
