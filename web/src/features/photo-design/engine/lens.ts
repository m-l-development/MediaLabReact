/**
 * Objektivkorreksjon (avansert framkalling i Photo Design): fortegning (tønne/pute), kromatisk aberrasjon (rød/cyan og
 * blå/gul fargekanter mot hjørnene) og vignettering (mørke hjørner). Alt er radialt fra bildets midte og uavhengig av
 * oppløsningen (forhåndsvisning og eksport gir samme resultat).
 *
 * Modell: for et punkt i det korrigerte bildet med radius r (andel av halve diagonalen) hentes fargen i originalen fra
 * radius r · (1 + k · r²) – grønn kanal; rød og blå i tillegg skalert med sin egen faktor (aberrasjonen). Bildet skaleres så
 * hele flaten fylles (ingen tomme hjørner), som ved perspektivkorreksjonen.
 *
 * «Auto» finner aberrasjonen (skalaen for rød og blå som legger kantene best oppå de grønne) og vignetteringen (lysfallet
 * mot hjørnene). Fortegning krever objektivprofiler og stilles inn for hånd.
 */

export interface LensOpts {
  /** Fortegning −100…100: positiv retter opp tønne (buede linjer utover), negativ retter opp pute. */
  dist: number
  /** Kromatisk aberrasjon −100…100 for rød (cyan) og blå (gul) kant. */
  car: number
  cab: number
  /** Vignettering −100…100: positiv lysner hjørnene, negativ mørkner dem; midtpunkt 0…100 (hvor langt ut den begynner). */
  vig: number
  vigm: number
}

export const LENS_K = 0.35
export const CA_K = 0.004

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v)

/** Vignetteringens forsterkning i radius r (0 = midten, 1 = hjørnet). */
export function vigGain(r: number, vig: number, vigm: number): number {
  if (!vig) return 1
  const m = clamp(vigm / 100, 0, 0.95) * 0.8
  const t = clamp((r - m) / (1 - m), 0, 1)
  const a = vig / 100
  // positiv: opptil 2,5 × lysere i hjørnet; negativ: ned til 0,3 ×
  return a >= 0 ? 1 + a * 1.5 * t * t : 1 + a * 0.7 * t * t
}

/** Bruker objektivkorreksjonen på bildedataene (endrer dem). */
export function applyLens(img: { data: Uint8ClampedArray; width: number; height: number }, o: LensOpts): void {
  const { data: px, width: W, height: H } = img
  if (!o.dist && !o.car && !o.cab && !o.vig) return
  const geo = !!(o.dist || o.car || o.cab)
  const src = geo ? new Uint8ClampedArray(px) : px
  const cx = W / 2, cy = H / 2, R = Math.hypot(cx, cy)
  const k = -(o.dist / 100) * LENS_K
  const sR = 1 + (o.car / 100) * CA_K, sB = 1 + (o.cab / 100) * CA_K
  // skala z (forstørrelse) som holder alle samplinger innenfor bildet, så kantene fylles: kilden for et punkt q
  // (normalisert) er q · z · (1 + k · z² · |q|²), og rød/blå i tillegg skalert. Største z som holder hele kanten innenfor.
  const reach = (z: number) => {
    let mx = 0
    const chk = (x: number, y: number) => {
      const u = ((x - cx) / R) * z, v = ((y - cy) / R) * z
      const f = (1 + k * (u * u + v * v)) * Math.max(sR, sB, 1)
      mx = Math.max(mx, Math.abs(u * f * R) / cx, Math.abs(v * f * R) / cy)
    }
    for (let i = 0; i <= 64; i++) {
      const t = i / 64
      chk(t * W, 0); chk(t * W, H); chk(0, t * H); chk(W, t * H)
    }
    return mx
  }
  let z = 1
  if (geo) {
    let lo = 0.2, hi = 3
    for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (reach(m) <= 1) lo = m; else hi = m }
    z = lo
  }
  const samp = (X: number, Y: number, c: number) => {
    X = clamp(X, 0, W - 1); Y = clamp(Y, 0, H - 1)
    const x0 = Math.floor(X), y0 = Math.floor(Y), x1 = Math.min(W - 1, x0 + 1), y1 = Math.min(H - 1, y0 + 1)
    const tx = X - x0, ty = Y - y0
    const a = src[(y0 * W + x0) * 4 + c]!, b = src[(y0 * W + x1) * 4 + c]!, d = src[(y1 * W + x0) * 4 + c]!, e = src[(y1 * W + x1) * 4 + c]!
    return (a + (b - a) * tx) * (1 - ty) + (d + (e - d) * tx) * ty
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const dx = x + 0.5 - cx, dy = y + 0.5 - cy
    const u = dx / R, v = dy / R, r2 = u * u + v * v
    const o4 = (y * W + x) * 4
    if (geo) {
      const f = (1 + k * r2 * z * z) * z
      const gx = cx + dx * f - 0.5, gy = cy + dy * f - 0.5
      px[o4] = samp(cx + dx * f * sR - 0.5, cy + dy * f * sR - 0.5, 0)
      px[o4 + 1] = samp(gx, gy, 1)
      px[o4 + 2] = samp(cx + dx * f * sB - 0.5, cy + dy * f * sB - 0.5, 2)
      px[o4 + 3] = samp(gx, gy, 3)
    }
    if (o.vig) {
      // vignetteringen er objektivets: regnes i originalens radius
      const g = vigGain(Math.sqrt(r2) * (geo ? z * (1 + k * r2 * z * z) : 1), o.vig, o.vigm)
      px[o4] = px[o4]! * g
      px[o4 + 1] = px[o4 + 1]! * g
      px[o4 + 2] = px[o4 + 2]! * g
    }
  }
}

