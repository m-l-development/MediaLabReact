-- ConnectHub · Brukergrense per menighet (docs/plan-brukergrense.md, godkjent 2026-10-12).
--   * Grense per menighet, standard 10 (churches.member_limit). Teller ulike personer: aktive medlemskap + ventende,
--     ikke utløpte invitasjoner (User/Admin) til adresser som ikke allerede er aktive medlemmer.
--   * Håndheves av triggere på memberships og invitations, så ALLE veier stoppes (invitasjon, godkjenning av
--     kontoforespørsel, add_membership, godta invitasjon, reaktivering via API). En transaksjonslås per menighet gjør
--     tellingen atomisk: samtidige tillegg i samme menighet står i kø.
--   * Avviser bare når antallet øker over grensen. Å godta en invitasjon øker ikke antallet (personen er allerede talt);
--     menigheter over grensen fra før beholder alle, men kan ikke legge til flere.
--   * Aktivt medlemskap teller uansett kontostatus, så stab kan ikke omgå grensen ved å låse opp en sperret konto.
--   * Overstyring: set_member_limit – Developer/Moderator med MFA og begrunnelse; logges i audit_logs.
-- Egen feilkode: CH013 = menigheten har nådd brukergrensen.

alter table public.churches add column member_limit int not null default 10 check (member_limit between 1 and 1000);

-- Antall personer som teller mot grensen (se over).
create or replace function app.member_count(p_church uuid) returns int
language sql stable security definer set search_path = '' as $$
  with m as (
    select lower(u.email) as e from public.memberships ms join public.app_users u on u.id = ms.user_id
    where ms.church_id = p_church and ms.status = 'active'
  ), i as (
    select distinct lower(iv.email) as e from public.invitations iv
    where iv.church_id = p_church and iv.status = 'pending' and iv.expires_at > now() and iv.role in ('user', 'church_admin')
  )
  select ((select count(*) from m) + (select count(*) from i where i.e not in (select e from m)))::int
$$;
revoke all on function app.member_count(uuid) from public, anon, authenticated;

-- Er personen (e-post) allerede talt i menigheten: aktivt medlem eller ventende invitasjon?
create or replace function app.member_counted(p_church uuid, p_email text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.memberships ms join public.app_users u on u.id = ms.user_id
                 where ms.church_id = p_church and ms.status = 'active' and lower(u.email) = lower(p_email))
      or exists (select 1 from public.invitations iv
                 where iv.church_id = p_church and iv.status = 'pending' and iv.expires_at > now()
                   and iv.role in ('user', 'church_admin') and lower(iv.email) = lower(p_email))
$$;
revoke all on function app.member_counted(uuid, text) from public, anon, authenticated;

create or replace function app.member_limit_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_church uuid; v_email text; v_limit int; v_before int;
begin
  if tg_table_name = 'memberships' then
    if new.status <> 'active' or (tg_op = 'UPDATE' and old.status = 'active') then return new; end if;
    v_church := new.church_id;
    select email into v_email from public.app_users where id = new.user_id;
  else
    -- teller bare når invitasjonen går fra å ikke telle til å telle: ny ventende, ny status «ventende», eller en utløpt
    -- (men fortsatt «ventende») invitasjon som får ny utløpsdato (reissue_invitation / «Send på nytt»)
    if new.status <> 'pending' or new.church_id is null or new.role not in ('user', 'church_admin') or new.expires_at <= now()
       or (tg_op = 'UPDATE' and old.status = 'pending' and old.expires_at > now()) then return new; end if;
    v_church := new.church_id;
    v_email := new.email;
  end if;
  perform pg_advisory_xact_lock(hashtextextended('ch:church-members:' || v_church::text, 0));
  if v_email is not null and app.member_counted(v_church, v_email) then return new; end if;   -- antallet øker ikke
  select member_limit into v_limit from public.churches where id = v_church;
  v_before := app.member_count(v_church);
  if v_before + 1 > coalesce(v_limit, 10) then
    raise exception 'Menigheten har nådd grensen på % brukere (% med ventende invitasjoner)', coalesce(v_limit, 10), v_before
      using errcode = 'CH013';
  end if;
  return new;
end $$;
revoke all on function app.member_limit_guard() from public, anon, authenticated;

-- Navnet sorterer etter memberships_single_church: låsen per bruker tas alltid før låsen per menighet (ingen vranglås).
create trigger memberships_zz_member_limit before insert or update of status on public.memberships
  for each row execute function app.member_limit_guard();
create trigger invitations_zz_member_limit before insert or update of status, expires_at on public.invitations
  for each row execute function app.member_limit_guard();

-- Bruk og grense for grensesnittet: menighetens medlemmer og Admin, og stab.
create or replace function public.member_usage(p_church uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_limit int;
begin
  if app.current_user_id() is null or not (app.is_staff() or app.is_member(p_church) or app.is_church_admin(p_church)) then
    raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  select member_limit into v_limit from public.churches where id = p_church;
  if v_limit is null then raise exception 'Ukjent menighet' using errcode = '22023'; end if;
  return jsonb_build_object(
    'count', app.member_count(p_church),
    'limit', v_limit,
    'pending', (select count(distinct lower(iv.email)) from public.invitations iv
                where iv.church_id = p_church and iv.status = 'pending' and iv.expires_at > now() and iv.role in ('user', 'church_admin')
                  and not exists (select 1 from public.memberships ms join public.app_users u on u.id = ms.user_id
                                  where ms.church_id = p_church and ms.status = 'active' and lower(u.email) = lower(iv.email))));
end $$;
revoke all on function public.member_usage(uuid) from public, anon;
grant execute on function public.member_usage(uuid) to authenticated;

-- Overstyring: Developer/Moderator med MFA og begrunnelse. Kolonnen kan ikke endres direkte fra klienten
-- (kolonnerettighetene på churches gjelder bare name og status).
create or replace function public.set_member_limit(p_church uuid, p_limit int, p_reason text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := app.current_user_id(); v_old int; v_reason text := btrim(coalesce(p_reason, ''));
begin
  if v_actor is null or not app.is_staff() or not app.mfa_ok() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  if p_limit is null or p_limit < 1 or p_limit > 1000 then raise exception 'Grensen må være mellom 1 og 1000' using errcode = '22023'; end if;
  if char_length(v_reason) not between 10 and 500 or v_reason ~ '[[:cntrl:]]' then
    raise exception 'Begrunnelsen må ha 10–500 tegn' using errcode = '22023'; end if;
  select member_limit into v_old from public.churches where id = p_church for update;
  if v_old is null then raise exception 'Ukjent menighet' using errcode = '22023'; end if;
  update public.churches set member_limit = p_limit where id = p_church;
  insert into public.audit_logs (actor_user_id, action, target_type, target_id, church_id, reason, meta)
  values (v_actor, 'church.member_limit', 'church', p_church::text, p_church, v_reason, jsonb_build_object('old', v_old, 'new', p_limit));
  return jsonb_build_object('church_id', p_church, 'limit', p_limit, 'old', v_old, 'count', app.member_count(p_church));
end $$;
revoke all on function public.set_member_limit(uuid, int, text) from public, anon;
grant execute on function public.set_member_limit(uuid, int, text) to authenticated;
