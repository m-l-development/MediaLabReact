import { describe, expect, it } from 'vitest'
import { mapRGB, mapValue } from './light-theme'

describe('lyst tema (samme omregning som theme.js i dagens app)', () => {
  it('lys tekst blir mørk, mørke flater blir lyse, mettede farger beholdes', () => {
    expect(mapValue('rgb(243, 241, 236)', 'color')).toBe('rgb(23, 21, 16)')
    expect(mapValue('rgb(0, 0, 0)', 'background-color')).toBe('rgb(230, 228, 224)')
    expect(mapValue('rgb(245, 184, 44)', 'background-color')).toBe('rgb(245, 184, 44)')
    expect(mapValue('url("a.png")', 'background-image')).toBe('url("a.png")')
  })
  it('mørke skygger og svake lyse flater røres ikke', () => {
    expect(mapRGB(0, 0, 0, 0.5, 'box-shadow')).toBeNull()
    expect(mapRGB(255, 255, 255, 0.1, 'background-color')).toBeNull()
  })
})
