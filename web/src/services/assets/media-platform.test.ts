import { Blob as NodeBlob } from 'node:buffer'
import { describe, expect, it } from 'vitest'
import { createWorkspace } from '../../app/workspace'
import type { AssetId, ProjectId, UserId } from '../../domain/ids'
import { openDatabase } from '../../infrastructure/idb/idb'
import { legacyName } from '../../infrastructure/legacy-import/local-user'
import { array, object, string } from '../../domain/validation'
import type { MediaProbe } from './types'
import type { ProjectSchema } from '../projects/project-service'

const probe: MediaProbe = {
  async probe(_blob, kind) {
    return kind === 'image' ? { meta: { width: 10, height: 5 }, thumb: new Blob(['thumb'], { type: 'image/webp' }) } : { meta: { duration: 3 } }
  },
}

let n = 0
async function workspace() {
  const userId = `test-${Date.now()}-${n++}` as UserId
  const { workspace: w, close } = await createWorkspace(userId, { probe, blobCloneable: false })
  return { ...w, close, userId }
}

const png = (text = 'bilde') => new File([text], 'bilde.png', { type: 'image/png' })

type Doc = { title: string; images: string[] }
const schema: ProjectSchema<Doc> = {
  tool: 'thumbnail-studio',
  version: 2,
  migrations: { 1: (d) => ({ ...(d as object), images: [] }) },
  validate: (d) => object({ title: string, images: array(string) })(d, 'doc') as ReturnType<ProjectSchema<Doc>['validate']>,
  assetsOf: (d) => d.images as AssetId[],
}

describe('mediebiblioteket', () => {
  it('lagrer samme fil én gang og gir samme asset ved ny opplasting', async () => {
    const w = await workspace()
    const a = await w.assets.register(png())
    const b = await w.assets.register(png())
    expect(b.id).toBe(a.id)
    expect(a.meta).toEqual({ width: 10, height: 5 })
    expect(a.thumb).toBeTruthy()
    expect(await (await w.assets.open(a.id)).text()).toBe('bilde')
    expect((await w.assets.query()).length).toBe(1)
    w.close()
  })

  it('avviser filtyper som ikke støttes', async () => {
    const w = await workspace()
    await expect(w.assets.register(new File(['x'], 'a.pdf', { type: 'application/pdf' }))).rejects.toMatchObject({ code: 'unsupported_type' })
    w.close()
  })

  it('aldri video i skyen (SHR-08)', async () => {
    const w = await workspace()
    await expect(w.assets.register(new File(['v'], 'v.mp4', { type: 'video/mp4' }), { origin: { type: 'cloud', fileId: 'x' } }))
      .rejects.toMatchObject({ code: 'cloud_video_forbidden' })
    w.close()
  })

  it('ny versjon peker på originalen, og originalen er urørt', async () => {
    const w = await workspace()
    const original = await w.assets.register(png('original'))
    const cut = await w.assets.derive(original.id, new Blob(['utklipp'], { type: 'image/png' }), { name: 'isolate' }, 'isolate-subject', 'motiv.png')
    expect(cut.origin).toMatchObject({ type: 'derived', from: original.id, tool: 'isolate-subject' })
    expect((await w.assets.lineage(cut.id)).map((a) => a.id)).toEqual([original.id, cut.id])
    expect(await (await w.assets.open(original.id)).text()).toBe('original')
    expect(await (await w.assets.open(cut.id)).text()).toBe('utklipp')
    w.close()
  })

  it('filtrerer og søker', async () => {
    const w = await workspace()
    await w.assets.register(png('a'))
    await w.assets.register(new File(['lyd'], 'sang.mp3', { type: 'audio/mpeg' }))
    expect((await w.assets.query({ kinds: ['audio'] })).map((a) => a.name)).toEqual(['sang.mp3'])
    expect((await w.assets.query({ text: 'BILDE' })).length).toBe(1)
    w.close()
  })

  it('sletter ikke en fil som brukes i et prosjekt; sletter innholdet når ingen bruker det', async () => {
    const w = await workspace()
    const a = await w.assets.register(png('brukt'))
    const p = await w.projects.create(schema, 'Søndag', { title: 'x', images: [a.id] })
    expect(await w.assets.release(a.id)).toBe('in-use')
    await w.projects.remove(p.id)
    expect(await w.assets.release(a.id)).toBe('deleted')
    await expect(w.assets.open(a.id)).rejects.toMatchObject({ code: 'not_found' })
    w.close()
  })
})

