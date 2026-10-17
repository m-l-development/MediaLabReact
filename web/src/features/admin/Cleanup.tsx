import { useEffect, useState } from 'react'
import type { CleanupChurch, CleanupFile } from '../../services/admin'
import { Head } from './common'
import { useAdmin } from './context'
import { fmtDate, go, href, mb } from './lib'
import { Cancelled, fill } from './members'
import { Badge, Btn, Card, List } from './ui'

/**
 * Opprydning (ADM-13), portert fra dagens cleanup.jsx: private filer fra brukere som er fjernet fra en menighet
 * (Developer og Moderator). Bare metadata – aldri innhold, lenker eller lagringsnøkler. Filnavn vises bare for menigheter
 * der du selv er aktivt medlem; ellers bare antall og størrelse. Databasen og serveren kontrollerer alt på nytt ved sletting.
 */
const sumBytes = (list: CleanupFile[]) => list.reduce((s, r) => s + Number(r.file_size || 0), 0)
/** Små filer vises i KB (ellers står det «0.0 MB»). */
const size = (n: number) => { const b = Number(n || 0); return b < 102400 ? (b / 1024).toFixed(1) + ' KB' : mb(b) }

export function CleanupView({ churchId }: { churchId?: string | undefined }) {
  const { act, say, admin, t } = useAdmin()
  const [ov, setOv] = useState<CleanupChurch[] | null>(null)
  const [list, setList] = useState<CleanupFile[] | { error: unknown } | null>(null)
  const [sel, setSel] = useState<Set<string>>(() => new Set())
  const fetchAll = async (id: string | undefined) => {
    const o = await admin.cleanupOverview()
    let l: CleanupFile[] | { error: unknown } | null = null
    if (id) {
      try { l = await admin.cleanupCandidates(id) } catch (e) { l = { error: e } }
    }
    return { o, l }
  }
  const load = async () => { const r = await fetchAll(churchId); setOv(r.o); setList(r.l); setSel(new Set()) }
  // utvalget nullstilles med key (menigheten) der visningen brukes
  useEffect(() => {
    void act(async () => {
      setOv(await admin.cleanupOverview())
      if (churchId) {
        try { setList(await admin.cleanupCandidates(churchId)) } catch (e) { setList({ error: e }) }
      } else setList(null)
    })()
  }, [act, admin, churchId])
  const cur = (ov ?? []).find((c) => c.church_id === churchId)
  const rows = Array.isArray(list) ? list : []
  const ready = rows.filter((r) => r.ready), chosen = rows.filter((r) => sel.has(r.id)), bytes = sumBytes(chosen)
  const tot = (ov ?? []).reduce((a, c) => ({ n: a.n + c.candidates, b: a.b + Number(c.candidate_bytes), rn: a.rn + c.ready, rb: a.rb + Number(c.ready_bytes) }), { n: 0, b: 0, rn: 0, rb: 0 })
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const del = act(async () => {
    if (!chosen.length || !churchId) return
    if (!window.confirm(fill(t('Slette {count} filer ({size}) fra {church} permanent?'), { count: chosen.length, size: size(bytes), church: cur?.church_name ?? '' }) + '\n\n'
      + chosen.slice(0, 10).map((x) => '• ' + x.file_name).join('\n') + (chosen.length > 10 ? '\n…' : '') + '\n\n'
      + t('Filene tilhørte tidligere medlemmer og kan ikke hentes tilbake. Menighetens lagringsbruk går ned tilsvarende. Handlingen loggføres.'))) throw new Cancelled('cancel')
    const r = await admin.cleanup(churchId, chosen.map((x) => x.id), chosen.length, bytes)
    say(fill(t('{count} filer er slettet ({size}).'), { count: r.count, size: size(r.bytes) })
      + (r.storage_failed ? ' ' + fill(t('{n} filer kunne ikke fjernes fra lagringen ennå – prøv igjen.'), { n: r.storage_failed }) : ''), !r.storage_failed)
    await load()
  })
  const retry = act(async () => {
    const r = await admin.cleanupRetry(churchId ?? null)
    say(fill(t('Nytt forsøk: {done} fjernet fra lagringen, {failed} feilet.'), { done: r.storage_done, failed: r.storage_failed }), !r.storage_failed)
    await load()
  })
  return (
    <>
      <Head title="Opprydning" sub="Private filer fra brukere som er fjernet fra en menighet. Filene teller fortsatt i menighetens kvote, men ingen har tilgang til dem. Ingenting slettes automatisk." />
      <Card title="Menigheter med filer å rydde" sub={ov ? ov.length : null}>
        {ov && ov.length > 0 && <p className="ch-muted" data-ch-cleanup-total="">{fill(t('Totalt {n} filer ({size}), hvorav {rn} klare for sletting ({rsize}).'), { n: tot.n, size: size(tot.b), rn: tot.rn, rsize: size(tot.rb) })}</p>}
        <List cols="minmax(0,1.4fr) auto auto auto" head={['Menighet', 'Filer', 'Klare for sletting', '']} empty={ov ? 'Ingen private filer fra tidligere medlemmer.' : 'Laster …'}
          rows={(ov ?? []).map((c) => ({ key: c.church_id, cells: [
            <div key="c"><b>{c.church_name}</b>{(c.queue_pending > 0 || c.queue_failed > 0) && <div className="ch-muted">{fill(t('I kø: {p} · feilet: {f}'), { p: c.queue_pending, f: c.queue_failed })}</div>}</div>,
            <span key="n">{c.candidates} · {size(c.candidate_bytes)}</span>,
            <span key="r">{c.ready} · {size(c.ready_bytes)}</span>,
            <div key="a" className="ch-end">{c.can_view
              ? <Btn small kind={c.church_id === churchId ? 'primary' : ''} onClick={() => go('opprydning', c.church_id)}>{t('Vis filer')}</Btn>
              : <span className="ch-muted" data-ch-cleanup-locked="">{t('Bare for medlemmer av menigheten')} · <a href={href('menigheter', c.church_id)}>{t('Åpne menigheten')}</a></span>}</div>] }))} />
        <p className="ch-muted">{t('Filnavn vises bare for menigheter der du selv er medlem. Som Developer eller Moderator kan du legge deg til i menigheten under Brukere – det loggføres.')}</p>
      </Card>
      {churchId && (
        <Card title={cur ? cur.church_name : t('Menighet')} sub={rows.length || null}>
          {list && !Array.isArray(list) ? <p className="ch-note" data-ch-cleanup-denied="">{t('Du må være medlem av menigheten for å se filene.')}</p> : (
            <>
              <List cols="auto minmax(0,1.6fr) auto minmax(0,1fr) auto" head={['', 'Fil', 'Størrelse', 'Tidligere medlem', 'Status']} empty={list ? 'Ingen filer å rydde i denne menigheten.' : 'Laster …'}
                rows={rows.map((r) => ({ key: r.id, cells: [
                  <input key="p" type="checkbox" aria-label={t('Velg') + ' ' + r.file_name} checked={sel.has(r.id)} disabled={!r.ready} onChange={() => toggle(r.id)} />,
                  <div key="f"><b>{r.file_name}</b><div className="ch-muted">{t('Lastet opp')} {fmtDate(r.uploaded_at)}</div></div>,
                  <span key="s">{size(r.file_size)}</span>,
                  <div key="m">{r.former_member || t('Ukjent bruker')}<div className="ch-muted">{t('Fjernet')} {fmtDate(r.removed_at)}</div></div>,
                  r.ready ? <Badge key="st" tone="ok">{t('Klar')}</Badge> : <span key="st" data-ch-cleanup-blocked=""><Badge tone="warn">{t('Ikke klar')}</Badge> <span className="ch-muted">{t(r.reason || '')}</span></span>] }))} />
              {rows.length > 0 && (
                <div className="ch-row" data-ch-cleanup-actions="">
                  <Btn small onClick={() => setSel(new Set(ready.map((r) => r.id)))} disabled={!ready.length}>{t('Velg alle klare')}</Btn>
                  {sel.size > 0 && <Btn small onClick={() => setSel(new Set())}>{t('Fjern utvalg')}</Btn>}
                  <span className="ch-muted" data-ch-cleanup-summary="">{fill(t('Valgt: {count} filer · {size}'), { count: chosen.length, size: size(bytes) })}</span>
                  <Btn kind="danger" disabled={!chosen.length} onClick={del}>{t('Slett valgte filer')}</Btn>
                </div>
              )}
              {cur && (cur.queue_failed > 0 || cur.queue_pending > 0) && (
                <div className="ch-row">
                  <p className="ch-note warn">{fill(t('{n} slettede filer er ikke fjernet fra lagringen ennå. Radene er slettet og registrert; prøv igjen for å fjerne selve filene.'), { n: cur.queue_failed + cur.queue_pending })}</p>
                  <Btn small onClick={retry}>{t('Prøv igjen')}</Btn>
                </div>
              )}
            </>
          )}
        </Card>
      )}
    </>
  )
}
