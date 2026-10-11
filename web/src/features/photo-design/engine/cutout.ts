import { Segmenter, type ModelKey } from '../../isolate-subject/engine/segmenter'
import { mk } from './render'

/**
 * AI-utklipp i Photo Design (PD-10): Person = MODNet, Objekt = BiRefNet, lokalt i nettleseren.
 * Gir en maske (hvit med alfa) i bildets størrelse, eller null når modellen ikke fant et tydelig motiv.
 */
export class PhotoCutout {
  private seg = new Segmenter()

  async run(src: HTMLCanvasElement, kind: 'person' | 'object', onProgress: (phase: 'model' | 'run', pct: number) => void): Promise<HTMLCanvasElement | null> {
    const key: ModelKey = kind === 'person' ? 'fast' : 'fine'
    let phase: 'model' | 'run' = 'model'
    onProgress('model', 0)
    const a = await this.seg.removeBackground(key, src, (p) => {
      phase = p === 'model' ? 'model' : 'run'
      onProgress(phase, 0)
    }, (pct) => onProgress(phase, pct))
    const m = mk(src.width, src.height)
    const g = m.getContext('2d')
    if (!g) return null
    const id = g.createImageData(m.width, m.height)
    const d = id.data
    let n = 0
    for (let i = 0; i < a.length; i++) {
      const v = a[i] ?? 0
      d[i * 4] = 255
      d[i * 4 + 1] = 255
      d[i * 4 + 2] = 255
      d[i * 4 + 3] = v
      if (v > 128) n++
    }
    const f = n / a.length
    if (f < 0.002 || f > 0.998) return null
    g.putImageData(id, 0, 0)
    return m
  }

  dispose(): void {
    this.seg.dispose()
  }
}
