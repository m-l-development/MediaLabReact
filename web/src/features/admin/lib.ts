import { useEffect, useState, useSyncExternalStore } from 'react'
import { ServiceError } from '../../services/errors'
import type { FilesService } from '../../services/files'
import { useLang } from '../../shared/i18n/i18n'
import { trAdmin } from './texts'

/** Hjelpere for ConnectHub Admin (tekster, formatering, feilmeldinger, ruting og logoer), portert fra dagens ui.jsx og sections.jsx. */
export function useAdminT(): (s: string) => string {
  const lang = useLang()
  return (s: string) => trAdmin(lang, s)
}

const ERR: Record<string, string> = {
  forbidden: 'Du har ikke tilgang til dette.', conflict: 'Finnes allerede (eller menigheten har allerede en admin).',
  invalid: 'Ugyldige opplysninger.', rate_limited: 'For mange forsøk. Vent litt.', quota_exceeded: 'Lagringskvoten er brukt opp.', network: 'Ingen forbindelse. Prøv igjen.',
  unauthorized: 'Økten er utløpt. Last siden på nytt.', timeout: 'Serveren svarte ikke i tide. Prøv igjen.', upstream_timeout: 'Databasen eller lagringen svarte ikke i tide. Prøv igjen.', not_found: 'Fant ikke det du lette etter.',
  video_not_allowed: 'Video kan aldri lastes opp. Videoer skal ligge i prosjektmappen på PC-en.', type_not_allowed: 'Bare bilder (PNG, JPG, WebP eller GIF) kan lastes opp.',
  storage_full: 'Lagringsplassen i ConnectHub er full. Kontakt Developer.',
  private_not_allowed: 'Private opplastinger er ikke lenger mulig. Bildet må deles med menigheten.',
  file_in_use: 'Bildet brukes i menighetens grunnoppsett (Loop Studio eller Thumbnail Studio) eller som menighetens logo, og kan ikke slettes. Fjern det derfra først.',
  already_member_elsewhere: 'Brukeren er allerede medlem av en annen menighet. En bruker kan bare være medlem av én menighet om gangen – fjern brukeren fra den andre menigheten først.',
  request_handled: 'Forespørselen er allerede behandlet. Last siden på nytt for å se status.',
  staff_use_request: 'Developer og Moderator får Admin-tilgang i en menighet bare via «Send forespørsel om midlertidig admin-tilgang», som menighetens Admin godkjenner.',
  member_limit: 'Menigheten har nådd grensen for antall brukere (aktive medlemmer og ventende invitasjoner). Fjern en bruker eller trekk tilbake en invitasjon før du inviterer flere. I særtilfeller kan Developer eller Moderator heve grensen.',
  role_blocked_memberships: 'Rollen kan ikke fjernes ennå: brukeren har flere aktive medlemskap. Som User eller Admin kan brukeren bare være medlem av én menighet – fjern medlemskap først.',
  cleanup_not_ready: 'En eller flere av filene kan ikke ryddes (de er i bruk, eller eieren er medlem igjen). Ingenting ble slettet. Last siden på nytt.',
  cleanup_changed: 'Utvalget er endret siden du bekreftet. Ingenting ble slettet. Last siden på nytt og velg igjen.',
  link_exists: 'Det finnes allerede en aktiv kobling mellom disse menighetene. Avslutt den før du gjenåpner en eldre kobling.',
  group_min_members: 'En samarbeidsgruppe må ha minst to menigheter. Avslutt gruppen i stedet.',
  group_full: 'En samarbeidsgruppe kan ha høyst 20 menigheter.',
  group_member_exists: 'Menigheten er allerede med i gruppen.',
  // den nye appens navn på samme databasekoder (services/errors.ts: CH009, CH010)
  group_already_member: 'Menigheten er allerede med i gruppen.',
  account_exists: 'E-postadressen har allerede en konto.',
  has_account: 'E-postadressen har allerede en konto.',
  last_admin: 'Brukeren er Admin i menigheten. Bekreft at menigheten kan stå uten Admin, eller utnevn en ny Admin først.',
  too_large: 'Filen er for stor (maks 30 MB).', http_413: 'Filen er for stor (maks 30 MB).', logo_too_large: 'Logoen er for stor (maks 10 MB).',
  upload_expired: 'Opplastingen tok for lang tid eller er allerede fullført. Prøv igjen.', upload_missing: 'Filen kom ikke frem til lagringen. Prøv igjen.', upload_mismatch: 'Filen ble endret under opplastingen. Prøv igjen.', upload_failed: 'Opplastingen feilet. Prøv igjen.',
}
const CONFIG: Record<string, string> = { publishable_key_missing: 'Serveren mangler den offentlige nøkkelen.', secret_key_missing: 'Serveren mangler den hemmelige nøkkelen.' }
export function errText(e: unknown, t: (s: string) => string): string {
  const code = e instanceof ServiceError ? e.code : (e as { code?: string } | null)?.code
  if (code === 'not_configured') return t('Serveren er ikke satt opp for dette.') + (e instanceof Error && CONFIG[e.message] ? ' ' + t(CONFIG[e.message] ?? '') : '')
  return t(ERR[code ?? ''] ?? 'Noe gikk galt. Prøv igjen.')
}
export const ROLE: Record<string, string> = { user: 'Bruker', church_admin: 'Admin', moderator: 'Moderator', developer: 'Developer' }
export const STATUS: Record<string, string> = { active: 'Aktiv', disabled: 'Deaktivert', removed: 'Fjernet', pending: 'Venter', accepted: 'Godtatt', revoked: 'Trukket tilbake', expired: 'Utløpt', invited: 'Invitert', left: 'Har forlatt', declined: 'Avslått', approved: 'Godkjent', rejected: 'Avslått', withdrawn: 'Trukket tilbake', cancelled: 'Avsluttet', temporarily_disabled: 'Midlertidig deaktivert', pending_deletion: 'Venter på sletting', deleted: 'Slettet' }
export const TONE: Record<string, string> = { removed: '', active: 'ok', accepted: 'ok', approved: 'ok', pending: 'warn', invited: 'warn', temporarily_disabled: 'warn', pending_deletion: 'bad', disabled: 'bad', revoked: '', expired: '', rejected: 'bad', declined: '', left: '', withdrawn: '' }
const locale = () => (document.documentElement.lang === 'en' ? 'en-GB' : 'nb-NO')
export const fmt = (d: string | null | undefined): string => (d ? new Date(d).toLocaleString(locale(), { dateStyle: 'short', timeStyle: 'short' }) : '')
export const fmtDate = (d: string | null | undefined): string => (d ? new Date(d).toLocaleDateString(locale(), { dateStyle: 'medium' }) : '')
export const mb = (n: number | null | undefined): string => (Number(n || 0) / 1048576).toFixed(1) + ' MB'
export const initials = (s: string | null | undefined): string => (s || '?').trim().split(/[\s@.]+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase()
export const norm = (s: string | null | undefined): string => (s || '').toLowerCase()

/** Ruten i adressens #-del, som i dagens admin: #/brukere/<id>, #/menigheter/<id>/<fane>. */
const subscribe = (f: () => void) => { window.addEventListener('hashchange', f); return () => window.removeEventListener('hashchange', f) }
export function useHashRoute(): string[] {
  const hash = useSyncExternalStore(subscribe, () => location.hash)
  return (hash.replace(/^#\/?/, '') || 'oversikt').split('/').map((x) => { try { return decodeURIComponent(x) } catch { return x } })
}
export const href = (...parts: (string | null | undefined | false)[]): string => '#/' + parts.filter(Boolean).map((x) => encodeURIComponent(x as string)).join('/')
export const go = (...parts: (string | null | undefined | false)[]): void => { location.hash = href(...parts) }

/** Navn på hendelsene i loggen (som ACTIONS i dagens sections.jsx). */
const ACTIONS: Record<string, string> = {
  'churches.insert': 'Menighet opprettet', 'churches.update': 'Menighet endret', 'churches.delete': 'Menighet slettet', 'churches.purge': 'Menighet slettet for godt',
  'memberships.insert': 'Medlem lagt til', 'memberships.update': 'Medlemskap endret', 'memberships.delete': 'Medlemskap fjernet', 'memberships.remove': 'Fjernet fra menighet', 'files.cleanup': 'Private filer ryddet', 'files.cleanup_storage': 'Ryddet fil fjernet fra lagringen',
  'user_roles.insert': 'Rolle gitt', 'user_roles.update': 'Rolle endret eller fjernet', 'user_roles.delete': 'Rolle slettet',
  'invitations.insert': 'Invitasjon laget', 'invitations.update': 'Invitasjon endret', 'invitations.delete': 'Invitasjon slettet',
  'app_users.insert': 'Bruker opprettet', 'app_users.update': 'Bruker endret', 'app_users.delete': 'Bruker slettet',
  'files.insert': 'Fil lastet opp', 'files.update': 'Fil endret', 'files.delete': 'Fil slettet', 'message.send': 'Melding sendt',
  'spaces.create': 'Samarbeidsområde opprettet', 'spaces.invite': 'Invitert til samarbeid', 'spaces.membership': 'Samarbeid endret',
  'spaces.update': 'Samarbeidsområde endret', 'spaces.status': 'Samarbeidsområde arkivert eller åpnet', 'spaces.delete': 'Samarbeidsområde slettet',
  'links.create': 'Kobling opprettet', 'links.end': 'Kobling avsluttet', 'links.reopen': 'Kobling gjenåpnet',
  'requests.submit': 'Forespørsel om konto mottatt', 'requests.status': 'Forespørsel: status endret', 'requests.note': 'Forespørsel: notat', 'requests.approve': 'Forespørsel: bruker opprettet', 'requests.reject': 'Forespørsel avslått', 'requests.delete': 'Forespørsel slettet', 'mail.settings_update': 'Varslingsadresser endret',
  'mail.template_update': 'E-postmal endret', 'mail.template_reset': 'E-postmal gjenopprettet til standard', 'mail.logo_update': 'E-postlogo byttet', 'mail.logo_reset': 'Standard e-postlogo gjenopprettet',
  'roles.extra_admin_add': 'Ekstra Admin lagt til', 'roles.extra_admin_remove': 'Ekstra Admin fjernet',
  'groups.create': 'Samarbeidsgruppe opprettet', 'groups.update': 'Samarbeidsgruppe endret', 'groups.add_church': 'Menighet lagt til i samarbeidsgruppe',
  'groups.remove_church': 'Menighet fjernet fra samarbeidsgruppe', 'groups.end': 'Samarbeidsgruppe avsluttet', 'groups.reopen': 'Samarbeidsgruppe gjenåpnet', 'groups.delete': 'Samarbeidsgruppe slettet',
  'subscription_requests.insert': 'Abonnement forespurt', 'subscription_requests.update': 'Abonnementsforespørsel endret',
  'church_subscriptions.insert': 'Abonnement satt', 'church_subscriptions.update': 'Abonnement endret',
  'account.delete': 'Konto slettet', 'plans.update': 'Abonnementsplan endret', 'churches.quota': 'Lagringskvote endret', 'storage.limit': 'Samlet lagringsgrense endret', 'feedback.create': 'Tilbakemelding sendt inn', 'feedback.status': 'Tilbakemelding: status endret', 'feedback.note': 'Tilbakemelding: notat', 'audit_logs.purge': 'Gammel logg slettet',
}
export const actionName = (a: string): string => ACTIONS[a] ?? a

/**
 * Menighetslogoer som lokale blob:-adresser via den vanlige filtilgangen (bare medlemmer og Admin ser filen – databasen
 * avgjør). Uten logo eller uten tilgang vises forbokstavene.
 */
const cache = new Map<string, string | null>()
export function useLogos(files: FilesService, ids: (string | null | undefined)[]): Record<string, string | null> {
  const list = ids.filter((x): x is string => !!x)
  const key = [...list].sort().join(',')
  const [, bump] = useState(0)
  useEffect(() => {
    const missing = key ? key.split(',').filter((id) => !cache.has(id)) : []
    if (!missing.length) return
    let alive = true
    void Promise.all(missing.map(async (id) => {
      const b = await files.blob(id).catch(() => null)
      cache.set(id, b ? URL.createObjectURL(b) : null)
    })).then(() => { if (alive) bump((n) => n + 1) })
    return () => { alive = false }
  }, [files, key])
  return Object.fromEntries(list.map((id) => [id, cache.get(id) ?? null]))
}
export const forgetLogo = (id: string | null | undefined): void => { if (id) cache.delete(id) }


/** Utklippstavlen, ellers en reserve med markert tekst. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return true }
  } catch {
    // reserven under
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.cssText = 'position:fixed;left:-9999px;top:0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    ta.remove()
    return ok
  } catch {
    return false
  }
}
