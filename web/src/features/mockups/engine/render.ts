import { detectScreen, occlusionMask, type Pixels } from './detect'
import { aspectOf, clamp, growQuad, homography, project, type Point, type Quad } from './geometry'

/** Innstillinger per mockup (samme felt og standardverdier som i dag, lagres under `mockups.settings`). */
export interface MockupSettings {
  fit: 'cover' | 'contain'
  zoom: number
  ox: number
  oy: number
  bg: string
  shade: number
  gloss: number
  occl: boolean
  corners: Quad | null
}

export const DEFAULT_SETTINGS: MockupSettings = { fit: 'cover', zoom: 1, ox: 0, oy: 0, bg: '#ffffff', shade: 0.6, gloss: 0.35, occl: true, corners: null }

export interface MockupInfo {
  id: string
  /** Hjørner fra config.json (andeler), eller null = finnes automatisk. */
  corners: Quad | null
  aspect: number | null
  keepHoles: boolean
  /** false = ikke behold ting foran skjermen (f.eks. papir og kort). */
  occl: boolean
}

type Img = HTMLImageElement | HTMLCanvasElement | ImageBitmap

const size = (img: Img) => ({ w: 'naturalWidth' in img ? img.naturalWidth : img.width, h: 'naturalHeight' in img ? img.naturalHeight : img.height })

function canvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(w))
  c.height = Math.max(1, Math.round(h))
  return c
}

function ctx2d(c: HTMLCanvasElement, willRead = false): CanvasRenderingContext2D {
  const g = c.getContext('2d', willRead ? { willReadFrequently: true } : undefined)
  if (!g) throw new Error('Canvas er ikke tilgjengelig')
  return g
}

export function pixels(img: Img, maxSide: number): Pixels {
  const { w: iw, h: ih } = size(img)
  const s = Math.min(1, maxSide / Math.max(iw, ih))
  const w = Math.max(1, Math.round(iw * s))
  const h = Math.max(1, Math.round(ih * s))
  const c = canvas(w, h)
  const g = ctx2d(c, true)
  g.drawImage(img, 0, 0, w, h)
  return { w, h, d: g.getImageData(0, 0, w, h).data }
}

/** Finner skjermen automatisk (360 px analyse). */
export function detect(img: Img): Quad | null {
  return detectScreen(pixels(img, 360))
}

/** Tegner bildet i én trekant med affin transform (litt utvidet så det ikke blir sømmer). */
function tri(g: CanvasRenderingContext2D, img: CanvasImageSource, s0: Point, s1: Point, s2: Point, d0: Point, d1: Point, d2: Point) {
  const cx = (d0[0] + d1[0] + d2[0]) / 3
  const cy = (d0[1] + d1[1] + d2[1]) / 3
  const e = (p: Point): Point => {
    const dx = p[0] - cx
    const dy = p[1] - cy
    const l = Math.hypot(dx, dy) || 1
    return [p[0] + (dx / l) * 0.7, p[1] + (dy / l) * 0.7]
  }
  const D0 = e(d0)
  const D1 = e(d1)
  const D2 = e(d2)
  g.save()
  g.beginPath()
  g.moveTo(D0[0], D0[1])
  g.lineTo(D1[0], D1[1])
  g.lineTo(D2[0], D2[1])
  g.closePath()
  g.clip()
  const [x0, y0] = s0
  const [x1, y1] = s1
  const [x2, y2] = s2
  const den = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0)
  if (Math.abs(den) < 1e-9) {
    g.restore()
    return
  }
  const a = ((d1[0] - d0[0]) * (y2 - y0) - (d2[0] - d0[0]) * (y1 - y0)) / den
  const c = ((d2[0] - d0[0]) * (x1 - x0) - (d1[0] - d0[0]) * (x2 - x0)) / den
  const b = ((d1[1] - d0[1]) * (y2 - y0) - (d2[1] - d0[1]) * (y1 - y0)) / den
  const d = ((d2[1] - d0[1]) * (x1 - x0) - (d1[1] - d0[1]) * (x2 - x0)) / den
  g.transform(a, b, c, d, d0[0] - a * x0 - c * y0, d0[1] - b * x0 - d * y0)
  g.drawImage(img, 0, 0)
  g.restore()
}

