/**
 * Enkel ZIP-pakking i nettleseren (uten komprimering – bildene er allerede komprimert), portert fra
 * media-lab/src/shared/zip.js (build/zip.test.ts kontrollerer at arkivene er byte-like). Brukes til «Last ned valgte» og
 * «Eksporter» i Fellesmappe og Samarbeidsmappe. Filnavn i UTF-8 (flagg 0x0800), like navn får « (2)», « (3)» …
 * Ingen ZIP64: grensen er 65 535 filer og 4 GB.
 */
const CRC = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()
export function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff
  for (let i = 0; i < bytes.length; i++) c = (CRC[(c ^ (bytes[i] ?? 0)) & 0xff] ?? 0) ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

/** Tegn Windows ikke tåler, mapper og kontrolltegn (0–31, 127). */
const bad = (c: string) => '\\/:*?"<>|'.includes(c) || c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127
/** Trygt filnavn i arkivet: ingen mapper, kontrolltegn eller tegn Windows ikke tåler. */
export function safeName(name: string | null | undefined): string {
  const s = [...(name || '')].map((c) => (bad(c) ? '_' : c)).join('').replace(/^[.\s]+|[.\s]+$/g, '').slice(0, 180)
  return s || 'fil'
}
/** Unike navn uten å skille på store/små bokstaver (Windows og macOS). */
export function uniqueNames(names: string[]): string[] {
  const used = new Set<string>()
  return names.map((n) => {
    const s = safeName(n), dot = s.lastIndexOf('.'), base = dot > 0 ? s.slice(0, dot) : s, ext = dot > 0 ? s.slice(dot) : ''
    let out = s, i = 2
    while (used.has(out.toLowerCase())) out = base + ' (' + i++ + ')' + ext
    used.add(out.toLowerCase())
    return out
  })
}

const dosTime = (d: Date) => ({ time: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), date: ((Math.max(1980, d.getFullYear()) - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate() })

/** Lokalt filhode og katalogpost for én fil (ingen komprimering). */
function heads(name: Uint8Array, crc: number, len: number, d: Date, offset: number): [Uint8Array, Uint8Array] {
  const { time, date } = dosTime(d)
  const h = new DataView(new ArrayBuffer(30))
  h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true)
  h.setUint16(10, time, true); h.setUint16(12, date, true); h.setUint32(14, crc, true); h.setUint32(18, len, true); h.setUint32(22, len, true)
  h.setUint16(26, name.length, true); h.setUint16(28, 0, true)
  const c = new DataView(new ArrayBuffer(46))
  c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true)
  c.setUint16(12, time, true); c.setUint16(14, date, true); c.setUint32(16, crc, true); c.setUint32(20, len, true); c.setUint32(24, len, true)
  c.setUint16(28, name.length, true); c.setUint32(42, offset, true)
  return [new Uint8Array(h.buffer), new Uint8Array(c.buffer)]
}

function tail(n: number, size: number, offset: number): Uint8Array {
  const e = new DataView(new ArrayBuffer(22))
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, n, true); e.setUint16(10, n, true); e.setUint32(12, size, true); e.setUint32(16, offset, true)
  return new Uint8Array(e.buffer)
}

/** Filene → Uint8Array-deler (til new Blob(deler, { type: 'application/zip' })). */
export function zipParts(files: { name: string; data: Uint8Array; date?: Date | undefined }[], now: Date = new Date()): Uint8Array[] {
  if (files.length > 65535) throw new Error('too_many_files')
  const enc = new TextEncoder(), names = uniqueNames(files.map((f) => f.name)), parts: Uint8Array[] = [], central: Uint8Array[] = []
  let offset = 0
  files.forEach((f, i) => {
    const name = enc.encode(names[i] ?? 'fil'), data = f.data
    const [h, c] = heads(name, crc32(data), data.length, f.date ?? now, offset)
    parts.push(h, name, data)
    central.push(c, name)
    offset += 30 + name.length + data.length
    if (offset > 0xffffffff) throw new Error('too_large')
  })
  const size = central.reduce((n, p) => n + p.length, 0)
  return [...parts, ...central, tail(files.length, size, offset)]
}

/**
 * Arkiv som bygges fil for fil (f.eks. en bildeserie på hundre bilder): hver fil beholdes som Blob (nettleseren kan
 * legge den på disk), ikke som én stor tabell i minnet. Navnene gjøres unike (som i zipParts).
 */
export class ZipWriter {
  private parts: BlobPart[] = []
  private central: Uint8Array[] = []
  private offset = 0
  private used = new Set<string>()
  private enc = new TextEncoder()
  count = 0

  async add(name: string, file: Blob, date: Date = new Date()): Promise<void> {
    if (this.count >= 65535) throw new Error('too_many_files')
    const data = new Uint8Array(await file.arrayBuffer())
    const s = safeName(name), dot = s.lastIndexOf('.'), base = dot > 0 ? s.slice(0, dot) : s, ext = dot > 0 ? s.slice(dot) : ''
    let out = s, i = 2
    while (this.used.has(out.toLowerCase())) out = base + ' (' + i++ + ')' + ext
    this.used.add(out.toLowerCase())
    const nm = this.enc.encode(out)
    const [h, c] = heads(nm, crc32(data), data.length, date, this.offset)
    if (this.offset + 30 + nm.length + data.length > 0xffffffff) throw new Error('too_large')
    this.parts.push(h as BlobPart, nm as BlobPart, file)
    this.central.push(c, nm)
    this.offset += 30 + nm.length + data.length
    this.count++
  }

  blob(): Blob {
    const size = this.central.reduce((n, p) => n + p.length, 0)
    return new Blob([...this.parts, ...(this.central as BlobPart[]), tail(this.count, size, this.offset) as BlobPart], { type: 'application/zip' })
  }
}
