import { useEffect, useRef, useState } from 'react'
import { LayoutPreview, Mark, type PreviewElement, type PreviewRect } from './LayoutPreview'
import { appPath, VIEWS, type ViewDef } from './views'
import s from './LivePreview.module.css'

/**
 * Forhåndsvisning i tilbakemeldingsinnboksen med den ekte siden: appen lastes i en ramme i skrivebeskyttet modus
 * (app/preview.ts: ingen backend, ingen brukerdata, lagring bare i minnet), med samme vindusstørrelse, rolle, adresse,
 * visning og scrolling som da saken ble sendt, og skaleres ned. Markeringen ligger over på samme sted. Rammen tar ikke
 * imot klikk eller tastatur. Ingenting lagres: alt bygges fra sakens få felt (app, side, visning, markering).
 *
 * Visninger uten adresse (redigering) åpnes med de samme knappene som brukeren trykket (shared/feedback/views.ts).
 * Eldre saker uten lagret visning (ui mangler; nye saker har '' for startvisningen) laster startvisningen og
 * redigeringen samtidig og beholder den der det markerte elementet passer best.
 * Mens siden bygges vises miniatyren (LayoutPreview) dempet med en lasteindikator; kan siden ikke vises, brukes miniatyren.
 *
 * Fart: appen lastes bare én gang per sak (også «Forstørr»: samme ramme, bare større), ventingen følger endringene i
 * siden (ingen faste pauser eller intervaller), og nettleseren gjenbruker appens filer fra innboksen (samme opphav).
 */
export interface LiveCase {
  app: string | null
  page: string | null
  view: string | null
  role: string | null
  ui?: string | undefined
  viewport?: string | undefined
  rect?: PreviewRect | undefined
  scroll?: { x?: number; y?: number } | undefined
  element?: PreviewElement | null | undefined
  layout?: unknown
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Venter til f() gir noe: sjekkes straks siden endrer seg (høyst ms). */
function until<T>(doc: Document, f: () => T | null | undefined, ms = 8000): Promise<T | null> {
  return new Promise((res) => {
    const v = f()
    if (v) { res(v); return }
    const check = () => { const x = f(); if (x) done(x) }
    const mo = new MutationObserver(check)
    const slow = setInterval(check, 250) // reserve: endringer som ikke er i DOM-en
    const end = setTimeout(() => done(null), ms)
    function done(x: T | null) { mo.disconnect(); clearInterval(slow); clearTimeout(end); res(x) }
    mo.observe(doc, { childList: true, subtree: true, attributes: true })
  })
}

/** Siden er ferdig tegnet: fontene er lastet og innholdet har stått stille i 100 ms (høyst 400 ms). */
async function settle(doc: Document) {
  await Promise.race([doc.fonts?.ready, sleep(300)])
  await new Promise<void>((res) => {
    let quiet = setTimeout(done, 100)
    const cap = setTimeout(done, 400)
    const mo = new MutationObserver(() => { clearTimeout(quiet); quiet = setTimeout(done, 100) })
    function done() { mo.disconnect(); clearTimeout(quiet); clearTimeout(cap); res() }
    mo.observe(doc, { childList: true, subtree: true, characterData: true })
  })
}

/** Hvor godt elementet under markeringens midtpunkt passer med det som ble lagret (etikett, type, sidemeny/topplinje). */
function fit(doc: Document, W: number, H: number, r: PreviewRect, e: PreviewElement | null | undefined): number {
  const el = doc.elementFromPoint((((r.x ?? 0) + (r.w ?? 0) / 2) / 100) * W, (((r.y ?? 0) + (r.h ?? 0) / 2) / 100) * H)
  if (!el || !e) return 0
  let s = 0
  const tag = (e.tag ?? '').toLowerCase()
  const near = tag ? el.closest(tag) : null
  if (near) s += 1
  const lab = (e.label ?? '').trim().toLowerCase()
  const ctl = el.closest('button,a,[role],label,h1,h2,h3,h4') ?? el
  if (lab && ((ctl.getAttribute('aria-label') ?? '') + ' ' + ((ctl as HTMLElement).innerText ?? '')).toLowerCase().includes(lab)) s += 3
  if (/(^|[ >])(aside|nav|header)(?![a-z])/.test(e.path ?? '') && el.closest('aside,nav,header')) s += 2
  // svakere: elementet (etiketten, ellers typen) finnes et annet sted i visningen
  if (lab && [...doc.querySelectorAll('[aria-label],button,a,h1,h2,h3,h4,label')].some((x) => ((x.getAttribute('aria-label') ?? '') + ' ' + ((x as HTMLElement).innerText ?? '')).toLowerCase().includes(lab))) s += 1
  else if (tag && !/^(div|span|main|section)$/.test(tag) && doc.querySelector(tag)) s += 0.5
  return s
}

export function LivePreview({ c, label, big, onClose, loading = 'Bygger forhåndsvisning…' }: { c: LiveCase; label: string; big?: boolean; onClose?: () => void; loading?: string }) {
  const [vw, vh] = (c.viewport || '').split('×').map(Number)
  const W = vw || 1440, H = vh || 900
  const r = { x: c.rect?.x || 0, y: c.rect?.y || 0, w: Math.max(c.rect?.w || 0, 1), h: Math.max(c.rect?.h || 0, 1) }
  const path = appPath(c.app, c.page)
  const views = VIEWS[c.app ?? ''] ?? []
  // eldre sak: startvisningen og redigeringen lastes samtidig i hver sin ramme
  const frames = c.ui === undefined && views[0] ? ['start', 'edit'] : ['main']
  const refs = useRef(new Map<string, HTMLIFrameElement>())
  const box = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>(path ? 'loading' : 'failed')
  const [pick, setPick] = useState<string | null>(null)
  const [k, setK] = useState(0)

  useEffect(() => {
    const el = box.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => setK(el.clientWidth / W))
    ro.observe(el)
    return () => ro.disconnect()
  }, [W, state])

