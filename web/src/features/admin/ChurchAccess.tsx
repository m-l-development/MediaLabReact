import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { ACCESS_DURATIONS, type AccessDuration, type AccessOverview, type AccessRequest, type Church, type MyAccess } from '../../services/admin'
import { clearMe } from '../../services/auth/me-cache'
import { useAdmin } from './context'
import { fmtDate, go } from './lib'
import { Cancelled, fill } from './members'
import { Badge, Btn, Card, Dialog, Empty } from './ui'

/**
 * Menighetens tilgang for Developer/Moderator: opprettelse med logo, midlertidig Admin-tilgang (forespørsel, godkjenning
 * med varighet, utløp og fjerning). Alle regler håndheves i databasen (20261020100000_temporary_admin_access.sql);
 * her vises bare valgene, og knapper låses mens et kall pågår (gjentatte klikk gir ingen doble tilganger).
 */
const confirmOr = (text: string) => { if (!window.confirm(text)) throw new Cancelled('cancel') }
const DURATION_LABEL: Record<AccessDuration, string> = { '1d': '1 dag', '30d': '30 dager', '6m': '6 måneder', '1y': '1 år', indef: 'Ubestemt tid' }
const ROLE_LABEL: Record<string, string> = { developer: 'Developer', moderator: 'Moderator' }
const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
const LOGO_MAX = 4 * 1024 * 1024

/** Omtrentlig utløp (vises før godkjenning; databasen regner det eksakte ut fra servertiden). */
function expiryPreview(d: AccessDuration, from = new Date()): Date | null {
  const x = new Date(from)
  if (d === '1d') x.setUTCDate(x.getUTCDate() + 1)
  else if (d === '30d') x.setUTCDate(x.getUTCDate() + 30)
  else if (d === '6m') x.setUTCMonth(x.getUTCMonth() + 6)
  else if (d === '1y') x.setUTCFullYear(x.getUTCFullYear() + 1)
  else return null
  return x
}
const fmtWhen = (iso: string | null | undefined, lang: string) =>
  iso ? new Date(iso).toLocaleString(lang, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''

/** Ny menighet (Developer/Moderator), valgfritt med logo som forhåndsvises før opprettelsen. Oppretteren blir ikke Admin. */
export function NewChurchCard() {
  const { act, say, reload, admin, t } = useAdmin()
  const [name, setName] = useState(''), [logo, setLogo] = useState<File | null>(null), [err, setErr] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const url = useMemo(() => (logo ? URL.createObjectURL(logo) : null), [logo])
  useEffect(() => () => { if (url) URL.revokeObjectURL(url) }, [url])
  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null
    e.target.value = ''
    if (!f) return
    if (!LOGO_TYPES.includes(f.type)) { setErr(t('Logoen må være et bilde (PNG, JPG, WebP eller GIF).')); return }
    if (f.size > LOGO_MAX) { setErr(t('Logoen kan være høyst 4 MB.')); return }
    setErr('')
    setLogo(f)
  }
  const create = (e: FormEvent) => {
    e.preventDefault()
    void act(async () => {
      const c = logo ? await admin.createChurchWithLogo(name, logo) : await admin.createChurch(name)
      setName('')
      setLogo(null)
      say(t(logo ? 'Menigheten er opprettet med logo.' : 'Menigheten er opprettet.'))
      await reload()
      go('menigheter', c.id)
    })()
  }
  return (
    <Card title="Ny menighet">
      <form className="ch-form ch-newchurch" onSubmit={create} data-ch-newchurch="">
        <div className="ch-row">
          <input className="ch-input" style={{ flex: '1 1 240px' }} placeholder={t('Navn på ny menighet')} aria-label={t('Navn på ny menighet')} value={name} onChange={(e) => setName(e.target.value)} minLength={2} maxLength={120} required />
        </div>
        <div className="ch-logo-preview" data-ch-newlogo="">
          <div className="ch-newlogo-box" data-ch-newlogo-preview={logo ? 'on' : 'off'}>
            {url ? <img src={url} alt={t('Forhåndsvisning av logoen')} /> : <span className="ch-muted">{t('Ingen logo')}</span>}
          </div>
          <div className="ch-newlogo-side">
            <input ref={input} type="file" accept={LOGO_TYPES.join(',')} style={{ display: 'none' }} onChange={pick} data-ch-newlogo-input="" aria-label={t('Velg logo')} />
            <div className="ch-row">
              <Btn small onClick={() => input.current?.click()}>{t(logo ? 'Bytt logo' : 'Velg logo (valgfritt)')}</Btn>
              {logo && <Btn small onClick={() => setLogo(null)}>{t('Fjern logo')}</Btn>}
            </div>
            {err ? <span className="ch-error" role="alert">{err}</span> : <span className="ch-muted">{t('PNG, JPG, WebP eller GIF, høyst 4 MB. Logoen tilhører menigheten.')}</span>}
          </div>
        </div>
        <p className="ch-muted">{t('Du blir ikke Admin i menigheten ved å opprette den, og kan ikke endre logoen senere uten Admin-tilgang.')}</p>
        <div className="ch-row"><Btn kind="primary" type="submit">{t('Opprett menighet')}</Btn></div>
      </form>
    </Card>
  )
}

