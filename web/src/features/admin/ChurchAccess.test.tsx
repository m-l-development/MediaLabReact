import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ChurchDetail, ChurchesView } from './Churches'
import { ADM, DEV, setupAdmin } from './testkit'

/** Midlertidig Admin-tilgang og ny menighet med logo i grensesnittet (falsk database og server, se testkit.tsx). */
const sections = {
  menigheter: ({ id, sub }: { id?: string | undefined; sub?: string | undefined }) => (id ? <ChurchDetail id={id} tab={sub} /> : <ChurchesView />),
}
afterEach(() => vi.unstubAllGlobals())

const PENDING = { id: 'q1', user_id: 'd1', name: 'Dev Eloper', email: 'dev@b.no', role: 'developer', created_at: '2026-10-19T10:00:00Z' }
const overview = (o: Record<string, unknown> = {}) => ({ pending: [], active: [], recent: [], has_admin: true, ...o })
const rpcWith = (ov: Record<string, unknown>, mine: unknown[] = []) => (fn: string) => (fn === 'admin_access_overview' ? ov : fn === 'my_admin_access' ? mine : undefined)

describe('Developer/Moderator: midlertidig Admin-tilgang', () => {
  it('menigheten har Admin: forespørselen sendes (ingen varighet – Admin velger)', async () => {
    const { data } = setupAdmin(DEV, { hash: '#/menigheter/c1/medlemmer', sections, rpc: (fn) => (fn === 'request_admin_access' ? { state: 'pending' } : rpcWith(overview())(fn)) })
    fireEvent.click(await screen.findByRole('button', { name: 'Send forespørsel om midlertidig admin-tilgang' }))
    await waitFor(() => expect(data.rpc).toHaveBeenCalledWith('request_admin_access', { p_church: 'c1', p_duration: null }))
    expect((await screen.findByRole('status')).textContent).toContain('Forespørsel sendt – venter på svar.')
  })

  it('ventende forespørsel: «Forespørsel sendt – venter på svar»', async () => {
    setupAdmin(DEV, { hash: '#/menigheter/c1/medlemmer', sections, rpc: rpcWith(overview(), [{ church_id: 'c1', state: 'pending', id: 'q1' }]) })
    expect((await screen.findByRole('status')).textContent).toContain('Forespørsel sendt – venter på svar.')
  })

  it('avslått: «Avslått av menighetsadmin» og ny forespørsel kan sendes', async () => {
    setupAdmin(DEV, { hash: '#/menigheter/c1/medlemmer', sections, rpc: rpcWith(overview(), [{ church_id: 'c1', state: 'rejected', id: 'q1' }]) })
    expect((await screen.findByRole('status')).textContent).toContain('Avslått av menighetsadmin.')
    expect(screen.getByRole('button', { name: 'Send forespørsel om midlertidig admin-tilgang' })).toBeTruthy()
  })

  it('venter → godkjent: status hentes på nytt og siden lastes på nytt med Admin-rettighetene', async () => {
    const reload = vi.fn()
    vi.stubGlobal('location', { ...location, reload })
    let mine: unknown[] = [{ church_id: 'c1', state: 'pending', id: 'q1' }]
    setupAdmin(DEV, { hash: '#/menigheter/c1/medlemmer', sections, rpc: (fn) => rpcWith(overview(), mine)(fn) })
    await screen.findByText('Forespørsel sendt – venter på svar.')
    expect(reload).not.toHaveBeenCalled()
    mine = [{ church_id: 'c1', state: 'active', expires_at: '2026-11-18T10:00:00Z', duration: '30d' }]
    document.dispatchEvent(new Event('visibilitychange'))
    await waitFor(() => expect(reload).toHaveBeenCalled())
  })

  it('aktiv midlertidig tilgang: utløpsdato og «Gi fra meg tilgangen» (med bekreftelse)', async () => {
    const { data } = setupAdmin(DEV, { hash: '#/menigheter/c1/medlemmer', sections, rpc: rpcWith(overview(), [{ church_id: 'c1', state: 'active', expires_at: '2026-11-18T10:00:00Z', duration: '30d' }]) })
    expect(await screen.findByText('Godkjent – du har nå midlertidig admin-tilgang.')).toBeTruthy()
    expect(screen.getByText(/Tilgangen varer til 18\.11\.2026/)).toBeTruthy()
    vi.stubGlobal('confirm', vi.fn(() => false))
    fireEvent.click(screen.getByRole('button', { name: 'Gi fra meg tilgangen' }))
    await waitFor(() => expect(window.confirm).toHaveBeenCalled())
    expect(data.rpc).not.toHaveBeenCalledWith('revoke_admin_access', expect.anything())
  })

  it('uten Admin: velger varighet selv (alle fem valgene) og får tilgang med en gang', async () => {
    const reload = vi.fn()
    vi.stubGlobal('location', { ...location, reload })
    const { data } = setupAdmin(DEV, { hash: '#/menigheter/c1/medlemmer', sections, rpc: (fn) => (fn === 'request_admin_access' ? { state: 'granted' } : rpcWith(overview({ has_admin: false }))(fn)) })
    const group = await screen.findByRole('radiogroup', { name: 'Varighet' })
    expect(within(group).getAllByRole('radio').map((r) => (r as HTMLInputElement).value)).toEqual(['1d', '30d', '6m', '1y', 'indef'])
    fireEvent.click(within(group).getByLabelText('1 år'))
    vi.stubGlobal('confirm', vi.fn(() => true))
    fireEvent.click(screen.getByRole('button', { name: 'Legg meg til som ekstra admin' }))
    await waitFor(() => expect(data.rpc).toHaveBeenCalledWith('request_admin_access', { p_church: 'c1', p_duration: '1y' }))
  })
})

