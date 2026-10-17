import { describe, expect, it } from 'vitest'
import { PhotoController, type PDeps } from './photo-design/controller'
import { ThumbController, type Deps } from './thumbnail-studio/controller'

/** Livets Ord-standardene («Kveldsbibelskole») bare for menigheter som fantes før (churches.legacy_defaults). */
const storage = () => {
  const m = new Map<string, string>()
  return { get: (k: string) => m.get(k) ?? null, set: (k: string, v: string) => void m.set(k, v), remove: (k: string) => void m.delete(k) }
}

function thumb(legacyDefaults: boolean | undefined) {
  const deps = {
    legacyDefaults,
    images: { onLoad: () => () => undefined },
    repo: { loadCats: async () => null, saveCats: async () => undefined, listTpls: async () => [], saveTpls: async (t: unknown) => t },
    shared: null,
    storage: storage(),
    onLocation: () => undefined,
    t: (p: string) => p,
  } as unknown as Deps
  return new ThumbController(deps)
}

function photo(legacyDefaults: boolean | undefined) {
  return new PhotoController({ legacyDefaults, storage: storage(), t: (p: string) => p } as unknown as PDeps)
}

describe('Livets Ord-standarder (legacy_defaults)', () => {
  it.each([true, undefined])('eksisterende menighet (%s): Kveldsbibelskole tilbys', async (v) => {
    const c = thumb(v)
    expect(c.baseKeys()).toContain('kbs')
    await c.init({})
    expect(c.s.cats.some((k) => k.base === 'kbs')).toBe(true)
    expect(photo(v).s.cats).toContain('Kveldsbibelskole')
    c.dispose()
  })

  it('ny menighet (false): ingen Kveldsbibelskole, resten som før', async () => {
    const c = thumb(false)
    expect(c.baseKeys()).not.toContain('kbs')
    expect(c.baseKeys().length).toBeGreaterThan(0)
    await c.init({})
    expect(c.s.cats.length).toBeGreaterThan(0)
    expect(c.s.cats.some((k) => k.base === 'kbs')).toBe(false)
    expect(photo(false).s.cats).toEqual(['Søndagsmøte', 'Ungdomsmøte'])
    c.dispose()
  })
})
