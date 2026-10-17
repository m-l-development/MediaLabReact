import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Me } from '../domain/account'
import { ServiceError } from './errors'
import { legacyDefaults, SharedSetup, type ChurchSettingsService, type SettingsRow } from './shared-setup'
import { parseMe } from '../domain/account'

/** Felles grunnoppsett per menighet (SHR-07): versjon mot samtidige endringer, tre-veis sammenslåing og admin-felt. */
type Rec = Record<string, unknown>

function fakeService(row: SettingsRow | null) {
  const state = { row, saves: [] as { value: unknown; version: number }[], conflictOnce: null as SettingsRow | null, fail: '' }
  const service: ChurchSettingsService = {
    available: () => true,
    get: async () => state.row,
    save: async (_c, _s, value, version) => {
      if (state.fail) throw new ServiceError(state.fail)
      if (state.conflictOnce) {
        state.row = state.conflictOnce
        state.conflictOnce = null
        throw new ServiceError('settings_conflict')
      }
      if (state.row && version !== state.row.version) throw new ServiceError('settings_conflict')
      state.saves.push({ value, version })
      state.row = { ...(state.row ?? {}), data: value, version: version + 1 }
      return { version: version + 1 }
    },
  }
  return { service, state }
}

const me = (admin = false) =>
  ({ churches: [{ id: 'c1', name: 'Menighet' }], roles: admin ? [{ role: 'church_admin', church_id: 'c1' }] : [] }) as unknown as Me

describe('SharedSetup (felles grunnoppsett)', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('uten backend: ingen menighet, lagring gjør ingenting', async () => {
    const s = new SharedSetup({ available: () => false, get: vi.fn(), save: vi.fn() }, me(), 'thumb:base')
    expect(s.available).toBe(false)
    expect(await s.save({ a: 1 }, 0)).toBe(false)
  })

  it('henter versjon og innhold, og raske endringer samles til én lagring', async () => {
    const { service, state } = fakeService({ data: { a: 1 }, version: 4, updated_by_name: 'Kari' })
    const s = new SharedSetup<Rec>(service, me(), 'thumb:base')
    expect(await s.load()).toEqual({ a: 1 })
    expect(s.version).toBe(4)
    expect(s.info).toEqual({ by: 'Kari' })
    void s.save({ a: 2 }, 20)
    void s.save({ a: 3 }, 20)
    expect(await s.save({ a: 4 }, 20)).toBe(true)
    expect(state.saves).toEqual([{ value: { a: 4 }, version: 4 }])
    expect(s.version).toBe(5)
  })

  it('likt innhold (uansett feltrekkefølge) lagres ikke', async () => {
    const { service, state } = fakeService({ data: { a: 1, b: 2 }, version: 1 })
    const s = new SharedSetup<Rec>(service, me(), 'thumb:base')
    await s.load()
    expect(await s.save({ b: 2, a: 1 }, 0)).toBe(true)
    expect(state.saves).toEqual([])
  })

  it('samtidig endring av et annet felt: slås sammen og lagres med ny versjon', async () => {
    const { service, state } = fakeService({ data: { a: 1, b: 1 }, version: 1 })
    const remote = vi.fn()
    const status = vi.fn()
    const s = new SharedSetup<Rec>(service, me(), 'thumb:base', { onRemote: remote, onStatus: status })
    await s.load()
    state.conflictOnce = { data: { a: 1, b: 9 }, version: 2 } // en annen bruker endret b
    expect(await s.save({ a: 5, b: 1 }, 0)).toBe(true) // jeg endret a
    expect(state.saves).toEqual([{ value: { a: 5, b: 9 }, version: 2 }])
    expect(remote).toHaveBeenCalledWith({ a: 5, b: 9 }, { merged: true, conflicts: [] })
    expect(status).toHaveBeenCalledWith({ state: 'merged', text: 'shared.merged' })
  })

  it('samme felt endret av begge: den andres verdi beholdes, og feltet meldes som konflikt', async () => {
    const { service, state } = fakeService({ data: { a: 1 }, version: 1 })
    const status = vi.fn()
    const s = new SharedSetup<Rec>(service, me(), 'thumb:base', { onStatus: status })
    await s.load()
    state.conflictOnce = { data: { a: 7 }, version: 2 }
    await s.save({ a: 5 }, 0)
    expect(status).toHaveBeenCalledWith({ state: 'conflict', text: 'shared.conflict', fields: 'a' })
    expect(state.row?.data).toEqual({ a: 7 })
  })

  it('felt bare admin kan endre, holdes tilbake for vanlige brukere (Loop Studio: bilderegler)', async () => {
    const { service, state } = fakeService(null)
    const user = new SharedSetup<Rec>(service, me(false), 'loopstudio:base')
    await user.load()
    expect(user.canAdmin).toBe(false)
    await user.save({ name: 'Ny', imgRules: { x: 1 } }, 0)
    expect(state.saves.at(-1)?.value).toEqual({ name: 'Ny' })

    const admin = new SharedSetup<Rec>(service, me(true), 'loopstudio:base')
    await admin.load()
    expect(admin.canAdmin).toBe(false) // raden finnes nå uten can_admin fra serveren: serverens svar avgjør
    const fresh = fakeService(null)
    const admin2 = new SharedSetup<Rec>(fresh.service, me(true), 'loopstudio:base')
    await admin2.load()
    expect(admin2.canAdmin).toBe(true)
    await admin2.save({ name: 'Ny', imgRules: { x: 1 } }, 0)
    expect(fresh.state.saves.at(-1)?.value).toEqual({ name: 'Ny', imgRules: { x: 1 } })
  })

  it('uten lov: melding om manglende rettighet, og endringen beholdes til neste forsøk', async () => {
    const { service, state } = fakeService({ data: { a: 1 }, version: 1 })
    const status = vi.fn()
    const s = new SharedSetup<Rec>(service, me(), 'thumb:base', { onStatus: status })
    await s.load()
    state.fail = 'forbidden'
    expect(await s.save({ a: 2 }, 0)).toBe(false)
    expect(status).toHaveBeenLastCalledWith({ state: 'error', text: 'shared.forbidden' })
    state.fail = ''
    expect(await s.flush()).toBe(true)
    expect(state.saves).toEqual([{ value: { a: 2 }, version: 1 }])
  })
})

/** Livets Ord-standarder bare for menigheter som fantes før (churches.legacy_defaults, docs/ny-menighet-standardinnhold.md). */
describe('legacyDefaults', () => {
  const who = (legacy?: boolean) => {
    const r = parseMe({ id: 'u1', email: 'a@b.no', roles: [], churches: [{ id: 'c1', name: 'M', logo_file_id: null, ...(legacy === undefined ? {} : { legacy_defaults: legacy }) }] })
    if (!r.ok || !r.value) throw new Error('whoami')
    return r.value
  }
  it('eksisterende menighet (true) og ukjent felt (før migreringen) gir standardene; ny menighet (false) ikke', () => {
    expect(legacyDefaults(who(true))).toBe(true)
    expect(legacyDefaults(who(undefined))).toBe(true)
    expect(legacyDefaults(who(false))).toBe(false)
  })
  it('uten innlogging (ingen backend): som før', () => {
    expect(legacyDefaults(null)).toBe(true)
  })
  it('whoami leser feltet', () => {
    expect(who(false).churches[0]?.legacy_defaults).toBe(false)
    expect('legacy_defaults' in (who(undefined).churches[0] ?? {})).toBe(false)
  })
})
