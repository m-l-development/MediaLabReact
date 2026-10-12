import { describe, expect, it, vi } from 'vitest'
import { createAuthService } from './auth-service'
import { ME_CACHE_KEY, readMe, sameMe, sessionKey, writeMe } from './me-cache'
import type { AuthAdapter, DataAdapter, MfaStatus, Session } from './types'

const session: Session = { accessToken: 'tok', expiresAt: Date.now() / 1000 + 3600, userId: 'u1', email: 'a@b.no', sessionId: 's1', aal: 'aal1' }

const me = (roles: { role: string; church_id: string | null }[] = []) => ({
  id: 'u1', email: 'a@b.no', full_name: 'Ada', first_name: 'Ada', last_name: null, phone: null, mfa: false,
  roles, churches: [{ id: 'c1', name: 'Menighet', logo_file_id: null }],
})

function fakes(opts: { session?: Session | null; mfa?: MfaStatus; whoami?: unknown; signIn?: { ok: true } | { ok: false; error: string } } = {}) {
  let current = opts.session === undefined ? null : opts.session
  const auth: AuthAdapter = {
    getSession: vi.fn(async () => current),
    onChange: vi.fn(() => () => {}),
    signIn: vi.fn(async () => {
      const r = opts.signIn ?? { ok: true as const }
      if (r.ok) current = session
      return r
    }),
    signOut: vi.fn(async () => {
      current = null
      return { ok: true as const }
    }),
    mfaStatus: vi.fn(async () => opts.mfa ?? { current: 'aal1', next: 'aal1', factors: [] }),
    mfaEnroll: vi.fn(async () => ({ ok: true as const, factorId: 'f-new', qr: 'data:', secret: 'S' })),
    mfaVerify: vi.fn(async (_id: string, code: string) => (code === '123456' ? { ok: true as const } : { ok: false as const, error: 'invalid_credentials' })),
    setPassword: vi.fn(async () => ({ ok: true as const })),
    signOutOthers: vi.fn(async () => ({ ok: true as const })),
    requestPasswordReset: vi.fn(async () => ({ ok: true as const })),
  }
  const data: DataAdapter = { rpc: vi.fn(async () => (opts.whoami === undefined ? me() : opts.whoami)) as DataAdapter['rpc'], select: vi.fn(async () => []) as DataAdapter['select'], update: vi.fn(async () => []) as DataAdapter['update'] }
  const writeCookie = vi.fn()
  const reload = vi.fn()
  return { auth, data, writeCookie, reload }
}

