-- ConnectHub P10 · 1/2 · Samarbeidsområder, abonnement (uten betaling) og varsler. Vanlig PostgreSQL.

-- ---------- Varsler i appen ----------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users (id) on delete cascade,
  kind text not null check (kind in ('invitation_accepted', 'space_invite', 'space_joined', 'subscription', 'church_status', 'message')),
  title text not null check (length(title) between 1 and 160),
  body text check (length(body) <= 1000),
  link text check (link ~ '^/[A-Za-z0-9._/#?=&-]*$'),
  church_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
alter table public.notifications enable row level security;
grant select (id, user_id, kind, title, body, link, church_id, read_at, created_at) on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;
create policy notifications_select_own on public.notifications for select to authenticated using (user_id = app.current_user_id());
create policy notifications_update_own on public.notifications for update to authenticated using (user_id = app.current_user_id()) with check (user_id = app.current_user_id());

create or replace function app.notify(p_user uuid, p_kind text, p_title text, p_body text, p_link text, p_church uuid) returns void
language sql security definer set search_path = '' as $$
  insert into public.notifications (user_id, kind, title, body, link, church_id)
  select p_user, p_kind, left(p_title, 160), left(p_body, 1000), p_link, p_church
  where p_user is not null and exists (select 1 from public.app_users where id = p_user and status = 'active')
$$;
revoke all on function app.notify(uuid, text, text, text, text, uuid) from public, anon, authenticated;

-- Admin i menigheter (aktive) – mottakere av varsler til en menighet.
create or replace function app.church_admins(p_church uuid) returns setof uuid
language sql stable security definer set search_path = '' as $$
  select r.user_id from public.user_roles r join public.memberships m on m.user_id = r.user_id and m.church_id = r.church_id and m.status = 'active'
  where r.church_id = p_church and r.role = 'church_admin' and r.revoked_at is null
$$;
revoke all on function app.church_admins(uuid) from public, anon, authenticated;

-- Melding til alle aktive medlemmer i en menighet (admin i menigheten eller stab). Maks 20 per døgn per avsender.
create or replace function public.send_church_message(p_church uuid, p_title text, p_body text) returns int
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := app.current_user_id(); n int;
begin
  if v_actor is null or not (app.is_church_admin(p_church) or app.is_staff()) then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  if length(btrim(coalesce(p_title, ''))) = 0 then raise exception 'Tittel mangler' using errcode = '22023'; end if;
  if (select count(*) from public.audit_logs where actor_user_id = v_actor and action = 'message.send' and created_at > now() - interval '1 day') >= 20 then
    raise exception 'For mange meldinger siste døgn' using errcode = '54000'; end if;
  perform app.notify(m.user_id, 'message', p_title, p_body, '/media-lab.dc.html', p_church)
    from public.memberships m where m.church_id = p_church and m.status = 'active' and m.user_id <> v_actor;
  get diagnostics n = row_count;
  insert into public.audit_logs (actor_user_id, action, target_type, target_id, church_id) values (v_actor, 'message.send', 'churches', p_church::text, p_church);
  return n;
end $$;

-- Varsel til den som inviterte når invitasjonen godtas.
create or replace function app.on_invitation_accepted() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'accepted' and old.status <> 'accepted' then
    perform app.notify(new.created_by, 'invitation_accepted', 'Invitasjonen er godtatt', new.email || ' har godtatt invitasjonen.', '/connecthub-admin.dc.html', new.church_id);
  end if;
  return null;
end $$;
create trigger invitations_notify after update on public.invitations for each row execute function app.on_invitation_accepted();

