import { describe, expect, it } from 'vitest'
import { ZipWriter, zipParts } from '../../../shared/lib/zip'
import { assetIdsOf, PROJECT_SCHEMA } from '../repo'
import { batchDoc, batchLayer, cleanBatch, exportName, fitSide, isEdited, syncBatch, type BatchItem } from './batch'
import { ADJ } from './model'

const ID1 = '11111111-1111-4111-8111-111111111111'
const ID2 = '22222222-2222-4222-8222-222222222222'
const item = (id: string, src: string, o: Partial<BatchItem> = {}): BatchItem => ({ id, src, name: `${id}.jpg`, w: 400, h: 300, adj: { ...ADJ }, look: 'none', dev: null, thumb: 'data:image/jpeg;base64,AAAA', ...o })

describe('bildeserie', () => {
  it('redigert / uendret', () => {
    expect(isEdited(item('a', 'm:x'))).toBe(false)
    expect(isEdited(item('a', 'm:x', { look: 'warm' }))).toBe(true)
    expect(isEdited(item('a', 'm:x', { adj: { ...ADJ, exp: 10 } }))).toBe(true)
    expect(isEdited(item('a', 'm:x', { adj: { ...ADJ, curve: [[0, 0], [1, 1]] } }))).toBe(false)
    expect(isEdited(item('a', 'm:x', { adj: { ...ADJ, curveR: [[0, 0], [0.5, 0.6], [1, 1]] } }))).toBe(true)
    expect(isEdited(item('a', 'm:x', { dev: { whites: 0, blacks: 0, vib: 20, clarity: 0, sharp: 0 } }))).toBe(true)
  })

  it('innstillingene for bildet som er åpent, skrives tilbake; de andre bildene beholder sine', () => {
    const d = batchDoc('Serie', 1)
    d.batch = { items: [item('a', `m:${ID1}`), item('b', `m:${ID2}`, { adj: { ...ADJ, sat: 30 } })], active: 0, sel: [] }
    const first = d.batch.items[0] as BatchItem
    const L = batchLayer(first)
    expect(L.locked).toBe(true)
    expect([L.w, L.h, L.x, L.y]).toEqual([400, 300, 200, 150])
    d.layers = [{ ...L, adj: { ...L.adj, exp: 25 }, look: 'film' }]
    const s = syncBatch(d)
    expect(s.batch?.items[0]?.adj.exp).toBe(25)
    expect(s.batch?.items[0]?.look).toBe('film')
    expect(s.batch?.items[1]?.adj.sat).toBe(30)
    expect(d.batch.items[0]?.adj.exp, 'originalen er urørt').toBe(0)
  })

  it('lagring: alle bildene i serien regnes som brukte medier, og serien kontrolleres ved åpning', () => {
    const d = batchDoc('Serie', 1)
    d.batch = { items: [item('a', `m:${ID1}`), item('b', `m:${ID2}`)], active: 1, sel: ['b', 'ukjent'] }
    expect(assetIdsOf(d).sort()).toEqual([ID1, ID2])
    const v = PROJECT_SCHEMA.validate({ doc: { ...d, batch: { ...d.batch, items: [...d.batch.items, { id: 'x' }], active: 9 } }, masks: {}, thumb: '' })
    expect(v.ok).toBe(true)
    if (!v.ok) return
    expect(v.value.doc.batch?.items.map((x) => x.id)).toEqual(['a', 'b'])
    expect(v.value.doc.batch?.active).toBe(1)
    expect(v.value.doc.batch?.sel).toEqual(['b'])
    expect(cleanBatch(null)).toBeNull()
  })

  it('mål og filnavn', () => {
    expect(fitSide(4000, 3000)).toEqual([4000, 3000])
    expect(fitSide(16000, 4000)).toEqual([8000, 2000])
    expect(exportName('IMG_0001.HEIC.jpeg', 'png')).toBe('IMG_0001.HEIC.png')
    expect(exportName('.jpg', 'jpg')).toBe('bilde.jpg')
  })
})

describe('ZipWriter', () => {
  it('gir samme arkiv som zipParts, med unike navn', async () => {
    const date = new Date(2026, 9, 31, 12, 0, 0)
    const files = [{ name: 'a.jpg', data: new Uint8Array([1, 2, 3]) }, { name: 'A.jpg', data: new Uint8Array([4, 5]) }, { name: 'b.png', data: new Uint8Array([]) }]
    const z = new ZipWriter()
    for (const f of files) await z.add(f.name, new Blob([f.data as BlobPart]), date)
    const got = new Uint8Array(await z.blob().arrayBuffer())
    const want = new Uint8Array(await new Blob(zipParts(files.map((f) => ({ ...f, date }))) as BlobPart[]).arrayBuffer())
    expect(z.count).toBe(3)
    expect([...got]).toEqual([...want])
    expect(new TextDecoder().decode(got)).toContain('A (2).jpg')
  })
})
