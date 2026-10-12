import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ADM, DEV, setupAdmin } from './testkit'

/** Komponenttester med falsk database og server (se testkit.tsx): Samarbeid, Abonnement og Logg. */
afterEach(() => vi.unstubAllGlobals())

const GROUPS = [
  { id: 'g1', name: 'Påske', description: 'Felles påske', status: 'active', created_at: '2026-03-01', ended_at: null, my_church: true, copies: 2, bytes: 2097152,
    members: [{ church_id: 'c1', name: 'Menighet A', status: 'active', joined_at: '2026-03-01', copies: 2, bytes: 2097152 }, { church_id: 'c2', name: 'Menighet B', status: 'active', joined_at: '2026-03-01', copies: 0, bytes: 0 }] },
  { id: 'g2', name: 'Gammel', description: null, status: 'ended', created_at: '2025-01-01', ended_at: '2025-06-01', my_church: false, members: [] },
]
const META = [{ id: 'f1', church_id: 'c1', file_name: 'plakat.png', file_size: 1048576, created_at: '2026-03-02' }]
const groupRpc = (fn: string) => (fn === 'my_groups' ? GROUPS : fn === 'church_directory' ? [{ id: 'c1', name: 'Menighet A' }, { id: 'c2', name: 'Menighet B' }, { id: 'c3', name: 'Menighet C' }] : fn === 'link_files_meta' ? META : fn === 'create_group' ? 'g9' : undefined)

describe('Samarbeid (ADM-08)', () => {
  it('ny gruppe krever navn og 2–20 menigheter; grupper og valgt gruppe med medlemmer og filnavn (aldri innhold)', async () => {
    const { data } = setupAdmin(DEV, { hash: '#/samarbeid', rpc: groupRpc })
    expect(await screen.findByText('plakat.png')).toBeTruthy()
    const form = screen.getByText('Opprett gruppe').closest('form') as HTMLElement
    const create = within(form).getByRole('button', { name: 'Opprett gruppe' }) as HTMLButtonElement
    fireEvent.change(within(form).getByLabelText('Navn'), { target: { value: 'Jul' } })
    fireEvent.click(within(form).getByLabelText('Menighet A'))
    expect(create.disabled).toBe(true)
    fireEvent.click(within(form).getByLabelText('Menighet C'))
    expect(screen.getByText('2 valgt – velg 2 til 20 menigheter.')).toBeTruthy()
    fireEvent.click(create)
    await waitFor(() => expect(data.rpc).toHaveBeenCalledWith('create_group', { p_name: 'Jul', p_description: null, p_churches: ['c1', 'c3'] }))
    // to menigheter: kan ikke fjerne flere (minst to)
    expect(screen.getByText(/En gruppe må ha minst to menigheter/)).toBeTruthy()
    expect(within(screen.getByText('Menigheter i gruppen', { exact: false }).closest('section') as HTMLElement).getAllByRole('button', { name: 'Fjern' }).every((b) => (b as HTMLButtonElement).disabled)).toBe(true)
  })
  it('sletting av avsluttet gruppe viser antall kopier i bekreftelsen og går via serveren', async () => {
    const { server } = setupAdmin(DEV, { hash: '#/samarbeid', rpc: groupRpc, server: (a) => (a === 'link.delete' ? { ok: true, copies: 1 } : undefined) })
    const confirm = vi.fn(() => true)
    vi.stubGlobal('confirm', confirm)
    fireEvent.click(await screen.findByRole('button', { name: 'Slett' }))
    await waitFor(() => expect(server).toHaveBeenCalledWith('tok', 'link.delete', { link_id: 'g2' }))
    expect(confirm.mock.calls[0]?.[0]).toMatch(/1 kopier i Samarbeidsfiler \(1.0 MB\) slettes også/)
    expect((await screen.findByRole('status')).textContent).toBe('Samarbeidsgruppen «Gammel» er slettet. 1 kopier er fjernet.')
  })
  it('avslutning spør først; avbrutt gir ingen endring', async () => {
    const { data } = setupAdmin(DEV, { hash: '#/samarbeid', rpc: groupRpc })
    vi.stubGlobal('confirm', vi.fn(() => false))
    fireEvent.click(await screen.findByRole('button', { name: 'Avslutt' }))
    await waitFor(() => expect(window.confirm).toHaveBeenCalled())
    expect(data.rpc).not.toHaveBeenCalledWith('end_link', expect.anything())
  })
})

