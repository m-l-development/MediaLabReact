import type { AssetService } from '../assets/asset-service'

export interface LegacyShareSource {
  /** Elementene i dagens delte mappe (bare lesing). */
  read(): Promise<{ id: string; name: string; created: number; blob: Blob }[]>
}

export interface ImportLog {
  get(key: string): Promise<string | undefined>
  set(key: string, value: string): Promise<void>
}

export interface ImportResult {
  imported: number
  skipped: number
  failed: { name: string; reason: string }[]
}

const logKey = (id: string) => `medialab-share:${id}`

/**
 * Kopierer filene fra dagens delte mappe inn i det nye mediebiblioteket (docs/migration-plan.md):
 * kopi – aldri flytting eller sletting, idempotent (allerede importerte hoppes over), og én feil stopper ikke resten.
 */
export function createShareImport(assets: AssetService, source: LegacyShareSource, log: ImportLog) {
  return {
    async pending(): Promise<number> {
      const items = await source.read()
      let n = 0
      for (const item of items) if (!(await log.get(logKey(item.id)))) n++
      return n
    },

    async run(onProgress?: (done: number, total: number) => void): Promise<ImportResult> {
      const items = await source.read()
      const result: ImportResult = { imported: 0, skipped: 0, failed: [] }
      let done = 0
      for (const item of items) {
        if (await log.get(logKey(item.id))) {
          result.skipped++
        } else {
          try {
            const asset = await assets.register(item.blob, {
              name: item.name,
              createdAt: item.created,
              legacy: { source: 'medialab-share', id: item.id },
            })
            await log.set(logKey(item.id), asset.id)
            result.imported++
          } catch (e) {
            result.failed.push({ name: item.name, reason: e instanceof Error ? e.message : String(e) })
          }
        }
        onProgress?.(++done, items.length)
      }
      return result
    },
  }
}

export type ShareImport = ReturnType<typeof createShareImport>
