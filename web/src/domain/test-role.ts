import { hasRole, type Me } from './account'

/**
 * Testrolle / rollebytter (PLT-16), samme regler som media-lab/src/shared/test-role.js:
 * - Bare i lokal utvikling og Preview mot utviklingsprosjektet, aldri i produksjon (to uavhengige kontroller).
 * - Endrer bare hva grensesnittet viser («se siden som»). Kan bare SENKE rollen (Developer → Moderator/Admin/User,
 *   Admin → User) og gir aldri flere rettigheter: serveren og RLS bruker alltid den ekte innloggingen.
 */
export const VIEWS = ['developer', 'moderator', 'admin', 'user'] as const
export type View = (typeof VIEWS)[number]
export const TEST_ROLE_KEY = 'ch.testRole'
export const VIEW_LABEL: Record<View, string> = { developer: 'Developer', moderator: 'Moderator', admin: 'Admin', user: 'User' }

export const switcherAllowed = (backend: { target: string; projectRef: string } | null, devRef: string | null): boolean =>
  !!backend && backend.target !== 'production' && !!devRef && backend.projectRef === devRef

export const realView = (me: Me): View =>
  hasRole(me, 'developer') ? 'developer' : hasRole(me, 'moderator') ? 'moderator' : hasRole(me, 'church_admin') ? 'admin' : 'user'

/** Visningene brukeren kan velge: bare roller man faktisk har (Developer dekker alle), pluss User. Moderator får ingen. */
export function allowedViews(me: Me | null): View[] {
  if (!me) return []
  const dev = hasRole(me, 'developer'), list: View[] = []
  if (!dev && hasRole(me, 'moderator')) return []
  if (dev) list.push('developer', 'moderator')
  if (dev || hasRole(me, 'church_admin')) list.push('admin')
  return list.length ? [...list, 'user'] : []
}

/** «me» slik grensesnittet skal se den i valgt visning. Ugyldig eller ikke tillatt valg → ekte «me». */
export function effectiveMe(me: Me, view: string | null): Me {
  if (!view || !(allowedViews(me) as string[]).includes(view) || view === realView(me)) return me
  if (view === 'user') return { ...me, roles: [] }
  if (view === 'moderator') return { ...me, roles: [{ role: 'moderator', church_id: null }] }
  // Admin-visning: egne admin-roller, ellers (for stab) som admin i menighetene man er medlem av
  const admins = me.roles.filter((r) => r.role === 'church_admin')
  return { ...me, roles: admins.length ? admins : me.churches.map((c) => ({ role: 'church_admin', church_id: c.id })) }
}
