import { useEffect, useState } from 'react'
import { Hub } from '../features/hub/Hub'
import { useT } from '../shared/i18n/i18n'
import { toolTitleKey } from '../shared/i18n/messages'
import { useStore } from '../shared/lib/store'
import { Button } from '../shared/ui/Button'
import { AppShell } from './AppShell'
import { AuthGate } from './AuthGate'
import { ErrorBoundary, type FallbackProps } from './ErrorBoundary'
import { Link } from './Link'
import { hrefFor } from './router'
import { ServicesContext, useServices, type Services } from './services'
import { ToolHost } from './ToolHost'
import styles from './App.module.css'
import { toolById, type ToolLifecycle } from './tools'

export function App({ services }: { services: Services }) {
  useEffect(() => {
    void services.auth.start()
    return () => services.router.dispose()
  }, [services])

  return (
    <ServicesContext value={services}>
      <AuthGate>{(me) => <Routes me={me} />}</AuthGate>
    </ServicesContext>
  )
}

function Routes({ me }: { me: Parameters<typeof Hub>[0]['me'] }) {
  const t = useT()
  const { router, auth } = useServices()
  const route = useStore(router.route)
  const [lifecycle, setLifecycle] = useState<ToolLifecycle | null>(null)

  // Før et verktøy lukkes (navigering), lagres arbeidet. Er verktøyet opptatt (eksport, AI), venter vi ikke på det,
  // men lar verktøyet selv avgjøre i save().
  useEffect(() => {
    router.setGuard(async () => {
      if (lifecycle?.save) await lifecycle.save().catch(() => undefined)
      return true
    })
    return () => router.setGuard(null)
  }, [router, lifecycle])

  useEffect(() => {
    const title = route.name === 'tool' ? `${t(toolTitleKey(route.tool))} · ${t('app.name')}` : t('app.name')
    document.title = title
  }, [route, t])

  return (
    <AppShell route={route} me={me} onSignOut={me ? () => void auth.signOut() : null}>
      <ErrorBoundary resetKey={hrefFor(route)} fallback={RouteErrorFallback}>
        {route.name === 'hub' && <Hub me={me} />}
        {route.name === 'tool' && (
          <ToolHost key={route.tool} tool={toolById(route.tool)} query={route.query} onLifecycle={setLifecycle} />
        )}
        {route.name === 'not-found' && (
          <section className={styles.message}>
            <h1>{t('notFound.title')}</h1>
            <p>{t('notFound.body')}</p>
            <Link to={{ name: 'hub' }}>{t('notFound.home')}</Link>
          </section>
        )}
      </ErrorBoundary>
    </AppShell>
  )
}

function RouteErrorFallback({ reset }: FallbackProps) {
  const t = useT()
  return (
    <section className={styles.message} role="alert">
      <h1>{t('error.title')}</h1>
      <p>{t('error.body')}</p>
      <Button variant="primary" onClick={reset}>{t('error.retry')}</Button>
    </section>
  )
}