/** Hvor ofte status hentes på nytt mens siden er synlig: avsenderen mens forespørselen venter, Admin hele tiden. */
const POLL_PENDING_MS = 4000, POLL_ADMIN_MS = 8000

/** Henter oversikten og egen status for en menighet (på nytt etter hver handling, og jevnlig når poll er satt). */
function useAccess(churchId: string, on: boolean, every: { always?: number; pending?: number } = {}) {
  const { admin } = useAdmin()
  const [ov, setOv] = useState<AccessOverview | null>(null)
  const [mine, setMine] = useState<MyAccess[]>([])
  const fetchAll = useCallback(() => Promise.all([admin.adminAccessOverview(churchId), admin.myAdminAccess()]), [admin, churchId])
  const apply = useCallback(([o, m]: [AccessOverview | null, MyAccess[] | null]) => {
    setOv(o)
    setMine((m ?? []).filter((x) => x.church_id === churchId))
  }, [churchId])
  const load = useCallback(async () => { if (on) apply(await fetchAll()) }, [on, fetchAll, apply])
  useEffect(() => {
    if (!on) return
    let live = true
    fetchAll().then((r) => { if (live) apply(r) }, () => undefined)
    return () => { live = false }
  }, [on, fetchAll, apply])
  const poll = every.always || (mine.some((x) => x.state === 'pending') ? every.pending ?? 0 : 0)
  useEffect(() => {
    if (!on || !poll) return
    let live = true
    const tick = () => { if (document.visibilityState === 'visible') fetchAll().then((r) => { if (live) apply(r) }, () => undefined) }
    const id = window.setInterval(tick, poll)
    document.addEventListener('visibilitychange', tick)
    return () => { live = false; window.clearInterval(id); document.removeEventListener('visibilitychange', tick) }
  }, [on, poll, fetchAll, apply])
  return { ov, mine, load }
}

/**
 * Developer/Moderator: be om midlertidig Admin-tilgang. Har menigheten Admin, må en Admin godkjenne (og velger varighet);
 * har den ingen, velger du varighet selv og får tilgangen med en gang. Den globale rollen endres aldri.
 */
