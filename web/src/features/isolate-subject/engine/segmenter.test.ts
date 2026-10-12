import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Mask } from './mask'

const good: Mask = new Uint8ClampedArray(1000).fill(255, 0, 500)
const empty: Mask = new Uint8ClampedArray(1000)

type Out = { mask: Mask } | 'hang'
const pipeline = vi.fn<(task: string, model: string, opts: { device: string; dtype: string }) => Promise<unknown>>()
const gpu = { ok: true }

vi.mock('../../../services/ai/transformers', () => ({
  loadTransformers: async () => ({ pipeline }),
  hasWebGpu: async () => gpu.ok,
  progressTracker: () => () => undefined,
}))
vi.mock('./raster', () => ({
  toBlob: async () => new Blob(),
  makeCanvas: () => ({}),
  alphaAtSize: (c: { mask: Mask }) => c.mask,
}))

const { GPU_FAIL_KEY, GPU_RUN_TIMEOUT_MS, Segmenter } = await import('./segmenter')

/** Modell som svarer `out` per enhet (webgpu/wasm); lastingen tar én mikrooppgave, som en ekte nedlasting. */
function models(out: Record<string, Out>) {
  pipeline.mockImplementation(async (_t, _m, { device }) => {
    await Promise.resolve()
    const o = out[device] ?? { mask: good }
    return () => (o === 'hang' ? new Promise(() => undefined) : Promise.resolve({ channels: 1, toCanvas: () => o }))
  })
}

const src = { width: 10, height: 100 } as HTMLCanvasElement
const run = (s: InstanceType<typeof Segmenter>, key: 'fine' | 'fast' = 'fine') => s.removeBackground(key, src, () => undefined, () => undefined)
const devices = () => pipeline.mock.calls.map((c) => c[2].device)

/** TB-7BF5C1: «AI henger seg, laster seg ned flere ganger og blir aldri ferdig». */
describe('Segmenter: modellen lastes én gang og henger ikke', () => {
  beforeEach(() => {
    pipeline.mockReset()
    gpu.ok = true
    localStorage.clear()
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: () => 'blob:x', revokeObjectURL: () => undefined }))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('flere kjøringer mens modellen lastes, deler samme nedlasting', async () => {
    models({})
    const s = new Segmenter()
    const [a, b, c] = await Promise.all([run(s), run(s), run(s)])
    expect(a).toBe(good)
    expect(b).toBe(good)
    expect(c).toBe(good)
    expect(pipeline).toHaveBeenCalledTimes(1)
    await run(s)
    expect(pipeline).toHaveBeenCalledTimes(1)
  })

  it('ubrukelig GPU-svar: WASM brukes, og neste økt går rett til WASM uten å laste GPU-modellen', async () => {
    models({ webgpu: { mask: empty }, wasm: { mask: good } })
    expect(await run(new Segmenter())).toBe(good)
    expect(devices()).toEqual(['webgpu', 'wasm'])
    expect(JSON.parse(localStorage.getItem(GPU_FAIL_KEY) ?? '{}')).toHaveProperty('fine')

    pipeline.mockClear()
    expect(await run(new Segmenter())).toBe(good)
    expect(devices()).toEqual(['wasm'])
    // en annen modell (Person) prøver fortsatt GPU
    pipeline.mockClear()
    await run(new Segmenter(), 'fast')
    expect(devices()).toEqual(['webgpu'])
  })

  it('GPU-kjøring som aldri svarer, gir opp etter en stund og bruker WASM i stedet for å henge', async () => {
    vi.useFakeTimers()
    models({ webgpu: 'hang', wasm: { mask: good } })
    const p = run(new Segmenter())
    await vi.advanceTimersByTimeAsync(GPU_RUN_TIMEOUT_MS + 10)
    expect(await p).toBe(good)
    expect(devices()).toEqual(['webgpu', 'wasm'])
  })

  it('GPU-modellen lar seg ikke laste: WASM, og feilen huskes', async () => {
    pipeline.mockImplementation(async (_t, _m, { device }) => {
      if (device === 'webgpu') throw new Error('no gpu')
      return () => Promise.resolve({ channels: 1, toCanvas: () => ({ mask: good }) })
    })
    expect(await run(new Segmenter())).toBe(good)
    expect(devices()).toEqual(['webgpu', 'wasm'])
    pipeline.mockClear()
    await run(new Segmenter())
    expect(devices()).toEqual(['wasm'])
  })

  it('gammel GPU-feil (over 30 dager) eller ødelagt lagret verdi: GPU prøves igjen', async () => {
    models({})
    localStorage.setItem(GPU_FAIL_KEY, JSON.stringify({ fine: Date.now() - 31 * 864e5 }))
    await run(new Segmenter())
    expect(devices()).toEqual(['webgpu'])
    pipeline.mockClear()
    localStorage.setItem(GPU_FAIL_KEY, '{ødelagt')
    await run(new Segmenter())
    expect(devices()).toEqual(['webgpu'])
  })

  it('mislykket nedlasting kan prøves på nytt', async () => {
    gpu.ok = false
    pipeline.mockRejectedValueOnce(new Error('nett'))
    const s = new Segmenter()
    await expect(run(s)).rejects.toThrow('nett')
    models({})
    expect(await run(s)).toBe(good)
  })
})
