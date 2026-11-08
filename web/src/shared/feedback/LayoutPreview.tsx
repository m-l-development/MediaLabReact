import type { CSSProperties } from 'react'
import { decodeLayout, safeLabel, type LayoutItem } from './layout'

/**
 * Miniatyr av siden brukeren var på (TB-53E3CF): bygget med HTML/CSS fra det trygge omrisset (shared/feedback/layout), ikke
 * et skjermbilde. Topplinje og sidemeny vises som rammeflater, kort og paneler som bokser, tabellrader som rader, knapper
 * med sin korte etikett og tekst som nøytrale streker. Bilder, video og felt blir tomme flater. Markeringen er en gul ramme
 * på samme plass (prosent av vinduet) med elementets navn ved siden av, og resten av siden dempes.
 *
 * Saker uten omriss (sendt før omrisset ble lagret) får en omtrentlig side ut fra vindusstørrelsen, med det markerte
 * elementet tegnet i rammen – aldri bare en tom ramme.
 */
const WIRE: Record<LayoutItem['k'], CSSProperties> = {
  n: { background: 'rgba(127,127,127,.18)', boxShadow: 'inset 0 0 0 1px rgba(127,127,127,.35)' },
  p: { background: 'rgba(127,127,127,.10)', border: '1px solid rgba(127,127,127,.35)', borderRadius: 6 },
  r: { borderBottom: '1px solid rgba(127,127,127,.35)', background: 'repeating-linear-gradient(90deg, rgba(127,127,127,.22) 0 22%, transparent 22% 26%)', backgroundSize: '100% 34%', backgroundRepeat: 'no-repeat', backgroundPosition: '0 50%' },
  b: { background: 'rgba(127,127,127,.24)', border: '1px solid rgba(127,127,127,.6)', borderRadius: 999, display: 'grid', placeItems: 'center' },
  i: { background: 'rgba(255,255,255,.07)', border: '1px solid rgba(127,127,127,.7)', borderRadius: 4 },
  h: { fontWeight: 800, display: 'flex', alignItems: 'center' },
  l: { opacity: 0.85, display: 'flex', alignItems: 'center' },
  m: { background: 'repeating-linear-gradient(45deg, rgba(127,127,127,.2) 0 6px, rgba(127,127,127,.08) 6px 12px)', border: '1px dashed rgba(127,127,127,.5)', borderRadius: 4 },
  t: { background: 'rgba(127,127,127,.3)', borderRadius: 2, transform: 'scaleY(.4)' },
}
/** Skriftstørrelse (px) for etiketter ved en gitt bredde på miniatyren. */
const FONT = { h: (cw: number) => Math.min(13, Math.max(8, cw * 0.024)), x: (cw: number) => Math.min(11, Math.max(7, cw * 0.019)) }
const HL = '#f5b301'

export interface PreviewRect { x?: number; y?: number; w?: number; h?: number }
export interface PreviewElement { tag?: string | null; role?: string | null; label?: string | null }

/** Høyeste høyde (px): høye vinduer (mobil) blir smalere i stedet for høyere, så miniatyren holder seg kompakt. */
const MAX_H = 340

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

/** Omtrentlig side ut fra vindusstørrelsen (promille): topplinje, overskrift og innholdsflater, smal skjerm stablet. */
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

/** Det markerte elementet som omrissfigur (for saker uten omriss), ut fra lagret tag og rolle. */
function markedKind(e: PreviewElement | null | undefined): LayoutItem['k'] | null {
  const tag = (e?.tag || '').toLowerCase(), role = e?.role || ''
  if (/^(input|select|textarea)$/.test(tag)) return 'i'
  if (/^(button|a|summary)$/.test(tag) || /^(button|link|tab|menuitem|switch|checkbox|radio)$/.test(role)) return 'b'
  if (/^h[1-6]$/.test(tag) || role === 'heading') return 'h'
  if (tag === 'label') return 'l'
  if (/^(img|video|canvas|picture|svg|iframe)$/.test(tag)) return 'm'
  return null
}

