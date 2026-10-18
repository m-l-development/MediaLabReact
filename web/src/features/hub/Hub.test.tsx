import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ServicesContext, type Services } from '../../app/services'
import type { Me } from '../../domain/account'
import { Hub } from './Hub'

/** TB-9AF961: menighetens navn og logo på forsiden (bare menigheten brukeren er medlem av). */
const base = { email: 'ola@b.no', full_name: 'Ola Nordmann', first_name: 'Ola', last_name: 'Nordmann', phone: null, mfa: true, roles: [] }
const me = (churches: Me['churches']) => ({ ...base, id: 'u1', churches }) as unknown as Me

function setup(m: Me | null, blob: (id: string) => Promise<Blob | null> = async () => null) {
  const files = { blob: vi.fn(blob) }
  const services = { community: { hasActiveCollab: async () => false }, files } as unknown as Services
  render(<ServicesContext value={services}><Hub me={m} /></ServicesContext>)
  return files
}
afterEach(() => vi.restoreAllMocks())

describe('Forsiden: menighetens logo', () => {
  it('viser logoen og navnet når menigheten har logo', async () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:logo')
    const files = setup(me([{ id: 'c1', name: 'Livets Ord Fredrikstad', logo_file_id: 'f-logo' } as Me['churches'][number]]), async () => new Blob(['png'], { type: 'image/png' }))
    expect(await screen.findByText('Livets Ord Fredrikstad')).toBeTruthy()
    await waitFor(() => expect(document.querySelector('[data-ch-hub-church] img')?.getAttribute('src')).toBe('blob:logo'))
    expect(files.blob).toHaveBeenCalledWith('f-logo')
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
