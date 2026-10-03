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
-- Som ok, men handlingen rulles tilbake (delvis transaksjon), så den ikke påvirker senere tester.
create function ch_test.ok_rb(p_name text, p_sql text) returns void language plpgsql as $$
declare v_err text;
begin
  begin
    execute p_sql;
    raise exception using errcode = 'P0042';
  exception when sqlstate 'P0042' then v_err := null;
            when others then v_err := sqlstate || ': ' || left(sqlerrm, 90);
  end;
  insert into ch_test.res (name, ok, info) values (p_name, v_err is null, coalesce('feil ' || v_err, 'ok (rullet tilbake)'));
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
  ('00000000-0000-4000-8000-000000000008', 'medlem2@test.invalid', 'Medlem 2 A', 'active'),
  ('00000000-0000-4000-8000-000000000009', 'medlemb@test.invalid', 'Medlem B', 'active');
insert into public.user_identities (provider, subject, user_id)
select 'https://test.invalid/auth/v1', 'sub-' || right(id::text, 1), id from public.app_users where email like '%@test.invalid';
insert into public.memberships (user_id, church_id) values
  ('00000000-0000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-00000000000a'),
  ('00000000-0000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-00000000000a'),
  ('00000000-0000-4000-8000-000000000007', 'aaaaaaaa-0000-4000-8000-00000000000a'),
  ('00000000-0000-4000-8000-000000000008', 'aaaaaaaa-0000-4000-8000-00000000000a'),
  ('00000000-0000-4000-8000-000000000005', 'bbbbbbbb-0000-4000-8000-00000000000b'),
  ('00000000-0000-4000-8000-000000000009', 'bbbbbbbb-0000-4000-8000-00000000000b');
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

-- ---------- Moderator: samarbeid og administrasjon – men aldri roller eller kontoer for Developer/Moderator ----------
set local role authenticated;
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-2","aal":"aal1"}';
select ch_test.cnt('Moderator uten MFA: ser ingen menigheter', 'select 1 from public.churches', 0);
select ch_test.cnt('Moderator uten MFA: får ikke menighetslisten', 'select 1 from public.church_directory()', 0);
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-2","aal":"aal2"}';
select ch_test.cnt('Moderator: ser alle menigheter (som Developer)', $q$select 1 from public.churches where name like 'Testmenighet %'$q$, 2);
select ch_test.cnt('Moderator: ser alle brukere (som Developer)', $q$select 1 from public.app_users where email like '%@test.invalid'$q$, 9);
select ch_test.cnt('Moderator: får menighetslisten til samarbeid', $q$select 1 from public.church_directory() where name like 'Testmenighet %'$q$, 2);
select ch_test.ok_rb('Moderator: kan gjøre Bruker B til admin i B', $q$select public.assign_role('00000000-0000-4000-8000-000000000005', 'church_admin', 'bbbbbbbb-0000-4000-8000-00000000000b', 'test')$q$);
select ch_test.err('Moderator: kan ikke opprette developer', $q$select public.assign_role('00000000-0000-4000-8000-000000000006', 'developer')$q$, '42501');
select ch_test.err('Moderator: kan ikke opprette moderator', $q$select public.assign_role('00000000-0000-4000-8000-000000000006', 'moderator')$q$, '42501');
select ch_test.ok_rb('Moderator: kan opprette menighet', $q$insert into public.churches (name) values ('Ny')$q$);
select ch_test.err('Moderator: kan ikke tilbakekalle developer', $q$select public.revoke_role((select id from public.user_roles where role = 'developer' and revoked_at is null and user_id = '00000000-0000-4000-8000-000000000001'))$q$, '42501');
select ch_test.err('Moderator: kan ikke fjerne sin egen moderatorrolle', $q$select public.revoke_role((select id from public.user_roles where role = 'moderator' and revoked_at is null and user_id = '00000000-0000-4000-8000-000000000002'))$q$, '42501');
select ch_test.err('Moderator: kan ikke gi seg selv developer', $q$select public.assign_role('00000000-0000-4000-8000-000000000002', 'developer')$q$, '42501');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-1","aal":"aal2"}';
select ch_test.ok('Developer: kan gjøre Bruker B til admin i B', $q$select public.assign_role('00000000-0000-4000-8000-000000000005', 'church_admin', 'bbbbbbbb-0000-4000-8000-00000000000b', 'test')$q$);
select ch_test.err('Developer: kan ikke gjøre ikke-medlem til admin', $q$select public.assign_role('00000000-0000-4000-8000-000000000006', 'church_admin', 'aaaaaaaa-0000-4000-8000-00000000000a')$q$, '22023');
select ch_test.err('Developer: bare én aktiv admin per menighet', $q$select public.assign_role('00000000-0000-4000-8000-000000000008', 'church_admin', 'aaaaaaaa-0000-4000-8000-00000000000a')$q$, '23505');
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
select ch_test.ok_rb('Moderator: kan invitere brukere', $q$select public.create_invitation('x@test.invalid', 'bbbbbbbb-0000-4000-8000-00000000000b', 'user', repeat('e', 64))$q$);
select ch_test.ok_rb('Moderator: kan invitere admin', $q$select public.create_invitation('x@test.invalid', 'aaaaaaaa-0000-4000-8000-00000000000a', 'church_admin', repeat('e', 64))$q$);
select ch_test.err('Moderator: kan ikke invitere moderator', $q$select public.create_invitation('m@test.invalid', null, 'moderator', repeat('f', 64))$q$, '42501');
select ch_test.err('Moderator: kan ikke invitere developer', $q$select public.create_invitation('d@test.invalid', null, 'developer', repeat('f', 64))$q$, '42501');
select ch_test.ok('Moderator: ser systemstatus', 'select public.system_status()');
select ch_test.ok_rb('Moderator: kan deaktivere vanlige brukere', $q$select public.set_user_status('00000000-0000-4000-8000-000000000006', 'disabled')$q$);
select ch_test.err('Moderator: kan ikke deaktivere Developer', $q$select public.set_user_status('00000000-0000-4000-8000-000000000001', 'disabled')$q$, '42501');
select ch_test.err('Moderator: kan ikke endre egen status', $q$select public.set_user_status('00000000-0000-4000-8000-000000000002', 'disabled')$q$, '42501');
-- En annen Moderator (gitt og fjernet igjen i en delvis transaksjon)
set local role postgres;
do $$
declare st text := 'ok';
begin
  begin
    insert into public.user_roles (user_id, role, church_id) values ('00000000-0000-4000-8000-000000000009', 'moderator', null);
    perform set_config('request.jwt.claims', '{"iss":"https://test.invalid/auth/v1","sub":"sub-2","aal":"aal2"}', true);
    execute 'set local role authenticated';
    begin perform public.set_user_status('00000000-0000-4000-8000-000000000009', 'disabled'); exception when others then st := sqlstate; end;
    raise exception using errcode = 'P0042';
  exception when sqlstate 'P0042' then null;
  end;
  insert into ch_test.res (name, ok, info) values ('Moderator: kan ikke deaktivere en annen Moderator', st = '42501', 'fikk ' || st);
end $$;
set local role authenticated;
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-2","aal":"aal2"}';
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-1","aal":"aal2"}';
select ch_test.ok('Developer: kan invitere admin til A', $q$select public.create_invitation('nyadmin@test.invalid', 'aaaaaaaa-0000-4000-8000-00000000000a', 'church_admin', repeat('f', 64))$q$);
select ch_test.ok('Developer: kan se systemstatus', 'select public.system_status()');
select ch_test.ok('Developer: kan deaktivere utenforstående', $q$select public.set_user_status('00000000-0000-4000-8000-000000000006', 'disabled')$q$);
select ch_test.ok('Developer: kan aktivere igjen', $q$select public.set_user_status('00000000-0000-4000-8000-000000000006', 'active')$q$);
select ch_test.err('Developer: kan ikke deaktivere seg selv', $q$select public.set_user_status('00000000-0000-4000-8000-000000000001', 'disabled')$q$, '42501');
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
select ch_test.err('Fil: nye private opplastinger er stengt (forhåndskontroll)', $q$select public.can_upload('aaaaaaaa-0000-4000-8000-00000000000a', 'bilder', true, 1000)$q$, '42501');
select ch_test.err('Fil: nye private opplastinger er stengt også i andre mapper', $q$select public.can_upload('aaaaaaaa-0000-4000-8000-00000000000a', 'logoer', true, 1000)$q$, '42501');
select ch_test.ok('Fil: vanlig opplasting til Fellesmappe virker', $q$select public.can_upload('aaaaaaaa-0000-4000-8000-00000000000a', 'bilder', false, 1000)$q$);
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

-- ---------- Koblinger og Samarbeidsfiler (trinn 18): menigheter ser aldri hverandres vanlige filer ----------
set local role postgres;
-- Hjelpevisning (eierens rettigheter, uten RLS): fil-ID-er til testene, uavhengig av hva rollen selv kan se.
create view ch_test.all_files as select id, file_name, folder, storage_key, link_id from public.files;
grant select on ch_test.all_files to authenticated;
do $$ begin if exists (select 1 from pg_roles where rolname = 'service_role') then execute 'grant select on ch_test.all_files to service_role'; end if; end $$;
insert into public.churches (id, name) values ('cccccccc-0000-4000-8000-00000000000c', 'Testmenighet K');
insert into public.memberships (user_id, church_id) values ('00000000-0000-4000-8000-000000000006', 'cccccccc-0000-4000-8000-00000000000c');
insert into public.files (church_id, storage_key, file_name, mime_type, file_size, uploaded_by, folder, visibility) values
  ('aaaaaaaa-0000-4000-8000-00000000000a', 'test/faste-a.png', 'faste-a.png', 'image/png', 20, '00000000-0000-4000-8000-000000000003', 'faste', 'church'),
  ('aaaaaaaa-0000-4000-8000-00000000000a', 'test/faste-a2.png', 'faste-a2.png', 'image/png', 20, '00000000-0000-4000-8000-000000000008', 'logoer', 'church'),
  ('bbbbbbbb-0000-4000-8000-00000000000b', 'test/b-delt.png', 'b-delt.png', 'image/png', 30, '00000000-0000-4000-8000-000000000009', 'bilder', 'church'),
  ('cccccccc-0000-4000-8000-00000000000c', 'test/k-delt.png', 'k-delt.png', 'image/png', 40, '00000000-0000-4000-8000-000000000006', 'bilder', 'church');
set local role authenticated;

-- A1/A2: ingen bred tilgang for Developer eller Moderator
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-1","aal":"aal2"}';
select ch_test.cnt('Filtilgang A1: Developer ser ikke filer i menigheter uten medlemskap', $q$select 1 from public.files$q$, 0);
select ch_test.cnt('Filtilgang A1: Developer får ingen nedlastingsnøkler', $q$select 1 from public.file_keys(array(select id from ch_test.all_files))$q$, 0);
select ch_test.cnt('Filtilgang A1: Developer ser ikke forbruk i andres menighet', $q$select 1 where public.storage_usage('aaaaaaaa-0000-4000-8000-00000000000a') is null$q$, 1);
select ch_test.err('Filtilgang A1: Developer kan ikke laste opp i menighet uten medlemskap', $q$select public.can_upload('aaaaaaaa-0000-4000-8000-00000000000a', 'bilder', false, 10)$q$, '42501');
select ch_test.err('Filtilgang A1: Developer kan ikke slette i menighet uten medlemskap', $q$select public.delete_file((select id from ch_test.all_files where file_name = 'bilde.jpg'))$q$, '42501');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-2","aal":"aal2"}';
select ch_test.cnt('Filtilgang A2: Moderator ser ingen filrader', $q$select 1 from public.files$q$, 0);
select ch_test.cnt('Filtilgang A2: Moderator får ingen nedlastingsnøkler', $q$select 1 from public.file_keys(array(select id from ch_test.all_files))$q$, 0);

-- Koblinger: bare Moderator (med MFA)
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-3","aal":"aal1"}';
select ch_test.err('Kobling: Admin kan ikke opprette kobling', $q$select public.create_link('aaaaaaaa-0000-4000-8000-00000000000a', 'bbbbbbbb-0000-4000-8000-00000000000b')$q$, '42501');
select ch_test.cnt('Kobling: Admin får ikke menighetslisten', 'select 1 from public.church_directory()', 0);
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-8","aal":"aal1"}';
select ch_test.err('Kobling: medlem kan ikke opprette kobling', $q$select public.create_link('aaaaaaaa-0000-4000-8000-00000000000a', 'bbbbbbbb-0000-4000-8000-00000000000b')$q$, '42501');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-1","aal":"aal2"}';
select ch_test.ok_rb('Kobling: Developer kan opprette kobling (som Moderator)', $q$select public.create_link('aaaaaaaa-0000-4000-8000-00000000000a', 'bbbbbbbb-0000-4000-8000-00000000000b')$q$);
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-2","aal":"aal1"}';
select ch_test.err('Kobling: Moderator uten MFA kan ikke opprette kobling', $q$select public.create_link('aaaaaaaa-0000-4000-8000-00000000000a', 'bbbbbbbb-0000-4000-8000-00000000000b')$q$, '42501');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-2","aal":"aal2"}';
select ch_test.ok('Kobling: Moderator kobler B og A (rekkefølgen spiller ingen rolle)', $q$select public.create_link('bbbbbbbb-0000-4000-8000-00000000000b', 'aaaaaaaa-0000-4000-8000-00000000000a')$q$);
select ch_test.ok_rb('Kobling: samme to menigheter kan være med i flere grupper', $q$select public.create_link('aaaaaaaa-0000-4000-8000-00000000000a', 'bbbbbbbb-0000-4000-8000-00000000000b')$q$);
select ch_test.err('Kobling: ikke med seg selv', $q$select public.create_link('aaaaaaaa-0000-4000-8000-00000000000a', 'aaaaaaaa-0000-4000-8000-00000000000a')$q$, '22023');
select ch_test.ok('Kobling: Moderator kobler A og K', $q$select public.create_link('aaaaaaaa-0000-4000-8000-00000000000a', 'cccccccc-0000-4000-8000-00000000000c')$q$);
select ch_test.cnt('Kobling: Moderator ser begge koblingene', $q$select 1 from public.my_links() where church_a in ('aaaaaaaa-0000-4000-8000-00000000000a', 'bbbbbbbb-0000-4000-8000-00000000000b', 'cccccccc-0000-4000-8000-00000000000c') and church_b in ('aaaaaaaa-0000-4000-8000-00000000000a', 'bbbbbbbb-0000-4000-8000-00000000000b', 'cccccccc-0000-4000-8000-00000000000c')$q$, 2);   -- bare testmenighetene (ekte koblinger i dev telles ikke)
set local role postgres;
create temp table t18 as select
  (select m1.link_id from public.church_link_members m1 join public.church_link_members m2 on m2.link_id = m1.link_id where m1.church_id = 'aaaaaaaa-0000-4000-8000-00000000000a' and m2.church_id = 'bbbbbbbb-0000-4000-8000-00000000000b') ab,
  (select m1.link_id from public.church_link_members m1 join public.church_link_members m2 on m2.link_id = m1.link_id where m1.church_id = 'aaaaaaaa-0000-4000-8000-00000000000a' and m2.church_id = 'cccccccc-0000-4000-8000-00000000000c') ak;
grant select on t18 to authenticated;
do $$ begin if exists (select 1 from pg_roles where rolname = 'service_role') then execute 'grant select on t18 to service_role'; end if; end $$;
select ch_test.atleast('Kobling: Admin i begge menighetene fikk varsel', $q$select 1 from public.notifications where kind = 'church_link'$q$, 2);
set local role authenticated;
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-8","aal":"aal1"}';
select ch_test.cnt('Kobling: medlem i A ser sine to koblinger', 'select 1 from public.my_links()', 2);
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-9","aal":"aal1"}';
select ch_test.cnt('Kobling: medlem i B ser bare koblingen A–B', 'select 1 from public.my_links()', 1);
select ch_test.cnt('Kobling: medlem i B ser navnet på A gjennom koblingen', $q$select 1 from public.my_links() where church_a_name = 'Testmenighet A'$q$, 1);
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-1","aal":"aal2"}';
select ch_test.cnt('Kobling: Developer ser alle koblinger (som Moderator), også uten medlemskap', $q$select 1 from public.my_links() where church_a in ('aaaaaaaa-0000-4000-8000-00000000000a', 'bbbbbbbb-0000-4000-8000-00000000000b', 'cccccccc-0000-4000-8000-00000000000c')$q$, 2);
select ch_test.cnt('Kobling: Developer leser koblingene (som Moderator)', $q$select 1 from public.church_links where id in (select ab from t18 union select ak from t18)$q$, 2);
select ch_test.cnt('Kobling: koblingen er en gruppe med to medlemmer og navnet «A – B»', $q$select 1 from public.my_groups() where id = (select ab from t18) and name = 'Testmenighet A – Testmenighet B' and jsonb_array_length(members) = 2$q$, 1);

-- Overføring (kopi): Delt mappe for alle medlemmer, Faste bare Admin, aldri private eller andres filer
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-8","aal":"aal1"}';
select ch_test.ok('Overføring: medlem kan kopiere fra Delt mappe', $q$select public.can_transfer((select id from ch_test.all_files where file_name = 'bilde.jpg'), (select ab from t18))$q$);
select ch_test.err('Overføring: medlem kan ikke kopiere fra Faste', $q$select public.can_transfer((select id from ch_test.all_files where file_name = 'faste-a.png'), (select ab from t18))$q$, '42501');
select ch_test.err('Overføring: private filer kan aldri overføres', $q$select public.can_transfer((select id from ch_test.all_files where file_name = 'privat.png'), (select ab from t18))$q$, '42501');
select ch_test.err('Overføring: kan ikke kopiere den andre menighetens fil', $q$select public.can_transfer((select id from ch_test.all_files where file_name = 'b-delt.png'), (select ab from t18))$q$, '42501');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-6","aal":"aal1"}';
select ch_test.err('Overføring: kan ikke kopiere til en kobling egen menighet ikke er med i', $q$select public.can_transfer((select id from ch_test.all_files where file_name = 'k-delt.png'), (select ab from t18))$q$, '42501');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-3","aal":"aal1"}';
select ch_test.ok('Overføring: Admin kan kopiere fra Faste', $q$select public.can_transfer((select id from ch_test.all_files where file_name = 'faste-a.png'), (select ab from t18))$q$);
select ch_test.err('Overføring: kan ikke registrere kopi selv (bare serveren)', $q$select public.register_link_copy('https://test.invalid/auth/v1', 'sub-3', (select id from ch_test.all_files where file_name = 'faste-a.png'), (select ab from t18), 'test/x')$q$, '42501');
do $$ begin if exists (select 1 from pg_roles where rolname = 'service_role') then execute 'set local role service_role'; else execute 'set local role postgres'; end if; end $$;
select ch_test.ok('Overføring: server registrerer kopi for medlem (Delt mappe)', $q$select public.register_link_copy('https://test.invalid/auth/v1', 'sub-8', (select id from ch_test.all_files where file_name = 'bilde.jpg'), (select ab from t18), 'test/kopi-ab-1.png')$q$);
select ch_test.err('Overføring: samme bilde kan ikke kopieres to ganger til samme kobling', $q$select public.register_link_copy('https://test.invalid/auth/v1', 'sub-8', (select id from ch_test.all_files where file_name = 'bilde.jpg' and link_id is null), (select ab from t18), 'test/kopi-ab-1b.png')$q$, '23505');
select ch_test.err('Overføring: server kan ikke registrere Faste-kopi for vanlig medlem', $q$select public.register_link_copy('https://test.invalid/auth/v1', 'sub-8', (select id from ch_test.all_files where file_name = 'faste-a.png'), (select ab from t18), 'test/kopi-x.png')$q$, '42501');
select ch_test.ok('Overføring: server registrerer Faste-kopi for Admin', $q$select public.register_link_copy('https://test.invalid/auth/v1', 'sub-3', (select id from ch_test.all_files where file_name = 'faste-a.png'), (select ab from t18), 'test/kopi-ab-2.png')$q$);
select ch_test.ok('Overføring: server registrerer kopi fra B (medlem i B)', $q$select public.register_link_copy('https://test.invalid/auth/v1', 'sub-9', (select id from ch_test.all_files where file_name = 'b-delt.png'), (select ab from t18), 'test/kopi-ab-3.png')$q$);
set local role postgres;
select ch_test.cnt('Overføring: originalene er uendret (fortsatt i egne mapper)', $q$select 1 from public.files where file_name in ('bilde.jpg', 'faste-a.png', 'b-delt.png') and link_id is null$q$, 3);
select ch_test.cnt('Overføring: kopien peker på originalen og er i Samarbeidsfiler', $q$select 1 from public.files where storage_key = 'test/kopi-ab-1.png' and folder = 'samarbeid' and church_id = 'aaaaaaaa-0000-4000-8000-00000000000a' and source_file_id is not null and source_folder = 'bilder'$q$, 1);
select ch_test.cnt('Overføring: Faste-kopien husker mappen (for verktøyenes paneler)', $q$select 1 from public.files where storage_key = 'test/kopi-ab-2.png' and source_folder = 'faste'$q$, 1);
select ch_test.err('Overføring: Samarbeidsfiler kan ikke være private', $q$update public.files set visibility = 'private' where storage_key = 'test/kopi-ab-1.png'$q$, '23514');
set local role authenticated;

-- Synlighet: bare kopiene i koblingen, bare for de to menighetene
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-9","aal":"aal1"}';
select ch_test.cnt('Samarbeidsfiler: medlem i B ser de tre kopiene', $q$select 1 from public.files where folder = 'samarbeid'$q$, 3);
select ch_test.cnt('Samarbeidsfiler: medlem i B ser ingen av A sine vanlige filer', $q$select 1 from public.files where church_id = 'aaaaaaaa-0000-4000-8000-00000000000a' and folder <> 'samarbeid'$q$, 0);
select ch_test.cnt('Samarbeidsfiler: medlem i B får nøkler til kopiene', $q$select 1 from public.file_keys(array(select id from ch_test.all_files where folder = 'samarbeid'))$q$, 3);
select ch_test.cnt('Samarbeidsfiler: medlem i B får ikke nøkkel til originalen i A', $q$select 1 from public.file_keys(array(select id from ch_test.all_files where file_name = 'bilde.jpg' and link_id is null))$q$, 0);
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-6","aal":"aal1"}';
select ch_test.cnt('Samarbeidsfiler: medlem i K (koblet til A i en annen kobling) ser ingen A–B-filer', $q$select 1 from public.files where folder = 'samarbeid'$q$, 0);
select ch_test.cnt('Samarbeidsfiler: medlem i K ser ingen av A sine filer', $q$select 1 from public.files where church_id = 'aaaaaaaa-0000-4000-8000-00000000000a'$q$, 0);
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-8","aal":"aal1"}';
select ch_test.cnt('Samarbeidsfiler: medlem i A ser kopiene i A–B', $q$select 1 from public.files where folder = 'samarbeid'$q$, 3);
select ch_test.cnt('Samarbeidsfiler: medlem i A ser ikke B sine vanlige filer', $q$select 1 from public.files where file_name = 'b-delt.png' and link_id is null$q$, 0);
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-2","aal":"aal2"}';
select ch_test.cnt('Samarbeidsfiler: Moderator ser ingen filrader', $q$select 1 from public.files$q$, 0);
select ch_test.cnt('Samarbeidsfiler: Moderator får metadata', $q$select 1 from public.link_files_meta((select ab from t18))$q$, 3);
select ch_test.cnt('Samarbeidsfiler: Moderator får ingen nedlastingsnøkler', $q$select 1 from public.file_keys(array(select id from ch_test.all_files where folder = 'samarbeid'))$q$, 0);
select ch_test.err('Samarbeidsfiler: Moderator kan ikke slette', $q$select public.delete_file((select id from ch_test.all_files where storage_key = 'test/kopi-ab-1.png'))$q$, '42501');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-9","aal":"aal1"}';
select ch_test.err('Samarbeidsfiler: medlem får ikke metadata-oversikten', $q$select public.link_files_meta((select ab from t18))$q$, '42501');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-1","aal":"aal2"}';
select ch_test.cnt('Samarbeidsfiler: Developer uten medlemskap ser ingenting', $q$select 1 from public.files where folder = 'samarbeid'$q$, 0);
select ch_test.cnt('Samarbeidsfiler: Developer får bare metadata (som Moderator)', $q$select 1 from public.link_files_meta((select ab from t18))$q$, 3);
select ch_test.cnt('Samarbeidsfiler: Developer uten medlemskap får ingen nedlastingsnøkler', $q$select 1 from public.file_keys(array(select id from ch_test.all_files where folder = 'samarbeid'))$q$, 0);
select ch_test.err('Samarbeidsfiler: Developer uten medlemskap kan ikke slette kopier', $q$select public.delete_file((select id from ch_test.all_files where storage_key = 'test/kopi-ab-1.png'))$q$, '42501');
select ch_test.cnt('Samarbeidsfiler: Developer ser ingen private filer', $q$select 1 from public.files where visibility = 'private'$q$, 0);

-- Fjerning: bare Admin i menigheten som bidro; originalen blir liggende
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-8","aal":"aal1"}';
select ch_test.err('Fjerning: medlem kan ikke fjerne fra Samarbeidsfiler (heller ikke egen overføring)', $q$select public.delete_file((select id from ch_test.all_files where storage_key = 'test/kopi-ab-1.png'))$q$, '42501');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-5","aal":"aal1"}';
select ch_test.err('Fjerning: Admin i B kan ikke fjerne A sitt bidrag', $q$select public.delete_file((select id from ch_test.all_files where storage_key = 'test/kopi-ab-1.png'))$q$, '42501');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-3","aal":"aal1"}';
select ch_test.ok('Fjerning: Admin i A fjerner eget bidrag (kopien slettes)', $q$select public.delete_file((select id from ch_test.all_files where storage_key = 'test/kopi-ab-1.png'))$q$);
select ch_test.cnt('Fjerning: originalen i A finnes fortsatt', $q$select 1 from public.files where file_name = 'bilde.jpg' and link_id is null$q$, 1);

