import { inpaint } from './inpaint'
import type { Mask } from './mask'

/**
 * «Fyll med omgivelser» fra kontrolleren: kjøres i egen tråd (fill.worker.ts) med LaMa (AI) og innholdsbevisst
 * utfylling som reserve. Uten Worker (tester) brukes den innholdsbevisste utfyllingen direkte.
 *
 * Minne: LaMa (fp32) bruker rundt 1 GB under kjøringen. Safari (og alle nettlesere på iPhone/iPad, som er WebKit) laster
 * da hele siden på nytt («using significant memory»), og arbeidet går tapt – det kan ikke fanges. Der, og på enheter med
 * lite minne, brukes derfor den innholdsbevisste utfyllingen. Modellen kjøres på WASM (WebGPU hang i oppstarten hos
 * noen, uten feil). Svarer ikke tråden på lenge, avbrytes AI-forsøket og reserven brukes, så det aldri står og venter.
 */
export type Device = 'webgpu' | 'wasm'
export interface FillRequest { id: number; rgba: ArrayBuffer; W: number; H: number; mask: Mask; grow: number; seed: number; device: Device | null }
export type FillReply =
  | { id: number; type: 'progress'; phase: 'model' | 'run'; pct: number }
  | { id: number; type: 'aiFailed'; message: string }
  | { id: number; type: 'done'; rgba: ArrayBuffer; method: 'ai' | 'patch' }
  | { id: number; type: 'error'; message: string }

/** `why`: hvorfor AI ikke ble brukt ('device' = nettleseren/enheten tåler den ikke, 'failed' = lasting/kjøring feilet). */
export interface FillResult { rgba: Uint8ClampedArray; method: 'ai' | 'patch'; why?: 'device' | 'failed' }
export type FillProgress = (phase: 'model' | 'run', pct: number) => void

/** Så lenge uten svar fra tråden (nedlasting gir jevnlig fremdrift; selve kjøringen tar opptil et par minutter). */
export const SILENT_MS = 180_000

/** Tåler nettleseren og enheten AI-modellen? Ikke WebKit (Safari, alle iOS-nettlesere) og ikke under 4 GB minne. */
export function aiCapable(nav: { userAgent: string; maxTouchPoints?: number; deviceMemory?: number } = navigator as Navigator & { deviceMemory?: number }): boolean {
  const ua = nav.userAgent || ''
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && (nav.maxTouchPoints ?? 0) > 1)
  const safari = /AppleWebKit/.test(ua) && !/Chrome|Chromium|Edg|Firefox|Android/.test(ua)
  return !ios && !safari && (nav.deviceMemory == null || nav.deviceMemory >= 4)
}

export class FillRunner {
  private worker: Worker | null = null
  /** AI feilet eller svarte ikke i denne økten: ikke prøv igjen (reserven brukes straks). */
  private aiBroken = false
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
    const why = !opt.ai ? undefined : !aiCapable() ? 'device' as const : this.aiBroken ? 'failed' as const : undefined
    if (typeof Worker === 'undefined') {
      const out = new Uint8ClampedArray(rgba)
      inpaint(out, W, H, mask, { seed: opt.seed, grow: opt.grow, onProgress: (p) => onProgress('run', p) })
      return { rgba: out, method: 'patch', ...(why ? { why } : {}) }
    }
    const r = await this.send(rgba, W, H, mask, opt, opt.ai && !why ? 'wasm' : null, onProgress)
    if (r === 'stalled') {
      // AI svarte ikke: ny tråd med innholdsbevisst utfylling
      this.kill()
      this.aiBroken = true
      const again = await this.send(rgba, W, H, mask, opt, null, onProgress)
      if (again === 'stalled') throw new Error('Utfyllingen svarte ikke')
      return { ...again, why: 'failed' }
    }
    if (opt.ai && r.method === 'patch') {
      if (!why) this.aiBroken = true
      return { ...r, why: why ?? 'failed' }
    }
    return r
  }

  private send(rgba: Uint8ClampedArray, W: number, H: number, mask: Mask, opt: { grow: number; seed: number }, device: Device | null, onProgress: FillProgress): Promise<FillResult | 'stalled'> {
    const w = this.spawn()
    const id = ++this.seq
    return new Promise((resolve, reject) => {
      let timer: ReturnType<typeof setTimeout> | undefined
      // vakt mot at tråden henger (bare med AI; den innholdsbevisste utfyllingen melder fremdrift hele tiden)
      const arm = () => {
        clearTimeout(timer)
        if (device) timer = setTimeout(() => { end(); resolve('stalled') }, SILENT_MS)
      }
      const end = () => {
        clearTimeout(timer)
        w.removeEventListener('message', onMsg)
        w.removeEventListener('error', onErr)
      }
      const onMsg = (ev: MessageEvent<FillReply>) => {
        const m = ev.data
        if (m.id !== id) return
        arm()
        if (m.type === 'progress') onProgress(m.phase, m.pct)
        else if (m.type === 'done') {
          end()
          resolve({ rgba: new Uint8ClampedArray(m.rgba), method: m.method })
        } else if (m.type === 'error') {
          end()
          reject(new Error(m.message))
        }
      }
      // tråden krasjet (f.eks. tom for minne): innholdsbevisst utfylling i en ny tråd
      const onErr = () => {
        end()
        this.kill()
        if (device) {
          this.aiBroken = true
          this.send(rgba, W, H, mask, opt, null, onProgress).then(resolve, reject)
        } else reject(new Error('Utfyllingen stoppet'))
      }
      w.addEventListener('message', onMsg)
      w.addEventListener('error', onErr)
      arm()
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
