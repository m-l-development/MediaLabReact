import { useEffect, useState, type FormEvent } from 'react'
import { useServices } from '../../app/services'
import type { AccountRequestRow, Approval, RequestEvent } from '../../services/requests'
import { Head } from './common'
import { useAdmin } from './context'
import { fmt, go, href } from './lib'
import { Cancelled } from './members'
import { Badge, Btn, Card, Dialog, Field, List, Select } from './ui'

/**
 * Forespørsler (ADM-06), portert fra dagens requests.jsx: forespørsler om brukerkonto fra innloggingssiden (bare
 * Developer og Moderator med MFA). Behandling, historikk og «Opprett bruker» (A ny menighet, B eksisterende menighet,
 * C uten menighet – bare Developer/Moderator-roller, og bare Developer kan gi dem). Databasen og serveren kontrollerer alt.
 */
const STATUS: Record<string, string> = { new: 'Ny', in_progress: 'Under behandling', approved: 'Godkjent', rejected: 'Avslått' }
const TONE: Record<string, string> = { new: 'warn', in_progress: '', approved: 'ok', rejected: 'bad' }
const EVENT: Record<string, string> = { submitted: 'Mottatt', resubmitted: 'Sendt inn på nytt', status: 'Status endret', note: 'Notat', approved: 'Bruker opprettet (invitasjon sendt)', rejected: 'Avslått' }
const ROLE_OPT: Record<string, string> = { user: 'Bruker', church_admin: 'Admin (fast)', moderator: 'Moderator', developer: 'Developer' }
const isOpen = (r: AccountRequestRow) => r.status === 'new' || r.status === 'in_progress'

export function RequestsView({ selected }: { selected?: string | undefined }) {
  const { act, say, t } = useAdmin()
  const { requestInbox: RQ } = useServices()
  const [list, setList] = useState<AccountRequestRow[] | null>(null)
  const [filter, setFilter] = useState('open')
  const [events, setEvents] = useState<RequestEvent[]>([])
  const load = async () => setList(await RQ.list())
  useEffect(() => { void act(async () => setList(await RQ.list()))() }, [act, RQ])
  const cur = (list ?? []).find((r) => r.id === selected)
  const curId = cur?.id, curStatus = cur?.status
  // historikken hentes på nytt når saken eller statusen endres
  useEffect(() => { if (curId && curStatus) void act(async () => setEvents(await RQ.events(curId)))() }, [act, RQ, curId, curStatus])
  const run = (fn: () => Promise<string | false | void>, ok?: string) => act(async () => {
    const m = await fn()
    if (m === false) return
    say(typeof m === 'string' ? m : t(ok ?? ''))
    await load()
    if (curId) setEvents(await RQ.events(curId))
  })
  const rows = (list ?? []).filter((r) => filter === 'all' || (filter === 'open' ? isOpen(r) : r.status === filter))
  return (
    <>
      <Head title="Forespørsler" sub="Forespørsler om brukerkonto fra innloggingssiden. Ingen konto opprettes før du oppretter brukeren." />
      <div className="ch-grid" style={{ gridTemplateColumns: cur ? 'minmax(0,1fr) minmax(0,1.2fr)' : undefined }} data-ch-requests="">
        <Card title="Innboks" sub={rows.length}>
          <div className="ch-row" style={{ marginBottom: 8 }}><Select label="Visning" value={filter} onChange={setFilter} options={[['open', 'Åpne'], ['approved', 'Godkjent'], ['rejected', 'Avslått'], ['all', 'Alle']]} /></div>
          <List cols="minmax(0,1fr) auto" empty={list ? 'Ingen forespørsler.' : 'Laster …'} onRow={(r) => go('foresporsler', r.key)}
            rows={rows.map((r) => ({ key: r.id, cells: [
              <div key="n" data-ch-req={r.id}><b>{r.anonymized ? t('(anonymisert)') : r.name}</b>
                <div className="ch-muted" style={{ wordBreak: 'break-all' }}>{r.email || ''} · {r.church_text || ''}</div>
                <div className="ch-muted">{fmt(r.created_at)}</div></div>,
              <div key="s" className="ch-row" style={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}><Badge tone={TONE[r.status]}>{t(STATUS[r.status] ?? r.status)}</Badge>
                {r.resubmits > 0 && <Badge>{t('Sendt på nytt')} ×{r.resubmits}</Badge>}{r.existing_user_id && <Badge tone="warn">{t('Har konto')}</Badge>}</div>] }))} />
        </Card>
        {cur && <RequestDetail key={cur.id + cur.status} cur={cur} events={events} run={run} />}
      </div>
    </>
  )

}

