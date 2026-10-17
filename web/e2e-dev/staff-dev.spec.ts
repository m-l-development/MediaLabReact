import { expect, test } from '@playwright/test'
import { injectBackend, api, EMAIL, expectHub, mails, PASSWORD, rest, signInPassword, totp } from './helpers'

/**
 * Developer og Moderator med MFA mot connecthub-dev (kjøres av run-dev.mjs med ML_DEV_ROLE=staff). Testen setter opp
 * MFA på den syntetiske stabskontoen (TOTP), kontrollerer tilgang før og etter MFA, behandler testsakene fra
 * feedback-dev (status, notat, arkiv), prøver e-post mot testpostkassen og fjerner MFA-faktoren igjen til slutt.
 * Nøkkelen og kodene skrives aldri ut.
 */
test.skip(!EMAIL || !PASSWORD || process.env.ML_DEV_ROLE !== 'staff', 'kjøres av run-dev.mjs med en stabskonto')
test.beforeEach(async ({ page }) => injectBackend(page))

test('stab: MFA-oppsett, tilgang før/etter MFA, tilbakemeldinger, e-post og overstyring', async ({ page }, info) => {
  test.skip(info.project.name === 'mobil', 'kjøres én gang')
  test.setTimeout(240_000)
  const rows = ['| Kontroll | Resultat |', '|---|---|']
  await signInPassword(page)
  await expect(page.getByRole('heading', { name: 'Sett opp totrinnsbekreftelse' })).toBeVisible({ timeout: 30_000 })
  rows.push('| Stab uten MFA får MFA-oppsett, ikke appen | ja |')

  // før MFA (aal1): stabsfunksjoner nektes
  const pre = await rest(page, '/rest/v1/rpc/system_status', { body: {} })
  rows.push(`| system_status før MFA | ${pre.status} ${pre.code ?? ''} (forventet 403 42501) |`)
  expect(pre.status).toBe(403)

  await page.getByRole('button', { name: 'Sett opp totrinnsbekreftelse' }).click()
  await page.getByText('Eller skriv inn nøkkelen manuelt').click()
  const secret = ((await page.locator('code').first().textContent()) ?? '').trim()
  expect(secret.length).toBeGreaterThan(10)
  await page.getByLabel('Kode').fill(totp(secret))
  await page.getByRole('button', { name: 'Bekreft' }).click()
  await expectHub(page)
  rows.push('| MFA satt opp med TOTP, inn i appen | ja |')

  const who = (await rest(page, '/rest/v1/rpc/whoami', { body: {} })).body as { mfa: boolean; roles: { role: string }[]; churches: { id: string }[] }
  const role = who.roles.some((r) => r.role === 'developer') ? 'developer' : 'moderator'
  rows.push(`| Rolle / MFA i whoami | ${role} / ${who.mfa} |`)
  expect(who.mfa).toBe(true)

  for (const fn of ['system_status', 'cleanup_overview', 'mail_settings_get']) {
    const r = await rest(page, `/rest/v1/rpc/${fn}`, { body: {} })
    rows.push(`| ${fn} med MFA | ${r.status} |`)
    expect(r.status, fn).toBe(200)
  }

  // admin-seksjonene for stab
  await page.goto('/app/admin#/logg')
  await expect(page.locator('main h1, main h2').first()).not.toHaveText('Ingen tilgang', { timeout: 20_000 })
  await page.goto('/app/admin#/tilbakemeldinger')
  await expect(page.locator('main h1, main h2').first()).not.toHaveText('Ingen tilgang', { timeout: 20_000 })

  // tilbakemeldinger: testsakene fra feedback-dev behandles (status, notat, arkiv)
  const list = await rest(page, '/rest/v1/rpc/feedback_list', { body: {} })
  expect(list.status).toBe(200)
  const cases = ((list.body as { id: string; description: string; ref: string }[] | null) ?? []).filter((c) => c.description.startsWith('[E2E-TEST'))
  rows.push(`| Testsaker i innboksen | ${cases.length} |`)
  for (const c of cases) {
    const st = await rest(page, '/rest/v1/rpc/set_feedback_status', { body: { p_id: c.id, p_status: 'resolved', p_reason: 'Automatisk test (e2e-dev)' } })
    const note = await rest(page, '/rest/v1/rpc/add_feedback_note', { body: { p_id: c.id, p_note: 'Behandlet av e2e-dev/staff-dev.spec.ts' } })
    const arch = await rest(page, '/rest/v1/rpc/archive_feedback', { body: { p_id: c.id, p_reason: 'Testsak' } })
    rows.push(`| ${c.ref}: status / notat / arkiv | ${st.status} / ${note.status} / ${arch.status} |`)
    expect([st.status, note.status, arch.status].every((s) => s >= 200 && s < 300)).toBe(true)
  }

  // e-post: testutsending til testpostkassen (sendes ikke)
  const before = mails().length
  const mt = await api(page, 'mail.test', { key: 'welcome' })
  rows.push(`| mail.test (welcome) | ${mt.status} ${mt.error ?? ''}; nye e-poster i testpostkassen: ${mails().length - before} |`)
  expect(mt.ok).toBe(true)
  expect(mails().length).toBeGreaterThan(before)

  // overstyring av brukergrensen med MFA (samme verdi, så ingen menighet endres i praksis) – logges
  const church = who.churches[0]?.id
  if (church) {
    const usage = (await rest(page, '/rest/v1/rpc/member_usage', { body: { p_church: church } })).body as { limit: number }
    const ov = await rest(page, '/rest/v1/rpc/set_member_limit', { body: { p_church: church, p_limit: usage.limit, p_reason: 'Automatisk test av overstyring (samme grense)' } })
    rows.push(`| set_member_limit med MFA (samme grense) | ${ov.status} |`)
    expect(ov.status).toBe(200)
  }

  // rydder: fjerner MFA-faktoren igjen (kontoen tilbake som før testen)
  const user = (await rest(page, '/auth/v1/user')).body as { factors?: { id: string }[] }
  for (const f of user.factors ?? []) {
    const d = await rest(page, `/auth/v1/factors/${f.id}`, { method: 'DELETE' })
    rows.push(`| MFA-faktor fjernet etter testen | ${d.status} |`)
  }
  const report = `Konto: ${role}\n\n${rows.join('\n')}`
  console.log(`\n${report}\n`)
  await info.attach('stab', { body: report, contentType: 'text/markdown' })
})
