// Kjøres i nettleseren (via utviklingsserveren, se convert-thumbs.mjs): måler malene i originalmaterialet og gjør dem om
// til lag i Thumbnail Studio-formatet (1920 × 1080). Ingen verdier gjettes: posisjon, størrelse, rotasjon, font, snitt,
// bredde, sperring, linjeavstand, farger, gradienter, hjørner, kanter, skygger, blandemodus, uskarphet og gjennomsiktighet
// leses fra nettleserens beregnede stil og layout. Se docs/maler-og-fonter.md (fase 3).
import { parseBackground, scalePaint, splitTop } from '../../src/features/thumbnail-studio/engine/paint.ts'

const K = 1920 / 1280
const r1 = (n) => Math.round(n * 10) / 10
const r3 = (n) => Math.round(n * 1000) / 1000
let seq = 0
const uid = () => 't' + (++seq).toString(36) + Math.random().toString(36).slice(2, 6)

const BASE = () => ({ rot: 0, flipX: false, flipY: false, op: 1, hidden: false, lock: false, shadow: 0, role: null, name: '' })

const alpha = (c) => {
  const m = /rgba?\(([^)]+)\)/.exec(c || '')
  if (!m) return c === 'transparent' ? 0 : 1
  const p = m[1].split(/[\s,/]+/).filter(Boolean)
  return p.length > 3 ? parseFloat(p[3]) : 1
}

/** Etiketter i bildefeltene (originalmaterialet): JetBrains Mono 13 px med «legg til», «bilde», «foto», «utklipt» … */
const LABEL = /legg til|bilde|foto|utklipt|vert|gjest|figur|silhuett|taler|publikum/i
function isLabel(e) {
  const cs = getComputedStyle(e)
  return /JetBrains Mono/.test(cs.fontFamily) && Math.abs(parseFloat(cs.fontSize) - 13) < 0.6 && LABEL.test(e.textContent || '')
}
const isPersonLabel = (t) => /person|utklipt|taler|vert|gjest|figur|silhuett|portrett/i.test(t) && !/^\s*(legg til )?bilde · (landskap|øyeblikk)/i.test(t)

/** Matrise for elementets transformasjon (rundt transform-origin), i flatens koordinater. */
function ownMatrix(cs, box) {
  if (!cs.transform || cs.transform === 'none') return new DOMMatrix()
  const [ox, oy] = cs.transformOrigin.split(' ').map(parseFloat)
  return new DOMMatrix().translate(box.x + ox, box.y + oy).multiply(new DOMMatrix(cs.transform)).translate(-(box.x + ox), -(box.y + oy))
}

/** Boks (uten transformasjon) + matrise → lagets plass i dokumentet: x, y, w, h, rotasjon (grader). */
function place(box, M) {
  const c = M.transformPoint(new DOMPoint(box.x + box.w / 2, box.y + box.h / 2))
  // skala vannrett og loddrett (transform: scaleY(1.42) …); rotasjon uten skjevhet
  const k = Math.hypot(M.a, M.b) || 1
  const ky = Math.abs(M.a * M.d - M.b * M.c) / k || k
  const w = box.w * k
  const h = box.h * ky
  let rot = (Math.atan2(M.b, M.a) * 180) / Math.PI
  if (Math.abs(rot) < 0.01) rot = 0
  return { x: r1((c.x - w / 2) * K), y: r1((c.y - h / 2) * K), w: r1(w * K), h: r1(h * K), rot: r3(rot), k, ky }
}

function radii(cs, w, h) {
  const out = []
  for (const p of ['borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomRightRadius', 'borderBottomLeftRadius']) {
    const [a, b = a] = cs[p].split(' ')
    const rx = a.endsWith('%') ? (parseFloat(a) / 100) * w : parseFloat(a) || 0
    const ry = b.endsWith('%') ? (parseFloat(b) / 100) * h : parseFloat(b) || 0
    out.push(rx, ry)
  }
  return out.some((n) => n > 0) ? out : null
}

function poly(cs, w, h) {
  const m = /^polygon\((.*)\)$/.exec(cs.clipPath || '')
  if (!m) return null
  const pts = []
  for (const pr of splitTop(m[1].replace(/^(nonzero|evenodd),/, ''))) {
    const [a, b] = pr.trim().split(/\s+/)
    const x = a.endsWith('%') ? parseFloat(a) / 100 : parseFloat(a) / w
    const y = b.endsWith('%') ? parseFloat(b) / 100 : parseFloat(b) / h
    pts.push(r3(x), r3(y))
  }
  return pts.length >= 6 ? pts : null
}

