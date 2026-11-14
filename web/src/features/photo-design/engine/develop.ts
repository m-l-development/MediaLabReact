/**
 * Avansert framkalling i Photo Design (bare i Avansert modus). Funksjonene er inspirert av framkallingen i LightCraft
 * (hvit-/svartpunkt, vibrance, klarhet, skarphet, auto-tone, histogram), men skrevet selvstendig for MediaLabReact:
 * ingen kode fra LightCraft er brukt. Kjøres etter de vanlige justeringene (`Adj`) og bare når bildelaget har `dev`,
 * så bilder uten avansert framkalling gir nøyaktig samme resultat som før.
 */

export interface DevBase {
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
  /** Tekstur −100…100: lokal kontrast i fine detaljer (liten radius), uten å røre de store formene. */
  texture?: number
  /** Støyreduksjon 0…100: glatter lysstøy (kantbevarende) og fargestøy. */
  nr?: number
  /** Perspektiv −100…100: vertikal og horisontal trapeskorreksjon (bildet skaleres så kantene fylles). */
  pv?: number
  ph?: number
  /** Fargegradering: fargetone 0…360 og styrke 0…100 for skygger (gs…), mellomtoner (gm…) og høylys (gh…); balanse −100…100. */
  gsh?: number
  gss?: number
  gmh?: number
  gms?: number
  ghh?: number
  ghs?: number
  gbal?: number
  /** Lokale justeringer i lineære og radiale gradientmasker (maks 8). */
  loc?: LocalAdj[]
}

/** HSL per fargeområde (−100…100): fargetone (h…), metning (s…) og lyshet (l…) for hvert av de åtte områdene. */
export type HslKey = `${'h' | 's' | 'l'}${HslRange}`
export type Dev = DevBase & { [K in HslKey]?: number }

/** De åtte fargeområdene i HSL (midtpunkt i grader). */
export const HSL_RANGES = [['Red', 0], ['Orange', 30], ['Yellow', 60], ['Green', 120], ['Aqua', 180], ['Blue', 225], ['Purple', 270], ['Magenta', 315]] as const
export type HslRange = (typeof HSL_RANGES)[number][0]

/** Lokal justering: maske (lineær gradient eller radial/ellipse) + justeringer som bare virker innenfor masken. */
export interface LocalAdj {
  /** lin/rad = gradientmaske med justeringer; spot = flekkfjerning/kloning (kopierer fra kilden sx, sy med myk kant) */
  k: 'lin' | 'rad' | 'spot'
  /** kilde for flekkfjerning (0…1 i bildet) */
  sx?: number
  sy?: number
  /** av/på uten å slette */
  on: boolean
  /** midtpunkt 0…1 i bildet */
  x: number
  y: number
  /** størrelse 0,02…1 (lineær: overgangsbredde, radial: radius) */
  r: number
  /** vinkel i grader (lineær: retningen masken øker i; radial: rotasjon av ellipsen) */
  a: number
  /** myk kant 0…1 (radial) */
  f: number
  /** snu masken */
  inv: boolean
  /** justeringer −100…100 */
  exp: number
  con: number
  sat: number
  temp: number
}

export const LOC: Omit<LocalAdj, 'k'> = { on: true, x: 0.5, y: 0.5, r: 0.35, a: 90, f: 0.5, inv: false, exp: 0, con: 0, sat: 0, temp: 0 }

/** Alle tallfelt i Dev med gyldig område. */
export type DevKey = Exclude<keyof Dev, 'loc'>
const RANGE: Record<string, [number, number]> = { whites: [-100, 100], blacks: [-100, 100], vib: [-100, 100], clarity: [-100, 100], sharp: [0, 100], texture: [-100, 100], nr: [0, 100], pv: [-100, 100], ph: [-100, 100], gsh: [0, 360], gss: [0, 100], gmh: [0, 360], gms: [0, 100], ghh: [0, 360], ghs: [0, 100], gbal: [-100, 100] }
for (const [n] of HSL_RANGES) for (const p of 'hsl') RANGE[p + n] = [-100, 100]
export const devRange = (k: DevKey): [number, number] => RANGE[k] ?? [-100, 100]

