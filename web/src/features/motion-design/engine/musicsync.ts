/**
 * Music Sync – felles, adaptiv timing for alle Motion-maler.
 *
 * 1) analyse(): musikkens oppbygning fra lyddata (ikke bare BPM): onset-styrke i tre frekvensbånd, taktslag med lokalt
 *    tempo (følger tempoendringer), taktslagenes styrke og første slag i takten, intensitet over tid, pauser, «drops»
 *    (kraftig økning etter roligere parti) og strukturskifter.
 * 2) syncProject(): malens tid avbildes på musikkens tid. Malen er laget i et kjent tempo (Project.tempo); malens
 *    taktslag k går til musikkens taktslag k (stykkevis lineært), så kutt, overganger, tekster, keyframes, forsinkelser,
 *    overlegg og effekter følger sangen – også når tempoet endrer seg – uten at designet endres. Malens bevegelsesprofil
 *    (filmatisk, dynamisk, minimal, typografisk) bestemmer hvordan montasjen reagerer på intensitet, drops og pauser.
 *    Resultatet er vanlige, redigerbare verdier; originalen lagres så synkroniseringen kan slås av eller brukes på nytt.
 *
 * Ren TypeScript uten nettleser-API (lyden dekodes i audio.ts), så alt kan testes med syntetisk musikk.
 */

/* ---------------- analyse ---------------- */

export interface MusicEvent { t: number; kind: 'drop' | 'pause' | 'section'; w: number }
/** Del av sangen: intro, vers, oppbygging, refreng/høy, drop, pause (break), avslutning. Tider i s, slag som indekser. */
export type SectionKind = 'intro' | 'verse' | 'build' | 'high' | 'drop' | 'break' | 'outro'
export interface Section { t0: number; t1: number; b0: number; b1: number; kind: SectionKind; energy: number }
export interface MusicMap {
  dur: number
  /** taktslag (s) og styrke 0…1 */
  beats: number[]
  strength: number[]
  /** indeks i beats for første slag i hver takt (4/4) */
  downbeats: number[]
  /** gjennomsnittlig tempo og tempo per taktslag (lokalt) */
  bpm: number
  localBpm: number[]
  /** intensitet 0…1 per taktslag (lydstyrke + onset-tetthet) */
  energy: number[]
  events: MusicEvent[]
  /** hvor tydelig pulsen er (0 = ingen fast takt, f.eks. filmmusikk/ambient; 1 = tydelig trommetakt) */
  pulse?: number
  /** sangens deler (seksjoner) fra lyden */
  sections?: Section[]
  /** tidspunktet for sangens klimaks (starten på det kraftigste partiet), s */
  climax?: number
}

/** vindu ≈ 11,6 ms uansett samplingsfrekvens (512 ved 44,1 kHz, 256 ved 22,05 kHz) – samme analyse uansett kilde */
const hopOf = (sr: number) => Math.max(64, Math.round(sr / 86.13))

/** Energi i tre bånd per vindu (enkle IIR-filtre: lav < 200 Hz, mid, høy > 2,5 kHz) og onset-styrke (positiv fluks). */
export function envelope(x: Float32Array, sr: number): { onset: Float32Array; rms: Float32Array; low: Float32Array; lowOn: Float32Array; high: Float32Array; fps: number } {
  const HOP = hopOf(sr)
  const n = Math.floor(x.length / HOP)
  const onset = new Float32Array(n)
  const rms = new Float32Array(n)
  const low = new Float32Array(n)
  const lowOn = new Float32Array(n)
  const high = new Float32Array(n)
  const aL = Math.exp((-2 * Math.PI * 200) / sr)
  const aH = Math.exp((-2 * Math.PI * 2500) / sr)
  let lp = 0, lp2 = 0
  const prev = [0, 0, 0]
  for (let i = 0; i < n; i++) {
    let eL = 0, eM = 0, eH = 0, e = 0
    for (let j = 0; j < HOP; j++) {
      const v = x[i * HOP + j] ?? 0
      lp = aL * lp + (1 - aL) * v
      lp2 = aH * lp2 + (1 - aH) * v
      const lo = lp, hi = v - lp2, mid = lp2 - lp
      eL += lo * lo
      eM += mid * mid
      eH += hi * hi
      e += v * v
    }
    const bands = [Math.log(1e-7 + eL), Math.log(1e-7 + eM), Math.log(1e-7 + eH)]
    let f = 0
    for (let b = 0; b < 3; b++) {
      f += Math.max(0, (bands[b] as number) - (prev[b] as number)) * (b === 0 ? 1.4 : 1)
      if (b === 0) lowOn[i] = i ? Math.max(0, (bands[0] as number) - (prev[0] as number)) : 0
      prev[b] = bands[b] as number
    }
    onset[i] = i ? f : 0
    rms[i] = Math.sqrt(e / HOP)
    low[i] = Math.sqrt(eL / HOP)
    high[i] = Math.sqrt(eH / HOP)
  }
  return { onset, rms, low, lowOn, high, fps: sr / HOP }
}

/** Onset-kurven uten lokalt likevektsnivå og normalisert – bedre for autokorrelasjon og sporing. */
function prep(o: Float32Array, fps: number): Float32Array {
  const n = o.length, r = Math.max(1, Math.round(fps * 0.4))
  const out = new Float32Array(n)
  const cs = new Float64Array(n + 1)
  for (let i = 0; i < n; i++) cs[i + 1] = (cs[i] ?? 0) + (o[i] ?? 0)
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, i - r), b = Math.min(n, i + r + 1)
    out[i] = Math.max(0, (o[i] ?? 0) - ((cs[b] ?? 0) - (cs[a] ?? 0)) / (b - a))
  }
  let sd = 0
  for (let i = 0; i < n; i++) sd += (out[i] ?? 0) ** 2
  sd = Math.sqrt(sd / Math.max(1, n)) || 1
  for (let i = 0; i < n; i++) out[i] = (out[i] ?? 0) / sd
  return out
}

/** Autokorrelasjon for periodene lo…hi (vinduer) i utsnittet a…b, normalisert per par. */
function acf(o: Float32Array, a0: number, b0: number, lo0: number, hi0: number): Float64Array {
  // hele vinduer (et halvt vindu som start ga tomme oppslag – autokorrelasjon 0 – og feil tempo)
  const a = Math.max(0, Math.round(a0)), b = Math.min(o.length, Math.round(b0)), lo = Math.max(1, Math.floor(lo0)), hi = Math.ceil(hi0)
  const out = new Float64Array(hi + 2)
  for (let L = lo; L <= hi + 1; L++) {
    let c = 0
    for (let i = a + L; i < b; i++) c += (o[i] ?? 0) * (o[i - L] ?? 0)
    out[L] = c / Math.max(1, b - a - L)
  }
  return out
}

/** Beste taktperiode (vinduer) i et utsnitt av onset-kurven: autokorrelasjon (også dobbel periode) med vekt mot ≈ 115 BPM. */
export function period(o: Float32Array, a0: number, b0: number, fps: number): number {
  const a = Math.max(0, Math.round(a0)), b = Math.min(o.length, Math.round(b0))
  const lo = Math.floor((fps * 60) / 210), hi = Math.ceil((fps * 60) / 55)
  const ac = acf(o, a, b, lo, hi * 2)
  let best = -1, bl = 0
  for (let L = lo; L <= hi; L++) {
    const c = (ac[L] ?? 0) + 0.5 * (ac[L * 2] ?? 0)
    const bpm = (60 * fps) / L
    const w = Math.exp(-0.5 * Math.pow(Math.log2(bpm / 115) / 1.1, 2))
    if (c * w > best) { best = c * w; bl = L }
  }
  return bl || Math.round((fps * 60) / 120)
}

