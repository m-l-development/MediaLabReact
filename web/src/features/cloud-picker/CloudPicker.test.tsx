import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ServicesContext, type Services } from '../../app/services'
import type { Me } from '../../domain/account'
import type { CloudFile } from '../../services/files'
import { createStore } from '../../shared/lib/store'
import { CloudPicker } from './CloudPicker'

/**
 * Ny menighet (krav 2026-10-12): Faste bilder, Felles ressurser og Fellesmappe starter tomme – menigheten fyller dem selv.
 * Velgeren viser bare filer fra brukerens aktive menighet, også om tjenesten skulle returnere filer fra andre menigheter.
 */
const file = (id: string, church: string, folder: string): CloudFile =>
  ({ id, church_id: church, folder, visibility: 'church', file_name: `${id}.png`, mime_type: 'image/png', file_size: 10, uploaded_by: 'u', created_at: '2026-10-12' }) as unknown as CloudFile

function setup(files: CloudFile[]) {
  const list = vi.fn(async (folder: string, _church?: string) => files.filter((f) => f.folder === folder))
  const urls = vi.fn(async (ids: string[]) => Object.fromEntries(ids.map((i) => [i, `https://dev.invalid/${i}`])))
  const me = { id: 'u1', roles: [], churches: [{ id: 'ny', name: 'Ny menighet' }] } as unknown as Me
  const services = {
    files: { available: () => true, list, urls, upload: vi.fn() },
    auth: { state: createStore({ status: 'ready', me }) },
  } as unknown as Services
  render(
    <ServicesContext value={services}>
      <CloudPicker title="nav.sharedFolder" onPick={vi.fn()} onClose={vi.fn()} />
    </ServicesContext>,
  )
  return { list, urls }
}

describe('Fellesmappe for en ny menighet', () => {
  it('alle tre områdene er tomme, og filer fra en annen menighet vises aldri', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(new Blob(['x'], { type: 'image/png' }))))
    URL.createObjectURL = vi.fn(() => 'blob:x')
    URL.revokeObjectURL = vi.fn()
    const { list, urls } = setup([file('a', 'gammel', 'faste'), file('b', 'gammel', 'logoer'), file('c', 'gammel', 'bilder')])

    expect(await screen.findByText(/Ingen faste bilder ennå/)).toBeTruthy()
    fireEvent.click(screen.getByRole('tab', { name: 'Felles ressurser' }))
    expect(await screen.findByText(/Ingen felles ressurser/)).toBeTruthy()
    fireEvent.click(screen.getByRole('tab', { name: 'Fellesmappe' }))
    expect(await screen.findByText('Fellesmappen er tom. Last opp det første bildet.')).toBeTruthy()

    // spørringen gjelder bare den aktive menigheten, og ingen fremmed fil får adresse
    expect(list.mock.calls.every(([, church]) => church === 'ny')).toBe(true)
    expect(urls).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })
})
