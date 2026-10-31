import { refineMask } from '../../isolate-subject/engine/mask'
import { loadToCanvas, toBlob } from '../../isolate-subject/engine/raster'
import { Segmenter, type ModelKey } from '../../isolate-subject/engine/segmenter'

/**
 * Valgfritt AI-utklipp i Thumbnail Studio (TS-08): Person = MODNet, Objekt = ormbg, lokalt i nettleseren.
 * Samme etterbehandling som Isolate Subject (refineMask uten innstramming og myking). → PNG med gjennomsiktig bakgrunn.
 */
export class Cutout {
  private seg = new Segmenter()

  async run(blob: Blob, kind: 'person' | 'object', onProgress: (phase: 'model' | 'run', pct: number) => void): Promise<Blob> {
    const src = await loadToCanvas(blob)
    const w = src.width
    const h = src.height
    const key: ModelKey = kind === 'person' ? 'fast' : 'fine'
    let phase: 'model' | 'run' = 'model'
    onProgress('model', 0)
    const a = await this.seg.removeBackground(key, src, (p) => {
      phase = p === 'model' ? 'model' : 'run'
      onProgress(phase, 0)
    }, (pct) => onProgress(phase, pct))
    const N = w * h
    // samme etterbehandling som Isolate Subject (refineMask), uten innstramming og myking: de fjernet smale detaljer
    // som mikrofoner, ledninger og fingre (målt i e2e-real/isolate-person.spec.ts)
    const fin = refineMask(a, w, h, 0, 0).mask
    const g = src.getContext('2d')
    if (!g) throw new Error('2d')
    const id = g.getImageData(0, 0, w, h)
    const dd = id.data
    for (let k = 0; k < N; k++) dd[k * 4 + 3] = Math.min(dd[k * 4 + 3] ?? 0, fin[k] ?? 0)
    g.putImageData(id, 0, 0)
    return toBlob(src, 'image/png')
  }

  /**
   * «Finjuster utklippet» (felles maskeredigering): originalbildet og masken fra utklippet (alfa), i originalens
   * størrelse. Et utklipp i annen størrelse skaleres til originalen.
   */
  async maskOf(orig: Blob, cut: Blob): Promise<{ image: HTMLCanvasElement; mask: Uint8ClampedArray }> {
    const image = await loadToCanvas(orig)
    const c = await loadToCanvas(cut)
    const W = image.width
    const H = image.height
    const t = document.createElement('canvas')
    t.width = W
    t.height = H
    const g = t.getContext('2d', { willReadFrequently: true })
    if (!g) throw new Error('2d')
    g.drawImage(c, 0, 0, W, H)
    const d = g.getImageData(0, 0, W, H).data
    const mask = new Uint8ClampedArray(W * H)
    for (let i = 0; i < W * H; i++) mask[i] = d[i * 4 + 3] ?? 0
    return { image, mask }
  }

  /** Originalen med masken som alfa → PNG (det som brukes i malen). */
  async apply(image: HTMLCanvasElement, mask: Uint8ClampedArray): Promise<Blob> {
    const out = document.createElement('canvas')
    out.width = image.width
    out.height = image.height
    const g = out.getContext('2d')
    if (!g) throw new Error('2d')
    g.drawImage(image, 0, 0)
    const id = g.getImageData(0, 0, out.width, out.height)
    for (let i = 0; i < mask.length; i++) id.data[i * 4 + 3] = Math.min(id.data[i * 4 + 3] ?? 0, mask[i] ?? 0)
    g.putImageData(id, 0, 0)
    return toBlob(out, 'image/png')
  }

  /** «Velg objekt» i redigeringen (SlimSAM, hele objektet). */
  select(image: HTMLCanvasElement, x: number, y: number): Promise<Uint8ClampedArray | null> {
    return this.seg.samMask(image, { points: [{ x: x / image.width, y: y / image.height, label: 1 }] }, [], () => undefined, () => undefined, true)
  }

  dispose(): void {
    this.seg.dispose()
  }
}
