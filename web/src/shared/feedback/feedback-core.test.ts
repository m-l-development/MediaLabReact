import { describe, expect, it } from 'vitest'
import { appOf, browserOf, cleanPath, cleanView, deviceOf, scrubDeep, scrubSecrets, scrubText } from './feedback-core'

const JWT = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abcdefghijklmnop'

describe('tilbakemeldinger: rensing og plassering (som feedback-core.test.js i dagens app)', () => {
  it('tokens, nøkler, adresseparametere og databaseadresser fjernes', () => {
    const s = scrubSecrets(`a ${JWT} b sb_secret_abcdefghij1234 c Bearer abcdefghijklmnopqrstuv d /login?token=hemmelig123&x=1 postgres://user:pw123@host/db sk_live_abcdefghijk ${'A1'.repeat(25)}`)
    for (const bad of ['eyJhbGci', 'sb_secret_', 'abcdefghijklmnopqrstuv', 'hemmelig123', 'pw123', 'sk_live_', 'A1A1A1A1A1A1A1A1A1A1']) expect(s).not.toContain(bad)
    expect(s).toMatch(/\[fjernet: token\]/)
    expect(s).toMatch(/token=\[fjernet\]&x=1/)
    expect(scrubSecrets('-----BEGIN RSA PRIVATE KEY-----\nabc\n-----END RSA PRIVATE KEY-----')).toBe('[fjernet: privat nøkkel]')
  })
  it('brukerens tekst mister e-post, telefon og passord, men vanlig mening og feilkoder beholdes', () => {
    const s = scrubText('Kontakt ola.nordmann@example.com eller +47 912 34 567. passord: Hemmelig123. Feilkode: 500')
    for (const bad of ['ola.nordmann', '912 34 567', 'Hemmelig123']) expect(s).not.toContain(bad)
    expect(s).toMatch(/Feilkode: 500/)
    expect(scrubText('Eksporten stopper på 98 % når jeg trykker «Lagre».')).toBe('Eksporten stopper på 98 % når jeg trykker «Lagre».')
    expect(scrubDeep({ a: 'sb_secret_abcdefghij1234', b: [1, { c: '?code=xyz123' }], d: null })).toEqual({ a: '[fjernet: nøkkel]', b: [1, { c: '?code=[fjernet]' }], d: null })
  })
  it('applikasjon fra stien i den nye appen, og visningen uten verdier', () => {
    expect(appOf('/app/')).toEqual({ id: 'media-lab', name: 'Media Lab (forsiden)' })
    expect(appOf('/app/photo-design')).toEqual({ id: 'photo-design', name: 'Photo Design' })
    expect(appOf('/app/loop-studio')).toEqual({ id: 'loop-studio', name: 'Loop Studio' })
    expect(appOf('/app/loop-studio', '?mal=week&disk=d-1')).toEqual({ id: 'loop-editor', name: 'Loop Studio – editor' })
    expect(appOf('/app/medier').id).toBe('media-library')
    expect(appOf('/app/ikke-et-verktoy').id).toBe('ukjent')
    expect(cleanPath('/app/x/44ebdf65-ebc9-4f62-846f-dfd12e271d3e?token=abc')).toBe('/app/x/:id')
    expect(cleanView('?mal=week&disk=d-abc123')).toBe('?mal=…&disk=…')
    expect(cleanView('', '#/menigheter/44ebdf65-ebc9-4f62-846f-dfd12e271d3e/filer?token=abc')).toBe('#/menigheter/:id/filer')
  })
  it('nettleser og enhet grovt, uten fingeravtrykk', () => {
    expect(browserOf('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36 Edg/140.0')).toEqual({ browser: 'Edge 140', os: 'Windows 10/11' })
    expect(browserOf('Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1')).toEqual({ browser: 'Safari 18', os: 'iOS 18' })
    expect([deviceOf(390, true), deviceOf(800, true), deviceOf(1440, false)]).toEqual(['mobil', 'nettbrett', 'PC'])
  })
})
