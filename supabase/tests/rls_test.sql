-- ConnectHub · RLS- og tilgangstester. Kjører i én transaksjon som rulles tilbake – ingen data blir igjen.
-- Simulerer innlogging med request.jwt.claims (iss/sub/aal) og rollene anon/authenticated. Vanlig PostgreSQL:
-- kan kjøres mot enhver database med migreringene (se docs/migration-runbook.md).
-- Kjør: supabase db query --linked --project-ref <utviklingsprosjekt> -f supabase/tests/rls_test.sql
begin;

create schema ch_test;
create table ch_test.res (n serial primary key, name text, ok boolean, info text);
grant usage on schema ch_test to anon, authenticated;
grant insert, select on ch_test.res to anon, authenticated;
grant usage on sequence ch_test.res_n_seq to anon, authenticated;
do $$ begin if exists (select 1 from pg_roles where rolname = 'service_role') then
  execute 'grant usage on schema ch_test to service_role';
  execute 'grant insert, select on ch_test.res to service_role';
  execute 'grant usage on sequence ch_test.res_n_seq to service_role';
end if; end $$;

create function ch_test.cnt(p_name text, p_sql text, p_exp int) returns void language plpgsql as $$
declare v int;
begin
  execute format('select count(*) from (%s) q', p_sql) into v;
  insert into ch_test.res (name, ok, info) values (p_name, v = p_exp, format('fikk %s, forventet %s', v, p_exp));
exception when others then
  insert into ch_test.res (name, ok, info) values (p_name, p_exp = 0 and sqlstate = '42501', 'avvist ' || sqlstate || ': ' || left(sqlerrm, 90));
end $$;
create function ch_test.atleast(p_name text, p_sql text, p_min int) returns void language plpgsql as $$
declare v int;
begin
  execute format('select count(*) from (%s) q', p_sql) into v;
  insert into ch_test.res (name, ok, info) values (p_name, v >= p_min, format('fikk %s, minst %s', v, p_min));
exception when others then
  insert into ch_test.res (name, ok, info) values (p_name, false, 'feil ' || sqlstate || ': ' || left(sqlerrm, 90));
end $$;
create function ch_test.rows(p_name text, p_sql text, p_exp int) returns void language plpgsql as $$
declare v int;
begin
  execute p_sql; get diagnostics v = row_count;
  insert into ch_test.res (name, ok, info) values (p_name, v = p_exp, format('%s rader, forventet %s', v, p_exp));
exception when others then
  insert into ch_test.res (name, ok, info) values (p_name, false, 'feil ' || sqlstate || ': ' || left(sqlerrm, 90));
end $$;
create function ch_test.err(p_name text, p_sql text, p_state text) returns void language plpgsql as $$
begin
  execute p_sql;
  insert into ch_test.res (name, ok, info) values (p_name, false, 'ble IKKE avvist');
exception when others then
  insert into ch_test.res (name, ok, info) values (p_name, p_state is null or sqlstate = p_state, 'avvist ' || sqlstate || ': ' || left(sqlerrm, 90));
end $$;
create function ch_test.ok(p_name text, p_sql text) returns void language plpgsql as $$
begin
  execute p_sql;
  insert into ch_test.res (name, ok, info) values (p_name, true, 'ok');
exception when others then
  insert into ch_test.res (name, ok, info) values (p_name, false, 'feil ' || sqlstate || ': ' || left(sqlerrm, 90));
end $$;

-- ---------- Testdata (bare i denne transaksjonen) ----------
insert into public.churches (id, name) values
  ('aaaaaaaa-0000-4000-8000-00000000000a', 'Testmenighet A'),
  ('bbbbbbbb-0000-4000-8000-00000000000b', 'Testmenighet B');
insert into public.app_users (id, email, full_name, status) values
  ('00000000-0000-4000-8000-000000000001', 'dev@test.invalid', 'Dev', 'active'),
  ('00000000-0000-4000-8000-000000000002', 'mod@test.invalid', 'Mod', 'active'),
  ('00000000-0000-4000-8000-000000000003', 'admina@test.invalid', 'Admin A', 'active'),
  ('00000000-0000-4000-8000-000000000004', 'usera@test.invalid', 'Bruker A', 'active'),
  ('00000000-0000-4000-8000-000000000005', 'userb@test.invalid', 'Bruker B', 'active'),
  ('00000000-0000-4000-8000-000000000006', 'utenfor@test.invalid', 'Utenfor', 'active'),
  ('00000000-0000-4000-8000-000000000007', 'deaktivert@test.invalid', 'Deaktivert A', 'disabled'),
  ('00000000-0000-4000-8000-000000000008', 'medlem2@test.invalid', 'Medlem 2 A', 'active');
insert into public.user_identities (provider, subject, user_id)
select 'https://test.invalid/auth/v1', 'sub-' || right(id::text, 1), id from public.app_users where email like '%@test.invalid';
insert into public.memberships (user_id, church_id) values
  ('00000000-0000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-00000000000a'),
  ('00000000-0000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-00000000000a'),
  ('00000000-0000-4000-8000-000000000007', 'aaaaaaaa-0000-4000-8000-00000000000a'),
  ('00000000-0000-4000-8000-000000000008', 'aaaaaaaa-0000-4000-8000-00000000000a'),
  ('00000000-0000-4000-8000-000000000005', 'bbbbbbbb-0000-4000-8000-00000000000b');
insert into public.user_roles (user_id, role, church_id) values
  ('00000000-0000-4000-8000-000000000001', 'developer', null),
  ('00000000-0000-4000-8000-000000000002', 'moderator', null),
  ('00000000-0000-4000-8000-000000000003', 'church_admin', 'aaaaaaaa-0000-4000-8000-00000000000a');
insert into public.files (church_id, storage_key, file_name, mime_type, file_size) values
  ('aaaaaaaa-0000-4000-8000-00000000000a', 'test/a.png', 'a.png', 'image/png', 10);
insert into public.invitations (email, church_id, role, token_hash, expires_at, created_by) values
  ('ny@test.invalid', 'aaaaaaaa-0000-4000-8000-00000000000a', 'user', repeat('a', 64), now() + interval '1 day', '00000000-0000-4000-8000-000000000003');

