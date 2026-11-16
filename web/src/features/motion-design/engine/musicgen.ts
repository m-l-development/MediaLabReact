/**
 * Testmusikk for Music Sync (syntetisk, laget her – fri bruk): syv stiler med kjent fasit (tempo, deler, drops).
 * Bare til tester: trommer (stortromme, skarptromme, hi-hat), bass, akkorder/teppe, stigninger og pauser, satt sammen i
 * deler (intro, vers, oppbygging, drop, pause, refreng, avslutning).
 */

export type GenStyle = 'calm' | 'edm' | 'trap' | 'pop' | 'cinematic' | 'drops' | 'irregular'
export interface GenSong { x: Float32Array; sr: number; bpm: number | null; dur: number; sections: { t: number; kind: string }[]; drops: number[] }

const SR = 22050

function rng(seed: number) {
  let s = seed >>> 0 || 1
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296 }
}

export function genSong(style: GenStyle, seed = 1): GenSong {
  const r = rng(seed * 7919 + style.length)
  const noise = () => r() * 2 - 1
  // deler: [lengde i takter, type, nivå 0–1, trommer (0 = ingen, 1 = lett, 2 = full), stigning]
  type Part = [number, string, number, number, boolean?]
  const plans: Record<GenStyle, { bpm: number | null; parts: Part[] }> = {
    calm: { bpm: 72, parts: [[4, 'intro', 0.35, 0], [8, 'verse', 0.5, 1], [8, 'high', 0.7, 1], [4, 'outro', 0.35, 0]] },
    edm: { bpm: 128, parts: [[8, 'intro', 0.45, 1], [8, 'build', 0.6, 1, true], [16, 'drop', 1, 2], [8, 'break', 0.3, 0], [8, 'build', 0.6, 1, true], [16, 'drop', 1, 2]] },
    trap: { bpm: 140, parts: [[4, 'intro', 0.4, 1], [16, 'verse', 0.75, 2], [8, 'high', 1, 2], [4, 'break', 0.35, 0], [16, 'high', 1, 2]] },
    pop: { bpm: 110, parts: [[4, 'intro', 0.45, 1], [8, 'verse', 0.6, 1], [8, 'high', 0.95, 2], [8, 'verse', 0.6, 1], [8, 'high', 1, 2], [4, 'outro', 0.4, 1]] },
    cinematic: { bpm: null, parts: [[6, 'intro', 0.25, 0], [8, 'build', 0.5, 0, true], [8, 'high', 1, 0], [6, 'outro', 0.3, 0]] },
    drops: { bpm: 150, parts: [[8, 'intro', 0.35, 1], [8, 'build', 0.55, 1, true], [2, 'break', 0.05, 0], [16, 'drop', 1, 2], [8, 'break', 0.3, 0], [16, 'drop', 1, 2]] },
    irregular: { bpm: 104, parts: [[8, 'verse', 0.6, 2], [8, 'high', 0.85, 2], [8, 'verse', 0.6, 2], [8, 'high', 0.9, 2]] },
  }
  const plan = plans[style]
  // tidspunkter for hver del (takter à 4 slag); ujevnt tempo: glir fra 90 til 118 BPM og tilbake med rubato
  const bpmAt = (bar: number) => (style === 'irregular' ? 90 + 28 * Math.sin((bar / 32) * Math.PI) + 3 * Math.sin(bar * 1.7) : (plan.bpm ?? 60))
  const sections: { t: number; kind: string }[] = []
  const drops: number[] = []
  let t = 0, bar = 0
  const beatTimes: { t: number; per: number; part: Part; bar: number; k: number }[] = []
  for (const p of plan.parts) {
    sections.push({ t, kind: p[1] })
    if (p[1] === 'drop') drops.push(t)
    for (let b = 0; b < p[0]; b++, bar++) {
      const per = 60 / bpmAt(bar)
      for (let k = 0; k < 4; k++) { beatTimes.push({ t, per, part: p, bar, k }); t += per }
    }
  }
  const dur = t + 1.5
  const x = new Float32Array(Math.round(dur * SR))
  const add = (t0: number, len: number, f: (u: number) => number, amp: number) => {
    const i0 = Math.round(t0 * SR)
    for (let i = 0; i < len * SR && i0 + i < x.length; i++) if (i0 + i >= 0) x[i0 + i] = (x[i0 + i] ?? 0) + f(i / SR) * amp
  }
  const kick = (t0: number, a: number) => add(t0, 0.25, (u) => Math.sin(2 * Math.PI * (50 + 110 * Math.exp(-u * 35)) * u) * Math.exp(-u * 9), a)
  const snare = (t0: number, a: number) => add(t0, 0.18, (u) => (noise() * 0.8 + Math.sin(2 * Math.PI * 190 * u) * 0.4) * Math.exp(-u * 22), a)
  const hat = (t0: number, a: number) => add(t0, 0.05, () => noise() * (r() > 0.5 ? 1 : -1), a * 0.6)
  const bass = (t0: number, len: number, f: number, a: number) => add(t0, len, (u) => Math.sin(2 * Math.PI * f * u) * Math.min(1, u * 40) * Math.exp(-u * 1.2), a)
  const chord = (t0: number, len: number, root: number, a: number) => add(t0, len, (u) => [1, 1.26, 1.5, 2].reduce((s, m) => s + Math.sin(2 * Math.PI * root * m * u), 0) * 0.25 * Math.min(1, u * 6) * Math.max(0, 1 - u / len), a)
  const roots = [220, 196, 174.6, 246.9]
  for (const b of beatTimes) {
    const [, kind, lvl, drums, rise] = b.part
    const L = lvl * (rise ? 0.6 + 0.4 * ((b.bar % 8) / 8) : 1)
    // akkorder / teppe på takt-ener
    if (b.k === 0) chord(b.t, b.per * 4, roots[b.bar % 4] as number, 0.18 * L)
    if (style === 'cinematic') {
      // ingen fast puls: pauker og strykere på uregelmessige steder, crescendo
      if (r() < 0.22) kick(b.t + r() * b.per * 0.9, 0.5 * L)
      if (b.k === 0) add(b.t, b.per * 4, (u) => Math.sin(2 * Math.PI * 110 * u) * Math.sin(Math.PI * Math.min(1, u / (b.per * 4))), 0.25 * L)
      continue
    }
    if (drums === 0) continue
    const full = drums === 2
    if (style === 'trap') {
      // halvtakt: stortromme synkopert, skarptromme på 3, hi-hat i 16-deler med trioler
      if (b.k === 0 || (b.k === 2 && b.bar % 2 === 1)) kick(b.t, 0.9 * L)
      if (b.k === 1 && full) kick(b.t + b.per * 0.75, 0.6 * L)
      if (b.k === 2) snare(b.t, 0.7 * L)
      for (let s = 0; s < 4; s++) hat(b.t + (s * b.per) / 4, 0.12 * L)
      if (b.k === 3 && b.bar % 2 === 0) for (let s = 0; s < 3; s++) hat(b.t + (s * b.per) / 3, 0.1 * L)
      if (b.k === 0) bass(b.t, b.per * 2, 55, 0.5 * L)
    } else if (style === 'calm') {
      if (b.k === 0 || b.k === 2) kick(b.t, 0.45 * L)
      hat(b.t + b.per / 2, 0.05 * L)
    } else {
      // firetakt (edm, pop, drops, ujevn)
      if (style === 'pop' ? b.k === 0 || b.k === 2 : true) kick(b.t, (full ? 1 : 0.6) * L)
      if (b.k === 1 || b.k === 3) snare(b.t, 0.55 * L)
      hat(b.t + b.per / 2, (full ? 0.2 : 0.1) * L)
      if (full) hat(b.t + b.per / 4, 0.08 * L)
      if (full && b.k === 0) bass(b.t, b.per * 4, kind === 'drop' ? 49 : 65, 0.6 * L)
      // oppbygging: skarptromme-virvel som tetner mot slutten
      if (rise && b.bar % 8 >= 6) for (let s = 1; s < (b.bar % 8 === 7 ? 8 : 4); s++) snare(b.t + (s * b.per) / (b.bar % 8 === 7 ? 8 : 4), 0.25 * L)
    }
  }
  // svak støy (rom)
  for (let i = 0; i < x.length; i++) x[i] = (x[i] ?? 0) + noise() * 0.004
  return { x, sr: SR, bpm: plan.bpm, dur, sections, drops }
}

export const GEN_STYLES: GenStyle[] = ['calm', 'edm', 'trap', 'pop', 'cinematic', 'drops', 'irregular']
