import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { LoopDiskRow, LoopDiskService } from '../../services/loop-disk'
import type { HomeVals } from './home-controller'
import { LoopSharedDisk } from './LoopSharedDisk'

const row = (id: string, name: string): LoopDiskRow => ({ id, church_id: 'c1', name, base: 'week', data: { programText: '', slides: [{}, {}], cfg: {} }, version: 1, updated_at: '2026-10-18T10:00:00Z' })

function setup(o: { admin: boolean; confirm?: boolean; removeFails?: boolean; church?: string | null }) {
  let rows = [row('l1', 'Påskemøte'), row('l2', 'Ungdom')]
  const svc: LoopDiskService = {
    available: () => true,
    list: vi.fn(async () => rows),
    get: vi.fn(async () => null),
    save: vi.fn(async () => ({ id: 'x', version: 1 })),
    remove: vi.fn(async (id: string) => { if (o.removeFails) throw new Error('42501'); rows = rows.filter((r) => r.id !== id) }),
  }
  const open = vi.fn()
  const confirm = vi.fn(() => o.confirm ?? true)
  const v = { bases: { personal: null, central: null, editorHref: (q: Record<string, string>) => '/app/loop-studio?' + new URLSearchParams(q), open, confirm }, sharedDisk: { svc, churchId: () => (o.church === undefined ? 'c1' : o.church), isAdmin: () => o.admin } } as unknown as HomeVals
  render(<LoopSharedDisk v={v} tx={(s) => String(s)} />)
  return { svc, open, confirm }
}

afterEach(cleanup)

describe('Loop Studio – menighetens disk på startsiden (TB-BB67CB)', () => {
  it('medlem ser og åpner menighetens looper, men har ingen slett-knapp', async () => {
    const { svc, open } = setup({ admin: false })
    expect(await screen.findByText('Påskemøte')).toBeTruthy()
    expect(svc.list).toHaveBeenCalledWith('c1')
    expect(screen.queryByRole('button', { name: 'Slett' })).toBeNull()
    const a = screen.getAllByRole('link', { name: 'Åpne' })[0] as HTMLAnchorElement
    expect(a.getAttribute('href')).toContain('fdisk=l1')
    fireEvent.click(a)
    expect(open).toHaveBeenCalledWith({ mal: 'week', fdisk: 'l1' })
  })

  it('Admin sletter etter bekreftelse; avbrutt bekreftelse sletter ingenting', async () => {
    const { svc, confirm } = setup({ admin: true, confirm: false })
    await screen.findByText('Påskemøte')
    fireEvent.click(screen.getAllByRole('button', { name: 'Slett' })[0] as HTMLElement)
    expect(confirm).toHaveBeenCalled()
    expect(svc.remove).not.toHaveBeenCalled()
    confirm.mockReturnValue(true)
    fireEvent.click(screen.getAllByRole('button', { name: 'Slett' })[0] as HTMLElement)
    await waitFor(() => expect(screen.queryByText('Påskemøte')).toBeNull())
    expect(svc.remove).toHaveBeenCalledWith('l1')
  })

  it('avvist sletting gir en melding, og loopen blir stående', async () => {
    setup({ admin: true, removeFails: true })
    await screen.findByText('Påskemøte')
    fireEvent.click(screen.getAllByRole('button', { name: 'Slett' })[0] as HTMLElement)
    expect((await screen.findByRole('alert')).textContent).toMatch(/kunne ikke slettes/)
    expect(screen.getByText('Påskemøte')).toBeTruthy()
  })

  it('vises ikke uten menighet', () => {
    const { svc } = setup({ admin: false, church: null })
    expect(screen.queryByText('Menighetens disk')).toBeNull()
    expect(svc.list).not.toHaveBeenCalled()
  })
})
