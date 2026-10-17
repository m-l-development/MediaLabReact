import type { AssetId, ProjectId } from '../../domain/ids'
import type { ProjectEnvelope } from '../../domain/project'
import type { Validation } from '../../domain/validation'
import type { ProjectSchema, ProjectService } from '../../services/projects/project-service'
import { cleanCategory, cleanDoc, type Category, type Template } from './engine/backup'
import type { Doc } from './engine/model'

/** Dokumentet i en mal-prosjektkonvolutt. */
export interface TplDoc { catId: string; order: number; thumb: string; doc: Doc }

const M_REF = /^m:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i

/** Asset-ID-ene et dokument bruker (bilder i Dine medier). */
export function assetIdsOf(doc: Doc): string[] {
  const out = new Set<string>()
  const add = (v: string | null | undefined) => {
    const m = M_REF.exec(v ?? '')
    if (m?.[1]) out.add(m[1])
  }
  for (const l of doc.layers) {
    if (l.type === 'image') {
      add(l.src)
      add(l.orig)
    }
  }
  add(doc.bg.src)
  add(doc.bg.orig)
  return [...out]
}

const keepLocal = (s: string) => (s.startsWith('m:') ? s : null)

export const TEMPLATE_SCHEMA: ProjectSchema<TplDoc> = {
  tool: 'thumbnail-studio',
  version: 1,
  migrations: {},
  validate(input: unknown): Validation<TplDoc> {
    const r = input as Partial<TplDoc> | null
    if (!r || typeof r !== 'object' || typeof r.catId !== 'string') return { ok: false, errors: ['mal: mangler kategori'] }
    const doc = cleanDoc(r.doc, keepLocal)
    if (!doc) return { ok: false, errors: ['mal: ugyldig dokument'] }
    return { ok: true, value: { catId: r.catId, order: typeof r.order === 'number' && Number.isFinite(r.order) ? r.order : 0, thumb: typeof r.thumb === 'string' ? r.thumb : '', doc } }
  },
  assetsOf: (d) => assetIdsOf(d.doc) as AssetId[],
}

export const CATS_KEY = 'thumbstudio.cats'

/**
 * Lagring for Thumbnail Studio i brukerens egen database:
 * - Kategoriene (lokal kopi; felles for menigheten via church_settings når ConnectHub er tilgjengelig).
 * - Malene som prosjekter (verktøy `thumbnail-studio`), så bildene de bruker vises som «i bruk» i Dine medier.
 */
export class ThumbRepo {
  private envs = new Map<string, ProjectEnvelope<TplDoc>>()
  private projects: ProjectService
  private settings: { get<T>(key: string): Promise<T | undefined>; set(key: string, value: unknown): Promise<void> }

  constructor(projects: ProjectService, settings: ThumbRepo['settings']) {
    this.projects = projects
    this.settings = settings
  }

  async loadCats(): Promise<Category[] | null> {
    const raw = await this.settings.get<unknown[]>(CATS_KEY)
    if (!Array.isArray(raw) || !raw.length) return null
    return raw.map((c) => cleanCategory(c, keepLocal)).filter((c): c is Category => !!c)
  }

  saveCats(cats: readonly Category[]): Promise<void> {
    return this.settings.set(CATS_KEY, cats)
  }

  async listTpls(): Promise<Template[]> {
    const list = await this.projects.list('thumbnail-studio')
    const out: { t: Template; order: number }[] = []
    for (const p of list) {
      try {
        const env = await this.projects.open(TEMPLATE_SCHEMA, p.id)
        this.envs.set(env.id, env)
        out.push({ t: { id: env.id, catId: env.doc.catId, name: env.name, doc: env.doc.doc, thumb: env.doc.thumb, updated: env.updatedAt }, order: env.doc.order })
      } catch {
        // et prosjekt som ikke kan leses, hoppes over (originalen blir liggende)
      }
    }
    return out.sort((a, b) => a.order - b.order || a.t.updated - b.t.updated).map((x) => x.t)
  }

  /** Lagrer malene i rekkefølge: nye opprettes (får ny ID), endrede lagres, fjernede slettes. → listen med endelige ID-er. */
  async saveTpls(next: readonly Template[], legacy?: ReadonlyMap<string, { source: string; id: string }>): Promise<Template[]> {
    const keep = new Set<string>()
    const out: Template[] = []
    for (let i = 0; i < next.length; i++) {
      const t = next[i] as Template
      const doc: TplDoc = { catId: t.catId, order: i, thumb: t.thumb, doc: t.doc }
      const env = this.envs.get(t.id)
      if (env) {
        const same = env.name === t.name && env.doc.order === i && env.doc.thumb === t.thumb && env.doc.catId === t.catId && JSON.stringify(env.doc.doc) === JSON.stringify(t.doc)
        const saved = same ? env : await this.projects.save(TEMPLATE_SCHEMA, { ...env, name: t.name, doc })
        this.envs.set(saved.id, saved)
        keep.add(saved.id)
        out.push({ ...t, updated: saved.updatedAt })
      } else {
        const lg = legacy?.get(t.id)
        const created = await this.projects.create(TEMPLATE_SCHEMA, t.name, doc, { createdAt: t.updated || Date.now(), ...(lg ? { legacy: lg } : {}) })
        this.envs.set(created.id, created)
        keep.add(created.id)
        out.push({ ...t, id: created.id, updated: created.updatedAt })
      }
    }
    for (const id of [...this.envs.keys()]) {
      if (keep.has(id)) continue
      await this.projects.remove(id as ProjectId)
      this.envs.delete(id)
    }
    return out
  }
}
