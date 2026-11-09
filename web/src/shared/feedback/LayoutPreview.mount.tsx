// Bare for e2e/feedback-preview.spec.ts (lastes av Vite i utviklingsmodus, importeres aldri av appen): tegner miniatyren.
import { useState } from 'react'
import { flushSync } from 'react-dom'
import { AccountMenu } from '../../app/AccountMenu'
import { FeedbackButton } from '../../app/Feedback'
import { createAccountService } from '../../services/account'
import { ServicesContext, type Services } from '../../app/services'
import type { Me } from '../../domain/account'
import { createRoot } from 'react-dom/client'
import AdminRoute from '../../features/admin/AdminRoute'
import { createAdminService } from '../../services/admin'
import type { DataAdapter } from '../../services/auth/types'
import { createCollabService } from '../../services/collab'
import { createFeedbackService } from '../../services/feedback'
import { createMailService } from '../../services/mail'
import { createRequestInbox } from '../../services/requests'
import { pageLayout } from './layout'
import { LayoutPreview, type PreviewElement, type PreviewRect } from './LayoutPreview'

export { pageLayout }
export function mount(el: HTMLElement, layout: string[] | undefined, rect: PreviewRect, viewport: string, element?: PreviewElement, app?: string, view?: string): void {
  flushSync(() => createRoot(el).render(<LayoutPreview layout={layout} rect={rect} viewport={viewport} label="test" element={element} app={app} view={view} />))
}

/**
 * Admin (innloggingsbeskyttet) med falske, nøytrale data – til opptaket av admin-sidene i e2e/feedback-templates.spec.ts.
 * Ingen ekte kontoer eller data; navnene er plassholdere.
 */
export function mountAdmin(el: HTMLElement, hash: string): void {
  location.hash = hash
  const me = { id: 'd1', email: 'utvikler@test.invalid', full_name: 'Utvikler', first_name: 'Utvikler', last_name: null, phone: null, mfa: true, roles: [{ role: 'developer', church_id: null }], churches: [{ id: 'c1', name: 'Menighet', logo_file_id: null }] } as unknown as Me
  const tables: Record<string, unknown[]> = {
    churches: [{ id: 'c1', name: 'Menighet', status: 'active', created_at: '2026-01-01', delete_after: null, storage_quota_mb: 200, quota_custom: false, logo_file_id: null }],
    app_users: [{ id: 'd1', email: 'utvikler@test.invalid', full_name: 'Utvikler', first_name: null, last_name: null, phone: null, status: 'active', created_at: '2026-01-01' }, { id: 'u1', email: 'bruker@test.invalid', full_name: 'Bruker', first_name: null, last_name: null, phone: null, status: 'active', created_at: '2026-01-02' }],
    memberships: [{ user_id: 'd1', church_id: 'c1', status: 'active', created_at: '2026-01-01' }, { user_id: 'u1', church_id: 'c1', status: 'active', created_at: '2026-01-02' }],
    user_roles: [{ id: 'r1', user_id: 'd1', role: 'developer', church_id: null }], invitations: [], audit_logs: [], subscription_requests: [],
  }
  const data = {
    select: async (t: string) => tables[t] ?? [],
    rpc: async (fn: string) => (fn === 'system_status' ? { users: 2, files: 0, files_bytes: 0, audit_last_24h: 0 } : fn === 'storage_overview' ? { quota_sum_mb: 200, limit_mb: 1000 } : /^(my_groups|church_quota_overview)$/.test(fn) ? [] : null),
    update: async () => [], insert: async () => ({}),
  } as unknown as DataAdapter
  const server = (async () => ({ ok: true })) as never, tok = async () => 'tok'
  const services = {
    admin: createAdminService(data, tok, server), collab: createCollabService(data, tok, server), feedback: createFeedbackService(data), mail: createMailService(data, tok, server), requestInbox: createRequestInbox(data, tok, server),
    files: { blob: async () => null, list: async () => [], listLink: async () => [], urls: async () => ({}), upload: async () => ({}), remove: async () => undefined, copyToLink: async () => undefined, uploadToLink: async () => ({}) },
  } as unknown as Services
  flushSync(() => createRoot(el).render(<ServicesContext value={services}><AdminRoute me={me} testRole={null} /></ServicesContext>))
}

/** Den ekte tilbakemeldingsknappen med falske tjenester (ingen innlogging lokalt); innsendingen fanges i window.__fbSent. */
export function mountFeedback(el: HTMLElement): void {
  const me = { id: 'u1', email: 'test@test.invalid', full_name: 'Test', first_name: null, last_name: null, phone: null, mfa: false, roles: [], churches: [] } as unknown as Me
  const services = { feedback: { available: () => true, submit: async (x: unknown) => { (window as unknown as { __fbSent: unknown }).__fbSent = x; return { id: 'f1', ref: 'TB-TEST01' } } }, account: createAccountService({ auth: null, data: null, token: async () => null }) } as unknown as Services
  // som knappefeltet i AppShell: tilbakemelding og kontomeny, bare ett panel åpent om gangen
  function Host() {
    const [panel, setPanel] = useState<'feedback' | 'account' | null>(null)
    return (
      <ServicesContext value={services}>
        <div style={{ position: 'fixed', right: 12, bottom: 12, display: 'flex', gap: 8, zIndex: 50 }}>
          <FeedbackButton me={me} fabClass={undefined} open={panel === 'feedback'} onOpen={(v) => setPanel(v ? 'feedback' : null)} />
          <AccountMenu me={me} realMe={me} testRole={null} testAllowed={false} onSignOut={async () => { (window as unknown as { __signedOut: boolean }).__signedOut = true }} open={panel === 'account'} setOpen={(v) => setPanel(v ? 'account' : null)} fabClass={undefined} />
        </div>
      </ServicesContext>
    )
  }
  flushSync(() => createRoot(el).render(<Host />))
}
