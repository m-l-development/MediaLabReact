-- ConnectHub · BARE connecthub-dev. Samtidighetstest for brukergrensen, økt B (se member_limit_concurrency_a.sql).
-- Forventet: venter på låsen til A er ferdig (ca. 5 s), og avvises deretter med CH013.
create temporary table ch_conc (started timestamptz, finished timestamptz, result text);
do $$
declare v_church uuid := (select id from public.churches where name = 'CH-test Grense'); t0 timestamptz := clock_timestamp();
begin
  begin
    insert into public.invitations (email, church_id, role, token_hash, expires_at)
    values ('ch-test-grense-b@example.com', v_church, 'user', md5(random()::text) || md5(random()::text), now() + interval '1 day');
    insert into ch_conc values (t0, clock_timestamp(), 'IKKE AVVIST – feil');
  exception when sqlstate 'CH013' then
    insert into ch_conc values (t0, clock_timestamp(), 'AVVIST CH013: ' || sqlerrm);
  end;
end $$;
select jsonb_build_object('session', 'B', 'result', result, 'waited_seconds', round(extract(epoch from finished - started)::numeric, 1)) as concurrency from ch_conc;
