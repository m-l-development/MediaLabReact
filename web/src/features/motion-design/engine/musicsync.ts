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
}

const HOP = 512

/** Energi i tre bånd per vindu (enkle IIR-filtre: lav < 200 Hz, mid, høy > 2,5 kHz) og onset-styrke (positiv fluks). */
export function envelope(x: Float32Array, sr: number): { onset: Float32Array; rms: Float32Array; fps: number } {
  const n = Math.floor(x.length / HOP)
  const onset = new Float32Array(n)
  const rms = new Float32Array(n)
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
      prev[b] = bands[b] as number
    }
    onset[i] = i ? f : 0
    rms[i] = Math.sqrt(e / HOP)
  }
  return { onset, rms, fps: sr / HOP }
}

/** Beste taktperiode (vinduer) i et utsnitt av onset-kurven: autokorrelasjon med vekt mot 80–160 BPM. */
export function period(o: Float32Array, a0: number, b0: number, fps: number): number {
  // hele vinduer (en halv indeks ga tomme oppslag og feil periode)
  const a = Math.max(0, Math.round(a0)), b = Math.min(o.length, Math.round(b0))
  const lo = Math.floor((fps * 60) / 200), hi = Math.ceil((fps * 60) / 60)
  let best = -1, bl = 0
  for (let L = lo; L <= hi; L++) {
    let c = 0
    for (let i = a + L; i < b; i++) c += (o[i] ?? 0) * (o[i - L] ?? 0)
    c /= Math.max(1, b - a - L)
    const bpm = (60 * fps) / L
    // mykt prior rundt 120 BPM (unngår halv/dobbel takt)
    const w = Math.exp(-0.5 * Math.pow(Math.log2(bpm / 120) / 0.9, 2))
    if (c * w > best) {
      best = c * w
      bl = L
    }
  }
  return bl || Math.round((fps * 60) / 120)
}

/**
 * Taktsporing med lokalt tempo: tempoet estimeres i glidende vinduer (8 s, hvert 2. s); slagene følges med en
 * faselåst sløyfe – fra hvert slag forventes neste etter lokal periode, og slaget låses til den sterkeste onset-toppen
 * innen ±15 % av perioden (ellers brukes forventet tid). Tåler pauser, synkoper og tempoendringer.
 */
function track(o: Float32Array, fps: number): number[] {
  const n = o.length
  if (n < 50) return []
  const win = Math.round(fps * 8), step = Math.round(fps * 2)
  const per = new Float32Array(n)
  for (let c = 0; c < n; c += step) {
    const p = period(o, Math.max(0, c - win / 2), Math.min(n, c + win / 2), fps)
    for (let i = c; i < Math.min(n, c + step); i++) per[i] = p
  }
  let mx = 0
  for (let i = 0; i < n; i++) mx = Math.max(mx, o[i] ?? 0)
  const thr = mx * 0.18
  // første slag: første tydelige onset-topp
  let i = 0
  while (i < n && !((o[i] ?? 0) > thr && (o[i] ?? 0) >= (o[i - 1] ?? 0) && (o[i] ?? 0) >= (o[i + 1] ?? 0))) i++
  if (i >= n) return []
  const out: number[] = [i]
  let pos = i
  for (;;) {
    const P = per[Math.min(n - 1, Math.round(pos))] || fps / 2
    const pred = pos + P
    if (pred >= n) break
    const r = Math.max(1, Math.round(P * 0.15))
    let bi = -1, bv = thr
    for (let j = Math.round(pred) - r; j <= Math.round(pred) + r; j++) {
      const v = (o[j] ?? 0) * (1 - (0.3 * Math.abs(j - pred)) / r)
      if (v > bv) {
        bv = v
        bi = j
      }
    }
    pos = bi >= 0 ? bi : pred
    out.push(pos)
  }
  // før første slag: fyll bakover med første periode
  const P0 = per[i] || fps / 2
  for (let t = i - P0; t >= 0; t -= P0) out.unshift(t)
  return out.map((v) => v / fps)
}

