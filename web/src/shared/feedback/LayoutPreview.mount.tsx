// Bare for e2e/feedback-preview.spec.ts (lastes av Vite i utviklingsmodus, importeres aldri av appen): tegner miniatyren.
import { useState } from 'react'
import { flushSync } from 'react-dom'
import { FeedbackButton } from '../../app/Feedback'
import { ServicesContext, type Services } from '../../app/services'
import type { Me } from '../../domain/account'
import { createRoot } from 'react-dom/client'
import { pageLayout } from './layout'
import { LayoutPreview, type PreviewRect } from './LayoutPreview'

export { pageLayout }
export function mount(el: HTMLElement, layout: string[], rect: PreviewRect, viewport: string): void {
  flushSync(() => createRoot(el).render(<LayoutPreview layout={layout} rect={rect} viewport={viewport} label="test" />))
}

/** Den ekte tilbakemeldingsknappen med falske tjenester (ingen innlogging lokalt); innsendingen fanges i window.__fbSent. */
export function mountFeedback(el: HTMLElement): void {
  const me = { id: 'u1', email: 'test@test.invalid', full_name: 'Test', first_name: null, last_name: null, phone: null, mfa: false, roles: [], churches: [] } as unknown as Me
  const services = { feedback: { available: () => true, submit: async (x: unknown) => { (window as unknown as { __fbSent: unknown }).__fbSent = x; return { id: 'f1', ref: 'TB-TEST01' } } } } as unknown as Services
  function Host() {
    const [open, setOpen] = useState(false)
    return <ServicesContext value={services}><FeedbackButton me={me} fabClass={undefined} open={open} onOpen={setOpen} /></ServicesContext>
  }
  flushSync(() => createRoot(el).render(<Host />))
}
