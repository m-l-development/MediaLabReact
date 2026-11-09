import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { decodeLayout, safeLabel, type LayoutItem } from './layout'

/**
 * Miniatyr av siden brukeren var på (TB-53E3CF): bygget med HTML/CSS fra det trygge omrisset (shared/feedback/layout), ikke
 * et skjermbilde. Knapper, felt, overskrifter, paneler, menyer, ikoner og tekst tegnes med appens egne farger, hjørner og
 * skriftstørrelser i riktig skala (omrisset har med utformingen), men uten brukerens innhold: tekst blir streker, bilder og
 * video blir plassholdere, felt viser bare ledeteksten. Markeringen er en gul ramme på samme plass (prosent av vinduet) med
 * elementets navn ved siden av; resten av siden er fortsatt godt synlig.
 *
 * Dette er reserven: innboksen viser den ekte siden (LivePreview.tsx) og bruker miniatyren mens den lastes, eller når den
 * ikke kan vises. Saker uten omriss får en enkel side ut fra vindusstørrelsen, med det markerte elementet tegnet i rammen.
 */
export interface PreviewRect { x?: number; y?: number; w?: number; h?: number }
export interface PreviewElement { tag?: string | null; role?: string | null; label?: string | null; path?: string | null }
export type PreviewSource = 'layout' | 'fallback'

const HL = '#f5b301'
/** Høyeste høyde (px) i innboksen: høye vinduer (mobil) blir smalere i stedet for høyere. */
const MAX_H = 420
const MAX_W = 720

interface Sty { b?: string; c?: string; o?: string; r?: number; f?: number; w?: boolean }
function sty(s: string | undefined): Sty {
  const o: Sty = {}
  for (const t of (s ?? '').split(' ')) {
    const v = t.slice(1)
    if (t[0] === 'b' && /^[0-9a-f]{3,4}$/.test(v)) o.b = '#' + v
    else if (t[0] === 'c' && /^[0-9a-f]{3,4}$/.test(v)) o.c = '#' + v
    else if (t[0] === 'o' && /^[0-9a-f]{3,4}$/.test(v)) o.o = '#' + v
    else if (t[0] === 'r' && /^\d{1,2}$/.test(v)) o.r = Number(v)
    else if (t[0] === 'f' && /^\d{1,3}$/.test(v)) o.f = Number(v)
    else if (t === 'w') o.w = true
  }
  return o
}

/** Ryddig omriss: tekststreker inne i knapper, felt og overskrifter med etikett, og like flater oppå hverandre, tegnes ikke. */
function tidy(items: LayoutItem[]): LayoutItem[] {
  const inside = (a: LayoutItem, b: LayoutItem) => a.x >= b.x - 2 && a.y >= b.y - 2 && a.x + a.w <= b.x + b.w + 2 && a.y + a.h <= b.y + b.h + 2
  const same = (a: LayoutItem, b: LayoutItem) => Math.abs(a.x - b.x) <= 4 && Math.abs(a.y - b.y) <= 4 && Math.abs(a.w - b.w) <= 4 && Math.abs(a.h - b.h) <= 4
  const flat = (k: string) => k === 'n' || k === 'p'
  const out: LayoutItem[] = []
  for (const it of items) {
    if ((it.k === 't' || (it.k === 'l' && !it.label)) && items.some((o) => o !== it && (o.k === 'b' || o.k === 'i' || (o.k === 'h' && o.label)) && inside(it, o))) continue
    if (out.some((o) => (o.k === it.k || (flat(o.k) && flat(it.k))) && same(o, it))) continue
    out.push(it)
  }
  return out
}

/** Enkel side ut fra vindusstørrelsen (promille) når verken omriss eller opptak av appen finnes. */
function skeleton(W: number, H: number): LayoutItem[] {
  const bar = Math.round((56 / H) * 1000), y = bar + Math.round((20 / H) * 1000)
  if (W <= 760) return [
    { k: 'n', x: 0, y: 0, w: 1000, h: bar }, { k: 't', x: 50, y, w: 500, h: 30 },
    { k: 'p', x: 40, y: y + 60, w: 920, h: 300 }, { k: 't', x: 90, y: y + 110, w: 600, h: 25 }, { k: 't', x: 90, y: y + 160, w: 750, h: 25 },
    { k: 'p', x: 40, y: y + 400, w: 920, h: 300 }, { k: 't', x: 90, y: y + 450, w: 650, h: 25 },
  ]
  return [
    { k: 'n', x: 0, y: 0, w: 1000, h: bar }, { k: 't', x: 40, y, w: 260, h: 40 },
    { k: 'p', x: 40, y: y + 80, w: 440, h: 440 }, { k: 't', x: 70, y: y + 130, w: 300, h: 30 }, { k: 't', x: 70, y: y + 190, w: 360, h: 30 },
    { k: 'p', x: 520, y: y + 80, w: 440, h: 440 }, { k: 't', x: 550, y: y + 130, w: 280, h: 30 }, { k: 't', x: 550, y: y + 190, w: 340, h: 30 },
  ]
}

