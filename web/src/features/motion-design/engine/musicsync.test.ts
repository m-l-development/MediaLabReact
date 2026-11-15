import { describe, expect, it } from 'vitest'
import { analyse, syncProject, type MotionStyle } from './musicsync'
import { clipDur, contentDur, create, layout, TEMPLATES, type Clip } from './model'
import { FX_DEFS } from './fx'

/**
 * Syntetisk musikk: tromme (lav, kraftig) på hvert slag, skarptromme på 2 og 4, hi-hat på åttedeler, et teppe av støy.
 * `parts` = [fra s, til s, bpm, nivå 0…1] – nivå 0 = pause, et sprang i nivå = drop, ulike bpm = tempoendring.
 */
function song(parts: [number, number, number, number][], sr = 22050, synco = false): Float32Array {
  const end = Math.max(...parts.map((p) => p[1]))
  const x = new Float32Array(Math.round(end * sr))
  let rnd = 1
  const noise = () => ((rnd = (rnd * 16807) % 2147483647) / 2147483647) * 2 - 1
  for (const [a, b, bpm, lvl] of parts) {
    const per = 60 / bpm
    for (let k = 0; a + k * per < b; k++) {
      const t0 = a + k * per
      const hit = (t: number, dur: number, fn: (u: number) => number, amp: number) => {
        const i0 = Math.round(t * sr)
        for (let i = 0; i < dur * sr && i0 + i < x.length; i++) x[i0 + i] = (x[i0 + i] ?? 0) + fn(i / sr) * amp * lvl * Math.exp(-i / sr / (dur / 4))
      }
      // synkopert: annethvert slag forskjøvet en åttedel
      const tk = synco && k % 2 === 1 ? t0 + per / 2 : t0
      hit(tk, 0.18, (u) => Math.sin(2 * Math.PI * (60 + 90 * Math.exp(-u * 30)) * u), 0.9)
      if (k % 4 === 1 || k % 4 === 3) hit(t0, 0.12, () => noise(), 0.45)
      hit(t0 + per / 2, 0.04, () => noise(), 0.15)
    }
    for (let i = Math.round(a * sr); i < Math.round(b * sr) && i < x.length; i++) x[i] = (x[i] ?? 0) + noise() * 0.02 * lvl
  }
  return x
}
const SR = 22050
const near = (v: number, list: number[], tol: number) => list.some((x) => Math.abs(x - v) <= tol)
const tempoOk = (got: number, want: number) => [want, want * 2, want / 2].some((w) => Math.abs(got - w) / w < 0.04)

describe('Music Sync – analyse av musikk', () => {
  for (const bpm of [70, 110, 160]) {
    it(`tempo og taktslag: ${bpm} BPM`, () => {
      const m = analyse(song([[0, 24, bpm, 1]]), SR)
      expect(tempoOk(m.bpm, bpm), `fant ${m.bpm.toFixed(1)} BPM`).toBe(true)
      // slagene ligger på trommeslagene (eller midt mellom ved dobbel takt)
      const per = 60 / bpm
      const hits = Array.from({ length: Math.floor(24 / per) }, (_, k) => k * per)
      const mid = hits.map((h) => h + per / 2)
      const ok = m.beats.filter((b) => b > 2 && b < 22).filter((b) => near(b, hits, 0.06) || near(b, mid, 0.06)).length
      expect(ok / m.beats.filter((b) => b > 2 && b < 22).length).toBeGreaterThan(0.85)
      expect(m.downbeats.length).toBeGreaterThan(2)
    })
  }
  it('synkopert rytme: finner fortsatt en stabil takt', () => {
    const m = analyse(song([[0, 24, 120, 1]], SR, true), SR)
    expect(m.beats.length).toBeGreaterThan(20)
    expect(m.bpm).toBeGreaterThan(55)
    expect(m.bpm).toBeLessThan(250)
  })
  it('pause og drop: rolig start, pause, så kraftig parti', () => {
    const m = analyse(song([[0, 8, 120, 0.25], [8, 10, 120, 0], [10, 22, 120, 1]]), SR)
    expect(m.events.some((e) => e.kind === 'pause' && e.t > 7 && e.t < 10.5), JSON.stringify(m.events)).toBe(true)
    expect(m.events.some((e) => e.kind === 'drop' && e.t > 9 && e.t < 11.5), JSON.stringify(m.events)).toBe(true)
    // intensiteten er lav før og høy etter dropet
    const iBefore = m.beats.findIndex((b) => b > 4), iAfter = m.beats.findIndex((b) => b > 14)
    expect((m.energy[iAfter] ?? 0) - (m.energy[iBefore] ?? 0)).toBeGreaterThan(0.3)
  })
  it('tempoendring 100 → 140 BPM: lokalt tempo følger', () => {
    const m = analyse(song([[0, 14, 100, 1], [14, 28, 140, 1]]), SR)
    const at = (t: number) => m.localBpm[m.beats.findIndex((b) => b > t)] ?? 0
    expect(tempoOk(at(6), 100), `tidlig ${at(6)}`).toBe(true)
    expect(tempoOk(at(22), 140), `sent ${at(22)}`).toBe(true)
  })
})