-- Faste (M1): bare Admin i egen menighet sletter
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-8","aal":"aal1"}';
select ch_test.err('Faste: medlem som lastet opp (uten Admin-rolle) kan ikke slette', $q$select public.delete_file((select id from ch_test.all_files where file_name = 'faste-a2.png'))$q$, '42501');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-2","aal":"aal2"}';
select ch_test.err('Faste: Moderator kan ikke slette', $q$select public.delete_file((select id from ch_test.all_files where file_name = 'faste-a2.png'))$q$, '42501');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-5","aal":"aal1"}';
select ch_test.err('Faste: Admin i annen menighet kan ikke slette', $q$select public.delete_file((select id from ch_test.all_files where file_name = 'faste-a2.png'))$q$, '42501');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-3","aal":"aal1"}';
select ch_test.ok('Faste: Admin i egen menighet sletter', $q$select public.delete_file((select id from ch_test.all_files where file_name = 'faste-a2.png'))$q$);
set local role postgres;
insert into public.memberships (user_id, church_id) values ('00000000-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-00000000000b');
set local role authenticated;
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-1","aal":"aal2"}';
select ch_test.atleast('Filtilgang A1: Developer som er medlem ser filene i menigheten', $q$select 1 from public.files where church_id = 'bbbbbbbb-0000-4000-8000-00000000000b' and folder <> 'samarbeid'$q$, 1);
select ch_test.ok('Filtilgang A1: Developer som er medlem kan laste opp i Delt mappe', $q$select public.can_upload('bbbbbbbb-0000-4000-8000-00000000000b', 'bilder', false, 10)$q$);
select ch_test.err('Faste: Developer som bare er medlem kan ikke laste opp i Faste', $q$select public.can_upload('bbbbbbbb-0000-4000-8000-00000000000b', 'faste', false, 10)$q$, '42501');
select ch_test.err('Filtilgang A1: Developer som bare er medlem kan ikke slette andres fil i Delt mappe', $q$select public.delete_file((select id from ch_test.all_files where file_name = 'b-delt.png' and link_id is null))$q$, '42501');
select ch_test.cnt('Samarbeidsfiler: Developer som er medlem i B ser kopiene i A–B', $q$select 1 from public.files where folder = 'samarbeid'$q$, 2);

-- Avsluttet kobling skjuler alt (ingen sletting); gjenåpning viser igjen
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-9","aal":"aal1"}';
select ch_test.err('Kobling: medlem kan ikke avslutte', $q$select public.end_link((select ab from t18))$q$, '42501');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-2","aal":"aal2"}';
select ch_test.ok('Kobling: Moderator avslutter A–B', $q$select public.end_link((select ab from t18))$q$);
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-9","aal":"aal1"}';
select ch_test.cnt('Avsluttet: medlem i B ser ingen Samarbeidsfiler', $q$select 1 from public.files where folder = 'samarbeid'$q$, 0);
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-8","aal":"aal1"}';
select ch_test.cnt('Avsluttet: medlem i A ser heller ikke egne kopier', $q$select 1 from public.files where folder = 'samarbeid'$q$, 0);
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-3","aal":"aal1"}';
select ch_test.err('Avsluttet: ingen nye overføringer', $q$select public.can_transfer((select id from ch_test.all_files where file_name = 'bilde.jpg' and link_id is null), (select ab from t18))$q$, '22023');
set local role postgres;
select ch_test.cnt('Avsluttet: kopiene er ikke slettet', $q$select 1 from public.files where link_id = (select ab from t18)$q$, 2);
set local role authenticated;
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-2","aal":"aal2"}';
select ch_test.ok('Kobling: Moderator gjenåpner A–B', $q$select public.reopen_link((select ab from t18))$q$);
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-9","aal":"aal1"}';
select ch_test.cnt('Gjenåpnet: medlem i B ser kopiene igjen', $q$select 1 from public.files where folder = 'samarbeid'$q$, 2);

-- Menighet som ikke kan bruke samarbeid (deaktivert nå, utløpt abonnement i trinn 15): bidragene skjules for den andre
set local role postgres;
update public.churches set status = 'temporarily_disabled' where id = 'bbbbbbbb-0000-4000-8000-00000000000b';
set local role authenticated;
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-8","aal":"aal1"}';
select ch_test.cnt('Utilgjengelig menighet: A ser ikke lenger B sitt bidrag, bare sitt eget', $q$select 1 from public.files where folder = 'samarbeid'$q$, 1);
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-9","aal":"aal1"}';
select ch_test.cnt('Utilgjengelig menighet: medlem i B ser ingen Samarbeidsfiler', $q$select 1 from public.files where folder = 'samarbeid'$q$, 0);
set local role postgres;
update public.churches set status = 'active' where id = 'bbbbbbbb-0000-4000-8000-00000000000b';
select ch_test.cnt('Utilgjengelig menighet: ingen kopier ble slettet', $q$select 1 from public.files where link_id = (select ab from t18)$q$, 2);
set local role authenticated;

-- Den gamle samarbeidsmodellen: deling av vanlige filer er skrudd av; Developer og Moderator administrerer (uten filtilgang)
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-2","aal":"aal2"}';
select ch_test.ok('Gammel modell: Moderator kan fortsatt opprette område (uten filtilgang)', $q$select public.create_space('Gammelt område')$q$);
select ch_test.err('Gammel modell: deling av vanlige filer er skrudd av', $q$select public.share_file_to_space((select id from ch_test.all_files where file_name = 'bilde.jpg' and link_id is null), (select id from public.spaces where name = 'Gammelt område'))$q$, '42501');
select ch_test.err('Gammel modell: å gi menigheter tilgang er skrudd av', $q$select public.invite_to_space((select id from public.spaces where name = 'Gammelt område'), 'aaaaaaaa-0000-4000-8000-00000000000a')$q$, '42501');
select ch_test.ok('Gammel modell: Moderator kan endre navn og beskrivelse', $q$select public.update_space((select id from public.spaces where name = 'Gammelt område'), 'Nytt navn', 'Felles bilder til påske')$q$);
select ch_test.err('Gammel modell: for kort navn avvises', $q$select public.update_space((select id from public.spaces where name = 'Nytt navn'), 'x')$q$, '23514');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-8","aal":"aal1"}';
select ch_test.cnt('Gammel modell: medlem ser ikke områder', $q$select 1 from public.spaces$q$, 0);
select ch_test.err('Gammel modell: medlem kan ikke slette område', $q$select public.delete_space((select id from public.spaces limit 1), 'Nytt navn')$q$, '42501');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-3","aal":"aal1"}';
select ch_test.err('Gammel modell: Admin kan ikke opprette område', $q$select public.create_space('Adminområde')$q$, '42501');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-1","aal":"aal2"}';
select ch_test.atleast('Gammel modell: Developer har samarbeidstilgang (som Moderator)', $q$select 1 from public.spaces$q$, 1);
select ch_test.ok_rb('Gammel modell: Developer kan endre område (som Moderator)', $q$select public.update_space((select id from public.spaces where name = 'Nytt navn'), 'Nytt navn', 'Endret av Developer')$q$);
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-2","aal":"aal1"}';
select ch_test.err('Gammel modell: Moderator uten MFA kan ikke slette', $q$select public.delete_space((select id from public.spaces where name = 'Nytt navn'), 'Nytt navn')$q$, '42501');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-2","aal":"aal2"}';
select ch_test.err('Gammel modell: sletting krever riktig navn', $q$select public.delete_space((select id from public.spaces where name = 'Nytt navn'), 'Feil')$q$, '22023');
select ch_test.ok('Gammel modell: Moderator sletter området', $q$select public.delete_space((select id from public.spaces where name = 'Nytt navn'), 'Nytt navn')$q$);
set local role postgres;
select ch_test.atleast('Logg: koblinger og endringer er loggført', $q$select 1 from public.audit_logs where action in ('groups.create', 'groups.end', 'groups.reopen', 'spaces.update', 'spaces.delete')$q$, 5);
set local role authenticated;

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
select ch_test.ok_rb('Abonnement: moderator kan godkjenne', $q$select public.decide_subscription_request((select id from public.subscription_requests where status = 'pending' and church_id = 'aaaaaaaa-0000-4000-8000-00000000000a'), true, 'x')$q$);
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-1","aal":"aal2"}';
select ch_test.ok('Abonnement: Developer godkjenner', $q$select public.decide_subscription_request((select id from public.subscription_requests where status = 'pending' and church_id = 'aaaaaaaa-0000-4000-8000-00000000000a'), true, 'Godkjent i test')$q$);
select ch_test.cnt('Abonnement: godkjenning endrer ikke kvoten (A har fortsatt standard 200 MB)', $q$select 1 from public.churches where id = 'aaaaaaaa-0000-4000-8000-00000000000a' and storage_quota_mb = 200 and not quota_custom$q$, 1);
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-3","aal":"aal1"}';
select ch_test.cnt('Abonnement: admin ser abonnementet', $q$select 1 from public.church_subscriptions where plan = 'standard' and free_of_charge$q$, 1);
select ch_test.atleast('Abonnement: admin fikk varsel om avgjørelsen', $q$select 1 from public.notifications where kind = 'subscription'$q$, 1);
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-8","aal":"aal1"}';
select ch_test.cnt('Abonnement: medlem ser ikke abonnement eller forespørsler', $q$select 1 from public.church_subscriptions union all select 1 from public.subscription_requests$q$, 0);

-- ---------- Planer og kvoter (trinn 19 og 21): standard 200 MB eller egen kvote; planene er bare veiledende ----------
-- Menighetens faktiske kvote (churches.storage_quota_mb) er standard 200 MB eller en egen kvote som Developer (med MFA)
-- tildeler. Planene endrer den aldri – verken ved planendring eller godkjenning av abonnement. Alt loggføres.
set local role postgres;
insert into public.churches (id, name) values
  ('dddddddd-0000-4000-8000-00000000000d', 'Testmenighet Q'), ('eeeeeeee-0000-4000-8000-00000000000e', 'Testmenighet R'),
  ('ffffffff-0000-4000-8000-00000000000f', 'Testmenighet S'), ('12121212-0000-4000-8000-000000000012', 'Testmenighet T'),
  ('13131313-0000-4000-8000-000000000013', 'Testmenighet U');   -- U: uten registrert abonnement
update public.churches set storage_quota_mb = 1024 where id = 'dddddddd-0000-4000-8000-00000000000d';   -- Q: 1024 MB (tidligere fra planen)
update public.churches set storage_quota_mb = 999 where id = '12121212-0000-4000-8000-000000000012';
insert into public.church_subscriptions (church_id, plan, free_of_charge, status) values
  ('dddddddd-0000-4000-8000-00000000000d', 'standard', true, 'active'), ('eeeeeeee-0000-4000-8000-00000000000e', 'standard', true, 'active'),
  ('ffffffff-0000-4000-8000-00000000000f', 'standard', true, 'cancelled'), ('12121212-0000-4000-8000-000000000012', 'standard', true, 'active');
create temp table t19 as select (select count(*) from public.files where church_id = 'aaaaaaaa-0000-4000-8000-00000000000a') a_files;
grant select on t19 to authenticated;
-- Planenes verdier ved start (testene forventer ikke faste verdier, og alt settes tilbake til disse)
create temp table t21p as select code, storage_quota_mb, price_nok_month from public.plans;
grant select on t21p to authenticated;

-- Standard og merke (utledes alltid av kvoten)
select ch_test.cnt('Kvote: ny menighet får standard 200 MB uten egen kvote', $q$select 1 from public.churches where id = '13131313-0000-4000-8000-000000000013' and storage_quota_mb = 200 and not quota_custom$q$, 1);
select ch_test.cnt('Kvote: alt over 200 MB merkes som egen kvote', $q$select 1 from public.churches where id in ('dddddddd-0000-4000-8000-00000000000d', '12121212-0000-4000-8000-000000000012') and quota_custom$q$, 2);
select ch_test.cnt('Kvote: abonnement på Standard gir ikke planens 1024 MB (R har 200 MB)', $q$select 1 from public.churches where id = 'eeeeeeee-0000-4000-8000-00000000000e' and storage_quota_mb = 200 and not quota_custom$q$, 1);
update public.churches set quota_custom = true where id = '13131313-0000-4000-8000-000000000013';
select ch_test.cnt('Kvote: merket kan ikke settes uten egen kvote (200 MB forblir standard)', $q$select 1 from public.churches where id = '13131313-0000-4000-8000-000000000013' and not quota_custom$q$, 1);

-- Migreringen: eksisterende kvoter bevares og klassifiseres (simulerer tilstanden før trinn 21)
insert into public.churches (id, name) values ('14141414-0000-4000-8000-000000000014', 'Testmenighet V'), ('15151515-0000-4000-8000-000000000015', 'Testmenighet W');
alter table public.churches disable trigger churches_quota_class;
update public.churches set storage_quota_mb = 1024, quota_custom = false where id = '14141414-0000-4000-8000-000000000014';   -- 1024 fra en tidligere godkjenning
update public.churches set storage_quota_mb = 200, quota_custom = true where id = '15151515-0000-4000-8000-000000000015';
alter table public.churches enable trigger churches_quota_class;
select ch_test.atleast('Migrering: klassifiseringen finner menighetene med feil merke', $q$select 1 where app.classify_church_quotas() >= 2$q$, 1);
select ch_test.cnt('Migrering: 1024 MB er bevart og merket som egen kvote', $q$select 1 from public.churches where id = '14141414-0000-4000-8000-000000000014' and storage_quota_mb = 1024 and quota_custom$q$, 1);
select ch_test.cnt('Migrering: 200 MB er standard', $q$select 1 from public.churches where id = '15151515-0000-4000-8000-000000000015' and storage_quota_mb = 200 and not quota_custom$q$, 1);
select ch_test.cnt('Migrering: ingen kvote er endret, og klassifiseringen er loggført', $q$select 1 from public.audit_logs where action = 'churches.quota' and church_id = '14141414-0000-4000-8000-000000000014' and meta ->> 'old_mb' = '1024' and meta ->> 'new_mb' = '1024' and meta ->> 'reason' = 'klassifisert som egen kvote (trinn 21)'$q$, 1);
select ch_test.cnt('Migrering: trygg å kjøre på nytt (ingen endringer)', $q$select 1 where app.classify_church_quotas() = 0$q$, 1);

-- Tilgang: bare Developer med MFA
set local role anon;
select ch_test.err('Plan: ikke innlogget kan ikke endre plan', $q$select public.update_plan('standard', 2048, null, false)$q$, '42501');
select ch_test.err('Kvote: ikke innlogget kan ikke tilbakestille', $q$select public.reset_church_quota('dddddddd-0000-4000-8000-00000000000d')$q$, '42501');
set local role authenticated;
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-1","aal":"aal1"}';
select ch_test.err('Plan: Developer uten MFA kan ikke endre plan', $q$select public.update_plan('standard', 2048, null, false)$q$, '42501');
select ch_test.err('Kvote: Developer uten MFA kan ikke sette egen kvote', $q$select public.set_church_quota('dddddddd-0000-4000-8000-00000000000d', 1500)$q$, '42501');
select ch_test.err('Kvote: Developer uten MFA kan ikke tilbakestille', $q$select public.reset_church_quota('dddddddd-0000-4000-8000-00000000000d')$q$, '42501');
select ch_test.err('Kvote: Developer uten MFA får ikke kvoteoversikten', $q$select * from public.church_quota_overview()$q$, '42501');
select ch_test.err('Plan: Developer uten MFA får ikke planenes lagring', $q$select * from public.plans_admin()$q$, '42501');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-2","aal":"aal2"}';
select ch_test.ok_rb('Plan: Moderator kan endre plan', $q$select public.update_plan('standard', 2048, null, false)$q$);
select ch_test.ok_rb('Kvote: Moderator kan sette egen kvote', $q$select public.set_church_quota('dddddddd-0000-4000-8000-00000000000d', 1500)$q$);
select ch_test.ok_rb('Kvote: Moderator kan tilbakestille', $q$select public.reset_church_quota('dddddddd-0000-4000-8000-00000000000d')$q$);
select ch_test.ok('Kvote: Moderator får kvoteoversikten', $q$select * from public.church_quota_overview()$q$);
select ch_test.ok('Plan: Moderator får planenes lagring', $q$select * from public.plans_admin()$q$);
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-3","aal":"aal1"}';
select ch_test.err('Plan: Admin kan ikke endre plan', $q$select public.update_plan('standard', 2048, null, false)$q$, '42501');
select ch_test.err('Kvote: Admin kan ikke sette kvote for egen menighet', $q$select public.set_church_quota('aaaaaaaa-0000-4000-8000-00000000000a', 9000)$q$, '42501');
select ch_test.err('Kvote: Admin kan ikke tilbakestille', $q$select public.reset_church_quota('aaaaaaaa-0000-4000-8000-00000000000a')$q$, '42501');
select ch_test.err('Kvote: Admin får ikke kvoteoversikten for alle', $q$select * from public.church_quota_overview()$q$, '42501');
select ch_test.err('Kvote: Admin kan ikke skrive kvoten direkte', $q$update public.churches set storage_quota_mb = 9000 where id = 'aaaaaaaa-0000-4000-8000-00000000000a'$q$, '42501');
select ch_test.err('Kvote: Admin kan ikke skrive merket direkte', $q$update public.churches set quota_custom = true where id = 'aaaaaaaa-0000-4000-8000-00000000000a'$q$, '42501');
select ch_test.err('Plan: Admin ser ikke planenes lagring', $q$select storage_quota_mb from public.plans$q$, '42501');
select ch_test.err('Plan: Admin får ikke planenes lagring via funksjonen', $q$select * from public.plans_admin()$q$, '42501');
select ch_test.cnt('Plan: Admin ser plannavn og pris', $q$select code, name, price_nok_month from public.plans where code in ('gratis', 'standard', 'utvidet')$q$, 3);
select ch_test.cnt('Kvote: Admin ser egen menighets faktiske kvote og merke', $q$select storage_quota_mb, quota_custom from public.churches where id = 'aaaaaaaa-0000-4000-8000-00000000000a'$q$, 1);
select ch_test.cnt('Kvote: Admin får brukt og tildelt plass for egen menighet', $q$select 1 where (public.storage_usage('aaaaaaaa-0000-4000-8000-00000000000a') ->> 'quota_bytes')::bigint = 200 * 1048576$q$, 1);
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-8","aal":"aal1"}';
select ch_test.err('Plan: User kan ikke endre plan', $q$select public.update_plan('standard', 2048, null, false)$q$, '42501');
select ch_test.err('Kvote: User kan ikke sette kvote', $q$select public.set_church_quota('aaaaaaaa-0000-4000-8000-00000000000a', 9000)$q$, '42501');
select ch_test.err('Kvote: User kan ikke tilbakestille', $q$select public.reset_church_quota('aaaaaaaa-0000-4000-8000-00000000000a')$q$, '42501');
select ch_test.err('Kvote: User får ikke kvoteoversikten', $q$select * from public.church_quota_overview()$q$, '42501');
select ch_test.err('Plan: User ser ikke planenes lagring', $q$select storage_quota_mb from public.plans$q$, '42501');
select ch_test.cnt('Kvote: User ser egen menighets faktiske kvote', $q$select storage_quota_mb from public.churches where id = 'aaaaaaaa-0000-4000-8000-00000000000a'$q$, 1);
select ch_test.cnt('Kvote: User ser ikke kvoten til andre menigheter', $q$select 1 from public.churches where id = 'dddddddd-0000-4000-8000-00000000000d'$q$, 0);
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-1","aal":"aal2"}';
select ch_test.err('Stengt: «Følg planen igjen» kan ikke brukes, heller ikke av Developer', $q$select public.follow_plan_quota('dddddddd-0000-4000-8000-00000000000d')$q$, '42501');
select ch_test.err('Stengt: forhåndsvisning av planendring kan ikke brukes', $q$select * from public.plan_change_preview('standard', 2048)$q$, '42501');
select ch_test.err('Plan: direkte endring av plans avvises også for Developer', $q$update public.plans set storage_quota_mb = 1 where code = 'standard'$q$, '42501');
select ch_test.err('Plan: direkte innsetting i plans avvises', $q$insert into public.plans (code, name, storage_quota_mb) values ('hack', 'Hack', 1)$q$, '42501');
select ch_test.err('Plan: direkte sletting i plans avvises', $q$delete from public.plans where code = 'gratis'$q$, '42501');
select ch_test.err('Kvote: direkte endring av menighetens kvote avvises også for Developer', $q$update public.churches set storage_quota_mb = 5 where id = 'aaaaaaaa-0000-4000-8000-00000000000a'$q$, '42501');
select ch_test.err('Plan: kvote under 0 avvises', $q$select public.update_plan('standard', -1, null, false)$q$, '22023');
select ch_test.err('Plan: kvote over 10240 MB avvises', $q$select public.update_plan('standard', 10241, null, false)$q$, '22023');
select ch_test.err('Plan: negativ pris avvises', $q$select public.update_plan('standard', 1024, -5, false)$q$, '22023');
select ch_test.err('Plan: ukjent plan avvises', $q$select public.update_plan('finnesikke', 1024, null, false)$q$, '22023');
select ch_test.err('Kvote: egen kvote over 10240 MB avvises', $q$select public.set_church_quota('dddddddd-0000-4000-8000-00000000000d', 20000)$q$, '22023');
select ch_test.err('Kvote: negativ kvote avvises', $q$select public.set_church_quota('dddddddd-0000-4000-8000-00000000000d', -1)$q$, '22023');
select ch_test.err('Kvote: ukjent menighet avvises', $q$select public.reset_church_quota('99999999-9999-4999-8999-999999999999')$q$, '22023');
select ch_test.cnt('Plan: Developer ser planenes veiledende lagring (alle planer, med verdiene i databasen)', $q$select 1 where (select count(*) from public.plans_admin() a join t21p p on p.code = a.code and p.storage_quota_mb = a.storage_quota_mb) = (select count(*) from t21p) and (select count(*) from t21p) >= 3$q$, 1);
select ch_test.atleast('Kvote: Developer ser faktisk kvote, merke og brukt plass for alle menigheter', $q$select 1 from public.church_quota_overview() o where (o.church_id = 'aaaaaaaa-0000-4000-8000-00000000000a' and o.storage_quota_mb = 200 and not o.quota_custom and o.used_bytes > 0) or (o.church_id = 'dddddddd-0000-4000-8000-00000000000d' and o.quota_custom and o.used_bytes = 0)$q$, 2);

-- Egen kvote per menighet
select ch_test.ok('Kvote: Developer gir Q egen kvote 1500 MB', $q$select public.set_church_quota('dddddddd-0000-4000-8000-00000000000d', 1500)$q$);
set local role postgres;
select ch_test.cnt('Kvote: Q har 1500 MB som egen kvote', $q$select 1 from public.churches where id = 'dddddddd-0000-4000-8000-00000000000d' and storage_quota_mb = 1500 and quota_custom$q$, 1);
select ch_test.cnt('Kvote: egen kvote er loggført med gammel og ny verdi og hvem', $q$select 1 from public.audit_logs where action = 'churches.quota' and church_id = 'dddddddd-0000-4000-8000-00000000000d' and meta ->> 'old_mb' = '1024' and meta ->> 'new_mb' = '1500' and meta ->> 'reason' = 'egen kvote' and actor_user_id = '00000000-0000-4000-8000-000000000001'$q$, 1);
select ch_test.cnt('Kvote: én menighets egen kvote påvirker ikke de andre', $q$select 1 from public.churches where (id, storage_quota_mb) in (('aaaaaaaa-0000-4000-8000-00000000000a', 200), ('eeeeeeee-0000-4000-8000-00000000000e', 200), ('ffffffff-0000-4000-8000-00000000000f', 200), ('12121212-0000-4000-8000-000000000012', 999), ('13131313-0000-4000-8000-000000000013', 200))$q$, 5);
set local role authenticated;
select ch_test.ok('Kvote: egen kvote under 200 MB er lov (R får 50 MB)', $q$select public.set_church_quota('eeeeeeee-0000-4000-8000-00000000000e', 50)$q$);
select ch_test.ok('Kvote: 200 MB satt som verdi gir standard (R)', $q$select public.set_church_quota('eeeeeeee-0000-4000-8000-00000000000e', 200)$q$);
set local role postgres;
select ch_test.cnt('Kvote: R er standard igjen og loggført som «standard»', $q$select 1 from public.churches c where c.id = 'eeeeeeee-0000-4000-8000-00000000000e' and c.storage_quota_mb = 200 and not c.quota_custom and exists (select 1 from public.audit_logs l where l.action = 'churches.quota' and l.church_id = c.id and l.meta ->> 'reason' = 'standard' and l.meta ->> 'old_mb' = '50')$q$, 1);
set local role authenticated;
select ch_test.cnt('Tilbakestill: Q får standard 200 MB', $q$select 1 where public.reset_church_quota('dddddddd-0000-4000-8000-00000000000d') = 200$q$, 1);
set local role postgres;
select ch_test.cnt('Tilbakestill: Q har 200 MB uten egen kvote, og det er loggført', $q$select 1 from public.churches c where c.id = 'dddddddd-0000-4000-8000-00000000000d' and c.storage_quota_mb = 200 and not c.quota_custom and exists (select 1 from public.audit_logs l where l.action = 'churches.quota' and l.church_id = c.id and l.meta ->> 'reason' = 'tilbakestilt til standard' and l.meta ->> 'old_mb' = '1500' and l.meta ->> 'new_mb' = '200' and l.actor_user_id = '00000000-0000-4000-8000-000000000001')$q$, 1);
set local role authenticated;

-- Planendring endrer aldri menighetenes kvote (heller ikke når en eldre klient ber om det)
select ch_test.ok('Kvote: Developer gir Q egen kvote 1024 MB igjen', $q$select public.set_church_quota('dddddddd-0000-4000-8000-00000000000d', 1024)$q$);
select ch_test.cnt('Plan: Developer endrer Standard til 2048 MB – ingen menigheter oppdateres', $q$select 1 where (public.update_plan('standard', 2048, null, true) ->> 'churches_updated') = '0'$q$, 1);
set local role postgres;
select ch_test.cnt('Plan: planen har ny veiledende lagring', $q$select 1 from public.plans where code = 'standard' and storage_quota_mb = 2048$q$, 1);
select ch_test.cnt('Plan: menighetene på Standard har uendret kvote (A, Q, R, S, T)', $q$select 1 from public.churches where (id, storage_quota_mb) in (('aaaaaaaa-0000-4000-8000-00000000000a', 200), ('dddddddd-0000-4000-8000-00000000000d', 1024), ('eeeeeeee-0000-4000-8000-00000000000e', 200), ('ffffffff-0000-4000-8000-00000000000f', 200), ('12121212-0000-4000-8000-000000000012', 999))$q$, 5);
select ch_test.cnt('Plan: planendringen er loggført med gammel og ny verdi og hvem', $q$select 1 from public.audit_logs where action = 'plans.update' and target_id = 'standard' and meta -> 'old' ->> 'quota_mb' = (select storage_quota_mb::text from t21p where code = 'standard') and meta -> 'new' ->> 'quota_mb' = '2048' and meta ->> 'churches_updated' = '0' and actor_user_id = '00000000-0000-4000-8000-000000000001'$q$, 1);
select ch_test.cnt('Plan: ingen kvoteendring er loggført av planendringen', $q$select 1 from public.audit_logs where action = 'churches.quota' and meta ->> 'reason' like 'plan %' and church_id in ('aaaaaaaa-0000-4000-8000-00000000000a', 'bbbbbbbb-0000-4000-8000-00000000000b', 'dddddddd-0000-4000-8000-00000000000d', 'eeeeeeee-0000-4000-8000-00000000000e', 'ffffffff-0000-4000-8000-00000000000f', '12121212-0000-4000-8000-000000000012', '13131313-0000-4000-8000-000000000013')$q$, 0);   -- bare testmenighetene (ekte logger i dev telles ikke)
select ch_test.err('Plan: loggen kan ikke endres', $q$update public.audit_logs set meta = '{}' where action = 'plans.update'$q$, '42501');
set local role authenticated;
select ch_test.cnt('Plan: Gratis-planen endrer heller ingen menigheter', $q$select 1 where (public.update_plan('gratis', 300, 0, true) ->> 'churches_updated') = '0'$q$, 1);
set local role postgres;
select ch_test.cnt('Plan: B og U beholder standard 200 MB', $q$select 1 from public.churches where id in ('bbbbbbbb-0000-4000-8000-00000000000b', '13131313-0000-4000-8000-000000000013') and storage_quota_mb = 200 and not quota_custom$q$, 2);
set local role authenticated;
select ch_test.ok('Pris: Developer setter pris for Utvidet', $q$select public.update_plan('utvidet', (select storage_quota_mb from t21p where code = 'utvidet'), 990, false)$q$);
set local role postgres;
select ch_test.cnt('Pris: ny pris er lagret, veiledende lagring er uendret', $q$select 1 from public.plans p join t21p s on s.code = p.code where p.code = 'utvidet' and p.price_nok_month = 990 and p.storage_quota_mb = s.storage_quota_mb$q$, 1);
set local role authenticated;
select ch_test.ok('Pris: tom pris («Avtales») er lov', $q$select public.update_plan('utvidet', (select storage_quota_mb from t21p where code = 'utvidet'), null, false)$q$);
select ch_test.ok('Plan: Developer setter Standard tilbake til startverdiene', $q$select public.update_plan('standard', (select storage_quota_mb from t21p where code = 'standard'), (select price_nok_month from t21p where code = 'standard'), false)$q$);

