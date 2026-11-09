// Bare for e2e/feedback-preview.spec.ts (lastes av Vite i utviklingsmodus, importeres aldri av appen): tegner miniatyren.
import { useState } from 'react'
import { flushSync } from 'react-dom'
import { AccountMenu } from '../../app/AccountMenu'
import { FeedbackButton } from '../../app/Feedback'
import { createAccountService } from '../../services/account'
import { ServicesContext, type Services } from '../../app/services'
import type { Me } from '../../domain/account'
import { createRoot } from 'react-dom/client'
import { pageLayout } from './layout'
import { LayoutPreview, type PreviewElement, type PreviewRect } from './LayoutPreview'
import { LivePreview, type LiveCase } from './LivePreview'

export { pageLayout }
export function mount(el: HTMLElement, layout: string[] | undefined, rect: PreviewRect, viewport: string, element?: PreviewElement): void {
  flushSync(() => createRoot(el).render(<LayoutPreview layout={layout} rect={rect} viewport={viewport} label="test" element={element} />))
}

/** Den ekte siden i innboksens forhåndsvisning (LivePreview) for en sak. → bytter mellom vanlig og «Forstørr». */
export function mountLive(el: HTMLElement, c: LiveCase): (big: boolean) => void {
  const root = createRoot(el)
  const show = (big: boolean) => flushSync(() => root.render(<LivePreview c={c} label="test" big={big} onClose={() => show(false)} />))
  show(false)
  return show
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
