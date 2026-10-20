/**
 * Skrivesperre for produksjonstesten (docs/produksjonstest.md). Hver forespørsel nettleseren gjør, vurderes her før den
 * slippes ut: lesing går gjennom (RLS og serveren bestemmer fortsatt hva kontoen får se), mens skriving bare slippes
 * gjennom når steget er godkjent OG handlingen gjelder testmenigheten eller noe denne kjøringen selv har laget.
 * Alt som ikke er kjent, stoppes. E-post og ugjenkallelige handlinger krever egne godkjenninger.
 * Ren modul uten nettleser, så den kan testes i CI (policy.test.ts).
 */

export type Step = 'access' | 'files' | 'notifications'
export type Kind = 'static' | 'read' | 'session' | 'write' | 'email' | 'irreversible'
export interface Decision { allow: boolean; kind: Kind; reason: string }
export interface Req { method: string; url: string; body: string | null }

export interface Scope {
  appOrigin: string
  supabaseRef: string
  church: { id: string; name: string }
  /** app_users-id-ene til testkontoene (fylles fra whoami etter innlogging). */
  testUserIds: Set<string>
  testEmails: Set<string>
  /** E-posten til kontoen som er logget inn i denne nettleseren. */
  currentEmail: string | null
  approved: { steps: Set<Step>; email: boolean; emailTo: string | null; cleanup: boolean }
  /** Laget i denne kjøringen (lært fra svarene): forespørsler, opplastinger og filer. */
  seen: { requests: Set<string>; uploads: Set<string>; uploadUrls: Set<string>; files: Set<string> }
}

const READ_RPCS = new Set([
  'whoami', 'my_admin_access', 'admin_access_overview', 'church_directory', 'church_settings_get', 'storage_usage', 'member_usage',
  'system_status', 'my_groups', 'my_email_prefs', 'mail_settings_get', 'mail_templates', 'mail_outbox_recent', 'feedback_list',
  'feedback_events_for', 'account_requests_list', 'account_request_events_for', 'cleanup_candidates', 'cleanup_overview', 'plans_admin',
  'church_quota_overview', 'link_files_meta', 'storage_overview', 'export_my_data',
]) // alle er kontrollert uten skriving (stable, ingen insert/update/delete) i siste migrering
const READ_ACTIONS = new Set(['file.urls', 'mail.status', 'mail.logo_url', 'request.form'])
const EMAIL_ACTIONS = new Set(['invite.create', 'invite.resend', 'request.approve', 'request.submit', 'auth.recover', 'mail.test'])

const ok = (kind: Kind, reason: string): Decision => ({ allow: true, kind, reason })
const no = (kind: Kind, reason: string): Decision => ({ allow: false, kind, reason })

