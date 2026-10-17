import { localStore } from '../shared/lib/storage'

/**
 * Kontovelger på innloggingssiden (AUTH-06), som media-lab/src/shared/saved-accounts.js: lagrede kontoer på denne enheten
 * (valgfritt, «Husk denne kontoen»). BARE e-post, navn og initialer (localStorage `ch.accounts`, høyst 5) – aldri passord,
 * tokens eller roller. Innloggingen går alltid gjennom passord (og MFA).
 */
export interface SavedAccount { email: string; name: string; initials: string; last: number }
const KEY = 'ch.accounts'
const MAX = 5

function read(): SavedAccount[] {
  try {
    const v: unknown = JSON.parse(localStore.get(KEY) ?? '[]')
    return Array.isArray(v) ? v.filter((a): a is SavedAccount => !!a && typeof (a as SavedAccount).email === 'string') : []
  } catch {
    return []
  }
}
const write = (list: SavedAccount[]) => void localStore.set(KEY, JSON.stringify(list.slice(0, MAX)))

export const initialsOf = (s: string): string =>
  (s || '?').trim().split(/[\s@.]+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '?'

export const savedAccounts = (): SavedAccount[] => read().sort((a, b) => (b.last || 0) - (a.last || 0))

export function rememberAccount({ email, name }: { email: string; name: string | null }): void {
  const e = email.trim().toLowerCase()
  if (!e) return
  const n = (name ?? '').trim().slice(0, 80) || e
  write([{ email: e, name: n, initials: initialsOf(n), last: Date.now() }, ...read().filter((a) => a.email !== e)])
}

export function forgetAccount(email: string): void {
  const e = email.toLowerCase()
  write(read().filter((a) => a.email !== e))
}
