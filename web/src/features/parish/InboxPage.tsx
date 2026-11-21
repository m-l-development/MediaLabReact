import { useEffect, useMemo, useState } from 'react'
import { useServices } from '../../app/services'
import { hasRole, type Me } from '../../domain/account'
import { ServiceError } from '../../services/errors'
import type { InboxFile, InboxKind } from '../../services/parish'
import { useT } from '../../shared/i18n/i18n'
import type { MessageKey } from '../../shared/i18n/messages'
import { Button } from '../../shared/ui/Button'
import s from './Parish.module.css'
import { SendToChurch } from './SendToChurch'

type Filter = 'new' | InboxKind | 'archived' | 'all'
const FILTERS: [Filter, MessageKey][] = [['new', 'inbox.f.new'], ['image', 'inbox.f.image'], ['document', 'inbox.f.document'], ['video', 'inbox.f.video'], ['project', 'inbox.f.project'], ['archived', 'inbox.f.archived'], ['all', 'inbox.f.all']]
const SHORT: Record<InboxKind, string> = { image: 'IMG', document: 'DOK', video: 'VID', project: 'PRJ', other: 'FIL' }
const ext = (n: string) => (/\.([A-Za-z0-9]{1,6})$/.exec(n)?.[1] ?? '').toUpperCase()
const mb = (n: number) => (n < 1048576 ? Math.max(1, Math.round(n / 1024)) + ' kB' : (n / 1048576).toFixed(1).replace('.', ',') + ' MB')
const when = (iso: string) => new Date(iso).toLocaleString('nb-NO', { dateStyle: 'short', timeStyle: 'short' })
const PREVIEW_MAX = 6 * 1024 * 1024

/** Innhold fra en kortlivet lenke som blob-adresse (innholdsreglene tillater ikke lagringens adresser i <img>). */
async function blobUrl(url: string): Promise<string> {
  const r = await fetch(url)
  if (!r.ok) throw new ServiceError('download_failed')
  return URL.createObjectURL(await r.blob())
}

/**
 * Menighetens innboks (/app/innboks). Menighetsbrukeren ser sin menighets innboks; Admin ser innboksen til menighetene
 * de administrerer. Alle medlemmer kan sende filer til menigheten herfra. Databasen avgjør hva hver enkelt får se.
 */
