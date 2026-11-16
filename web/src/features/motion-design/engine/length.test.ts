import { describe, expect, it } from 'vitest'
import { resizeProject } from './length'
import { contentDur, create, layout, TEMPLATES, totalDur } from './model'
import { analyse, minClip, syncProject } from './musicsync'
import { genSong } from './musicgen'
import { FX_DEFS } from './fx'

const fmt = { k: 'wide', w: 1920, h: 1080 }
const fxSec = (k: string) => { const d = FX_DEFS[k as keyof typeof FX_DEFS]; return { v: d?.unit === 's', v2: !!d?.l2 && /\(s\)/.test(d.l2) } }

describe('Lengde: forlenge og forkorte malene', () => {
  for (const tp of TEMPLATES.filter((t) => t.k !== 'blank')) {
    it(`${tp.k}: original, 15, 30, 60 s og kortere – nøyaktig lengde, ingenting utenfor, designet beholdes`, () => {
      const p = create(fmt, tp.k)
      const T0 = totalDur(p)
      for (const T of [T0, 15, 30, 60, Math.max(4, T0 * 0.6)]) {
        const r = resizeProject(p, T)
        const tag = `${tp.k} → ${T.toFixed(1)} s`
        expect(Math.abs(totalDur(r) - T), tag).toBeLessThan(0.02)
        expect(contentDur(r), tag).toBeLessThanOrEqual(T + 0.02)
        const L = layout(r)
        for (const x of L) expect(x.dur, `${tag}: klipp ${x.i}`).toBeGreaterThanOrEqual(0.19)
        for (const x of r.texts) expect(x.start >= 0 && x.start < T && x.start + x.dur <= T + 0.02, `${tag}: ${x.text}`).toBe(true)
        for (const o of r.ov) expect(o.start >= 0 && o.start < T, tag).toBe(true)
        // samme tekster og stil (innholdet og designet er uendret)
        expect(r.texts.map((x) => [x.text, x.font, x.color, x.size, x.anim])).toEqual(p.texts.map((x) => [x.text, x.font, x.color, x.size, x.anim]))
        if (p.clips.length > 3) {
          // montasje: introen er uendret; plassholdernumrene er unike
          expect(r.clips[0]?.id).toBe(p.clips[0]?.id)
          const phs = r.clips.map((c) => (c.kind === 'color' ? c.ph : undefined)).filter(Boolean)
          expect(new Set(phs).size, tag).toBe(phs.length)
          if (T > T0 + 1) expect(r.clips.length, `${tag}: flere klipp (nye medieplasser)`).toBeGreaterThan(p.clips.length)
          if (T < T0 - 1) expect(r.clips.length, `${tag}: færre klipp`).toBeLessThanOrEqual(p.clips.length)
          // slutten er fortsatt slutten (siste klipp er malens siste)
          expect(r.clips.at(-1)?.id).toBe(p.clips.at(-1)?.id)
        }
      }
    })
  }

  it('det som varer til slutten, følger slutten (rulleteksten i THE END strekkes over den nye lengden)', () => {
    const p = create(fmt, 'theend')
    const T0 = totalDur(p)
    const credits = p.texts.filter((x) => x.start + x.dur >= T0 - 0.4)
    expect(credits.length).toBeGreaterThan(0)
    const r = resizeProject(p, T0 + 20)
    for (const c of credits) { const n = r.texts.find((x) => x.id === c.id)!; expect(n.start + n.dur).toBeGreaterThan(T0 + 19.5) }
  })

  it('lengde + Music Sync: nøyaktig valgt lengde, kuttene på slagene, ingen blink-klipp', { timeout: 120_000 }, () => {
    const g = genSong('pop')
    const m = analyse(g.x, g.sr)
    for (const k of ['vacation', 'october', 'theend', 'maydump', 'travelvlog']) {
      for (const T of [30, 60]) {
        // som appen: nye klipp minst så lange som profilen klipper (Music Sync er på)
        const p0 = create(fmt, k)
        const own = p0.clips.slice(1).map((c) => c.dur).sort((a, b) => a - b)
        const mc = minClip(p0.motion ?? 'dynamic', own[Math.floor(own.length / 2)] ?? 1) * 1.6
        const base = { ...resizeProject(p0, T, { minClip: mc }), music: [{ id: 'mu', lane: 0, media: 'm', name: 's', start: 0, in: 0, out: g.dur, srcDur: g.dur, vol: 0.8, fadeIn: 0, fadeOut: 2, loop: false }] }
        const r = syncProject(base, m, base.motion ?? 'dynamic', { songStart: 0, fxSec, target: T })
        const tag = `${k} ${T} s`
        expect(Math.abs(totalDur(r.proj) - T), tag).toBeLessThan(0.02)
        expect(contentDur(r.proj), tag).toBeLessThanOrEqual(T + 0.02)
        const L = layout(r.proj)
        for (const x of L.slice(1)) expect(x.dur, tag).toBeGreaterThanOrEqual(0.24)
        // ingen lang, stillestående slutt (resten fordeles på montasjen; et avsluttende hold på høyst ≈ to takter er greit)
        expect(L.at(-1)?.dur ?? 0, `${tag}: siste klipp`).toBeLessThanOrEqual(4)
        const song0 = r.proj.music[0]?.in ?? 0
        const beats = m.beats.map((b) => b - song0)
        const grid = beats.flatMap((b, i) => (beats[i + 1] !== undefined ? [b, (b + (beats[i + 1] as number)) / 2] : [b]))
        const cuts = L.slice(1).map((x) => x.start + x.tr / 2).filter((t) => t < T - 0.5)
        const on = cuts.filter((c) => grid.some((q) => Math.abs(q - c) < 0.035)).length
        expect(on / Math.max(1, cuts.length), `${tag}: ${on}/${cuts.length} på slagene`).toBeGreaterThan(0.8)
      }
    }
  })
})
