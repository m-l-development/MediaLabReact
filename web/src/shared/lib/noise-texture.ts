/**
 * Støyteksturer for lerret (korn, slitt tekst). Malene bruker SVG-filteret feTurbulence som tekstur. Chrome lar lerretet
 * være lesbart etter at et slikt SVG-bilde er tegnet, men Safari/WebKit (også alle nettlesere på iPhone) merker lerretet
 * som «forurenset» – da feiler eksport, miniatyrer og alt annet som leser pikslene («The operation is insecure»).
 *
 * `noiseTexture` tegner SVG-et (nøyaktig som før) og sjekker om lerretet fortsatt kan leses. Hvis ikke, lages samme type
 * støy (fraktal verdistøy med samme frekvens og oktaver, sømløs) direkte på et lerret, som aldri forurenses.
 */

/** Sømløs fraktal verdistøy i [0, 1] (w × h), som feTurbulence type=fractalNoise: frekvens per piksel og oktaver. */
export function fractalNoise(w: number, h: number, freq: number, octaves: number, seed = 1): Float32Array {
  const out = new Float32Array(w * h)
  let s = seed >>> 0 || 1
  const rnd = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296)
  let amp = 1, total = 0, f = freq
  for (let o = 0; o < octaves; o++) {
    // gitter som går opp i flisen (sømløs gjentakelse)
    const gx = Math.max(1, Math.round(w * f)), gy = Math.max(1, Math.round(h * f))
    const lat = new Float32Array(gx * gy)
    for (let i = 0; i < lat.length; i++) lat[i] = rnd() * 2 - 1
    for (let y = 0; y < h; y++) {
      const fy = (y / h) * gy, y0 = Math.floor(fy) % gy, y1 = (y0 + 1) % gy, ty = fy - Math.floor(fy), sy = ty * ty * (3 - 2 * ty)
      for (let x = 0; x < w; x++) {
        const fx = (x / w) * gx, x0 = Math.floor(fx) % gx, x1 = (x0 + 1) % gx, tx = fx - Math.floor(fx), sx = tx * tx * (3 - 2 * tx)
        const a = lat[y0 * gx + x0]!, b = lat[y0 * gx + x1]!, c = lat[y1 * gx + x0]!, d = lat[y1 * gx + x1]!
        out[y * w + x]! += amp * (a + (b - a) * sx + (c - a + (a - b + d - c) * sx) * sy)
      }
    }
    total += amp
    amp *= 0.5
    f *= 2
  }
  // som feTurbulence fractalNoise: (sum + 1) / 2, spredning omtrent som filteret (sd ≈ 0,12)
  let m = 0, v = 0
  for (const x of out) m += x
  m /= out.length
  for (const x of out) v += (x - m) * (x - m)
  const sd = Math.sqrt(v / out.length) || 1
  for (let i = 0; i < out.length; i++) out[i] = Math.min(1, Math.max(0, 0.5 + ((out[i]! - m) / sd) * 0.12))
  void total
  return out
}

/** Kan lerretet leses etter at bildet er tegnet (ikke forurenset)? */
function readable(c: HTMLCanvasElement): boolean {
  try {
    c.getContext('2d', { willReadFrequently: true })?.getImageData(0, 0, 1, 1)
    return true
  } catch {
    return false
  }
}

/**
 * Teksturen som et lerret: SVG-et der det går, ellers `make(bildedata)` (fyll RGBA selv, f.eks. med `fractalNoise`).
 * null hvis ingenting kan lages (ingen DOM).
 */
export function noiseTexture(svgUrl: string, w: number, h: number, make: (d: ImageData) => void): Promise<HTMLCanvasElement | null> {
  if (typeof document === 'undefined' || typeof Image === 'undefined') return Promise.resolve(null)
  const fallback = (): HTMLCanvasElement | null => {
    const c = Object.assign(document.createElement('canvas'), { width: w, height: h })
    const g = c.getContext('2d')
    if (!g) return null
    const d = g.createImageData(w, h)
    make(d)
    g.putImageData(d, 0, 0)
    return c
  }
  return new Promise((res) => {
    const im = new Image()
    im.onload = () => {
      const c = Object.assign(document.createElement('canvas'), { width: w, height: h })
      c.getContext('2d')?.drawImage(im, 0, 0, w, h)
      res(readable(c) ? c : fallback())
    }
    im.onerror = () => res(fallback())
    im.src = svgUrl
  })
}
