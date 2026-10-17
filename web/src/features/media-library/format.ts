import type { Asset } from '../../domain/asset'

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 ** 2) return `${Math.round(n / 1024)} KB`
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`
  return `${(n / 1024 ** 3).toFixed(2)} GB`
}

function formatDuration(s: number): string {
  const t = Math.round(s)
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`
}

export function describe(a: Asset): string {
  const parts: string[] = []
  if (a.meta.width && a.meta.height) parts.push(`${a.meta.width}×${a.meta.height}`)
  if (a.meta.duration) parts.push(formatDuration(a.meta.duration))
  parts.push(formatBytes(a.content.size))
  return parts.join(' · ')
}

/**
 * Stor samling i Dine medier (SHR-01, godkjent 2026-10-12): ingenting slettes automatisk, men brukeren varsles.
 * Dagens delte mappe slettet i stedet de eldste filene over 60 uten å spørre.
 */
export const LARGE_COUNT = 300
export const LARGE_BYTES = 2e9
export const QUOTA_WARN = 0.8

export interface LibrarySummary {
  count: number
  /** Plass i nettleseren: hvert innhold telles én gang, og bare det som faktisk ligger lokalt. */
  bytes: number
  warn: 'count' | 'bytes' | 'quota' | null
  /** Andel av nettleserens kvote som er brukt (0–1), når nettleseren oppgir den. */
  quotaShare: number | null
}

export function librarySummary(all: readonly Asset[], estimate?: { usage?: number | undefined; quota?: number | undefined }): LibrarySummary {
  const seen = new Set<string>()
  let bytes = 0
  for (const a of all) {
    if (!a.locations.some((l) => l.type === 'local') || seen.has(a.content.hash)) continue
    seen.add(a.content.hash)
    bytes += a.content.size
  }
  const quotaShare = estimate?.usage != null && estimate.quota ? estimate.usage / estimate.quota : null
  const warn = quotaShare != null && quotaShare >= QUOTA_WARN ? 'quota' : bytes >= LARGE_BYTES ? 'bytes' : all.length >= LARGE_COUNT ? 'count' : null
  return { count: all.length, bytes, warn, quotaShare }
}