describe('Admin i menigheten: godkjenning, avslag og fjerning', () => {
  it('ventende forespørsel: rød X avslår (etter bekreftelse); grønn hake åpner dialogen', async () => {
    const { data } = setupAdmin(ADM, { hash: '#/menigheter/c1/medlemmer', sections, rpc: (fn) => (fn === 'decide_admin_access' ? { status: 'rejected' } : rpcWith(overview({ pending: [PENDING] }))(fn)) })
    const row = await screen.findByText('Dev Eloper', { selector: '[data-ch-access-pending] b' })
    expect(row).toBeTruthy()
    vi.stubGlobal('confirm', vi.fn(() => true))
    fireEvent.click(screen.getByRole('button', { name: 'Avslå Dev Eloper' }))
    await waitFor(() => expect(data.rpc).toHaveBeenCalledWith('decide_admin_access', { p_request: 'q1', p_approve: false, p_duration: null }))
  })

  it('godkjenning: viser hvem og hvilken menighet, krever varighet, og sender valgt varighet (servertid avgjør utløpet)', async () => {
    const { data } = setupAdmin(ADM, { hash: '#/menigheter/c1/medlemmer', sections, rpc: (fn) => (fn === 'decide_admin_access' ? { status: 'approved' } : rpcWith(overview({ pending: [PENDING] }))(fn)) })
    fireEvent.click(await screen.findByRole('button', { name: 'Godkjenn Dev Eloper' }))
    const dlg = await screen.findByRole('dialog', { name: 'Godkjenn Admin-tilgang' })
    expect(dlg.textContent).toContain('Dev Eloper')
    expect(dlg.textContent).toContain('Developer')
    expect(dlg.textContent).toContain('Menighet A')
    const ok = within(dlg).getByRole('button', { name: /Godkjenn/ })
    expect((ok as HTMLButtonElement).disabled).toBe(true) // ingen varighet valgt ennå
    for (const l of ['1 dag', '30 dager', '6 måneder', '1 år', 'Ubestemt tid']) expect(within(dlg).getByLabelText(l)).toBeTruthy()
    fireEvent.click(within(dlg).getByLabelText('Ubestemt tid'))
    expect(dlg.textContent).toContain('Ubestemt tid (fjernes manuelt)')
    fireEvent.click(within(dlg).getByLabelText('6 måneder'))
    expect((ok as HTMLButtonElement).disabled).toBe(false)
    fireEvent.click(ok)
    await waitFor(() => expect(data.rpc).toHaveBeenCalledWith('decide_admin_access', { p_request: 'q1', p_approve: true, p_duration: '6m' }))
    expect(data.rpc.mock.calls.filter((c) => c[0] === 'decide_admin_access')).toHaveLength(1)
  })

  it('aktive midlertidige Admin: rolle, varighet og utløp (eller ubestemt tid), og «Fjern tilgang» med bekreftelse', async () => {
    const active = [
      { user_id: 'd1', name: 'Dev Eloper', email: 'dev@b.no', role: 'developer', granted_at: '2026-10-19T10:00:00Z', duration: '30d', expires_at: '2026-11-18T10:00:00Z', granted_by: 'Ada Admin' },
      { user_id: 'm1', name: 'Mo Derator', email: 'mod@b.no', role: 'moderator', granted_at: '2026-10-19T10:00:00Z', duration: 'indef', expires_at: null, granted_by: 'Ada Admin' },
    ]
    const { data } = setupAdmin(ADM, { hash: '#/menigheter/c1/medlemmer', sections, rpc: rpcWith(overview({ active, recent: [{ id: 'q0', name: 'Mo Derator', role: 'moderator', status: 'rejected', duration: null, auto: false, decided_at: '2026-10-18T10:00:00Z', decided_by: 'Ada Admin' }] })) })
    const dev = await screen.findByText('Dev Eloper', { selector: '[data-ch-access-active] b' })
    const devRow = dev.closest('[data-ch-access-active]') as HTMLElement
    expect(devRow.textContent).toContain('30 dager')
    expect(devRow.textContent).toMatch(/utløper 18\.11\.2026/)
    const modRow = screen.getByText('Mo Derator', { selector: '[data-ch-access-active] b' }).closest('[data-ch-access-active]') as HTMLElement
    expect(modRow.textContent).toContain('Ubestemt tid')
    expect(screen.getByText('Avslått')).toBeTruthy()
    vi.stubGlobal('confirm', vi.fn(() => true))
    fireEvent.click(within(modRow).getByRole('button', { name: 'Fjern tilgang' }))
    await waitFor(() => expect(data.rpc).toHaveBeenCalledWith('revoke_admin_access', { p_church: 'c1', p_user: 'm1' }))
  })
})