/** Analyse av musikk (mono PCM). `x` = samplene, `sr` = samplingsfrekvens. */
export function analyse(x: Float32Array, sr: number): MusicMap {
  const dur = x.length / sr
  const { onset, rms, fps } = envelope(x, sr)
  const beats = track(onset, fps)
  const at = (t: number, a: Float32Array, rad = 2) => {
    const i = Math.round(t * fps)
    let m = 0
    for (let j = i - rad; j <= i + rad; j++) m = Math.max(m, a[j] ?? 0)
    return m
  }
  // styrke per slag og intensitet (lydstyrke + onset-tetthet) i slagets intervall
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
  const eMax = Math.max(1e-6, ...eRaw)
  const energy = eRaw.map((v) => v / eMax)
  const localBpm = beats.map((t, k) => {
    const a = beats[Math.max(0, k - 2)] ?? t, b = beats[Math.min(beats.length - 1, k + 2)] ?? t
    const steps = Math.min(beats.length - 1, k + 2) - Math.max(0, k - 2)
    return steps > 0 ? (60 * steps) / Math.max(0.05, b - a) : 120
  })
  const bpm = beats.length > 1 ? (60 * (beats.length - 1)) / ((beats[beats.length - 1] ?? 0) - (beats[0] ?? 0)) : 120
  // første slag i takten: fasen (0–3) med sterkest sum av slagstyrke
  let ph = 0, bs = -1
  for (let p = 0; p < 4; p++) {
    let s = 0
    for (let k = p; k < beats.length; k += 4) s += (strength[k] ?? 0) + 0.5 * (energy[k] ?? 0)
    if (s > bs) {
      bs = s
      ph = p
    }
  }
  const downbeats: number[] = []
  for (let k = ph; k < beats.length; k += 4) downbeats.push(k)
  // hendelser: pauser (lav intensitet over minst 2 slag), drops (sprang i intensitet etter roligere parti) og skifter
  const events: MusicEvent[] = []
  const avg = (a: number, b: number) => {
    let s = 0, c = 0
    for (let k = Math.max(0, a); k < Math.min(energy.length, b); k++) {
      s += energy[k] ?? 0
      c++
    }
    return c ? s / c : 0
  }
  for (let k = 0; k < beats.length; k++) {
    if ((energy[k] ?? 1) < 0.12 && (energy[k + 1] ?? 1) < 0.12 && !(events.at(-1)?.kind === 'pause' && (events.at(-1)?.t ?? 0) > (beats[k - 2] ?? -9))) events.push({ t: beats[k] ?? 0, kind: 'pause', w: 1 - (energy[k] ?? 0) })
    const before = avg(k - 8, k), after = avg(k, k + 4)
    if (k >= 4 && after - before > 0.3 && after > 0.55 && !events.some((e) => e.kind === 'drop' && Math.abs(e.t - (beats[k] ?? 0)) < 4)) events.push({ t: beats[k] ?? 0, kind: 'drop', w: Math.min(1, after - before + 0.4) })
    else if (k >= 8 && k % 4 === ph % 4 && Math.abs(after - before) > 0.2 && !events.some((e) => Math.abs(e.t - (beats[k] ?? 0)) < 2)) events.push({ t: beats[k] ?? 0, kind: 'section', w: Math.min(1, Math.abs(after - before) * 2) })
  }
  return { dur, beats, strength, downbeats, bpm, localBpm, energy, events: events.sort((a, b) => a.t - b.t) }
}

/* ---------------- adaptiv timing ---------------- */

