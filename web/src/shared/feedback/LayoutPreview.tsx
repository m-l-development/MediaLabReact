import type { CSSProperties } from 'react'
import { decodeLayout, type LayoutItem } from './layout'

/**
 * Miniatyr av siden brukeren var på (TB-53E3CF): bygget med HTML/CSS fra det trygge omrisset (shared/feedback/layout), ikke
 * et skjermbilde. Topplinje og sidemeny vises som rammeflater, kort og paneler som bokser, tabellrader som rader, knapper
 * med sin korte etikett og tekst som nøytrale streker. Bilder, video og felt blir tomme flater. Markeringen er en gul ramme
 * på samme plass (prosent av vinduet), og resten av siden dempes. Uten omriss (eldre saker) vises bare rammen.
 */
const WIRE: Record<LayoutItem['k'], CSSProperties> = {
  n: { background: 'rgba(127,127,127,.18)', boxShadow: 'inset 0 0 0 1px rgba(127,127,127,.35)' },
  p: { background: 'rgba(127,127,127,.10)', border: '1px solid rgba(127,127,127,.35)', borderRadius: 6 },
  r: { borderBottom: '1px solid rgba(127,127,127,.35)', background: 'repeating-linear-gradient(90deg, rgba(127,127,127,.22) 0 22%, transparent 22% 26%)', backgroundSize: '100% 34%', backgroundRepeat: 'no-repeat', backgroundPosition: '0 50%' },
  b: { background: 'rgba(127,127,127,.24)', border: '1px solid rgba(127,127,127,.6)', borderRadius: 999, display: 'grid', placeItems: 'center' },
  i: { background: 'rgba(255,255,255,.07)', border: '1px solid rgba(127,127,127,.7)', borderRadius: 4 },
  h: { fontWeight: 800 },
  l: { opacity: 0.85 },
  m: { background: 'repeating-linear-gradient(45deg, rgba(127,127,127,.2) 0 6px, rgba(127,127,127,.08) 6px 12px)', border: '1px dashed rgba(127,127,127,.5)', borderRadius: 4 },
  t: { background: 'rgba(127,127,127,.3)', borderRadius: 2, transform: 'scaleY(.4)' },
}

export interface PreviewRect { x?: number; y?: number; w?: number; h?: number }

/** Høyeste høyde (px): høye vinduer (mobil) blir smalere i stedet for høyere, så miniatyren holder seg kompakt. */
const MAX_H = 300

export function LayoutPreview({ layout, rect, viewport, label }: { layout: unknown; rect: PreviewRect | null | undefined; viewport: string | null | undefined; label: string }) {
  const [w, h] = (viewport || '16×9').split('×').map(Number)
  const ar = (w || 16) / (h || 9)
  const r = rect ?? {}
  const items = decodeLayout(layout)
  return (
    <div data-fb-preview={items.length ? 'layout' : 'frame'} aria-label={label} role="img"
      style={{ position: 'relative', width: '100%', maxWidth: Math.min(items.length ? 480 : 360, Math.round(MAX_H * ar)), aspectRatio: (w || 16) + ' / ' + (h || 9), border: '1px solid var(--line, #2b2b2b)', borderRadius: 8, background: 'var(--panel, #121212)', color: 'var(--text, #e9e7e2)', overflow: 'hidden', fontSize: 9, lineHeight: 1.1, containerType: 'inline-size' }}>
      {items.map((it, i) => (
        <div key={i} data-fb-wire={it.k} style={{ position: 'absolute', left: it.x / 10 + '%', top: it.y / 10 + '%', width: it.w / 10 + '%', height: it.h / 10 + '%', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', boxSizing: 'border-box', padding: it.k === 'b' ? '0 3px' : 0, ...WIRE[it.k] }}>
          {it.label && it.k !== 't' ? <span style={{ fontSize: it.k === 'h' ? 'clamp(7px, 1.8cqw, 12px)' : 'clamp(6px, 1.3cqw, 10px)' }}>{it.label}</span> : null}
        </div>
      ))}
      <div data-fb-hl="" style={{ position: 'absolute', left: (r.x || 0) + '%', top: (r.y || 0) + '%', width: Math.max(r.w || 0, 1) + '%', height: Math.max(r.h || 0, 1) + '%', boxSizing: 'border-box', border: '2px solid #f5b301', background: 'rgba(245,179,1,.18)', borderRadius: 4, boxShadow: items.length ? '0 0 0 9999px rgba(0,0,0,.3), 0 0 10px 2px rgba(245,179,1,.75)' : undefined }} />
    </div>
  )
}
