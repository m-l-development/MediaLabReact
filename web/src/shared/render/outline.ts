/**
 * Felles tegnehjelp for lagene i Thumbnail Studio og Photo Design (fase 3–4): rektangel med egne hjørner (CSS
 * border-radius) og skygger som i CSS (box-shadow/text-shadow, også farget glød).
 */

/** En skygge: forskyvning, uskarphet, spredning (former), farge, og om den er innvendig. */
export interface Shadow { x: number; y: number; b: number; s?: number; c: string; inset?: boolean }

type G = CanvasRenderingContext2D

/** Rektangel med egne hjørner (8 tall som CSS border-radius: rx, ry for øvre venstre, øvre høyre, nedre høyre, nedre venstre). */
export function cornersPath(p: Path2D, x: number, y: number, w: number, h: number, r: readonly number[]) {
  const v = r.map((n) => Math.max(0, n || 0))
  const [a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, k = 0, m = 0] = v
  // CSS: for store hjørner skaleres alle ned likt
  const sc = Math.min(1, w / (a + c || 1), w / (k + e || 1), h / (b + m || 1), h / (d + f || 1))
  const [tlx, tly, trx, try_, brx, bry, blx, bly] = [a, b, c, d, e, f, k, m].map((n) => n * sc) as [number, number, number, number, number, number, number, number]
  p.moveTo(x + tlx, y)
  p.lineTo(x + w - trx, y)
  p.ellipse(x + w - trx, y + try_, trx, try_, 0, -Math.PI / 2, 0)
  p.lineTo(x + w, y + h - bry)
  p.ellipse(x + w - brx, y + h - bry, brx, bry, 0, 0, Math.PI / 2)
  p.lineTo(x + blx, y + h)
  p.ellipse(x + blx, y + h - bly, blx, bly, 0, Math.PI / 2, Math.PI)
  p.lineTo(x, y + tly)
  p.ellipse(x + tlx, y + tly, tlx, tly, 0, Math.PI, Math.PI * 1.5)
  p.closePath()
}

const FAR = 30000
/**
 * Skygger som CSS (box-shadow/text-shadow): `draw` tegner formen; den flyttes langt ut av lerretet så bare skyggen
 * (med forskyvning og uskarphet fra laget, rotert med laget) havner på plass. Listen er i CSS-rekkefølge (første øverst).
 */
export function castShadows(g: G, list: readonly Shadow[] | null | undefined, inset: boolean, draw: (sh: Shadow) => void) {
  if (!list?.length) return
  const m = g.getTransform()
  const sc = Math.hypot(m.a, m.b)
  for (let i = list.length - 1; i >= 0; i--) {
    const sh = list[i]
    if (!sh || !!sh.inset !== inset) continue
    g.save()
    g.setTransform(new DOMMatrix().translate(-FAR, 0).multiply(m))
    g.shadowColor = sh.c
    g.shadowBlur = Math.max(0, sh.b) * sc
    g.shadowOffsetX = m.a * sh.x + m.c * sh.y + FAR
    g.shadowOffsetY = m.b * sh.x + m.d * sh.y
    draw(sh)
    g.restore()
  }
}
