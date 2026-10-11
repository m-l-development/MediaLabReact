import { afterEach, describe, expect, it, vi } from 'vitest'
import { HEAL_KEY, healChunk } from './heal'

afterEach(() => sessionStorage.clear())

describe('selvreparasjon ved feil i lasting av et verktøy (PLT-05)', () => {
  it('henter filene forbi hurtigbufferen og laster siden én gang', async () => {
    const refetch = vi.fn(async (_u: string) => undefined), reload = vi.fn()
    const err = new Error('Failed to fetch dynamically imported module: https://x.no/app/assets/Mockups-abc.js')
    expect(healChunk(err, { urls: () => ['https://x.no/app/assets/index-1.js'], refetch, reload })).toBe(true)
    await vi.waitFor(() => expect(reload).toHaveBeenCalledOnce())
    expect(refetch.mock.calls.map((c) => c[0])).toEqual(['https://x.no/app/assets/Mockups-abc.js', 'https://x.no/app/assets/index-1.js'])
    expect(sessionStorage.getItem(HEAL_KEY)).toBe('1')
    // andre gang i samme økt: ingen løkke
    expect(healChunk(err, { urls: () => [], refetch, reload })).toBe(false)
  })
  it('andre feil repareres ikke', () => {
    const reload = vi.fn()
    expect(healChunk(new Error('TypeError: x is undefined'), { urls: () => [], refetch: async () => undefined, reload })).toBe(false)
    expect(reload).not.toHaveBeenCalled()
  })
})
