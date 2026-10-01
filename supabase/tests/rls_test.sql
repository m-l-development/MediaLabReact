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
select 'https://test.invalid/auth/v1', 'sub-' || right(id::text, 1), id from public.app_users;
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
select ch_test.cnt('Moderator: ser alle menigheter', 'select 1 from public.churches', 2);
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
select ch_test.err('Bruker: kan ikke bootstrappe developer', $q$select app.bootstrap_developer('x@test.invalid', 'https://test.invalid/auth/v1')$q$, '42501');
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"sub-7","aal":"aal1"}';
select ch_test.cnt('whoami: deaktivert bruker får null', 'select 1 where public.whoami() is null', 1);
set local request.jwt.claims to '{"iss":"https://test.invalid/auth/v1","sub":"ukjent","aal":"aal1"}';
select ch_test.cnt('whoami: ukoblet konto får null', 'select 1 where public.whoami() is null', 1);
set local role postgres;
select ch_test.ok('Drift: link_identity gjenbruker eksisterende bruker med samme e-post', $q$select 1 where app.link_identity('https://annen.invalid/auth/v1', 'ny-sub', 'USERA@test.invalid') = '00000000-0000-4000-8000-000000000004'$q$);
select ch_test.cnt('Drift: link_identity ga ny identitet til samme bruker', $q$select 1 from public.user_identities where user_id = '00000000-0000-4000-8000-000000000004'$q$, 2);

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