-- ---------- Struktur (som eier) ----------
select ch_test.cnt('Struktur: RLS er på for alle tabeller i public', $q$select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind in ('r','p') and not c.relrowsecurity$q$, 0);
select ch_test.cnt('Struktur: anon har ingen tabellrettigheter i public', $q$select 1 from information_schema.role_table_grants where grantee = 'anon' and table_schema = 'public'$q$, 0);
select ch_test.cnt('Struktur: anon har ingen kolonnerettigheter i public', $q$select 1 from information_schema.column_privileges where grantee = 'anon' and table_schema = 'public'$q$, 0);
select ch_test.cnt('Struktur: ingen direkte skriving i roller, invitasjoner, logg, filer, identiteter', $q$select 1 from information_schema.column_privileges where grantee = 'authenticated' and table_schema = 'public' and table_name in ('user_roles','invitations','audit_logs','files','user_identities') and privilege_type in ('INSERT','UPDATE','DELETE') union all select 1 from information_schema.role_table_grants where grantee = 'authenticated' and table_schema = 'public' and table_name in ('user_roles','invitations','audit_logs','files','user_identities') and privilege_type in ('INSERT','UPDATE','DELETE','TRUNCATE')$q$, 0);
select ch_test.cnt('Struktur: anon kan ikke kalle funksjoner i public', $q$select 1 from information_schema.routine_privileges where grantee in ('anon','PUBLIC') and routine_schema = 'public'$q$, 0);
create table public.zz_rls_probe (x int);
select ch_test.cnt('Sikkerhetsnett: ny tabell får RLS automatisk', $q$select 1 from pg_class where oid = 'public.zz_rls_probe'::regclass and relrowsecurity$q$, 1);
select ch_test.err('Video avvises: video/mp4', $q$insert into public.files (church_id, storage_key, file_name, mime_type, file_size) values ('aaaaaaaa-0000-4000-8000-00000000000a', 'v1', 'film.mp4', 'video/mp4', 10)$q$, '23514');
select ch_test.err('Video avvises: .mp4 forkledd som PNG', $q$insert into public.files (church_id, storage_key, file_name, mime_type, file_size) values ('aaaaaaaa-0000-4000-8000-00000000000a', 'v2', 'film.mp4', 'image/png', 10)$q$, '23514');
select ch_test.err('Video avvises: .MOV med store bokstaver', $q$insert into public.files (church_id, storage_key, file_name, mime_type, file_size) values ('aaaaaaaa-0000-4000-8000-00000000000a', 'v3', 'KLIPP.MOV', 'image/jpeg', 10)$q$, '23514');
select ch_test.err('Video avvises: .webm', $q$insert into public.files (church_id, storage_key, file_name, mime_type, file_size) values ('aaaaaaaa-0000-4000-8000-00000000000a', 'v4', 'x.webm', 'image/webp', 10)$q$, '23514');
select ch_test.ok('Bilde godtas: .jpg', $q$insert into public.files (church_id, storage_key, file_name, mime_type, file_size) values ('aaaaaaaa-0000-4000-8000-00000000000a', 'ok1', 'bilde.jpg', 'image/jpeg', 10)$q$);
select ch_test.err('Logg kan ikke endres', $q$update public.audit_logs set action = 'x'$q$, '42501');
select ch_test.err('Logg kan ikke slettes', $q$delete from public.audit_logs$q$, '42501');
select ch_test.err('Logg kan ikke tømmes', $q$truncate public.audit_logs$q$, '42501');

-- ---------- Ikke innlogget (anon) ----------
set local role anon;
select ch_test.cnt('Anonym: ser ingen menigheter', 'select 1 from public.churches', 0);
select ch_test.cnt('Anonym: ser ingen brukere', 'select 1 from public.app_users', 0);
select ch_test.cnt('Anonym: ser ingen filer', 'select 1 from public.files', 0);
select ch_test.err('Anonym: kan ikke tildele roller', $q$select public.assign_role('00000000-0000-4000-8000-000000000006', 'developer')$q$, '42501');
set local role postgres;

-- ---------- Bruker A ----------
set local role authenticated;
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-4","aal":"aal1"}';
select ch_test.cnt('Bruker A: ser bare egen menighet', 'select 1 from public.churches', 1);
select ch_test.cnt('Bruker A: ser bare seg selv', 'select 1 from public.app_users', 1);
select ch_test.cnt('Bruker A: ser eget medlemskap', 'select 1 from public.memberships', 1);
select ch_test.cnt('Bruker A: ser ikke loggen', 'select 1 from public.audit_logs', 0);
select ch_test.cnt('Bruker A: ser filer i egen menighet', 'select 1 from public.files', 2);
select ch_test.rows('Bruker A: kan endre eget navn', $q$update public.app_users set full_name = 'Nytt navn' where id = '00000000-0000-4000-8000-000000000004'$q$, 1);
select ch_test.rows('Bruker A: kan ikke endre andres navn', $q$update public.app_users set full_name = 'x' where id = '00000000-0000-4000-8000-000000000005'$q$, 0);
select ch_test.err('Bruker A: kan ikke endre egen status', $q$update public.app_users set status = 'active' where id = '00000000-0000-4000-8000-000000000004'$q$, '42501');
select ch_test.err('Bruker A: kan ikke flytte medlemskap til annen menighet', $q$update public.memberships set church_id = 'bbbbbbbb-0000-4000-8000-00000000000b'$q$, '42501');
select ch_test.err('Bruker A: kan ikke gi seg selv admin', $q$select public.assign_role('00000000-0000-4000-8000-000000000004', 'church_admin', 'aaaaaaaa-0000-4000-8000-00000000000a')$q$, '42501');
select ch_test.err('Bruker A: kan ikke skrive i user_roles', $q$insert into public.user_roles (user_id, role) values ('00000000-0000-4000-8000-000000000004', 'developer')$q$, '42501');
select ch_test.err('Bruker A: kan ikke opprette menighet', $q$insert into public.churches (name) values ('Ny')$q$, '42501');
select ch_test.err('Bruker A: kan ikke lese invitasjonstoken', 'select token_hash from public.invitations', '42501');
select ch_test.err('Bruker A: kan ikke registrere filer direkte', $q$insert into public.files (church_id, storage_key, file_name, mime_type, file_size) values ('aaaaaaaa-0000-4000-8000-00000000000a', 'v9', 'a.png', 'image/png', 10)$q$, '42501');
set local role postgres;

-- ---------- Bruker B, utenforstående, deaktivert ----------
set local role authenticated;
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-5","aal":"aal1"}';
select ch_test.cnt('Bruker B: ser ikke menighet A', $q$select 1 from public.churches where id = 'aaaaaaaa-0000-4000-8000-00000000000a'$q$, 0);
select ch_test.cnt('Bruker B: ser ikke filer i A', 'select 1 from public.files', 0);
select ch_test.cnt('Bruker B: ser ikke bruker A', $q$select 1 from public.app_users where id = '00000000-0000-4000-8000-000000000004'$q$, 0);
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-6","aal":"aal1"}';
select ch_test.cnt('Utenforstående: ser ingen menigheter', 'select 1 from public.churches', 0);
select ch_test.cnt('Utenforstående: ser bare seg selv', 'select 1 from public.app_users', 1);
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-7","aal":"aal1"}';
select ch_test.cnt('Deaktivert bruker: ser ingen menigheter', 'select 1 from public.churches', 0);
select ch_test.cnt('Deaktivert bruker: ser ingen brukere, heller ikke seg selv', 'select 1 from public.app_users', 0);
set local request.jwt.claims to '{"iss":"https://annen-utsteder.invalid","sub":"sub-4","aal":"aal1"}';
select ch_test.cnt('Token fra ukjent utsteder: ingen tilgang', 'select 1 from public.churches', 0);
set local role postgres;

