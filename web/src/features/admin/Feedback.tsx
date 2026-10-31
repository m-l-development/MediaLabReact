import { useEffect, useState, type FormEvent } from 'react'
import { useServices } from '../../app/services'
import { scrubText } from '../../shared/feedback/feedback-core'
import { formatCase, formatCases, IMPORTANCE, KIND, SEVERITY, STATUS, type CaseEvent, type CaseMark, type FeedbackCase } from '../../shared/feedback/format-case'
import { Head } from './common'
import { useAdmin } from './context'
import { copyText, fmt, go } from './lib'
import { Cancelled, fill } from './members'
import { Badge, Btn, Card, Dialog, Drawer, Empty, Field, List, Search, Select } from './ui'

/**
 * Tilbakemeldinger (ADM-12), innboksen for Moderator og Developer, portert fra dagens feedback.jsx. Databasen avgjør
 * tilgangen (feedback_list m.fl. krever Moderator eller Developer med MFA). «Kopier sak» og «Kopier alle saker» lager
 * strukturert tekst i nettleseren og endrer aldri saken; teksten renses for hemmeligheter på nytt ved kopiering.
 */
const TONE: Record<string, string> = { new: 'warn', in_progress: 'role', needs_info: 'warn', resolved: 'ok', rejected: 'bad' }
const ENVS = [['all', 'Alle miljøer'], ['production', 'Produksjon'], ['preview', 'ConnectHub Dev'], ['local', 'Lokal utvikling']] as const
const ENV_NAME: Record<string, string> = { production: 'Produksjon', preview: 'ConnectHub Dev', local: 'Lokal utvikling' }
const norm = (s: string | null | undefined) => (s || '').toLowerCase()

/**
 * Listene i fanen: «Nye saker» (Ny) og «Under behandling» (Under behandling og Trenger mer informasjon – ikke ferdig,
 * venter på svar) er aktive; «Arkiv» har de avsluttede statusene (Løst og Avvist). Ukjente statuser regnes som aktive,
 * så ingen sak skjules ved en feil. Arkivet er bare en visning etter status – saken og historikken endres ikke.
 */
type FbList = 'new' | 'work' | 'archive'
const DONE = new Set(['resolved', 'rejected'])
const listOf = (status: string): FbList => (status === 'new' ? 'new' : DONE.has(status) ? 'archive' : 'work')
const LIST_NAME: Record<FbList | 'removed', string> = { new: 'Nye saker', work: 'Under behandling', archive: 'Arkiv', removed: 'Fjernede saker' }
const LIST_EMPTY: Record<FbList | 'removed', string> = { new: 'Ingen nye saker.', work: 'Ingen saker under behandling.', archive: 'Ingen saker i arkivet.', removed: 'Ingen fjernede saker.' }

