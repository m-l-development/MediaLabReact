import { hasWebGpu, loadTransformers, progressTracker, type RawImageLike, type SamInputs, type SamModelLike, type SamProcessorLike, type TransformersLib } from '../../../services/ai/transformers'
import { isDegenerate, type Mask } from './mask'
import { alphaAtSize, makeCanvas, toBlob } from './raster'

/** Modellene i dag (IS-03, IS-04, IS-06). */
export const MODELS = { fine: 'onnx-community/BiRefNet_lite-ONNX', fast: 'Xenova/modnet' } as const
export const SAM_ID = 'Xenova/slimsam-77-uniform'
export type ModelKey = keyof typeof MODELS

type Pipe = ((input: string) => Promise<RawImageLike | RawImageLike[]>) & { device?: string; dtype?: string; dispose?: () => Promise<void> }

export type Phase = 'model' | 'run' | 'analyze' | 'seg'

export interface SamPrompt {
  points?: { x: number; y: number; label: 0 | 1 }[]
  box?: { x0: number; y0: number; x1: number; y1: number }
}

/**
 * AI-delen av Isolate Subject. Modeller lastes én gang og gjenbrukes til `dispose()` (når verktøyet lukkes).
 * WebGPU brukes når den finnes (fp16 for BiRefNet), med WASM fp32 som reserve – også når GPU-resultatet er ubrukelig.
 */
export class Segmenter {
  private pipes: Partial<Record<ModelKey, Pipe>> = {}
  private sam: { model: SamModelLike; proc: SamProcessorLike } | null = null
  private embedding: { src: HTMLCanvasElement; inputs: SamInputs; emb: Record<string, unknown> } | null = null

  private async pipe(T: TransformersLib, key: ModelKey, onPct: (n: number) => void, wasmOnly: boolean): Promise<Pipe> {
    const cached = this.pipes[key]
    if (cached && !(wasmOnly && cached.device !== 'wasm')) return cached
    const gpu = !wasmOnly && (await hasWebGpu())
    const tries: [string, string][] = gpu ? [['webgpu', key === 'fine' ? 'fp16' : 'fp32'], ['wasm', 'fp32']] : [['wasm', 'fp32']]
    let err: unknown = null
    for (const [device, dtype] of tries) {
      try {
        const p = (await T.pipeline('background-removal', MODELS[key], { device, dtype, progress_callback: progressTracker(onPct) })) as Pipe
        p.device = device
        p.dtype = dtype
        this.pipes[key] = p
        return p
      } catch (e) {
        err = e
      }
    }
    throw err ?? new Error('pipeline')
  }

  isModelLoaded(key: ModelKey): boolean {
    return !!this.pipes[key]
  }

  private async infer(pipe: Pipe, url: string, W: number, H: number): Promise<Mask> {
    const out = await pipe(url)
    const img = Array.isArray(out) ? out[0] : out
    if (!img) throw new Error('Tomt svar fra modellen')
    return alphaAtSize(img.toCanvas(), W, H, img.channels === 4 ? 3 : 0)
  }

  /** Bakgrunnsfjerning med Person (MODNet) eller Objekt (BiRefNet). */
  async removeBackground(key: ModelKey, src: HTMLCanvasElement, onPhase: (p: Phase) => void, onPct: (n: number) => void): Promise<Mask> {
    const T = await loadTransformers()
    onPhase(this.pipes[key] ? 'run' : 'model')
    let pipe = await this.pipe(T, key, onPct, false)
    onPhase('run')
    const url = URL.createObjectURL(await toBlob(src))
    try {
      let a: Mask | null = null
      try {
        a = await this.infer(pipe, url, src.width, src.height)
        if (pipe.dtype === 'fp16' && isDegenerate(a)) a = null
      } catch (e) {
        if (pipe.device === 'wasm') throw e
      }
      if (!a) {
        onPhase('model')
        pipe = await this.pipe(T, key, onPct, true)
        onPhase('run')
        a = await this.infer(pipe, url, src.width, src.height)
      }
      return a
    } finally {
      URL.revokeObjectURL(url)
    }
  }

