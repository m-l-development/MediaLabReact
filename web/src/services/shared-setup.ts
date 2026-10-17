import type { Me } from '../domain/account'
import type { MessageKey } from '../shared/i18n/messages'
import { localStore } from '../shared/lib/storage'
import type { DataAdapter } from './auth/types'
import { ServiceError } from './errors'

/**
 * Felles grunnoppsett for menigheten i verktøyene (Thumbnail Studio, Loop Studio …), samme regler som
 * media-lab/src/shared/shared-setup.js:
 * - Ett oppsett per menighet og område (scope) i `church_settings` (RPC `church_settings_get` / `church_settings_save`).
 * - Lagring med versjonsnummer. Har noen andre lagret i mellomtiden (`settings_conflict`), hentes nyeste versjon og
 *   endringene slås sammen felt for felt (merge3); en eldre versjon kan aldri overskrive en nyere.
 * - Felt bare Admin kan endre (`admin_keys`), sendes aldri endret fra andre roller.
 * - Nyere versjoner hentes når fanen blir synlig og hvert 30. sekund.
 */
export interface SettingsRow { data: unknown; version: number; updated_at?: string; updated_by_name?: string; can_admin?: boolean; admin_keys?: string[] }

export interface ChurchSettingsService {
  available(): boolean
  get(churchId: string, scope: string): Promise<SettingsRow | null>
  save(churchId: string, scope: string, value: unknown, version: number): Promise<{ version: number }>
}

export function createChurchSettings(data: DataAdapter | null): ChurchSettingsService {
  return {
    available: () => !!data,
    async get(churchId, scope) {
      if (!data) return null
      return (await data.rpc<SettingsRow | null>('church_settings_get', { p_church: churchId, p_scope: scope })) ?? null
    },
    async save(churchId, scope, value, version) {
      if (!data) throw new ServiceError('unavailable')
      return data.rpc<{ version: number }>('church_settings_save', { p_church: churchId, p_scope: scope, p_data: value, p_version: version })
    },
  }
}

const canon = (v: unknown): unknown =>
  Array.isArray(v)
    ? v.map(canon)
    : v && typeof v === 'object'
      ? Object.keys(v).sort().reduce<Record<string, unknown>>((o, k) => {
          const x = (v as Record<string, unknown>)[k]
          if (x !== undefined) o[k] = canon(x)
          return o
        }, {})
      : v === undefined
        ? null
        : v

/** Likt innhold uavhengig av feltrekkefølge. */
export const same = (a: unknown, b: unknown): boolean => JSON.stringify(canon(a)) === JSON.stringify(canon(b))

type Rec = Record<string, unknown>

type Item = Rec & { id: string }
/** Liste der alle elementer er objekter med unik tekst-id (f.eks. kategorier)? */
const idList = (v: unknown): v is Item[] => {
  if (!Array.isArray(v)) return false
  const ids = new Set<string>()
  for (const x of v) {
    if (!x || typeof x !== 'object' || typeof (x as Rec).id !== 'string' || ids.has((x as Item).id)) return false
    ids.add((x as Item).id)
  }
  return true
}

/**
 * Tre-veis sammenslåing av en liste med id-er, element for element: endringer i ulike elementer beholdes begge;
 * nye elementer fra begge kommer med; et element den ene har slettet og den andre ikke har endret, slettes.
 * Har begge endret samme element ulikt (eller den ene slettet det den andre endret), vinner den nyeste lagrede (deres).
 */