/** Malens bevegelsesprofil: hvordan montasjen og animasjonene svarer på musikken (samme motor, ulik respons). */
export type MotionStyle = 'cinematic' | 'dynamic' | 'minimal' | 'typo'
export interface StyleRule {
  /**
   * klipplengde i montasjen ved høy / middels / lav intensitet, som faktor på malens egen lengde målt i slag (malens
   * rytme – også halve og kvarte slag – beholdes; lav intensitet holder lenger, høy kan dele slaget)
   */
  beats: [number, number, number]
  /** hvor rolig profilen er (1 = energisk): byttes profilen, skaleres malens rytme med forholdet mellom profilene */
  weight: number
  /** overgang som andel av et taktslag (null = malens egen lengde, begrenset til et halvt slag) */
  trans: number | null
  /** kutt og lite støt (zoom) på drops */
  punch: number
  /** hold klippet gjennom pauser */
  holdPause: boolean
  /** montasjen omstruktureres etter intensitet (ellers bare tidsavbildning – f.eks. tekst som skal stå på frasene) */
  restructure: boolean
}
export const STYLES: Record<MotionStyle, StyleRule> = {
  cinematic: { beats: [1, 1, 2], weight: 2, trans: 1, punch: 0, holdPause: true, restructure: true },
  dynamic: { beats: [1, 1, 2], weight: 1, trans: null, punch: 0.08, holdPause: true, restructure: true },
  minimal: { beats: [1, 1, 1.5], weight: 1.5, trans: 0.5, punch: 0, holdPause: true, restructure: true },
  typo: { beats: [1, 1, 2], weight: 1, trans: null, punch: 0.04, holdPause: true, restructure: false },
}

/**
 * Tidsavbildning malens tid → musikkens tid: malens taktslag k (k·P) går til musikkens slag (b0 + k), lineært mellom
 * slagene. Før første / etter siste slag brukes lokal periode. b0 velges så malens hovedøyeblikk (første kutt)
 * havner på et sterkt musikalsk øyeblikk (drop, takt-ener) når det er i nærheten.
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
interface ClipLike { kind: string; dur: number; in?: number; out?: number; speed?: number; trans: { type: string; dur: number }; kf?: Keys; effects?: { kind: string; v: number; v2?: number }[]; ph?: string; scale?: number }
interface TimedLike { start: number; dur: number; kf?: Keys }
interface ProjLike {
  tempo?: number
  motion?: MotionStyle
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

/**
 * Music Sync på et prosjekt (laget fra en mal): tid avbildes på musikken, montasjen får klipplengder etter intensitet
 * og malens stil, drops får kutt (og et lite støt i dynamiske maler), pauser holdes. Designet (layout, typografi, farger,
 * animasjonstype) røres ikke. `secTime(id)` = sekunder per enhet for tidsbaserte effektverdier (fra FX_DEFS).
 */
