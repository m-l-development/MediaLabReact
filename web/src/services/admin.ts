import { callServer } from '../infrastructure/api/server'
import type { DataAdapter } from './auth/types'
import { ServiceError } from './errors'

/**
 * ConnectHub Admin (ADM-*), samme kall som media-lab/src/services/admin.js. Lesing og enkle endringer går direkte mot
 * databasen (RLS og databasefunksjonene avgjør hva som er lov); invitasjoner går via serveren, som lager tokenet og sender
 * e-posten. Ingenting her gir tilgang – grensesnittet skjuler bare knapper.
 */
export interface Church {
  id: string
  name: string
  status: string
  created_at: string
  delete_after: string | null
  storage_quota_mb: number | null
  quota_custom: boolean | null
  logo_file_id: string | null
}
export interface AppUser {
  id: string
  email: string
  full_name: string | null
  first_name: string | null
  last_name: string | null
  phone: string | null
  status: string
  created_at: string
  updated_at?: string
}
export interface Membership { user_id: string; church_id: string; status: string; created_at: string; updated_at?: string }
export interface RoleRow { id: string; user_id: string; role: string; church_id: string | null; assigned_at?: string; extra_admin?: boolean; revoked_at?: string | null }
export interface Invitation { id: string; email: string; church_id: string | null; role: string; status: string; expires_at: string; created_at: string; accepted_at: string | null }
export interface AuditRow { id: string; actor_user_id?: string | null; action: string; target_type: string | null; target_id?: string | null; church_id: string | null; reason?: string | null; meta: Record<string, unknown> | null; created_at: string }
export interface SystemStatus { users: number; files: number; files_bytes: number; audit_last_24h: number; [k: string]: unknown }
export interface InviteResult { invitation: { email: string }; email_sent: boolean }
export interface RemoveResult { admin_role_revoked?: boolean; active_memberships_left?: number }

const USER_COLS = 'id, email, full_name, first_name, last_name, phone, status, created_at'
/** Fast standardkvote per menighet (samme som app.default_quota_mb() i databasen). */
export const DEFAULT_QUOTA_MB = 200

