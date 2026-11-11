/// <reference lib="webworker" />
import { loadTransformers } from '../../../services/ai/transformers'
import { asr, type AsrChunk } from './transcribe'

/**
 * Egen tråd for talegjenkjenningen (Whisper) i Motion Design. Tråden avsluttes når teksten er ferdig, og da frigjøres
 * ONNX Runtime sitt WebAssembly-minne (det krymper aldri; i hovedtråden ble en ny modell liggende for hver kjøring).
 */
export type AsrRequest = { audio: Float32Array; lang: string; model: string }
export type AsrReply =
  | { type: 'pct'; pct: number }
  | { type: 'listening' }
  | { type: 'done'; chunks: AsrChunk[] }
  | { type: 'error'; message: string }

self.onmessage = async (ev: MessageEvent<AsrRequest>) => {
  const post = (r: AsrReply) => (self as unknown as DedicatedWorkerGlobalScope).postMessage(r)
  try {
    const T = await loadTransformers()
    const chunks = await asr(T.pipeline as unknown as Parameters<typeof asr>[0], ev.data.audio, ev.data.lang, ev.data.model, (pct) => post({ type: 'pct', pct }), () => post({ type: 'listening' }), !!(navigator as Navigator & { gpu?: unknown }).gpu)
    post({ type: 'done', chunks })
  } catch (e) {
    post({ type: 'error', message: e instanceof Error ? e.message : String(e) })
  }
}

