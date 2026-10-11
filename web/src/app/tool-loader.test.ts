import { describe, expect, it } from 'vitest'
import { slowConnection } from './tool-loader'

describe('forhåndslasting (PLT-08)', () => {
  it('hoppes over ved «spar data» og 2G, som i dagens app', () => {
    expect(slowConnection(undefined)).toBe(false)
    expect(slowConnection({ effectiveType: '4g' })).toBe(false)
    expect(slowConnection({ effectiveType: '3g' })).toBe(false)
    expect(slowConnection({ effectiveType: 'slow-2g' })).toBe(true)
    expect(slowConnection({ effectiveType: '2g' })).toBe(true)
    expect(slowConnection({ saveData: true, effectiveType: '4g' })).toBe(true)
  })
})
