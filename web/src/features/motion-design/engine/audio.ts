/**
 * Motion design – lyd: bølgeform for tidslinjen, miksing for eksport og tale-til-tekst, utjevning, takt og WAV.
 * Typet port av motion-engine.js (lyd). All lyd behandles i nettleseren.
 */
import { DUCK_A, DUCK_R, hidden, layout, mixOf, ovDur, voiced, type Project } from './model'

export type GetBlob = (mediaId: string) => Promise<Blob | null>

type AC = typeof AudioContext
const audioCtor = (): AC => (window.AudioContext ?? (window as unknown as { webkitAudioContext: AC }).webkitAudioContext)

/** Bølgeform som PNG (data-URL) til lydspor og videoklipp på tidslinjen. */
export async function wave(blob: Blob | null): Promise<{ url: string; dur: number } | null> {
  if (!blob || blob.size > 450e6) return null
  try {
    const ac = new (audioCtor())()
    const buf = await ac.decodeAudioData(await blob.arrayBuffer())
    void ac.close().catch(() => undefined)
    const d = buf.getChannelData(0)
    const N = Math.min(6000, Math.max(200, Math.round(buf.duration * 40)))
    const step = Math.max(1, Math.floor(d.length / N))
    const c = document.createElement('canvas')
    c.width = N
    c.height = 48
    const g = c.getContext('2d')
    if (!g) return null
    let mx = 0
    const pk = new Float32Array(N)
    for (let i = 0; i < N; i++) {
      let m = 0
      const o = i * step
      for (let j = 0; j < step; j += 4) {
        const v = Math.abs(d[o + j] ?? 0)
        if (v > m) m = v
      }
      pk[i] = m
      if (m > mx) mx = m
    }
    g.fillStyle = 'rgba(255,255,255,0.55)'
    for (let k = 0; k < N; k++) {
      const h = Math.max(1, ((pk[k] ?? 0) / (mx || 1)) * 46)
      g.fillRect(k, 24 - h / 2, 1, h)
    }
    return { url: c.toDataURL('image/png'), dur: buf.duration }
  } catch {
    return null
  }
}

const DEC = new Map<string, Promise<AudioBuffer | null>>()
function decode(ctx: BaseAudioContext, getBlob: GetBlob, id: string, sr: number): Promise<AudioBuffer | null> {
  const key = `${id}@${sr}`
  const hit = DEC.get(key)
  if (hit) return hit
  const pr = (async () => {
    const b = await getBlob(id)
    if (!b) return null
    try {
      return await ctx.decodeAudioData(await b.arrayBuffer())
    } catch {
      return null
    }
  })()
  DEC.set(key, pr)
  if (DEC.size > 24) DEC.delete(DEC.keys().next().value as string)
  return pr
}
/** Glemmer dekodet lyd (ved bytte av prosjekt). */
export function clearAudioCache(): void {
  DEC.clear()
  REV.clear()
}

const REV = new Map<string, AudioBuffer>()
function reversed(oc: BaseAudioContext, buf: AudioBuffer, key: string): AudioBuffer {
  const hit = REV.get(key)
  if (hit) return hit
  const r = oc.createBuffer(buf.numberOfChannels, buf.length, buf.sampleRate)
  for (let ch = 0; ch < buf.numberOfChannels; ch++) {
    const s = buf.getChannelData(ch)
    const d = r.getChannelData(ch)
    const n = s.length
    for (let i = 0; i < n; i++) d[i] = s[n - 1 - i] ?? 0
  }
  REV.set(key, r)
  if (REV.size > 6) REV.delete(REV.keys().next().value as string)
  return r
}

interface Timed { speed: number; rev: boolean; in: number; out: number }
function schedule(oc: BaseAudioContext, buf: AudioBuffer, key: string, c: Timed, start: number, dur: number, v: number, fi0: number, fo0: number): void {
  const sp = c.speed || 1
  const src = oc.createBufferSource()
  const g = oc.createGain()
  let off: number
  if (c.rev) {
    src.buffer = reversed(oc, buf, key)
    off = Math.max(0, buf.duration - Math.min(c.out, buf.duration))
  } else {
    src.buffer = buf
    off = Math.min(c.in, buf.duration)
  }
  src.playbackRate.value = sp
  const fi = Math.min(fi0 || 0, dur / 2)
  const fo = Math.min(fo0 || 0, dur / 2)
  g.gain.setValueAtTime(fi ? 0 : v, start)
  if (fi) g.gain.linearRampToValueAtTime(v, start + fi)
  if (fo) {
    g.gain.setValueAtTime(v, start + dur - fo)
    g.gain.linearRampToValueAtTime(0, start + dur)
  }
  src.connect(g)
  g.connect(oc.destination)
  src.start(start, off, dur * sp)
}