-- ---------- Admin i menighet A ----------
set local role authenticated;
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-3","aal":"aal1"}';
select ch_test.cnt('Admin A: ser bare menighet A', 'select 1 from public.churches', 1);
select ch_test.cnt('Admin A: ser medlemmene i A, ikke B', 'select 1 from public.app_users', 4);
select ch_test.atleast('Admin A: ser loggen for A', $q$select 1 from public.audit_logs where church_id = 'aaaaaaaa-0000-4000-8000-00000000000a'$q$, 1);
select ch_test.cnt('Admin A: ser ikke loggen for B', $q$select 1 from public.audit_logs where church_id = 'bbbbbbbb-0000-4000-8000-00000000000b'$q$, 0);
select ch_test.err('Admin A: kan ikke gjøre andre til admin', $q$select public.assign_role('00000000-0000-4000-8000-000000000004', 'church_admin', 'aaaaaaaa-0000-4000-8000-00000000000a')$q$, '42501');
select ch_test.err('Admin A: kan ikke opprette moderator', $q$select public.assign_role('00000000-0000-4000-8000-000000000004', 'moderator')$q$, '42501');
select ch_test.rows('Admin A: kan ikke endre menighetsnavnet', $q$update public.churches set name = 'Endret'$q$, 0);
select ch_test.rows('Admin A: kan ikke endre eget medlemskap', $q$update public.memberships set status = 'disabled' where user_id = '00000000-0000-4000-8000-000000000003'$q$, 0);
select ch_test.rows('Admin A: kan ikke endre medlemskap i B', $q$update public.memberships set status = 'disabled' where church_id = 'bbbbbbbb-0000-4000-8000-00000000000b'$q$, 0);
select ch_test.rows('Admin A: kan deaktivere medlem i A', $q$update public.memberships set status = 'disabled' where user_id = '00000000-0000-4000-8000-000000000004'$q$, 1);
set local role postgres;

-- ---------- Moderator ----------
set local role authenticated;
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-2","aal":"aal1"}';
select ch_test.cnt('Moderator uten MFA: ser ingen menigheter', 'select 1 from public.churches', 0);
select ch_test.err('Moderator uten MFA: kan ikke tildele admin', $q$select public.assign_role('00000000-0000-4000-8000-000000000005', 'church_admin', 'bbbbbbbb-0000-4000-8000-00000000000b')$q$, '42501');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-2","aal":"aal2"}';
select ch_test.cnt('Moderator: ser alle menigheter', $q$select 1 from public.churches where name like 'Testmenighet %'$q$, 2);
select ch_test.ok('Moderator: kan gjøre Bruker B til admin i B', $q$select public.assign_role('00000000-0000-4000-8000-000000000005', 'church_admin', 'bbbbbbbb-0000-4000-8000-00000000000b', 'test')$q$);
select ch_test.err('Moderator: kan ikke opprette developer', $q$select public.assign_role('00000000-0000-4000-8000-000000000006', 'developer')$q$, '42501');
select ch_test.err('Moderator: kan ikke opprette moderator', $q$select public.assign_role('00000000-0000-4000-8000-000000000006', 'moderator')$q$, '42501');
select ch_test.err('Moderator: kan ikke gi seg selv rolle', $q$select public.assign_role('00000000-0000-4000-8000-000000000002', 'church_admin', 'aaaaaaaa-0000-4000-8000-00000000000a')$q$, '42501');
select ch_test.err('Moderator: kan ikke gjøre ikke-medlem til admin', $q$select public.assign_role('00000000-0000-4000-8000-000000000006', 'church_admin', 'aaaaaaaa-0000-4000-8000-00000000000a')$q$, '22023');
select ch_test.err('Moderator: bare én aktiv admin per menighet', $q$select public.assign_role('00000000-0000-4000-8000-000000000008', 'church_admin', 'aaaaaaaa-0000-4000-8000-00000000000a')$q$, '23505');
select ch_test.err('Moderator: kan ikke tilbakekalle developer', $q$select public.revoke_role((select id from public.user_roles where role = 'developer' and revoked_at is null limit 1))$q$, '42501');
set local role postgres;

-- ---------- Developer ----------
set local role authenticated;
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-1","aal":"aal1"}';
select ch_test.err('Developer uten MFA: kan ikke opprette moderator', $q$select public.assign_role('00000000-0000-4000-8000-000000000006', 'moderator')$q$, '42501');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-1","aal":"aal2"}';
select ch_test.ok('Developer: kan opprette moderator', $q$select public.assign_role('00000000-0000-4000-8000-000000000006', 'moderator', null, 'test')$q$);
select ch_test.ok('Developer: kan tilbakekalle moderator', $q$select public.revoke_role((select id from public.user_roles where user_id = '00000000-0000-4000-8000-000000000006' and role = 'moderator' and revoked_at is null))$q$);
select ch_test.err('Developer: kan ikke gi seg selv rolle', $q$select public.assign_role('00000000-0000-4000-8000-000000000001', 'moderator')$q$, '42501');
select ch_test.ok('Developer: kan opprette menighet', $q$insert into public.churches (name) values ('Ny testmenighet')$q$);
select ch_test.err('Developer: kan heller ikke slette loggen', $q$delete from public.audit_logs$q$, '42501');
set local role postgres;

