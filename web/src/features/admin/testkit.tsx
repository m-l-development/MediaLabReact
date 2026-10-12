import { act, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { vi } from 'vitest'
import { ServicesContext, type Services } from '../../app/services'
import type { Me } from '../../domain/account'
import { createAdminService } from '../../services/admin'
import type { DataAdapter } from '../../services/auth/types'
import { createCollabService } from '../../services/collab'
import { createFeedbackService } from '../../services/feedback'
import { createRequestInbox } from '../../services/requests'
import { createMailService } from '../../services/mail'
import { AdminPage } from './AdminPage'
import AdminRoute from './AdminRoute'

/**
 * Felles oppsett for admin-testene: falsk database (tabeller i minnet + rpc-svar) og falsk server. Viser flyten i
 * grensesnittet – ikke at ConnectHub svarer slik (det krever testkontoer mot connecthub-dev).
 */
export const CH = [
  { id: 'c1', name: 'Menighet A', status: 'active', created_at: '2026-01-01', delete_after: null, storage_quota_mb: 200, quota_custom: false, logo_file_id: null },
  { id: 'c2', name: 'Menighet B', status: 'pending_deletion', created_at: '2026-01-05', delete_after: '2026-11-01', storage_quota_mb: 500, quota_custom: true, logo_file_id: null },
]
export const USERS = [
  { id: 'd1', email: 'dev@b.no', full_name: 'Dev Eloper', first_name: 'Dev', last_name: 'Eloper', phone: null, status: 'active', created_at: '2026-01-01' },
  { id: 'u1', email: 'ola@b.no', full_name: 'Ola Nordmann', first_name: null, last_name: null, phone: '912', status: 'active', created_at: '2026-01-02' },
  { id: 'a1', email: 'adm@b.no', full_name: 'Ada Admin', first_name: 'Ada', last_name: 'Admin', phone: null, status: 'active', created_at: '2026-01-03' },
]
const base = { phone: null, mfa: true, churches: [{ id: 'c1', name: 'Menighet A', logo_file_id: null }] }
export const DEV = { ...base, id: 'd1', email: 'dev@b.no', full_name: 'Dev Eloper', first_name: 'Dev', last_name: 'Eloper', roles: [{ role: 'developer', church_id: null }] } as unknown as Me
export const ADM = { ...base, id: 'a1', email: 'adm@b.no', full_name: 'Ada Admin', first_name: 'Ada', last_name: 'Admin', roles: [{ role: 'church_admin', church_id: 'c1' }] } as unknown as Me
export const USR = { ...base, id: 'u1', email: 'ola@b.no', full_name: 'Ola Nordmann', first_name: null, last_name: null, roles: [] } as unknown as Me

export interface Kit {
  data: DataAdapter & { rpc: ReturnType<typeof vi.fn>; select: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn>; insert: ReturnType<typeof vi.fn> }
  server: ReturnType<typeof vi.fn>
  files: Record<'blob' | 'upload' | 'list' | 'listLink' | 'urls' | 'remove' | 'copyToLink' | 'uploadToLink', ReturnType<typeof vi.fn>>
}

export function setupAdmin(me: Me, opts: { hash?: string; tables?: Record<string, unknown[]>; rpc?: (fn: string, args?: Record<string, unknown>) => unknown; server?: (action: string, body: unknown) => unknown; sections?: Record<string, (p: { id?: string | undefined; sub?: string | undefined }) => ReactNode> } = {}): Kit {
  location.hash = opts.hash ?? ''
  const tables: Record<string, unknown[]> = {
    churches: CH, app_users: USERS, invitations: [],
    audit_logs: [{ id: 'l1', action: 'memberships.insert', church_id: 'c1', created_at: '2026-10-01T10:00:00Z', target_type: null, meta: null }],
    memberships: [
      { user_id: 'u1', church_id: 'c1', status: 'active', created_at: '2026-01-02' },
      { user_id: 'd1', church_id: 'c1', status: 'active', created_at: '2026-01-01' },
      { user_id: 'a1', church_id: 'c1', status: 'active', created_at: '2026-01-03' },
    ],
    user_roles: [{ id: 'r1', user_id: 'd1', role: 'developer', church_id: null }, { id: 'r2', user_id: 'a1', role: 'church_admin', church_id: 'c1' }],
    subscription_requests: [],
    ...opts.tables,
  }
  const data = {
    select: vi.fn(async (table: string) => tables[table] ?? []),
    rpc: vi.fn(async (fn: string, args?: Record<string, unknown>) => {
      const r = opts.rpc?.(fn, args)
      if (r !== undefined) return r
      if (fn === 'system_status') return { users: 3, files: 3, files_bytes: 3 * 1048576, audit_last_24h: 4 }
      if (fn === 'my_groups') return []
      if (fn === 'church_quota_overview') return [{ church_id: 'c1', used_bytes: 50 * 1048576 }]
      if (fn === 'storage_overview') return { quota_sum_mb: 700, limit_mb: 1000 }
      return null
    }),
    update: vi.fn(async () => []),
    insert: vi.fn(async (_t: string, row: Record<string, unknown>) => ({ id: 'c9', status: 'active', ...row })),
  }
  const server = vi.fn(async (_tok: string, action: string, body: unknown) => opts.server?.(action, body) ?? { ok: true, invitation: { email: 'ny@b.no' }, email_sent: true })
  // filer: mappe → rader (tabellen files i minnet, filtrert som databasen gjør)
  const fileRows = (tables.files ?? []) as { church_id: string; folder: string; link_id?: string }[]
  const files = {
    blob: vi.fn(async () => null), upload: vi.fn(async () => ({ id: 'f-logo' })),
    list: vi.fn(async (folder: string, churchId: string) => fileRows.filter((f) => f.folder === folder && f.church_id === churchId)),
    listLink: vi.fn(async (linkId: string) => fileRows.filter((f) => f.link_id === linkId)),
    urls: vi.fn(async (ids: string[]) => Object.fromEntries(ids.map((id) => [id, 'https://lagring.test/' + id]))),
    remove: vi.fn(async () => undefined), copyToLink: vi.fn(async () => undefined), uploadToLink: vi.fn(async () => ({ id: 'f-new' })),
  }
  const services = {
    admin: createAdminService(data as unknown as DataAdapter, async () => 'tok', server as never),
    collab: createCollabService(data as unknown as DataAdapter, async () => 'tok', server as never),
    files,
    feedback: createFeedbackService(data as unknown as DataAdapter),
    mail: createMailService(data as unknown as DataAdapter, async () => 'tok', server as never),
    requestInbox: createRequestInbox(data as unknown as DataAdapter, async () => 'tok', server as never),
  } as unknown as Services
  // uten egne seksjoner brukes de ekte (AdminRoute), som i appen
  render(<ServicesContext value={services}>{opts.sections ? <AdminPage me={me} testRole={null} sections={opts.sections} /> : <AdminRoute me={me} testRole={null} />}</ServicesContext>)
  return { data: data as unknown as Kit['data'], server, files }
}

/** Bytter #-adresse (som et klikk på en lenke i menyen). */
export function goHash(h: string): void {
  act(() => {
    location.hash = h
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  })
}
export const loaded = () => screen.findByText(/Menighet A/, undefined, { timeout: 3000 })
