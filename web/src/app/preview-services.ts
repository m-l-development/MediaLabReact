import type { Me } from '../domain/account'
import { createAccountService } from '../services/account'
import { createAdminService } from '../services/admin'
import type { AuthService } from '../services/auth/auth-service'
import type { AuthState, DataAdapter } from '../services/auth/types'
import { createCollabService } from '../services/collab'
import { createCommunityService } from '../services/community'
import { createFeedbackService } from '../services/feedback'
import { createFilesService } from '../services/files'
import { createLoopDiskService } from '../services/loop-disk'
import { createMailService } from '../services/mail'
import { createRequestInbox, createRequestService } from '../services/requests'
import { createChurchSettings } from '../services/shared-setup'
import { createStore } from '../shared/lib/store'
import type { Router } from './router'
import type { Services } from './services'

/**
 * Tjenestene i forhåndsvisningen (preview.ts): ingen backend, ingen ekte data. Verktøyene kjører som uten innlogging
 * (tomme prosjekter, ingen skyfunksjoner). Admin får nøytrale plassholdere (én menighet, to brukere) så sidene har
 * innhold med riktig form. Brukeren har samme rolle som den som sendte saken, så menyene er de samme.
 */
export function createPreviewServices(router: Router, role: string): Services {
  const church = { id: 'c1', name: 'Menighet', logo_file_id: null }
  const me = {
    id: 'u1', email: 'bruker@eksempel.invalid', full_name: 'Bruker', first_name: 'Bruker', last_name: null, phone: null, mfa: true,
    roles: role === 'user' ? [] : [{ role: role === 'admin' ? 'church_admin' : role, church_id: role === 'admin' ? 'c1' : null }],
    churches: [church],
  } as unknown as Me
  const tables: Record<string, unknown[]> = {
    churches: [{ ...church, status: 'active', created_at: '2026-01-01', delete_after: null, storage_quota_mb: 200, quota_custom: false }],
    app_users: [
      { id: 'u1', email: 'bruker@eksempel.invalid', full_name: 'Bruker', first_name: null, last_name: null, phone: null, status: 'active', created_at: '2026-01-01' },
      { id: 'u2', email: 'medlem@eksempel.invalid', full_name: 'Medlem', first_name: null, last_name: null, phone: null, status: 'active', created_at: '2026-01-02' },
    ],
    memberships: [{ user_id: 'u1', church_id: 'c1', status: 'active', created_at: '2026-01-01' }, { user_id: 'u2', church_id: 'c1', status: 'active', created_at: '2026-01-02' }],
    user_roles: me.roles.map((r, i) => ({ id: 'r' + i, user_id: 'u1', ...r })), invitations: [], audit_logs: [], subscription_requests: [],
  }
  // bare til admin-sidene: leser plassholderne, endrer ingenting
  const data = {
    select: async (t: string) => tables[t] ?? [],
    rpc: async (fn: string) => (fn === 'system_status' ? { users: 2, files: 0, files_bytes: 0, audit_last_24h: 0 } : fn === 'storage_overview' ? { quota_sum_mb: 200, limit_mb: 1000 } : []), // øvrige lister er tomme
    update: async () => [], insert: async () => ({}),
  } as unknown as DataAdapter
  const token = async () => null
  const server = (async () => ({ ok: false })) as never
  const auth = {
    state: createStore<AuthState>({ status: 'ready', me, realMe: me, testRole: null }),
    start: async () => undefined, signIn: async () => undefined, verifyMfa: async () => undefined, startMfaSetup: async () => undefined,
    signOut: async () => undefined, accessToken: token, requestPasswordReset: async () => undefined,
  } as unknown as AuthService
  return {
    auth, community: createCommunityService(null), files: createFilesService(null, token), churchSettings: createChurchSettings(null),
    loopDisk: createLoopDiskService(null), feedback: createFeedbackService(data), account: createAccountService({ auth: null, data: null, token }),
    requests: createRequestService(), requestInbox: createRequestInbox(data, token, server), mail: createMailService(data, token, server),
    admin: createAdminService(data, token, server), collab: createCollabService(data, token, server), router,
  }
}
