import { hasWebGpu } from '../../../services/ai/transformers'
import { inpaint } from './inpaint'
import type { Mask } from './mask'

/**
 * «Fyll med omgivelser» fra kontrolleren: kjøres i egen tråd (fill.worker.ts) med LaMa (AI) og innholdsbevisst
 * utfylling som reserve. WebGPU prøves først; feiler den, startes en ny tråd med WASM (en feilet WebGPU-oppstart kan
 * låse ONNX Runtime for resten av tråden, TB-7BF5C1). Uten Worker (tester) brukes den innholdsbevisste utfyllingen direkte.
 */
export type Device = 'webgpu' | 'wasm'
export interface FillRequest { id: number; rgba: ArrayBuffer; W: number; H: number; mask: Mask; grow: number; seed: number; device: Device | null }
export type FillReply =
  | { id: number; type: 'progress'; phase: 'model' | 'run'; pct: number }
  | { id: number; type: 'aiFailed'; message: string }
  | { id: number; type: 'done'; rgba: ArrayBuffer; method: 'ai' | 'patch' }
  | { id: number; type: 'error'; message: string }

export interface FillResult { rgba: Uint8ClampedArray; method: 'ai' | 'patch' }
export type FillProgress = (phase: 'model' | 'run', pct: number) => void

/** Så lenge uten svar fra en GPU-kjøring før den regnes som feilet og WASM brukes. */
const GPU_TIMEOUT_MS = 90_000

export class FillRunner {
  private worker: Worker | null = null
  private device: Device | null | undefined
  private seq = 0

  private spawn(): Worker {
    this.worker ??= new Worker(new URL('./fill.worker.ts', import.meta.url), { type: 'module' })
    return this.worker
  }

  private kill() {
    this.worker?.terminate()
    this.worker = null
  }

  /** Fyller området i en kopi av `rgba`. `ai: false` = bare innholdsbevisst utfylling (ingen nedlasting). */
  async fill(rgba: Uint8ClampedArray, W: number, H: number, mask: Mask, opt: { grow: number; seed: number; ai: boolean }, onProgress: FillProgress): Promise<FillResult> {
    if (typeof Worker === 'undefined') {
      const out = new Uint8ClampedArray(rgba)
      inpaint(out, W, H, mask, { seed: opt.seed, grow: opt.grow, onProgress: (p) => onProgress('run', p) })
      return { rgba: out, method: 'patch' }
    }
    if (opt.ai && this.device === undefined) this.device = (await hasWebGpu()) ? 'webgpu' : 'wasm'
    const device = opt.ai ? (this.device ?? null) : null
    const r = await this.send(rgba, W, H, mask, opt, device, onProgress)
    if (r !== 'gpuFailed') return r
    // WebGPU virket ikke her: ny tråd med WASM resten av økten
    this.kill()
    this.device = 'wasm'
    const again = await this.send(rgba, W, H, mask, opt, 'wasm', onProgress)
    if (again === 'gpuFailed') throw new Error('unreachable')
    return again
  }

  private send(rgba: Uint8ClampedArray, W: number, H: number, mask: Mask, opt: { grow: number; seed: number }, device: Device | null, onProgress: FillProgress): Promise<FillResult | 'gpuFailed'> {
    const w = this.spawn()
    const id = ++this.seq
    return new Promise((resolve, reject) => {
      let timer: ReturnType<typeof setTimeout> | undefined
      const end = () => {
        clearTimeout(timer)
        w.removeEventListener('message', onMsg)
        w.removeEventListener('error', onErr)
      }
      const onMsg = (ev: MessageEvent<FillReply>) => {
        const m = ev.data
        if (m.id !== id) return
        if (m.type === 'progress') {
          onProgress(m.phase, m.pct)
          if (device === 'webgpu' && m.phase === 'run' && !timer) timer = setTimeout(() => { end(); resolve('gpuFailed') }, GPU_TIMEOUT_MS)
        } else if (m.type === 'aiFailed') {
          if (device === 'webgpu') { end(); resolve('gpuFailed') }
        } else if (m.type === 'done') {
          end()
          resolve({ rgba: new Uint8ClampedArray(m.rgba), method: m.method })
        } else {
          end()
          reject(new Error(m.message))
        }
      }
      // tråden krasjet (f.eks. tom for minne): innholdsbevisst utfylling i en ny tråd
      const onErr = () => {
        end()
        this.kill()
        if (device) this.send(rgba, W, H, mask, opt, null, onProgress).then(resolve, reject)
        else reject(new Error('Utfyllingen stoppet'))
      }
      w.addEventListener('message', onMsg)
      w.addEventListener('error', onErr)
      // kopi (bildet beholdes til et nytt forsøk); masken klones av postMessage
      const copy = new Uint8ClampedArray(rgba)
      const req: FillRequest = { id, rgba: copy.buffer, W, H, mask, grow: opt.grow, seed: opt.seed, device }
      w.postMessage(req, [copy.buffer])
    })
  }

  dispose(): void {
    this.kill()
  }
}
