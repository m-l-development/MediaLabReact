import { Blob as NodeBlob } from 'node:buffer'
import { describe, expect, it } from 'vitest'
import { createWorkspace } from '../../app/workspace-factory'
import type { UserId } from '../../domain/ids'
import { openDatabase, request } from '../../infrastructure/idb/idb'
import { legacyName } from '../../infrastructure/legacy-import/local-user'
import type { MediaProbe } from '../../services/assets/types'
import { assetOf, MdRepo } from './repo'
import { importLegacyMotion } from './transfer'

const probe: MediaProbe = { probe: async () => ({ meta: { width: 10, height: 10 } }) }

describe('prosjekter fra forrige versjon av Motion design', () => {
  it('kopieres én gang; filene legges i Dine medier, og dagens data blir urørt', async () => {
    const userId = `md-${Date.now()}` as UserId
    const { workspace: w, close } = await createWorkspace(userId, { probe, blobCloneable: false })
    const old = await openDatabase(legacyName('motiondesign', userId, null), 1, (db) => {
      db.createObjectStore('projects', { keyPath: 'id' })
      db.createObjectStore('media')
    })
    const tx = old.transaction(['projects', 'media'], 'readwrite')
    tx.objectStore('projects').put({
      id: 'p-gammel', name: 'Gammel promo', fmt: 'wide', w: 1920, h: 1080, created: 100, updated: 200,
      media: [{ id: 'm-a1', name: 'logo.png', kind: 'image', w: 10, h: 10 }, { id: 'm-borte', name: 'borte.mp4', kind: 'video', dur: 3 }],
      clips: [{ id: 'c1', kind: 'image', media: 'm-a1', dur: 3 }, { id: 'c2', kind: 'video', media: 'm-borte', in: 0, out: 3 }],
      texts: [{ id: 't1', text: 'Hei', start: 0, dur: 2 }],
      logo: { src: 'm-a1', on: true },
    })
    // Nodes Blob kan klones av testmiljøets IndexedDB (som i dagens app: { blob, name, type }).
    tx.objectStore('media').put({ blob: new NodeBlob(['PNG'], { type: 'image/png' }), name: 'logo.png', type: 'image/png' }, 'm-a1')
    await new Promise((r) => (tx.oncomplete = r))
    old.close()

    const repo = new MdRepo(w.projects)
    const r = await importLegacyMotion(userId, w.assets, w.folders, repo)
    expect(r).toEqual({ added: 1, waiting: [] })
    const [entry] = await repo.list()
    expect(entry?.name).toBe('Gammel promo')
    const p = await repo.open(entry?.id ?? '')
    const img = p.media.find((m) => m.name === 'logo.png')
    const aid = assetOf(img?.id ?? '')
    expect(aid).toBeTruthy()
    expect(p.clips[0]?.kind === 'image' && p.clips[0].media).toBe(img?.id)
    expect(p.logo.src).toBe(img?.id)
    // Filen som mangler i dagens app, beholder klippet sitt (vises tomt) i stedet for å forsvinne
    expect(p.clips).toHaveLength(2)
    expect(p.texts[0]?.text).toBe('Hei')
    expect(await (await w.assets.open(aid as NonNullable<typeof aid>)).text()).toBe('PNG')

    expect((await importLegacyMotion(userId, w.assets, w.folders, repo)).added).toBe(0)
    // to samtidige kjøringer (visningen montert to ganger) gir ikke duplikater
    const [x, y] = await Promise.all([importLegacyMotion(userId, w.assets, w.folders, repo), importLegacyMotion(userId, w.assets, w.folders, repo)])
    expect([x.added, y.added]).toEqual([0, 0])
    expect(await repo.list()).toHaveLength(1)
    const check = await openDatabase(legacyName('motiondesign', userId, null), 1, () => {})
    expect(await request(check.transaction('projects').objectStore('projects').count())).toBe(1)
    expect(await request(check.transaction('media').objectStore('media').count())).toBe(1)
    check.close()
    close()
  })

  it('samtidig første import gir ett prosjekt; en ødelagt post uten klippliste hoppes over', async () => {
    const userId = `md2-${Date.now()}` as UserId
    const { workspace: w, close } = await createWorkspace(userId, { probe, blobCloneable: false })
    const old = await openDatabase(legacyName('motiondesign', userId, null), 1, (db) => {
      db.createObjectStore('projects', { keyPath: 'id' })
      db.createObjectStore('media')
    })
    const tx = old.transaction(['projects'], 'readwrite')
    tx.objectStore('projects').put({ id: 'p1', name: 'Ett', fmt: 'wide', w: 1920, h: 1080, media: [], clips: [], texts: [] })
    tx.objectStore('projects').put({ id: 'odelagt' })
    await new Promise((r) => (tx.oncomplete = r))
    old.close()
    const repo = new MdRepo(w.projects)
    const [a, b] = await Promise.all([importLegacyMotion(userId, w.assets, w.folders, repo), importLegacyMotion(userId, w.assets, w.folders, repo)])
    // begge kallene får samme resultat (én import), og prosjektet finnes bare én gang
    expect([a.added, b.added]).toEqual([1, 1])
    expect((await repo.list()).map((e) => e.name)).toEqual(['Ett'])
    close()
  })
})