/**
 * Taktslag med dynamisk programmering (Ellis 2007): slagene velges så summen av onset-styrke på slagene er størst, med
 * straff (log²) for avvik fra forventet periode. Perioden kan drive lokalt (P(t)), men ikke hoppe til halv/dobbel takt.
 */
function dpBeats(o: Float32Array, P: Float32Array, tight = 80): number[] {
  const n = o.length
  if (n < 10) return []
  const score = new Float64Array(n), back = new Int32Array(n).fill(-1)
  for (let i = 0; i < n; i++) {
    const p = P[i] ?? 40
    const a = Math.max(0, Math.round(i - 2 * p)), b = Math.round(i - p / 2)
    let best = -Infinity, bj = -1
    for (let j = a; j <= b; j++) {
      const d = Math.log((i - j) / p)
      const v = (score[j] ?? 0) - tight * d * d
      if (v > best) { best = v; bj = j }
    }
    score[i] = (o[i] ?? 0) + (bj >= 0 ? Math.max(0, best) : 0)
    back[i] = bj >= 0 && best > 0 ? bj : -1
  }
  const pl = P[n - 1] ?? 40
  let end = n - 1, bv = -Infinity
  for (let i = Math.max(0, Math.round(n - pl)); i < n; i++) if ((score[i] ?? 0) > bv) { bv = score[i] ?? 0; end = i }
  const out: number[] = []
  for (let i = end; i >= 0; i = back[i] ?? -1) {
    out.unshift(i)
    if ((back[i] ?? -1) < 0) break
  }
  // før første slag: fyll bakover med lokal periode
  const p0 = P[out[0] ?? 0] ?? 40
  for (let t = (out[0] ?? 0) - p0; t >= -p0 * 0.25; t -= p0) out.unshift(Math.max(0, t))
  return out
}

/** Onset på slagene delt på onset midt mellom slagene (høy = slagene sitter på pulsen, ikke mellom). */
function contrast(o: Float32Array, beats: number[]): number {
  let on = 0, off = 0, n = 0
  const pk = (c: number) => Math.max(o[Math.round(c) - 1] ?? 0, o[Math.round(c)] ?? 0, o[Math.round(c) + 1] ?? 0)
  for (let k = 1; k < beats.length - 1; k++) {
    const b = beats[k] as number, m = (b + (beats[k + 1] as number)) / 2
    on += pk(b)
    off += pk(m)
    n++
  }
  return n ? on / Math.max(1e-6, off) : 0
}

/**
 * Tempo og taktslag: globalt tempo fra autokorrelasjonen, lokalt tempo i glidende vinduer begrenset til ±25 % av det
 * (ingen hopp til halv/dobbel takt), DP-sporing, og valg mellom P, P/2 og 2P etter hvor godt slagene sitter på pulsen
 * (slag mot mellomslag) og et mykt prior rundt 115 BPM. `pulse` = hvor tydelig takten er (0–1).
 */
function tempoBeats(o0: Float32Array, fps: number): { beats: number[]; pulse: number } {
  const o = prep(o0, fps)
  const n = o.length
  if (n < 50) return { beats: [], pulse: 0 }
  const P0 = period(o, 0, n, fps)
  const lo = Math.floor((fps * 60) / 210), hi = Math.ceil((fps * 60) / 55)
  const ac = acf(o, 0, n, lo, hi)
  let mx = 0
  for (let L = lo; L <= hi; L++) mx = Math.max(mx, ac[L] ?? 0)
  let z0 = 0
  for (let i = 0; i < n; i++) z0 += (o[i] ?? 0) ** 2
  z0 /= n
  const cand = [P0, P0 / 2, P0 * 2].filter((p) => p >= lo * 0.98 && p <= hi * 1.02)
  let best: { beats: number[]; s: number; c: number } | null = null
  for (const pg of cand) {
    // lokalt tempo i vinduer på 8 s: fin justering (±6 %) rundt kandidaten; en ekte tempoendring godtas bare når vinduets
    // eget tempo avviker mer enn 12 % og ikke er et metrisk forhold (½, ⅔, ¾, 4/3, 1½, 2 – f.eks. trap-hi-hat i 3/16)
    const win = Math.round(fps * 6), step = Math.round(fps * 1.5)
    const P = new Float32Array(n).fill(pg)
    const REL = [0.5, 2 / 3, 0.75, 4 / 3, 1.5, 2]
    // beste periode og styrke innenfor ±3 % av p i utsnittet
    const near = (a: number, b: number, p: number): [number, number] => {
      const L0 = Math.max(2, Math.floor(p * 0.97)), L1 = Math.ceil(p * 1.03)
      const w = acf(o, a, b, L0, L1)
      let bl = p, bv = -1
      for (let L = L0; L <= L1; L++) {
        const v = (w[L] ?? 0) * Math.exp(-0.5 * (Math.log(L / p) / 0.02) ** 2)
        if (v > bv) { bv = v; bl = L }
      }
      return [bl, bv]
    }
    // grunnpulsens styrke i hele sangen
    const [, vAll] = near(0, n, pg)
    const wins: { c: number; own: number; ok: boolean; bl: number }[] = []
    for (let c = 0; c < n; c += step) {
      const a = Math.max(0, c - win / 2), b = Math.min(n, c + win / 2)
      const own = period(o, a, b, fps)
      const r = own / pg
      const [blB, vB] = near(a, b, pg)
      const [blO, vO] = near(a, b, own)
      // en ekte tempoendring: avviker > 12 %, er ikke et metrisk forhold, grunnpulsen er svak her (< 60 % av hele
      // sangens), og den nye perioden er klart sterkere (synkoperte mønstre i en ellers fast takt gir ikke tempoendring)
      const ok = Math.abs(r - 1) > 0.12 && !REL.some((q) => Math.abs(r / q - 1) < 0.03) && vO > vB * 1.35 && vB < vAll * 0.6
      wins.push({ c, own: blO, ok, bl: blB })
    }
    wins.forEach((w, i) => {
      // bekreftet over tre vinduer (≥ 6 s) med omtrent samme tempo
      const same = (q: (typeof wins)[number] | undefined) => !!q?.ok && Math.abs(q.own / w.own - 1) < 0.08
      const conf = w.ok && ((same(wins[i - 1]) && same(wins[i + 1])) || (same(wins[i - 1]) && same(wins[i - 2])) || (same(wins[i + 1]) && same(wins[i + 2])))
      const v = conf ? w.own : w.bl
      for (let j = w.c; j < Math.min(n, w.c + step); j++) P[j] = v
    })
    // tempoet endrer seg jevnt: glatt perioden over ±1 s
    const Ps = new Float32Array(n)
    const r = Math.round(fps * 1)
    const cs = new Float64Array(n + 1)
    for (let i = 0; i < n; i++) cs[i + 1] = (cs[i] ?? 0) + (P[i] ?? pg)
    for (let i = 0; i < n; i++) { const a = Math.max(0, i - r), b = Math.min(n, i + r); Ps[i] = ((cs[b] ?? 0) - (cs[a] ?? 0)) / Math.max(1, b - a) }
    const beats = dpBeats(o, Ps)
    const bpm = (60 * fps) / pg
    const prior = Math.exp(-0.5 * Math.pow(Math.log2(bpm / 115) / 0.8, 2))
    const c = contrast(o, beats)
    const s = c * (0.55 + 0.45 * prior)
    // grunntempoet (autokorrelasjonen) beholdes når slagene sitter på pulsen; halv/dobbel takt bare når grunntempoets slag
    // tydelig ikke gjør det (ellers vant halv takt i musikk med kraftig stortromme på 1 og 3)
    if (!best) best = { beats, s, c }
    else if (best.c < 1.4 && c > best.c * 1.5) best = { beats, s, c }
  }
  const per = Math.max(0, Math.min(1, (mx / Math.max(1e-6, z0) - 0.05) / 0.35))
  const pulse = per * Math.min(1, Math.max(0, ((best?.c ?? 1) - 1) / 1.5))
  return { beats: (best?.beats ?? []).map((v) => v / fps), pulse }
}

