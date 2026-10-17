import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEV, setupAdmin } from './testkit'

/** Komponenttester med falsk database og server (se testkit.tsx): Opprydning og Forespørsler. */
afterEach(() => vi.unstubAllGlobals())

describe('Opprydning (ADM-13)', () => {
  const ov = [
    { church_id: 'c1', church_name: 'Menighet A', candidates: 2, candidate_bytes: 3 * 1048576, ready: 1, ready_bytes: 1048576, queue_pending: 0, queue_failed: 0, can_view: true },
    { church_id: 'c2', church_name: 'Menighet B', candidates: 1, candidate_bytes: 2048, ready: 1, ready_bytes: 2048, queue_pending: 0, queue_failed: 1, can_view: false },
  ]
  const files = [
    { id: 'p1', file_name: 'gammel.png', file_size: 1048576, uploaded_at: '2026-01-01', former_member: 'Per', removed_at: '2026-05-01', ready: true, reason: null },
    { id: 'p2', file_name: 'logo.png', file_size: 2 * 1048576, uploaded_at: '2026-01-02', former_member: 'Per', removed_at: '2026-05-01', ready: false, reason: 'Brukes som logo' },
  ]
  const rpc = (fn: string) => (fn === 'cleanup_overview' ? ov : fn === 'cleanup_candidates' ? files : undefined)
  it('oversikt med totalsum; filnavn bare for menigheter der du er medlem', async () => {
    setupAdmin(DEV, { hash: '#/opprydning', rpc })
    expect(await screen.findByText(/Totalt 3 filer/)).toBeTruthy()
    expect(screen.getByText('Bare for medlemmer av menigheten', { exact: false })).toBeTruthy()
    expect(screen.queryByText('gammel.png')).toBe(null)
  })
  it('bare klare filer kan velges; sletting spør først og sender forventet antall og størrelse til serveren', async () => {
    const { server } = setupAdmin(DEV, { hash: '#/opprydning/c1', rpc, server: (a) => (a === 'file.cleanup' ? { ok: true, count: 1, bytes: 1048576 } : undefined) })
    expect(await screen.findByText('gammel.png')).toBeTruthy()
    expect((screen.getByLabelText('Velg logo.png') as HTMLInputElement).disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Velg alle klare' }))
    expect(screen.getByText('Valgt: 1 filer · 1.0 MB')).toBeTruthy()
    vi.stubGlobal('confirm', vi.fn(() => false))
    fireEvent.click(screen.getByRole('button', { name: 'Slett valgte filer' }))
    await waitFor(() => expect(window.confirm).toHaveBeenCalled())
    expect(server).not.toHaveBeenCalledWith('tok', 'file.cleanup', expect.anything())
    vi.stubGlobal('confirm', vi.fn(() => true))
    fireEvent.click(screen.getByRole('button', { name: 'Slett valgte filer' }))
    await waitFor(() => expect(server).toHaveBeenCalledWith('tok', 'file.cleanup', { church_id: 'c1', ids: ['p1'], expected_count: 1, expected_bytes: 1048576 }))
    expect((await screen.findByRole('status')).textContent).toBe('1 filer er slettet (1.0 MB).')
  })
})

describe('Forespørsler (ADM-06)', () => {
  const reqs = [
    { id: 'q1', name: 'Kari Ny', phone: '91234567', email: 'kari@b.no', church_text: 'Menighet A', status: 'new', created_at: '2026-10-10T10:00:00Z', resubmits: 0, anonymized: false, existing_user_id: null, existing_user_name: null, decided_at: null, decided_by_name: null, decision_note: null },
    { id: 'q2', name: 'Ola', phone: null, email: 'ola@b.no', church_text: null, status: 'new', created_at: '2026-10-09T10:00:00Z', resubmits: 1, anonymized: false, existing_user_id: 'u1', existing_user_name: 'Ola Nordmann', decided_at: null, decided_by_name: null, decision_note: null },
    { id: 'q3', name: 'Avslått', phone: null, email: 'x@b.no', church_text: null, status: 'rejected', created_at: '2026-10-01T10:00:00Z', resubmits: 0, anonymized: false, existing_user_id: null, existing_user_name: null, decided_at: '2026-10-02', decided_by_name: 'Dev', decision_note: 'spam' },
  ]
  const rpc = (fn: string) => (fn === 'account_requests_list' ? reqs : fn === 'account_request_events_for' ? [{ kind: 'submitted', created_at: '2026-10-10T10:00:00Z' }] : undefined)
  it('åpne som standard; eksisterende konto sperrer «Opprett bruker»', async () => {
    setupAdmin(DEV, { hash: '#/foresporsler/q2', rpc })
    expect(await screen.findByText('Kari Ny')).toBeTruthy()
    expect(screen.queryByText('Avslått', { selector: 'b' })).toBe(null)
    expect(await screen.findByText(/E-postadressen har allerede en konto/)).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Opprett bruker' }) as HTMLButtonElement).disabled).toBe(true)
  })
  it('«Opprett bruker» i eksisterende menighet via serveren; avslag krever begrunnelse', async () => {
    const { server, data } = setupAdmin(DEV, { hash: '#/foresporsler/q1', rpc, server: (a) => (a === 'request.approve' ? { ok: true, email_sent: true } : undefined) })
    fireEvent.click(await screen.findByRole('button', { name: 'Opprett bruker' }))
    const dlg = screen.getByRole('dialog', { name: 'Opprett bruker' })
    const go = within(dlg).getByRole('button', { name: 'Opprett og send invitasjon' }) as HTMLButtonElement
    expect(go.disabled).toBe(true)
    fireEvent.change(within(dlg).getByLabelText('Menighet'), { target: { value: 'c1' } })
    fireEvent.click(go)
    await waitFor(() => expect(server).toHaveBeenCalledWith('tok', 'request.approve', { id: 'q1', mode: 'existing', church_name: 'Menighet A', church_id: 'c1', role: 'user' }))
    expect((await screen.findByRole('status')).textContent).toMatch(/Invitasjonen er sendt/)
    vi.stubGlobal('prompt', vi.fn(() => ' '))
    fireEvent.click(screen.getByRole('button', { name: 'Avslå' }))
    await waitFor(() => expect(window.prompt).toHaveBeenCalled())
    expect(data.rpc).not.toHaveBeenCalledWith('reject_account_request', expect.anything())
  })
  it('valg C (uten menighet) gir bare stabsroller', async () => {
    setupAdmin(DEV, { hash: '#/foresporsler/q1', rpc })
    fireEvent.click(await screen.findByRole('button', { name: 'Opprett bruker' }))
    const dlg = screen.getByRole('dialog', { name: 'Opprett bruker' })
    fireEvent.click(within(dlg).getByLabelText(/C\. Uten menighet/))
    expect(within(dlg).getAllByRole('option').map((o) => o.textContent)).toEqual(['Moderator', 'Developer'])
  })
})
