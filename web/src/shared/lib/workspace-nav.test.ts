import { describe, expect, it } from 'vitest'
import { anchorScroll, isNotchedWheel, isTypingTarget, pinchView, wheelAction, ZOOM_STEP, type WheelLike } from './workspace-nav'

const ev = (more: Partial<WheelLike>): WheelLike => ({ deltaX: 0, deltaY: 0, deltaMode: 0, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, ...more })

describe('wheelAction: loddrett rulling over en arbeidsflate zoomer', () => {
  it('musehjul med hakk (Windows 100/120 px, Firefox linjer) zoomer ett fast trinn per hakk', () => {
    expect(wheelAction(ev({ deltaY: -120 }), 800)).toEqual({ kind: 'zoom', f: ZOOM_STEP })
    expect(wheelAction(ev({ deltaY: 100 }), 800)).toEqual({ kind: 'zoom', f: 1 / ZOOM_STEP })
    expect(wheelAction(ev({ deltaY: -3, deltaMode: 1 }), 800)).toEqual({ kind: 'zoom', f: ZOOM_STEP })
  })
  it('et stort sprang gir høyst 3 trinn', () => {
    expect(wheelAction(ev({ deltaY: -1200 }), 800)).toEqual({ kind: 'zoom', f: Math.pow(ZOOM_STEP, 3) })
  })
  it('styreflate, to fingre loddrett: jevn zoom som følger bevegelsen – flytter ikke opp og ned', () => {
    const a = wheelAction(ev({ deltaY: -7.25, deltaX: 0.5 }), 800)
    expect(a.kind).toBe('zoom')
    if (a.kind === 'zoom') expect(a.f).toBeCloseTo(Math.exp(0.0725), 6)
    const b = wheelAction(ev({ deltaY: 4 }), 800)
    if (b.kind === 'zoom') expect(b.f).toBeLessThan(1)
  })
  it('knip (ctrlKey + små verdier) zoomer jevnt og begrenset per hendelse', () => {
    const a = wheelAction(ev({ ctrlKey: true, deltaY: -5 }), 800)
    if (a.kind === 'zoom') expect(a.f).toBeCloseTo(Math.exp(0.05), 6)
    const big = wheelAction(ev({ ctrlKey: true, deltaY: -500.5 }), 800)
    expect(big.kind).toBe('zoom')
    if (big.kind === 'zoom') expect(big.f).toBeLessThan(1.83)
  })
  it('Ctrl/⌘ + musehjul zoomer i samme faste trinn', () => {
    expect(wheelAction(ev({ ctrlKey: true, deltaY: -120 }), 800)).toEqual({ kind: 'zoom', f: ZOOM_STEP })
    expect(wheelAction(ev({ metaKey: true, deltaY: 120 }), 800)).toEqual({ kind: 'zoom', f: 1 / ZOOM_STEP })
  })
})

describe('wheelAction: sideveis og Alt', () => {
  it('tydelig sidelengs rulling på styreflaten flytter sideveis (ikke zoom)', () => {
    expect(wheelAction(ev({ deltaX: 30.5, deltaY: 4 }), 800)).toEqual({ kind: 'pan', dx: 30.5, dy: 0 })
  })
  it('Shift + hjul flytter sideveis', () => {
    expect(wheelAction(ev({ shiftKey: true, deltaY: 120 }), 800)).toEqual({ kind: 'pan', dx: 120, dy: 0 })
    expect(wheelAction(ev({ shiftKey: true, deltaX: 120 }), 800)).toEqual({ kind: 'pan', dx: 120, dy: 0 })
  })
  it('Alt + hjul er ledig for verktøyet (penselstørrelse)', () => {
    expect(wheelAction(ev({ altKey: true, deltaY: -120 }), 800).kind).toBe('alt')
  })
  it('ingen bevegelse: ingenting', () => expect(wheelAction(ev({}), 800)).toEqual({ kind: 'none' }))
  it('sidebevegelse eller brøkdeler betyr ikke mus med hakk', () => {
    expect(isNotchedWheel(ev({ deltaY: 120, deltaX: 2 }))).toBe(false)
    expect(isNotchedWheel(ev({ deltaY: 52.5 }))).toBe(false)
    expect(isNotchedWheel(ev({ deltaY: 120 }))).toBe(true)
  })
})

describe('pinchView: punktet mellom fingrene står stille', () => {
  it('dobbel avstand gir dobbel skala, og bildepunktet under midtpunktet følger fingrene', () => {
    const v = pinchView({ s: 1, ox: 100, oy: 50, mx: 300, my: 250, dist: 100 }, { mx: 300, my: 250, dist: 200 })
    expect(v.s).toBe(2)
    expect(200 * v.s + v.ox).toBeCloseTo(300)
    expect(200 * v.s + v.oy).toBeCloseTo(250)
  })
  it('flytting av begge fingrene flytter bildet like mye', () => {
    expect(pinchView({ s: 2, ox: 0, oy: 0, mx: 100, my: 100, dist: 80 }, { mx: 140, my: 90, dist: 80 })).toEqual({ s: 2, ox: 40, oy: -10 })
  })
})

describe('anchorScroll: zoom i en rullbar beholder holder punktet under pekeren', () => {
  it('innholdet ble dobbelt så stort: rullingen flyttes slik at samme dokumentpunkt er under pekeren', () => {
    const scroller = { scrollLeft: 0, scrollTop: 0 } as HTMLElement
    // før: innhold 400×300 ved (100, 50); pekeren ved (300, 200) = 50 % / 50 %
    // etter layout: 800×600 fortsatt ved (100, 50) → punktet ville vært ved (500, 350); rull 200/150
    const content = { getBoundingClientRect: () => ({ left: 100, top: 50, width: 800, height: 600 }) } as unknown as HTMLElement
    anchorScroll(scroller, content, { left: 100, top: 50, width: 400, height: 300, px: 300, py: 200 })
    expect([scroller.scrollLeft, scroller.scrollTop]).toEqual([200, 150])
  })
})

describe('isTypingTarget: snarveier griper ikke inn når brukeren skriver', () => {
  it('tekstfelt, tekstområde, nedtrekk og redigerbart: ja; glidebryter, avkrysning og knapp: nei', () => {
    const host = document.createElement('div')
    host.innerHTML = '<input id="a"><input id="b" type="range"><input id="c" type="checkbox"><textarea id="d"></textarea><select id="e"></select><div id="f" contenteditable="true"><b id="g">x</b></div><button id="h">x</button>'
    document.body.append(host)
    const q = (id: string) => host.querySelector('#' + id)
    expect(['a', 'd', 'e', 'f', 'g'].map((i) => isTypingTarget(q(i)))).toEqual([true, true, true, true, true])
    expect(['b', 'c', 'h'].map((i) => isTypingTarget(q(i)))).toEqual([false, false, false])
    expect(isTypingTarget(null)).toBe(false)
    host.remove()
  })
})