export function createAdminService(d: DataAdapter | null, token: () => Promise<string | null>, server: typeof callServer = callServer) {
  const data = () => {
    if (!d) throw new ServiceError('unavailable')
    return d
  }
  const call = async <T>(action: string, body: unknown) => server<T & Record<string, unknown>>(await token(), action, body)
  const s = {
    available: () => !!d,
    churches: async () => data().select<Church>('churches', { columns: 'id, name, status, created_at, delete_after, storage_quota_mb, quota_custom, logo_file_id', order: 'name' }),
    /** Logo: en fil i menighetens Logoer-mappe (null = ingen logo). */
    setChurchLogo: async (churchId: string, fileId: string | null) => data().rpc('set_church_logo', { p_church: churchId, p_file: fileId || null }),
    /** Navn på en annen bruker: Admin i brukerens menighet, eller stab. */
    setUserName: async (userId: string, first: string, last: string) => data().rpc('set_user_name', { p_user: userId, p_first: first, p_last: last }),
    createChurch: async (name: string) => data().insert<Pick<Church, 'id' | 'name' | 'status'>>('churches', { name: name.trim() }, 'id, name, status'),
    renameChurch: async (id: string, name: string) => data().update('churches', { id }, { name: name.trim() }),

    /** Medlemmer i en menighet med brukeropplysninger (bare synlige brukere returneres av RLS). */
    async members(churchId: string) {
      const [ms, roles] = await Promise.all([
        data().select<Membership>('memberships', { columns: 'user_id, church_id, status, created_at', eq: { church_id: churchId } }),
        data().select<RoleRow>('user_roles', { columns: 'id, user_id, role, church_id', eq: { church_id: churchId }, isNull: ['revoked_at'] }),
      ])
      const ids = ms.map((m) => m.user_id)
      const users = ids.length ? await data().select<AppUser>('app_users', { columns: USER_COLS, inList: { id: ids } }) : []
      const byId = new Map(users.map((u) => [u.id, u]))
      const name = (u: AppUser | null) => (u ? u.full_name || u.email : '')
      return ms
        .map((m) => ({ ...m, user: byId.get(m.user_id) ?? null, admin: roles.find((r) => r.user_id === m.user_id && r.role === 'church_admin') ?? null }))
        .sort((a, b) => name(a.user).localeCompare(name(b.user), 'no'))
    },
    setMembershipStatus: async (userId: string, churchId: string, status: string) => data().update('memberships', { user_id: userId, church_id: churchId }, { status }),

    users: async () => data().select<AppUser>('app_users', { columns: USER_COLS, order: 'email' }),
    setUserStatus: async (userId: string, status: string) => data().rpc('set_user_status', { p_user: userId, p_status: status }),
    assignRole: async (userId: string, role: string, churchId: string | null, reason?: string) => data().rpc('assign_role', { p_user: userId, p_role: role, p_church: churchId || null, p_reason: reason || null }),
    revokeRole: async (roleId: string, reason?: string) => data().rpc('revoke_role', { p_role_id: roleId, p_reason: reason || null }),

    invitations: async (churchId: string | null) =>
      data().select<Invitation>('invitations', { columns: 'id, email, church_id, role, status, expires_at, created_at, accepted_at', ...(churchId ? { eq: { church_id: churchId } } : {}), order: 'created_at', desc: true, limit: 200 }),
    invite: async (email: string, role: string, churchId: string | null) => call<InviteResult>('invite.create', { email, role, church_id: churchId || null }),
    resendInvitation: async (id: string) => call<{ email_sent?: boolean }>('invite.resend', { id }),
    revokeInvitation: async (id: string) => data().rpc('revoke_invitation', { p_id: id }),

    allMemberships: async () => data().select<Membership>('memberships', { columns: 'user_id, church_id, status, created_at, updated_at' }),
    allRoles: async () => data().select<RoleRow>('user_roles', { columns: 'id, user_id, role, church_id, assigned_at, extra_admin', isNull: ['revoked_at'] }),
    /** Developer/Moderator (med MFA) som EKSTRA Admin i en menighet, i tillegg til menighetens faste Admin. */
    addSelfAsAdmin: async (churchId: string) => data().rpc('add_self_as_admin', { p_church: churchId }),
    removeSelfAsAdmin: async (churchId: string) => data().rpc('remove_self_as_admin', { p_church: churchId }),
    /** Én menighet om gangen for User/Admin håndheves i databasen. */
    addMembership: async (userId: string, churchId: string) => data().rpc('add_membership', { p_user: userId, p_church: churchId }),
    /** Status «fjernet», historikken beholdes. Er brukeren Admin der, må allowNoAdmin være true. */
    removeMembership: async (userId: string, churchId: string, reason: string, allowNoAdmin: boolean) =>
      data().rpc<RemoveResult | null>('remove_membership', { p_user: userId, p_church: churchId, p_reason: reason || null, p_allow_no_admin: allowNoAdmin }),
    setQuota: async (churchId: string, mb: number) => data().rpc('set_church_quota', { p_church: churchId, p_quota_mb: mb }),
    storageOverview: async () => data().rpc<Record<string, unknown>>('storage_overview'),
    setStorageLimit: async (mb: number | null) => data().rpc('set_storage_limit', { p_mb: mb }),
    resetQuota: async (churchId: string) => data().rpc('reset_church_quota', { p_church: churchId }),
    quotaOverview: async () => data().rpc<Record<string, unknown>[]>('church_quota_overview'),
    /** Egen profil (RLS: bare seg selv, bare navn og telefon). */
    updateMyProfile: async (id: string, first: string, last: string, phone: string) =>
      data().update('app_users', { id }, { first_name: first.trim() || null, last_name: last.trim() || null, phone: phone.trim() || null }),
    userActivity: async (userId: string) =>
      data().select<AuditRow>('audit_logs', { columns: 'id, action, target_type, church_id, meta, created_at', eq: { actor_user_id: userId }, order: 'created_at', desc: true, limit: 25 }),
    audit: async (churchId: string | null) =>
      data().select<AuditRow>('audit_logs', { columns: 'id, actor_user_id, action, target_type, target_id, church_id, reason, meta, created_at', ...(churchId ? { eq: { church_id: churchId } } : {}), order: 'created_at', desc: true, limit: 200 }),
    systemStatus: async () => data().rpc<SystemStatus>('system_status'),
  }
  return s
}
export type AdminService = ReturnType<typeof createAdminService>