export function TempAdminCard({ church }: { church: Church }) {
  const { me, d, act, say, admin, t } = useAdmin()
  const fixed = d.roles.some((r) => r.role === 'church_admin' && r.church_id === church.id && r.user_id === me.id && !r.extra_admin)
  const { ov, mine, load } = useAccess(church.id, !fixed, { pending: POLL_PENDING_MS })
  const [dur, setDur] = useState<AccessDuration>('30d')
  const lang = t('nb-NO')
  const active = mine.find((x) => x.state === 'active'), pending = mine.find((x) => x.state === 'pending'), rejected = mine.find((x) => x.state === 'rejected')
  // Venter forespørselen, hentes status jevnlig; blir den godkjent, lastes siden på nytt så Admin-rettighetene gjelder med en gang.
  const wasPending = useRef(false)
  useEffect(() => {
    if (!ov) return
    if (wasPending.current && active) { clearMe(); location.reload() }
    wasPending.current = !!pending
  }, [ov, active, pending])
  if (fixed || !ov) return null
  const done = () => { clearMe(); location.reload() }
  const ask = act(async () => {
    const r = await admin.requestAdminAccess(church.id)
    say(t(r?.state === 'pending' ? 'Forespørsel sendt – venter på svar.' : 'Du har allerede tilgang.'))
    await load()
  })
  const grant = act(async () => {
    confirmOr(fill(t('Gi deg selv midlertidig Admin-tilgang i «{church}» ({dur})?'), { church: church.name, dur: t(DURATION_LABEL[dur]) }) + '\n\n' + t('Menigheten har ingen Admin. Tilgangen er midlertidig, kan fjernes når som helst, og din rolle som Developer eller Moderator er uendret.'))
    await admin.requestAdminAccess(church.id, dur)
    done()
  })
  const leave = act(async () => {
    confirmOr(fill(t('Gi fra deg den midlertidige Admin-tilgangen i «{church}»?'), { church: church.name }) + '\n\n' + t('Menighetens data, logo og filer er uendret, og din globale rolle beholdes.'))
    await admin.revokeAdminAccess(church.id, me.id)
    done()
  })
  return (
    <Card title="Midlertidig Admin-tilgang">
      <div data-ch-tempadmin={active ? 'active' : pending ? 'pending' : ov.has_admin ? 'request' : 'grant'}>
        {active ? (
          <>
            <p><Badge tone="ok">{t('Godkjent')}</Badge> {t('Godkjent – du har nå midlertidig admin-tilgang.')}</p>
            <p className="ch-muted">{active.expires_at ? fill(t('Tilgangen varer til {when}.'), { when: fmtWhen(active.expires_at, lang) }) : t('Tilgangen varer på ubestemt tid.')}</p>
            <div className="ch-row"><Btn small kind="danger" onClick={leave} data-ch-tempadmin-leave="">{t('Gi fra meg tilgangen')}</Btn></div>
          </>
        ) : pending ? (
          <p role="status"><Badge tone="warn">{t('Venter')}</Badge> {t('Forespørsel sendt – venter på svar.')}</p>
        ) : ov.has_admin ? (
          <>
            {rejected && <p role="status" data-ch-tempadmin-rejected=""><Badge tone="bad">{t('Avslått')}</Badge> {t('Avslått av menighetsadmin.')}</p>}
            <p className="ch-muted">{t('Menigheten har Admin. Send en forespørsel; en Admin i menigheten godkjenner og velger hvor lenge tilgangen varer. Du får ingen tilgang før forespørselen er godkjent, og eksisterende Admin beholder sin tilgang.')}</p>
            <div className="ch-row"><Btn small kind="primary" onClick={ask} data-ch-tempadmin-ask="">{t('Send forespørsel om midlertidig admin-tilgang')}</Btn></div>
          </>
        ) : (
          <>
            <p className="ch-muted">{t('Menigheten har ingen Admin. Du kan legge deg til som ekstra admin med valgt varighet; tilgangen gis med en gang.')}</p>
            <div className="ch-row">
              <DurationPicker value={dur} onChange={setDur} name={'self-' + church.id} />
              <Btn small kind="primary" onClick={grant} data-ch-tempadmin-grant="">{t('Legg meg til som ekstra admin')}</Btn>
            </div>
          </>
        )}
      </div>
    </Card>
  )
}