-- ---------- Identitet (P4) ----------
set local role anon;
select ch_test.err('Anonym: kan ikke kalle whoami', 'select public.whoami()', '42501');
set local role authenticated;
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-5","aal":"aal1"}';
select ch_test.cnt('whoami: Bruker B ser seg selv', $q$select 1 where (public.whoami() ->> 'id') = '00000000-0000-4000-8000-000000000005'$q$, 1);
select ch_test.cnt('whoami: viser egen menighet og admin-rollen fra testen over', $q$select 1 where jsonb_array_length(public.whoami() -> 'churches') = 1 and jsonb_array_length(public.whoami() -> 'roles') = 1$q$, 1);
select ch_test.err('Bruker: kan ikke koble identiteter selv', $q$select app.link_identity('https://test.invalid/auth/v1', 'ny', 'x@test.invalid')$q$, '42501');
select case when to_regprocedure('app.bootstrap_developer(text,text)') is null
  then ch_test.ok('Bruker: bootstrap_developer finnes ikke her (Supabase-spesifikk)', 'select 1')
  else ch_test.err('Bruker: kan ikke bootstrappe developer', $q$select app.bootstrap_developer('x@test.invalid', 'https://test.invalid/auth/v1')$q$, '42501') end;
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-7","aal":"aal1"}';
select ch_test.cnt('whoami: deaktivert bruker får null', 'select 1 where public.whoami() is null', 1);
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"ukjent","aal":"aal1"}';
select ch_test.cnt('whoami: ukoblet konto får null', 'select 1 where public.whoami() is null', 1);
set local role postgres;
select ch_test.ok('Drift: link_identity gjenbruker eksisterende bruker med samme e-post', $q$select 1 where app.link_identity('https://annen.invalid/auth/v1', 'ny-sub', 'USERA@test.invalid') = '00000000-0000-4000-8000-000000000004'$q$);
select ch_test.cnt('Drift: link_identity ga ny identitet til samme bruker', $q$select 1 from public.user_identities where user_id = '00000000-0000-4000-8000-000000000004'$q$, 2);

-- ---------- Administrasjon og invitasjoner (P5) ----------
set local role anon;
select ch_test.err('Anonym: kan ikke opprette invitasjon', $q$select public.create_invitation('x@test.invalid', 'aaaaaaaa-0000-4000-8000-00000000000a', 'user', repeat('b', 64))$q$, '42501');
set local role authenticated;
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-4","aal":"aal1"}';
select ch_test.err('Bruker A: kan ikke invitere', $q$select public.create_invitation('x@test.invalid', 'aaaaaaaa-0000-4000-8000-00000000000a', 'user', repeat('b', 64))$q$, '42501');
select ch_test.err('Bruker A: kan ikke kalle accept_invitation', $q$select public.accept_invitation(repeat('a', 64), 'https://test.invalid/auth/v1', 'sub-x', 'ny@test.invalid')$q$, '42501');
select ch_test.err('Bruker A: kan ikke se systemstatus', 'select public.system_status()', '42501');
select ch_test.err('Bruker A: kan ikke deaktivere andre', $q$select public.set_user_status('00000000-0000-4000-8000-000000000005', 'disabled')$q$, '42501');
select ch_test.err('Bruker A: kan ikke trekke tilbake andres invitasjon (ser den ikke)', $q$select public.revoke_invitation((select id from public.invitations where email = 'ny@test.invalid'))$q$, '22023');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-3","aal":"aal1"}';
select ch_test.ok('Admin A: kan invitere bruker til A (uten MFA)', $q$select public.create_invitation('Ny2@Test.invalid', 'aaaaaaaa-0000-4000-8000-00000000000a', 'user', repeat('c', 64))$q$);
select ch_test.ok('Admin A: ny invitasjon til samme adresse erstatter den gamle', $q$select public.create_invitation('ny2@test.invalid', 'aaaaaaaa-0000-4000-8000-00000000000a', 'user', repeat('d', 64))$q$);
select ch_test.cnt('Admin A: bare én ventende invitasjon per adresse', $q$select 1 from public.invitations where email = 'ny2@test.invalid' and status = 'pending'$q$, 1);
select ch_test.err('Admin A: kan ikke invitere til B', $q$select public.create_invitation('x@test.invalid', 'bbbbbbbb-0000-4000-8000-00000000000b', 'user', repeat('e', 64))$q$, '42501');
select ch_test.err('Admin A: kan ikke invitere admin', $q$select public.create_invitation('x@test.invalid', 'aaaaaaaa-0000-4000-8000-00000000000a', 'church_admin', repeat('e', 64))$q$, '42501');
select ch_test.err('Admin A: kan ikke invitere developer', $q$select public.create_invitation('x@test.invalid', null, 'developer', repeat('e', 64))$q$, '42501');
select ch_test.err('Admin A: kan ikke invitere eksisterende medlem', $q$select public.create_invitation('medlem2@test.invalid', 'aaaaaaaa-0000-4000-8000-00000000000a', 'user', repeat('e', 64))$q$, '23505');
select ch_test.err('Admin A: ugyldig gyldighet avvises', $q$select public.create_invitation('x@test.invalid', 'aaaaaaaa-0000-4000-8000-00000000000a', 'user', repeat('e', 64), 30)$q$, '22023');
select ch_test.ok('Admin A: kan trekke tilbake egen invitasjon', $q$select public.revoke_invitation((select id from public.invitations where email = 'ny@test.invalid'))$q$);
select ch_test.cnt('Admin A: ser ikke token-hash i invitasjoner (kolonnen)', $q$select 1 from information_schema.column_privileges where grantee = 'authenticated' and table_name = 'invitations' and column_name = 'token_hash'$q$, 0);
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-2","aal":"aal1"}';
select ch_test.err('Moderator uten MFA: kan ikke invitere', $q$select public.create_invitation('x@test.invalid', 'bbbbbbbb-0000-4000-8000-00000000000b', 'user', repeat('e', 64))$q$, '42501');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-2","aal":"aal2"}';
select ch_test.ok('Moderator: kan invitere admin til A', $q$select public.create_invitation('nyadmin@test.invalid', 'aaaaaaaa-0000-4000-8000-00000000000a', 'church_admin', repeat('f', 64))$q$);
select ch_test.err('Moderator: kan ikke invitere moderator', $q$select public.create_invitation('x@test.invalid', null, 'moderator', repeat('e', 64))$q$, '42501');
select ch_test.ok('Moderator: kan se systemstatus', 'select public.system_status()');
select ch_test.ok('Moderator: kan deaktivere utenforstående', $q$select public.set_user_status('00000000-0000-4000-8000-000000000006', 'disabled')$q$);
select ch_test.ok('Moderator: kan aktivere igjen', $q$select public.set_user_status('00000000-0000-4000-8000-000000000006', 'active')$q$);
select ch_test.err('Moderator: kan ikke deaktivere Developer', $q$select public.set_user_status('00000000-0000-4000-8000-000000000001', 'disabled')$q$, '42501');
select ch_test.err('Moderator: kan ikke deaktivere seg selv', $q$select public.set_user_status('00000000-0000-4000-8000-000000000002', 'disabled')$q$, '42501');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-1","aal":"aal2"}';
select ch_test.ok('Developer: kan invitere moderator', $q$select public.create_invitation('nymod@test.invalid', null, 'moderator', repeat('1', 64))$q$);
set local role postgres;
-- Godkjenning (serveren). Kjøres som service_role der rollen finnes.
do $$ begin if exists (select 1 from pg_roles where rolname = 'service_role') then execute 'set local role service_role'; end if; end $$;
select ch_test.cnt('Server: feil e-post avvises', $q$select 1 where public.accept_invitation(repeat('d', 64), 'https://test.invalid/auth/v1', 'sub-ny2', 'annen@test.invalid') ->> 'error' = 'wrong_email'$q$, 1);
select ch_test.cnt('Server: erstattet lenke virker ikke', $q$select 1 where public.accept_invitation(repeat('c', 64), 'https://test.invalid/auth/v1', 'sub-ny2', 'ny2@test.invalid') ->> 'error' = 'invitation_invalid'$q$, 1);
select ch_test.cnt('Server: tilbaketrukket invitasjon virker ikke', $q$select 1 where public.accept_invitation(repeat('a', 64), 'https://test.invalid/auth/v1', 'sub-ny', 'ny@test.invalid') ->> 'error' = 'invitation_invalid'$q$, 1);
select ch_test.cnt('Server: gyldig invitasjon godtas', $q$select 1 where (public.accept_invitation(repeat('d', 64), 'https://test.invalid/auth/v1', 'sub-ny2', 'NY2@test.invalid') ->> 'ok')::boolean$q$, 1);
select ch_test.cnt('Server: samme lenke kan ikke brukes to ganger', $q$select 1 where public.accept_invitation(repeat('d', 64), 'https://test.invalid/auth/v1', 'sub-ny2', 'ny2@test.invalid') ->> 'error' = 'invitation_invalid'$q$, 1);
select ch_test.cnt('Server: moderator-invitasjon gir global rolle', $q$select 1 where (public.accept_invitation(repeat('1', 64), 'https://test.invalid/auth/v1', 'sub-nymod', 'nymod@test.invalid') ->> 'ok')::boolean$q$, 1);
set local role postgres;
select ch_test.cnt('Godkjent: ny bruker er medlem av A', $q$select 1 from public.memberships m join public.app_users u on u.id = m.user_id where u.email = 'ny2@test.invalid' and m.church_id = 'aaaaaaaa-0000-4000-8000-00000000000a' and m.status = 'active'$q$, 1);
select ch_test.cnt('Godkjent: identiteten er koblet', $q$select 1 from public.user_identities where subject = 'sub-ny2'$q$, 1);
select ch_test.cnt('Godkjent: moderatorrollen er gitt', $q$select 1 from public.user_roles r join public.app_users u on u.id = r.user_id where u.email = 'nymod@test.invalid' and r.role = 'moderator' and r.revoked_at is null$q$, 1);
select ch_test.atleast('Godkjent: loggført med ny bruker som utfører', $q$select 1 from public.audit_logs l join public.app_users u on u.id = l.actor_user_id where u.email = 'ny2@test.invalid' and l.action = 'invitations.update'$q$, 1);
-- Admin-invitasjon når menigheten allerede har admin → avvises uten å gi rolle.
do $$ begin if exists (select 1 from pg_roles where rolname = 'service_role') then execute 'set local role service_role'; end if; end $$;
select ch_test.cnt('Server: ny admin avvises når menigheten har admin', $q$select 1 where public.accept_invitation(repeat('f', 64), 'https://test.invalid/auth/v1', 'sub-nyadmin', 'nyadmin@test.invalid') ->> 'error' = 'admin_exists'$q$, 1);
set local role postgres;
-- Utløpt invitasjon og inviterende som har mistet rollen.
insert into public.invitations (email, church_id, role, token_hash, expires_at, created_by) values
  ('utlopt@test.invalid', 'aaaaaaaa-0000-4000-8000-00000000000a', 'user', repeat('2', 64), now() - interval '1 minute', '00000000-0000-4000-8000-000000000003'),
  ('mistet@test.invalid', 'aaaaaaaa-0000-4000-8000-00000000000a', 'user', repeat('3', 64), now() + interval '1 day', '00000000-0000-4000-8000-000000000004');
