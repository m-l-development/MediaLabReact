import fs from 'node:fs'
import { expect, type Browser, type BrowserContext, type Page } from '@playwright/test'
import { decide, newScope, observe, type Decision, type Scope, type Step } from './policy'

/**
 * Felles for produksjonstesten (docs/produksjonstest.md): konfigurasjon fra miljøet (satt av run-prod.mjs, eller av
 * run-dev.mjs når testene prøves mot connecthub-dev), skrivesperren rundt hver nettleserkontekst, og kontroll av at
 * kontoene er de dedikerte testkontoene i testmenigheten. Passord og økter skrives aldri ut.
 */
const env = (k: string) => process.env[k] ?? ''
export const CFG = {
  target: env('ML_E2E_TARGET') as 'prod' | 'dev' | '',
  base: env('ML_E2E_BASE').replace(/\/$/, ''),
  ref: env('ML_E2E_REF'),
  church: { id: env('ML_E2E_CHURCH_ID'), name: env('ML_E2E_CHURCH_NAME') },
  user: { email: env('ML_E2E_USER_EMAIL').toLowerCase(), password: env('ML_E2E_USER_PASSWORD') },
  admin: { email: env('ML_E2E_ADMIN_EMAIL').toLowerCase(), password: env('ML_E2E_ADMIN_PASSWORD') },
  staff: { email: env('ML_E2E_STAFF_EMAIL').toLowerCase(), storage: env('ML_E2E_STAFF_STORAGE') },
  steps: new Set(env('ML_E2E_STEPS').split(',').filter(Boolean) as Step[]),
  email: env('ML_E2E_EMAIL') === 'JA',
  emailTo: env('ML_E2E_EMAIL_TO').toLowerCase() || null,
  cleanup: env('ML_E2E_CLEANUP') === 'JA',
  bypass: env('ML_E2E_BYPASS_STORAGE'), // bare forhåndsvisning (Vercel-beskyttelse), aldri produksjonen
}
export const configured = !!CFG.target && !!CFG.base && !!CFG.ref && !!CFG.church.id && !!CFG.church.name
export const testEmails = new Set([CFG.user.email, CFG.admin.email, CFG.staff.email].filter(Boolean))

/** Felles for alle kontekster i én test: testkontoenes id-er og det kjøringen har laget. */
export function sharedScope(): Scope {
  return newScope({ appOrigin: CFG.base, supabaseRef: CFG.ref, church: CFG.church, testEmails, approved: { steps: CFG.steps, email: CFG.email, emailTo: CFG.emailTo, cleanup: CFG.cleanup } })
}

export interface Guarded { context: BrowserContext; page: Page; scope: Scope; log: { d: Decision; method: string; url: string }[]; blocked: string[] }

/** Ny nettleserkontekst med skrivesperren. Alt som stoppes, registreres og får testen til å feile i assertClean. */
export async function guardedContext(browser: Browser, shared: Scope, opts: { storageState?: string; viewport?: { width: number; height: number } } = {}): Promise<Guarded> {
  const context = await browser.newContext({
    baseURL: CFG.base, serviceWorkers: 'block', acceptDownloads: true, ...(opts.viewport ? { viewport: opts.viewport } : {}),
    ...(opts.storageState ? { storageState: opts.storageState } : CFG.bypass ? { storageState: CFG.bypass } : {}),
  })
  const scope: Scope = { ...shared, currentEmail: null } // egne currentEmail, felles mengder
  const log: Guarded['log'] = [], blocked: string[] = []
  await context.route('**/*', async (route) => {
    const r = route.request()
    const req = { method: r.method(), url: r.url(), body: r.postData() }
    const d = decide(req, scope)
    const short = r.url().replace(/\?.*$/, '').replace(/^https?:\/\/[^/]+/, '')
    if (d.kind !== 'static') log.push({ d, method: req.method, url: short })
    if (!d.allow) {
      blocked.push(`${req.method} ${short}: ${d.reason}`)
      return route.abort('blockedbyclient')
    }
    const api = /\/rest\/v1\/rpc\/|\/api\/ch/.test(r.url())
    if (!api) return route.continue()
    const res = await route.fetch()
    const text = await res.text().catch(() => '')
    observe(req, text, scope)
    return route.fulfill({ response: res, body: text })
  })
  await context.routeWebSocket(/.*/, (ws) => {
    const h = new URL(ws.url()).hostname
    if (h === `${CFG.ref}.supabase.co`) ws.connectToServer()
    else { blocked.push(`websocket ${h}`); ws.close() }
  })
  const page = await context.newPage()
  return { context, page, scope, log, blocked }
}

export function assertClean(g: Guarded, label: string) {
  expect(g.blocked, `${label}: skrivesperren stoppet forespørsler`).toEqual([])
}

