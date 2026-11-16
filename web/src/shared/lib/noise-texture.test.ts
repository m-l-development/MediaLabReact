import { describe, expect, it } from 'vitest'
import { fractalNoise } from './noise-texture'

describe('fraktal støy (reserve for SVG-teksturer i Safari)', () => {
  it('verdier i [0, 1], snitt rundt 0,5 og spredning som feTurbulence', () => {
    const n = fractalNoise(120, 120, 0.55, 3, 7)
    let m = 0
    for (const x of n) { expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThanOrEqual(1); m += x }
    m /= n.length
    expect(m).toBeGreaterThan(0.45)
    expect(m).toBeLessThan(0.55)
    let v = 0
    for (const x of n) v += (x - m) ** 2
    expect(Math.sqrt(v / n.length)).toBeGreaterThan(0.1)
  })
  it('sømløs: kantene møtes (flisen kan gjentas uten synlig skjøt)', () => {
    const W = 96, n = fractalNoise(W, W, 0.25, 3, 3)
    let edge = 0, inner = 0
    for (let y = 0; y < W; y++) { edge += Math.abs(n[y * W]! - n[y * W + W - 1]!); inner += Math.abs(n[y * W + 40]! - n[y * W + 41]!) }
    expect(edge / W).toBeLessThan((inner / W) * 3 + 0.05)
  })
  it('samme frø gir samme tekstur', () => {
    expect(fractalNoise(32, 32, 0.5, 2, 9)).toEqual(fractalNoise(32, 32, 0.5, 2, 9))
  })
})
