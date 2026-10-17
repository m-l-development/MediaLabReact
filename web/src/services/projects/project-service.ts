import { newId, type AssetId, type ProjectId } from '../../domain/ids'
import { migrateDoc, validateEnvelope, type Migration, type ProjectEnvelope } from '../../domain/project'
import type { ToolId } from '../../domain/tool'
import type { Validation } from '../../domain/validation'
import { createStore, type Store } from '../../shared/lib/store'
import { ServiceError } from '../errors'
import type { ProjectRepository } from './types'

/** Hvert verktøy beskriver sitt dokumentformat én gang. */
export interface ProjectSchema<TDoc> {
  tool: ToolId
  version: number
  /** `migrations[n]` løfter et dokument fra versjon n til n + 1. */
  migrations: Readonly<Record<number, Migration>>
  validate(doc: unknown): Validation<TDoc>
  /** Alle assets dokumentet bruker (for «i bruk»-kontroll, eksport og opprydding). */
  assetsOf(doc: TDoc): AssetId[]
}

export interface ProjectService {
  revision: Store<number>
  create<TDoc>(schema: ProjectSchema<TDoc>, name: string, doc: TDoc, opts?: { legacy?: ProjectEnvelope['legacy']; createdAt?: number }): Promise<ProjectEnvelope<TDoc>>
  open<TDoc>(schema: ProjectSchema<TDoc>, id: ProjectId): Promise<ProjectEnvelope<TDoc>>
  save<TDoc>(schema: ProjectSchema<TDoc>, project: ProjectEnvelope<TDoc>): Promise<ProjectEnvelope<TDoc>>
  list(tool: ToolId): Promise<ProjectEnvelope[]>
  rename(id: ProjectId, name: string): Promise<void>
  duplicate(id: ProjectId, name: string): Promise<ProjectEnvelope>
  remove(id: ProjectId): Promise<void>
}

export function createProjectService(repo: ProjectRepository, now: () => number = Date.now): ProjectService {
  const revision = createStore(0)
  const bump = () => revision.set((n) => n + 1)

  function checkDoc<TDoc>(schema: ProjectSchema<TDoc>, doc: unknown): TDoc {
    const r = schema.validate(doc)
    if (!r.ok) throw new ServiceError('invalid_project', r.errors.slice(0, 5).join('; '))
    return r.value
  }

  async function write<TDoc>(schema: ProjectSchema<TDoc>, p: ProjectEnvelope<TDoc>): Promise<ProjectEnvelope<TDoc>> {
    const doc = checkDoc(schema, p.doc)
    const next: ProjectEnvelope<TDoc> = { ...p, doc, schemaVersion: schema.version, assets: [...new Set(schema.assetsOf(doc))] }
    const env = validateEnvelope(next)
    if (!env.ok) throw new ServiceError('invalid_project', env.errors.join('; '))
    await repo.put(next as ProjectEnvelope)
    bump()
    return next
  }

  return {
    revision,

    async create(schema, name, doc, opts = {}) {
      const t = now()
      return write(schema, {
        format: 'medialab.project', formatVersion: 1, id: newId<ProjectId>(), tool: schema.tool,
        schemaVersion: schema.version, name: name.trim() || 'Uten navn', createdAt: opts.createdAt ?? t, updatedAt: t,
        scope: 'personal', doc, assets: [], ...(opts.legacy ? { legacy: opts.legacy } : {}),
      })
    },

    async open(schema, id) {
      const raw = await repo.get(id)
      if (!raw) throw new ServiceError('not_found', 'Prosjektet finnes ikke.')
      const env = validateEnvelope(raw)
      if (!env.ok) throw new ServiceError('invalid_project', env.errors.join('; '))
      if (env.value.tool !== schema.tool) throw new ServiceError('wrong_tool')
      // Migreringen gjøres i minnet; lagres først når brukeren lagrer (originalen er urørt til da).
      const doc = migrateDoc(env.value.doc, env.value.schemaVersion, schema.version, schema.migrations)
      return { ...env.value, schemaVersion: schema.version, doc: checkDoc(schema, doc) }
    },

    async save(schema, project) {
      return write(schema, { ...project, updatedAt: Math.max(now(), project.createdAt) })
    },

    async list(tool) {
      return (await repo.list(tool)).sort((a, b) => b.updatedAt - a.updatedAt)
    },

    async rename(id, name) {
      const p = await repo.get(id)
      if (!p) throw new ServiceError('not_found')
      await repo.put({ ...p, name: name.trim() || p.name, updatedAt: now() })
      bump()
    },

    async duplicate(id, name) {
      const p = await repo.get(id)
      if (!p) throw new ServiceError('not_found')
      const t = now()
      const copy: ProjectEnvelope = { ...structuredClone(p), id: newId<ProjectId>(), name, createdAt: t, updatedAt: t }
      delete copy.legacy
      await repo.put(copy)
      bump()
      return copy
    },

    async remove(id) {
      await repo.delete(id)
      bump()
    },
  }
}
