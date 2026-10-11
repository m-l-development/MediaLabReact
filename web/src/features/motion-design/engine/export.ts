/**
 * Motion design – eksport til MP4 (H.264 og AAC, eller VP9/AV1 og Opus der H.264 mangler) med WebCodecs og
 * mp4-muxer fra egen vert (låst med SHA-384). Uten WebCodecs spilles prosjektet av i sanntid inn i MediaRecorder.
 * Typet port av motion-engine.js (eksport). Videoen lages i nettleseren og sendes aldri over nett.
 */
import { renderAudio, type GetBlob } from './audio'
import { fmtEta, layout, ovDur, srcTime, totalDur, type Project } from './model'
import { drawFrame, type Ctx2D, type MediaEls } from './render'

const MUXER_URL = '/vendor/mp4-muxer-5.1.3/mp4-muxer.js'
/** Samme hash som i media-lab/build/vendor-lock.json. */
const MUXER_SRI = 'sha384-SujebcgqCNlLMRSnVkLD+3eWOzsxobv30Bct+0lV+fc1EHHEuvcePwmDgMzpnptj'

interface Muxer {
  addVideoChunk(c: EncodedVideoChunk, m?: EncodedVideoChunkMetadata): void
  addAudioChunk(c: EncodedAudioChunk, m?: EncodedAudioChunkMetadata): void
  finalize(): void
}
interface MuxerLib {
  ArrayBufferTarget: new () => { buffer: ArrayBuffer }
  Muxer: new (o: {
    target: { buffer: ArrayBuffer }
    fastStart: 'in-memory'
    firstTimestampBehavior: 'offset'
    video: { codec: string; width: number; height: number; frameRate: number }
    audio?: { codec: string; numberOfChannels: number; sampleRate: number }
  }) => Muxer
}

let MUX: Promise<MuxerLib> | null = null
function loadMuxer(): Promise<MuxerLib> {
  const w = window as unknown as { Mp4Muxer?: MuxerLib }
  if (w.Mp4Muxer) return Promise.resolve(w.Mp4Muxer)
  MUX ??= new Promise<MuxerLib>((res, rej) => {
    const sc = document.createElement('script')
    sc.src = MUXER_URL
    sc.integrity = MUXER_SRI
    sc.crossOrigin = 'anonymous'
    sc.onload = () => (w.Mp4Muxer ? res(w.Mp4Muxer) : rej(new Error('Kunne ikke laste eksportmodulen. Sjekk nettet.')))
    sc.onerror = () => {
      MUX = null
      rej(new Error('Kunne ikke laste eksportmodulen. Sjekk nettet.'))
    }
    document.head.appendChild(sc)
  })
  return MUX
}

function seek(v: HTMLVideoElement, tt: number): Promise<void> {
  return new Promise((r) => {
    const done = () => {
      v.removeEventListener('seeked', done)
      clearTimeout(to)
      r()
    }
    const to = setTimeout(done, 2500)
    v.addEventListener('seeked', done)
    v.currentTime = tt
  })
}

export interface ExportOpts {
  w: number
  h: number
  fps: number
  M: MediaEls
  getBlob: GetBlob
  aborted: () => boolean
  /** Fremdrift: prosent og en norsk tekstmal med variabler ({pct}, {eta}), som oversettes i grensesnittet. */
  onProgress: (pct: number, phase: string, vars?: Record<string, string | number>) => void
}
export interface ExportResult { blob: Blob; audio: string | null; ext?: string }

const tick = () => new Promise<void>((r) => setTimeout(r, 0))

