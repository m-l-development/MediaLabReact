import { afterEach, describe, expect, it, vi } from 'vitest'
import { createStore, subscribeSettled } from './store'

describe('subscribeSettled', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('mange endringer rett etter hverandre gir ett kall; avmelding stopper et ventende kall', () => {
    vi.useFakeTimers()
    const s = createStore(0)
    const fn = vi.fn()
    const off = subscribeSettled(s, fn, 100)
    for (let i = 1; i <= 300; i++) s.set(i)
    vi.advanceTimersByTime(99)
    expect(fn).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(fn).toHaveBeenCalledTimes(1)
    s.set(301)
    off()
    vi.advanceTimersByTime(200)
    expect(fn).toHaveBeenCalledTimes(1)
  })
})
