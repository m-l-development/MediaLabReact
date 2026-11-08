-- Send en mal fra Thumbnail Studio til et annet medlem i samme menighet (TB-09177E): mottakeren får et varsel og kan
-- godta (✓) eller avslå (✕).
--
-- Bare tillegg: én ny tabell og nye funksjoner. Ingen eksisterende tabell, kolonne, rad, regel eller funksjon endres.
-- Varselet bruker den eksisterende app.notify med den eksisterende typen 'message' (notifications_kind_check er uendret).
-- Fremmednøklene er cascade som de andre tabellene, så sletting av menighet (church.purge) og konto (privacy.delete_me)
-- virker som før.

create table if not exists public.item_shares (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches (id) on delete cascade,
  from_user uuid not null references public.app_users (id) on delete cascade,
  to_user uuid not null references public.app_users (id) on delete cascade,
  app text not null check (app in ('thumbnail-studio')),
  kind text not null check (kind in ('template')),
  name text not null check (char_length(name) between 1 and 80),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object' and octet_length(payload::text) <= 524288),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (from_user <> to_user)
);
create index if not exists item_shares_to_idx on public.item_shares (to_user, status, created_at desc);
create index if not exists item_shares_from_idx on public.item_shares (from_user, created_at desc);
create index if not exists item_shares_church_idx on public.item_shares (church_id);
-- Ingen direkte tilgang (RLS uten policyer): alt går gjennom funksjonene under, som tilbakemeldingene.
alter table public.item_shares enable row level security;
revoke all on public.item_shares from public, anon, authenticated;

-- Navn på et medlem slik andre medlemmer ser det (aldri e-post).
create or replace function app.member_label(p_user uuid) returns text
language sql stable security definer set search_path = '' as $$
  select coalesce(nullif(btrim(u.full_name), ''), 'Medlem') from public.app_users u where u.id = p_user
$$;
revoke all on function app.member_label(uuid) from public, anon, authenticated;

-- Aktive medlemmer i menigheten (unntatt deg selv) som du kan sende til. Bare for aktive medlemmer av menigheten.
create or replace function public.church_peers(p_church uuid) returns table (id uuid, name text)
language plpgsql stable security definer set search_path = '' as $$
declare v_actor uuid := app.current_user_id();
begin
  if v_actor is null or not app.is_member(p_church) then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  return query
    select u.id, app.member_label(u.id)
    from public.memberships m join public.app_users u on u.id = m.user_id
    where m.church_id = p_church and m.status = 'active' and u.status = 'active' and u.id <> v_actor
      and not app.temp_membership_ended(u.id, p_church)
    order by 2;
end $$;

