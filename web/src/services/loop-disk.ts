import type { DataAdapter } from './auth/types'
import { ServiceError } from './errors'

/**
 * Loop Studio: menighetens delte disk (TB-BB67CB), i tillegg til den personlige disken i nettleseren
 * (supabase/migrations/20261018130000_loop_shared_disk.sql). Alle medlemmer kan lese og lagre; bare Admin kan slette.
 * Hver loop har sitt eget versjonsnummer – lagring mot en eldre versjon gir `settings_conflict`, så en eldre kopi
 * aldri overskriver en nyere. Video og musikk deles ikke, og bare menighetens egne filer («ch:<id>») kan brukes.
 */
export interface LoopDiskData { programText: string; slides: unknown[]; cfg: Record<string, unknown> }
export interface LoopDiskRow { id: string; church_id: string; name: string; base: string; data: LoopDiskData; version: number; updated_at: string }

export interface LoopDiskService {
  available(): boolean
  list(churchId: string): Promise<LoopDiskRow[]>
  get(id: string): Promise<LoopDiskRow | null>
  /** Ny (id null) eller endring av versjonen brukeren har sett. → ny versjon. */
  save(churchId: string, e: { id: string | null; name: string; base: string; data: LoopDiskData; version: number | null }): Promise<{ id: string; version: number }>
  remove(id: string): Promise<void>
}

const COLS = 'id, church_id, name, base, data, version, updated_at'

export function createLoopDiskService(data: DataAdapter | null): LoopDiskService {
  const db = () => {
    if (!data) throw new ServiceError('unavailable')
    return data
  }
  return {
    available: () => !!data,
    list: async (churchId) => db().select<LoopDiskRow>('loop_disk', { columns: COLS, eq: { church_id: churchId }, order: 'updated_at', desc: true, limit: 30 }),
    get: async (id) => (await db().select<LoopDiskRow>('loop_disk', { columns: COLS, eq: { id }, limit: 1 }))[0] ?? null,
    save: async (churchId, e) =>
      db().rpc<{ id: string; version: number }>('loop_disk_save', { p_church: churchId, p_id: e.id, p_name: e.name, p_base: e.base, p_data: e.data, p_version: e.version }),
    remove: async (id) => void (await db().rpc('loop_disk_delete', { p_id: id })),
  }
}

/** Referanser som bare finnes på én PC (eller er video/lyd) og derfor ikke kan deles. Innebygde bilder (images/) og genererte (gen:) kan. */
const LOCAL = /^(img-|vid-|aud-|blob:|data:|demo-)/

/**
 * Gjør en loop klar for menighetens disk: lokale bilder lastes opp (via `upload`, f.eks. til Fellesmappe) og byttes ut
 * med «ch:<id>»; video og lyd og andre lokale referanser fjernes. `cache` gjenbrukes, så samme bilde lastes opp én gang.
 */
export async function forSharedDisk(d: LoopDiskData, upload: (ref: string) => Promise<string | null>, cache: Map<string, string | null> = new Map()): Promise<LoopDiskData> {
  const walk = async (v: unknown): Promise<unknown> => {
    if (typeof v === 'string') {
      if (!LOCAL.test(v)) return v
      if (!v.startsWith('img-')) return null
      if (!cache.has(v)) cache.set(v, await upload(v).catch(() => null))
      return cache.get(v) ?? null
    }
    if (Array.isArray(v)) {
      const out: unknown[] = []
      for (const x of v) out.push(await walk(x))
      return out
    }
    if (v && typeof v === 'object') {
      const out: Record<string, unknown> = {}
      for (const [k, x] of Object.entries(v)) out[k] = await walk(x)
      return out
    }
    return v
  }
  // video på slidene deles aldri (navn, lengde og lydvalg følger ikke med)
  const slides = (d.slides ?? []).map((s) => {
    if (!s || typeof s !== 'object') return s
    const { vid: _v, vidName: _n, vidLen: _l, vidSound: _s, vidMusic: _m, vidVol: _vv, qr: _q, ...rest } = s as Record<string, unknown>
    return rest
  })
  return (await walk({ programText: d.programText ?? '', slides, cfg: d.cfg ?? {} })) as LoopDiskData
}
