import { describe, expect, it } from 'vitest'
import { cdAfter, cdBefore, cdStart, fmtTC, moveLane, spanOf, splitOv, splitSub, trackName, trimAt } from './edit'
import { create, FORMATS, layout, mediaClip, music, overlay, text, type Media, type Project } from './model'

const wide = FORMATS[3] ?? { k: 'wide', name: '', ratio: '', w: 1920, h: 1080 }
const vid: Media = { id: 'm-v', name: 'v.mp4', kind: 'video', dur: 10, w: 1920, h: 1080, thumb: '' }
const img: Media = { id: 'm-i', name: 'i.png', kind: 'image', dur: 0, w: 1920, h: 1080, thumb: '' }
const aud: Media = { id: 'm-a', name: 'a.mp3', kind: 'audio', dur: 30, w: 0, h: 0, thumb: '' }

function proj(): Project {
  const p = create(wide, 'blank')
  const none = { trans: { type: 'none', dur: 0.5 } }
  return { ...p, media: [vid, img, aud], clips: [mediaClip(vid, { id: 'c1', ...none }), mediaClip(img, { id: 'c2', ...none, kb: false })], ov: [overlay(img, { id: 'o1', start: 2, dur: 4, lane: 0 })], music: [music(aud, { id: 'a1', start: 1, in: 0, out: 20 })], texts: [], subs: [{ id: 's1', start: 1, end: 3, text: 'Hei' }] }
}
const ok = (r: ReturnType<typeof trimAt>): Project => {
  if ('err' in r) throw new Error(r.err)
  return r.p
}

describe('avansert tidslinje', () => {
  it('tidskode og spornavn', () => {
    expect(fmtTC(0)).toBe('00:00:00:00')
    expect(fmtTC(61.5)).toBe('00:01:01:15')
    expect(fmtTC(3600)).toBe('01:00:00:00')
    const p = proj()
    expect(trackName(p, 'clip')).toBe('V1')
    expect(trackName(p, 'ov', 0)).toBe('V2')
    expect(trackName(p, 'music', 0)).toBe('A1')
  })

  it('hovedsporet: start, slutt og trim til spillehodet (ripple)', () => {
    const p = proj()
    expect(spanOf(p, 'clip', 'c2')).toEqual({ start: 10, end: 14, dur: 4 })
    const a = ok(trimAt(p, 'clip', 'c1', 3, 'l'))
    expect(a.clips[0]).toMatchObject({ in: 3, out: 10 })
    expect(layout(a)[1]?.start, 'klippet etter flytter seg').toBe(7)
    const b = ok(trimAt(p, 'clip', 'c1', 6, 'r'))
    expect(b.clips[0]).toMatchObject({ in: 0, out: 6 })
    const c = ok(trimAt(p, 'clip', 'c2', 12, 'r'))
    expect(spanOf(c, 'clip', 'c2')?.dur).toBe(2)
    expect(trimAt(p, 'clip', 'c1', 12, 'l')).toEqual({ err: 'outside' })
  })

  it('videospor, lydspor og undertekst: trim og deling', () => {
    const p = proj()
    const a = ok(trimAt(p, 'ov', 'o1', 3, 'l'))
    expect(a.ov[0]).toMatchObject({ start: 3, dur: 3 })
    const m = ok(trimAt(p, 'music', 'a1', 6, 'l'))
    expect(m.music[0]).toMatchObject({ start: 6, in: 5, out: 20 })
    const s = splitOv(p, 'o1', 4)
    if ('err' in s) throw new Error(s.err)
    expect(s.p.ov.map((x) => [x.start, x.dur])).toEqual([[2, 2], [4, 2]])
    expect(s.p.ov[1]?.id).toBe(s.id)
    const u = splitSub(p, 's1', 2)
    if ('err' in u) throw new Error(u.err)
    expect(u.p.subs.map((x) => [x.start, x.end])).toEqual([[1, 2], [2, 3]])
  })

  it('flytt mellom spor: nytt spor øverst; opptatt spor gir et nytt spor over/under det', () => {
    const p = { ...proj(), ov: [overlay(img, { id: 'o1', start: 2, dur: 4, lane: 0 }), overlay(img, { id: 'o2', start: 3, dur: 4, lane: 1 })], lanes: { ...proj().lanes, ov: 2 } }
    const ins = moveLane(p, 'ov', 'o2', -1)
    if ('err' in ins) throw new Error(ins.err)
    expect(ins.p.ov.map((x) => [x.id, x.lane])).toEqual([['o1', 1], ['o2', 0]])
    const insD = moveLane(p, 'ov', 'o1', 1)
    if ('err' in insD) throw new Error(insD.err)
    expect(insD.p.ov.map((x) => [x.id, x.lane])).toEqual([['o1', 2], ['o2', 1]])
    const up = moveLane(p, 'ov', 'o1', -1)
    if ('err' in up) throw new Error(up.err)
    expect(up.p.ov.map((x) => x.lane)).toEqual([0, 2])
    expect(up.p.lanes.ov).toBe(3)
    const down = moveLane(p, 'ov', 'o2', 1)
    if ('err' in down) throw new Error(down.err)
    expect(down.p.ov.find((x) => x.id === 'o2')?.lane).toBe(2)
  })
})

describe('nedtelling ved deling og trim (TB-EB63E9)', () => {
  const cd = (o: Partial<import('./model').TextItem>) => text({ start: 0, dur: 1200, countdown: true, cdFrom: null, ...o })
  it('delen etter kuttet fortsetter der nedtellingen var; delen før beholder startverdien', () => {
    const x = cd({})
    expect(cdStart(x)).toBe(1200)
    expect(cdBefore(x)).toEqual({ cdFrom: 1200 })
    expect(cdAfter(x, 300)).toEqual({ cdFrom: 900 })
    expect(cdAfter(cd({ cdFrom: 60, dur: 60 }), 75)).toEqual({ cdFrom: 0 })
    expect(cdStart(text({ countdown: false }))).toBeNull()
    expect(cdAfter(text({ countdown: false }), 3)).toEqual({})
  })
  it('trim av starten: nedtellingen viser det samme tallet på samme tidspunkt', () => {
    const p: Project = { ...create(FORMATS[0]!, 'blank'), texts: [cd({ id: 'c' })] }
    const l = ok(trimAt(p, 'text', 'c', 120, 'l')).texts[0]!
    expect([l.start, l.dur, l.cdFrom]).toEqual([120, 1080, 1080])
    const r = ok(trimAt(p, 'text', 'c', 600, 'r')).texts[0]!
    expect([r.start, r.dur, r.cdFrom]).toEqual([0, 600, 1200])
  })
})