/** Reserve uten WebCodecs: spiller prosjektet i sanntid inn i MediaRecorder (MP4 der nettleseren kan, ellers WebM). */
async function exportRealtime(p: Project, o: ExportOpts): Promise<ExportResult> {
  const W = o.w
  const H = o.h
  const fps = Math.min(30, o.fps)
  const total = totalDur(p)
  if (typeof MediaRecorder === 'undefined') throw new Error('Nettleseren kan ikke eksportere video. Bruk Chrome, Edge, Firefox eller Safari.')
  const cv = document.createElement('canvas')
  cv.width = W
  cv.height = H
  if (!cv.captureStream) throw new Error('Nettleseren kan ikke eksportere video. Bruk Chrome, Edge, Firefox eller Safari.')
  const ctx = cv.getContext('2d')
  if (!ctx) throw new Error('canvas')
  const stream = cv.captureStream(fps)
  let ac: AudioContext | null = null
  let src: AudioBufferSourceNode | null = null
  o.onProgress(0, 'Lager lydspor …')
  try {
    const ab = await renderAudio(p, o.getBlob, 48000, total)
    if (ab) {
      ac = new AudioContext({ sampleRate: 48000 })
      const dst = ac.createMediaStreamDestination()
      src = ac.createBufferSource()
      src.buffer = ab
      src.connect(dst)
      for (const t of dst.stream.getAudioTracks()) stream.addTrack(t)
    }
  } catch {
    ac = null
  }
  const types = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
  const mime = types.find((t) => {
    try {
      return MediaRecorder.isTypeSupported(t)
    } catch {
      return false
    }
  }) ?? ''
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: Math.round(W * H * fps * 0.15) } : undefined)
  const chunks: Blob[] = []
  rec.ondataavailable = (ev) => {
    if (ev.data.size) chunks.push(ev.data)
  }
  const stopped = new Promise<void>((r) => {
    rec.onstop = () => r()
  })
  const L = layout(p)
  const vids = o.M.vids
  drawFrame(ctx, W, H, p, o.M, 0, null)
  rec.start(500)
  src?.start()
  const t0 = performance.now()
  for (const v of Object.values(vids)) {
    try {
      v.pause()
    } catch {
      // ingenting å stoppe
    }
  }
  for (;;) {
    if (o.aborted()) {
      rec.stop()
      void ac?.close()
      throw new Error('abort')
    }
    const t = (performance.now() - t0) / 1000
    if (t >= total) break
    for (const l of L) {
      if (l.c.kind !== 'video') continue
      const v = vids[l.c.id]
      if (!v?.duration || t < l.start || t >= l.end) continue
      const tt = Math.min(v.duration - 0.02, srcTime(l.c, t - l.start))
      if (Math.abs(v.currentTime - tt) > 0.25) v.currentTime = tt
    }
    drawFrame(ctx, W, H, p, o.M, t, null)
    const pct = Math.round((t / total) * 100)
    o.onProgress(pct, 'Tar opp video i sanntid … {pct} %', { pct })
    await new Promise((r) => setTimeout(r, 1000 / fps / 2))
  }
  rec.stop()
  await stopped
  void ac?.close().catch(() => undefined)
  const type = (mime || 'video/webm').split(';')[0] ?? 'video/webm'
  const blob = new Blob(chunks, { type })
  if (blob.size < 1024) throw new Error('Filen ble tom. Prøv igjen.')
  return { blob, audio: ac ? 'opus' : null, ext: type === 'video/mp4' ? 'mp4' : 'webm' }
}

