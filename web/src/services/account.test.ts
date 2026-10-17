import { describe, expect, it, vi } from 'vitest'
import { createAccountService, passwordChecks, passwordProblem, validNotifyEmail } from './account'
import type { AuthAdapter, DataAdapter } from './auth/types'
import { ServiceError } from './errors'

/** Falske adaptere: viser at logikken følger dagens app, ikke at integrasjonen mot ConnectHub virker. */
function fakes(over: Partial<AuthAdapter> = {}) {
  const auth = {
    signIn: vi.fn(async (_e: string, pw: string) => (pw === 'gammelt1234' ? { ok: true as const } : { ok: false as const, error: 'invalid_credentials' })),
    mfaVerify: vi.fn(async (_f: string, c: string) => (c === '123456' ? { ok: true as const } : { ok: false as const, error: 'invalid' })),
    setPassword: vi.fn(async () => ({ ok: true as const })),
    signOutOthers: vi.fn(async () => ({ ok: true as const })),
    mfaStatus: vi.fn(async () => ({ current: 'aal2', next: 'aal2', factors: [{ id: 'f1', name: 'App' }] })),
    ...over,
  } as unknown as AuthAdapter
  const data = {
    rpc: vi.fn(async () => ({})),
    select: vi.fn(async () => [{ id: 'n1', read_at: null }, { id: 'n2', read_at: '2026-10-01' }, { id: 'n3', read_at: null }]),
    update: vi.fn(async () => []),
  } as unknown as DataAdapter & { rpc: ReturnType<typeof vi.fn>; select: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> }
  const server = vi.fn(async () => ({ ok: true }))
  const svc = createAccountService({ auth, data, token: async () => 'tok', server: server as never })
  return { auth, data, server, svc }
}
const base = { email: 'a@b.no', old: 'gammelt1234', next: 'nyttpass123', confirm: 'nyttpass123', code: '', factorId: null }

describe('passordkrav (som passwordChecks/passwordProblem)', () => {
  it('minst 10 tegn, bokstaver og tall, like passord', () => {
    expect(passwordChecks('abc', '')).toEqual([{ key: 'len', ok: false }, { key: 'mix', ok: false }, { key: 'same', ok: false }])
    expect(passwordChecks('æøåbcdefg1', 'æøåbcdefg1').every((c) => c.ok)).toBe(true)
    expect([passwordProblem('kort1'), passwordProblem('bareboksta'), passwordProblem('bokstaver12')]).toEqual(['short', 'mix', null])
    expect([validNotifyEmail('ola@menighet.no'), validNotifyEmail('ola@'), validNotifyEmail('a b@c.no')]).toEqual([true, false, false])
  })
})

describe('«Bytt passord» (AUTH-05)', () => {
  it('kontrollerer skjemaet før noe sendes', async () => {
    const { svc, auth } = fakes()
    expect(await svc.changePassword({ ...base, old: '' })).toEqual({ ok: false, error: 'old_missing' })
    expect(await svc.changePassword({ ...base, next: 'kort1', confirm: 'kort1' })).toEqual({ ok: false, error: 'short' })
    expect(await svc.changePassword({ ...base, confirm: 'annet12345' })).toEqual({ ok: false, error: 'not_same' })
    expect(await svc.changePassword({ ...base, factorId: 'f1', code: '12' })).toEqual({ ok: false, error: 'code_missing' })
    expect(auth.signIn).not.toHaveBeenCalled()
  })
  it('gammelt passord kontrolleres med ny innlogging; feil gir egen kode og ingen endring', async () => {
    const { svc, auth } = fakes()
    expect(await svc.changePassword({ ...base, old: 'feil12345678' })).toEqual({ ok: false, error: 'invalid_credentials' })
    expect(auth.setPassword).not.toHaveBeenCalled()
  })
  it('med MFA: koden kreves (aal2) før nytt passord; deretter logges andre økter ut', async () => {
    const { svc, auth } = fakes()
    expect(await svc.changePassword({ ...base, factorId: 'f1', code: '654321' })).toEqual({ ok: false, error: 'wrong_code' })
    expect(auth.setPassword).not.toHaveBeenCalled()
    expect(await svc.changePassword({ ...base, factorId: 'f1', code: '123 456' })).toEqual({ ok: true })
    expect(auth.mfaVerify).toHaveBeenLastCalledWith('f1', '123456')
    expect(auth.setPassword).toHaveBeenCalledWith('nyttpass123')
    expect(auth.signOutOthers).toHaveBeenCalled()
  })
  it('leverandørens feil (samme passord, for mange forsøk) gis videre som kjente koder', async () => {
    const { svc } = fakes({ setPassword: vi.fn(async () => ({ ok: false as const, error: 'same_password' })) })
    expect(await svc.changePassword(base)).toEqual({ ok: false, error: 'same_password' })
    const b = fakes({ setPassword: vi.fn(async () => ({ ok: false as const, error: 'noe_rart' })) })
    expect(await b.svc.changePassword(base)).toEqual({ ok: false, error: 'unknown' })
  })
  it('MFA-faktoren hentes til kodefeltet', async () => {
    expect(await fakes().svc.mfaFactor()).toBe('f1')
    expect(await fakes({ mfaStatus: vi.fn(async () => { throw new Error('x') }) }).svc.mfaFactor()).toBe(null)
  })
})

describe('varsler, e-postvarsler, eksport og sletting (AUTH-08)', () => {
  it('varsler: siste 50, nyeste først; «Merk alle som lest», «Fjern leste» og «Tøm» via databasefunksjonene (TB-D9DE93)', async () => {
    const { svc, data } = fakes()
    await svc.notifications.list()
    expect(data.select).toHaveBeenCalledWith('notifications', expect.objectContaining({ order: 'created_at', desc: true, limit: 50 }))
    await svc.notifications.markAllRead()
    await svc.notifications.clear(true)
    await svc.notifications.clear(false)
    expect(data.rpc.mock.calls.slice(-3)).toEqual([['mark_my_notifications_read'], ['clear_my_notifications', { p_only_read: true }], ['clear_my_notifications', { p_only_read: false }]])
  })
  it('e-postvarsler og eksport bruker databasefunksjonene uendret', async () => {
    const { svc, data } = fakes()
    await svc.emailPrefs.get()
    await svc.emailPrefs.setAddress('')
    await svc.emailPrefs.set(false)
    await svc.exportMine()
    expect(data.rpc.mock.calls).toEqual([['my_email_prefs'], ['set_my_notify_email', { p_email: null }], ['set_my_email_optional', { p_on: false }], ['export_my_data']])
  })
  it('sletting går til serveren med brukerens token og bekreftelsen «SLETT»', async () => {
    const { svc, server } = fakes()
    await svc.deleteMe()
    expect(server).toHaveBeenCalledWith('tok', 'privacy.delete_me', { confirm: 'SLETT' })
  })
  it('uten backend: tydelig feil, ingen kall', async () => {
    const s = createAccountService({ auth: null, data: null, token: async () => null })
    expect(s.available()).toBe(false)
    await expect(s.exportMine()).rejects.toEqual(new ServiceError('unavailable'))
  })
})
