/**
 * Bokstavbiter av et tekstbilde (styled-raster): animasjoner som flytter bokstaver eller ord hver for seg (Motion:
 * skrivemaskin, bokstav for bokstav, ord for ord, bølge, hopp, spredte bokstaver, bane …) tegner hver bit med sin egen
 * transform. Bitene er laget av den ekte <StyledText>-tegningen, så former og effekter er med.
 *
 * Bildet deles uten overlapp: innen hver linje går skillet midt mellom to bokstaver, mellom linjene midt mellom
 * linjene, og ytterst ut til kanten av bildet – så skygger, glød og konturer følger bokstaven sin.
 * Tekst som ikke går fra venstre mot høyre (sirkel, spiral, ordsky, mønster) får bokstavens egen boks med litt luft.
 */
import type { Glyph, StyledImage } from './styled-raster'

export interface Sprite {
  /** Bokstavens nummer (uten mellomrom), tegnet og ordnummer. */
  i: number
  ch: string
  line: number
  word: number
  /** Bokstavens midtpunkt (lagets px, relativt til boksen). */
  cx: number
  cy: number
  /** Biten i lagets px (relativt til boksen). */
  x: number
  y: number
  w: number
  h: number
}

const cache = new WeakMap<StyledImage, Sprite[]>()

export function spritesOf(im: StyledImage): Sprite[] {
  const hit = cache.get(im)
  if (hit) return hit
  const g = im.glyphs ?? []
  const B = im.box
  const out: Sprite[] = []
  const byLine = new Map<number, Glyph[]>()
  for (const q of g) {
    const l = byLine.get(q.line) ?? []
    l.push(q)
    byLine.set(q.line, l)
  }
  const lines = [...byLine.keys()].sort((a, b) => a - b)
  const band = lines.map((ln) => {
    const gs = byLine.get(ln) ?? []
    return { top: Math.min(...gs.map((q) => q.y)), bot: Math.max(...gs.map((q) => q.y + q.h)) }
  })
  const mono = lines.every((ln) => {
    const gs = byLine.get(ln) ?? []
    for (let i = 1; i < gs.length; i++) if ((gs[i]?.x ?? 0) < (gs[i - 1]?.x ?? 0) - 1) return false
    return true
  })
  lines.forEach((ln, li) => {
    const gs = byLine.get(ln) ?? []
    const b = band[li]!
    const y0 = li === 0 ? B.y : (band[li - 1]!.bot + b.top) / 2
    const y1 = li === lines.length - 1 ? B.y + B.h : (b.bot + band[li + 1]!.top) / 2
    gs.forEach((q, k) => {
      let x0: number, x1: number, yy0 = y0, yy1 = y1
      if (mono) {
        const p = gs[k - 1]
        const n = gs[k + 1]
        x0 = p ? (p.x + p.w + q.x) / 2 : B.x
        x1 = n ? (q.x + q.w + n.x) / 2 : B.x + B.w
      } else {
        const m = Math.max(q.w, q.h) * 0.25
        x0 = q.x - m
        x1 = q.x + q.w + m
        yy0 = q.y - m
        yy1 = q.y + q.h + m
      }
      out.push({ i: q.i, ch: q.ch, line: q.line, word: q.word, cx: q.x + q.w / 2, cy: q.y + q.h / 2, x: x0, y: yy0, w: Math.max(0, x1 - x0), h: Math.max(0, yy1 - yy0) })
    })
  })
  out.sort((a, b) => a.i - b.i)
  cache.set(im, out)
  return out
}

type G2 = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D

/**
 * Tegner én bit (eller flere slått sammen, f.eks. et ord) i lagets px (boksen starter i 0,0) med gjeldende transform.
 * `kx`/`ky` skalerer fra bildets boks til lagets nåværende boks.
 */
export function drawSprites(g: G2, im: StyledImage, parts: readonly Sprite[], kx = 1, ky = 1): void {
  if (!parts.length) return
  const x0 = Math.min(...parts.map((p) => p.x))
  const y0 = Math.min(...parts.map((p) => p.y))
  const x1 = Math.max(...parts.map((p) => p.x + p.w))
  const y1 = Math.max(...parts.map((p) => p.y + p.h))
  const k = im.scale
  const sx = Math.max(0, (x0 - im.box.x) * k)
  const sy = Math.max(0, (y0 - im.box.y) * k)
  const sw = Math.min(im.img.width - sx, (x1 - x0) * k)
  const sh = Math.min(im.img.height - sy, (y1 - y0) * k)
  if (sw <= 0 || sh <= 0) return
  g.drawImage(im.img, sx, sy, sw, sh, (im.box.x + sx / k) * kx, (im.box.y + sy / k) * ky, (sw / k) * kx, (sh / k) * ky)
}

/** Bitene gruppert per ord (ord for ord). */
export function wordsOf(sp: readonly Sprite[]): Sprite[][] {
  const m = new Map<string, Sprite[]>()
  for (const s of sp) {
    const k = `${s.line}:${s.word}`
    const l = m.get(k) ?? []
    l.push(s)
    m.set(k, l)
  }
  return [...m.values()]
}