describe('Abonnement (ADM-09)', () => {
  const subsRpc = (fn: string) => (fn === 'plans_admin' ? [{ code: 'standard', name: 'Standard', price_nok_month: null, active: true, storage_quota_mb: 200 }]
    : fn === 'storage_overview' ? { used_bytes: 600 * 1048576, limit_mb: 1000, quota_sum_mb: 1200, churches: 2 } : undefined)
  it('Developer: samlet lagring med overbooking, planendring med bekreftelse, og avgjørelse av forespørsler', async () => {
    const reqs = [{ id: 's1', church_id: 'c1', plan: 'standard', free_of_charge: true, reason: 'Liten menighet', status: 'pending', decision_note: null, created_at: '2026-10-01', decided_at: null }]
    const { data } = setupAdmin(DEV, { hash: '#/abonnement', rpc: subsRpc, tables: { subscription_requests: reqs } })
    expect((await screen.findByText(/Brukt: 600.0 MB av 1000 MB/)).textContent).toContain('(60 %)')
    expect(screen.getByText('Overbooket')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Endre' }))
    fireEvent.change(screen.getByLabelText('Pris (kr/mnd, tom = Avtales)'), { target: { value: '99' } })
    vi.stubGlobal('confirm', vi.fn(() => true))
    fireEvent.click(screen.getByRole('button', { name: 'Lagre plan' }))
    await waitFor(() => expect(data.rpc).toHaveBeenCalledWith('update_plan', { p_plan: 'standard', p_quota_mb: 200, p_price_nok_month: 99, p_update_churches: false }))
    expect((window.confirm as unknown as ReturnType<typeof vi.fn>).mock.calls[0]?.[0]).toMatch(/Pris: Avtales → 99 kr\/mnd/)
    fireEvent.click(screen.getByRole('button', { name: 'Godkjenn' }))
    await waitFor(() => expect(data.rpc).toHaveBeenCalledWith('decide_subscription_request', { p_id: 's1', p_approve: true, p_note: null }))
  })
  it('Admin: menighetens lagring og forespørsel om abonnement; ingen planendring', async () => {
    const { data } = setupAdmin(ADM, { hash: '#/abonnement', rpc: (fn) => (fn === 'storage_usage' ? { quota_bytes: 200 * 1048576, used_bytes: 50 * 1048576, system_free_bytes: null } : undefined), tables: { plans: [{ code: 'standard', name: 'Standard', price_nok_month: 0, active: true }] } })
    expect((await screen.findByText(/Brukt: 50.0 MB/)).textContent).toContain('Ledig: 150.0 MB')
    expect(screen.queryByRole('button', { name: 'Endre' })).toBe(null)
    fireEvent.change(screen.getByLabelText('Begrunnelse (valgfritt)'), { target: { value: 'Vi trenger mer' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send forespørsel' }))
    await waitFor(() => expect(data.rpc).toHaveBeenCalledWith('request_subscription', { p_church: 'c1', p_plan: 'standard', p_free: true, p_reason: 'Vi trenger mer' }))
  })
})

describe('Logg (ADM-10)', () => {
  it('søk og type; navn på hendelser og hvem', async () => {
    const audit = [
      { id: 'l1', actor_user_id: 'd1', action: 'memberships.insert', church_id: 'c1', created_at: '2026-10-01T10:00:00Z', target_type: null, meta: null, reason: null },
      { id: 'l2', actor_user_id: 'a1', action: 'user_roles.insert', church_id: 'c1', created_at: '2026-10-02T10:00:00Z', target_type: null, meta: { role: 'church_admin' }, reason: 'Admin-siden' },
    ]
    setupAdmin(DEV, { hash: '#/logg', tables: { audit_logs: audit } })
    expect(await screen.findByText('Medlem lagt til')).toBeTruthy()
    expect(screen.getByText('Rolle gitt')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'user_roles' } })
    expect(screen.queryByText('Medlem lagt til')).toBe(null)
    fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'all' } })
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'ada' } })
    expect(screen.getByText('Rolle gitt')).toBeTruthy()
    expect(screen.queryByText('Medlem lagt til')).toBe(null)
  })
})
