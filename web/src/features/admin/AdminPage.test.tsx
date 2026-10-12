import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ServicesContext, type Services } from '../../app/services'
import type { Me } from '../../domain/account'
import { createAdminService } from '../../services/admin'
import type { DataAdapter } from '../../services/auth/types'
import { createCollabService } from '../../services/collab'
import { setLang } from '../../shared/i18n/i18n'
import { AdminPage } from './AdminPage'

/** Komponenttester med falsk database og server: rammen, rollene og flytene – ikke at ConnectHub svarer slik. */
const CH = [{ id: 'c1', name: 'Menighet A', status: 'active', created_at: '2026-01-01', delete_after: null, storage_quota_mb: 200, quota_custom: false, logo_file_id: null }]
const USERS = [
  { id: 'd1', email: 'dev@b.no', full_name: 'Dev Eloper', first_name: 'Dev', last_name: 'Eloper', phone: null, status: 'active', created_at: '2026-01-01' },
  { id: 'u1', email: 'ola@b.no', full_name: 'Ola Nordmann', first_name: null, last_name: null, phone: '912', status: 'active', created_at: '2026-01-02' },
]
const base = { phone: null, mfa: true, churches: [{ id: 'c1', name: 'Menighet A', logo_file_id: null }] }
const DEV = { ...base, id: 'd1', email: 'dev@b.no', full_name: 'Dev Eloper', first_name: 'Dev', last_name: 'Eloper', roles: [{ role: 'developer', church_id: null }] } as unknown as Me
const ADM = { ...base, id: 'a1', email: 'adm@b.no', full_name: 'Ada Admin', first_name: 'Ada', last_name: 'Admin', roles: [{ role: 'church_admin', church_id: 'c1' }] } as unknown as Me
const USR = { ...base, id: 'u1', email: 'ola@b.no', full_name: 'Ola Nordmann', first_name: null, last_name: null, roles: [] } as unknown as Me

function setup(me: Me) {
  const tables: Record<string, unknown[]> = {
    churches: CH, app_users: USERS, invitations: [], audit_logs: [{ id: 'l1', action: 'memberships.insert', church_id: 'c1', created_at: '2026-10-01T10:00:00Z', target_type: null, meta: null }],
    memberships: [{ user_id: 'u1', church_id: 'c1', status: 'active', created_at: '2026-01-02' }, { user_id: 'd1', church_id: 'c1', status: 'active', created_at: '2026-01-01' }],
    user_roles: [{ id: 'r1', user_id: 'd1', role: 'developer', church_id: null }], subscription_requests: [],
  }
  const data = {
    select: vi.fn(async (table: string) => tables[table] ?? []),
    rpc: vi.fn(async (fn: string) => (fn === 'system_status' ? { users: 2, files: 3, files_bytes: 3 * 1048576, audit_last_24h: 4 } : fn === 'my_groups' ? [] : null)),
    update: vi.fn(async () => []), insert: vi.fn(),
  } as unknown as DataAdapter & { rpc: ReturnType<typeof vi.fn> }
  const server = vi.fn(async () => ({ ok: true, invitation: { email: 'ny@b.no' }, email_sent: true }))
  const services = {
    admin: createAdminService(data, async () => 'tok', server as never),
    collab: createCollabService(data, async () => 'tok', server as never),
    files: { blob: vi.fn(async () => null) },
  } as unknown as Services
  render(<ServicesContext value={services}><AdminPage me={me} testRole={null} sections={{}} /></ServicesContext>)
  return { data, server }
}
const navLabels = () => within(screen.getByRole('navigation', { name: 'Admin' })).getAllByRole('link').map((a) => a.textContent)

beforeEach(() => { location.hash = ''; setLang('no') })