/** Volum og varighet i [a, b) av en lydfil (for «Utjevn lyd»). */
export async function audioStats(getBlob: GetBlob, id: string, a: number, b: number | null): Promise<{ peak: number; rms: number } | null> {
  const oc = new OfflineAudioContext(1, 1, 44100)
  const buf = await decode(oc, getBlob, id, 44100)
  if (!buf) return null
  const sr = buf.sampleRate
  const s0 = Math.max(0, Math.floor((a || 0) * sr))
  const s1 = Math.min(buf.length, b === null ? buf.length : Math.ceil(b * sr))
  let pk = 0
  let sum = 0
  let n = 0
  for (let ch = 0; ch < buf.numberOfChannels; ch++) {
    const x = buf.getChannelData(ch)
    for (let i = s0; i < s1; i += 2) {
      const xi = x[i] ?? 0
      const v = xi < 0 ? -xi : xi
      if (v > pk) pk = v
      sum += v * v
      n++
    }
  }
  return { peak: pk, rms: Math.sqrt(sum / Math.max(1, n)) }
}

/** Finner takten i et lydspor (autokorrelasjon av energiøkninger). */
export async function beats(getBlob: GetBlob, id: string, a: number, b: number | null): Promise<{ period: number; t0: number; bpm: number } | null> {
  const oc = new OfflineAudioContext(1, 1, 44100)
  const buf = await decode(oc, getBlob, id, 44100)
  if (!buf) return null
  const sr = buf.sampleRate
  const x = buf.getChannelData(0)
  const s0 = Math.max(0, Math.floor((a || 0) * sr))
  const s1 = Math.min(x.length, Math.ceil(Math.min(b ?? 1e9, (a || 0) + 240) * sr))
  const hop = 512
  const n = Math.floor((s1 - s0) / hop)
  if (n < 200) return null
  const E = new Float32Array(n)
  const O = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    let s = 0
    const o = s0 + i * hop
    for (let j = 0; j < hop; j++) {
      const v = x[o + j] ?? 0
      s += v * v
    }
    E[i] = Math.log(1e-6 + s)
  }
  for (let i = 1; i < n; i++) O[i] = Math.max(0, (E[i] ?? 0) - (E[i - 1] ?? 0))
  const fps = sr / hop
  const lo = Math.floor((fps * 60) / 180)
  const hi = Math.ceil((fps * 60) / 70)
  let best = 0
  let bl = 0
  for (let L = lo; L <= hi; L++) {
    let c = 0
    for (let i = L; i < n; i++) c += (O[i] ?? 0) * (O[i - L] ?? 0)
    c /= n - L
    if (c > best) {
      best = c
      bl = L
    }
  }
  if (!bl || best <= 0) return null
  let bp = bl
  let bo = 0
  let bs = -1
  for (let P = bl - 1.5; P <= bl + 1.5; P += 0.05) {
    for (let off = 0; off < P; off += 0.5) {
      let sm = 0
      let k = 0
      for (let q = off; q < n; q += P) {
        sm += O[Math.round(q)] ?? 0
        k++
      }
      sm /= Math.max(1, k)
      if (sm > bs) {
        bs = sm
        bp = P
        bo = off
      }
    }
  }
  return { period: bp / fps, t0: bo / fps, bpm: (60 * fps) / bp }
}

/** Mono 16-bit WAV (voiceover). */
export function toWav(buf: AudioBuffer): Blob {
  const ch = buf.getChannelData(0)
  const n = ch.length
  const sr = buf.sampleRate
  const ab = new ArrayBuffer(44 + n * 2)
  const v = new DataView(ab)
  const w = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i))
  }
  w(0, 'RIFF')
  v.setUint32(4, 36 + n * 2, true)
  w(8, 'WAVE')
  w(12, 'fmt ')
  v.setUint32(16, 16, true)
  v.setUint16(20, 1, true)
  v.setUint16(22, 1, true)
  v.setUint32(24, sr, true)
  v.setUint32(28, sr * 2, true)
  v.setUint16(32, 2, true)
  v.setUint16(34, 16, true)
  w(36, 'data')
  v.setUint32(40, n * 2, true)
  for (let i = 0; i < n; i++) {
    const s = Math.max(-1, Math.min(1, ch[i] ?? 0))
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }
  return new Blob([ab], { type: 'audio/wav' })
}

