/**
 * Avansert framkalling i Photo Design (bare i Avansert modus). Funksjonene er inspirert av framkallingen i LightCraft
 * (hvit-/svartpunkt, vibrance, klarhet, skarphet, auto-tone, histogram), men skrevet selvstendig for MediaLabReact:
 * ingen kode fra LightCraft er brukt. Kjøres etter de vanlige justeringene (`Adj`) og bare når bildelaget har `dev`,
 * så bilder uten avansert framkalling gir nøyaktig samme resultat som før.
 */

export interface Dev {
  /** Hvitpunkt −100…100: positiv løfter de lyseste tonene, negativ demper dem. */
  whites: number
  /** Svartpunkt −100…100: negativ gjør de mørkeste tonene dypere, positiv løfter dem. */
  blacks: number
  /** Vibrance −100…100: metning som virker mest på umettede farger (hudtoner skånes). */
  vib: number
  /** Klarhet −100…100: lokal kontrast i mellomtonene. */
  clarity: number
  /** Skarphet 0…100 (uskarp maske med liten radius). */
  sharp: number
}

export const DEV: Dev = { whites: 0, blacks: 0, vib: 0, clarity: 0, sharp: 0 }
const KEYS = Object.keys(DEV) as (keyof Dev)[]

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v)

/** Gyldig, avgrenset Dev fra lagrede data (ukjente felt og tall utenfor området ignoreres). */
export function cleanDev(v: unknown): Dev | null {
  if (!v || typeof v !== 'object') return null
  const o = v as Record<string, unknown>
  const out = { ...DEV }
  for (const k of KEYS) {
    const n = Number(o[k])
    if (Number.isFinite(n)) out[k] = clamp(n, k === 'sharp' ? 0 : -100, 100)
  }
  return devNeutral(out) ? null : out
}

export const devNeutral = (d: Dev | null | undefined): boolean => !d || KEYS.every((k) => !d[k])

/** Tonekurve for hvit- og svartpunkt (0…255 → 0…255), myk overgang så mellomtonene beholdes. */
export function toneLut(d: Pick<Dev, 'whites' | 'blacks'>): Uint8ClampedArray {
  const lut = new Uint8ClampedArray(256)
  const w = d.whites / 100, b = d.blacks / 100
  for (let i = 0; i < 256; i++) {
    const x = i / 255
    // vekt mot ytterkantene: (x^2) for lys, ((1-x)^2) for mørk
    let y = x + w * 0.35 * x * x * (1 - x) * 4 * (w > 0 ? 1 : 0.8)
    y += b * 0.35 * (1 - x) * (1 - x) * x * 4 + (b < 0 ? b * 0.06 * (1 - x) ** 3 : 0)
    lut[i] = Math.round(clamp(y, 0, 1) * 255)
  }
  return lut
}

/** Boks-uskarphet av én kanal (to pass), radius i piksler. */
function boxBlur(src: Float32Array, W: number, H: number, r: number): Float32Array {
  const tmp = new Float32Array(src.length), out = new Float32Array(src.length), n = 2 * r + 1
  for (let y = 0; y < H; y++) {
    let s = 0
    const row = y * W
    for (let x = -r; x <= r; x++) s += src[row + clamp(x, 0, W - 1)]!
    for (let x = 0; x < W; x++) {
      tmp[row + x] = s / n
      s += src[row + clamp(x + r + 1, 0, W - 1)]! - src[row + clamp(x - r, 0, W - 1)]!
    }
  }
  for (let x = 0; x < W; x++) {
    let s = 0
    for (let y = -r; y <= r; y++) s += tmp[clamp(y, 0, H - 1) * W + x]!
    for (let y = 0; y < H; y++) {
      out[y * W + x] = s / n
      s += tmp[clamp(y + r + 1, 0, H - 1) * W + x]! - tmp[clamp(y - r, 0, H - 1) * W + x]!
    }
  }
  return out
}

