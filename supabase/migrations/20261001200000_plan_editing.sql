-- ConnectHub · Trinn 19: Developer kan endre lagringskvote og pris per abonnementsplan. Vanlig PostgreSQL.
-- Migreringen ENDRER INGEN plan- eller kvoteverdier (Gratis 200 MB / 0 kr, Standard 1024 MB / «Avtales», Utvidet 5120 MB /
-- «Avtales» beholdes). Den gir bare Developer (med MFA) loggførte funksjoner for å endre dem senere.
--   - Egne kvoter (churches.quota_custom) overskrives aldri automatisk – heller ikke når et abonnement godkjennes.
--   - Ingen automatisk kobling til Gratis-planen for menigheter uten abonnement eller med avsluttet abonnement (G1).
--   - Ingen filer slettes når en kvote reduseres; opplasting stoppes bare når forbruket er over kvoten (upload_check).
--   - All skriving av kvoter og planer går gjennom funksjonene under; direkte skriving er stengt for alle roller.

-- ---------- Egen kvote ----------
alter table public.churches add column quota_custom boolean not null default false;
grant select (quota_custom) on public.churches to authenticated;
-- Merk eksisterende menigheter der kvoten avviker fra dagens regel (planens kvote med abonnement, ellers standarden 200 MB).
-- Bare det nye feltet settes; kvoten selv endres ikke.
update public.churches c set quota_custom = true
where c.storage_quota_mb <> coalesce((select p.storage_quota_mb from public.church_subscriptions s join public.plans p on p.code = s.plan where s.church_id = c.id), 200);
revoke update (storage_quota_mb) on public.churches from authenticated;   -- kvoten endres bare via loggførte funksjoner

-- Logg for kvoteendringer per menighet (gammel og ny verdi, årsak). Hvem og når føres automatisk (actor_user_id, created_at).
create or replace function app.log_quota(p_church uuid, p_old int, p_new int, p_reason text) returns void
language sql security definer set search_path = '' as $$
  insert into public.audit_logs (actor_user_id, action, target_type, target_id, church_id, meta)
  values (app.current_user_id(), 'churches.quota', 'churches', p_church::text, p_church,
          jsonb_build_object('old_mb', p_old, 'new_mb', p_new, 'reason', p_reason))
$$;
revoke all on function app.log_quota(uuid, int, int, text) from public, anon, authenticated;

-- Developer setter en egen kvote for én menighet (beskyttes mot automatiske endringer).
create or replace function public.set_church_quota(p_church uuid, p_quota_mb int) returns void
language plpgsql security definer set search_path = '' as $$
declare v_old int;
begin
  if app.current_user_id() is null or not app.is_developer() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  if p_quota_mb is null or p_quota_mb < 0 or p_quota_mb > 10240 then raise exception 'Kvoten må være mellom 0 og 10240 MB' using errcode = '22023'; end if;
  select storage_quota_mb into v_old from public.churches where id = p_church for update;
  if v_old is null then raise exception 'Fant ikke menigheten' using errcode = '22023'; end if;
  update public.churches set storage_quota_mb = p_quota_mb, quota_custom = true where id = p_church;
  perform app.log_quota(p_church, v_old, p_quota_mb, 'egen kvote');
end $$;

-- Developer lar menigheten følge planen igjen: planens kvote ved abonnement, ellers dagens standard (200 MB, G1).
create or replace function public.follow_plan_quota(p_church uuid) returns int
language plpgsql security definer set search_path = '' as $$
declare v_old int; v_new int;
begin
  if app.current_user_id() is null or not app.is_developer() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  select storage_quota_mb into v_old from public.churches where id = p_church for update;
  if v_old is null then raise exception 'Fant ikke menigheten' using errcode = '22023'; end if;
  v_new := coalesce((select p.storage_quota_mb from public.church_subscriptions s join public.plans p on p.code = s.plan where s.church_id = p_church), 200);
  update public.churches set storage_quota_mb = v_new, quota_custom = false where id = p_church;
  perform app.log_quota(p_church, v_old, v_new, 'følger planen igjen');
  return v_new;
end $$;

-- ---------- Planer ----------
-- Forhåndsvisning (bare lesing): hvilke menigheter en ny kvote for planen vil berøre, og hvilke som hoppes over og hvorfor.
-- Gratis-planen viser også menigheter uten registrert abonnement – som alltid hoppes over (G1).
create or replace function public.plan_change_preview(p_plan text, p_new_quota_mb int)
returns table (church_id uuid, church_name text, current_mb int, new_mb int, used_bytes bigint, will_change boolean, over_after boolean, reason text)
language plpgsql stable security definer set search_path = '' as $$
declare v_old int;
begin
  if app.current_user_id() is null or not app.is_developer() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  select storage_quota_mb into v_old from public.plans where code = p_plan;
  if v_old is null then raise exception 'Ukjent plan' using errcode = '22023'; end if;
  return query
  with cand as (
    select c.id, c.name, c.storage_quota_mb q, c.quota_custom cu, s.status st
    from public.churches c join public.church_subscriptions s on s.church_id = c.id and s.plan = p_plan
    union all
    select c.id, c.name, c.storage_quota_mb, c.quota_custom, null
    from public.churches c where p_plan = 'gratis' and not exists (select 1 from public.church_subscriptions s where s.church_id = c.id)
  ), dec as (
    select cand.*, (cand.st = 'active' and not cand.cu and cand.q = v_old and p_new_quota_mb <> v_old) chg,
      case when cand.st is null then 'uten registrert abonnement (endres ikke)'
           when cand.st <> 'active' then 'avsluttet abonnement (endres ikke)'
           when cand.cu then 'egen kvote (beskyttet)'
           when cand.q <> v_old then 'kvoten avviker fra planen (endres ikke)'
           when p_new_quota_mb = v_old then 'uendret kvote'
           else 'endres' end why
    from cand
  )
  select d.id, d.name, d.q, case when d.chg then p_new_quota_mb else d.q end,
         (select coalesce(sum(f.file_size), 0)::bigint from public.files f where f.church_id = d.id),
         d.chg,
         (select coalesce(sum(f.file_size), 0) from public.files f where f.church_id = d.id) > (case when d.chg then p_new_quota_mb else d.q end)::bigint * 1048576,
         d.why
  from dec d order by d.chg desc, d.name;
