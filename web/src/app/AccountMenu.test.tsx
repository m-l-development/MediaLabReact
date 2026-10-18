import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Me } from '../domain/account'
import { createAccountService } from '../services/account'
import type { AuthAdapter, DataAdapter } from '../services/auth/types'
import { ServiceError } from '../services/errors'
import { AccountMenu } from './AccountMenu'
import { ServicesContext, type Services } from './services'

/** Komponenttester med falske adaptere: viser flyten i grensesnittet, ikke at ConnectHub svarer slik. */
const base = { email: 'ola@b.no', full_name: 'Ola Nordmann', first_name: 'Ola', last_name: 'Nordmann', phone: null, mfa: true }
const USER = { ...base, id: '00000000-0000-4000-8000-000000000001', roles: [], churches: [{ id: 'c1', name: 'Menighet', logo_file_id: null }] } as unknown as Me
const DEV = { ...base, id: 'd1', roles: [{ role: 'developer', church_id: null }], churches: [] } as unknown as Me

function setup(me: Me, opts: { rpc?: (fn: string) => unknown; server?: () => Promise<unknown>; factors?: { id: string }[] } = {}) {
  const auth = {
    signIn: vi.fn(async (_e: string, pw: string) => (pw === 'gammelt1234' ? { ok: true } : { ok: false, error: 'invalid_credentials' })),
    mfaVerify: vi.fn(async () => ({ ok: true })),
    setPassword: vi.fn(async () => ({ ok: true })),
    signOutOthers: vi.fn(async () => ({ ok: true })),
    mfaStatus: vi.fn(async () => ({ current: 'aal2', next: 'aal2', factors: opts.factors ?? [] })),
  } as unknown as AuthAdapter
  const notes = [
    { id: 'n1', kind: null, title: 'Ny fil i Fellesmappe', body: 'Et bilde er lagt til', link: null, church_id: null, read_at: null, created_at: '2026-10-11T10:00:00Z' },
    { id: 'n2', kind: null, title: 'Gammelt varsel', body: null, link: null, church_id: null, read_at: '2026-10-01T10:00:00Z', created_at: '2026-10-01T09:00:00Z' },
  ]
  const data = {
    rpc: vi.fn(async (fn: string) => (opts.rpc ? opts.rpc(fn) : fn === 'export_my_data' ? { format: 'connecthub-my-data/1' } : null)),
    select: vi.fn(async () => notes),
    update: vi.fn(async (_t: string, m: { id: string }) => { const n = notes.find((x) => x.id === m.id); if (n) n.read_at = 'nå'; return [] }),
  } as unknown as DataAdapter
  const server = vi.fn(opts.server ?? (async () => ({ ok: true })))
  const account = createAccountService({ auth, data, token: async () => 'tok', server: server as never })
  const signOut = vi.fn(async () => undefined)
  const services = { account, feedback: { available: () => true, submit: vi.fn() } } as unknown as Services
  let open = false
  const view = () => (
    <ServicesContext value={services}>
      <AccountMenu me={me} realMe={me} testRole={null} testAllowed={false} onSignOut={signOut} open={open} setOpen={(v) => { open = v; r.rerender(view()) }} fabClass={undefined} />
    </ServicesContext>
  )
  const r = render(view())
  fireEvent.click(screen.getByRole('button', { name: 'Konto' }))
  return { auth, data, server, signOut, menu: () => screen.getByRole('dialog') }
}

beforeEach(() => vi.useRealTimers())

