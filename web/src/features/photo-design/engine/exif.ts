/**
 * Enkel EXIF-leser for JPEG (APP1 «Exif»): kamera, objektiv, tidspunkt, eksponering, blender, ISO, brennvidde og
 * opprinnelig størrelse. Leser bare; metadata skrives aldri tilbake og følger ikke med i eksporten.
 */
export interface Exif {
  make?: string
  model?: string
  lens?: string
  date?: string
  exposure?: string
  fnumber?: string
  iso?: number
  focal?: string
  width?: number
  height?: number
  software?: string
  /** Brennvidde i 35 mm-ekvivalent (mm), når kameraet oppgir den (brukes til panoramaets synsvinkel). */
  focal35?: number
}

const TAGS: Record<number, keyof Exif> = { 0x010f: 'make', 0x0110: 'model', 0x0131: 'software', 0x9003: 'date', 0x829a: 'exposure', 0x829d: 'fnumber', 0x8827: 'iso', 0x920a: 'focal', 0xa002: 'width', 0xa003: 'height', 0xa434: 'lens', 0xa405: 'focal35' }

export function readExif(buf: ArrayBuffer): Exif | null {
  const v = new DataView(buf)
  if (v.byteLength < 4 || v.getUint16(0) !== 0xffd8) return null
  let o = 2
  while (o + 4 <= v.byteLength) {
    const m = v.getUint16(o)
    if ((m & 0xff00) !== 0xff00 || m === 0xffda) break
    const len = v.getUint16(o + 2)
    if (m === 0xffe1 && o + 10 <= v.byteLength && v.getUint32(o + 4) === 0x45786966) return tiff(v, o + 10, Math.min(v.byteLength, o + 2 + len))
    o += 2 + len
  }
  return null
}

function tiff(v: DataView, t: number, end: number): Exif | null {
  if (t + 8 > end) return null
  const le = v.getUint16(t) === 0x4949
  const u16 = (p: number) => v.getUint16(p, le), u32 = (p: number) => v.getUint32(p, le)
  const out: Exif = {}
  const seen = new Set<number>()
  const ifd = (p: number) => {
    if (p < t || p + 2 > end || seen.has(p)) return
    seen.add(p)
    const n = u16(p)
    for (let i = 0; i < n; i++) {
      const e = p + 2 + i * 12
      if (e + 12 > end) return
      const tag = u16(e), type = u16(e + 2), cnt = u32(e + 4)
      const size = ({ 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 } as Record<number, number>)[type] ?? 1
      const vp = size * cnt > 4 ? t + u32(e + 8) : e + 8
      if (vp + size * Math.min(cnt, 1) > end) continue
      if (tag === 0x8769) { ifd(t + u32(e + 8)); continue }
      const k = TAGS[tag]
      if (!k) continue
      if (type === 2) {
        let s = ''
        for (let j = 0; j < cnt - 1 && vp + j < end; j++) s += String.fromCharCode(v.getUint8(vp + j))
        ;(out as Record<string, unknown>)[k] = s.split(String.fromCharCode(0))[0]!.trim()
      } else if (type === 3) (out as Record<string, unknown>)[k] = u16(vp)
      else if (type === 4) (out as Record<string, unknown>)[k] = u32(vp)
      else if (type === 5 || type === 10) {
        const a = type === 5 ? u32(vp) : v.getInt32(vp, le), b = type === 5 ? u32(vp + 4) : v.getInt32(vp + 4, le)
        if (!b) continue
        if (k === 'exposure') out.exposure = a / b >= 1 ? `${+(a / b).toFixed(1)} s` : `1/${Math.round(b / a)} s`
        else if (k === 'fnumber') out.fnumber = `f/${+(a / b).toFixed(1)}`
        else if (k === 'focal') out.focal = `${+(a / b).toFixed(1)} mm`
      }
    }
  }
  ifd(t + u32(t + 4))
  return Object.keys(out).length ? out : null
}
