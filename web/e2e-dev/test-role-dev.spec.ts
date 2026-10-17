import { expect, test, type Page } from '@playwright/test'
import { dropOwnFactors, EMAIL, EMAIL2, expectHub, injectBackend, PASSWORD, PASSWORD2, rpc, setupMfa, signInAs, signInPassword } from './helpers'

/**
 * PLT-16 – rollebytteren («Testrolle» i kontomenyen) mot connecthub-dev. Bare i bygg mot utviklingsprosjektet; bytter bare
 * det grensesnittet viser, aldri rettighetene på serveren. Kjøres av run-dev.mjs:
 * - løpet «dev» (Developer med MFA): fire valg; Admin- og User-visning, banneret, at serveren fortsatt gir Developer-svar,
 *   at valget gjelder fanen (ny fane = ekte rolle), og «Tilbake til Developer»
 * - løpet «mod» (Moderator): ingen rollebytter
 * - løpet «par» (Admin og Bruker): Admin får Admin/User; Bruker får ingen rollebytter
 */
const ROLE = process.env.ML_DEV_ROLE
test.skip(!EMAIL || !PASSWORD || !(ROLE === 'staff' || ROLE === 'pair'), 'kjøres av run-dev.mjs')
test.beforeEach(async ({ page }) => injectBackend(page))

async function options(p: Page): Promise<string[]> {
  await p.getByRole('button', { name: 'Konto' }).click()
  const box = p.locator('[data-ch-testrole]')
  const out = (await box.count()) ? await box.getByRole('radio').evaluateAll((els) => els.map((e) => (e.textContent ?? '').trim())) : []
  return out
}
async function choose(p: Page, label: RegExp) {
  await p.locator('[data-ch-testrole]').getByRole('radio', { name: label }).click()
  await p.waitForLoadState('load')
  await expectHub(p)
}
async function section(p: Page, hash: string) {
  await p.goto(`/app/admin#/${hash}`)
  const h = p.locator('main h1, main h2').first()
  await expect(h).toBeVisible({ timeout: 20_000 })
  await p.waitForTimeout(500)
  return ((await h.textContent()) ?? '').trim()
}
const banner = (p: Page) => p.locator('[data-ch-testbanner]')

test('PLT-16: rollebytteren viser riktige valg og bytter bare grensesnittet', async ({ page, browser }, info) => {
  test.skip(info.project.name === 'mobil', 'kjøres én gang')
  test.setTimeout(240_000)
  const rows = ['| Kontroll | Resultat |', '|---|---|']
  try {
    if (ROLE === 'staff') {
      await signInPassword(page)
      await setupMfa(page)
      const who = (await rpc(page, 'whoami', {})).body as { roles: { role: string }[] }
      const isDev = who.roles.some((r) => r.role === 'developer')
      const opts = await options(page)
      rows.push(`| ${isDev ? 'Developer' : 'Moderator'}: valg i rollebytteren | ${opts.length ? opts.join(', ') : 'ingen rollebytter'} |`)
      if (!isDev) {
        expect(opts).toEqual([])
      } else {
        expect(opts.map((o) => o.split(' ·')[0])).toEqual(['Developer', 'Moderator', 'Admin', 'User'])
        // Admin-visning
        await choose(page, /^Admin/)
        rows.push(`| Admin-visning: banner | «${((await banner(page).textContent()) ?? '').trim().slice(0, 90)}» |`)
        await expect(banner(page)).toContainText('Testmodus: Admin')
        const fbAdmin = await section(page, 'tilbakemeldinger'), chAdmin = await section(page, 'menigheter')
        const server = await rpc(page, 'system_status', {})
        rows.push(`| Admin-visning: Tilbakemeldinger / Menigheter / server system_status | «${fbAdmin}» / «${chAdmin}» / ${server.status} |`)
        expect(fbAdmin).toBe('Ingen tilgang')
        expect(chAdmin).not.toBe('Ingen tilgang')
        expect(server.status).toBe(200)
        // valget gjelder bare fanen
        const tab2 = await page.context().newPage()
        await injectBackend(tab2)
        await tab2.goto('/app/')
        await expectHub(tab2)
        const tab2Banner = await banner(tab2).isVisible().catch(() => false)
        rows.push(`| Ny fane i samme nettleser | ${tab2Banner ? '**testmodus også her**' : 'ekte rolle (ingen testmodus)'} |`)
        expect(tab2Banner).toBe(false)
        await tab2.close()
        // User-visning
        await page.goto('/app/')
        await expectHub(page)
        await page.getByRole('button', { name: 'Konto' }).click()
        await choose(page, /^User/)
        await expect(banner(page)).toContainText('Testmodus: User')
        const usersUser = await section(page, 'brukere')
        rows.push(`| User-visning: Brukere | «${usersUser}» |`)
        expect(usersUser).toBe('Ingen tilgang')
        // tilbake
        await page.goto('/app/')
        await expectHub(page)
        await banner(page).getByRole('button', { name: /Tilbake til Developer/ }).click()
        await page.waitForLoadState('load')
        await expectHub(page)
        const fbBack = await section(page, 'tilbakemeldinger')
        rows.push(`| «Tilbake til Developer»: banner borte / Tilbakemeldinger | ${(await banner(page).isVisible().catch(() => false)) ? '**nei**' : 'ja'} / «${fbBack}» |`)
        expect(fbBack).not.toBe('Ingen tilgang')
      }
      rows.push(`| MFA-faktor fjernet etter testen | ${(await dropOwnFactors(page)).join(', ') || '–'} |`)
    } else {
      // Admin
      await signInAs(page, EMAIL, PASSWORD)
      await expectHub(page)
      const opts = await options(page)
      rows.push(`| Admin: valg i rollebytteren | ${opts.join(', ') || 'ingen'} |`)
      expect(opts.map((o) => o.split(' ·')[0])).toEqual(['Admin', 'User'])
      await choose(page, /^User/)
      const users = await section(page, 'brukere')
      const server = (await rpc(page, 'member_usage', { p_church: ((await rpc(page, 'whoami', {})).body as { roles: { role: string; church_id: string }[] }).roles.find((r) => r.role === 'church_admin')?.church_id })).status
      rows.push(`| Admin i User-visning: Brukere / server member_usage | «${users}» / ${server} |`)
      expect(users).toBe('Ingen tilgang')
      expect(server).toBe(200)
      await page.goto('/app/')
      await banner(page).getByRole('button', { name: /Tilbake til Admin/ }).click()
      await page.waitForLoadState('load')
      expect(await section(page, 'brukere')).not.toBe('Ingen tilgang')
      // Bruker
      const ctx = await browser.newContext({ baseURL: info.project.use.baseURL })
      const b = await ctx.newPage()
      await injectBackend(b)
      await signInAs(b, EMAIL2, PASSWORD2)
      await expectHub(b)
      const optsB = await options(b)
      rows.push(`| Bruker: valg i rollebytteren | ${optsB.join(', ') || 'ingen rollebytter'} |`)
      expect(optsB).toEqual([])
      await ctx.close()
    }
  } finally {
    const report = rows.join('\n')
    console.log(`\n${report}\n`)
    await info.attach('plt16', { body: report, contentType: 'text/markdown' })
  }
})
