import { describe, expect, it, vi } from 'vitest'
import { createAuthService } from './auth-service'
import type { AuthAdapter, DataAdapter, Session } from './types'
import { ServiceError } from '../errors'

const session: Session = { accessToken: 'tok', expiresAt: Date.now() / 1000 + 3600, userId: 'u1', email: null, sessionId: 's1', aal: 'aal1' }
const parishMe = { id: 'p1', email: 'p-x@menighetsbruker.invalid', full_name: 'Oslo – Menighetsbruker', roles: [], churches: [{ id: 'c1', name: 'Oslo menighet', logo_file_id: null }],
  parish: { username: 'oslo-kontor', church_id: 'c1', pw_due_at: '2027-11-21T00:00:00Z' } }

/** Falsk backend: whoami gir null så lenge passordet er forfalt (som databasen), parish_self viser hvorfor. */
function setup(opts: { due?: boolean; disabled?: boolean; login?: 'ok' | 'invalid' | 'disabled' } = {}) {
  let current: Session | null = null
  let due = !!opts.due
  const auth: AuthAdapter = {
    getSession: vi.fn(async () => current), onChange: vi.fn(() => () => {}),
    signIn: vi.fn(async () => ({ ok: true as const })), signOut: vi.fn(async () => { current = null; return { ok: true as const } }),
    mfaStatus: vi.fn(async () => ({ current: 'aal1', next: 'aal1', factors: [] })),
    mfaEnroll: vi.fn(), mfaVerify: vi.fn(), setPassword: vi.fn(async () => ({ ok: true as const })), signOutOthers: vi.fn(), requestPasswordReset: vi.fn(),
    setSession: vi.fn(async () => { current = session; return { ok: true as const } }),
  } as unknown as AuthAdapter
  const rpc = vi.fn(async (fn: string) => {
    if (fn === 'whoami') return due || opts.disabled ? null : parishMe
    if (fn === 'parish_self') return { church_name: 'Oslo menighet', username: 'oslo-kontor', status: opts.disabled ? 'disabled' : 'active', user_status: 'active', pw_due: due, auth_ok: true }
    return null
  })
  const data = { rpc, select: vi.fn(async () => []), update: vi.fn(async () => []), insert: vi.fn() } as unknown as DataAdapter
  const parish = {
    login: vi.fn(async () => {
      if (opts.login === 'invalid') throw new ServiceError('invalid_credentials')
      if (opts.login === 'disabled') throw new ServiceError('account_disabled')
      return { access_token: 'at', refresh_token: 'rt' }
    }),
    rotate: vi.fn(async (_t: string, pw: string) => { if (pw === 'svakt') throw new ServiceError('weak_password'); due = false; return { access_token: 'at2', refresh_token: 'rt2' } }),
  }
  const s = createAuthService({ auth, data, dev: false, writeCookie: vi.fn(), reload: vi.fn(), parish, parishRecheckMs: 10_000_000 })
  return { s, auth, parish, rpc }
}

describe('Menighetsbruker: innlogging uten e-post', () => {
  it('brukernavn + passord gir en vanlig økt og appen åpnes som felleskonto', async () => {
    const { s, auth, parish } = setup()
    await s.signInParish(' Oslo-Kontor ', 'Menighet2026')
    expect(parish.login).toHaveBeenCalledWith('oslo-kontor', 'Menighet2026')
    expect(auth.setSession).toHaveBeenCalledWith({ access_token: 'at', refresh_token: 'rt' })
    const st = s.state.get()
    expect(st.status).toBe('ready')
    if (st.status === 'ready') expect(st.me?.parish?.username).toBe('oslo-kontor')
    await s.signOut()
  })

  it('feil passord og deaktivert konto gir feilmelding, ingen økt', async () => {
    let x = setup({ login: 'invalid' })
    await x.s.signInParish('oslo-kontor', 'feil')
    expect(x.s.state.get()).toEqual({ status: 'signed-out', error: 'auth.error.invalid' })
    expect(x.auth.setSession).not.toHaveBeenCalled()
    x = setup({ login: 'disabled' })
    await x.s.signInParish('oslo-kontor', 'Menighet2026')
    expect(x.s.state.get()).toEqual({ status: 'signed-out', error: 'parish.login.disabled' })
  })
})

describe('Menighetsbruker: årlig passordbytte', () => {
  it('etter 12 måneder: obligatorisk popup i stedet for appen; riktig bytte gir tilgang', async () => {
    const { s, parish, auth } = setup({ due: true })
    await s.signInParish('oslo-kontor', 'Menighet2026')
    expect(s.state.get()).toEqual({ status: 'parish-password', churchName: 'Oslo menighet', username: 'oslo-kontor' })
    expect(await s.rotateParishPassword('svakt')).toBe('weak_password')
    expect(s.state.get().status).toBe('parish-password')
    expect(await s.rotateParishPassword('NyttPassord9')).toBeNull()
    expect(parish.rotate).toHaveBeenCalledWith('tok', 'NyttPassord9')
    // leverandøren logget ut alle økter; PC-en fortsetter med den nye økten fra serveren
    expect(auth.setSession).toHaveBeenLastCalledWith({ access_token: 'at2', refresh_token: 'rt2' })
    expect(s.state.get().status).toBe('ready')
    await s.signOut()
  })

  it('deaktivert eller sperret konto: egen melding, ingen tilgang', async () => {
    const { s } = setup({ disabled: true })
    await s.signInParish('oslo-kontor', 'Menighet2026')
    expect(s.state.get()).toEqual({ status: 'parish-blocked', churchName: 'Oslo menighet' })
  })
})