export const DEV: Dev = { whites: 0, blacks: 0, vib: 0, clarity: 0, sharp: 0 }
const KEYS = Object.keys(RANGE) as DevKey[]
/** Felt som bare er fargetoner (gjør ingenting alene; styrken avgjør). */
const HUE = new Set(['gsh', 'gmh', 'ghh'])

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v)

/** Gyldig, avgrenset Dev fra lagrede data (ukjente felt og tall utenfor området ignoreres). */
export function cleanDev(v: unknown): Dev | null {
  if (!v || typeof v !== 'object') return null
  const o = v as Record<string, unknown>
  const out: Dev = { ...DEV }
  for (const k of KEYS) {
    const n = Number(o[k])
    if (!Number.isFinite(n)) continue
    const [lo, hi] = RANGE[k]!
    const v = clamp(n, lo, hi)
    // valgfrie felt lagres bare når de gjør noe (eldre prosjekter og nøkler forblir like)
    if (v || k in DEV) (out as unknown as Record<string, number>)[k] = v
  }
  const loc = cleanLoc(o.loc)
  if (loc) out.loc = loc
  return devNeutral(out) ? null : out
}

function cleanLoc(v: unknown): LocalAdj[] | null {
  if (!Array.isArray(v)) return null
  const out: LocalAdj[] = []
  for (const q of v.slice(0, 8)) {
    if (!q || typeof q !== 'object') continue
    const o = q as Record<string, unknown>
    const num = (k: keyof typeof LOC, lo: number, hi: number) => { const n = Number(o[k]); return Number.isFinite(n) ? clamp(n, lo, hi) : (LOC[k] as number) }
    const sp = o.k === 'spot'
    const n01 = (v: unknown, d: number) => { const n = Number(v); return v != null && Number.isFinite(n) ? clamp(n, 0, 1) : d }
    out.push({ ...(sp ? { sx: n01(o.sx, 0.6), sy: n01(o.sy, 0.5) } : {}), k: o.k === 'lin' ? 'lin' : sp ? 'spot' : 'rad', on: o.on !== false, x: num('x', -0.5, 1.5), y: num('y', -0.5, 1.5), r: num('r', 0.02, 1.5), a: num('a', -360, 360), f: num('f', 0, 1), inv: o.inv === true, exp: num('exp', -100, 100), con: num('con', -100, 100), sat: num('sat', -100, 100), temp: num('temp', -100, 100) })
  }
  return out.length ? out : null
}

const valOf = (d: Dev, k: DevKey): number => Number(d[k] ?? 0) || 0
const gradOn = (d: Dev) => !!(valOf(d, 'gss') || valOf(d, 'gms') || valOf(d, 'ghs') || valOf(d, 'gbal'))
export const devNeutral = (d: Dev | null | undefined): boolean => !d || (KEYS.every((k) => HUE.has(k) || !valOf(d, k)) && !d.loc?.length)

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

