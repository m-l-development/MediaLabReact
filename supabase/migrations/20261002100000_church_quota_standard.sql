-- ConnectHub · Trinn 21: menighetens faktiske lagringskvote er standard 200 MB eller en egen kvote som Developer tildeler.
-- Planene er bare veiledende og endrer aldri menighetens kvote. Vanlig PostgreSQL.
--   - churches.storage_quota_mb er fortsatt den ENESTE kvoten som håndheves (app.upload_check, uendret).
--   - churches.quota_custom utledes av kvoten: 200 MB = standard, alt annet = egen kvote (trigger under).
--   - Ingen kvoteverdier endres av migreringen. Menigheter med noe annet enn 200 MB (f.eks. 1024 MB fra en tidligere
--     godkjenning av Standard) beholder verdien og merkes som egen kvote. Det loggføres per menighet.
--   - Godkjenning av abonnement og planendringer endrer ikke lenger menighetenes kvote.
--   - «Følg planen igjen» (follow_plan_quota) og forhåndsvisningen av planendringer (plan_change_preview) beholdes, men
--     stenges for alle roller. Erstattes av reset_church_quota («Tilbakestill til standard (200 MB)»).
--   - Planenes lagringsverdi kan bare leses av Developer (plans_admin); andre ser plannavn og pris.
--   - Ingen filer eller lagringsobjekter røres. Ingen historikk slettes.

-- ---------- Standardkvoten (fast, kan ikke endres globalt) ----------
create or replace function app.default_quota_mb() returns int language sql immutable set search_path = '' as $$ select 200 $$;

-- ---------- Merket for egen kvote følger alltid kvoten ----------
create or replace function app.churches_quota_class() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.quota_custom := new.storage_quota_mb <> app.default_quota_mb();
  return new;
end $$;
drop trigger if exists churches_quota_class on public.churches;
create trigger churches_quota_class before insert or update of storage_quota_mb, quota_custom on public.churches
  for each row execute function app.churches_quota_class();

-- Klassifiserer eksisterende menigheter uten å endre kvoten: alt annet enn 200 MB blir egen kvote. Loggføres per menighet.
-- Returnerer antall menigheter som fikk nytt merke. Trygg å kjøre flere ganger. Bare for migreringen (ingen roller).
create or replace function app.classify_church_quotas() returns int language plpgsql security definer set search_path = '' as $$
declare c record; n int := 0;
begin
  for c in select id, storage_quota_mb, quota_custom from public.churches
           where quota_custom is distinct from (storage_quota_mb <> app.default_quota_mb()) for update loop
    update public.churches set quota_custom = (c.storage_quota_mb <> app.default_quota_mb()) where id = c.id;
    perform app.log_quota(c.id, c.storage_quota_mb, c.storage_quota_mb,
      case when c.storage_quota_mb <> app.default_quota_mb() then 'klassifisert som egen kvote (trinn 21)' else 'klassifisert som standard (trinn 21)' end);
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function app.classify_church_quotas() from public, anon, authenticated;
select app.classify_church_quotas();

-- ---------- Egen kvote og tilbakestilling (bare Developer med MFA, loggført) ----------
create or replace function public.set_church_quota(p_church uuid, p_quota_mb int) returns void
language plpgsql security definer set search_path = '' as $$
declare v_old int;
begin
  if app.current_user_id() is null or not app.is_developer() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  if p_quota_mb is null or p_quota_mb < 0 or p_quota_mb > 10240 then raise exception 'Kvoten må være mellom 0 og 10240 MB' using errcode = '22023'; end if;
  select storage_quota_mb into v_old from public.churches where id = p_church for update;
  if v_old is null then raise exception 'Fant ikke menigheten' using errcode = '22023'; end if;
  update public.churches set storage_quota_mb = p_quota_mb where id = p_church;
  perform app.log_quota(p_church, v_old, p_quota_mb, case when p_quota_mb = app.default_quota_mb() then 'standard' else 'egen kvote' end);
end $$;

create or replace function public.reset_church_quota(p_church uuid) returns int
language plpgsql security definer set search_path = '' as $$
declare v_old int;
begin
  if app.current_user_id() is null or not app.is_developer() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  select storage_quota_mb into v_old from public.churches where id = p_church for update;
  if v_old is null then raise exception 'Fant ikke menigheten' using errcode = '22023'; end if;
  update public.churches set storage_quota_mb = app.default_quota_mb() where id = p_church;
  perform app.log_quota(p_church, v_old, app.default_quota_mb(), 'tilbakestilt til standard');
  return app.default_quota_mb();
end $$;

