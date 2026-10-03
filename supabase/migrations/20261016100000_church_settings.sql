-- ConnectHub · Felles grunnoppsett per menighet (Loop Studio, Thumbnail Studio …). Vanlig PostgreSQL. Bare tillegg.
--   - church_settings: ett oppsett per menighet og område (scope, f.eks. 'loopstudio:week', 'thumbstudio:cats').
--     Ingen direkte tabelltilgang (RLS uten policyer); alt går via funksjonene under.
--   - Lesing og lagring: bare aktive medlemmer av menigheten (også Developer/Moderator bare der de er medlem – A1).
--   - Samtidige endringer: optimistisk lås med versjonsnummer. Lagring krever versjonen klienten bygde på; ellers CH011
--     (settings_conflict), og klienten slår sammen med nyeste versjon. En eldre versjon kan aldri overskrive en nyere.
--   - Faste bilder i Loop Studio (nøkkelen imgRules i 'loopstudio:*'): bare Admin i menigheten kan endre dem (M1).
--   - Bildereferanser ("ch:<fil-id>") må peke på menighetens egne, ikke-private filer – aldri andre menigheters filer.
--   - Størrelse høyst 512 kB per oppsett. Endringer loggføres (settings.update, uten innholdet).

create table public.church_settings (
  church_id uuid not null references public.churches (id) on delete cascade,
  scope text not null check (scope ~ '^[a-z][a-z0-9_-]{1,30}:[a-z0-9_-]{1,40}$'),
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object'),
  version int not null default 1 check (version >= 1),
  updated_by uuid references public.app_users (id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (church_id, scope)
);
alter table public.church_settings enable row level security;
revoke all on public.church_settings from public, anon, authenticated;

-- Felter som bare Admin i menigheten kan endre, per område (prefiks før «:»).
create or replace function app.settings_admin_keys(p_scope text) returns text[]
language sql immutable set search_path = '' as $$
  select case split_part(p_scope, ':', 1) when 'loopstudio' then array['imgRules'] else array[]::text[] end
$$;
revoke all on function app.settings_admin_keys(text) from public, anon, authenticated;

create or replace function public.church_settings_get(p_church uuid, p_scope text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare s public.church_settings;
begin
  if app.current_user_id() is null or not app.is_member(p_church) then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  select * into s from public.church_settings where church_id = p_church and scope = p_scope;
  if s.church_id is null then return null; end if;
  return jsonb_build_object('data', s.data, 'version', s.version, 'updated_at', s.updated_at,
    'updated_by_name', (select coalesce(u.full_name, u.email) from public.app_users u where u.id = s.updated_by),
    'can_admin', app.is_church_admin(p_church), 'admin_keys', to_jsonb(app.settings_admin_keys(p_scope)));
end $$;

-- Lagrer et nytt oppsett. p_version = versjonen klienten bygde på (0 = fantes ikke). Returnerer ny versjon.
create or replace function public.church_settings_save(p_church uuid, p_scope text, p_data jsonb, p_version int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := app.current_user_id(); s public.church_settings; k text; v_new int; v_ref text;
begin
  if v_actor is null or not app.is_member(p_church) then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  if p_scope is null or p_scope !~ '^[a-z][a-z0-9_-]{1,30}:[a-z0-9_-]{1,40}$' then raise exception 'Ugyldig område' using errcode = '22023'; end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object' or octet_length(p_data::text) > 524288 then raise exception 'Ugyldig oppsett' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(hashtext('settings:' || p_church::text || ':' || p_scope));
  select * into s from public.church_settings where church_id = p_church and scope = p_scope for update;
  if coalesce(s.version, 0) <> coalesce(p_version, -1) then
    raise exception 'Grunnoppsettet er endret av en annen bruker' using errcode = 'CH011'; end if;
  foreach k in array app.settings_admin_keys(p_scope) loop
    if (coalesce(s.data, '{}'::jsonb) -> k) is distinct from (p_data -> k) and not app.is_church_admin(p_church) then
      raise exception 'Bare Admin kan endre dette' using errcode = '42501'; end if;
  end loop;
  -- Bildereferanser må være menighetens egne felles filer (ikke private, ikke samarbeidskopier).
  for v_ref in select distinct m[1] from regexp_matches(p_data::text, 'ch:([0-9a-fA-F-]{36})', 'g') m loop
    if not exists (select 1 from public.files f where f.id = v_ref::uuid and f.church_id = p_church and f.visibility = 'church' and f.folder <> 'samarbeid') then
      raise exception 'Bildet tilhører ikke menigheten' using errcode = '42501'; end if;
  end loop;
  if s.church_id is null then
    insert into public.church_settings (church_id, scope, data, version, updated_by) values (p_church, p_scope, p_data, 1, v_actor);
    v_new := 1;
  else
    update public.church_settings set data = p_data, version = s.version + 1, updated_by = v_actor, updated_at = now()
      where church_id = p_church and scope = p_scope;
    v_new := s.version + 1;
  end if;
  insert into public.audit_logs (actor_user_id, action, target_type, target_id, church_id, meta)
  values (v_actor, 'settings.update', 'church_settings', p_scope, p_church, jsonb_build_object('scope', p_scope, 'version', v_new));
  return jsonb_build_object('version', v_new, 'updated_at', now());
end $$;

revoke all on function public.church_settings_get(uuid, text), public.church_settings_save(uuid, text, jsonb, int) from public, anon;
grant execute on function public.church_settings_get(uuid, text), public.church_settings_save(uuid, text, jsonb, int) to authenticated;
