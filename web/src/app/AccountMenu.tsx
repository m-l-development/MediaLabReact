import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { displayName, initials, type Me } from '../domain/account'
import { clearMyLocalData } from '../infrastructure/local-user'
import { downloadJson, passwordChecks, validNotifyEmail, type EmailPrefs, type Notification, type PasswordResult } from '../services/account'
import { ServiceError } from '../services/errors'
import { useLang, useT } from '../shared/i18n/i18n'
import type { MessageKey } from '../shared/i18n/messages'
import { WipeLocalData } from './LocalData'
import { useServices } from './services'
import { TestRoleBox } from './TestRole'
import s from './AccountMenu.module.css'

/**
 * Kontomenyen (AUTH-05, AUTH-08), portert fra media-lab/src/shared/account-menu.js: hovedmeny (varsler, e-postvarsler for
 * Developer/Moderator, testrolle, logg ut, konto og sikkerhet), varsler, «Konto og sikkerhet» med «Bytt passord»,
 * «Last ned mine data», lokale data og faresonen «Slett kontoen min». All tilgang avgjøres av databasen og serveren.
 */
type View = 'main' | 'notifications' | 'account' | 'password' | 'password-done' | 'wipe' | 'delete'
const ROLE: Record<string, string> = { developer: 'Developer', moderator: 'Moderator', church_admin: 'Admin' }
const PW_ERR: Record<Exclude<PasswordResult, { ok: true }>['error'], MessageKey> = {
  old_missing: 'acc.pw.err.old', short: 'acc.pw.err.short', mix: 'acc.pw.err.mix', not_same: 'acc.pw.err.notSame', code_missing: 'acc.pw.err.code',
  invalid_credentials: 'acc.pw.err.wrongOld', wrong_code: 'acc.pw.err.wrongCode', same_password: 'acc.pw.err.same', weak_password: 'acc.pw.err.weak',
  over_request_rate_limit: 'acc.pw.err.rate', network: 'acc.pw.err.network', unknown: 'acc.pw.err.unknown',
}
const EVERY = 120_000

interface Props {
  me: Me
  realMe: Me
  testRole: string | null
  testAllowed: boolean
  onSignOut: (() => Promise<void> | void) | null
  open: boolean
  setOpen: (v: boolean) => void
  fabClass: string | undefined
}