/** Sangens deler fra trekk per takt (lydstyrke, onset-tetthet, lavt/høyt bånd): nyhetskurve → grenser → typer. */
function sectionsOf(beats: number[], downbeats: number[], energy: number[], feat: (a: number, b: number) => number[], dur: number): Section[] {
  const whole = (): Section[] => [{ t0: 0, t1: dur, b0: 0, b1: Math.max(0, beats.length - 1), kind: 'verse', energy: energy.length ? energy.reduce((a, b) => a + b, 0) / energy.length : 0.5 }]
  if (beats.length < 8) return whole()
  const bars = downbeats.length >= 3 ? downbeats : beats.map((_, i) => i).filter((i) => i % 4 === 0)
  const bt = bars.map((k) => beats[k] as number)
  const F = bt.map((t, i) => feat(t, bt[i + 1] ?? Math.min(dur, t + 2)))
  if (F.length < 4) return whole()
  const dist = (a: number[], b: number[]) => Math.sqrt(a.reduce((s, v, i) => s + (v - (b[i] ?? 0)) ** 2, 0))
  const mean = (i0: number, i1: number) => {
    const out = new Array<number>(F[0]?.length ?? 0).fill(0)
    let c = 0
    for (let i = Math.max(0, i0); i < Math.min(F.length, i1); i++) { F[i]!.forEach((v, j) => (out[j]! += v)); c++ }
    return c ? out.map((v) => v / c) : out
  }
  // nyhet ved hver takt: forskjellen mellom taktene før og etter (2 og 4 takter)
  const nov = F.map((_, i) => (i < 1 || i >= F.length - 1 ? 0 : Math.max(dist(mean(i - 4, i), mean(i, i + 4)), 0.85 * dist(mean(i - 2, i), mean(i, i + 2)))))
  const nm = [...nov].sort((a, b) => a - b)
  const thr = Math.max(0.12, (nm[Math.floor(nm.length * 0.6)] ?? 0) * 1.15)
  const cuts: number[] = [0]
  // korteste del ≈ 6 s (i takter, uansett tempo – også når takten er funnet i halvt tempo)
  const barDur = bt.length > 1 ? ((bt.at(-1) as number) - (bt[0] as number)) / (bt.length - 1) : 2
  const minBars = Math.max(2, Math.min(4, Math.round(6 / Math.max(0.5, barDur))))
  for (let i = 1; i < F.length - 1; i++) {
    if ((nov[i] ?? 0) < thr || (nov[i] ?? 0) < (nov[i - 1] ?? 0) || (nov[i] ?? 0) < (nov[i + 1] ?? 0)) continue
    if (i - (cuts.at(-1) as number) < minBars) {
      if (cuts.length > 1 && (nov[i] ?? 0) > (nov[cuts.at(-1) as number] ?? 0)) cuts[cuts.length - 1] = i
      continue
    }
    if (F.length - i < Math.max(2, minBars / 2)) continue
    cuts.push(i)
  }
  const eOf = (t0: number, t1: number) => {
    let s = 0, c = 0
    beats.forEach((b, k) => { if (b >= t0 - 1e-6 && b < t1) { s += energy[k] ?? 0; c++ } })
    return c ? s / c : 0
  }
  const secs: Section[] = cuts.map((ci, j) => {
    const b0 = j === 0 ? 0 : (bars[ci] as number)
    const b1 = j + 1 < cuts.length ? (bars[cuts[j + 1] as number] as number) : beats.length - 1
    const t0 = j === 0 ? 0 : (beats[b0] as number)
    const t1 = j + 1 < cuts.length ? (beats[b1] as number) : dur
    return { t0, t1, b0, b1, kind: 'verse' as SectionKind, energy: eOf(t0, t1) }
  })
  const es = secs.map((s) => s.energy).sort((a, b) => a - b)
  const med = es[Math.floor(es.length / 2)] ?? 0.5, top = es[es.length - 1] ?? 1
  secs.forEach((s, j) => {
    const prev = secs[j - 1]
    let first = 0, last = 0, cf = 0, cl = 0
    beats.forEach((b, k) => { if (b >= s.t0 && b < s.t1) { if (b < (s.t0 + s.t1) / 2) { first += energy[k] ?? 0; cf++ } else { last += energy[k] ?? 0; cl++ } } })
    const rise = (cl ? last / cl : 0) - (cf ? first / cf : 0)
    if (prev && s.energy - prev.energy > 0.22 && s.energy >= med) s.kind = 'drop'
    else if (s.energy < med * 0.6 && j > 0 && j < secs.length - 1) s.kind = 'break'
    else if (rise > 0.18) s.kind = 'build'
    else if (s.energy >= Math.max(med, top * 0.85)) s.kind = 'high'
    if (j === 0 && secs.length > 1 && s.energy < med && s.kind !== 'drop') s.kind = 'intro'
    if (j === secs.length - 1 && secs.length > 2 && s.energy < (prev?.energy ?? 1) * 0.85) s.kind = 'outro'
  })
  return secs
}