function mergeList(base: Item[], mine: Item[], theirs: Item[]): { list: Item[]; conflict: boolean } {
  const B = new Map(base.map((x) => [x.id, x]))
  const M = new Map(mine.map((x) => [x.id, x]))
  const T = new Map(theirs.map((x) => [x.id, x]))
  const keep = new Map<string, Item>()
  let conflict = false
  for (const id of new Set([...T.keys(), ...M.keys()])) {
    const b = B.get(id), m = M.get(id), t = T.get(id)
    if (m && t) {
      const mc = !same(m, b), tc = !same(t, b)
      if (mc && tc && !same(m, t)) conflict = true
      keep.set(id, mc && !tc ? m : t)
    } else if (t) {
      // finnes ikke hos meg: ny hos dem, eller slettet av meg
      if (!b) keep.set(id, t)
      else if (!same(t, b)) {
        conflict = true
        keep.set(id, t)
      }
    } else if (m) {
      // finnes ikke hos dem: ny hos meg, eller slettet av dem
      if (!b) keep.set(id, m)
      else if (!same(m, b)) conflict = true
    }
  }
  // rekkefølge: min, hvis bare jeg har endret den; ellers deres. Nye elementer kommer til slutt.
  const order = (l: Item[]) => l.map((x) => x.id).filter((id) => B.has(id) && T.has(id) && M.has(id)).join('\n')
  const first = order(mine) !== order(base) && order(theirs) === order(base) ? mine : theirs
  const list: Item[] = []
  for (const id of [...first, ...theirs, ...mine].map((x) => x.id)) {
    const v = keep.get(id)
    if (v) {
      list.push(v)
      keep.delete(id)
    }
  }
  return { list, conflict }
}

/** Tre-veis sammenslåing på toppnivå; lister med id-er (f.eks. kategorier) slås sammen element for element. */
export function merge3(base: Rec | null, mine: Rec | null, theirs: Rec | null): { data: Rec; conflicts: string[] } {
  const b = base ?? {}
  const m = mine ?? {}
  const t = theirs ?? {}
  const out: Rec = {}
  const conflicts: string[] = []
  for (const k of new Set([...Object.keys(b), ...Object.keys(m), ...Object.keys(t)])) {
    const mineChanged = !same(m[k], b[k])
    const theirsChanged = !same(t[k], b[k])
    let v: unknown
    if (!mineChanged) v = t[k]
    else if (!theirsChanged) v = m[k]
    else if (idList(m[k]) && idList(t[k]) && (b[k] === undefined || idList(b[k]))) {
      const r = mergeList((b[k] as Item[] | undefined) ?? [], m[k], t[k])
      if (r.conflict) conflicts.push(k)
      v = r.list
    } else {
      if (!same(m[k], t[k])) conflicts.push(k)
      v = t[k]
    }
    if (v !== undefined) out[k] = v
  }
  return { data: out, conflicts }
}

export const ACTIVE_CHURCH_KEY = 'ch.activeChurch'

/**
 * Skal de innebygde Livets Ord-standardene (kategorien og grunnoppsettet «Kveldsbibelskole») vises? Bare for menigheter
 * som fantes før avgrensningen (churches.legacy_defaults). Uten innlogging/backend, eller før migreringen, som før: ja.
 */
export function legacyDefaults(me: Me | null): boolean {
  const c = activeChurch(me)
  return !c || c.legacy_defaults !== false
}

/** Menigheten verktøyene arbeider i: valgt menighet hvis brukeren er medlem der, ellers den første. */
export function activeChurch(me: Me | null): Me['churches'][number] | null {
  const list = me?.churches ?? []
  const pick = localStore.get(ACTIVE_CHURCH_KEY)
  return list.find((c) => c.id === pick) ?? list[0] ?? null
}

export type SetupStatus = { state: 'saving' | 'saved' | 'error' | 'merged' | 'conflict'; text: MessageKey; fields?: string }

export class SharedSetup<T extends Rec = Rec> {
  readonly scope: string
  readonly church: { id: string; name: string } | null
  version = 0
  base: T | null = null
  canAdmin = false
  adminKeys: string[] = []
  exists = false
  info: { by?: string; at?: string } | null = null
  private pending: T | null = null
  private saving: Promise<boolean> | null = null
  private timer: ReturnType<typeof setTimeout> | undefined
  private interval: ReturnType<typeof setInterval> | undefined
  private vis: (() => void) | null = null
  private service: ChurchSettingsService
  private me: Me | null
  private onRemote: (data: T, info: { merged: boolean; conflicts?: string[]; by?: string }) => void
  private onStatus: (s: SetupStatus) => void

  constructor(service: ChurchSettingsService, me: Me | null, scope: string, opts: { onRemote?: SharedSetup<T>['onRemote']; onStatus?: SharedSetup<T>['onStatus'] } = {}) {
    this.service = service
    this.me = me
    this.scope = scope
    this.church = service.available() ? activeChurch(me) : null
    this.onRemote = opts.onRemote ?? (() => undefined)
    this.onStatus = opts.onStatus ?? (() => undefined)
  }

