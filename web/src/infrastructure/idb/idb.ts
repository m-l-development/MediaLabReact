/**
 * Tynn, løftebasert innpakning rundt IndexedDB. Ingen avhengigheter; brukes av lagrene i infrastructure/.
 */

export function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('IndexedDB-feil'))
  })
}

export function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onabort = () => reject(tx.error ?? new Error('Transaksjonen ble avbrutt'))
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB-feil'))
  })
}

export type Upgrade = (db: IDBDatabase, oldVersion: number, tx: IDBTransaction) => void

export function openDatabase(name: string, version: number, upgrade: Upgrade, factory: IDBFactory = indexedDB): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = factory.open(name, version)
    req.onupgradeneeded = (e) => {
      const tx = req.transaction
      if (tx) upgrade(req.result, e.oldVersion, tx)
    }
    req.onsuccess = () => {
      const db = req.result
      // En annen fane med nyere versjon: lukk, så den kan oppgradere.
      db.onversionchange = () => db.close()
      resolve(db)
    }
    req.onerror = () => reject(req.error ?? new Error(`Kunne ikke åpne ${name}`))
    req.onblocked = () => reject(new Error(`${name} er åpen i en annen fane med en eldre versjon. Lukk den andre fanen og prøv igjen.`))
  })
}

/** Åpner en eksisterende database uten å opprette den (for lesing av gamle data). Returnerer null hvis den ikke finnes. */
export async function openExisting(name: string, factory: IDBFactory = indexedDB): Promise<IDBDatabase | null> {
  if (typeof factory.databases === 'function') {
    const all = await factory.databases()
    if (!all.some((d) => d.name === name)) return null
  }
  return new Promise((resolve, reject) => {
    let created = false
    const req = factory.open(name)
    req.onupgradeneeded = () => {
      // Databasen fantes ikke: avbryt så vi ikke lager en tom kopi.
      created = true
      req.transaction?.abort()
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => (created ? resolve(null) : reject(req.error ?? new Error(`Kunne ikke åpne ${name}`)))
  })
}

export async function readAll<T>(db: IDBDatabase, store: string): Promise<T[]> {
  if (!db.objectStoreNames.contains(store)) return []
  return request(db.transaction(store, 'readonly').objectStore(store).getAll() as IDBRequest<T[]>)
}