/** Analyse av musikk (mono PCM). `x` = samplene, `sr` = samplingsfrekvens. */
export function analyse(x: Float32Array, sr: number): MusicMap {
  const dur = x.length / sr
  const { onset, rms, low, lowOn, high, fps } = envelope(x, sr)
  const tb = tempoBeats(onset, fps)
  const beats = tb.beats
  const at = (t: number, a: Float32Array, rad = 2) => {
    const i = Math.round(t * fps)
    let m = 0
    for (let j = i - rad; j <= i + rad; j++) m = Math.max(m, a[j] ?? 0)
    return m
  }
  const sRaw = beats.map((t) => at(t, onset))
  const sMax = Math.max(1e-6, ...sRaw)
  const strength = sRaw.map((v) => v / sMax)
  const eRaw = beats.map((t, k) => {
    const t1 = beats[k + 1] ?? t + 0.5
    let s = 0, c = 0, on = 0
    for (let i = Math.floor(t * fps); i < Math.ceil(t1 * fps); i++) {
      s += (rms[i] ?? 0) ** 2
      on += onset[i] ?? 0
      c++
    }
    return Math.sqrt(s / Math.max(1, c)) * (1 + 0.15 * Math.min(4, on / Math.max(1, c)))
  })
  // robust maks (95. persentil): ett høyt slag skal ikke gjøre resten av sangen «rolig»
  const eSorted = [...eRaw].sort((a, b) => a - b)
  const eMax = Math.max(1e-6, eSorted[Math.floor((eSorted.length - 1) * 0.95)] ?? 1)
  const energy = eRaw.map((v) => Math.min(1, v / eMax))
  const localBpm = beats.map((t, k) => {
    const a = beats[Math.max(0, k - 2)] ?? t, b = beats[Math.min(beats.length - 1, k + 2)] ?? t
    const steps = Math.min(beats.length - 1, k + 2) - Math.max(0, k - 2)
    return steps > 0 ? (60 * steps) / Math.max(0.05, b - a) : 120
  })
  const bpm = beats.length > 1 ? (60 * (beats.length - 1)) / ((beats[beats.length - 1] ?? 0) - (beats[0] ?? 0)) : 120
  // første slag i takten: fasen (0–3) med sterkest stortromme (lavt bånd) og intensitetsskifter på takt-ener
  let ph = 0, bs = -1
  for (let p = 0; p < 4; p++) {
    let s = 0
    for (let k = p; k < beats.length; k += 4) s += at(beats[k] as number, lowOn) * 2 + (strength[k] ?? 0) + 0.5 * Math.abs((energy[k] ?? 0) - (energy[k - 1] ?? 0))
    if (s > bs) { bs = s; ph = p }
  }
  const downbeats: number[] = []
  for (let k = ph; k < beats.length; k += 4) downbeats.push(k)
  const feat = (t0: number, t1: number) => {
    const a = Math.floor(t0 * fps), b = Math.max(a + 1, Math.ceil(t1 * fps))
    let e = 0, on = 0, lo = 0, hi = 0
    for (let i = a; i < b; i++) { e += (rms[i] ?? 0) ** 2; on += onset[i] ?? 0; lo += low[i] ?? 0; hi += high[i] ?? 0 }
    const c = b - a, tot = lo + hi + 1e-9
    return [Math.log(1e-6 + Math.sqrt(e / c)) / 2, on / c / 4, lo / tot, hi / tot]
  }
  const sections = sectionsOf(beats, downbeats, energy, feat, dur)
  // hendelser: pauser, drops (sprang i intensitet / starten på et drop-parti) og seksjonsskifter
  const events: MusicEvent[] = []
  const avg = (a: number, b: number) => {
    let s = 0, c = 0
    for (let k = Math.max(0, a); k < Math.min(energy.length, b); k++) { s += energy[k] ?? 0; c++ }
    return c ? s / c : 0
  }
  for (let k = 0; k < beats.length; k++) {
    if ((energy[k] ?? 1) < 0.12 && (energy[k + 1] ?? 1) < 0.12 && !(events.at(-1)?.kind === 'pause' && (events.at(-1)?.t ?? 0) > (beats[k - 2] ?? -9))) events.push({ t: beats[k] ?? 0, kind: 'pause', w: 1 - (energy[k] ?? 0) })
    const before = avg(k - 8, k), after = avg(k, k + 4)
    if (k >= 4 && after - before > 0.3 && after > 0.55 && !events.some((e) => e.kind === 'drop' && Math.abs(e.t - (beats[k] ?? 0)) < 4)) events.push({ t: beats[k] ?? 0, kind: 'drop', w: Math.min(1, after - before + 0.4) })
  }
  for (const s of sections.slice(1)) {
    // dropet ved en seksjonsgrense er mer presist (takt-ener) enn spranget i intensitet: flytt det dit
    // (bare når grensen er innenfor ett sekund og det faktisk er kraft der – ikke til en grense midt i en pause)
    const near = events.find((e) => e.kind === 'drop' && Math.abs(e.t - s.t0) < 2)
    if (near && (s.kind === 'drop' || s.kind === 'high') && Math.abs(near.t - s.t0) < 1 && (energy[s.b0] ?? 0) >= 0.4) near.t = s.t0
    if (s.kind === 'drop' && !near) events.push({ t: s.t0, kind: 'drop', w: Math.min(1, 0.5 + s.energy) })
    else if (!events.some((e) => Math.abs(e.t - s.t0) < 1)) events.push({ t: s.t0, kind: 'section', w: 0.5 })
  }
  // drops finjusteres til det kraftigste anslaget innen ett slag (etter en lang pause kan slagsporingen ligge et slag foran)
  const per0 = beats.length > 1 ? ((beats.at(-1) as number) - (beats[0] as number)) / (beats.length - 1) : 0.5
  for (const ev of events) {
    if (ev.kind !== 'drop') continue
    const a = Math.max(0, Math.round((ev.t - 0.08) * fps)), b = Math.min(onset.length - 1, Math.round((ev.t + per0 * 1.05) * fps))
    let bi = -1, bv = 0
    for (let i = a; i <= b; i++) { const v = (onset[i] ?? 0) + 1.5 * (lowOn[i] ?? 0); if (v > bv) { bv = v; bi = i } }
    if (bi >= 0) ev.t = bi / fps
  }
  let climax = 0, cb = -1
  for (const s of sections) if (s.energy > cb) { cb = s.energy; climax = s.t0 }
  return { dur, beats, strength, downbeats, bpm, localBpm, energy, events: events.sort((a, b) => a.t - b.t), pulse: tb.pulse, sections, climax }
}

/* ---------------- adaptiv timing ---------------- */

/** Malens bevegelsesprofil: hvordan montasjen og animasjonene svarer på musikken (samme motor, ulik respons). */
export type MotionStyle = 'cinematic' | 'dynamic' | 'minimal' | 'typo'
export interface StyleRule {
  /**
   * Klipplengder i slag for hvert nivå: rolig (intro, pause, avslutning, lav energi), middels, høy (refreng, klimaks) og
   * like etter et drop. Valget innenfor nivået følger malens egen rytme (korte og lange klipp der malen har dem), med
   * variasjon så klippene ikke kuttes mekanisk likt.
   */
  calm: number[]
  mid: number[]
  high: number[]
  burst: number[]
  /** korteste klipp (s) – ingen blink-klipp */
  min: number
  /** overgang som andel av et taktslag (null = malens egen lengde, begrenset til et halvt slag) */
  trans: number | null
  /** lite støt (zoom) på klippet som starter på et drop */
  punch: number
  /** sekunder per klipp ved rolig / middels / høy energi når musikken ikke har fast takt (filmmusikk, ambient) */
  free: [number, number, number]
}
export const STYLES: Record<MotionStyle, StyleRule> = {
  cinematic: { calm: [8, 4, 8, 6], mid: [4, 4, 2, 4], high: [2, 2, 4, 1], burst: [2, 1, 2], min: 0.8, trans: 1, punch: 0, free: [4.5, 3, 2] },
  dynamic: { calm: [4, 2, 4, 3], mid: [2, 1, 2, 2, 1], high: [1, 1, 2, 0.5, 0.5, 1], burst: [0.5, 0.5, 1, 1], min: 0.25, trans: null, punch: 0.08, free: [3, 2, 1.2] },
  minimal: { calm: [8, 4, 6], mid: [4, 2, 4], high: [2, 4, 2], burst: [2, 2], min: 0.7, trans: 0.5, punch: 0, free: [4, 3, 2] },
  typo: { calm: [4, 4, 2, 6], mid: [2, 2, 1, 3], high: [1, 2, 1, 1, 2], burst: [1, 0.5, 0.5, 1], min: 0.35, trans: null, punch: 0.04, free: [3, 2, 1.5] },
}

/**
 * Korteste klipp i montasjen: profilens minste lengde, men aldri lenger enn 80 % av malens egne montasjeklipp (en rask mal
 * i en rolig profil beholder sitt uttrykk), og aldri under 0,25 s (ingen blink-klipp).
 */
export function minClip(style: MotionStyle, ownMedian: number): number {
  return Math.max(0.25, Math.min(STYLES[style].min, ownMedian * 0.8))
}

/**
 * Tidsavbildning malens tid → musikkens tid: malens taktslag k (k·P) går til musikkens slag (b0 + k), lineært mellom
 * slagene. Brukes for prosjekter uten montasje og i testene.
 */
export function makeWarp(map: MusicMap, P: number, b0: number): (t: number) => number {
  const B = map.beats.slice(b0)
  if (B.length < 2) return (t) => t
  const first = B[0] as number
  const last = B[B.length - 1] as number
  const pEnd = (last - (B[B.length - 2] as number)) || P
  return (t: number) => {
    const x = t / P
    if (x <= 0) return first + x * ((B[1] as number) - first)
    const k = Math.floor(x)
    if (k >= B.length - 1) return last + (x - (B.length - 1)) * pEnd
    const a = B[k] as number, b = B[k + 1] as number
    return a + (x - k) * (b - a)
  }
}

