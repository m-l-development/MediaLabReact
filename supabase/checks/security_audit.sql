-- ConnectHub · BARE LESING. Sikkerhetskontroll av databasen (kjøres mot connecthub-dev; mot produksjonen bare etter
-- egen godkjenning). Viser funn som lister – tomme lister er ønsket resultat, bortsett fra der det står «forventet».
--   npx supabase@latest db query --linked --project-ref uatpdmhnwwjgzlxaucsx -f supabase/checks/security_audit.sql
with fn as (
  select p.oid, n.nspname, p.proname, p.prosecdef, p.proconfig,
         pg_get_function_identity_arguments(p.oid) as args
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname in ('public', 'app') and p.prokind = 'f'
)
select jsonb_build_object(
  -- SECURITY DEFINER uten fast search_path kan kapres via objekter i andre skjemaer
  'definer_without_search_path', (select coalesce(jsonb_agg(nspname || '.' || proname || '(' || args || ')'), '[]') from fn
     where prosecdef and not exists (select 1 from unnest(coalesce(proconfig, '{}')) c where c like 'search_path=%')),
  -- funksjoner anonyme kan kalle (forventet: bare de som er ment for innloggingssiden)
  'anon_executable', (select coalesce(jsonb_agg(nspname || '.' || proname || '(' || args || ')' order by proname), '[]') from fn
     where has_function_privilege('anon', oid, 'execute')),
  -- app.*-hjelpere skal ikke kunne kalles direkte av klienter, bortsett fra tilgangsfunksjonene RLS bruker
  'app_helpers_callable_by_authenticated', (select coalesce(jsonb_agg(proname order by proname), '[]') from fn
     where nspname = 'app' and has_function_privilege('authenticated', oid, 'execute')),
  -- tabeller i public uten RLS
  'tables_without_rls', (select coalesce(jsonb_agg(c.relname), '[]') from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity),
  -- tabellrettigheter for anon (forventet: ingen)
  'anon_table_grants', (select coalesce(jsonb_agg(distinct table_name || ':' || privilege_type), '[]') from information_schema.role_table_grants
     where table_schema = 'public' and grantee = 'anon'),
  -- policyer som slipper alle gjennom (qual = true) – forventet bare lesbare oppslagstabeller som plans
  'permissive_true_policies', (select coalesce(jsonb_agg(tablename || '.' || policyname || ' (' || cmd || ')'), '[]') from pg_policies
     where schemaname = 'public' and (qual = 'true' or with_check = 'true')),
  -- åpne lagringsbøtter (forventet: ingen)
  'public_buckets', (select coalesce(jsonb_agg(name), '[]') from storage.buckets where public),
  -- funksjoner eid av andre enn postgres/supabase_admin
  'function_owners', (select coalesce(jsonb_agg(distinct pg_get_userbyid(p.proowner)), '[]') from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname in ('public', 'app'))
) as security_audit;