function DurationPicker({ value, onChange, name }: { value: AccessDuration; onChange: (d: AccessDuration) => void; name: string }) {
  const { t } = useAdmin()
  return (
    <div className="ch-durations" role="radiogroup" aria-label={t('Varighet')}>
      {ACCESS_DURATIONS.map((x) => (
        <label key={x} className={'ch-duration' + (value === x ? ' on' : '')}>
          <input type="radio" name={name} value={x} checked={value === x} onChange={() => onChange(x)} data-ch-duration={x} />
          <span>{t(DURATION_LABEL[x])}</span>
        </label>
      ))}
    </div>
  )
}

/** Godkjenning: hvem, hvilken menighet, varighet (påkrevd) og omtrentlig utløp før godkjenningen fullføres. */
function ApproveDialog({ req, church, onClose, onDone }: { req: AccessRequest; church: Church; onClose: () => void; onDone: () => Promise<void> }) {
  const { act, say, admin, t } = useAdmin()
  const [dur, setDur] = useState<AccessDuration | null>(null)
  const lang = t('nb-NO')
  const exp = dur ? expiryPreview(dur) : null
  const approve = act(async () => {
    if (!dur) return
    await admin.decideAdminAccess(req.id, true, dur)
    say(fill(t('{name} har fått midlertidig Admin-tilgang ({dur}).'), { name: req.name, dur: t(DURATION_LABEL[dur]) }))
    onClose()
    await onDone()
  })
  return (
    <Dialog title={t('Godkjenn Admin-tilgang')} onClose={onClose}>
      <div className="ch-form" data-ch-approve-dialog="">
        <dl className="ch-kv">
          <dt>{t('Hvem')}</dt><dd><b>{req.name}</b> · {ROLE_LABEL[req.role] ?? req.role} <span className="ch-muted">{req.email}</span></dd>
          <dt>{t('Menighet')}</dt><dd>{church.name}</dd>
          <dt>{t('Varighet')}</dt><dd><DurationPicker value={dur ?? ('' as AccessDuration)} onChange={setDur} name={'req-' + req.id} /></dd>
          <dt>{t('Utløper')}</dt><dd data-ch-approve-expiry="">{!dur ? <span className="ch-muted">{t('Velg varighet')}</span> : exp ? fmtWhen(exp.toISOString(), lang) : t('Ubestemt tid (fjernes manuelt)')}</dd>
        </dl>
        <p className="ch-muted">{t('Personen blir ekstra Admin i menigheten. Eksisterende Admin beholder sin tilgang, og personens rolle som Developer eller Moderator er uendret.')}</p>
        <div className="ch-row ch-end">
          <Btn onClick={onClose}>{t('Avbryt')}</Btn>
          <Btn kind="ok" disabled={!dur} onClick={approve} data-ch-approve-confirm="">✓ {t('Godkjenn')}</Btn>
        </div>
      </div>
    </Dialog>
  )
}

/**
 * Admin i menigheten (og stab, som bare ser): ventende forespørsler (grønn hake / rød X), aktive midlertidige Admin med
 * varighet og utløp (Fjern tilgang), og nylig behandlede forespørsler.
 */
