-- ConnectHub P8 · Oppbevaringstid for revisjonsloggen. Vanlig PostgreSQL.
-- Loggen er fortsatt uforanderlig for alle klienter og serveren. Det eneste unntaket er drift (eier av databasen), som kan
-- slette hendelser ELDRE enn oppbevaringstiden (minst 12 måneder, standard 24) med app.purge_audit_logs().
-- Kjøres manuelt eller planlagt (f.eks. pg_cron i produksjon, egen godkjenning i P11).

create or replace function app.audit_immutable() returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' and current_setting('connecthub.audit_purge_before', true) is not null
     and current_setting('connecthub.audit_purge_before', true) <> ''
     and old.created_at < current_setting('connecthub.audit_purge_before', true)::timestamptz
     and current_setting('connecthub.audit_purge_before', true)::timestamptz <= now() - interval '12 months' then
    return old;
  end if;
  raise exception 'Revisjonsloggen kan ikke endres eller slettes' using errcode = '42501';
end $$;

create or replace function app.purge_audit_logs(p_months int default 24) returns bigint
language plpgsql security definer set search_path = '' as $$
declare v_before timestamptz; n bigint;
begin
  if p_months is null or p_months < 12 then raise exception 'Oppbevaringstiden må være minst 12 måneder' using errcode = '22023'; end if;
  v_before := now() - make_interval(months => p_months);
  perform set_config('connecthub.audit_purge_before', v_before::text, true);
  delete from public.audit_logs where created_at < v_before;
  get diagnostics n = row_count;
  perform set_config('connecthub.audit_purge_before', '', true);
  insert into public.audit_logs (action, target_type, reason, meta)
  values ('audit_logs.purge', 'audit_logs', 'Oppbevaringstid ' || p_months || ' måneder', jsonb_build_object('deleted', n));
  return n;
end $$;
revoke all on function app.purge_audit_logs(int) from public, anon, authenticated;
do $$ begin if exists (select 1 from pg_roles where rolname = 'service_role') then
  execute 'revoke all on function app.purge_audit_logs(int) from service_role';
end if; end $$;
