import { expect, test, type Page } from '@playwright/test'

/**
 * Brukergrensen mot connecthub-dev med Admin-testkontoen (docs/plan-brukergrense.md).
 * - Alltid (bare lesing): menighetens bruk og grense fra databasen, telleren i grensesnittet, og at Admin ikke kan endre grensen.
 * - Med ML_DEV_LIMIT_FULL=JA (grensen er satt lik antallet med supabase/checks/member_limit_test_full.sql): «Send invitasjon»
 *   er sperret, og serveren avviser en invitasjon med 409 member_limit. Forsøket sendes BARE når databasen sier at
 *   menigheten er full, så ingen invitasjon lages og ingen e-post sendes.
 */
const EMAIL = process.env.ML_DEV_EMAIL ?? ''
const PASSWORD = process.env.ML_DEV_PASSWORD ?? ''
const FULL = process.env.ML_DEV_LIMIT_FULL === 'JA'
test.skip(!EMAIL || !PASSWORD, 'ML_DEV_EMAIL og ML_DEV_PASSWORD må være satt i terminalen')

async function signIn(page: Page) {
  await page.goto('/app/')
  await page.getByLabel('E-post').fill(EMAIL)
  await page.getByLabel('Passord', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Logg inn', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Media Lab' })).toBeVisible({ timeout: 30_000 })
}

function rest(page: Page, path: string, body: unknown) {
  return page.evaluate(async ({ p, b }) => {
    const cfg = (globalThis as { __CH_BACKEND__?: { url: string; key: string } }).__CH_BACKEND__
    const s = JSON.parse(localStorage.getItem('ch.auth') ?? 'null') as { access_token?: string } | null
    if (!cfg || !s?.access_token) return { status: 0, body: null as unknown }
    const r = await fetch(`${cfg.url}${p}`, { method: 'POST', headers: { apikey: cfg.key, Authorization: `Bearer ${s.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(b) })
    return { status: r.status, body: (await r.json().catch(() => null)) as unknown }
  }, { p: path, b: body })
}

test('brukergrensen: teller, sperret invitasjon og avvisning fra serveren (Admin)', async ({ page }, info) => {
  test.skip(info.project.name === 'mobil', 'kjøres én gang')
  await signIn(page)
  const who = (await rest(page, '/rest/v1/rpc/whoami', {})).body as { roles: { role: string; church_id: string | null }[] }
  const church = who.roles.find((r) => r.role === 'church_admin')?.church_id
  test.skip(!church, 'kontoen er ikke Admin i en menighet')
  const usage = (await rest(page, '/rest/v1/rpc/member_usage', { p_church: church })).body as { count: number; limit: number; pending: number }
  const deny = await rest(page, '/rest/v1/rpc/set_member_limit', { p_church: church, p_limit: 99, p_reason: 'Admin prøver å heve grensen' })
  const rows = ['| Kontroll | Resultat |', '|---|---|', `| member_usage (databasen) | ${usage.count} av ${usage.limit}, ventende ${usage.pending} |`, `| Admin kaller set_member_limit | ${deny.status} ${(deny.body as { code?: string } | null)?.code ?? ''} (forventet 403 42501) |`]
  expect(deny.status).toBe(403)

  await page.goto(`/app/admin#/menigheter/${church}/innstillinger`)
  const note = page.locator('[data-ch-member-usage]').first()
  await expect(note).toHaveAttribute('data-ch-member-usage', `${usage.count}/${usage.limit}`, { timeout: 20_000 })
  rows.push(`| Telleren i menighetens innstillinger | «${(await note.textContent())?.trim().slice(0, 120)}» |`)

  await page.getByRole('button', { name: '+ Ny invitasjon' }).click()
  const dlg = page.getByRole('dialog', { name: 'Ny invitasjon' })
  const send = dlg.getByRole('button', { name: 'Send invitasjon' })
  await expect(dlg.locator('[data-ch-member-usage]')).toBeVisible({ timeout: 20_000 })
  const disabled = await send.isDisabled()
  rows.push(`| «Send invitasjon» sperret | ${disabled ? 'ja' : 'nei'} (forventet ${usage.count >= usage.limit ? 'ja' : 'nei'}) |`)
  expect(disabled).toBe(usage.count >= usage.limit)

  if (FULL) {
    expect(usage.count, 'grensen må være satt lik antallet før dette steget').toBeGreaterThanOrEqual(usage.limit)
    // samme serverhandling som både gammel og ny app bruker
    const r = await page.evaluate(async (c) => {
      const s = JSON.parse(localStorage.getItem('ch.auth') ?? 'null') as { access_token?: string } | null
      const res = await fetch('/api/ch?a=invite.create', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${s?.access_token ?? ''}` }, body: JSON.stringify({ email: 'ch-test-grense-over@example.com', role: 'user', church_id: c }) })
      return { status: res.status, body: (await res.json().catch(() => null)) as { error?: string } | null }
    }, church)
    rows.push(`| invite.create når menigheten er full | ${r.status} ${r.body?.error ?? ''} (forventet 409 member_limit) |`)
    if (r.body?.error !== 'not_configured') expect([r.status, r.body?.error]).toEqual([409, 'member_limit'])
  }
  const report = rows.join('\n')
  console.log(`\n${report}\n`)
  await info.attach('brukergrense', { body: report, contentType: 'text/markdown' })
})
