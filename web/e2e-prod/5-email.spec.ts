import { expect, test } from '@playwright/test'
import { assertClean, CFG, configured, sharedScope, staffContext, verifyIdentity } from './guard'

/**
 * Steg «email» (SENDER ÉN EKTE E-POST, krever egen godkjenning): «Send test til meg» i Mail-fanen, én gang, fra
 * stabsøkten, og bare når stabskontoens adresse er den godkjente mottakeren (ML_E2E_EMAIL_TO). Skrivesperren slipper
 * gjennom akkurat dette kallet og ingen andre som sender e-post. Mottaket bekreftes av eieren i innboksen.
 */
test.skip(!configured || !CFG.email || !CFG.emailTo || !CFG.staff.storage, 'krever godkjent e-posttest (ML_E2E_EMAIL=JA, ML_E2E_EMAIL_TO) og stabsøkt')

test('e-post: én testmail («Send test til meg») til godkjent mottaker, og «Sendt» i utsendingsloggen', async ({ browser }, info) => {
  const g = await staffContext(browser, sharedScope())
  try {
    await verifyIdentity(g, 'staff')
    expect(g.scope.currentEmail, 'stabskontoen er den godkjente mottakeren').toBe(CFG.emailTo)
    await g.page.goto('/app/admin#/mail')
    await expect(g.page.locator('[data-ch-mailstatus]')).toContainText('E-post sendes fra', { timeout: 30_000 })
    const sent = g.page.waitForResponse((r) => r.url().includes('/api/ch?a=mail.test'), { timeout: 60_000 })
    await g.page.getByRole('button', { name: 'Send test til meg' }).first().click()
    const r = await sent
    const body = (await r.json().catch(() => null)) as { ok?: boolean; to?: string } | null
    expect(r.status(), 'serveren sendte testmailen').toBe(200)
    expect(String(body?.to ?? '').toLowerCase()).toBe(CFG.emailTo)
    await g.page.reload()
    await expect(g.page.getByText('Sendt').first()).toBeVisible({ timeout: 30_000 })
    assertClean(g, 'e-post')
    await info.attach('e-post', { body: `Én testmail sendt til godkjent mottaker kl. ${new Date().toISOString()}. Bekreft mottak i innboksen.`, contentType: 'text/plain' })
  } finally {
    await g.context.close()
  }
})
