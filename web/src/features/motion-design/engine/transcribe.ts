/**
 * Motion design – undertekster med AI (Whisper i nettleseren, via den felles transformers.js-lasteren).
 * Lyden hentes fra videoklippene, mikses til mono 16 kHz og gjøres om til tekst lokalt. Ingenting sendes over nett;
 * bare talemodellen lastes ned første gang.
 */
import { loadTransformers, type ProgressInfo } from '../../../services/ai/transformers'
import { renderAudio, type GetBlob } from './audio'
import { totalDur, uid, type Project, type Sub } from './model'

interface AsrChunk { timestamp?: [number | null, number | null]; text?: string }
type Asr = (audio: Float32Array, o: { language: string; task: 'transcribe'; return_timestamps: true; chunk_length_s: number; stride_length_s: number }) => Promise<{ chunks?: AsrChunk[] }>
type AsrPipeline = (task: 'automatic-speech-recognition', model: string, o: { device: string; dtype: string | Record<string, string>; progress_callback?: (p: ProgressInfo & { progress?: number }) => void }) => Promise<Asr>

export const WHISPER_MODELS = [
  ['onnx-community/whisper-base', 'Rask', 'Mindre modell (ca. 80 MB), raskere'],
  ['onnx-community/whisper-small', 'Nøyaktig', 'Større modell (ca. 250 MB), bedre på norsk'],
] as const

export async function transcribe(p: Project, getBlob: GetBlob, o: { lang: string; model: string; onProgress: (msg: string, vars?: Record<string, string | number>) => void }): Promise<Sub[]> {
  const total = totalDur(p)
  o.onProgress('Henter lyd fra klippene …')
  const buf = await renderAudio(p, getBlob, 16000, total, { noMusic: true, mono: true, raw: true })
  if (!buf) throw new Error('Fant ingen lyd i videoklippene.')
  o.onProgress('Laster talemodellen …')
  const T = await loadTransformers()
  const pipeline = T.pipeline as unknown as AsrPipeline
  const files: Record<string, number> = {}
  const cb = (d: ProgressInfo & { progress?: number }) => {
    if (d.status !== 'progress' || !d.file) return
    files[d.file] = d.progress || 0
    const ks = Object.keys(files)
    const pc = ks.reduce((a, k) => a + (files[k] ?? 0), 0) / ks.length
    o.onProgress('Laster talemodellen … {pct} %', { pct: Math.round(pc) })
  }
  const gpu = !!(navigator as Navigator & { gpu?: unknown }).gpu
  const mk = (dev: string) => pipeline('automatic-speech-recognition', o.model, { device: dev, dtype: dev === 'webgpu' ? { encoder_model: 'fp32', decoder_model_merged: 'q4' } : 'q8', progress_callback: cb })
  let pipe: Asr
  try {
    pipe = await mk(gpu ? 'webgpu' : 'wasm')
  } catch (e) {
    if (!gpu) throw e
    pipe = await mk('wasm')
  }
  o.onProgress('Lytter og skriver … dette kan ta litt tid')
  const r = await pipe(buf.getChannelData(0), { language: o.lang, task: 'transcribe', return_timestamps: true, chunk_length_s: 30, stride_length_s: 5 })
  const out: Sub[] = []
  for (const ch of r.chunks ?? []) {
    const s = ch.timestamp?.[0] ?? 0
    const e = ch.timestamp?.[1] ?? s + 3
    const tx = String(ch.text || '').trim()
    if (!tx || e <= s) continue
    const words = tx.split(/\s+/)
    const parts = Math.max(1, Math.ceil(tx.length / 84))
    const per = Math.ceil(words.length / parts)
    const d = (e - s) / parts
    for (let i = 0; i < parts; i++) out.push({ id: uid('s'), start: s + d * i, end: s + d * (i + 1), text: words.slice(i * per, (i + 1) * per).join(' ') })
  }
  return out
}
