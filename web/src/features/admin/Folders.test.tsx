import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ADM, DEV, setupAdmin, USR } from './testkit'

/** Komponenttester med falsk database, server og fil-tjeneste (se testkit.tsx): Filer (ADM-07). */
const FILES = [
  { id: 'f1', church_id: 'c1', file_name: 'plakat.png', mime_type: 'image/png', file_size: 1048576, folder: 'bilder', visibility: 'church', uploaded_by: 'u1', created_at: '2026-10-01T10:00:00Z' },
  { id: 'f2', church_id: 'c1', file_name: 'banner.jpg', mime_type: 'image/jpeg', file_size: 2097152, folder: 'bilder', visibility: 'church', uploaded_by: 'a1', created_at: '2026-10-02T10:00:00Z' },
  { id: 'f3', church_id: 'c1', file_name: 'logo-fast.png', mime_type: 'image/png', file_size: 1000, folder: 'faste', visibility: 'church', uploaded_by: 'a1', created_at: '2026-10-03T10:00:00Z' },
  { id: 'k1', church_id: 'c2', file_name: 'fra-b.png', mime_type: 'image/png', file_size: 5000, folder: 'samarbeid', visibility: 'church', uploaded_by: 'x', created_at: '2026-10-04T10:00:00Z', link_id: 'g1', link_upload: true },
]
const GROUP = { id: 'g1', name: 'Påske', description: null, status: 'active', created_at: '2026-03-01', ended_at: null, my_church: true,
  members: [{ church_id: 'c1', name: 'Menighet A', status: 'active' }, { church_id: 'c2', name: 'Menighet B', status: 'active' }] }
const usage = { quota_bytes: 200 * 1048576, used_bytes: 3 * 1048576, system_free_bytes: null }
const rpc = (groups: unknown[]) => (fn: string) => (fn === 'my_groups' ? groups : fn === 'storage_usage' ? usage : undefined)
const saved: Blob[] = []
beforeEach(() => {
  saved.length = 0
  vi.spyOn(URL, 'createObjectURL').mockImplementation((b) => { saved.push(b as Blob); return 'blob:x' })
  vi.stubGlobal('fetch', vi.fn(async () => new Response(new Uint8Array([1, 2, 3]))))
})
afterEach(() => vi.unstubAllGlobals())

