import { describe, expect, it } from 'vitest'
import { Sha256 } from './hash'

const hex = (b: ArrayBuffer | Uint8Array) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('')

describe('strømmende SHA-256', () => {
  it('gir samme svar som nettleserens SHA-256, også når dataene kommer i ujevne biter', async () => {
    for (const n of [0, 1, 55, 56, 63, 64, 65, 119, 120, 1000, 70_000]) {
      const data = new Uint8Array(n)
      for (let i = 0; i < n; i++) data[i] = (i * 31 + 7) & 255
      const want = hex(await crypto.subtle.digest('SHA-256', data))
      const h = new Sha256()
      for (let at = 0, step = 1; at < n; at += step, step = (step * 3 + 1) % 97 + 1) h.update(data.subarray(at, at + step))
      expect(hex(h.digest()), `lengde ${n}`).toBe(want)
    }
  })

  it('kjent testvektor «abc»', () => {
    expect(hex(new Sha256().update(new TextEncoder().encode('abc')).digest())).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
  })
})
