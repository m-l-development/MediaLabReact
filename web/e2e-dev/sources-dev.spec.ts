import { expect, test, type Page } from '@playwright/test'
import { api, EMAIL, expectHub, injectBackend, PASSWORD, rest, signInPassword } from './helpers'

/**
 * Fellesmappe som bildekilde i verktøyene mot connecthub-dev (PD-17, SHR-04, MD-10, LS-04/LE-05), med Admin-kontoen
 * (kjøres av run-dev.mjs). Testen laster opp to egne små testbilder (Felles ressurser → logoer, og Faste bilder),
 * velger dem i Photo Design, Thumbnail Studio, Motion design og Loop Studio, og sletter dem igjen til slutt.
 */
test.skip(!EMAIL || !PASSWORD || process.env.ML_DEV_ROLE !== 'admin', 'kjøres av run-dev.mjs med Admin-kontoen')
test.beforeEach(async ({ page }) => injectBackend(page))

// 2×2 PNG, ugjennomsiktig rød
const PNG = [137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 2, 0, 0, 0, 2, 8, 2, 0, 0, 0, 253, 212, 154, 115, 0, 0, 0, 18, 73, 68, 65, 84, 120, 156, 99, 120, 38, 34, 242, 76, 68, 132, 1, 66, 1, 0, 32, 222, 4, 57, 4, 175, 122, 106, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130]

async function choose(page: Page, name: string) {
  const dlg = page.locator('[data-ch-picker]')
  await expect(dlg).toBeVisible({ timeout: 20_000 })
  const item = dlg.locator(`[data-ch-picker-file="${name}"]`)
  await expect(item).toBeVisible({ timeout: 30_000 })
  await item.click()
  await expect(dlg).toBeHidden({ timeout: 20_000 })
}

test('Fellesmappe som bildekilde i Photo Design, Thumbnail Studio, Motion design og Loop Studio', async ({ page }, info) => {
  test.skip(info.project.name === 'mobil', 'kjøres én gang')
  test.setTimeout(300_000)
  const rows = ['| Verktøy | Resultat |', '|---|---|']
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message.slice(0, 200)))
  await signInPassword(page)
  await expectHub(page)
  const who = (await rest(page, '/rest/v1/rpc/whoami', { body: {} })).body as { roles: { role: string; church_id: string | null }[] }
  const church = who.roles.find((r) => r.role === 'church_admin')?.church_id
  if (!church) throw new Error('kontoen er ikke Admin')
  const stamp = Date.now()
  const logo = `e2e-logo-${stamp}.png`, fast = `e2e-fast-${stamp}.png`
  const ids: string[] = []
  // testbilder fra en tidligere, avbrutt kjøring (bare testens egne navn)
  const old = (await rest(page, `/rest/v1/files?select=id,file_name&church_id=eq.${church}&folder=in.(logoer,faste)`)).body as { id: string; file_name: string }[] | null
  for (const o of (old ?? []).filter((x) => /^e2e-(logo|fast)-\d+\.png$/.test(x.file_name))) {
    const del = await api(page, 'file.delete', { id: o.id })
    rows.push(`| Gammelt testbilde fjernet | ${del.status} |`)
  }
  try {
    for (const [folder, name] of [['logoer', logo], ['faste', fast]] as const) {
      const up = await api(page, 'file.upload', null, { query: `&church=${church}&folder=${folder}&name=${name}`, raw: PNG, contentType: 'application/octet-stream' })
      rows.push(`| Opplasting til ${folder} | ${up.status} ${up.error ?? ''} |`)
      expect(up.ok).toBe(true)
      ids.push(String((up.body?.file as { id?: string } | undefined)?.id))
    }

    const step = async (label: string, run: () => Promise<void>) => {
      try {
        await Promise.race([run(), new Promise((_, no) => setTimeout(() => no(new Error('tidsavbrudd etter 90 s')), 90_000))])
        rows.push(`| ${label} | ja |`)
      } catch (e) {
        rows.push(`| ${label} | **NEI**: ${String((e as Error).message).split('\n')[0]?.slice(0, 160)} |`)
        await page.keyboard.press('Escape').catch(() => undefined)
      }
    }

    await step('Photo Design: logo fra Felles ressurser', async () => {
      await page.goto('/app/photo-design')
      await page.locator('[data-tpl="photo"]').click()
      await expect(page.locator('[data-pd-view="edit"]')).toBeVisible({ timeout: 30_000 })
      const before = await page.locator('[data-layer]').count()
      await page.getByRole('button', { name: 'Logo', exact: true }).click()
      await page.locator('[data-ch-felles-logo]').click()
      await choose(page, logo)
      await expect.poll(() => page.locator('[data-layer]').count(), { timeout: 20_000 }).toBeGreaterThan(before)
    })

    await step('Thumbnail Studio: logo fra Fellesmappe', async () => {
      await page.goto('/app/thumbnail-studio')
      await page.getByRole('button', { name: /Søndagsmøte/ }).first().click()
      await page.getByRole('button', { name: /Ny mal/ }).click()
      await page.getByRole('dialog', { name: 'Ny mal' }).locator('[data-layout="base:main"]').click()
      await expect(page.locator('[data-ts-view="edit"]')).toBeVisible({ timeout: 30_000 })
      await page.getByRole('button', { name: 'Logo', exact: true }).click()
      await page.getByRole('button', { name: 'Fra Fellesmappe …' }).click()
      await choose(page, logo)
    })

    await step('Motion design: logo fra Fellesmappe (MD-10)', async () => {
      await page.goto('/app/motion-design')
      await page.getByRole('button', { name: 'Nytt prosjekt' }).click()
      await page.locator('[data-format="wide"]').click()
      await page.locator('[data-tpl="blank"]').click()
      await expect(page.locator('[data-md-canvas]')).toBeVisible({ timeout: 30_000 })
      await page.getByRole('tab', { name: 'Logo' }).click()
      await page.locator('[data-ch-felles-logo]').first().click()
      await choose(page, logo)
    })

    await step('Loop Studio: bakgrunn fra Faste bilder', async () => {
      await page.goto('/app/loop-studio')
      await page.getByRole('link', { name: /Ukeprogram/ }).click()
      await expect(page.locator('[data-loop-canvas]')).toBeVisible({ timeout: 30_000 })
      await page.getByRole('button', { name: 'Slides', exact: true }).click()
      await page.locator('[data-ch-shared-bg]').first().click()
      await choose(page, fast)
    })

    await step('Loop Studio: logo fra Felles ressurser', async () => {
      await page.getByRole('button', { name: 'Stil', exact: true }).click()
      await page.locator('[data-ch-shared-logo]').first().click()
      await choose(page, logo)
    })
  } finally {
    for (const id of ids) {
      const del = await api(page, 'file.delete', { id })
      rows.push(`| Testbildet slettet | ${del.status} |`)
    }
    rows.push(`| Feil i siden | ${errors.length ? errors.join('; ') : 'ingen'} |`)
    const report = rows.join('\n')
    console.log(`\n${report}\n`)
    await info.attach('fellesmappe', { body: report, contentType: 'text/markdown' })
  }
  expect(rows.filter((r) => r.includes('**NEI**'))).toEqual([])
  expect(errors).toEqual([])
})