select ch_test.cnt('Server: utløpt invitasjon avvises', $q$select 1 where public.accept_invitation(repeat('2', 64), 'https://test.invalid/auth/v1', 'sub-u', 'utlopt@test.invalid') ->> 'error' = 'invitation_expired'$q$, 1);
select ch_test.cnt('Server: utløpt invitasjon er merket utløpt', $q$select 1 from public.invitations where email = 'utlopt@test.invalid' and status = 'expired'$q$, 1);
select ch_test.cnt('Server: invitasjon fra en som ikke (lenger) har rett avvises', $q$select 1 where public.accept_invitation(repeat('3', 64), 'https://test.invalid/auth/v1', 'sub-m', 'mistet@test.invalid') ->> 'error' = 'inviter_lost_access'$q$, 1);

-- ---------- Filer (P7) ----------
set local role postgres;
insert into public.files (church_id, storage_key, file_name, mime_type, file_size, uploaded_by, folder, visibility) values
  ('aaaaaaaa-0000-4000-8000-00000000000a', 'test/privat-a.png', 'privat.png', 'image/png', 100, '00000000-0000-4000-8000-000000000008', 'bilder', 'private');
set local role authenticated;
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-8","aal":"aal1"}';
select ch_test.ok('Fil: medlem kan laste opp til «bilder»', $q$select public.can_upload('aaaaaaaa-0000-4000-8000-00000000000a', 'bilder', false, 1000)$q$);
select ch_test.ok('Fil: medlem kan laste opp privat', $q$select public.can_upload('aaaaaaaa-0000-4000-8000-00000000000a', 'logoer', true, 1000)$q$);
select ch_test.err('Fil: medlem kan ikke legge i «logoer» (felles)', $q$select public.can_upload('aaaaaaaa-0000-4000-8000-00000000000a', 'logoer', false, 1000)$q$, '42501');
select ch_test.err('Fil: over 4 MB avvises', $q$select public.can_upload('aaaaaaaa-0000-4000-8000-00000000000a', 'bilder', false, 5000000)$q$, '22023');
select ch_test.err('Fil: ukjent mappe avvises', $q$select public.can_upload('aaaaaaaa-0000-4000-8000-00000000000a', 'video', false, 1000)$q$, '22023');
select ch_test.cnt('Fil: eier ser egen private fil', $q$select 1 from public.files where file_name = 'privat.png'$q$, 1);
select ch_test.cnt('Fil: file_keys gir nøkkel for egen private fil', $q$select 1 from public.file_keys(array(select id from public.files where file_name = 'privat.png'))$q$, 1);
select ch_test.err('Fil: medlem kan ikke slette fellesfil andre har lastet opp', $q$select public.delete_file((select id from public.files where file_name = 'a.png'))$q$, '42501');
select ch_test.err('Fil: kan ikke registrere fil selv (bare serveren)', $q$select public.register_file('https://test.invalid/auth/v1', 'sub-8', 'aaaaaaaa-0000-4000-8000-00000000000a', 'bilder', false, 'k1', 'x.png', 'image/png', 10, null)$q$, '42501');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-4","aal":"aal1"}';
select ch_test.cnt('Fil: annen bruker (medlemskap deaktivert) ser ikke privat fil', $q$select 1 from public.files where file_name = 'privat.png'$q$, 0);
select ch_test.cnt('Fil: annen bruker får ikke nøkkel til privat fil', $q$select 1 from public.file_keys(array(select id from public.files where file_name = 'privat.png'))$q$, 0);
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-5","aal":"aal1"}';
select ch_test.err('Fil: medlem i B kan ikke laste opp til A', $q$select public.can_upload('aaaaaaaa-0000-4000-8000-00000000000a', 'bilder', false, 1000)$q$, '42501');
select ch_test.cnt('Fil: medlem i B får ikke nøkler til filer i A', $q$select 1 from public.file_keys(array(select id from public.files))$q$, 0);
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-3","aal":"aal1"}';
select ch_test.ok('Fil: admin kan legge i «logoer»', $q$select public.can_upload('aaaaaaaa-0000-4000-8000-00000000000a', 'logoer', false, 1000)$q$);
select ch_test.cnt('Fil: admin ser ikke medlemmers private filer', $q$select 1 from public.files where file_name = 'privat.png'$q$, 0);
select ch_test.ok('Fil: admin kan slette fellesfil i egen menighet', $q$select public.delete_file((select id from public.files where file_name = 'a.png'))$q$);
set local role postgres;
update public.churches set storage_quota_mb = 0 where id = 'aaaaaaaa-0000-4000-8000-00000000000a';
set local role authenticated;
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-8","aal":"aal1"}';
select ch_test.err('Fil: kvote brukt opp avvises', $q$select public.can_upload('aaaaaaaa-0000-4000-8000-00000000000a', 'bilder', false, 1000)$q$, '54000');
set local role postgres;
update public.churches set storage_quota_mb = 200 where id = 'aaaaaaaa-0000-4000-8000-00000000000a';
do $$ begin if exists (select 1 from pg_roles where rolname = 'service_role') then execute 'set local role service_role'; end if; end $$;
select ch_test.ok('Fil: server registrerer fil for medlem', $q$select public.register_file('https://test.invalid/auth/v1', 'sub-8', 'aaaaaaaa-0000-4000-8000-00000000000a', 'bilder', false, 'test/ny.png', 'ny.png', 'image/png', 10, null)$q$);
select ch_test.err('Fil: server kan ikke registrere for medlem i annen menighet', $q$select public.register_file('https://test.invalid/auth/v1', 'sub-5', 'aaaaaaaa-0000-4000-8000-00000000000a', 'bilder', false, 'test/x.png', 'x.png', 'image/png', 10, null)$q$, '42501');
select ch_test.err('Fil: server kan ikke registrere video (navn)', $q$select public.register_file('https://test.invalid/auth/v1', 'sub-8', 'aaaaaaaa-0000-4000-8000-00000000000a', 'bilder', false, 'test/v.png', 'film.mov', 'image/png', 10, null)$q$, '23514');
select ch_test.err('Fil: server kan ikke registrere video (type)', $q$select public.register_file('https://test.invalid/auth/v1', 'sub-8', 'aaaaaaaa-0000-4000-8000-00000000000a', 'bilder', false, 'test/v2', 'film', 'video/mp4', 10, null)$q$, '23514');
set local role postgres;
insert into public.invitations (id, email, church_id, role, token_hash, expires_at, created_by) values
  ('99999999-0000-4000-8000-000000000099', 'foreldrelos@test.invalid', 'aaaaaaaa-0000-4000-8000-00000000000a', 'church_admin', repeat('9', 64), now() + interval '1 day', null);
