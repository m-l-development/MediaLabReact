import fs from 'node:fs'
import { expect, test } from '@playwright/test'
import { png } from '../e2e/png'
import { assertClean, CFG, configured, guardedContext, sharedScope, signIn, verifyIdentity, type Guarded } from './guard'

/**
 * Steg «verktøy» (ingen produksjonsskriving: alt lagres i nettleseren). Innlogget som Bruker-testkontoen (ikke Admin,
 * som kan lagre menighetens felles grunnoppsett). Skrivesperren stopper og feiler testen om appen likevel prøver å skrive.
 */
test.skip(!configured || !CFG.user.email, 'kjøres av run-prod.mjs / run-dev.mjs med Bruker-testkontoen')

const RED = png(320, 200, () => [230, 20, 20, 255])
const PIP = png(400, 300, (x) => [x % 255, 120, 200, 255])

async function open(browser: import('@playwright/test').Browser, viewport?: { width: number; height: number }) {
  const g = await guardedContext(browser, sharedScope(), viewport ? { viewport } : {})
  await g.context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: CFG.base })
  await signIn(g, 'user')
  await verifyIdentity(g, 'user')
  return g
}
const close = async (g: Guarded, info: import('@playwright/test').TestInfo, label: string) => {
  await info.attach(`kall-${label}`, { body: g.log.map((x) => `${x.d.allow ? 'ok ' : 'STOPP'} ${x.d.kind} ${x.method} ${x.url} – ${x.d.reason}`).join('\n'), contentType: 'text/plain' })
  await g.context.close()
}

for (const [label, viewport] of [['desktop', undefined], ['mobil', { width: 390, height: 844 }]] as const) {
  test(`Loop Studio (${label}): «+ Bilde», beskjæring, lagring og gjenåpning`, async ({ browser }, info) => {
    const g = await open(browser, viewport)
    const { page } = g
    try {
      const errors: string[] = []
      page.on('pageerror', (e) => errors.push(e.message.slice(0, 200)))
      await page.goto('/app/loop-studio?mal=week')
      await expect(page.locator('[data-loop-canvas]')).toBeVisible({ timeout: 60_000 })
      const edit = async () => { if (viewport) await page.getByRole('button', { name: 'Rediger', exact: true }).click() }
      await edit()
      await page.getByRole('button', { name: 'Program', exact: true }).click()
      await page.getByPlaceholder('Tirsdag 25. aug kl 19:00 Kveldsmat i kafeen').fill('Søndag kl 11 Gudstjeneste\nOnsdag kl 19 Bønnemøte')
      await page.getByRole('button', { name: 'Oppdater videoen' }).click()
      await page.waitForTimeout(900)
      await page.getByRole('button', { name: /^Slides/ }).first().click()
      const pips = page.getByRole('button', { name: 'Bytt bilde', exact: true })
      const before = await pips.count()
      const chooser = page.waitForEvent('filechooser')
      await page.getByRole('button', { name: /^\+ Bilde/ }).click()
      await (await chooser).setFiles({ name: 'pip.png', mimeType: 'image/png', buffer: PIP })
      await page.getByRole('dialog').getByRole('button', { name: /Bruk|Ferdig|OK/ }).last().click()
      await expect.poll(() => pips.count(), { timeout: 30_000 }).toBeGreaterThan(before)
      await page.waitForTimeout(3000) // lokal lagring
      await page.reload()
      await expect(page.locator('[data-loop-canvas]')).toBeVisible({ timeout: 60_000 })
      await edit()
      await page.getByRole('button', { name: /^Slides/ }).first().click()
      await expect.poll(() => pips.count(), { timeout: 20_000 }).toBeGreaterThan(before)
      expect(errors).toEqual([])
      assertClean(g, 'Loop Studio')
    } finally {
      await close(g, info, `loop-${label}`)
    }
  })
}

test('Mockups: bildevalg, «Last ned», «Kopier bilde» og «Lagre i Dine medier»', async ({ browser }, info) => {
  const g = await open(browser)
  const { page } = g
  try {
    await page.goto('/app/mockups?mockup=tv-wall')
    await expect(page.getByRole('button', { name: 'Last ned', exact: true }).last()).toBeEnabled({ timeout: 60_000 }) // fotografiet er lastet
    const ch = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: /Last opp design|Bytt design/ }).first().click()
    await (await ch).setFiles({ name: 'design.png', mimeType: 'image/png', buffer: RED })
    await page.waitForTimeout(600)
    const dl = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Last ned', exact: true }).last().click()
    const file = info.outputPath('mockup.png')
    await (await dl).saveAs(file)
    expect(fs.statSync(file).size).toBeGreaterThan(10_000)
    await page.getByRole('button', { name: 'Kopier bilde' }).click()
    await expect(page.getByText(/kopiert/i)).toBeVisible({ timeout: 20_000 })
    const clip = await page.evaluate(async () => (await navigator.clipboard.read()).some((i) => i.types.includes('image/png')))
    expect(clip, 'bildet ligger på utklippstavlen').toBe(true)
    await page.getByRole('button', { name: 'Lagre i Dine medier' }).click()
    await expect(page.getByText('Mockupen er lagret i Dine medier.')).toBeVisible({ timeout: 20_000 })
    assertClean(g, 'Mockups')
  } finally {
    await close(g, info, 'mockups')
  }
})

test('Photo Design: lagvalg, «Bytt bilde», tekst, lagring og gjenåpning', async ({ browser }, info) => {
  const g = await open(browser)
  const { page } = g
  try {
    await page.goto('/app/photo-design')
    await page.locator('[data-tpl="photo"]').click()
    await expect(page.locator('[data-pd-view="edit"]')).toBeVisible({ timeout: 30_000 })
    await page.locator('[data-layer]').filter({ hasText: 'Bakgrunnsbilde' }).click()
    const ch = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: 'Bytt bilde' }).click()
    await (await ch).setFiles({ name: 'rod.png', mimeType: 'image/png', buffer: png(300, 300, () => [230, 20, 20, 255]) })
    await page.locator('[data-layer]').filter({ hasText: /tekst|Tittel|Overskrift/i }).first().click()
    const text = `E2E ${Date.now()}`
    await page.locator('textarea[data-pd-text]').fill(text)
    await page.waitForTimeout(2500) // bildet er ferdig behandlet; tekstfeltet skal fortsatt være valgt
    await expect(page.locator('textarea[data-pd-text]')).toHaveValue(text)
    await page.getByRole('button', { name: 'Lagre', exact: true }).click()
    await expect(page.getByText('Prosjektet er lagret.')).toBeVisible({ timeout: 20_000 })
    await page.getByRole('button', { name: /Prosjekter/ }).first().click()
    await page.reload()
    await page.locator('[data-project]').first().click()
    await expect(page.locator('[data-pd-view="edit"]')).toBeVisible({ timeout: 30_000 })
    await page.locator('[data-layer]').filter({ hasText: /tekst|Tittel|Overskrift|E2E/i }).first().click()
    await expect(page.locator('textarea[data-pd-text]')).toHaveValue(text)
    assertClean(g, 'Photo Design')
  } finally {
    await close(g, info, 'photo')
  }
})