-- Developer: faktisk kvote, merke og brukt plass for alle menigheter (bare summer, aldri filer).
create or replace function public.church_quota_overview()
returns table (church_id uuid, storage_quota_mb int, quota_custom boolean, used_bytes bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if app.current_user_id() is null or not app.is_developer() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  return query select c.id, c.storage_quota_mb, c.quota_custom,
    (select coalesce(sum(f.file_size), 0)::bigint from public.files f where f.church_id = c.id) from public.churches c order by c.name;
end $$;

-- ---------- Planer: bare veiledende ----------
-- Planenes lagringsverdi er bare synlig for Developer (via plans_admin). Andre ser kode, navn, pris og om planen er aktiv.
revoke select on public.plans from authenticated;
grant select (code, name, price_nok_month, active) on public.plans to authenticated;
create or replace function public.plans_admin()
returns table (code text, name text, storage_quota_mb int, price_nok_month int, active boolean)
language plpgsql stable security definer set search_path = '' as $$
begin
  if app.current_user_id() is null or not app.is_developer() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  return query select p.code, p.name, p.storage_quota_mb, p.price_nok_month, p.active from public.plans p order by p.storage_quota_mb, p.code;
end $$;

-- Planendring: endrer bare planen (veiledende lagring og pris). Menighetenes kvote endres aldri; p_update_churches ignoreres
-- (beholdt for eldre klienter) og churches_updated er alltid 0. Loggføres med gammel og ny verdi.
create or replace function public.update_plan(p_plan text, p_quota_mb int, p_price_nok_month int, p_update_churches boolean default false) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare p public.plans;
begin
  if app.current_user_id() is null or not app.is_developer() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  select * into p from public.plans where code = p_plan for update;
  if p.code is null then raise exception 'Ukjent plan' using errcode = '22023'; end if;
  if p_quota_mb is null or p_quota_mb < 0 or p_quota_mb > 10240 then raise exception 'Kvoten må være mellom 0 og 10240 MB' using errcode = '22023'; end if;
  if p_price_nok_month is not null and p_price_nok_month < 0 then raise exception 'Prisen kan ikke være negativ' using errcode = '22023'; end if;
  update public.plans set storage_quota_mb = p_quota_mb, price_nok_month = p_price_nok_month where code = p_plan;
  insert into public.audit_logs (actor_user_id, action, target_type, target_id, meta)
  values (app.current_user_id(), 'plans.update', 'plans', p_plan, jsonb_build_object(
    'old', jsonb_build_object('quota_mb', p.storage_quota_mb, 'price_nok_month', p.price_nok_month),
    'new', jsonb_build_object('quota_mb', p_quota_mb, 'price_nok_month', p_price_nok_month),
    'churches_updated', 0));
  return jsonb_build_object('ok', true, 'churches_updated', 0);
end $$;

-- Godkjenning av abonnement: registrerer bare abonnementet. Menighetens kvote endres ikke.
create or replace function public.decide_subscription_request(p_id uuid, p_approve boolean, p_note text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := app.current_user_id(); r public.subscription_requests;
begin
  if v_actor is null or not app.is_staff() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  select * into r from public.subscription_requests where id = p_id and status = 'pending' for update;
  if r.id is null then raise exception 'Fant ikke ventende forespørsel' using errcode = '22023'; end if;
  update public.subscription_requests set status = case when p_approve then 'approved' else 'rejected' end, decided_by = v_actor, decided_at = now(), decision_note = left(p_note, 500) where id = p_id;
  if p_approve then
    insert into public.church_subscriptions (church_id, plan, free_of_charge, updated_by) values (r.church_id, r.plan, r.free_of_charge, v_actor)
      on conflict (church_id) do update set plan = excluded.plan, free_of_charge = excluded.free_of_charge, status = 'active', updated_by = v_actor, updated_at = now();
  end if;
  perform app.notify(r.requested_by, 'subscription', case when p_approve then 'Abonnementet er godkjent' else 'Abonnementsforespørselen er avslått' end, p_note, '/connecthub-admin.dc.html', r.church_id);
end $$;

-- ---------- Tilganger ----------
-- Beholdt, men stengt for alle roller (kan åpnes igjen ved tilbakeføring).
revoke all on function public.follow_plan_quota(uuid), public.plan_change_preview(text, int) from public, anon, authenticated;
revoke all on function public.reset_church_quota(uuid), public.church_quota_overview(), public.plans_admin() from public, anon, authenticated;
grant execute on function public.reset_church_quota(uuid), public.church_quota_overview(), public.plans_admin() to authenticated;
revoke all on function app.churches_quota_class(), app.default_quota_mb() from public, anon, authenticated;