export function AccountMenu({ me, realMe, testRole, testAllowed, onSignOut, open, setOpen, fabClass }: Props) {
  const t = useT()
  const { account } = useServices()
  const box = useRef<HTMLDivElement>(null)
  const [view, setView] = useState<View>('main')
  const [list, setList] = useState<Notification[]>([])
  const at = useRef(0)

  // Varsler: hentes etter at siden er lastet, når fanen blir synlig (høyst hvert halve minutt) og hvert 2. minutt.
  const refresh = useCallback(async () => {
    at.current = Date.now()
    if (!account.available()) return
    try {
      setList(await account.notifications.list())
    } catch {
      // beholder forrige liste
    }
  }, [account])
  useEffect(() => {
    const first = setTimeout(() => void refresh(), 800)
    const id = setInterval(() => { if (!document.hidden) void refresh() }, EVERY)
    const vis = () => { if (!document.hidden && Date.now() - at.current > 30_000) void refresh() }
    document.addEventListener('visibilitychange', vis)
    return () => { clearTimeout(first); clearInterval(id); document.removeEventListener('visibilitychange', vis) }
  }, [refresh])

  useEffect(() => {
    if (!open) return
    const close = (e: PointerEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !box.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', close)
    }
  }, [open, setOpen])

  const unread = list.filter((x) => !x.read_at).length
  const toggle = () => {
    setView('main')
    setOpen(!open)
  }
  const back = (to: View = 'main') => <button type="button" className={s.back} onClick={() => setView(to)}>‹ {t('acc.back')}</button>

  let body: ReactNode
  if (view === 'notifications') body = <Notifications list={list} refresh={refresh} back={back()} close={() => setOpen(false)} />
  else if (view === 'account') body = <Security back={back()} go={setView} />
  else if (view === 'password' || view === 'password-done') body = <Password realMe={realMe} done={view === 'password-done'} back={back('account')} go={setView} />
  else if (view === 'wipe' && onSignOut) body = <WipeLocalData userId={me.id} onCancel={() => setView('account')} onSignOut={onSignOut} />
  else if (view === 'delete' && onSignOut) body = <DeleteAccount realMe={realMe} onCancel={() => setView('account')} onSignOut={onSignOut} />
  else {
    // rollene er de ekte (som i dagens app), også i testmodus
    const roles = [...new Set(realMe.roles.map((r) => ROLE[r.role] ?? r.role))].join(', ') || t('acc.user')
    const churches = me.churches.map((c) => c.name).join(', ')
    const staff = realMe.roles.some((r) => (r.role === 'developer' || r.role === 'moderator') && !r.church_id)
    body = (
      <>
        <strong className={s.name}>{displayName(me)}</strong>
        <span className={s.mail}>{me.email}</span>
        <span className={s.info}>{roles}{churches ? ' · ' + churches : ''}</span>
        {testAllowed && <TestRoleBox realMe={realMe} testRole={testRole} />}
        <Nav label={t('acc.notifications')} extra={unread ? <span className={s.count}>{unread > 9 ? '9+' : unread}</span> : null} onClick={() => { setView('notifications'); void refresh() }} />
        {staff && <EmailPrefsBlock realMe={realMe} />}
        {onSignOut && <button type="button" className={s.btn} data-ch-logout="" onClick={() => void onSignOut()}>{t('auth.signOut')}</button>}
        <Nav label={t('acc.security')} onClick={() => setView('account')} />
      </>
    )
  }

  return (
    <div className={s.account} ref={box}>
      <button type="button" className={`${fabClass ?? ''} ${s.fab}`} data-ch-account="" aria-expanded={open} aria-haspopup="dialog" title={displayName(me)} aria-label={t('acc.account')} onClick={toggle} data-test-role={testRole ? '' : undefined}>
        {initials(me)}
        {unread > 0 && <span className={s.badge} data-ch-unread="">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className={s.menu} role="dialog" aria-label={displayName(me)} data-ch-view={view}>
          {body}
        </div>
      )}
    </div>
  )
}

function Nav({ label, extra, onClick }: { label: string; extra?: ReactNode; onClick: () => void }) {
  return (
    <button type="button" className={s.nav} onClick={onClick}>
      <span className={s.navLabel}>{label}</span>
      {extra}
      <span className={s.chev} aria-hidden="true">›</span>
    </button>
  )
}

function Notifications({ list, refresh, back, close }: { list: Notification[]; refresh: () => Promise<void>; back: ReactNode; close: () => void }) {
  const t = useT()
  const lang = useLang()
  const { account } = useServices()
  const [busy, setBusy] = useState<string | null>(null)
  const when = (d: string) => new Date(d).toLocaleString(lang === 'en' ? 'en-GB' : 'nb-NO', { dateStyle: 'short', timeStyle: 'short' })
  return (
    <>
      {back}
      <span className={s.head}>{t('acc.notifications')}</span>
      <div className={s.notifs} data-ch-notifs="">
        {!list.length && <span className={s.note}>{t('acc.noNotifications')}</span>}
        {list.slice(0, 20).map((x) => (
          // Trykk: merkes som lest, og åpner siden varselet gjelder (hvis det finnes en). Ingen andre handlinger.
          <button key={x.id} type="button" className={x.read_at ? s.notif : `${s.notif} ${s.unread}`} data-ch-notif={x.read_at ? 'lest' : 'ny'} disabled={busy === x.id}
            onClick={async () => {
              setBusy(x.id)
              if (!x.read_at) await account.notifications.markRead(x.id).catch(() => undefined)
              if (x.link && /^\/(?!\/)/.test(x.link)) { close(); location.href = x.link; return }
              await refresh()
              setBusy(null)
            }}>
            <span className={s.notifTop}><strong>{x.title}</strong>{!x.read_at && <span className={s.dot} aria-label={t('acc.new')} />}</span>
            {x.body && <span className={s.notifBody}>{x.body}</span>}
            <span className={s.notifWhen}>{when(x.created_at)}{x.link ? ' · ' + t('acc.open') + ' ›' : ''}</span>
          </button>
        ))}
        {list.some((x) => !x.read_at) && (
          <button type="button" className={`${s.btn} ${s.light}`} disabled={busy === 'all'} onClick={async () => { setBusy('all'); await account.notifications.markAllRead(list).catch(() => undefined); await refresh(); setBusy(null) }}>
            {t('acc.markAllRead')}
          </button>
        )}
      </div>
    </>
  )
}

