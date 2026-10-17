-- ConnectHub · BARE connecthub-dev. Setter grensen for den syntetiske «CH-test Menighet A» midlertidig lik antallet som
-- teller, så e2e-dev/member-limit-dev.spec.ts kan vise sperret invitasjon og avvisning (ML_DEV_LIMIT_FULL=JA).
-- Endringen logges. Tilbakestilles med member_limit_test_restore.sql.
do $$
declare v_church uuid := (select id from public.churches where name = 'CH-test Menighet A'); v_old int; v_n int;
begin
  if v_church is null then raise exception 'Fant ikke CH-test Menighet A'; end if;
  select member_limit into v_old from public.churches where id = v_church;
  v_n := app.member_count(v_church);
  update public.churches set member_limit = greatest(1, v_n) where id = v_church;
  insert into public.audit_logs (action, target_type, target_id, church_id, reason, meta)
  values ('church.member_limit', 'church', v_church::text, v_church, 'Test av brukergrensen (midlertidig, dev)', jsonb_build_object('old', v_old, 'new', greatest(1, v_n)));
end $$;
select jsonb_build_object('church', 'CH-test Menighet A', 'count', app.member_count(id), 'limit', member_limit) as test_full from public.churches where name = 'CH-test Menighet A';
