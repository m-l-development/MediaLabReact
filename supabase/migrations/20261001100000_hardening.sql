-- ConnectHub P3 · 1/4 · Herding. Vanlig PostgreSQL.
-- Supabase gir anon og authenticated alle rettigheter på nye objekter i public. Det fjernes her, slik at
-- ingenting blir tilgjengelig via API-et uten en eksplisitt GRANT og en RLS-policy.

alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public revoke execute on functions from public, anon, authenticated;

-- Internt skjema for hjelpefunksjoner. Eksponeres ikke i API-et.
create schema if not exists app;
revoke all on schema app from public;
grant usage on schema app to authenticated;

-- Sikkerhetsnett: RLS slås automatisk på for alle nye tabeller i public og app.
create or replace function app.enforce_rls() returns event_trigger
language plpgsql set search_path = '' as $$
declare r record;
begin
  for r in select * from pg_event_trigger_ddl_commands()
           where object_type = 'table' and schema_name in ('public', 'app')
  loop
    execute format('alter table %s enable row level security', r.object_identity);
  end loop;
end $$;
revoke all on function app.enforce_rls() from public;

drop event trigger if exists connecthub_enforce_rls;
create event trigger connecthub_enforce_rls on ddl_command_end
  when tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  execute function app.enforce_rls();