/* prosjekttyper (strukturelt, så modulen ikke importerer model.ts) */
interface Kf { t: number; v: number; e?: string }
type Keys = Record<string, Kf[]>
interface ClipLike { id?: string; kind: string; dur: number; in?: number; out?: number; speed?: number; trans: { type: string; dur: number }; kf?: Keys; effects?: { kind: string; v: number; v2?: number }[]; ph?: string; scale?: number }
interface TimedLike { start: number; dur: number; kf?: Keys }
interface ProjLike {
  tempo?: number
  motion?: MotionStyle
  dur?: number | null
  clips: ClipLike[]
  texts: (TimedLike & { cdDur?: number })[]
  ov: (TimedLike & { kind: string; in?: number; out?: number; speed?: number; fadeIn: number; fadeOut: number; shape?: unknown; matte?: { text: string; brush?: { t0: number; dur: number } | null } | null })[]
  subs: { start: number; end: number }[]
  markers: { id: string; t: number; label: string; color: string }[]
  music: { id: string; start: number; in: number; out: number }[]
}

/** Lengde i slag til nærmeste musikalske verdi (kvart, halvt, helt slag, takter …). */
const SNAP = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4, 6, 8, 12, 16]
export function snapBeats(x: number): number {
  const v = Math.max(0.25, Math.min(16, x))
  return SNAP.reduce((a, b) => (Math.abs(Math.log(b / v)) < Math.abs(Math.log(a / v)) ? b : a))
}

export interface SyncResult<P> { proj: P; bpm: number; cuts: number; events: MusicEvent[] }

export interface SyncOpt {
  /** hvor i sangen musikksporet starter (s) */
  songStart: number
  /** sekunder per enhet for tidsbaserte effektverdier (fra FX_DEFS) */
  fxSec: (kind: string) => { v: boolean; v2: boolean }
  /** klipp brukeren har justert for hånd (id → lengde i s): lengden beholdes, resten planlegges rundt */
  keep?: Record<string, number>
  /** ønsket lengde på videoen (s); ellers følger lengden planen (og aldri lenger enn musikken) */
  target?: number | null
}

/**
 * Music Sync på et prosjekt (laget fra en mal). Musikken analyseres (analyse()) og malen tilpasses den:
 * - introen (malens åpning, f.eks. tittelen) skaleres jevnt så første kutt havner på det sterkeste musikalske
 *   øyeblikket i nærheten (drop, ny del, takt-ener);
 * - montasjen planlegges klipp for klipp etter sangens deler og energi og malens profil: rolige partier holder lenger,
 *   refreng og klimaks klipper tettere, et drop får kutt nøyaktig på dropet og en kort serie rett etter; malens egen
 *   rytme (hvilke klipp som er korte og lange) bestemmer valget innenfor nivået, med variasjon. Kuttene ligger på
 *   slagene (lengre klipp på takt-ener); musikk uten fast takt får lengder i sekunder med kutt på anslagene;
 * - ingen klipp blir kortere enn profilens minste lengde (ingen blink-klipp); overganger sentreres på kuttet;
 * - tekster, rammer, overlegg, keyframes, effekter og undertekster følger klippene de hører til; høydepunkter som
 *   starter med et klipp, starter fortsatt med det;
 * - klipp brukeren har justert for hånd (opt.keep) beholder lengden.
 * Designet (layout, typografi, farger, animasjonstype) røres ikke. Resultatet er vanlige, redigerbare verdier.
 */