function RequestDetail({ cur, events, run }: { cur: AccountRequestRow; events: RequestEvent[]; run: (fn: () => Promise<string | false | void>, ok?: string) => () => Promise<unknown> }) {
  const { dev, d, reload, t } = useAdmin()
  const { requestInbox: RQ } = useServices()
  const [note, setNote] = useState('')
  const [dlg, setDlg] = useState<Approval | null>(null)
  const churches = d.churches.filter((c) => c.status === 'active')
  const approve = run(async () => {
    if (!dlg) return false
    const r = await RQ.approve(cur.id, dlg)
    setDlg(null)
    await reload()
    return t(r.email_sent ? 'Invitasjonen er sendt. Brukeren oppretter kontoen og passordet sitt fra lenken i e-posten.' : 'Invitasjonen er laget, men e-posten kunne ikke sendes. Send den på nytt under Invitasjoner.')
  })
  const canApprove = !!dlg && (dlg.mode === 'new' ? dlg.churchName.trim().length >= 2 && ['user', 'church_admin'].includes(dlg.role)
    : dlg.mode === 'existing' ? !!dlg.churchId && ['user', 'church_admin'].includes(dlg.role) : ['moderator', 'developer'].includes(dlg.role))
  const saveNote = (e: FormEvent) => { e.preventDefault(); if (note.trim()) void run(async () => { await RQ.addNote(cur.id, note.trim()); setNote('') }, 'Notatet er lagret.')() }
  return (
    <>
      <Card title={cur.anonymized ? '(anonymisert)' : cur.name} sub={t(STATUS[cur.status] ?? cur.status)}>
        <div data-ch-reqdetail="">
          <dl className="ch-dl">
            <dt>{t('Telefonnummer')}</dt><dd>{cur.phone || '–'}</dd>
            <dt>{t('E-postadresse')}</dt><dd style={{ wordBreak: 'break-all' }}>{cur.email || '–'}</dd>
            <dt>{t('Menighet / annet')}</dt><dd>{cur.church_text || '–'}</dd>
            <dt>{t('Mottatt')}</dt><dd>{fmt(cur.created_at)}{cur.resubmits ? ' · ' + t('sendt på nytt') + ' ' + cur.resubmits + '×' : ''}</dd>
            {cur.decided_at && <><dt>{t('Avgjort')}</dt><dd>{fmt(cur.decided_at)} · {cur.decided_by_name}{cur.decision_note ? ' – ' + cur.decision_note : ''}</dd></>}
          </dl>
          {cur.existing_user_id && <p className="ch-note warn" data-ch-reqexists="">{t('E-postadressen har allerede en konto:')} <a href={href('brukere', cur.existing_user_id)}>{cur.existing_user_name}</a>. {t('Det opprettes ingen ny konto – legg brukeren til i en menighet fra brukersiden ved behov.')}</p>}
          {isOpen(cur) && (
            <div className="ch-row" style={{ flexWrap: 'wrap', margin: '12px 0' }}>
              <Btn kind="primary" data-ch-reqcreate="" disabled={!!cur.existing_user_id} onClick={() => setDlg({ mode: 'existing', churchName: cur.church_text || '', churchId: '', role: 'user' })}>{t('Opprett bruker')}</Btn>
              {cur.status === 'new' && <Btn onClick={run(() => RQ.setStatus(cur.id, 'in_progress').then(() => undefined), 'Satt til «Under behandling».')}>{t('Under behandling')}</Btn>}
              <Btn kind="danger" onClick={run(async () => {
                const why = window.prompt(t('Begrunnelse for avslaget (vises bare i ConnectHub):'))
                if (!why || why.trim().length < 2) return false
                await RQ.reject(cur.id, why.trim())
              }, 'Forespørselen er avslått.')}>{t('Avslå')}</Btn>
            </div>
          )}
          <form className="ch-form" onSubmit={saveNote}>
            <Field label="Internt notat"><textarea className="ch-input" style={{ height: 'auto', minHeight: 56, padding: 8 }} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
            <div className="ch-row"><Btn small type="submit" disabled={!note.trim()}>{t('Lagre notat')}</Btn></div>
          </form>
          <h3 className="ch-h3">{t('Historikk')}</h3>
          <ol className="ch-history" style={{ margin: 0, paddingLeft: 18 }} data-ch-reqhistory="">
            {events.map((e, i) => <li key={i} className="ch-muted"><b>{t(EVENT[e.kind] ?? e.kind)}</b>{e.kind === 'status' ? ': ' + t(STATUS[e.old_status ?? ''] ?? '') + ' → ' + t(STATUS[e.new_status ?? ''] ?? '') : ''}{e.text ? ' – ' + e.text : ''} · {fmt(e.created_at)}{e.actor_name ? ' · ' + e.actor_name : ''}</li>)}
          </ol>
          <div className="ch-row" style={{ marginTop: 12 }}>
            <Btn small kind="danger" onClick={run(async () => {
              if (!window.confirm(t('Slette forespørselen permanent (f.eks. spam)? Handlingen loggføres.'))) throw new Cancelled('cancel')
              await RQ.remove(cur.id)
              go('foresporsler')
            }, 'Forespørselen er slettet.')}>{t('Slett')}</Btn>
          </div>
        </div>
      </Card>
      {dlg && (
        <Dialog title={t('Opprett bruker')} onClose={() => setDlg(null)}>
          <form onSubmit={(e) => { e.preventDefault(); if (canApprove) void approve() }} style={{ display: 'flex', flexDirection: 'column', gap: 12 }} data-ch-reqdialog="">
            <p className="ch-muted">{cur.name} · {cur.email}</p>
            <div role="radiogroup" aria-label={t('Velg')} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {([['existing', 'B. Legg til i eksisterende menighet'], ['new', 'A. Opprett ny menighet'], ['none', 'C. Uten menighet (Developer/Moderator)']] as const).map(([k, l]) => (
                <label key={k} className="ch-row" style={{ gap: 8 }}><input type="radio" name="mode" checked={dlg.mode === k} onChange={() => setDlg((x) => x && { ...x, mode: k, role: k === 'none' ? 'moderator' : 'user' })} /> {t(l)}</label>
              ))}
            </div>
            {dlg.mode === 'new' && <Field label="Navn på ny menighet"><input className="ch-input" maxLength={100} value={dlg.churchName} onChange={(e) => { const v = e.target.value; setDlg((x) => x && { ...x, churchName: v }) }} /></Field>}
            {dlg.mode === 'existing' && (
              <Field label="Menighet">
                <select className="ch-select" value={dlg.churchId} onChange={(e) => { const v = e.target.value; setDlg((x) => x && { ...x, churchId: v }) }}>
                  <option value="">{t('Velg menighet …')}</option>{churches.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
            )}
            <Field label="Rolle">
              <select className="ch-select" value={dlg.role} onChange={(e) => { const v = e.target.value; setDlg((x) => x && { ...x, role: v }) }}>
                {(dlg.mode === 'none' ? ['moderator', ...(dev ? ['developer'] : [])] : ['user', 'church_admin']).map((r) => <option key={r} value={r}>{t(ROLE_OPT[r] ?? r)}</option>)}
              </select>
            </Field>
            {dlg.mode === 'none' && !dev && <p className="ch-note warn">{t('Bare Developer kan gi rollene Developer og Moderator.')}</p>}
            <p className="ch-muted">{t('Personen får en sikker invitasjonslenke på e-post og velger sitt eget passord. Rolle- og menighetsreglene gjelder som ved vanlige invitasjoner.')}</p>
            <div className="ch-row"><Btn kind="primary" type="submit" disabled={!canApprove}>{t('Opprett og send invitasjon')}</Btn><Btn onClick={() => setDlg(null)}>{t('Avbryt')}</Btn></div>
          </form>
        </Dialog>
      )}
    </>
  )
}
