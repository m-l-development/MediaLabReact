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
export interface RoleRow { id: string; user_id: string; role: string; church_id: string | null; assigned_at?: string; extra_admin?: boolean; revoked_at?: string | null; expires_at?: string | null; duration?: AccessDuration | null }
/** Varighet for midlertidig Admin-tilgang (Developer/Moderator i en menighet). */
export type AccessDuration = '1d' | '30d' | '6m' | '1y' | 'indef'
export const ACCESS_DURATIONS: readonly AccessDuration[] = ['1d', '30d', '6m', '1y', 'indef']
export interface AccessRequest { id: string; user_id: string; name: string; email: string; role: 'developer' | 'moderator'; created_at: string }
export interface TempAdmin { user_id: string; name: string; email: string; role: 'developer' | 'moderator' | null; granted_at: string; duration: AccessDuration | null; expires_at: string | null; granted_by: string | null }
export interface AccessDecision { id: string; name: string; role: string; status: 'approved' | 'rejected' | 'cancelled'; duration: AccessDuration | null; auto: boolean; decided_at: string; decided_by: string | null }
export interface AccessOverview { pending: AccessRequest[]; active: TempAdmin[]; recent: AccessDecision[]; has_admin: boolean }
export interface MyAccess { church_id: string; state: 'pending' | 'active'; id?: string; expires_at?: string | null; duration?: AccessDuration | null }
/** Midlertidig rolle som er utløpt (databasen avviser den uansett; her skjules den til oppryddingen har kjørt). */
export const roleLive = (r: Pick<RoleRow, 'expires_at'>, now = Date.now()) => !r.expires_at || Date.parse(r.expires_at) > now
export interface Invitation { id: string; email: string; church_id: string | null; role: string; status: string; expires_at: string; created_at: string; accepted_at: string | null }
export interface AuditRow { id: string; actor_user_id?: string | null; action: string; target_type: string | null; target_id?: string | null; church_id: string | null; reason?: string | null; meta: Record<string, unknown> | null; created_at: string }
export interface SystemStatus { users: number; files: number; files_bytes: number; audit_last_24h: number; [k: string]: unknown }
export interface CleanupChurch { church_id: string; church_name: string; candidates: number; candidate_bytes: number; ready: number; ready_bytes: number; queue_pending: number; queue_failed: number; can_view: boolean }
export interface CleanupFile { id: string; file_name: string; file_size: number; uploaded_at: string; former_member: string | null; removed_at: string; ready: boolean; reason: string | null }
export interface StorageUsage { quota_bytes: number; used_bytes: number; system_free_bytes?: number | null }
/** Brukergrense per menighet (docs/plan-brukergrense.md): aktive medlemmer + ventende invitasjoner. */
export interface MemberUsage { count: number; limit: number; pending: number }
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
    /** Ny menighet med logo (Developer/Moderator): bildet kontrolleres på serveren; den som oppretter blir verken medlem eller Admin. */
    createChurchWithLogo: async (name: string, logo: Blob & { name?: string }) =>
      (await server<{ church: Pick<Church, 'id' | 'name' | 'logo_file_id'> }>(await token(), 'church.create_with_logo', null, { raw: logo, contentType: 'application/octet-stream', query: { name: name.trim(), file: logo.name || 'logo' } })).church,
    renameChurch: async (id: string, name: string) => data().update('churches', { id }, { name: name.trim() }),

    /** Medlemmer i en menighet med brukeropplysninger (bare synlige brukere returneres av RLS). */
    async members(churchId: string) {
      const [ms, roles] = await Promise.all([
        data().select<Membership>('memberships', { columns: 'user_id, church_id, status, created_at', eq: { church_id: churchId } }),
        data().select<RoleRow>('user_roles', { columns: 'id, user_id, role, church_id, expires_at', eq: { church_id: churchId }, isNull: ['revoked_at'] }).then((rs) => rs.filter((r) => roleLive(r))),
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
    allRoles: async () => (await data().select<RoleRow>('user_roles', { columns: 'id, user_id, role, church_id, assigned_at, extra_admin, expires_at, duration', isNull: ['revoked_at'] })).filter((r) => roleLive(r)),
    /** Developer/Moderator fjerner sin egen midlertidige Admin-tilgang (gis bare via requestAdminAccess). */
    removeSelfAsAdmin: async (churchId: string) => data().rpc('remove_self_as_admin', { p_church: churchId }),
    /** Midlertidig Admin-tilgang: forespørsel (uten Admin i menigheten gis den med en gang med valgt varighet). */
    requestAdminAccess: async (churchId: string, duration?: AccessDuration) => data().rpc<{ state: 'pending' | 'granted' | 'already'; expires_at?: string | null }>('request_admin_access', { p_church: churchId, p_duration: duration ?? null }),
    /** Admin i menigheten godkjenner (med varighet) eller avslår en forespørsel. */
    decideAdminAccess: async (requestId: string, approve: boolean, duration?: AccessDuration) => data().rpc<{ status: string }>('decide_admin_access', { p_request: requestId, p_approve: approve, p_duration: duration ?? null }),
    /** Fjerner en midlertidig Admin (Admin i menigheten, eller personen selv). Kontoen, den globale rollen og data består. */
    revokeAdminAccess: async (churchId: string, userId: string) => data().rpc('revoke_admin_access', { p_church: churchId, p_user: userId }),
    adminAccessOverview: async (churchId: string) => data().rpc<AccessOverview>('admin_access_overview', { p_church: churchId }),
    myAdminAccess: async () => data().rpc<MyAccess[]>('my_admin_access'),
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
    /** Opprydning (ADM-13): private filer fra fjernede medlemmer. Bare metadata; databasen og serveren kontrollerer alt. */
    cleanupOverview: async () => data().rpc<CleanupChurch[]>('cleanup_overview'),
    cleanupCandidates: async (churchId: string) => data().rpc<CleanupFile[]>('cleanup_candidates', { p_church: churchId }),
    cleanup: async (churchId: string, ids: string[], expectedCount: number, expectedBytes: number) =>
      call<{ count: number; bytes: number; storage_failed?: number }>('file.cleanup', { church_id: churchId, ids, expected_count: expectedCount, expected_bytes: expectedBytes }),
    cleanupRetry: async (churchId: string | null) => call<{ storage_done: number; storage_failed: number }>('file.cleanup_retry', { church_id: churchId || null }),
    /** Menighetens kvote, brukt og ledig plass (medlemmer og stab; databasen avgjør). */
    storageUsage: async (churchId: string) => data().rpc<StorageUsage | null>('storage_usage', { p_church: churchId }),
    /** Brukere mot grensen (medlemmer, Admin og stab). Grensen håndheves i databasen (CH013 → member_limit). */
    memberUsage: async (churchId: string) => data().rpc<MemberUsage>('member_usage', { p_church: churchId }),
    /** Overstyring: Developer/Moderator med MFA og begrunnelse; logges. */
    setMemberLimit: async (churchId: string, limit: number, reason: string) =>
      data().rpc('set_member_limit', { p_church: churchId, p_limit: limit, p_reason: reason }),
  }
  return s
}
export type AdminService = ReturnType<typeof createAdminService>