/** Eksporterer prosjektet til MP4, bilde for bilde. Kaster Error('abort') når brukeren avbryter. */
export async function exportMp4(p: Project, o: ExportOpts): Promise<ExportResult> {
  if (typeof VideoEncoder === 'undefined' || typeof VideoFrame === 'undefined') return exportRealtime(p, o)
  const W = o.w
  const H = o.h
  const fps = o.fps
  const total = totalDur(p)
  const nF = Math.max(1, Math.round(total * fps))
  const big = W * H > 2300000
  const Mx = await loadMuxer()
  const cands = big ? ['avc1.640033', 'avc1.640034', 'avc1.4d0033'] : fps > 30 ? ['avc1.64002a', 'avc1.4d002a', 'avc1.640033'] : ['avc1.640028', 'avc1.4d0028', 'avc1.42e028', 'avc1.640033']
  const br = Math.round(W * H * fps * (big ? 0.13 : 0.2))
  let vcfg: VideoEncoderConfig | null = null
  let vcodec = 'avc'
  for (const codec of cands) {
    if (vcfg) break
    try {
      const r = await VideoEncoder.isConfigSupported({ codec, width: W, height: H, bitrate: br, bitrateMode: 'variable', latencyMode: 'quality', framerate: fps, avc: { format: 'avc' } })
      if (r.supported && r.config) vcfg = r.config
    } catch {
      // prøv neste
    }
  }
  // Uten H.264-koder (f.eks. Firefox på enkelte systemer): VP9 eller AV1 i samme MP4-beholder.
  for (const [codec, name] of [['vp09.00.40.08', 'vp9'], ['av01.0.08M.08', 'av1']] as const) {
    if (vcfg) break
    try {
      const r = await VideoEncoder.isConfigSupported({ codec, width: W, height: H, bitrate: br, bitrateMode: 'variable', framerate: fps })
      if (r.supported && r.config) {
        vcfg = r.config
        vcodec = name
      }
    } catch {
      // prøv neste
    }
  }
  if (!vcfg) return exportRealtime(p, o)
  let acfg: AudioEncoderConfig | null = null
  let acodec: string | null = null
  if (typeof AudioEncoder !== 'undefined') {
    for (const [codec, name] of [['mp4a.40.2', 'aac'], ['opus', 'opus']] as const) {
      if (acfg) break
      try {
        const r = await AudioEncoder.isConfigSupported({ codec, sampleRate: 48000, numberOfChannels: 2, bitrate: 192000 })
        if (r.supported && r.config) {
          acfg = r.config
          acodec = name
        }
      } catch {
        // prøv neste
      }
    }
  }
  o.onProgress(0, 'Lager lydspor …')
  const ab = acfg ? await renderAudio(p, o.getBlob, 48000, total) : null
  if (!ab) acfg = null
  const target = new Mx.ArrayBufferTarget()
  let err: unknown = null
  const muxer = new Mx.Muxer({
    target, fastStart: 'in-memory', firstTimestampBehavior: 'offset',
    video: { codec: vcodec, width: W, height: H, frameRate: fps },
    ...(acfg && acodec ? { audio: { codec: acodec, numberOfChannels: 2, sampleRate: 48000 } } : {}),
  })
  const venc = new VideoEncoder({ output: (ch, meta) => muxer.addVideoChunk(ch, meta), error: (e) => { err = e } })
  venc.configure(vcfg)
  try {
    if (acfg && ab) {
      const aenc = new AudioEncoder({ output: (ch, meta) => muxer.addAudioChunk(ch, meta), error: (e) => { err = e } })
      aenc.configure(acfg)
      const L0 = ab.getChannelData(0)
      const R0 = ab.numberOfChannels > 1 ? ab.getChannelData(1) : L0
      const N = 4800
      for (let s = 0; s < ab.length; s += N) {
        const n = Math.min(N, ab.length - s)
        const d = new Float32Array(n * 2)
        d.set(L0.subarray(s, s + n), 0)
        d.set(R0.subarray(s, s + n), n)
        const ad = new AudioData({ format: 'f32-planar', sampleRate: 48000, numberOfFrames: n, numberOfChannels: 2, timestamp: Math.round((s / 48000) * 1e6), data: d })
        aenc.encode(ad)
        ad.close()
      }
      await aenc.flush()
      aenc.close()
    }
    const cv = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(W, H) : Object.assign(document.createElement('canvas'), { width: W, height: H })
    const ctx = cv.getContext('2d') as Ctx2D | null
    if (!ctx) throw new Error('canvas')
    const L = layout(p)
    const t0 = performance.now()
    for (let f = 0; f < nF; f++) {
      if (o.aborted()) throw new Error('abort')
      if (err) throw err instanceof Error ? err : new Error(String(err))
      const t = f / fps
      for (const l of L) {
        if (l.c.kind !== 'video' || t < l.start || t >= l.end) continue
        const v = o.M.vids[l.c.id]
        if (!v?.duration) continue
        const tt = Math.min(v.duration - 0.02, srcTime(l.c, t - l.start))
        if (Math.abs(v.currentTime - tt) > 0.45 / fps) await seek(v, tt)
      }
      for (const ov of p.ov) {
        if (ov.kind !== 'video' || t < ov.start || t >= ov.start + ovDur(ov)) continue
        const ovv = o.M.vids[ov.id]
        if (!ovv?.duration) continue
        const ot = Math.min(ovv.duration - 0.02, srcTime(ov, t - ov.start))
        if (Math.abs(ovv.currentTime - ot) > 0.45 / fps) await seek(ovv, ot)
      }
      drawFrame(ctx, W, H, p, o.M, t, null)
      const fr = new VideoFrame(cv, { timestamp: Math.round(t * 1e6), duration: Math.round(1e6 / fps) })
      venc.encode(fr, { keyFrame: f % (fps * 2) === 0 })
      fr.close()
      while (venc.encodeQueueSize > 6) await new Promise((r) => setTimeout(r, 2))
      if (f % 10 === 0) {
        const el = (performance.now() - t0) / 1000
        const left = f > 20 ? (el / f) * (nF - f) : null
        const pct = Math.round((f / nF) * 100)
        if (left !== null) o.onProgress(pct, 'Lager video … {pct} % · ca. {eta} igjen', { pct, eta: fmtEta(left) })
        else o.onProgress(pct, 'Lager video … {pct} %', { pct })
        await tick()
      }
    }
    o.onProgress(100, 'Fullfører filen …')
    await venc.flush()
    muxer.finalize()
  } finally {
    try {
      venc.close()
    } catch {
      // allerede lukket
    }
  }
  const blob = new Blob([target.buffer], { type: 'video/mp4' })
  if (blob.size < 1024) throw new Error('Filen ble tom. Prøv igjen.')
  return { blob, audio: acfg ? acodec : null }
}
