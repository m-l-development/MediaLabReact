/* Administrasjon – menigheter, medlemmer, roller, invitasjoner, brukere, logg og systemstatus.
   Lesing og enkle endringer går direkte mot databasen (RLS avgjør hva som er lov); invitasjoner går via serveren,
   som lager tokenet og sender e-posten. */
import { data } from './port.js';
import { callServer } from './server.js';

const USER_COLS = 'id, email, full_name, first_name, last_name, phone, status, created_at';
/* Fast standardkvote per menighet (samme som app.default_quota_mb() i databasen). Alt annet er egen kvote. */
export const DEFAULT_QUOTA_MB = 200;

export const admin = {
  churches: () => data().select('churches', { columns: 'id, name, status, created_at, delete_after, storage_quota_mb, quota_custom, logo_file_id', order: 'name' }),
  /* Logo: en fil i menighetens Logoer-mappe (null = ingen logo). Admin i menigheten, eller stab som er medlem. */
  setChurchLogo: (churchId, fileId) => data().rpc('set_church_logo', { p_church: churchId, p_file: fileId || null }),
  /* Fornavn/etternavn på en annen bruker: Admin i brukerens menighet, eller stab. Visningsnavnet avledes i databasen. */
  setUserName: (userId, first, last) => data().rpc('set_user_name', { p_user: userId, p_first: first, p_last: last }),
  createChurch: name => data().insert('churches', { name: String(name || '').trim() }, 'id, name, status'),
  renameChurch: (id, name) => data().update('churches', { id }, { name: String(name || '').trim() }),

  /* Medlemmer i en menighet med brukeropplysninger (bare synlige brukere returneres av RLS). */
  async members(churchId) {
    const [ms, roles] = await Promise.all([
      data().select('memberships', { columns: 'user_id, church_id, status, created_at', eq: { church_id: churchId } }),
      data().select('user_roles', { columns: 'id, user_id, role, church_id', eq: { church_id: churchId }, isNull: ['revoked_at'] }),
    ]);
    const ids = ms.map(m => m.user_id);
    const users = ids.length ? await data().select('app_users', { columns: USER_COLS, inList: { id: ids } }) : [];
    const byId = Object.fromEntries(users.map(u => [u.id, u]));
    return ms.map(m => ({ ...m, user: byId[m.user_id] || null, admin: roles.find(r => r.user_id === m.user_id && r.role === 'church_admin') || null }))
      .sort((a, b) => String(a.user && (a.user.full_name || a.user.email)).localeCompare(String(b.user && (b.user.full_name || b.user.email)), 'no'));
  },
  setMembershipStatus: (userId, churchId, status) => data().update('memberships', { user_id: userId, church_id: churchId }, { status }),

  users: () => data().select('app_users', { columns: USER_COLS, order: 'email' }),
  globalRoles: () => data().select('user_roles', { columns: 'id, user_id, role, church_id, assigned_at', isNull: ['revoked_at', 'church_id'] }),
  setUserStatus: (userId, status) => data().rpc('set_user_status', { p_user: userId, p_status: status }),
  assignRole: (userId, role, churchId, reason) => data().rpc('assign_role', { p_user: userId, p_role: role, p_church: churchId || null, p_reason: reason || null }),
  revokeRole: (roleId, reason) => data().rpc('revoke_role', { p_role_id: roleId, p_reason: reason || null }),

  invitations: churchId => data().select('invitations', { columns: 'id, email, church_id, role, status, expires_at, created_at, accepted_at', ...(churchId ? { eq: { church_id: churchId } } : {}), order: 'created_at', desc: true, limit: 200 }),
  invite: (email, role, churchId) => callServer('invite.create', { email, role, church_id: churchId || null }),
  resendInvitation: id => callServer('invite.resend', { id }),
  revokeInvitation: id => data().rpc('revoke_invitation', { p_id: id }),

  /* Oversikter for admin-grensesnittet (RLS avgjør hva som returneres). */
  allMemberships: () => data().select('memberships', { columns: 'user_id, church_id, status, created_at, updated_at' }),
  allRoles: () => data().select('user_roles', { columns: 'id, user_id, role, church_id, assigned_at', isNull: ['revoked_at'] }),
  /* Stab legger til (eller aktiverer igjen) et medlemskap. Én menighet om gangen for User/Admin håndheves i databasen. */
  addMembership: (userId, churchId) => data().rpc('add_membership', { p_user: userId, p_church: churchId }),
  /* Fjerner en bruker fra en menighet (status «fjernet», historikken beholdes). Er brukeren Admin der, må allowNoAdmin
     være true – da fjernes også Admin-rollen. Databasen avgjør hvem som får lov (stab, eller Admin for andre medlemmer). */
  removeMembership: (userId, churchId, reason, allowNoAdmin) => data().rpc('remove_membership', { p_user: userId, p_church: churchId, p_reason: reason || null, p_allow_no_admin: !!allowNoAdmin }),
  /* Faktisk kvote for én menighet (Developer med MFA, loggført). 200 MB = standard, alt annet = egen kvote. Planene og
     abonnementene endrer den aldri (trinn 21). */
  setQuota: (churchId, mbQuota) => data().rpc('set_church_quota', { p_church: churchId, p_quota_mb: mbQuota }),
  /* Trinn 20 – samlet lagringsgrense for hele ConnectHub (bare Developer med MFA; databasen avgjør og loggfører). */
  storageOverview: () => data().rpc('storage_overview'),
  setStorageLimit: mb => data().rpc('set_storage_limit', { p_mb: mb }),
  /* «Tilbakestill til standard (200 MB)». Loggført. */
  resetQuota: churchId => data().rpc('reset_church_quota', { p_church: churchId }),
  /* Developer: faktisk kvote, merke og brukt plass for alle menigheter (bare summer). */
  quotaOverview: () => data().rpc('church_quota_overview'),
  /* Egne opplysninger (RLS: bare seg selv, bare navn og telefon). */
  /* Egen profil: fornavn, etternavn og telefon (visningsnavnet avledes av fornavn + etternavn i databasen). */
  updateMyProfile: (id, first, last, phone) => data().update('app_users', { id }, { first_name: String(first || '').trim() || null, last_name: String(last || '').trim() || null, phone: String(phone || '').trim() || null }),
  userActivity: userId => data().select('audit_logs', { columns: 'id, action, target_type, church_id, meta, created_at', eq: { actor_user_id: userId }, order: 'created_at', desc: true, limit: 25 }),
  audit: churchId => data().select('audit_logs', { columns: 'id, actor_user_id, action, target_type, target_id, church_id, reason, meta, created_at', ...(churchId ? { eq: { church_id: churchId } } : {}), order: 'created_at', desc: true, limit: 200 }),
  systemStatus: () => data().rpc('system_status'),
};

/* Godkjenning av invitasjon etter innlogging med den inviterte adressen. */
export const acceptInvitation = token => callServer('invite.accept', { token });
