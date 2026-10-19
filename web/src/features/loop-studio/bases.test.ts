import { describe, expect, it, vi } from 'vitest'
import type { ChurchSettingsService } from '../../services/shared-setup'
import { BaseError, centralBases, entryOf, personalBases, type KV } from './bases'

/** TB-596FE4: «Oppdater grunnoppsettet» skal aldri melde «oppdatert» uten å ha lagret endringen. */
const entry = (programText: string) => entryOf({ name: 'Felles', base: 'week', programText, slides: [], cfg: {} })

describe('Loop Studio – grunnoppsett (TB-596FE4)', () => {
  it('felles: oppdatering lagrer de nye dataene på nyeste versjon', async () => {
    const e = entry('Gammel')
    const save = vi.fn(async () => undefined)
    const cs = { available: () => true, get: vi.fn(async () => ({ data: { bases: [e] }, version: 7 })), save } as unknown as ChurchSettingsService
    await centralBases(cs, () => 'c1').update(e.id, { ...e.data, programText: 'Ny tekst' })
    expect(save).toHaveBeenCalledWith('c1', 'loopstudio:bases', { bases: [expect.objectContaining({ id: e.id, data: expect.objectContaining({ programText: 'Ny tekst' }) })] }, 7)
  })

  it('felles: finnes ikke grunnoppsettet (slettet av en annen), gir det feil – ingenting lagres', async () => {
    const save = vi.fn(async () => undefined)
    const cs = { available: () => true, get: vi.fn(async () => ({ data: { bases: [entry('Annet')] }, version: 3 })), save } as unknown as ChurchSettingsService
    const err = await centralBases(cs, () => 'c1').update('borteborte', entry('x').data).catch((x: unknown) => x)
    expect(err).toBeInstanceOf(BaseError)
    expect((err as BaseError).code).toBe('missing')
    expect(save).not.toHaveBeenCalled()
  })

  it('personlig: samme regel', () => {
    const mem = new Map<string, string>()
    const kv: KV = { get: (k) => mem.get(k) ?? null, set: (k, v) => { mem.set(k, v); return true }, remove: (k) => { mem.delete(k) } } as KV
    const p = personalBases(kv)
    const e = entry('Min')
    p.add(e)
    p.update(e.id, { ...e.data, programText: 'Endret' })
    expect(p.get(e.id)?.data.programText).toBe('Endret')
    expect(() => p.update('borteborte', e.data)).toThrow(BaseError)
  })
})
