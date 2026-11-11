/// <reference lib="webworker" />
import { loadTransformers, progressTracker, type OnnxModelLike } from '../../../services/ai/transformers'
import { inpaint } from './inpaint'
import { LAMA_FILE, LAMA_ID, lamaFill, SIZE } from './lama'
import type { FillRequest, FillReply } from './fill'

/**
 * Egen tråd for «Fyll med omgivelser» (fill.ts), så siden ikke henger mens bildet behandles: LaMa (lama.ts) når
 * modellen kan lastes, ellers den innholdsbevisste utfyllingen (inpaint.ts). Modellen holdes i minnet så lenge tråden
 * lever (én nedlasting per økt; nettleseren husker filen til neste gang).
 */
let model: Promise<OnnxModelLike> | null = null

function load(device: string, post: (r: FillReply) => void, id: number): Promise<OnnxModelLike> {
  model ??= loadTransformers().then((T) => T.AutoModel.from_pretrained(LAMA_ID, {
    config: { model_type: 'lama' }, subfolder: '', model_file_name: LAMA_FILE, dtype: 'fp32', device,
    progress_callback: progressTracker((pct) => post({ id, type: 'progress', phase: 'model', pct })),
  })).catch((e: unknown) => {
    model = null
    throw e
  })
  return model
}

self.onmessage = async (ev: MessageEvent<FillRequest>) => {
  const q = ev.data
  const post = (r: FillReply, transfer: Transferable[] = []) => (self as unknown as DedicatedWorkerGlobalScope).postMessage(r, transfer)
  const rgba = new Uint8ClampedArray(q.rgba)
  try {
    let method: 'ai' | 'patch' = 'patch'
    if (q.device) {
      try {
        const m = await load(q.device, post, q.id)
        post({ id: q.id, type: 'progress', phase: 'run', pct: 0 })
        const T = await loadTransformers()
        const ok = await lamaFill(rgba, q.W, q.H, q.mask, async (image, mask) => {
          const out = await m({ image: new T.Tensor('float32', image, [1, 3, SIZE, SIZE]), mask: new T.Tensor('float32', mask, [1, 1, SIZE, SIZE]) })
          const o = out.output ?? Object.values(out)[0]
          if (!o) throw new Error('LaMa ga ikke noe bilde')
          return Float32Array.from(o.data)
        }, q.grow)
        if (ok) method = 'ai'
      } catch (e) {
        // modellen kunne ikke lastes eller kjøres (f.eks. uten nett eller for lite minne): innholdsbevisst utfylling
        post({ id: q.id, type: 'aiFailed', message: e instanceof Error ? e.message : String(e) })
      }
    }
    if (method === 'patch') {
      post({ id: q.id, type: 'progress', phase: 'run', pct: 0 })
      inpaint(rgba, q.W, q.H, q.mask, { seed: q.seed, grow: q.grow, onProgress: (pct) => post({ id: q.id, type: 'progress', phase: 'run', pct }) })
    }
    post({ id: q.id, type: 'done', rgba: rgba.buffer, method }, [rgba.buffer])
  } catch (e) {
    post({ id: q.id, type: 'error', message: e instanceof Error ? e.message : String(e) })
  }
}
