import { isUuid, type AssetId, type ProjectId } from './ids'
import { isToolId, type ToolId } from './tool'
import { array, literal, number, object, optional, refine, string, unknownValue, type Validation } from './validation'

/** Konvolutt rundt alle prosjekter, uavhengig av verktøy. Se docs/media-model.md §6. */
export interface ProjectEnvelope<TDoc = unknown> {
  format: 'medialab.project'
  formatVersion: 1
  id: ProjectId
  tool: ToolId
  /** Versjon av verktøyets dokumentformat; migreres ved åpning. */
  schemaVersion: number
  name: string
  createdAt: number
  updatedAt: number
  scope: 'personal' | 'church'
  doc: TDoc
  /** Alle assets dokumentet refererer til (for opprydding, eksport og «i bruk»-kontroll). */
  assets: AssetId[]
  legacy?: { source: string; id: string }
}

const envelope = object({
  format: literal('medialab.project'),
  formatVersion: literal(1),
  id: refine(string, isUuid, 'ugyldig ID'),
  tool: refine(string, isToolId, 'ukjent verktøy'),
  schemaVersion: refine(number, (n) => Number.isInteger(n) && n >= 1, 'må være et heltall ≥ 1'),
  name: string,
  createdAt: number,
  updatedAt: number,
  scope: literal('personal', 'church'),
  doc: unknownValue,
  assets: array(refine(string, isUuid, 'ugyldig asset-ID')),
  legacy: optional(object({ source: string, id: string })),
})

export function validateEnvelope(input: unknown): Validation<ProjectEnvelope> {
  const r = envelope(input, 'prosjekt')
  if (!r.ok) return r
  if (r.value.updatedAt < r.value.createdAt) return { ok: false, errors: ['prosjekt.updatedAt: er før createdAt'] }
  return { ok: true, value: r.value as ProjectEnvelope }
}

/** Én migrering løfter et dokument fra versjon n til n + 1. */
export type Migration = (doc: unknown) => unknown

export class MigrationError extends Error {
  readonly fromVersion: number
  constructor(fromVersion: number, cause: unknown, message?: string) {
    super(message ?? `Prosjektet kunne ikke oppgraderes fra versjon ${fromVersion}.`, { cause })
    this.name = 'MigrationError'
    this.fromVersion = fromVersion
  }
}

/**
 * Kjører migreringene i rekkefølge fram til gjeldende versjon. Originalen endres ikke (migreringer får en kopi).
 * `migrations[n]` løfter fra versjon n til n + 1.
 */
export function migrateDoc(
  doc: unknown,
  fromVersion: number,
  currentVersion: number,
  migrations: Readonly<Record<number, Migration>>,
): unknown {
  if (fromVersion > currentVersion) {
    throw new MigrationError(fromVersion, null, 'Prosjektet er laget med en nyere versjon av appen. Last inn siden på nytt for å få siste versjon.')
  }
  let value: unknown = structuredClone(doc)
  for (let v = fromVersion; v < currentVersion; v++) {
    const step = migrations[v]
    if (!step) throw new MigrationError(v, new Error(`Mangler migrering fra versjon ${v}.`))
    try {
      value = step(value)
    } catch (e) {
      throw new MigrationError(v, e)
    }
  }
  return value
}