describe('kontomenyen (AUTH-08)', () => {
  it('hovedmenyen: navn, e-post, rolle og menighet, varsler med antall uleste, logg ut', async () => {
    const { signOut, menu } = setup(USER)
    expect(menu().textContent).toContain('Ola Nordmann')
    expect(menu().textContent).toContain('Bruker · Menighet')
    // vanlige brukere har ikke e-postvarsler (bare Developer/Moderator)
    expect(screen.queryByRole('switch')).toBe(null)
    await waitFor(() => expect(screen.getByRole('button', { name: /Varsler/ }).textContent).toContain('1'), { timeout: 2000 })
    fireEvent.click(screen.getByRole('button', { name: 'Logg ut' }))
    expect(signOut).toHaveBeenCalled()
  })
  it('varsler: ulest markeres som lest ved trykk; «Merk alle som lest»', async () => {
    const { data } = setup(USER)
    fireEvent.click(screen.getByRole('button', { name: /Varsler/ }))
    const item = await screen.findByText('Ny fil i Fellesmappe')
    expect(item.closest('button')?.getAttribute('data-ch-notif')).toBe('ny')
    expect(screen.getByRole('button', { name: 'Merk alle som lest' })).toBeTruthy()
    fireEvent.click(item)
    await waitFor(() => expect(data.update).toHaveBeenCalledWith('notifications', { id: 'n1' }, expect.objectContaining({ read_at: expect.any(String) })))
    await waitFor(() => expect(screen.getByText('Ny fil i Fellesmappe').closest('button')?.getAttribute('data-ch-notif')).toBe('lest'))
  })
  it('varsler (TB-D9DE93): merk alle som lest, fjern leste og tøm loggen – via databasefunksjonene', async () => {
    const calls: unknown[] = []
    const { data } = setup(USER, { rpc: (fn) => { calls.push(fn); return fn === 'mark_my_notifications_read' ? 1 : fn === 'clear_my_notifications' ? 2 : null } })
    fireEvent.click(screen.getByRole('button', { name: /Varsler/ }))
    await screen.findByText('Ny fil i Fellesmappe')
    fireEvent.click(screen.getByRole('button', { name: 'Merk alle som lest' }))
    expect((await screen.findByRole('status')).textContent).toBe('Alle varsler er merket som lest.')
    fireEvent.click(screen.getByRole('button', { name: 'Fjern leste varsler' }))
    await waitFor(() => expect(data.rpc).toHaveBeenCalledWith('clear_my_notifications', { p_only_read: true }))
    expect((await screen.findByText('2 varsler fjernet.')).textContent).toBeTruthy()
    // «Tøm» er permanent: avbrutt bekreftelse gjør ingenting
    const confirm = vi.fn().mockReturnValueOnce(false).mockReturnValueOnce(true)
    const before = window.confirm
    window.confirm = confirm
    fireEvent.click(screen.getByRole('button', { name: 'Tøm varslingsloggen' }))
    expect(data.rpc).not.toHaveBeenCalledWith('clear_my_notifications', { p_only_read: false })
    fireEvent.click(screen.getByRole('button', { name: 'Tøm varslingsloggen' }))
    await waitFor(() => expect(data.rpc).toHaveBeenCalledWith('clear_my_notifications', { p_only_read: false }))
    expect(confirm).toHaveBeenCalledTimes(2)
    window.confirm = before
  })
  it('varsler: feil gir feilmelding, ikke «lyktes»', async () => {
    setup(USER, { rpc: (fn) => { if (fn === 'clear_my_notifications') throw new ServiceError('network'); return null } })
    fireEvent.click(screen.getByRole('button', { name: /Varsler/ }))
    await screen.findByText('Gammelt varsel')
    fireEvent.click(screen.getByRole('button', { name: 'Fjern leste varsler' }))
    expect((await screen.findByRole('alert')).textContent).toBe('Det gikk ikke, og ingenting ble endret. Prøv igjen.')
    expect(screen.queryByText(/varsler fjernet/)).toBe(null)
  })
  it('e-postvarsler for Developer: av/på og egen adresse med kontroll; uten MFA vises forklaring', async () => {
    const { data } = setup(DEV, { rpc: (fn) => (fn === 'my_email_prefs' ? { on: true, notify_email: null, account_email: 'ola@b.no' } : null) })
    const sw = await screen.findByRole('switch')
    await waitFor(() => expect((sw as HTMLButtonElement).disabled).toBe(false))
    fireEvent.click(sw)
    await waitFor(() => expect(data.rpc).toHaveBeenCalledWith('set_my_email_optional', { p_on: false }))
    fireEvent.click(screen.getByRole('button', { name: 'Endre adresse' }))
    fireEvent.change(screen.getByLabelText('E-postadresse for varsler'), { target: { value: 'feil' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lagre' }))
    expect(screen.getByRole('alert').textContent).toBe('Skriv en gyldig e-postadresse.')
    fireEvent.change(screen.getByLabelText('E-postadresse for varsler'), { target: { value: 'Varsel@Menighet.no' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lagre' }))
    await waitFor(() => expect(data.rpc).toHaveBeenCalledWith('set_my_notify_email', { p_email: 'varsel@menighet.no' }))
    expect((await screen.findByRole('status')).textContent).toContain('varsel@menighet.no')
  })
  it('e-postvarsler uten MFA (databasen avviser): forklaring i stedet for bryter', async () => {
    setup(DEV, { rpc: (fn) => { if (fn === 'my_email_prefs') throw new ServiceError('forbidden'); return null } })
    expect(await screen.findByText(/Krever totrinnsbekreftelse/)).toBeTruthy()
    expect(screen.queryByRole('switch')).toBe(null)
  })
})

describe('Konto og sikkerhet (AUTH-05, AUTH-08)', () => {
  it('«Last ned mine data» henter eksporten og laster ned en JSON-fil', async () => {
    const created: Blob[] = []
    vi.spyOn(URL, 'createObjectURL').mockImplementation((b) => { created.push(b as Blob); return 'blob:x' })
    const { data } = setup(USER)
    fireEvent.click(screen.getByRole('button', { name: /Konto og sikkerhet/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Last ned mine data' }))
    await waitFor(() => expect(created).toHaveLength(1))
    expect(data.rpc).toHaveBeenCalledWith('export_my_data')
    expect(JSON.parse(await created[0]!.text())).toEqual({ format: 'connecthub-my-data/1' })
  })
  it('«Bytt passord»: løpende krav, kode når kontoen har MFA, feil gammelt passord, og ferdig-melding', async () => {
    const { auth } = setup(USER, { factors: [{ id: 'f1' }] })
    fireEvent.click(screen.getByRole('button', { name: /Konto og sikkerhet/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Bytt passord' }))
    const code = await screen.findByLabelText('Kode fra autentiseringsappen')
    const pw = (l: string, v: string) => fireEvent.change(screen.getByLabelText(l, { selector: 'input' }), { target: { value: v } })
    pw('Nytt passord', 'nyttpass123')
    expect(screen.getByText(/Minst 10 tegn/).textContent?.startsWith('✓')).toBe(true)
    expect(screen.getByText(/Passordene er like/).textContent?.startsWith('•')).toBe(true)
    pw('Bekreft nytt passord', 'nyttpass123')
    pw('Gammelt passord', 'feil12345678')
    fireEvent.change(code, { target: { value: '123456' } })
    const form = within(screen.getByRole('dialog'))
    fireEvent.click(form.getAllByRole('button', { name: 'Bytt passord' }).at(-1)!)
    expect((await screen.findByRole('alert')).textContent).toBe('Det gamle passordet er feil.')
    expect(auth.setPassword).not.toHaveBeenCalled()
    pw('Gammelt passord', 'gammelt1234')
    fireEvent.click(form.getAllByRole('button', { name: 'Bytt passord' }).at(-1)!)
    expect((await screen.findByRole('status')).textContent).toContain('Passordet er endret')
    expect(auth.mfaVerify).toHaveBeenCalledWith('f1', '123456')
    expect(auth.signOutOthers).toHaveBeenCalled()
  })
  it('«Slett kontoen min»: avkrysning kreves; den siste Developer stoppes med forklaring', async () => {
    const { server, signOut } = setup(DEV, { server: async () => { throw new ServiceError('invalid') } })
    fireEvent.click(screen.getByRole('button', { name: /Konto og sikkerhet/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Slett kontoen min' }))
    const go = screen.getByRole('button', { name: 'Slett kontoen permanent' }) as HTMLButtonElement
    expect(go.disabled).toBe(true)
    expect(screen.getByText(/Bilder du har lagt i menighetens fellesmapper blir liggende/)).toBeTruthy()
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(go)
    expect((await screen.findByRole('alert')).textContent).toContain('eneste Developer')
    expect(server).toHaveBeenCalledWith('tok', 'privacy.delete_me', { confirm: 'SLETT' })
    expect(signOut).not.toHaveBeenCalled()
  })
  it('«Slett kontoen min» lykkes: brukerens lokale data fjernes og brukeren logges ut', async () => {
    localStorage.setItem('photodesign.cats@00000000-0000-4000-8000-000000000001', 'x')
    localStorage.setItem('medialab.theme', 'light')
    const { signOut } = setup(USER)
    fireEvent.click(screen.getByRole('button', { name: /Konto og sikkerhet/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Slett kontoen min' }))
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: 'Slett kontoen permanent' }))
    await waitFor(() => expect(signOut).toHaveBeenCalled())
    expect(localStorage.getItem('photodesign.cats@00000000-0000-4000-8000-000000000001')).toBe(null)
    expect(localStorage.getItem('medialab.theme')).toBe('light')
  })
})
