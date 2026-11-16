/// <reference lib="webworker" />
/**
 * Panorama i egen tråd: analyse (trekkpunkter, samsvar, kameraer) og tegning. Kildebildene til forhåndsvisningen
 * huskes per nøkkel, så bare innstillingene sendes ved hver endring.
 */
import { analyze, render, type Analysis, type Img, type PanoParams, type RenderOpts } from './stitch'

type In =
  | { t: 'analyze'; id: number; imgs: Img[]; hint: (number | null)[] }
  | { t: 'render'; id: number; key: string; imgs?: (Img | null)[]; an: Analysis; p: PanoParams; o: Omit<RenderOpts, 'progress'> }
  | { t: 'drop'; key: string }

const cache = new Map<string, (Img | null)[]>()

self.onmessage = (e: MessageEvent<In>) => {
  const m = e.data
  try {
    if (m.t === 'drop') { cache.delete(m.key); return }
    if (m.t === 'analyze') {
      const an = analyze(m.imgs, m.hint, (stage, k) => self.postMessage({ t: 'progress', id: m.id, stage, k }))
      self.postMessage({ t: 'analysis', id: m.id, an })
      return
    }
    if (m.imgs) cache.set(m.key, m.imgs)
    const srcs = cache.get(m.key)
    if (!srcs) throw new Error('Bildene mangler')
    const r = render(srcs, m.an, m.p, { ...m.o, progress: (k) => self.postMessage({ t: 'progress', id: m.id, stage: 'render', k }) })
    // full oppløsning brukes bare én gang: slipp kildene etterpå
    if (m.key.startsWith('full:')) cache.delete(m.key)
    self.postMessage({ t: 'rendered', id: m.id, r }, [r.data.buffer])
  } catch (err) {
    self.postMessage({ t: 'error', id: 'id' in m ? m.id : 0, msg: String((err as Error)?.message ?? err) })
  }
}
