// @vitest-environment node
import { describe, expect, it } from 'vitest'
import * as legacy from '../../media-lab/src/shared/zip.js'
import { crc32, safeName, uniqueNames, zipParts } from '../src/shared/lib/zip.ts'

/** ZIP for «Last ned valgte» og «Eksporter» (ADM-07): portert fra zip.js med testene derfra, og byte-likt med dagens. */
const join = (parts: Uint8Array[]) => { const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0)); let o = 0; for (const p of parts) { out.set(p, o); o += p.length } return out }
function unzip(buf: Uint8Array) {
  const v = new DataView(buf.buffer, buf.byteOffset, buf.byteLength), end = buf.length - 22, dec = new TextDecoder()
  expect(v.getUint32(end, true)).toBe(0x06054b50)
  const count = v.getUint16(end + 10, true), out: { name: string; data: number[] }[] = []
  let p = v.getUint32(end + 16, true)
  for (let i = 0; i < count; i++) {
    expect(v.getUint32(p, true)).toBe(0x02014b50)
    const flags = v.getUint16(p + 8, true), crc = v.getUint32(p + 16, true), size = v.getUint32(p + 24, true), nl = v.getUint16(p + 28, true), off = v.getUint32(p + 42, true)
    const name = dec.decode(buf.subarray(p + 46, p + 46 + nl))
    expect(v.getUint32(off, true)).toBe(0x04034b50)
    const lnl = v.getUint16(off + 26, true), data = buf.subarray(off + 30 + lnl, off + 30 + lnl + size)
    expect(crc32(data)).toBe(crc)
    expect(flags & 0x0800).toBe(0x0800)
    out.push({ name, data: [...data] })
    p += 46 + nl
  }
  return out
}
const L = legacy as unknown as { zipParts: (f: unknown, d: Date) => Uint8Array[]; safeName: (s: string) => string; uniqueNames: (s: string[]) => string[] }

describe('ZIP i Filer (som zip.test.js)', () => {
  it('crc32: kjent verdi', () => expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926))
  it('filene kan leses tilbake med riktige navn (også æøå) og innhold; byte-likt med dagens zip.js', () => {
    const files = [{ name: 'påske.png', data: new Uint8Array([1, 2, 3]) }, { name: 'logo.jpg', data: new Uint8Array([9, 8]) }, { name: 'tom.gif', data: new Uint8Array([]) }]
    const when = new Date(2026, 9, 3, 12, 30, 10)
    const buf = join(zipParts(files, when))
    const r = unzip(buf)
    expect(r.map((x) => x.name)).toEqual(['påske.png', 'logo.jpg', 'tom.gif'])
    expect(r.map((x) => x.data)).toEqual([[1, 2, 3], [9, 8], []])
    expect([...buf]).toEqual([...join(L.zipParts(files, when))])
  })
  it('like navn blir unike, og farlige navn gjøres trygge (ingen mapper eller ../)', () => {
    expect(uniqueNames(['a.png', 'A.png', 'a.png', 'b'])).toEqual(['a.png', 'A (2).png', 'a (3).png', 'b'])
    expect([safeName('../../etc/passwd'), safeName('C:\\x\\y.png'), safeName('...')]).toEqual(['_.._etc_passwd', 'C__x_y.png', 'fil'])
    for (const n of ['../../etc/passwd', 'C:\\x\\y.png', '...', 'a\u0001b.png', 'navn med  mellomrom .png']) expect(safeName(n)).toBe(L.safeName(n))
    expect(unzip(join(zipParts([{ name: '../hemmelig.png', data: new Uint8Array([1]) }])))[0]?.name).not.toContain('/')
  })
})