set local role authenticated;
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-8","aal":"aal1"}';
select ch_test.err('NULL-sikkerhet: medlem kan ikke trekke tilbake invitasjon uten oppretter', $q$select public.revoke_invitation('99999999-0000-4000-8000-000000000099')$q$, '42501');
set local role postgres;
select ch_test.cnt('Fil: registrert fil har riktig opplaster', $q$select 1 from public.files where storage_key = 'test/ny.png' and uploaded_by = '00000000-0000-4000-8000-000000000008'$q$, 1);

-- ---------- Varsler (P10) ----------
set local role authenticated;
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-3","aal":"aal1"}';
select ch_test.atleast('Varsel: den som inviterte får varsel når invitasjonen godtas', $q$select 1 from public.notifications where kind = 'invitation_accepted'$q$, 1);
select ch_test.ok('Varsel: admin kan sende melding til menigheten', $q$select public.send_church_message('aaaaaaaa-0000-4000-8000-00000000000a', 'Hei', 'Test')$q$);
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-8","aal":"aal1"}';
select ch_test.cnt('Varsel: medlem fikk meldingen', $q$select 1 from public.notifications where kind = 'message'$q$, 1);
select ch_test.cnt('Varsel: medlem ser ikke andres varsler', $q$select 1 from public.notifications where kind = 'invitation_accepted'$q$, 0);
select ch_test.rows('Varsel: kan merke eget varsel som lest', $q$update public.notifications set read_at = now() where kind = 'message'$q$, 1);
select ch_test.err('Varsel: kan ikke endre tittel', $q$update public.notifications set title = 'x'$q$, '42501');
select ch_test.err('Varsel: kan ikke lage varsler selv', $q$insert into public.notifications (user_id, kind, title) values ('00000000-0000-4000-8000-000000000008', 'message', 'x')$q$, '42501');
select ch_test.err('Varsel: medlem kan ikke sende melding til menigheten', $q$select public.send_church_message('aaaaaaaa-0000-4000-8000-00000000000a', 'Hei', 'x')$q$, '42501');

