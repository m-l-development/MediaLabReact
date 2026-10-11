import { readLegacyPhoto } from '../../infrastructure/legacy-import/photodesign'
import type { AssetService } from '../../services/assets/asset-service'
import type { PdDoc, PdLayer } from './engine/model'
import { validDoc, type PdRepo, type PdStored } from './repo'

const isRec = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)

async function blobToData(b: Blob): Promise<string> {
  const bytes = new Uint8Array(await b.arrayBuffer())
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return `data:${b.type || 'application/octet-stream'};base64,${btoa(bin)}`
}

function dataToBlob(u: unknown): Blob | null {
  const m = /^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/=]+)$/.exec(typeof u === 'string' ? u : '')
  if (!m?.[1] || !m[2]) return null
  const bin = atob(m[2])
  const a = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i)
  return new Blob([a], { type: m[1] })
}

const allLayers = (d: Pick<PdDoc, 'layers' | 'back'>): PdLayer[] => [...d.layers, ...(d.back?.layers ?? [])]

/**
 * Gjør om et prosjekt fra dagens format (bilder og masker som nøkler i et eget lager) til det nye:
 * bildene legges i Dine medier (`m:<id>`), maskene blir PNG-er i prosjektet.
 */
async function convert(p: Record<string, unknown>, media: (k: string) => Promise<Blob | null>, assets: AssetService, srcMap: Map<string, string>): Promise<PdStored | null> {
  if (!validDoc(p)) return null
  const doc = structuredClone(p) as PdDoc & { tpl?: unknown; cat?: unknown; thumb?: unknown }
  const masks: Record<string, string> = {}
  for (const L of allLayers(doc)) {
    if (L.type !== 'image') continue
    if (L.src && !L.src.startsWith('m:')) {
      let to = srcMap.get(L.src)
      if (!to) {
        const b = await media(L.src)
        if (b && /^image\//.test(b.type)) {
          try {
            const a = await assets.register(b, { name: `${String(L.name || 'bilde').slice(0, 60)}`, legacy: { source: 'photodesign', id: L.src } })
            to = `m:${a.id}`
            srcMap.set(L.src, to)
          } catch {
            to = undefined
          }
        }
      }
      L.src = to ?? null
    }
    if (L.mask) {
      const b = await media(L.mask)
      if (b) masks[L.mask] = await blobToData(b)
      else L.mask = null
    }
  }
  const tpl = doc.tpl === true && typeof doc.cat === 'string' ? { cat: doc.cat } : null
  const thumb = typeof doc.thumb === 'string' && /^data:image\/(jpeg|png);base64,/.test(doc.thumb) ? doc.thumb : ''
  delete doc.tpl
  delete doc.cat
  delete doc.thumb
  return { doc, masks, thumb, tpl }
}

/** Henter prosjekter og maler fra Photo Design i dagens app (kopi). Kan kjøres flere ganger. → antall nye. */
export async function importLegacyPhoto(userId: string | null, assets: AssetService, repo: PdRepo): Promise<number> {
  const legacy = await readLegacyPhoto(userId)
  if (!legacy) return 0
  await repo.list()
  const srcMap = new Map<string, string>()
  let n = 0
  for (const p of legacy.projects) {
    const id = typeof p.id === 'string' ? p.id : ''
    if (!id || repo.findLegacy(id)) continue
    const s = await convert(p, legacy.media, assets, srcMap)
    if (!s) continue
    await repo.save(null, s, { legacy: { source: 'photodesign', id }, ...(typeof p.created === 'number' ? { createdAt: p.created } : {}) })
    n++
  }
  return n
}

/** Sikkerhetskopi i dagens format (`app: 'photodesign', v: 1`), med bilder og masker som data-URL-er. */
export async function backupPhoto(repo: PdRepo, assets: AssetService): Promise<Blob> {
  const list = await repo.list()
  const projects: Record<string, unknown>[] = []
  const media: Record<string, string> = {}
  const key = (src: string) => (src.startsWith('m:') ? 'm' + src.slice(2).replace(/-/g, '') : src)
  for (const e of list) {
    const s = await repo.open(e.id)
    const doc = structuredClone(s.doc)
    for (const L of allLayers(doc)) {
      if (L.type !== 'image') continue
      if (L.src) {
        const k = key(L.src)
        if (!media[k] && L.src.startsWith('m:')) {
          try {
            media[k] = await blobToData(await assets.open(L.src.slice(2) as Parameters<AssetService['open']>[0]))
          } catch {
            // bildet finnes ikke lenger
          }
        }
        L.src = k
      }
      if (L.mask && s.masks[L.mask]) media[L.mask] = s.masks[L.mask] as string
    }
    projects.push({ ...doc, id: doc.id, updated: e.updated, thumb: s.thumb, ...(s.tpl ? { tpl: true, cat: s.tpl.cat } : {}) })
  }
  return new Blob([JSON.stringify({ app: 'photodesign', v: 1, date: new Date().toISOString(), projects, media })], { type: 'application/json' })
}

/** Gjenoppretter en sikkerhetskopi (dagens eller ny app). Samme prosjekt-ID erstattes. → antall prosjekter. */
export async function restorePhoto(file: File, repo: PdRepo, assets: AssetService): Promise<number> {
  if (!/\.json$/i.test(file.name) || file.size > 800e6) throw new Error('file')
  let o: unknown
  try {
    o = JSON.parse(await file.text())
  } catch {
    throw new Error('read')
  }
  if (!isRec(o) || o.app !== 'photodesign' || !Array.isArray(o.projects)) throw new Error('format')
  const blobs = new Map<string, Blob>()
  if (isRec(o.media)) {
    for (const [k, v] of Object.entries(o.media)) {
      if (!/^[\w-]{1,40}$/.test(k)) continue
      const b = dataToBlob(v)
      if (b) blobs.set(k, b)
    }
  }
  await repo.list()
  const srcMap = new Map<string, string>()
  let n = 0
  for (const p of o.projects as unknown[]) {
    if (!isRec(p) || typeof p.id !== 'string') continue
    const s = await convert(p, async (k) => blobs.get(k) ?? null, assets, srcMap)
    if (!s) continue
    await repo.save(repo.findLegacy(p.id), s, { legacy: { source: 'photodesign', id: p.id } })
    n++
  }
  return n
}
