import { IDBFactory } from 'fake-indexeddb'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { openMediaDb } from './idb/media-db'
import { adoptLegacy, clearMyLocalData, DBS, isUserDb, isUserKey, legacyStatus, rememberAnswer, setLocalUser, shouldAsk, userKey, userStore } from './local-user'

const U = '00000000-0000-4000-8000-000000000004'
const V = '00000000-0000-4000-8000-000000000005'
let idb: IDBFactory
const create = (name: string) => new Promise<void>((res, rej) => {
  const r = idb.open(name, 1)
  r.onupgradeneeded = () => r.result.createObjectStore('x')
  r.onsuccess = () => { r.result.close(); res() }
  r.onerror = () => rej(r.error as Error)
})
const names = async () => (await idb.databases()).map((d) => d.name).sort()

beforeEach(() => {
  idb = new IDBFactory()
  localStorage.clear()
  setLocalUser(null)
})
afterEach(() => setLocalUser(null))

describe('lokale data per bruker (PLT-17, som local-user.js)', () => {
  it('verktøyenes databaser og nøkler er brukerdata, innstillinger for enheten er det ikke', () => {
    for (const n of DBS) expect(isUserDb(n)).toBe(true)
    for (const k of ['ukeloop.v2', 'loopstudio.disk.v1', 'medialab.fx.custom', 'photodesign.cats', 'thumbstudio.autosave', 'motiondesign.sections', 'mockups.settings', 'medialab.advanced']) expect(isUserKey(k)).toBe(true)
    for (const k of ['medialab.theme', 'medialab.lang', 'ch.auth', 'ch.local.owner', 'medialab.pwa.later', 'medialab.units']) expect(isUserKey(k)).toBe(false)
  })
  it('nøklene får brukerens ID; to brukere på samme PC ser ikke hverandres innstillinger', () => {
    setLocalUser(U)
    userStore.set('photodesign.cats', '["a"]')
    expect(localStorage.getItem('photodesign.cats@' + U)).toBe('["a"]')
    expect(userKey('medialab.theme')).toBe('medialab.theme')
    setLocalUser(V)
    expect(userStore.get('photodesign.cats')).toBe(null)
    setLocalUser(null)
    expect(userKey('photodesign.cats')).toBe('photodesign.cats')
  })
  it('«Knytt til meg»: eierløse data fra før innlogging blir brukerens uten at noe flyttes eller slettes', async () => {
    await create('photodesign')
    localStorage.setItem('photodesign.cats', '["gammel"]')
    expect(shouldAsk(U)).toBe(true)
    const st = await legacyStatus(U, idb)
    expect(st).toEqual({ available: true, dbs: ['photodesign'], keys: 1, conflicts: [] })
    expect(await adoptLegacy(U, idb)).toEqual({ ok: true, dbs: ['photodesign'], keys: 1 })
    expect(shouldAsk(U)).toBe(false)
    setLocalUser(U)
    expect(userStore.get('photodesign.cats')).toBe('["gammel"]')
    expect(await names()).toEqual(['photodesign'])
    // en annen bruker får ikke spørsmålet og ser ikke dataene
    expect((await legacyStatus(V, idb)).available).toBe(false)
    expect(await adoptLegacy(V, idb)).toEqual({ ok: false, error: 'har_eier' })
    setLocalUser(V)
    expect(userStore.get('photodesign.cats')).toBe(null)
  })
  it('har brukeren allerede egne data, knyttes ingenting (de ville blitt skjult)', async () => {
    await create('photodesign')
    await create('photodesign@' + U)
    expect(await adoptLegacy(U, idb)).toEqual({ ok: false, error: 'konflikt' })
    expect(localStorage.getItem('ch.local.owner')).toBe(null)
    rememberAnswer(U, 'konflikt')
    expect(shouldAsk(U)).toBe(false)
  })
  it('«Fjern mine lokale data» sletter bare brukerens egne data', async () => {
    const own = await openMediaDb(U, idb)
    own.close()
    const other = await openMediaDb(V, idb)
    other.close()
    await create('photodesign@' + U)
    await create('photodesign@' + V)
    await create('photodesign')
    localStorage.setItem('photodesign.cats@' + U, 'meg')
    localStorage.setItem('photodesign.cats@' + V, 'annen')
    localStorage.setItem('photodesign.cats', 'eierløs')
    localStorage.setItem(`ml2:${U}:loopstudio.disk.v1`, 'meg')
    localStorage.setItem(`ml2:${V}:loopstudio.disk.v1`, 'annen')
    localStorage.setItem('medialab.theme', 'light')
    rememberAnswer(U, 'nei')
    expect(await clearMyLocalData(U, idb)).toEqual({ keys: 2 })
    expect(await names()).toEqual(['medialab@' + V, 'photodesign', 'photodesign@' + V])
    expect(Object.keys(localStorage).sort()).toEqual(['medialab.theme', `ml2:${V}:loopstudio.disk.v1`, 'photodesign.cats', 'photodesign.cats@' + V])
    expect(shouldAsk(U)).toBe(true)
  })
  it('eieren av de gamle dataene fjerner dem, og eierskapet frigis', async () => {
    await create('photodesign')
    localStorage.setItem('photodesign.cats', 'gammel')
    await adoptLegacy(U, idb)
    await clearMyLocalData(U, idb)
    expect(await names()).toEqual([])
    expect(localStorage.getItem('photodesign.cats')).toBe(null)
    expect(localStorage.getItem('ch.local.owner')).toBe(null)
  })
})