  get available(): boolean {
    return !!this.church
  }

  async load(): Promise<T | null> {
    if (!this.church) return null
    const r = await this.service.get(this.church.id, this.scope)
    this.exists = !!r
    this.version = r ? r.version : 0
    this.base = r ? (r.data as T) : null
    const churchId = this.church.id
    this.canAdmin = r ? !!r.can_admin : !!this.me?.roles.some((x) => x.role === 'church_admin' && x.church_id === churchId)
    this.adminKeys = r ? (r.admin_keys ?? []) : this.scope.startsWith('loopstudio:') ? ['imgRules'] : []
    this.info = r ? { ...(r.updated_by_name ? { by: r.updated_by_name } : {}), ...(r.updated_at ? { at: r.updated_at } : {}) } : null
    return r ? (r.data as T) : null
  }

  /** Holder tilbake endringer i felt brukeren ikke har lov til å endre. */
  guard(next: T): T {
    if (this.canAdmin || !this.adminKeys.length) return next
    const out: Rec = { ...next }
    const base: Rec = this.base ?? {}
    for (const k of this.adminKeys) {
      if (k in base) out[k] = base[k]
      else delete out[k]
    }
    return out as T
  }

  /** Lagrer etter en kort pause (raske endringer samles). Løses når lagringen er ferdig. */
  save(next: T, delay = 800): Promise<boolean> {
    if (!this.church) return Promise.resolve(false)
    this.pending = this.guard(next)
    clearTimeout(this.timer)
    return new Promise((res) => {
      this.timer = setTimeout(() => res(this.flush()), delay)
    })
  }

  async flush(): Promise<boolean> {
    if (this.saving) await this.saving.catch(() => undefined)
    if (!this.pending) return true
    const want = this.pending
    this.pending = null
    if (this.base && same(want, this.base)) return true
    this.onStatus({ state: 'saving', text: 'shared.saving' })
    this.saving = this.write(want)
    try {
      return await this.saving
    } finally {
      this.saving = null
    }
  }

  private async write(want: T, tries = 0): Promise<boolean> {
    if (!this.church) return false
    try {
      const r = await this.service.save(this.church.id, this.scope, want, this.version)
      this.version = r.version
      this.base = want
      this.exists = true
      this.onStatus({ state: 'saved', text: 'shared.saved' })
      return true
    } catch (e) {
      const code = e instanceof ServiceError ? e.code : ''
      if (code === 'settings_conflict' && tries < 3) {
        const base = this.base
        const theirs = await this.load()
        const { data, conflicts } = merge3(base, want, theirs)
        const merged = this.guard(data as T)
        this.onRemote(merged, { merged: true, conflicts })
        this.onStatus(conflicts.length ? { state: 'conflict', text: 'shared.conflict', fields: conflicts.join(', ') } : { state: 'merged', text: 'shared.merged' })
        return this.write(merged, tries + 1)
      }
      this.pending = this.pending ?? want
      this.onStatus({ state: 'error', text: code === 'forbidden' ? 'shared.forbidden' : 'shared.error' })
      return false
    }
  }

  /** Henter nyere versjon fra andre brukere når det ikke ligger ulagrede endringer her. */
  async refresh(): Promise<boolean> {
    if (!this.church || this.pending || this.saving) return false
    const before = this.version
    let d: T | null | undefined
    try {
      d = await this.load()
    } catch {
      return false
    }
    if (this.version === before || !d) return false
    this.onRemote(d, { merged: false, ...(this.info?.by ? { by: this.info.by } : {}) })
    return true
  }

  watch(ms = 30000): () => void {
    const tick = () => {
      if (document.visibilityState === 'visible') void this.refresh()
    }
    this.interval = setInterval(tick, ms)
    this.vis = tick
    document.addEventListener('visibilitychange', tick)
    return () => this.stop()
  }

  stop(): void {
    clearInterval(this.interval)
    if (this.vis) document.removeEventListener('visibilitychange', this.vis)
    clearTimeout(this.timer)
  }
}