function json(body: string | null): Record<string, unknown> {
  if (!body) return {}
  try {
    const v = JSON.parse(body) as unknown
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

export function decide(req: Req, s: Scope): Decision {
  let u: URL
  try {
    u = new URL(req.url)
  } catch {
    return no('write', 'ugyldig adresse')
  }
  const m = req.method.toUpperCase()
  const safe = m === 'GET' || m === 'HEAD' || m === 'OPTIONS'
  const app = new URL(s.appOrigin)
  const supa = `${s.supabaseRef}.supabase.co`

  if (u.protocol === 'data:' || u.protocol === 'blob:') return ok('static', 'lokal ressurs')
  if (u.hostname.endsWith('.supabase.co') && u.hostname !== supa) return no('write', `feil Supabase-prosjekt (${u.hostname})`)

  if (u.host === app.host && u.protocol === app.protocol) {
    if (u.pathname !== '/api/ch') return safe ? ok('static', 'appens filer') : no('write', `ukjent skriving til appen (${m} ${u.pathname})`)
    return action(u.searchParams.get('a') ?? '', json(req.body), s)
  }

  if (u.hostname === supa) {
    const p = u.pathname
    if (p.startsWith('/auth/v1/')) {
      if (p === '/auth/v1/token' && m === 'POST' && ['password', 'refresh_token'].includes(u.searchParams.get('grant_type') ?? '')) return ok('session', 'innlogging med testkonto (oppsett, ikke testet)')
      if (p === '/auth/v1/logout' && m === 'POST') return ok('session', 'utlogging')
      if ((p === '/auth/v1/user' || p === '/auth/v1/factors') && safe) return ok('read', 'egen konto (lesing)')
      return no('write', `innlogging/MFA endres ikke i testen (${m} ${p})`)
    }
    if (p.startsWith('/rest/v1/rpc/')) return rpc(p.slice('/rest/v1/rpc/'.length), json(req.body), s)
    if (p.startsWith('/rest/v1/')) return safe ? ok('read', `lesing ${p.slice(9)}`) : no('write', `direkte skriving til tabell (${m} ${p.slice(9)})`)
    if (p.startsWith('/storage/v1/')) {
      if (safe) return ok('read', 'lesing fra lagringen')
      if (m === 'PUT' && s.approved.steps.has('files') && s.seen.uploadUrls.has(u.origin + u.pathname)) return ok('write', 'opplasting til signert adresse fra denne kjøringen')
      return no('write', `skriving til lagringen utenfor testen (${m} ${p})`)
    }
    return safe ? ok('read', 'lesing') : no('write', `ukjent skriving (${m} ${p})`)
  }

  // andre verter (skrifter, AI-modeller fra Hugging Face o.l.): bare lesing
  return safe ? ok('static', `ekstern lesing (${u.hostname})`) : no('write', `skriving til ekstern vert (${u.hostname})`)
}

function rpc(fn: string, b: Record<string, unknown>, s: Scope): Decision {
  if (READ_RPCS.has(fn)) return ok('read', `lese-RPC ${fn}`)
  const step = (st: Step) => s.approved.steps.has(st)
  const church = b.p_church === s.church.id
  switch (fn) {
    case 'request_admin_access':
      return step('access') && church ? ok('write', 'forespørsel om Admin-tilgang i testmenigheten') : no('write', `${fn} utenfor testen`)
    case 'decide_admin_access':
    case 'withdraw_admin_access':
      return step('access') && typeof b.p_request === 'string' && s.seen.requests.has(b.p_request) ? ok('write', `${fn} for testforespørsel`) : no('write', `${fn} for en forespørsel testen ikke har laget`)
    case 'revoke_admin_access':
      return step('access') && church && typeof b.p_user === 'string' && s.testUserIds.has(b.p_user) ? ok('write', 'fjerne testkontoens Admin-tilgang i testmenigheten') : no('write', `${fn} utenfor testen`)
    case 'mark_my_notifications_read':
    case 'clear_my_notifications':
      return step('notifications') ? ok('write', `${fn} (testkontoens egne varsler)`) : no('write', `${fn} er ikke godkjent`)
    default:
      return no('write', `RPC ${fn} er ikke tillatt i produksjonstesten`)
  }
}

function action(a: string, b: Record<string, unknown>, s: Scope): Decision {
  if (READ_ACTIONS.has(a)) return ok('read', `serverhandling ${a} (lesing)`)
  if (EMAIL_ACTIONS.has(a)) {
    // bare «Send test til meg», bare med egen godkjenning, og bare når den innloggede kontoen er den godkjente mottakeren
    if (a === 'mail.test' && s.approved.email && !!s.currentEmail && s.currentEmail === s.approved.emailTo) return ok('email', 'én godkjent testmail til godkjent mottaker')
    return no('email', `${a} sender e-post – ikke godkjent`)
  }
  const files = s.approved.steps.has('files')
  switch (a) {
    case 'upload.start':
      return files && b.kind === 'file' && b.church === s.church.id ? ok('write', 'opplasting til testmenigheten') : no('write', 'opplasting utenfor testmenigheten')
    case 'upload.finish':
      return files && typeof b.id === 'string' && s.seen.uploads.has(b.id) ? ok('write', 'fullføre testopplasting') : no('write', 'upload.finish for en opplasting testen ikke har startet')
    case 'file.delete':
      return files && typeof b.id === 'string' && s.seen.files.has(b.id) ? ok('write', 'slette testfil fra denne kjøringen') : no('write', 'sletting av fil testen ikke har laget')
    case 'church.purge':
      return s.approved.cleanup && b.church_id === s.church.id && b.confirm_name === s.church.name ? ok('irreversible', 'slette testmenigheten (godkjent opprydding)') : no('irreversible', 'sletting av menighet utenfor testen eller uten godkjenning')
    case 'privacy.delete_me':
      return s.approved.cleanup && !!s.currentEmail && s.testEmails.has(s.currentEmail) ? ok('irreversible', 'testkontoen sletter seg selv (godkjent opprydding)') : no('irreversible', 'kontosletting uten godkjenning eller for annen konto')
    default:
      return no('write', `serverhandling ${a || '(mangler)'} er ikke tillatt i produksjonstesten`)
  }
}

/** Lærer id-er fra svarene, så senere skriving kan begrenses til det denne kjøringen har laget. */
export function observe(req: Req, responseBody: string | null, s: Scope): void {
  let u: URL
  try {
    u = new URL(req.url)
  } catch {
    return
  }
  const body = json(req.body)
  let res: unknown
  try {
    res = responseBody ? JSON.parse(responseBody) : null
  } catch {
    return
  }
  const fn = u.pathname.startsWith('/rest/v1/rpc/') ? u.pathname.slice('/rest/v1/rpc/'.length) : null
  if (fn === 'admin_access_overview' && body.p_church === s.church.id && res && typeof res === 'object') {
    for (const r of ((res as { pending?: { id?: unknown; user_id?: unknown }[] }).pending ?? [])) if (typeof r.id === 'string' && typeof r.user_id === 'string' && s.testUserIds.has(r.user_id)) s.seen.requests.add(r.id)
  }
  if (fn === 'my_admin_access' && Array.isArray(res) && s.currentEmail && s.testEmails.has(s.currentEmail)) {
    for (const r of res as { id?: unknown; church_id?: unknown }[]) if (r.church_id === s.church.id && typeof r.id === 'string') s.seen.requests.add(r.id)
  }
  if (u.pathname === '/api/ch' && res && typeof res === 'object') {
    const a = u.searchParams.get('a')
    const r = res as Record<string, unknown>
    if (a === 'upload.start' && typeof r.id === 'string' && typeof r.url === 'string') {
      s.seen.uploads.add(r.id)
      try { const x = new URL(r.url); s.seen.uploadUrls.add(x.origin + x.pathname) } catch { /* ugyldig adresse læres ikke */ }
    }
    // upload.finish svarer { ok, file: { id, … } }; file.delete tar { id }
    const f = r.file as Record<string, unknown> | undefined
    if (a === 'upload.finish' && f && typeof f.id === 'string') s.seen.files.add(f.id)
  }
}

export function newScope(o: Omit<Scope, 'testUserIds' | 'currentEmail' | 'seen'> & { testUserIds?: Iterable<string> }): Scope {
  return { ...o, testUserIds: new Set(o.testUserIds ?? []), currentEmail: null, seen: { requests: new Set(), uploads: new Set(), uploadUrls: new Set(), files: new Set() } }
}
