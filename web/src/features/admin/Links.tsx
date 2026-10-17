import { useEffect, useEffectEvent, useRef, useState, type FormEvent } from 'react'
import { activeMembers, linkName, MAX_GROUP_CHURCHES, type Group, type GroupMember } from '../../services/collab'
import { useAdmin } from './context'
import { fmtDate, mb, norm } from './lib'
import { Cancelled, fill } from './members'
import { Badge, Btn, Card, Empty, Field, List } from './ui'

/**
 * Samarbeidsgrupper (ADM-08), portert fra LinksView i dagens sections.jsx. Developer/Moderator oppretter grupper med
 * 2–20 menigheter, endrer navn og beskrivelse, legger til og fjerner menigheter, avslutter, gjenåpner og sletter avsluttede
 * grupper. Stab ser bare filnavn og opplysninger om filene – aldri innhold. Fjernes en menighet, skjules kopiene den har
 * delt (ingenting slettes). Alt kontrolleres på nytt i databasen (rolle, MFA, 2–20 menigheter med lås) og loggføres.
 */
interface FileMeta { id: string; church_id: string | null; file_name: string; file_size: number; created_at: string; hidden?: boolean }
const groupNameOk = (n: string) => { const v = n.trim(); return v.length >= 2 && v.length <= 80 }
const confirmOr = (text: string) => { if (!window.confirm(text)) throw new Cancelled('cancel') }

