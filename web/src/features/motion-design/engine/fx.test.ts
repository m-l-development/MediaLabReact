import { describe, expect, it } from 'vitest'
import { cleanEffects, fxAlpha, fxBlur, fxFilter, newEffect, type Effect } from './fx'
import { create, FORMATS, mediaClip, normalize, overlay, type Media } from './model'

const img: Media = { id: 'm-i', name: 'i.png', kind: 'image', dur: 0, w: 160, h: 90, thumb: '' }

describe('effekter', () => {
  it('fargeeffektene blir filter i listens rekkefølge; av = ingen virkning', () => {
    const l: Effect[] = [newEffect('sepia', 'a'), { ...newEffect('hue', 'b'), v: 180 }, { ...newEffect('bw', 'c'), on: false }]
    expect(fxFilter(l)).toBe('sepia(0.800) hue-rotate(180.0deg)')
    expect(fxFilter([l[1] as Effect, l[0] as Effect])).toBe('hue-rotate(180.0deg) sepia(0.800)')
    expect(fxFilter([{ ...newEffect('bri', 'd'), v: -0.5 }, { ...newEffect('con', 'e'), v: 0.25 }, { ...newEffect('sat', 'f'), v: 0 }])).toBe('brightness(0.500) contrast(1.250)')
    expect(fxBlur([newEffect('blur', 'g'), { ...newEffect('blur', 'h'), v: 2 }, { ...newEffect('blur', 'i'), on: false }])).toBe(8)
  })

  it('opasitet og fade inn/ut', () => {
    const l: Effect[] = [{ ...newEffect('opacity', 'a'), v: 0.5 }, { ...newEffect('fade', 'b'), v: 1, v2: 2 }]
    expect(fxAlpha(l, 0, 10)).toBe(0)
    expect(fxAlpha(l, 0.5, 10)).toBeCloseTo(0.25)
    expect(fxAlpha(l, 5, 10)).toBeCloseTo(0.5)
    expect(fxAlpha(l, 9, 10)).toBeCloseTo(0.25)
    expect(fxAlpha([{ ...l[0] as Effect, on: false }], 5, 10)).toBe(1)
  })

  it('lagres med klippet og kontrolleres ved åpning', () => {
    expect(cleanEffects([{ kind: 'bw', v: 9 }, { kind: 'ukjent' }, { id: 'x', kind: 'fade', v: 2 }])).toEqual([{ id: 'e-0-bw', kind: 'bw', on: true, v: 1 }, { id: 'x', kind: 'fade', on: true, v: 2, v2: 1 }])
    expect(cleanEffects([])).toBeUndefined()
    const p = create(FORMATS[3] ?? { k: 'wide', w: 1920, h: 1080 }, 'blank')
    const fx = [newEffect('sepia', 'e1'), { ...newEffect('blur', 'e2'), on: false }]
    const q = normalize(JSON.parse(JSON.stringify({ ...p, media: [img], clips: [mediaClip(img, { id: 'c1', effects: fx })], ov: [overlay(img, { id: 'o1', effects: [newEffect('opacity', 'e3')] })] })))
    expect(q.clips[0]?.effects).toEqual(fx)
    expect(q.ov[0]?.effects?.[0]?.kind).toBe('opacity')
    expect(normalize(JSON.parse(JSON.stringify(q)))).toEqual(q)
  })
})
