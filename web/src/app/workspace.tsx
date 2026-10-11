import { useEffect, useState, type ReactNode } from 'react'
import type { Me } from '../domain/account'
import { useT } from '../shared/i18n/i18n'
import { Spinner } from '../shared/ui/Spinner'
import { setLocalUser } from '../infrastructure/local-user'
import { createWorkspace, WorkspaceContext, type Workspace } from './workspace-factory'

type Opened = { userId: string | null } & ({ ok: true; workspace: Workspace } | { ok: false; message: string })

/** Åpner brukerens database etter innlogging og lukker den ved utlogging eller brukerbytte. */
export function WorkspaceProvider({ me, children }: { me: Me | null; children: ReactNode }) {
  const t = useT()
  const userId = me?.id ?? null
  const [opened, setOpened] = useState<Opened | null>(null)

  useEffect(() => {
    let close: (() => void) | null = null
    let live = true
    setLocalUser(userId)
    createWorkspace(userId).then(
      (r) => {
        if (!live) return r.close()
        close = r.close
        setOpened({ userId, ok: true, workspace: r.workspace })
      },
      (e: unknown) => live && setOpened({ userId, ok: false, message: e instanceof Error ? e.message : String(e) }),
    )
    return () => {
      live = false
      close?.()
    }
  }, [userId])

  // Et arbeidsområde for en annen bruker enn den innloggede vises aldri.
  if (!opened || opened.userId !== userId) return <Spinner label={t('app.loading')} />
  if (!opened.ok) {
    return (
      <main role="alert" style={{ padding: 32, maxWidth: 560, margin: '0 auto' }}>
        <h1>{t('workspace.error.title')}</h1>
        <p>{t('workspace.error.body')}</p>
        <pre style={{ whiteSpace: 'pre-wrap', opacity: 0.7 }}>{opened.message}</pre>
      </main>
    )
  }
  return <WorkspaceContext value={opened.workspace}>{children}</WorkspaceContext>
}
