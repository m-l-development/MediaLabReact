-- ConnectHub · BARE connecthub-dev. Fjerner testmenigheten «CH-test Grense» og de syntetiske testbrukerne
-- (ch-test-grense-*@example.com) fra member_limit_fixture.sql og samtidighetstesten. Rører ingen andre data.
do $$
declare v_church uuid := (select id from public.churches where name = 'CH-test Grense');
begin
  if v_church is null then return; end if;
  delete from public.invitations where church_id = v_church;
  delete from public.memberships where church_id = v_church;
  delete from public.app_users where email like 'ch-test-grense-%@example.com';
  delete from public.churches where id = v_church;
end $$;
select jsonb_build_object('remaining', (select count(*) from public.churches where name = 'CH-test Grense')) as cleanup;
