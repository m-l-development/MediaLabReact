-- ConnectHub · Developer/Moderator kan trekke tilbake sin egen ventende forespørsel om midlertidig Admin-tilgang
-- (bare connecthub-dev først). Forespørselen beholdes som historikk med status «cancelled» (finnes allerede i tabellen).
-- Ingen rader endres av migreringen.

-- Bare den som sendte forespørselen, og bare mens den venter. Raden låses (for update) som i decide_admin_access, så
-- samtidig godkjenning/avslag og tilbaketrekking aldri begge lykkes: den som kommer sist, får CH020 (allerede behandlet).
create or replace function public.withdraw_admin_access(p_request uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := app.current_user_id(); q public.admin_access_requests;
begin
  if v_actor is null then raise exception 'Ikke innlogget' using errcode = '42501'; end if;
  select * into q from public.admin_access_requests where id = p_request for update;
  if q.id is null or q.requester <> v_actor then raise exception 'Fant ikke forespørselen' using errcode = '42501'; end if;
  if q.status <> 'pending' then raise exception 'Forespørselen er allerede behandlet' using errcode = 'CH020'; end if;
  update public.admin_access_requests set status = 'cancelled', decided_by = v_actor, decided_at = now() where id = q.id;
  insert into public.audit_logs (actor_user_id, action, target_type, target_id, church_id, meta)
  values (v_actor, 'roles.temp_admin_withdraw', 'admin_access_requests', q.id::text, q.church_id, '{}'::jsonb);
  return jsonb_build_object('ok', true, 'status', 'cancelled');
end $$;
revoke all on function public.withdraw_admin_access(uuid) from public, anon;
grant execute on function public.withdraw_admin_access(uuid) to authenticated;

-- Som i 20261020120000_my_admin_access_rejected.sql; den nyeste forespørselen vises også når den er trukket tilbake.
create or replace function public.my_admin_access() returns jsonb
language sql stable security definer set search_path = '' as $$
  with me as (select app.current_user_id() as id),
  pending as (
    select q.church_id, jsonb_build_object('church_id', q.church_id, 'state', 'pending', 'id', q.id, 'created_at', q.created_at) as o
      from public.admin_access_requests q, me where q.requester = me.id and q.status = 'pending'),
  active as (
    select r.church_id, jsonb_build_object('church_id', r.church_id, 'state', 'active', 'expires_at', r.expires_at, 'duration', r.duration) as o
      from public.user_roles r, me where r.user_id = me.id and r.role = 'church_admin' and r.extra_admin
        and r.revoked_at is null and (r.expires_at is null or r.expires_at > now())),
  latest as (
    select distinct on (q.church_id) q.church_id, q.id, q.status, q.decided_at
      from public.admin_access_requests q, me where q.requester = me.id
      order by q.church_id, q.created_at desc, q.decided_at desc nulls first, case q.status when 'cancelled' then 0 when 'rejected' then 1 else 2 end),   -- entydig ved like tidspunkt
  closed as (
    select l.church_id, jsonb_build_object('church_id', l.church_id, 'state', case l.status when 'rejected' then 'rejected' else 'cancelled' end,
        'id', l.id, 'decided_at', l.decided_at) as o
      from latest l where l.status in ('rejected', 'cancelled')
        and not exists (select 1 from pending p where p.church_id = l.church_id)
        and not exists (select 1 from active a where a.church_id = l.church_id))
  select coalesce(jsonb_agg(x.o), '[]'::jsonb) from (select o from pending union all select o from active union all select o from closed) x
$$;
revoke all on function public.my_admin_access() from public, anon;
grant execute on function public.my_admin_access() to authenticated;
