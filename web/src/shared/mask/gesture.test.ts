import { describe, expect, it } from 'vitest'
import { isNotchedWheel, pinchView, wheelAction, ZOOM_STEP, type WheelLike } from './gesture'

const ev = (more: Partial<WheelLike>): WheelLike => ({ deltaX: 0, deltaY: 0, deltaMode: 0, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, ...more })

describe('wheelAction: mus og styreflate', () => {
  it('musehjul med hakk (Windows 100/120 px, Firefox linjer) zoomer ett fast trinn per hakk', () => {
    expect(wheelAction(ev({ deltaY: -120 }), 800)).toEqual({ kind: 'zoom', f: ZOOM_STEP })
    expect(wheelAction(ev({ deltaY: 100 }), 800)).toEqual({ kind: 'zoom', f: 1 / ZOOM_STEP })
    expect(wheelAction(ev({ deltaY: -3, deltaMode: 1 }), 800)).toEqual({ kind: 'zoom', f: ZOOM_STEP })
  })
  it('et stort sprang gir høyst 3 trinn (ingen hopp ut av kontroll)', () => {
    const a = wheelAction(ev({ deltaY: -1200 }), 800)
    expect(a).toEqual({ kind: 'zoom', f: Math.pow(ZOOM_STEP, 3) })
  })
  it('styreflate: to fingre (små, brøkdels- og sideverdier) flytter, zoomer ikke', () => {
    expect(wheelAction(ev({ deltaX: 3.5, deltaY: -7.25 }), 800)).toEqual({ kind: 'pan', dx: 3.5, dy: -7.25 })
    expect(wheelAction(ev({ deltaY: 4 }), 800)).toEqual({ kind: 'pan', dx: 0, dy: 4 })
  })
  it('knip (ctrlKey + små verdier) zoomer jevnt og begrenset per hendelse', () => {
    const a = wheelAction(ev({ ctrlKey: true, deltaY: -5 }), 800)
    expect(a.kind).toBe('zoom')
    if (a.kind === 'zoom') expect(a.f).toBeCloseTo(Math.exp(0.05), 6)
    const big = wheelAction(ev({ ctrlKey: true, deltaY: -500.5 }), 800)
    if (big.kind === 'zoom') expect(big.f).toBeLessThan(1.83)
  })
  it('Ctrl/⌘ + musehjul zoomer i samme faste trinn', () => {
    expect(wheelAction(ev({ ctrlKey: true, deltaY: -120 }), 800)).toEqual({ kind: 'zoom', f: ZOOM_STEP })
    expect(wheelAction(ev({ metaKey: true, deltaY: 120 }), 800)).toEqual({ kind: 'zoom', f: 1 / ZOOM_STEP })
  })
  it('Shift + musehjul flytter sideveis; Alt + hjul endrer penselstørrelsen', () => {
    expect(wheelAction(ev({ shiftKey: true, deltaY: 120 }), 800)).toEqual({ kind: 'pan', dx: 120, dy: 0 })
    expect(wheelAction(ev({ altKey: true, deltaY: -120 }), 800).kind).toBe('size')
  })
  it('sidebevegelse eller brøkdeler betyr ikke mus med hakk', () => {
    expect(isNotchedWheel(ev({ deltaY: 120, deltaX: 2 }))).toBe(false)
    expect(isNotchedWheel(ev({ deltaY: 52.5 }))).toBe(false)
    expect(isNotchedWheel(ev({ deltaY: 120 }))).toBe(true)
  })
})

describe('pinchView: punktet mellom fingrene står stille', () => {
  it('dobbel avstand gir dobbel skala, og bildepunktet under midtpunktet følger fingrene', () => {
    const start = { s: 1, ox: 100, oy: 50, mx: 300, my: 250, dist: 100 }
    const v = pinchView(start, { mx: 300, my: 250, dist: 200 })
    expect(v.s).toBe(2)
    // bildepunktet (200, 200) lå under (300, 250) og ligger der fortsatt
    expect(200 * v.s + v.ox).toBeCloseTo(300)
    expect(200 * v.s + v.oy).toBeCloseTo(250)
  })
  it('flytting av begge fingrene flytter bildet like mye', () => {
    const start = { s: 2, ox: 0, oy: 0, mx: 100, my: 100, dist: 80 }
    const v = pinchView(start, { mx: 140, my: 90, dist: 80 })
    expect(v).toEqual({ s: 2, ox: 40, oy: -10 })
  })
})
