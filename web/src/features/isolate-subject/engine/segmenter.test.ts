import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Mask } from './mask'

const good: Mask = new Uint8ClampedArray(1000).fill(255, 0, 500)

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
const run = (s: InstanceType<typeof Segmenter>, key: 'fine' | 'fast' = 'fast') => s.removeBackground(key, src, () => undefined, () => undefined)
const devices = () => pipeline.mock.calls.map((c) => c[2].device)
const runs = () => pipeline.mock.calls.map((c) => `${c[1]} ${c[2].device} ${c[2].dtype}`)

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

  it('Objekt (ormbg) kjøres rett på WASM uint8, også når WebGPU finnes – BiRefNet brukes ikke lenger', async () => {
    models({})
    expect(await run(new Segmenter(), 'fine')).toBe(good)
    expect(runs()).toEqual(['onnx-community/ormbg-ONNX wasm uint8'])
  })

  it('Person (MODNet) bruker WebGPU når den finnes; GPU-feil huskes bare for den modellen', async () => {
    models({})
    await run(new Segmenter())
    expect(runs()).toEqual(['Xenova/modnet webgpu fp32'])
    expect(localStorage.getItem(GPU_FAIL_KEY)).toBe(null)
  })

  it('GPU-kjøring som aldri svarer, gir opp etter en stund og bruker WASM i stedet for å henge', async () => {
    vi.useFakeTimers()
    models({ webgpu: 'hang', wasm: { mask: good } })
    const p = run(new Segmenter())
    await vi.advanceTimersByTimeAsync(GPU_RUN_TIMEOUT_MS + 10)
    expect(await p).toBe(good)
    expect(devices()).toEqual(['webgpu', 'wasm'])
    pipeline.mockClear()
    await run(new Segmenter())
    expect(devices()).toEqual(['wasm'])
  })

  it('GPU-modellen lar seg ikke laste: WASM, og feilen huskes', async () => {
    pipeline.mockImplementation(async (_t, _m, { device }) => {
      if (device === 'webgpu') throw new Error('no gpu')
      return () => Promise.resolve({ channels: 1, toCanvas: () => ({ mask: good }) })
    })
    expect(await run(new Segmenter())).toBe(good)
    expect(devices()).toEqual(['webgpu', 'wasm'])
    expect(JSON.parse(localStorage.getItem(GPU_FAIL_KEY) ?? '{}')).toHaveProperty('fast')
    pipeline.mockClear()
    await run(new Segmenter())
    expect(devices()).toEqual(['wasm'])
  })

  it('gammel GPU-feil (over 30 dager) eller ødelagt lagret verdi: GPU prøves igjen', async () => {
    models({})
    localStorage.setItem(GPU_FAIL_KEY, JSON.stringify({ fast: Date.now() - 31 * 864e5 }))
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

/** TB-7BF5C1: en nedlasting som stopper opp uten feil, skal ikke låse verktøyet for alltid. */
describe('Segmenter: nedlasting som stopper opp', () => {
  beforeEach(() => {
    pipeline.mockReset()
    gpu.ok = false
    localStorage.clear()
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: () => 'blob:x', revokeObjectURL: () => undefined }))
  })
  afterEach(() => vi.useRealTimers())

  it('stallGuard avbryter uten fremdrift, men ikke så lenge det kommer fremdrift', async () => {
    vi.useFakeTimers()
    const { stallGuard, StallError, STALL_MS } = await import('./segmenter')
    const dead = stallGuard(() => new Promise(() => undefined))
    const deadErr = dead.catch((e: unknown) => e)
    await vi.advanceTimersByTimeAsync(STALL_MS + 1)
    expect(await deadErr).toBeInstanceOf(StallError)
    // fremdrift hvert 60. sekund i 5 minutter: ingen avbrudd, og resultatet kommer frem
    const alive = stallGuard<string>((act) => new Promise((res) => {
      let n = 0
      const t = setInterval(() => { act(); if (++n === 5) { clearInterval(t); res('ok') } }, 60_000)
    }))
    await vi.advanceTimersByTimeAsync(5 * 60_000 + 10)
    expect(await alive).toBe('ok')
  })

  it('stoppet nedlasting gir feil, og neste forsøk starter en ny nedlasting', async () => {
    vi.useFakeTimers()
    const { STALL_MS, StallError } = await import('./segmenter')
    pipeline.mockImplementationOnce(() => new Promise(() => undefined)) // henger uten fremdrift
    const s = new Segmenter()
    const first = run(s).catch((e: unknown) => e)
    await vi.advanceTimersByTimeAsync(STALL_MS + 1)
    expect(await first).toBeInstanceOf(StallError)
    models({})
    vi.useRealTimers()
    expect(await run(s)).toBe(good)
    expect(pipeline).toHaveBeenCalledTimes(2) // ikke hengende igjen på den gamle nedlastingen
  })
})