/** Kantstyrke (gradient) for én kanal, nedskalert. */
function edges(img: { data: Uint8ClampedArray; width: number; height: number }, c: number): Float32Array {
  const { data, width: W, height: H } = img
  const g = new Float32Array(W * H)
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x
    const gx = data[(i + 1) * 4 + c]! - data[(i - 1) * 4 + c]!
    const gy = data[(i + W) * 4 + c]! - data[(i - W) * 4 + c]!
    g[i] = gx * gx + gy * gy
  }
  return g
}

/**
 * Automatisk: aberrasjonen (rød og blå skala som legger kantene best oppå de grønne i ytre del av bildet) og vignetteringen
 * (lysfallet i ytterste ring mot midten, robust median). Gir sliderverdier.
 */
export function autoLens(img: { data: Uint8ClampedArray; width: number; height: number }): { car: number; cab: number; vig: number; vigm: number } {
  const { data, width: W, height: H } = img
  const cx = W / 2, cy = H / 2, R = Math.hypot(cx, cy)
  const eg = edges(img, 1)
  // ytre ring, sterke grønne kanter (prøvepunkter)
  const pts: number[] = []
  let thr = 0
  {
    const v: number[] = []
    for (let i = 0; i < eg.length; i += 7) if (eg[i]! > 0) v.push(eg[i]!)
    v.sort((a, b) => a - b)
    thr = v[Math.floor(v.length * 0.9)] ?? 0
  }
  for (let y = 2; y < H - 2; y += 2) for (let x = 2; x < W - 2; x += 2) {
    const r = Math.hypot(x - cx, y - cy) / R
    if (r > 0.45 && eg[y * W + x]! >= thr && thr > 0) pts.push(x, y)
  }
  // aberrasjon: kanalen samplet i skalert posisjon skal ligne grønn rundt kantene (lineær tilpasning – tåler fargede
  // motiver); minste kvadraters avvik, grovt (steg 4) og så fint (steg 1)
  const samp = (X: number, Y: number, c: number) => {
    const x0 = Math.floor(X), y0 = Math.floor(Y), tx = X - x0, ty = Y - y0, i0 = (y0 * W + x0) * 4 + c
    return (data[i0]! * (1 - tx) + data[i0 + 4]! * tx) * (1 - ty) + (data[i0 + W * 4]! * (1 - tx) + data[i0 + W * 4 + 4]! * tx) * ty
  }
  const fit = (c: number): number => {
    if (pts.length < 40) return 0
    const score = (s: number) => {
      const sc = 1 + (s / 100) * CA_K
      let n = 0, sg = 0, sv = 0, sgg = 0, sgv = 0, svv = 0
      for (let i = 0; i < pts.length; i += 2) {
        const x = pts[i]!, y = pts[i + 1]!
        const X = cx + (x - cx) * sc, Y = cy + (y - cy) * sc
        if (X < 1 || Y < 1 || X >= W - 2 || Y >= H - 2) continue
        // et lite kors rundt punktet (kanten har bredde)
        for (const [ox, oy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          const g = data[((y + oy) * W + x + ox) * 4 + 1]!, v = samp(X + ox, Y + oy, c)
          n++; sg += g; sv += v; sgg += g * g; sgv += g * v; svv += v * v
        }
      }
      if (n < 10) return Infinity
      // restavvik etter beste v ≈ a·g + b
      const vg = sgg - (sg * sg) / n, cgv = sgv - (sg * sv) / n, vv = svv - (sv * sv) / n
      return vg > 0 ? (vv - (cgv * cgv) / vg) / n : Infinity
    }
    let best = 0, bestS = Infinity
    for (let s = -100; s <= 100; s += 4) { const v = score(s); if (v < bestS) { bestS = v; best = s } }
    const c0 = best
    for (let s = Math.max(-100, c0 - 4); s <= Math.min(100, c0 + 4); s++) { const v = score(s); if (v < bestS) { bestS = v; best = s } }
    return best
  }
  // vignettering: median lysstyrke i ytterste ring mot midten
  const ring = (lo: number, hi: number) => {
    const v: number[] = []
    for (let y = 0; y < H; y += 3) for (let x = 0; x < W; x += 3) {
      const r = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / R
      if (r < lo || r >= hi) continue
      const p = (y * W + x) * 4
      v.push(0.2126 * data[p]! + 0.7152 * data[p + 1]! + 0.0722 * data[p + 2]!)
    }
    v.sort((a, b) => a - b)
    return v[Math.floor(v.length / 2)] ?? 0
  }
  const mid = ring(0, 0.3), edge = ring(0.85, 1.01)
  let vig = 0
  if (mid > 20 && edge > 2 && edge < mid * 0.92) {
    // forsterkningen som trengs i ytterste ring (r ≈ 0,92: t² ≈ 0,75 ved midtpunkt 50) → slider
    const need = mid / edge
    vig = clamp(Math.round(((need - 1) / (1.5 * 0.75)) * 100), 0, 80)
  }
  return { car: fit(0), cab: fit(2), vig, vigm: 50 }
}
