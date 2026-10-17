-- ConnectHub · TILBAKEFØRING av 20261018100000_member_limit.sql (kjøres bare ved behov, manuelt, etter egen godkjenning).
-- Fjerner håndhevingen av brukergrensen (triggerne) og funksjonene. Ingen medlemskap eller invitasjoner endres.
-- Kolonnen churches.member_limit beholdes (bare tall; brukes ikke uten triggerne), så en senere ny migrering kan bruke den.
-- Etter kjøring: appene viser ikke lenger telleren (member_usage finnes ikke), og ingen grense håndheves – som før.
drop trigger if exists memberships_zz_member_limit on public.memberships;
drop trigger if exists invitations_zz_member_limit on public.invitations;
drop function if exists public.set_member_limit(uuid, int, text);
drop function if exists public.member_usage(uuid);
drop function if exists app.member_limit_guard();
drop function if exists app.member_counted(uuid, text);
drop function if exists app.member_count(uuid);
select jsonb_build_object(
  'triggers_left', (select count(*) from pg_trigger where tgname like '%member_limit%'),
  'functions_left', (select count(*) from pg_proc where proname in ('member_count', 'member_counted', 'member_limit_guard', 'member_usage', 'set_member_limit'))
) as rollback_member_limit;