export function syncProject<P extends ProjLike>(base0: P, map: MusicMap, style: MotionStyle, opt: SyncOpt): SyncResult<P> {
  const rule = STYLES[style]
  const isVid = (c: { kind: string; in?: number; out?: number }) => c.kind === 'video' && c.in !== undefined && c.out !== undefined
  const vDur = (c: { in?: number; out?: number; speed?: number }) => Math.max(0.1, ((c.out ?? 0) - (c.in ?? 0)) / (c.speed || 1))
  const base: P = {
    ...base0,
    clips: base0.clips.map((c) => ({ ...c, dur: isVid(c) ? vDur(c) : Math.max(0.2, c.dur || 4) })),
    ov: base0.ov.map((o) => (isVid(o) && !o.shape ? { ...o, dur: vDur(o) } : o)),
  }
  const fitV = <T extends { in?: number; out?: number }>(c: T, nd: number): { speed: number; out: number } => {
    const sp = Math.max(0.1, Math.min(8, ((c.out as number) - (c.in as number)) / nd))
    return { speed: sp, out: (c.in as number) + nd * sp }
  }
  const s0 = opt.songStart
  // musikkens slag i sangtid fra der sporet starter
  const songBeats = map.beats.filter((t) => t >= s0 - 0.01)
  const offAll = map.beats.length - songBeats.length
  // prosjektets t = 0 legges på første slag fra sporets start (musikken starter der)
  const w0 = songBeats.length ? Math.max(0, (songBeats[0] as number) - s0) : 0
  const songEnd = Math.max(1, map.dur - s0 - w0)
  // ønsket lengde lengre enn sangen: musikken gjentas fra sporets start (som avspillingen) – planen bruker den gjentatte
  // sangens slag, deler og energi, og omstarten er selv en grense (kutt)
  const loopL = Math.max(1, Math.min(songEnd, ((base.music[0]?.out ?? map.dur) as number) - s0 - w0))
  const reps = opt.target && opt.target > loopL + 0.3 ? Math.ceil(opt.target / loopL) : 1
  const Bp1 = songBeats.map((t) => t - s0 - w0).filter((t) => reps === 1 || t < loopL - 0.05) // slag i prosjekttid
  const n1 = Bp1.length
  const Bp = reps === 1 ? Bp1 : Array.from({ length: reps }, (_, r) => Bp1.map((t) => t + r * loopL)).flat()
  const tm = (t: number) => (reps === 1 ? t : ((t % loopL) + loopL) % loopL)
  const bper = Bp1.length > 1 ? ((Bp1.at(-1) as number) - (Bp1[0] as number)) / (Bp1.length - 1) : 60 / Math.max(40, map.bpm || 120)
  const strong = (map.pulse ?? 1) >= 0.3 && Bp1.length >= 8
  const db1 = new Set(map.downbeats.map((k) => k - offAll).filter((k) => k >= 0))
  // takt-ener: ved gjentakelse starter hver runde på et takt-ener (sporets start er første slag)
  const dbSet = { has: (k: number) => (reps === 1 ? db1.has(k) : db1.has(((k % n1) + n1) % n1) || k % n1 === 0) }
  const secs1 = (map.sections ?? []).map((s) => ({ ...s, t0: s.t0 - s0 - w0, t1: s.t1 - s0 - w0 })).filter((s) => s.t1 > 0)
  const secs = secs1
  // drop = en kraftig ny del (en rolig sang får ikke en rask serie når verset starter)
  const bounds1 = secs1.slice(1).map((s) => ({ t: s.t0, drop: (s.kind === 'drop' || s.kind === 'high') && s.energy > 0.62 })).filter((b) => b.t > 0 && (reps === 1 || b.t < loopL - 0.05))
  for (const e of map.events) {
    const t = e.t - s0 - w0
    if (e.kind === 'drop' && t > 0 && (reps === 1 || t < loopL - 0.05) && !bounds1.some((b) => Math.abs(b.t - t) < 0.3)) bounds1.push({ t, drop: true })
  }
  const bounds = reps === 1 ? bounds1 : Array.from({ length: reps }, (_, r) => [...(r ? [{ t: r * loopL, drop: false }] : []), ...bounds1.map((b) => ({ ...b, t: b.t + r * loopL }))]).flat()
  bounds.sort((a, b) => a.t - b.t)
  const secAt = (t: number) => secs.find((s) => tm(t) >= s.t0 - 1e-6 && tm(t) < s.t1) ?? secs.at(-1)
  const eAt = (t0: number) => {
    // energi rundt t (en takt)
    const t = tm(t0)
    let s = 0, c = 0
    map.beats.forEach((b, k) => { const tb = b - s0 - w0; if (tb >= t - bper && tb < t + 3 * bper) { s += map.energy[k] ?? 0; c++ } })
    return c ? s / c : 0.5
  }
  const level = (t: number): 'calm' | 'mid' | 'high' => {
    const sk = secAt(t)?.kind
    const e = eAt(t)
    if (sk === 'break' || sk === 'intro' || sk === 'outro' || e < 0.35) return 'calm'
    if (sk === 'high' || sk === 'drop' || e > 0.7) return 'high'
    return 'mid'
  }
  // brøkdels slagposisjon ↔ tid (prosjekttid)
  const posOf = (t: number): number => {
    const B = Bp
    if (!B.length) return t / bper
    if (t <= (B[0] as number)) return (t - (B[0] as number)) / bper
    if (t >= (B.at(-1) as number)) return B.length - 1 + (t - (B.at(-1) as number)) / bper
    let lo = 0, hi = B.length - 1
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if ((B[m] as number) <= t) lo = m; else hi = m }
    return lo + (t - (B[lo] as number)) / Math.max(1e-6, (B[hi] as number) - (B[lo] as number))
  }
  const timeOf = (x: number): number => {
    const B = Bp
    if (!B.length) return x * bper
    if (x <= 0) return (B[0] as number) + x * bper
    if (x >= B.length - 1) return (B.at(-1) as number) + (x - (B.length - 1)) * bper
    const k = Math.floor(x), a = B[k] as number, b = B[k + 1] as number
    return a + (x - k) * (b - a)
  }

  // ---- 1) introen: første kutt på et sterkt øyeblikk nær malens egen lengde ----
  const N = base.clips.length
  const D0 = base.clips[0]?.dur ?? 0
  const keep = opt.keep ?? {}
  const kept = (i: number) => { const id = base.clips[i]?.id; return id !== undefined && keep[id] !== undefined ? keep[id] as number : null }
  let C0 = D0
  if (N > 1 && kept(0) === null) {
    // energisk musikk fra starten: åpningen (tittelen) holdes kortere – ingen lang stillestående tittel mens musikken går
    const lvl0 = level(Math.min(D0 * 0.5, 2))
    const Dt = strong && lvl0 !== 'calm' ? D0 * (lvl0 === 'high' ? 0.7 : 0.8) : D0
    let best = -Infinity
    const cands: { t: number; w: number }[] = []
    for (const b of bounds) cands.push({ t: b.t, w: b.drop ? 4 : 3 })
    if (strong) Bp.forEach((t, k) => cands.push({ t, w: dbSet.has(k) ? 2 : 0.6 }))
    for (const c of cands) {
      if (c.t < Dt * 0.7 || c.t > Dt * 1.45 || c.t < 0.5) continue
      const sc = c.w - 3 * Math.abs(Math.log(c.t / Dt))
      if (sc > best) { best = sc; C0 = c.t }
    }
  } else if (kept(0) !== null) C0 = kept(0) as number
  // malens egne lengder i montasjen (relativt til medianen) – hvilke klipp som er korte og lange
  const own = base.clips.slice(1).map((c) => c.dur)
  const med = [...own].sort((a, b) => a - b)[Math.floor(own.length / 2)] ?? 1
  const minC0 = minClip(style, med)
  let minC = minC0
  const pick = (opts: number[], i: number, prev: number[]): number => {
    const r = (base.clips[i]?.dur ?? med) / med
    const sorted = [...opts].sort((a, b) => a - b)
    // kort / normal / lang plass i malen → kort / normal / lang valg; mønsteret i lista gir variasjon
    let v = r < 0.7 ? (sorted[0] as number) : r > 1.6 ? (sorted.at(-1) as number) : (opts[i % opts.length] as number)
    // ikke fire like på rad
    if (prev.length >= 3 && prev.slice(-3).every((x) => x === v)) v = (sorted.find((x) => x !== v) ?? v)
    return v
  }

  // ---- 2) montasjen: kuttider (prosjekttid) for slutten av hvert klipp ----
  // malens eget tempo i montasjen: medianklippet i slag (lynmontasje < 1 slag, rolige maler flere slag) – planens
  // lengder skaleres med det (½–2×), så malens uttrykk beholdes
  const Pt = 60 / Math.max(40, Math.min(220, base.tempo || map.bpm || 120))
  const g0 = Math.max(0.5, Math.min(2, med / Pt / 1.5))
  const songLimit = opt.target && opt.target > 0 ? opt.target : songEnd
  const plan = (g: number): number[] => {
  const cut: number[] = [C0]
  const lens: number[] = []
  let burst = 0
  for (let i = 1; i < N; i++) {
    const t = cut[i - 1] as number
    const k = kept(i)
    if (k !== null) { cut.push(t + k); continue }
    // et drop/ny del rett ved starten av klippet gir en kort serie
    if (bounds.some((b) => b.drop && Math.abs(b.t - t) < 0.12)) burst = rule.burst.length
    const lv = level(t + 0.01)
    let end: number
    if (strong) {
      const opts = burst > 0 ? rule.burst : lv === 'calm' ? rule.calm : lv === 'high' ? rule.high : rule.mid
      let nb = pick(opts, i, lens)
      if (burst > 0) { nb = opts[rule.burst.length - burst] as number; burst-- }
      nb = snapBeats(nb * g)
      // et klipp som er klart lengre enn resten i malen (en avsløring, en lang scene) beholder sin egen lengde i slag
      const ownB = (base.clips[i]?.dur ?? med) / Pt
      if ((base.clips[i]?.dur ?? med) / med > 1.6) nb = Math.max(nb, snapBeats(ownB * Math.min(1, g / g0)))
      // få klipp i montasjen (scener, ikke montasje): malens egen lengde, litt justert etter energien
      if (N - 1 <= 3) nb = snapBeats(ownB * Math.min(1, g / g0) * (lv === 'calm' ? 1.25 : lv === 'high' ? 0.85 : 1))
      // minste lengde i sekunder (raske sanger: hele slag i stedet for halve)
      // (10 % slingringsmonn: et slag på 0,55 s er greit mot en grense på 0,58 s; over ett slag økes det med halve slag)
      while (nb * bper < minC * 0.9 && nb < 16) nb = SNAP.find((x) => x > nb + 1e-6) ?? 16
      const p0 = posOf(t)
      let pe = Math.round(p0 + nb)
      if (nb < 1 || !Number.isInteger(nb)) pe = Math.round((p0 + nb) * 2) / 2
      // klipp på en hel takt eller mer slutter helst på et takt-ener (innenfor ett slag, høyst 25 % kortere) – kortere
      // klipp beholder sin lengde (ellers ble alt like langt)
      if (nb >= 4) {
        for (const d of [0, 1, -1]) { const kk = Math.round(p0 + nb) + d; if (dbSet.has(kk) && kk - p0 >= nb * 0.75) { pe = kk; break } }
      }
      // variasjon: ikke fire like lange på rad (etter at minstelengden og malens tempo er tatt med)
      if (lens.length >= 3 && lens.slice(-3).every((x) => x === nb)) {
        const alt = (nb * 2 <= 4 && i % 2 === 0) || nb / 2 * bper < minC ? nb * 2 : nb / 2
        pe = Math.round((p0 + alt) * 2) / 2
        nb = alt
      }
      if (pe <= p0 + 0.2) pe = Math.round(p0) + Math.max(0.5, Math.round(nb))
      end = timeOf(pe)
      lens.push(nb)
    } else {
      // uten fast takt: sekunder etter energi, kuttet på nærmeste tydelige anslag (±0,3 s)
      const sec = g * rule.free[lv === 'calm' ? 0 : lv === 'mid' ? 1 : 2] * ((base.clips[i]?.dur ?? med) / med > 1.6 ? 1.4 : (base.clips[i]?.dur ?? med) / med < 0.7 ? 0.75 : 1)
      end = t + Math.max(minC, sec)
      let bt = end, bs = 0
      map.beats.forEach((b, kk) => { const tb = b - s0 - w0; const s = map.strength[kk] ?? 0; if (Math.abs(tb - end) < 0.3 && s > bs) { bs = s; bt = tb } })
      if (bt - t >= minC) end = bt
      lens.push(end - t)
    }
    // seksjonsgrenser og drops får alltid kutt (klippet slutter der i stedet for å gå over)
    const bnd = bounds.find((b) => b.t > t + minC && b.t < end - 0.05)
    if (bnd) end = bnd.t
    // for kort: til neste halve slag som gir minste lengde (på rutenettet), uten fast takt rett fram
    if (end - t < minC * 0.9) {
      if (strong) { let q = Math.ceil(posOf(t + minC) * 2) / 2; while (timeOf(q) - t < minC * 0.9) q += 0.5; end = timeOf(q) } else end = t + minC
    }
    // en grense like etter (nærmere enn minste lengde): dette klippet varer til grensen, så kuttet kommer på den
    const nxt = bounds.find((b) => b.t > end + 0.01 && b.t < end + minC + 0.01)
    if (nxt) end = nxt.t
    cut.push(end)
  }
  return cut
  }
  // for lang for musikken / ønsket lengde: kortere valg (planen beholder slagene) før jevn krymping
  let g = g0
  let cut = plan(g)
  // lengre enn musikken (eller valgt lengde): kortere valg som fortsatt ligger på slagene, til planen passer (ned til
  // en firedel av malens egne lengder). Går det ikke, beholdes slagene og planen (videoen blir litt lengre enn sangen)
  const lim = opt.target && opt.target > 0 ? opt.target * 1.25 : songEnd * 1.02
  for (let k = 0; k < 14 && (cut.at(-1) as number) > lim + 0.01 && N > 1 && g > g0 * 0.15; k++) { g *= 0.85; cut = plan(g) }
  if (opt.target && opt.target > 0 && N > 1) {
    // ønsket lengde: den planen (finmasket faktor) som kommer nærmest uten å passere – med plass til siste klipp; siste
    // klipp tar resten, så alle andre kutt ligger på slagene
    const T = opt.target
    let best: number[] | null = null
    // passer ingen plan (mange klipp på kort tid), lempes minste lengde trinnvis (aldri under 0,25 s) før noe krympes
    for (const relax of [1, 0.8, 0.65, 0.5, 0.35]) {
      minC = Math.max(0.25, minC0 * relax)
      for (let gg = g0 * 0.1; gg <= g0 * 4; gg *= 1.06) {
        const c = plan(gg)
        const pre = c.at(-2) as number
        if (pre <= T - Math.max(minC, Math.min(2, bper)) && (!best || pre > (best.at(-2) as number))) best = c
      }
      if (best) break
    }
    if (best && strong) {
      // resten (utover omtrent én takt til siste klipp) fordeles som hele slag over montasjen – rolige partier først –
      // så slutten ikke blir et langt stillestående klipp; kuttene ligger fortsatt på slagene
      const wantLast = Math.max(minC, Math.min(4 * bper, 2.5))
      const B0 = best
      const pos = B0.map((t) => posOf(t))
      let extra = Math.floor((T - wantLast - (best.at(-2) as number)) / bper)
      // bare klippene etter siste grense (drop/ny del/omstart) – kuttene på grensene skal ikke flyttes
      // (en grense som ligger nøyaktig på nest siste kutt, teller ikke – ellers ble halen tom og slutten lang)
      const lastB = bounds.filter((b) => b.t < (B0.at(-2) as number) - 0.01).at(-1)?.t ?? 0
      const idx = Array.from({ length: Math.max(0, pos.length - 2) }, (_, k) => k + 1).filter((i) => (B0[i - 1] as number) >= lastB - 0.01)
      // rolige klipp først, ellers jevnt fordelt
      idx.sort((a, b) => (level((B0[a - 1] as number) + 0.01) === 'calm' ? 0 : 1) - (level((B0[b - 1] as number) + 0.01) === 'calm' ? 0 : 1) || a - b)
      for (let round = 0; extra > 0 && idx.length && round < 64; round++) {
        const step = Math.max(1, Math.floor(idx.length / Math.max(1, extra)))
        for (let k = 0; k < idx.length && extra > 0; k += step) {
          const i = idx[k] as number
          for (let j = i; j < pos.length - 1; j++) pos[j] = (pos[j] as number) + 1
          extra--
        }
      }
      best = pos.map((p, i) => (i === pos.length - 1 ? B0[i] as number : timeOf(p)))
    }
    if (best) cut = best
  }
  // slutten: ikke lenger enn musikken / ønsket lengde; siste klipp slutter på en hel takt når det går
  let T = cut.at(-1) as number
  if (opt.target && opt.target > 0) T = opt.target
  if (opt.target && opt.target > 0 && T > songLimit + 0.01 && N > 1) {
    // for lang plan: klippene krympes jevnt (forholdet beholdes) så alt ligger innenfor musikken
    const k = (songLimit - C0) / Math.max(0.1, T - C0)
    for (let i = 1; i < cut.length; i++) cut[i] = C0 + ((cut[i] as number) - C0) * Math.max(0.05, k)
    T = songLimit
  } else if (opt.target && opt.target > 0 && N > 1) {
    // ønsket lengde: siste klipp tar opp resten, eller planen strekkes/krympes jevnt når det er langt unna
    const last = cut.at(-1) as number
    const k = (T - C0) / Math.max(0.1, last - C0)
    // (planen er valgt så kuttet før det siste ligger før slutten; bare når ingen plan passet, krympes alt jevnt)
    if ((cut.at(-2) as number) > T - minC) for (let i = 1; i < cut.length; i++) cut[i] = C0 + ((cut[i] as number) - C0) * k
    cut[cut.length - 1] = T
  } else if (strong && N > 1) {
    // siste kutt (slutten) på nærmeste takt-ener innenfor ett slag, eller på slaget
    const pe = posOf(T)
    let best = Math.round(pe)
    for (const d of [0, 1, -1, 2]) { const kk = Math.round(pe) + d; if (dbSet.has(kk)) { best = kk; break } }
    const tt = timeOf(best)
    if (tt - (cut.at(-2) as number) >= minC && tt <= songLimit + 0.01) cut[cut.length - 1] = tt
    T = cut.at(-1) as number
  }
  if (N === 1) cut[0] = opt.target && opt.target > 0 ? opt.target : Math.min(songLimit, C0)

  // ---- 3) klippene: lengder (overganger sentrert på kuttet) ----
  const trOf = (i: number, d0: number, d1: number) => {
    const c = base.clips[i] as ClipLike
    if (!i || !c.trans.type || c.trans.type === 'none') return 0
    const want = rule.trans !== null ? rule.trans * bper : Math.min(c.trans.dur, 0.5 * bper)
    return Math.max(0, Math.min(want, d0 / 2, d1 / 2))
  }
  const bnds = [0, ...cut]
  const segLen = (i: number) => (bnds[i + 1] as number) - (bnds[i] as number)
  const trs = base.clips.map((_, i) => (i ? trOf(i, segLen(i - 1), segLen(i)) : 0))
  const out: ClipLike[] = base.clips.map((c, i) => {
    // klipp i: fra kuttet før (minus halve overgangen inn) til kuttet etter (pluss halve overgangen ut)
    const nd = Math.max(0.05, segLen(i) + (trs[i] as number) / 2 + (trs[i + 1] ?? 0) / 2)
    const f = nd / Math.max(0.05, c.dur)
    const nc: ClipLike = { ...c, dur: nd, trans: { ...c.trans, dur: i && c.trans.type !== 'none' ? Math.max(0.01, trs[i] as number) : c.trans.dur } }
    if (isVid(c)) Object.assign(nc, fitV(c, nd))
    if (c.kf) nc.kf = Object.fromEntries(Object.entries(c.kf).map(([n, l]) => [n, l.map((q) => ({ ...q, t: q.t * f }))]))
    if (c.effects) nc.effects = c.effects.map((ef) => { const s = opt.fxSec(ef.kind); return { ...ef, ...(s.v ? { v: ef.v * f } : {}), ...(s.v2 && ef.v2 !== undefined ? { v2: ef.v2 * f } : {}) } })
    if (rule.punch && i > 0 && bounds.some((b) => b.drop && Math.abs(b.t - (bnds[i] as number)) < 0.08)) {
      const s1 = c.scale ?? 1
      nc.kf = { ...(nc.kf ?? {}), scale: [{ t: 0, v: s1 * (1 + rule.punch) }, { t: Math.min(nd, 0.35), v: s1, e: 'out' }] }
    }
    return nc
  })

  // ---- 4) alt annet følger klippene: tidskart fra malens klippgrenser til de nye ----
  const S: number[] = [0], Dn: number[] = [0]
  base.clips.forEach((c, i) => { S.push((S[i] as number) + c.dur); Dn.push(bnds[i + 1] as number) })
  const M = (t: number): number => {
    if (t <= 0) return t
    for (let i = 0; i < S.length - 1; i++) {
      const a = S[i] as number, b = S[i + 1] as number
      if (t <= b || i === S.length - 2) {
        const da = Dn[i] as number, db = Dn[i + 1] as number
        return da + ((t - a) / Math.max(1e-6, b - a)) * (db - da)
      }
    }
    return t
  }
  const span2 = (a: number, d: number) => Math.max(0.05, M(a + d) - M(a))
  const kfM = (k: Keys | undefined, start: number, nStart: number): Keys | undefined =>
    k ? Object.fromEntries(Object.entries(k).map(([n, l]) => [n, l.map((q) => ({ ...q, t: M(start + q.t) - nStart }))])) : undefined
  // høydepunkter: et element som startet på et klippskifte i malen, starter på det nye skiftet; ellers på nærmeste slag
  // når det er tydelig takt og slaget er nær (0,15 s)
  const snapStart = (t0: number, ns: number) => {
    const j = S.findIndex((x) => Math.abs(x - t0) < 0.06)
    if (j > 0) return Dn[j] as number
    if (!strong) return ns
    const k = Math.round(posOf(ns))
    const tb = timeOf(k)
    // bare innenfor samme klipp (et element som hører til et klipp, flyttes ikke over i naboklippet)
    const seg = Dn.findIndex((x, i) => ns >= x && ns < (Dn[i + 1] ?? Infinity))
    const lo = Dn[seg] ?? 0, hi = Dn[seg + 1] ?? Infinity
    return Math.abs(tb - ns) < 0.15 && tb >= lo && tb < hi ? tb : ns
  }
  const end = cut.at(-1) as number
  // tekster og overlegg kan stå etter siste klipp (malens design); de begrenses bare av en valgt lengde
  const clampT = <T extends { start: number; dur: number }>(x: T): T => {
    if (!(opt.target && opt.target > 0)) return x
    const s = Math.min(Math.max(0, x.start), Math.max(0, end - 0.1))
    return { ...x, start: s, dur: Math.max(0.05, Math.min(x.dur, end - s)) }
  }
  const texts = base.texts.map((x) => {
    const ns0 = M(x.start)
    const ns = x.start > 0.01 ? snapStart(x.start, ns0) : ns0
    const nd = Math.max(0.05, M(x.start + x.dur) - ns)
    return clampT({ ...x, start: ns, dur: nd, ...(x.kf ? { kf: kfM(x.kf, x.start, ns) } : {}), ...(x.cdDur !== undefined ? { cdDur: span2(x.start, x.cdDur) } : {}) })
  })
  // slutten på et overlegg (f.eks. bilde-i-bilde som vokser til fullskjerm): klippbyttet under skal skje mens overlegget
  // dekker bildet, og utgangsanimasjonen (inn/ut = min(0,5 s, lengden/3), som i render.ts) skal vise det NYE klippet – ellers
  // blinker klippet bak i ett–to bilder. Overlegg uten animasjon slutter nøyaktig på kuttet.
  const snapEnd = (t1: number, ne: number, ns: number, anim: string) => {
    // sluttet på en klippgrense i malen: slutter på den nye grensen (som i malen)
    const j = S.findIndex((x) => Math.abs(x - t1) < 0.06)
    if (j > 0) return Dn[j] as number
    let cutT: number | null = null
    let bd = 0.35
    for (const x of Dn) { if (x <= ns + 0.1) continue; const d = Math.abs(x - ne); if (d < bd) { bd = d; cutT = x } }
    if (cutT === null) return ne
    if (anim === 'none') return cutT
    // ut-animasjonen (d/3, høyst 0,5 s) starter på kuttet: d = (kutt − start) · 1,5 – aldri forbi slutten av videoen
    const out = Math.min(0.5, (cutT - ns) / 2)
    return Math.min(cutT + out, Dn.at(-1) as number)
  }
  const ov = base.ov.map((o) => {
    const ns0 = M(o.start)
    const ns = snapStart(o.start, ns0)
    const ne = snapEnd(o.start + o.dur, M(o.start + o.dur), ns, (o as { anim?: string }).anim ?? 'none')
    const nd = Math.max(0.05, (ne > ns + 0.2 ? ne : M(o.start + o.dur)) - ns)
    const vid = o.kind === 'video' && !o.shape && o.in !== undefined && o.out !== undefined
    return clampT({
      ...o, start: ns, dur: nd, fadeIn: span2(o.start, o.fadeIn), fadeOut: span2(o.start + o.dur - o.fadeOut, o.fadeOut),
      ...(vid ? fitV(o, nd) : {}),
      ...(o.kf ? { kf: kfM(o.kf, o.start, ns) } : {}),
      ...(o.matte?.brush ? { matte: { ...o.matte, brush: { ...o.matte.brush, t0: M(o.matte.brush.t0), dur: span2(o.matte.brush.t0, o.matte.brush.dur) } } } : {}),
    })
  })
  const subs = base.subs.map((x) => ({ ...x, start: M(x.start), end: opt.target ? Math.min(end, M(x.end)) : M(x.end) })).filter((x) => !opt.target || x.start < end)
  const beatMarks = Bp.filter((t) => t >= 0 && t <= end).map((t, i) => ({ id: `sync-${i}`, t, label: 'Takt', color: '#f5b82c' }))
  const markers = [...base.markers.filter((k) => k.label !== 'Takt' && !k.id.startsWith('sync-')), ...beatMarks].sort((a, b) => a.t - b.t)
  // sangen starter slik at prosjektets t = 0 er på musikkens første slag fra sporets start
  // sangen fortsetter etter videoen: tones ut mot slutten (ingen brå stopp)
  const goesOn = map.dur - (s0 + w0) > end + 0.3
  const music = base.music.map((m, i) => (i === 0 ? { ...m, in: Math.max(0, s0 + w0), start: 0, ...(goesOn ? { fadeOut: Math.max((m as { fadeOut?: number }).fadeOut ?? 0, Math.min(1.5, end / 6)) } : {}) } : m))
  const proj = { ...base, clips: out, texts, ov, subs, markers, music } as P
  if (opt.target && opt.target > 0) (proj as { dur?: number | null }).dur = opt.target
  else if (base.dur) (proj as { dur?: number | null }).dur = end
  return { proj, bpm: map.bpm, cuts: out.length, events: map.events }
}
