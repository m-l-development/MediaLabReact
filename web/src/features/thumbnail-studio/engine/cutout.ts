import { separable } from '../../isolate-subject/engine/mask'
import { loadToCanvas, toBlob } from '../../isolate-subject/engine/raster'
import { Segmenter, type ModelKey } from '../../isolate-subject/engine/segmenter'

/**
 * Valgfritt AI-utklipp i Thumbnail Studio (TS-08): Person = MODNet, Objekt = BiRefNet, lokalt i nettleseren.
 * Samme etterbehandling som dagens app: masken strammes litt inn (2 px per 1000 px) og kanten mykes (1,5 px),
 * men aldri utenfor den strammede masken. → PNG med gjennomsiktig bakgrunn.
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
    const sc = Math.max(w, h) / 1000
    const hd = new Uint8ClampedArray(N)
    for (let i = 0; i < N; i++) {
      const v = a[i] ?? 0
      hd[i] = v <= 24 ? 0 : v >= 232 ? 255 : ((v - 24) * 255) / 208
    }
    const r = Math.round(2 * sc)
    const er = r > 0 ? separable(hd, w, h, r, 'min') : hd
    const fr = Math.round(1.5 * sc)
    let fin = er
    if (fr > 0) {
      const bl = separable(separable(er, w, h, fr, 'blur'), w, h, fr, 'blur')
      fin = new Uint8ClampedArray(N)
      for (let j = 0; j < N; j++) fin[j] = Math.min(bl[j] ?? 0, er[j] ?? 0)
    }
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
