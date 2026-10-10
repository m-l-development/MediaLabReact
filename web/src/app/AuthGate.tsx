import type { ReactNode } from 'react'
import type { Me } from '../domain/account'
import { SignIn } from '../features/auth/SignIn'
import { useT } from '../shared/i18n/i18n'
import { useStore } from '../shared/lib/store'
import { Button } from '../shared/ui/Button'
import { Spinner } from '../shared/ui/Spinner'
import styles from './AuthGate.module.css'
import { useServices } from './services'

/**
 * Port i nettleseren (lag 2 av 3, se docs/architecture.md §7). Lag 1 er sperren på serveren (middleware.js),
 * lag 3 er RLS i databasen. Ingen del av appen vises før innloggingen er kontrollert.
 */
export function AuthGate({ children }: { children: (me: Me | null) => ReactNode }) {
  const t = useT()
  const { auth } = useServices()
  const state = useStore(auth.state)

  switch (state.status) {
    case 'checking':
      return <Spinner label={t('auth.checking')} />
    case 'signed-out':
    case 'mfa-verify':
    case 'mfa-setup':
      return <SignIn state={state} auth={auth} />
    case 'not-linked':
      return (
        <Message title={t('auth.notLinked.title')} body={t('auth.notLinked.body')}>
          <Button onClick={() => void auth.signOut()}>{t('auth.signOut')}</Button>
        </Message>
      )
    case 'offline':
      return <Message title={t('error.title')} body={t('auth.offline')} />
    case 'no-backend':
      return <Message title={t('error.title')} body={t('auth.notConfigured')} />
    case 'ready':
      return (
        <>
          {state.me === null && import.meta.env.DEV && (
            <div className={styles.devBanner} role="note">{t('auth.devNoBackend')}</div>
          )}
          {children(state.me)}
        </>
      )
  }
}

function Message({ title, body, children }: { title: string; body: string; children?: ReactNode }) {
  return (
    <main className={styles.message}>
      <h1>{title}</h1>
      <p>{body}</p>
      {children}
    </main>
  )
}