-- ---------- Samarbeidsområder (P10) ----------
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-3","aal":"aal1"}';
select ch_test.ok('Område: admin A oppretter område', $q$select public.create_space('Testområde', 'aaaaaaaa-0000-4000-8000-00000000000a')$q$);
select ch_test.ok('Område: admin A deler fellesfil i området', $q$select public.share_file_to_space((select id from public.files where file_name = 'bilde.jpg'), (select id from public.spaces where name = 'Testområde'))$q$);
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-8","aal":"aal1"}';
select ch_test.cnt('Område: medlem i A ser området', $q$select 1 from public.spaces where name = 'Testområde'$q$, 1);
select ch_test.err('Område: medlem kan ikke dele filer', $q$select public.share_file_to_space((select id from public.files where file_name = 'bilde.jpg'), (select id from public.spaces where name = 'Testområde'))$q$, '42501');
select ch_test.err('Område: medlem kan ikke dele sin private fil', $q$select public.share_file_to_space((select id from public.files where file_name = 'privat.png'), (select id from public.spaces where name = 'Testområde'))$q$, '22023');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-5","aal":"aal1"}';
select ch_test.cnt('Område: admin i B ser ikke området før invitasjon', $q$select 1 from public.spaces where name = 'Testområde'$q$, 0);
select ch_test.cnt('Område: B ser ikke delt fil før invitasjon', $q$select 1 from public.files where file_name = 'bilde.jpg'$q$, 0);
set local role postgres;
set local role authenticated;
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-3","aal":"aal1"}';
select ch_test.ok('Område: admin A inviterer B', $q$select public.invite_to_space((select id from public.spaces where name = 'Testområde'), 'bbbbbbbb-0000-4000-8000-00000000000b')$q$);
select ch_test.err('Område: eier kan ikke forlate eget område', $q$select public.set_space_membership((select id from public.spaces where name = 'Testområde'), 'aaaaaaaa-0000-4000-8000-00000000000a', 'left')$q$, '22023');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-5","aal":"aal1"}';
select ch_test.cnt('Område: invitert admin ser området', $q$select 1 from public.spaces where name = 'Testområde'$q$, 1);
select ch_test.cnt('Område: invitert (ikke godtatt) ser ikke delte filer', $q$select 1 from public.files where file_name = 'bilde.jpg'$q$, 0);
select ch_test.atleast('Område: admin i B fikk varsel om invitasjonen', $q$select 1 from public.notifications where kind = 'space_invite'$q$, 1);
select ch_test.ok('Område: admin i B godtar', $q$select public.set_space_membership((select id from public.spaces where name = 'Testområde'), 'bbbbbbbb-0000-4000-8000-00000000000b', 'active')$q$);
select ch_test.cnt('Område: B ser delt fil fra A', $q$select 1 from public.files where file_name = 'bilde.jpg'$q$, 1);
select ch_test.cnt('Område: B får signert nøkkel til delt fil', $q$select 1 from public.file_keys(array(select id from public.files where file_name = 'bilde.jpg'))$q$, 1);
select ch_test.cnt('Område: B ser fortsatt ikke andre filer i A', $q$select 1 from public.files where church_id = 'aaaaaaaa-0000-4000-8000-00000000000a' and file_name <> 'bilde.jpg'$q$, 0);
select ch_test.ok('Område: B forlater', $q$select public.set_space_membership((select id from public.spaces where name = 'Testområde'), 'bbbbbbbb-0000-4000-8000-00000000000b', 'left')$q$);
select ch_test.cnt('Område: etter å ha forlatt ser B ikke filen', $q$select 1 from public.files where file_name = 'bilde.jpg'$q$, 0);
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-6","aal":"aal1"}';
select ch_test.cnt('Område: utenforstående ser ikke området', $q$select 1 from public.spaces$q$, 0);

-- ---------- Abonnement (P10) ----------
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-8","aal":"aal1"}';
select ch_test.err('Abonnement: medlem kan ikke be om abonnement', $q$select public.request_subscription('aaaaaaaa-0000-4000-8000-00000000000a', 'standard', true, 'x')$q$, '42501');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-3","aal":"aal1"}';
select ch_test.ok('Abonnement: admin ber om gratis standard', $q$select public.request_subscription('aaaaaaaa-0000-4000-8000-00000000000a', 'standard', true, 'Liten menighet')$q$);
select ch_test.err('Abonnement: bare én ventende forespørsel', $q$select public.request_subscription('aaaaaaaa-0000-4000-8000-00000000000a', 'utvidet', false, 'x')$q$, '23505');
select ch_test.err('Abonnement: admin kan ikke godkjenne selv', $q$select public.decide_subscription_request((select id from public.subscription_requests where status = 'pending' limit 1), true, 'x')$q$, '42501');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-2","aal":"aal1"}';
select ch_test.err('Abonnement: moderator uten MFA kan ikke godkjenne', $q$select public.decide_subscription_request((select id from public.subscription_requests where status = 'pending' and church_id = 'aaaaaaaa-0000-4000-8000-00000000000a'), true, 'x')$q$, '42501');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-2","aal":"aal2"}';
select ch_test.ok('Abonnement: moderator godkjenner', $q$select public.decide_subscription_request((select id from public.subscription_requests where status = 'pending' and church_id = 'aaaaaaaa-0000-4000-8000-00000000000a'), true, 'Godkjent i test')$q$);
select ch_test.cnt('Abonnement: kvoten følger planen', $q$select 1 from public.churches where id = 'aaaaaaaa-0000-4000-8000-00000000000a' and storage_quota_mb = 1024$q$, 1);
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-3","aal":"aal1"}';
select ch_test.cnt('Abonnement: admin ser abonnementet', $q$select 1 from public.church_subscriptions where plan = 'standard' and free_of_charge$q$, 1);
select ch_test.atleast('Abonnement: admin fikk varsel om avgjørelsen', $q$select 1 from public.notifications where kind = 'subscription'$q$, 1);
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-8","aal":"aal1"}';
select ch_test.cnt('Abonnement: medlem ser ikke abonnement eller forespørsler', $q$select 1 from public.church_subscriptions union all select 1 from public.subscription_requests$q$, 0);

