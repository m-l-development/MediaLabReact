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

/** Listene «Nye saker», «Under behandling» og «Arkiv» med egne handlinger. Testdatabasen husker statusendringer. */
describe('Tilbakemeldinger: lister, arkiv og handlinger per liste', () => {
  const base = (id: string, ref: string, status: string, kind = 'bug') => ({ id, ref, kind, title: null, description: 'Tekst ' + ref, app: 'loop-studio', app_name: 'Loop Studio', page: '/app/loop-studio', view: '', status, created_at: '2026-10-10T10:00:00Z', submitter_name: 'Ola', church_name: null, context: { env: 'preview' }, marked: null })
  const fresh = () => [base('n1', 'TB-NY0001', 'new'), base('w1', 'TB-WK0001', 'in_progress', 'feature'), base('w2', 'TB-WK0002', 'needs_info'), base('d1', 'TB-DN0001', 'resolved'), base('d2', 'TB-DN0002', 'rejected', 'feature')]
  const kit = (opts: { failStatus?: boolean } = {}) => {
    const db = fresh()
    return setupAdmin(DEV, { hash: '#/tilbakemeldinger', rpc: (fn, args) => {
      if (fn === 'feedback_list') return db.map((c) => ({ ...c }))
      if (fn === 'feedback_events_for') return []
      if (fn === 'set_feedback_status') {
        if (opts.failStatus) throw new Error('nettverk')
        const c = db.find((x) => x.id === args?.p_id)
        if (c) c.status = String(args?.p_status)
        return true
      }
      if (fn === 'archive_feedback') return true
      return undefined
    } })
  }
  const region = (name: string) => screen.getByRole('region', { name })
  const refsIn = (name: string) => within(region(name)).queryAllByText(/^TB-/).map((e) => e.textContent)
  const count = (name: string) => region(name).querySelector('[data-fb-count]')?.textContent

  it('Ny → «Nye saker», Under behandling/Trenger mer info → «Under behandling», Løst/Avvist → «Arkiv» (bak «Åpne arkiv»)', async () => {
    kit()
    await screen.findByText('TB-NY0001')
    expect(refsIn('Nye saker')).toEqual(['TB-NY0001'])
    expect(refsIn('Under behandling')).toEqual(['TB-WK0001', 'TB-WK0002'])
    expect([count('Nye saker'), count('Under behandling')]).toEqual(['1', '2'])
    expect(screen.queryByText('TB-DN0001')).toBe(null)
    fireEvent.click(screen.getByRole('button', { name: 'Åpne arkiv' }))
    expect(refsIn('Arkiv')).toEqual(['TB-DN0001', 'TB-DN0002'])
    expect(count('Arkiv')).toBe('2')
    expect(screen.queryByRole('region', { name: 'Nye saker' })).toBe(null)
    fireEvent.click(screen.getByRole('button', { name: 'Tilbake til aktive saker' }))
    expect(refsIn('Nye saker')).toEqual(['TB-NY0001'])
  })

  it('statusendring flytter saken uten duplisering; løst → arkiv; gjenåpnet → aktiv liste; antallene følger', async () => {
    const { data } = kit()
    await screen.findByText('TB-NY0001')
    fireEvent.change(screen.getByLabelText('Endre status for TB-NY0001'), { target: { value: 'in_progress' } })
    await waitFor(() => expect(refsIn('Under behandling')).toEqual(['TB-NY0001', 'TB-WK0001', 'TB-WK0002']))
    expect(refsIn('Nye saker')).toEqual([])
    expect(screen.getByText('Ingen nye saker.')).toBeTruthy()
    expect(screen.getAllByText('TB-NY0001')).toHaveLength(1)
    expect([count('Nye saker'), count('Under behandling')]).toEqual(['0', '3'])
    expect(data.rpc).toHaveBeenCalledWith('set_feedback_status', { p_id: 'n1', p_status: 'in_progress', p_reason: null })
    fireEvent.change(screen.getByLabelText('Endre status for TB-WK0001'), { target: { value: 'resolved' } })
    await waitFor(() => expect(refsIn('Under behandling')).toEqual(['TB-NY0001', 'TB-WK0002']))
    fireEvent.click(screen.getByRole('button', { name: 'Åpne arkiv' }))
    expect(refsIn('Arkiv')).toEqual(['TB-WK0001', 'TB-DN0001', 'TB-DN0002'])
    fireEvent.change(screen.getByLabelText('Endre status for TB-DN0001'), { target: { value: 'new' } }) // gjenåpnet
    await waitFor(() => expect(refsIn('Arkiv')).toEqual(['TB-WK0001', 'TB-DN0002']))
    fireEvent.click(screen.getByRole('button', { name: 'Tilbake til aktive saker' }))
    expect(refsIn('Nye saker')).toEqual(['TB-DN0001'])
  })

  it('avvisning fra listen krever begrunnelse; avbrutt endrer ingenting', async () => {
    const { data } = kit()
    await screen.findByText('TB-NY0001')
    vi.stubGlobal('prompt', vi.fn(() => null))
    fireEvent.change(screen.getByLabelText('Endre status for TB-NY0001'), { target: { value: 'rejected' } })
    await waitFor(() => expect(window.prompt).toHaveBeenCalled())
    expect(data.rpc).not.toHaveBeenCalledWith('set_feedback_status', expect.anything())
    expect(refsIn('Nye saker')).toEqual(['TB-NY0001'])
  })

  it('lagring feiler: saken blir der den var, og brukeren får en melding', async () => {
    kit({ failStatus: true })
    await screen.findByText('TB-NY0001')
    fireEvent.change(screen.getByLabelText('Endre status for TB-NY0001'), { target: { value: 'in_progress' } })
    expect((await screen.findByRole('status')).textContent).toBeTruthy()
    expect(refsIn('Nye saker')).toEqual(['TB-NY0001'])
    expect(refsIn('Under behandling')).toEqual(['TB-WK0001', 'TB-WK0002'])
    expect((screen.getByLabelText('Endre status for TB-NY0001') as HTMLSelectElement).value).toBe('new')
  })

  it('«Velg alle» og «Kopier valgte» gjelder bare listen; én sak kan også kopieres', async () => {
    const writeText = vi.fn(async (_t: string) => undefined)
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } })
    vi.stubGlobal('isSecureContext', true)
    const { data } = kit()
    await screen.findByText('TB-NY0001')
    const work = region('Under behandling')
    fireEvent.click(within(work).getByRole('button', { name: 'Velg alle' }))
    expect(within(work).getByText('2 valgt')).toBeTruthy()
    expect((screen.getByLabelText('Velg TB-NY0001') as HTMLInputElement).checked).toBe(false)
    expect((within(region('Nye saker')).getByRole('button', { name: 'Kopier valgte' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(within(work).getByRole('button', { name: 'Kopier valgte' }))
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1))
    const many = writeText.mock.calls[0]?.[0] ?? ''
    expect(many).toContain('TB-WK0001')
    expect(many).toContain('TB-WK0002')
    expect(many).not.toContain('TB-NY0001')
    fireEvent.click(within(work).getByRole('button', { name: 'Fjern valg' }))
    fireEvent.click(screen.getByLabelText('Velg TB-NY0001'))
    fireEvent.click(within(region('Nye saker')).getByRole('button', { name: 'Kopier valgte' }))
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(2))
    expect(writeText.mock.calls[1]?.[0]).toContain('TB-NY0001')
    expect(data.rpc).not.toHaveBeenCalledWith('set_feedback_status', expect.anything()) // kopiering endrer ingenting
  })

  it('«Slett valgte» krever bekreftelse med antall, og sletter bare de valgte i listen', async () => {
    const { data } = kit()
    await screen.findByText('TB-NY0001')
    const work = region('Under behandling')
    fireEvent.click(screen.getByLabelText('Velg TB-WK0002'))
    fireEvent.click(screen.getByLabelText('Velg TB-NY0001')) // valg i en annen liste
    const confirm = vi.fn(() => false)
    vi.stubGlobal('confirm', confirm)
    fireEvent.click(within(work).getByRole('button', { name: 'Slett valgte' }))
    await waitFor(() => expect(confirm).toHaveBeenCalled())
    expect(String((confirm.mock.calls[0] as unknown[] | undefined)?.[0])).toMatch(/Slette 1 valgte saker fra «Under behandling»\?[\s\S]*TB-WK0002/)
    expect(data.rpc).not.toHaveBeenCalledWith('archive_feedback', expect.anything())
    confirm.mockReturnValue(true)
    fireEvent.click(within(work).getByRole('button', { name: 'Slett valgte' }))
    await waitFor(() => expect(data.rpc).toHaveBeenCalledWith('archive_feedback', { p_id: 'w2', p_reason: 'Slettet fra listen «Under behandling»' }))
    expect(data.rpc.mock.calls.filter((c) => c[0] === 'archive_feedback')).toHaveLength(1)
  })

  it('søk og filtre gjelder alle listene, og antallene følger det som vises', async () => {
    kit()
    await screen.findByText('TB-NY0001')
    fireEvent.change(screen.getByLabelText('Kategori'), { target: { value: 'feature' } })
    expect([count('Nye saker'), count('Under behandling')]).toEqual(['0', '1'])
    expect(refsIn('Under behandling')).toEqual(['TB-WK0001'])
    fireEvent.change(screen.getByLabelText('Kategori'), { target: { value: 'all' } })
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'DN0002' } })
    expect([count('Nye saker'), count('Under behandling')]).toEqual(['0', '0'])
    fireEvent.click(screen.getByRole('button', { name: 'Åpne arkiv' }))
    expect(refsIn('Arkiv')).toEqual(['TB-DN0002'])
  })
})