describe('prosjekter', () => {
  it('lagrer, lister og åpner med migrering uten å endre det lagrede', async () => {
    const w = await workspace()
    const p = await w.projects.create(schema, ' Plakat ', { title: 'Hei', images: [] })
    expect(p.name).toBe('Plakat')
    expect(p.schemaVersion).toBe(2)
    const opened = await w.projects.open(schema, p.id)
    expect(opened.doc).toEqual({ title: 'Hei', images: [] })
    expect((await w.projects.list('thumbnail-studio')).length).toBe(1)
    const copy = await w.projects.duplicate(p.id, 'Kopi')
    expect(copy.id).not.toBe(p.id)
    w.close()
  })

  it('avviser ugyldige dokumenter og feil verktøy', async () => {
    const w = await workspace()
    await expect(w.projects.create(schema, 'x', { title: 1 } as unknown as Doc)).rejects.toMatchObject({ code: 'invalid_project' })
    const p = await w.projects.create(schema, 'x', { title: 'y', images: [] })
    await expect(w.projects.open({ ...schema, tool: 'mockups' }, p.id)).rejects.toMatchObject({ code: 'wrong_tool' })
    await expect(w.projects.open(schema, 'finnes-ikke' as ProjectId)).rejects.toMatchObject({ code: 'not_found' })
    w.close()
  })
})

describe('import fra dagens delte mappe', () => {
  it('bruker samme databasenavn per bruker som dagens app', () => {
    expect(legacyName('medialab-share', null)).toBe('medialab-share')
    expect(legacyName('medialab-share', 'u1', 'u1')).toBe('medialab-share')
    expect(legacyName('medialab-share', 'u1', 'annen')).toBe('medialab-share@u1')
  })

  it('kopierer filene én gang og lar dagens data være urørt', async () => {
    const w = await workspace()
    const legacy = await openDatabase(legacyName('medialab-share', w.userId, null), 1, (db) => db.createObjectStore('items', { keyPath: 'id' }))
    const tx = legacy.transaction('items', 'readwrite')
    // Nodes Blob kan klones av testmiljøets IndexedDB (happy-doms Blob kan ikke).
    tx.objectStore('items').put({ id: 's-1', name: 'Plakat.png', type: 'image/png', size: 4, from: 'Photo design', created: 100, thumb: '', blob: new NodeBlob(['data'], { type: 'image/png' }) })
    tx.objectStore('items').put({ id: 's-2', name: 'Feil.txt', type: 'text/plain', size: 1, from: '', created: 50, thumb: '', blob: new NodeBlob(['x'], { type: 'text/plain' }) })
    await new Promise((r) => (tx.oncomplete = r))
    legacy.close()

    expect(await w.shareImport.pending()).toBe(2)
    const r = await w.shareImport.run()
    expect(r.imported).toBe(1)
    expect(r.failed.map((f) => f.name)).toEqual(['Feil.txt'])
    const [asset] = await w.assets.query()
    expect(asset).toMatchObject({ name: 'Plakat.png', createdAt: 100, legacy: { source: 'medialab-share', id: 's-1' } })

    const again = await w.shareImport.run()
    expect(again.imported).toBe(0)
    expect(again.skipped).toBe(1)

    const check = await openDatabase(legacyName('medialab-share', w.userId, null), 1, () => {})
    const count = await new Promise<number>((res) => {
      const req = check.transaction('items').objectStore('items').count()
      req.onsuccess = () => res(req.result)
    })
    expect(count).toBe(2)
    check.close()
    w.close()
  })
})
