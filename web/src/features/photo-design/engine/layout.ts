import { dims, type Format, type PdDoc, type PdLayer } from './model'

/** Ytre grenser (aksejustert) for lagene, med rotasjon. */
export interface Bounds { x0: number; y0: number; x1: number; y1: number }

export function bounds(Ls: readonly PdLayer[]): Bounds {
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  for (const L of Ls) {
    const dm = dims(L)
    const a = ((L.rot || 0) * Math.PI) / 180
    const c = Math.cos(a)
    const s = Math.sin(a)
    const hw = dm.w / 2
    const hh = dm.h / 2
    for (const [u, v] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const) {
      const x = L.x + u * hw * c - v * hh * s
      const y = L.y + u * hw * s + v * hh * c
      if (x < x0) x0 = x
      if (x > x1) x1 = x
      if (y < y0) y0 = y
      if (y > y1) y1 = y
    }
  }
  return { x0, y0, x1, y1 }
}

type Ax = 'x' | 'y'
interface Target { v: number; b?: Bounds }
interface Gap { g: number; a: Bounds; c: Bounds }
export interface SnapPrep { B: Bounds[]; tx: Target[]; ty: Target[]; gx: Gap[]; gy: Gap[] }
/** Hjelpelinjer [x1, y1, x2, y2] og avstandsmerker [x1, y1, x2, y2, avstand]. */
export interface Snap { dx: number; dy: number; lines: [number, number, number, number][]; marks: [number, number, number, number, number][] }

const lo = (c: Bounds, ax: Ax) => (ax === 'x' ? c.x0 : c.y0)
const hi = (c: Bounds, ax: Ax) => (ax === 'x' ? c.x1 : c.y1)

/** Kanter og midter for lerretet og de andre lagene, og avstandene mellom nabolag. */
export function snapPrep(doc: Pick<PdDoc, 'w' | 'h' | 'layers'>, ids: readonly string[]): SnapPrep {
  const set = new Set(ids)
  const B = doc.layers
    .filter((L) => !set.has(L.id) && !L.hidden && L.type !== 'fx')
    .map((L) => bounds([L]))
    .filter((b) => Number.isFinite(b.x0) && !(b.x1 - b.x0 >= doc.w * 0.98 && b.y1 - b.y0 >= doc.h * 0.98))
  const tg = (ax: Ax): Target[] => {
    const c = ax === 'x' ? doc.w : doc.h
    const o: Target[] = [{ v: 0 }, { v: c / 2 }, { v: c }]
    for (const b of B) {
      const a0 = lo(b, ax)
      const a1 = hi(b, ax)
      o.push({ v: a0, b }, { v: (a0 + a1) / 2, b }, { v: a1, b })
    }
    return o
  }
  const gaps = (ax: Ax): Gap[] => {
    const o: Gap[] = []
    for (const a of B) {
      let best: Gap | null = null
      for (const c of B) {
        if (a === c) continue
        const ov = ax === 'y' ? a.x0 < c.x1 && c.x0 < a.x1 : a.y0 < c.y1 && c.y0 < a.y1
        const g = ax === 'y' ? c.y0 - a.y1 : c.x0 - a.x1
        if (ov && g > 0.5 && (!best || g < best.g)) best = { g, a, c }
      }
      if (best) o.push(best)
    }
    return o
  }
  return { B, tx: tg('x'), ty: tg('y'), gx: gaps('x'), gy: gaps('y') }
}

/**
 * Festing for boksen `b` (i dokumentkoordinater) med terskel `th` og straff `pen` for lik avstand.
 * `off` = ingen festing (Alt). Samme regler som dagens app.
 */