/** Perspektivkorreksjon (trapes) med bilineær sampling; skalerer opp så hele flaten fylles. */
function perspective(img: ImageData, pv: number, ph: number): void {
  const { data: px, width: W, height: H } = img
  const src = new Uint8ClampedArray(px)
  const kv = (pv / 100) * 0.45, kh = (ph / 100) * 0.45
  // radens (kolonnens) skala: >1 trekker ut, <1 trekker inn; z holder alle samplinger innenfor bildet
  const z = Math.min(1 - Math.abs(kv) / 2, 1 - Math.abs(kh) / 2)
  for (let y = 0; y < H; y++) {
    const v = (y + 0.5) / H
    const sv = 1 + kv * (0.5 - v)
    for (let x = 0; x < W; x++) {
      const u = (x + 0.5) / W
      const sh = 1 + kh * (0.5 - u)
      const fx = ((u - 0.5) * z) / sv + 0.5, fy = ((v - 0.5) * z) / sh + 0.5
      const X = clamp(fx * W - 0.5, 0, W - 1), Y = clamp(fy * H - 0.5, 0, H - 1)
      const x0 = Math.floor(X), y0 = Math.floor(Y), x1 = Math.min(W - 1, x0 + 1), y1 = Math.min(H - 1, y0 + 1)
      const tx = X - x0, ty = Y - y0
      const o = (y * W + x) * 4, p00 = (y0 * W + x0) * 4, p10 = (y0 * W + x1) * 4, p01 = (y1 * W + x0) * 4, p11 = (y1 * W + x1) * 4
      for (let c = 0; c < 4; c++) {
        const t = src[p00 + c]! + (src[p10 + c]! - src[p00 + c]!) * tx
        const btm = src[p01 + c]! + (src[p11 + c]! - src[p01 + c]!) * tx
        px[o + c] = t + (btm - t) * ty
      }
    }
  }
}

/** Fargetone (grader) → retning i RGB med lyshet 0 (til fargegradering). */
function tint(h: number): [number, number, number] {
  const k = (n: number) => { const t = (n + h / 30) % 12; return 0.5 - 0.5 * Math.max(-1, Math.min(t - 3, 9 - t, 1)) }
  const r = k(0), g = k(8), b = k(4)
  const l = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return [r - l, g - l, b - l]
}

const smooth = (e0: number, e1: number, x: number) => { const t = clamp((x - e0) / (e1 - e0 || 1e-6), 0, 1); return t * t * (3 - 2 * t) }

/**
 * Flekkfjerning/kloning: sirkel rundt (x, y) med radius r (andel av bildets korteste side) erstattes av området rundt
 * kilden (sx, sy), med myk kant f. Fargenivået tilpasses omgivelsene (gjennomsnittsforskjellen langs kanten trekkes fra),
 * så lappen ikke blir en flekk selv.
 */
function spot(img: ImageData, m: LocalAdj): void {
  const { data: px, width: W, height: H } = img
  const R = Math.max(1, m.r * Math.min(W, H) * 0.25)
  const cx = m.x * W, cy = m.y * H, dx = Math.round(((m.sx ?? 0.6) - m.x) * W), dy = Math.round(((m.sy ?? 0.5) - m.y) * H)
  const src = new Uint8ClampedArray(px)
  // fargeforskjell mellom mål og kilde langs kanten (heal)
  const off = [0, 0, 0]
  let n = 0
  for (let a = 0; a < 32; a++) {
    const t = (a / 32) * Math.PI * 2, x = Math.round(cx + Math.cos(t) * R), y = Math.round(cy + Math.sin(t) * R)
    const x2 = x + dx, y2 = y + dy
    if (x < 0 || y < 0 || x >= W || y >= H || x2 < 0 || y2 < 0 || x2 >= W || y2 >= H) continue
    const p = (y * W + x) * 4, q = (y2 * W + x2) * 4
    for (let c = 0; c < 3; c++) off[c]! += src[p + c]! - src[q + c]!
    n++
  }
  if (n) for (let c = 0; c < 3; c++) off[c]! /= n
  const f = Math.max(0.05, m.f)
  for (let y = Math.max(0, Math.floor(cy - R)); y <= Math.min(H - 1, Math.ceil(cy + R)); y++) {
    for (let x = Math.max(0, Math.floor(cx - R)); x <= Math.min(W - 1, Math.ceil(cx + R)); x++) {
      const d = Math.hypot(x - cx, y - cy) / R
      if (d >= 1) continue
      const x2 = clamp(x + dx, 0, W - 1), y2 = clamp(y + dy, 0, H - 1)
      const w = 1 - smooth(1 - f, 1, d)
      const p = (y * W + x) * 4, q = (y2 * W + x2) * 4
      for (let c = 0; c < 3; c++) px[p + c] = src[p + c]! + (src[q + c]! + off[c]! - src[p + c]!) * w
    }
  }
}