-- ---------- Samarbeidsområder ----------
create table public.spaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 2 and 120),
  owner_church_id uuid not null references public.churches (id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_by uuid references public.app_users (id) on delete set null,
  created_at timestamptz not null default now()
);
create table public.space_members (
  space_id uuid not null references public.spaces (id) on delete cascade,
  church_id uuid not null references public.churches (id) on delete cascade,
  status text not null default 'invited' check (status in ('invited', 'active', 'left', 'declined')),
  invited_by uuid references public.app_users (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (space_id, church_id)
);
create table public.space_files (
  space_id uuid not null references public.spaces (id) on delete cascade,
  file_id uuid not null references public.files (id) on delete cascade,
  shared_by uuid references public.app_users (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (space_id, file_id)
);
alter table public.spaces enable row level security;
alter table public.space_members enable row level security;
alter table public.space_files enable row level security;

-- Er innlogget bruker medlem (aktivt) av en menighet som deltar aktivt i området?
create or replace function app.in_space(p_space uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.space_members sm join public.spaces s on s.id = sm.space_id and s.status = 'active'
                 where sm.space_id = p_space and sm.status = 'active' and app.is_member(sm.church_id))
$$;
create or replace function app.space_admin(p_space uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select app.is_staff() or exists (select 1 from public.spaces s where s.id = p_space and app.is_church_admin(s.owner_church_id))
$$;
-- Kan se området: medlemmer i deltakende menigheter, admin i inviterte menigheter, eier-admin og stab.
create or replace function app.can_see_space(p_space uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select app.in_space(p_space) or app.space_admin(p_space) or exists (
    select 1 from public.space_members sm where sm.space_id = p_space and sm.status in ('invited', 'active') and app.is_church_admin(sm.church_id))
$$;
revoke all on function app.in_space(uuid), app.space_admin(uuid), app.can_see_space(uuid) from public, anon;
grant execute on function app.in_space(uuid), app.space_admin(uuid), app.can_see_space(uuid) to authenticated;

grant select (id, name, owner_church_id, status, created_at) on public.spaces to authenticated;
grant select (space_id, church_id, status, created_at) on public.space_members to authenticated;
grant select (space_id, file_id, created_at) on public.space_files to authenticated;
create policy spaces_select on public.spaces for select to authenticated using (app.can_see_space(id));
create policy space_members_select on public.space_members for select to authenticated using (app.can_see_space(space_id));
create policy space_files_select on public.space_files for select to authenticated using (app.in_space(space_id) or app.space_admin(space_id));

-- Filer delt i et område er synlige for deltakerne (bare fellesfiler; private filer kan aldri deles).
drop policy files_select on public.files;
create policy files_select on public.files for select to authenticated using (
  (visibility = 'church' and (app.is_member(church_id) or app.is_church_admin(church_id) or app.is_staff()))
  or (visibility = 'private' and uploaded_by = app.current_user_id())
  or (visibility = 'church' and exists (select 1 from public.space_files sf where sf.file_id = files.id and app.in_space(sf.space_id))));
create or replace function app.visible_file_keys(p_ids uuid[]) returns table (id uuid, storage_key text, mime_type text)
language sql stable security definer set search_path = '' as $$
  select f.id, f.storage_key, f.mime_type from public.files f
  where f.id = any (p_ids) and (
    (f.visibility = 'church' and (app.is_member(f.church_id) or app.is_church_admin(f.church_id) or app.is_staff()))
    or (f.visibility = 'private' and f.uploaded_by = app.current_user_id())
    or (f.visibility = 'church' and exists (select 1 from public.space_files sf where sf.file_id = f.id and app.in_space(sf.space_id))))
$$;

-- Navneliste over aktive menigheter (bare id og navn) for admin/stab som skal invitere til et område.
create or replace function public.church_directory() returns table (id uuid, name text)
language sql stable security definer set search_path = '' as $$
  select c.id, c.name from public.churches c
  where c.status = 'active' and (app.is_staff() or exists (select 1 from public.user_roles r where r.user_id = app.current_user_id() and r.role = 'church_admin' and r.revoked_at is null))
  order by c.name
$$;

create or replace function public.create_space(p_name text, p_owner uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := app.current_user_id(); v uuid;
begin
  if v_actor is null or not (app.is_church_admin(p_owner) or app.is_staff()) then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  insert into public.spaces (name, owner_church_id, created_by) values (btrim(p_name), p_owner, v_actor) returning id into v;
  insert into public.space_members (space_id, church_id, status, invited_by) values (v, p_owner, 'active', v_actor);
  insert into public.audit_logs (actor_user_id, action, target_type, target_id, church_id) values (v_actor, 'spaces.create', 'spaces', v::text, p_owner);
  return v;
end $$;

create or replace function public.invite_to_space(p_space uuid, p_church uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := app.current_user_id(); v_name text;
begin
  if v_actor is null or not app.space_admin(p_space) then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  if not exists (select 1 from public.churches where id = p_church and status = 'active') then raise exception 'Menigheten er ikke aktiv' using errcode = '22023'; end if;
  insert into public.space_members (space_id, church_id, status, invited_by) values (p_space, p_church, 'invited', v_actor)
    on conflict (space_id, church_id) do update set status = 'invited', invited_by = v_actor where public.space_members.status in ('left', 'declined');
  select name into v_name from public.spaces where id = p_space;
  perform app.notify(a, 'space_invite', 'Invitasjon til samarbeid', 'Menigheten er invitert til samarbeidsområdet «' || v_name || '».', '/connecthub-admin.dc.html', p_church)
    from app.church_admins(p_church) a;
  insert into public.audit_logs (actor_user_id, action, target_type, target_id, church_id) values (v_actor, 'spaces.invite', 'spaces', p_space::text, p_church);
end $$;

-- Svar på invitasjon / forlate: admin i den aktuelle menigheten. Eier-menigheten kan ikke forlate sitt eget område.
create or replace function public.set_space_membership(p_space uuid, p_church uuid, p_status text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := app.current_user_id(); cur text;
begin
  if v_actor is null or not app.is_church_admin(p_church) then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  if p_status not in ('active', 'declined', 'left') then raise exception 'Ugyldig status' using errcode = '22023'; end if;
  if exists (select 1 from public.spaces where id = p_space and owner_church_id = p_church) then raise exception 'Eier kan ikke forlate området' using errcode = '22023'; end if;
  select status into cur from public.space_members where space_id = p_space and church_id = p_church for update;
  if cur is null or (p_status in ('active', 'declined') and cur <> 'invited') or (p_status = 'left' and cur <> 'active') then
    raise exception 'Ugyldig overgang' using errcode = '22023'; end if;
  update public.space_members set status = p_status where space_id = p_space and church_id = p_church;
  if p_status <> 'active' then delete from public.space_files sf using public.files f where sf.space_id = p_space and f.id = sf.file_id and f.church_id = p_church; end if;
  insert into public.audit_logs (actor_user_id, action, target_type, target_id, church_id, meta) values (v_actor, 'spaces.membership', 'spaces', p_space::text, p_church, jsonb_build_object('status', p_status));
end $$;

-- Dele en fellesfil fra egen menighet i et område der menigheten deltar aktivt. Private filer kan ikke deles.
create or replace function public.share_file_to_space(p_file uuid, p_space uuid, p_share boolean default true) returns void
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := app.current_user_id(); f public.files;
begin
  select * into f from public.files where id = p_file;
  if v_actor is null or f.id is null then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  if p_share then
    if f.visibility <> 'church' then raise exception 'Private filer kan ikke deles' using errcode = '22023'; end if;
    if not (app.is_church_admin(f.church_id) or app.is_staff()) then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
    if not exists (select 1 from public.space_members where space_id = p_space and church_id = f.church_id and status = 'active') then
      raise exception 'Menigheten deltar ikke i området' using errcode = '22023'; end if;
    insert into public.space_files (space_id, file_id, shared_by) values (p_space, p_file, v_actor) on conflict do nothing;
  else
    if not (app.is_church_admin(f.church_id) or app.space_admin(p_space)) then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
    delete from public.space_files where space_id = p_space and file_id = p_file;
  end if;
end $$;

-- ---------- Abonnement (uten betaling) ----------
create table public.plans (
  code text primary key check (code ~ '^[a-z]{2,20}$'),
  name text not null,
  storage_quota_mb int not null check (storage_quota_mb between 0 and 10240),
  price_nok_month int check (price_nok_month >= 0),
  active boolean not null default true
);
insert into public.plans (code, name, storage_quota_mb, price_nok_month) values
  ('gratis', 'Gratis', 200, 0), ('standard', 'Standard', 1024, null), ('utvidet', 'Utvidet', 5120, null);
create table public.church_subscriptions (
  church_id uuid primary key references public.churches (id) on delete cascade,
  plan text not null references public.plans (code),
  free_of_charge boolean not null default true,
  status text not null default 'active' check (status in ('active', 'cancelled')),
  updated_by uuid references public.app_users (id) on delete set null,
  updated_at timestamptz not null default now()
);
create table public.subscription_requests (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches (id) on delete cascade,
  plan text not null references public.plans (code),
  free_of_charge boolean not null default false,
  reason text check (length(reason) <= 1000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'withdrawn')),
  requested_by uuid references public.app_users (id) on delete set null,
  decided_by uuid references public.app_users (id) on delete set null,
  decision_note text check (length(decision_note) <= 500),
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
create unique index subscription_requests_one_pending on public.subscription_requests (church_id) where status = 'pending';
alter table public.plans enable row level security;
alter table public.church_subscriptions enable row level security;
alter table public.subscription_requests enable row level security;
grant select on public.plans to authenticated;
create policy plans_select on public.plans for select to authenticated using (true);
grant select (church_id, plan, free_of_charge, status, updated_at) on public.church_subscriptions to authenticated;
create policy church_subscriptions_select on public.church_subscriptions for select to authenticated using (app.is_church_admin(church_id) or app.is_staff());
grant select (id, church_id, plan, free_of_charge, reason, status, decision_note, created_at, decided_at) on public.subscription_requests to authenticated;
create policy subscription_requests_select on public.subscription_requests for select to authenticated using (app.is_church_admin(church_id) or app.is_staff());
create trigger subscription_requests_audit after insert or update or delete on public.subscription_requests for each row execute function app.audit_row();
create trigger church_subscriptions_audit after insert or update or delete on public.church_subscriptions for each row execute function app.audit_row();

create or replace function public.request_subscription(p_church uuid, p_plan text, p_free boolean, p_reason text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := app.current_user_id(); v uuid;
begin
  if v_actor is null or not app.is_church_admin(p_church) then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  if not exists (select 1 from public.plans where code = p_plan and active) then raise exception 'Ukjent plan' using errcode = '22023'; end if;
  insert into public.subscription_requests (church_id, plan, free_of_charge, reason, requested_by)
  values (p_church, p_plan, coalesce(p_free, false), left(p_reason, 1000), v_actor) returning id into v;
  perform app.notify(r.user_id, 'subscription', 'Ny abonnementsforespørsel', 'En menighet ber om «' || p_plan || '».', '/connecthub-admin.dc.html', p_church)
    from public.user_roles r where r.role in ('developer', 'moderator') and r.church_id is null and r.revoked_at is null;
  return v;
end $$;

create or replace function public.withdraw_subscription_request(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare r public.subscription_requests;
begin
  select * into r from public.subscription_requests where id = p_id and status = 'pending' for update;
  if r.id is null or not app.is_church_admin(r.church_id) then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  update public.subscription_requests set status = 'withdrawn' where id = p_id;
end $$;

-- Stab avgjør. Godkjenning setter abonnement og lagringskvote for menigheten. Ingen betaling håndteres her.
create or replace function public.decide_subscription_request(p_id uuid, p_approve boolean, p_note text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := app.current_user_id(); r public.subscription_requests; q int;
begin
  if v_actor is null or not app.is_staff() then raise exception 'Ingen tilgang' using errcode = '42501'; end if;
  select * into r from public.subscription_requests where id = p_id and status = 'pending' for update;
  if r.id is null then raise exception 'Fant ikke ventende forespørsel' using errcode = '22023'; end if;
  update public.subscription_requests set status = case when p_approve then 'approved' else 'rejected' end, decided_by = v_actor, decided_at = now(), decision_note = left(p_note, 500) where id = p_id;
  if p_approve then
    insert into public.church_subscriptions (church_id, plan, free_of_charge, updated_by) values (r.church_id, r.plan, r.free_of_charge, v_actor)
      on conflict (church_id) do update set plan = excluded.plan, free_of_charge = excluded.free_of_charge, status = 'active', updated_by = v_actor, updated_at = now();
    select storage_quota_mb into q from public.plans where code = r.plan;
    update public.churches set storage_quota_mb = q where id = r.church_id;
  end if;
  perform app.notify(r.requested_by, 'subscription', case when p_approve then 'Abonnementet er godkjent' else 'Abonnementsforespørselen er avslått' end, p_note, '/connecthub-admin.dc.html', r.church_id);
end $$;

revoke all on function public.send_church_message(uuid, text, text), public.church_directory(), public.create_space(text, uuid), public.invite_to_space(uuid, uuid),
  public.set_space_membership(uuid, uuid, text), public.share_file_to_space(uuid, uuid, boolean), public.request_subscription(uuid, text, boolean, text),
  public.withdraw_subscription_request(uuid), public.decide_subscription_request(uuid, boolean, text) from public, anon;
grant execute on function public.send_church_message(uuid, text, text), public.church_directory(), public.create_space(text, uuid), public.invite_to_space(uuid, uuid),
  public.set_space_membership(uuid, uuid, text), public.share_file_to_space(uuid, uuid, boolean), public.request_subscription(uuid, text, boolean, text),
  public.withdraw_subscription_request(uuid), public.decide_subscription_request(uuid, boolean, text) to authenticated;
