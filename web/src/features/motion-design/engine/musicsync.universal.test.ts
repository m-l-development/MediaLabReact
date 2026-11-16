/**
 * Music Sync – universell musikkstøtte: hver mal med syv musikalsk ulike spor (rolig, rask elektronisk, trap, pop,
 * filmmusikk uten fast takt, store drops, ujevnt tempo). Krav (eierens): ingen blink-klipp, kutt på slagene når takten er
 * tydelig, variasjon i klipplengdene (ikke mekanisk lik rytme), roligere partier holder lenger enn kraftige, kutt på
 * dropene, ingenting utenfor prosjektets varighet, og designet (tekst, farger, animasjon) er uendret.
 */
import { describe, expect, it } from 'vitest'
import { analyse, minClip, syncProject, type MotionStyle, type MusicMap } from './musicsync'
import { genSong, GEN_STYLES, type GenStyle } from './musicgen'
import { contentDur, create, layout, TEMPLATES, totalDur } from './model'
import { FX_DEFS } from './fx'

const fxSec = (k: string) => { const d = FX_DEFS[k as keyof typeof FX_DEFS]; return { v: d?.unit === 's', v2: !!d?.l2 && /\(s\)/.test(d.l2) } }
const fmt = { k: 'wide', w: 1920, h: 1080 }
const SONGS = new Map<GenStyle, { map: MusicMap; dur: number; drops: number[] }>()
const songOf = (st: GenStyle) => {
  let s = SONGS.get(st)
  if (!s) { const g = genSong(st); s = { map: analyse(g.x, g.sr), dur: g.dur, drops: g.drops }; SONGS.set(st, s) }
  return s
}
const withMusic = <P extends { music: unknown[] }>(p: P, sec: number): P => ({ ...p, music: [{ id: 'mu', lane: 0, media: 'm', name: 's', start: 0, in: 0, out: sec, srcDur: sec, vol: 0.8, fadeIn: 0, fadeOut: 0, loop: false }] })

describe('Music Sync – analyse av ulike sjangre', () => {
  it('tempo (eller halv/dobbel takt), tydelig puls bare der det finnes takt, og dropene finnes', { timeout: 120_000 }, () => {
    for (const st of GEN_STYLES) {
      const g = genSong(st)
      const m = songOf(st).map
      if (st === 'cinematic') expect(m.pulse ?? 1, 'filmmusikk uten fast takt').toBeLessThan(0.3)
      else expect(m.pulse ?? 0, st).toBeGreaterThan(0.3)
      if (g.bpm && st !== 'irregular' && st !== 'cinematic') expect([g.bpm, g.bpm * 2, g.bpm / 2].some((w) => Math.abs(m.bpm - w) / w < 0.03), `${st}: ${m.bpm.toFixed(1)} BPM`).toBe(true)
      for (const d of g.drops) expect(m.events.some((e) => e.kind === 'drop' && Math.abs(e.t - d) < 0.3), `${st}: drop ${d.toFixed(1)} s`).toBe(true)
      expect((m.sections ?? []).length, st).toBeGreaterThan(1)
    }
  })
})