export function snapAt(doc: Pick<PdDoc, 'w' | 'h'>, P: SnapPrep, b: Bounds, th: number, pen: number, off: boolean): Snap {
  const out: Snap = { dx: 0, dy: 0, lines: [], marks: [] }
  if (off) return out
  const cross = (c: Bounds, bb: Bounds, ax: Ax) => (ax === 'y' ? c.x0 < bb.x1 && bb.x0 < c.x1 : c.y0 < bb.y1 && bb.y0 < c.y1)
  const nbrs = (bb: Bounds, ax: Ax, t: number) => {
    let pre: Bounds | null = null
    let nxt: Bounds | null = null
    for (const c of P.B) {
      if (!cross(c, bb, ax)) continue
      if (hi(c, ax) <= lo(bb, ax) + t && (!pre || hi(c, ax) > hi(pre, ax))) pre = c
      if (lo(c, ax) >= hi(bb, ax) - t && (!nxt || lo(c, ax) < lo(nxt, ax))) nxt = c
    }
    return { pre, nxt }
  }
  const axis = (ax: Ax) => {
    const e0 = lo(b, ax)
    const e1 = hi(b, ax)
    const len = e1 - e0
    const cand: { d: number; k: number }[] = []
    for (const t of ax === 'x' ? P.tx : P.ty) {
      for (const e of [e0, e0 + len / 2, e1]) {
        const df = t.v - e
        if (Math.abs(df) < th) cand.push({ d: df, k: 0 })
      }
    }
    const { pre, nxt } = nbrs(b, ax, th)
    const add = (pos: number) => {
      const df = pos - e0
      if (Math.abs(df) < th) cand.push({ d: df, k: 1 })
    }
    if (pre && nxt) add((hi(pre, ax) + lo(nxt, ax) - len) / 2)
    for (const g of ax === 'x' ? P.gx : P.gy) {
      if (pre) add(hi(pre, ax) + g.g)
      if (nxt) add(lo(nxt, ax) - g.g - len)
    }
    // Justering mot kanter og midter går foran lik avstand når de er omtrent like nære.
    cand.sort((p, q) => Math.abs(p.d) + p.k * pen - (Math.abs(q.d) + q.k * pen))
    return cand[0] ?? null
  }
  const cx = axis('x')
  const cy = axis('y')
  if (cx) out.dx = cx.d
  if (cy) out.dy = cy.d
  const f: Bounds = { x0: b.x0 + out.dx, x1: b.x1 + out.dx, y0: b.y0 + out.dy, y1: b.y1 + out.dy }
  const seen = new Map<string, [number, number, number, 'v' | 'h']>()
  for (const ax of ['x', 'y'] as const) {
    for (const t of ax === 'x' ? P.tx : P.ty) {
      const e0 = lo(f, ax)
      const e1 = hi(f, ax)
      if (![e0, (e0 + e1) / 2, e1].some((e) => Math.abs(t.v - e) < 0.6)) continue
      const k = ax + Math.round(t.v)
      const o: Ax = ax === 'x' ? 'y' : 'x'
      const a = t.b ? Math.min(lo(f, o), lo(t.b, o)) : 0
      const z = t.b ? Math.max(hi(f, o), hi(t.b, o)) : o === 'x' ? doc.w : doc.h
      const have = seen.get(k)
      if (have) {
        have[1] = Math.min(have[1], a)
        have[2] = Math.max(have[2], z)
        continue
      }
      seen.set(k, [t.v, a, z, ax === 'x' ? 'v' : 'h'])
    }
  }
  out.lines = [...seen.values()].map(([v, a, z, dir]) => (dir === 'v' ? [v, a, v, z] : [a, v, z, v]))
  const gapMark = (a: Bounds, c: Bounds, ax: Ax) => {
    const o: Ax = ax === 'x' ? 'y' : 'x'
    const m = (Math.max(lo(a, o), lo(c, o)) + Math.min(hi(a, o), hi(c, o))) / 2
    const s0 = hi(a, ax)
    const s1 = lo(c, ax)
    const g = Math.round(s1 - s0)
    if (g < 1) return
    out.marks.push(ax === 'x' ? [s0, m, s1, m, g] : [m, s0, m, s1, g])
  }
  for (const ax of ['x', 'y'] as const) {
    const { pre, nxt } = nbrs(f, ax, 0.6)
    const gp = pre ? lo(f, ax) - hi(pre, ax) : -1
    const gn = nxt ? lo(nxt, ax) - hi(f, ax) : -1
    const eq = (a: number, c: number) => a > 0.5 && Math.abs(a - c) < 0.6
    if (pre && nxt && eq(gp, gn)) {
      gapMark(pre, f, ax)
      gapMark(f, nxt, ax)
      continue
    }
    const G = ax === 'x' ? P.gx : P.gy
    const rp = G.find((g) => eq(gp, g.g))
    const rn = G.find((g) => eq(gn, g.g))
    if (rp && pre) {
      gapMark(pre, f, ax)
      gapMark(rp.a, rp.c, ax)
    } else if (rn && nxt) {
      gapMark(f, nxt, ax)
      gapMark(rn.a, rn.c, ax)
    }
  }
  return out
}

