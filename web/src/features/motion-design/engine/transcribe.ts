/**
 * Motion design – undertekster med AI (Whisper i nettleseren, via den felles transformers.js-lasteren).
 * Lyden hentes fra videoklippene, mikses til mono 16 kHz og gjøres om til tekst lokalt. Ingenting sendes over nett;
 * bare talemodellen lastes ned første gang.
 *
 * Selve gjenkjenningen kjøres i en egen tråd (transcribe.worker.ts) som avsluttes når teksten er ferdig, så modellens
 * minne frigjøres (før ble en ny modell liggende i hovedtråden for hver kjøring). Uten Worker (tester) kjøres den her.
 */
import { loadTransformers, type ProgressInfo } from '../../../services/ai/transformers'
import { renderAudio, type GetBlob } from './audio'
import { totalDur, uid, type Project, type Sub } from './model'
import type { AsrReply, AsrRequest } from './transcribe.worker'

export interface AsrChunk { timestamp?: [number | null, number | null]; text?: string }
type Asr = (audio: Float32Array, o: { language: string; task: 'transcribe'; return_timestamps: true; chunk_length_s: number; stride_length_s: number }) => Promise<{ chunks?: AsrChunk[] }>
type AsrPipeline = (task: 'automatic-speech-recognition', model: string, o: { device: string; dtype: string | Record<string, string>; progress_callback?: (p: ProgressInfo & { progress?: number }) => void }) => Promise<Asr>

export const WHISPER_MODELS = [
  ['onnx-community/whisper-base', 'Rask', 'Mindre modell (ca. 80 MB), raskere'],
  ['onnx-community/whisper-small', 'Nøyaktig', 'Større modell (ca. 250 MB), bedre på norsk'],
] as const

/** Talegjenkjenningen (samme i tråden og direkte): laster modellen (WebGPU, ellers WASM) og gir tekstbitene. */
export async function asr(pipeline: AsrPipeline, audio: Float32Array, lang: string, model: string, onPct: (pct: number) => void, onListening: () => void, gpu: boolean): Promise<AsrChunk[]> {
  const files: Record<string, number> = {}
  const cb = (d: ProgressInfo & { progress?: number }) => {
    if (d.status !== 'progress' || !d.file) return
    files[d.file] = d.progress || 0
    const ks = Object.keys(files)
    onPct(Math.round(ks.reduce((a, k) => a + (files[k] ?? 0), 0) / ks.length))
  }
  const mk = (dev: string) => pipeline('automatic-speech-recognition', model, { device: dev, dtype: dev === 'webgpu' ? { encoder_model: 'fp32', decoder_model_merged: 'q4' } : 'q8', progress_callback: cb })
  let pipe: Asr
  try {
    pipe = await mk(gpu ? 'webgpu' : 'wasm')
  } catch (e) {
    if (!gpu) throw e
    pipe = await mk('wasm')
  }
  onListening()
  const r = await pipe(audio, { language: lang, task: 'transcribe', return_timestamps: true, chunk_length_s: 30, stride_length_s: 5 })
  return r.chunks ?? []
}

function inWorker(audio: Float32Array, lang: string, model: string, onPct: (pct: number) => void, onListening: () => void): Promise<AsrChunk[]> {
  const w = new Worker(new URL('./transcribe.worker.ts', import.meta.url), { type: 'module' })
  return new Promise<AsrChunk[]>((resolve, reject) => {
    w.onmessage = (ev: MessageEvent<AsrReply>) => {
      const m = ev.data
      if (m.type === 'pct') onPct(m.pct)
      else if (m.type === 'listening') onListening()
      else {
        w.terminate()
        if (m.type === 'done') resolve(m.chunks)
        else reject(new Error(m.message))
      }
    }
    w.onerror = (e) => {
      w.terminate()
      reject(new Error(e.message || 'Talegjenkjenningen stoppet'))
    }
    w.postMessage({ audio, lang, model } satisfies AsrRequest, [audio.buffer])
  })
}

export async function transcribe(p: Project, getBlob: GetBlob, o: { lang: string; model: string; onProgress: (msg: string, vars?: Record<string, string | number>) => void }): Promise<Sub[]> {
  const total = totalDur(p)
  o.onProgress('Henter lyd fra klippene …')
  const buf = await renderAudio(p, getBlob, 16000, total, { noMusic: true, mono: true, raw: true })
  if (!buf) throw new Error('Fant ingen lyd i videoklippene.')
  o.onProgress('Laster talemodellen …')
  const onPct = (pct: number) => o.onProgress('Laster talemodellen … {pct} %', { pct })
  const onListening = () => o.onProgress('Lytter og skriver … dette kan ta litt tid')
  // kopi av lyden (bufferen eies av lydkonteksten); overføres til tråden uten ny kopi
  const audio = Float32Array.from(buf.getChannelData(0))
  const chunks = typeof Worker !== 'undefined'
    ? await inWorker(audio, o.lang, o.model, onPct, onListening)
    : await asr((await loadTransformers()).pipeline as unknown as AsrPipeline, audio, o.lang, o.model, onPct, onListening, !!(navigator as Navigator & { gpu?: unknown }).gpu)
  const out: Sub[] = []
  for (const ch of chunks) {
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