export function LayoutPreview({ layout, rect, viewport, label, element }: { layout: unknown; rect: PreviewRect | null | undefined; viewport: string | null | undefined; label: string; element?: PreviewElement | null | undefined }) {
  const [vw, vh] = (viewport || '').split('×').map(Number)
  const W = vw || 1440, H = vh || 900, ar = W / H
  const r = { x: rect?.x || 0, y: rect?.y || 0, w: Math.max(rect?.w || 0, 1), h: Math.max(rect?.h || 0, 1) }
  const real = tidy(decodeLayout(layout))
  const items = real.length ? real : skeleton(W, H)
  if (!real.length) {
    const k = markedKind(element), name = safeLabel(element?.label || '')
    if (k) items.push({ k, x: r.x * 10, y: r.y * 10, w: r.w * 10, h: r.h * 10, ...(name && k !== 'm' ? { label: name } : {}) })
  }
  const cw = Math.min(480, Math.round(MAX_H * ar)), ch = cw / ar
  // etiketten vises bare når den får plass til minst tre tegn i boksen; ellers bare formen (ingen avklipte biter)
  const fits = (it: LayoutItem) => {
    const f = (it.k === 'h' ? FONT.h : FONT.x)(cw)
    return (it.w / 1000) * cw - 6 >= f * 0.6 * Math.min(3, it.label?.length ?? 0) && (it.h / 1000) * ch >= f * 1.2 + 3
  }
  // store knapper (kort som kan trykkes) får avrundede hjørner i stedet for pilleform
  const round = (it: LayoutItem) => (it.k === 'b' && (it.h / 1000) * ch > 22 ? { borderRadius: 6 } : null)
  const pad = (k: string) => (k === 'b' || k === 'i' || k === 'p' || k === 'm' || k === 'r' ? 1 : 0)
  const name = (element?.label || '').trim().slice(0, 40) || (element?.tag ? '<' + element.tag + '>' : '')
  return (
    <div data-fb-preview={real.length ? 'layout' : 'fallback'} aria-label={label} role="img"
      style={{ position: 'relative', width: '100%', maxWidth: cw, aspectRatio: W + ' / ' + H, border: '1px solid var(--line, #2b2b2b)', borderRadius: 8, background: 'var(--panel, #121212)', color: 'var(--text, #e9e7e2)', overflow: 'hidden', fontSize: 9, lineHeight: 1.1, containerType: 'inline-size' }}>
      {items.map((it, i) => (
        <div key={i} data-fb-wire={it.k} style={{ position: 'absolute', left: `calc(${it.x / 10}% + ${pad(it.k)}px)`, top: `calc(${it.y / 10}% + ${pad(it.k)}px)`, width: `calc(${it.w / 10}% - ${2 * pad(it.k)}px)`, height: `calc(${it.h / 10}% - ${2 * pad(it.k)}px)`, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', boxSizing: 'border-box', padding: it.k === 'b' ? '0 3px' : 0, opacity: real.length ? undefined : 0.6, ...WIRE[it.k], ...round(it) }}>
          {it.label && it.k !== 't' && fits(it) ? <span data-fb-label="" style={{ fontSize: it.k === 'h' ? 'clamp(8px, 2.4cqw, 13px)' : 'clamp(7px, 1.9cqw, 11px)', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{it.label}</span> : null}
        </div>
      ))}
      <div data-fb-hl="" style={{ position: 'absolute', zIndex: 2, left: r.x + '%', top: r.y + '%', width: r.w + '%', height: r.h + '%', boxSizing: 'border-box', border: '2px solid ' + HL, background: 'rgba(245,179,1,.16)', borderRadius: 4, outline: '1px solid rgba(0,0,0,.55)', boxShadow: '0 0 0 9999px rgba(0,0,0,.32), 0 0 10px 2px rgba(245,179,1,.75)' }}>
        {name ? (
          <span data-fb-hl-tag="" style={{ position: 'absolute', ...(r.y > 12 ? { bottom: 'calc(100% + 3px)' } : r.y + r.h < 85 ? { top: 'calc(100% + 3px)' } : { top: 3 }), [r.x + r.w / 2 > 60 ? 'right' : 'left']: 0, maxWidth: '60cqw', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', background: HL, color: '#1a1400', fontWeight: 700, fontSize: 'clamp(8px, 2.1cqw, 11px)', padding: '1px 5px', borderRadius: 3 }}>{name}</span>
        ) : null}
      </div>
    </div>
  )
}