describe('ConnectHub Admin: ramme og roller (ADM-01)', () => {
  it('Developer: hele menyen, rollen i toppfeltet, utviklermerke, velkomst og tall fra databasen', async () => {
    setup(DEV)
    expect(screen.getByText('CONNECTHUB · DEVELOPER')).toBeTruthy()
    expect(navLabels()).toEqual(['Oversikt', 'Brukere', 'Menigheter', 'Invitasjoner', 'Filer', 'Samarbeid', 'Abonnement', 'Tilbakemeldinger', 'Opprydning', 'Forespørsler', 'Mail', 'Logg'])
    expect(screen.getByRole('heading', { level: 1, name: 'Velkommen, Dev Eloper' })).toBeTruthy()
    expect(await screen.findByText('Hendelser siste døgn')).toBeTruthy()
    expect(screen.getByText('Medlem lagt til · Menighet A')).toBeTruthy()
    expect(screen.getByText('Utvikler')).toBeTruthy()
  })
  it('Admin: bare egne seksjoner; direkte adresse til en annen seksjon gir kontrollert avvisning', async () => {
    setup(ADM)
    expect(screen.getByText('CONNECTHUB · ADMIN')).toBeTruthy()
    expect(navLabels()).toEqual(['Oversikt', 'Brukere', 'Menigheter', 'Invitasjoner', 'Filer', 'Abonnement', 'Logg'])
    act(() => { location.hash = '#/mail'; window.dispatchEvent(new HashChangeEvent('hashchange')) })
    expect(await screen.findByRole('heading', { name: 'Ingen tilgang' })).toBeTruthy()
    expect(screen.queryByText('Utvikler')).toBe(null)
  })
  it('User: egen oversikt med menigheten; seksjoner som ikke er flyttet sier det og lenker til dagens admin', async () => {
    setup(USR)
    expect(screen.getByText('CONNECTHUB · BRUKER')).toBeTruthy()
    expect(navLabels()).toEqual(['Oversikt', 'Menigheter', 'Filer'])
    expect(await screen.findByRole('heading', { name: /^Mine menigheter/ })).toBeTruthy()
    act(() => { location.hash = '#/filer'; window.dispatchEvent(new HashChangeEvent('hashchange')) })
    expect(await screen.findByText(/ikke flyttet til den nye appen ennå/)).toBeTruthy()
    expect(screen.getByRole('link', { name: /Åpne i dagens admin/ }).getAttribute('href')).toBe('/admin#/filer')
  })
  it('engelsk: tekstene fra dagens ordbok', async () => {
    setLang('en')
    setup(DEV)
    expect(screen.getByRole('heading', { level: 1, name: 'Welcome, Dev Eloper' })).toBeTruthy()
    expect(navLabels()).toContain('Users')
    setLang('no')
  })
})

describe('Brukere og invitasjon (ADM-02, ADM-05)', () => {
  it('søk og detalj: rolleoppsummering, medlemskap og Developer-handlinger', async () => {
    setup(DEV)
    act(() => { location.hash = '#/brukere'; window.dispatchEvent(new HashChangeEvent('hashchange')) })
    await screen.findByText('2 av 2 brukere')
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '912' } })
    expect(screen.getByText('1 av 2 brukere')).toBeTruthy()
    fireEvent.click(screen.getByText('Ola Nordmann'))
    const drawer = await screen.findByRole('dialog', { name: 'Ola Nordmann' })
    expect(within(drawer).getByText('Bruker', { selector: 'dd' })).toBeTruthy()
    expect(within(drawer).getByRole('button', { name: 'Gjør til admin' })).toBeTruthy()
    expect(within(drawer).getByRole('button', { name: 'Gjør til moderator' })).toBeTruthy()
    expect(within(drawer).getByRole('button', { name: 'Deaktiver konto' })).toBeTruthy()
  })
  it('fjerning spør først; avbrutt gir ingen endring og ingen feilmelding', async () => {
    const { data } = setup(DEV)
    act(() => { location.hash = '#/brukere/u1'; window.dispatchEvent(new HashChangeEvent('hashchange')) })
    const drawer = await screen.findByRole('dialog', { name: 'Ola Nordmann' })
    vi.stubGlobal('confirm', vi.fn(() => false))
    fireEvent.click(within(drawer).getByRole('button', { name: 'Fjern fra menigheten' }))
    await waitFor(() => expect(window.confirm).toHaveBeenCalled())
    expect(data.rpc).not.toHaveBeenCalledWith('remove_membership', expect.anything())
    expect(screen.queryByRole('status')).toBe(null)
    vi.unstubAllGlobals()
  })
  it('«Ny invitasjon»: Developer kan invitere alle roller; sendes via serveren', async () => {
    const { server } = setup(DEV)
    await screen.findByText('Hendelser siste døgn')
    fireEvent.click(screen.getByRole('button', { name: '+ Ny invitasjon' }))
    const dlg = screen.getByRole('dialog', { name: 'Ny invitasjon' })
    expect(within(dlg).getAllByRole('option').map((o) => o.textContent)).toEqual(['Bruker', 'Admin', 'Moderator', 'Developer', 'Menighet A'])
    fireEvent.change(within(dlg).getByLabelText('E-postadresse'), { target: { value: 'ny@b.no' } })
    fireEvent.click(within(dlg).getByRole('button', { name: 'Send invitasjon' }))
    await waitFor(() => expect(server).toHaveBeenCalledWith('tok', 'invite.create', { email: 'ny@b.no', role: 'user', church_id: 'c1' }))
    expect((await screen.findByRole('status')).textContent).toBe('Invitasjonen er sendt til ny@b.no.')
  })
})
