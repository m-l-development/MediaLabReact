import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ADM, DEV, setupAdmin } from './testkit'

/** Komponenttester med falsk database og server (se testkit.tsx): Mail-fanen (ADM-11). */
beforeEach(() => vi.stubGlobal('fetch', vi.fn(async () => new Response(new Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' })))))
afterEach(() => vi.unstubAllGlobals())
const server = (a: string) => (a === 'mail.status' ? { ok: true, configured: true, sender: 'post@connecthub.no' } : a === 'mail.logo_url' ? { ok: true } : a === 'mail.test' ? { ok: true, to: 'dev@b.no' } : undefined)
const rpc = (fn: string) => (fn === 'mail_templates' ? [] : fn === 'mail_settings_get' ? { custom_logo: false, notify_extra: ['a@b.no'] } : fn === 'mail_outbox_recent' ? [{ id: 'o1', to_email: 'ny@b.no', kind: 'invite', status: 'sent', error_code: null, created_at: '2026-10-10T10:00:00Z' }] : undefined)

describe('Mail (ADM-11)', () => {
  it('standardmal, forhåndsvisning med samme gjengivelse som serveren, utsendinger og avsender', async () => {
    setupAdmin(DEV, { hash: '#/mail', rpc, server })
    expect(await screen.findByText('post@connecthub.no')).toBeTruthy()
    const frame = screen.getByTitle('Forhåndsvisning av e-posten') as HTMLIFrameElement
    expect(frame.getAttribute('sandbox')).toBe('')
    expect(frame.getAttribute('srcdoc')).toContain('Velkommen til MediaLab!')
    expect(screen.getByText('ny@b.no')).toBeTruthy()
    expect((screen.getByLabelText('Ekstra adresse 1') as HTMLInputElement).value).toBe('a@b.no')
  })
  it('endring gir «Lagre»; tom overskrift viser feilen og sperrer lagring; lagring sender blokkene', async () => {
    const { data } = setupAdmin(DEV, { hash: '#/mail', rpc, server })
    await screen.findByText('post@connecthub.no')
    const subject = screen.getByLabelText('Emne')
    const save = screen.getByRole('button', { name: 'Lagre' }) as HTMLButtonElement
    expect(save.disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('Overskrift', { selector: 'input' }), { target: { value: ' ' } })
    // feilen vises under redigeringen og i forhåndsvisningen (som i dag)
    expect(screen.getAllByText('En overskrift må ha 1–200 tegn.').length).toBeGreaterThan(0)
    expect(save.disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('Overskrift', { selector: 'input' }), { target: { value: 'Hei {navn}' } })
    fireEvent.change(subject, { target: { value: 'Ny konto' } })
    expect(save.disabled).toBe(false)
    expect(screen.getByTitle('Forhåndsvisning av e-posten').getAttribute('srcdoc')).toContain('Hei Ola Nordmann')
    fireEvent.click(save)
    await waitFor(() => expect(data.rpc).toHaveBeenCalledWith('save_mail_template', expect.objectContaining({ p_key: 'welcome', p_subject: 'Ny konto' })))
  })
  it('lenkeboksen kan ikke fjernes; varslingsadresser lagres', async () => {
    const { data } = setupAdmin(DEV, { hash: '#/mail', rpc, server })
    await screen.findByText('post@connecthub.no')
    const blocks = screen.getByText('Lenkeboks')
    expect(within(blocks.closest('li') as HTMLElement).queryByRole('button', { name: 'Fjern blokken' })).toBe(null)
    fireEvent.change(screen.getByLabelText('Ekstra adresse 2'), { target: { value: 'b@b.no' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lagre adresser' }))
    await waitFor(() => expect(data.rpc).toHaveBeenCalledWith('set_mail_notify_extra', { p_emails: ['a@b.no', 'b@b.no'] }))
  })
  it('Admin har ikke Mail-fanen', async () => {
    setupAdmin(ADM, { hash: '#/mail', rpc, server })
    expect(await screen.findByRole('heading', { name: 'Ingen tilgang' })).toBeTruthy()
  })
})
