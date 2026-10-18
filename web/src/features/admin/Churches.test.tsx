import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ChurchDetail, ChurchesView, InvitesView } from './Churches'
import { ADM, DEV, setupAdmin, USR } from './testkit'

/** Komponenttester med falsk database og server (se testkit.tsx). */
const sections = {
  menigheter: ({ id, sub }: { id?: string | undefined; sub?: string | undefined }) => (id ? <ChurchDetail id={id} tab={sub} /> : <ChurchesView />),
  invitasjoner: () => <InvitesView />,
}
afterEach(() => vi.unstubAllGlobals())

describe('Menigheter (ADM-03)', () => {
  it('Developer: alle menigheter med medlemmer, admin, lagring og status; ny menighet åpnes etter opprettelse', async () => {
    const { data } = setupAdmin(DEV, { hash: '#/menigheter', sections })
    const rows = await screen.findAllByRole('row')
    expect(rows[0]?.textContent).toContain('Lagring')
    const a = rows.find((r) => r.textContent?.includes('Menighet A'))
    expect(a?.textContent).toContain('3 medlemmer')
    expect(a?.textContent).toContain('Ada Admin')
    await waitFor(() => expect(a?.textContent).toContain('50.0 MB / 200 MB'))
    expect(rows.find((r) => r.textContent?.includes('Menighet B'))?.textContent).toContain('Egen kvote')
    fireEvent.change(screen.getByLabelText('Navn på ny menighet'), { target: { value: 'Ny menighet' } })
    fireEvent.click(screen.getByRole('button', { name: 'Opprett menighet' }))
    await waitFor(() => expect(data.insert).toHaveBeenCalledWith('churches', { name: 'Ny menighet' }, 'id, name, status'))
    await waitFor(() => expect(location.hash).toBe('#/menigheter/c9'))
  })
  it('Admin: ingen «Ny menighet» og ingen lagringskolonne', async () => {
    setupAdmin(ADM, { hash: '#/menigheter', sections })
    const rows = await screen.findAllByRole('row')
    expect(rows[0]?.textContent).not.toContain('Lagring')
    expect(screen.queryByText('Ny menighet')).toBe(null)
  })
  it('User: bare Filer-fanen i menigheten (Fellesmappe)', async () => {
    setupAdmin(USR, { hash: '#/menigheter/c1', sections })
    expect(await screen.findByRole('link', { name: /Fellesmappe/ })).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Medlemmer' })).toBe(null)
  })
})

describe('Medlemmer i menigheten (ADM-04)', () => {
  it('liste med Admin-merke, ekstra Admin for stab, og melding til alle', async () => {
    const { data } = setupAdmin(DEV, { hash: '#/menigheter/c1/medlemmer', sections, rpc: (fn) => (fn === 'send_church_message' ? 3 : undefined) })
    expect(await screen.findByText('Legg meg til som ekstra Admin')).toBeTruthy()
    const ada = screen.getAllByRole('row').find((r) => r.textContent?.includes('Ada Admin'))
    expect(ada?.textContent).toContain('Admin')
    expect(within(ada as HTMLElement).getByRole('button', { name: 'Fjern admin-rollen' })).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Tittel'), { target: { value: 'Velkommen' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send melding' }))
    await waitFor(() => expect(data.rpc).toHaveBeenCalledWith('send_church_message', { p_church: 'c1', p_title: 'Velkommen', p_body: null }))
    expect((await screen.findByRole('status')).textContent).toBe('Meldingen er sendt til 3 medlemmer.')
  })
  it('ekstra Admin spør først; avbrutt gir ingen endring', async () => {
    const { data } = setupAdmin(DEV, { hash: '#/menigheter/c1/medlemmer', sections })
    vi.stubGlobal('confirm', vi.fn(() => false))
    fireEvent.click(await screen.findByRole('button', { name: 'Legg meg til som ekstra Admin' }))
    await waitFor(() => expect(window.confirm).toHaveBeenCalled())
    expect(data.rpc).not.toHaveBeenCalledWith('add_self_as_admin', expect.anything())
  })
})

