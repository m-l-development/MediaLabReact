import { describe, expect, it, vi } from 'vitest'
import { ThumbController, type Deps, type SharedTpl } from './controller'
import type { Template } from './engine/backup'
import { emptyDoc, L } from './engine/model'

/**
 * Deling i Thumbnail Studio med falske tjenester: TB-A43E52 (maler delt med menigheten) og TB-09177E (send en mal til et
 * medlem, mottakeren godtar ✓ eller avslår ✕).
 */
function docWith(src: string) {
  const d = emptyDoc()
  d.layers = [{ ...L('image'), id: 'i1', src }] as typeof d.layers
  return d
}
const tpl = (id: string, catId: string): Template => ({ id, catId, name: 'Søndag ' + id, doc: docWith('m:bilde'), thumb: '', updated: 1 })

function kit(tpls: Template[] = [tpl('t1', 'sunday')]) {
  let shared: SharedTpl[] = []
  const sent: { to: string; name: string; payload: Record<string, unknown> }[] = []
  let inbox = [{ id: 'x1', name: 'Fra Kari', from_name: 'Kari', created_at: '2026-11-08' }]
  const saved: Template[][] = []
  const deps = {
    storage: { get: () => null, set: () => undefined },
    images: { load: async () => undefined, loadAll: async () => undefined, get: () => null, onLoad: () => () => undefined },
    renderer: { snapshot: async () => 'data:image/jpeg;base64,x' },
    repo: { saveTpls: async (l: Template[]) => { saved.push(l); return l }, saveCats: async () => undefined },
    shareImage: vi.fn(async () => 'ch:00000000-0000-4000-8000-000000000001'),
    confirm: () => true, prompt: () => null, t: (p: string) => p, onLocation: () => undefined,
    shared: null,
    sharedTpls: { available: () => true, list: async () => shared, mutate: async (fn: (l: SharedTpl[]) => SharedTpl[]) => (shared = fn(shared)), by: () => 'Ola' },
    shares: {
      available: () => true,
      peers: async () => [{ id: 'u2', name: 'Kari' }],
      send: async (to: string, name: string, payload: Record<string, unknown>) => { sent.push({ to, name, payload }) },
      incoming: async () => inbox,
      respond: async (id: string, accept: boolean) => { inbox = inbox.filter((x) => x.id !== id); return accept ? { name: 'Fra Kari', payload: { doc: docWith('ch:00000000-0000-4000-8000-000000000002'), thumb: '', catId: 'kbs' } } : { name: 'Fra Kari' } },
    },
  } as unknown as Deps
  const c = new ThumbController(deps)
  ;(c as unknown as { set: (p: object) => void }).set({ ready: true, cats: [{ id: 'sunday', name: 'Søndag', desc: '', base: 'sunday' }, { id: 'kbs', name: 'KBS', desc: '', base: 'kbs' }] as never, tpls })
  return { c, deps, sent, saved, get shared() { return shared } }
}

describe('Thumbnail Studio: maler delt med menigheten (TB-A43E52)', () => {
  it('deling gir en kopi med menighetens bilder; den personlige malen er urørt', async () => {
    const k = kit()
    await k.c.publishTpl(k.c.s.tpls[0] as Template)
    expect(k.shared).toHaveLength(1)
    expect(k.shared[0]).toMatchObject({ name: 'Søndag t1', catId: 'sunday', by: 'Ola' })
    expect(JSON.stringify(k.shared[0]?.doc)).toContain('ch:00000000-0000-4000-8000-000000000001')
    expect(JSON.stringify(k.shared[0]?.doc)).not.toContain('m:bilde')
    expect((k.c.s.tpls[0] as Template).doc.layers[0]).toMatchObject({ src: 'm:bilde' })
  })
  it('hent som egen mal, og oppdater den delte malen for menigheten', async () => {
    const k = kit()
    await k.c.publishTpl(k.c.s.tpls[0] as Template)
    const e = k.shared[0] as SharedTpl
    k.c.fetchSharedTpl(e)
    expect(k.c.s.tpls.length).toBe(2)
    k.c.openSharedTpl(e)
    expect(k.c.s.sharedEdit).toEqual({ id: e.id, name: e.name })
    ;(k.c as unknown as { set: (p: object) => void }).set({ tplName: 'Søndag ny' })
    await k.c.updateSharedTpl()
    expect(k.shared[0]).toMatchObject({ id: e.id, name: 'Søndag ny' })
  })
})

describe('Thumbnail Studio: send mal til et medlem (TB-09177E)', () => {
  it('send: medlemmene hentes, og malen sendes med menighetens bilder', async () => {
    const k = kit()
    await k.c.openSend(k.c.s.tpls[0] as Template)
    expect(k.c.s.sendFor?.peers).toEqual([{ id: 'u2', name: 'Kari' }])
    await k.c.sendTo({ id: 'u2', name: 'Kari' })
    expect(k.sent[0]).toMatchObject({ to: 'u2', name: 'Søndag t1' })
    expect(JSON.stringify(k.sent[0]?.payload)).toContain('ch:')
    expect(k.c.s.sendFor).toBe(null)
  })
  it('✓ godta legger malen i riktig kategori; ✕ avslå legger ikke til noe', async () => {
    const k = kit()
    await k.c.loadInbox()
    expect(k.c.s.inbox).toHaveLength(1)
    await k.c.respondShare(k.c.s.inbox[0]!, true)
    expect(k.c.s.inbox).toHaveLength(0)
    const added = k.c.s.tpls.find((t) => t.name === 'Fra Kari')
    expect(added?.catId).toBe('kbs')
    const k2 = kit()
    await k2.c.loadInbox()
    await k2.c.respondShare(k2.c.s.inbox[0]!, false)
    expect(k2.c.s.tpls).toHaveLength(1)
  })
})