  /** «Merk i bildet» (SlimSAM): maske for punkter/firkant. Bildet analyseres én gang per kildebilde. */
  async samMask(src: HTMLCanvasElement, prompt: SamPrompt, negatives: { x: number; y: number }[], onPhase: (p: Phase) => void, onPct: (n: number) => void): Promise<Mask | null> {
    const T = await loadTransformers()
    if (!this.sam) {
      onPhase('model')
      const cb = progressTracker(onPct)
      const [model, proc] = await Promise.all([
        T.SamModel.from_pretrained(SAM_ID, { progress_callback: cb }),
        T.AutoProcessor.from_pretrained(SAM_ID, { progress_callback: cb }),
      ])
      this.sam = { model, proc }
    }
    const { model, proc } = this.sam
    if (!this.embedding || this.embedding.src !== src) {
      onPhase('analyze')
      const k = Math.min(1, 1024 / Math.max(src.width, src.height))
      const small = makeCanvas(Math.round(src.width * k), Math.round(src.height * k))
      small.getContext('2d')?.drawImage(src, 0, 0, small.width, small.height)
      const url = URL.createObjectURL(await toBlob(small))
      let raw: unknown
      try {
        raw = await T.RawImage.read(url)
      } finally {
        URL.revokeObjectURL(url)
      }
      const inputs = await proc(raw)
      this.embedding = { src, inputs, emb: await model.get_image_embeddings(inputs) }
    }
    onPhase('seg')
    const { inputs, emb } = this.embedding
    const rs = inputs.reshaped_input_sizes[0] ?? [1, 1]
    const rh = rs[0] ?? 1
    const rw = rs[1] ?? 1
    const b = prompt.box
    let pts = prompt.points ? [...prompt.points] : []
    let boxOk = false
    if (b) {
      boxOk = (model.sessions?.prompt_encoder_mask_decoder?.inputNames ?? []).includes('input_boxes')
      const cx = (b.x0 + b.x1) / 2
      const cy = (b.y0 + b.y1) / 2
      const dx = (b.x1 - b.x0) * 0.22
      const dy = (b.y1 - b.y0) * 0.22
      // Modeller uten firkant-inngang får fem punkter i firkanten i stedet.
      pts = boxOk
        ? [{ x: cx, y: cy, label: 1 }]
        : [{ x: cx, y: cy, label: 1 }, { x: cx - dx, y: cy, label: 1 }, { x: cx + dx, y: cy, label: 1 }, { x: cx, y: cy - dy, label: 1 }, { x: cx, y: cy + dy, label: 1 }]
    }
    pts = pts.concat(negatives.map((n) => ({ x: n.x, y: n.y, label: 0 as const })))
    const feed: Record<string, unknown> = {
      ...emb,
      input_points: new T.Tensor('float32', Float32Array.from(pts.flatMap((p) => [p.x * rw, p.y * rh])), [1, 1, pts.length, 2]),
      input_labels: new T.Tensor('int64', BigInt64Array.from(pts.map((p) => BigInt(p.label))), [1, 1, pts.length]),
    }
    if (b && boxOk) feed.input_boxes = new T.Tensor('float32', Float32Array.from([b.x0 * rw, b.y0 * rh, b.x1 * rw, b.y1 * rh]), [1, 1, 4])
    const out = await model(feed)
    const masks = await proc.post_process_masks(out.pred_masks, inputs.original_sizes, inputs.reshaped_input_sizes)
    const mk = T.RawImage.fromTensor((masks[0] as unknown[])[0])
    const scores = out.iou_scores.data
    const n = mk.channels || 3
    let best = 0
    for (let i = 1; i < Math.min(n, scores.length); i++) if ((scores[i] ?? 0) > (scores[best] ?? 0)) best = i
    const m = makeCanvas(mk.width, mk.height)
    const g = m.getContext('2d')
    if (!g) return null
    const id = g.createImageData(mk.width, mk.height)
    let on = 0
    for (let i = 0; i < mk.width * mk.height; i++) {
      const v = mk.data[i * n + best] ? 255 : 0
      id.data[i * 4] = 255
      id.data[i * 4 + 1] = 255
      id.data[i * 4 + 2] = 255
      id.data[i * 4 + 3] = v
      if (v) on++
    }
    if (!on) return null
    g.putImageData(id, 0, 0)
    const a = alphaAtSize(m, src.width, src.height)
    if (b) {
      const W = src.width
      const H = src.height
      const X0 = Math.floor(b.x0 * W)
      const X1 = Math.ceil(b.x1 * W)
      const Y0 = Math.floor(b.y0 * H)
      const Y1 = Math.ceil(b.y1 * H)
      for (let y = 0, i = 0; y < H; y++) for (let x = 0; x < W; x++, i++) if (x < X0 || x >= X1 || y < Y0 || y >= Y1) a[i] = 0
    }
    return a
  }

  /** Bildet er endret (utfylling, beskjæring): analysen for «Merk i bildet» må lages på nytt. */
  forgetImage(): void {
    this.embedding = null
  }

  /** Frigjør modellene (kalles når verktøyet lukkes). */
  dispose(): void {
    for (const p of Object.values(this.pipes)) void p?.dispose?.().catch(() => undefined)
    this.pipes = {}
    this.sam = null
    this.embedding = null
  }
}
