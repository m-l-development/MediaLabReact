import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Me } from '../domain/account'
import { TEST_ROLE_KEY } from '../domain/test-role'
import { createAuthService } from '../services/auth/auth-service'
import type { AuthAdapter, DataAdapter, Session } from '../services/auth/types'
import { createAccountService } from '../services/account'
import { AppShell } from './AppShell'
import { ServicesContext, type Services } from './services'
import { presentTestRole } from './test-role'

const base = { email: 'dev@b.no', full_name: 'Dev Eloper', first_name: 'Dev', last_name: 'Eloper', phone: null, mfa: true }
const DEV = { ...base, id: 'd', roles: [{ role: 'developer', church_id: null }], churches: [{ id: 'c1', name: 'Menighet', logo_file_id: null }] } as unknown as Me
const session: Session = { accessToken: 'tok', expiresAt: Date.now() / 1000 + 3600, userId: 'd', email: 'dev@b.no', sessionId: 's1', aal: 'aal2' }

beforeEach(() => sessionStorage.clear())

describe('testrolle i appen (PLT-16)', () => {
  it('innloggingen gir grensesnittet valgt visning, men tar vare på den ekte brukeren; uten tillatelse ignoreres valget', async () => {
    sessionStorage.setItem(TEST_ROLE_KEY, 'user')
    const auth = {
      getSession: vi.fn(async () => session), onChange: vi.fn(() => () => {}), signIn: vi.fn(), signOut: vi.fn(),
      mfaStatus: vi.fn(async () => ({ current: 'aal2', next: 'aal2', factors: [{ id: 'f', status: 'verified' }] })), mfaEnroll: vi.fn(), mfaVerify: vi.fn(),
    } as unknown as AuthAdapter
    const data = { rpc: vi.fn(async () => DEV), select: vi.fn(async () => []) } as unknown as DataAdapter
    const s = createAuthService({ auth, data, dev: false, writeCookie: vi.fn(), present: (me) => presentTestRole(me, true) })
    await s.start()
    const st = s.state.get()
    expect(st.status).toBe('ready')
    if (st.status !== 'ready') return
    expect(st.me?.roles).toEqual([])
    expect(st.realMe?.roles).toEqual(DEV.roles)
    expect(st.testRole).toBe('user')
    // som i produksjon: ikke tillatt → ekte bruker
    expect(presentTestRole(DEV, false)).toEqual({ me: DEV, testRole: null })
  })
  it('kontomenyen viser rollene man kan bytte til; valget lagres for fanen og siden lastes på nytt', () => {
    const reload = vi.fn()
    vi.spyOn(window.location, 'reload').mockImplementation(reload)
    const services = { feedback: { available: () => true, submit: vi.fn() }, account: createAccountService({ auth: null, data: null, token: async () => null }) } as unknown as Services
    render(
      <ServicesContext value={services}>
        <AppShell route={{ name: 'hub' }} me={DEV} realMe={DEV} testRole={null} testAllowed onSignOut={vi.fn()}><p /></AppShell>
      </ServicesContext>,
    )
    fireEvent.click(screen.getByTitle('Dev Eloper'))
    const radios = screen.getAllByRole('radio').map((r) => [r.textContent, r.getAttribute('aria-checked')])
    expect(radios).toEqual([['Developer · din rolle', 'true'], ['Moderator', 'false'], ['Admin', 'false'], ['User', 'false']])
    expect(screen.getByText(/påvirker ikke dine faktiske tilgangsrettigheter/)).toBeTruthy()
    fireEvent.click(screen.getByRole('radio', { name: 'Admin' }))
    expect(sessionStorage.getItem(TEST_ROLE_KEY)).toBe('admin')
    expect(reload).toHaveBeenCalled()
  })
  it('i testmodus: stripe nederst med knapp tilbake, og menyen viser fortsatt de ekte rollene', () => {
    vi.spyOn(window.location, 'reload').mockImplementation(() => {})
    sessionStorage.setItem(TEST_ROLE_KEY, 'user')
    const services = { feedback: { available: () => true, submit: vi.fn() }, account: createAccountService({ auth: null, data: null, token: async () => null }) } as unknown as Services
    const eff = { ...DEV, roles: [] } as Me
    render(
      <ServicesContext value={services}>
        <AppShell route={{ name: 'hub' }} me={eff} realMe={DEV} testRole="user" testAllowed onSignOut={vi.fn()}><p /></AppShell>
      </ServicesContext>,
    )
    expect(screen.getByRole('status').textContent).toContain('Testmodus: User · rettighetene på serveren er uendret')
    // admin-skjoldet følger visningen (User ser det ikke)
    expect(screen.queryByTitle('Admin')).toBe(null)
    fireEvent.click(screen.getByTitle('Dev Eloper'))
    expect(screen.getByText('Developer · Menighet')).toBeTruthy()
    expect(screen.getByRole('radio', { name: 'User' }).getAttribute('aria-checked')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: 'Tilbake til Developer' }))
    expect(sessionStorage.getItem(TEST_ROLE_KEY)).toBe(null)
  })
  it('uten tillatelse (produksjon) vises ingen rollevelger', () => {
    const services = { feedback: { available: () => true, submit: vi.fn() }, account: createAccountService({ auth: null, data: null, token: async () => null }) } as unknown as Services
    render(
      <ServicesContext value={services}>
        <AppShell route={{ name: 'hub' }} me={DEV} realMe={DEV} onSignOut={vi.fn()}><p /></AppShell>
      </ServicesContext>,
    )
    fireEvent.click(screen.getByTitle('Dev Eloper'))
    expect(screen.queryByRole('radiogroup', { name: 'Testrolle' })).toBe(null)
  })
})