-- Godkjenning av abonnement endrer ikke kvoten (verken standard eller egen kvote)
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-5","aal":"aal1"}';
select ch_test.ok('Godkjenning: Admin i B ber om Utvidet', $q$select public.request_subscription('bbbbbbbb-0000-4000-8000-00000000000b', 'utvidet', false, 'Test')$q$);
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-1","aal":"aal2"}';
select ch_test.ok('Godkjenning: Developer godkjenner Utvidet for B', $q$select public.decide_subscription_request((select id from public.subscription_requests where status = 'pending' and church_id = 'bbbbbbbb-0000-4000-8000-00000000000b'), true, 'ok')$q$);
set local role postgres;
select ch_test.cnt('Godkjenning: B har Utvidet, men fortsatt standard 200 MB', $q$select 1 from public.churches c join public.church_subscriptions s on s.church_id = c.id where c.id = 'bbbbbbbb-0000-4000-8000-00000000000b' and s.plan = 'utvidet' and s.status = 'active' and c.storage_quota_mb = 200 and not c.quota_custom$q$, 1);
select ch_test.cnt('Godkjenning: A (godkjent tidligere i testen) har fortsatt 200 MB', $q$select 1 from public.churches where id = 'aaaaaaaa-0000-4000-8000-00000000000a' and storage_quota_mb = 200 and not quota_custom$q$, 1);
select ch_test.cnt('Godkjenning: ingen kvoteendring er loggført ved godkjenning', $q$select 1 from public.audit_logs where action = 'churches.quota' and meta ->> 'reason' like 'abonnement%' and church_id in ('aaaaaaaa-0000-4000-8000-00000000000a', 'bbbbbbbb-0000-4000-8000-00000000000b')$q$, 0);   -- bare testmenighetene (ekte logger i dev telles ikke)
set local role authenticated;
select ch_test.ok('Godkjenning: Developer gir B egen kvote 777 MB', $q$select public.set_church_quota('bbbbbbbb-0000-4000-8000-00000000000b', 777)$q$);
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-5","aal":"aal1"}';
select ch_test.ok('Godkjenning: Admin i B ber om Standard', $q$select public.request_subscription('bbbbbbbb-0000-4000-8000-00000000000b', 'standard', true, 'Test 2')$q$);
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-1","aal":"aal2"}';
select ch_test.ok('Godkjenning: Developer godkjenner Standard for B', $q$select public.decide_subscription_request((select id from public.subscription_requests where status = 'pending' and church_id = 'bbbbbbbb-0000-4000-8000-00000000000b'), true, 'ok')$q$);
set local role postgres;
select ch_test.cnt('Godkjenning: egen kvote (777 MB) er uendret', $q$select 1 from public.churches where id = 'bbbbbbbb-0000-4000-8000-00000000000b' and storage_quota_mb = 777 and quota_custom$q$, 1);
set local role authenticated;
select ch_test.ok('Godkjenning: B tilbakestilles til standard', $q$select public.reset_church_quota('bbbbbbbb-0000-4000-8000-00000000000b')$q$);

-- Opplastingssperren bruker den faktiske kvoten, ikke planen (A har Standard med veiledende 1024 MB)
select ch_test.ok('Sperre: Developer gir A egen kvote 0 MB', $q$select public.set_church_quota('aaaaaaaa-0000-4000-8000-00000000000a', 0)$q$);
set local role postgres;
select ch_test.cnt('Sperre: ingen filer i A er slettet', $q$select 1 from public.files where church_id = 'aaaaaaaa-0000-4000-8000-00000000000a' having count(*) = (select a_files from t19)$q$, 1);
set local role authenticated;
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-8","aal":"aal1"}';
select ch_test.err('Sperre: ny opplasting stoppes av faktisk kvote, selv om planen er 1024 MB', $q$select public.can_upload('aaaaaaaa-0000-4000-8000-00000000000a', 'bilder', false, 10)$q$, '54000');
select ch_test.atleast('Sperre: nedlasting virker fortsatt', $q$select 1 from public.file_keys(array(select id from public.files where file_name = 'ny.png'))$q$, 1);
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-1","aal":"aal2"}';
select ch_test.ok('Sperre: Developer tilbakestiller A til standard', $q$select public.reset_church_quota('aaaaaaaa-0000-4000-8000-00000000000a')$q$);
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-8","aal":"aal1"}';
select ch_test.ok('Sperre: opplasting virker igjen innenfor 200 MB', $q$select public.can_upload('aaaaaaaa-0000-4000-8000-00000000000a', 'bilder', false, 10)$q$);
set local role postgres;
insert into public.files (church_id, storage_key, file_name, mime_type, file_size)   -- 3 × 50 MB + 49 MB = 199 MB
  select 'aaaaaaaa-0000-4000-8000-00000000000a', 'test/stor-' || g || '.png', 'stor.png', 'image/png', case when g < 4 then 50 else 49 end * 1048576 from generate_series(1, 4) g;
set local role authenticated;
select ch_test.err('Sperre: 199 MB brukt + 2 MB stoppes ved standard 200 MB, ikke ved planens 1024 MB', $q$select public.can_upload('aaaaaaaa-0000-4000-8000-00000000000a', 'bilder', false, 2097152)$q$, '54000');
set local role postgres;
delete from public.files where storage_key like 'test/stor-%';
set local role postgres;
update public.plans p set storage_quota_mb = s.storage_quota_mb, price_nok_month = s.price_nok_month from t21p s where s.code = p.code;   -- startverdiene (rulles uansett tilbake)
set local role authenticated;

-- ---------- Samlet lagringsgrense (trinn 20): sperre for hele ConnectHub, egen feilkode 53100, bare Developer endrer ----------
set local role postgres;
create temp table t20 as select (select total_limit_mb from public.storage_settings where id) start_mb;
grant select on t20 to authenticated;
select ch_test.cnt('Samlet: grensen finnes (én rad, gyldig verdi)', $q$select 1 from public.storage_settings where id and total_limit_mb between 1 and 1048576$q$, 1);
insert into public.files (church_id, storage_key, file_name, mime_type, file_size, uploaded_by, folder, visibility) values
  ('aaaaaaaa-0000-4000-8000-00000000000a', 'test/t20-delt.png', 't20-delt.png', 'image/png', 10, '00000000-0000-4000-8000-000000000008', 'bilder', 'church');

-- Tilgang: bare Developer med MFA
set local role anon;
select ch_test.err('Samlet: ikke innlogget kan ikke endre grensen', $q$select public.set_storage_limit(10)$q$, '42501');
select ch_test.err('Samlet: ikke innlogget får ikke oversikten', $q$select public.storage_overview()$q$, '42501');
set local role authenticated;
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-8","aal":"aal1"}';
select ch_test.err('Samlet: User kan ikke endre grensen', $q$select public.set_storage_limit(10)$q$, '42501');
select ch_test.err('Samlet: User får ikke oversikten', $q$select public.storage_overview()$q$, '42501');
select ch_test.err('Samlet: User kan ikke lese innstillingen direkte', $q$select total_limit_mb from public.storage_settings$q$, '42501');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-3","aal":"aal1"}';
select ch_test.err('Samlet: Admin kan ikke endre grensen', $q$select public.set_storage_limit(10)$q$, '42501');
select ch_test.err('Samlet: Admin får ikke oversikten', $q$select public.storage_overview()$q$, '42501');
select ch_test.err('Samlet: Admin kan ikke skrive innstillingen direkte', $q$update public.storage_settings set total_limit_mb = 5$q$, '42501');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-2","aal":"aal2"}';
select ch_test.ok_rb('Samlet: Moderator kan endre grensen', $q$select public.set_storage_limit(10)$q$);
select ch_test.ok('Samlet: Moderator får oversikten', $q$select public.storage_overview()$q$);
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-1","aal":"aal1"}';
select ch_test.err('Samlet: Developer uten MFA kan ikke endre grensen', $q$select public.set_storage_limit(10)$q$, '42501');
select ch_test.err('Samlet: Developer uten MFA får ikke oversikten', $q$select public.storage_overview()$q$, '42501');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-1","aal":"aal2"}';
select ch_test.err('Samlet: grense 0 avvises', $q$select public.set_storage_limit(0)$q$, '22023');
select ch_test.err('Samlet: grense over 1 TB avvises', $q$select public.set_storage_limit(1048577)$q$, '22023');
select ch_test.cnt('Samlet: Developer ser grense, bruk og summen av kvotene (overbooking)', $q$select 1 where (public.storage_overview() ->> 'limit_mb')::int = (select start_mb from t20) and (public.storage_overview() ->> 'used_bytes')::bigint > 0 and (public.storage_overview() ->> 'quota_sum_mb')::int >= 200$q$, 1);
select ch_test.ok('Samlet: Developer setter grensen til 1 MB', $q$select public.set_storage_limit(1)$q$);
set local role postgres;
select ch_test.cnt('Samlet: endringen er loggført med gammel og ny verdi og hvem', $q$select 1 from public.audit_logs where action = 'storage.limit' and meta ->> 'old_mb' = (select start_mb::text from t20) and meta ->> 'new_mb' = '1' and actor_user_id = '00000000-0000-4000-8000-000000000001'$q$, 1);

-- Full samlet plass, men ledig kvote i menigheten
insert into public.files (church_id, storage_key, file_name, mime_type, file_size, folder, visibility)
  select '13131313-0000-4000-8000-000000000013', 'test/t20-fyll.png', 'fyll.png', 'image/png', greatest(1, 1048576 - (select coalesce(sum(file_size), 0) from public.files)), 'bilder', 'church';
set local role authenticated;
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-8","aal":"aal1"}';
select ch_test.cnt('Samlet: medlemmet ser at ledig samlet plass er 0', $q$select 1 where (public.storage_usage('aaaaaaaa-0000-4000-8000-00000000000a') ->> 'system_free_bytes')::bigint = 0$q$, 1);
select ch_test.cnt('Samlet: menigheten har fortsatt ledig kvote', $q$select 1 where (public.storage_usage('aaaaaaaa-0000-4000-8000-00000000000a') ->> 'used_bytes')::bigint < (public.storage_usage('aaaaaaaa-0000-4000-8000-00000000000a') ->> 'quota_bytes')::bigint$q$, 1);
select ch_test.err('Samlet: opplasting stoppes med storage_full (53100) når samlet plass er full', $q$select public.can_upload('aaaaaaaa-0000-4000-8000-00000000000a', 'bilder', false, 10)$q$, '53100');
select ch_test.err('Samlet: kopi til Samarbeidsfiler stoppes også', $q$select public.can_transfer((select id from public.files where file_name = 't20-delt.png'), (select ab from t18))$q$, '53100');
select ch_test.atleast('Samlet: nedlasting virker fortsatt', $q$select 1 from public.file_keys(array(select id from public.files where file_name = 'ny.png'))$q$, 1);
set local role postgres;
update public.churches set storage_quota_mb = 0 where id = 'aaaaaaaa-0000-4000-8000-00000000000a';
set local role authenticated;
select ch_test.err('Samlet: menighetens kvote kontrolleres først (54000)', $q$select public.can_upload('aaaaaaaa-0000-4000-8000-00000000000a', 'bilder', false, 10)$q$, '54000');
set local role postgres;
update public.churches set storage_quota_mb = 200 where id = 'aaaaaaaa-0000-4000-8000-00000000000a';
do $$ begin if exists (select 1 from pg_roles where rolname = 'service_role') then execute 'set local role service_role'; end if; end $$;
select ch_test.err('Samlet: serveren kan heller ikke registrere filen', $q$select public.register_file('https://test.invalid/auth/v1', 'sub-8', 'aaaaaaaa-0000-4000-8000-00000000000a', 'bilder', false, 'test/t20-x.png', 'x.png', 'image/png', 10, null)$q$, '53100');
set local role postgres;
select ch_test.cnt('Samlet: ingen rad er opprettet', $q$select 1 from public.files where storage_key = 'test/t20-x.png'$q$, 0);

-- Sletting frigjør plass
delete from public.files where storage_key = 'test/t20-fyll.png';
set local role authenticated;
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-8","aal":"aal1"}';
select ch_test.ok('Samlet: opplasting virker igjen når det er plass', $q$select public.can_upload('aaaaaaaa-0000-4000-8000-00000000000a', 'bilder', false, 10)$q$);

-- Varsel til Developer når 80 % passeres
set local role postgres;
insert into public.files (church_id, storage_key, file_name, mime_type, file_size, folder, visibility)
  select '13131313-0000-4000-8000-000000000013', 'test/t20-fyll2.png', 'fyll2.png', 'image/png', greatest(1, 828375 - (select coalesce(sum(file_size), 0) from public.files)), 'bilder', 'church';