/** Vekt 0…1 for en lokal maske i punkt (u, v) (0…1); sideforholdet tas med så sirkler blir runde. */
export function locWeight(m: LocalAdj, u: number, v: number, asp: number): number {
  const dx = (u - m.x) * asp, dy = v - m.y
  const rad = (m.a * Math.PI) / 180
  let w: number
  if (m.k === 'lin') {
    // a = retningen masken øker i (90 = nedover); r = overgangens bredde
    const t = dx * Math.cos(rad) + dy * Math.sin(rad)
    w = smooth(-m.r / 2, m.r / 2, t)
  } else {
    const c = Math.cos(rad), sn = Math.sin(rad)
    const ex = (dx * c + dy * sn) / m.r, ey = (-dx * sn + dy * c) / (m.r * 0.7)
    const d = Math.sqrt(ex * ex + ey * ey)
    w = 1 - smooth(1 - Math.max(0.02, m.f), 1, d)
  }
  return m.inv ? 1 - w : w
}

/** Bruker avansert framkalling på bildedataene (endrer dem). */
export function applyDev(img: ImageData, d: Dev): void {
  if (devNeutral(d)) return
  const pv = valOf(d, 'pv'), ph = valOf(d, 'ph')
  if (pv || ph) perspective(img, pv, ph)
  for (const m of d.loc ?? []) if (m.k === 'spot' && m.on) spot(img, m)
  const { data: px, width: W, height: H } = img
  const N = W * H
  const lut = d.whites || d.blacks ? toneLut(d) : null
  // luminans før lokale operasjoner (klarhet/skarphet virker på lysheten, så fargene ikke forskyves)
  const lum = new Float32Array(N)
  for (let i = 0, p = 0; i < N; i++, p += 4) {
    if (lut) { px[p] = lut[px[p]!]!; px[p + 1] = lut[px[p + 1]!]!; px[p + 2] = lut[px[p + 2]!]! }
    lum[i] = 0.2126 * px[p]! + 0.7152 * px[p + 1]! + 0.0722 * px[p + 2]!
  }
  const local = (r: number, src = lum) => boxBlur(boxBlur(src, W, H, r), W, H, r) // tilnærmet gaussisk
  const side = Math.max(W, H)
  // støyreduksjon: kantbevarende glatting av lysheten + uskarp fargeforskjell (krominans)
  const nr = valOf(d, 'nr') / 100
  if (nr) {
    const sm = local(Math.max(1, Math.round(side * 0.0015 * (1 + nr))))
    const sig = 4 + 22 * nr
    const cr = new Float32Array(N), cb = new Float32Array(N)
    for (let i = 0, p = 0; i < N; i++, p += 4) { cr[i] = px[p]! - lum[i]!; cb[i] = px[p + 2]! - lum[i]! }
    const cR = Math.max(1, Math.round(side * 0.004 * nr))
    const crS = local(cR, cr), cbS = local(cR, cb)
    for (let i = 0, p = 0; i < N; i++, p += 4) {
      const L0 = lum[i]!, dd = sm[i]! - L0
      const L1 = L0 + dd * nr * Math.exp(-(dd * dd) / (sig * sig))
      const r = L1 + cr[i]! + (crS[i]! - cr[i]!) * nr, b = L1 + cb[i]! + (cbS[i]! - cb[i]!) * nr
      // grønn ut fra lysheten (bevarer Y)
      const g = (L1 - 0.2126 * r - 0.0722 * b) / 0.7152
      px[p] = r; px[p + 1] = g; px[p + 2] = b
      lum[i] = 0.2126 * px[p]! + 0.7152 * px[p + 1]! + 0.0722 * px[p + 2]!
    }
  }
  const texture = valOf(d, 'texture') / 100
  const clar = d.clarity ? local(Math.max(2, Math.round(side * 0.012))) : null
  const tex = texture ? local(Math.max(1, Math.round(side * 0.003))) : null
  const det = d.sharp ? local(1) : null
  const vib = d.vib / 100
  // HSL per område og fargegradering
  const hsl = HSL_RANGES.map(([n, c]) => [c, valOf(d, `h${n}`) / 100, valOf(d, `s${n}`) / 100, valOf(d, `l${n}`) / 100] as const)
  const hslOn = hsl.some(([, a, b, c]) => a || b || c)
  const grade = gradOn(d)
  const gS = tint(valOf(d, 'gsh')), gM = tint(valOf(d, 'gmh')), gH = tint(valOf(d, 'ghh'))
  const kS = valOf(d, 'gss') * 0.5, kM = valOf(d, 'gms') * 0.4, kH = valOf(d, 'ghs') * 0.5, bal = valOf(d, 'gbal') / 100
  const loc = (d.loc ?? []).filter((m) => m.k !== 'spot' && m.on && (m.exp || m.con || m.sat || m.temp))
  const asp = W / H
  for (let i = 0, p = 0; i < N; i++, p += 4) {
    let r = px[p]!, g = px[p + 1]!, b = px[p + 2]!
    const L = lum[i]!
    let dl = 0
    if (clar) {
      const mid = 1 - Math.abs(L / 127.5 - 1) // mest i mellomtonene
      dl += (L - clar[i]!) * (d.clarity / 100) * 0.9 * mid
    }
    if (tex) dl += (L - tex[i]!) * texture * 1.2
    if (det) dl += (L - det[i]!) * (d.sharp / 100) * 1.6
    if (dl) { r += dl; g += dl; b += dl }
    if (vib) {
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b), sat = mx > 0 ? (mx - mn) / mx : 0
      const skin = r > g && g > b ? 0.5 : 1 // skån varme hudtoner noe
      const k = 1 + vib * (1 - sat) * skin * (vib > 0 ? 1.2 : 1)
      const avg = (r + g + b) / 3
      r = avg + (r - avg) * k; g = avg + (g - avg) * k; b = avg + (b - avg) * k
    }
    if (hslOn) [r, g, b] = hslAdjust(r, g, b, hsl)
    if (grade) {
      const l = clamp((0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 - bal * 0.25, 0, 1)
      const ws = (1 - l) * (1 - l), wh = l * l, wm = Math.max(0, 1 - ws - wh)
      r += gS[0] * kS * ws + gM[0] * kM * wm + gH[0] * kH * wh
      g += gS[1] * kS * ws + gM[1] * kM * wm + gH[1] * kH * wh
      b += gS[2] * kS * ws + gM[2] * kM * wm + gH[2] * kH * wh
    }
    if (loc.length) {
      const u = ((i % W) + 0.5) / W, v = (Math.floor(i / W) + 0.5) / H
      for (const m of loc) {
        const w = locWeight(m, u, v, asp)
        if (w < 0.002) continue
        if (m.exp) { const k = 2 ** ((m.exp / 100) * 1.5 * w); r *= k; g *= k; b *= k }
        if (m.con) { const k = 1 + (m.con / 100) * 0.6 * w; r = 128 + (r - 128) * k; g = 128 + (g - 128) * k; b = 128 + (b - 128) * k }
        if (m.sat) { const y = 0.2126 * r + 0.7152 * g + 0.0722 * b, k = 1 + (m.sat / 100) * w; r = y + (r - y) * k; g = y + (g - y) * k; b = y + (b - y) * k }
        if (m.temp) { const t = (m.temp / 100) * 40 * w; r += t; b -= t }
      }
    }
    px[p] = r; px[p + 1] = g; px[p + 2] = b
  }
}

