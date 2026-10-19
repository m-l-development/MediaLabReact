-- ConnectHub · avsenderen ser også «Avslått av menighetsadmin» (bare connecthub-dev først).
-- Som i 20261020100000_temporary_admin_access.sql, pluss den nyeste forespørselen per menighet når den er avslått
-- (og personen verken venter eller har aktiv tilgang der). Bare lesing; ingen rader endres.
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
      from public.admin_access_requests q, me where q.requester = me.id order by q.church_id, q.created_at desc),
  rejected as (
    select l.church_id, jsonb_build_object('church_id', l.church_id, 'state', 'rejected', 'id', l.id, 'decided_at', l.decided_at) as o
      from latest l where l.status = 'rejected'
        and not exists (select 1 from pending p where p.church_id = l.church_id)
        and not exists (select 1 from active a where a.church_id = l.church_id))
  select coalesce(jsonb_agg(x.o), '[]'::jsonb) from (select o from pending union all select o from active union all select o from rejected) x
$$;
revoke all on function public.my_admin_access() from public, anon;
grant execute on function public.my_admin_access() to authenticated;
