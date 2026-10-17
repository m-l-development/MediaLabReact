import type { ChurchId, UserId } from './ids'
import { array, boolean, isRecord, nullable, object, optional, string, type Validation } from './validation'

/** Svar fra `public.whoami()` (supabase/migrations). `null` = ikke koblet eller deaktivert. */
export type Role = 'developer' | 'moderator' | 'church_admin'

export interface Me {
  id: UserId
  email: string
  full_name: string | null
  first_name: string | null
  last_name: string | null
  phone: string | null
  mfa: boolean
  roles: { role: Role | string; church_id: ChurchId | null }[]
  /** legacy_defaults: menigheten fantes før Livets Ord-standardene ble avgrenset (docs/ny-menighet-standardinnhold.md). */
  churches: { id: ChurchId; name: string; logo_file_id: string | null; legacy_defaults?: boolean }[]
}

const optText = optional(nullable(string))

const me = object({
  id: string,
  email: string,
  full_name: optText,
  first_name: optText,
  last_name: optText,
  phone: optText,
  mfa: optional(boolean),
  roles: array(object({ role: string, church_id: optText })),
  churches: array(object({ id: string, name: string, logo_file_id: optText, legacy_defaults: optional(boolean) })),
})

export function parseMe(input: unknown): Validation<Me | null> {
  if (input === null || input === undefined) return { ok: true, value: null }
  if (!isRecord(input)) return { ok: false, errors: ['whoami: forventet objekt'] }
  const r = me(input, 'whoami')
  if (!r.ok) return r
  const v = r.value
  return {
    ok: true,
    value: {
      id: v.id as UserId,
      email: v.email,
      full_name: v.full_name ?? null,
      first_name: v.first_name ?? null,
      last_name: v.last_name ?? null,
      phone: v.phone ?? null,
      mfa: v.mfa ?? false,
      roles: v.roles.map((x) => ({ role: x.role, church_id: (x.church_id ?? null) as ChurchId | null })),
      churches: v.churches.map((c) => ({ id: c.id as ChurchId, name: c.name, logo_file_id: c.logo_file_id ?? null, ...(typeof c.legacy_defaults === 'boolean' ? { legacy_defaults: c.legacy_defaults } : {}) })),
    },
  }
}

// Samme regler som media-lab/src/services/data/me.js. Rettighetene håndheves uansett av databasen (RLS).
export const hasRole = (m: Me | null, role: Role, churchId?: ChurchId | null): boolean =>
  !!m && m.roles.some((r) => r.role === role && (churchId == null || r.church_id === churchId))
export const isStaff = (m: Me | null) => hasRole(m, 'developer') || hasRole(m, 'moderator')
export const isDeveloper = (m: Me | null) => hasRole(m, 'developer')
export const isCollabAdmin = (m: Me | null) => hasRole(m, 'moderator') || hasRole(m, 'developer')
export const isChurchAdmin = (m: Me | null, churchId: ChurchId) => hasRole(m, 'church_admin', churchId)
export const canAdmin = (m: Me | null) => isStaff(m) || hasRole(m, 'church_admin')

export function displayName(m: Me): string {
  return m.full_name || [m.first_name, m.last_name].filter(Boolean).join(' ') || m.email
}

export function initials(m: Me): string {
  const parts = displayName(m).split(/[\s@.]+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?'
}
