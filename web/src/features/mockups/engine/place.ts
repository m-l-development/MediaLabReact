import { homography, project, type Homography, type Point, type Quad } from './geometry'
import type { MockupSettings } from './render'

/**
 * Designets plassering på objektet, i samme koordinater som render()/texture():
 * skjermflaten er enhetskvadratet (u, v ∈ 0–1, u langs bredden), og designet ligger i den med «Fyll»/«Vis hele», zoom,
 * forskyvning (ox, oy i andeler av flaten) og rotasjon. Homografien sender (u, v) til bildet (andeler av mockup-bildet),
 * så mus, forhåndsvisning og eksport bruker samme transformasjon. Utenfor enhetskvadratet gjelder samme homografi
 * (designet kan ligge delvis utenfor objektet; det klippes bare ved tegning).
 */

/** Designets rektangel i flaten: midtpunkt (u, v), halv bredde/høyde i flatepiksler (flaten = aspect × 1), vinkel. */
export interface DesignBox { cu: number; cv: number; hw: number; hh: number; rot: number; aspect: number }

export function designBox(st: MockupSettings, dw: number, dh: number, aspect: number): DesignBox {
  const r = ((((st.rot || 0) % 360) + 360) % 360) * (Math.PI / 180)
  const cos = Math.abs(Math.cos(r)), sin = Math.abs(Math.sin(r))
  const bw = dw * cos + dh * sin, bh = dw * sin + dh * cos
  const s = (st.fit === 'contain' ? Math.min(aspect / bw, 1 / bh) : Math.max(aspect / bw, 1 / bh)) * (st.zoom || 1)
  return { cu: 0.5 + (st.ox || 0), cv: 0.5 + (st.oy || 0), hw: (dw * s) / 2, hh: (dh * s) / 2, rot: r, aspect }
}

/** De fire hjørnene (øvre venstre, øvre høyre, nedre høyre, nedre venstre) i flatens (u, v). */
export function boxCorners(b: DesignBox): Quad {
  const c = Math.cos(b.rot), s = Math.sin(b.rot)
  return ([[-1, -1], [1, -1], [1, 1], [-1, 1]] as const).map(([sx, sy]) => {
    const x = sx * b.hw, y = sy * b.hh
    return [b.cu + (x * c - y * s) / b.aspect, b.cv + (x * s + y * c)] as Point
  }) as Quad
}

/** Invers homografi: fra bildet (andeler) tilbake til flaten (u, v). */
export function unproject(h: Homography, x: number, y: number): Point | null {
  const [a, b, c, d, e, f, g, hh] = h as [number, number, number, number, number, number, number, number]
  // h · (u, v, 1) ∝ (x, y, 1) → løs 2×2 for u, v
  const A11 = a - g * x, A12 = b - hh * x, B1 = x - c
  const A21 = d - g * y, A22 = e - hh * y, B2 = y - f
  const det = A11 * A22 - A12 * A21
  if (Math.abs(det) < 1e-12) return null
  return [(B1 * A22 - A12 * B2) / det, (A11 * B2 - B1 * A21) / det]
}

export const toImage = (q: Quad) => homography(q)
export const projectQuad = (h: Homography, q: Quad): Quad => q.map(([u, v]) => project(h, u, v)) as Quad

/** Ligger (u, v) inne i designet? */
export function inBox(b: DesignBox, u: number, v: number): boolean {
  const x = (u - b.cu) * b.aspect, y = v - b.cv, c = Math.cos(-b.rot), s = Math.sin(-b.rot)
  const lx = x * c - y * s, ly = x * s + y * c
  return Math.abs(lx) <= b.hw && Math.abs(ly) <= b.hh
}

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v)
export const ZOOM_MIN = 0.1
export const ZOOM_MAX = 6

/**
 * Begrenset forskyvning: designet kan flyttes helt ut til objektets kanter og videre, men minst en tiendedel av det
 * (eller av flaten) blir liggende over flaten, så det aldri forsvinner.
 */
export function clampOffset(b: DesignBox, ox: number, oy: number): { ox: number; oy: number } {
  const ex = Math.abs(b.hw * Math.cos(b.rot)) + Math.abs(b.hh * Math.sin(b.rot)), ey = Math.abs(b.hw * Math.sin(b.rot)) + Math.abs(b.hh * Math.cos(b.rot))
  const mx = 0.5 + Math.max(0.1, ex / b.aspect - 0.1), my = 0.5 + Math.max(0.1, ey - 0.1)
  return { ox: clamp(ox, -mx, mx), oy: clamp(oy, -my, my) }
}

/** Ny zoom når et hjørne dras fra (u0, v0) til (u, v): forholdet mellom avstandene til midtpunktet (proporsjonalt). */
export function zoomFromDrag(b: DesignBox, zoom0: number, u0: number, v0: number, u: number, v: number): number {
  const d0 = Math.hypot((u0 - b.cu) * b.aspect, v0 - b.cv), d1 = Math.hypot((u - b.cu) * b.aspect, v - b.cv)
  return d0 > 1e-6 ? clamp((zoom0 * d1) / d0, ZOOM_MIN, ZOOM_MAX) : zoom0
}