describe('Ny menighet med logo (Developer/Moderator)', () => {
  it('forhåndsviser logoen, avviser ikke-bilder, og oppretter via serveren (oppretteren blir ikke Admin)', async () => {
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:logo'), revokeObjectURL: vi.fn() }))
    const { server, data } = setupAdmin(DEV, { hash: '#/menigheter', sections, server: (action) => (action === 'church.create_with_logo' ? { ok: true, church: { id: 'c7', name: 'Logo-menighet', logo_file_id: 'f7' } } : undefined) })
    expect(await screen.findByText(/Du blir ikke Admin i menigheten ved å opprette den/)).toBeTruthy()
    const input = document.querySelector('[data-ch-newlogo-input]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [new File(['<svg/>'], 'logo.svg', { type: 'image/svg+xml' })] } })
    expect((await screen.findByRole('alert')).textContent).toContain('Logoen må være et bilde')
    const png = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], 'logo.png', { type: 'image/png' })
    fireEvent.change(input, { target: { files: [png] } })
    expect(await screen.findByAltText('Forhåndsvisning av logoen')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Navn på ny menighet'), { target: { value: 'Logo-menighet' } })
    fireEvent.click(screen.getByRole('button', { name: 'Opprett menighet' }))
    await waitFor(() => expect(server).toHaveBeenCalledWith('tok', 'church.create_with_logo', null, { raw: png, contentType: 'application/octet-stream', query: { name: 'Logo-menighet', file: 'logo.png' } }))
    expect(data.insert).not.toHaveBeenCalled()
    await waitFor(() => expect(location.hash).toBe('#/menigheter/c7'))
  })
})
