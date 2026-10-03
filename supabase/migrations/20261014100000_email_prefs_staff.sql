-- ConnectHub · E-postvarsler (valgfrie e-poster på/av og egen varselsadresse) bare for Developer og Moderator (bare dev først).
-- Som 20261011100000_email_optional.sql og 20261013100000_notify_email.sql, men alle tre funksjonene krever nå
-- app.is_staff() (Developer eller Moderator med MFA). Admin og User får verken lese eller endre innstillingen. Bare egen rad.
-- Innloggingsadressen og nødvendige e-poster (Glemt passord, sikkerhet) påvirkes ikke. Ingen eksisterende rader endres.

create or replace function public.set_my_email_optional(p_on boolean) returns boolean
language plpgsql security definer set search_path = '' as $$
declare v uuid := app.current_user_id();
begin
  if v is null or not app.is_staff() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  if p_on is null then raise exception 'Ugyldig valg' using errcode = '22023'; end if;
  update public.app_users set email_optional = p_on where id = v;   -- loggføres av revisjonstriggeren (app_users.update)
  return p_on;
end $$;

create or replace function public.my_email_prefs() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if app.current_user_id() is null or not app.is_staff() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  return (select jsonb_build_object('on', u.email_optional, 'notify_email', u.notify_email, 'account_email', u.email)
          from public.app_users u where u.id = app.current_user_id());
end $$;

create or replace function public.set_my_notify_email(p_email text) returns text
language plpgsql security definer set search_path = '' as $$
declare v uuid := app.current_user_id(); v_email text := nullif(lower(btrim(coalesce(p_email, ''))), ''); v_account text;
begin
  if v is null or not app.is_staff() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  if v_email is not null and (char_length(v_email) > 254 or v_email !~ '^[^@\s,;<>"]{1,64}@[a-z0-9.-]{1,253}\.[a-z]{2,}$') then
    raise exception 'Ugyldig e-postadresse' using errcode = '22023'; end if;
  select email into v_account from public.app_users where id = v;
  if v_email = lower(v_account) then v_email := null; end if;   -- samme som kontoens adresse = standard
  update public.app_users set notify_email = v_email where id = v;
  return coalesce(v_email, v_account);
end $$;
