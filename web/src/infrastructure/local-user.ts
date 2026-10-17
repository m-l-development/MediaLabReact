import { localStore } from '../shared/lib/storage'
import { mediaDbName } from './idb/media-db'
import { legacyName, LOCAL_OWNER_KEY } from './legacy-import/local-user'

/**
 * Lokale data per innlogget bruker (PLT-17), samme regler som media-lab/src/shared/local-user.js:
 * - Verktøyenes nøkler i localStorage får brukerens ID som suffiks (photodesign.cats → photodesign.cats@<bruker>), og
 *   dagens apps databaser leses med samme navneregel (legacyName). Den nye appens database er alltid medialab@<bruker>.
 * - Data fra før innlogging flyttes eller kopieres aldri. Den første brukeren som velger «Knytt til meg», blir eier
 *   (`ch.local.owner`): for den brukeren brukes de eksisterende navnene. Ingenting slettes.
 * - «Fjern mine lokale data» sletter bare den innloggede brukerens egne data, etter bekreftelse.
 * Begrensning (som i dag): et skille i appen, ikke i nettleseren. Fullt skille krever egne nettleserprofiler.
 */
export const DBS = ['photodesign', 'motiondesign', 'thumbstudio', 'mockuplib', 'ukeloop', 'medialab-share', 'mlfolders']
const LS_RE = /^(ukeloop\.|loopstudio\.|medialab\.fx\.|medialab\.advanced$|mockups\.|photodesign\.|thumbstudio\.|motiondesign\.)/
const ASKED = (uid: string) => 'ch.local.asked.' + uid
/** Loop Studio i den nye appen lagrer under ml2:<bruker>: (LoopStudio.tsx). */
const LOOP_PREFIX = (uid: string) => 'ml2:' + uid + ':'

export const isUserDb = (name: string): boolean => DBS.includes(name)
export const isUserKey = (key: string): boolean => LS_RE.test(key)

let current: string | null = null
/** Settes når brukerens arbeidsområde åpnes, før noe verktøy leser lagringen. */
export function setLocalUser(uid: string | null): void {
  current = uid
}
/** Nøkkelen for innlogget bruker (uendret for innstillinger som gjelder enheten, f.eks. tema og språk). */
export const userKey = (key: string): string => (isUserKey(key) ? legacyName(key, current) : key)
/** localStorage for verktøyenes innstillinger, per bruker. */
export const userStore = {
  get: (k: string): string | null => localStore.get(userKey(k)),
  set: (k: string, v: string): boolean => localStore.set(userKey(k), v),
  remove: (k: string): void => localStore.remove(userKey(k)),
}

function allKeys(): string[] {
  const out: string[] = []
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k) out.push(k)
    }
  } catch {
    // blokkert lagring
  }
  return out
}
async function existingDbs(idb: IDBFactory): Promise<Set<string> | null> {
  try {
    return new Set((await idb.databases()).map((d) => d.name ?? ''))
  } catch {
    return null
  }
}

export interface LegacyStatus { available: boolean; dbs: string[]; keys: number; conflicts: string[] }
/** Finnes det eierløse data fra før innlogging på denne enheten som brukeren kan knytte til seg? */
export async function legacyStatus(uid: string, idb: IDBFactory = indexedDB): Promise<LegacyStatus> {
  if (localStore.get(LOCAL_OWNER_KEY)) return { available: false, dbs: [], keys: 0, conflicts: [] }
  const have = await existingDbs(idb)
  const dbs = have ? DBS.filter((n) => have.has(n)) : []
  const conflicts = have ? DBS.filter((n) => have.has(n + '@' + uid)) : []
  const keys = allKeys().filter((k) => isUserKey(k) && !k.includes('@')).length
  return { available: dbs.length > 0 || keys > 0, dbs, keys, conflicts }
}

export const shouldAsk = (uid: string): boolean => !localStore.get(ASKED(uid))
export const rememberAnswer = (uid: string, v: 'adopted' | 'nei' | 'konflikt'): void => void localStore.set(ASKED(uid), v)

export type AdoptResult = { ok: true; dbs: string[]; keys: number } | { ok: false; error: 'har_eier' | 'ingenting' | 'konflikt' | 'lagring' }
/**
 * Gjør brukeren til eier av de gamle dataene. Ingen data røres. Har brukeren allerede egne databaser med samme navn
 * (de ville blitt skjult), endres ingenting.
 */
export async function adoptLegacy(uid: string, idb: IDBFactory = indexedDB): Promise<AdoptResult> {
  if (localStore.get(LOCAL_OWNER_KEY)) return { ok: false, error: 'har_eier' }
  const st = await legacyStatus(uid, idb)
  if (!st.available) return { ok: false, error: 'ingenting' }
  if (st.conflicts.length) return { ok: false, error: 'konflikt' }
  if (!localStore.set(LOCAL_OWNER_KEY, uid)) return { ok: false, error: 'lagring' }
  rememberAnswer(uid, 'adopted')
  return { ok: true, dbs: st.dbs, keys: st.keys }
}

const deleteDb = (idb: IDBFactory, name: string) =>
  new Promise<void>((res) => {
    const r = idb.deleteDatabase(name)
    r.onsuccess = r.onerror = r.onblocked = () => res()
  })

/**
 * Sletter BARE brukerens lokale data: den nye appens database, dagens apps databaser og nøkler med brukerens navn
 * (også gamle data brukeren har knyttet til seg) og Loop Studios nøkler. Tema, språk og andres data røres ikke.
 * Videoer i prosjektmapper på PC-en ligger utenfor nettleseren og røres ikke.
 */
export async function clearMyLocalData(uid: string, idb: IDBFactory = indexedDB): Promise<{ keys: number }> {
  const owner = localStore.get(LOCAL_OWNER_KEY)
  await deleteDb(idb, mediaDbName(uid))
  for (const n of DBS) await deleteDb(idb, legacyName(n, uid, owner))
  const mine = allKeys().filter((k) => {
    if (k.startsWith(LOOP_PREFIX(uid))) return true
    const base = k.replace(/@[0-9a-f-]{36}$/, '')
    return isUserKey(base) && legacyName(base, uid, owner) === k
  })
  for (const k of mine) localStore.remove(k)
  if (owner === uid) localStore.remove(LOCAL_OWNER_KEY)
  localStore.remove(ASKED(uid))
  return { keys: mine.length }
}
