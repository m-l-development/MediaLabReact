import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ServicesContext, type Services } from '../../app/services'
import type { Me } from '../../domain/account'
import { Hub } from './Hub'
import { resetLogoCacheForTests } from '../../shared/media/church-logo'

/** TB-9AF961: menighetens navn og logo på forsiden (bare menigheten brukeren er medlem av). */
const base = { email: 'ola@b.no', full_name: 'Ola Nordmann', first_name: 'Ola', last_name: 'Nordmann', phone: null, mfa: true, roles: [] }
const me = (churches: Me['churches']) => ({ ...base, id: 'u1', churches }) as unknown as Me

function setup(m: Me | null, blob: (id: string) => Promise<Blob | null> = async () => null) {
  const files = { blob: vi.fn(blob) }
  const services = { community: { hasActiveCollab: async () => false }, files } as unknown as Services
  render(<ServicesContext value={services}><Hub me={m} /></ServicesContext>)
  return files
}
afterEach(() => {
  vi.restoreAllMocks()
  resetLogoCacheForTests()
  localStorage.clear()
})

describe('Forsiden: menighetens logo', () => {
  it('viser logoen og navnet når menigheten har logo', async () => {
    const files = setup(me([{ id: 'c1', name: 'Livets Ord Fredrikstad', logo_file_id: 'f-logo' } as Me['churches'][number]]), async () => new Blob(['png'], { type: 'image/png' }))
    expect(await screen.findByText('Livets Ord Fredrikstad')).toBeTruthy()
    await waitFor(() => expect(document.querySelector('[data-ch-hub-church] img')?.getAttribute('src')).toBe('data:image/png;base64,cG5n'))
    expect(files.blob).toHaveBeenCalledWith('f-logo')
  })

  it('logoen hentes én gang: ikke på nytt ved retur til forsiden eller etter ny innlasting; ny logo hentes', async () => {
    const png = async () => new Blob(['png'], { type: 'image/png' })
    const church = (logo: string) => me([{ id: 'c1', name: 'Bymenigheten', logo_file_id: logo } as Me['churches'][number]])
    const img = () => document.querySelector('[data-ch-hub-church] img')?.getAttribute('src')
    const a = setup(church('f-1'), png)
    await waitFor(() => expect(img()).toContain('data:image/png'))
    expect(localStorage.getItem('ml2:u1:logo.f-1')).toContain('data:image/png') // under brukerens eget prefiks
    cleanup()
    const b = setup(church('f-1'), png) // retur til forsiden
    expect(img()).toContain('data:image/png') // med en gang, uten venting
    cleanup()
    resetLogoCacheForTests() // ny innlasting: minnet er tomt, kopien i nettleseren brukes
    const c = setup(church('f-1'), png)
    expect(img()).toContain('data:image/png')
    expect([a.blob.mock.calls.length, b.blob.mock.calls.length, c.blob.mock.calls.length]).toEqual([1, 0, 0])
    cleanup()
    const d = setup(church('f-2'), png) // logoen er byttet (ny fil-id)
    await waitFor(() => expect(d.blob).toHaveBeenCalledWith('f-2'))
    await waitFor(() => expect(localStorage.getItem('ml2:u1:logo.f-1')).toBeNull())
  })

  it('uten logo: forbokstaver, og ingen henting', async () => {
    const files = setup(me([{ id: 'c1', name: 'Livets Ord Fredrikstad', logo_file_id: null } as Me['churches'][number]]))
    expect(await screen.findByText('LO')).toBeTruthy()
    expect(files.blob).not.toHaveBeenCalled()
  })

  it('logoen kan ikke hentes: forbokstavene står', async () => {
    setup(me([{ id: 'c1', name: 'Bymenigheten', logo_file_id: 'f-x' } as Me['churches'][number]]), async () => { throw new Error('nett') })
    expect(await screen.findByText('B')).toBeTruthy()
    expect(document.querySelector('[data-ch-hub-church] img')).toBeNull()
  })

  it('uten menighet (eller ikke innlogget) vises ingenting', () => {
    setup(me([]))
    expect(document.querySelector('[data-ch-hub-church]')).toBeNull()
    setup(null)
    expect(document.querySelector('[data-ch-hub-church]')).toBeNull()
  })
})