const fxSec = (k: string) => { const d = FX_DEFS[k as keyof typeof FX_DEFS]; return { v: d?.unit === 's', v2: !!d?.l2 && /\(s\)/.test(d.l2) } }
const fmt = { k: 'wide', w: 1920, h: 1080 }
function music(p: ReturnType<typeof create>, sec: number) {
  return { ...p, music: [{ id: 'mu', lane: 0, media: 'm', name: 's', start: 0, in: 0, out: sec, srcDur: sec, vol: 0.8, fadeIn: 0, fadeOut: 0, loop: false }] }
}

describe('Music Sync på malene', () => {
  const slow = analyse(song([[0, 40, 80, 1]]), SR)
  const fast = analyse(song([[0, 40, 150, 1]]), SR)
  const dropSong = analyse(song([[0, 10, 120, 0.3], [10, 11, 120, 0], [11, 40, 120, 1]]), SR)

  for (const k of ['theend', 'october', 'vacation', 'andwiththat', 'maydump']) {
    it(`${k}: kuttene i montasjen ligger på musikkens slag (eller delslag når malen kutter raskere), designet er uendret`, () => {
      const base = music(create(fmt, k), 40)
      const r = syncProject(base, fast, 'dynamic', { songStart: 0, fxSec })
      const b1 = fast.beats.map((b) => b - (r.proj.music[0]?.in ?? 0))
      // slag og delslag (halve og kvarte): malens lynklipp beholder sin rytme, men på musikkens rutenett
      const beats = b1.flatMap((b, i) => { const n = b1[i + 1]; return n === undefined ? [b] : [b, b + (n - b) / 4, b + (n - b) / 2, b + (3 * (n - b)) / 4] })
      let t = 0
      const cuts: number[] = []
      for (const c of r.proj.clips) { t += c.dur; cuts.push(t) }
      const first = base.clips[0]?.dur ?? 0
      // kutt mens musikken spiller (etter sangens slutt finnes ingen slag)
      const inSong = cuts.slice(1, -1).filter((c) => c > first && c < (b1.at(-1) ?? 0))
      const onBeat = inSong.filter((c) => near(c, beats, 0.03)).length
      expect(onBeat / Math.max(1, inSong.length)).toBeGreaterThan(0.9)
      // design: tekst (innhold, font, farge, plassering) og rammer (form, farge, plassering) er de samme
      expect(r.proj.texts.map((x) => [x.text, x.font, x.color, x.x, x.y, x.size, x.anim])).toEqual(base.texts.map((x) => [x.text, x.font, x.color, x.x, x.y, x.size, x.anim]))
      expect(r.proj.ov.map((o) => [o.shape, o.x, o.y, o.scale, o.ph])).toEqual(base.ov.map((o) => [o.shape, o.x, o.y, o.scale, o.ph]))
      expect(r.proj.clips.map((c) => (c.kind === 'color' ? c.c1 : c.kind))).toEqual(base.clips.map((c) => (c.kind === 'color' ? c.c1 : c.kind)))
    })
  }

  it('samme mal: rask musikk gir tettere kutt enn sakte musikk', () => {
    const base = music(create(fmt, 'theend'), 40)
    const n = (m: typeof slow) => {
      const r = syncProject(base, m, 'dynamic', { songStart: 0, fxSec })
      return r.proj.clips.slice(1, 12).reduce((s, c) => s + c.dur, 0)
    }
    expect(n(fast)).toBeLessThan(n(slow) * 0.75)
  })

  it('ulike profiler svarer ulikt på samme musikk (filmatisk roligere enn dynamisk), samme motor', () => {
    const base = music(create(fmt, 'travelvlog'), 40)
    const avg = (st: MotionStyle) => {
      const r = syncProject(base, fast, st, { songStart: 0, fxSec })
      const m = r.proj.clips.slice(1)
      return m.reduce((s, c) => s + c.dur, 0) / m.length
    }
    expect(avg('cinematic')).toBeGreaterThan(avg('dynamic') * 1.5)
    expect(avg('minimal')).toBeGreaterThan(avg('dynamic'))
  })

  it('drop: et kutt på dropet, og dynamiske maler får et lite zoom-støt der', () => {
    const base = music(create(fmt, 'vacation'), 40)
    const r = syncProject(base, dropSong, 'dynamic', { songStart: 0, fxSec })
    const drop = dropSong.events.find((e) => e.kind === 'drop')
    expect(drop).toBeTruthy()
    let t = 0
    const starts = r.proj.clips.map((c) => { const s = t; t += c.dur; return s })
    const w0 = r.proj.music[0]?.in ?? 0
    const i = starts.findIndex((s) => Math.abs(s + w0 - (drop?.t ?? 0)) < 0.06)
    expect(i, 'kutt på dropet').toBeGreaterThan(0)
    expect(r.proj.clips[i]?.kf?.scale?.length ?? 0, 'zoom-støt').toBeGreaterThan(1)
    // filmatisk: ingen støt
    const rc = syncProject(base, dropSong, 'cinematic', { songStart: 0, fxSec })
    expect(rc.proj.clips.some((c) => c.kf?.scale)).toBe(false)
  })

  it('typografisk (sangtekst): tekstene står fortsatt på frasene sine (bare tidsavbildning)', () => {
    const base = music(create(fmt, 'lyricvideo'), 60)
    const r = syncProject(base, slow, 'typo', { songStart: 0, fxSec })
    // hver tekst ligger fortsatt innenfor klippet (frasen) den hørte til
    const clipAt = (p: typeof base, t: number) => { let s = 0; for (let i = 0; i < p.clips.length; i++) { const d = p.clips[i]?.dur ?? 0; if (t < s + d) return i; s += d } return -1 }
    base.texts.forEach((x, i) => expect(clipAt(r.proj, (r.proj.texts[i]?.start ?? 0) + 0.01), x.text).toBe(clipAt(base, x.start + 0.01)))
  })

  it('alle maler (alle profiler) kan synkroniseres uten feil', () => {
    for (const tp of TEMPLATES) {
      for (const st of ['cinematic', 'dynamic', 'minimal', 'typo'] as const) {
        const base = music(create(fmt, tp.k), 40)
        const r = syncProject(base, fast, st, { songStart: 0, fxSec })
        expect(r.proj.clips.length, tp.k).toBe(base.clips.length)
        for (const c of r.proj.clips) expect(Number.isFinite(c.dur) && c.dur > 0, tp.k).toBe(true)
        for (const x of r.proj.texts) expect(Number.isFinite(x.start) && x.dur > 0, tp.k).toBe(true)
      }
    }
  })

  it('utfylte felt (egne videoer med dur 0 og bilder): lengden er riktig, video spilles på nøyaktig ny lengde', () => {
    for (const k of ['theend', 'october', 'vacation', 'andwiththat']) {
      const b0 = music(create(fmt, k), 40)
      // som «Fyll alle plassholderne»: annethvert felt video (dur 0, in/out i kilden), ellers bilde
      let n = 0
      const clips = b0.clips.map((c) => (c.kind === 'color' && c.ph ? (n++ % 2 ? { ...c, kind: 'image' as const, media: 'b', dur: c.dur } : { ...c, kind: 'video' as const, media: 'v', dur: 0, in: 0.3, out: 0.3 + c.dur, speed: 1 }) : c)) as typeof b0.clips
      const base = { ...b0, clips }
      const before = contentDur(base)
      const r = syncProject(base, fast, 'dynamic', { songStart: 0, fxSec })
      const after = contentDur(r.proj)
      expect(after, `${k}: ${before.toFixed(1)} s → ${after.toFixed(1)} s`).toBeLessThan(before * 2)
      expect(after).toBeGreaterThan(before * 0.4)
      for (const x of r.proj.texts) expect(x.start + x.dur, k).toBeLessThan(after + 0.01)
      // videoklippene: (ut − inn) / fart = lengden i den nye montasjen
      let t = 0
      const ends = r.proj.clips.map((c) => (t += clipDur(c as Clip)))
      expect(ends.at(-1)).toBeCloseTo(layout(r.proj).at(-1)?.end ?? 0, 1)
      for (const c of r.proj.clips) if (c.kind === 'video') expect(c.in).toBe(0.3)
    }
  })

  it('malens egen rytme beholdes: lynmontasje forblir lynmontasje, en lang scene forblir lang', () => {
    const mid = analyse(song([[0, 40, 112, 1]]), SR)
    const per = 60 / mid.bpm
    const dc = syncProject(music(create(fmt, 'daycount'), 40), mid, 'dynamic', { songStart: 0, fxSec })
    const m = dc.proj.clips.slice(1).map((c) => c.dur)
    expect(m.reduce((s, x) => s + x, 0) / m.length, 'lynklippene i dagtelleren er kortere enn et slag').toBeLessThan(per)
    const ny = syncProject(music(create(fmt, 'newyork'), 40), mid, 'cinematic', { songStart: 0, fxSec })
    expect(ny.proj.clips[1]?.dur ?? 0, 'avsløringen i New York er fortsatt lang').toBeGreaterThan(3)
  })

  it('halv / dobbel takt: en mal på 83 BPM mot 150 og 40 BPM følger nærmeste slagnivå (lengden omtrent som malen)', () => {
    const base = music(create(fmt, 'october'), 60)
    const T0 = contentDur(base)
    for (const bpm of [150, 166, 42]) {
      const m = analyse(song([[0, 60, bpm, 1]]), SR)
      const T = contentDur(syncProject(base, m, 'dynamic', { songStart: 0, fxSec }).proj)
      expect(T / T0, `${bpm} BPM: ${T0.toFixed(1)} s → ${T.toFixed(1)} s`).toBeGreaterThan(0.5)
      expect(T / T0).toBeLessThan(1.6)
    }
  })
})