describe('Menighetens innstillinger (ADM-03)', () => {
  it('Developer: navn, egen kvote (0–10240), tilbakestill, overbooking-varsel og status', async () => {
    const { data } = setupAdmin(DEV, { hash: '#/menigheter/c2/innstillinger', sections, rpc: (fn) => (fn === 'storage_overview' ? { quota_sum_mb: 1200, limit_mb: 1000 } : undefined) })
    const q = await screen.findByLabelText('Egen kvote (MB, 0–10240)')
    fireEvent.change(q, { target: { value: '300' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lagre egen kvote' }))
    await waitFor(() => expect(data.rpc).toHaveBeenCalledWith('set_church_quota', { p_church: 'c2', p_quota_mb: 300 }))
    expect(screen.getByRole('button', { name: 'Tilbakestill til standard (200 MB)' })).toBeTruthy()
    expect(await screen.findByText(/Summen av alle menighetenes kvoter/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Slett for godt' })).toBeTruthy()
  })
  it('«Slett for godt» krever navnet; avbrutt sender ingenting; ellers via serveren med navnet', async () => {
    const { server } = setupAdmin(DEV, { hash: '#/menigheter/c2/innstillinger', sections })
    vi.stubGlobal('prompt', vi.fn(() => null))
    fireEvent.click(await screen.findByRole('button', { name: 'Slett for godt' }))
    await waitFor(() => expect(window.prompt).toHaveBeenCalled())
    expect(server).not.toHaveBeenCalledWith('tok', 'church.purge', expect.anything())
    vi.stubGlobal('prompt', vi.fn(() => 'Menighet B'))
    fireEvent.click(screen.getByRole('button', { name: 'Slett for godt' }))
    await waitFor(() => expect(server).toHaveBeenCalledWith('tok', 'church.purge', { church_id: 'c2', confirm_name: 'Menighet B' }))
  })
  it('Admin: logo og eksport, men ikke kvote eller status; logo lastes opp til Logoer og velges', async () => {
    const { files, data } = setupAdmin(ADM, { hash: '#/menigheter/c1/innstillinger', sections })
    expect(await screen.findByText('Eksport')).toBeTruthy()
    expect(screen.queryByText('Navn og lagring')).toBe(null)
    expect(screen.queryByText('Status og sletting')).toBe(null)
    const file = new File([new Uint8Array([137, 80, 78, 71])], 'logo.png', { type: 'image/png' })
    fireEvent.change(screen.getByLabelText('Last opp logo', { selector: 'input' }), { target: { files: [file] } })
    await waitFor(() => expect(files.upload).toHaveBeenCalledWith(file, { churchId: 'c1', folder: 'logoer' }))
    await waitFor(() => expect(data.rpc).toHaveBeenCalledWith('set_church_logo', { p_church: 'c1', p_file: 'f-logo' }))
  })
})

describe('Logo for stab uten Admin-rolle', () => {
  it('ser logoen og en forklaring, men ingen opplasting (databasen krever Admin-rollen)', async () => {
    const { files } = setupAdmin(DEV, { hash: '#/menigheter/c1/innstillinger', sections })
    expect(await screen.findByText(/Som Developer eller Moderator kan du legge deg til som ekstra Admin/)).toBeTruthy()
    expect(screen.queryByLabelText('Last opp logo', { selector: 'input' })).toBe(null)
    expect(screen.queryByRole('button', { name: /Last opp logo|Bytt logo/ })).toBe(null)
    expect(files.upload).not.toHaveBeenCalled()
  })
})

describe('Invitasjoner (ADM-05)', () => {
  const invites = [
    { id: 'i1', email: 'venter@b.no', church_id: 'c1', role: 'user', status: 'pending', expires_at: '2099-01-01', created_at: '2026-10-01', accepted_at: null },
    { id: 'i2', email: 'utlopt@b.no', church_id: 'c1', role: 'user', status: 'pending', expires_at: '2020-01-01', created_at: '2019-12-01', accepted_at: null },
    { id: 'i3', email: 'godtatt@b.no', church_id: 'c1', role: 'church_admin', status: 'accepted', expires_at: '2099-01-01', created_at: '2026-09-01', accepted_at: '2026-09-02' },
  ]
  it('ventende som standard, filter på status; send på nytt via serveren og varsel når e-posten ikke ble sendt', async () => {
    const { server } = setupAdmin(DEV, { hash: '#/invitasjoner', sections, tables: { invitations: invites }, server: (a) => (a === 'invite.resend' ? { ok: true, email_sent: false } : undefined) })
    expect(await screen.findByText('venter@b.no')).toBeTruthy()
    expect(screen.queryByText('utlopt@b.no')).toBe(null)
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'expired' } })
    expect(screen.getByText('utlopt@b.no')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Send på nytt' }))
    await waitFor(() => expect(server).toHaveBeenCalledWith('tok', 'invite.resend', { id: 'i2' }))
    expect((await screen.findByRole('status')).textContent).toBe('Ny lenke er laget, men e-posten kunne ikke sendes.')
  })
})