export function LinksView() {
  const { act, say, collabSvc, t } = useAdmin()
  const [s, setS] = useState<{ list: Group[]; dir: { id: string; name: string }[]; sel: string | null; meta: FileMeta[]; loading: boolean }>({ list: [], dir: [], sel: null, meta: [], loading: true })
  const [nf, setNf] = useState({ name: '', desc: '', picked: [] as string[], q: '' })
  const [ed, setEd] = useState<{ name: string; desc: string } | null>(null)
  const [add, setAdd] = useState('')
  const seq = useRef(0)
  const load = async (sel: string | null = s.sel) => {
    const n = ++seq.current
    const [list, dir] = await Promise.all([collabSvc.links.mine(), collabSvc.links.directory().catch(() => [])])
    const cur = sel && list.some((l) => l.id === sel) ? sel : (list.find((l) => l.status === 'active') ?? list[0])?.id ?? null
    const meta = cur ? ((await collabSvc.links.filesMeta(cur).catch(() => [])) as unknown as FileMeta[]) : []
    if (n === seq.current) setS((p) => ({ ...p, list, dir: dir ?? [], sel: cur, meta: meta ?? [], loading: false }))
  }
  const first = useEffectEvent(() => { void act(() => load())() })
  useEffect(() => { first() }, [])

  const cur = s.list.find((l) => l.id === s.sel)
  const members = activeMembers(cur ?? null), full = members.length >= MAX_GROUP_CHURCHES
  const run = (fn: () => Promise<unknown>, ok?: string, sel?: string | null) => act(async () => { const msg = await fn(); await load(sel); say(typeof msg === 'string' ? msg : t(ok ?? '')) })
  const pick = (id: string) => setNf((f) => ({ ...f, picked: f.picked.includes(id) ? f.picked.filter((x) => x !== id) : f.picked.length >= MAX_GROUP_CHURCHES ? f.picked : [...f.picked, id] }))
  const canCreate = groupNameOk(nf.name) && nf.desc.trim().length <= 500 && nf.picked.length >= 2 && nf.picked.length <= MAX_GROUP_CHURCHES
  const create = (e: FormEvent) => {
    e.preventDefault()
    if (!canCreate) return
    void act(async () => {
      const id = await collabSvc.links.create(nf.name, nf.desc, nf.picked)
      say(fill(t('Samarbeidsgruppen «{name}» er opprettet. Admin i alle menighetene er varslet.'), { name: nf.name.trim() }))
      setNf({ name: '', desc: '', picked: [], q: '' })
      await load(typeof id === 'string' ? id : null)
    })()
  }
  const saveEdit = (e: FormEvent) => {
    e.preventDefault()
    if (!ed || !cur || !groupNameOk(ed.name) || ed.desc.trim().length > 500) return
    void act(async () => { await collabSvc.links.update(cur.id, ed.name, ed.desc); setEd(null); say(t('Navn og beskrivelse er lagret.')); await load() })()
  }
  const removeChurch = (m: GroupMember) => run(async () => {
    if (!cur) return
    confirmOr(fill(t('Fjerne «{church}» fra samarbeidsgruppen «{name}»?'), { church: m.name, name: linkName(cur) }) + '\n\n'
      + fill(t('{church} mister med en gang tilgang til gruppen. Kopiene menigheten har delt ({n}), skjules for alle – ingenting slettes. Legges menigheten til igjen, vises kopiene igjen. Andre menigheters kopier påvirkes ikke.'), { church: m.name, n: m.copies || 0 }))
    await collabSvc.links.removeChurch(cur.id, m.church_id)
    return fill(t('«{church}» er fjernet fra gruppen. Kopiene den delte, er skjult.'), { church: m.name })
  })
  const addChurch = (churchId: string, nameOf: string) => run(async () => {
    if (!cur) return
    const rejoin = cur.members.some((m) => m.church_id === churchId)
    await collabSvc.links.addChurch(cur.id, churchId)
    setAdd('')
    return fill(t(rejoin ? '«{church}» er med i gruppen igjen. Kopiene den delte før, er synlige igjen.' : '«{church}» er lagt til i gruppen. Admin i menighetene er varslet.'), { church: nameOf })
  })
  const end = (l: Group) => run(async () => {
    confirmOr(fill(t('Avslutte samarbeidsgruppen «{name}»?'), { name: linkName(l) }) + '\n\n' + t('Samarbeidsfilene skjules for alle menighetene i gruppen. Ingen filer slettes, og gruppen kan gjenåpnes.'))
    return collabSvc.links.end(l.id)
  }, 'Gruppen er avsluttet. Filene er skjult, ingenting er slettet.', l.id)
  const reopen = (l: Group) => run(() => collabSvc.links.reopen(l.id), 'Gruppen er gjenåpnet. Filene er synlige igjen.', l.id)
  /* Sletting av en AVSLUTTET gruppe: gruppen, medlemslisten og alle kopiene (også skjulte). Originalene røres ikke. */
  const removeLink = (l: Group) => act(async () => {
    const meta = ((await collabSvc.links.filesMeta(l.id).catch(() => [])) ?? []) as unknown as FileMeta[]
    const n = meta.length, bytes = meta.reduce((a, f) => a + Number(f.file_size || 0), 0)
    confirmOr(fill(t('Slette den avsluttede samarbeidsgruppen «{name}» permanent?'), { name: linkName(l) }) + '\n\n'
      + (n ? fill(t('{n} kopier i Samarbeidsfiler ({size}) slettes også, medregnet kopier som er skjult. Originalene i menighetene røres ikke.'), { n, size: mb(bytes) }) : t('Gruppen har ingen Samarbeidsfiler.')) + '\n'
      + t('Kan ikke angres. Handlingen loggføres.'))
    const r = (await collabSvc.links.remove(l.id)) as { copies?: number; storage_failed?: number }
    await load(null)
    say(fill(t('Samarbeidsgruppen «{name}» er slettet.'), { name: linkName(l) })
      + (r.copies ? ' ' + fill(t('{n} kopier er fjernet.'), { n: r.copies }) : '')
      + (r.storage_failed ? ' ' + fill(t('{n} filer kunne ikke fjernes fra lagringen ennå – prøv igjen.'), { n: r.storage_failed }) : ''), !r.storage_failed)
  })
  const active = s.list.filter((l) => l.status === 'active')
  const dirShown = s.dir.filter((x) => !nf.q || norm(x.name).includes(norm(nf.q)))
  const addable = cur ? s.dir.filter((x) => !cur.members.some((m) => m.church_id === x.id)) : []
  const chips = (l: Group) => <span className="ch-row" style={{ flexWrap: 'wrap', gap: 4 }}>{activeMembers(l).map((m) => <Badge key={m.church_id}>{m.name}</Badge>)}</span>
  const inGroup = (f: FileMeta) => !!cur && cur.members.some((m) => m.church_id === f.church_id)
  const byChurch: [Pick<GroupMember, 'church_id' | 'name'> | { church_id: null; name: string }, FileMeta[]][] = (cur ? cur.members : [])
    .map((m) => [m, s.meta.filter((f) => f.church_id === m.church_id)] as [GroupMember, FileMeta[]])
  if (s.meta.some((f) => !inGroup(f))) byChurch.push([{ church_id: null, name: t('(slettet menighet)') }, s.meta.filter((f) => !inGroup(f))])
  const groups = byChurch.filter(([, list]) => list.length)
  return (
    <div className="ch-grid">
      <Card title="Ny samarbeidsgruppe">
        <p className="ch-muted">{t('Samler to eller flere menigheter (høyst 20) i en gruppe med felles Samarbeidsfiler-mappe der de kan dele kopier av bilder. Menighetene ser aldri hverandres vanlige filer.')}</p>
        <form className="ch-form" onSubmit={create} data-ch-newgroup="">
          <Field label="Navn"><input className="ch-input" value={nf.name} maxLength={80} onChange={(e) => { const v = e.target.value; setNf((f) => ({ ...f, name: v })) }} placeholder={t('F.eks. Påskeprosjekt')} required /></Field>
          <Field label="Beskrivelse (valgfritt)"><textarea className="ch-input" style={{ height: 'auto', minHeight: 56, padding: 8 }} value={nf.desc} maxLength={500} onChange={(e) => { const v = e.target.value; setNf((f) => ({ ...f, desc: v })) }} /></Field>
          <Field label="Menigheter"><input className="ch-input ch-search" style={{ flex: 'none' }} type="search" value={nf.q} onChange={(e) => { const v = e.target.value; setNf((f) => ({ ...f, q: v })) }} placeholder={t('Søk etter menighet …')} /></Field>
          <div role="group" aria-label={t('Velg menigheter')} data-ch-pick="" style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, padding: '4px 2px' }}>
            {dirShown.length ? dirShown.map((x) => (
              <label key={x.id} className="ch-row" style={{ gap: 8, minHeight: 32 }}>
                <input type="checkbox" checked={nf.picked.includes(x.id)} disabled={!nf.picked.includes(x.id) && nf.picked.length >= MAX_GROUP_CHURCHES} onChange={() => pick(x.id)} /> <span>{x.name}</span>
              </label>
            )) : <span className="ch-muted">{t('Ingen menigheter funnet.')}</span>}
          </div>
          <p className="ch-muted" data-ch-picked="">{fill(t('{n} valgt – velg 2 til 20 menigheter.'), { n: nf.picked.length })}</p>
          <div className="ch-row"><Btn kind="primary" type="submit" disabled={!canCreate}>{t('Opprett gruppe')}</Btn></div>
        </form>
      </Card>
      <Card title="Samarbeidsgrupper" sub={active.length + ' ' + t('aktive')}>
        <List cols="minmax(0,1fr) auto" empty={s.loading ? 'Laster …' : 'Ingen samarbeidsgrupper ennå.'} onRow={(r) => { setEd(null); setAdd(''); void act(() => load(r.key))() }}
          rows={s.list.map((l) => ({ key: l.id, cells: [
            <div key="g" data-ch-group={l.id}><b>{linkName(l)}</b>
              <div className="ch-muted">{l.status === 'active' ? t('Opprettet') + ' ' + fmtDate(l.created_at) : t('Avsluttet') + ' ' + fmtDate(l.ended_at)}
                {l.copies != null && ' · ' + fill(t('{n} kopier'), { n: l.copies }) + ' (' + mb(l.bytes) + ')'}{l.hidden_copies ? ' · ' + fill(t('{n} skjult'), { n: l.hidden_copies }) : ''}</div>
              {chips(l)}
              <span className="ch-row">{l.status === 'active' ? <Badge tone="ok">{t('Aktiv')}</Badge> : <Badge>{t('Avsluttet')}</Badge>}{l.id === s.sel && <Badge>{t('Valgt')}</Badge>}</span></div>,
            <div key="a" className="ch-end">{l.status === 'active'
              ? <Btn small kind="danger" onClick={() => end(l)()}>{t('Avslutt')}</Btn>
              : <><Btn small onClick={() => reopen(l)()}>{t('Gjenåpne')}</Btn><Btn small kind="danger" data-ch-deletelink="" onClick={() => removeLink(l)()}>{t('Slett')}</Btn></>}</div>] }))} />
      </Card>
      {cur && (
        <Card title={linkName(cur)} sub={cur.status === 'active' ? t('Aktiv') : t('Avsluttet')}>
          <div data-ch-groupdetail="">
            {ed ? (
              <form className="ch-form" onSubmit={saveEdit} data-ch-editgroup="">
                <Field label="Navn"><input className="ch-input" value={ed.name} maxLength={80} onChange={(e) => { const v = e.target.value; setEd((x) => x && { ...x, name: v }) }} required /></Field>
                <Field label="Beskrivelse (valgfritt)"><textarea className="ch-input" style={{ height: 'auto', minHeight: 56, padding: 8 }} value={ed.desc} maxLength={500} onChange={(e) => { const v = e.target.value; setEd((x) => x && { ...x, desc: v }) }} /></Field>
                <div className="ch-row"><Btn kind="primary" type="submit" disabled={!groupNameOk(ed.name)}>{t('Lagre')}</Btn><Btn onClick={() => setEd(null)}>{t('Avbryt')}</Btn></div>
              </form>
            ) : (
              <>
                <p className="ch-muted">{cur.description || t('Ingen beskrivelse.')}</p>
                <div className="ch-row"><Btn small onClick={() => setEd({ name: cur.name ?? '', desc: cur.description || '' })}>{t('Endre navn og beskrivelse')}</Btn></div>
              </>
            )}
            {cur.status !== 'active' && <p className="ch-note">{t('Gruppen er avsluttet. Menigheter kan legges til eller fjernes, men ingenting vises før gruppen gjenåpnes.')}</p>}
            <h3 className="ch-h3">{t('Menigheter i gruppen')} ({members.length}/{MAX_GROUP_CHURCHES})</h3>
            <List cols="minmax(0,1fr) auto" empty="Ingen menigheter." rows={cur.members.map((m) => ({ key: m.church_id, cells: [
              <div key="m" data-ch-member={m.church_id}><b>{m.name}</b> {m.status === 'active' ? <Badge tone="ok">{t('Med i gruppen')}</Badge> : <Badge>{t('Fjernet')}</Badge>}
                <div className="ch-muted">{m.status === 'active' ? t('Med siden') + ' ' + fmtDate(m.joined_at) : t('Fjernet') + ' ' + fmtDate(m.left_at) + ' · ' + t('kopiene er skjult')}
                  {m.copies != null && ' · ' + fill(t('{n} kopier'), { n: m.copies }) + ' (' + mb(m.bytes) + ')'}</div></div>,
              <div key="a" className="ch-end">{m.status === 'active'
                ? <Btn small kind="danger" disabled={members.length <= 2} onClick={() => removeChurch(m)()}>{t('Fjern')}</Btn>
                : <Btn small disabled={full} onClick={() => addChurch(m.church_id, m.name)()}>{t('Legg til igjen')}</Btn>}</div>] }))} />
            {members.length <= 2 && <p className="ch-muted" data-ch-minnote="">{t('En gruppe må ha minst to menigheter. Vil du stoppe samarbeidet, avslutt gruppen i stedet.')}</p>}
            {full ? <p className="ch-note" data-ch-fullnote="">{t('Gruppen har 20 menigheter, som er det høyeste. Fjern en menighet før du legger til en ny.')}</p> : (
              <div className="ch-row" style={{ flexWrap: 'wrap' }} data-ch-addchurch="">
                <select className="ch-select" aria-label={t('Legg til menighet')} value={add} onChange={(e) => setAdd(e.target.value)}>
                  <option value="">{t('Legg til menighet …')}</option>{addable.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                </select>
                <Btn small kind="primary" disabled={!add} onClick={() => addChurch(add, s.dir.find((x) => x.id === add)?.name ?? '')()}>{t('Legg til')}</Btn>
              </div>
            )}
          </div>
        </Card>
      )}
      {cur && (
        <Card title="Filer i gruppen" sub={s.meta.length}>
          <p className="ch-muted">{t('Filene i gruppens Samarbeidsfiler, ordnet etter menigheten som delte dem. Som Developer eller Moderator ser du bare filnavn og opplysninger – ikke innholdet – og du kan ikke laste ned eller slette. Kopier fra menigheter som ikke er med nå, er skjult for alle.')}</p>
          {groups.length ? groups.map(([m, list]) => (
            <div key={m.church_id ?? 'x'} data-ch-metagroup="">
              <h3 className="ch-h3">{m.name} {list.some((f) => f.hidden) && <Badge tone="warn">{t('Skjult – menigheten er ikke med i gruppen')}</Badge>}</h3>
              <List cols="minmax(140px,1fr) auto auto" head={['Fil', 'Størrelse', 'Dato']} rows={list.map((f) => ({ key: f.id, cells: [
                <span key="n" style={{ wordBreak: 'break-all' }}>{f.file_name}</span>, <span key="s" className="ch-muted">{mb(f.file_size)}</span>, <span key="d" className="ch-muted">{fmtDate(f.created_at)}</span>] }))} />
            </div>
          )) : <Empty>{t('Ingen filer i gruppen.')}</Empty>}
        </Card>
      )}
    </div>
  )
}
