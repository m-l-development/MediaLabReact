import { describe, expect, it, vi } from 'vitest'
import { createLoopDiskService, forSharedDisk } from './loop-disk'

describe('Loop Studio – menighetens disk (TB-BB67CB)', () => {
  it('video fjernes, lokale bilder lastes opp én gang, innebygde og menighetens bilder beholdes', async () => {
    const upload = vi.fn(async (ref: string) => 'ch:' + ref.slice(4).padStart(8, '0') + '-0000-4000-8000-000000000000')
    const out = await forSharedDisk({
      programText: 'Søndag kl 11',
      slides: [
        { id: 's1', bg: 'img-abc', vid: 'vid-1', vidName: 'film.mp4', vidSound: true, title: 'A' },
        { id: 's2', bg: 'img-abc', logo: 'images/logo.png', extra: 'ch:11111111-0000-4000-8000-000000000000' },
        { id: 's3', bg: 'gen:2', other: 'blob:x', audio: 'aud-9', qr: { link: 'x' } },
      ],
      cfg: { logoSrc: 'img-logo', accent: '#ffffff' },
    }, upload)
    expect(upload).toHaveBeenCalledTimes(2) // img-abc én gang, img-logo én gang
    const [a, b, c] = out.slides as Record<string, unknown>[]
    expect(a).toEqual({ id: 's1', bg: 'ch:00000abc-0000-4000-8000-000000000000', title: 'A' })
    expect(b?.bg).toBe(a?.bg)
    expect(b?.logo).toBe('images/logo.png')
    expect(b?.extra).toBe('ch:11111111-0000-4000-8000-000000000000')
    expect(c).toEqual({ id: 's3', bg: 'gen:2', other: null, audio: null })
    expect(out.cfg.logoSrc).toMatch(/^ch:/)
    expect(JSON.stringify(out)).not.toMatch(/"(vid-|aud-|img-|blob:)/)
  })

  it('bilde som ikke kan lastes opp, blir tomt (ingen lokal referanse sendes)', async () => {
    const out = await forSharedDisk({ programText: '', slides: [{ bg: 'img-x' }], cfg: {} }, async () => { throw new Error('nett') })
    expect((out.slides[0] as { bg: unknown }).bg).toBeNull()
  })

  it('tjenesten bruker databasefunksjonene og tabellen per menighet', async () => {
    const data = { rpc: vi.fn(async () => ({ id: 'l1', version: 2 })), select: vi.fn(async () => []) }
    const s = createLoopDiskService(data as never)
    await s.list('c1')
    expect(data.select).toHaveBeenCalledWith('loop_disk', expect.objectContaining({ eq: { church_id: 'c1' }, order: 'updated_at', desc: true }))
    await s.save('c1', { id: 'l1', name: 'Påske', base: 'week', data: { programText: '', slides: [], cfg: {} }, version: 1 })
    expect(data.rpc).toHaveBeenCalledWith('loop_disk_save', { p_church: 'c1', p_id: 'l1', p_name: 'Påske', p_base: 'week', p_data: { programText: '', slides: [], cfg: {} }, p_version: 1 })
    await s.remove('l1')
    expect(data.rpc).toHaveBeenCalledWith('loop_disk_delete', { p_id: 'l1' })
  })
})