export function FeedbackView({ selected }: { selected?: string | undefined }) {
  const { act, say, t } = useAdmin()
  const { feedback: FB } = useServices()
  const [list, setList] = useState<FeedbackCase[] | null>(null)
  const [f, setF] = useState({ q: '', kind: 'all', app: 'all', status: 'all', env: 'all', from: '', to: '' })
  const [parts, setParts] = useState<string[] | null>(null)
  const [manual, setManual] = useState<string | null>(null)
  const [archived, setArchived] = useState(false)
  const [showArchive, setShowArchive] = useState(false)
  const load = async () => setList(await FB.inbox.list(archived))
  useEffect(() => { void act(async () => setList(await FB.inbox.list(archived)))() }, [act, FB, archived])
  /** Historikk for mange saker, åtte om gangen. */
  const eventsFor = async (ids: string[]) => {
    const out: Record<string, CaseEvent[]> = {}
    for (let i = 0; i < ids.length; i += 8) {
      const part = ids.slice(i, i + 8)
      const res = await Promise.all(part.map((id) => FB.inbox.events(id).catch(() => [])))
      part.forEach((id, j) => { out[id] = res[j] ?? [] })
    }
    return out
  }
  const rows = (list ?? []).filter((c) => (f.kind === 'all' || c.kind === f.kind) && (f.app === 'all' || c.app === f.app) && (f.status === 'all' || c.status === f.status)
    && (f.env === 'all' || c.context?.env === f.env) && (!f.from || c.created_at >= f.from) && (!f.to || c.created_at.slice(0, 10) <= f.to)
    && (!f.q || norm(`${c.ref} ${c.title ?? ''} ${c.description} ${c.submitter_name ?? ''}`).includes(norm(f.q))))
  const apps = [...new Set((list ?? []).map((c) => c.app).filter((x): x is string => !!x))].sort()
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }))
  const copied = (ok: boolean, msg: string, text: string) => {
    if (ok) say(t(msg))
    else { say(t('Kopieringen feilet. Teksten vises i stedet, så du kan kopiere den selv.'), false); setManual(text) }
  }
  const copyOne = (c: FeedbackCase) => act(async () => {
    const text = formatCase(c, await FB.inbox.events(c.id).catch(() => []))
    copied(await copyText(text), 'Saken er kopiert og klar til å limes inn i Claude Code.', text)
  })()
  const copyMany = (cases: FeedbackCase[], scope: string) => act(async () => {
    if (!cases.length) { say(t('Ingen saker å kopiere.'), false); return }
    const ps = formatCases(cases, await eventsFor(cases.map((c) => c.id)), { scope })
    if (ps.length > 1) { setParts(ps); say(t('Sakene er for mange til å kopieres på én gang. Kopier dem del for del.'), false); return }
    copied(await copyText(ps[0] ?? ''), cases.length === 1 ? 'Saken er kopiert og klar til å limes inn i Claude Code.' : 'Alle valgte saker er kopiert og klare til å limes inn i Claude Code.', ps[0] ?? '')
  })()
  /** «Slett valgte» = den etablerte fjerningen (arkivering): sakene forsvinner fra innboksen, men historikken beholdes og de kan gjenopprettes. */
  const removeMany = (cases: FeedbackCase[], listName: string) => act(async () => {
    if (!cases.length) return
    if (!window.confirm(fill(t('Slette {n} valgte saker fra «{list}»?'), { n: String(cases.length), list: t(listName) }) + '\n\n' + cases.map((c) => c.ref).join(', ') + '\n\n' + t('Sakene fjernes fra innboksen, men historikken beholdes, og de kan gjenopprettes under «Fjernede saker».'))) throw new Cancelled('cancel')
    let ok = 0
    const failed: string[] = []
    for (const c of cases) {
      try { await FB.inbox.archive(c.id, 'Slettet fra listen «' + listName + '»'); ok++ } catch { failed.push(c.ref) }
    }
    await load()
    if (failed.length) say(fill(t('{ok} saker er slettet. Disse kunne ikke slettes: {refs}'), { ok: String(ok), refs: failed.join(', ') }), false)
    else say(fill(t('{n} saker er slettet fra innboksen.'), { n: String(ok) }))
    return ok
  })()
  /** Statusendring fra listen: lagres først, så hentes listen på nytt – saken flytter seg bare når lagringen lyktes. */
  const changeStatus = (c: FeedbackCase, status: string) => act(async () => {
    if (status === c.status) return
    let reason = ''
    if (status === 'rejected') {
      reason = (window.prompt(fill(t('Begrunnelse for å avvise {ref}:'), { ref: c.ref })) ?? '').trim()
      if (reason.length < 3) { say(t('Skriv en begrunnelse for avvisningen.'), false); return }
    }
    await FB.inbox.setStatus(c.id, status, reason)
    say(fill(t('{ref} har fått status «{status}».'), { ref: c.ref, status: t(STATUS[status] ?? status) }))
    await load()
  })()
  const cur = selected ? (list ?? []).find((c) => c.id === selected) : undefined
  const by = (k: FbList) => rows.filter((c) => listOf(c.status) === k)
  const listProps = { onCopy: copyMany, onCopyOne: copyOne, onRemove: removeMany, onStatus: changeStatus, loading: list === null }

  return (
    <>
      <Head title="Tilbakemeldinger" sub="Feil, forbedringsforslag og ønsker fra brukerne. Bare Moderator og Developer ser og behandler sakene." />
      <div className="ch-row">
        <Select label="Visning" value={archived ? 'archived' : 'inbox'} onChange={(v) => { setList(null); setArchived(v === 'archived'); setShowArchive(false) }} options={[['inbox', 'Innboks'], ['archived', 'Fjernede saker']]} />
        {!archived && <Btn {...(showArchive ? { kind: 'primary' } : {})} data-fb-archive-toggle="" onClick={() => setShowArchive((v) => !v)}>{t(showArchive ? 'Tilbake til aktive saker' : 'Åpne arkiv')}</Btn>}
        <Search value={f.q} onChange={set('q')} placeholder="Søk i referanse, tekst eller avsender …" />
        <Select label="Kategori" value={f.kind} onChange={set('kind')} options={[['all', 'Alle kategorier'], ...Object.entries(KIND)]} />
        <Select label="Applikasjon" value={f.app} onChange={set('app')} options={[['all', 'Alle applikasjoner'], ...apps.map((a) => [a, a] as const)]} />
        <Select label="Status" value={f.status} onChange={set('status')} options={[['all', 'Alle statuser'], ...Object.entries(STATUS)]} />
        <Select label="Miljø" value={f.env} onChange={set('env')} options={[...ENVS]} />
        <label className="ch-row ch-muted" style={{ gap: 6 }}>{t('Fra')}<input className="ch-input" type="date" value={f.from} onChange={(e) => set('from')(e.target.value)} style={{ width: 150 }} /></label>
        <label className="ch-row ch-muted" style={{ gap: 6 }}>{t('Til')}<input className="ch-input" type="date" value={f.to} onChange={(e) => set('to')(e.target.value)} style={{ width: 150 }} /></label>
      </div>
      <Card title="Kopier saker" sub={rows.length + ' ' + t('saker vises')}>
        <div className="ch-row" data-fb-copybar="">
          <Btn kind="primary" onClick={() => copyMany(rows, 'alle viste saker med gjeldende filter (' + rows.length + ')')} disabled={!rows.length}>{t('Kopier alle saker')}</Btn>
        </div>
        <p className="ch-muted">{t('«Kopier alle saker» tar med alle saker som vises med gjeldende filter og søk. Hver liste har egne knapper for å velge og kopiere eller slette valgte saker. Kopiering endrer ikke status eller notater. Hemmeligheter fjernes, og avsenderens navn og e-post tas ikke med.')}</p>
      </Card>
      {parts && (
        <Card title="Eksport i flere deler" sub={parts.length}>
          <p className="ch-muted">{t('Sakene er delt i deler slik at hver del kan limes inn for seg. Ingen saker er utelatt; hver sak står i sin helhet i én del.')}</p>
          <div className="ch-row">
            {parts.map((p, i) => <Btn key={i} onClick={() => act(async () => copied(await copyText(p), 'Del ' + (i + 1) + ' er kopiert og klar til å limes inn i Claude Code.', p))()}>{t('Kopier del')} {i + 1}</Btn>)}
            <Btn small onClick={() => setParts(null)}>{t('Lukk')}</Btn>
          </div>
        </Card>
      )}
      {archived
        ? <CaseList id="removed" cases={rows} {...listProps} canRemove={false} />
        : showArchive
          ? <CaseList id="archive" cases={by('archive')} {...listProps} />
          : <>
            <CaseList id="new" cases={by('new')} {...listProps} />
            <CaseList id="work" cases={by('work')} {...listProps} />
          </>}
      {cur && <CaseDrawer key={cur.id + cur.status} c={cur} onClose={() => go('tilbakemeldinger')} onCopy={() => copyOne(cur)} reload={load} />}
      {selected && list && !cur && !archived && <p className="ch-muted">{t('Finner du ikke saken? Den kan være fjernet – se «Fjernede saker».')}</p>}
      {selected && list && !cur && <Drawer title={t('Sak')} onClose={() => go('tilbakemeldinger')}><Empty>{t('Fant ikke saken, eller du har ikke tilgang.')}</Empty></Drawer>}
      {manual && (
        <Dialog title={t('Kopier teksten')} onClose={() => setManual(null)}>
          <p className="ch-muted">{t('Merk all teksten (Ctrl/Cmd + A) og kopier den (Ctrl/Cmd + C).')}</p>
          <textarea className="ch-input" readOnly value={manual} style={{ height: 320, padding: 10, fontFamily: 'ui-monospace,Consolas,monospace', fontSize: 12 }} onFocus={(e) => e.target.select()} autoFocus />
        </Dialog>
      )}
    </>
  )
}