describe('Filer (ADM-07)', () => {
  it('Fellesmappe: filene, forbruk mot kvoten, ingen Samarbeidsmappe uten aktiv gruppe', async () => {
    setupAdmin(USR, { hash: '#/filer/felles', tables: { files: FILES }, rpc: rpc([]) })
    expect(await screen.findByText('plakat.png')).toBeTruthy()
    expect(screen.getByText('banner.jpg')).toBeTruthy()
    expect(screen.getByText(/Brukt: 3.0 MB av 200.0 MB \(standard\)/)).toBeTruthy()
    expect(screen.queryByRole('link', { name: /Samarbeidsmappe/ })).toBe(null)
  })
  it('User: kan slette egne filer, ikke andres; sletting spør og går via tjenesten', async () => {
    const { files } = setupAdmin(USR, { hash: '#/filer/felles', tables: { files: FILES }, rpc: rpc([]) })
    const own = (await screen.findByText('plakat.png')).closest('[data-ch-file]') as HTMLElement
    const other = screen.getByText('banner.jpg').closest('[data-ch-file]') as HTMLElement
    expect(within(other).queryByRole('button', { name: 'Slett' })).toBe(null)
    fireEvent.click(within(own).getByRole('button', { name: 'Slett' }))
    const dlg = screen.getByRole('dialog', { name: 'Slette filen?' })
    fireEvent.click(within(dlg).getByRole('button', { name: 'Slett' }))
    await waitFor(() => expect(files.remove).toHaveBeenCalledWith('f1'))
    expect(await screen.findByText('«plakat.png» er slettet.')).toBeTruthy()
  })
  it('opplasting i Fellesmappe går til mappen «bilder»; video avvises', async () => {
    const { files } = setupAdmin(USR, { hash: '#/filer/felles', tables: { files: FILES }, rpc: rpc([]) })
    await screen.findByText('plakat.png')
    const input = screen.getByText('Last opp', { selector: 'label' }).querySelector('input') as HTMLInputElement
    const img = new File([new Uint8Array([1])], 'ny.png', { type: 'image/png' })
    fireEvent.change(input, { target: { files: [img] } })
    await waitFor(() => expect(files.upload).toHaveBeenCalledWith(img, { churchId: 'c1', folder: 'bilder' }))
    expect(await screen.findByText(/1 filer er lastet opp til Fellesmappe/)).toBeTruthy()
  })
  it('Faste: bare Admin kan laste opp; vanlige medlemmer ser og laster ned', async () => {
    setupAdmin(USR, { hash: '#/filer/faste', tables: { files: FILES }, rpc: rpc([]) })
    expect(await screen.findByText('logo-fast.png')).toBeTruthy()
    expect(screen.getByText('Faste-mappen vedlikeholdes av Admin. Du kan se og laste ned filene.')).toBeTruthy()
    expect(screen.queryByText('Last opp', { selector: 'label' })).toBe(null)
  })
  it('flere valgte filer lastes ned som én ZIP', async () => {
    setupAdmin(USR, { hash: '#/filer/felles', tables: { files: FILES }, rpc: rpc([]) })
    await screen.findByText('plakat.png')
    fireEvent.click(screen.getByLabelText('Velg alle'))
    fireEvent.click(screen.getByRole('button', { name: 'Last ned (ZIP)' }))
    expect(await screen.findByText('2 filer er lastet ned som ZIP.')).toBeTruthy()
    const zip = saved.find((b) => b.type === 'application/zip')
    expect(zip).toBeTruthy()
    expect(new Uint8Array(await (zip as Blob).arrayBuffer()).slice(0, 4)).toEqual(new Uint8Array([0x50, 0x4b, 0x03, 0x04]))
  })
  it('Samarbeidsmappe med aktiv gruppe: filer per menighet, og kopi fra Fellesmappe via tjenesten', async () => {
    const { files } = setupAdmin(ADM, { hash: '#/filer/samarbeid', tables: { files: FILES }, rpc: rpc([GROUP]) })
    expect(await screen.findByText('fra-b.png')).toBeTruthy()
    expect(screen.getByRole('heading', { name: /Fra Menighet B/ })).toBeTruthy()
    expect(screen.getByRole('heading', { name: /Fra oss/ })).toBeTruthy()
    fireEvent.click(screen.getByRole('link', { name: /Fellesmappe/ }))
    // i Filer-seksjonen styrer adressen fanen
    await waitFor(() => expect(location.hash).toBe('#/filer/felles'))
    window.dispatchEvent(new HashChangeEvent('hashchange'))
    const tile = (await screen.findByText('plakat.png')).closest('[data-ch-file]') as HTMLElement
    fireEvent.click(within(tile).getByRole('button', { name: 'Del i Samarbeidsmappe' }))
    const dlg = screen.getByRole('dialog', { name: 'Del i Samarbeidsmappe' })
    expect(dlg.textContent).toContain('Originalen blir liggende')
    fireEvent.click(within(dlg).getByRole('button', { name: 'Del kopi' }))
    await waitFor(() => expect(files.copyToLink).toHaveBeenCalledWith('f1', 'g1'))
    expect(await screen.findByText('En kopi er lagt i Samarbeidsmappen i gruppen «Påske».')).toBeTruthy()
  })
  it('Developer ser filer bare i menigheter der Developer er medlem', async () => {
    setupAdmin({ ...DEV, churches: [] } as typeof DEV, { hash: '#/filer', tables: { files: FILES }, rpc: rpc([]) })
    expect(await screen.findByText(/Du er ikke medlem av noen menighet/)).toBeTruthy()
  })
})