/** E-postvarsler (bare Developer og Moderator; databasen avviser andre og krever MFA). */
function EmailPrefsBlock({ realMe }: { realMe: Me }) {
  const t = useT()
  const { account } = useServices()
  const [prefs, setPrefs] = useState<EmailPrefs>({ on: true, notify_email: null, account_email: realMe.email })
  const [state, setState] = useState<'loading' | 'ready' | 'mfa'>('loading')
  const [editing, setEditing] = useState<string | null>(null)
  const [err, setErr] = useState<MessageKey | null>(null)
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let live = true
    account.emailPrefs.get().then(
      (p) => { if (live) { if (p) setPrefs((x) => ({ ...x, ...p })); setState('ready') } },
      () => live && setState('mfa'),
    )
    return () => { live = false }
  }, [account])
  if (state === 'mfa') {
    return (
      <div className={s.pref} data-ch-emailpref="">
        <span className={s.prefTitle}>{t('acc.email.title')}</span>
        <p className={s.note}>{t('acc.email.mfa')}</p>
      </div>
    )
  }
  const used = prefs.notify_email || prefs.account_email
  const toggle = async () => {
    const on = !prefs.on
    setBusy(true)
    setPrefs((x) => ({ ...x, on }))
    try {
      await account.emailPrefs.set(on)
    } catch {
      setPrefs((x) => ({ ...x, on: !on }))
      setErr('acc.email.saveFailed')
    }
    setBusy(false)
  }
  const save = async (v: string | null) => {
    setErr(null)
    if (v != null && !validNotifyEmail(v)) { setErr('acc.email.invalid'); return }
    setBusy(true)
    try {
      await account.emailPrefs.setAddress(v)
      setPrefs((x) => ({ ...x, notify_email: v == null || v === x.account_email.toLowerCase() ? null : v }))
      setEditing(null)
      setSaved(true)
    } catch (e) {
      setErr(e instanceof ServiceError && e.code === 'invalid' ? 'acc.email.invalid' : 'acc.email.addrFailed')
    }
    setBusy(false)
  }
  return (
    <div className={s.pref} data-ch-emailpref="">
      <button type="button" role="switch" aria-checked={prefs.on} className={s.switch} disabled={state !== 'ready' || busy} onClick={() => void toggle()}>
        <span className={s.navLabel}>{t('acc.email.title')}</span>
        <span className={s.swState}>{t(prefs.on ? 'acc.on' : 'acc.off')}</span>
        <span className={prefs.on ? `${s.track} ${s.trackOn}` : s.track} aria-hidden="true"><span className={s.knob} /></span>
      </button>
      {editing == null ? (
        <>
          <span className={s.addr}>{t('acc.email.sentTo')}: <b>{used}</b>{prefs.notify_email ? '' : ` (${t('acc.email.accountAddr')})`}</span>
          <button type="button" className={`${s.btn} ${s.light} ${s.start}`} onClick={() => { setEditing(used); setSaved(false); setErr(null) }}>{t('acc.email.change')}</button>
          {saved && <span className={s.ok} role="status">{t('acc.email.saved')} {used}.</span>}
        </>
      ) : (
        <>
          <input className={s.input} type="email" maxLength={254} value={editing} aria-label={t('acc.email.addrLabel')} autoFocus
            onChange={(e) => setEditing(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void save(editing.trim().toLowerCase()) } }} />
          <div className={s.row}>
            <button type="button" className={s.btn} disabled={busy} onClick={() => void save(editing.trim().toLowerCase())}>{t('acc.save')}</button>
            <button type="button" className={`${s.btn} ${s.light}`} onClick={() => { setEditing(null); setErr(null) }}>{t('fb.cancel')}</button>
            {prefs.notify_email && <button type="button" className={`${s.btn} ${s.light}`} disabled={busy} onClick={() => void save(null)}>{t('acc.email.useAccount')}</button>}
          </div>
        </>
      )}
      {err && <span className={s.err} role="alert">{t(err)}</span>}
      <p className={`${s.note} ${s.small}`}>{t('acc.email.info')}</p>
    </div>
  )
}