/** Mikser hele lydsporet (videoklipp, overlegg, musikk med demping). `raw` = uten volum/mikser (til tale-til-tekst). */
export async function renderAudio(p: Project, getBlob: GetBlob, sr: number, total: number, opt: { mono?: boolean; raw?: boolean; noMusic?: boolean } = {}): Promise<AudioBuffer | null> {
  const mono = !!opt.mono
  const L = layout(p)
  let any = false
  const MX = opt.raw ? { video: 1, ov: 1, music: 1, duck: false, duckAmt: 0 } : mixOf(p)
  const oc = new OfflineAudioContext(mono ? 1 : 2, Math.max(1, Math.ceil(total * sr)), sr)
  if (!hidden(p, 'video')) {
    for (let i = 0; i < L.length; i++) {
      const l = L[i]
      if (!l) continue
      const c = l.c
      if (c.kind !== 'video' || (!opt.raw && (c.muted || c.vol <= 0))) continue
      const buf = await decode(oc, getBlob, c.media, sr)
      if (!buf) continue
      any = true
      const nx = L[i + 1]
      schedule(oc, buf, `${c.media}@${sr}`, c, l.start, l.dur, opt.raw ? 1 : c.vol * MX.video,
        Math.max(l.tr, c.afi || 0, i === 0 && p.tin.type !== 'none' ? Math.min(p.tin.dur, l.dur / 2) : 0),
        Math.max(nx?.tr ?? 0, c.afo || 0, !nx && p.tout.type !== 'none' ? Math.min(p.tout.dur, l.dur / 2) : 0))
    }
  }
  if (!hidden(p, 'ov')) {
    for (const o of p.ov) {
      if (o.kind !== 'video' || (!opt.raw && (o.muted || o.vol <= 0))) continue
      const ob = await decode(oc, getBlob, o.media, sr)
      if (!ob) continue
      any = true
      schedule(oc, ob, `${o.media}@${sr}`, o, o.start, ovDur(o), opt.raw ? 1 : o.vol * o.opacity * MX.ov, o.fadeIn, o.fadeOut)
    }
  }
  let mbus: AudioNode = oc.destination
  if (!opt.noMusic && !hidden(p, 'music') && p.music.length) {
    const dg = oc.createGain()
    dg.gain.setValueAtTime(MX.music, 0)
    dg.connect(oc.destination)
    mbus = dg
    if (MX.duck) {
      for (const r of voiced(p)) {
        const lo = MX.music * (1 - MX.duckAmt)
        dg.gain.setValueAtTime(MX.music, Math.max(0, r[0] - DUCK_A))
        dg.gain.linearRampToValueAtTime(lo, Math.max(0.001, r[0]))
        dg.gain.setValueAtTime(lo, r[1])
        dg.gain.linearRampToValueAtTime(MX.music, r[1] + DUCK_R)
      }
    }
  }
  if (!opt.noMusic && !hidden(p, 'music')) {
    for (const m of p.music) {
      // dempet lydspor (Avansert) kommer ikke med i miksen
      if (p.muteA?.includes(m.lane || 0)) continue
      const mb = await decode(oc, getBlob, m.media, sr)
      if (!mb) continue
      any = true
      const len = m.loop ? Math.max(0, total - m.start) : Math.min(m.out - m.in, total - m.start)
      if (len <= 0) continue
      const s2 = oc.createBufferSource()
      const g2 = oc.createGain()
      s2.buffer = mb
      if (m.loop) {
        s2.loop = true
        s2.loopStart = m.in
        s2.loopEnd = Math.min(m.out, mb.duration)
      }
      const fi = Math.min(m.fadeIn, len / 2)
      const fo = Math.min(m.fadeOut, len / 2)
      g2.gain.setValueAtTime(fi ? 0 : m.vol, m.start)
      if (fi) g2.gain.linearRampToValueAtTime(m.vol, m.start + fi)
      if (fo) {
        g2.gain.setValueAtTime(m.vol, m.start + len - fo)
        g2.gain.linearRampToValueAtTime(0, m.start + len)
      }
      s2.connect(g2)
      g2.connect(mbus)
      s2.start(m.start, Math.min(m.in, mb.duration))
      s2.stop(m.start + len)
    }
  }
  if (!any) return null
  return oc.startRendering()
}