-- ---------- Menighetens livsløp (P10) ----------
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-3","aal":"aal1"}';
select ch_test.err('Livsløp: admin kan ikke endre status direkte', $q$update public.churches set status = 'deleted'$q$, '42501');
select ch_test.err('Livsløp: admin kan ikke bruke set_church_status', $q$select public.set_church_status('aaaaaaaa-0000-4000-8000-00000000000a', 'temporarily_disabled')$q$, '42501');
select ch_test.ok('Livsløp: admin kan eksportere egen menighet', $q$select public.export_church('aaaaaaaa-0000-4000-8000-00000000000a')$q$);
select ch_test.err('Livsløp: admin kan ikke eksportere annen menighet', $q$select public.export_church('bbbbbbbb-0000-4000-8000-00000000000b')$q$, '42501');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-2","aal":"aal2"}';
select ch_test.ok('Livsløp: stab deaktiverer B midlertidig', $q$select public.set_church_status('bbbbbbbb-0000-4000-8000-00000000000b', 'temporarily_disabled')$q$);
select ch_test.err('Livsløp: ugyldig overgang avvises', $q$select public.set_church_status('bbbbbbbb-0000-4000-8000-00000000000b', 'deleted')$q$, '22023');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-5","aal":"aal1"}';
select ch_test.cnt('Livsløp: medlemmer i deaktivert menighet ser den ikke', $q$select 1 from public.churches$q$, 0);
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-2","aal":"aal2"}';
select ch_test.ok('Livsløp: stab aktiverer B igjen', $q$select public.set_church_status('bbbbbbbb-0000-4000-8000-00000000000b', 'active')$q$);
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-1","aal":"aal2"}';
select ch_test.ok('Livsløp: developer oppretter menighet C', $q$insert into public.churches (name) values ('Testmenighet C')$q$);
select ch_test.err('Livsløp: aktiv menighet kan ikke slettes', $q$select public.prepare_church_purge((select id from public.churches where name = 'Testmenighet C'), 'Testmenighet C')$q$, '22023');
select ch_test.ok('Livsløp: C settes til sletting', $q$select public.set_church_status((select id from public.churches where name = 'Testmenighet C'), 'pending_deletion')$q$);
select ch_test.err('Livsløp: feil navn ved bekreftelse avvises', $q$select public.prepare_church_purge((select id from public.churches where name = 'Testmenighet C'), 'Testmenighet X')$q$, '22023');
select ch_test.ok('Livsløp: riktig navn gir filnøkler', $q$select public.prepare_church_purge((select id from public.churches where name = 'Testmenighet C'), 'Testmenighet C')$q$);
select ch_test.err('Livsløp: purge_church kan ikke kalles av klienter', $q$select public.purge_church((select id from public.churches where name = 'Testmenighet C'), 'https://test.invalid/auth/v1', 'sub-1', 'aal2')$q$, '42501');
set local role postgres;
create temp table ch_c as select id from public.churches where name = 'Testmenighet C';
grant select on ch_c to anon, authenticated;
do $$ begin if exists (select 1 from pg_roles where rolname = 'service_role') then execute 'grant select on ch_c to service_role'; execute 'set local role service_role'; end if; end $$;
select ch_test.err('Livsløp: sletting avvises uten MFA i tokenet', $q$select public.purge_church((select id from ch_c), 'https://test.invalid/auth/v1', 'sub-1', 'aal1')$q$, '42501');
select ch_test.ok('Livsløp: server sletter C for developer med MFA', $q$select public.purge_church((select id from ch_c), 'https://test.invalid/auth/v1', 'sub-1', 'aal2')$q$);
set local role postgres;
select ch_test.cnt('Livsløp: C er borte', $q$select 1 from public.churches where id = (select id from public.churches where name = 'Testmenighet C')$q$, 0);
select ch_test.atleast('Livsløp: slettingen er loggført', $q$select 1 from public.audit_logs where action = 'churches.purge'$q$, 1);

-- ---------- Personvern (P10) ----------
set local role authenticated;
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-8","aal":"aal1"}';
select ch_test.cnt('Personvern: eksport inneholder egne opplysninger', $q$select 1 where public.export_my_data() -> 'user' ->> 'email' = 'medlem2@test.invalid'$q$, 1);
select ch_test.cnt('Personvern: eksport inneholder ikke andres e-post', $q$select 1 where public.export_my_data()::text like '%admina@test.invalid%'$q$, 0);
select ch_test.err('Personvern: klient kan ikke kalle delete_account', $q$select public.delete_account('https://test.invalid/auth/v1', 'sub-8')$q$, '42501');
set local role postgres;
update public.user_roles set revoked_at = now() where role = 'developer' and revoked_at is null and user_id <> '00000000-0000-4000-8000-000000000001';
set local role authenticated;
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-1","aal":"aal2"}';
select ch_test.err('Personvern: eneste Developer kan ikke slette seg selv', 'select public.prepare_account_deletion()', '22023');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-3","aal":"aal1"}';
select ch_test.ok('Personvern: admin kan forberede sletting av egen konto', 'select public.prepare_account_deletion()');
set local role postgres;
create temp table ch_audit_before as select count(*) n from public.audit_logs;
grant select on ch_audit_before to anon, authenticated;
do $$ begin if exists (select 1 from pg_roles where rolname = 'service_role') then execute 'grant select on ch_audit_before to service_role'; execute 'set local role service_role'; end if; end $$;
select ch_test.ok('Personvern: server sletter kontoen til admin A', $q$select public.delete_account('https://test.invalid/auth/v1', 'sub-3')$q$);
set local role postgres;
select ch_test.cnt('Personvern: brukeren og identiteten er borte', $q$select 1 from public.app_users where id = '00000000-0000-4000-8000-000000000003' union all select 1 from public.user_identities where subject = 'sub-3'$q$, 0);
select ch_test.cnt('Personvern: loggen er beholdt, men uten kobling til personen', $q$select 1 from public.audit_logs where actor_user_id = '00000000-0000-4000-8000-000000000003'$q$, 0);
select ch_test.cnt('Personvern: ingen logghendelser ble slettet', $q$select 1 where (select count(*) from public.audit_logs) >= (select n from ch_audit_before)$q$, 1);
select ch_test.cnt('Personvern: invitasjoner til adressen er anonymisert', $q$select 1 from public.invitations where lower(email) = 'admina@test.invalid'$q$, 0);

-- ---------- Oppbevaringstid for loggen (P8) ----------
set local role authenticated;
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-1","aal":"aal2"}';
select ch_test.err('Logg: Developer kan ikke kjøre sletting etter oppbevaringstid', 'select app.purge_audit_logs(24)', '42501');
set local role postgres;
select ch_test.err('Logg: oppbevaringstid under 12 måneder avvises', 'select app.purge_audit_logs(6)', '22023');
select ch_test.ok('Logg: drift kan slette hendelser eldre enn 24 måneder', 'select app.purge_audit_logs(24)');
select ch_test.atleast('Logg: slettingen er selv loggført', $q$select 1 from public.audit_logs where action = 'audit_logs.purge'$q$, 1);
set local connecthub.audit_purge_before to '2000-01-01';
select ch_test.err('Logg: innstillingen kan ikke brukes til å slette nyere hendelser', 'delete from public.audit_logs', '42501');
set local connecthub.audit_purge_before to '';

-- ---------- Logging ----------
select ch_test.atleast('Logg: rolletildeling er loggført med utfører', $q$select 1 from public.audit_logs where action = 'user_roles.insert' and actor_user_id = '00000000-0000-4000-8000-000000000002'$q$, 1);
select ch_test.atleast('Logg: tilbakekalling er loggført', $q$select 1 from public.audit_logs where action = 'user_roles.update' and actor_user_id = '00000000-0000-4000-8000-000000000001'$q$, 1);

select json_build_object(
  'bestatt', (select count(*) from ch_test.res where ok),
  'feilet', (select count(*) from ch_test.res where not ok),
  'feil', (select coalesce(json_agg(json_build_object('test', name, 'info', info) order by n), '[]'::json) from ch_test.res where not ok),
  'alle', (select json_agg(name || ' — ' || case when ok then 'OK' else 'FEIL' end order by n) from ch_test.res)
) as resultat;
rollback;
