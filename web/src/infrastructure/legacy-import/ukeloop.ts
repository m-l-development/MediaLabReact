import { localStore } from '../../shared/lib/storage'
import { openExisting, request } from '../idb/idb'
import { legacyName, LOCAL_OWNER_KEY } from './local-user'

/**
 * Loop Studio i dagens app. Bare lesing; ingenting endres eller slettes.
 * - localStorage (per bruker, samme regel som local-user.js): arbeidskopiene `ukeloop.v2`, `ukeloop.v5.youth`,
 *   `ukeloop.v2.<mal>` og `ukeloop.custom.<id>`, Disk `loopstudio.disk.v1`, malkort `loopstudio.tpls.v1`,
 *   personlige grunnoppsett `loopstudio.bases.v1` og lydbiblioteket `ukeloop.audiolib.v1`.
 * - IndexedDB `ukeloop` (lager `media`): bilder `img-*`, videoer på slider `vid-*`, bakgrunnsvideo `video` /
 *   `video.<mal>`, lydsporet `audio` og lydbiblioteket `lib:<id>`.
 */
export interface LegacyLoop {
  /** Arbeidskopiene: lagringsnøkkel (uten brukerdel) → rå JSON. */
  slots: Map<string, string>
  /** Annen lagring i localStorage (uten brukerdel) → rå JSON. */
  get(key: string): string | null
  media(key: string): Promise<Blob | null>
  close(): void
}

const SLOT = /^ukeloop\.(v2|v5\.youth|v2\.[a-z]+|custom\.[a-z0-9-]{3,24})$/

async function toBlob(v: unknown): Promise<Blob | null> {
  const b = v as { type?: string; arrayBuffer?: () => Promise<ArrayBuffer> } | null
  if (!b || typeof b.arrayBuffer !== 'function') return null
  return b instanceof Blob ? b : new Blob([await b.arrayBuffer()], { type: b.type || '' })
}

/** Nøklene i localStorage som tilhører brukeren (uten brukerdelen «@<id>»). */
function userKeys(userId: string | null, storage: Storage): string[] {
  const owner = localStore.get(LOCAL_OWNER_KEY)
  const mine = !userId || owner === userId
  const out: string[] = []
  try {
    for (let i = 0; i < storage.length; i++) {
      const k = storage.key(i)
      if (!k) continue
      const at = k.lastIndexOf('@')
      if (at > 0) { if (userId && k.slice(at + 1) === userId && !mine) out.push(k.slice(0, at)) }
      else if (mine) out.push(k)
    }
  } catch {
    // lagringen kan ikke leses
  }
  return out
}

export async function readLegacyLoop(userId: string | null, factory?: IDBFactory, storage: Storage = localStorage): Promise<LegacyLoop | null> {
  const get = (key: string) => localStore.get(legacyName(key, userId))
  const slots = new Map<string, string>()
  for (const k of userKeys(userId, storage)) {
    if (!SLOT.test(k)) continue
    const raw = get(k)
    if (raw) slots.set(k, raw)
  }
  const db = await openExisting(legacyName('ukeloop', userId), factory).catch(() => null)
  if (!slots.size && !get('loopstudio.disk.v1') && !get('loopstudio.bases.v1') && !get('ukeloop.audiolib.v1') && !get('loopstudio.tpls.v1')) {
    db?.close()
    return null
  }
  return {
    slots,
    get,
    async media(key) {
      if (!db?.objectStoreNames.contains('media')) return null
      try {
        return await toBlob(await request(db.transaction('media', 'readonly').objectStore('media').get(key)))
      } catch {
        return null
      }
    },
    close() {
      db?.close()
    },
  }
}
