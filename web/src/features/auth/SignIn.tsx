import { useState, type FormEvent } from 'react'
import type { AuthService } from '../../services/auth/auth-service'
import type { AuthState } from '../../services/auth/types'
import { useT } from '../../shared/i18n/i18n'
import { Button, ButtonLink } from '../../shared/ui/Button'
import { Field } from '../../shared/ui/Field'
import styles from './SignIn.module.css'

type SignInState = Extract<AuthState, { status: 'signed-out' | 'mfa-verify' | 'mfa-setup' }>

interface SignInProps {
  state: SignInState
  auth: AuthService
}

/**
 * Innlogging med e-post/passord og totrinnsbekreftelse (AUTH-02, AUTH-03).
 * «Glemt passord», invitasjoner og kontoforespørsler bruker foreløpig dagens innloggingsside (/login) til
 * features/auth er bygget ferdig (fase 4g). Sperren på serveren sender uansett uinnloggede dit.
 */
export function SignIn({ state, auth }: SignInProps) {
  const t = useT()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const error = state.error ?? null

  async function run(action: () => Promise<void>) {
    setBusy(true)
    try {
      await action()
    } finally {
      setBusy(false)
    }
  }

  function onSignIn(e: FormEvent) {
    e.preventDefault()
    void run(() => auth.signIn(email, password))
  }

  function onVerify(e: FormEvent) {
    e.preventDefault()
    void run(async () => {
      await auth.verifyMfa(code)
      setCode('')
    })
  }

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="signin-title">
        <img src="/images/logo-symbol.png" alt="" width={48} height={48} className={styles.logo} />

        {state.status === 'signed-out' && (
          <form onSubmit={onSignIn} className={styles.form}>
            <h1 id="signin-title">{t('auth.title')}</h1>
            <p className={styles.lead}>{t('auth.subtitle')}</p>
            <Field label={t('auth.email')} type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
            <Field label={t('auth.password')} type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            {error && <p className={styles.error} role="alert">{t(error)}</p>}
            <Button type="submit" variant="primary" block disabled={busy}>{busy ? t('auth.signingIn') : t('auth.signIn')}</Button>
            <ButtonLink variant="ghost" size="small" href="/login">{t('auth.forgot')}</ButtonLink>
          </form>
        )}

        {state.status === 'mfa-verify' && (
          <form onSubmit={onVerify} className={styles.form}>
            <h1 id="signin-title">{t('auth.mfa.title')}</h1>
            <p className={styles.lead}>{t('auth.mfa.body')}</p>
            <Field label={t('auth.mfa.code')} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" required value={code} onChange={(e) => setCode(e.target.value)} />
            {error && <p className={styles.error} role="alert">{t(error)}</p>}
            <Button type="submit" variant="primary" block disabled={busy}>{t('auth.mfa.verify')}</Button>
          </form>
        )}

        {state.status === 'mfa-setup' && (
          <form onSubmit={onVerify} className={styles.form}>
            <h1 id="signin-title">{t('auth.mfa.setupTitle')}</h1>
            <p className={styles.lead}>{t('auth.mfa.setupBody')}</p>
            {state.enrollment ? (
              <>
                <img src={state.enrollment.qr} alt="" width={180} height={180} className={styles.qr} />
                <details>
                  <summary>{t('auth.mfa.secret')}</summary>
                  <code className={styles.secret}>{state.enrollment.secret}</code>
                </details>
                <Field label={t('auth.mfa.code')} inputMode="numeric" autoComplete="one-time-code" required value={code} onChange={(e) => setCode(e.target.value)} />
                {error && <p className={styles.error} role="alert">{t(error)}</p>}
                <Button type="submit" variant="primary" block disabled={busy}>{t('auth.mfa.verify')}</Button>
              </>
            ) : (
              <>
                {error && <p className={styles.error} role="alert">{t(error)}</p>}
                <Button variant="primary" block disabled={busy} onClick={() => void run(() => auth.startMfaSetup())}>
                  {t('auth.mfa.setupTitle')}
                </Button>
              </>
            )}
          </form>
        )}
      </section>
    </main>
  )
}
