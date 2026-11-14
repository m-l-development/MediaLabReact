import { describe, expect, it } from 'vitest'
import { buildQrUrl, cleanQr, newQr, QR_KINDS } from './qr'

describe('QR-koder (felles for Photo, Thumbnail og Motion; samme regler som Loop Studio)', () => {
  it('innholdet bygges som i Loop Studio', () => {
    expect(buildQrUrl('url', 'www.kirken.no')).toBe('https://www.kirken.no')
    expect(buildQrUrl('url', 'https://x.no/a')).toBe('https://x.no/a')
    expect(buildQrUrl('email', 'post @kirken.no', 'Hei og velkommen')).toBe('mailto:post@kirken.no?subject=Hei%20og%20velkommen')
    expect(buildQrUrl('tel', '+47 900 00 000')).toBe('tel:+4790000000')
    expect(buildQrUrl('sms', '900 00 000', 'Ja')).toBe('sms:90000000?body=Ja')
    expect(buildQrUrl('text', ' Vipps 123456 ')).toBe('Vipps 123456')
    expect(buildQrUrl('url', '   ')).toBe('')
    expect(Object.keys(QR_KINDS)).toEqual(['url', 'email', 'tel', 'sms', 'text'])
  })
  it('lagrede innstillinger kontrolleres (ukjent type, ugyldige rader og farger forkastes)', () => {
    const rows = Array.from({ length: 21 }, () => '1'.repeat(21))
    expect(cleanQr({ kind: 'tel', val: '900', rows, fg: '#000000', bg: null })).toEqual({ kind: 'tel', val: '900', url: 'tel:900', rows, fg: '#000000', bg: null })
    expect(cleanQr({ kind: 'x', val: 'a', rows: ['10'], fg: 'red;' })).toEqual({ kind: 'url', val: 'a', url: 'https://a', rows: null, fg: '#111111', bg: '#ffffff' })
    expect(cleanQr(null)).toBeNull()
    expect(newQr()).toMatchObject({ kind: 'url', val: '', rows: null })
  })
})