-- Sender en mal. Mottakeren må være aktivt medlem i samme menighet. Bildereferanser må være menighetens felles filer
-- (samme regel som church_settings_save). Grenser: 30 sendinger per døgn per avsender, 50 ventende per mottaker.
create or replace function public.send_item_share(p_church uuid, p_to uuid, p_app text, p_kind text, p_name text, p_payload jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := app.current_user_id(); v_id uuid; v_ref text; v_name text := btrim(coalesce(p_name, ''));
begin
  if v_actor is null or not app.is_member(p_church) then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  if p_to is null or p_to = v_actor then raise exception 'Ugyldig mottaker' using errcode = '22023'; end if;
  if not exists (select 1 from public.memberships m join public.app_users u on u.id = m.user_id
                 where m.user_id = p_to and m.church_id = p_church and m.status = 'active' and u.status = 'active')
     or app.temp_membership_ended(p_to, p_church) then
    raise exception 'Mottakeren er ikke medlem i menigheten' using errcode = '42501'; end if;
  if p_app is null or p_app not in ('thumbnail-studio') or p_kind is null or p_kind not in ('template') then raise exception 'Ugyldig type' using errcode = '22023'; end if;
  if char_length(v_name) < 1 or char_length(v_name) > 80 then raise exception 'Ugyldig navn' using errcode = '22023'; end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' or octet_length(p_payload::text) > 524288 then raise exception 'For mye data' using errcode = '22023'; end if;
  for v_ref in select distinct m[1] from regexp_matches(p_payload::text, 'ch:([0-9a-fA-F-]{36})', 'g') m loop
    if not exists (select 1 from public.files f where f.id = v_ref::uuid and f.church_id = p_church and f.visibility = 'church' and f.folder <> 'samarbeid') then
      raise exception 'Bildet tilhører ikke menigheten' using errcode = '42501'; end if;
  end loop;
  if (select count(*) from public.item_shares where from_user = v_actor and created_at > now() - interval '1 day') >= 30
     or (select count(*) from public.item_shares where to_user = p_to and status = 'pending') >= 50 then
    raise exception 'For mange sendinger' using errcode = '54000'; end if;
  insert into public.item_shares (church_id, from_user, to_user, app, kind, name, payload)
  values (p_church, v_actor, p_to, p_app, p_kind, v_name, p_payload)
  returning id into v_id;
  perform app.notify(p_to, 'message', 'Du har mottatt en mal',
    app.member_label(v_actor) || ' vil sende deg «' || v_name || '» i Thumbnail Studio. Åpne Thumbnail Studio for å godta eller avslå.',
    '/app/thumbnail-studio', p_church);
  insert into public.audit_logs (actor_user_id, action, target_type, target_id, church_id, meta)
  values (v_actor, 'share.send', 'item_shares', v_id::text, p_church, jsonb_build_object('app', p_app, 'kind', p_kind));
  return v_id;
end $$;

-- Mine ventende mottatte maler (uten innholdet), nyeste først.
create or replace function public.my_item_shares(p_app text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_actor uuid := app.current_user_id();
begin
  if v_actor is null then raise exception 'Ikke innlogget' using errcode = '42501'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', s.id, 'name', s.name, 'kind', s.kind, 'church_id', s.church_id,
      'from_name', app.member_label(s.from_user), 'created_at', s.created_at) order by s.created_at desc)
    from public.item_shares s
    where s.to_user = v_actor and s.status = 'pending' and s.app = p_app and app.is_member(s.church_id)), '[]'::jsonb);
end $$;

-- Godta (gir innholdet tilbake) eller avslå. Bare mottakeren, bare ventende. Innholdet tømmes etterpå (sparer plass);
-- avsenderen får et varsel om svaret.
create or replace function public.respond_item_share(p_id uuid, p_accept boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := app.current_user_id(); s public.item_shares;
begin
  if v_actor is null then raise exception 'Ikke innlogget' using errcode = '42501'; end if;
  select * into s from public.item_shares where id = p_id for update;
  if s.id is null or s.to_user <> v_actor or not app.is_member(s.church_id) then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  if s.status <> 'pending' then raise exception 'Allerede besvart' using errcode = '22023'; end if;
  update public.item_shares set status = case when p_accept then 'accepted' else 'declined' end, responded_at = now(), payload = '{}'::jsonb
    where id = p_id;
  perform app.notify(s.from_user, 'message', case when p_accept then 'Malen ble godtatt' else 'Malen ble avslått' end,
    app.member_label(v_actor) || case when p_accept then ' har godtatt' else ' har avslått' end || ' «' || s.name || '».',
    '/app/thumbnail-studio', s.church_id);
  insert into public.audit_logs (actor_user_id, action, target_type, target_id, church_id, meta)
  values (v_actor, case when p_accept then 'share.accept' else 'share.decline' end, 'item_shares', p_id::text, s.church_id, jsonb_build_object('app', s.app));
  return case when p_accept then jsonb_build_object('name', s.name, 'kind', s.kind, 'payload', s.payload) else jsonb_build_object('name', s.name) end;
end $$;

revoke all on function public.church_peers(uuid), public.send_item_share(uuid, uuid, text, text, text, jsonb),
  public.my_item_shares(text), public.respond_item_share(uuid, boolean) from public, anon;
grant execute on function public.church_peers(uuid), public.send_item_share(uuid, uuid, text, text, text, jsonb),
  public.my_item_shares(text), public.respond_item_share(uuid, boolean) to authenticated;
