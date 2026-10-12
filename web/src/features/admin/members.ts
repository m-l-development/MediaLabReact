import type { AdminService, Membership, RoleRow } from '../../services/admin'

/**
 * Medlemskap i ConnectHub Admin: felles regler, tekster og bekreftelser, som media-lab/src/pages/connecthub-admin/members.js.
 * Rettighetene avgjøres uansett av databasen (én menighet om gangen for User/Admin, remove_membership, RLS).
 * `t` er oversettelsen (norsk kilde); hele setninger med plassholdere, så oversettelsen aldri er løsrevne ordbiter.
 */
type T = (s: string) => string
const same: T = (s) => s
export const fill = (t: string, v: Record<string, string | number>): string => t.replace(/\{(\w+)\}/g, (m, k: string) => (k in v ? String(v[k]) : m))

type R = Pick<RoleRow, 'role' | 'church_id'> & { id?: string; revoked_at?: string | null }

/** Developer og Moderator kan være medlem av flere menigheter; alle andre bare én om gangen. */
export const isGlobal = (roles: R[]): boolean => roles.some((r) => !r.church_id && (r.role === 'developer' || r.role === 'moderator') && !r.revoked_at)
export const activeOf = <M extends Pick<Membership, 'user_id' | 'status'>>(ms: M[], userId: string): M[] => ms.filter((m) => m.user_id === userId && m.status === 'active')

/** «Developer», «Moderator», «Admin i X», ellers «Bruker». */
export function roleSummary(roles: R[], churchName: (id: string | null) => string, t: T = same): string {
  const rs = roles.filter((r) => !r.revoked_at)
  const parts: string[] = []
  if (rs.some((r) => r.role === 'developer' && !r.church_id)) parts.push(t('Developer'))
  if (rs.some((r) => r.role === 'moderator' && !r.church_id)) parts.push(t('Moderator'))
  rs.filter((r) => r.role === 'church_admin').forEach((r) => parts.push(fill(t('Admin i {church}'), { church: churchName(r.church_id) })))
  return parts.length ? parts.join(', ') : t('Bruker')
}

export function canJoinAnother(roles: R[], ms: Pick<Membership, 'user_id' | 'church_id' | 'status'>[], userId: string, churchName: (id: string) => string, t: T = same): { ok: true } | { ok: false; reason: string } {
  if (isGlobal(roles)) return { ok: true }
  const act = activeOf(ms, userId)
  if (!act[0]) return { ok: true }
  return { ok: false, reason: fill(t('En bruker kan bare være medlem av én menighet om gangen. Fjern brukeren fra {church} først.'), { church: churchName(act[0].church_id) }) }
}

/** Den siste globale rollen kan ikke fjernes når brukeren har flere aktive medlemskap (databasen: CH004). */
export const roleBlocked = (globalRoles: R[], r: R, activeCount: number): boolean =>
  !globalRoles.some((g) => g.id !== r.id && !g.revoked_at && (g.role === 'developer' || g.role === 'moderator')) && activeCount > 1