/** Lesing som innlogget konto (Supabase REST/RPC). Går gjennom skrivesperren som alt annet. */
export function rest(page: Page, path: string, body?: unknown) {
  return page.evaluate(async ({ p, b, cfg }) => {
    const s = JSON.parse(localStorage.getItem('ch.auth') ?? 'null') as { access_token?: string } | null
    if (!s?.access_token) return { status: 0, code: 'ingen økt', body: null as unknown }
    const r = await fetch(`https://${cfg.ref}.supabase.co${p}`, {
      method: b === undefined ? 'GET' : 'POST',
      headers: { apikey: cfg.key, Authorization: `Bearer ${s.access_token}`, 'Content-Type': 'application/json' },
      ...(b === undefined ? {} : { body: JSON.stringify(b) }),
    }).catch(() => null)
    if (!r) return { status: -1, code: 'stoppet', body: null as unknown }
    const j = (await r.json().catch(() => null)) as unknown
    const code = !r.ok && j && typeof j === 'object' && 'code' in j ? String((j as { code: unknown }).code) : undefined
    return { status: r.status, code, body: j }
  }, { p: path, b: body, cfg: { ref: CFG.ref, key: env('ML_E2E_PUBLISHABLE_KEY') } })
}

export interface Who { user_id?: string; id?: string; email?: string; churches: { id: string; name?: string }[]; roles: { role: string; church_id?: string | null; expires_at?: string | null }[] }
export async function whoami(page: Page): Promise<Who> {
  const r = await rest(page, '/rest/v1/rpc/whoami', {})
  expect(r.status, 'whoami').toBe(200)
  return r.body as Who
}

/**
 * Stopper testen hvis kontoen ikke er den dedikerte testkontoen med forventet rolle i testmenigheten (og ingen andre).
 * Lærer samtidig kontoens id, så skrivesperren kan begrense handlinger til testkontoene.
 */
export async function verifyIdentity(g: Guarded, kind: 'user' | 'admin' | 'staff'): Promise<Who> {
  const w = await whoami(g.page)
  const email = String(w.email ?? '').toLowerCase()
  const id = w.user_id ?? w.id ?? ''
  const want = CFG[kind].email
  expect(email, `kontoen er den dedikerte ${kind}-testkontoen`).toBe(want)
  const others = w.churches.filter((c) => c.id !== CFG.church.id)
  const staffRoles = w.roles.filter((r) => r.role === 'developer' || r.role === 'moderator')
  const adminOf = w.roles.filter((r) => r.role === 'church_admin').map((r) => r.church_id)
  if (kind === 'user') {
    expect(w.churches.map((c) => c.id), 'Bruker er medlem bare av testmenigheten').toEqual([CFG.church.id])
    expect(w.roles, 'Bruker har ingen roller').toEqual([])
  } else if (kind === 'admin') {
    expect(others, 'Admin er ikke medlem av andre menigheter').toEqual([])
    expect(adminOf, 'Admin er Admin bare i testmenigheten').toEqual([CFG.church.id])
    expect(staffRoles, 'Admin har ingen stabsrolle').toEqual([])
  } else {
    expect(staffRoles.length, 'stabskontoen er Developer eller Moderator').toBeGreaterThan(0)
    expect(adminOf.filter((c) => c !== CFG.church.id), 'stabskontoen er ikke Admin i ekte menigheter').toEqual([])
  }
  g.scope.currentEmail = email
  if (id) g.scope.testUserIds.add(id)
  return w
}

/** Innlogging med passord (bare oppsett for å nå funksjonene; innlogging testes ikke). */
export async function signIn(g: Guarded, kind: 'user' | 'admin') {
  const { page } = g
  await page.goto('/app/')
  const other = page.getByRole('button', { name: 'Bruk en annen konto' })
  const field = page.getByLabel('E-post')
  await expect(field.or(other).first()).toBeVisible({ timeout: 30_000 })
  if (!(await field.isVisible())) await other.click()
  await field.fill(CFG[kind].email)
  await page.getByLabel('Passord', { exact: true }).fill(CFG[kind].password)
  await page.getByRole('button', { name: 'Logg inn', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Media Lab' })).toBeVisible({ timeout: 45_000 })
}

/** Stabsøkten: en lagret økt eieren selv har logget inn (med MFA). Brukes som den er; MFA testes ikke. */
export async function staffContext(browser: Browser, shared: Scope, viewport?: { width: number; height: number }): Promise<Guarded> {
  if (!CFG.staff.storage || !fs.existsSync(CFG.staff.storage)) throw new Error('mangler stabsøkten (ML_E2E_STAFF_STORAGE)')
  const g = await guardedContext(browser, shared, { storageState: CFG.staff.storage, ...(viewport ? { viewport } : {}) })
  await g.page.goto('/app/')
  await expect(g.page.getByRole('heading', { name: 'Media Lab' })).toBeVisible({ timeout: 45_000 })
  return g
}
