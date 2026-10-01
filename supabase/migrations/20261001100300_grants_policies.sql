-- ConnectHub P3 · 4/4 · Rettigheter og RLS-policyer. Vanlig PostgreSQL.
-- anon får ingenting. authenticated får bare kolonnene og handlingene som er listet, og RLS avgjør radene.
-- Skriving av roller, invitasjoner, logg og filer skjer bare via funksjoner/serveren (P5/P7), ikke direkte fra klienten.

alter table public.app_users enable row level security;
alter table public.user_identities enable row level security;
alter table public.churches enable row level security;
alter table public.memberships enable row level security;
alter table public.user_roles enable row level security;
alter table public.invitations enable row level security;
alter table public.audit_logs enable row level security;
alter table public.files enable row level security;

revoke all on public.app_users, public.user_identities, public.churches, public.memberships, public.user_roles,
  public.invitations, public.audit_logs, public.files from anon, authenticated;

-- app_users: se seg selv, stab, eller admin i felles menighet. Bare navn og telefon kan endres, og bare på seg selv.
grant select (id, email, full_name, phone, status, created_at, updated_at) on public.app_users to authenticated;
grant update (full_name, phone) on public.app_users to authenticated;
create policy app_users_select on public.app_users for select to authenticated using (app.can_see_user(id));
create policy app_users_update_self on public.app_users for update to authenticated
  using (id = app.current_user_id()) with check (id = app.current_user_id());

-- user_identities: bare egne.
grant select (provider, subject, user_id, created_at) on public.user_identities to authenticated;
create policy user_identities_select_own on public.user_identities for select to authenticated using (user_id = app.current_user_id());

-- churches: medlemmer, admin og stab ser; bare stab oppretter og endrer. Ingen sletting fra klienten (livsløp i P10).
grant select (id, name, status, created_at, updated_at) on public.churches to authenticated;
grant insert (name) on public.churches to authenticated;
grant update (name, status) on public.churches to authenticated;
create policy churches_select on public.churches for select to authenticated
  using (app.is_member(id) or app.is_church_admin(id) or app.is_staff());
create policy churches_insert_staff on public.churches for insert to authenticated with check (app.is_staff());
create policy churches_update_staff on public.churches for update to authenticated using (app.is_staff()) with check (app.is_staff());

-- memberships: egne, admin i menigheten og stab ser. Opprettes av stab (invitasjoner i P5).
-- Bare status kan endres – user_id og church_id kan aldri flyttes. Admin kan ikke endre sitt eget medlemskap.
grant select (user_id, church_id, status, created_at, updated_at) on public.memberships to authenticated;
grant insert (user_id, church_id) on public.memberships to authenticated;
grant update (status) on public.memberships to authenticated;
create policy memberships_select on public.memberships for select to authenticated
  using (user_id = app.current_user_id() or app.is_church_admin(church_id) or app.is_staff());
create policy memberships_insert_staff on public.memberships for insert to authenticated with check (app.is_staff());
create policy memberships_update on public.memberships for update to authenticated
  using ((app.is_church_admin(church_id) and user_id <> app.current_user_id()) or app.is_staff())
  with check ((app.is_church_admin(church_id) and user_id <> app.current_user_id()) or app.is_staff());

-- user_roles: lesing for egne, admin i menigheten og stab. Ingen direkte skriving (assign_role/revoke_role).
grant select (id, user_id, role, church_id, assigned_by, assigned_at, reason, revoked_at, revoked_by) on public.user_roles to authenticated;
create policy user_roles_select on public.user_roles for select to authenticated
  using (user_id = app.current_user_id() or (church_id is not null and app.is_church_admin(church_id)) or app.is_staff());

-- invitations: token_hash er aldri lesbar. Ingen direkte skriving (P5).
grant select (id, email, church_id, role, expires_at, status, created_by, created_at, accepted_at) on public.invitations to authenticated;
create policy invitations_select on public.invitations for select to authenticated
  using (app.is_staff() or (church_id is not null and app.is_church_admin(church_id)) or created_by = app.current_user_id());

-- audit_logs: stab ser alt, admin ser egen menighet. Skrives bare av triggere.
grant select on public.audit_logs to authenticated;
create policy audit_logs_select on public.audit_logs for select to authenticated
  using (app.is_staff() or (church_id is not null and app.is_church_admin(church_id)));

-- files: metadata for medlemmer, admin og stab. Innhold og skriving i P7.
grant select (id, church_id, file_name, mime_type, file_size, uploaded_by, created_at) on public.files to authenticated;
create policy files_select on public.files for select to authenticated
  using (app.is_member(church_id) or app.is_church_admin(church_id) or app.is_staff());