  useEffect(() => {
    if (!path) return
    let on = true
    const hash = c.view?.startsWith('#') ? c.view.replace(/=…/g, '') : ''
    const role = c.role ?? 'user'
    const open = async (id: string, def?: ViewDef) => {
      const f = refs.current.get(id)
      if (!f) return null
      const u = new URL(path + (def?.url ?? ''), location.origin)
      u.searchParams.set('ch-preview', role)
      const doc = await new Promise<Document | null>((res) => {
        f.onload = () => res(f.contentDocument)
        f.src = u.pathname + u.search + hash
      })
      if (!doc || !on) return null
      // siden er klar når verktøyet er lastet (ingen lastesirkel); knappene i en visning finnes først da, så de ventes på direkte
      if (!def?.steps.length && !(await until(doc, () => doc.querySelector('main, [role=main]') && !doc.querySelector('[data-spinner]')))) return null
      for (const st of def?.steps ?? []) {
        const b = await until(doc, () => doc.querySelector<HTMLElement>(st))
        if (!b || !on) return null
        b.click()
      }
      if (def && !(await until(doc, () => doc.querySelector(def.detect)))) return null
      await settle(doc)
      return doc
    }
    void (async () => {
      let id = frames[0] as string
      let doc: Document | null
      if (frames.length > 1) {
        const [a, b] = await Promise.all([open('start'), open('edit', views[0])])
        const sa = a ? fit(a, W, H, r, c.element) : -1, sb = b ? fit(b, W, H, r, c.element) : -1
        // startvisningen beholdes når elementet passer der, ellers den som passer best
        if (b && (!a || (sa < 3 && sb > sa))) { id = 'edit'; doc = b } else { id = 'start'; doc = a }
      } else doc = await open(id, views.find((v) => v.id === c.ui))
      if (!on) return
      if (doc && (c.scroll?.x || c.scroll?.y)) doc.defaultView?.scrollTo(c.scroll.x ?? 0, c.scroll.y ?? 0)
      setPick(id)
      setState(doc ? 'ready' : 'failed')
    })()
    return () => { on = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- lastes én gang per sak
  }, [path])

  const name = (c.element?.label || '').trim().slice(0, 40) || (c.element?.tag ? '<' + c.element.tag + '>' : '')
  const fallback = <LayoutPreview layout={c.layout} rect={c.rect} viewport={c.viewport} label={label} element={c.element} big={big} />
  // «Forstørr» legger samme element over siden (samme ramme, ingen ny lasting)
  const zoom = big && onClose ? { className: 'ch-overlay center', role: 'dialog', 'aria-modal': true, 'aria-label': label, 'data-fb-big': '', onClick: onClose, style: { padding: 12, cursor: 'zoom-out' } } : {}
  return (
    <div {...zoom}>
      {state === 'failed' ? fallback : (
        <div ref={box} data-fb-live={state} role="img" aria-label={label} aria-busy={state === 'loading'}
          style={{ position: 'relative', width: '100%', maxWidth: big ? `min(${W}px, 96vw, calc(86vh * ${W / H}))` : Math.min(720, Math.round((420 * W) / H)), aspectRatio: W + ' / ' + H, overflow: 'hidden', borderRadius: 8, border: '1px solid var(--line, #2b2b2b)', background: 'var(--panel, #121212)', containerType: 'inline-size' }}>
          {state === 'loading' && (
            <>
              <div className={s.under}>{fallback}</div>
              <div className={s.bar} />
              <div className={s.loading}><span className={s.pill} data-fb-loading=""><span className={s.spin} aria-hidden="true" />{loading}</span></div>
            </>
          )}
          {frames.filter((id) => !pick || id === pick).map((id) => (
            <iframe key={id} ref={(f) => { if (f) refs.current.set(id, f); else refs.current.delete(id) }} title={label} tabIndex={-1} aria-hidden="true" inert sandbox="allow-scripts allow-same-origin"
              className={state === 'ready' ? s.shown : undefined}
              style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, border: 0, transform: `scale(${k})`, transformOrigin: '0 0', pointerEvents: 'none', visibility: state === 'ready' ? 'visible' : 'hidden' }} />
          ))}
          {/* flate over siden: ingen klikk, scrolling eller tastatur når fram til appen */}
          <div style={{ position: 'absolute', inset: 0, zIndex: 2 }} />
          {state === 'ready' && <Mark rect={r} name={name} />}
        </div>
      )}
    </div>
  )
}