/** Bruker avansert framkalling på bildedataene (endrer dem). */
export function applyDev(img: ImageData, d: Dev): void {
  if (devNeutral(d)) return
  const { data: px, width: W, height: H } = img
  const N = W * H
  const lut = d.whites || d.blacks ? toneLut(d) : null
  // luminans før lokale operasjoner (klarhet/skarphet virker på lysheten, så fargene ikke forskyves)
  const lum = new Float32Array(N)
  for (let i = 0, p = 0; i < N; i++, p += 4) {
    if (lut) { px[p] = lut[px[p]!]!; px[p + 1] = lut[px[p + 1]!]!; px[p + 2] = lut[px[p + 2]!]! }
    lum[i] = 0.2126 * px[p]! + 0.7152 * px[p + 1]! + 0.0722 * px[p + 2]!
  }
  const local = (r: number) => boxBlur(boxBlur(lum, W, H, r), W, H, r) // tilnærmet gaussisk
  const clar = d.clarity ? local(Math.max(2, Math.round(Math.max(W, H) * 0.012))) : null
  const det = d.sharp ? local(1) : null
  const vib = d.vib / 100
  for (let i = 0, p = 0; i < N; i++, p += 4) {
    let r = px[p]!, g = px[p + 1]!, b = px[p + 2]!
    const L = lum[i]!
    let dl = 0
    if (clar) {
      const mid = 1 - Math.abs(L / 127.5 - 1) // mest i mellomtonene
      dl += (L - clar[i]!) * (d.clarity / 100) * 0.9 * mid
    }
    if (det) dl += (L - det[i]!) * (d.sharp / 100) * 1.6
    if (dl) { r += dl; g += dl; b += dl }
    if (vib) {
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b), sat = mx > 0 ? (mx - mn) / mx : 0
      const skin = r > g && g > b ? 0.5 : 1 // skån varme hudtoner noe
      const k = 1 + vib * (1 - sat) * skin * (vib > 0 ? 1.2 : 1)
      const avg = (r + g + b) / 3
      r = avg + (r - avg) * k; g = avg + (g - avg) * k; b = avg + (b - avg) * k
    }
    px[p] = r; px[p + 1] = g; px[p + 2] = b
  }
}

export interface Histogram { r: Uint32Array; g: Uint32Array; b: Uint32Array; l: Uint32Array; n: number }

/** Histogram (256 nivåer per kanal og for lysheten), bare synlige piksler (alfa > 0). */
export function histogram(img: ImageData): Histogram {
  const h = { r: new Uint32Array(256), g: new Uint32Array(256), b: new Uint32Array(256), l: new Uint32Array(256), n: 0 }
  const px = img.data
  for (let p = 0; p < px.length; p += 4) {
    if (!px[p + 3]) continue
    const r = px[p]!, g = px[p + 1]!, b = px[p + 2]!
    h.r[r]!++; h.g[g]!++; h.b[b]!++
    h.l[Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b)]!++
    h.n++
  }
  return h
}

const pct = (a: Uint32Array, n: number, q: number) => {
  let s = 0
  for (let i = 0; i < 256; i++) { s += a[i]!; if (s >= n * q) return i }
  return 255
}

/**
 * Auto-tone: setter eksponering (i de vanlige justeringene), hvit- og svartpunkt ut fra histogrammet, slik at de
 * lyseste og mørkeste 0,5 % havner nær ytterkantene og middelverdien nær midten. Endrer ikke farger.
 */
export function autoTone(h: Histogram): { exp: number; whites: number; blacks: number } {
  if (!h.n) return { exp: 0, whites: 0, blacks: 0 }
  const lo = pct(h.l, h.n, 0.005), hi = pct(h.l, h.n, 0.995), mid = pct(h.l, h.n, 0.5)
  const whites = Math.round(clamp((242 - hi) / 1.1, -60, 60))
  const blacks = Math.round(clamp(-(lo - 10) / 0.9, -60, 60))
  const exp = Math.round(clamp((118 - mid) / 2.2, -40, 40))
  return { exp, whites, blacks }
}
