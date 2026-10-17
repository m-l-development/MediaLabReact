import type { Asset } from '../../domain/asset'
import type { AssetId, ContentHash } from '../../domain/ids'
import type { ProjectEnvelope } from '../../domain/project'
import type { AssetRepository } from '../../services/assets/types'
import type { ProjectRepository } from '../../services/projects/types'
import { openDatabase, request, transactionDone } from './idb'

/**
 * Den nye appens database, én per bruker: `medialab@<bruker-id>` (se docs/media-model.md §7).
 * Gamle databaser (photodesign, thumbstudio …) røres aldri; de leses av infrastructure/legacy-import.
 */
export const MEDIA_DB_VERSION = 1

export const STORES = {
  assets: 'assets',
  blobs: 'blobs',
  projects: 'projects',
  elements: 'elements',
  settings: 'settings',
  legacyImports: 'legacy-imports',
} as const

export function mediaDbName(userId: string | null): string {
  return `medialab@${userId ?? 'lokal'}`
}

export function openMediaDb(userId: string | null, factory?: IDBFactory): Promise<IDBDatabase> {
  return openDatabase(mediaDbName(userId), MEDIA_DB_VERSION, (db, oldVersion) => {
    if (oldVersion < 1) {
      const assets = db.createObjectStore(STORES.assets, { keyPath: 'id' })
      assets.createIndex('hash', 'content.hash')
      assets.createIndex('createdAt', 'createdAt')
      db.createObjectStore(STORES.blobs)
      const projects = db.createObjectStore(STORES.projects, { keyPath: 'id' })
      projects.createIndex('tool', 'tool')
      projects.createIndex('updatedAt', 'updatedAt')
      projects.createIndex('assets', 'assets', { multiEntry: true })
      db.createObjectStore(STORES.elements, { keyPath: 'id' })
      db.createObjectStore(STORES.settings)
      db.createObjectStore(STORES.legacyImports)
    }
  }, factory)
}

/**
 * Innhold lagres som Blob (nettleseren lagrer den effektivt). Der Blob ikke kan klones (enkelte testmiljøer),
 * lagres bytes + type og gjøres om til Blob ved lesing.
 */
type StoredBlob = Blob | { bytes: ArrayBuffer; type: string }

async function toStored(blob: Blob, blobCloneable: boolean): Promise<StoredBlob> {
  return blobCloneable ? blob : { bytes: await blob.arrayBuffer(), type: blob.type }
}

function fromStored(v: StoredBlob | undefined): Blob | undefined {
  if (!v) return undefined
  return v instanceof Blob ? v : new Blob([v.bytes], { type: v.type })
}

export function createAssetRepository(db: IDBDatabase, opts: { blobCloneable?: boolean } = {}): AssetRepository {
  const blobCloneable = opts.blobCloneable ?? true
  const store = (name: string, mode: IDBTransactionMode) => db.transaction(name, mode).objectStore(name)
  return {
    async putAsset(asset) {
      await request(store(STORES.assets, 'readwrite').put(asset))
    },
    async getAsset(id) {
      return request(store(STORES.assets, 'readonly').get(id) as IDBRequest<Asset | undefined>)
    },
    async listAssets() {
      return request(store(STORES.assets, 'readonly').getAll() as IDBRequest<Asset[]>)
    },
    async findByHash(hash) {
      return request(store(STORES.assets, 'readonly').index('hash').getAll(hash) as IDBRequest<Asset[]>)
    },
    async deleteAsset(id: AssetId) {
      await request(store(STORES.assets, 'readwrite').delete(id))
    },
    async putBlob(hash: ContentHash, blob) {
      // Lag verdien før transaksjonen åpnes (asynkron lesing ville lukket den).
      const value = await toStored(blob, blobCloneable)
      const tx = db.transaction(STORES.blobs, 'readwrite')
      tx.objectStore(STORES.blobs).put(value, hash)
      await transactionDone(tx)
    },
    async getBlob(hash) {
      return fromStored(await request(store(STORES.blobs, 'readonly').get(hash) as IDBRequest<StoredBlob | undefined>))
    },
    async deleteBlob(hash) {
      await request(store(STORES.blobs, 'readwrite').delete(hash))
    },
  }
}

export function createProjectRepository(db: IDBDatabase): ProjectRepository {
  const store = (mode: IDBTransactionMode) => db.transaction(STORES.projects, mode).objectStore(STORES.projects)
  return {
    async put(project) {
      await request(store('readwrite').put(project))
    },
    async get(id) {
      return request(store('readonly').get(id) as IDBRequest<ProjectEnvelope | undefined>)
    },
    async list(tool) {
      const s = store('readonly')
      const all = tool ? s.index('tool').getAll(tool) : s.getAll()
      return request(all as IDBRequest<ProjectEnvelope[]>)
    },
    async delete(id) {
      await request(store('readwrite').delete(id))
    },
    async usedBy(assetId) {
      const rows = await request(store('readonly').index('assets').getAll(assetId) as IDBRequest<ProjectEnvelope[]>)
      return rows.map((p) => p.id)
    },
  }
}

/** Liten nøkkel/verdi-lager for importlogg og innstillinger. */
export function createKeyValue(db: IDBDatabase, name: typeof STORES.legacyImports | typeof STORES.settings) {
  const store = (mode: IDBTransactionMode) => db.transaction(name, mode).objectStore(name)
  return {
    get: <T>(key: string) => request(store('readonly').get(key) as IDBRequest<T | undefined>),
    set: async (key: string, value: unknown) => {
      await request(store('readwrite').put(value, key))
    },
  }
}