function Security({ back, go }: { back: ReactNode; go: (v: View) => void }) {
  const t = useT()
  const { account } = useServices()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(false)
  return (
    <>
      {back}
      <span className={s.head}>{t('acc.security')}</span>
      <button type="button" className={`${s.btn} ${s.light}`} data-ch-pwchange="" onClick={() => go('password')}>{t('acc.pw.title')}</button>
      <button type="button" className={`${s.btn} ${s.light}`} data-ch-export="" disabled={busy}
        onClick={async () => {
          setBusy(true)
          setErr(false)
          try {
            downloadJson(await account.exportMine(), 'connecthub-mine-data.json')
          } catch {
            setErr(true)
          }
          setBusy(false)
        }}>
        {t('acc.export')}
      </button>
      {err && <span className={s.err} role="alert">{t('acc.exportFailed')}</span>}
      <p className={`${s.note} ${s.small}`}>{t('acc.exportHint')}</p>
      <button type="button" className={`${s.btn} ${s.light}`} data-ch-wipe="" onClick={() => go('wipe')}>{t('local.wipe')}</button>
      <p className={`${s.note} ${s.small}`}>{t('local.wipeHint')}</p>
      <div className={s.zone}>
        <span className={s.zoneHead}>{t('acc.danger')}</span>
        <p className={`${s.note} ${s.small}`}>{t('acc.del.irreversible')}</p>
        <button type="button" className={`${s.btn} ${s.dangerLine}`} data-ch-delete="" onClick={() => go('delete')}>{t('acc.del.open')}</button>
      </div>
    </>
  )
}