/**
 * Én liste med egne valg og handlinger: «Velg alle» velger bare sakene i denne listen som vises med gjeldende filter;
 * valg i én liste påvirker aldri en annen. Saker som flytter til en annen liste (ny status), faller ut av valget.
 */
function CaseList({ id, cases, loading, onCopy, onCopyOne, onRemove, onStatus, canRemove = true }: {
  id: FbList | 'removed'; cases: FeedbackCase[]; loading: boolean; canRemove?: boolean
  onCopy: (cases: FeedbackCase[], scope: string) => void; onCopyOne: (c: FeedbackCase) => void
  onRemove: (cases: FeedbackCase[], listName: string) => Promise<number | undefined>; onStatus: (c: FeedbackCase, status: string) => void
}) {
  const { t } = useAdmin()
  const [pick, setPick] = useState<Set<string>>(() => new Set())
  const chosen = cases.filter((c) => pick.has(c.id))
  const toggle = (cid: string) => setPick((s) => { const n = new Set(s); if (n.has(cid)) n.delete(cid); else n.add(cid); return n })
  const name = LIST_NAME[id]
  return (
    <section data-fb-list={id} aria-label={t(name)} style={{ display: 'grid', gap: 8, marginTop: 16 }}>
      <div className="ch-row" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0 }}>{t(name)} <span className="ch-badge" data-fb-count="">{cases.length}</span></h3>
        <div className="ch-row" style={{ flexWrap: 'wrap' }}>
          <Btn small disabled={!cases.length || chosen.length === cases.length} onClick={() => setPick(new Set(cases.map((c) => c.id)))}>{t('Velg alle')}</Btn>
          {chosen.length > 0 && <span className="ch-muted" data-fb-picked="">{chosen.length} {t('valgt')}</span>}
          {chosen.length > 0 && <Btn small onClick={() => setPick(new Set())}>{t('Fjern valg')}</Btn>}
          <Btn small disabled={!chosen.length} onClick={() => onCopy(chosen, 'valgte saker i «' + name + '» (' + chosen.length + ')')}>{t('Kopier valgte')}</Btn>
          {canRemove && <Btn small kind="danger" disabled={!chosen.length} style={{ marginLeft: 8 }} onClick={() => void onRemove(chosen, name).then((n) => { if (n) setPick(new Set()) })}>{t('Slett valgte')}</Btn>}
        </div>
      </div>
      <List cols="28px minmax(90px,auto) minmax(180px,2fr) minmax(120px,1fr) auto auto" head={['', 'Referanse', 'Sak', 'Applikasjon og side', 'Status', '']}
        empty={loading ? 'Laster …' : LIST_EMPTY[id]} onRow={(r) => go('tilbakemeldinger', r.key)}
        rows={cases.map((c) => ({ key: c.id, cells: [
          <input key="p" type="checkbox" aria-label={t('Velg') + ' ' + c.ref} checked={pick.has(c.id)} onClick={(e) => e.stopPropagation()} onChange={() => toggle(c.id)} />,
          <div key="r"><b>{c.ref}</b><div className="ch-muted">{fmt(c.created_at)}</div></div>,
          <div key="s"><Badge tone={c.kind === 'bug' ? 'bad' : ''}>{t(KIND[c.kind] ?? c.kind)}</Badge> <span>{scrubText(c.title || c.description).slice(0, 110)}</span>
            <div className="ch-muted">{t('Fra')} {c.submitter_name || t('ukjent')}{c.church_name ? ' · ' + c.church_name : ''}{c.marked ? ' · 📍 ' + t('markering') : ''}{c.context?.errors?.length ? ' · ⚠ ' + c.context.errors.length + ' ' + t('feilmeldinger') : ''}{c.note_count ? ' · ' + c.note_count + ' ' + t('notater') : ''}</div></div>,
          <div key="a"><span>{c.app_name || c.app || '–'}</span><div className="ch-muted">{c.page}{c.view ? ' ' + c.view : ''} · {t(ENV_NAME[c.context?.env ?? ''] ?? '')}</div></div>,
          <div key="st" onClick={(e) => e.stopPropagation()}>
            <Badge tone={TONE[c.status]}>{t(STATUS[c.status] ?? c.status)}</Badge>
            {id !== 'removed' && <select className="ch-select" aria-label={t('Endre status for') + ' ' + c.ref} value={c.status} onChange={(e) => onStatus(c, e.target.value)} style={{ marginTop: 4, height: 30 }}>
              {Object.entries(STATUS).map(([k, l]) => <option key={k} value={k}>{t(l)}</option>)}
            </select>}
          </div>,
          <div key="c" className="ch-end"><Btn small onClick={(e) => { e.stopPropagation(); onCopyOne(c) }}>{t('Kopier sak')}</Btn></div>] }))} />
    </section>
  )
}

