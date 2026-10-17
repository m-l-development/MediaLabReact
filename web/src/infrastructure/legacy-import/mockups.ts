import { localStore } from '../../shared/lib/storage'
import { openExisting, readAll } from '../idb/idb'
import { legacyName } from './local-user'

/** Egne mockup-bilder i dagens app (IndexedDB `mockuplib`, lager `imgs`). Bare lesing. */
export interface LegacyMockup { id: string; name: string; file: string; blob: Blob; t: number }

export async function readLegacyMockups(userId: string | null, factory?: IDBFactory): Promise<LegacyMockup[]> {
  const db = await openExisting(legacyName('mockuplib', userId), factory)
  if (!db) return []
  try {
    const rows = await readAll<Partial<LegacyMockup>>(db, 'imgs')
    const items = await Promise.all(rows.map(async (r) => {
      const b = r.blob as unknown as { size?: number; type?: string; arrayBuffer?: () => Promise<ArrayBuffer> } | undefined
      if (typeof r.id !== 'string' || !b || typeof b.arrayBuffer !== 'function') return null
      const blob = b instanceof Blob ? b : new Blob([await b.arrayBuffer()], { type: b.type || 'image/jpeg' })
      return { id: r.id, name: String(r.name ?? 'Mockup'), file: String(r.file ?? r.name ?? ''), blob, t: Number(r.t ?? 0) }
    }))
    return items.filter((x): x is LegacyMockup => !!x).sort((a, b) => a.t - b.t)
  } finally {
    db.close()
  }
}

/**
 * Innstillingene per mockup (hjørner, zoom, skygger …). Samme nøkkel og format som dagens app (`mockups.settings`,
 * per bruker), så justeringene følger med mellom gammel og ny app.
 */
export function mockupSettingsKey(userId: string | null): string {
  return legacyName('mockups.settings', userId)
}

export function readMockupSettings(userId: string | null): Record<string, unknown> {
  try {
    const v: unknown = JSON.parse(localStore.get(mockupSettingsKey(userId)) ?? '{}')
    return v && typeof v === 'object' ? (v as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

export function writeMockupSettings(userId: string | null, all: Record<string, unknown>): void {
  localStore.set(mockupSettingsKey(userId), JSON.stringify(all))
}