function PwInput({ label, value, set, auto }: { label: string; value: string; set: (v: string) => void; auto: string }) {
  const t = useT()
  const [show, setShow] = useState(false)
  return (
    <label className={s.field}>
      <span>{label}</span>
      <span className={s.pwRow}>
        <input type={show ? 'text' : 'password'} autoComplete={auto} spellCheck={false} autoCapitalize="off" value={value} onChange={(e) => set(e.target.value)} />
        <button type="button" data-pw-toggle="" aria-pressed={show} aria-label={t(show ? 'acc.pw.hide' : 'acc.pw.show')} title={t(show ? 'acc.pw.hide' : 'acc.pw.show')} onClick={() => setShow((v) => !v)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" />{show && <path d="M4 4l16 16" />}
          </svg>
        </button>
      </span>
    </label>
  )
}

/** «Bytt passord» (alle roller). */
function Password({ realMe, done, back, go }: { realMe: Me; done: boolean; back: ReactNode; go: (v: View) => void }) {
  const t = useT()
  const { account } = useServices()
  const [f, setF] = useState({ old: '', next: '', confirm: '', code: '' })
  const [factor, setFactor] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<MessageKey | null>(null)
  useEffect(() => {
    let live = true
    void account.mfaFactor().then((id) => live && setFactor(id))
    return () => { live = false }
  }, [account])
  if (done) {
    return (
      <>
        <span className={s.head}>{t('acc.pw.title')}</span>
        <p className={s.ok} role="status">{t('acc.pw.done')}</p>
        <button type="button" className={s.btn} onClick={() => go('main')}>{t('acc.done')}</button>
      </>
    )
  }
  const submit = async () => {
    setErr(null)
    setBusy(true)
    try {
      const r = await account.changePassword({ email: realMe.email, ...f, factorId: factor })
      if (r.ok) { setF({ old: '', next: '', confirm: '', code: '' }); go('password-done') }
      else setErr(PW_ERR[r.error])
    } catch {
      setErr('acc.pw.err.unknown')
    }
    setBusy(false)
  }
  const C: Record<'len' | 'mix' | 'same', MessageKey> = { len: 'acc.pw.c.len', mix: 'acc.pw.c.mix', same: 'acc.pw.c.same' }
  return (
    <>
      {back}
      <span className={s.head}>{t('acc.pw.title')}</span>
      <div className={s.form} data-ch-pwform="" onKeyDown={(e) => { if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') { e.preventDefault(); void submit() } }}>
        <PwInput label={t('acc.pw.old')} auto="current-password" value={f.old} set={(v) => setF((x) => ({ ...x, old: v }))} />
        <PwInput label={t('acc.pw.new')} auto="new-password" value={f.next} set={(v) => setF((x) => ({ ...x, next: v }))} />
        <PwInput label={t('acc.pw.confirm')} auto="new-password" value={f.confirm} set={(v) => setF((x) => ({ ...x, confirm: v }))} />
        <ul className={s.checks} data-pw-checks="">
          {passwordChecks(f.next, f.confirm).map((c) => <li key={c.key} className={c.ok ? s.checkOk : undefined}>{c.ok ? '✓ ' : '• '}{t(C[c.key])}</li>)}
        </ul>
        {factor && (
          <label className={s.field}>
            <span>{t('acc.pw.code')}</span>
            <input className={s.input} inputMode="numeric" autoComplete="one-time-code" maxLength={7} value={f.code} onChange={(e) => setF((x) => ({ ...x, code: e.target.value }))} />
          </label>
        )}
        {err && <p className={s.errBox} role="alert">{t(err)}</p>}
        <button type="button" className={s.btn} disabled={busy} onClick={() => void submit()}>{t('acc.pw.title')}</button>
        <button type="button" className={`${s.btn} ${s.light}`} disabled={busy} onClick={() => go('account')}>{t('fb.cancel')}</button>
      </div>
    </>
  )
}

/**
 * «Slett kontoen min»: avkrysning kreves; serveren kontrollerer innloggingen, databasen stopper den siste Developer.
 * Etterpå fjernes brukerens lokale data, og brukeren logges ut.
 */
function DeleteAccount({ realMe, onCancel, onSignOut }: { realMe: Me; onCancel: () => void; onSignOut: () => Promise<void> | void }) {
  const t = useT()
  const { account } = useServices()
  const [ok, setOk] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<MessageKey | null>(null)
  return (
    <>
      <span className={s.head}>{t('acc.del.title')}</span>
      <p className={s.note}>{t('acc.del.what')}</p>
      <label className={s.check}>
        <input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} />
        <span>{t('acc.del.confirm')}</span>
      </label>
      {err && <p className={s.errBox} role="alert">{t(err)}</p>}
      <button type="button" className={`${s.btn} ${s.light}`} disabled={busy} onClick={onCancel}>{t('fb.cancel')}</button>
      <button type="button" className={`${s.btn} ${s.danger}`} data-ch-delete-go="" disabled={!ok || busy}
        onClick={async () => {
          if (!ok) return
          setBusy(true)
          setErr(null)
          try {
            await account.deleteMe()
          } catch (e) {
            setErr(e instanceof ServiceError && e.code === 'invalid' ? 'acc.del.lastDeveloper' : 'acc.del.failed')
            setBusy(false)
            return
          }
          await clearMyLocalData(realMe.id).catch(() => undefined)
          await onSignOut()
        }}>
        {t('acc.del.go')}
      </button>
    </>
  )
}