/** Én sak: alt innhold, markering, teknisk kontekst, status, notater og historikk. */
function CaseDrawer({ c, onClose, onCopy, reload }: { c: FeedbackCase; onClose: () => void; onCopy: () => void; reload: () => Promise<void> }) {
  const { act, say, t } = useAdmin()
  const { feedback: FB } = useServices()
  const [ev, setEv] = useState<CaseEvent[]>([])
  const [st, setSt] = useState({ status: c.status, reason: c.status_reason || '', note: '', archiveReason: '' })
  const loadEv = async () => setEv(await FB.inbox.events(c.id))
  // tilstanden nullstilles med key (sak + status) der skuffen vises
  useEffect(() => { void act(async () => setEv(await FB.inbox.events(c.id)))() }, [act, FB, c.id])
  const a = c.answers ?? {}, x = c.context ?? {}, m = c.marked
  const saveStatus = (e: FormEvent) => {
    e.preventDefault()
    if (st.status === 'rejected' && st.reason.trim().length < 3) { say(t('Skriv en begrunnelse for avvisningen.'), false); return }
    void act(async () => { await FB.inbox.setStatus(c.id, st.status, st.reason.trim()); say(t('Statusen er lagret.')); await reload(); await loadEv() })()
  }
  const addNote = (e: FormEvent) => {
    e.preventDefault()
    if (!st.note.trim()) return
    void act(async () => { await FB.inbox.addNote(c.id, st.note.trim()); setSt((s) => ({ ...s, note: '' })); say(t('Notatet er lagret.')); await reload(); await loadEv() })()
  }
  const archive = (e: FormEvent) => {
    e.preventDefault()
    void act(async () => {
      const what = c.ref + (c.title || c.description ? ' «' + (c.title || c.description).slice(0, 80) + '»' : '')
      if (!window.confirm(fill(t('Fjerne sak {what} fra innboksen?'), { what }) + '\n\n' + t('Saken arkiveres: den vises ikke lenger i innboksen, men historikken beholdes, og den kan gjenopprettes under «Fjernede saker».'))) throw new Cancelled('cancel')
      await FB.inbox.archive(c.id, st.archiveReason.trim())
      say(fill(t('Sak {ref} er fjernet fra innboksen.'), { ref: c.ref }))
      onClose()
      await reload()
    })()
  }
  const restore = act(async () => { await FB.inbox.restore(c.id); say(fill(t('Sak {ref} er gjenopprettet til innboksen.'), { ref: c.ref })); onClose(); await reload() })
  const kv = (k: string, v: string | null | undefined) => (v ? <><dt>{t(k)}</dt><dd>{v}</dd></> : null)
  return (
    <Drawer title={c.ref + ' · ' + t(KIND[c.kind] ?? c.kind)} sub={fmt(c.created_at)} onClose={onClose}>
      <div className="ch-row"><Badge tone={TONE[c.status]}>{t(STATUS[c.status] ?? c.status)}</Badge><Btn kind="primary" onClick={onCopy}>{t('Kopier sak')}</Btn></div>
      <Card title="Oppgitt av brukeren">
        {c.title && <p><b>{c.title}</b></p>}
        <p style={{ whiteSpace: 'pre-wrap' }} data-fb-desc="">{c.description}</p>
        <dl className="ch-kv">
          {kv('Forventet', a.expected)}{kv('Slik gjenskapes det', a.steps)}{kv('Bør forbedres', a.improve)}{kv('Ønsket funksjon', a.feature)}
          {kv('Hvor i appen', a.where)}{kv('Hindrer arbeidet', a.severity && t(SEVERITY[a.severity] ?? a.severity))}{kv('Viktighet', a.importance && t(IMPORTANCE[a.importance] ?? a.importance))}
          {kv('Avsender', (c.submitter_name || t('ukjent')) + ' · ' + t(c.role || ''))}{kv('Menighet', c.church_name)}
        </dl>
      </Card>
      <Card title="Applikasjon og markering (hentet automatisk)">
        <dl className="ch-kv">{kv('Applikasjon', (c.app_name || '') + (c.app ? ' (' + c.app + ')' : ''))}{kv('Side', c.page)}{kv('Visning', c.view)}</dl>
        {m ? <MarkPreview m={m} /> : <p className="ch-muted">{t('Ingen markering.')}</p>}
      </Card>
      <Card title="Teknisk kontekst (hentet automatisk)">
        <dl className="ch-kv">
          {kv('Miljø', t(ENV_NAME[x.env ?? ''] ?? x.env ?? ''))}{kv('Bygg', x.build)}{kv('Commit', x.commit && x.commit + (x.branch ? ' (' + x.branch + ')' : ''))}
          {kv('Nettleser', x.browser)}{kv('System', x.os)}{kv('Enhet', x.device)}{kv('Skjerm', x.screen)}{kv('Vindu', x.viewport)}{kv('Språk', x.lang)}{kv('Tidssone', x.tz)}
        </dl>
        {Array.isArray(x.errors) && x.errors.length
          ? <ul className="ch-muted" data-fb-errors="">{x.errors.map((er, i) => <li key={i}>{fmt(er.time)} · {er.kind}{er.code ? ' · ' + er.code : ''}: {er.message}{er.source ? ' (' + er.source + (er.line ? ':' + er.line : '') + ')' : ''}</li>)}</ul>
          : <p className="ch-muted">{t('Ingen feilmeldinger fanget opp.')}</p>}
      </Card>
      <Card title="Behandling (internt)">
        <form className="ch-form" onSubmit={saveStatus} data-fb-status="">
          <Field label="Status"><select className="ch-select" value={st.status} onChange={(e) => { const v = e.target.value; setSt((s) => ({ ...s, status: v })) }}>{Object.entries(STATUS).map(([k, l]) => <option key={k} value={k}>{t(l)}</option>)}</select></Field>
          <Field label={st.status === 'rejected' ? 'Begrunnelse (påkrevd ved avvisning)' : 'Begrunnelse (valgfritt)'}><input className="ch-input" value={st.reason} maxLength={1000} onChange={(e) => { const v = e.target.value; setSt((s) => ({ ...s, reason: v })) }} /></Field>
          <Btn type="submit">{t('Lagre status')}</Btn>
        </form>
        <form className="ch-form" onSubmit={addNote} data-fb-note="">
          <Field label="Internt notat (vises bare for Moderator og Developer)"><textarea className="ch-input" style={{ height: 'auto', minHeight: 70, padding: '8px 12px' }} value={st.note} maxLength={2000} onChange={(e) => { const v = e.target.value; setSt((s) => ({ ...s, note: v })) }} /></Field>
          <Btn type="submit" disabled={!st.note.trim()}>{t('Lagre notat')}</Btn>
        </form>
        {ev.length ? (
          <List cols="auto 1fr" rows={ev.map((e, i) => ({ key: e.id ?? String(i), cells: [<span key="t" className="ch-muted">{fmt(e.created_at)}</span>,
            <span key="x">{e.kind === 'note' ? <><b>{t('Notat')}</b> ({e.actor_name || '–'}): {e.text}</>
              : e.kind === 'archive' ? <><b>{t('Fjernet fra innboksen')}</b> ({e.actor_name || '–'}){e.text ? ': ' + e.text : ''}</>
                : e.kind === 'restore' ? <><b>{t('Gjenopprettet til innboksen')}</b> ({e.actor_name || '–'})</>
                  : <><b>{t(STATUS[e.old_status ?? ''] ?? e.old_status ?? '')} → {t(STATUS[e.new_status ?? ''] ?? e.new_status ?? '')}</b> ({e.actor_name || '–'}){e.text ? ': ' + e.text : ''}</>}</span>] }))} />
        ) : <p className="ch-muted">{t('Ingen statusendringer eller notater ennå.')}</p>}
      </Card>
      {/* Eget felt, adskilt fra statusbehandlingen, så en sak aldri fjernes ved et uhell. Fjerning = arkivering. */}
      <Card title={c.archived_at ? 'Saken er fjernet fra innboksen' : 'Fjern saken'}>
        {c.archived_at ? (
          <div data-fb-archived="">
            <p className="ch-muted">{t('Fjernet')} {fmt(c.archived_at)}{c.archive_reason ? ' · ' + c.archive_reason : ''}</p>
            <Btn onClick={restore}>{t('Gjenopprett til innboksen')}</Btn>
          </div>
        ) : (
          <form className="ch-form" onSubmit={archive} data-fb-archive="">
            <p className="ch-muted">{t('For saker som ikke skal behandles (f.eks. duplikater eller tester). Saken forsvinner fra innboksen, men historikken og loggen beholdes, og den kan gjenopprettes under «Fjernede saker».')}</p>
            <Field label="Begrunnelse (valgfritt)"><input className="ch-input" value={st.archiveReason} maxLength={500} onChange={(e) => { const v = e.target.value; setSt((s) => ({ ...s, archiveReason: v })) }} /></Field>
            <Btn kind="danger" type="submit">{t('Fjern saken fra innboksen')}</Btn>
          </form>
        )}
      </Card>
    </Drawer>
  )
}

