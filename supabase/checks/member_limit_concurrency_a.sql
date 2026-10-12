-- ConnectHub · BARE connecthub-dev. Samtidighetstest for brukergrensen, økt A. Kjøres SAMTIDIG med økt B
-- (member_limit_concurrency_b.sql startes ca. 1 s etter A). «CH-test Grense» må ha 9 (member_limit_fixture.sql).
-- A tar den 10. plassen og holder transaksjonen åpen i 6 s; B må vente på låsen og skal deretter få CH013.
do $$
declare v_church uuid := (select id from public.churches where name = 'CH-test Grense');
begin
  insert into public.invitations (email, church_id, role, token_hash, expires_at)
  values ('ch-test-grense-a@example.com', v_church, 'user', md5(random()::text) || md5(random()::text), now() + interval '1 day');
  perform pg_sleep(6);
  raise notice 'Økt A: plass 10 tatt etter 6 s, committer';
end $$;
select jsonb_build_object('session', 'A', 'result', 'ok', 'at', clock_timestamp()) as concurrency;
