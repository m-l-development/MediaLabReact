import { openExisting, request } from '../idb/idb'
import { legacyName } from './local-user'

/** Thumbnail Studio i dagens app (IndexedDB `thumbstudio`: lager `kv` med cats/tpls og `img` med bildene). Bare lesing. */
export interface LegacyThumb {
  cats: unknown[] | null
  tpls: unknown[]
  images: Map<string, Blob>
}

async function toBlob(v: unknown): Promise<Blob | null> {
  const b = v as { type?: string; arrayBuffer?: () => Promise<ArrayBuffer> } | null
  if (!b || typeof b.arrayBuffer !== 'function') return null
  return b instanceof Blob ? b : new Blob([await b.arrayBuffer()], { type: b.type || 'image/jpeg' })
}

export async function readLegacyThumb(userId: string | null, factory?: IDBFactory): Promise<LegacyThumb | null> {
  const db = await openExisting(legacyName('thumbstudio', userId), factory)
  if (!db) return null
  try {
    const has = (s: string) => db.objectStoreNames.contains(s)
    const kv = has('kv') ? db.transaction('kv', 'readonly').objectStore('kv') : null
    const cats = kv ? await request<unknown>(kv.get('cats')) : null
    const kv2 = has('kv') ? db.transaction('kv', 'readonly').objectStore('kv') : null
    const tpls = kv2 ? await request<unknown>(kv2.get('tpls')) : null
    const images = new Map<string, Blob>()
    if (has('img')) {
      const store = db.transaction('img', 'readonly').objectStore('img')
      const keys = await request(store.getAllKeys())
      const vals = await request(db.transaction('img', 'readonly').objectStore('img').getAll())
      for (let i = 0; i < keys.length; i++) {
        const k = keys[i]
        const b = await toBlob(vals[i])
        if (typeof k === 'string' && b) images.set(k, b)
      }
    }
    return { cats: Array.isArray(cats) && cats.length ? cats : null, tpls: Array.isArray(tpls) ? tpls : [], images }
  } finally {
    db.close()
  }
}