/** Perspektivforvrengning: deler bildet i N×N ruter, hver tegnet som to trekanter. */
export function warp(g: CanvasRenderingContext2D, img: HTMLCanvasElement, q: Quad, N = 16): void {
  const h = homography(q)
  if (!h) return
  const W = img.width
  const H = img.height
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const u0 = i / N
      const u1 = (i + 1) / N
      const v0 = j / N
      const v1 = (j + 1) / N
      const p00 = project(h, u0, v0)
      const p10 = project(h, u1, v0)
      const p11 = project(h, u1, v1)
      const p01 = project(h, u0, v1)
      const s00: Point = [u0 * W, v0 * H]
      const s10: Point = [u1 * W, v0 * H]
      const s11: Point = [u1 * W, v1 * H]
      const s01: Point = [u0 * W, v1 * H]
      tri(g, img, s00, s10, s11, p00, p10, p11)
      tri(g, img, s00, s11, s01, p00, p11, p01)
    }
  }
}

/** Designet tilpasset skjermen (fyll/vis hele, zoom, flytt) på skjermfargen. */
function texture(design: Img | null, aspect: number, tw: number, st: MockupSettings): HTMLCanvasElement {
  const th = Math.max(2, Math.round(tw / aspect))
  const c = canvas(tw, th)
  const g = ctx2d(c)
  g.fillStyle = st.bg || '#ffffff'
  g.fillRect(0, 0, tw, th)
  if (design) {
    const { w: dw, h: dh } = size(design)
    const s = (st.fit === 'contain' ? Math.min(tw / dw, th / dh) : Math.max(tw / dw, th / dh)) * (st.zoom || 1)
    const w = dw * s
    const h = dh * s
    g.imageSmoothingQuality = 'high'
    g.drawImage(design, (tw - w) / 2 + (st.ox || 0) * tw, (th - h) / 2 + (st.oy || 0) * th, w, h)
  }
  return c
}

const maskCache = new Map<string, HTMLCanvasElement>()

function screenMask(mk: MockupInfo, base: Img, qn: Quad, W: number, H: number, occl: boolean): HTMLCanvasElement {
  const key = `${mk.id}|${W}x${H}|${qn.map((p) => `${p[0].toFixed(4)},${p[1].toFixed(4)}`).join(';')}|${occl ? 1 : 0}${mk.keepHoles ? 1 : 0}`
  const hit = maskCache.get(key)
  if (hit) return hit
  const out = canvas(W, H)
  const g = ctx2d(out)
  const m = occl ? (() => {
    const P = pixels(base, 720)
    const mm = occlusionMask(P, qn, mk.keepHoles)
    return mm ? { mm, P } : null
  })() : null
  if (m) {
    const sc = canvas(m.P.w, m.P.h)
    const sg = ctx2d(sc)
    const id = sg.createImageData(m.P.w, m.P.h)
    for (let p = 0; p < m.mm.length; p++) id.data[p * 4 + 3] = m.mm[p] ? 255 : 0
    sg.putImageData(id, 0, 0)
    g.imageSmoothingEnabled = true
    g.imageSmoothingQuality = 'high'
    g.drawImage(sc, 0, 0, W, H)
  } else {
    const q = growQuad(qn.map((p) => [p[0] * W, p[1] * H] as Point), 1.006)
    g.fillStyle = '#000'
    g.beginPath()
    g.moveTo(q[0][0], q[0][1])
    for (let t = 1; t < 4; t++) g.lineTo((q[t] as Point)[0], (q[t] as Point)[1])
    g.closePath()
    g.fill()
  }
  if (maskCache.size > 40) {
    const first = maskCache.keys().next().value
    if (first) maskCache.delete(first)
  }
  maskCache.set(key, out)
  return out
}

/**
 * Tegner mockupen: fotografiet, designet i perspektiv innenfor skjermmasken, og lys/skygger/glans fra fotografiet
 * (MK-06–MK-09). `N` = antall ruter i forvrengningen (færre mens man drar, flere ved eksport).
 */