/** CSS-skygger (box-shadow / text-shadow) → [{x, y, b, s, c, inset}] i dokumentpiksler. */
function shadows(v, k) {
  if (!v || v === 'none') return null
  const out = []
  for (const part of splitTop(v)) {
    const inset = /\binset\b/.test(part)
    const t = part.replace(/\binset\b/, '').trim()
    const cm = /^(rgba?\([^)]*\)|#[0-9a-f]+|[a-z]+)\s*(.*)$/i.exec(t)
    let color = 'rgba(0, 0, 0, 1)'
    let rest = t
    if (cm) {
      color = cm[1]
      rest = cm[2]
    } else {
      const em = /(.*?)\s*(rgba?\([^)]*\)|#[0-9a-f]+)$/i.exec(t)
      if (em) {
        rest = em[1]
        color = em[2]
      }
    }
    const n = rest.split(/\s+/).filter(Boolean).map(parseFloat)
    const o = { x: r1((n[0] || 0) * K * k), y: r1((n[1] || 0) * K * k), b: r1((n[2] || 0) * K * k), c: color }
    if (n[3]) o.s = r1(n[3] * K * k)
    if (inset) o.inset = true
    out.push(o)
  }
  return out.length ? out : null
}

function shiftPaint(p, dx, dy) {
  if (p.k === 'grain' || p.tile) return p.tile ? { ...p, tile: [p.tile[0], p.tile[1], p.tile[2] + dx, p.tile[3] + dy] } : p
  if (p.k === 'lin') return { ...p, x1: p.x1 + dx, y1: p.y1 + dy, x2: p.x2 + dx, y2: p.y2 + dy }
  return { ...p, cx: p.cx + dx, cy: p.cy + dy }
}

/** Bakgrunnen fyller bare bokstavene (background-clip: text, én verdi per bakgrunnslag). */
const isClipText = (cs) => /\btext\b/.test(cs.backgroundClip || '') || /\btext\b/.test(cs.webkitBackgroundClip || '')

/** Plassholderens striper i materialet (var(--ph) / var(--phd)): et hint om «bilde her», ikke en del av designet. */
const STRIPES = /repeating-linear-gradient\(135deg, rgba\((255, 255, 255, 0\.035|0, 0, 0, 0\.04)\)/
const hasStripes = (cs) => STRIPES.test(cs.backgroundImage || '')
const isStripes = (p) => p.k === 'lin' && p.rep && p.st.length === 4 && p.st.some(([, c]) => /, 0\.035\)|, 0\.04\)/.test(c))

const isGrain = (u) => /feTurbulence/.test(decodeURIComponent(u))

/** Beregnet bakgrunn for et element (w × h i materialets piksler) → maling i dokumentpiksler. */
function paintOf(cs, w, h, k) {
  return parseBackground(cs.backgroundImage, cs.backgroundSize, cs.backgroundPosition, w, h, K * k, isGrain).filter((p) => !isStripes(p)).map((p) => scalePaint(p, K * k))
}

