import { describe, expect, it } from 'vitest'
import { applyColorOps, blurPad, blurRGBA, parseFilter } from './canvas-filter'

describe('ctx.filter for Safari (polyfill)', () => {
  it('leser filterstrengen som lerretene bruker', () => {
    expect(parseFilter('blur(2px) grayscale(1) brightness(120%) hue-rotate(0.5turn)')).toEqual([{ fn: 'blur', v: 2 }, { fn: 'grayscale', v: 1 }, { fn: 'brightness', v: 1.2 }, { fn: 'hue-rotate', v: 180 }])
    expect(parseFilter('none')).toEqual([])
    expect(blurPad(parseFilter('blur(4px)'))).toBe(12)
  })
  it('svart-hvitt, lysstyrke, kontrast og invertering som CSS', () => {
    const px = () => new Uint8ClampedArray([200, 40, 40, 255])
    const g = px(); applyColorOps(g, parseFilter('grayscale(1)'))
    expect(Math.abs(g[0]! - g[1]!)).toBeLessThan(2)
    expect(Math.abs(g[1]! - g[2]!)).toBeLessThan(2)
    const b = px(); applyColorOps(b, parseFilter('brightness(0.5)'))
    expect(b[0]).toBe(100)
    const c = px(); applyColorOps(c, parseFilter('contrast(0)'))
    expect(c[0]).toBe(128)
    const i = px(); applyColorOps(i, parseFilter('invert(1)'))
    expect(i[0]).toBe(55)
    const s = px(); applyColorOps(s, parseFilter('saturate(0)'))
    expect(Math.abs(s[0]! - s[2]!)).toBeLessThan(2)
  })
  it('uskarphet sprer en punktkilde og bevarer fargen (ingen mørke kanter)', () => {
    const w = 21, d = new Uint8ClampedArray(w * w * 4)
    const at = (x: number, y: number) => (y * w + x) * 4
    d.set([255, 0, 0, 255], at(10, 10))
    blurRGBA(d, w, w, 2)
    expect(d[at(10, 10) + 3]!).toBeLessThan(255)
    expect(d[at(12, 10) + 3]!).toBeGreaterThan(0)
    expect(d[at(12, 10)]!).toBeGreaterThan(200) // fargen er rød, ikke mørk
  })
})
