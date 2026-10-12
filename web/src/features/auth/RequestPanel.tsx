import { useRef, useState, type FormEvent } from 'react'
import { useServices } from '../../app/services'
import { ServiceError } from '../../services/errors'
import { requestProblem, type AccountRequest } from '../../services/requests'
import { useT } from '../../shared/i18n/i18n'
import type { MessageKey } from '../../shared/i18n/messages'
import { Button } from '../../shared/ui/Button'
import { Field } from '../../shared/ui/Field'
import styles from './SignIn.module.css'

/**
 * «Send forespørsel om opprettelse av bruker» (AUTH-07), som RequestPanel.jsx i dagens app: panelet åpnes under
 * innloggingen, henter en skjemanøkkel, har et skjult felle-felt og sender til serveren uten innlogging.
 */
const EMPTY: AccountRequest = { name: '', phone: '', email: '', church: '', website: '' }
const PROBLEM: Record<NonNullable<ReturnType<typeof requestProblem>>, MessageKey> = {
  name: 'req.err.name', phone: 'req.err.phone', email: 'req.err.email', church: 'req.err.church',
}

export function RequestPanel() {
  const t = useT()
  const { requests } = useServices()
  const [open, setOpen] = useState(false)
  const [f, setF] = useState<AccountRequest>(EMPTY)
  const [token, setToken] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<MessageKey | null>(null)
  const [done, setDone] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  // uten skjemanøkkel kan skjemaet ikke sendes (serveren signerer den); da sies det tydelig i stedet for en død knapp
  const newToken = () => requests.formToken().then(setToken, () => { setToken(null); setErr('req.err.unavailable') })
  const toggle = () => {
    const o = !open
    setOpen(o)
    setErr(null)
    if (o) {
      void newToken()
      setTimeout(() => box.current?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' }), 50)
    }
  }
  const set = (k: keyof AccountRequest) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }))
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    const p = requestProblem(f)
    if (p) { setErr(PROBLEM[p]); return }
    setBusy(true)
    setErr(null)
    try {
      await requests.submit({ ...f, token })
      setDone(true)
    } catch (x) {
      const code = x instanceof ServiceError ? x.code : ''
      setErr(code === 'form_expired' ? 'req.err.expired' : code === 'network' || code === 'timeout' ? 'req.err.network' : 'req.err.failed')
      if (code === 'form_expired') await newToken()
    }
    setBusy(false)
  }
  return (
    <div ref={box} className={styles.request} data-ch-request="">
      {!open && <Button block className={styles.wrap} onClick={toggle} data-ch-request-open="">{t('req.open')}</Button>}
      {open && (done ? (
        <>
          <p className={styles.ok} role="status" data-ch-request-done="">{t('req.done')}</p>
          <button type="button" className={styles.link} onClick={() => { setOpen(false); setDone(false); setF(EMPTY) }}>{t('fb.close')}</button>
        </>
      ) : (
        <form onSubmit={submit} className={styles.form} noValidate>
          <h2 className={styles.h2}>{t('req.title')}</h2>
          <p className={styles.lead}>{t('req.body')}</p>
          {err && <p className={styles.error} role="alert">{t(err)}</p>}
          <Field label={t('req.name')} autoComplete="name" maxLength={100} required value={f.name} onChange={set('name')} />
          <Field label={t('req.phone')} type="tel" autoComplete="tel" inputMode="tel" maxLength={20} required value={f.phone} onChange={set('phone')} />
          <Field label={t('req.email')} type="email" autoComplete="email" maxLength={254} required value={f.email} onChange={set('email')} />
          <Field label={t('req.church')} maxLength={200} required value={f.church} onChange={set('church')} />
          {/* felle-felt: usynlig for mennesker, fylles av roboter (serveren avviser da) */}
          <label aria-hidden="true" className={styles.trap}>Nettsted<input tabIndex={-1} autoComplete="off" name="website" value={f.website} onChange={set('website')} /></label>
          <Button type="submit" variant="primary" block disabled={busy || !token}>{busy ? t('req.sending') : t('req.send')}</Button>
          <button type="button" className={styles.link} onClick={toggle}>{t('fb.cancel')}</button>
        </form>
      ))}
    </div>
  )
}