describe('innlogging', () => {
  it('uten backend i utvikling: klar uten bruker', async () => {
    const s = createAuthService({ auth: null, data: null, dev: true })
    await s.start()
    expect(s.state.get()).toEqual({ status: 'ready', me: null })
  })

  it('uten backend i produksjon: stopper', async () => {
    const s = createAuthService({ auth: null, data: null, dev: false })
    await s.start()
    expect(s.state.get()).toEqual({ status: 'no-backend', dev: false })
  })

  it('uten økt: viser innlogging', async () => {
    const f = fakes()
    const s = createAuthService({ ...f, dev: false })
    await s.start()
    expect(s.state.get().status).toBe('signed-out')
    expect(f.writeCookie).toHaveBeenCalledWith(null)
  })

  it('feil passord gir forståelig feil', async () => {
    const f = fakes({ signIn: { ok: false, error: 'invalid_credentials' } })
    const s = createAuthService({ ...f, dev: false })
    await s.signIn('a@b.no', 'feil')
    expect(s.state.get()).toEqual({ status: 'signed-out', error: 'auth.error.invalid' })
  })

  it('riktig passord → whoami → klar, og cookie for sperren settes', async () => {
    const f = fakes()
    const s = createAuthService({ ...f, dev: false })
    await s.signIn(' a@b.no ', 'riktig')
    expect(f.auth.signIn).toHaveBeenCalledWith('a@b.no', 'riktig')
    expect(s.state.get()).toMatchObject({ status: 'ready', me: { email: 'a@b.no' } })
    expect(f.writeCookie).toHaveBeenCalledWith(session)
  })

  it('MFA-faktor uten aal2 → kode kreves; feil kode gir feil, riktig gir klar', async () => {
    const f = fakes({ mfa: { current: 'aal1', next: 'aal2', factors: [{ id: 'f1', name: 'App' }] } })
    const s = createAuthService({ ...f, dev: false })
    await s.signIn('a@b.no', 'pw')
    expect(s.state.get()).toEqual({ status: 'mfa-verify', factorId: 'f1' })
    await s.verifyMfa('000000')
    expect(s.state.get()).toEqual({ status: 'mfa-verify', factorId: 'f1', error: 'auth.mfa.wrong' })
    ;(f.auth.mfaStatus as ReturnType<typeof vi.fn>).mockResolvedValue({ current: 'aal2', next: 'aal2', factors: [{ id: 'f1', name: 'App' }] })
    await s.verifyMfa('123 456')
    expect(f.auth.mfaVerify).toHaveBeenLastCalledWith('f1', '123456')
    expect(s.state.get().status).toBe('ready')
  })

  it('stab uten MFA-faktor må sette opp totrinnsbekreftelse', async () => {
    const f = fakes({ whoami: me([{ role: 'developer', church_id: null }]) })
    const s = createAuthService({ ...f, dev: false })
    await s.signIn('a@b.no', 'pw')
    expect(s.state.get()).toEqual({ status: 'mfa-setup' })
    await s.startMfaSetup()
    expect(s.state.get()).toMatchObject({ status: 'mfa-setup', enrollment: { factorId: 'f-new' } })
  })

  it('konto som ikke er koblet → egen visning', async () => {
    const f = fakes({ session, whoami: null })
    const s = createAuthService({ ...f, dev: false })
    await s.start()
    expect(s.state.get()).toEqual({ status: 'not-linked' })
  })

  it('kjent økt vises straks fra bufferen og lastes på nytt hvis rollene er endret', async () => {
    writeMe(session, { ...me(), id: 'u1' } as never)
    const f = fakes({ session, whoami: me([{ role: 'church_admin', church_id: 'c1' }]) })
    const s = createAuthService({ ...f, dev: false })
    await s.start()
    expect(s.state.get().status).toBe('ready')
    await vi.waitFor(() => expect(f.reload).toHaveBeenCalled())
  })

  it('nettfeil ved oppstart gir egen visning', async () => {
    const f = fakes()
    f.auth.getSession = vi.fn(() => Promise.reject(new Error('nett')))
    const s = createAuthService({ ...f, dev: false })
    await s.start()
    expect(s.state.get()).toEqual({ status: 'offline' })
  })

  it('utlogging fjerner buffer og cookie', async () => {
    writeMe(session, me() as never)
    const f = fakes({ session })
    const s = createAuthService({ ...f, dev: false })
    await s.signOut()
    expect(localStorage.getItem(ME_CACHE_KEY)).toBeNull()
    expect(f.writeCookie).toHaveBeenLastCalledWith(null)
    expect(s.state.get().status).toBe('signed-out')
  })
})

describe('me-cache (kompatibel med dagens app)', () => {
  it('nøkkel = bruker|økt|nivå, og bare samme økt leses', () => {
    expect(sessionKey(session)).toBe('u1|s1|aal1')
    writeMe(session, me() as never, 1000)
    expect(readMe(session, 2000)?.email).toBe('a@b.no')
    expect(readMe({ ...session, sessionId: 's2' }, 2000)).toBeNull()
    expect(readMe(session, 1000 + 13 * 3600e3)).toBeNull()
  })

  it('sammenligner uavhengig av rekkefølge', () => {
    const a = me([{ role: 'x', church_id: null }, { role: 'y', church_id: null }]) as never
    const b = me([{ role: 'y', church_id: null }, { role: 'x', church_id: null }]) as never
    expect(sameMe(a, b)).toBe(true)
  })
})

describe('«Glemt passord» (AUTH-04)', () => {
  it('ConnectHub sender selv: leverandørens e-post brukes ikke', async () => {
    const f = fakes()
    const s = createAuthService({ ...f, dev: false, recover: async () => ({ fallback: false }), origin: 'https://x.no' })
    await s.requestPasswordReset(' ola@b.no ')
    expect(f.auth.requestPasswordReset).not.toHaveBeenCalled()
  })
  it('uten e-postoppsett eller uten svar fra serveren: leverandørens e-post med lenke til dagens innloggingsside; svaret er likt', async () => {
    for (const recover of [async () => ({ fallback: true }), async () => { throw new Error('nett') }]) {
      const f = fakes()
      const s = createAuthService({ ...f, dev: false, recover, origin: 'https://x.no' })
      await expect(s.requestPasswordReset('ola@b.no')).resolves.toBeUndefined()
      expect(f.auth.requestPasswordReset).toHaveBeenCalledWith('ola@b.no', 'https://x.no/login.dc.html?flow=recovery')
    }
  })
})
