import { describe, expect, it } from 'vitest'
import type { Asset } from '../../domain/asset'
import { LARGE_COUNT, librarySummary } from './format'

const asset = (hash: string, size: number, local = true) =>
  ({ content: { hash, size, mime: 'image/png' }, locations: local ? [{ type: 'local' }] : [{ type: 'project-folder', folderId: 'f', path: 'p' }] }) as unknown as Asset

/** Dine medier: varsel ved stor samling i stedet for automatisk sletting (SHR-01). */
describe('librarySummary', () => {
  it('teller samme innhold én gang, og bare det som ligger i nettleseren', () => {
    const s = librarySummary([asset('a', 100), asset('a', 100), asset('b', 50), asset('c', 1000, false)])
    expect(s).toEqual({ count: 4, bytes: 150, warn: null, quotaShare: null })
  })
  it(`varsler ved ${LARGE_COUNT} filer, ved 2 GB og når 80 % av nettleserens plass er brukt`, () => {
    expect(librarySummary(Array.from({ length: LARGE_COUNT }, (_, i) => asset(String(i), 1))).warn).toBe('count')
    expect(librarySummary([asset('a', 2e9)]).warn).toBe('bytes')
    expect(librarySummary([asset('a', 1)], { usage: 80, quota: 100 })).toMatchObject({ warn: 'quota', quotaShare: 0.8 })
    expect(librarySummary([asset('a', 1)], { usage: 79, quota: 100 }).warn).toBe(null)
    expect(librarySummary([asset('a', 1)], { usage: 5, quota: 0 }).quotaShare).toBe(null)
  })
})