end $$;

-- Developer endrer pris og/eller kvote for en plan. Med p_update_churches oppdateres bare menigheter med AKTIVT abonnement på
-- planen, uten egen kvote og med planens gamle kvote. Alt loggføres med gammel og ny verdi.
create or replace function public.update_plan(p_plan text, p_quota_mb int, p_price_nok_month int, p_update_churches boolean default false) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare p public.plans; n int := 0; c record;
begin
  if app.current_user_id() is null or not app.is_developer() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  select * into p from public.plans where code = p_plan for update;
  if p.code is null then raise exception 'Ukjent plan' using errcode = '22023'; end if;
  if p_quota_mb is null or p_quota_mb < 0 or p_quota_mb > 10240 then raise exception 'Kvoten må være mellom 0 og 10240 MB' using errcode = '22023'; end if;
  if p_price_nok_month is not null and p_price_nok_month < 0 then raise exception 'Prisen kan ikke være negativ' using errcode = '22023'; end if;
  update public.plans set storage_quota_mb = p_quota_mb, price_nok_month = p_price_nok_month where code = p_plan;
  if coalesce(p_update_churches, false) and p_quota_mb <> p.storage_quota_mb then
    for c in select ch.id, ch.storage_quota_mb from public.churches ch join public.church_subscriptions s on s.church_id = ch.id
             where s.plan = p_plan and s.status = 'active' and not ch.quota_custom and ch.storage_quota_mb = p.storage_quota_mb for update of ch loop
      update public.churches set storage_quota_mb = p_quota_mb where id = c.id;
      perform app.log_quota(c.id, c.storage_quota_mb, p_quota_mb, 'plan «' || p_plan || '» endret');
      n := n + 1;
    end loop;
  end if;
  insert into public.audit_logs (actor_user_id, action, target_type, target_id, meta)
  values (app.current_user_id(), 'plans.update', 'plans', p_plan, jsonb_build_object(
    'old', jsonb_build_object('quota_mb', p.storage_quota_mb, 'price_nok_month', p.price_nok_month),
    'new', jsonb_build_object('quota_mb', p_quota_mb, 'price_nok_month', p_price_nok_month),
    'churches_updated', n));
  return jsonb_build_object('ok', true, 'churches_updated', n);
end $$;

-- Godkjenning av abonnement: egen kvote beholdes; ellers settes planens kvote som før. Kvoteendringen loggføres.
create or replace function public.decide_subscription_request(p_id uuid, p_approve boolean, p_note text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := app.current_user_id(); r public.subscription_requests; q int; v_old int; v_custom boolean;
begin
  if v_actor is null or not app.is_staff() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  select * into r from public.subscription_requests where id = p_id and status = 'pending' for update;
  if r.id is null then raise exception 'Fant ikke ventende forespørsel' using errcode = '22023'; end if;
  update public.subscription_requests set status = case when p_approve then 'approved' else 'rejected' end, decided_by = v_actor, decided_at = now(), decision_note = left(p_note, 500) where id = p_id;
  if p_approve then
    insert into public.church_subscriptions (church_id, plan, free_of_charge, updated_by) values (r.church_id, r.plan, r.free_of_charge, v_actor)
      on conflict (church_id) do update set plan = excluded.plan, free_of_charge = excluded.free_of_charge, status = 'active', updated_by = v_actor, updated_at = now();
    select storage_quota_mb into q from public.plans where code = r.plan;
    select storage_quota_mb, quota_custom into v_old, v_custom from public.churches where id = r.church_id for update;
    if v_custom then
      perform app.log_quota(r.church_id, v_old, v_old, 'abonnement «' || r.plan || '» godkjent – egen kvote beholdt');
    else
      update public.churches set storage_quota_mb = q where id = r.church_id;
      perform app.log_quota(r.church_id, v_old, q, 'abonnement «' || r.plan || '» godkjent');
    end if;
  end if;
  perform app.notify(r.requested_by, 'subscription', case when p_approve then 'Abonnementet er godkjent' else 'Abonnementsforespørselen er avslått' end, p_note, '/connecthub-admin.dc.html', r.church_id);
end $$;

revoke all on function public.set_church_quota(uuid, int), public.follow_plan_quota(uuid), public.plan_change_preview(text, int),
  public.update_plan(text, int, int, boolean) from public, anon, authenticated;
grant execute on function public.set_church_quota(uuid, int), public.follow_plan_quota(uuid), public.plan_change_preview(text, int),
  public.update_plan(text, int, int, boolean) to authenticated;