/** Første familie i font-family. */
const family = (ff) => ff.split(',')[0].trim().replace(/^["']|["']$/g, '')

const mctx = document.createElement('canvas').getContext('2d')

/** Konverterer én mal. `fields` = egne bildefelt (velger i flaten + rolle) for maler der feltet er en illustrasjon. */
export function convertOne(sec, opts = {}) {
  const stage = sec.firstElementChild
  const all = [stage, ...stage.querySelectorAll('*')]
  // 1) transformasjonene leses, så tas de bort (layouten er den samme, men målene blir utransformerte)
  const tf = new Map()
  for (const e of all) {
    if (e instanceof SVGElement && e.tagName.toLowerCase() !== 'svg') continue
    const cs = getComputedStyle(e)
    tf.set(e, { transform: cs.transform, transformOrigin: cs.transformOrigin, inline: e.style.getPropertyValue('transform'), prio: e.style.getPropertyPriority('transform') })
  }
  for (const e of tf.keys()) e.style.setProperty('transform', 'none', 'important')
  const S = stage.getBoundingClientRect()
  const boxOf = (e) => {
    const r = e.getBoundingClientRect()
    return { x: r.left - S.left, y: r.top - S.top, w: r.width, h: r.height }
  }
  const mats = new Map()
  const matOf = (e) => {
    if (e === stage || !e || !stage.contains(e)) return new DOMMatrix()
    if (mats.has(e)) return mats.get(e)
    const parent = matOf(e.parentElement)
    const t = tf.get(e)
    const m = t ? parent.multiply(ownMatrix(t, boxOf(e))) : parent
    mats.set(e, m)
    return m
  }
  const chain = (e) => {
    const out = []
    for (let x = e; x && x !== stage.parentElement; x = x.parentElement) out.push(x)
    return out
  }
  const opacityOf = (e) => chain(e).reduce((a, x) => a * parseFloat(getComputedStyle(x).opacity || '1'), 1)
  const blendOf = (e) => chain(e).map((x) => getComputedStyle(x).mixBlendMode).find((b) => b && b !== 'normal') || null
  const blurOf = (e) => chain(e).reduce((a, x) => {
    const m = /blur\(([\d.]+)px\)/.exec(getComputedStyle(x).filter)
    return a + (m ? parseFloat(m[1]) : 0)
  }, 0)
  const zOf = (e) => {
    for (const x of chain(e)) {
      const z = getComputedStyle(x).zIndex
      if (z !== 'auto' && x !== stage) return parseInt(z, 10) || 0
    }
    return 0
  }
  const common = (e) => {
    const o = {}
    const op = opacityOf(e)
    if (op < 0.999) o.op = r3(op)
    const b = blendOf(e)
    if (b) o.blend = b
    const bl = blurOf(e)
    if (bl > 0) o.blur = r1(bl * K * Math.hypot(matOf(e).a, matOf(e).b))
    return o
  }

  // 2) bildefelt: elementene med plassholderens striper (også flaten selv = bilde over hele flaten). Etikettene
  // («Legg til bilde · …») og hintene («↳ bytt til foto …») er instruksjoner i materialet og tas ikke med.
  const fieldEls = new Map()
  const skip = new Set()
  const role = opts.person ? 'person' : null
  for (const e of [stage, ...stage.querySelectorAll('*')]) {
    if (isLabel(e) && ![...e.querySelectorAll('*')].some(isLabel)) skip.add(e)
    else if (/^\s*↳/.test(e.textContent || '') && e.children.length === 0) skip.add(e)
    else if (hasStripes(getComputedStyle(e)) && !isClipText(getComputedStyle(e))) fieldEls.set(e, { role, label: '' })
  }
  // etiketter i en boks (del 3: stiplet ramme med «utklipt · person …»): boksen er feltet; rett på flaten = hele flaten
  const labels = [...skip].filter(isLabel)
  const inField = (x) => { for (let p = x; p && p !== stage; p = p.parentElement) if (fieldEls.has(p)) return true; return false }
  const photoText = labels.some((e) => /bokstav/i.test(e.textContent || ''))
  for (const e of labels) {
    if (inField(e) || /bokstav/i.test(e.textContent || '')) continue
    let f = e.parentElement
    while (f && f !== stage && getComputedStyle(f).position === 'static') f = f.parentElement
    const r = isPersonLabel(e.textContent || '') || role ? 'person' : null
    if (f && f !== stage) fieldEls.set(f, { role: r, label: e.textContent.trim(), frame: true })
    else if (!fieldEls.size) fieldEls.set(stage, { role: r, label: e.textContent.trim() })
  }
  for (const f of opts.fields || []) {
    const el = stage.querySelector(f.sel)
    if (el) fieldEls.set(el, { role: f.role ?? null, label: f.label || '', above: true })
    else console.warn('fant ikke bildefelt', opts.code, f.sel)
  }
  for (const s of opts.skip || []) for (const el of stage.querySelectorAll(s)) skip.add(el)

  const layers = []
  const push = (e, l) => layers.push({ z: zOf(e), i: layers.length, l })

  const shapeOf = (e, cs, box, M, asField) => {
    const pl = place(box, M)
    const k = pl.k
    // bakgrunn som bare fyller bokstavene (background-clip: text) hører til tekstlaget
    const clipText = isClipText(cs)
    const fill = clipText ? 'rgba(0, 0, 0, 0)' : cs.backgroundColor
    const paint = asField || clipText ? [] : paintOf(cs, box.w, box.h, k)
    const bw = ['Top', 'Right', 'Bottom', 'Left'].map((s) => (cs[`border${s}Style`] !== 'none' && cs[`border${s}Style`] !== 'hidden' ? parseFloat(cs[`border${s}Width`]) || 0 : 0))
    const hasBorder = bw.some((n) => n > 0)
    const bs = cs.boxShadow !== 'none'
    if (!asField && alpha(fill) === 0 && !paint.length && !hasBorder && !bs) return null
    const l = { id: uid(), type: 'shape', ...BASE(), x: pl.x, y: pl.y, w: pl.w, h: pl.h, rot: pl.rot, kind: 'rect', radius: 0, fill: alpha(fill) === 0 ? 'rgba(0,0,0,0)' : fill, fill2: null, angle: 90, stroke: 0, strokeColor: '#ffffff', ...common(e) }
    const rr = radii(cs, box.w, box.h)
    if (rr) l.radii = rr.map((n, i) => r1(n * K * (i % 2 ? pl.ky : k)))
    const pg = poly(cs, box.w, box.h)
    if (pg) l.poly = pg
    if (paint.length) l.paint = paint
    const sh = shadows(cs.boxShadow, k)
    if (sh) l.shadows = sh
    if (hasBorder) {
      const styles = ['Top', 'Right', 'Bottom', 'Left'].map((s) => cs[`border${s}Style`])
      const first = ['Top', 'Right', 'Bottom', 'Left'].find((s, i) => bw[i] > 0)
      l.strokeColor = cs[`border${first}Color`]
      const uniform = bw.every((n) => n === bw[0])
      if (uniform) l.stroke = r1(bw[0] * K * k)
      else l.sides = bw.map((n) => r1(n * K * k))
      const st = styles.find((s, i) => bw[i] > 0)
      if (st === 'dashed' || st === 'dotted') {
        const w0 = Math.max(...bw) * K * k
        // Chromium: strek 3 × tykkelsen (2 × fra 3 px), like stort mellomrom; prikket = tykkelsen
        const d = st === 'dotted' ? w0 : w0 * (Math.max(...bw) >= 3 ? 2 : 3)
        l.dash = [r1(d), r1(d)]
      }
    }
    return l
  }

  const textLayers = (node, P) => {
    const cs = getComputedStyle(P)
    const raw = node.textContent
    if (!raw.trim()) return []
    const words = []
    const re = /\S+/g
    let m
    while ((m = re.exec(raw))) {
      const rg = document.createRange()
      rg.setStart(node, m.index)
      rg.setEnd(node, m.index + m[0].length)
      const rs = [...rg.getClientRects()].filter((r) => r.width > 0 || r.height > 0)
      if (!rs.length) continue
      // et ord kan brytes over linjer bare med bindestrek: første og siste del
      words.push({ t: m[0], r: rs[0], last: rs[rs.length - 1] })
    }
    if (!words.length) return []
    const lines = []
    for (const w of words) {
      const cur = lines[lines.length - 1]
      if (cur && Math.abs(w.r.top - cur.top) < Math.max(2, w.r.height * 0.3)) {
        cur.words.push(w.t)
        cur.right = Math.max(cur.right, w.r.right)
      } else lines.push({ top: w.r.top, bottom: w.r.bottom, left: w.r.left, right: w.r.right, words: [w.t] })
    }
    const size = parseFloat(cs.fontSize)
    const fam = family(cs.fontFamily)
    const weight = parseInt(cs.fontWeight, 10) || 400
    const italic = cs.fontStyle !== 'normal'
    const stretch = parseFloat(cs.fontStretch) || 100
    const ls = cs.letterSpacing === 'normal' ? 0 : parseFloat(cs.letterSpacing) || 0
    const tt = cs.textTransform
    const font = `${italic ? 'italic ' : ''}${weight} ${size}px "${fam}"`
    mctx.font = font
    mctx.fontStretch = 'normal'
    const asc = mctx.measureText('Hg').fontBoundingBoxAscent
    const cap = mctx.measureText('H').actualBoundingBoxAscent
    // i lagets koordinater (utransformerte), relativt til flaten
    const L = lines.map((ln) => ({ ...ln, top: ln.top - S.top, left: ln.left - S.left, right: ln.right - S.left - ls, text: ln.words.join(' ') }))
    // ett lag per blokk; linjer som ikke deler venstre-, høyre- eller midtkant (et uttrykk midt i et avsnitt) får hvert sitt lag
    const make = (L) => {
    const base0 = L[0].top + asc
    const lh = L.length > 1 ? (L[L.length - 1].top - L[0].top) / (L.length - 1) / size : cs.lineHeight === 'normal' ? 1.2 : parseFloat(cs.lineHeight) / size
    const lefts = L.map((x) => x.left)
    const rights = L.map((x) => x.right)
    const spread = (a) => Math.max(...a) - Math.min(...a)
    let align = 'left'
    if (L.length > 1 && spread(lefts) > 1.5) align = spread(rights) <= 1.5 ? 'right' : 'center'
    const ta = cs.textAlign
    if (L.length === 1) align = ta === 'center' ? 'center' : ta === 'right' || ta === 'end' ? 'right' : 'left'
    let x0 = Math.min(...lefts)
    let x1 = Math.max(...rights)
    // litt luft, så linjene ikke brytes annerledes enn i originalen (lerretets mål avviker med brøkdeler)
    const pad = Math.max(2, size * 0.04)
    if (align === 'center') {
      x0 -= pad
      x1 += pad
    } else if (align === 'right') x0 -= 2 * pad
    else x1 += 2 * pad
    const top = base0 - cap
    const hBlock = cap + (L.length - 1) * lh * size + size * 0.25
    const box = { x: x0, y: top, w: x1 - x0, h: hBlock }
    const M = matOf(P)
    const pl = place(box, M)
    const k = pl.k
    let text = L.map((x) => x.text).join('\n')
    if (tt === 'lowercase') text = text.toLocaleLowerCase('nb-NO')
    else if (tt === 'capitalize') text = text.replace(/(^|\s)(\S)/g, (_a, s, c) => s + c.toLocaleUpperCase('nb-NO'))
    const fillC = cs.webkitTextFillColor && cs.webkitTextFillColor !== cs.color ? cs.webkitTextFillColor : cs.color
    const l = {
      id: uid(), type: 'text', ...BASE(), x: pl.x, y: pl.y, w: pl.w, h: pl.h, rot: pl.rot,
      text, list: '', font: fam, weight, size: r1(size * K * k), color: fillC, align, valign: 'top', lh: r3(lh), ls: r3(ls / size),
      upper: tt === 'uppercase', fit: false, bar: false, barColor: '#ffffff', barH: 8, ...common(P),
    }
    if (italic) l.italic = true
    if (stretch !== 100) l.stretch = stretch
    if (Math.abs(pl.ky / k - 1) > 0.005) l.sy = r3(pl.ky / k)
    const sw = parseFloat(cs.webkitTextStrokeWidth) || 0
    if (sw > 0) {
      l.stroke = r1(sw * K * k)
      l.strokeColor = cs.webkitTextStrokeColor
    }
    const ts = shadows(cs.textShadow, k)
    if (ts) l.shadows = ts
    // gradient i teksten (background-clip: text) fra elementet som har den
    const clipEl = chain(P).find((x) => isClipText(getComputedStyle(x)))
    if (clipEl) {
      const ccs = getComputedStyle(clipEl)
      const eb = boxOf(clipEl)
      const p = paintOf(ccs, eb.w, eb.h, k).map((q) => shiftPaint(q, (eb.x - box.x) * K * k, (eb.y - box.y) * K * k))
      if (p.length) l.paint = p
      if (alpha(fillC) === 0 && !p.length) l.color = ccs.backgroundColor
      // plass for et foto i bokstavene (plassholderens striper i materialet)
      if (hasStripes(ccs) || photoText) l.fillSrc = null
    }
    return l
    }
    if (L.length > 1) {
      const sp = (a) => Math.max(...a) - Math.min(...a)
      const ok = sp(L.map((x) => x.left)) <= 1.5 || sp(L.map((x) => x.right)) <= 1.5 || sp(L.map((x) => x.left + x.right)) <= 3
      if (!ok) return L.map((x) => make([x]))
    }
    return [make(L)]
  }

  const svgLayers = (svg) => {
    const out = []
    const vb = svg.viewBox?.baseVal
    const box = boxOf(svg)
    const vw = vb && vb.width ? vb.width : box.w
    const vh = vb && vb.height ? vb.height : box.h
    const M = matOf(svg)
    const pl = place(box, M)
    for (const el of svg.querySelectorAll('path,circle,ellipse,rect,polygon,polyline,line')) {
      const cs = getComputedStyle(el)
      let d = ''
      const a = (n) => parseFloat(el.getAttribute(n) || '0')
      const tag = el.tagName.toLowerCase()
      if (tag === 'path') d = el.getAttribute('d') || ''
      else if (tag === 'circle' || tag === 'ellipse') {
        const cx = a('cx'), cy = a('cy'), rx = tag === 'circle' ? a('r') : a('rx'), ry = tag === 'circle' ? a('r') : a('ry')
        d = `M${cx - rx} ${cy}A${rx} ${ry} 0 1 0 ${cx + rx} ${cy}A${rx} ${ry} 0 1 0 ${cx - rx} ${cy}Z`
      } else if (tag === 'rect') d = `M${a('x')} ${a('y')}h${a('width')}v${a('height')}h${-a('width')}Z`
      else if (tag === 'line') d = `M${a('x1')} ${a('y1')}L${a('x2')} ${a('y2')}`
      else d = 'M' + (el.getAttribute('points') || '').trim().replace(/\s+/g, ' ') + (tag === 'polygon' ? 'Z' : '')
      if (vb && (vb.x || vb.y)) console.warn('viewBox med forskyvning', opts.code)
      const sw = cs.stroke !== 'none' ? parseFloat(cs.strokeWidth) || 0 : 0
      const l = { id: uid(), type: 'shape', ...BASE(), x: pl.x, y: pl.y, w: pl.w, h: pl.h, rot: pl.rot, kind: 'path', radius: 0, fill: cs.fill === 'none' ? 'rgba(0,0,0,0)' : cs.fill, fill2: null, angle: 90, stroke: sw ? r1(sw * (pl.w / vw)) : 0, strokeColor: cs.stroke === 'none' ? '#ffffff' : cs.stroke, path: { d, vw, vh, ...(cs.fillRule === 'evenodd' ? { fillRule: 'evenodd' } : {}) }, ...common(el.parentElement) }
      const op = parseFloat(cs.opacity || '1') * parseFloat(cs.fillOpacity || '1')
      if (op < 0.999) l.op = r3((l.op ?? 1) * op)
      out.push(l)
    }
    return out
  }

  // 3) gjennomgang i malingsrekkefølge (dokumentrekkefølge; z-index sorteres til slutt)
  const visit = (e) => {
    const cs = getComputedStyle(e)
    if (cs.display === 'none' || cs.visibility === 'hidden') return
    if (skip.has(e)) return
    if (e.tagName.toLowerCase() === 'svg') {
      for (const l of svgLayers(e)) push(e, l)
      return
    }
    const field = fieldEls.get(e)
    const box = boxOf(e)
    const M = matOf(e)
    if (e !== stage) {
      if (field && !field.above) {
        // bildefeltet: plassholderens farge/gradient som form under (designet uten bilde), så bildelaget med feltets form
        const under = shapeOf(e, cs, box, M, false)
        if (under && field.frame) {
          // plassholderens stiplede ramme er ikke design: bare en eventuell farge under bildet blir med
          delete under.dash
          delete under.sides
          under.stroke = 0
        }
        if (under && !(field.frame && alpha(under.fill) === 0 && !under.paint && !under.shadows)) push(e, under)
        const pl = place(box, M)
        const l = { id: uid(), type: 'image', ...BASE(), x: pl.x, y: pl.y, w: pl.w, h: pl.h, rot: pl.rot, src: null, orig: null, cT: 0, cB: 0, cL: 0, cR: 0, shape: 'rect', radius: 0, fit: 'cover', zoom: 1, px: 0.5, py: 0.5, flip: false, border: 0, borderColor: '#ffffff', tint: null, role: field.role, name: '', ...common(e) }
        const rr = radii(cs, box.w, box.h)
        if (rr) l.radii = rr.map((n) => r1(n * K * pl.k))
        const pg = poly(cs, box.w, box.h)
        if (pg) l.poly = pg
        const sh = shadows(cs.boxShadow, pl.k)
        if (sh) l.shadows = sh
        // en synlig kant i designet (ikke plassholderens stiplede ramme) blir bildets kant
        const bwd = parseFloat(cs.borderTopWidth) || 0
        if (bwd > 0 && cs.borderTopStyle === 'solid') {
          l.border = r1((bwd * K * pl.k) / 2)
          l.borderColor = cs.borderTopColor
        }
        l._label = field.label
        push(e, l)
        // etiketten og plassholderens innhold tegnes ikke; andre barn (f.eks. tekst oppå bildet) tas med
        for (const c of e.children) if (!skip.has(c) && !isLabel(c)) visit(c)
        return
      }
      // et uttrykk som brytes over linjer (inline med bakgrunn): én form per linjebit
      const frags = cs.display === 'inline' ? [...e.getClientRects()] : []
      if (frags.length > 1) {
        for (const r of frags) {
          const sl = shapeOf(e, cs, { x: r.left - S.left, y: r.top - S.top, w: r.width, h: r.height }, M, false)
          if (sl) push(e, sl)
        }
      } else {
        const sl = shapeOf(e, cs, box, M, false)
        if (sl) push(e, sl)
      }
    }
    for (const n of e.childNodes) {
      if (n.nodeType === 3) for (const l of textLayers(n, e)) push(e, l)
      else if (n.nodeType === 1) visit(n)
    }
    if (field && field.above) {
      const pl = place(box, M)
      const l = { id: uid(), type: 'image', ...BASE(), x: pl.x, y: pl.y, w: pl.w, h: pl.h, rot: pl.rot, src: null, orig: null, cT: 0, cB: 0, cL: 0, cR: 0, shape: 'rect', radius: 0, fit: 'cover', zoom: 1, px: 0.5, py: 0.5, flip: false, border: 0, borderColor: '#ffffff', tint: null, role: field.role, name: '' }
      const rr = radii(cs, box.w, box.h)
      if (rr) l.radii = rr.map((n) => r1(n * K * pl.k))
      l._label = field.label
      push(e, l)
    }
  }
  const scs = getComputedStyle(stage)
  const bg = { type: 'color', color: alpha(scs.backgroundColor) ? scs.backgroundColor : '#000000', c1: '#000000', c2: '#000000', angle: 90, radial: false, src: null, orig: null, zoom: 1, px: 0.5, py: 0.5, blur: 0, dim: 0 }
  const stagePaint = paintOf(scs, 1280, 720, 1)
  if (stagePaint.length) layers.push({ z: -1e9, i: -1, l: { id: uid(), type: 'shape', ...BASE(), x: 0, y: 0, w: 1920, h: 1080, kind: 'rect', radius: 0, fill: 'rgba(0,0,0,0)', fill2: null, angle: 90, stroke: 0, strokeColor: '#ffffff', paint: stagePaint, lock: true, name: 'Bakgrunn' } })
  if (fieldEls.has(stage)) layers.push({ z: -1e9, i: 0, l: { id: uid(), type: 'image', ...BASE(), x: 0, y: 0, w: 1920, h: 1080, src: null, orig: null, cT: 0, cB: 0, cL: 0, cR: 0, shape: 'rect', radius: 0, fit: 'cover', zoom: 1, px: 0.5, py: 0.5, flip: false, border: 0, borderColor: '#ffffff', tint: null, role: fieldEls.get(stage)?.role ?? role } })
  visit(stage)
  // tilbake som før
  for (const [e, t] of tf) {
    if (t.inline) e.style.setProperty('transform', t.inline, t.prio)
    else e.style.removeProperty('transform')
  }
  const sorted = layers.sort((a, b) => a.z - b.z || a.i - b.i).map((x) => x.l)
  // bilde over hele flaten der materialet viser en illustrasjon: over illustrasjonen, under første tekst
  if (opts.full) {
    const at = sorted.findIndex((l) => l.type === 'text')
    sorted.splice(at < 0 ? sorted.length : at, 0, { id: uid(), type: 'image', ...BASE(), x: 0, y: 0, w: 1920, h: 1080, src: null, orig: null, cT: 0, cB: 0, cL: 0, cR: 0, shape: 'rect', radius: 0, fit: 'cover', zoom: 1, px: 0.5, py: 0.5, flip: false, border: 0, borderColor: '#ffffff', tint: null, role: null })
  }
  // lag som dekker hele flaten og bare har korn/blanding (overlegg): låst, så de ikke fanger klikk
  for (const l of sorted) {
    if (l.type === 'shape' && l.w >= 1919 && l.h >= 1079 && l.x <= 0.5 && l.y <= 0.5) {
      l.lock = true
      if (!l.name) l.name = l.paint?.some((p) => p.k === 'grain') ? 'Korn' : 'Bakgrunn'
    }
  }
  return { v: 1, bg, vig: { on: false, amt: 0.6, size: 0.5, color: '#000000', top: false }, layers: sorted }
}