export function render(g: CanvasRenderingContext2D, W: number, H: number, base: Img, design: Img | null, mk: MockupInfo, st: MockupSettings, opt: { N?: number } = {}): void {
  const qn = st.corners ?? mk.corners
  g.save()
  g.setTransform(1, 0, 0, 1, 0, 0)
  g.clearRect(0, 0, W, H)
  g.drawImage(base, 0, 0, W, H)
  if (!qn || !design) {
    g.restore()
    return
  }
  const q = qn.map((p) => [p[0] * W, p[1] * H] as Point) as Quad
  const aspect = mk.aspect ?? aspectOf(q)
  const qw = Math.max(Math.hypot(q[1][0] - q[0][0], q[1][1] - q[0][1]), Math.hypot(q[2][0] - q[3][0], q[2][1] - q[3][1]))
  const tex = texture(design, aspect, Math.round(clamp(qw * 1.25, 64, 3000)), st)
  const layer = canvas(W, H)
  const lg = ctx2d(layer, true)
  warp(lg, tex, growQuad(q, 1.025), opt.N ?? (W > 1200 ? 22 : 12))
  lg.globalCompositeOperation = 'destination-in'
  lg.drawImage(screenMask(mk, base, qn, W, H, st.occl !== false && mk.occl !== false), 0, 0)
  lg.globalCompositeOperation = 'source-over'

  let shade = st.shade ?? 0.6
  let gloss = st.gloss ?? 0.35
  if (shade > 0.01 || gloss > 0.01) {
    const xs = q.map((p) => p[0])
    const ys = q.map((p) => p[1])
    const x0 = Math.max(0, Math.floor(Math.min(...xs)) - 2)
    const y0 = Math.max(0, Math.floor(Math.min(...ys)) - 2)
    const x1 = Math.min(W, Math.ceil(Math.max(...xs)) + 2)
    const y1 = Math.min(H, Math.ceil(Math.max(...ys)) + 2)
    const bw = x1 - x0
    const bh = y1 - y0
    if (bw > 2 && bh > 2) {
      const bc = canvas(W, H)
      const bg = ctx2d(bc, true)
      if (mk.occl === false) {
        // Papir og kort: mykt lys fra et uskarpt bilde, uten glans.
        const sm = canvas(Math.max(2, W / 40), Math.max(2, H / 40))
        ctx2d(sm).drawImage(base, 0, 0, sm.width, sm.height)
        bg.imageSmoothingEnabled = true
        bg.drawImage(sm, 0, 0, W, H)
        gloss = 0
        shade *= 0.5
      } else bg.drawImage(base, 0, 0, W, H)
      const B = bg.getImageData(x0, y0, bw, bh).data
      const Ly = lg.getImageData(x0, y0, bw, bh)
      const D = Ly.data
      let sum = 0
      let n = 0
      for (let i = 0; i < D.length; i += 4) {
        if ((D[i + 3] ?? 0) > 200) {
          sum += 0.3 * (B[i] ?? 0) + 0.59 * (B[i + 1] ?? 0) + 0.11 * (B[i + 2] ?? 0)
          n++
        }
      }
      const mean = n ? sum / n : 128
      const bright = mean >= 90
      for (let i = 0; i < D.length; i += 4) {
        if (!D[i + 3]) continue
        const L = 0.3 * (B[i] ?? 0) + 0.59 * (B[i + 1] ?? 0) + 0.11 * (B[i + 2] ?? 0)
        const f = bright ? clamp(1 + shade * (L / mean - 1) * 1.4, 0.35, 1.25) : 1 - shade * 0.08
        const add = bright ? gloss * Math.max(0, L - mean) * 1.2 : gloss * Math.max(0, L - mean) * 2.2
        D[i] = clamp((D[i] ?? 0) * f + add, 0, 255)
        D[i + 1] = clamp((D[i + 1] ?? 0) * f + add, 0, 255)
        D[i + 2] = clamp((D[i + 2] ?? 0) * f + add, 0, 255)
      }
      lg.putImageData(Ly, x0, y0)
    }
  }
  g.drawImage(layer, 0, 0)
  g.restore()
}
