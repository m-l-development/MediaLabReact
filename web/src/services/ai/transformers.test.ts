import { describe, expect, it, vi } from 'vitest'
import { hasWebGpu, progressTracker } from './transformers'

describe('hasWebGpu: bare en WebGPU som faktisk starter, regnes med', () => {
  it('ingen WebGPU, ingen adapter, eller adapter som ikke gir enhet → nei', async () => {
    expect(await hasWebGpu(undefined)).toBe(false)
    expect(await hasWebGpu({ requestAdapter: async () => null })).toBe(false)
    expect(await hasWebGpu({ requestAdapter: async () => ({ requestDevice: async () => { throw new Error('GPU-feil') } }) })).toBe(false)
    expect(await hasWebGpu({ requestAdapter: async () => { throw new Error('blokkert') } })).toBe(false)
  })
  it('adapter og enhet → ja, og testenheten frigjøres', async () => {
    const destroy = vi.fn()
    expect(await hasWebGpu({ requestAdapter: async () => ({ requestDevice: async () => ({ destroy }) }) })).toBe(true)
    expect(destroy).toHaveBeenCalledOnce()
  })
})

describe('progressTracker', () => {
  it('samler fremdrift for alle filene i prosent', () => {
    const seen: number[] = []
    const cb = progressTracker((p) => seen.push(p))
    cb({ status: 'progress', file: 'a', loaded: 50, total: 100 })
    cb({ status: 'progress', file: 'b', loaded: 0, total: 100 })
    cb({ status: 'progress', file: 'b', loaded: 100, total: 100 })
    cb({ status: 'done', file: 'a' })
    expect(seen).toEqual([50, 25, 75])
  })
})
