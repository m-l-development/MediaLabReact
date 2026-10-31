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

  dispose(): void {
    this.seg.dispose()
  }
}