/** Det markerte elementet som figur (for saker uten omriss), ut fra lagret tag og rolle. */
function markedKind(e: PreviewElement | null | undefined): LayoutItem['k'] | null {
  const tag = (e?.tag || '').toLowerCase(), role = e?.role || ''
  if (/^(input|select|textarea)$/.test(tag)) return 'i'
  if (/^(button|a|summary)$/.test(tag) || /^(button|link|tab|menuitem|switch|checkbox|radio)$/.test(role)) return 'b'
  if (/^h[1-6]$/.test(tag) || role === 'heading') return 'h'
  if (tag === 'label') return 'l'
  if (/^(img|video|canvas|picture|svg|iframe)$/.test(tag)) return 'm'
  return null
}

const GREY = 'rgba(127,127,127,'
const PHOTO = <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="m3 18 6-6 4 4 3-3 5 5" /></svg>

export function LayoutPreview({ layout, rect, viewport, label, element, big }: { layout: unknown; rect: PreviewRect | null | undefined; viewport: string | null | undefined; label: string; element?: PreviewElement | null | undefined; big?: boolean | undefined }) {
  const [vw, vh] = (viewport || '').split('×').map(Number)
  const W = vw || 1440, H = vh || 900, ar = W / H
  const r = { x: rect?.x || 0, y: rect?.y || 0, w: Math.max(rect?.w || 0, 1), h: Math.max(rect?.h || 0, 1) }
  const real = tidy(decodeLayout(layout))
  const source: PreviewSource = real.length ? 'layout' : 'fallback'
  const all = real.length ? real : skeleton(W, H)
  const page = all.find((it) => it.k === 'z')
  const items = all.filter((it) => it.k !== 'z')
  if (!real.length) {
    const k = markedKind(element), name = safeLabel(element?.label || '')
    if (k) items.push({ k, x: r.x * 10, y: r.y * 10, w: r.w * 10, h: r.h * 10, ...(name && k !== 'm' ? { label: name } : {}) })
  }
  const max = big ? W : Math.min(MAX_W, Math.round(MAX_H * ar))
  // faktisk bredde (miniatyren krymper i smale vinduer), så etikettene bare vises når de får plass
  const ref = useRef<HTMLDivElement>(null)
  const [seen, setSeen] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => setSeen(el.clientWidth))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const cw = seen || max, scale = cw / W
  // mål fra appen (px) i riktig skala: miniatyren er en beholder, så 100cqw = dens bredde
  const px = (v: number) => `calc(${v} * 100cqw / ${W})`
  const font = (f: number) => `max(6px, ${px(f)})`
  // etiketten vises bare når den får plass til minst tre tegn i boksen; ellers bare formen (ingen avklipte biter)
  const fits = (it: LayoutItem, f: number) => {
    const fp = Math.max(6, f * scale)
    return (it.w / 1000) * cw - 4 >= fp * 0.6 * Math.min(3, it.label?.length ?? 0) && (it.h / 1000) * cw / ar >= fp * 1.1
  }
  const ps = sty(page?.s)
  const name = (element?.label || '').trim().slice(0, 40) || (element?.tag ? '<' + element.tag + '>' : '')
  return (
    <div ref={ref} data-fb-preview={source} aria-label={label} role="img"
      style={{ position: 'relative', width: '100%', maxWidth: big ? `min(${W}px, 96vw, calc(86vh * ${ar}))` : max, aspectRatio: W + ' / ' + H, border: '1px solid var(--line, #2b2b2b)', borderRadius: 8, background: ps.b ?? 'var(--panel, #121212)', color: ps.c ?? 'var(--text, #e9e7e2)', overflow: 'hidden', lineHeight: 1.15, containerType: 'inline-size', fontFamily: 'system-ui, sans-serif' }}>
      {items.map((it, i) => {
        const s = sty(it.s)
        const f = s.f ?? (it.k === 'h' ? 20 : it.k === 'b' ? 13 : 12)
        const radius = s.r === undefined ? undefined : s.r >= 99 ? 999 : px(s.r)
        const box: CSSProperties = { position: 'absolute', left: it.x / 10 + '%', top: it.y / 10 + '%', width: it.w / 10 + '%', height: it.h / 10 + '%', boxSizing: 'border-box', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', borderRadius: radius, color: s.c }
        const text = (t: string, extra?: CSSProperties) => fits(it, f) ? <span data-fb-label="" style={{ fontSize: font(f), overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%', ...extra }}>{t}</span> : null
        let body: ReactNode = null
        switch (it.k) {
          case 'n': Object.assign(box, { background: s.b ?? GREY + '.16)', borderBottom: s.o ? '1px solid ' + s.o : undefined, boxShadow: s.b || s.o ? undefined : 'inset 0 0 0 1px ' + GREY + '.3)' }); break
          case 'p': Object.assign(box, { background: s.b ?? GREY + '.08)', border: '1px solid ' + (s.o ?? (s.b ? 'transparent' : GREY + '.3)')), borderRadius: radius ?? 6 }); break
          case 'r': Object.assign(box, { borderBottom: '1px solid ' + (s.o ?? GREY + '.3)'), background: s.b }); body = <span style={{ position: 'absolute', left: '2%', right: '30%', top: '42%', height: '16%', background: GREY + '.25)', borderRadius: 2 }} />; break
          case 'b':
            Object.assign(box, { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 ' + px(8), background: s.b ?? (s.o ? undefined : GREY + '.22)'), border: s.o ? '1px solid ' + s.o : s.b ? undefined : '1px solid ' + GREY + '.55)', borderRadius: radius ?? 999, fontWeight: s.w ? 700 : 500 })
            // ikonknapper (nesten kvadratiske) tegnes som ikon, også når de har en usynlig etikett
            body = it.label && (it.w * W) / (it.h * H) > 1.6 ? text(it.label) : <span style={{ width: '42%', maxWidth: px(18), aspectRatio: '1', borderRadius: '30%', background: 'currentColor', opacity: 0.45 }} />
            break
          case 'i':
            Object.assign(box, { display: 'flex', alignItems: 'center', padding: '0 ' + px(10), background: s.b ?? 'rgba(255,255,255,.05)', border: '1px solid ' + (s.o ?? GREY + '.6)'), borderRadius: radius ?? 4 })
            body = it.label ? text(it.label, { opacity: 0.5 }) : null
            break
          case 'h': case 'l':
            Object.assign(box, { display: 'flex', alignItems: 'center', fontWeight: it.k === 'h' || s.w ? 700 : 400, opacity: it.k === 'l' ? 0.85 : undefined })
            body = it.label ? text(it.label) : <span style={{ width: '70%', height: '45%', background: 'currentColor', opacity: 0.3, borderRadius: 2 }} />
            break
          case 't': {
            // tekst som streker: én per linje, i skriftens høyde
            const lines = Math.max(1, Math.min(12, Math.round(((it.h / 1000) * H) / (f * 1.35))))
            Object.assign(box, { backgroundImage: 'linear-gradient(to bottom, transparent 0 28%, currentColor 28% 70%, transparent 70%)', backgroundSize: '100% ' + (100 / lines).toFixed(3) + '%', backgroundRepeat: 'repeat-y', opacity: 0.3 })
            break
          }
          case 'm':
            Object.assign(box, { display: 'grid', placeItems: 'center', background: s.b ?? GREY + '.14)', border: '1px ' + (s.o ? 'solid ' + s.o : 'dashed ' + GREY + '.45)'), borderRadius: radius ?? 4, color: 'rgba(160,160,160,.7)' })
            body = <span style={{ width: '22%', maxWidth: px(64), minWidth: 8, aspectRatio: '1' }}>{PHOTO}</span>
            break
          case 'g':
            Object.assign(box, { display: 'grid', placeItems: 'center' })
            body = <span style={{ width: '70%', height: '70%', borderRadius: '30%', background: 'currentColor', opacity: 0.5 }} />
            break
        }
        return <div key={i} data-fb-wire={it.k} style={box}>{body}</div>
      })}
      <Mark rect={r} name={name} />
    </div>
  )
}

/** Den gule markeringen med elementets navn (prosent av vinduet); brukes også over den ekte siden i LivePreview. */
export function Mark({ rect: r, name }: { rect: { x: number; y: number; w: number; h: number }; name: string }) {
  return (
    <div data-fb-hl="" style={{ position: 'absolute', zIndex: 3, left: r.x + '%', top: r.y + '%', width: r.w + '%', height: r.h + '%', boxSizing: 'border-box', border: '2px solid ' + HL, background: 'rgba(245,179,1,.08)', borderRadius: 4, outline: '1px solid rgba(0,0,0,.6)', boxShadow: '0 0 0 9999px rgba(0,0,0,.12), 0 0 0 3px rgba(245,179,1,.35), 0 0 14px 3px rgba(245,179,1,.55)' }}>
      {name ? (
        <span data-fb-hl-tag="" style={{ position: 'absolute', ...(r.y > 12 ? { bottom: 'calc(100% + 4px)' } : r.y + r.h < 85 ? { top: 'calc(100% + 4px)' } : { top: 3 }), [r.x + r.w / 2 > 60 ? 'right' : 'left']: 0, maxWidth: '60cqw', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', background: HL, color: '#1a1400', fontWeight: 700, fontSize: 'clamp(9px, 1.8cqw, 13px)', padding: '1px 6px', borderRadius: 3, boxShadow: '0 1px 3px rgba(0,0,0,.4)' }}>{name}</span>
      ) : null}
    </div>
  )
}
