/**
 * Liten MP4-leser for testene (ingen ffprobe på maskinen): boksstrukturen leses direkte, så vi kan kontrollere kodek,
 * oppløsning, varighet og antall bilder i en eksportert fil uten å stole på teksten i eksportdialogen.
 */
export interface Mp4Track { type: string; codec: string; width: number; height: number; timescale: number; duration: number; samples: number }
export interface Mp4Info { brand: string; duration: number; tracks: Mp4Track[] }

function boxes(buf: Buffer, start: number, end: number): { type: string; start: number; end: number; body: number }[] {
  const out: { type: string; start: number; end: number; body: number }[] = []
  let o = start
  while (o + 8 <= end) {
    let size = buf.readUInt32BE(o)
    const type = buf.toString('latin1', o + 4, o + 8)
    let body = o + 8
    if (size === 1) {
      size = Number(buf.readBigUInt64BE(o + 8))
      body = o + 16
    } else if (size === 0) size = end - o
    if (size < 8 || o + size > end) break
    out.push({ type, start: o, end: o + size, body })
    o += size
  }
  return out
}
const child = (buf: Buffer, b: { body: number; end: number }, type: string) => boxes(buf, b.body, b.end).find((x) => x.type === type)

export function readMp4(buf: Buffer): Mp4Info {
  const top = boxes(buf, 0, buf.length)
  const ftyp = top.find((b) => b.type === 'ftyp')
  const moov = top.find((b) => b.type === 'moov')
  if (!ftyp || !moov) throw new Error('ikke en MP4-fil (mangler ftyp/moov)')
  const mvhd = child(buf, moov, 'mvhd')
  if (!mvhd) throw new Error('mangler mvhd')
  const v1 = buf.readUInt8(mvhd.body) === 1
  const ts = v1 ? buf.readUInt32BE(mvhd.body + 20) : buf.readUInt32BE(mvhd.body + 12)
  const du = v1 ? Number(buf.readBigUInt64BE(mvhd.body + 24)) : buf.readUInt32BE(mvhd.body + 16)
  const tracks: Mp4Track[] = []
  for (const trak of boxes(buf, moov.body, moov.end).filter((b) => b.type === 'trak')) {
    const tkhd = child(buf, trak, 'tkhd')
    const mdia = child(buf, trak, 'mdia')
    if (!tkhd || !mdia) continue
    const tv1 = buf.readUInt8(tkhd.body) === 1
    const wOff = tkhd.body + (tv1 ? 88 : 76)
    const mdhd = child(buf, mdia, 'mdhd')
    const hdlr = child(buf, mdia, 'hdlr')
    const minf = child(buf, mdia, 'minf')
    const stbl = minf ? child(buf, minf, 'stbl') : undefined
    const stsd = stbl ? child(buf, stbl, 'stsd') : undefined
    const stsz = stbl ? child(buf, stbl, 'stsz') : undefined
    if (!mdhd || !hdlr) continue
    const m1 = buf.readUInt8(mdhd.body) === 1
    const mts = m1 ? buf.readUInt32BE(mdhd.body + 20) : buf.readUInt32BE(mdhd.body + 12)
    const mdu = m1 ? Number(buf.readBigUInt64BE(mdhd.body + 24)) : buf.readUInt32BE(mdhd.body + 16)
    tracks.push({
      type: buf.toString('latin1', hdlr.body + 8, hdlr.body + 12),
      codec: stsd ? buf.toString('latin1', stsd.body + 12, stsd.body + 16) : '',
      width: buf.readUInt32BE(wOff) / 65536,
      height: buf.readUInt32BE(wOff + 4) / 65536,
      timescale: mts,
      duration: mdu / mts,
      samples: stsz ? buf.readUInt32BE(stsz.body + 8) : 0,
    })
  }
  return { brand: buf.toString('latin1', ftyp.body, ftyp.body + 4), duration: du / ts, tracks }
}
