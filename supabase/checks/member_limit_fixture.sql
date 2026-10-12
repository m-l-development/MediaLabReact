-- ConnectHub · BARE connecthub-dev (uatpdmhnwwjgzlxaucsx). ENDRER DATA – godkjent 2026-10-12 for brukergrensen.
-- Testmenigheten «CH-test Grense» med 9 syntetiske aktive medlemmer (ch-test-grense-1…9@example.com, uten innlogging),
-- så den 10. plassen er ledig for samtidighetstesten (member_limit_concurrency_a/b.sql). Kan kjøres flere ganger.
-- Fjernes med member_limit_fixture_cleanup.sql.
--   npx supabase@latest db query --linked --project-ref uatpdmhnwwjgzlxaucsx -f supabase/checks/member_limit_fixture.sql
do $$
declare v_church uuid;
begin
  select id into v_church from public.churches where name = 'CH-test Grense';
  if v_church is null then insert into public.churches (name) values ('CH-test Grense') returning id into v_church; end if;
  insert into public.app_users (email, full_name, status)
  select 'ch-test-grense-' || g || '@example.com', 'CH-test Grense ' || g, 'active' from generate_series(1, 9) g
  on conflict do nothing;
  insert into public.memberships (user_id, church_id)
  select u.id, v_church from public.app_users u where u.email like 'ch-test-grense-%@example.com'
  on conflict (user_id, church_id) do update set status = 'active';
  -- ingen ventende invitasjoner fra tidligere kjøringer
  update public.invitations set status = 'revoked' where church_id = v_church and status = 'pending';
end $$;
select jsonb_build_object(
  'church', (select id from public.churches where name = 'CH-test Grense'),
  'active', (select count(*) from public.memberships ms join public.churches c on c.id = ms.church_id where c.name = 'CH-test Grense' and ms.status = 'active'),
  'pending', (select count(*) from public.invitations iv join public.churches c on c.id = iv.church_id where c.name = 'CH-test Grense' and iv.status = 'pending')
) as fixture;
