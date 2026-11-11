import type { Mask } from './mask'
import type { SegReply, SegRequest } from './segment.worker'
import { Segmenter, StallError, type ModelKey, type Phase, type SamPrompt } from './segmenter'

/**
 * AI-segmenteringen (Segmenter) i egen tråd, med samme grensesnitt som Segmenter. Brukes av Isolate Subject, Photo
 * Design og Thumbnail Studio.
 *
 * Minne: ONNX Runtime sitt WebAssembly-minne kan ikke krympe. I hovedtråden ble det liggende (målt: rundt 1,7 GB) til
 * siden ble lastet på nytt. Her avsluttes tråden når verktøyet lukkes, og etter IDLE_MS uten AI-bruk, og da frigjøres
 * alt. Modellfilene ligger i nettleserens hurtigbuffer, så neste bruk starter modellen på et par sekunder uten ny
 * nedlasting. Bildet sendes som ImageBitmap (overføres, ingen kopi); masken kommer tilbake på samme måte.
 * Uten Worker (enhetstester) brukes Segmenter direkte.
 */
export const IDLE_MS = 120_000

export class AiSegmenter {
  private w: Worker | null = null
  private core: Segmenter | null = null
  private seq = 0
  private loaded = new Set<ModelKey>()
  /** Bildet AI-tråden har analysert for «Merk i bildet» (sendes bare på nytt når det er et annet bilde). */
  private img: { src: HTMLCanvasElement; id: number } | null = null
  private imgSeq = 0
  private idle: ReturnType<typeof setTimeout> | undefined
  private running = 0

  private get direct(): Segmenter | null {
    if (typeof Worker !== 'undefined') return null
    return (this.core ??= new Segmenter())
  }

  private worker(): Worker {
    this.w ??= new Worker(new URL('./segment.worker.ts', import.meta.url), { type: 'module' })
    return this.w
  }

  /** Avslutter tråden: alt minnet (modeller, analyse) frigjøres. */
  private kill() {
    clearTimeout(this.idle)
    this.w?.terminate()
    this.w = null
    this.loaded.clear()
    this.img = null
  }

  private call(q: SegRequest, transfer: Transferable[], onPhase: (p: Phase) => void, onPct: (n: number) => void): Promise<Mask | null> {
    clearTimeout(this.idle)
    this.running++
    const w = this.worker()
    return new Promise<Mask | null>((resolve, reject) => {
      const end = () => {
        w.removeEventListener('message', onMsg)
        w.removeEventListener('error', onErr)
        this.running--
        // ingen AI-bruk på en stund: tråden avsluttes og minnet frigjøres
        if (!this.running) this.idle = setTimeout(() => this.kill(), IDLE_MS)
      }
      const onMsg = (ev: MessageEvent<SegReply>) => {
        const m = ev.data
        if (m.id !== q.id) return
        if (m.type === 'phase') onPhase(m.phase)
        else if (m.type === 'pct') onPct(m.pct)
        else if (m.type === 'done') { end(); resolve(m.mask) }
        else {
          end()
          reject(m.name === 'StallError' ? new StallError() : Object.assign(new Error(m.message), { name: m.name }))
        }
      }
      // tråden krasjet (f.eks. tom for minne): ny tråd neste gang
      const onErr = (e: ErrorEvent) => {
        end()
        this.kill()
        reject(new Error(e.message || 'AI-tråden stoppet'))
      }
      w.addEventListener('message', onMsg)
      w.addEventListener('error', onErr)
      w.postMessage(q, transfer)
    })
  }

  isModelLoaded(key: ModelKey): boolean {
    return this.direct ? this.direct.isModelLoaded(key) : this.loaded.has(key)
  }

  async removeBackground(key: ModelKey, src: HTMLCanvasElement, onPhase: (p: Phase) => void, onPct: (n: number) => void): Promise<Mask> {
    if (this.direct) return this.direct.removeBackground(key, src, onPhase, onPct)
    const bmp = await createImageBitmap(src)
    const a = await this.call({ id: ++this.seq, op: 'bg', key, bmp }, [bmp], onPhase, onPct)
    if (!a) throw new Error('Tomt svar fra modellen')
    this.loaded.add(key)
    return a
  }

  async samMask(src: HTMLCanvasElement, prompt: SamPrompt, negatives: { x: number; y: number }[], onPhase: (p: Phase) => void, onPct: (n: number) => void, whole = false): Promise<Mask | null> {
    if (this.direct) return this.direct.samMask(src, prompt, negatives, onPhase, onPct, whole)
    const fresh = !this.w || this.img?.src !== src
    if (fresh) this.img = { src, id: ++this.imgSeq }
    const img = this.img as { src: HTMLCanvasElement; id: number }
    const bmp = fresh ? await createImageBitmap(src) : null
    return this.call({ id: ++this.seq, op: 'sam', imgId: img.id, bmp, prompt, negatives, whole }, bmp ? [bmp] : [], onPhase, onPct)
  }

  forgetImage(): void {
    if (this.direct) { this.direct.forgetImage(); return }
    this.img = null
    this.w?.postMessage({ id: 0, op: 'forget' } satisfies SegRequest)
  }

  /** Verktøyet lukkes: tråden og alt minnet den brukte, frigjøres. */
  dispose(): void {
    this.direct?.dispose()
    this.core = null
    this.kill()
  }
}
