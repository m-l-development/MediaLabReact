// Kjøres i nettleseren (convert-photos.mjs): gjør lagene fra dom-to-layers.js (målt i ekte størrelse, K = 1) om til
// Photo Design-lag. Tekst måles med Photo-motorens egen font og tekstboks (pdFont/textBox), så grunnlinje og kanter
// havner der originalen har dem. Se docs/maler-og-fonter.md, fase 5.
import { imageLayer, pdFont, shapeLayer, textBox, textLayer, uid } from '../../src/features/photo-design/engine/model.ts'

const r1 = (n) => Math.round(n * 10) / 10
const mc = document.createElement('canvas').getContext('2d', { willReadFrequently: true })
mc.canvas.width = mc.canvas.height = 1

/** Farge som heks (#rrggbb) når den er dekkende, ellers rgba(…) – fargevalget (palette.ts) bruker heksfargene. */
export function normColor(c) {
  if (!c || c === 'transparent') return 'rgba(0,0,0,0)'
  mc.clearRect(0, 0, 1, 1)
  mc.fillStyle = '#000'
  mc.fillStyle = c
  mc.fillRect(0, 0, 1, 1)
  const [r, g, b, a] = mc.getImageData(0, 0, 1, 1).data
  if (a === 255) return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')
  if (a === 0) return 'rgba(0,0,0,0)'
  // forhåndsmultiplisert lagring: farge tilbake
  const k = 255 / a
  return `rgba(${Math.round(r * k)},${Math.round(g * k)},${Math.round(b * k)},${(a / 255).toFixed(3)})`
}
const normStops = (p) => (p.st ? { ...p, st: p.st.map(([o, c]) => [o, normColor(c)]) } : p)
const shiftPaint = (p, dx, dy) => {
  if (p.k === 'grain') return p
  if (p.tile) return { ...p, tile: [p.tile[0], p.tile[1], p.tile[2] + dx, p.tile[3] + dy] }
  if (p.k === 'lin') return { ...p, x1: p.x1 + dx, y1: p.y1 + dy, x2: p.x2 + dx, y2: p.y2 + dy }
  return { ...p, cx: p.cx + dx, cy: p.cy + dy }
}
const rotV = (x, y, deg) => {
  const a = (deg * Math.PI) / 180
  return [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)]
}
const base = (l) => {
  const o = { rot: l.rot || 0, op: l.op ?? 1, blend: l.blend || 'source-over' }
  if (l.blur) o.blur = l.blur
  if (l.shadows?.length) o.shadows = l.shadows.map((s) => ({ ...s, c: normColor(s.c) }))
  if (l.poly?.length) o.poly = l.poly
  return o
}

function mapText(l, opts) {
  const ls = (l.ls || 0) * l.size
  const sw = l.stroke ? l.stroke / 2 : 0
  const t = textLayer({
    id: uid('t'), name: l.text.split('\n')[0].slice(0, 40), text: l.text, font: l.font, weight: l.weight, size: l.size, color: normColor(l.color), align: l.align,
    lh: l.lh, ls: Math.round(ls * 100) / 100, upper: !!l.upper, strokeC: l.strokeColor ? normColor(l.strokeColor) : '#000000', strokeW: r1(sw), shadow: 0, ...base(l),
  })
  if (l.italic) t.italic = true
  if (l.jw) {
    t.justify = true
    t.jw = l.jw
  }
  if (l.stretch && l.stretch !== 100) t.stretch = l.stretch
  if (l.sy && l.sy !== 1) t.tsy = l.sy
  if (l.grunge) t.grunge = opts.grunge
  // grunnlinjen: samme som i målingen (topp + cap-høyde)
  mc.font = pdFont(t)
  const cap = mc.measureText('H').actualBoundingBoxAscent
  t.bl = r1(cap)
  const b = textBox(t) // med strekk
  const tsy = t.tsy || 1
  // lagets midtpunkt: kanten teksten er justert mot, i lagets egne (roterte) koordinater
  const ox = l.align === 'left' ? -l.w / 2 + b.w / 2 : l.align === 'right' ? l.w / 2 - b.w / 2 : 0
  const oy = -l.h / 2 + b.h / 2
  const [dx, dy] = rotV(ox, oy, l.rot || 0)
  t.x = r1(l.x + l.w / 2 + dx)
  t.y = r1(l.y + l.h / 2 + dy)
  if (l.paint?.length) {
    // malingen er målt fra tekstboksens øvre venstre hjørne i målingen
    const sx = -l.w / 2 - (ox - b.w / 2)
    const sy = (-l.h / 2 - (oy - b.h / 2)) / tsy
    t.paint = l.paint.map((p) => shiftPaint(normStops(p), sx, sy))
  }
  if ('fillSrc' in l) t.fillSrc = null
  return t
}

