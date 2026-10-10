import { createContext, use, useEffect, useState, type ReactNode } from 'react'
import type { Me } from '../domain/account'
import type { UserId } from '../domain/ids'
import { createAssetRepository, createKeyValue, createProjectRepository, openMediaDb, STORES } from '../infrastructure/idb/media-db'
import { readLegacyShare } from '../infrastructure/legacy-import/share'
import { browserProbe } from '../infrastructure/media/probe'
import { createAssetService, type AssetService } from '../services/assets/asset-service'
import type { MediaProbe } from '../services/assets/types'
import { createShareImport, type ShareImport } from '../services/legacy-import/share-import'
import { createProjectService, type ProjectService } from '../services/projects/project-service'
import { useT } from '../shared/i18n/i18n'
import { Spinner } from '../shared/ui/Spinner'

/** Tjenester som hører til innlogget bruker (egen database per bruker). */
export interface Workspace {
  userId: UserId | null
  assets: AssetService
  projects: ProjectService
  shareImport: ShareImport
}

export async function createWorkspace(userId: UserId | null, opts: { factory?: IDBFactory; probe?: MediaProbe; blobCloneable?: boolean } = {}) {
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
  const workspace: Workspace = { userId, assets, projects: createProjectService(projectRepo), shareImport }
  return { workspace, close: () => db.close() }
}

const WorkspaceContext = createContext<Workspace | null>(null)

export function useWorkspace(): Workspace {
  const w = use(WorkspaceContext)
  if (!w) throw new Error('useWorkspace() må brukes inne i <WorkspaceProvider>')
  return w
}

type OpenState = { status: 'opening' } | { status: 'ready'; workspace: Workspace } | { status: 'error'; message: string }

export function WorkspaceProvider({ me, children }: { me: Me | null; children: ReactNode }) {
  const t = useT()
  const userId = me?.id ?? null
  const [state, setState] = useState<OpenState>({ status: 'opening' })

  useEffect(() => {
    let close: (() => void) | null = null
    let live = true
    setState({ status: 'opening' })
    createWorkspace(userId).then(
      (r) => {
        if (!live) return r.close()
        close = r.close
        setState({ status: 'ready', workspace: r.workspace })
      },
      (e: unknown) => live && setState({ status: 'error', message: e instanceof Error ? e.message : String(e) }),
    )
    return () => {
      live = false
      close?.()
    }
  }, [userId])

  if (state.status === 'opening') return <Spinner label={t('app.loading')} />
  if (state.status === 'error') {
    return (
      <main role="alert" style={{ padding: 32, maxWidth: 560, margin: '0 auto' }}>
        <h1>{t('workspace.error.title')}</h1>
        <p>{t('workspace.error.body')}</p>
        <pre style={{ whiteSpace: 'pre-wrap', opacity: 0.7 }}>{state.message}</pre>
      </main>
    )
  }
  return <WorkspaceContext value={state.workspace}>{children}</WorkspaceContext>
}
