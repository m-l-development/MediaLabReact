import { useRef, useState, type FormEvent } from 'react'
import { forgetAccount, rememberAccount, savedAccounts, type SavedAccount } from '../../infrastructure/saved-accounts'
import type { AuthService } from '../../services/auth/auth-service'
import type { AuthState } from '../../services/auth/types'
import { useT } from '../../shared/i18n/i18n'
import { Button } from '../../shared/ui/Button'
import { Field } from '../../shared/ui/Field'
import { RequestPanel } from './RequestPanel'
import styles from './SignIn.module.css'

type SignInState = Extract<AuthState, { status: 'signed-out' | 'mfa-verify' | 'mfa-setup' }>

interface SignInProps {
  state: SignInState
  auth: AuthService
}

/**
 * Innlogging (AUTH-02, AUTH-03, AUTH-04, AUTH-06, AUTH-07), som media-lab/src/pages/login/LoginPage.jsx:
 * e-post/passord, kontovelger på enheten, totrinnsbekreftelse, «Glemt passordet?» og forespørsel om konto.
 * Lenkene i e-postene (nytt passord, invitasjon) lander fortsatt på dagens innloggingsside (/login.dc.html), som er
 * offentlig og tillatt hos leverandøren; å flytte dem krever godkjent publiseringstrinn (docs/gjenoppretting.md).
 */
export function SignIn({ state, auth }: SignInProps) {
  const t = useT()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [mode, setMode] = useState<'login' | 'forgot' | 'forgot-sent'>('login')
  const [accounts, setAccounts] = useState<SavedAccount[]>(() => savedAccounts())
  const [sel, setSel] = useState<string | null>(null)
  const [remember, setRemember] = useState(false)
  // huskes gjennom MFA-steget; kontoen lagres først når innloggingen er fullført
  const rememberRef = useRef(false)
  const error = state.error ?? null

  async function run(action: () => Promise<void>) {
    setBusy(true)
    try {
      await action()
    } finally {
      setBusy(false)
    }
  }
  const afterSignIn = () => {
    const s = auth.state.get()
    if (s.status === 'ready' && s.me && rememberRef.current) {
      rememberAccount({ email: s.me.email, name: s.me.full_name })
      rememberRef.current = false
    }
  }

  function onSignIn(e: FormEvent) {
    e.preventDefault()
    rememberRef.current = remember || !!sel // valgt fra lista: hold den oppdatert
    void run(async () => {
      await auth.signIn(email, password)
      setPassword('')
      afterSignIn()
    })
  }

  function onVerify(e: FormEvent) {
    e.preventDefault()
    void run(async () => {
      await auth.verifyMfa(code)
      setCode('')
      afterSignIn()
    })
  }

  function onForgot(e: FormEvent) {
    e.preventDefault()
    void run(async () => {
      await auth.requestPasswordReset(email).catch(() => undefined)
      setMode('forgot-sent')
    })
  }

  const pick = (a: SavedAccount) => {
    setSel(a.email)
    setEmail(a.email)
    setPassword('')
    setTimeout(() => document.querySelector<HTMLInputElement>('input[autocomplete=current-password]')?.focus(), 30)
  }
  const remove = (a: SavedAccount) => {
    if (!window.confirm(`${t('auth.acc.removeQ')}\n\n${a.name} – ${a.email}\n${t('auth.acc.removeNote')}`)) return
    forgetAccount(a.email)
    setAccounts(savedAccounts())
    if (sel === a.email) { setSel(null); setEmail('') }
  }
  const selName = accounts.find((a) => a.email === sel)?.name

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="signin-title">
        <img src="/images/logo-symbol.png" alt="" width={48} height={48} className={styles.logo} />

        {state.status === 'signed-out' && mode === 'login' && (
          <>
            <form onSubmit={onSignIn} className={styles.form}>
              <h1 id="signin-title">{t('auth.title')}</h1>
              <p className={styles.lead}>{t('auth.subtitle')}</p>
              {accounts.length > 0 && (
                <div className={styles.accounts} data-ch-accounts="">
                  <span className={styles.small}>{t('auth.acc.onDevice')}</span>
                  <div role="radiogroup" aria-label={t('auth.acc.choose')} className={styles.chips}>
                    {accounts.map((a) => (
                      <span key={a.email} className={styles.chipWrap}>
                        <button type="button" role="radio" aria-checked={sel === a.email} title={a.email} className={styles.chip} data-ch-account-chip={a.email} onClick={() => pick(a)}>
                          <span className={styles.chipInit} aria-hidden="true">{a.initials}</span>
                          <span className={styles.chipName}>{a.name}</span>
                        </button>
                        <button type="button" className={styles.chipX} aria-label={`${t('auth.acc.remove')}: ${a.name}`} title={t('auth.acc.remove')} onClick={() => remove(a)}>×</button>
                      </span>
                    ))}
                  </div>
                  {sel && (
                    <p className={styles.lead} data-ch-selected="">
                      {t('auth.acc.as')} <b>{selName}</b> – {sel}.{' '}
                      <button type="button" className={styles.link} onClick={() => { setSel(null); setEmail('') }}>{t('auth.acc.other')}</button>
                    </p>
                  )}
                </div>
              )}
              <Field label={t('auth.email')} type="email" autoComplete="username" required value={email}
                onChange={(e) => { const v = e.target.value; setEmail(v); if (sel && v.trim().toLowerCase() !== sel) setSel(null) }} />
              <Field label={t('auth.password')} type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
              {!sel && (
                <label className={styles.remember}>
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} data-ch-remember="" /> {t('auth.acc.remember')}
                </label>
              )}
              {error && <p className={styles.error} role="alert">{t(error)}</p>}
              <Button type="submit" variant="primary" block disabled={busy}>{busy ? t('auth.signingIn') : t('auth.signIn')}</Button>
              <button type="button" className={styles.link} onClick={() => setMode('forgot')}>{t('auth.forgot')}</button>
            </form>
            <RequestPanel />
          </>
        )}

        {state.status === 'signed-out' && mode === 'forgot' && (
          <form onSubmit={onForgot} className={styles.form}>
            <h1 id="signin-title">{t('auth.reset.title')}</h1>
            <p className={styles.lead}>{t('auth.reset.body')}</p>
            <Field label={t('auth.email')} type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
            <Button type="submit" variant="primary" block disabled={busy}>{t('auth.reset.send')}</Button>
            <button type="button" className={styles.link} onClick={() => setMode('login')}>{t('auth.reset.back')}</button>
          </form>
        )}

        {state.status === 'signed-out' && mode === 'forgot-sent' && (
          <div className={styles.form}>
            <h1 id="signin-title">{t('auth.reset.sentTitle')}</h1>
            <p className={styles.lead} role="status">{t('auth.reset.sent')}</p>
            <button type="button" className={styles.link} onClick={() => setMode('login')}>{t('auth.reset.back')}</button>
          </div>
        )}

        {state.status === 'mfa-verify' && (
          <form onSubmit={onVerify} className={styles.form}>
            <h1 id="signin-title">{t('auth.mfa.title')}</h1>
            <p className={styles.lead}>{t('auth.mfa.body')}</p>
            <Field label={t('auth.mfa.code')} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" required value={code} onChange={(e) => setCode(e.target.value)} />
            {error && <p className={styles.error} role="alert">{t(error)}</p>}
            <Button type="submit" variant="primary" block disabled={busy}>{t('auth.mfa.verify')}</Button>
            <button type="button" className={styles.link} onClick={() => void run(() => auth.signOut())}>{t('auth.mfa.cancel')}</button>
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

