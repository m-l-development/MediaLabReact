import { describe, expect, it, vi } from 'vitest'
import { createUpdateWatcher, SNOOZE, type UpdateDeps } from './update'

function deps(o: Partial<UpdateDeps> = {}): UpdateDeps {
  let t = 1000
  return { build: 'a1', enabled: true, fetchVersion: async () => 'b2', save: async () => true, busy: () => false, hidden: () => false, now: () => t++, ...o }
}

describe('varsel om ny versjon (PLT-04)', () => {
  it('ny versjon: arbeidet lagres og kortet vises', async () => {
    const save = vi.fn(async () => true as const)
    const w = createUpdateWatcher(deps({ save }))
    await w.check()
    expect(save).toHaveBeenCalledOnce()
    expect(w.state.get()).toEqual({ open: true, phase: 'saved' })
  })
  it('samme versjon, skjult fane, nettverksfeil eller av: ingenting skjer', async () => {
    for (const o of [{ fetchVersion: async () => 'a1' }, { hidden: () => true }, { fetchVersion: async () => null }, { enabled: false }]) {
      const w = createUpdateWatcher(deps(o))
      await w.check()
      expect(w.state.get().open).toBe(false)
    }
  })
  it('venter mens verktøyet er opptatt (eksport, AI)', async () => {
    let busy = true
    const w = createUpdateWatcher(deps({ busy: () => busy }))
    await w.check()
    expect(w.state.get().open).toBe(false)
    busy = false
    await w.check()
    expect(w.state.get().open).toBe(true)
  })
  it('«Senere» skjuler kortet i 10 minutter', async () => {
    let now = 0
    const w = createUpdateWatcher(deps({ now: () => now }))
    await w.check()
    w.later()
    expect(w.state.get().open).toBe(false)
    now = SNOOZE - 1
    await w.check()
    expect(w.state.get().open).toBe(false)
    now = SNOOZE + 1
    await w.check()
    expect(w.state.get().open).toBe(true)
  })
  it('lagring som feiler eller ingenting å lagre, gir riktig tekst; «Oppdater nå» lagrer før omlasting', async () => {
    const w1 = createUpdateWatcher(deps({ save: async () => false }))
    await w1.check()
    expect(w1.state.get().phase).toBe('failed')
    const w2 = createUpdateWatcher(deps({ save: async () => null }))
    await w2.check()
    expect(w2.state.get().phase).toBe('nothing')
    const order: string[] = []
    w2.setTool({ save: async () => { order.push('save'); return true }, busy: () => false })
    await w2.updateNow(() => order.push('reload'))
    expect(order).toEqual(['save', 'reload'])
  })
})
