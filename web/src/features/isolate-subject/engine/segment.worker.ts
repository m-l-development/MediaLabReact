/// <reference lib="webworker" />
import type { Mask } from './mask'
import { makeCanvas } from './raster'
import { Segmenter, type ModelKey, type Phase, type SamPrompt } from './segmenter'

/**
 * Egen tråd for AI-segmenteringen (Segmenter: MODNet, ormbg, SlimSAM). ONNX Runtime bruker WebAssembly-minne som aldri
 * krymper (målt: rundt 1,7 GB etter «Merk i bildet» på et 12 MP-bilde), og i hovedtråden ble det liggende til siden ble
 * lastet på nytt – også etter at verktøyet var lukket. Her frigjøres alt når tråden avsluttes (segment-client.ts).
 */
export type SegRequest =
  | { id: number; op: 'bg'; key: ModelKey; bmp: ImageBitmap }
  | { id: number; op: 'sam'; imgId: number; bmp: ImageBitmap | null; prompt: SamPrompt; negatives: { x: number; y: number }[]; whole: boolean }
  | { id: 0; op: 'forget' }
export type SegReply =
  | { id: number; type: 'phase'; phase: Phase }
  | { id: number; type: 'pct'; pct: number }
  | { id: number; type: 'done'; mask: Mask | null }
  | { id: number; type: 'error'; name: string; message: string }

const seg = new Segmenter()
let cur: { id: number; c: HTMLCanvasElement } | null = null

function canvasOf(bmp: ImageBitmap): HTMLCanvasElement {
  const c = makeCanvas(bmp.width, bmp.height)
  c.getContext('2d')?.drawImage(bmp, 0, 0)
  bmp.close()
  return c
}

self.onmessage = async (ev: MessageEvent<SegRequest>) => {
  const q = ev.data
  if (q.op === 'forget') {
    seg.forgetImage()
    cur = null
    return
  }
  const post = (r: SegReply, t: Transferable[] = []) => (self as unknown as DedicatedWorkerGlobalScope).postMessage(r, t)
  const phase = (p: Phase) => post({ id: q.id, type: 'phase', phase: p })
  const pct = (n: number) => post({ id: q.id, type: 'pct', pct: n })
  try {
    let mask: Mask | null
    if (q.op === 'bg') mask = await seg.removeBackground(q.key, canvasOf(q.bmp), phase, pct)
    else {
      if (q.bmp) {
        cur = { id: q.imgId, c: canvasOf(q.bmp) }
        seg.forgetImage()
      }
      if (!cur || cur.id !== q.imgId) throw new Error('Bildet mangler i AI-tråden')
      mask = await seg.samMask(cur.c, q.prompt, q.negatives, phase, pct, q.whole)
    }
    post({ id: q.id, type: 'done', mask }, mask ? [mask.buffer] : [])
  } catch (e) {
    post({ id: q.id, type: 'error', name: e instanceof Error ? e.name : 'Error', message: e instanceof Error ? e.message : String(e) })
  }
}
