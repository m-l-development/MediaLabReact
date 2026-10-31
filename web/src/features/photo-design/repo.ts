import type { AssetId, ProjectId } from '../../domain/ids'
import type { ProjectEnvelope } from '../../domain/project'
import type { Validation } from '../../domain/validation'
import type { ProjectSchema, ProjectService } from '../../services/projects/project-service'
import { cleanBatch } from './engine/batch'
import type { PdDoc } from './engine/model'

/** Lagret prosjekt: dokumentet, maskene (PNG som data-URL per nøkkel), miniatyr og ev. malkategori. */
export interface PdStored { doc: PdDoc; masks: Record<string, string>; thumb: string; tpl?: { cat: string } | null }

/** Et prosjekt eller en mal i oversikten. */
export interface PdEntry { id: string; name: string; w: number; h: number; updated: number; thumb: string; tpl: boolean; cat: string | null; /** Bildeserie: antall bilder (null = vanlig prosjekt). */ batch: number | null }

const M_REF = /^m:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i
const DATA_PNG = /^data:image\/png;base64,[A-Za-z0-9+/=]+$/

const isRec = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)

export function assetIdsOf(d: Pick<PdDoc, 'layers' | 'back' | 'batch'>): string[] {
  const out = new Set<string>()
  const srcs = [...d.layers, ...(d.back?.layers ?? [])].map((L) => (L.type === 'image' ? L.src : null))
  // bildeserien: alle bildene, også de som ikke er åpne
  for (const it of d.batch?.items ?? []) srcs.push(it.src)
  for (const src of srcs) {
    const m = M_REF.exec(src ?? '')
    if (m?.[1]) out.add(m[1])
  }
  return [...out]
}

/** Grunnleggende kontroll av et dokument (felt som må finnes for å kunne åpnes). */
export function validDoc(d: unknown): d is PdDoc {
  return isRec(d) && typeof d.id === 'string' && Array.isArray(d.layers) && Number(d.w) > 0 && Number(d.h) > 0
}

export const PROJECT_SCHEMA: ProjectSchema<PdStored> = {
  tool: 'photo-design',
  version: 1,
  migrations: {},
  validate(input: unknown): Validation<PdStored> {
    if (!isRec(input) || !validDoc(input.doc)) return { ok: false, errors: ['photo: ugyldig dokument'] }
    const masks: Record<string, string> = {}
    if (isRec(input.masks)) for (const [k, v] of Object.entries(input.masks)) if (typeof v === 'string' && DATA_PNG.test(v)) masks[k] = v
    const tpl = isRec(input.tpl) && typeof input.tpl.cat === 'string' ? { cat: input.tpl.cat.slice(0, 40) } : null
    const doc: PdDoc = { ...input.doc }
    if (doc.batch != null) {
      const b = cleanBatch(doc.batch)
      if (b) doc.batch = b
      else delete doc.batch
    }
    return { ok: true, value: { doc, masks, thumb: typeof input.thumb === 'string' && /^data:image\/(jpeg|png);base64,/.test(input.thumb) ? input.thumb : '', tpl } }
  },
  assetsOf: (s) => assetIdsOf(s.doc) as AssetId[],
}

/** Prosjekter og maler i brukerens database (verktøy `photo-design`). */
export class PdRepo {
  private projects: ProjectService
  private envs = new Map<string, ProjectEnvelope<PdStored>>()

  constructor(projects: ProjectService) {
    this.projects = projects
  }

  async list(): Promise<PdEntry[]> {
    const rows = await this.projects.list('photo-design')
    const out: PdEntry[] = []
    for (const p of rows) {
      try {
        const env = await this.projects.open(PROJECT_SCHEMA, p.id)
        this.envs.set(env.id, env)
        out.push({ id: env.id, name: env.name, w: env.doc.doc.w, h: env.doc.doc.h, updated: env.updatedAt, thumb: env.doc.thumb, tpl: !!env.doc.tpl, cat: env.doc.tpl?.cat ?? null, batch: env.doc.doc.batch ? env.doc.doc.batch.items.length : null })
      } catch {
        // et prosjekt som ikke kan leses, hoppes over (originalen blir liggende)
      }
    }
    return out.sort((a, b) => b.updated - a.updated)
  }

  async open(id: string): Promise<PdStored> {
    const env = this.envs.get(id) ?? (await this.projects.open(PROJECT_SCHEMA, id as ProjectId))
    this.envs.set(env.id, env)
    return structuredClone(env.doc)
  }

  /** Lagrer (oppretter første gang). → prosjektets ID. */
  async save(projectId: string | null, s: PdStored, opts: { legacy?: { source: string; id: string }; createdAt?: number } = {}): Promise<string> {
    const env = projectId ? this.envs.get(projectId) : undefined
    if (env) {
      const saved = await this.projects.save(PROJECT_SCHEMA, { ...env, name: s.doc.name || 'Uten navn', doc: s })
      this.envs.set(saved.id, saved)
      return saved.id
    }
    const created = await this.projects.create(PROJECT_SCHEMA, s.doc.name || 'Uten navn', s, { ...(opts.legacy ? { legacy: opts.legacy } : {}), ...(opts.createdAt ? { createdAt: opts.createdAt } : {}) })
    this.envs.set(created.id, created)
    return created.id
  }

  async remove(id: string): Promise<void> {
    await this.projects.remove(id as ProjectId)
    this.envs.delete(id)
  }

  /** Prosjektet som ble laget fra et prosjekt i dagens app (eller en sikkerhetskopi) med denne ID-en. */
  findLegacy(id: string): string | null {
    for (const e of this.envs.values()) if (e.legacy?.source === 'photodesign' && e.legacy.id === id) return e.id
    return null
  }
}
