import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ServicesContext, type Services } from '../../app/services'
import { forgetAccount, initialsOf, rememberAccount, savedAccounts } from '../../infrastructure/saved-accounts'
import type { AuthService } from '../../services/auth/auth-service'
import type { AuthState } from '../../services/auth/types'
import { ServiceError } from '../../services/errors'
import { createRequestService, requestProblem } from '../../services/requests'
import { createStore } from '../../shared/lib/store'
import { SignIn } from './SignIn'

/** Komponenttester med falsk innloggingstjeneste og falsk server: flyten i grensesnittet, ikke ekte ConnectHub. */
function setup(opts: { call?: (action: string, body?: unknown) => Promise<unknown> } = {}) {
  const state = createStore<AuthState>({ status: 'signed-out' })
  const auth = {
    state,
    signIn: vi.fn(async (email: string) => { state.set({ status: 'ready', me: { email, full_name: 'Ola Nordmann' } as never }) }),
    verifyMfa: vi.fn(), startMfaSetup: vi.fn(), signOut: vi.fn(), accessToken: vi.fn(),
    requestPasswordReset: vi.fn(async () => undefined),
  } as unknown as AuthService & { signIn: ReturnType<typeof vi.fn>; requestPasswordReset: ReturnType<typeof vi.fn> }
  const call = vi.fn(opts.call ?? (async (action: string) => (action === 'request.form' ? { ok: true, token: 'skjemanøkkel' } : { ok: true })))
  const services = { requests: createRequestService(call as never) } as unknown as Services
  const view = () => <ServicesContext value={services}><SignIn state={{ status: 'signed-out' }} auth={auth} /></ServicesContext>
  const r = render(view())
  return { auth, call, rerender: () => r.rerender(view()), unmount: r.unmount }
}

describe('kontovelger (AUTH-06)', () => {
  it('lagrer bare e-post, navn og initialer, høyst 5, nyeste først', () => {
    for (let i = 1; i <= 6; i++) rememberAccount({ email: ` Bruker${i}@B.no `, name: `Bruker ${i}` })
    const list = savedAccounts()
    expect(list).toHaveLength(5)
    expect(list[0]).toEqual({ email: 'bruker6@b.no', name: 'Bruker 6', initials: 'B6', last: expect.any(Number) })
    expect(Object.keys(JSON.parse(localStorage.getItem('ch.accounts') ?? '[]')[0])).toEqual(['email', 'name', 'initials', 'last'])
    forgetAccount('BRUKER6@b.no')
    expect(savedAccounts().map((a) => a.email)).not.toContain('bruker6@b.no')
    expect(initialsOf('ola.nordmann@b.no')).toBe('ON')
  })
  it('«Husk denne kontoen» lagrer kontoen etter innlogging; velgeren fyller e-posten; fjerning spør først', async () => {
    const a = setup()
    fireEvent.change(screen.getByLabelText('E-post'), { target: { value: 'ola@b.no' } })
    fireEvent.change(screen.getByLabelText('Passord'), { target: { value: 'hemmelig123' } })
    fireEvent.click(screen.getByRole('checkbox', { name: /Husk denne kontoen/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Logg inn' }))
    await waitFor(() => expect(savedAccounts().map((x) => x.email)).toEqual(['ola@b.no']))
    expect(localStorage.getItem('ch.accounts')).not.toContain('hemmelig123')
    a.unmount()
    setup()
    fireEvent.click(screen.getByRole('radio', { name: /Ola Nordmann/ }))
    expect((screen.getByLabelText('E-post') as HTMLInputElement).value).toBe('ola@b.no')
    expect(screen.getByText(/Logger inn som/).textContent).toContain('Ola Nordmann')
    vi.stubGlobal('confirm', vi.fn(() => true))
    fireEvent.click(screen.getByRole('button', { name: 'Fjern fra denne enheten: Ola Nordmann' }))
    expect(savedAccounts()).toEqual([])
    vi.unstubAllGlobals()
  })
})

describe('«Glemt passordet?» (AUTH-04)', () => {
  it('skjema → samme nøytrale svar uansett om kontoen finnes', async () => {
    const { auth } = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Glemt passord?' }))
    fireEvent.change(screen.getByLabelText('E-post'), { target: { value: 'ola@b.no' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send lenke' }))
    expect((await screen.findByRole('status')).textContent).toContain('Hvis adressen har en konto')
    expect(auth.requestPasswordReset).toHaveBeenCalledWith('ola@b.no')
    fireEvent.click(screen.getByRole('button', { name: 'Tilbake til innlogging' }))
    expect(screen.getByRole('heading', { name: 'Logg inn' })).toBeTruthy()
  })
})

describe('forespørsel om konto (AUTH-07)', () => {
  it('skjemaregler som i dag', () => {
    const ok = { name: 'Ola', phone: '+47 912 34 567', email: 'ola@b.no', church: 'Menighet', website: '' }
    expect(requestProblem(ok)).toBe(null)
    expect(requestProblem({ ...ok, name: 'O' })).toBe('name')
    expect(requestProblem({ ...ok, phone: '123' })).toBe('phone')
    expect(requestProblem({ ...ok, email: 'ola@b' })).toBe('email')
    expect(requestProblem({ ...ok, church: '' })).toBe('church')
  })
  it('skjemanøkkel hentes ved åpning; feil vises før sending; innsending med nøkkel og felle-felt', async () => {
    const { call } = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Send forespørsel om opprettelse av bruker' }))
    await waitFor(() => expect(call).toHaveBeenCalledWith('request.form'))
    const send = await screen.findByRole('button', { name: 'Send forespørsel' })
    await waitFor(() => expect((send as HTMLButtonElement).disabled).toBe(false))
    fireEvent.click(send)
    expect(screen.getByRole('alert').textContent).toBe('Skriv navnet ditt.')
    const set = (l: string, v: string) => fireEvent.change(screen.getByLabelText(l), { target: { value: v } })
    set('Navn', 'Ola Nordmann'); set('Telefonnummer', '91234567'); set('E-postadresse', 'ola@b.no'); set('Menighet / annet', 'Menigheten')
    fireEvent.click(send)
    expect((await screen.findByRole('status')).textContent).toContain('Forespørselen er mottatt')
    expect(call).toHaveBeenLastCalledWith('request.submit', { name: 'Ola Nordmann', phone: '91234567', email: 'ola@b.no', church: 'Menigheten', website: '', token: 'skjemanøkkel' })
  })
  it('utløpt skjema: egen melding og ny nøkkel', async () => {
    let n = 0
    const { call } = setup({ call: async (a) => { if (a === 'request.form') return { ok: true, token: 'nøkkel' + ++n }; throw new ServiceError('form_expired') } })
    fireEvent.click(screen.getByRole('button', { name: 'Send forespørsel om opprettelse av bruker' }))
    const send = await screen.findByRole('button', { name: 'Send forespørsel' })
    await waitFor(() => expect((send as HTMLButtonElement).disabled).toBe(false))
    const set = (l: string, v: string) => fireEvent.change(screen.getByLabelText(l), { target: { value: v } })
    set('Navn', 'Ola'); set('Telefonnummer', '91234567'); set('E-postadresse', 'ola@b.no'); set('Menighet / annet', 'Menigheten')
    fireEvent.click(send)
    expect((await screen.findByRole('alert')).textContent).toContain('Skjemaet var åpent for lenge')
    await waitFor(() => expect(call.mock.calls.filter((c) => c[0] === 'request.form')).toHaveLength(2))
  })
})