function mapShape(l) {
  const out = []
  const cx = l.x + l.w / 2
  const cy = l.y + l.h / 2
  const o = { id: uid('s'), name: l.name || 'Form', x: r1(cx), y: r1(cy), w: l.w, h: l.h, fill: normColor(l.fill), fill2: null, gAng: 90, radius: 0, strokeC: normColor(l.strokeColor || '#ffffff'), strokeW: 0, locked: !!l.lock, ...base(l) }
  if (l.kind === 'path' && l.path) {
    o.kind = 'path'
    o.path = l.path
    o.strokeW = l.stroke || 0
  } else o.kind = 'rect'
  if (l.radii) o.radii = l.radii
  if (l.paint?.length) o.paint = l.paint.map(normStops)
  if (l.dash) o.dash = l.dash
  // CSS-kant ligger innenfor boksen; Photo tegner streken midt på kanten: formen krympes med en halv strek
  if (l.kind !== 'path' && l.stroke > 0) {
    const b = l.stroke
    o.strokeW = b
    o.w = Math.max(1, l.w - b)
    o.h = Math.max(1, l.h - b)
    if (o.radii) o.radii = o.radii.map((r) => Math.max(0, r - b / 2))
  }
  out.push(shapeLayer(o))
  // kant bare på noen sider: egne tynne flater (i formens rotasjon)
  if (l.sides) {
    const [t, r, bb, lf] = l.sides
    const c = normColor(l.strokeColor || '#ffffff')
    const strips = [[0, -l.h / 2 + t / 2, l.w, t], [l.w / 2 - r / 2, 0, r, l.h], [0, l.h / 2 - bb / 2, l.w, bb], [-l.w / 2 + lf / 2, 0, lf, l.h]]
    for (const [sx, sy, w, h] of strips) {
      if (!(w > 0 && h > 0)) continue
      const [dx, dy] = rotV(sx, sy, l.rot || 0)
      out.push(shapeLayer({ id: uid('s'), name: 'Kant', kind: 'rect', x: r1(cx + dx), y: r1(cy + dy), w, h, fill: c, fill2: null, gAng: 90, radius: 0, strokeC: c, strokeW: 0, ...base(l) }))
    }
  }
  return out
}

function mapImage(l, opts) {
  const o = imageLayer({ id: uid('i'), name: l.role === 'person' ? 'Person' : 'Bilde', x: r1(l.x + l.w / 2), y: r1(l.y + l.h / 2), w: l.w, h: l.h, ...base(l) })
  if (l.radii) o.radii = l.radii
  if (opts.gray) o.adj = { ...o.adj, sat: -100 }
  return o
}

/** Photo-dokumentets lag fra de målte lagene. `opts`: { grain: korn over alt (.grain), grunge, gray }. */
export function mapDoc(td, w, h, opts) {
  const layers = []
  for (const l of td.layers) {
    if (l.type === 'text') layers.push(mapText(l, opts))
    else if (l.type === 'shape') layers.push(...mapShape(l))
    else if (l.type === 'image') layers.push(mapImage(l, opts))
  }
  if (opts.grain) {
    // materialets .grain: korn (240 px-rute) i overlegg, 55 %, øverst
    layers.push(shapeLayer({ id: uid('s'), name: 'Korn', kind: 'rect', x: w / 2, y: h / 2, w, h, fill: 'rgba(0,0,0,0)', fill2: null, gAng: 90, radius: 0, strokeC: '#ffffff', strokeW: 0, pat: 'grain', paint: [{ k: 'grain', sc: 1 }], blend: 'overlay', op: 0.55, locked: true }))
  }
  return { bg: normColor(td.bg.color), layers }
}
