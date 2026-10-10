import type { Me } from '../../domain/account'
import { parseMe } from '../../domain/account'
import { localStore } from '../../shared/lib/storage'
import type { Session } from './types'

/**
 * Hurtigbuffer for whoami, delt med dagens app (samme nøkkel og format som media-lab/src/services/me-cache.js).
 * Gjelder bare samme innlogging (bruker + økt + sikkerhetsnivå) og gir ingen tilgang – databasen kontrollerer alt.
 */
export const ME_CACHE_KEY = 'ch.me'
const MAX_AGE = 12 * 3600e3

export const sessionKey = (s: Session | null): string | null =>
  s && s.userId && s.sessionId ? [s.userId, s.sessionId, s.aal ?? ''].join('|') : null

export function readMe(s: Session | null, now = Date.now()): Me | null {
  const k = sessionKey(s)
  if (!k) return null
  try {
    const raw: unknown = JSON.parse(localStore.get(ME_CACHE_KEY) ?? 'null')
    if (!raw || typeof raw !== 'object') return null
    const c = raw as { k?: unknown; at?: unknown; me?: unknown }
    if (c.k !== k || typeof c.at !== 'number' || now - c.at >= MAX_AGE) return null
    const parsed = parseMe(c.me)
    return parsed.ok ? parsed.value : null
  } catch {
    return null
  }
}

export function writeMe(s: Session | null, me: Me | null, now = Date.now()): void {
  const k = sessionKey(s)
  if (!k || !me) return
  localStore.set(ME_CACHE_KEY, JSON.stringify({ k, at: now, me }))
}

export function clearMe(): void {
  localStore.remove(ME_CACHE_KEY)
}

const canon = (v: unknown): unknown =>
  Array.isArray(v)
    ? v.map(canon).map((x) => JSON.stringify(x)).sort().map((x) => JSON.parse(x) as unknown)
    : v && typeof v === 'object'
      ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon((v as Record<string, unknown>)[k])]))
      : v

/** Samme innhold uavhengig av rekkefølge i listene. */
export const sameMe = (a: Me | null, b: Me | null): boolean => JSON.stringify(canon(a)) === JSON.stringify(canon(b))
