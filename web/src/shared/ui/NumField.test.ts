import { describe, expect, it } from 'vitest'
import { parseNum } from './NumField'

describe('parseNum', () => {
  it('godtar desimalkomma, punktum, fortegn og enhet', () => {
    expect(parseNum('12,5')).toBe(12.5)
    expect(parseNum('12.5')).toBe(12.5)
    expect(parseNum('+3')).toBe(3)
    expect(parseNum('−4')).toBe(-4)
    expect(parseNum('-4')).toBe(-4)
    expect(parseNum('50 %')).toBe(50)
    expect(parseNum('45°')).toBe(45)
    expect(parseNum(' 12 px ')).toBe(12)
    expect(parseNum(',5')).toBe(0.5)
  })
  it('avviser tekst som ikke er ett tall', () => {
    expect(parseNum('')).toBeNull()
    expect(parseNum('abc')).toBeNull()
    expect(parseNum('1,2,3')).toBeNull()
    expect(parseNum('12 34')).toBeNull()
    expect(parseNum('5 sekunder')).toBeNull()
  })
})
