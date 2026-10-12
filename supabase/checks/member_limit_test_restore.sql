-- ConnectHub · BARE connecthub-dev. Setter grensen for «CH-test Menighet A» tilbake til standard (10) etter
-- member_limit_test_full.sql. Logges.
do $$
declare v_church uuid := (select id from public.churches where name = 'CH-test Menighet A'); v_old int;
begin
  if v_church is null then return; end if;
  select member_limit into v_old from public.churches where id = v_church;
  update public.churches set member_limit = 10 where id = v_church;
  insert into public.audit_logs (action, target_type, target_id, church_id, reason, meta)
  values ('church.member_limit', 'church', v_church::text, v_church, 'Test av brukergrensen ferdig (tilbake til standard, dev)', jsonb_build_object('old', v_old, 'new', 10));
end $$;
select jsonb_build_object('church', 'CH-test Menighet A', 'count', app.member_count(id), 'limit', member_limit) as test_restore from public.churches where name = 'CH-test Menighet A';
