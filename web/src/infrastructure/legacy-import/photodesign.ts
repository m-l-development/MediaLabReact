import { openExisting, request } from '../idb/idb'
import { legacyName } from './local-user'

/** Photo Design i dagens app (IndexedDB `photodesign`: `projects` med keyPath id og `media` med bilder og masker). Bare lesing. */
export interface LegacyPhoto { projects: Record<string, unknown>[]; media: (key: string) => Promise<Blob | null> }

async function toBlob(v: unknown): Promise<Blob | null> {
  const b = v as { type?: string; arrayBuffer?: () => Promise<ArrayBuffer> } | null
  if (!b || typeof b.arrayBuffer !== 'function') return null
  return b instanceof Blob ? b : new Blob([await b.arrayBuffer()], { type: b.type || 'image/png' })
}

export async function readLegacyPhoto(userId: string | null, factory?: IDBFactory): Promise<LegacyPhoto | null> {
  const db = await openExisting(legacyName('photodesign', userId), factory)
  if (!db) return null
  const has = (s: string) => db.objectStoreNames.contains(s)
  const projects = has('projects') ? ((await request(db.transaction('projects', 'readonly').objectStore('projects').getAll())) as unknown[]) : []
  const cache = new Map<string, Blob | null>()
  if (has('media')) {
    const store = db.transaction('media', 'readonly').objectStore('media')
    const keys = await request(store.getAllKeys())
    const vals = await request(db.transaction('media', 'readonly').objectStore('media').getAll())
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i]
      if (typeof k === 'string') cache.set(k, await toBlob(vals[i]))
    }
  }
  db.close()
  return {
    projects: projects.filter((p): p is Record<string, unknown> => !!p && typeof p === 'object'),
    media: async (k) => cache.get(k) ?? null,
  }
}
