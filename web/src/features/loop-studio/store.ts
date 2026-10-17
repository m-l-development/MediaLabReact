/**
 * Lagring i Loop Studio.
 * - Arbeidskopien per mal (og per egen serie) og looper lagret på «Disk» er prosjekter i brukerens database
 *   (verktøy `loop-studio`), ikke i localStorage som i dagens app (der var plassen begrenset).
 * - Bilder, video og lyd ligger i «Dine medier» (AssetService). Referansene i slidene er `img-<id>`, `vid-<id>` og
 *   `aud-<id>`. Video og lyd lagres bare på denne enheten (aldri i skyen).
 * - Små innstillinger (malkort, lydbibliotek, enheter) ligger i `kv`.
 * Lageret holder alt i minnet etter `load()`, så editoren kan lese synkront slik dagens app gjorde.
 */
import { isUuid, type AssetId, type ProjectId } from '../../domain/ids'
import type { ProjectEnvelope } from '../../domain/project'
import type { Validation } from '../../domain/validation'
import type { AssetService } from '../../services/assets/asset-service'
import type { ProjectSchema, ProjectService } from '../../services/projects/project-service'
import type { Cfg, Slide } from './engine/types'
import { isSlide } from './model'

export interface WorkData {
  programText: string
  slides: Slide[]
  cfg: Cfg
  videoName?: string
  audioName?: string
  /** Bakgrunnsvideoen (`vid-<id>`) og lydsporet (`aud-<id>`). */
  video?: string | null
  audio?: string | null
}
export interface DiskEntry {
  id: string
  name: string
  base: string
  savedAt: number
  fav: boolean
  count: number
  data: { programText: string; slides: Slide[]; cfg: Cfg }
}
export type LoopDoc = { kind: 'work'; slot: string; data: WorkData } | { kind: 'disk'; entry: DiskEntry }

const REF = /^(img|vid|aud)-([0-9a-f-]{36})$/
/** Asset-ID-en i en referanse (`img-<id>` osv.), ellers null. */
export function assetOfRef(ref: unknown): AssetId | null {
  const m = typeof ref === 'string' ? REF.exec(ref) : null
  return m && isUuid(m[2]) ? (m[2] as AssetId) : null
}
export const refOf = (kind: 'img' | 'vid' | 'aud', id: AssetId) => `${kind}-${id}`

/** Alle referanser til medier i et dokument (slides, logo, faste bilder, video, lyd). */
export function refsOf(d: { slides?: Slide[]; cfg?: Cfg; video?: string | null; audio?: string | null }): string[] {
  const out = new Set<string>()
  const add = (v: unknown) => {
    if (typeof v === 'string') out.add(v)
  }
  for (const s of d.slides ?? []) {
    add(s.bg)
    add(s.bgPort)
    add(s.vid)
    for (const p of s.pips ?? []) add(p?.src)
  }
  add(d.cfg?.logoSrc)
  for (const r of d.cfg?.imgRules ?? []) {
    add(r?.bg)
    add(r?.bgPort)
  }
  add(d.video)
  add(d.audio)
  return [...out]
}
const assetIds = (refs: string[]) => [...new Set(refs.map(assetOfRef).filter((x): x is AssetId => !!x))]

function validData(v: unknown): v is { programText?: unknown; slides: unknown[]; cfg?: unknown } {
  return !!v && typeof v === 'object' && Array.isArray((v as { slides?: unknown }).slides)
}
const cleanSlides = (a: unknown[]) => a.filter(isSlide)

export const PROJECT_SCHEMA: ProjectSchema<LoopDoc> = {
  tool: 'loop-studio',
  version: 1,
  migrations: {},
  validate(input: unknown): Validation<LoopDoc> {
    const d = input as Partial<{ kind: string; slot: unknown; data: unknown; entry: Partial<DiskEntry> }> | null
    if (d?.kind === 'work' && typeof d.slot === 'string' && validData(d.data)) {
      const w = d.data as WorkData
      return { ok: true, value: { kind: 'work', slot: d.slot, data: { ...w, programText: String(w.programText ?? ''), slides: cleanSlides(w.slides), cfg: w.cfg && typeof w.cfg === 'object' ? w.cfg : {} } } }
    }
    const e = d?.entry
    if (d?.kind === 'disk' && e && typeof e.id === 'string' && validData(e.data)) {
      const data = e.data
      return {
        ok: true,
        value: {
          kind: 'disk',
          entry: {
            id: e.id, name: String(e.name ?? 'Uten navn').slice(0, 60), base: String(e.base ?? 'blank'), savedAt: Number(e.savedAt) || 0, fav: !!e.fav, count: Number(e.count) || 0,
            data: { programText: String(data.programText ?? ''), slides: cleanSlides(data.slides), cfg: data.cfg && typeof data.cfg === 'object' ? data.cfg : {} },
          },
        },
      }
    }
    return { ok: false, errors: ['loop: ugyldig prosjekt'] }
  },
  assetsOf: (d) => assetIds(d.kind === 'work' ? refsOf(d.data) : refsOf(d.entry.data)),
}

