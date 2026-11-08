import { describe, expect, it, vi } from 'vitest'
import { PhotoController, type PDeps, type SharedPd } from './controller'
import type { PdStored } from './repo'

/**
 * TB-A43E52 i Photo Design: en egen mal deles med menigheten (bilder og masker til menighetens filer, bare referanser i
 * listen), og en delt mal hentes som eget prosjekt (bildene inn i Dine medier igjen). Falske tjenester; ingen nettverk.
 */
const doc = { id: 'p1', name: 'Plakat', w: 1080, h: 1080, layers: [{ id: 'l1', type: 'image', src: 'm:a1', mask: 'k1' }, { id: 'l2', type: 'text', text: 'Hei' }] }
const mask = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

function kit() {
  let list: SharedPd[] = []
  const uploads: string[] = []
  const put = vi.fn(async () => 'm:ny')
  const deps = {
    storage: { get: () => null, set: () => undefined, remove: () => undefined },
    repo: { open: vi.fn(async () => ({ doc, masks: { k1: mask }, thumb: 'data:image/jpeg;base64,xx', tpl: { cat: 'Plakater' } }) as unknown as PdStored), list: async () => [] },
    openMedia: vi.fn(async () => new Blob(['bilde'], { type: 'image/png' })),
    putImage: put,
    confirm: () => true, prompt: () => null, t: (p: string) => p,
    sharedTpls: {
      available: () => true,
      list: async () => list,
      mutate: async (fn: (l: SharedPd[]) => SharedPd[]) => (list = fn(list)),
      upload: vi.fn(async (_b: Blob, name: string) => { uploads.push(name); return 'ch:00000000-0000-4000-8000-00000000000' + uploads.length }),
      blob: vi.fn(async () => new Blob(['x'], { type: 'image/png' })),
      by: () => 'Kari',
    },
  } as unknown as PDeps
  const c = new PhotoController(deps)
  return { c, deps, uploads, put, get list() { return list } }
}

describe('Photo Design: maler delt med menigheten', () => {
  it('deling laster opp bilde og maske én gang og lagrer bare referanser', async () => {
    const k = kit()
    await k.c.publishTpl({ id: 'p1', name: 'Plakat', w: 1080, h: 1080, updated: 1, thumb: '', tpl: true, cat: 'Plakater', batch: null })
    expect(k.uploads).toEqual(['Delt mal.png', 'Maske.png'])
    const e = k.list[0] as SharedPd
    expect(e).toMatchObject({ name: 'Plakat', cat: 'Plakater', by: 'Kari' })
    expect((e.doc.layers[0] as { src: string }).src).toMatch(/^ch:/)
    expect(e.masks.k1).toMatch(/^ch:/)
    expect(JSON.stringify(e)).not.toContain('m:a1')
    // samme mal en gang til: ingen nye opplastinger (samme bilder i økten)
    await k.c.publishTpl({ id: 'p1', name: 'Plakat', w: 1080, h: 1080, updated: 1, thumb: '', tpl: true, cat: 'Plakater', batch: null })
    expect(k.uploads.length).toBe(2)
    expect(k.list.length).toBe(2)
  })
  it('bruk: bildene hentes inn i Dine medier, og prosjektet husker den delte malen', async () => {
    const k = kit()
    await k.c.publishTpl({ id: 'p1', name: 'Plakat', w: 1080, h: 1080, updated: 1, thumb: '', tpl: true, cat: 'Plakater', batch: null })
    const opened: unknown[] = []
    const C = k.c as unknown as { loadMedia: (d: unknown, m: unknown) => Promise<void>; openDoc: (d: unknown) => void }
    C.loadMedia = async (d, m) => { opened.push({ d, m }) }
    C.openDoc = () => undefined
    ;(k.c as unknown as { queueSave: () => void }).queueSave = () => undefined
    await k.c.useSharedTpl(k.list[0] as SharedPd)
    expect(k.put).toHaveBeenCalledTimes(1)
    const o = opened[0] as { d: { layers: { src?: string }[] }; m: Record<string, string> }
    expect(o.d.layers[0]?.src).toBe('m:ny')
    expect(o.m.k1).toMatch(/^data:image\/png;base64,/)
    expect(k.c.s.sharedFrom).toEqual({ id: (k.list[0] as SharedPd).id, name: 'Plakat' })
  })
})
