-- ConnectHub P4 · SUPABASE-SPESIFIKT (leser auth.users). Isolert her; ved bytte av innloggingsleverandør skrives denne om.
-- Første Developer kan ikke tildeles via assign_role (ingen finnes ennå). Driftspersonell kjører derfor, etter at personen
-- har akseptert invitasjonen og bekreftet e-posten sin i Supabase Auth:
--   select app.bootstrap_developer('person@eksempel.no', 'https://<prosjekt-id>.supabase.co/auth/v1');
-- Ingen klienttilgang. Loggføres i audit_logs.

create or replace function app.bootstrap_developer(p_email text, p_issuer text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare a record; v uuid;
begin
  select id, email, email_confirmed_at into a from auth.users where lower(email) = lower(p_email);
  if a.id is null then raise exception 'Fant ingen innloggingskonto med denne e-posten' using errcode = '22023'; end if;
  if a.email_confirmed_at is null then raise exception 'E-posten er ikke bekreftet ennå' using errcode = '22023'; end if;
  v := app.link_identity(p_issuer, a.id::text, a.email);
  if not exists (select 1 from public.user_roles where user_id = v and role = 'developer' and revoked_at is null) then
    insert into public.user_roles (user_id, role, reason) values (v, 'developer', 'Første developer (bootstrap av driftspersonell)');
  end if;
  return v;
end $$;
revoke all on function app.bootstrap_developer(text, text) from public, anon, authenticated;
