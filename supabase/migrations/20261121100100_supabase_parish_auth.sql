-- Menighetsbruker · SUPABASE-SPESIFIKT (leser auth.users/auth.sessions, bøtta ch-inbox). Isolert her; ved bytte av
-- innloggingsleverandør skrives denne om. Den leverandørnøytrale delen står i 20261121100000_parish_accounts.sql.

-- Gyldig bare når (1) innloggingsnøkkelen og passordhashen er de ConnectHub satte (et passord eller en e-post byttet
-- direkte hos leverandøren, utenom den årlige popupen eller Admin, sperrer kontoen til Admin setter nytt passord), og
-- (2) økten i tokenet fortsatt finnes (Admin kan logge ut kontoen; tilgangen stopper med en gang, ikke først når
-- tokenet utløper). Uten session_id i kravene (serverens egne kall etter at tokenet er verifisert) sjekkes bare (1).
-- Økten i tokenet finnes fortsatt (ikke logget ut av Admin eller ved passordbytte).
create or replace function app.parish_session_ok() returns boolean
language sql stable security definer set search_path = '' as $$
  select nullif(app.jwt_claims() ->> 'session_id', '') is null
    or exists (select 1 from auth.sessions s where s.id::text = app.jwt_claims() ->> 'session_id'
               and s.user_id::text = app.jwt_claims() ->> 'sub' and (s.not_after is null or s.not_after > now()))
$$;

create or replace function app.parish_auth_ok(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select app.parish_session_ok() and exists (
    select 1 from public.parish_accounts p
    join public.user_identities i on i.user_id = p.user_id
    join auth.users a on a.id::text = i.subject
    where p.user_id = p_user and lower(a.email) = p.login_email and a.encrypted_password is not distinct from p.pw_hash)
$$;

create or replace function app.parish_pw_hash(p_user uuid) returns text
language sql stable security definer set search_path = '' as $$
  select a.encrypted_password from public.user_identities i join auth.users a on a.id::text = i.subject where i.user_id = p_user limit 1
$$;

create or replace function app.parish_session_count(p_user uuid) returns int
language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.user_identities i join auth.sessions s on s.user_id::text = i.subject
  where i.user_id = p_user and (s.not_after is null or s.not_after > now())
$$;

-- Sletter øktene (oppfriskingsnøklene følger med), unntatt p_keep. Tokenene som er utstedt, avvises av parish_auth_ok.
create or replace function app.parish_revoke_sessions(p_user uuid, p_keep uuid) returns int
language plpgsql volatile security definer set search_path = '' as $$
declare n int;
begin
  delete from auth.sessions s using public.user_identities i
   where i.user_id = p_user and s.user_id::text = i.subject and s.id is distinct from p_keep;
  get diagnostics n = row_count;
  return n;
end $$;

revoke all on function app.parish_auth_ok(uuid), app.parish_session_ok(), app.parish_pw_hash(uuid), app.parish_session_count(uuid), app.parish_revoke_sessions(uuid, uuid) from public, anon, authenticated;
grant execute on function app.parish_auth_ok(uuid) to authenticated;

-- Privat bøtte for innboksen. Ingen policyer for anon/authenticated: bare serveren leser og skriver, og visning skjer med
-- kortlivede signerte lenker. Høyst 30 MB per fil; typene kontrolleres også av serveren (magiske bytes).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ch-inbox', 'ch-inbox', false, 31457280, array[
  'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf',
  'video/mp4', 'video/quicktime', 'video/webm',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/msword', 'application/vnd.ms-excel',
  'application/vnd.ms-powerpoint', 'application/vnd.oasis.opendocument.text', 'application/vnd.oasis.opendocument.spreadsheet',
  'application/vnd.oasis.opendocument.presentation', 'text/plain', 'text/csv', 'application/zip', 'application/json', 'application/octet-stream'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