/** Fornavn/etternavn: de lagrede feltene, ellers et forslag ut fra visningsnavnet (siste ord = etternavn). */
export function splitName(u: { first_name?: string | null; last_name?: string | null; full_name?: string | null } | null): { first: string; last: string } {
  if (!u) return { first: '', last: '' }
  if (u.first_name || u.last_name) return { first: u.first_name || '', last: u.last_name || '' }
  const parts = (u.full_name || '').trim().split(/\s+/).filter(Boolean)
  return parts.length > 1 ? { first: parts.slice(0, -1).join(' '), last: parts[parts.length - 1] ?? '' } : { first: parts[0] || '', last: '' }
}
/** Kontrolltegn (0–31, 127) eller < > – samme tegn som databasen avviser. */
const CONTROL = { test: (s: string) => [...s].some((c) => { const n = c.charCodeAt(0); return n < 32 || n === 127 || c === '<' || c === '>' }) }
/** Samme regler som databasen (set_user_name): minst ett felt, høyst 60 tegn, ingen kontrolltegn eller < >. */
export function nameError(first: string, last: string): string | null {
  const f = first.trim(), l = last.trim()
  if (!f && !l) return 'Skriv fornavn eller etternavn.'
  if (f.length > 60 || l.length > 60) return 'Navnet er for langt (maks 60 tegn).'
  if (CONTROL.test(f + l)) return 'Navnet inneholder ugyldige tegn.'
  return null
}
export function welcomeName(me: { first_name?: string | null; last_name?: string | null; full_name?: string | null; email?: string } | null): string {
  if (!me) return ''
  const fl = [me.first_name, me.last_name].map((x) => (x || '').trim()).filter(Boolean).join(' ')
  return fl || (me.full_name || '').trim() || (me.email || '').split('@')[0] || ''
}
/** Developer > Moderator > Admin > Bruker. */
export function mainRole(roles: R[]): string {
  const rs = roles.filter((r) => !r.revoked_at)
  return rs.some((r) => r.role === 'developer') ? 'Developer' : rs.some((r) => r.role === 'moderator') ? 'Moderator' : rs.some((r) => r.role === 'church_admin') ? 'Admin' : 'Bruker'
}

export function removeConfirmText({ name, church, isAdmin }: { name: string; church: string; isAdmin: boolean }, t: T = same): string {
  const lines = [fill(t('Fjerne {name} fra {church}?'), { name, church }), '',
    t('Brukeren mister med en gang tilgang til menighetens filer, data og funksjoner. Kontoen slettes ikke, og historikken beholdes. Brukeren kan inviteres på nytt senere.')]
  if (isAdmin) lines.push('', fill(t('{name} er Admin i {church}. Admin-rollen fjernes også, og menigheten står uten Admin til Developer eller Moderator utnevner en ny.'), { name, church }))
  return lines.join('\n')
}

/** Avbrutt av brukeren (ingen feilmelding vises). */
export class Cancelled extends Error {
  readonly code = 'cancel'
}
export const ask = (text: string, confirm: (s: string) => boolean = (s) => window.confirm(s)): void => {
  if (!confirm(text)) throw new Cancelled('cancel')
}

export interface MemberTarget { userId: string; churchId: string; name: string; church: string; isAdmin: boolean; roleId?: string | null }
/** Handlinger med bekreftelse. Returnerer meldingen som skal vises når handlingen er lagret. */
export function memberActions(admin: AdminService, t: T = same, confirm: (s: string) => boolean = (s) => window.confirm(s)) {
  return {
    async remove({ userId, churchId, name, church, isAdmin }: MemberTarget): Promise<string> {
      ask(removeConfirmText({ name, church, isAdmin }, t), confirm)
      const r = await admin.removeMembership(userId, churchId, 'Fjernet i ConnectHub Admin', isAdmin)
      return fill(t('{name} er fjernet fra {church}.'), { name, church })
        + (r?.admin_role_revoked ? ' ' + t('Menigheten har nå ingen Admin.') : '')
        + (r?.active_memberships_left === 0 ? ' ' + t('Brukeren har nå ingen aktiv menighet.') : '')
    },
    async disable({ userId, churchId, name, church }: MemberTarget): Promise<string> {
      ask(fill(t('Deaktivere {name} midlertidig i {church}?'), { name, church }) + '\n\n' + t('Brukeren mister tilgang til menigheten til medlemskapet aktiveres igjen. Ingenting slettes.'), confirm)
      await admin.setMembershipStatus(userId, churchId, 'disabled')
      return t('Medlemskapet er deaktivert.')
    },
    async revokeAdmin({ roleId, name, church }: MemberTarget): Promise<string> {
      ask(fill(t('Fjerne Admin-rollen fra {name} i {church}?'), { name, church }) + '\n\n' + t('Brukeren blir vanlig medlem. Menigheten står uten Admin til en ny utnevnes.'), confirm)
      if (roleId) await admin.revokeRole(roleId, 'Admin-siden')
      return t('Admin-rollen er fjernet.')
    },
  }
}
