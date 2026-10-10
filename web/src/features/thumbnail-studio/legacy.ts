import type { AssetService } from '../../services/assets/asset-service'
import { readLegacyThumb } from '../../infrastructure/legacy-import/thumbstudio'
import { cleanCategory, cleanDoc, type Category, type Template } from './engine/backup'
import { MAX_TPL } from './engine/model'
import type { ThumbRepo } from './repo'

const DONE_KEY = 'thumbstudio.legacyImported'
const IMG_KEY = 'thumbstudio.legacyImages'

type Settings = { get<T>(key: string): Promise<T | undefined>; set(key: string, value: unknown): Promise<void> }

/**
 * Henter kategorier, maler og bilder fra Thumbnail Studio i dagens app (kopi; originalen røres ikke).
 * Bildene legges i Dine medier (samme bilde lagres én gang), og malene blir prosjekter. Kan kjøres flere ganger:
 * maler og bilder som allerede er hentet, hoppes over.
 */
export async function importLegacyThumb(userId: string | null, assets: AssetService, repo: ThumbRepo, settings: Settings): Promise<{ cats: Category[] | null; added: number }> {
  const legacy = await readLegacyThumb(userId)
  if (!legacy) return { cats: null, added: 0 }
  const done = new Set((await settings.get<string[]>(DONE_KEY)) ?? [])
  const imgMap: Record<string, string> = (await settings.get<Record<string, string>>(IMG_KEY)) ?? {}
  const pendingTpls = legacy.tpls.filter((t): t is Record<string, unknown> => !!t && typeof t === 'object' && typeof (t as { id?: unknown }).id === 'string' && !done.has((t as { id: string }).id))

  // Bildene som brukes (bare de som trengs, og bare én gang)
  const used = new Set<string>()
  const scan = (v: unknown) => {
    const s = JSON.stringify(v ?? null)
    for (const m of s.matchAll(/"db:([A-Za-z0-9]{1,60})"/g)) if (m[1]) used.add(m[1])
  }
  scan(legacy.cats)
  scan(pendingTpls)
  for (const k of used) {
    if (imgMap[k]) continue
    const blob = legacy.images.get(k)
    if (!blob) continue
    try {
      const a = await assets.register(blob, { name: `thumbnail-${k}`, legacy: { source: 'thumbstudio', id: k } })
      imgMap[k] = a.id
    } catch {
      // et bilde som ikke kan leses, blir et tomt bildefelt
    }
  }
  await settings.set(IMG_KEY, imgMap)
  const local = (src: string) => {
    if (src.startsWith('m:')) return src
    const id = src.startsWith('db:') ? imgMap[src.slice(3)] : undefined
    return id ? `m:${id}` : null
  }

  const cats = legacy.cats ? legacy.cats.map((c) => cleanCategory(c, local)).filter((c): c is Category => !!c) : null
  const current = await repo.listTpls()
  const catIds = new Set((cats ?? []).map((c) => c.id))
  const per = new Map<string, number>()
  for (const t of current) per.set(t.catId, (per.get(t.catId) ?? 0) + 1)
  const fresh: Template[] = []
  const legacyIds = new Map<string, { source: string; id: string }>()
  for (const t of pendingTpls) {
    const id = t.id as string
    const catId = typeof t.catId === 'string' ? t.catId : ''
    if (!catId || (catIds.size && !catIds.has(catId))) continue
    const n = (per.get(catId) ?? 0) + 1
    if (n > MAX_TPL) continue
    const doc = cleanDoc(t.doc, local)
    if (!doc) continue
    per.set(catId, n)
    const tmp = `legacy-${id}`
    legacyIds.set(tmp, { source: 'thumbstudio', id })
    fresh.push({
      id: tmp, catId, name: String(t.name ?? 'Uten navn').slice(0, 60), doc,
      thumb: typeof t.thumb === 'string' && /^data:image\/(jpeg|png);base64,/.test(t.thumb) ? t.thumb : '',
      updated: typeof t.updated === 'number' ? t.updated : Date.now(),
    })
    done.add(id)
  }
  if (fresh.length) await repo.saveTpls([...current, ...fresh], legacyIds)
  await settings.set(DONE_KEY, [...done])
  return { cats, added: fresh.length }
}