describe('Music Sync – alle maler × alle sjangre', () => {
  const montage = TEMPLATES.filter((t) => t.k !== 'blank')
  for (const tp of montage) {
    it(`${tp.k}: fungerer med alle syv sjangrene`, { timeout: 120_000 }, () => {
      const base0 = create(fmt, tp.k)
      const styles: MotionStyle[] = base0.clips.length > 6 ? ['cinematic', 'dynamic', 'minimal', 'typo'] : [base0.motion ?? 'dynamic']
      for (const gs of GEN_STYLES) {
        const s = songOf(gs)
        for (const st of styles) {
          const base = withMusic(base0, s.dur)
          const r = syncProject(base, s.map, st, { songStart: 0, fxSec })
          const p = r.proj
          const tag = `${tp.k}/${gs}/${st}`
          // samme klipp, alle lengder gyldige
          expect(p.clips.length, tag).toBe(base.clips.length)
          const L = layout(p)
          for (const x of L) expect(Number.isFinite(x.dur) && x.dur > 0, tag).toBe(true)
          // ingen blink-klipp i montasjen (profilens minste lengde, litt slingringsmonn for overgangene)
          const own = base.clips.slice(1).map((c) => c.dur).sort((a, b) => a - b)
          const mn = minClip(st, own[Math.floor(own.length / 2)] ?? 1)
          if (base.clips.length > 1) for (const x of L.slice(1)) expect(x.dur, `${tag}: klipp ${x.i} er ${x.dur.toFixed(2)} s`).toBeGreaterThanOrEqual(mn * 0.9 - 0.02)
          // ingenting utenfor prosjektets varighet; tekster og rammer starter innenfor
          const T = totalDur(p)
          expect(T, tag).toBeGreaterThan(0.5)
          expect(contentDur(p), tag).toBeLessThanOrEqual(T + 0.01)
          for (const x of p.texts) expect(x.start >= -0.001 && x.start < T, `${tag}: tekst ${x.text}`).toBe(true)
          for (const o of p.ov) expect(o.start >= -0.001 && o.start < T, tag).toBe(true)
          // slutter tekster og overlegg innenfor klippene i malen, gjør de det etter synkroniseringen også (ellers blir
          // videoen lengre enn klippene – f.eks. en utgangsanimasjon lagt etter siste kutt)
          const bEnd = layout(base).at(-1)?.end ?? 0
          const nEnd = L.at(-1)?.end ?? 0
          base.ov.forEach((o, k) => { if (o.start + o.dur <= bEnd + 0.01) { const q = p.ov[k]!; expect(q.start + q.dur, `${tag}: overlegg ${k}`).toBeLessThanOrEqual(nEnd + 0.02) } })
          base.texts.forEach((x, k) => { if (x.start + x.dur <= bEnd + 0.01) { const q = p.texts[k]!; expect(q.start + q.dur, `${tag}: tekst ${x.text}`).toBeLessThanOrEqual(nEnd + 0.02) } })
          // designet er uendret
          expect(p.texts.map((x) => [x.text, x.font, x.color, x.size, x.anim])).toEqual(base.texts.map((x) => [x.text, x.font, x.color, x.size, x.anim]))
          const mont = L.slice(1)
          const song0 = p.music[0]?.in ?? 0
          const beats = s.map.beats.map((b) => b - song0)
          const cuts = mont.map((x) => x.start + x.tr / 2).filter((t) => t < (beats.at(-1) ?? 0))
          // kutt på slagene (eller halve slag) når takten er tydelig
          if ((s.map.pulse ?? 0) >= 0.3 && cuts.length >= 4) {
            const grid = beats.flatMap((b, i) => (beats[i + 1] !== undefined ? [b, (b + (beats[i + 1] as number)) / 2] : [b]))
            const on = cuts.filter((c) => grid.some((g) => Math.abs(g - c) < 0.035)).length
            expect(on / cuts.length, `${tag}: ${on}/${cuts.length} kutt på slagene`).toBeGreaterThan(0.85)
          }
          // variasjon: ikke mekanisk like lange klipp
          if (mont.length >= 8) {
            const d = mont.slice(0, -1).map((x) => x.dur)
            const m = d.reduce((a, b) => a + b, 0) / d.length
            const sd = Math.sqrt(d.reduce((a, b) => a + (b - m) ** 2, 0) / d.length)
            // (Minimal er den roligste profilen og har bevisst jevnere rytme)
            expect(sd / m, `${tag}: variasjon`).toBeGreaterThan(st === 'minimal' ? 0.08 : 0.12)
          }
          // dropene får kutt (når montasjen er der da)
          if (mont.length >= 6) for (const dt of s.drops) {
            const t = dt - song0
            if (t <= (L[0]?.end ?? 0) + 0.5 || t >= (mont.at(-1)?.start ?? 0)) continue
            expect(cuts.some((c) => Math.abs(c - t) < 0.06), `${tag}: kutt på dropet ${t.toFixed(2)} s`).toBe(true)
          }
        }
      }
    })
  }

  it('dramaturgi: roligere deler holder lenger enn kraftige (samme mal, samme profil)', { timeout: 120_000 }, () => {
    for (const k of ['andwiththat', 'october', 'daycount', 'theend', 'vacation']) {
      for (const gs of ['edm', 'drops', 'pop'] as const) {
        const s = songOf(gs)
        const base = withMusic(create(fmt, k), s.dur)
        const r = syncProject(base, s.map, 'dynamic', { songStart: 0, fxSec })
        const L = layout(r.proj).slice(1, -1)
        const song0 = r.proj.music[0]?.in ?? 0
        const secs = (s.map.sections ?? []).map((x) => ({ ...x, t0: x.t0 - song0, t1: x.t1 - song0 }))
        const at = (t: number) => secs.find((x) => t >= x.t0 && t < x.t1)
        const calm = L.filter((x) => { const q = at(x.start + 0.01); return q && (q.kind === 'break' || q.kind === 'intro' || q.energy < 0.35) }).map((x) => x.dur)
        const high = L.filter((x) => { const q = at(x.start + 0.01); return q && (q.kind === 'drop' || q.kind === 'high') }).map((x) => x.dur)
        if (calm.length < 2 || high.length < 4) continue
        const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length
        expect(avg(calm), `${k}/${gs}: rolig ${avg(calm).toFixed(2)} s, kraftig ${avg(high).toFixed(2)} s`).toBeGreaterThan(avg(high) * 1.3)
      }
    }
  })
})