/** HSL-justering per fargeområde (myk overgang mellom nabofarger, ingen effekt på grått). */
function hslAdjust(r: number, g: number, b: number, rs: readonly (readonly [number, number, number, number])[]): [number, number, number] {
  r = clamp(r, 0, 255) / 255; g = clamp(g, 0, 255) / 255; b = clamp(b, 0, 255) / 255
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, dd = mx - mn
  if (dd < 1e-4) return [r * 255, g * 255, b * 255]
  const s = l > 0.5 ? dd / (2 - mx - mn) : dd / (mx + mn)
  let h = mx === r ? ((g - b) / dd) % 6 : mx === g ? (b - r) / dd + 2 : (r - g) / dd + 4
  h = (h * 60 + 360) % 360
  let dh = 0, ds = 0, dl = 0
  for (const [c, a, bb, cc] of rs) {
    if (!a && !bb && !cc) continue
    let dist = Math.abs(h - c)
    if (dist > 180) dist = 360 - dist
    const w = Math.max(0, 1 - dist / 45)
    if (!w) continue
    dh += a * 30 * w; ds += bb * w; dl += cc * w
  }
  const H2 = (h + dh + 360) % 360
  const S2 = clamp(s * (1 + ds), 0, 1)
  const L2 = clamp(l + dl * 0.25 * s, 0, 1)
  const q = L2 < 0.5 ? L2 * (1 + S2) : L2 + S2 - L2 * S2, p = 2 * L2 - q
  const hue = (t: number) => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p }
  const x = H2 / 360
  return [hue(x + 1 / 3) * 255, hue(x) * 255, hue(x - 1 / 3) * 255]
}