export function AccessCard({ church }: { church: Church }) {
  const { me, d, staff, act, say, reload, admin, t } = useAdmin()
  const isAdmin = d.roles.some((r) => r.role === 'church_admin' && r.church_id === church.id && r.user_id === me.id)
  const { ov, load } = useAccess(church.id, isAdmin || staff, { always: isAdmin ? POLL_ADMIN_MS : 0 })
  const [approving, setApproving] = useState<AccessRequest | null>(null)
  const lang = t('nb-NO')
  if (!ov) return null
  if (!isAdmin && !ov.pending.length && !ov.active.length && !ov.recent.length) return null
  const after = async () => { await load(); await reload() }
  const reject = (q: AccessRequest) => act(async () => {
    confirmOr(fill(t('Avslå forespørselen fra {name}?'), { name: q.name }))
    await admin.decideAdminAccess(q.id, false)
    say(t('Forespørselen er avslått.'))
    await after()
  })
  const revoke = (userId: string, name: string) => act(async () => {
    confirmOr(fill(t('Fjerne den midlertidige Admin-tilgangen til {name}?'), { name }) + '\n\n' + t('Personen mister Admin-tilgangen i menigheten med en gang. Kontoen og rollen som Developer eller Moderator beholdes, og menighetens data, logo og filer er uendret.'))
    await admin.revokeAdminAccess(church.id, userId)
    say(t('Tilgangen er fjernet.'))
    await after()
  })
  return (
    <Card title="Tilgang for Developer og Moderator">
      <div className="ch-form" data-ch-access="">
        <span className="ch-eyebrow">{t('Ventende forespørsler')}</span>
        {ov.pending.length ? ov.pending.map((q) => (
          <div key={q.id} className="ch-access-row" data-ch-access-pending={q.user_id}>
            <div><b>{q.name}</b> <Badge>{ROLE_LABEL[q.role] ?? q.role}</Badge><div className="ch-muted">{fill(t('Ba om tilgang {when}'), { when: fmtWhen(q.created_at, lang) })}</div></div>
            {isAdmin && q.user_id !== me.id && (
              <div className="ch-row">
                <button type="button" className="ch-decide ok" aria-label={fill(t('Godkjenn {name}'), { name: q.name })} title={t('Godkjenn')} onClick={() => setApproving(q)} data-ch-access-approve="">✓</button>
                <button type="button" className="ch-decide bad" aria-label={fill(t('Avslå {name}'), { name: q.name })} title={t('Avslå')} onClick={reject(q)} data-ch-access-reject="">✕</button>
              </div>
            )}
          </div>
        )) : <Empty>{t('Ingen ventende forespørsler.')}</Empty>}
        <span className="ch-eyebrow">{t('Aktive midlertidige Admin')}</span>
        {ov.active.length ? ov.active.map((a) => (
          <div key={a.user_id} className="ch-access-row" data-ch-access-active={a.user_id}>
            <div>
              <b>{a.name}</b> {a.role && <Badge>{ROLE_LABEL[a.role] ?? a.role}</Badge>}
              <div className="ch-muted">
                {fill(t('Gitt {when}'), { when: fmtWhen(a.granted_at, lang) })}{a.granted_by ? ' · ' + fill(t('av {name}'), { name: a.granted_by }) : ''}
                {' · '}{a.duration ? t(DURATION_LABEL[a.duration]) : ''}
                {' · '}{a.expires_at ? fill(t('utløper {when}'), { when: fmtWhen(a.expires_at, lang) }) : t('Ubestemt tid')}
              </div>
            </div>
            {(isAdmin || a.user_id === me.id) && <Btn small kind="danger" onClick={revoke(a.user_id, a.name)} data-ch-access-revoke="">{t('Fjern tilgang')}</Btn>}
          </div>
        )) : <Empty>{t('Ingen midlertidige Admin.')}</Empty>}
        {ov.recent.length > 0 && (
          <>
            <span className="ch-eyebrow">{t('Behandlet')}</span>
            {ov.recent.slice(0, 8).map((r) => (
              <div key={r.id} className="ch-access-row small" data-ch-access-recent={r.status}>
                <div><b>{r.name}</b> <span className="ch-muted">{ROLE_LABEL[r.role] ?? r.role}</span></div>
                <div className="ch-row">
                  <Badge tone={r.status === 'approved' ? 'ok' : r.status === 'rejected' ? 'bad' : ''}>{t(r.status === 'approved' ? (r.auto ? 'Gitt (ingen Admin)' : 'Godkjent') : r.status === 'rejected' ? 'Avslått' : 'Avbrutt')}</Badge>
                  <span className="ch-muted">{r.duration ? t(DURATION_LABEL[r.duration]) + ' · ' : ''}{fmtDate(r.decided_at)}</span>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
      {approving && <ApproveDialog req={approving} church={church} onClose={() => setApproving(null)} onDone={after} />}
    </Card>
  )
}