do $$ begin if exists (select 1 from pg_roles where rolname = 'service_role') then execute 'set local role service_role'; end if; end $$;
select ch_test.ok('Samlet: serveren registrerer en fil som passerer 80 %', $q$select public.register_file('https://test.invalid/auth/v1', 'sub-8', 'aaaaaaaa-0000-4000-8000-00000000000a', 'bilder', false, 'test/t20-y.png', 'y.png', 'image/png', 20972, null)$q$);
set local role postgres;
select ch_test.cnt('Samlet: Developer fikk varsel om 80 %', $q$select 1 from public.notifications where kind = 'storage' and user_id = '00000000-0000-4000-8000-000000000001' and title like '%80 %%'$q$, 1);
select ch_test.cnt('Samlet: andre roller fikk ikke varsel', $q$select 1 from public.notifications where kind = 'storage' and user_id in ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000008')$q$, 0);
delete from public.files where storage_key in ('test/t20-fyll2.png', 'test/t20-y.png', 'test/t20-delt.png');
update public.storage_settings set total_limit_mb = (select start_mb from t20) where id;   -- startverdien (rulles uansett tilbake)
set local role authenticated;

-- ---------- Tilbakemeldinger (trinn 8): alle innloggede sender inn; bare Moderator og Developer (MFA) leser og behandler ----------
set local role anon;
select ch_test.err('Tilbakemelding: ikke innlogget kan ikke sende inn', $q$select public.submit_feedback('bug', null, 'RLS-test anon', '{}', 'photo-design', 'Photo Design', '/photo-design.dc.html', null, null, '{}', null)$q$, '42501');
select ch_test.err('Tilbakemelding: ikke innlogget får ikke innboksen', $q$select * from public.feedback_list()$q$, '42501');
set local role authenticated;
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-8","aal":"aal1"}';
select ch_test.ok('Tilbakemelding: User sender inn en feil (med menighet A)', $q$select public.submit_feedback('bug', 'Knappen virker ikke', 'RLS-test feil: eksport stopper', '{"expected":"PNG lastes ned","steps":"1. Åpne 2. Eksporter","severity":"high","ukjent":"x","importance":"tull"}', 'photo-design', 'Photo Design', '/photo-design.dc.html', '#/editor/:id', '{"mode":"element","rect":{"x":10,"y":20,"w":30,"h":5}}', '{"env":"local","build":"test"}', 'aaaaaaaa-0000-4000-8000-00000000000a')$q$);
select ch_test.ok('Tilbakemelding: User foreslår en forbedring', $q$select public.submit_feedback('improvement', null, 'RLS-test forbedring', '{"improve":"Større knapper","importance":"medium"}', 'media-lab', 'Media Lab', '/media-lab.dc.html', null, null, '{}', null)$q$);
select ch_test.ok('Tilbakemelding: User foreslår en ny funksjon (menighet B – ikke medlem)', $q$select public.submit_feedback('feature', null, 'RLS-test ny funksjon', '{"feature":"Mørk modus i eksport"}', 'mockups', 'Mockups', '/mockups.dc.html', null, null, '{}', 'bbbbbbbb-0000-4000-8000-00000000000b')$q$);
select ch_test.ok('Tilbakemelding: hemmeligheter og personopplysninger renses', $q$select public.submit_feedback('other', null, 'RLS-test hemmelig eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abcdefghijklmnop sb_secret_abcdefghij1234 ola.nordmann@example.com passord: Hemmelig123 ring 912 34 567 Bearer abcdefghijklmnopqrstuv', '{}', 'connecthub-admin', 'ConnectHub Admin', '/connecthub-admin.dc.html', null, null, '{"url":"/login.dc.html?token=abc123hemmelig&x=1","error":"feilkode: 500"}', null)$q$);
select ch_test.err('Tilbakemelding: ukjent kategori avvises', $q$select public.submit_feedback('spam', null, 'RLS-test', '{}', null, null, null, null, null, '{}', null)$q$, '22023');
select ch_test.err('Tilbakemelding: for kort beskrivelse avvises', $q$select public.submit_feedback('bug', null, ' x ', '{}', null, null, null, null, null, '{}', null)$q$, '22023');
select ch_test.err('Tilbakemelding: ugyldig applikasjons-ID avvises', $q$select public.submit_feedback('bug', null, 'RLS-test app', '{}', '../etc', null, null, null, null, '{}', null)$q$, '22023');
select ch_test.err('Tilbakemelding: User får ikke innboksen', $q$select * from public.feedback_list()$q$, '42501');
select ch_test.err('Tilbakemelding: User kan ikke lese tabellen direkte', $q$select id from public.feedback$q$, '42501');
select ch_test.err('Tilbakemelding: User kan ikke skrive direkte', $q$insert into public.feedback (ref, kind, description) values ('TB-HACK', 'bug', 'hack')$q$, '42501');
select ch_test.err('Tilbakemelding: User kan ikke endre status', $q$select public.set_feedback_status((select id from public.feedback limit 1), 'resolved', null)$q$, '42501');
select ch_test.err('Tilbakemelding: User kan ikke skrive notat', $q$select public.add_feedback_note(gen_random_uuid(), 'x')$q$, '42501');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-3","aal":"aal1"}';
select ch_test.ok('Tilbakemelding: Admin kan sende inn', $q$select public.submit_feedback('bug', null, 'RLS-test fra admin', '{}', 'connecthub-admin', 'ConnectHub Admin', '/connecthub-admin.dc.html', '#/filer', null, '{}', 'aaaaaaaa-0000-4000-8000-00000000000a')$q$);
select ch_test.err('Tilbakemelding: Admin får ikke innboksen', $q$select * from public.feedback_list()$q$, '42501');
select ch_test.err('Tilbakemelding: Admin får ikke hendelsene', $q$select * from public.feedback_events_for(gen_random_uuid())$q$, '42501');
select ch_test.err('Tilbakemelding: Admin kan ikke lese tabellen direkte', $q$select id from public.feedback$q$, '42501');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-7","aal":"aal1"}';
select ch_test.err('Tilbakemelding: deaktivert bruker kan ikke sende inn', $q$select public.submit_feedback('bug', null, 'RLS-test deaktivert', '{}', null, null, null, null, null, '{}', null)$q$, '42501');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-2","aal":"aal1"}';
select ch_test.err('Tilbakemelding: Moderator uten MFA får ikke innboksen', $q$select * from public.feedback_list()$q$, '42501');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-1","aal":"aal1"}';
select ch_test.err('Tilbakemelding: Developer uten MFA får ikke innboksen', $q$select * from public.feedback_list()$q$, '42501');

-- Lagret innhold (som eier)
set local role postgres;
select ch_test.cnt('Tilbakemelding: lagret med referanse, rolle og menighet (bare når medlem)', $q$select 1 from public.feedback where description = 'RLS-test feil: eksport stopper' and ref ~ '^TB-[0-9A-F]{6}$' and role = 'user' and church_id = 'aaaaaaaa-0000-4000-8000-00000000000a' and status = 'new' and created_by = '00000000-0000-4000-8000-000000000008'$q$, 1);
select ch_test.cnt('Tilbakemelding: menighet som brukeren ikke er medlem av, lagres ikke', $q$select 1 from public.feedback where description = 'RLS-test ny funksjon' and church_id is null$q$, 1);
select ch_test.cnt('Tilbakemelding: bare kjente svarfelt og gyldige verdier lagres', $q$select 1 from public.feedback where description = 'RLS-test feil: eksport stopper' and answers = '{"expected":"PNG lastes ned","steps":"1. Åpne 2. Eksporter","severity":"high"}'::jsonb$q$, 1);
select ch_test.cnt('Tilbakemelding: token, nøkkel, e-post, passord, telefon og Bearer er fjernet', $q$select 1 from public.feedback where description like 'RLS-test hemmelig%' and description !~ '(eyJhbGci|sb_secret_|ola\.nordmann|Hemmelig123|912 34 567|abcdefghijklmnopqrstuv)' and description like '%[fjernet: token]%' and description like '%[e-post fjernet]%' and description like '%[telefon fjernet]%'$q$, 1);
select ch_test.cnt('Tilbakemelding: hemmelige adresseparametere fjernes i teknisk kontekst, feilkoder beholdes', $q$select 1 from public.feedback where description like 'RLS-test hemmelig%' and context ->> 'url' = '/login.dc.html?token=[fjernet]&x=1' and context ->> 'error' = 'feilkode: 500'$q$, 1);
select ch_test.cnt('Tilbakemelding: Admin-rollen registreres', $q$select 1 from public.feedback where description = 'RLS-test fra admin' and role = 'admin'$q$, 1);
select ch_test.atleast('Tilbakemelding: opprettelse loggføres uten innhold', $q$select 1 from public.audit_logs where action = 'feedback.create' and meta ? 'ref' and not meta ? 'description'$q$, 5);
create temp table t8 as select (select id from public.feedback where description = 'RLS-test feil: eksport stopper') bug_id;
grant select on t8 to authenticated;

-- Behandling (Moderator med MFA)
set local role authenticated;
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-2","aal":"aal2"}';
select ch_test.cnt('Tilbakemelding: Moderator ser innsendte saker med avsender og menighet', $q$select 1 from public.feedback_list() where description like 'RLS-test%' and submitter_name is not null$q$, 5);
select ch_test.cnt('Tilbakemelding: menighetens navn følger saken når avsender er medlem', $q$select 1 from public.feedback_list() where description = 'RLS-test feil: eksport stopper' and church_name = 'Testmenighet A'$q$, 1);
select ch_test.ok('Tilbakemelding: Moderator setter «Under behandling»', $q$select public.set_feedback_status((select bug_id from t8), 'in_progress', null)$q$);
select ch_test.err('Tilbakemelding: avvisning uten begrunnelse avvises', $q$select public.set_feedback_status((select bug_id from t8), 'rejected', ' ')$q$, '22023');
select ch_test.err('Tilbakemelding: ukjent status avvises', $q$select public.set_feedback_status((select bug_id from t8), 'slettet', null)$q$, '22023');
select ch_test.ok('Tilbakemelding: Moderator skriver internt notat', $q$select public.add_feedback_note((select bug_id from t8), 'Gjenskapt i Chrome. Kontakt ola@example.com')$q$);
select ch_test.err('Tilbakemelding: tomt notat avvises', $q$select public.add_feedback_note((select bug_id from t8), '   ')$q$, '22023');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-1","aal":"aal2"}';
select ch_test.ok('Tilbakemelding: Developer avviser med begrunnelse', $q$select public.set_feedback_status((select bug_id from t8), 'rejected', 'Duplikat av TB-000000')$q$);
select ch_test.cnt('Tilbakemelding: Developer ser historikken (status, notat, status)', $q$select 1 from public.feedback_events_for((select bug_id from t8))$q$, 3);
select ch_test.cnt('Tilbakemelding: statusendring lagrer gammel og ny status, hvem og begrunnelse', $q$select 1 from public.feedback_events_for((select bug_id from t8)) where kind = 'status' and old_status = 'in_progress' and new_status = 'rejected' and text = 'Duplikat av TB-000000' and actor_role = 'developer'$q$, 1);
select ch_test.cnt('Tilbakemelding: notatet er renset for e-post', $q$select 1 from public.feedback_events_for((select bug_id from t8)) where kind = 'note' and text like '%[e-post fjernet]%' and actor_role = 'moderator'$q$, 1);
select ch_test.cnt('Tilbakemelding: saken har ny status, begrunnelse og ett notat', $q$select 1 from public.feedback_list() where id = (select bug_id from t8) and status = 'rejected' and status_reason = 'Duplikat av TB-000000' and note_count = 1$q$, 1);
set local role postgres;
select ch_test.cnt('Tilbakemelding: statusendringer og notat er loggført', $q$select 1 from public.audit_logs where target_id = (select bug_id::text from t8) and action in ('feedback.status', 'feedback.note')$q$, 3);
select ch_test.err('Tilbakemelding: avvist uten begrunnelse stoppes også i tabellen', $q$update public.feedback set status_reason = null where id = (select bug_id from t8)$q$, '23514');

-- Grense mot misbruk: 20 per bruker per døgn
set local role authenticated;
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-9","aal":"aal1"}';
select ch_test.cnt('Tilbakemelding: 20 innsendinger samme døgn godtas', $q$select public.submit_feedback('other', null, 'RLS-test grense ' || g, '{}', null, null, null, null, null, '{}', null) from generate_series(1, 20) g$q$, 20);
select ch_test.err('Tilbakemelding: nummer 21 samme døgn avvises', $q$select public.submit_feedback('other', null, 'RLS-test grense 21', '{}', null, null, null, null, null, '{}', null)$q$, '54000');
set local role postgres;
set local role authenticated;

-- ---------- Menighetens livsløp (P10) ----------
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-3","aal":"aal1"}';
select ch_test.err('Livsløp: admin kan ikke endre status direkte', $q$update public.churches set status = 'deleted'$q$, '42501');
select ch_test.err('Livsløp: admin kan ikke bruke set_church_status', $q$select public.set_church_status('aaaaaaaa-0000-4000-8000-00000000000a', 'temporarily_disabled')$q$, '42501');
select ch_test.ok('Livsløp: admin kan eksportere egen menighet', $q$select public.export_church('aaaaaaaa-0000-4000-8000-00000000000a')$q$);
select ch_test.err('Livsløp: admin kan ikke eksportere annen menighet', $q$select public.export_church('bbbbbbbb-0000-4000-8000-00000000000b')$q$, '42501');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-2","aal":"aal2"}';
select ch_test.ok_rb('Livsløp: moderator kan endre menighetsstatus', $q$select public.set_church_status('bbbbbbbb-0000-4000-8000-00000000000b', 'temporarily_disabled')$q$);
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-1","aal":"aal2"}';
select ch_test.ok('Livsløp: Developer deaktiverer B midlertidig', $q$select public.set_church_status('bbbbbbbb-0000-4000-8000-00000000000b', 'temporarily_disabled')$q$);
select ch_test.err('Livsløp: ugyldig overgang avvises', $q$select public.set_church_status('bbbbbbbb-0000-4000-8000-00000000000b', 'deleted')$q$, '22023');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-5","aal":"aal1"}';
select ch_test.cnt('Livsløp: medlemmer i deaktivert menighet ser den ikke', $q$select 1 from public.churches$q$, 0);
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-1","aal":"aal2"}';
select ch_test.ok('Livsløp: Developer aktiverer B igjen', $q$select public.set_church_status('bbbbbbbb-0000-4000-8000-00000000000b', 'active')$q$);
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

-- ---------- Én menighet om gangen og fjerning av medlemskap (User/Admin) ----------
-- Egne fixturer: menighetene M1/M2 og brukerne 21 (User i M1), 22 (Admin i M1), 23 (User i M2), 24 (uten menighet).
set local role postgres;
insert into public.churches (id, name) values ('31313131-0000-4000-8000-000000000031', 'Testmenighet M1'), ('32323232-0000-4000-8000-000000000032', 'Testmenighet M2');
insert into public.app_users (id, email, full_name, status) values
  ('00000000-0000-4000-8000-000000000021', 'm-user@test.invalid', 'M Bruker', 'active'),
  ('00000000-0000-4000-8000-000000000022', 'm-admin@test.invalid', 'M Admin', 'active'),
  ('00000000-0000-4000-8000-000000000023', 'm-other@test.invalid', 'M Annen', 'active'),
  ('00000000-0000-4000-8000-000000000024', 'm-free@test.invalid', 'M Fri', 'active');
insert into public.user_identities (provider, subject, user_id) values
  ('https://test.invalid/auth/v1', 'sub-m21', '00000000-0000-4000-8000-000000000021'), ('https://test.invalid/auth/v1', 'sub-m22', '00000000-0000-4000-8000-000000000022'),
  ('https://test.invalid/auth/v1', 'sub-m23', '00000000-0000-4000-8000-000000000023'), ('https://test.invalid/auth/v1', 'sub-m24', '00000000-0000-4000-8000-000000000024');
insert into public.memberships (user_id, church_id) values
  ('00000000-0000-4000-8000-000000000021', '31313131-0000-4000-8000-000000000031'), ('00000000-0000-4000-8000-000000000022', '31313131-0000-4000-8000-000000000031'),
  ('00000000-0000-4000-8000-000000000023', '32323232-0000-4000-8000-000000000032');
insert into public.user_roles (user_id, role, church_id) values ('00000000-0000-4000-8000-000000000022', 'church_admin', '31313131-0000-4000-8000-000000000031');
insert into public.files (church_id, storage_key, file_name, mime_type, file_size) values ('31313131-0000-4000-8000-000000000031', 'test/m1.png', 'm1.png', 'image/png', 10);
insert into public.files (church_id, storage_key, file_name, mime_type, file_size, uploaded_by, folder, visibility) values
  ('31313131-0000-4000-8000-000000000031', 'test/m1-privat.png', 'm1-privat.png', 'image/png', 10, '00000000-0000-4000-8000-000000000021', 'bilder', 'private'),
  ('31313131-0000-4000-8000-000000000031', 'test/m1-delt.png', 'm1-delt.png', 'image/png', 10, '00000000-0000-4000-8000-000000000021', 'bilder', 'church');
create table ch_test.m_files as select id, file_name from public.files where church_id = '31313131-0000-4000-8000-000000000031';
grant select on ch_test.m_files to authenticated;

-- Databasen (også eier/drift) og strukturen
select ch_test.err('Én menighet: User kan ikke settes inn i en annen menighet (også direkte i databasen)', $q$insert into public.memberships (user_id, church_id) values ('00000000-0000-4000-8000-000000000021', '32323232-0000-4000-8000-000000000032')$q$, 'CH001');
select ch_test.err('Én menighet: Admin kan ikke settes inn i en annen menighet', $q$insert into public.memberships (user_id, church_id) values ('00000000-0000-4000-8000-000000000022', '32323232-0000-4000-8000-000000000032')$q$, 'CH001');
select ch_test.ok_rb('Én menighet: et deaktivert medlemskap i en annen menighet er lov', $q$insert into public.memberships (user_id, church_id, status) values ('00000000-0000-4000-8000-000000000021', '32323232-0000-4000-8000-000000000032', 'disabled')$q$);
select ch_test.ok_rb('Én menighet: Developer kan være medlem av flere menigheter', $q$insert into public.memberships (user_id, church_id) values ('00000000-0000-4000-8000-000000000001', '31313131-0000-4000-8000-000000000031'), ('00000000-0000-4000-8000-000000000001', '32323232-0000-4000-8000-000000000032') on conflict do nothing$q$);
select ch_test.ok_rb('Én menighet: Moderator kan være medlem av flere menigheter', $q$insert into public.memberships (user_id, church_id) values ('00000000-0000-4000-8000-000000000002', '31313131-0000-4000-8000-000000000031'), ('00000000-0000-4000-8000-000000000002', '32323232-0000-4000-8000-000000000032') on conflict do nothing$q$);
select ch_test.cnt('Én menighet: triggeren tar en lås per bruker (samtidige forsøk køes)', $q$select 1 from pg_proc where proname = 'single_church_guard' and prosrc like '%pg_advisory_xact_lock%'$q$, 1);
select ch_test.cnt('Én menighet: triggeren gjelder både innsetting og statusendring', $q$select 1 from pg_trigger where tgname = 'memberships_single_church' and tgrelid = 'public.memberships'::regclass$q$, 1);

-- Stab (Developer med MFA)
set local role authenticated;
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-1","aal":"aal2"}';
select ch_test.err('Én menighet: stab kan ikke legge en User til i en annen menighet', $q$select public.add_membership('00000000-0000-4000-8000-000000000021', '32323232-0000-4000-8000-000000000032')$q$, 'CH001');
select ch_test.err('Én menighet: stab kan ikke legge en Admin til i en annen menighet', $q$select public.add_membership('00000000-0000-4000-8000-000000000022', '32323232-0000-4000-8000-000000000032')$q$, 'CH001');
select ch_test.err('Én menighet: direkte innsetting via API stoppes', $q$insert into public.memberships (user_id, church_id) values ('00000000-0000-4000-8000-000000000021', '32323232-0000-4000-8000-000000000032')$q$, 'CH001');
select ch_test.ok_rb('Én menighet: stab kan legge til en bruker uten menighet', $q$select public.add_membership('00000000-0000-4000-8000-000000000024', '32323232-0000-4000-8000-000000000032')$q$);
select ch_test.err('Invitasjon: avvist for en User som er medlem i en annen menighet', $q$select public.create_invitation('m-user@test.invalid', '32323232-0000-4000-8000-000000000032', 'user', repeat('7', 64))$q$, 'CH001');
select ch_test.err('Invitasjon: avvist som Admin for en som er medlem i en annen menighet', $q$select public.create_invitation('m-admin@test.invalid', '32323232-0000-4000-8000-000000000032', 'church_admin', repeat('8', 64))$q$, 'CH001');

-- Admin i M1
set local role postgres;
insert into public.memberships (user_id, church_id, status) values ('00000000-0000-4000-8000-000000000023', '31313131-0000-4000-8000-000000000031', 'disabled');
set local role authenticated;
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-m22","aal":"aal1"}';
select ch_test.err('Én menighet: Admin kan ikke aktivere et medlem som er aktivt i en annen menighet', $q$update public.memberships set status = 'active' where user_id = '00000000-0000-4000-8000-000000000023' and church_id = '31313131-0000-4000-8000-000000000031'$q$, 'CH001');
select ch_test.err('Invitasjon: Admin kan ikke invitere en som er medlem i en annen menighet', $q$select public.create_invitation('m-other@test.invalid', '31313131-0000-4000-8000-000000000031', 'user', repeat('9', 64))$q$, 'CH001');
select ch_test.err('Én menighet: Admin kan ikke bruke add_membership', $q$select public.add_membership('00000000-0000-4000-8000-000000000024', '31313131-0000-4000-8000-000000000031')$q$, '42501');

-- Samtidige invitasjoner til to menigheter: bare én kan godtas (serveren)
set local role postgres;
insert into public.invitations (email, church_id, role, token_hash, expires_at, created_by) values
  ('m-free@test.invalid', '31313131-0000-4000-8000-000000000031', 'user', repeat('5', 64), now() + interval '1 day', '00000000-0000-4000-8000-000000000022'),
  ('m-free@test.invalid', '32323232-0000-4000-8000-000000000032', 'user', repeat('6', 64), now() + interval '1 day', '00000000-0000-4000-8000-000000000001');
do $$ begin if exists (select 1 from pg_roles where rolname = 'service_role') then execute 'set local role service_role'; end if; end $$;
select ch_test.cnt('Samtidige invitasjoner: den første godtas', $q$select 1 where (public.accept_invitation(repeat('5', 64), 'https://test.invalid/auth/v1', 'sub-m24', 'm-free@test.invalid') ->> 'ok')::boolean$q$, 1);
select ch_test.cnt('Samtidige invitasjoner: den andre avvises med tydelig feil', $q$select 1 where public.accept_invitation(repeat('6', 64), 'https://test.invalid/auth/v1', 'sub-m24', 'm-free@test.invalid') ->> 'error' = 'already_member_elsewhere'$q$, 1);
set local role postgres;
select ch_test.cnt('Samtidige invitasjoner: den andre står fortsatt som ventende', $q$select 1 from public.invitations where token_hash = repeat('6', 64) and status = 'pending'$q$, 1);
select ch_test.cnt('Samtidige invitasjoner: brukeren har bare ett aktivt medlemskap', $q$select 1 from public.memberships where user_id = '00000000-0000-4000-8000-000000000024' and status = 'active'$q$, 1);

-- Før fjerning: eieren ser sin private fil
set local role authenticated;
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-m21","aal":"aal1"}';
select ch_test.cnt('Fjerning (før): medlemmet ser egen privat fil og Delt mappe', $q$select 1 from public.files where church_id = '31313131-0000-4000-8000-000000000031'$q$, 3);

-- Fjerning: Admin i M1
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-m22","aal":"aal1"}';
select ch_test.err('Fjerning: Admin kan ikke fjerne seg selv', $q$select public.remove_membership('00000000-0000-4000-8000-000000000022', '31313131-0000-4000-8000-000000000031')$q$, '42501');
select ch_test.err('Fjerning: Admin kan ikke fjerne medlemmer i en annen menighet', $q$select public.remove_membership('00000000-0000-4000-8000-000000000023', '32323232-0000-4000-8000-000000000032')$q$, '42501');
select ch_test.ok('Fjerning: Admin fjerner et medlem i egen menighet', $q$select public.remove_membership('00000000-0000-4000-8000-000000000021', '31313131-0000-4000-8000-000000000031', 'test')$q$);
select ch_test.cnt('Fjerning: raden beholdes med status «fjernet»', $q$select 1 from public.memberships where user_id = '00000000-0000-4000-8000-000000000021' and church_id = '31313131-0000-4000-8000-000000000031' and status = 'removed'$q$, 1);
select ch_test.atleast('Fjerning: handlingen er loggført', $q$select 1 from public.audit_logs where action = 'memberships.remove' and church_id = '31313131-0000-4000-8000-000000000031'$q$, 1);
select ch_test.rows('Fjerning: et fjernet medlemskap kan ikke aktiveres direkte', $q$update public.memberships set status = 'active' where user_id = '00000000-0000-4000-8000-000000000021' and church_id = '31313131-0000-4000-8000-000000000031'$q$, 0);
select ch_test.err('Fjerning: Admin kan ikke sette «fjernet» direkte (bare via funksjonen)', $q$update public.memberships set status = 'removed' where user_id = '00000000-0000-4000-8000-000000000024' and church_id = '31313131-0000-4000-8000-000000000031'$q$, '42501');

-- Tidligere medlem mister tilgangen
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-m21","aal":"aal1"}';
select ch_test.cnt('Fjerning: tidligere medlem ser ikke menigheten', $q$select 1 from public.churches where id = '31313131-0000-4000-8000-000000000031'$q$, 0);
select ch_test.cnt('Fjerning: tidligere medlem ser ikke menighetens filer', $q$select 1 from public.files where church_id = '31313131-0000-4000-8000-000000000031'$q$, 0);
select ch_test.cnt('Fjerning: whoami viser ingen menighet (kontoen finnes fortsatt)', $q$select 1 where jsonb_array_length(public.whoami() -> 'churches') = 0 and public.whoami() ->> 'id' = '00000000-0000-4000-8000-000000000021'$q$, 1);
select ch_test.cnt('Fjerning: egen privat fil er skjult etter fjerning', $q$select 1 from public.files where file_name = 'm1-privat.png'$q$, 0);
select ch_test.cnt('Fjerning: får ingen nedlastingsnøkler til egne filer i menigheten', $q$select 1 from public.file_keys(array(select id from ch_test.m_files))$q$, 0);
select ch_test.err('Fjerning: kan ikke slette egen privat fil etter fjerning', $q$select public.delete_file((select id from ch_test.m_files where file_name = 'm1-privat.png'))$q$, '42501');
select ch_test.err('Fjerning: kan ikke slette eget bilde i Delt mappe etter fjerning', $q$select public.delete_file((select id from ch_test.m_files where file_name = 'm1-delt.png'))$q$, '42501');
select ch_test.err('Fjerning: vanlig bruker kan ikke fjerne andre', $q$select public.remove_membership('00000000-0000-4000-8000-000000000024', '31313131-0000-4000-8000-000000000031')$q$, '42501');

-- Admin fjernes: bare stab, og bare med bekreftelse om at menigheten står uten Admin
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-2","aal":"aal1"}';
select ch_test.err('Fjerning: Moderator uten MFA kan ikke fjerne', $q$select public.remove_membership('00000000-0000-4000-8000-000000000024', '31313131-0000-4000-8000-000000000031')$q$, '42501');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-2","aal":"aal2"}';
select ch_test.err('Fjerning av Admin: stoppes uten bekreftelse (menigheten ville stått uten Admin)', $q$select public.remove_membership('00000000-0000-4000-8000-000000000022', '31313131-0000-4000-8000-000000000031')$q$, 'CH003');
select ch_test.cnt('Fjerning av Admin: med bekreftelse fjernes medlemskapet og Admin-rollen', $q$select 1 where (public.remove_membership('00000000-0000-4000-8000-000000000022', '31313131-0000-4000-8000-000000000031', 'test', true) ->> 'admin_role_revoked')::boolean$q$, 1);
select ch_test.cnt('Fjerning av Admin: menigheten har ingen aktiv Admin', $q$select 1 from public.user_roles where church_id = '31313131-0000-4000-8000-000000000031' and role = 'church_admin' and revoked_at is null$q$, 0);
select ch_test.err('Fjerning: Moderator kan ikke fjerne seg selv', $q$select public.remove_membership('00000000-0000-4000-8000-000000000002', '31313131-0000-4000-8000-000000000031')$q$, '42501');
select ch_test.cnt('Fjerning av Admin: stab kan fortsatt administrere menigheten', $q$select 1 from public.memberships where church_id = '31313131-0000-4000-8000-000000000031'$q$, 4);
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-m22","aal":"aal1"}';
select ch_test.cnt('Fjerning av Admin: tidligere Admin har ikke lenger Admin-tilgang', $q$select 1 where app.is_church_admin('31313131-0000-4000-8000-000000000031')$q$, 0);
select ch_test.rows('Fjerning av Admin: tidligere Admin kan ikke endre medlemskap', $q$update public.memberships set status = 'disabled' where church_id = '31313131-0000-4000-8000-000000000031'$q$, 0);

-- Etter fjerning kan brukeren bli medlem et annet sted
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-1","aal":"aal2"}';
select ch_test.ok('Fjerning: etter fjerning kan brukeren legges til i en annen menighet', $q$select public.add_membership('00000000-0000-4000-8000-000000000021', '32323232-0000-4000-8000-000000000032')$q$);
select ch_test.ok('Fjerning: Developer kan fjerne et medlem', $q$select public.remove_membership('00000000-0000-4000-8000-000000000021', '32323232-0000-4000-8000-000000000032', 'test')$q$);
select ch_test.ok('Fjerning: fjernet medlem kan legges til igjen av stab (raden gjenbrukes)', $q$select public.add_membership('00000000-0000-4000-8000-000000000021', '31313131-0000-4000-8000-000000000031')$q$);
select ch_test.cnt('Fjerning: igjen aktiv i M1, fjernet i M2', $q$select 1 from public.memberships where user_id = '00000000-0000-4000-8000-000000000021' and ((church_id = '31313131-0000-4000-8000-000000000031' and status = 'active') or (church_id = '32323232-0000-4000-8000-000000000032' and status = 'removed'))$q$, 2);
set local role postgres;

-- ---------- Rolleendring: global rolle kan ikke fjernes fra en bruker med flere aktive medlemskap ----------
-- Fixturer (M1 = 31…, M2 = 32…): 25 Developer + Admin i M1 (M1+M2), 30 Developer (M1+M2), 26 Moderator (M1+M2),
-- 29 Moderator + Admin i M2 (M1+M2), 27 Moderator (bare M1), 28 Developer (ingen menighet).
set local role postgres;
insert into public.app_users (id, email, full_name, status) values
  ('00000000-0000-4000-8000-000000000025', 'g-devadm@test.invalid', 'G DevAdmin', 'active'), ('00000000-0000-4000-8000-000000000026', 'g-mod@test.invalid', 'G Mod', 'active'),
  ('00000000-0000-4000-8000-000000000027', 'g-modone@test.invalid', 'G ModEn', 'active'), ('00000000-0000-4000-8000-000000000028', 'g-devnone@test.invalid', 'G DevIngen', 'active'),
  ('00000000-0000-4000-8000-000000000029', 'g-modadm@test.invalid', 'G ModAdmin', 'active'), ('00000000-0000-4000-8000-000000000030', 'g-dev@test.invalid', 'G Dev', 'active');
insert into public.user_identities (provider, subject, user_id) select 'https://test.invalid/auth/v1', 'sub-g' || right(id::text, 2), id from public.app_users where email like 'g-%@test.invalid';
insert into public.user_roles (user_id, role, church_id) values
  ('00000000-0000-4000-8000-000000000025', 'developer', null), ('00000000-0000-4000-8000-000000000030', 'developer', null),
  ('00000000-0000-4000-8000-000000000026', 'moderator', null), ('00000000-0000-4000-8000-000000000029', 'moderator', null),
  ('00000000-0000-4000-8000-000000000027', 'moderator', null), ('00000000-0000-4000-8000-000000000028', 'developer', null);
insert into public.memberships (user_id, church_id) values
  ('00000000-0000-4000-8000-000000000025', '31313131-0000-4000-8000-000000000031'), ('00000000-0000-4000-8000-000000000025', '32323232-0000-4000-8000-000000000032'),
  ('00000000-0000-4000-8000-000000000030', '31313131-0000-4000-8000-000000000031'), ('00000000-0000-4000-8000-000000000030', '32323232-0000-4000-8000-000000000032'),
  ('00000000-0000-4000-8000-000000000026', '31313131-0000-4000-8000-000000000031'), ('00000000-0000-4000-8000-000000000026', '32323232-0000-4000-8000-000000000032'),
  ('00000000-0000-4000-8000-000000000029', '31313131-0000-4000-8000-000000000031'), ('00000000-0000-4000-8000-000000000029', '32323232-0000-4000-8000-000000000032'),
  ('00000000-0000-4000-8000-000000000027', '31313131-0000-4000-8000-000000000031');
insert into public.user_roles (user_id, role, church_id) values
  ('00000000-0000-4000-8000-000000000025', 'church_admin', '31313131-0000-4000-8000-000000000031'), ('00000000-0000-4000-8000-000000000029', 'church_admin', '32323232-0000-4000-8000-000000000032');
create table ch_test.groles as select id, user_id, role from public.user_roles where user_id::text like '00000000-0000-4000-8000-0000000000%' and role in ('developer', 'moderator') and church_id is null;
grant select on ch_test.groles to authenticated;

set local role authenticated;
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-1","aal":"aal2"}';
select ch_test.err('Rolleendring: Developer (Admin i M1) med to aktive medlemskap kan ikke bli Admin', $q$select public.revoke_role((select id from ch_test.groles where user_id = '00000000-0000-4000-8000-000000000025'))$q$, 'CH004');
select ch_test.err('Rolleendring: Developer med to aktive medlemskap kan ikke bli User', $q$select public.revoke_role((select id from ch_test.groles where user_id = '00000000-0000-4000-8000-000000000030'))$q$, 'CH004');
select ch_test.err('Rolleendring: Moderator med to aktive medlemskap kan ikke bli User', $q$select public.revoke_role((select id from ch_test.groles where user_id = '00000000-0000-4000-8000-000000000026'))$q$, 'CH004');
select ch_test.err('Rolleendring: Moderator (Admin i M2) med to aktive medlemskap kan ikke bli Admin', $q$select public.revoke_role((select id from ch_test.groles where user_id = '00000000-0000-4000-8000-000000000029'))$q$, 'CH004');
select ch_test.cnt('Rolleendring blokkert: medlemskap og roller er uendret', $q$select 1 from public.memberships where user_id in ('00000000-0000-4000-8000-000000000025', '00000000-0000-4000-8000-000000000026', '00000000-0000-4000-8000-000000000029', '00000000-0000-4000-8000-000000000030') and status = 'active' union all select 1 from public.user_roles where id in (select id from ch_test.groles where user_id in ('00000000-0000-4000-8000-000000000025', '00000000-0000-4000-8000-000000000026', '00000000-0000-4000-8000-000000000029', '00000000-0000-4000-8000-000000000030')) and revoked_at is null$q$, 12);
select ch_test.ok_rb('Rolleendring: Moderator med ett aktivt medlemskap kan bli User', $q$select public.revoke_role((select id from ch_test.groles where user_id = '00000000-0000-4000-8000-000000000027'))$q$);
select ch_test.ok_rb('Rolleendring: Developer uten medlemskap kan bli User', $q$select public.revoke_role((select id from ch_test.groles where user_id = '00000000-0000-4000-8000-000000000028'))$q$);
select ch_test.cnt('Rolleendring: aktive medlemskap kan leses for å forklare sperren', $q$select 1 from public.active_memberships_of('00000000-0000-4000-8000-000000000026')$q$, 2);
select ch_test.err('Rolleendring: medlemskap der brukeren er Admin krever egen bekreftelse', $q$select public.remove_membership('00000000-0000-4000-8000-000000000029', '32323232-0000-4000-8000-000000000032')$q$, 'CH003');
select ch_test.err('Rolleendring: fortsatt blokkert når medlemskapet ikke ble fjernet', $q$select public.revoke_role((select id from ch_test.groles where user_id = '00000000-0000-4000-8000-000000000029'))$q$, 'CH004');
select ch_test.ok('Rolleendring: Developer fjerner ett medlemskap manuelt', $q$select public.remove_membership('00000000-0000-4000-8000-000000000026', '32323232-0000-4000-8000-000000000032', 'test')$q$);
select ch_test.ok('Rolleendring: deretter kan Moderator-rollen fjernes', $q$select public.revoke_role((select id from ch_test.groles where user_id = '00000000-0000-4000-8000-000000000026'))$q$);
select ch_test.err('Rolleendring: tidligere Moderator kan ikke aktiveres i en annen menighet igjen', $q$select public.add_membership('00000000-0000-4000-8000-000000000026', '32323232-0000-4000-8000-000000000032')$q$, 'CH001');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-2","aal":"aal2"}';
select ch_test.err('Rolleendring: Moderator kan fortsatt ikke fjerne Developer-roller', $q$select public.revoke_role((select id from ch_test.groles where user_id = '00000000-0000-4000-8000-000000000028'))$q$, '42501');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-g26","aal":"aal1"}';
select ch_test.cnt('Rolleendring: User ser bare egne medlemskap', $q$select 1 from public.active_memberships_of('00000000-0000-4000-8000-000000000025')$q$, 0);
set local role postgres;
select ch_test.err('Rolleendring: direkte oppdatering i databasen stoppes også', $q$update public.user_roles set revoked_at = now() where id = (select id from ch_test.groles where user_id = '00000000-0000-4000-8000-000000000030')$q$, 'CH004');
select ch_test.err('Rolleendring: direkte sletting i databasen stoppes også', $q$delete from public.user_roles where id = (select id from ch_test.groles where user_id = '00000000-0000-4000-8000-000000000030')$q$, 'CH004');
select ch_test.cnt('Rolleendring: samme lås per bruker som medlemskapstriggeren (samtidige endringer køes)', $q$select 1 from pg_proc where proname in ('global_role_guard', 'single_church_guard') and prosrc like '%ch:membership:%' and prosrc like '%pg_advisory_xact_lock%'$q$, 2);
select ch_test.cnt('Rolleendring: ingen User/Admin har mer enn ett aktivt medlemskap', $q$select 1 from public.memberships m where m.status = 'active' and not exists (select 1 from public.user_roles r where r.user_id = m.user_id and r.role in ('developer', 'moderator') and r.church_id is null and r.revoked_at is null) group by m.user_id having count(*) > 1$q$, 0);

-- ---------- Opprydning av private filer fra fjernede medlemmer ----------
-- I M1: U22 er fjernet (kandidater c-1, c-2, c-src; c-src er kilde for en kopi), U24 er aktiv (c-aktiv), U21 er lagt til
-- igjen etter fjerning (m1-privat er ikke kandidat).
insert into public.files (church_id, storage_key, file_name, mime_type, file_size, uploaded_by, folder, visibility) values
  ('31313131-0000-4000-8000-000000000031', 'test/c-1.png', 'c-1.png', 'image/png', 100, '00000000-0000-4000-8000-000000000022', 'bilder', 'private'),
  ('31313131-0000-4000-8000-000000000031', 'test/c-2.png', 'c-2.png', 'image/png', 200, '00000000-0000-4000-8000-000000000022', 'bilder', 'private'),
  ('31313131-0000-4000-8000-000000000031', 'test/c-src.png', 'c-src.png', 'image/png', 50, '00000000-0000-4000-8000-000000000022', 'bilder', 'private'),
  ('31313131-0000-4000-8000-000000000031', 'test/c-aktiv.png', 'c-aktiv.png', 'image/png', 70, '00000000-0000-4000-8000-000000000024', 'bilder', 'private'),
  ('32323232-0000-4000-8000-000000000032', 'test/c-m2.png', 'c-m2.png', 'image/png', 40, '00000000-0000-4000-8000-000000000023', 'bilder', 'private');
insert into public.files (church_id, storage_key, file_name, mime_type, file_size, folder, visibility, source_file_id)
  select '31313131-0000-4000-8000-000000000031', 'test/c-kopi.png', 'c-kopi.png', 'image/png', 50, 'bilder', 'church', id from public.files where file_name = 'c-src.png';
create table ch_test.cfiles as select id, file_name from public.files where file_name like 'c-%';
grant select on ch_test.cfiles to authenticated;
create table ch_test.cbytes as select coalesce(sum(file_size), 0) as before from public.files where church_id = '31313131-0000-4000-8000-000000000031';
grant select on ch_test.cbytes to authenticated;

set local role authenticated;
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-3","aal":"aal1"}';
select ch_test.err('Opprydning: Admin får ikke oversikten', 'select * from public.cleanup_overview()', '42501');
select ch_test.err('Opprydning: Admin får ikke fillisten', $q$select * from public.cleanup_candidates('31313131-0000-4000-8000-000000000031')$q$, '42501');
select ch_test.err('Opprydning: Admin kan ikke slette', $q$select public.cleanup_private_files('31313131-0000-4000-8000-000000000031', array(select id from ch_test.cfiles where file_name = 'c-1.png'), 1, 100)$q$, '42501');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-m24","aal":"aal1"}';
select ch_test.err('Opprydning: User får ikke oversikten', 'select * from public.cleanup_overview()', '42501');
select ch_test.err('Opprydning: User kan ikke slette', $q$select public.cleanup_private_files('31313131-0000-4000-8000-000000000031', array(select id from ch_test.cfiles where file_name = 'c-1.png'), 1, 100)$q$, '42501');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-2","aal":"aal1"}';
select ch_test.err('Opprydning: Moderator uten MFA avvises', 'select * from public.cleanup_overview()', '42501');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-2","aal":"aal2"}';
select ch_test.cnt('Opprydning: oversikten viser M1 med 3 kandidater, 2 klare (350 B / 300 B)', $q$select 1 from public.cleanup_overview() where church_id = '31313131-0000-4000-8000-000000000031' and candidates = 3 and candidate_bytes = 350 and ready = 2 and ready_bytes = 300 and not can_view$q$, 1);
select ch_test.err('Opprydning: uten medlemskap ingen filnavn (menighetssperren)', $q$select * from public.cleanup_candidates('31313131-0000-4000-8000-000000000031')$q$, '42501');
select ch_test.err('Opprydning: uten medlemskap ingen sletting', $q$select public.cleanup_private_files('31313131-0000-4000-8000-000000000031', array(select id from ch_test.cfiles where file_name = 'c-1.png'), 1, 100)$q$, '42501');
set local role postgres;
insert into public.memberships (user_id, church_id) values ('00000000-0000-4000-8000-000000000002', '31313131-0000-4000-8000-000000000031') on conflict (user_id, church_id) do update set status = 'active';
set local role authenticated;
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-2","aal":"aal2"}';
select ch_test.cnt('Opprydning: medlem i stab ser kandidatene (ikke aktive medlemmer, ikke gjeninnsatte)', $q$select 1 from public.cleanup_candidates('31313131-0000-4000-8000-000000000031')$q$, 3);
select ch_test.cnt('Opprydning: filen med en kopi er ikke klar, med årsak', $q$select 1 from public.cleanup_candidates('31313131-0000-4000-8000-000000000031') where file_name = 'c-src.png' and not ready and reason like '%kopi%'$q$, 1);
select ch_test.cnt('Opprydning: fillisten har ingen lagringsnøkkel', $q$select 1 from pg_proc where proname = 'cleanup_candidates' and array_to_string(proargnames, ',') like '%storage_key%'$q$, 0);
select ch_test.cnt('Opprydning: tilgang til verktøyet gir ikke tilgang til filene', $q$select 1 from public.files where file_name in ('c-1.png', 'c-2.png') union all select 1 from public.file_keys(array(select id from ch_test.cfiles where file_name in ('c-1.png', 'c-2.png')))$q$, 0);
select ch_test.err('Opprydning: feil antall/størrelse (endret utvalg) stoppes', $q$select public.cleanup_private_files('31313131-0000-4000-8000-000000000031', array(select id from ch_test.cfiles where file_name in ('c-1.png', 'c-2.png')), 2, 999)$q$, 'CH006');
select ch_test.err('Opprydning: en fil som ikke er klar stopper hele slettingen', $q$select public.cleanup_private_files('31313131-0000-4000-8000-000000000031', array(select id from ch_test.cfiles where file_name in ('c-1.png', 'c-src.png')), 2, 150)$q$, 'CH005');
select ch_test.err('Opprydning: et aktivt medlems private fil kan ikke ryddes', $q$select public.cleanup_private_files('31313131-0000-4000-8000-000000000031', array(select id from ch_test.cfiles where file_name = 'c-aktiv.png'), 1, 70)$q$, 'CH005');
select ch_test.err('Opprydning: filer fra en annen menighet avvises', $q$select public.cleanup_private_files('31313131-0000-4000-8000-000000000031', array(select id from ch_test.cfiles where file_name in ('c-m2.png', 'c-1.png')), 2, 140)$q$, '42501');
set local role postgres;
select ch_test.cnt('Opprydning: ingenting slettet etter avviste forsøk', $q$select 1 from public.files where file_name like 'c-%'$q$, 6);
set local role authenticated;
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-2","aal":"aal2"}';
select ch_test.cnt('Opprydning: bekreftet sletting av 2 filer (300 B)', $q$select 1 where (public.cleanup_private_files('31313131-0000-4000-8000-000000000031', array(select id from ch_test.cfiles where file_name in ('c-1.png', 'c-2.png')), 2, 300) ->> 'count')::int = 2$q$, 1);
set local role postgres;
select ch_test.cnt('Opprydning: radene er slettet, de andre filene er urørt', $q$select 1 from public.files where file_name like 'c-%'$q$, 4);
select ch_test.cnt('Opprydning: menighetens lagringsbruk gikk ned med 300 B', $q$select 1 from ch_test.cbytes where before - 300 = (select coalesce(sum(file_size), 0) from public.files where church_id = '31313131-0000-4000-8000-000000000031')$q$, 1);
select ch_test.cnt('Opprydning: to lagringsnøkler står i køen', $q$select 1 from public.file_cleanup_queue where church_id = '31313131-0000-4000-8000-000000000031' and status = 'pending'$q$, 2);
select ch_test.cnt('Opprydning: loggført med utfører, menighet, antall og filer', $q$select 1 from public.audit_logs where action = 'files.cleanup' and actor_user_id = '00000000-0000-4000-8000-000000000002' and church_id = '31313131-0000-4000-8000-000000000031' and (meta ->> 'count')::int = 2 and jsonb_array_length(meta -> 'files') = 2$q$, 1);
set local role authenticated;
select ch_test.err('Opprydning: innloggede kan ikke hente lagringsnøkler fra køen', $q$select * from public.cleanup_queue_claim(array(select id from public.file_cleanup_queue))$q$, '42501');
select ch_test.err('Opprydning: innloggede leser ikke køen direkte', $q$select 1 from public.file_cleanup_queue$q$, '42501');
set local role postgres;
create table ch_test.cq as select id, file_name from public.file_cleanup_queue where church_id = '31313131-0000-4000-8000-000000000031';
grant select on ch_test.cq to authenticated;
do $$ begin if exists (select 1 from pg_roles where rolname = 'service_role') then execute 'grant select on ch_test.cq to service_role'; execute 'set local role service_role'; end if; end $$;
select ch_test.cnt('Opprydning (server): henter nøklene for køen', $q$select 1 from public.cleanup_queue_claim(array(select id from ch_test.cq))$q$, 2);
select ch_test.ok('Opprydning (server): én fjernet fra lagringen', $q$select public.cleanup_queue_done((select id from ch_test.cq where file_name = 'c-1.png'), true)$q$);
select ch_test.ok('Opprydning (server): én feilet i lagringen', $q$select public.cleanup_queue_done((select id from ch_test.cq where file_name = 'c-2.png'), false, 'timeout')$q$);
set local role postgres;
select ch_test.cnt('Opprydning: resultatet er registrert (done + failed) og loggført', $q$select 1 from public.file_cleanup_queue where (file_name = 'c-1.png' and status = 'done') or (file_name = 'c-2.png' and status = 'failed' and last_error = 'timeout') union all select 1 from public.audit_logs where action = 'files.cleanup_storage' and church_id = '31313131-0000-4000-8000-000000000031'$q$, 4);
set local role authenticated;
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-2","aal":"aal2"}';
select ch_test.cnt('Opprydning: feilet oppføring kan prøves igjen', $q$select 1 where array_length(public.cleanup_retry_ids('31313131-0000-4000-8000-000000000031'), 1) = 1$q$, 1);
select ch_test.cnt('Opprydning: oversikten viser køen', $q$select 1 from public.cleanup_overview() where church_id = '31313131-0000-4000-8000-000000000031' and queue_failed = 1 and candidates = 1 and ready = 0 and can_view$q$, 1);
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-1","aal":"aal2"}';
select ch_test.ok('Opprydning: Developer får oversikten', 'select * from public.cleanup_overview()');
select ch_test.err('Opprydning: Developer uten medlemskap får ikke fillisten', $q$select * from public.cleanup_candidates('31313131-0000-4000-8000-000000000031')$q$, '42501');
set local role postgres;

-- ---------- Tilbakemeldinger: fjerne (arkivere) saker ----------
set local role authenticated;
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-3","aal":"aal1"}';
select ch_test.err('Arkivering: Admin kan ikke fjerne saker', $q$select public.archive_feedback((select bug_id from t8), 'x')$q$, '42501');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-4","aal":"aal1"}';
select ch_test.err('Arkivering: User kan ikke fjerne saker', $q$select public.archive_feedback((select bug_id from t8), 'x')$q$, '42501');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-2","aal":"aal1"}';
select ch_test.err('Arkivering: Moderator uten MFA avvises', $q$select public.archive_feedback((select bug_id from t8), 'x')$q$, '42501');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-2","aal":"aal2"}';
select ch_test.ok('Arkivering: Moderator fjerner en sak fra innboksen', $q$select public.archive_feedback((select bug_id from t8), 'Duplikat av en annen sak')$q$);
select ch_test.cnt('Arkivering: saken vises ikke lenger i innboksen', $q$select 1 from public.feedback_list() where id = (select bug_id from t8)$q$, 0);
select ch_test.cnt('Arkivering: saken vises under «Arkiverte» med begrunnelse', $q$select 1 from public.feedback_list(true) where id = (select bug_id from t8) and archive_reason like 'Duplikat%'$q$, 1);
select ch_test.cnt('Arkivering: historikken har hendelsen', $q$select 1 from public.feedback_events_for((select bug_id from t8)) where kind = 'archive'$q$, 1);
select ch_test.atleast('Arkivering: loggført', $q$select 1 from public.audit_logs where action = 'feedback.archive'$q$, 1);
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-1","aal":"aal2"}';
select ch_test.ok('Arkivering: Developer gjenoppretter saken', $q$select public.restore_feedback((select bug_id from t8))$q$);
select ch_test.cnt('Arkivering: saken er tilbake i innboksen med hele historikken', $q$select 1 from public.feedback_list() where id = (select bug_id from t8) union all select 1 from public.feedback_events_for((select bug_id from t8)) where kind in ('archive', 'restore')$q$, 3);
set local role postgres;
select ch_test.cnt('Arkivering: saken slettes aldri (raden finnes)', $q$select 1 from public.feedback where id = (select bug_id from t8)$q$, 1);

-- ---------- Fornavn og etternavn ----------
-- Egne fixturer: N1 (41 Admin, 42 medlem), N2 (43 medlem).
set local role postgres;
insert into public.churches (id, name) values ('41414141-0000-4000-8000-000000000041', 'Testmenighet N1'), ('42424242-0000-4000-8000-000000000042', 'Testmenighet N2');
insert into public.app_users (id, email, full_name, status) values ('00000000-0000-4000-8000-000000000041', 'n-admin@test.invalid', 'N Admin', 'active'),
  ('00000000-0000-4000-8000-000000000042', 'n-medlem@test.invalid', 'N Medlem', 'active'), ('00000000-0000-4000-8000-000000000043', 'n-annen@test.invalid', 'N Annen', 'active');
insert into public.user_identities (provider, subject, user_id) values ('https://test.invalid/auth/v1', 'sub-n41', '00000000-0000-4000-8000-000000000041'),
  ('https://test.invalid/auth/v1', 'sub-n42', '00000000-0000-4000-8000-000000000042'), ('https://test.invalid/auth/v1', 'sub-n43', '00000000-0000-4000-8000-000000000043');
insert into public.memberships (user_id, church_id) values ('00000000-0000-4000-8000-000000000041', '41414141-0000-4000-8000-000000000041'), ('00000000-0000-4000-8000-000000000042', '41414141-0000-4000-8000-000000000041'), ('00000000-0000-4000-8000-000000000043', '42424242-0000-4000-8000-000000000042');
insert into public.user_roles (user_id, role, church_id) values ('00000000-0000-4000-8000-000000000041', 'church_admin', '41414141-0000-4000-8000-000000000041');
set local role authenticated;
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-n41","aal":"aal1"}';
select ch_test.ok('Navn: Admin setter fornavn og etternavn på et medlem i egen menighet', $q$select public.set_user_name('00000000-0000-4000-8000-000000000042', 'Kari', 'Nordmann')$q$);
select ch_test.cnt('Navn: visningsnavnet er fornavn + etternavn', $q$select 1 from public.app_users where id = '00000000-0000-4000-8000-000000000042' and full_name = 'Kari Nordmann' and first_name = 'Kari' and last_name = 'Nordmann'$q$, 1);
select ch_test.err('Navn: Admin kan ikke endre navn i en annen menighet', $q$select public.set_user_name('00000000-0000-4000-8000-000000000043', 'Ola', 'B')$q$, '42501');
select ch_test.err('Navn: tomt navn avvises', $q$select public.set_user_name('00000000-0000-4000-8000-000000000042', ' ', '')$q$, '22023');
select ch_test.err('Navn: for langt navn avvises', $q$select public.set_user_name('00000000-0000-4000-8000-000000000042', repeat('x', 61), 'N')$q$, '22023');
select ch_test.err('Navn: ugyldige tegn avvises', $q$select public.set_user_name('00000000-0000-4000-8000-000000000042', '<script>', 'N')$q$, '22023');
select ch_test.atleast('Navn: loggført med gammelt og nytt navn', $q$select 1 from public.audit_logs where action = 'users.name' and meta ->> 'new' = 'Kari Nordmann'$q$, 1);
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-n42","aal":"aal1"}';
select ch_test.cnt('Navn: whoami gir fornavn og etternavn', $q$select 1 where public.whoami() ->> 'first_name' = 'Kari' and public.whoami() ->> 'last_name' = 'Nordmann'$q$, 1);
select ch_test.err('Navn: vanlig bruker kan ikke endre andres navn', $q$select public.set_user_name('00000000-0000-4000-8000-000000000041', 'X', 'Y')$q$, '42501');
select ch_test.ok_rb('Navn: bruker kan endre sitt eget navn', $q$update public.app_users set first_name = 'Kari Anne' where id = '00000000-0000-4000-8000-000000000042'$q$);
select ch_test.rows('Navn: bruker kan ikke endre andres navn direkte', $q$update public.app_users set first_name = 'X' where id = '00000000-0000-4000-8000-000000000041'$q$, 0);
select ch_test.cnt('Navn: navnefeltene endrer ikke roller', $q$select 1 from public.user_roles where user_id = '00000000-0000-4000-8000-000000000042' and revoked_at is null$q$, 0);
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-2","aal":"aal2"}';
select ch_test.ok_rb('Navn: Moderator kan endre navn på brukere', $q$select public.set_user_name('00000000-0000-4000-8000-000000000043', 'Ola', 'Bruker')$q$);

-- ---------- Logo per menighet ----------
set local role postgres;
insert into public.files (church_id, storage_key, file_name, mime_type, file_size, folder, visibility) values
  ('41414141-0000-4000-8000-000000000041', 'test/logo-a.png', 'logo-n1.png', 'image/png', 10, 'logoer', 'church'),
  ('42424242-0000-4000-8000-000000000042', 'test/logo-b.png', 'logo-n2.png', 'image/png', 10, 'logoer', 'church'),
  ('41414141-0000-4000-8000-000000000041', 'test/ikke-logo.png', 'ikke-logo-n1.png', 'image/png', 10, 'bilder', 'church');
create table ch_test.logos as select id, file_name from public.files where file_name in ('logo-n1.png', 'logo-n2.png', 'ikke-logo-n1.png');
grant select on ch_test.logos to authenticated;
set local role authenticated;
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-n41","aal":"aal1"}';
select ch_test.ok('Logo: Admin velger logo for egen menighet', $q$select public.set_church_logo('41414141-0000-4000-8000-000000000041', (select id from ch_test.logos where file_name = 'logo-n1.png'))$q$);
select ch_test.err('Logo: Admin kan ikke bruke en annen menighets fil', $q$select public.set_church_logo('41414141-0000-4000-8000-000000000041', (select id from ch_test.logos where file_name = 'logo-n2.png'))$q$, '22023');
select ch_test.err('Logo: Admin kan ikke endre logoen til en annen menighet', $q$select public.set_church_logo('42424242-0000-4000-8000-000000000042', (select id from ch_test.logos where file_name = 'logo-n2.png'))$q$, '42501');
select ch_test.err('Logo: bare filer i Logoer-mappen', $q$select public.set_church_logo('41414141-0000-4000-8000-000000000041', (select id from ch_test.logos where file_name = 'ikke-logo-n1.png'))$q$, '22023');
select ch_test.atleast('Logo: loggført', $q$select 1 from public.audit_logs where action = 'churches.logo' and church_id = '41414141-0000-4000-8000-000000000041'$q$, 1);
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-n42","aal":"aal1"}';
select ch_test.err('Logo: vanlig medlem kan ikke endre logoen', $q$select public.set_church_logo('41414141-0000-4000-8000-000000000041', null)$q$, '42501');
select ch_test.cnt('Logo: medlemmet ser logoen (whoami og fil)', $q$select 1 from jsonb_array_elements(public.whoami() -> 'churches') c where c ->> 'logo_file_id' = (select id::text from ch_test.logos where file_name = 'logo-n1.png') union all select 1 from public.file_keys(array(select id from ch_test.logos where file_name = 'logo-n1.png'))$q$, 2);
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-n43","aal":"aal1"}';
select ch_test.cnt('Logo: medlem i en annen menighet får ikke logofilen', $q$select 1 from public.file_keys(array(select id from ch_test.logos where file_name = 'logo-n1.png'))$q$, 0);
set local role postgres;
delete from public.files where id = (select id from ch_test.logos where file_name = 'logo-n1.png');
select ch_test.cnt('Logo: slettes logofilen, blir logoen tom (ingen ødelagt peker)', $q$select 1 from public.churches where id = '41414141-0000-4000-8000-000000000041' and logo_file_id is null$q$, 1);

-- ---------- Sletting av avsluttede koblinger ----------
insert into public.church_links (name, status, ended_at) values ('M1 – M2 test', 'ended', now());
insert into public.church_link_members (link_id, church_id) select l.id, c from public.church_links l, unnest(array['31313131-0000-4000-8000-000000000031', '32323232-0000-4000-8000-000000000032']::uuid[]) c where l.name = 'M1 – M2 test';
insert into public.files (church_id, storage_key, file_name, mime_type, file_size, folder, visibility, link_id, source_folder, source_file_id)
  select '31313131-0000-4000-8000-000000000031', 'test/kopi-m1m2.png', 'kopi-m1m2.png', 'image/png', 25, 'samarbeid', 'church', l.id, 'bilder', (select id from public.files where file_name = 'm1-delt.png')
  from public.church_links l where l.name = 'M1 – M2 test';
create table ch_test.dl as select id from public.church_links where name = 'M1 – M2 test';
grant select on ch_test.dl to authenticated;
set local role authenticated;
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-3","aal":"aal1"}';
select ch_test.err('Sletting av kobling: Admin avvises', $q$select public.delete_link((select id from ch_test.dl))$q$, '42501');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-2","aal":"aal1"}';
select ch_test.err('Sletting av kobling: Moderator uten MFA avvises', $q$select public.delete_link((select id from ch_test.dl))$q$, '42501');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-1","aal":"aal2"}';
select ch_test.err('Sletting av kobling: en aktiv kobling kan ikke slettes', $q$select public.delete_link((select id from public.church_links where status = 'active' limit 1))$q$, '22023');
select ch_test.cnt('Sletting av kobling: Developer sletter en avsluttet kobling med én kopi', $q$select 1 where (public.delete_link((select id from ch_test.dl)) ->> 'copies')::int = 1$q$, 1);
set local role postgres;
select ch_test.cnt('Sletting av kobling: koblingen og kopien er borte, originalen er urørt', $q$select 1 from public.church_links where id = (select id from ch_test.dl) union all select 1 from public.files where file_name = 'kopi-m1m2.png' union all select 1 from public.files where file_name = 'm1-delt.png'$q$, 1);
select ch_test.cnt('Sletting av kobling: kopien står i køen for lagringen', $q$select 1 from public.file_cleanup_queue where file_name = 'kopi-m1m2.png' and status = 'pending'$q$, 1);
select ch_test.cnt('Sletting av kobling: loggført', $q$select 1 from public.audit_logs where action = 'groups.delete' and target_id = (select id::text from ch_test.dl) and (meta ->> 'copies')::int = 1 and jsonb_array_length(meta -> 'members') = 2$q$, 1);

-- ---------- Samarbeidsgrupper med tre eller flere menigheter ----------
-- Egne fixturer: G1 (61 Admin, 62 medlem), G2 (63 Admin, 64 medlem), G3 (65 Admin, 66 medlem), G4 (67 Admin, utenfor
-- gruppen), G5 (ingen brukere). Rulles tilbake med resten.
set local role postgres;
insert into public.churches (id, name) values
  ('61616161-0000-4000-8000-000000000061', 'Gruppetest G1'), ('62626262-0000-4000-8000-000000000062', 'Gruppetest G2'),
  ('63636363-0000-4000-8000-000000000063', 'Gruppetest G3'), ('64646464-0000-4000-8000-000000000064', 'Gruppetest G4'),
  ('65656565-0000-4000-8000-000000000065', 'Gruppetest G5');
insert into public.app_users (id, email, full_name, status) select ('00000000-0000-4000-8000-0000000000' || n)::uuid, 'g' || n || '@test.invalid', 'G ' || n, 'active' from generate_series(61, 67) n;
insert into public.user_identities (provider, subject, user_id) select 'https://test.invalid/auth/v1', 'sub-g' || n, ('00000000-0000-4000-8000-0000000000' || n)::uuid from generate_series(61, 67) n;
insert into public.memberships (user_id, church_id) values
  ('00000000-0000-4000-8000-000000000061', '61616161-0000-4000-8000-000000000061'), ('00000000-0000-4000-8000-000000000062', '61616161-0000-4000-8000-000000000061'),
  ('00000000-0000-4000-8000-000000000063', '62626262-0000-4000-8000-000000000062'), ('00000000-0000-4000-8000-000000000064', '62626262-0000-4000-8000-000000000062'),
  ('00000000-0000-4000-8000-000000000065', '63636363-0000-4000-8000-000000000063'), ('00000000-0000-4000-8000-000000000066', '63636363-0000-4000-8000-000000000063'),
  ('00000000-0000-4000-8000-000000000067', '64646464-0000-4000-8000-000000000064');
insert into public.user_roles (user_id, role, church_id) values
  ('00000000-0000-4000-8000-000000000061', 'church_admin', '61616161-0000-4000-8000-000000000061'), ('00000000-0000-4000-8000-000000000063', 'church_admin', '62626262-0000-4000-8000-000000000062'),
  ('00000000-0000-4000-8000-000000000065', 'church_admin', '63636363-0000-4000-8000-000000000063'), ('00000000-0000-4000-8000-000000000067', 'church_admin', '64646464-0000-4000-8000-000000000064');
insert into public.files (church_id, storage_key, file_name, mime_type, file_size, uploaded_by, folder, visibility) values
  ('61616161-0000-4000-8000-000000000061', 'test/g1-delt.png', 'g1-delt.png', 'image/png', 11, '00000000-0000-4000-8000-000000000062', 'bilder', 'church'),
  ('61616161-0000-4000-8000-000000000061', 'test/g1-ny.png', 'g1-ny.png', 'image/png', 12, '00000000-0000-4000-8000-000000000062', 'bilder', 'church'),
  ('62626262-0000-4000-8000-000000000062', 'test/g2-delt.png', 'g2-delt.png', 'image/png', 21, '00000000-0000-4000-8000-000000000064', 'bilder', 'church'),
  ('63636363-0000-4000-8000-000000000063', 'test/g3-delt.png', 'g3-delt.png', 'image/png', 30, '00000000-0000-4000-8000-000000000066', 'bilder', 'church'),
  ('63636363-0000-4000-8000-000000000063', 'test/g3-faste.png', 'g3-faste.png', 'image/png', 40, '00000000-0000-4000-8000-000000000065', 'faste', 'church'),
  ('63636363-0000-4000-8000-000000000063', 'test/g3-privat.png', 'g3-privat.png', 'image/png', 50, '00000000-0000-4000-8000-000000000066', 'bilder', 'private'),
  ('63636363-0000-4000-8000-000000000063', 'test/g3-ny.png', 'g3-ny.png', 'image/png', 60, '00000000-0000-4000-8000-000000000066', 'bilder', 'church'),
  ('64646464-0000-4000-8000-000000000064', 'test/g4-delt.png', 'g4-delt.png', 'image/png', 70, '00000000-0000-4000-8000-000000000067', 'bilder', 'church');
create table ch_test.gf as select id, file_name, church_id from public.files where storage_key like 'test/g_-%';
create table ch_test.grp (name text primary key, id uuid);
grant select on ch_test.gf, ch_test.grp to anon, authenticated;
do $$ begin if exists (select 1 from pg_roles where rolname = 'service_role') then execute 'grant select on ch_test.gf, ch_test.grp to service_role'; end if; end $$;

-- Opprettelse: bare Developer/Moderator med MFA
set local role authenticated;
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-g61","aal":"aal1"}';
select ch_test.err('Gruppe: Admin kan ikke opprette gruppe', $q$select public.create_group('Admin-gruppe', null, array['61616161-0000-4000-8000-000000000061', '62626262-0000-4000-8000-000000000062']::uuid[])$q$, '42501');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-g62","aal":"aal1"}';
select ch_test.err('Gruppe: medlem kan ikke opprette gruppe', $q$select public.create_group('Bruker-gruppe', null, array['61616161-0000-4000-8000-000000000061', '62626262-0000-4000-8000-000000000062']::uuid[])$q$, '42501');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-2","aal":"aal1"}';
select ch_test.err('Gruppe: Moderator uten MFA avvises', $q$select public.create_group('Uten MFA', null, array['61616161-0000-4000-8000-000000000061', '62626262-0000-4000-8000-000000000062']::uuid[])$q$, '42501');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-1","aal":"aal1"}';
select ch_test.err('Gruppe: Developer uten MFA avvises', $q$select public.create_group('Uten MFA', null, array['61616161-0000-4000-8000-000000000061', '62626262-0000-4000-8000-000000000062']::uuid[])$q$, '42501');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-1","aal":"aal2"}';
select ch_test.ok_rb('Gruppe: Developer med MFA kan opprette gruppe', $q$select public.create_group('Developer-gruppe', null, array['61616161-0000-4000-8000-000000000061', '62626262-0000-4000-8000-000000000062', '63636363-0000-4000-8000-000000000063']::uuid[])$q$);
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-2","aal":"aal2"}';
select ch_test.err('Gruppe: for kort navn avvises', $q$select public.create_group('x', null, array['61616161-0000-4000-8000-000000000061', '62626262-0000-4000-8000-000000000062']::uuid[])$q$, '22023');
select ch_test.err('Gruppe: navn med kontrolltegn avvises', $q$select public.create_group(E'Navn\nlinje', null, array['61616161-0000-4000-8000-000000000061', '62626262-0000-4000-8000-000000000062']::uuid[])$q$, '22023');
select ch_test.err('Gruppe: for lang beskrivelse avvises', $q$select public.create_group('Gruppe', repeat('x', 501), array['61616161-0000-4000-8000-000000000061', '62626262-0000-4000-8000-000000000062']::uuid[])$q$, '22023');
select ch_test.err('Gruppe: én menighet avvises', $q$select public.create_group('Alene', null, array['61616161-0000-4000-8000-000000000061']::uuid[])$q$, '22023');
select ch_test.err('Gruppe: samme menighet to ganger teller som én', $q$select public.create_group('Dobbel', null, array['61616161-0000-4000-8000-000000000061', '61616161-0000-4000-8000-000000000061']::uuid[])$q$, '22023');
select ch_test.err('Gruppe: 21 menigheter avvises (høyst 20)', $q$select public.create_group('For stor', null, array(select gen_random_uuid() from generate_series(1, 21)))$q$, 'CH008');
select ch_test.err('Gruppe: menighet som ikke finnes eller ikke er aktiv avvises', $q$select public.create_group('Ukjent', null, array['61616161-0000-4000-8000-000000000061', gen_random_uuid()])$q$, '22023');
select ch_test.ok('Gruppe: Moderator oppretter «Påskeprosjekt» med G1, G2 og G3', $q$select public.create_group('  Påskeprosjekt ', 'Felles bilder til påske', array['61616161-0000-4000-8000-000000000061', '62626262-0000-4000-8000-000000000062', '63636363-0000-4000-8000-000000000063']::uuid[])$q$);
set local role postgres;
insert into ch_test.grp select name, id from public.church_links where name = 'Påskeprosjekt';
select ch_test.cnt('Gruppe: navnet er trimmet, og gruppen har tre aktive medlemmer', $q$select 1 from public.church_link_members where link_id = (select id from ch_test.grp where name = 'Påskeprosjekt') and status = 'active'$q$, 3);
select ch_test.cnt('Gruppe: Admin i alle tre menighetene fikk varsel', $q$select 1 from public.notifications where kind = 'church_link' and title = 'Ny samarbeidsgruppe' and user_id in ('00000000-0000-4000-8000-000000000061', '00000000-0000-4000-8000-000000000063', '00000000-0000-4000-8000-000000000065')$q$, 3);
select ch_test.cnt('Gruppe: opprettelsen er loggført', $q$select 1 from public.audit_logs where action = 'groups.create' and meta ->> 'name' = 'Påskeprosjekt' and jsonb_array_length(meta -> 'churches') = 3$q$, 1);
set local role authenticated;

-- Hvem ser gruppen
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-g66","aal":"aal1"}';
select ch_test.cnt('Gruppe: medlem i G3 ser gruppen med navn og alle tre menighetene', $q$select 1 from public.my_groups() where name = 'Påskeprosjekt' and jsonb_array_length(members) = 3 and my_church = '63636363-0000-4000-8000-000000000063'$q$, 1);
select ch_test.cnt('Gruppe: medlem ser ingen tall for kopier (bare stab)', $q$select 1 from public.my_groups() where copies is null and bytes is null and hidden_copies is null$q$, 1);
select ch_test.cnt('Gruppe: medlem leser gruppen i church_links', $q$select 1 from public.church_links where id = (select id from ch_test.grp where name = 'Påskeprosjekt')$q$, 1);
select ch_test.cnt('Gruppe: medlemslisten kan ikke leses direkte', $q$select 1 from public.church_link_members$q$, 0);
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-g61","aal":"aal1"}';
select ch_test.cnt('Gruppe: Admin i G1 ser gruppen og menighetene', $q$select 1 from public.my_groups() where name = 'Påskeprosjekt' and jsonb_array_length(members) = 3$q$, 1);
select ch_test.err('Gruppe: Admin kan ikke endre navn', $q$select public.update_group((select id from ch_test.grp where name = 'Påskeprosjekt'), 'Nytt navn', null)$q$, '42501');
select ch_test.err('Gruppe: Admin kan ikke legge til menighet', $q$select public.add_group_church((select id from ch_test.grp where name = 'Påskeprosjekt'), '64646464-0000-4000-8000-000000000064')$q$, '42501');
select ch_test.err('Gruppe: Admin kan ikke fjerne menighet (heller ikke egen – kan ikke forlate gruppen)', $q$select public.remove_group_church((select id from ch_test.grp where name = 'Påskeprosjekt'), '61616161-0000-4000-8000-000000000061')$q$, '42501');
select ch_test.err('Gruppe: Admin kan ikke avslutte', $q$select public.end_link((select id from ch_test.grp where name = 'Påskeprosjekt'))$q$, '42501');
select ch_test.err('Gruppe: Admin får ikke metadata-oversikten', $q$select public.link_files_meta((select id from ch_test.grp where name = 'Påskeprosjekt'))$q$, '42501');
select ch_test.err('Gruppe: Admin kan ikke skrive i medlemslisten', $q$insert into public.church_link_members (link_id, church_id) values ((select id from ch_test.grp where name = 'Påskeprosjekt'), '64646464-0000-4000-8000-000000000064')$q$, '42501');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-g62","aal":"aal1"}';
select ch_test.err('Gruppe: medlem kan ikke legge til menighet', $q$select public.add_group_church((select id from ch_test.grp where name = 'Påskeprosjekt'), '64646464-0000-4000-8000-000000000064')$q$, '42501');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-g67","aal":"aal1"}';
select ch_test.cnt('Gruppe: menighet utenfor (G4) ser ingen grupper', $q$select 1 from public.my_groups()$q$, 0);
select ch_test.cnt('Gruppe: menighet utenfor (G4) leser ingen grupper i church_links', $q$select 1 from public.church_links where id = (select id from ch_test.grp where name = 'Påskeprosjekt')$q$, 0);
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-2","aal":"aal2"}';
select ch_test.ok('Gruppe: Moderator endrer navn og beskrivelse', $q$select public.update_group((select id from ch_test.grp where name = 'Påskeprosjekt'), 'Påskeprosjekt 2026', 'Bilder til påske')$q$);
select ch_test.err('Gruppe: Moderator kan ikke skrive direkte i medlemslisten', $q$insert into public.church_link_members (link_id, church_id) values ((select id from ch_test.grp where name = 'Påskeprosjekt'), '64646464-0000-4000-8000-000000000064')$q$, '42501');
select ch_test.err('Gruppe: Moderator kan ikke endre gruppen direkte', $q$update public.church_links set name = 'Direkte' where id = (select id from ch_test.grp where name = 'Påskeprosjekt')$q$, '42501');
select ch_test.cnt('Gruppe: Moderator ser gruppen med nytt navn', $q$select 1 from public.my_groups() where id = (select id from ch_test.grp where name = 'Påskeprosjekt') and name = 'Påskeprosjekt 2026' and description = 'Bilder til påske'$q$, 1);
set local role postgres;
select ch_test.cnt('Gruppe: navneendringen er loggført med gammelt og nytt navn', $q$select 1 from public.audit_logs where action = 'groups.update' and meta ->> 'old_name' = 'Påskeprosjekt' and meta ->> 'new_name' = 'Påskeprosjekt 2026'$q$, 1);

-- Kopier inn: Delt mappe (alle medlemmer), Faste (bare Admin), aldri private, ikke fra menigheter utenfor
do $$ begin if exists (select 1 from pg_roles where rolname = 'service_role') then execute 'set local role service_role'; else execute 'set local role postgres'; end if; end $$;
select ch_test.ok('Gruppekopi: medlem i G1 deler fra Delt mappe', $q$select public.register_link_copy('https://test.invalid/auth/v1', 'sub-g62', (select id from ch_test.gf where file_name = 'g1-delt.png'), (select id from ch_test.grp where name = 'Påskeprosjekt'), 'test/gk-g1.png')$q$);
select ch_test.ok('Gruppekopi: medlem i G2 deler fra Delt mappe', $q$select public.register_link_copy('https://test.invalid/auth/v1', 'sub-g64', (select id from ch_test.gf where file_name = 'g2-delt.png'), (select id from ch_test.grp where name = 'Påskeprosjekt'), 'test/gk-g2.png')$q$);
select ch_test.ok('Gruppekopi: medlem i G3 deler fra Delt mappe', $q$select public.register_link_copy('https://test.invalid/auth/v1', 'sub-g66', (select id from ch_test.gf where file_name = 'g3-delt.png'), (select id from ch_test.grp where name = 'Påskeprosjekt'), 'test/gk-g3.png')$q$);
select ch_test.err('Gruppekopi: medlem kan ikke dele fra Faste', $q$select public.register_link_copy('https://test.invalid/auth/v1', 'sub-g66', (select id from ch_test.gf where file_name = 'g3-faste.png'), (select id from ch_test.grp where name = 'Påskeprosjekt'), 'test/gk-x.png')$q$, '42501');
select ch_test.ok('Gruppekopi: Admin i G3 deler fra Faste', $q$select public.register_link_copy('https://test.invalid/auth/v1', 'sub-g65', (select id from ch_test.gf where file_name = 'g3-faste.png'), (select id from ch_test.grp where name = 'Påskeprosjekt'), 'test/gk-g3f.png')$q$);
select ch_test.err('Gruppekopi: private filer kan aldri deles', $q$select public.register_link_copy('https://test.invalid/auth/v1', 'sub-g66', (select id from ch_test.gf where file_name = 'g3-privat.png'), (select id from ch_test.grp where name = 'Påskeprosjekt'), 'test/gk-x.png')$q$, '42501');
select ch_test.err('Gruppekopi: samme fil kan ikke deles to ganger til samme gruppe', $q$select public.register_link_copy('https://test.invalid/auth/v1', 'sub-g62', (select id from ch_test.gf where file_name = 'g1-delt.png'), (select id from ch_test.grp where name = 'Påskeprosjekt'), 'test/gk-x.png')$q$, '23505');
select ch_test.err('Gruppekopi: menighet utenfor gruppen kan ikke dele', $q$select public.register_link_copy('https://test.invalid/auth/v1', 'sub-g67', (select id from ch_test.gf where file_name = 'g4-delt.png'), (select id from ch_test.grp where name = 'Påskeprosjekt'), 'test/gk-x.png')$q$, '42501');
select ch_test.err('Gruppekopi: kan ikke dele en annen menighets fil', $q$select public.register_link_copy('https://test.invalid/auth/v1', 'sub-g62', (select id from ch_test.gf where file_name = 'g2-delt.png'), (select id from ch_test.grp where name = 'Påskeprosjekt'), 'test/gk-x.png')$q$, '42501');
set local role postgres;
create table ch_test.gk as select id, file_name, church_id, storage_key from public.files where storage_key like 'test/gk-%';
grant select on ch_test.gk to anon, authenticated;
do $$ begin if exists (select 1 from pg_roles where rolname = 'service_role') then execute 'grant select on ch_test.gk to service_role'; end if; end $$;
select ch_test.cnt('Gruppekopi: fire kopier, hver med menigheten som bidro', $q$select 1 from ch_test.gk k join ch_test.gf o on o.file_name = k.file_name and o.church_id = k.church_id$q$, 4);
select ch_test.cnt('Gruppekopi: originalene er urørt', $q$select 1 from public.files where id in (select id from ch_test.gf) and link_id is null$q$, 8);
set local role authenticated;
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-g65","aal":"aal1"}';
select ch_test.cnt('Gruppekopi: kopiene teller i kvoten til menigheten som bidro (G3: 180 + 70)', $q$select 1 where (public.storage_usage('63636363-0000-4000-8000-000000000063') ->> 'used_bytes')::bigint = 250$q$, 1);

-- Synlighet og nedlastingslenker
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-g62","aal":"aal1"}';
select ch_test.cnt('Gruppefiler: medlem i G1 ser alle fire kopiene', $q$select 1 from public.files where folder = 'samarbeid'$q$, 4);
select ch_test.cnt('Gruppefiler: medlem i G1 får nøkler til alle fire kopiene', $q$select 1 from public.file_keys(array(select id from ch_test.gk))$q$, 4);
select ch_test.cnt('Gruppefiler: medlem i G1 ser ingen av originalene i G2 og G3', $q$select 1 from public.files where id in (select id from ch_test.gf where church_id <> '61616161-0000-4000-8000-000000000061')$q$, 0);
select ch_test.cnt('Gruppefiler: medlem i G1 får ingen nøkler til originalene i G2 og G3', $q$select 1 from public.file_keys(array(select id from ch_test.gf where church_id <> '61616161-0000-4000-8000-000000000061'))$q$, 0);
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-g66","aal":"aal1"}';
select ch_test.cnt('Gruppefiler: medlem i G3 ser kopiene fra G1 og G2', $q$select 1 from public.files where folder = 'samarbeid' and church_id in ('61616161-0000-4000-8000-000000000061', '62626262-0000-4000-8000-000000000062')$q$, 2);
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-g67","aal":"aal1"}';
select ch_test.cnt('Gruppefiler: medlem i G4 (utenfor) ser ingenting', $q$select 1 from public.files where folder = 'samarbeid'$q$, 0);
select ch_test.cnt('Gruppefiler: medlem i G4 får ingen nøkler', $q$select 1 from public.file_keys(array(select id from ch_test.gk))$q$, 0);
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-2","aal":"aal2"}';
select ch_test.cnt('Gruppefiler: Moderator ser ingen filrader', $q$select 1 from public.files where id in (select id from ch_test.gk)$q$, 0);
select ch_test.cnt('Gruppefiler: Moderator får ingen nøkler', $q$select 1 from public.file_keys(array(select id from ch_test.gk))$q$, 0);
select ch_test.cnt('Gruppefiler: Moderator får metadata for alle fire (ingen skjult)', $q$select 1 from public.link_files_meta((select id from ch_test.grp where name = 'Påskeprosjekt')) where not hidden and church_name like 'Gruppetest G_'$q$, 4);
select ch_test.err('Gruppefiler: Moderator kan ikke slette kopier', $q$select public.delete_file((select id from ch_test.gk where file_name = 'g1-delt.png'))$q$, '42501');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-1","aal":"aal2"}';
select ch_test.cnt('Gruppefiler: Developer uten medlemskap ser ingenting og får ingen nøkler', $q$select 1 from public.files where id in (select id from ch_test.gk) union all select 1 from public.file_keys(array(select id from ch_test.gk))$q$, 0);
select ch_test.cnt('Gruppefiler: Developer ser antall kopier og størrelse', $q$select 1 from public.my_groups() where id = (select id from ch_test.grp where name = 'Påskeprosjekt') and copies = 4 and bytes = 102 and hidden_copies = 0$q$, 1);
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-g63","aal":"aal1"}';
select ch_test.err('Gruppefiler: Admin i G2 kan ikke fjerne G1 sin kopi', $q$select public.delete_file((select id from ch_test.gk where file_name = 'g1-delt.png'))$q$, '42501');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-g62","aal":"aal1"}';
select ch_test.err('Gruppefiler: medlem kan ikke fjerne kopier (heller ikke egne)', $q$select public.delete_file((select id from ch_test.gk where file_name = 'g1-delt.png'))$q$, '42501');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-g63","aal":"aal1"}';
select ch_test.ok_rb('Gruppefiler: Admin i G2 kan fjerne egen kopi', $q$select public.delete_file((select id from ch_test.gk where file_name = 'g2-delt.png'))$q$);

-- Fjerning av G3: kopiene skjules (ikke slettet), andres kopier påvirkes ikke
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-2","aal":"aal2"}';
select ch_test.ok('Fjerning fra gruppe: Moderator fjerner G3', $q$select public.remove_group_church((select id from ch_test.grp where name = 'Påskeprosjekt'), '63636363-0000-4000-8000-000000000063')$q$);
select ch_test.err('Fjerning fra gruppe: G3 er ikke lenger med', $q$select public.remove_group_church((select id from ch_test.grp where name = 'Påskeprosjekt'), '63636363-0000-4000-8000-000000000063')$q$, '22023');
select ch_test.err('Fjerning fra gruppe: nest siste menighet kan ikke fjernes', $q$select public.remove_group_church((select id from ch_test.grp where name = 'Påskeprosjekt'), '62626262-0000-4000-8000-000000000062')$q$, 'CH007');
select ch_test.cnt('Fjerning fra gruppe: Moderator ser fortsatt alle fire kopiene, to merket skjult', $q$select 1 from public.link_files_meta((select id from ch_test.grp where name = 'Påskeprosjekt')) where hidden = (church_id = '63636363-0000-4000-8000-000000000063')$q$, 4);
select ch_test.cnt('Fjerning fra gruppe: Moderator ser G3 som fjernet i medlemslisten', $q$select 1 from public.my_groups() g, jsonb_array_elements(g.members) m where g.id = (select id from ch_test.grp where name = 'Påskeprosjekt') and m ->> 'name' = 'Gruppetest G3' and m ->> 'status' = 'left' and g.hidden_copies = 2$q$, 1);
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-g66","aal":"aal1"}';
select ch_test.cnt('Fjerning fra gruppe: medlem i G3 ser ingen kopier i gruppen (heller ikke egne)', $q$select 1 from public.files where folder = 'samarbeid'$q$, 0);
select ch_test.cnt('Fjerning fra gruppe: medlem i G3 får ingen nøkler', $q$select 1 from public.file_keys(array(select id from ch_test.gk))$q$, 0);
select ch_test.cnt('Fjerning fra gruppe: medlem i G3 ser ikke gruppen', $q$select 1 from public.my_groups() union all select 1 from public.church_links where id = (select id from ch_test.grp where name = 'Påskeprosjekt')$q$, 0);
select ch_test.err('Fjerning fra gruppe: medlem i G3 kan ikke dele nye kopier', $q$select public.can_transfer((select id from ch_test.gf where file_name = 'g3-ny.png'), (select id from ch_test.grp where name = 'Påskeprosjekt'))$q$, '42501');
select ch_test.cnt('Fjerning fra gruppe: originalene i G3 er urørt og synlige for G3', $q$select 1 from public.files where id in (select id from ch_test.gf where church_id = '63636363-0000-4000-8000-000000000063' and file_name <> 'g3-privat.png')$q$, 3);
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-g65","aal":"aal1"}';
select ch_test.err('Fjerning fra gruppe: Admin i G3 kan ikke slette sine skjulte kopier (v1)', $q$select public.delete_file((select id from ch_test.gk where file_name = 'g3-delt.png'))$q$, '42501');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-g62","aal":"aal1"}';
select ch_test.cnt('Fjerning fra gruppe: medlem i G1 ser fortsatt G1 og G2 sine kopier, ikke G3 sine', $q$select 1 from public.files where folder = 'samarbeid' and church_id <> '63636363-0000-4000-8000-000000000063' union all select 1 from public.files where folder = 'samarbeid' and church_id = '63636363-0000-4000-8000-000000000063'$q$, 2);
select ch_test.cnt('Fjerning fra gruppe: medlem i G1 får ikke nøkler til G3 sine kopier', $q$select 1 from public.file_keys(array(select id from ch_test.gk where church_id = '63636363-0000-4000-8000-000000000063'))$q$, 0);
select ch_test.cnt('Fjerning fra gruppe: medlem i G1 ser to menigheter i gruppen', $q$select 1 from public.my_groups() where jsonb_array_length(members) = 2$q$, 1);
set local role postgres;
select ch_test.cnt('Fjerning fra gruppe: ingen kopier er slettet', $q$select 1 from public.files where id in (select id from ch_test.gk)$q$, 4);
select ch_test.cnt('Fjerning fra gruppe: medlemsraden er markert med tidspunkt og hvem', $q$select 1 from public.church_link_members where church_id = '63636363-0000-4000-8000-000000000063' and status = 'left' and left_at is not null and left_by = '00000000-0000-4000-8000-000000000002'$q$, 1);
select ch_test.cnt('Fjerning fra gruppe: Admin i G3 fikk varsel om skjulte kopier', $q$select 1 from public.notifications where user_id = '00000000-0000-4000-8000-000000000065' and title = 'Fjernet fra samarbeidsgruppe'$q$, 1);
select ch_test.cnt('Fjerning fra gruppe: Admin i G1 og G2 fikk varsel', $q$select 1 from public.notifications where user_id in ('00000000-0000-4000-8000-000000000061', '00000000-0000-4000-8000-000000000063') and title = 'Samarbeidsgruppe: menighet fjernet'$q$, 2);
select ch_test.cnt('Fjerning fra gruppe: loggført med antall skjulte kopier', $q$select 1 from public.audit_logs where action = 'groups.remove_church' and church_id = '63636363-0000-4000-8000-000000000063' and (meta ->> 'copies_hidden')::int = 2$q$, 1);

-- Deling mens G3 er ute, og gjeninnmelding
do $$ begin if exists (select 1 from pg_roles where rolname = 'service_role') then execute 'set local role service_role'; else execute 'set local role postgres'; end if; end $$;
select ch_test.ok('Gjeninnmelding: G1 deler en ny kopi mens G3 er ute', $q$select public.register_link_copy('https://test.invalid/auth/v1', 'sub-g62', (select id from ch_test.gf where file_name = 'g1-ny.png'), (select id from ch_test.grp where name = 'Påskeprosjekt'), 'test/gk-g1ny.png')$q$);
set local role authenticated;
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-2","aal":"aal2"}';
select ch_test.ok('Gjeninnmelding: Moderator legger G3 til igjen', $q$select public.add_group_church((select id from ch_test.grp where name = 'Påskeprosjekt'), '63636363-0000-4000-8000-000000000063')$q$);
select ch_test.err('Gjeninnmelding: kan ikke legges til to ganger', $q$select public.add_group_church((select id from ch_test.grp where name = 'Påskeprosjekt'), '63636363-0000-4000-8000-000000000063')$q$, 'CH009');
select ch_test.err('Gjeninnmelding: inaktiv eller ukjent menighet avvises', $q$select public.add_group_church((select id from ch_test.grp where name = 'Påskeprosjekt'), gen_random_uuid())$q$, '22023');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-g66","aal":"aal1"}';
select ch_test.cnt('Gjeninnmelding: G3 ser alle fem kopiene (også den som ble delt mens G3 var ute)', $q$select 1 from public.files where folder = 'samarbeid'$q$, 5);
select ch_test.cnt('Gjeninnmelding: G3 får nøkler til alle fem', $q$select 1 from public.file_keys(array(select id from public.files where folder = 'samarbeid'))$q$, 5);
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-g64","aal":"aal1"}';
select ch_test.cnt('Gjeninnmelding: G2 ser G3 sine kopier igjen', $q$select 1 from public.files where folder = 'samarbeid' and church_id = '63636363-0000-4000-8000-000000000063'$q$, 2);
set local role postgres;
select ch_test.cnt('Gjeninnmelding: samme medlemsrad er aktiv igjen (ingen ny rad)', $q$select 1 from public.church_link_members where church_id = '63636363-0000-4000-8000-000000000063' and status = 'active' and left_at is null$q$, 1);
select ch_test.cnt('Gjeninnmelding: loggført med antall kopier som vises igjen', $q$select 1 from public.audit_logs where action = 'groups.add_church' and church_id = '63636363-0000-4000-8000-000000000063' and (meta ->> 'rejoin')::boolean and (meta ->> 'copies_shown')::int = 2$q$, 1);

-- Midlertidig deaktivert menighet: bidragene skjules, ingenting slettes
update public.churches set status = 'temporarily_disabled' where id = '62626262-0000-4000-8000-000000000062';
set local role authenticated;
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-g62","aal":"aal1"}';
select ch_test.cnt('Deaktivert i gruppe: G1 ser ikke G2 sin kopi', $q$select 1 from public.files where folder = 'samarbeid' and church_id = '62626262-0000-4000-8000-000000000062'$q$, 0);
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-g64","aal":"aal1"}';
select ch_test.cnt('Deaktivert i gruppe: G2 ser ingenting', $q$select 1 from public.files where folder = 'samarbeid'$q$, 0);
set local role postgres;
update public.churches set status = 'active' where id = '62626262-0000-4000-8000-000000000062';

-- Høyst 20 menigheter (lås på gruppen)
insert into public.churches (name) select 'Grensetest ' || lpad(n::text, 2, '0') from generate_series(1, 18) n;
set local role authenticated;
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-2","aal":"aal2"}';
select ch_test.ok('Grense: 17 menigheter til gir 20 i alt', $q$select count(public.add_group_church((select id from ch_test.grp where name = 'Påskeprosjekt'), c.id)) from public.churches c where c.name between 'Grensetest 01' and 'Grensetest 17'$q$);
select ch_test.err('Grense: menighet nr. 21 avvises', $q$select public.add_group_church((select id from ch_test.grp where name = 'Påskeprosjekt'), (select id from public.churches where name = 'Grensetest 18'))$q$, 'CH008');
select ch_test.ok_rb('Grense: en gruppe kan opprettes med nøyaktig 20', $q$select public.create_group('Tjue', null, array(select id from public.churches where name like 'Grensetest %' order by name limit 20))$q$);
select ch_test.ok('Grense: etter fjerning av én er det plass igjen', $q$select public.remove_group_church((select id from ch_test.grp where name = 'Påskeprosjekt'), (select id from public.churches where name = 'Grensetest 17'))$q$);
select ch_test.ok('Grense: nr. 20 kan legges til', $q$select public.add_group_church((select id from ch_test.grp where name = 'Påskeprosjekt'), (select id from public.churches where name = 'Grensetest 18'))$q$);
set local role postgres;
select ch_test.cnt('Grense: gruppen har 20 aktive medlemmer', $q$select 1 from public.church_link_members where link_id = (select id from ch_test.grp where name = 'Påskeprosjekt') and status = 'active'$q$, 20);
select ch_test.cnt('Grense: låsen er på gruppen (add_group_church tar FOR UPDATE)', $q$select 1 from pg_proc where proname = 'add_group_church' and prosrc like '%for update%' and prosrc like '%>= 20%'$q$, 1);

-- Avslutning skjuler alt; gjeninnmelding er lov i avsluttet gruppe; gjenåpning viser igjen
set local role authenticated;
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-2","aal":"aal2"}';
select ch_test.ok('Avsluttet gruppe: Moderator fjerner G2 (20 → 19)', $q$select public.remove_group_church((select id from ch_test.grp where name = 'Påskeprosjekt'), '62626262-0000-4000-8000-000000000062')$q$);
select ch_test.ok('Avsluttet gruppe: Moderator avslutter', $q$select public.end_link((select id from ch_test.grp where name = 'Påskeprosjekt'))$q$);
select ch_test.ok('Avsluttet gruppe: G2 kan legges til igjen mens gruppen er avsluttet', $q$select public.add_group_church((select id from ch_test.grp where name = 'Påskeprosjekt'), '62626262-0000-4000-8000-000000000062')$q$);
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-g64","aal":"aal1"}';
select ch_test.cnt('Avsluttet gruppe: G2 ser ingenting før gjenåpning', $q$select 1 from public.files where folder = 'samarbeid' union all select 1 from public.my_groups()$q$, 0);
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-g62","aal":"aal1"}';
select ch_test.cnt('Avsluttet gruppe: G1 ser ingenting', $q$select 1 from public.files where folder = 'samarbeid' union all select 1 from public.file_keys(array(select id from public.files where storage_key like 'test/gk-%'))$q$, 0);
select ch_test.err('Avsluttet gruppe: ingen nye kopier', $q$select public.can_transfer((select id from ch_test.gf where file_name = 'g1-delt.png'), (select id from ch_test.grp where name = 'Påskeprosjekt'))$q$, '22023');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-g61","aal":"aal1"}';
select ch_test.err('Avsluttet gruppe: Admin kan ikke gjenåpne', $q$select public.reopen_link((select id from ch_test.grp where name = 'Påskeprosjekt'))$q$, '42501');
select ch_test.err('Avsluttet gruppe: Admin kan ikke slette', $q$select public.delete_link((select id from ch_test.grp where name = 'Påskeprosjekt'))$q$, '42501');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-2","aal":"aal2"}';
select ch_test.ok('Avsluttet gruppe: Moderator gjenåpner', $q$select public.reopen_link((select id from ch_test.grp where name = 'Påskeprosjekt'))$q$);
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-g64","aal":"aal1"}';
select ch_test.cnt('Gjenåpnet gruppe: G2 ser alle fem kopiene igjen', $q$select 1 from public.files where folder = 'samarbeid'$q$, 5);
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-2","aal":"aal2"}';
select ch_test.err('Sletting av gruppe: aktiv gruppe kan ikke slettes', $q$select public.delete_link((select id from ch_test.grp where name = 'Påskeprosjekt'))$q$, '22023');
select ch_test.ok('Sletting av gruppe: Moderator avslutter igjen', $q$select public.end_link((select id from ch_test.grp where name = 'Påskeprosjekt'))$q$);
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-1","aal":"aal1"}';
select ch_test.err('Sletting av gruppe: Developer uten MFA avvises', $q$select public.delete_link((select id from ch_test.grp where name = 'Påskeprosjekt'))$q$, '42501');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-1","aal":"aal2"}';
select ch_test.cnt('Sletting av gruppe: Developer sletter, alle fem kopiene (også tidligere skjulte) går til køen', $q$select 1 where (public.delete_link((select id from ch_test.grp where name = 'Påskeprosjekt')) ->> 'copies')::int = 5$q$, 1);
set local role postgres;
select ch_test.cnt('Sletting av gruppe: gruppen, medlemslisten og kopiene er borte', $q$select 1 from public.church_links where id = (select id from ch_test.grp where name = 'Påskeprosjekt') union all select 1 from public.church_link_members where link_id = (select id from ch_test.grp where name = 'Påskeprosjekt') union all select 1 from public.files where storage_key like 'test/gk-%'$q$, 0);
select ch_test.cnt('Sletting av gruppe: originalene er urørt', $q$select 1 from public.files where id in (select id from ch_test.gf)$q$, 8);
select ch_test.cnt('Sletting av gruppe: fem lagringsnøkler venter i køen', $q$select 1 from public.file_cleanup_queue where storage_key like 'test/gk-%' and status = 'pending'$q$, 5);
select ch_test.cnt('Sletting av gruppe: loggført med navn og medlemmer', $q$select 1 from public.audit_logs where action = 'groups.delete' and meta ->> 'name' = 'Påskeprosjekt 2026' and jsonb_array_length(meta -> 'members') = 21 and (meta ->> 'copies')::int = 5$q$, 1);

-- Endelig sletting av en menighet i grupper: medlemskapet og menighetens kopier forsvinner; grupper med færre enn to igjen avsluttes
set local role authenticated;
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-2","aal":"aal2"}';
select ch_test.ok('Livsløp i gruppe: gruppe X med G4 og G5', $q$select public.create_group('Gruppe X', null, array['64646464-0000-4000-8000-000000000064', '65656565-0000-4000-8000-000000000065']::uuid[])$q$);
select ch_test.ok('Livsløp i gruppe: gruppe Y med G1, G2 og G4', $q$select public.create_group('Gruppe Y', null, array['61616161-0000-4000-8000-000000000061', '62626262-0000-4000-8000-000000000062', '64646464-0000-4000-8000-000000000064']::uuid[])$q$);
set local role postgres;
insert into ch_test.grp select name, id from public.church_links where name in ('Gruppe X', 'Gruppe Y');
do $$ begin if exists (select 1 from pg_roles where rolname = 'service_role') then execute 'set local role service_role'; else execute 'set local role postgres'; end if; end $$;
select ch_test.ok('Livsløp i gruppe: G4 deler en kopi i Y', $q$select public.register_link_copy('https://test.invalid/auth/v1', 'sub-g67', (select id from ch_test.gf where file_name = 'g4-delt.png'), (select id from ch_test.grp where name = 'Gruppe Y'), 'test/gy-g4.png')$q$);
select ch_test.ok('Livsløp i gruppe: G1 deler en kopi i Y', $q$select public.register_link_copy('https://test.invalid/auth/v1', 'sub-g62', (select id from ch_test.gf where file_name = 'g1-delt.png'), (select id from ch_test.grp where name = 'Gruppe Y'), 'test/gy-g1.png')$q$);
set local role postgres;
update public.churches set status = 'pending_deletion' where id = '64646464-0000-4000-8000-000000000064';
do $$ begin if exists (select 1 from pg_roles where rolname = 'service_role') then execute 'set local role service_role'; end if; end $$;
select ch_test.ok('Livsløp i gruppe: server sletter G4 for Developer med MFA', $q$select public.purge_church('64646464-0000-4000-8000-000000000064', 'https://test.invalid/auth/v1', 'sub-1', 'aal2')$q$);
set local role postgres;
select ch_test.cnt('Livsløp i gruppe: gruppe X (bare G5 igjen) er avsluttet', $q$select 1 from public.church_links where id = (select id from ch_test.grp where name = 'Gruppe X') and status = 'ended'$q$, 1);
select ch_test.cnt('Livsløp i gruppe: gruppe Y er fortsatt aktiv med G1 og G2', $q$select 1 from public.church_links l where l.id = (select id from ch_test.grp where name = 'Gruppe Y') and l.status = 'active' and app.group_active_count(l.id) = 2$q$, 1);
select ch_test.cnt('Livsløp i gruppe: G4 sin kopi er slettet med menigheten, G1 sin er igjen', $q$select 1 from public.files where storage_key = 'test/gy-g1.png' union all select 1 from public.files where storage_key = 'test/gy-g4.png'$q$, 1);
select ch_test.cnt('Livsløp i gruppe: slettingen er loggført med avsluttede grupper', $q$select 1 from public.audit_logs where action = 'churches.purge' and church_id = '64646464-0000-4000-8000-000000000064' and jsonb_array_length(meta -> 'groups_ended') = 1$q$, 1);
set local role authenticated;
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-g64","aal":"aal1"}';
select ch_test.cnt('Livsløp i gruppe: G2 ser fortsatt G1 sin kopi i Y', $q$select 1 from public.files where folder = 'samarbeid' and church_id = '61616161-0000-4000-8000-000000000061'$q$, 1);
set local role postgres;

-- ---------- Samarbeidsmappe: direkte opplasting, synlighet og sletting ----------
-- Gruppe «Opplastingsgruppe» med G1 og G2 (G3 utenfor). 62 = medlem i G1, 61 = Admin i G1, 64 = medlem i G2, 63 = Admin i G2.
set local role authenticated;
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-2","aal":"aal2"}';
select ch_test.ok('Samarbeidsmappe: Moderator oppretter «Opplastingsgruppe» med G1 og G2', $q$select public.create_group('Opplastingsgruppe', null, array['61616161-0000-4000-8000-000000000061', '62626262-0000-4000-8000-000000000062']::uuid[])$q$);
set local role postgres;
insert into ch_test.grp select name, id from public.church_links where name = 'Opplastingsgruppe';
set local role authenticated;
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-g62","aal":"aal1"}';
select ch_test.ok('Samarbeidsmappe: medlem i G1 kan laste opp (forhåndskontroll)', $q$select public.can_upload_link((select id from ch_test.grp where name = 'Opplastingsgruppe'), '61616161-0000-4000-8000-000000000061', 1000)$q$);
select ch_test.err('Samarbeidsmappe: kan ikke laste opp for en annen menighet', $q$select public.can_upload_link((select id from ch_test.grp where name = 'Opplastingsgruppe'), '62626262-0000-4000-8000-000000000062', 1000)$q$, '42501');
select ch_test.err('Samarbeidsmappe: ugyldig størrelse avvises', $q$select public.can_upload_link((select id from ch_test.grp where name = 'Opplastingsgruppe'), '61616161-0000-4000-8000-000000000061', 4194305)$q$, '22023');
select ch_test.err('Samarbeidsmappe: gruppe som ikke finnes avvises uten å avsløre noe', $q$select public.can_upload_link(gen_random_uuid(), '61616161-0000-4000-8000-000000000061', 1000)$q$, '42501');
select ch_test.err('Samarbeidsmappe: brukeren kan ikke registrere opplasting selv (bare serveren)', $q$select public.register_link_upload('https://test.invalid/auth/v1', 'sub-g62', (select id from ch_test.grp where name = 'Opplastingsgruppe'), '61616161-0000-4000-8000-000000000061', 'test/gu-x.png', 'x.png', 'image/png', 10, null)$q$, '42501');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-g66","aal":"aal1"}';
select ch_test.err('Samarbeidsmappe: menighet utenfor gruppen (G3) kan ikke laste opp', $q$select public.can_upload_link((select id from ch_test.grp where name = 'Opplastingsgruppe'), '63636363-0000-4000-8000-000000000063', 1000)$q$, '42501');
set local role anon;
select ch_test.err('Samarbeidsmappe: ikke innlogget kan ikke laste opp', $q$select public.can_upload_link((select id from ch_test.grp where name = 'Opplastingsgruppe'), '61616161-0000-4000-8000-000000000061', 1000)$q$, '42501');
do $$ begin if exists (select 1 from pg_roles where rolname = 'service_role') then execute 'set local role service_role'; else execute 'set local role postgres'; end if; end $$;
select ch_test.ok('Samarbeidsmappe: server registrerer opplasting fra medlem i G1', $q$select public.register_link_upload('https://test.invalid/auth/v1', 'sub-g62', (select id from ch_test.grp where name = 'Opplastingsgruppe'), '61616161-0000-4000-8000-000000000061', 'test/gu-g1.png', 'gu-g1.png', 'image/png', 100, null)$q$);
select ch_test.ok('Samarbeidsmappe: server registrerer opplasting fra medlem i G2', $q$select public.register_link_upload('https://test.invalid/auth/v1', 'sub-g64', (select id from ch_test.grp where name = 'Opplastingsgruppe'), '62626262-0000-4000-8000-000000000062', 'test/gu-g2.png', 'gu-g2.png', 'image/png', 200, null)$q$);
select ch_test.err('Samarbeidsmappe: server avviser opplasting fra G3 (utenfor gruppen)', $q$select public.register_link_upload('https://test.invalid/auth/v1', 'sub-g66', (select id from ch_test.grp where name = 'Opplastingsgruppe'), '63636363-0000-4000-8000-000000000063', 'test/gu-g3.png', 'gu-g3.png', 'image/png', 10, null)$q$, '42501');
select ch_test.ok('Samarbeidsmappe: kopi fra Delt mappe virker som før', $q$select public.register_link_copy('https://test.invalid/auth/v1', 'sub-g62', (select id from ch_test.gf where file_name = 'g1-ny.png'), (select id from ch_test.grp where name = 'Opplastingsgruppe'), 'test/gu-kopi.png')$q$);
set local role postgres;
create table ch_test.gu as select id, file_name, church_id, link_upload, source_folder from public.files where storage_key like 'test/gu-%';
grant select on ch_test.gu to anon, authenticated;
do $$ begin if exists (select 1 from pg_roles where rolname = 'service_role') then execute 'grant select on ch_test.gu to service_role'; end if; end $$;
select ch_test.cnt('Samarbeidsmappe: to opplastinger merket link_upload med source_folder bilder, kopien ikke', $q$select 1 from ch_test.gu where (link_upload and source_folder = 'bilder') or (not link_upload and file_name = 'g1-ny.png')$q$, 3);
select ch_test.cnt('Samarbeidsmappe: opplastingen tilhører (og teller for) menigheten som bidro', $q$select 1 from public.files where storage_key = 'test/gu-g1.png' and church_id = '61616161-0000-4000-8000-000000000061' and folder = 'samarbeid' and visibility = 'church'$q$, 1);
select ch_test.cnt('Samarbeidsmappe: opplastingen er loggført', $q$select 1 from public.audit_logs where action = 'files.insert' and target_id = (select id::text from ch_test.gu where file_name = 'gu-g1.png')$q$, 1);
select ch_test.err('Samarbeidsmappe: link_upload krever samarbeidsmappe', $q$insert into public.files (church_id, storage_key, file_name, mime_type, file_size, folder, visibility, link_upload) values ('61616161-0000-4000-8000-000000000061', 'test/feil.png', 'feil.png', 'image/png', 1, 'bilder', 'church', true)$q$, '23514');
set local role authenticated;
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-g64","aal":"aal1"}';
select ch_test.cnt('Samarbeidsmappe: medlem i G2 ser alle tre filene i gruppen', $q$select 1 from public.files where link_id = (select id from ch_test.grp where name = 'Opplastingsgruppe')$q$, 3);
select ch_test.cnt('Samarbeidsmappe: medlem i G2 får nedlastingslenker til alle tre', $q$select 1 from public.file_keys(array(select id from ch_test.gu))$q$, 3);
select ch_test.err('Samarbeidsmappe: medlem i G2 kan ikke slette G1 sin opplasting', $q$select public.delete_file((select id from ch_test.gu where file_name = 'gu-g1.png'))$q$, '42501');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-g63","aal":"aal1"}';
select ch_test.err('Samarbeidsmappe: Admin i G2 kan ikke slette G1 sin opplasting', $q$select public.delete_file((select id from ch_test.gu where file_name = 'gu-g1.png'))$q$, '42501');
select ch_test.ok_rb('Samarbeidsmappe: Admin i G2 kan slette opplasting fra egen menighet', $q$select public.delete_file((select id from ch_test.gu where file_name = 'gu-g2.png'))$q$);
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-g66","aal":"aal1"}';
select ch_test.cnt('Samarbeidsmappe: G3 (utenfor) ser ingenting og får ingen lenker', $q$select 1 from public.files where id in (select id from ch_test.gu) union all select 1 from public.file_keys(array(select id from ch_test.gu))$q$, 0);
select ch_test.err('Samarbeidsmappe: G3 (utenfor) kan ikke slette', $q$select public.delete_file((select id from ch_test.gu where file_name = 'gu-g1.png'))$q$, '42501');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-2","aal":"aal2"}';
select ch_test.cnt('Samarbeidsmappe: Moderator ser ingen filrader og får ingen lenker', $q$select 1 from public.files where id in (select id from ch_test.gu) union all select 1 from public.file_keys(array(select id from ch_test.gu))$q$, 0);
select ch_test.cnt('Samarbeidsmappe: Moderator ser metadata for alle tre', $q$select 1 from public.link_files_meta((select id from ch_test.grp where name = 'Opplastingsgruppe'))$q$, 3);
select ch_test.err('Samarbeidsmappe: Moderator kan ikke slette', $q$select public.delete_file((select id from ch_test.gu where file_name = 'gu-g1.png'))$q$, '42501');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-g62","aal":"aal1"}';
select ch_test.err('Samarbeidsmappe: medlem kan fortsatt ikke slette kopier (bare Admin)', $q$select public.delete_file((select id from ch_test.gu where file_name = 'g1-ny.png'))$q$, '42501');
select ch_test.ok_rb('Samarbeidsmappe: den som lastet opp, kan slette egen opplasting', $q$select public.delete_file((select id from ch_test.gu where file_name = 'gu-g1.png'))$q$);
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-g61","aal":"aal1"}';
select ch_test.ok_rb('Samarbeidsmappe: Admin i G1 kan slette medlemmets opplasting', $q$select public.delete_file((select id from ch_test.gu where file_name = 'gu-g1.png'))$q$);
select ch_test.ok_rb('Samarbeidsmappe: Admin i G1 kan fjerne kopien', $q$select public.delete_file((select id from ch_test.gu where file_name = 'g1-ny.png'))$q$);

-- Kvote, deaktivert medlemskap og avsluttet gruppe
set local role postgres;
update public.churches set storage_quota_mb = 0 where id = '61616161-0000-4000-8000-000000000061';
set local role authenticated;
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-g62","aal":"aal1"}';
select ch_test.err('Samarbeidsmappe: full kvote stopper opplasting (54000)', $q$select public.can_upload_link((select id from ch_test.grp where name = 'Opplastingsgruppe'), '61616161-0000-4000-8000-000000000061', 1000)$q$, '54000');
set local role postgres;
update public.churches set storage_quota_mb = 200 where id = '61616161-0000-4000-8000-000000000061';
update public.memberships set status = 'disabled' where user_id = '00000000-0000-4000-8000-000000000062' and church_id = '61616161-0000-4000-8000-000000000061';
set local role authenticated;
select ch_test.err('Samarbeidsmappe: deaktivert medlem kan ikke laste opp', $q$select public.can_upload_link((select id from ch_test.grp where name = 'Opplastingsgruppe'), '61616161-0000-4000-8000-000000000061', 1000)$q$, '42501');
select ch_test.err('Samarbeidsmappe: deaktivert medlem kan ikke slette egen opplasting', $q$select public.delete_file((select id from ch_test.gu where file_name = 'gu-g1.png'))$q$, '42501');
set local role postgres;
update public.memberships set status = 'active' where user_id = '00000000-0000-4000-8000-000000000062' and church_id = '61616161-0000-4000-8000-000000000061';
set local role authenticated;
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-2","aal":"aal2"}';
select ch_test.ok('Samarbeidsmappe: Moderator avslutter gruppen', $q$select public.end_link((select id from ch_test.grp where name = 'Opplastingsgruppe'))$q$);
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-g62","aal":"aal1"}';
select ch_test.err('Samarbeidsmappe: avsluttet gruppe – ingen opplasting', $q$select public.can_upload_link((select id from ch_test.grp where name = 'Opplastingsgruppe'), '61616161-0000-4000-8000-000000000061', 1000)$q$, '42501');
select ch_test.cnt('Samarbeidsmappe: avsluttet gruppe – filene er skjult og gruppen vises ikke', $q$select 1 from public.files where id in (select id from ch_test.gu) union all select 1 from public.my_groups() where id = (select id from ch_test.grp where name = 'Opplastingsgruppe')$q$, 0);
select ch_test.err('Samarbeidsmappe: avsluttet gruppe – ingen sletting', $q$select public.delete_file((select id from ch_test.gu where file_name = 'gu-g1.png'))$q$, '42501');
do $$ begin if exists (select 1 from pg_roles where rolname = 'service_role') then execute 'set local role service_role'; else execute 'set local role postgres'; end if; end $$;
select ch_test.err('Samarbeidsmappe: server avviser opplasting til avsluttet gruppe', $q$select public.register_link_upload('https://test.invalid/auth/v1', 'sub-g62', (select id from ch_test.grp where name = 'Opplastingsgruppe'), '61616161-0000-4000-8000-000000000061', 'test/gu-sen.png', 'sen.png', 'image/png', 10, null)$q$, '42501');
set local role postgres;
select ch_test.cnt('Samarbeidsmappe: ingenting er slettet ved avslutning', $q$select 1 from public.files where id in (select id from ch_test.gu)$q$, 3);

-- Nye private opplastinger er stengt (også direkte mot databasen); eksisterende private bilder er urørt og bare for eieren
do $$ begin if exists (select 1 from pg_roles where rolname = 'service_role') then execute 'set local role service_role'; else execute 'set local role postgres'; end if; end $$;
select ch_test.err('Privat: server kan ikke registrere ny privat fil', $q$select public.register_file('https://test.invalid/auth/v1', 'sub-g66', '63636363-0000-4000-8000-000000000063', 'bilder', true, 'test/ny-privat.png', 'ny-privat.png', 'image/png', 10, null)$q$, '42501');
select ch_test.ok_rb('Privat: server registrerer vanlig fil i Fellesmappe', $q$select public.register_file('https://test.invalid/auth/v1', 'sub-g66', '63636363-0000-4000-8000-000000000063', 'bilder', false, 'test/ny-felles.png', 'ny-felles.png', 'image/png', 10, null)$q$);
set local role authenticated;
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-g66","aal":"aal1"}';
select ch_test.err('Privat: medlem kan ikke laste opp privat (forhåndskontroll)', $q$select public.can_upload('63636363-0000-4000-8000-000000000063', 'bilder', true, 10)$q$, '42501');
select ch_test.cnt('Privat: eieren ser fortsatt sitt eksisterende private bilde og får lenke', $q$select 1 from public.files where file_name = 'g3-privat.png' union all select 1 from public.file_keys(array(select id from ch_test.gf where file_name = 'g3-privat.png'))$q$, 2);
select ch_test.err('Privat: eksisterende fil kan ikke gjøres privat direkte', $q$update public.files set visibility = 'private' where file_name = 'g3-delt.png'$q$, '42501');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-g65","aal":"aal1"}';
select ch_test.cnt('Privat: Admin ser ikke medlemmets private bilde og får ingen lenke', $q$select 1 from public.files where file_name = 'g3-privat.png' union all select 1 from public.file_keys(array(select id from ch_test.gf where file_name = 'g3-privat.png'))$q$, 0);
set local role postgres;
select ch_test.cnt('Privat: ingen private bilder er endret eller slettet', $q$select 1 from public.files where file_name = 'g3-privat.png' and visibility = 'private'$q$, 1);

-- ---------- Ekstra Admin: Developer og Moderator legger seg selv til / fjerner seg selv ----------
-- Bruker N1 (41 = fast Admin, 42 = medlem) fra navneblokken. Developer (sub-1) og Moderator (sub-2) er ikke medlemmer i N1.
set local role authenticated;
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-n41","aal":"aal1"}';
select ch_test.err('Ekstra Admin: Admin kan ikke bruke funksjonen', $q$select public.add_self_as_admin('41414141-0000-4000-8000-000000000041')$q$, '42501');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-n42","aal":"aal1"}';
select ch_test.err('Ekstra Admin: medlem kan ikke bruke funksjonen', $q$select public.add_self_as_admin('41414141-0000-4000-8000-000000000041')$q$, '42501');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-2","aal":"aal1"}';
select ch_test.err('Ekstra Admin: Moderator uten MFA avvises', $q$select public.add_self_as_admin('41414141-0000-4000-8000-000000000041')$q$, '42501');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-1","aal":"aal1"}';
select ch_test.err('Ekstra Admin: Developer uten MFA avvises', $q$select public.add_self_as_admin('41414141-0000-4000-8000-000000000041')$q$, '42501');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-1","aal":"aal2"}';
select ch_test.err('Ekstra Admin: ukjent menighet avvises', $q$select public.add_self_as_admin(gen_random_uuid())$q$, '22023');
select ch_test.cnt('Ekstra Admin: Developer legger seg til i N1 (medlemskap legges til)', $q$select 1 where (public.add_self_as_admin('41414141-0000-4000-8000-000000000041') ->> 'membership_added')::boolean$q$, 1);
select ch_test.cnt('Ekstra Admin: to ganger er ufarlig (allerede Admin)', $q$select 1 where (public.add_self_as_admin('41414141-0000-4000-8000-000000000041') ->> 'already')::boolean$q$, 1);
select ch_test.cnt('Ekstra Admin: Developer er Admin i N1', $q$select 1 where app.is_church_admin('41414141-0000-4000-8000-000000000041')$q$, 1);
select ch_test.ok('Ekstra Admin: Developer kan vedlikeholde Faste i N1', $q$select public.can_upload('41414141-0000-4000-8000-000000000041', 'faste', false, 10)$q$);
select ch_test.err('Ekstra Admin: en ny FAST Admin kan fortsatt ikke legges til (én fast Admin)', $q$select public.assign_role('00000000-0000-4000-8000-000000000042', 'church_admin', '41414141-0000-4000-8000-000000000041')$q$, '23505');
select ch_test.err('Ekstra Admin: ingen kan endre egne roller via assign_role', $q$select public.assign_role('00000000-0000-4000-8000-000000000001', 'church_admin', '41414141-0000-4000-8000-000000000041')$q$, '42501');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-2","aal":"aal2"}';
select ch_test.ok('Ekstra Admin: Moderator legger seg også til', $q$select public.add_self_as_admin('41414141-0000-4000-8000-000000000041')$q$);
set local role postgres;
select ch_test.cnt('Ekstra Admin: den faste Admin er uendret, og to ekstra Admin er lagt til', $q$select 1 from public.user_roles where church_id = '41414141-0000-4000-8000-000000000041' and role = 'church_admin' and revoked_at is null and ((user_id = '00000000-0000-4000-8000-000000000041' and not extra_admin) or (user_id in ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002') and extra_admin and extra_membership))$q$, 3);
select ch_test.cnt('Ekstra Admin: den faste Admin fikk varsel om begge', $q$select 1 from public.notifications where user_id = '00000000-0000-4000-8000-000000000041' and title = 'Ekstra Admin i menigheten'$q$, 2);
select ch_test.cnt('Ekstra Admin: loggført', $q$select 1 from public.audit_logs where action = 'roles.extra_admin_add' and church_id = '41414141-0000-4000-8000-000000000041'$q$, 2);
select ch_test.err('Ekstra Admin: kan ikke settes på andre roller enn Admin', $q$update public.user_roles set extra_admin = true where role = 'developer' and user_id = '00000000-0000-4000-8000-000000000001'$q$, '23514');
set local role authenticated;
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-n41","aal":"aal1"}';
select ch_test.cnt('Ekstra Admin: fast Admin ser de ekstra Admin-rollene', $q$select 1 from public.user_roles where church_id = '41414141-0000-4000-8000-000000000041' and extra_admin and revoked_at is null$q$, 2);
select ch_test.err('Ekstra Admin: fast Admin kan ikke fjerne seg selv med funksjonen', $q$select public.remove_self_as_admin('41414141-0000-4000-8000-000000000041')$q$, '22023');
select ch_test.err('Ekstra Admin: fast Admin kan ikke fjerne en ekstra Admin (bare stab)', $q$select public.remove_membership('00000000-0000-4000-8000-000000000002', '41414141-0000-4000-8000-000000000041')$q$, '42501');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-1","aal":"aal2"}';
select ch_test.cnt('Ekstra Admin: stab fjerner en ekstra Admin uten «stå uten Admin»-bekreftelse', $q$select 1 where not (public.remove_membership('00000000-0000-4000-8000-000000000002', '41414141-0000-4000-8000-000000000041') ->> 'church_without_admin')::boolean$q$, 1);
select ch_test.err('Ekstra Admin: den faste Admin krever fortsatt bekreftelsen (CH003)', $q$select public.remove_membership('00000000-0000-4000-8000-000000000041', '41414141-0000-4000-8000-000000000041')$q$, 'CH003');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-1","aal":"aal1"}';
select ch_test.cnt('Ekstra Admin: Developer fjerner seg selv (også uten MFA), medlemskapet som kom med rollen fjernes', $q$select 1 where (public.remove_self_as_admin('41414141-0000-4000-8000-000000000041') ->> 'membership_removed')::boolean$q$, 1);
select ch_test.err('Ekstra Admin: kan ikke fjernes to ganger', $q$select public.remove_self_as_admin('41414141-0000-4000-8000-000000000041')$q$, '22023');
set local role postgres;
select ch_test.cnt('Ekstra Admin: bare den faste Admin er igjen, og Developer er ikke lenger aktivt medlem', $q$select 1 from public.user_roles where church_id = '41414141-0000-4000-8000-000000000041' and role = 'church_admin' and revoked_at is null and user_id = '00000000-0000-4000-8000-000000000041' and not extra_admin union all select 1 from public.memberships where user_id = '00000000-0000-4000-8000-000000000001' and church_id = '41414141-0000-4000-8000-000000000041' and status = 'active'$q$, 1);
select ch_test.cnt('Ekstra Admin: fjerningen er loggført', $q$select 1 from public.audit_logs where action = 'roles.extra_admin_remove' and church_id = '41414141-0000-4000-8000-000000000041'$q$, 1);
-- Developer som allerede er medlem (B): medlemskapet beholdes når den ekstra Admin-rollen fjernes
set local role authenticated;
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-1","aal":"aal2"}';
select ch_test.cnt('Ekstra Admin: Developer som allerede er medlem av B får ingen nytt medlemskap', $q$select 1 where not (public.add_self_as_admin('bbbbbbbb-0000-4000-8000-00000000000b') ->> 'membership_added')::boolean$q$, 1);
select ch_test.cnt('Ekstra Admin: fjerning i B melder at medlemskapet beholdes', $q$select 1 where not (public.remove_self_as_admin('bbbbbbbb-0000-4000-8000-00000000000b') ->> 'membership_removed')::boolean$q$, 1);
select ch_test.cnt('Ekstra Admin: Developer er fortsatt medlem av B, men ikke Admin', $q$select 1 where app.is_member('bbbbbbbb-0000-4000-8000-00000000000b') and not app.is_church_admin('bbbbbbbb-0000-4000-8000-00000000000b')$q$, 1);
set local role postgres;

-- ---------- E-post: maler, logo, utsendingslogg og grenser før innlogging ----------
set local role authenticated;
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-n41","aal":"aal1"}';
select ch_test.err('Mail: Admin kan ikke lese maler', $q$select public.mail_templates()$q$, '42501');
select ch_test.err('Mail: Admin kan ikke lagre mal', $q$select public.save_mail_template('welcome', 'Hei', '[{"t":"link","label":"Gå"}]'::jsonb)$q$, '42501');
select ch_test.err('Mail: Admin kan ikke sette logo', $q$select public.set_mail_logo('mail/logo-00000000-0000-4000-8000-000000000001.png', 'image/png')$q$, '42501');
select ch_test.err('Mail: Admin kan ikke lese utsendingsloggen', $q$select public.mail_outbox_recent()$q$, '42501');
select ch_test.err('Mail: Admin kan ikke hente malen for utsending (bare server)', $q$select public.mail_for_send('welcome')$q$, '42501');
select ch_test.err('Mail: Admin kan ikke registrere utsending (bare server)', $q$select public.register_mail('test', null, 'x@y.no', null, null, 'sent', null)$q$, '42501');
select ch_test.err('Mail: klient kan ikke bruke grensetelleren (bare server)', $q$select public.anon_rate_hit(repeat('a', 64), 5, 3600)$q$, '42501');
select ch_test.cnt('Mail: Admin leser ingen maler direkte', $q$select 1 from public.email_templates$q$, 0);
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-n42","aal":"aal1"}';
select ch_test.err('Mail: medlem kan ikke lese maler', $q$select public.mail_templates()$q$, '42501');
select ch_test.err('Mail: medlem kan ikke lese innstillinger', $q$select public.mail_settings_get()$q$, '42501');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-2","aal":"aal1"}';
select ch_test.err('Mail: Moderator uten MFA avvises', $q$select public.save_mail_template('welcome', 'Hei', '[{"t":"link","label":"Gå"}]'::jsonb)$q$, '42501');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-2","aal":"aal2"}';
select ch_test.cnt('Mail: ingen egne maler i starten (standard brukes)', $q$select 1 from public.mail_templates()$q$, 0);
select ch_test.ok('Mail: Moderator lagrer velkomstmal', $q$select public.save_mail_template('welcome', ' Velkommen {epost} ', '[{"t":"logo"},{"t":"h","text":"Hei"},{"t":"p","text":"**Tekst**"},{"t":"link","label":"Opprett bruker","href":"https://ond.test"}]'::jsonb)$q$);
select ch_test.cnt('Mail: malen er lagret, trimmet og uten ukjente felt (href fjernet)', $q$select 1 from public.mail_templates() where key = 'welcome' and subject = 'Velkommen {epost}' and not blocks::text like '%ond.test%' and jsonb_array_length(blocks) = 4$q$, 1);
select ch_test.err('Mail: to lenkebokser avvises', $q$select public.save_mail_template('welcome', 'S', '[{"t":"link","label":"a"},{"t":"link","label":"b"}]'::jsonb)$q$, '22023');
select ch_test.err('Mail: ingen lenkeboks avvises', $q$select public.save_mail_template('password', 'S', '[{"t":"p","text":"x"}]'::jsonb)$q$, '22023');
select ch_test.err('Mail: ukjent blokktype (html) avvises', $q$select public.save_mail_template('welcome', 'S', '[{"t":"html","text":"<b>x</b>"},{"t":"link","label":"a"}]'::jsonb)$q$, '22023');
select ch_test.err('Mail: emne med linjeskift avvises (header-injeksjon)', $q$select public.save_mail_template('welcome', E'S\nBcc: x@y.no', '[{"t":"link","label":"a"}]'::jsonb)$q$, '22023');
select ch_test.err('Mail: for lang tekst avvises', $q$select public.save_mail_template('welcome', 'S', jsonb_build_array(jsonb_build_object('t','p','text',repeat('x',2001)), jsonb_build_object('t','link','label','a')))$q$, '22023');
select ch_test.err('Mail: ukjent mal avvises', $q$select public.save_mail_template('annet', 'S', '[{"t":"link","label":"a"}]'::jsonb)$q$, '22023');
select ch_test.err('Mail: Moderator kan ikke skrive direkte i tabellen', $q$insert into public.email_templates (key, subject, blocks) values ('password', 'S', '[]')$q$, '42501');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-1","aal":"aal2"}';
select ch_test.ok('Mail: Developer gjenoppretter standard', $q$select public.reset_mail_template('welcome')$q$);
select ch_test.ok('Mail: gjenoppretting av standardmal som allerede er standard er ufarlig', $q$select public.reset_mail_template('welcome')$q$);
select ch_test.cnt('Mail: standard brukes igjen', $q$select 1 from public.mail_templates()$q$, 0);
select ch_test.err('Mail: ugyldig logonøkkel avvises', $q$select public.set_mail_logo('c/annen/fil.png', 'image/png')$q$, '22023');
select ch_test.err('Mail: ugyldig logotype avvises', $q$select public.set_mail_logo('mail/logo-00000000-0000-4000-8000-000000000001.png', 'image/svg+xml')$q$, '22023');
select ch_test.ok('Mail: utgangspunkt er standardlogoen (testen rulles tilbake)', $q$select public.reset_mail_logo()$q$);
select ch_test.cnt('Mail: første egne logo gir ingen gammel nøkkel', $q$select 1 where public.set_mail_logo('mail/logo-00000000-0000-4000-8000-000000000001.png', 'image/png') is null$q$, 1);
select ch_test.cnt('Mail: bytte av logo gir den gamle nøkkelen (serveren sletter filen)', $q$select 1 where public.set_mail_logo('mail/logo-00000000-0000-4000-8000-000000000002.jpg', 'image/jpeg') = 'mail/logo-00000000-0000-4000-8000-000000000001.png'$q$, 1);
select ch_test.cnt('Mail: innstillingene viser egen logo', $q$select 1 where (public.mail_settings_get() ->> 'custom_logo')::boolean and public.mail_logo_key() like 'mail/logo-%'$q$, 1);
select ch_test.cnt('Mail: standardlogo gjenopprettes og gir den gamle nøkkelen', $q$select 1 where public.reset_mail_logo() = 'mail/logo-00000000-0000-4000-8000-000000000002.jpg'$q$, 1);
set local role postgres;
select ch_test.cnt('Mail: endringene er loggført', $q$select distinct action from public.audit_logs where action in ('mail.template_update', 'mail.template_reset', 'mail.logo_update', 'mail.logo_reset')$q$, 4);
select ch_test.cnt('Mail: loggen har gammel og ny mal', $q$select 1 from public.audit_logs where action = 'mail.template_update' and meta ->> 'new_subject' = 'Velkommen {epost}' and (meta ->> 'was_default')::boolean$q$, 1);
do $$ begin if exists (select 1 from pg_roles where rolname = 'service_role') then execute 'set local role service_role'; end if; end $$;
select ch_test.cnt('Mail: serveren henter innstillinger for utsending (standardmal = ingen blokker)', $q$select 1 where public.mail_for_send('password') ->> 'blocks' is null$q$, 1);
select ch_test.ok('Mail: serveren registrerer utsending', $q$select public.register_mail('recovery', 'password', ' Test@Example.COM ', null, null, 'sent', null)$q$);
select ch_test.cnt('Grense: to forsøk tillatt, det tredje stoppes', $q$select 1 from (select public.anon_rate_hit(repeat('b', 64), 2, 3600) a union all select public.anon_rate_hit(repeat('b', 64), 2, 3600) union all select public.anon_rate_hit(repeat('b', 64), 2, 3600)) x where a$q$, 2);
select ch_test.err('Grense: ugyldig nøkkel avvises', $q$select public.anon_rate_hit('ikke-hash', 2, 3600)$q$, '22023');
set local role postgres;
select ch_test.cnt('Mail: mottakeradressen er normalisert i loggen', $q$select 1 from public.email_outbox where to_email = 'test@example.com' and kind = 'recovery' and status = 'sent'$q$, 1);
set local role authenticated;
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-2","aal":"aal2"}';
select ch_test.atleast('Mail: Moderator ser utsendingsloggen', $q$select 1 from public.mail_outbox_recent()$q$, 1);
select ch_test.cnt('Mail: Moderator leser ikke tabellene direkte', $q$select 1 from public.email_outbox union all select 1 from public.anon_rate_limits$q$, 0);
set local role postgres;

-- ---------- Forespørsler om brukerkonto ----------
set local role authenticated;
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-n42","aal":"aal1"}';
select ch_test.err('Forespørsel: klient kan ikke sende inn direkte (bare server)', $q$select public.submit_account_request('Ola', '12345678', 'x@test.invalid', 'Menighet', null)$q$, '42501');
set local role postgres;
do $$ begin if exists (select 1 from pg_roles where rolname = 'service_role') then execute 'set local role service_role'; end if; end $$;
select ch_test.cnt('Forespørsel: server lagrer ny forespørsel', $q$select 1 where not (public.submit_account_request(' Kari Testesen ', '+47 400 00 000', 'Req1@Test.invalid', 'Testmenighet Øst', null) ->> 'duplicate')::boolean$q$, 1);
select ch_test.cnt('Forespørsel: samme e-post igjen er duplikat (ingen ny rad)', $q$select 1 where (public.submit_account_request('Kari T', '40000000', 'req1@test.invalid', 'Annen', null) ->> 'duplicate')::boolean$q$, 1);
select ch_test.ok('Forespørsel: forespørsel 2', $q$select public.submit_account_request('Per Ny', '40000001', 'req2@test.invalid', 'Ny menighet', null)$q$);
select ch_test.ok('Forespørsel: forespørsel 3 (adresse med konto)', $q$select public.submit_account_request('N Medlem', '40000002', 'n-medlem@test.invalid', 'N1', null)$q$);
select ch_test.ok('Forespørsel: forespørsel 4', $q$select public.submit_account_request('Mona Mod', '40000003', 'req4@test.invalid', 'Annet', null)$q$);
select ch_test.err('Forespørsel: ugyldig e-post avvises', $q$select public.submit_account_request('Ola', '40000000', 'ikke-epost', 'Menighet', null)$q$, '22023');
select ch_test.err('Forespørsel: ugyldig telefon avvises', $q$select public.submit_account_request('Ola', 'abc', 'ola@test.invalid', 'Menighet', null)$q$, '22023');
set local role postgres;
create table ch_test.rq as select id, email from public.account_requests where email like '%@test.invalid';
grant select on ch_test.rq to anon, authenticated;
select ch_test.cnt('Forespørsel: én rad per e-post, duplikatet telt', $q$select 1 from public.account_requests where email = 'req1@test.invalid' and resubmits = 1 and name = 'Kari Testesen'$q$, 1);
select ch_test.atleast('Forespørsel: Developer og Moderator varslet i ConnectHub', $q$select 1 from public.notifications where kind = 'request' and user_id in ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002')$q$, 2);
select ch_test.cnt('Forespørsel: loggen har ingen personopplysninger', $q$select 1 from public.audit_logs where action = 'requests.submit' and (meta::text like '%req1%' or meta::text like '%Kari%')$q$, 0);
set local role authenticated;
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-n41","aal":"aal1"}';
select ch_test.err('Forespørsel: Admin får ikke innboksen', $q$select public.account_requests_list()$q$, '42501');
select ch_test.err('Forespørsel: Admin kan ikke godkjenne', $q$select public.approve_account_request((select id from ch_test.rq where email = 'req2@test.invalid'), 'existing', null, '41414141-0000-4000-8000-000000000041', 'user', md5('forespørsel-1') || md5('fx-1'))$q$, '42501');
select ch_test.cnt('Forespørsel: Admin leser ingen forespørsler direkte', $q$select 1 from public.account_requests$q$, 0);
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-n42","aal":"aal1"}';
select ch_test.err('Forespørsel: medlem får ikke innboksen', $q$select public.account_requests_list()$q$, '42501');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-2","aal":"aal1"}';
select ch_test.err('Forespørsel: Moderator uten MFA avvises', $q$select public.account_requests_list()$q$, '42501');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-2","aal":"aal2"}';
select ch_test.atleast('Forespørsel: Moderator ser innboksen', $q$select 1 from public.account_requests_list() where email like '%@test.invalid'$q$, 4);
select ch_test.cnt('Forespørsel: eksisterende konto er merket', $q$select 1 from public.account_requests_list() where email = 'n-medlem@test.invalid' and existing_user_id = '00000000-0000-4000-8000-000000000042'$q$, 1);
select ch_test.ok('Forespørsel: sett «Under behandling»', $q$select public.set_account_request_status((select id from ch_test.rq where email = 'req1@test.invalid'), 'in_progress')$q$);
select ch_test.ok('Forespørsel: internt notat', $q$select public.add_account_request_note((select id from ch_test.rq where email = 'req1@test.invalid'), 'Ringte henne')$q$);
select ch_test.cnt('Forespørsel: historikken (mottatt, sendt på nytt, status, notat)', $q$select 1 from public.account_request_events_for((select id from ch_test.rq where email = 'req1@test.invalid'))$q$, 4);
select ch_test.err('Forespørsel: C uten menighet krever Developer/Moderator-rolle', $q$select public.approve_account_request((select id from ch_test.rq where email = 'req4@test.invalid'), 'none', null, null, 'user', md5('forespørsel-2') || md5('fx-2'))$q$, '22023');
select ch_test.err('Forespørsel: C uten menighet – Moderator kan ikke gi Developer/Moderator (bare Developer)', $q$select public.approve_account_request((select id from ch_test.rq where email = 'req4@test.invalid'), 'none', null, null, 'moderator', md5('forespørsel-3') || md5('fx-3'))$q$, '42501');
select ch_test.cnt('Forespørsel: B eksisterende menighet – invitasjon som User', $q$select 1 where (public.approve_account_request((select id from ch_test.rq where email = 'req1@test.invalid'), 'existing', null, '41414141-0000-4000-8000-000000000041', 'user', md5('forespørsel-4') || md5('fx-4')) ->> 'role') = 'user'$q$, 1);
select ch_test.err('Forespørsel: kan ikke godkjennes to ganger', $q$select public.approve_account_request((select id from ch_test.rq where email = 'req1@test.invalid'), 'existing', null, '41414141-0000-4000-8000-000000000041', 'user', md5('forespørsel-5') || md5('fx-5'))$q$, '22023');
select ch_test.cnt('Forespørsel: A ny menighet – menighet og invitasjon som fast Admin i én transaksjon', $q$select 1 where (public.approve_account_request((select id from ch_test.rq where email = 'req2@test.invalid'), 'new', 'Ny forespørselsmenighet', null, 'church_admin', md5('forespørsel-6') || md5('fx-6')) ->> 'church_name') = 'Ny forespørselsmenighet'$q$, 1);
select ch_test.err('Forespørsel: e-post som har konto avvises (CH010)', $q$select public.approve_account_request((select id from ch_test.rq where email = 'n-medlem@test.invalid'), 'existing', null, '41414141-0000-4000-8000-000000000041', 'user', md5('forespørsel-7') || md5('fx-7'))$q$, 'CH010');
select ch_test.err('Forespørsel: avslag krever begrunnelse', $q$select public.reject_account_request((select id from ch_test.rq where email = 'n-medlem@test.invalid'), '')$q$, '22023');
select ch_test.ok('Forespørsel: avslag med begrunnelse', $q$select public.reject_account_request((select id from ch_test.rq where email = 'n-medlem@test.invalid'), 'Har allerede konto')$q$);
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-1","aal":"aal2"}';
select ch_test.cnt('Forespørsel: C uten menighet – Developer kan opprette Moderator', $q$select 1 where (public.approve_account_request((select id from ch_test.rq where email = 'req4@test.invalid'), 'none', null, null, 'moderator', md5('forespørsel-8') || md5('fx-8')) ->> 'role') = 'moderator'$q$, 1);
set local role postgres;
select ch_test.cnt('Forespørsel: invitasjonene er laget (User i N1, Admin i ny menighet, Moderator uten menighet)', $q$select 1 from public.invitations i where i.status = 'pending' and ((lower(i.email) = 'req1@test.invalid' and i.role = 'user' and i.church_id = '41414141-0000-4000-8000-000000000041') or (lower(i.email) = 'req2@test.invalid' and i.role = 'church_admin' and i.church_id = (select id from public.churches where name = 'Ny forespørselsmenighet')) or (lower(i.email) = 'req4@test.invalid' and i.role = 'moderator' and i.church_id is null))$q$, 3);
select ch_test.cnt('Forespørsel: status og kobling til invitasjon lagret', $q$select 1 from public.account_requests where status = 'approved' and invitation_id is not null and email in ('req1@test.invalid', 'req2@test.invalid', 'req4@test.invalid')$q$, 3);
select ch_test.atleast('Forespørsel: handlingene er loggført', $q$select distinct action from public.audit_logs where action in ('requests.status', 'requests.note', 'requests.approve', 'requests.reject')$q$, 4);
set local role authenticated;
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-2","aal":"aal2"}';
select ch_test.ok('Forespørsel: sletting (f.eks. spam)', $q$select public.delete_account_request((select id from ch_test.rq where email = 'n-medlem@test.invalid'))$q$);
select ch_test.err('Varslingsadresser: høyst 3', $q$select public.set_mail_notify_extra(array['a@b.no','c@d.no','e@f.no','g@h.no'])$q$, '22023');
select ch_test.err('Varslingsadresser: ugyldig adresse avvises', $q$select public.set_mail_notify_extra(array['ikke-epost'])$q$, '22023');
select ch_test.ok('Varslingsadresser: to adresser lagres', $q$select public.set_mail_notify_extra(array[' Varsel@Example.com ', 'stab@example.com'])$q$);
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-n41","aal":"aal1"}';
select ch_test.err('Varslingsadresser: Admin kan ikke endre', $q$select public.set_mail_notify_extra(array['x@y.no'])$q$, '42501');
set local role postgres;
do $$ begin if exists (select 1 from pg_roles where rolname = 'service_role') then execute 'set local role service_role'; end if; end $$;
select ch_test.cnt('Varslingsadresser: serveren leser de normaliserte adressene', $q$select 1 where public.mail_notify_extra() @> array['varsel@example.com', 'stab@example.com']$q$, 1);
set local role postgres;

-- ---------- E-postvarsler (valgfrie e-poster på/av og egen adresse) – bare Developer og Moderator ----------
set local role authenticated;
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-n42","aal":"aal1"}';
select ch_test.err('E-postvarsler: User kan ikke lese innstillingen', $q$select public.my_email_prefs()$q$, '42501');
select ch_test.err('E-postvarsler: User kan ikke slå av', $q$select public.set_my_email_optional(false)$q$, '42501');
select ch_test.err('E-postvarsler: User kan ikke sette adresse', $q$select public.set_my_notify_email('x@example.com')$q$, '42501');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-n41","aal":"aal1"}';
select ch_test.err('E-postvarsler: Admin kan ikke lese innstillingen', $q$select public.my_email_prefs()$q$, '42501');
select ch_test.err('E-postvarsler: Admin kan ikke sette adresse', $q$select public.set_my_notify_email('x@example.com')$q$, '42501');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-2","aal":"aal1"}';
select ch_test.err('E-postvarsler: Moderator uten MFA avvises', $q$select public.set_my_email_optional(false)$q$, '42501');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-2","aal":"aal2"}';
select ch_test.cnt('E-postvarsler: standard er På og kontoens adresse', $q$select 1 where (public.my_email_prefs() ->> 'on')::boolean and public.my_email_prefs() ->> 'notify_email' is null and public.my_email_prefs() ->> 'account_email' = 'mod@test.invalid'$q$, 1);
select ch_test.ok('E-postvarsler: Moderator slår av', $q$select public.set_my_email_optional(false)$q$);
select ch_test.err('E-postvarsler: ugyldig adresse avvises', $q$select public.set_my_notify_email('ikke en adresse')$q$, '22023');
select ch_test.err('E-postvarsler: flere adresser avvises', $q$select public.set_my_notify_email('a@b.no,c@d.no')$q$, '22023');
select ch_test.cnt('E-postvarsler: ny adresse lagres normalisert', $q$select 1 where public.set_my_notify_email(' Privat@Example.COM ') = 'privat@example.com'$q$, 1);
select ch_test.cnt('E-postvarsler: valget og adressen er lagret', $q$select 1 where not (public.my_email_prefs() ->> 'on')::boolean and public.my_email_prefs() ->> 'notify_email' = 'privat@example.com'$q$, 1);
select ch_test.cnt('E-postvarsler: innloggingsadressen er uendret', $q$select 1 from public.app_users where id = '00000000-0000-4000-8000-000000000002' and email = 'mod@test.invalid'$q$, 1);
select ch_test.err('E-postvarsler: kolonnene kan ikke skrives direkte', $q$update public.app_users set notify_email = 'x@y.no', email_optional = true where id = '00000000-0000-4000-8000-000000000002'$q$, '42501');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-1","aal":"aal2"}';
select ch_test.ok('E-postvarsler: Developer endrer bare sitt eget valg', $q$select public.set_my_notify_email('dev-varsel@example.com')$q$);
select ch_test.cnt('E-postvarsler: Developer kan ikke lese Moderators adresse', $q$select notify_email from public.app_users where id = '00000000-0000-4000-8000-000000000002'$q$, 0);
select ch_test.err('E-postvarsler: klient kan ikke slå opp (bare server)', $q$select public.mail_optional_address('mod@test.invalid')$q$, '42501');
set local role postgres;
do $$ begin if exists (select 1 from pg_roles where rolname = 'service_role') then execute 'set local role service_role'; end if; end $$;
select ch_test.cnt('E-postvarsler: serveren ser Av for Moderator og På for ukjent adresse', $q$select 1 where not public.mail_optional_allowed('MOD@test.invalid') and public.mail_optional_allowed('ukjent@test.invalid')$q$, 1);
select ch_test.cnt('E-postvarsler: valgfrie e-poster går til varselsadressen, ukjent uendret', $q$select 1 where public.mail_optional_address('mod@test.invalid') = 'privat@example.com' and public.mail_optional_address('ukjent@test.invalid') = 'ukjent@test.invalid'$q$, 1);
set local role authenticated;
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-2","aal":"aal2"}';
select ch_test.cnt('E-postvarsler: kontoens egen adresse lagres som standard', $q$select 1 where public.set_my_notify_email('mod@test.invalid') = 'mod@test.invalid'$q$, 1);
select ch_test.cnt('E-postvarsler: tilbake til kontoens adresse', $q$select 1 where public.my_email_prefs() ->> 'notify_email' is null$q$, 1);
set local role postgres;

-- ---------- Logging ----------
select ch_test.atleast('Logg: rolletildeling er loggført med utfører', $q$select 1 from public.audit_logs where action = 'user_roles.insert' and actor_user_id = '00000000-0000-4000-8000-000000000001'$q$, 1);
select ch_test.atleast('Logg: tilbakekalling er loggført', $q$select 1 from public.audit_logs where action = 'user_roles.update' and actor_user_id = '00000000-0000-4000-8000-000000000001'$q$, 1);

select json_build_object(
  'bestatt', (select count(*) from ch_test.res where ok),
  'feilet', (select count(*) from ch_test.res where not ok),
  'feil', (select coalesce(json_agg(json_build_object('test', name, 'info', info) order by n), '[]'::json) from ch_test.res where not ok),
  'alle', (select json_agg(name || ' — ' || case when ok then 'OK' else 'FEIL' end order by n) from ch_test.res)
) as resultat;
rollback;
