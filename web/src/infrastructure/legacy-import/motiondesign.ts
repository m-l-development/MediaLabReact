import type { DirHandle } from '../fs/project-folders'
import { openExisting, request } from '../idb/idb'
import { legacyName } from './local-user'

/**
 * Motion design i dagens app: IndexedDB `motiondesign` (lagrene `projects` og `media`) og prosjektmappene i `mlfolders`
 * (nøkkel `motion:<prosjekt-ID>`). Bare lesing; ingenting endres eller slettes.
 * En mediepost er enten `{ blob, name, type }` (i nettleseren) eller `{ path, pid, name, type, size }` (i prosjektmappen).
 */
export interface LegacyMediaRec { blob: Blob | null; name: string; type: string; path: string | null; size: number }

export interface LegacyMotion {
  projects: Record<string, unknown>[]
  media(key: string): Promise<LegacyMediaRec | null>
  folder(pid: string): Promise<{ handle: DirHandle; name: string } | null>
  close(): void
}

const isRec = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)

export async function readLegacyMotion(userId: string | null, factory?: IDBFactory): Promise<LegacyMotion | null> {
  const db = await openExisting(legacyName('motiondesign', userId), factory)
  if (!db) return null
  const has = (s: string) => db.objectStoreNames.contains(s)
  const projects = has('projects') ? ((await request(db.transaction('projects', 'readonly').objectStore('projects').getAll())) as unknown[]) : []
  const folders = await openExisting('mlfolders', factory).catch(() => null)
  return {
    projects: projects.filter(isRec),
    async media(key) {
      if (!has('media')) return null
      const r = (await request(db.transaction('media', 'readonly').objectStore('media').get(key))) as unknown
      if (!isRec(r)) return null
      const b = r.blob as { arrayBuffer?: () => Promise<ArrayBuffer>; type?: string; size?: number } | undefined
      const blob = b instanceof Blob ? b : b && typeof b.arrayBuffer === 'function' ? new Blob([await b.arrayBuffer()], { type: b.type ?? '' }) : null
      return {
        blob,
        name: typeof r.name === 'string' ? r.name : 'Fil',
        type: typeof r.type === 'string' ? r.type : blob?.type ?? '',
        path: typeof r.path === 'string' && /^media\/[^/\\]+$/.test(r.path) ? r.path : null,
        size: typeof r.size === 'number' ? r.size : blob?.size ?? 0,
      }
    },
    async folder(pid) {
      if (!folders?.objectStoreNames.contains('h')) return null
      const r = (await request(folders.transaction('h', 'readonly').objectStore('h').get(`motion:${pid}`)).catch(() => null)) as unknown
      return isRec(r) && r.handle ? { handle: r.handle as DirHandle, name: typeof r.name === 'string' ? r.name : '' } : null
    },
    close() {
      db.close()
      folders?.close()
    },
  }
}
