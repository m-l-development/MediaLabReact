import { expect, test, type Page } from '@playwright/test'
import { injectBackend } from './helpers'

/**
 * Serverhandlingene (/api/ch) på dev-serveren mot connecthub-dev, bare de som leser (docs/lokal-servertest.md).
 * Krever at dev-serveren på 5180 er startet med CONNECTHUB_SUPABASE_SECRET_KEY i terminalens miljø; uten den svarer
 * serveren `not_configured`, og testen sier fra om det i stedet for å feile. Ingen sletting, ingen e-post, ingen invitasjoner.
 */
const EMAIL = process.env.ML_DEV_EMAIL ?? ''
const PASSWORD = process.env.ML_DEV_PASSWORD ?? ''
test.skip(!EMAIL || !PASSWORD, 'ML_DEV_EMAIL og ML_DEV_PASSWORD må være satt i terminalen')
test.beforeEach(async ({ page }) => injectBackend(page))

type Reply = { status: number; error?: string | undefined; ok: boolean; keys?: string[] | undefined }

async function signIn(page: Page) {
  await page.goto('/app/')
  await page.getByLabel('E-post').fill(EMAIL)
  await page.getByLabel('Passord', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Logg inn', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Media Lab' })).toBeVisible({ timeout: 30_000 })
}

/** POST /api/ch?a=… med brukerens økt (eller uten, for handlinger før innlogging). Bare status, feilkode og nøkkelnavn. */
function call(page: Page, action: string, payload: unknown, anonymous = false): Promise<Reply> {
  return page.evaluate(async ({ a, b, anon }) => {
    const session = JSON.parse(localStorage.getItem('ch.auth') ?? 'null') as { access_token?: string } | null
    const r = await fetch(`/api/ch?a=${encodeURIComponent(a)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(!anon && session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) },
      body: JSON.stringify(b),
    })
    const j = (await r.json().catch(() => null)) as Record<string, unknown> | null
    return { status: r.status, error: typeof j?.error === 'string' ? j.error : undefined, ok: r.ok && j?.ok !== false, keys: j ? Object.keys(j).sort() : undefined }
  }, { a: action, b: payload, anon: anonymous })
}

test('serverhandlinger som leser: konfigurasjon, tilgang og svar (connecthub-dev)', async ({ page }, info) => {
  test.skip(info.project.name === 'mobil', 'kjøres én gang')
  await signIn(page)
  const who = await page.evaluate(async () => {
    const cfg = (globalThis as { __CH_BACKEND__?: { url: string; key: string } }).__CH_BACKEND__
    const s = JSON.parse(localStorage.getItem('ch.auth') ?? 'null') as { access_token?: string } | null
    if (!cfg || !s?.access_token) return null
    const r = await fetch(`${cfg.url}/rest/v1/rpc/whoami`, { method: 'POST', headers: { apikey: cfg.key, Authorization: `Bearer ${s.access_token}`, 'Content-Type': 'application/json' }, body: '{}' })
    return (await r.json()) as { roles: { role: string; church_id: string | null }[]; churches: { id: string }[] }
  })
  if (!who) throw new Error('fant ikke økten')
  const staff = who.roles.some((r) => r.role === 'developer' || r.role === 'moderator')
  const adminOf = who.roles.filter((r) => r.role === 'church_admin').map((r) => r.church_id)
  const own = who.churches[0]?.id

  const first = await call(page, 'request.form', {}, true)
  if (first.error === 'not_configured') {
    const msg = 'Serveren svarer not_configured: den hemmelige nøkkelen er ikke satt i terminalen som startet dev-serveren (se docs/lokal-servertest.md). Serverhandlingene er ikke prøvd.'
    console.log(msg)
    await info.attach('server', { body: msg, contentType: 'text/plain' })
    test.skip(true, msg)
  }

  const rows: string[] = ['| Handling | Forventet | Svar | Riktig |', '|---|---|---|---|']
  const results: boolean[] = []
  const check = (name: string, expected: 'ok' | 'nektet', r: Reply) => {
    const right = expected === 'ok' ? r.ok : !r.ok && (r.status === 401 || r.status === 403)
    rows.push(`| ${name} | ${expected} | ${r.status}${r.error ? ` ${r.error}` : ''}${r.ok && r.keys ? ` (felt: ${r.keys.join(', ')})` : ''} | ${right ? 'ja' : '**NEI**'} |`)
    results.push(right)
  }
  check('request.form (uten innlogging)', 'ok', first)
  check('mail.status', staff ? 'ok' : 'nektet', await call(page, 'mail.status', {}))
  if (own) check('church.export (egen menighet)', staff || adminOf.includes(own) ? 'ok' : 'nektet', await call(page, 'church.export', { church_id: own }))
  check('church.export (fremmed id)', 'nektet', await call(page, 'church.export', { church_id: '00000000-0000-4000-8000-0000000000ff' }))
  check('mail.status uten innlogging', 'nektet', await call(page, 'mail.status', {}, true))

  const report = `Konto: ${staff ? 'stab' : adminOf.length ? 'admin' : 'vanlig bruker'}\n\n${rows.join('\n')}`
  console.log(`\n${report}\n`)
  await info.attach('server', { body: report, contentType: 'text/markdown' })
  expect(results.every(Boolean)).toBe(true)
})
