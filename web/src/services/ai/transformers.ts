/**
 * transformers.js 3.5.1 fra egen vert (/vendor, låst med SHA-384 i media-lab/build/vendor-lock.json – aldri CDN).
 * Lastes først når et AI-verktøy brukes, og deles av alle verktøy (Isolate Subject, Thumbnail, Photo, Motion).
 */
const TRANSFORMERS_URL = '/vendor/transformers-3.5.1/transformers.min.js'

/** Den delen av transformers.js-API-et Media Lab bruker (holdes smalt med vilje). */
export interface RawImageLike {
  width: number
  height: number
  channels: number
  data: Uint8Array | Uint8ClampedArray
  toCanvas(): HTMLCanvasElement | OffscreenCanvas
}

export type ProgressInfo = { status?: string; file?: string; loaded?: number; total?: number }
export type ProgressCallback = (p: ProgressInfo) => void

export interface TransformersLib {
  env: { allowLocalModels: boolean; backends: { onnx: { wasm: { wasmPaths: string } } } }
  pipeline(task: string, model: string, opts: { device: string; dtype: string; progress_callback?: ProgressCallback }): Promise<(input: string) => Promise<RawImageLike | RawImageLike[]>>
  SamModel: { from_pretrained(id: string, opts: { progress_callback?: ProgressCallback }): Promise<SamModelLike> }
  AutoProcessor: { from_pretrained(id: string, opts: { progress_callback?: ProgressCallback }): Promise<SamProcessorLike> }
  RawImage: { read(url: string): Promise<unknown>; fromTensor(t: unknown): RawImageLike }
  Tensor: new (type: string, data: Float32Array | BigInt64Array, dims: number[]) => unknown
}

export interface SamInputs {
  reshaped_input_sizes: number[][]
  original_sizes: unknown
}
export interface SamModelLike {
  (feed: Record<string, unknown>): Promise<{ pred_masks: unknown; iou_scores: { data: ArrayLike<number> } }>
  get_image_embeddings(inputs: SamInputs): Promise<Record<string, unknown>>
  sessions?: { prompt_encoder_mask_decoder?: { inputNames?: string[] } }
}
export interface SamProcessorLike {
  (image: unknown): Promise<SamInputs>
  post_process_masks(masks: unknown, original: unknown, reshaped: unknown): Promise<unknown[][]>
}

let lib: Promise<TransformersLib> | null = null

export function loadTransformers(): Promise<TransformersLib> {
  lib ??= import(/* @vite-ignore */ TRANSFORMERS_URL).then((m: TransformersLib) => {
    m.env.allowLocalModels = false
    m.env.backends.onnx.wasm.wasmPaths = `${location.origin}/vendor/transformers-3.5.1/`
    return m
  }).catch((e: unknown) => {
    lib = null
    throw e
  })
  return lib
}

/** Samler fremdrift for alle filene en modell består av, i prosent. */
export function progressTracker(onPercent: (pct: number) => void): ProgressCallback {
  const files: Record<string, [number, number]> = {}
  let last = -1
  return (p) => {
    if (!p || p.status !== 'progress' || !p.total || !p.file) return
    files[p.file] = [p.loaded ?? 0, p.total]
    const v = Object.values(files)
    const loaded = v.reduce((s, x) => s + x[0], 0)
    const total = Math.max(1, v.reduce((s, x) => s + x[1], 0))
    const pct = Math.min(100, Math.round((100 * loaded) / total))
    if (pct !== last) {
      last = pct
      onPercent(pct)
    }
  }
}

interface GpuLike {
  requestAdapter(): Promise<{ requestDevice(): Promise<{ destroy?: () => void }> } | null>
}

/**
 * Finnes en WebGPU som faktisk lar seg starte? Både adapter og enhet prøves her, før ONNX Runtime får prøve: feiler
 * WebGPU-oppstarten inne i ONNX Runtime, nekter den også WASM resten av sideøkten («no available backend found»),
 * så reserven virket ikke før siden ble lastet på nytt (TB-7BF5C1, prøvd i Chrome 154).
 */
export async function hasWebGpu(gpu: GpuLike | undefined = (navigator as Navigator & { gpu?: GpuLike }).gpu): Promise<boolean> {
  if (!gpu) return false
  try {
    const adapter = await gpu.requestAdapter()
    if (!adapter) return false
    const device = await adapter.requestDevice()
    device.destroy?.()
    return true
  } catch {
    return false
  }
}
