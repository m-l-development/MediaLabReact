import { createContext, use } from 'react'
import type { UserId } from '../domain/ids'
import { createAssetRepository, createKeyValue, createProjectRepository, openMediaDb, STORES } from '../infrastructure/idb/media-db'
import { readLegacyShare } from '../infrastructure/legacy-import/share'
import { browserProbe } from '../infrastructure/media/probe'
import { createAssetService, type AssetService } from '../services/assets/asset-service'
import type { MediaProbe } from '../services/assets/types'
import { createShareImport, type ShareImport } from '../services/legacy-import/share-import'
import { createProjectService, type ProjectService } from '../services/projects/project-service'

/** Tjenester som hører til innlogget bruker (egen database per bruker). */
export interface Workspace {
  userId: UserId | null
  assets: AssetService
  projects: ProjectService
  shareImport: ShareImport
  /** Små innstillinger per bruker i den nye databasen (f.eks. listen over egne mockup-bilder). */
  settings: { get<T>(key: string): Promise<T | undefined>; set(key: string, value: unknown): Promise<void> }
}

export async function createWorkspace(
  userId: UserId | null,
  opts: { factory?: IDBFactory; probe?: MediaProbe; blobCloneable?: boolean } = {},
): Promise<{ workspace: Workspace; close: () => void }> {
  const db = await openMediaDb(userId, opts.factory)
  const projectRepo = createProjectRepository(db)
  const assets = createAssetService({
    repo: createAssetRepository(db, opts.blobCloneable === undefined ? {} : { blobCloneable: opts.blobCloneable }),
    refs: projectRepo,
    probe: opts.probe ?? browserProbe,
    ownerId: userId,
  })
  const log = createKeyValue(db, STORES.legacyImports)
  const shareImport = createShareImport(
    assets,
    { read: () => readLegacyShare(userId, opts.factory) },
    { get: (k) => log.get<string>(k), set: (k, v) => log.set(k, v) },
  )
  const settings = createKeyValue(db, STORES.settings)
  return { workspace: { userId, assets, projects: createProjectService(projectRepo), shareImport, settings }, close: () => db.close() }
}

export const WorkspaceContext = createContext<Workspace | null>(null)

export function useWorkspace(): Workspace {
  const w = use(WorkspaceContext)
  if (!w) throw new Error('useWorkspace() må brukes inne i <WorkspaceProvider>')
  return w
}
