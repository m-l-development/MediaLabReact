import { describe, expect, it } from 'vitest'
import type { Me } from './account'
import { allowedViews, effectiveMe, realView, switcherAllowed } from './test-role'

const base = { email: 'a@b.no', full_name: null, first_name: null, last_name: null, phone: null, mfa: false }
const DEV = { ...base, id: 'd', roles: [{ role: 'developer', church_id: null }], churches: [{ id: 'c1', name: 'A', logo_file_id: null }] } as unknown as Me
const ADM = { ...base, id: 'a', roles: [{ role: 'church_admin', church_id: 'c1' }], churches: [{ id: 'c1', name: 'A', logo_file_id: null }] } as unknown as Me
const USR = { ...base, id: 'u', roles: [], churches: [{ id: 'c1', name: 'A', logo_file_id: null }] } as unknown as Me
const MOD = { ...base, id: 'm', roles: [{ role: 'moderator', church_id: null }], churches: [] } as unknown as Me
const DEVREF = 'uatpdmhnwwjgzlxaucsx', PROD = 'cmuienhheklcgtfmpvbe'

describe('testrolle (PLT-16, som test-role.test.js)', () => {
  it('bare i lokal utvikling og Preview mot utviklingsprosjektet – aldri i produksjon', () => {
    expect(switcherAllowed({ target: 'preview', projectRef: DEVREF }, null)).toBe(false)
    expect(switcherAllowed({ target: 'preview', projectRef: DEVREF }, DEVREF)).toBe(true)
    expect(switcherAllowed({ target: 'local', projectRef: DEVREF }, DEVREF)).toBe(true)
    expect(switcherAllowed({ target: 'production', projectRef: PROD }, DEVREF)).toBe(false)
    expect(switcherAllowed({ target: 'production', projectRef: DEVREF }, DEVREF)).toBe(false)
    expect(switcherAllowed({ target: 'preview', projectRef: PROD }, DEVREF)).toBe(false)
    expect(switcherAllowed(null, DEVREF)).toBe(false)
  })
  it('kan bare senke rollen, aldri heve den', () => {
    expect([realView(DEV), realView(ADM), realView(USR), realView(MOD)]).toEqual(['developer', 'admin', 'user', 'moderator'])
    expect(allowedViews(DEV)).toEqual(['developer', 'moderator', 'admin', 'user'])
    expect(allowedViews(MOD)).toEqual([])
    expect(effectiveMe(MOD, 'user')).toBe(MOD)
    expect(effectiveMe(ADM, 'moderator')).toBe(ADM)
    expect(allowedViews(ADM)).toEqual(['admin', 'user'])
    expect(allowedViews(USR)).toEqual([])
    expect(effectiveMe(USR, 'developer')).toBe(USR)
    expect(effectiveMe(USR, 'admin')).toBe(USR)
    expect(effectiveMe(ADM, 'developer')).toBe(ADM)
  })
  it('Admin- og User-visning gir riktige roller i grensesnittet; samme bruker', () => {
    expect(effectiveMe(DEV, 'user').roles).toEqual([])
    expect(effectiveMe(DEV, 'moderator').roles).toEqual([{ role: 'moderator', church_id: null }])
    expect(effectiveMe(DEV, 'admin').roles).toEqual([{ role: 'church_admin', church_id: 'c1' }])
    expect(effectiveMe(ADM, 'user').roles).toEqual([])
    expect(effectiveMe(DEV, 'developer')).toBe(DEV)
    expect(effectiveMe(DEV, 'tull')).toBe(DEV)
    expect(effectiveMe(DEV, null)).toBe(DEV)
    expect(effectiveMe(DEV, 'user').id).toBe('d')
  })
})
