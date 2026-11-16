/**
 * Panorama – klient for arbeidstråden, med samme beregning i hovedtråden som reserve (nettlesere uten moduletråder).
 * Forhåndsvisninger: bare den siste forespørselen tegnes (eldre som ikke er startet, hoppes over).
 */
import { analyze, render, type Analysis, type Img, type PanoParams, type Rendered, type RenderOpts } from './stitch'

export type { Analysis, Img, PanoParams, Rendered }

type Msg = { t: 'progress'; id: number; stage: string; k: number } | { t: 'analysis'; id: number; an: Analysis } | { t: 'rendered'; id: number; r: Rendered } | { t: 'error'; id: number; msg: string }

export class PanoClient {
  private w: Worker | null = null
  private seq = 0
  private wait = new Map<number, { ok: (v: unknown) => void; bad: (e: Error) => void; prog?: ((stage: string, k: number) => void) | undefined }>()
  private sent = new Set<string>()

  private worker(): Worker | null {
    if (this.w) return this.w
    try {
      this.w = new Worker(new URL('./pano.worker.ts', import.meta.url), { type: 'module' })
      this.w.onmessage = (e: MessageEvent<Msg>) => {
        const m = e.data
        const h = this.wait.get(m.id)
        if (!h) return
        if (m.t === 'progress') return h.prog?.(m.stage, m.k)
        this.wait.delete(m.id)
        if (m.t === 'error') h.bad(new Error(m.msg))
        else h.ok(m.t === 'analysis' ? m.an : m.r)
      }
      this.w.onerror = () => {
        for (const h of this.wait.values()) h.bad(new Error('Panorama-tråden stoppet'))
        this.wait.clear()
        this.w = null
        this.sent.clear()
      }
    } catch {
      this.w = null
    }
    return this.w
  }

  private call<T>(msg: Record<string, unknown>, transfer: Transferable[], prog?: (stage: string, k: number) => void): Promise<T> {
    const w = this.worker()
    const id = ++this.seq
    if (!w) return Promise.reject(new Error('no-worker'))
    return new Promise<T>((ok, bad) => {
      this.wait.set(id, { ok: ok as (v: unknown) => void, bad, prog })
      w.postMessage({ ...msg, id }, transfer)
    })
  }

  async analyze(imgs: Img[], hint: (number | null)[], prog?: (stage: string, k: number) => void): Promise<Analysis> {
    try {
      return await this.call<Analysis>({ t: 'analyze', imgs, hint }, [], prog)
    } catch (e) {
      if ((e as Error).message !== 'no-worker') throw e
      return analyze(imgs, hint, prog)
    }
  }

  /**
   * Tegner panoramaet. `key` identifiserer kildebildene (sendes bare første gang for en nøkkel); nøkler som begynner med
   * «full:» brukes én gang og overføres (ikke kopiert).
   */
  async render(key: string, imgs: (Img | null)[], an: Analysis, p: PanoParams, o: Omit<RenderOpts, 'progress'>, prog?: (k: number) => void): Promise<Rendered> {
    const first = !this.sent.has(key)
    const full = key.startsWith('full:')
    try {
      const r = await this.call<Rendered>({ t: 'render', key, an, p, o, ...(first ? { imgs } : {}) }, first && full ? imgs.filter((x): x is Img => !!x).map((x) => x.data.buffer) : [], prog ? (_s, k) => prog(k) : undefined)
      if (!full) this.sent.add(key)
      return r
    } catch (e) {
      if ((e as Error).message !== 'no-worker') throw e
      return render(imgs, an, p, { ...o, ...(prog ? { progress: prog } : {}) })
    }
  }

  drop(key: string): void {
    this.sent.delete(key)
    this.w?.postMessage({ t: 'drop', key })
  }

  dispose(): void {
    this.w?.terminate()
    this.w = null
    this.wait.clear()
    this.sent.clear()
  }
}
