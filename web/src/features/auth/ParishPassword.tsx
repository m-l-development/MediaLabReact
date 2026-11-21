import { useState, type FormEvent } from 'react'
import type { AuthService } from '../../services/auth/auth-service'
import { passwordChecks } from '../../services/account'
import { useT } from '../../shared/i18n/i18n'
import type { MessageKey } from '../../shared/i18n/messages'
import { Button } from '../../shared/ui/Button'
import { Field } from '../../shared/ui/Field'
import styles from './SignIn.module.css'

const C: Record<'len' | 'mix' | 'same', MessageKey> = { len: 'acc.pw.c.len', mix: 'acc.pw.c.mix', same: 'acc.pw.c.same' }

/**
 * Det årlige, obligatoriske passordbyttet for Menighetsbrukeren. Vises i stedet for appen (ingen lukkeknapp, ingen
 * «hopp over»): databasen gir ingen tilgang før passordet er byttet, så popupen kan heller ikke omgås ved å skjule den.
 */
export function ParishPassword({ auth, churchName, username }: { auth: AuthService; churchName: string; username: string }) {
  const t = useT()
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const checks = passwordChecks(pw, pw2)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (pw !== pw2) { setError(t('parish.pw.mismatch')); return }
    if (!checks.every((c) => c.ok)) { setError(t('parish.pw.weak')); return }
    setBusy(true)
    setError(null)
    const code = await auth.rotateParishPassword(pw)
    setBusy(false)
    if (code) setError(code === 'weak_password' ? t('parish.pw.weak') : t('parish.pw.failed', { code }))
  }

  return (
    <main className={styles.page} data-ch-parish-pw="">
      <section className={styles.card} role="dialog" aria-modal="true" aria-labelledby="parish-pw-title">
        <img src="/images/app-icon-192.png" alt="" width={48} height={48} className={styles.logo} />
        <form className={styles.form} onSubmit={(e) => void submit(e)}>
          <h1 id="parish-pw-title">{t('parish.pw.title')}</h1>
          <p className={styles.lead}>{t('parish.pw.body')}</p>
          <p className={styles.small}><span className={styles.chipBadge}>{t('parish.badge')}</span> {t('parish.who', { church: churchName })} · {username}</p>
          <input type="text" autoComplete="username" value={username} readOnly hidden />
          <Field label={t('parish.pw.new')} type="password" autoComplete="new-password" required value={pw} onChange={(e) => setPw(e.target.value)} data-ch-parish-pw1="" />
          <Field label={t('parish.pw.repeat')} type="password" autoComplete="new-password" required value={pw2} onChange={(e) => setPw2(e.target.value)} data-ch-parish-pw2="" />
          <ul className={styles.small}>
            {checks.map((c) => <li key={c.key}>{c.ok ? '✓ ' : '• '}{t(C[c.key])}</li>)}
          </ul>
          {error && <p className={styles.error} role="alert">{error}</p>}
          <Button type="submit" variant="primary" block disabled={busy}>{busy ? t('parish.pw.saving') : t('parish.pw.save')}</Button>
        </form>
      </section>
    </main>
  )
}
