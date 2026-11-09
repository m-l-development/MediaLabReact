import { useEffect, useRef, useState } from 'react'
import { LayoutPreview, Mark, type PreviewElement, type PreviewRect } from './LayoutPreview'
import { appPath, VIEWS, type ViewDef } from './views'

/**
 * Forhåndsvisning i tilbakemeldingsinnboksen med den ekte siden: appen lastes i en ramme i skrivebeskyttet modus
 * (app/preview.ts: ingen backend, ingen brukerdata, lagring bare i minnet), med samme vindusstørrelse, rolle, adresse,
 * visning og scrolling som da saken ble sendt, og skaleres ned. Markeringen ligger over på samme sted. Rammen tar ikke
 * imot klikk eller tastatur. Ingenting lagres: alt bygges fra sakens få felt (app, side, visning, markering).
 *
 * Visninger uten adresse (redigering) åpnes med de samme knappene som brukeren trykket (shared/feedback/views.ts).
 * Eldre saker uten lagret visning prøver visningene og beholder den der det markerte elementet passer best.
 * Mens siden lastes, og når den ikke kan vises, brukes miniatyren (LayoutPreview).
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
async function until<T>(f: () => T | null | undefined, ms = 8000): Promise<T | null> {
  for (const t = Date.now(); Date.now() - t < ms; await sleep(80)) {
    const v = f()
    if (v) return v
  }
  return null
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

export function LivePreview({ c, label, big }: { c: LiveCase; label: string; big?: boolean }) {
  const [vw, vh] = (c.viewport || '').split('×').map(Number)
  const W = vw || 1440, H = vh || 900
  const r = { x: c.rect?.x || 0, y: c.rect?.y || 0, w: Math.max(c.rect?.w || 0, 1), h: Math.max(c.rect?.h || 0, 1) }
  const path = appPath(c.app, c.page)
  const frame = useRef<HTMLIFrameElement>(null)
  const box = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>(path ? 'loading' : 'failed')
  const [k, setK] = useState(0)

  useEffect(() => {
    const el = box.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => setK(el.clientWidth / W))
    ro.observe(el)
    return () => ro.disconnect()
  }, [W])

  useEffect(() => {
    if (!path) return
    let on = true
    const views = VIEWS[c.app ?? ''] ?? []
    const hash = c.view?.startsWith('#') ? c.view.replace(/=…/g, '') : ''
    const role = c.role ?? 'user'
    const load = (def?: ViewDef) => new Promise<Document | null>((res) => {
      const f = frame.current
      if (!f) { res(null); return }
      const u = new URL(path + (def?.url ?? ''), location.origin)
      u.searchParams.set('ch-preview', role)
      f.onload = () => res(f.contentDocument)
      f.src = u.pathname + u.search + hash
    })
    const open = async (def?: ViewDef) => {
      const doc = await load(def)
      if (!doc || !on || !(await until(() => doc.querySelector('main, [role=main]')))) return null
      for (const s of def?.steps ?? []) {
        const b = await until(() => doc.querySelector<HTMLElement>(s))
        if (!b) return null
        b.click()
      }
      if (def && !(await until(() => doc.querySelector(def.detect)))) return null
      await sleep(400)
      return doc
    }
    void (async () => {
      let doc = await open(views.find((v) => v.id === c.ui))
      // eldre sak (uten lagret visning): prøv redigeringsvisningen når startvisningen ikke passer markeringen
      if (doc && !c.ui && views[0] && fit(doc, W, H, r, c.element) < 3) {
        const s0 = fit(doc, W, H, r, c.element)
        const d = await open(views[0])
        doc = d && fit(d, W, H, r, c.element) > s0 ? d : await open()
      }
      if (!on) return
      if (doc && (c.scroll?.x || c.scroll?.y)) doc.defaultView?.scrollTo(c.scroll.x ?? 0, c.scroll.y ?? 0)
      setState(doc ? 'ready' : 'failed')
    })()
    return () => { on = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- lastes én gang per sak
  }, [path])

  const name = (c.element?.label || '').trim().slice(0, 40) || (c.element?.tag ? '<' + c.element.tag + '>' : '')
  const fallback = <LayoutPreview layout={c.layout} rect={c.rect} viewport={c.viewport} label={label} element={c.element} big={big} />
  if (state === 'failed') return fallback
  return (
    <div ref={box} data-fb-live={state} role="img" aria-label={label}
      style={{ position: 'relative', width: '100%', maxWidth: big ? `min(${W}px, 96vw, calc(86vh * ${W / H}))` : Math.min(720, Math.round((420 * W) / H)), aspectRatio: W + ' / ' + H, overflow: 'hidden', borderRadius: 8, border: '1px solid var(--line, #2b2b2b)', background: 'var(--panel, #121212)', containerType: 'inline-size' }}>
      {state === 'loading' && <div style={{ position: 'absolute', inset: 0 }}>{fallback}</div>}
      <iframe ref={frame} title={label} tabIndex={-1} aria-hidden="true" inert sandbox="allow-scripts allow-same-origin"
        style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, border: 0, transform: `scale(${k})`, transformOrigin: '0 0', pointerEvents: 'none', visibility: state === 'ready' ? 'visible' : 'hidden' }} />
      {/* flate over siden: ingen klikk, scrolling eller tastatur når fram til appen */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 2 }} />
      {state === 'ready' && <Mark rect={r} name={name} />}
    </div>
  )
}
