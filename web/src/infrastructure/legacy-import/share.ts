import { openExisting, readAll } from '../idb/idb'
import { legacyName } from './local-user'

/** Et element i dagens delte mappe (IndexedDB `medialab-share`, lager `items`; media-lab/src/legacy/ml-share.js). */
export interface LegacyShareItem {
  id: string
  name: string
  type: string
  size: number
  from: string
  created: number
  blob: Blob
}

type BlobLike = { size: number; type?: string; arrayBuffer(): Promise<ArrayBuffer> }

function isItem(x: unknown): x is Omit<LegacyShareItem, 'blob'> & { blob: BlobLike } {
  const v = x as { id?: unknown; blob?: Partial<BlobLike> } | null
  return !!v && typeof v.id === 'string' && !!v.blob && typeof v.blob.size === 'number' && typeof v.blob.arrayBuffer === 'function'
}

/** Gjør innholdet om til en vanlig Blob (i nettleseren er den det allerede). */
async function toBlob(b: BlobLike, type: string): Promise<Blob> {
  return b instanceof Blob ? b : new Blob([await b.arrayBuffer()], { type: b.type || type })
}

/** Leser (bare leser) dagens delte mappe for brukeren. Tom liste hvis den ikke finnes. */
export async function readLegacyShare(userId: string | null, factory?: IDBFactory): Promise<LegacyShareItem[]> {
  const db = await openExisting(legacyName('medialab-share', userId), factory)
  if (!db) return []
  try {
    const rows = (await readAll<unknown>(db, 'items')).filter(isItem)
    const items = await Promise.all(rows.map(async (r) => ({ ...r, blob: await toBlob(r.blob, r.type) })))
    return items.sort((a, b) => b.created - a.created)
  } finally {
    db.close()
  }
}