/** Utgangspunktet for formatbytte (for at frem og tilbake skal gi samme resultat). */
export interface FormatBase { id: string; w: number; h: number; layers: PdLayer[]; back: PdLayer[] | null; after?: string }

export const formatKey = (q: Pick<PdDoc, 'w' | 'h' | 'layers' | 'back'>): string => JSON.stringify([q.w, q.h, q.layers, q.back ? q.back.layers : null])

/**
 * Bytter format: lag som går kant til kant strekkes i den retningen, lag inntil en kant blir liggende der,
 * ellers flyttes de forholdsmessig og skaleres likt. Tekst skaleres alltid likt.
 */
export function changeFormat(d: PdDoc, f: Pick<Format, 'w' | 'h'>, prev: FormatBase | null, rename: string | null): { doc: PdDoc; base: FormatBase } {
  const B: FormatBase = prev && prev.id === d.id && prev.after === formatKey(d) ? prev : { id: d.id, w: d.w, h: d.h, layers: d.layers, back: d.back ? d.back.layers : null }
  const kx = f.w / B.w
  const ky = f.h / B.h
  const k = Math.min(kx, ky)
  const e = 1
  const fit = (L: PdLayer): PdLayer => {
    const b = bounds([L])
    const tl = b.x0 <= e
    const tr = b.x1 >= B.w - e
    const tt = b.y0 <= e
    const tb = b.y1 >= B.h - e
    const fw = tl && tr
    const fh = tt && tb
    const txt = L.type === 'text'
    const sx = txt ? k : fw ? kx : k
    const sy = txt ? k : fh ? ky : k
    const o = { ...L } as PdLayer & Record<string, unknown>
    o.x = fw ? L.x * kx : tl ? b.x0 + (L.x - b.x0) * sx : tr ? f.w + (b.x1 - B.w) - (b.x1 - L.x) * sx : L.x * kx
    o.y = fh ? L.y * ky : tt ? b.y0 + (L.y - b.y0) * sy : tb ? f.h + (b.y1 - B.h) - (b.y1 - L.y) * sy : L.y * ky
    const src = L as unknown as Record<string, unknown>
    if (txt) {
      o.size = (L.size) * k
      for (const p of ['strokeW', 'ls', 'barH']) if (typeof src[p] === 'number') o[p] = (src[p] as number) * k
    } else {
      if (typeof src.w === 'number') o.w = (src.w as number) * sx
      if (typeof src.h === 'number') o.h = (src.h as number) * sy
      for (const p of ['strokeW', 'radius']) if (typeof src[p] === 'number') o[p] = (src[p] as number) * k
    }
    return o as PdLayer
  }
  const nd: PdDoc = {
    ...d, w: f.w, h: f.h, layers: B.layers.map(fit),
    back: d.back ? { ...d.back, layers: (B.back ?? d.back.layers).map(fit) } : (d.back ?? null),
    name: rename ?? d.name,
  }
  return { doc: nd, base: { ...B, after: formatKey(nd) } }
}
