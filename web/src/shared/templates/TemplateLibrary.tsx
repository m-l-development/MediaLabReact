import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useT } from '../i18n/i18n'
import { ALL, filterTemplates, type TplItem } from './filter'
import type { TplSort } from './theme'
import s from './Templates.module.css'

/**
 * Felles malbibliotek (samme kort som «Ny mal» i Thumbnail Studio): faner «Alle maler» + kategoriene, søk og sortering.
 * Appen tegner forhåndsvisningen (`preview`) og får vite hvilke maler som vises (`onShow`), så den bare lager skisser
 * for dem. `head` = innhold i verktøylinjen (f.eks. fargevelgeren).
 */
export function TemplateLibrary<T extends TplItem>({ items, cats, catLabel, preview, onPick, onShow, aspect = '16 / 9', minW, loading, head, initialCat, attr }: {
  items: readonly T[]
  cats: readonly string[]
  catLabel?: (c: string) => string
  preview: (t: T) => ReactNode
  onPick: (t: T) => void
  onShow?: (list: T[]) => void
  aspect?: string
  minW?: number
  loading?: boolean
  head?: ReactNode
  initialCat?: string
  /** ekstra data-attributt med malens id på kortet (for appens egne tester og stiler) */
  attr?: string
}) {
  const t = useT()
  const [cat, setCat] = useState(initialCat && cats.includes(initialCat) ? initialCat : ALL)
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<TplSort>('std')
  const list = useMemo(() => filterTemplates(items, { cat, q, sort, cats }), [items, cat, q, sort, cats])
  const key = list.map((x) => x.id).join('|')
  // bare kortene som er på (eller nær) skjermen meldes, så appen ikke lager skisser for hele biblioteket (151+ maler)
  // ved hvert fargebytte; nye kort meldes når man ruller
  const grid = useRef<HTMLDivElement>(null)
  // forhåndsvisningen tegnes først når kortet har vært nær skjermen (null = alle, uten IntersectionObserver)
  const [seen, setSeen] = useState<Set<string> | null>(() => new Set())
  const show = useRef(onShow)
  useEffect(() => { show.current = onShow })
  useEffect(() => {
    const g = grid.current
    if (!g || typeof IntersectionObserver === 'undefined') { setSeen(null); show.current?.(list); return }
    const vis = new Set<string>()
    let raf = 0
    const emit = () => { raf = 0; show.current?.(list.filter((x) => vis.has(x.id))) }
    const io = new IntersectionObserver((es) => {
      let ch = false
      for (const e of es) {
        const id = (e.target as HTMLElement).dataset.tplItem ?? ''
        if (e.isIntersecting ? !vis.has(id) : vis.has(id)) { ch = true; if (e.isIntersecting) vis.add(id); else vis.delete(id) }
      }
      if (ch) setSeen((p) => { const n = new Set(p ?? []); let add = false; for (const id of vis) if (!n.has(id)) { n.add(id); add = true } return add ? n : p })
      if (ch && !raf && show.current) raf = requestAnimationFrame(emit)
    }, { rootMargin: '300px 0px' })
    g.querySelectorAll('[data-tpl-item]').forEach((el) => io.observe(el))
    // Safari/WebKit (iPhone): observatøren meldte bare ett av kortene i den rullbare malpopupen som synlig, så
    // forhåndsvisningene ble aldri laget. Kortene nær skjermen regnes derfor også ut direkte (ved start, rulling og
    // endret størrelse) – samme regel (300 px utenfor skjermen) som observatøren.
    let scanRaf = 0
    const scan = () => {
      scanRaf = 0
      const vh = window.innerHeight
      let ch = false
      g.querySelectorAll<HTMLElement>('[data-tpl-item]').forEach((el) => {
        const r = el.getBoundingClientRect()
        const id = el.dataset.tplItem ?? ''
        const near = r.width > 0 && r.bottom > -300 && r.top < vh + 300
        if (near && !vis.has(id)) { vis.add(id); ch = true }
      })
      if (ch) setSeen((p) => { const n = new Set(p ?? []); let add = false; for (const id of vis) if (!n.has(id)) { n.add(id); add = true } return add ? n : p })
      if (ch && !raf && show.current) raf = requestAnimationFrame(emit)
    }
    const queue = () => { if (!scanRaf) scanRaf = requestAnimationFrame(scan) }
    // kortene legges ut etter at listen er byttet: søk når rutenettet får/endrer størrelse og noen ganger i starten
    const timers = [120, 400, 1000, 2000].map((ms) => setTimeout(queue, ms))
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(queue)
    ro?.observe(g)
    window.addEventListener('scroll', queue, { capture: true, passive: true })
    window.addEventListener('resize', queue, { passive: true })
    return () => {
      io.disconnect()
      ro?.disconnect()
      cancelAnimationFrame(raf)
      cancelAnimationFrame(scanRaf)
      for (const t of timers) clearTimeout(t)
      window.removeEventListener('scroll', queue, { capture: true })
      window.removeEventListener('resize', queue)
    }
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps
  const n = (c: string) => items.filter((x) => x.cat === c).length
  const style = { '--tpl-min': `${minW ?? 220}px`, '--tpl-min-m': `${Math.max(120, Math.round((minW ?? 220) * 0.62))}px` } as CSSProperties
  return (
    <div className={s.lib} data-tpl-lib="">
      <div className={s.bar}>
        <input type="search" className={s.search} placeholder={t('tpl.search')} aria-label={t('tpl.search')} value={q} data-tpl-search="" onChange={(e) => setQ(e.target.value)} />
        <select className={s.sort} aria-label={t('tpl.sort')} value={sort} data-tpl-sort="" onChange={(e) => setSort(e.target.value as TplSort)}>
          <option value="std">{t('tpl.sort.std')}</option>
          <option value="name">{t('tpl.sort.name')}</option>
          <option value="cat">{t('tpl.sort.cat')}</option>
          <option value="new">{t('tpl.sort.new')}</option>
        </select>
        {head}
      </div>
      <div className={s.tabs} role="group" aria-label={t('tpl.cats')} data-tpl-cats="">
        <button type="button" aria-pressed={cat === ALL} data-tpl-cat="*" onClick={() => setCat(ALL)}>{t('tpl.all')}<span>{items.length}</span></button>
        {cats.map((c) => <button key={c} type="button" aria-pressed={cat === c} data-tpl-cat={c} onClick={() => setCat(c)}>{catLabel ? catLabel(c) : c}<span>{n(c)}</span></button>)}
      </div>
      {loading && <span className={s.note}>{t('tpl.loading')}</span>}
      {!loading && !list.length && <span className={s.note} data-tpl-none="">{t('tpl.none')}</span>}
      <div ref={grid} className={s.grid} style={style} data-tpl-grid="">
        {list.map((x) => (
          <button key={x.id} type="button" className={s.card} data-tpl-item={x.id} data-tpl-item-cat={x.cat} {...(attr ? { [attr]: x.id } : {})} onClick={() => onPick(x)}>
            <span className={s.thumb} style={{ aspectRatio: aspect }}>{!seen || seen.has(x.id) ? preview(x) : null}</span>
            <span className={s.text}>
              <b>{x.name}</b>
              {x.desc && <span>{x.desc}</span>}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

/** Felles popup for malbiblioteket (fullskjerm på mobil). Escape og klikk utenfor lukker. */
export function TemplateModal({ title, lead, onClose, head, children }: { title: string; lead?: string; onClose: () => void; head?: ReactNode; children: ReactNode }) {
  const t = useT()
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', key)
    return () => document.removeEventListener('keydown', key)
  }, [onClose])
  return (
    <div className={s.back} onClick={onClose} data-tpl-modal="">
      <div className={s.modal} role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className={s.head}>
          <div>
            <span className={s.title}>{title}</span>
            {lead && <span className={s.lead}>{lead}</span>}
          </div>
          {head}
        </div>
        {children}
        <div className={s.foot}>
          <button type="button" data-tpl-close="" onClick={onClose}>{t('tpl.close')}</button>
        </div>
      </div>
    </div>
  )
}