export function syncProject<P extends ProjLike>(base0: P, map: MusicMap, style: MotionStyle, opt: { songStart: number; fxSec: (kind: string) => { v: boolean; v2: boolean } }): SyncResult<P> {
  const rule = STYLES[style]
  // faktisk lengde på tidslinjen (som clipDur/ovDur): video = (ut − inn) / fart – `dur` brukes ikke for video (er 0)
  const isVid = (c: { kind: string; in?: number; out?: number }) => c.kind === 'video' && c.in !== undefined && c.out !== undefined
  const vDur = (c: { in?: number; out?: number; speed?: number }) => Math.max(0.1, ((c.out ?? 0) - (c.in ?? 0)) / (c.speed || 1))
  const base: P = {
    ...base0,
    clips: base0.clips.map((c) => ({ ...c, dur: isVid(c) ? vDur(c) : Math.max(0.2, c.dur || 4) })),
    ov: base0.ov.map((o) => (isVid(o) && !o.shape ? { ...o, dur: vDur(o) } : o)),
  }
  // video: samme start i kilden, fart etter ny lengde (innenfor 0,1–8×), slutten følger så lengden stemmer nøyaktig
  const fitV = <T extends { in?: number; out?: number }>(c: T, nd: number): { speed: number; out: number } => {
    const sp = Math.max(0.1, Math.min(8, ((c.out as number) - (c.in as number)) / nd))
    return { speed: sp, out: (c.in as number) + nd * sp }
  }
  const P = base.tempo ? 60 / base.tempo : 60 / Math.max(60, Math.min(200, map.bpm))
  // musikkens slag regnet fra sangens start i prosjektet (musikk-sporet kan starte senere i sangen)
  const beatsAll = map.beats.map((t) => t - opt.songStart).filter((t) => t >= -0.01)
  const offAll = map.beats.length - beatsAll.length
  // halv / dobbel takt: malens slag følger det slagnivået i musikken som ligger nærmest malens tempo (en mal på 83 BPM
  // mot en sang på 150 BPM følger hvert andre slag; mot en sang på 50 BPM også slagene midt mellom)
  const r = base.tempo ? map.bpm / base.tempo : 1
  const lvl = r > 1.45 ? 2 : r < 0.69 ? 0.5 : 1
  const ph = lvl === 2 ? (((map.downbeats.find((k) => k >= offAll) ?? offAll) - offAll) % 2) : 0
  const beatsRel = lvl === 2 ? beatsAll.filter((_, i) => i % 2 === ph) : lvl === 0.5 ? beatsAll.flatMap((b, i) => (i < beatsAll.length - 1 ? [b, (b + (beatsAll[i + 1] as number)) / 2] : [b])) : beatsAll
  const gi = (k: number) => offAll + Math.round((k * lvl) + (lvl === 2 ? ph : 0))
  const mm: MusicMap = { ...map, bpm: map.bpm / lvl, beats: beatsRel }
  // malens første kutt (hovedøyeblikket) – flyttes til nærmeste sterke slag (drop / takt-ener) innen ±2 takter
  const firstCut = base.clips[0]?.dur ?? 0
  const kCut = Math.round(firstCut / P)
  const strong = new Set<number>([...map.downbeats.map((k) => (k - offAll - (lvl === 2 ? ph : 0)) / lvl).filter((k) => Number.isInteger(k)), ...map.events.filter((e) => e.kind !== 'pause').map((e) => beatsRel.findIndex((b) => Math.abs(b - (e.t - opt.songStart)) < 0.08))])
  let b0 = 0
  for (let d = 0; d <= 8; d++) {
    if (strong.has(kCut + d) && kCut + d - kCut >= 0) {
      b0 = d
      break
    }
  }
  const warp = makeWarp(mm, P, b0)
  const w0 = warp(0)
  const W = (t: number) => Math.max(0, warp(t) - w0)
  const span = (a: number, d: number) => Math.max(0.05, W(a + d) - W(a))
  const localK = (t: number, d: number) => span(t, d) / Math.max(0.05, d)

  // brøkdels slagposisjon i sangen (fra sangens start i prosjektet) og tilbake; utenfor slagene: lokal periode
  const Ps = beatsRel.length > 1 ? ((beatsRel.at(-1) as number) - (beatsRel[0] as number)) / (beatsRel.length - 1) : 60 / Math.max(40, map.bpm)
  const posOf = (t: number): number => {
    const B = beatsRel
    if (!B.length) return t / Ps
    if (t <= (B[0] as number)) return (t - (B[0] as number)) / Ps
    if (t >= (B.at(-1) as number)) return B.length - 1 + (t - (B.at(-1) as number)) / Ps
    let lo = 0, hi = B.length - 1
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if ((B[m] as number) <= t) lo = m; else hi = m }
    return lo + (t - (B[lo] as number)) / Math.max(1e-6, (B[hi] as number) - (B[lo] as number))
  }
  const timeOf = (x: number): number => {
    const B = beatsRel
    if (!B.length) return x * Ps
    if (x <= 0) return (B[0] as number) + x * Ps
    if (x >= B.length - 1) return (B.at(-1) as number) + (x - (B.length - 1)) * Ps
    const k = Math.floor(x), a = B[k] as number, b = B[k + 1] as number
    return a + (x - k) * (b - a)
  }
  // malens egen profil → valgt profil: roligere profil gir lengre klipp (forhold), malens egen gir malens rytme
  const styleK = rule.weight / STYLES[base.motion ?? style].weight

  // 1) klippene: intro (malens egne) avbildes; montasjen (plassholdere etter første kutt) får lengde etter intensitet
  const out: ClipLike[] = []
  let tSrc = 0, tDst = 0
  // intensitet over en takt (fire slag rundt), ikke per slag – ellers ser tomme mellomslag ut som pauser
  const energyAt = (k: number) => {
    const i = gi(k)
    let sum = 0, n = 0
    for (let j = i - 1; j <= i + 2; j++) { const e = map.energy[j]; if (e !== undefined) { sum += e; n++ } }
    return n ? sum / n : 0.5
  }
  const isMontage = (i: number) => i > 0 && (base.clips[i]?.ph !== undefined || base.clips[i]?.kind !== 'color')
  for (let i = 0; i < base.clips.length; i++) {
    const c = base.clips[i] as ClipLike
    let nd: number
    if (!isMontage(i) || !rule.restructure) nd = span(tSrc, c.dur)
    else {
      // klipp i montasjen: malens egen lengde i slag (lynklipp på et kvart slag forblir lynklipp, en lang scene forblir
      // lang), justert for intensitet og profil; kuttene på musikkens slag (eller delslag); drops gir kutt; pauses holdes
      const pos = posOf(tDst + w0)
      const e = energyAt(Math.floor(pos))
      const own = c.dur / P
      let n = snapBeats(own * styleK * (e > 0.66 ? rule.beats[0] : e > 0.33 ? rule.beats[1] : rule.beats[2]))
      if (rule.holdPause) while (energyAt(Math.floor(pos + n)) < 0.12 && n < 16) n += Math.max(0.25, Math.min(1, n))
      // slutten på rutenettet (slag eller delslag n < 1): første klipp etter introen tar opp forskyvningen
      const q = n < 1 ? n : 1
      let pEnd = Math.round((pos + n) / q) * q
      if (pEnd < pos + q / 2) pEnd += q
      const tEnd = timeOf(pEnd)
      const drop = map.events.find((ev) => ev.kind === 'drop' && ev.t - opt.songStart > tDst + w0 + 0.05 && ev.t - opt.songStart < tEnd - 0.05)
      const end = drop ? drop.t - opt.songStart - w0 : tEnd - w0
      nd = Math.max(0.08, end - tDst)
    }
    const f = nd / Math.max(0.05, c.dur)
    const trans = { ...c.trans, dur: rule.trans !== null ? Math.min(nd / 2, rule.trans * P * localK(tSrc, c.dur)) : Math.min(c.trans.dur * f, nd / 2, 0.5 * P * localK(tSrc, c.dur)) }
    const nc: ClipLike = { ...c, trans, dur: nd }
    if (c.kind === 'video' && c.in !== undefined && c.out !== undefined) {
      // videoklipp: samme utsnitt av kilden, spilles raskere/saktere så lengden passer
      Object.assign(nc, fitV(c, nd))
    }
    if (c.kf) nc.kf = Object.fromEntries(Object.entries(c.kf).map(([n, l]) => [n, l.map((q) => ({ ...q, t: q.t * f }))]))
    if (c.effects) nc.effects = c.effects.map((ef) => { const s = opt.fxSec(ef.kind); return { ...ef, ...(s.v ? { v: ef.v * f } : {}), ...(s.v2 && ef.v2 !== undefined ? { v2: ef.v2 * f } : {}) } })
    // støt på drop: kort zoom inn på klippet som starter på dropet
    if (rule.punch && i > 0 && map.events.some((ev) => ev.kind === 'drop' && Math.abs(ev.t - opt.songStart - w0 - tDst) < 0.08)) {
      const s0 = c.scale ?? 1
      nc.kf = { ...(nc.kf ?? {}), scale: [{ t: 0, v: s0 * (1 + rule.punch) }, { t: Math.min(nd, 0.35), v: s0, e: 'out' }] }
    }
    out.push(nc)
    tSrc += c.dur
    tDst += nd
  }
  // tekster, overlegg, keyframes og annet følger klippene de står på: tidskartet går gjennom klippgrensene (før → etter)
  const S: number[] = [0], D: number[] = [0]
  base.clips.forEach((c, i) => {
    S.push((S[i] as number) + c.dur)
    D.push((D[i] as number) + (out[i] as ClipLike).dur)
  })
  const M = (t: number): number => {
    if (t <= 0) return t
    for (let i = 0; i < S.length - 1; i++) {
      const a = S[i] as number, b = S[i + 1] as number
      if (t <= b || i === S.length - 2) {
        const da = D[i] as number, db = D[i + 1] as number
        return da + ((t - a) / Math.max(1e-6, b - a)) * (db - da)
      }
    }
    return t
  }
  // fra nå av: alle tider gjennom M (lik W i intro, følger omstruktureringen i montasjen)
  const span2 = (a: number, d: number) => Math.max(0.05, M(a + d) - M(a))
  const kfM = (k: Keys | undefined, start: number, nStart: number): Keys | undefined =>
    k ? Object.fromEntries(Object.entries(k).map(([n, l]) => [n, l.map((q) => ({ ...q, t: M(start + q.t) - nStart }))])) : undefined
  const texts = base.texts.map((x) => {
    const ns = M(x.start)
    const nd = span2(x.start, x.dur)
    return { ...x, start: ns, dur: nd, ...(x.kf ? { kf: kfM(x.kf, x.start, ns) } : {}), ...(x.cdDur !== undefined ? { cdDur: span2(x.start, x.cdDur) } : {}) }
  })
  const ov = base.ov.map((o) => {
    const ns = M(o.start)
    const nd = span2(o.start, o.dur)
    const vid = o.kind === 'video' && !o.shape && o.in !== undefined && o.out !== undefined
    return {
      ...o, start: ns, dur: nd, fadeIn: span2(o.start, o.fadeIn), fadeOut: span2(o.start + o.dur - o.fadeOut, o.fadeOut),
      ...(vid ? fitV(o, nd) : {}),
      ...(o.kf ? { kf: kfM(o.kf, o.start, ns) } : {}),
      ...(o.matte?.brush ? { matte: { ...o.matte, brush: { ...o.matte.brush, t0: M(o.matte.brush.t0), dur: span2(o.matte.brush.t0, o.matte.brush.dur) } } } : {}),
    }
  })
  const subs = base.subs.map((x) => ({ ...x, start: M(x.start), end: M(x.end) }))
  // taktslagene som markører (synlige på tidslinjen), uten å røre brukerens egne markører
  const T = tDst
  const beatMarks = beatsAll.map((b) => b - w0).filter((t) => t >= 0 && t <= T).map((t, i) => ({ id: `sync-${i}`, t, label: 'Takt', color: '#f5b82c' }))
  const markers = [...base.markers.filter((k) => k.label !== 'Takt' && !k.id.startsWith('sync-')), ...beatMarks].sort((a, b) => a.t - b.t)
  // sangen starter slik at malens første slag (t = 0) faller på musikkens slag b0
  const music = base.music.map((m, i) => (i === 0 ? { ...m, in: Math.max(0, opt.songStart + w0), start: 0 } : m))
  return { proj: { ...base, clips: out, texts, ov, subs, markers, music }, bpm: map.bpm, cuts: out.length, events: map.events }
}
