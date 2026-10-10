import { Suspense, useEffect, useRef } from 'react'
import { LEGACY_PATH } from '../domain/tool'
import { useT } from '../shared/i18n/i18n'
import { toolTitleKey } from '../shared/i18n/messages'
import { Button, ButtonLink } from '../shared/ui/Button'
import { Icon } from '../shared/ui/Icon'
import { Spinner } from '../shared/ui/Spinner'
import { isChunkLoadError } from './chunk-error'
import { ErrorBoundary, type FallbackProps } from './ErrorBoundary'
import { TOOL_COMPONENTS } from './tool-loader'
import styles from './ToolHost.module.css'
import type { ToolLifecycle, ToolModule } from './tools'

interface ToolHostProps {
  tool: ToolModule
  query: Readonly<Record<string, string>>
  onLifecycle: (lifecycle: ToolLifecycle | null) => void
}

/** Viser ett verktøy. Skallet monterer bare ett om gangen; nøkkelen (verktøy-ID) gir ren start ved bytte. */
export function ToolHost({ tool, query, onLifecycle }: ToolHostProps) {
  const t = useT()
  const Component = TOOL_COMPONENTS[tool.id]
  const lifecycle = useRef<ToolLifecycle | null>(null)

  // Når verktøyet lukkes: frigjør ressursene det har meldt inn.
  useEffect(() => {
    return () => {
      lifecycle.current?.dispose?.()
      lifecycle.current = null
      onLifecycle(null)
    }
  }, [onLifecycle])

  if (!Component) {
    return (
      <section className={styles.notice} aria-labelledby="tool-notice-title">
        <span className={styles.noticeIcon}>
          <Icon name={tool.id} size={32} />
        </span>
        <h1 id="tool-notice-title">{t('tool.notBuilt.title', { tool: t(toolTitleKey(tool.id)) })}</h1>
        <p>{t('tool.notBuilt.body')}</p>
        <ButtonLink variant="primary" href={LEGACY_PATH[tool.id]}>
          {t('tool.notBuilt.openLegacy')} <Icon name="external" size={16} />
        </ButtonLink>
      </section>
    )
  }

  return (
    <ErrorBoundary resetKey={tool.id} fallback={ToolErrorFallback}>
      <Suspense fallback={<Spinner label={t('app.loading')} />}>
        <Component
          query={query}
          registerLifecycle={(l) => {
            lifecycle.current = l
            onLifecycle(l)
          }}
        />
      </Suspense>
    </ErrorBoundary>
  )
}

function ToolErrorFallback({ error, reset }: FallbackProps) {
  const t = useT()
  const chunk = isChunkLoadError(error)
  return (
    <section className={styles.notice} role="alert">
      <span className={styles.noticeIcon}><Icon name="alert" size={32} /></span>
      <h1>{chunk ? t('tool.loadError.title') : t('error.title')}</h1>
      <p>{chunk ? t('tool.loadError.body') : t('error.body')}</p>
      <div className={styles.actions}>
        <Button variant="primary" onClick={reset}>{t('tool.loadError.retry')}</Button>
        <Button onClick={() => location.reload()}>{t('tool.loadError.reload')}</Button>
      </div>
    </section>
  )
}
