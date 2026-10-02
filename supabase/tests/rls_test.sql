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
select ch_test.err('Kobling: Developer kan ikke opprette kobling', $q$select public.create_link('aaaaaaaa-0000-4000-8000-00000000000a', 'bbbbbbbb-0000-4000-8000-00000000000b')$q$, '42501');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-2","aal":"aal1"}';
select ch_test.err('Kobling: Moderator uten MFA kan ikke opprette kobling', $q$select public.create_link('aaaaaaaa-0000-4000-8000-00000000000a', 'bbbbbbbb-0000-4000-8000-00000000000b')$q$, '42501');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-2","aal":"aal2"}';
select ch_test.ok('Kobling: Moderator kobler B og A (rekkefølgen spiller ingen rolle)', $q$select public.create_link('bbbbbbbb-0000-4000-8000-00000000000b', 'aaaaaaaa-0000-4000-8000-00000000000a')$q$);
select ch_test.err('Kobling: bare én aktiv kobling per par', $q$select public.create_link('aaaaaaaa-0000-4000-8000-00000000000a', 'bbbbbbbb-0000-4000-8000-00000000000b')$q$, '23505');
select ch_test.err('Kobling: ikke med seg selv', $q$select public.create_link('aaaaaaaa-0000-4000-8000-00000000000a', 'aaaaaaaa-0000-4000-8000-00000000000a')$q$, '22023');
select ch_test.ok('Kobling: Moderator kobler A og K', $q$select public.create_link('aaaaaaaa-0000-4000-8000-00000000000a', 'cccccccc-0000-4000-8000-00000000000c')$q$);
select ch_test.cnt('Kobling: Moderator ser begge koblingene', $q$select 1 from public.my_links() where church_a in ('aaaaaaaa-0000-4000-8000-00000000000a', 'bbbbbbbb-0000-4000-8000-00000000000b', 'cccccccc-0000-4000-8000-00000000000c') and church_b in ('aaaaaaaa-0000-4000-8000-00000000000a', 'bbbbbbbb-0000-4000-8000-00000000000b', 'cccccccc-0000-4000-8000-00000000000c')$q$, 2);   -- bare testmenighetene (ekte koblinger i dev telles ikke)
set local role postgres;
create temp table t18 as select
  (select id from public.church_links where church_a = 'aaaaaaaa-0000-4000-8000-00000000000a' and church_b = 'bbbbbbbb-0000-4000-8000-00000000000b') ab,
  (select id from public.church_links where church_a = 'aaaaaaaa-0000-4000-8000-00000000000a' and church_b = 'cccccccc-0000-4000-8000-00000000000c') ak;
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
select ch_test.cnt('Kobling: Developer uten medlemskap ser ingen koblinger', 'select 1 from public.my_links()', 0);
select ch_test.cnt('Kobling: Developer leser ingen koblinger direkte', 'select 1 from public.church_links', 0);

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

-- Den gamle samarbeidsmodellen: deling av vanlige filer er skrudd av; Developer har ikke lenger samarbeidstilgang
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
select ch_test.cnt('Gammel modell: Developer har ikke lenger samarbeidstilgang', $q$select 1 from public.spaces$q$, 0);
select ch_test.err('Gammel modell: Developer kan ikke endre område', $q$select public.update_space((select id from public.spaces limit 1), 'Kapret')$q$, '42501');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-2","aal":"aal1"}';
select ch_test.err('Gammel modell: Moderator uten MFA kan ikke slette', $q$select public.delete_space((select id from public.spaces where name = 'Nytt navn'), 'Nytt navn')$q$, '42501');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-2","aal":"aal2"}';
select ch_test.err('Gammel modell: sletting krever riktig navn', $q$select public.delete_space((select id from public.spaces where name = 'Nytt navn'), 'Feil')$q$, '22023');
select ch_test.ok('Gammel modell: Moderator sletter området', $q$select public.delete_space((select id from public.spaces where name = 'Nytt navn'), 'Nytt navn')$q$);
set local role postgres;
select ch_test.atleast('Logg: koblinger og endringer er loggført', $q$select 1 from public.audit_logs where action in ('links.create', 'links.end', 'links.reopen', 'spaces.update', 'spaces.delete')$q$, 5);
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
