import { describe, expect, it } from 'vitest'
import { trimAt, splitOv, spanOf } from './edit'
import { newEffect } from './fx'
import { animAt, cleanKeys, keysOutside, scaleKeys, upsertKey, valAt, type Key } from './kf'
import { create, FORMATS, mediaClip, normalize, overlay, type Media, type Project } from './model'

const img: Media = { id: 'm-i', name: 'i.png', kind: 'image', dur: 0, w: 160, h: 90, thumb: '' }
const proj = (): Project => ({ ...create(FORMATS[3] ?? { k: 'wide', w: 1920, h: 1080 }, 'blank'), media: [img] })

describe('keyframes', () => {
  it('interpolering: lineær, myk og hold; før første og etter siste', () => {
    const k: Key[] = [{ t: 1, v: 0 }, { t: 3, v: 100 }]
    expect(valAt(k, 0)).toBe(0)
    expect(valAt(k, 2)).toBe(50)
    expect(valAt(k, 9)).toBe(100)
    expect(valAt([{ t: 1, v: 0, e: 'ease' }, { t: 3, v: 100 }], 1.5)).toBeCloseTo(15.625)
    expect(valAt([{ t: 1, v: 0, e: 'hold' }, { t: 3, v: 100 }], 2.9)).toBe(0)
    expect(valAt([{ t: 0, v: 0 }, { t: 1, v: 10 }, { t: 2, v: 30 }], 1.5)).toBe(20)
  })

  it('animAt: egenskaper og effektverdier ved tiden; uten keyframes samme objekt', () => {
    const o = overlay(img, { id: 'o', x: 0.5, effects: [newEffect('bri', 'e1')], kf: { x: [{ t: 0, v: 0.1 }, { t: 2, v: 0.9 }], 'fx:e1': [{ t: 0, v: -1 }, { t: 2, v: 1 }] } })
    const a = animAt(o, 1)
    expect(a.x).toBeCloseTo(0.5)
    expect(a.effects?.[0]?.v).toBeCloseTo(0)
    expect(o.x).toBe(0.5)
    const plain = overlay(img, { id: 'p' })
    expect(animAt(plain, 1)).toBe(plain)
  })

  it('keyframes følger innholdet ved trim av starten og deling; utenfor klippet beholdes', () => {
    const p = { ...proj(), ov: [overlay(img, { id: 'o', start: 2, dur: 4, kf: { scale: [{ t: 0.5, v: 1 }, { t: 3, v: 2 }] } })] }
    const r = trimAt(p, 'ov', 'o', 3, 'l')
    if ('err' in r) throw new Error(r.err)
    const o = r.p.ov[0]
    expect(o?.kf?.scale?.map((k) => k.t)).toEqual([-0.5, 2])
    expect(keysOutside(o?.kf, spanOf(r.p, 'ov', 'o')?.dur ?? 0)).toBe(1)
    const s = splitOv(p, 'o', 4)
    if ('err' in s) throw new Error(s.err)
    expect(s.p.ov[0]?.kf?.scale?.map((k) => k.t)).toEqual([0.5, 3])
    expect(s.p.ov[1]?.kf?.scale?.map((k) => k.t)).toEqual([-1.5, 1])
    // hovedsporet: trim av starten forskyver også
    const q = { ...proj(), clips: [mediaClip(img, { id: 'c', dur: 6, kf: { x: [{ t: 2, v: 0.3 }] } })] }
    const tq = trimAt(q, 'clip', 'c', 1, 'l')
    if ('err' in tq) throw new Error(tq.err)
    expect(tq.p.clips[0]?.kf?.x?.[0]?.t).toBe(1)
  })

  it('upsert, skalering og lagring', () => {
    expect(upsertKey([{ t: 1, v: 0 }], 1.005, 5)).toEqual([{ t: 1, v: 5 }])
    expect(upsertKey([{ t: 1, v: 0, e: 'ease' }], 2, 5)).toEqual([{ t: 1, v: 0, e: 'ease' }, { t: 2, v: 5 }])
    expect(scaleKeys({ x: [{ t: 2, v: 1 }] }, 0.5)).toEqual({ x: [{ t: 1, v: 1 }] })
    expect(cleanKeys({ x: [{ t: 2, v: 1 }, { t: 1, v: 0, e: 'hold' }], bad: [{ t: 1, v: 1 }], y: 'x' })).toEqual({ x: [{ t: 1, v: 0, e: 'hold' }, { t: 2, v: 1 }] })
    const p = { ...proj(), clips: [mediaClip(img, { id: 'c', kf: { op: [{ t: 0, v: 0 }, { t: 1, v: 1, e: 'ease' }] } })] }
    const q = normalize(JSON.parse(JSON.stringify(p)))
    expect(q.clips[0]?.kf).toEqual(p.clips[0]?.kf)
  })
})