/**
 * HDR-sammenslåing (eksponeringsfusjon, etter Mertens m.fl.): bilder av samme motiv med ulik eksponering vektes per
 * piksel etter godt eksponert lyshet, metning og lokal kontrast; vektene glattes for å unngå skjøter. Alle bildene må ha
 * samme størrelse (kalleren skalerer dem). Resultatet er et vanlig 8-bits bilde.
 */
export type Px = { data: Uint8ClampedArray<ArrayBuffer>; width: number; height: number }
export function hdrMerge(imgs: Px[]): Px {
  const W = imgs[0]!.width, H = imgs[0]!.height, N = W * H
  const ws = imgs.map((im) => {
    const px = im.data, lum = new Float32Array(N), w = new Float32Array(N)
    for (let i = 0, p = 0; i < N; i++, p += 4) lum[i] = (0.2126 * px[p]! + 0.7152 * px[p + 1]! + 0.0722 * px[p + 2]!) / 255
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, p = i * 4
      const lap = Math.abs(4 * lum[i]! - lum[y * W + Math.max(0, x - 1)]! - lum[y * W + Math.min(W - 1, x + 1)]! - lum[Math.max(0, y - 1) * W + x]! - lum[Math.min(H - 1, y + 1) * W + x]!)
      const r = px[p]! / 255, g = px[p + 1]! / 255, b = px[p + 2]! / 255, m = (r + g + b) / 3
      const sat = Math.sqrt(((r - m) ** 2 + (g - m) ** 2 + (b - m) ** 2) / 3)
      const we = Math.exp(-((r - 0.5) ** 2) / 0.08) * Math.exp(-((g - 0.5) ** 2) / 0.08) * Math.exp(-((b - 0.5) ** 2) / 0.08)
      w[i] = (lap + 0.02) * (sat + 0.05) * (we + 1e-4)
    }
    const r = Math.max(2, Math.round(Math.max(W, H) * 0.01))
    return boxBlur(boxBlur(w, W, H, r), W, H, r)
  })
  const out: Px = { data: new Uint8ClampedArray(N * 4), width: W, height: H }
  for (let i = 0, p = 0; i < N; i++, p += 4) {
    let sum = 0
    for (const w of ws) sum += w[i]!
    let r = 0, g = 0, b = 0
    for (let k = 0; k < imgs.length; k++) {
      const w = sum > 0 ? ws[k]![i]! / sum : 1 / imgs.length, px = imgs[k]!.data
      r += px[p]! * w; g += px[p + 1]! * w; b += px[p + 2]! * w
    }
    out.data[p] = r; out.data[p + 1] = g; out.data[p + 2] = b; out.data[p + 3] = 255
  }
  return out
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