/* ---------- Fritt formet design (dq) og presis redigering ---------- */

/**
 * Designbildets fire hjørner (øvre venstre, øvre høyre, nedre høyre, nedre venstre i bildets egen retning) i flaten:
 * det frie formatet (st.dq) hvis det er satt, ellers regnet ut fra den vanlige plasseringen (med rotasjon og speiling).
 */
export function imageCorners(st: MockupSettings, dw: number, dh: number, aspect: number): Quad {
  if (st.dq) return st.dq.map((p) => [p[0], p[1]] as Point) as Quad
  const b = designBox(st, dw, dh, aspect)
  const fx = st.flipX ? -1 : 1, fy = st.flipY ? -1 : 1, c = Math.cos(b.rot), s = Math.sin(b.rot)
  return ([[-1, -1], [1, -1], [1, 1], [-1, 1]] as const).map(([sx, sy]) => {
    const x = sx * fx * b.hw, y = sy * fy * b.hh
    return [b.cu + (x * c - y * s) / aspect, b.cv + (x * s + y * c)] as Point
  }) as Quad
}

export const centroid = (q: readonly Point[]): Point => [q.reduce((a, p) => a + p[0], 0) / q.length, q.reduce((a, p) => a + p[1], 0) / q.length]
export const translateQuad = (q: Quad, du: number, dv: number): Quad => q.map(([u, v]) => [u + du, v + dv] as Point) as Quad
/** Skalering rundt midtpunktet (lik i begge retninger i flatens egne mål). */
export const scaleQuad = (q: Quad, f: number): Quad => { const [cu, cv] = centroid(q); return q.map(([u, v]) => [cu + (u - cu) * f, cv + (v - cv) * f] as Point) as Quad }
/** Rotasjon (grader, med klokken) rundt midtpunktet, i flatens egne mål (u · aspect, v). */
export function rotateQuad(q: Quad, deg: number, aspect: number): Quad {
  const [cu, cv] = centroid(q), r = (deg * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r)
  return q.map(([u, v]) => { const x = (u - cu) * aspect, y = v - cv; return [cu + (x * c - y * s) / aspect, cv + (x * s + y * c)] as Point }) as Quad
}
/** Speiling om midtpunktet: 'x' = vannrett (venstre ↔ høyre), 'y' = loddrett. */
export function mirrorQuad(q: Quad, axis: 'x' | 'y'): Quad {
  const [cu, cv] = centroid(q)
  return q.map(([u, v]) => (axis === 'x' ? [2 * cu - u, v] : [u, 2 * cv - v]) as Point) as Quad
}
/** Midtpunktet på side i (mellom hjørne i og i + 1). */
export const sideMid = (q: Quad, i: number): Point => { const a = q[i]!, b = q[(i + 1) % 4]!; return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] }

/**
 * Glidere og knapper når designet er fritt formet: endringen i zoom, forskyvning, rotasjon og speiling anvendes på
 * hjørnene (så formen beholdes), og «Fyll»/«Vis hele» går tilbake til vanlig plassering.
 */
export function patchFreeform(st: MockupSettings, p: Partial<MockupSettings>, aspect: number): Partial<MockupSettings> {
  if (!st.dq || 'dq' in p) return p
  if ('fit' in p) return { ...p, dq: null }
  let q = st.dq
  if (p.zoom !== undefined && st.zoom) q = scaleQuad(q, p.zoom / st.zoom)
  if (p.ox !== undefined || p.oy !== undefined) q = translateQuad(q, (p.ox ?? st.ox) - st.ox, (p.oy ?? st.oy) - st.oy)
  if (p.rot !== undefined && p.rot !== st.rot) q = rotateQuad(q, p.rot - st.rot, aspect)
  // knappene velger flipX/flipY ut fra rotasjonen, så «vannrett» er vannrett på skjermen – samme her
  const side = Math.round((((p.rot ?? st.rot) % 360) + 360) % 360 / 90) % 2 === 1
  if (p.flipX !== undefined && p.flipX !== st.flipX) q = mirrorQuad(q, side ? 'y' : 'x')
  if (p.flipY !== undefined && p.flipY !== st.flipY) q = mirrorQuad(q, side ? 'x' : 'y')
  return { ...p, dq: q }
}

/** Hjelpelinje i flaten: u = verdi (loddrett) eller v = verdi (vannrett). */
export interface Guide { axis: 'u' | 'v'; at: number }
const GUIDES = [0, 0.5, 1]

const bounds = (q: readonly Point[]) => {
  const us = q.map((p) => p[0]), vs = q.map((p) => p[1])
  const u0 = Math.min(...us), u1 = Math.max(...us), v0 = Math.min(...vs), v1 = Math.max(...vs)
  return { u: [u0, (u0 + u1) / 2, u1], v: [v0, (v0 + v1) / 2, v1] }
}

/**
 * Magnetisk flytting: designets venstre/midte/høyre (og topp/midte/bunn) fester seg til objektets kanter og midtlinjer
 * når de er nærmere enn terskelen (i flatens enheter, typisk ~6–8 skjermpiksler). Ellers følger det pekeren uendret.
 */
