import { expect, test, type Page } from '@playwright/test'

/**
 * Tilbakemelding fra innsending til innboks mot connecthub-dev. **Endrer data** (lagrer én tilbakemelding), så testen
 * kjører bare når ML_DEV_ALLOW_FEEDBACK=JA er satt for akkurat denne kjøringen, etter uttrykkelig godkjenning.
 *
 * 1. Innsender (ML_DEV_EMAIL/ML_DEV_PASSWORD, vanlig bruker eller Admin) sender en tydelig merket testsak via knappen.
 * 2. Referansen (TB-…) vises. Innsenderen kan ikke lese innboksen (feedback_list → 42501).
 * 3. Hvis en stabskonto er oppgitt (ML_DEV_STAFF_EMAIL/ML_DEV_STAFF_PASSWORD; krever MFA og håndteres ikke her), hoppes
 *    innboks-steget over med beskjed. Saken kan da ses og arkiveres manuelt i Admin → Tilbakemeldinger.
 * Skriver ut referansen og statuskoder, aldri passord eller token.
 */
const EMAIL = process.env.ML_DEV_EMAIL ?? ''
const PASSWORD = process.env.ML_DEV_PASSWORD ?? ''
const ALLOWED = process.env.ML_DEV_ALLOW_FEEDBACK === 'JA'
test.skip(!EMAIL || !PASSWORD, 'ML_DEV_EMAIL og ML_DEV_PASSWORD må være satt i terminalen')
test.skip(!ALLOWED, 'Lagrer en tilbakemelding i connecthub-dev: kjøres bare med ML_DEV_ALLOW_FEEDBACK=JA etter godkjenning')

async function signIn(page: Page) {
  await page.goto('/app/')
  await page.getByLabel('E-post').fill(EMAIL)
  await page.getByLabel('Passord', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Logg inn', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Media Lab' })).toBeVisible({ timeout: 30_000 })
}

test('tilbakemelding: innsending gir referanse, og innsenderen kan ikke lese innboksen', async ({ page }, info) => {
  test.skip(info.project.name === 'mobil', 'én testsak per kjøring')
  await signIn(page)
  const stamp = new Date().toISOString().slice(0, 16)
  await page.getByRole('button', { name: 'Send tilbakemelding' }).first().click()
  await page.getByRole('radio', { name: 'Annet' }).click()
  const desc = page.locator('textarea[name="description"]')
  await desc.fill(`[E2E-TEST ${stamp}] Automatisk testsak fra e2e-dev/feedback-dev.spec.ts. Kan arkiveres.`)
  await page.getByRole('button', { name: 'Send inn' }).click()
  const ref = (await page.getByText(/^TB-[A-Z0-9]+$/).first().textContent({ timeout: 20_000 }))?.trim() ?? ''
  expect(ref).toMatch(/^TB-[A-Z0-9]+$/)

  const inbox = await page.evaluate(async () => {
    const cfg = (globalThis as { __CH_BACKEND__?: { url: string; key: string } }).__CH_BACKEND__
    const s = JSON.parse(localStorage.getItem('ch.auth') ?? 'null') as { access_token?: string } | null
    if (!cfg || !s?.access_token) return { status: 0, code: 'ingen økt' }
    const r = await fetch(`${cfg.url}/rest/v1/rpc/feedback_list`, { method: 'POST', headers: { apikey: cfg.key, Authorization: `Bearer ${s.access_token}`, 'Content-Type': 'application/json' }, body: '{}' })
    const j = (await r.json().catch(() => null)) as { code?: string } | null
    return { status: r.status, code: j?.code }
  })
  const report = `Testsak sendt: ${ref} (merket [E2E-TEST ${stamp}])\nInnboksen for innsenderen: ${inbox.status} ${inbox.code ?? ''} (forventet 403 42501)\nInnboks for stab: ikke kjørt – krever Developer/Moderator med MFA. Se saken i Admin → Tilbakemeldinger og arkiver den.`
  console.log(`\n${report}\n`)
  await info.attach('tilbakemelding', { body: report, contentType: 'text/plain' })
  expect(inbox.status).toBe(403)
})
