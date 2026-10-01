/* Administrasjon – menigheter, medlemmer, roller, invitasjoner, brukere, logg og systemstatus.
   Lesing og enkle endringer går direkte mot databasen (RLS avgjør hva som er lov); invitasjoner går via serveren,
   som lager tokenet og sender e-posten. */
import { data } from './port.js';
import { callServer } from './server.js';

const USER_COLS = 'id, email, full_name, phone, status, created_at';

export const admin = {
  churches: () => data().select('churches', { columns: 'id, name, status, created_at, delete_after', order: 'name' }),
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

  audit: churchId => data().select('audit_logs', { columns: 'id, actor_user_id, action, target_type, target_id, church_id, reason, meta, created_at', ...(churchId ? { eq: { church_id: churchId } } : {}), order: 'created_at', desc: true, limit: 200 }),
  systemStatus: () => data().rpc('system_status'),
};

/* Godkjenning av invitasjon etter innlogging med den inviterte adressen. */
export const acceptInvitation = token => callServer('invite.accept', { token });