export function snapMove(q: readonly Point[], du: number, dv: number, tu: number, tv: number): { du: number; dv: number; guides: Guide[] } {
  const b = bounds(q), guides: Guide[] = []
  const pick = (vals: number[], d: number, t: number) => {
    let best: { d: number; g: number } | null = null
    for (const f of vals) for (const g of GUIDES) { const off = g - (f + d); if (Math.abs(off) < t && (!best || Math.abs(off) < Math.abs(best.d))) best = { d: off, g } }
    return best
  }
  const x = pick(b.u, du, tu), y = pick(b.v, dv, tv)
  if (x) guides.push({ axis: 'u', at: x.g })
  if (y) guides.push({ axis: 'v', at: y.g })
  return { du: du + (x?.d ?? 0), dv: dv + (y?.d ?? 0), guides }
}

/** Magnetisk proporsjonal skalering: en kant av designet fester seg til objektets kant eller midtlinje. */
export function snapScale(q: readonly Point[], f: number, tu: number, tv: number): { f: number; guides: Guide[] } {
  const [cu, cv] = centroid(q), b = bounds(q)
  let best: { f: number; g: Guide; err: number } | null = null
  const axes: ['u' | 'v', number[], number, number][] = [['u', [b.u[0]!, b.u[2]!], cu, tu], ['v', [b.v[0]!, b.v[2]!], cv, tv]]
  for (const [axis, vals, c, t] of axes) {
    for (const e of vals) {
      if (Math.abs(e - c) < 1e-6) continue
      for (const g of GUIDES) {
        const fg = (g - c) / (e - c)
        if (fg <= 0) continue
        const err = Math.abs(c + (e - c) * f - g)
        if (err < t && (!best || err < best.err)) best = { f: fg, g: { axis, at: g }, err }
      }
    }
  }
  return best ? { f: best.f, guides: [best.g] } : { f, guides: [] }
}

/** Magnetisk punkt (fritt hjørne/side): u og v fester seg hver for seg til objektets kanter og midtlinjer. */
export function snapPoint(u: number, v: number, tu: number, tv: number): { u: number; v: number; guides: Guide[] } {
  const guides: Guide[] = []
  const gu = GUIDES.find((g) => Math.abs(g - u) < tu), gv = GUIDES.find((g) => Math.abs(g - v) < tv)
  if (gu !== undefined) guides.push({ axis: 'u', at: gu })
  if (gv !== undefined) guides.push({ axis: 'v', at: gv })
  return { u: gu ?? u, v: gv ?? v, guides }
}

/**
 * Sidens utoverrettede normal i flatens egne mål (u · aspect, v), normert. Side i går fra hjørne i til i + 1.
 * «Utover» = bort fra designets midtpunkt, så det fungerer uansett rotasjon, speiling og skjev form.
 */
export function sideNormal(q: Quad, i: number, aspect: number): Point {
  const a = q[i]!, b = q[(i + 1) % 4]!, [cu, cv] = centroid(q)
  let nx = -(b[1] - a[1]), ny = (b[0] - a[0]) * aspect
  const l = Math.hypot(nx, ny) || 1
  nx /= l; ny /= l
  const mx = ((a[0] + b[0]) / 2 - cu) * aspect, my = (a[1] + b[1]) / 2 - cv
  return nx * mx + ny * my < 0 ? [-nx, -ny] : [nx, ny]
}

/** Flytt side i en avstand t (flatens egne mål) langs normalen: sidens to hjørner følger med, motsatt side står i ro. */
export function moveSide(q: Quad, i: number, t: number, aspect: number): Quad {
  const [nx, ny] = sideNormal(q, i, aspect), out = q.map((p) => [p[0], p[1]] as Point) as Quad
  for (const j of [i, (i + 1) % 4]) out[j] = [q[j]![0] + (nx * t) / aspect, q[j]![1] + ny * t]
  return out
}

/**
 * Avstand langs sidens normal for et pekertrekk (du, dv), med magnetisk justering av sidens midtpunkt til objektets
 * kanter og midtlinjer på den aksen normalen mest peker langs (ellers fri).
 */
export function sideDrag(q: Quad, i: number, du: number, dv: number, aspect: number, tu: number, tv: number): { t: number; guides: Guide[] } {
  const [nx, ny] = sideNormal(q, i, aspect)
  let t = du * aspect * nx + dv * ny
  const m = sideMid(q, i), mu = m[0] + (nx * t) / aspect, mv = m[1] + ny * t
  if (Math.abs(nx) >= Math.abs(ny)) {
    const g = GUIDES.find((x) => Math.abs(x - mu) < tu)
    if (g !== undefined && Math.abs(nx) > 1e-6) { t += ((g - mu) * aspect) / nx; return { t, guides: [{ axis: 'u', at: g }] } }
  } else {
    const g = GUIDES.find((x) => Math.abs(x - mv) < tv)
    if (g !== undefined && Math.abs(ny) > 1e-6) { t += (g - mv) / ny; return { t, guides: [{ axis: 'v', at: g }] } }
  }
  return { t, guides: [] }
}
