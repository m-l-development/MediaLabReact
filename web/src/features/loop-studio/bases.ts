/**
 * Lagrede grunnoppsett i Loop Studio (samme regler som media-lab/src/shared/loop-bases.js).
 * - Personlig: bare for brukeren, i nettleseren (nøkkel `loopstudio.bases.v1`, maks 20).
 * - Felles for menigheten: i menighetens grunnoppsett (church_settings «loopstudio:bases»). Databasen kontrollerer
 *   medlemskap, versjon og at bildereferanser («ch:<id>») er menighetens egne filer.
 * Et grunnoppsett er et utgangspunkt: nye serier fra det er egne prosjekter, så endringer i en serie aldri endrer
 * grunnoppsettet. Lagring legger alltid til et nytt grunnoppsett (ny ID). Ved samtidige endringer i felleslisten gjøres
 * endringen på nytt på nyeste versjon.
 */
import { ServiceError } from '../../services/errors'
import type { ChurchSettingsService } from '../../services/shared-setup'
import type { Cfg, Slide } from './engine/types'

const LK = 'loopstudio.bases.v1'
const SCOPE = 'loopstudio:bases'
const MAX = 20
export const BASE_TPLS = ['week', 'sunday', 'youth', 'blank']

export interface BaseEntry { id: string; name: string; base: string; data: { programText: string; slides: Slide[]; cfg: Cfg }; savedAt: number }
export interface KV { get(k: string): string | null; set(k: string, v: string): boolean; remove(k: string): void }

export const newBaseId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
const okId = (id: unknown) => typeof id === 'string' && /^[a-z0-9]{4,16}$/.test(id)
const clean = (e: unknown): e is BaseEntry => {
  const x = e as BaseEntry | null
  return !!x && okId(x.id) && typeof x.name === 'string' && !!x.data && Array.isArray(x.data.slides)
}
export class BaseError extends Error {
  code: 'full' | 'forbidden' | 'settings_conflict'
  constructor(code: BaseError['code']) {
    super(code)
    this.code = code
  }
}

/** Felles grunnoppsett kan bare referere til menighetens filer (ch:) eller genererte bakgrunner (gen:). */
export function forChurch<T>(v: T): T {
  if (typeof v === 'string') return (/^(img-|vid-|aud-|images\/|blob:|data:|demo-)/.test(v) ? null : v) as T
  if (Array.isArray(v)) return v.map(forChurch) as T
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, forChurch(x)])) as T
  return v
}

export function entryOf(o: { name: string; base: string; programText: string; slides: Slide[]; cfg: Cfg }): BaseEntry {
  const s = (o.slides || []).map((x) => {
    const { qr: _qr, ...rest } = x
    return rest as Slide
  })
  return {
    id: newBaseId(), name: String(o.name || '').trim().slice(0, 60) || 'Grunnoppsett', base: BASE_TPLS.includes(o.base) ? o.base : 'blank',
    data: { programText: String(o.programText || ''), slides: s, cfg: o.cfg || {} }, savedAt: Date.now(),
  }
}

export function personalBases(kv: KV) {
  const read = (): BaseEntry[] => {
    try {
      const l: unknown = JSON.parse(kv.get(LK) || '[]')
      return Array.isArray(l) ? l.filter(clean) : []
    } catch {
      return []
    }
  }
  const write = (l: BaseEntry[]) => {
    if (!kv.set(LK, JSON.stringify(l))) throw new BaseError('full')
  }
  return {
    list: read,
    get: (id: string) => read().find((e) => e.id === id) ?? null,
    add(e: BaseEntry) {
      const l = read()
      if (l.length >= MAX) throw new BaseError('full')
      write([...l, e])
      return e
    },
    update(id: string, data: BaseEntry['data']) {
      write(read().map((e) => (e.id === id ? { ...e, data, savedAt: Date.now() } : e)))
    },
    remove(id: string) {
      write(read().filter((e) => e.id !== id))
    },
  }
}
export type PersonalBases = ReturnType<typeof personalBases>

export function centralBases(cs: ChurchSettingsService, churchId: () => string | null) {
  async function list(): Promise<BaseEntry[]> {
    const c = churchId()
    if (!c) return []
    const r = await cs.get(c, SCOPE)
    const bases = (r?.data as { bases?: unknown } | null)?.bases
    return Array.isArray(bases) ? bases.filter(clean) : []
  }
  /** fn(liste) → ny liste, på nyeste versjon; prøver igjen ved samtidig endring. */
  async function mutate(fn: (l: BaseEntry[]) => BaseEntry[]): Promise<BaseEntry[]> {
    const c = churchId()
    if (!c) throw new BaseError('forbidden')
    for (let i = 0; i < 4; i++) {
      const r = await cs.get(c, SCOPE)
      const bases = (r?.data as { bases?: unknown } | null)?.bases
      const next = fn(Array.isArray(bases) ? bases.filter(clean) : [])
      try {
        await cs.save(c, SCOPE, { bases: next }, r ? r.version : 0)
        return next
      } catch (e) {
        if (!(e instanceof ServiceError) || e.code !== 'settings_conflict') throw e
      }
    }
    throw new BaseError('settings_conflict')
  }
  return {
    available: () => cs.available() && !!churchId(),
    list,
    get: async (id: string) => (await list()).find((e) => e.id === id) ?? null,
    async add(e: BaseEntry) {
      const x = forChurch(e)
      await mutate((l) => {
        if (l.length >= MAX) throw new BaseError('full')
        return [...l, x]
      })
      return x
    },
    update: (id: string, data: BaseEntry['data']) => mutate((l) => l.map((e) => (e.id === id ? { ...e, data: forChurch(data), savedAt: Date.now() } : e))),
    remove: (id: string) => mutate((l) => l.filter((e) => e.id !== id)),
  }
}
export type CentralBases = ReturnType<typeof centralBases>
