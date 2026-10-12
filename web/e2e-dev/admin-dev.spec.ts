import { expect, test, type Page } from '@playwright/test'

/**
 * Innlogging og admin mot ekte connecthub-dev med en testkonto (uten MFA). Bare lesing: åpner hver seksjon og registrerer
 * overskrift, feilmeldinger i siden, konsollfeil og mislykkede kall. E-post/passord kommer fra terminalens miljø.
 *
 *   $env:ML_DEV_EMAIL = 'ch-test-…@example.com'
 *   $s = Read-Host 'Passord' -AsSecureString
 *   $env:ML_DEV_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($s))
 *   npx playwright test -c e2e-dev
 */
const EMAIL = process.env.ML_DEV_EMAIL ?? ''
const PASSWORD = process.env.ML_DEV_PASSWORD ?? ''
const SECTIONS = ['oversikt', 'brukere', 'menigheter', 'invitasjoner', 'filer', 'samarbeid', 'abonnement', 'logg', 'tilbakemeldinger', 'opprydning', 'foresporsler', 'mail']

test.skip(!EMAIL || !PASSWORD, 'ML_DEV_EMAIL og ML_DEV_PASSWORD må være satt i terminalen')

function watch(page: Page) {
  const problems: string[] = []
  page.on('pageerror', (e) => problems.push(`sidefeil: ${e.message.slice(0, 160)}`))
  page.on('console', (m) => {
    if (m.type() === 'error') problems.push(`konsoll: ${m.text().slice(0, 160)}`)
  })
  page.on('response', (r) => {
    const u = r.url()
    if (r.status() >= 400 && (/supabase\.co/.test(u) || u.includes('/api/ch'))) problems.push(`${r.status()} ${u.replace(/\?.*$/, '').replace(/^https:\/\/[^/]+/, '')}`)
  })
  return problems
}

async function signIn(page: Page) {
  await page.goto('/app/')
  await page.getByLabel('E-post').fill(EMAIL)
  await page.getByLabel('Passord', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Logg inn', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Media Lab' })).toBeVisible({ timeout: 30_000 })
}

test('innlogging, admin-seksjonene og utlogging (bare lesing)', async ({ page }, info) => {
  const problems = watch(page)
  await signIn(page)
  const rows: string[] = [`| Seksjon | Overskrift | Melding i siden | Problemer |`, `|---|---|---|---|`]
  for (const sec of SECTIONS) {
    const before = problems.length
    await page.goto(`/app/admin#/${sec}`)
    await page.waitForLoadState('networkidle').catch(() => undefined)
    await page.waitForTimeout(800)
    const h = (await page.locator('main h1, main h2').first().textContent().catch(() => null))?.trim() ?? '–'
    const alert = (await page.locator('[role="alert"]').allTextContents().catch(() => [])).join(' / ').slice(0, 120) || '–'
    const found = problems.slice(before)
    rows.push(`| ${sec} | ${h} | ${alert} | ${found.length ? found.join('; ').slice(0, 300) : 'ingen'} |`)
    await page.screenshot({ path: info.outputPath(`${sec}.png`), fullPage: false })
  }
  const report = rows.join('\n')
  console.log(`\n${info.project.name}:\n${report}\n`)
  await info.attach('rapport', { body: report, contentType: 'text/markdown' })
  // utlogging (bare denne økten)
  await page.goto('/app/')
  await page.locator('[data-ch-account]').first().click()
  await page.locator('[data-ch-logout]').first().click()
  await expect(page.getByRole('button', { name: 'Logg inn', exact: true })).toBeVisible({ timeout: 15_000 })
})
