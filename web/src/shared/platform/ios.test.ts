import { describe, expect, it } from 'vitest'
import { iosNoFocusZoom, isIOS } from './ios'

const IPHONE = { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1', maxTouchPoints: 5 }
const IPAD = { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15', maxTouchPoints: 5 }
const MAC = { userAgent: IPAD.userAgent, maxTouchPoints: 0 }
const ANDROID = { userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36', maxTouchPoints: 5 }

describe('iOS', () => {
  it('kjenner igjen iPhone og iPad (også iPadOS som oppgir Mac), ikke Mac eller Android', () => {
    expect(isIOS(IPHONE)).toBe(true)
    expect(isIOS(IPAD)).toBe(true)
    expect(isIOS(MAC)).toBe(false)
    expect(isIOS(ANDROID)).toBe(false)
  })
  it('ingen automatisk zoom ved fokus bare på iOS (Android beholder vanlig zoom)', () => {
    const mk = () => { document.head.innerHTML = '<meta name="viewport" content="width=device-width, initial-scale=1.0">'; return document }
    expect(iosNoFocusZoom(mk(), IPHONE)).toBe(true)
    expect(document.querySelector('meta[name="viewport"]')?.getAttribute('content')).toBe('width=device-width, initial-scale=1.0, maximum-scale=1')
    expect(iosNoFocusZoom(mk(), ANDROID)).toBe(false)
    expect(document.querySelector('meta[name="viewport"]')?.getAttribute('content')).toBe('width=device-width, initial-scale=1.0')
  })
})