/** Prosjektene i Loop Studio, lest inn i minnet. Skriving skjer i bakgrunnen i rekkefølge. */
export class LoopRepo {
  private projects: ProjectService
  private work = new Map<string, ProjectEnvelope<LoopDoc>>()
  private disk = new Map<string, ProjectEnvelope<LoopDoc>>()
  private chain: Promise<unknown> = Promise.resolve()
  loaded = false

  constructor(projects: ProjectService) {
    this.projects = projects
  }

  async load(): Promise<void> {
    this.work.clear()
    this.disk.clear()
    for (const r of await this.projects.list('loop-studio')) {
      try {
        const env = await this.projects.open(PROJECT_SCHEMA, r.id)
        if (env.doc.kind === 'work') this.work.set(env.doc.slot, env)
        else this.disk.set(env.doc.entry.id, env)
      } catch {
        // et prosjekt som ikke kan leses, hoppes over (det blir liggende)
      }
    }
    this.loaded = true
  }

  /** Venter til alt som er sendt til lagring, er skrevet. */
  flush(): Promise<unknown> {
    return this.chain
  }

  private queue<T>(fn: () => Promise<T>): Promise<T> {
    const p = this.chain.then(fn, fn)
    this.chain = p.catch(() => undefined)
    return p
  }

  getWork(slot: string): WorkData | null {
    const e = this.work.get(slot)
    return e && e.doc.kind === 'work' ? structuredClone(e.doc.data) : null
  }
  hasWork(slot: string): boolean {
    return this.work.has(slot)
  }
  workSlots(): string[] {
    return [...this.work.keys()]
  }

  saveWork(slot: string, data: WorkData, name: string, legacy?: { source: string; id: string }): Promise<void> {
    const doc: LoopDoc = { kind: 'work', slot, data: structuredClone(data) }
    return this.queue(async () => {
      const env = this.work.get(slot)
      if (env) this.work.set(slot, await this.projects.save(PROJECT_SCHEMA, { ...env, name: name || env.name, doc }))
      else this.work.set(slot, await this.projects.create(PROJECT_SCHEMA, name || 'Loop', doc, legacy ? { legacy } : {}))
    })
  }

  removeWork(slot: string): Promise<void> {
    return this.queue(async () => {
      const env = this.work.get(slot)
      if (!env) return
      await this.projects.remove(env.id as ProjectId)
      this.work.delete(slot)
    })
  }

  diskList(): DiskEntry[] {
    return [...this.disk.values()].flatMap((e) => (e.doc.kind === 'disk' ? [structuredClone(e.doc.entry)] : [])).sort((a, b) => b.savedAt - a.savedAt)
  }

  /** Lagrer listen på Disk: nye og endrede oppføringer skrives, oppføringer som ikke er med, slettes. */
  setDisk(list: DiskEntry[], legacy?: (id: string) => { source: string; id: string } | undefined): Promise<void> {
    const want = new Map(list.map((e) => [e.id, structuredClone(e)]))
    return this.queue(async () => {
      for (const [id, env] of [...this.disk]) {
        if (want.has(id)) continue
        await this.projects.remove(env.id as ProjectId)
        this.disk.delete(id)
      }
      for (const [id, entry] of want) {
        const env = this.disk.get(id)
        const doc: LoopDoc = { kind: 'disk', entry }
        if (env && env.doc.kind === 'disk' && JSON.stringify(env.doc.entry) === JSON.stringify(entry)) continue
        const lg = legacy?.(id)
        this.disk.set(id, env ? await this.projects.save(PROJECT_SCHEMA, { ...env, name: entry.name, doc }) : await this.projects.create(PROJECT_SCHEMA, entry.name, doc, lg ? { legacy: lg } : {}))
      }
    })
  }

  /** Prosjektet laget fra denne kilden i dagens app (import kjøres bare én gang per kilde). */
  hasLegacy(source: string, id: string): boolean {
    for (const e of [...this.work.values(), ...this.disk.values()]) if (e.legacy?.source === source && e.legacy.id === id) return true
    return false
  }
}

/** Mediefiler i Loop Studio («Dine medier»). */
export class LoopMediaStore {
  private assets: AssetService
  private cache = new Map<string, Blob>()

  constructor(assets: AssetService) {
    this.assets = assets
  }

  /** Legger filen i «Dine medier» og gir referansen. Samme fil to ganger gir samme referanse. */
  async put(blob: Blob, kind: 'img' | 'vid' | 'aud', name: string, legacy?: { source: string; id: string }): Promise<string> {
    const a = await this.assets.register(blob, { name, origin: { type: 'upload' }, ...(legacy ? { legacy } : {}) })
    const ref = refOf(kind, a.id)
    this.cache.set(ref, blob)
    return ref
  }

  async get(ref: string): Promise<Blob | null> {
    const hit = this.cache.get(ref)
    if (hit) return hit
    const id = assetOfRef(ref)
    if (!id) return null
    try {
      const b = await this.assets.open(id)
      this.cache.set(ref, b)
      return b
    } catch {
      return null
    }
  }

  async meta(ref: string): Promise<{ name: string; size: number; duration?: number } | null> {
    const id = assetOfRef(ref)
    const a = id ? await this.assets.get(id) : undefined
    return a ? { name: a.name, size: a.content.size, ...(a.meta.duration != null ? { duration: a.meta.duration } : {}) } : null
  }
}
