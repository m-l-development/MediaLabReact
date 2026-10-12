import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ADM, DEV, setupAdmin } from './testkit'

/** Komponenttester med falsk database (se testkit.tsx): innboksen for tilbakemeldinger (ADM-12). */
afterEach(() => vi.unstubAllGlobals())

const CASES = [
  { id: 'f1', ref: 'TB-AAA111', kind: 'bug', title: 'Eksport stopper', description: 'Stopper på 98 %', app: 'photo-design', app_name: 'Photo Design', page: '/app/photo-design', view: '', status: 'new', created_at: '2026-10-10T10:00:00Z', submitter_name: 'Ola', church_name: 'Menighet A', context: { env: 'preview', errors: [{ kind: 'JS-feil', message: 'x' }] }, marked: { mode: 'element', rect: { x: 1, y: 2, w: 3, h: 4 }, viewport: '1440×900', element: { tag: 'button', label: 'Eksporter' } } },
  { id: 'f2', ref: 'TB-BBB222', kind: 'feature', title: null, description: 'Mørk eksport', app: 'loop-studio', app_name: 'Loop Studio', page: '/app/loop-studio', view: '', status: 'resolved', created_at: '2026-10-09T10:00:00Z', submitter_name: 'Kari', church_name: null, context: { env: 'production' }, marked: null },
]
const rpc = (fn: string) => (fn === 'feedback_list' ? CASES : fn === 'feedback_events_for' ? [] : undefined)

describe('Tilbakemeldinger (ADM-12)', () => {
  it('filtre på kategori og miljø; søk i referanse og tekst', async () => {
    setupAdmin(DEV, { hash: '#/tilbakemeldinger', rpc })
    expect(await screen.findByText('TB-AAA111')).toBeTruthy()
    expect(screen.getByText('2 saker vises')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Kategori'), { target: { value: 'feature' } })
    expect(screen.queryByText('TB-AAA111')).toBe(null)
    fireEvent.change(screen.getByLabelText('Kategori'), { target: { value: 'all' } })
    fireEvent.change(screen.getByLabelText('Miljø'), { target: { value: 'preview' } })
    expect(screen.queryByText('TB-BBB222')).toBe(null)
    fireEvent.change(screen.getByLabelText('Miljø'), { target: { value: 'all' } })
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'mørk' } })
    expect(screen.getByText('1 saker vises')).toBeTruthy()
  })
  it('«Kopier sak» legger strukturert, renset tekst på utklippstavlen uten å endre saken', async () => {
    const writeText = vi.fn(async (_t: string) => undefined)
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } })
    vi.stubGlobal('isSecureContext', true)
    const { data } = setupAdmin(DEV, { hash: '#/tilbakemeldinger', rpc })
    await screen.findByText('TB-AAA111')
    fireEvent.click(screen.getAllByRole('button', { name: 'Kopier sak' })[0] as HTMLElement)
    await waitFor(() => expect(writeText).toHaveBeenCalled())
    const text = writeText.mock.calls[0]?.[0] ?? ''
    expect(text).toMatch(/^# Tilbakemelding TB-AAA111 – oppgave for Claude Code/)
    expect(text).not.toContain('Ola')
    expect((await screen.findByRole('status')).textContent).toBe('Saken er kopiert og klar til å limes inn i Claude Code.')
    expect(data.rpc).not.toHaveBeenCalledWith('set_feedback_status', expect.anything())
  })
  it('saken: avvisning krever begrunnelse; notat lagres; fjerning (arkivering) spør først', async () => {
    const { data } = setupAdmin(DEV, { hash: '#/tilbakemeldinger/f1', rpc })
    const drawer = await screen.findByRole('dialog', { name: /TB-AAA111/ })
    expect(within(drawer).getByText('Stopper på 98 %')).toBeTruthy()
    expect(within(drawer).getByText(/<button> «Eksporter»/)).toBeTruthy()
    fireEvent.change(within(drawer).getByLabelText('Status'), { target: { value: 'rejected' } })
    fireEvent.click(within(drawer).getByRole('button', { name: 'Lagre status' }))
    expect((await screen.findByRole('status')).textContent).toBe('Skriv en begrunnelse for avvisningen.')
    expect(data.rpc).not.toHaveBeenCalledWith('set_feedback_status', expect.anything())
    fireEvent.change(within(drawer).getByLabelText(/Internt notat/), { target: { value: 'Gjenskapt' } })
    fireEvent.click(within(drawer).getByRole('button', { name: 'Lagre notat' }))
    await waitFor(() => expect(data.rpc).toHaveBeenCalledWith('add_feedback_note', { p_id: 'f1', p_note: 'Gjenskapt' }))
    vi.stubGlobal('confirm', vi.fn(() => false))
    fireEvent.click(within(drawer).getByRole('button', { name: 'Fjern saken fra innboksen' }))
    await waitFor(() => expect(window.confirm).toHaveBeenCalled())
    expect(data.rpc).not.toHaveBeenCalledWith('archive_feedback', expect.anything())
  })
  it('Admin har ikke innboksen (kontrollert avvisning)', async () => {
    setupAdmin(ADM, { hash: '#/tilbakemeldinger', rpc })
    expect(await screen.findByRole('heading', { name: 'Ingen tilgang' })).toBeTruthy()
  })
})
