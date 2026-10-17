import { isUuid, type AssetId, type ProjectId } from '../../domain/ids'
import type { ProjectEnvelope } from '../../domain/project'
import type { Validation } from '../../domain/validation'
import type { ProjectSchema, ProjectService } from '../../services/projects/project-service'
import { normalize, totalDur, type Project } from './engine/model'

/** Lagret prosjekt: tidslinjen i samme format som dagens app (med miniatyr). */
export interface MdStored { project: Project }

/** Et prosjekt i oversikten. */
export interface MdEntry { id: string; name: string; fmt: string; w: number; h: number; dur: number; updated: number; thumb: string; docId: string }

/** Mediefiler i et prosjekt har ID-en `m-<AssetId>` (felles mediebibliotek). */
export const mediaIdOf = (asset: AssetId): string => `m-${asset}`
export function assetOf(mediaId: string): AssetId | null {
  const id = mediaId.startsWith('m-') ? mediaId.slice(2) : ''
  return isUuid(id) ? (id as AssetId) : null
}
export const assetIdsOf = (p: Project): AssetId[] => p.media.map((m) => assetOf(m.id)).filter((x): x is AssetId => !!x)

export const PROJECT_SCHEMA: ProjectSchema<MdStored> = {
  tool: 'motion-design',
  version: 1,
  migrations: {},
  validate(input: unknown): Validation<MdStored> {
    try {
      const p = (input as { project?: unknown } | null)?.project
      return { ok: true, value: { project: normalize(p) } }
    } catch {
      return { ok: false, errors: ['motion: ugyldig prosjekt'] }
    }
  },
  assetsOf: (s) => assetIdsOf(s.project),
}

/** Prosjektene i brukerens database (verktøy `motion-design`). */
export class MdRepo {
  private projects: ProjectService
  private envs = new Map<string, ProjectEnvelope<MdStored>>()

  constructor(projects: ProjectService) {
    this.projects = projects
  }

  async list(): Promise<MdEntry[]> {
    const rows = await this.projects.list('motion-design')
    const out: MdEntry[] = []
    for (const r of rows) {
      try {
        const env = await this.projects.open(PROJECT_SCHEMA, r.id)
        this.envs.set(env.id, env)
        const p = env.doc.project
        out.push({ id: env.id, name: env.name, fmt: p.fmt, w: p.w, h: p.h, dur: totalDur(p), updated: env.updatedAt, thumb: p.thumb, docId: p.id })
      } catch {
        // et prosjekt som ikke kan leses, hoppes over (originalen blir liggende)
      }
    }
    return out.sort((a, b) => b.updated - a.updated)
  }

  async open(id: string): Promise<Project> {
    const env = this.envs.get(id) ?? (await this.projects.open(PROJECT_SCHEMA, id as ProjectId))
    this.envs.set(env.id, env)
    return structuredClone(env.doc.project)
  }

  /** Lagrer (oppretter første gang). → prosjektets ID. */
  async save(projectId: string | null, p: Project, opts: { legacy?: { source: string; id: string }; createdAt?: number } = {}): Promise<string> {
    const env = projectId ? this.envs.get(projectId) : undefined
    if (env) {
      const saved = await this.projects.save(PROJECT_SCHEMA, { ...env, name: p.name || 'Uten navn', doc: { project: p } })
      this.envs.set(saved.id, saved)
      return saved.id
    }
    const created = await this.projects.create(PROJECT_SCHEMA, p.name || 'Uten navn', { project: p }, { ...(opts.legacy ? { legacy: opts.legacy } : {}), ...(opts.createdAt ? { createdAt: opts.createdAt } : {}) })
    this.envs.set(created.id, created)
    return created.id
  }

  async remove(id: string): Promise<void> {
    await this.projects.remove(id as ProjectId)
    this.envs.delete(id)
  }

  /** Prosjektet som ble laget fra et prosjekt i dagens app med denne ID-en. */
  findLegacy(id: string): string | null {
    for (const e of this.envs.values()) if (e.legacy?.source === 'motiondesign' && e.legacy.id === id) return e.id
    return null
  }

  /** Prosjektet med dette dokument-ID-et (f.eks. ved åpning av samme prosjektmappe igjen). */
  findDoc(docId: string): string | null {
    for (const e of this.envs.values()) if (e.doc.project.id === docId) return e.id
    return null
  }
}
