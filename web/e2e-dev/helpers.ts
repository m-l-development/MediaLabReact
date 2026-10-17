import { createHmac } from 'node:crypto'
import fs from 'node:fs'
import { expect, type Page } from '@playwright/test'

/** Felles for e2e-dev: innlogging, kall med brukerens egen økt, TOTP og testpostkassen. Skriver aldri ut passord eller token. */
export const EMAIL = process.env.ML_DEV_EMAIL ?? ''
export const PASSWORD = process.env.ML_DEV_PASSWORD ?? ''
export const MAILBOX = process.env.ML_DEV_MAILBOX ?? ''

/** Innlogging i den nye appen (passord; MFA håndteres av kalleren). */
export async function signInPassword(page: Page) {
  await page.goto('/app/')
  await page.getByLabel('E-post').fill(EMAIL)
  await page.getByLabel('Passord', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Logg inn', exact: true }).click()
}

/** Kall direkte mot Supabase (REST/RPC/Auth) med brukerens økt. Bare status, feilkode og svar uten hemmeligheter. */
export function rest(page: Page, path: string, init: { method?: string; body?: unknown; headers?: Record<string, string> } = {}) {
  return page.evaluate(async ({ p, m, b, h }) => {
    const cfg = (globalThis as { __CH_BACKEND__?: { url: string; key: string } }).__CH_BACKEND__
    const s = JSON.parse(localStorage.getItem('ch.auth') ?? 'null') as { access_token?: string } | null
    if (!cfg || !s?.access_token) return { status: 0, code: 'ingen økt', body: null as unknown }
    const r = await fetch(`${cfg.url}${p}`, {
      method: m ?? (b === undefined ? 'GET' : 'POST'),
      headers: { apikey: cfg.key, Authorization: `Bearer ${s.access_token}`, 'Content-Type': 'application/json', ...(h ?? {}) },
      ...(b === undefined ? {} : { body: JSON.stringify(b) }),
    })
    const body = (await r.json().catch(() => null)) as unknown
    const code = !r.ok && body && typeof body === 'object' && 'code' in body ? String((body as { code: unknown }).code) : undefined
    return { status: r.status, code, body }
  }, { p: path, m: init.method, b: init.body, h: init.headers })
}

/** Serverhandling (/api/ch) med brukerens økt. */
export function api(page: Page, action: string, body: unknown, opts: { anonymous?: boolean; query?: string; raw?: number[]; contentType?: string } = {}) {
  return page.evaluate(async ({ a, b, o }) => {
    const s = JSON.parse(localStorage.getItem('ch.auth') ?? 'null') as { access_token?: string } | null
    const headers: Record<string, string> = { 'Content-Type': o.contentType ?? 'application/json' }
    if (!o.anonymous && s?.access_token) headers.Authorization = `Bearer ${s.access_token}`
    const r = await fetch(`/api/ch?a=${encodeURIComponent(a)}${o.query ?? ''}`, { method: 'POST', headers, body: o.raw ? new Uint8Array(o.raw) : JSON.stringify(b) })
    const j = (await r.json().catch(() => null)) as Record<string, unknown> | null
    return { status: r.status, error: typeof j?.error === 'string' ? j.error : undefined, ok: r.ok && j?.ok !== false, body: j }
  }, { a: action, b: body, o: opts })
}

/** TOTP (RFC 6238, SHA-1, 30 s, 6 sifre) fra en base32-nøkkel. */
export function totp(secret: string, at = Date.now()): string {
  const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let bits = ''
  for (const ch of secret.replace(/[\s=]/g, '').toUpperCase()) bits += alpha.indexOf(ch).toString(2).padStart(5, '0')
  const key = Buffer.from((bits.match(/.{8}/g) ?? []).map((b) => parseInt(b, 2)))
  const counter = Buffer.alloc(8)
  counter.writeBigUInt64BE(BigInt(Math.floor(at / 30000)))
  const h = createHmac('sha1', key).update(counter).digest()
  const o = (h[h.length - 1] ?? 0) & 0xf
  const n = (((h[o] ?? 0) & 0x7f) << 24) | ((h[o + 1] ?? 0) << 16) | ((h[o + 2] ?? 0) << 8) | (h[o + 3] ?? 0)
  return String(n % 1_000_000).padStart(6, '0')
}

/** E-poster fanget av den lokale testpostkassen (CH_TEST_MAILBOX): mottaker og emne, aldri lenker. */
export function mails(): { to: string; subject: string }[] {
  if (!MAILBOX || !fs.existsSync(MAILBOX)) return []
  return fs.readFileSync(MAILBOX, 'utf8').split('\n').filter(Boolean).map((l) => {
    const m = JSON.parse(l) as { to: string; subject: string }
    return { to: m.to, subject: m.subject }
  })
}

export async function expectHub(page: Page) {
  await expect(page.getByRole('heading', { name: 'Media Lab' })).toBeVisible({ timeout: 30_000 })
}

/**
 * I produksjonsbygget er backend-oppsettet bakt inn i koden (ingen global variabel). Testenes egne direktekall får
 * adressen og den offentlige nøkkelen fra run-dev.mjs (ML_DEV_SUPABASE_URL / ML_DEV_PUBLISHABLE_KEY).
 */
export async function injectBackend(page: import('@playwright/test').Page) {
  const url = process.env.ML_DEV_SUPABASE_URL
  const key = process.env.ML_DEV_PUBLISHABLE_KEY
  if (!url || !key) return
  await page.addInitScript((cfg) => {
    const g = globalThis as { __CH_BACKEND__?: unknown }
    g.__CH_BACKEND__ ??= cfg
  }, { url, key })
}

/** Stab uten faktor: setter opp TOTP via «Sett opp totrinnsbekreftelse» og går inn i appen. Nøkkelen skrives aldri ut. */
export async function setupMfa(page: Page) {
  await expect(page.getByRole('heading', { name: 'Sett opp totrinnsbekreftelse' })).toBeVisible({ timeout: 30_000 })
  await page.getByRole('button', { name: 'Sett opp totrinnsbekreftelse' }).click()
  await page.getByText('Eller skriv inn nøkkelen manuelt').click()
  const secret = ((await page.locator('code').first().textContent()) ?? '').trim()
  expect(secret.length).toBeGreaterThan(10)
  await page.getByLabel('Kode').fill(totp(secret))
  await page.getByRole('button', { name: 'Bekreft' }).click()
  await expectHub(page)
}

/** Fjerner brukerens egne MFA-faktorer (kontoen tilbake som før testen). → antall fjernet. */
export async function dropOwnFactors(page: Page): Promise<number[]> {
  const user = (await rest(page, '/auth/v1/user')).body as { factors?: { id: string }[] }
  const out: number[] = []
  for (const f of user.factors ?? []) out.push((await rest(page, `/auth/v1/factors/${f.id}`, { method: 'DELETE' })).status)
  return out
}

/** Lenken i siste e-post til `to` i testpostkassen. Brukes bare i nettleseren, skrives aldri ut. */
export function mailLink(to: string): string | null {
  if (!MAILBOX || !fs.existsSync(MAILBOX)) return null
  const all = fs.readFileSync(MAILBOX, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as { to: string; text?: string; html?: string })
  const m = all.filter((x) => x.to === to).at(-1)
  return /https?:\/\/[^\s"'<>]+invite=[^\s"'<>]+/.exec(m?.text ?? m?.html ?? '')?.[0]?.replace(/&amp;/g, '&') ?? null
}

/** Andre testkonto i samme løp (run-dev.mjs, løp med to kontoer). */
export const EMAIL2 = process.env.ML_DEV_EMAIL2 ?? ''
export const PASSWORD2 = process.env.ML_DEV_PASSWORD2 ?? ''

/** Innlogging med valgt konto, også når innloggingssiden viser lagrede kontoer («Bruk en annen konto»). */
export async function signInAs(page: Page, email: string, password: string) {
  await page.goto('/app/')
  const other = page.getByRole('button', { name: 'Bruk en annen konto' })
  const field = page.getByLabel('E-post')
  await expect(field.or(other).first()).toBeVisible({ timeout: 30_000 })
  if (!(await field.isVisible())) await other.click()
  await field.fill(email)
  await page.getByLabel('Passord', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Logg inn', exact: true }).click()
}

/** Utlogging fra kontomenyen. */
export async function signOut(page: Page) {
  await page.getByRole('button', { name: 'Konto' }).click()
  await page.getByRole('button', { name: 'Logg ut', exact: true }).click()
  await expect(page.getByLabel('E-post').or(page.getByRole('button', { name: 'Bruk en annen konto' })).first()).toBeVisible({ timeout: 30_000 })
}

/** RPC som innlogget bruker; kaster ikke ved feil, gir status og feilkode. */
export async function rpc(page: Page, fn: string, body: unknown) {
  return rest(page, `/rest/v1/rpc/${fn}`, { body })
}

/** Blir elementet synlig innen `ms`? (locator.isVisible venter ikke.) */
export const appears = (l: import('@playwright/test').Locator, ms: number): Promise<boolean> =>
  l.waitFor({ state: 'visible', timeout: ms }).then(() => true, () => false)

/** Første lenke til denne appen i siste e-post til `to` i testpostkassen (f.eks. «Glemt passord»). Skrives aldri ut. */
export function mailLinkTo(to: string): string | null {
  if (!MAILBOX || !fs.existsSync(MAILBOX)) return null
  const all = fs.readFileSync(MAILBOX, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as { to: string; text?: string; html?: string })
  const m = all.filter((x) => x.to === to).at(-1)
  return /https?:\/\/[^\s"'<>]+(token_hash|flow=recovery)[^\s"'<>]*/.exec(m?.text ?? m?.html ?? '')?.[0]?.replace(/&amp;/g, '&') ?? null
}
