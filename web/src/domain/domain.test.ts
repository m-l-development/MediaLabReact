import { describe, expect, it } from 'vitest'
import { canAdmin, displayName, initials, isStaff, parseMe } from './account'
import { canStoreInCloud, kindOfMime, validateAsset } from './asset'
import { isContentHash, isUuid, newId } from './ids'
import { migrateDoc, MigrationError, validateEnvelope } from './project'
import { isToolId } from './tool'

const HASH = 'a'.repeat(64)
const ID = '0b6f7c3e-8d2a-4f4b-9c1e-2a7d9e5b1c33'
const ID2 = '1b6f7c3e-8d2a-4f4b-9c1e-2a7d9e5b1c34'

const asset = (over: Record<string, unknown> = {}) => ({
  id: ID,
  kind: 'image',
  name: 'bilde.png',
  content: { hash: HASH, mime: 'image/png', size: 1234 },
  meta: { width: 100, height: 50 },
  origin: { type: 'upload' },
  locations: [{ type: 'local' }],
  ownerId: null,
  createdAt: 1,
  ...over,
})

describe('ids', () => {
  it('lager gyldige UUID-er', () => {
    expect(isUuid(newId())).toBe(true)
    expect(isUuid('ikke-en-id')).toBe(false)
  })
  it('kjenner igjen SHA-256', () => {
    expect(isContentHash(HASH)).toBe(true)
    expect(isContentHash('abc')).toBe(false)
  })
})

describe('asset', () => {
  it('godtar et gyldig asset', () => {
    const r = validateAsset(asset())
    expect(r.ok).toBe(true)
  })

  it('avviser video i skyen (SHR-08)', () => {
    const r = validateAsset(asset({ kind: 'video', content: { hash: HASH, mime: 'video/mp4', size: 1 }, locations: [{ type: 'cloud', fileId: 'x' }] }))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors.join()).toMatch(/skyen/)
    expect(canStoreInCloud('video')).toBe(false)
    expect(canStoreInCloud('image')).toBe(true)
  })

  it('godtar avledet versjon med referanse til originalen', () => {
    const r = validateAsset(asset({ id: ID2, origin: { type: 'derived', tool: 'isolate-subject', from: ID, operation: { name: 'isolate' } } }))
    expect(r.ok).toBe(true)
  })

  it('avviser et asset som er avledet av seg selv', () => {
    const r = validateAsset(asset({ origin: { type: 'derived', tool: 'mockups', from: ID, operation: { name: 'x' } } }))
    expect(r.ok).toBe(false)
  })

  it('krever minst ett lagringssted og gyldige felt', () => {
    expect(validateAsset(asset({ locations: [] })).ok).toBe(false)
    expect(validateAsset(asset({ content: { hash: 'nei', mime: 'image/png', size: 1 } })).ok).toBe(false)
    expect(validateAsset(asset({ meta: { width: -1 } })).ok).toBe(false)
    expect(validateAsset(asset({ origin: { type: 'generated', tool: 'ukjent' } })).ok).toBe(false)
  })

  it('finner medietype fra MIME', () => {
    expect(kindOfMime('image/webp')).toBe('image')
    expect(kindOfMime('video/mp4')).toBe('video')
    expect(kindOfMime('audio/mpeg')).toBe('audio')
    expect(kindOfMime('application/pdf')).toBeNull()
  })
})

describe('prosjekt', () => {
  const envelope = {
    format: 'medialab.project', formatVersion: 1, id: ID, tool: 'thumbnail-studio', schemaVersion: 1,
    name: 'Søndag', createdAt: 1, updatedAt: 2, scope: 'personal', doc: { layers: [] }, assets: [ID2],
  }

  it('godtar en gyldig konvolutt', () => {
    expect(validateEnvelope(envelope).ok).toBe(true)
  })

  it('avviser ukjent verktøy og feil tidsrekkefølge', () => {
    expect(validateEnvelope({ ...envelope, tool: 'paint' }).ok).toBe(false)
    expect(validateEnvelope({ ...envelope, updatedAt: 0 }).ok).toBe(false)
  })

  it('migrerer i rekkefølge uten å endre originalen', () => {
    const doc = { n: 1 }
    const out = migrateDoc(doc, 1, 3, { 1: (d) => ({ ...(d as object), a: true }), 2: (d) => ({ ...(d as object), b: true }) })
    expect(out).toEqual({ n: 1, a: true, b: true })
    expect(doc).toEqual({ n: 1 })
  })

  it('stopper med forståelig feil når en migrering mangler eller feiler', () => {
    expect(() => migrateDoc({}, 1, 2, {})).toThrow(MigrationError)
    expect(() => migrateDoc({}, 1, 2, { 1: () => { throw new Error('brudd') } })).toThrow(/versjon 1/)
    expect(() => migrateDoc({}, 3, 2, {})).toThrow(/nyere versjon/)
  })
})

describe('konto', () => {
  const raw = {
    id: ID, email: 'ola@example.com', full_name: 'Ola Nordmann', first_name: 'Ola', last_name: 'Nordmann', phone: null, mfa: true,
    roles: [{ role: 'moderator', church_id: null }], churches: [{ id: ID2, name: 'Menigheten', logo_file_id: null }],
  }

  it('leser whoami og null', () => {
    const r = parseMe(raw)
    expect(r.ok && r.value?.email).toBe('ola@example.com')
    expect(parseMe(null)).toEqual({ ok: true, value: null })
    expect(parseMe({ id: 1 }).ok).toBe(false)
  })

  it('roller og navn', () => {
    const r = parseMe(raw)
    if (!r.ok || !r.value) throw new Error('forventet bruker')
    expect(isStaff(r.value)).toBe(true)
    expect(canAdmin(r.value)).toBe(true)
    expect(displayName(r.value)).toBe('Ola Nordmann')
    expect(initials(r.value)).toBe('ON')
    expect(isStaff(null)).toBe(false)
  })
})

describe('verktøy', () => {
  it('kjenner alle verktøyene', () => {
    expect(isToolId('mockups')).toBe(true)
    expect(isToolId('some')).toBe(false)
  })
})