export function InboxPage({ me }: { me: Me | null }) {
  const t = useT()
  const { parish } = useServices()
  const [adminChurches, setAdminChurches] = useState<{ id: string; name: string }[] | null>(null)
  const [picked, setChurch] = useState('')
  const [items, setItems] = useState<InboxFile[] | null>(null)
  const [rev, setRev] = useState(0)
  const load = () => setRev((r) => r + 1)
  const [filter, setFilter] = useState<Filter>('new')
  const [q, setQ] = useState('')
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [thumbs, setThumbs] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  // Innbokser brukeren kan lese: egen (Menighetsbrukeren) eller menighetene der brukeren er Admin og som har en Menighetsbruker.
  const own = me?.parish ? [{ id: me.parish.church_id, name: me.churches.find((c) => c.id === me.parish?.church_id)?.name ?? '' }] : null
  useEffect(() => {
    if (!parish || !me || me.parish) return
    let live = true
    const admin = me.churches.filter((c) => hasRole(me, 'church_admin', c.id))
    Promise.all(admin.map((c) => parish.get(c.id).then((a) => (a ? c : null), () => null))).then((l) => {
      if (live) setAdminChurches(l.filter((c): c is (typeof admin)[number] => !!c).map((c) => ({ id: c.id, name: c.name })))
    }, () => { if (live) setAdminChurches([]) })
    return () => { live = false }
  }, [parish, me])
  const churches = own ?? (parish && me ? adminChurches : [])
  const church = churches?.some((c) => c.id === picked) ? picked : churches?.[0]?.id ?? ''

  useEffect(() => {
    if (!parish || !church) return
    let live = true
    parish.list(church).then((l) => { if (live) { setItems(l); setMsg(null) } }, (e: unknown) => { if (live) setMsg(t('inbox.failed', { code: e instanceof ServiceError ? e.code : 'unknown' })) })
    return () => { live = false }
  }, [parish, church, t, rev])
  useEffect(() => {
    const onVis = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', onVis)
    const timer = setInterval(() => { if (document.visibilityState === 'visible') load() }, 60_000)
    return () => { document.removeEventListener('visibilitychange', onVis); clearInterval(timer) }
  }, [])

  const shown = useMemo(() => (items ?? []).filter((f) => {
    if (filter === 'new' && f.status !== 'new') return false
    if (filter === 'archived' && f.status !== 'archived') return false
    if (filter !== 'new' && filter !== 'archived' && filter !== 'all' && f.kind !== filter) return false
    const n = q.trim().toLowerCase()
    return !n || f.name.toLowerCase().includes(n) || f.from_name.toLowerCase().includes(n)
  }), [items, filter, q])
  const count = (k: Filter) => (items ?? []).filter((f) => (k === 'new' ? f.status === 'new' : k === 'archived' ? f.status === 'archived' : k === 'all' ? true : f.kind === k)).length

  // miniatyrer for små bilder i visningen
  useEffect(() => {
    if (!parish) return
    const need = shown.filter((f) => f.kind === 'image' && f.size <= PREVIEW_MAX && !thumbs[f.id]).slice(0, 24)
    if (!need.length) return
    let live = true
    parish.urls(need.map((f) => f.id)).then(async (urls) => {
      for (const f of need) {
        const u = urls[f.id]
        if (!u || !live) continue
        const b = await blobUrl(u).catch(() => null)
        if (b && live) setThumbs((m) => ({ ...m, [f.id]: b }))
      }
    }, () => undefined)
    return () => { live = false }
  }, [parish, shown, thumbs])

  const act = async (fn: () => Promise<unknown>) => {
    try { await fn(); load() } catch (e) { setMsg(t('inbox.failed', { code: e instanceof ServiceError ? e.code : 'unknown' })) }
  }
  const open = async (f: InboxFile) => {
    const w = window.open('', '_blank')
    if (w) w.opener = null // fanen med filen får ingen tilgang tilbake til appen
    const u = (await parish?.urls([f.id]).catch(() => ({} as Record<string, string>)))?.[f.id]
    if (u && w) w.location.href = u
    else w?.close()
    load()
  }
  const download = async (list: InboxFile[]) => {
    if (!parish) return
    const urls = await parish.urls(list.map((f) => f.id)).catch(() => ({} as Record<string, string>))
    for (const f of list) {
      const u = urls[f.id]
      if (!u) continue
      const b = await blobUrl(u).catch(() => null)
      if (!b) continue
      const a = document.createElement('a')
      a.href = b
      a.download = f.name
      a.click()
      setTimeout(() => URL.revokeObjectURL(b), 30_000)
    }
    load()
  }
  const selected = shown.filter((f) => sel.has(f.id))
  const toggle = (id: string) => setSel((cur) => { const n = new Set(cur); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const remove = (list: InboxFile[]) => {
    if (!parish || !list.length || !window.confirm(t('inbox.deleteQ', { n: list.length }))) return
    void act(() => parish.remove(list.map((f) => f.id))).then(() => setSel(new Set()))
  }
  const churchName = churches?.find((c) => c.id === church)?.name ?? ''
  const canSend = !me?.parish

  return (
    <div className={s.page} data-ch-inbox-page="">
      <section className={s.panel}>
        <div className={s.head}>
          <div>
            <h1 className={s.title}>{t('inbox.title')} {church && <span className={s.badge}>{t('parish.badge')}</span>}</h1>
            {church && <p className={s.lead}>{t('inbox.lead', { church: churchName })}</p>}
          </div>
          {canSend && <Button variant="primary" onClick={() => setSending(true)} data-ch-send-open="">{t('send.title')}</Button>}
        </div>
        {churches && churches.length > 1 && (
          <label className={s.label}>{t('inbox.church')}
            <select className={s.select} value={church} onChange={(e) => { setChurch(e.target.value); setItems(null); setSel(new Set()) }}>
              {churches.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
        )}
        {churches && !churches.length && <p className={s.lead} data-ch-inbox-noaccess="">{t('inbox.noAccess')}</p>}
        {church && (
          <>
            <div className={s.chips} role="group" aria-label={t('inbox.title')}>
              {FILTERS.map(([k, label]) => (
                <button key={k} type="button" className={s.chip} aria-pressed={filter === k} data-ch-inbox-filter={k} onClick={() => setFilter(k)}>
                  {t(label)}<span className={s.count}>{count(k)}</span>
                </button>
              ))}
            </div>
            <div className={s.toolbar}>
              <input className={s.input} type="search" placeholder={t('inbox.search')} aria-label={t('inbox.search')} value={q} onChange={(e) => setQ(e.target.value)} data-ch-inbox-search="" />
              {shown.length > 0 && <button type="button" className={s.act} onClick={() => setSel(selected.length === shown.length ? new Set() : new Set(shown.map((f) => f.id)))}>{t('inbox.selectAll')}</button>}
              {selected.length > 0 && (
                <>
                  <span className={s.small}>{t('inbox.selected', { n: selected.length })}</span>
                  <button type="button" className={s.act} onClick={() => void download(selected)}>{t('inbox.download')}</button>
                  {selected.some((f) => f.status === 'new') && <button type="button" className={s.act} onClick={() => void act(() => parish!.setStatus(selected.map((f) => f.id), 'archived')).then(() => setSel(new Set()))}>{t('inbox.archive')}</button>}
                  {selected.some((f) => f.status === 'archived') && <button type="button" className={s.act} onClick={() => void act(() => parish!.setStatus(selected.map((f) => f.id), 'new')).then(() => setSel(new Set()))}>{t('inbox.unarchive')}</button>}
                  <button type="button" className={s.act} data-danger="" onClick={() => remove(selected)}>{t('inbox.delete')}</button>
                </>
              )}
            </div>
            {msg && <p className={s.error} role="alert">{msg}</p>}
            {items === null ? <p className={s.small}>…</p> : shown.length === 0 ? <p className={s.small} data-ch-inbox-empty="">{t('inbox.empty')}</p> : (
              <ul className={s.list}>
                {shown.map((f) => (
                  <li key={f.id} className={s.item} data-unread={!f.read_at} data-ch-inbox-item={f.name}>
                    <input type="checkbox" checked={sel.has(f.id)} onChange={() => toggle(f.id)} aria-label={f.name} />
                    <span className={s.thumb}>{thumbs[f.id] ? <img src={thumbs[f.id]} alt="" /> : ext(f.name) || SHORT[f.kind]}</span>
                    <span className={s.meta}>
                      <b title={f.name}>{f.name} {!f.read_at && <span className={s.badge}>{t('inbox.new')}</span>}</b>
                      <span data-ch-inbox-from="">{t('inbox.from', { name: f.from_name })} · {when(f.created_at)} · {mb(f.size)}</span>
                    </span>
                    <span className={s.actions}>
                      <button type="button" className={s.act} onClick={() => void open(f)} data-ch-inbox-open="">{t('inbox.open')}</button>
                      <button type="button" className={s.act} onClick={() => void download([f])}>{t('inbox.download')}</button>
                      <button type="button" className={s.act} onClick={() => void act(() => parish!.setStatus([f.id], f.status === 'new' ? 'archived' : 'new'))}>{t(f.status === 'new' ? 'inbox.archive' : 'inbox.unarchive')}</button>
                      <button type="button" className={s.act} onClick={() => { const n = window.prompt(t('inbox.renameQ'), f.name); if (n && n.trim() && n !== f.name) void act(() => parish!.rename(f.id, n.trim())) }}>{t('inbox.rename')}</button>
                      <button type="button" className={s.act} data-danger="" onClick={() => remove([f])}>{t('inbox.delete')}</button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>
      {sending && <SendToChurch onClose={() => { setSending(false); load() }} />}
    </div>
  )
}