/** Markeringen som en ramme i et skjermomriss med samme sideforhold som brukerens vindu. */
function MarkPreview({ m }: { m: CaseMark }) {
  const { t } = useAdmin()
  const [w, h] = (m.viewport || '16×9').split('×').map(Number), r = m.rect ?? {}, e = m.element ?? {}
  return (
    <div data-fb-mark="">
      <div style={{ position: 'relative', width: '100%', maxWidth: 360, aspectRatio: (w || 16) + ' / ' + (h || 9), border: '1px solid var(--line)', borderRadius: 8, background: 'var(--panel)', overflow: 'hidden' }} aria-label={t('Markering i skjermbildet')}>
        <div style={{ position: 'absolute', left: (r.x || 0) + '%', top: (r.y || 0) + '%', width: Math.max(r.w || 0, 1) + '%', height: Math.max(r.h || 0, 1) + '%', border: '2px solid #f5b301', background: 'rgba(245,179,1,.25)', borderRadius: 3 }} />
      </div>
      <p className="ch-muted">{t(m.mode === 'area' ? 'Område' : 'Element')}{e.tag ? ' <' + e.tag + '>' : ''}{e.label ? ' «' + e.label + '»' : ''} · x {r.x} %, y {r.y} %, {r.w} × {r.h} % · {t('vindu')} {m.viewport}</p>
      {e.path && <p className="ch-muted" style={{ wordBreak: 'break-all' }}>{e.path}</p>}
      {e.attrs && Object.keys(e.attrs).length > 0 && <p className="ch-muted" style={{ wordBreak: 'break-all' }}>{Object.entries(e.attrs).map(([k, v]) => k + '="' + v + '"').join(' · ')}</p>}
      <p className="ch-muted">{t('Skjermbilde er ikke støttet i denne versjonen; rammen viser plasseringen i brukerens vindu.')}</p>
    </div>
  )
}
