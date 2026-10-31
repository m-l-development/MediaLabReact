import fs from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { importFiles, main, recordVideo, seekTo, solid, wav } from '../e2e/motion-helpers'
import { readMp4 } from '../e2e/mp4'

/**
 * Motion Design – hele arbeidsflyten innlogget mot connecthub-dev (ekte Chrome): Media Lab → SoMe → «← Tilbake» →
 * SoMe → Motion Design, ekte video og lyd, spor, effekt, tekst og undertekst, keyframes, lyd og hastighet, lagring og
 * omlasting, ekte MP4-eksport som kontrolleres, angre og modusbytte, layout. Bruker den syntetiske testkontoen;
 * prosjektet slettes til slutt. Skriver ut feil og mislykkede kall – aldri innhold.
 */
const EMAIL = process.env.ML_DEV_EMAIL ?? ''
const PASSWORD = process.env.ML_DEV_PASSWORD ?? ''
test.skip(!EMAIL || !PASSWORD, 'ML_DEV_EMAIL og ML_DEV_PASSWORD må være satt i terminalen')

async function signIn(page: Page) {
  await page.goto('/app/')
  await page.getByLabel('E-post').fill(EMAIL)
  await page.getByLabel('Passord', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Logg inn', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Media Lab' })).toBeVisible({ timeout: 30_000 })
}

/** Sletter alle «Dev-test»-prosjekter på testkontoen (korte tidsgrenser, logger hva som skjer). */
async function cleanup(page: Page) {
  try {
    await page.goto('/app/motion-design')
    await page.waitForTimeout(2500)
    // prosjektet kan åpnes igjen fra adressen: tilbake til startsiden
    if (await page.locator('[data-md-canvas]').count()) {
      page.once('dialog', (dd) => void dd.dismiss())
      await page.getByRole('button', { name: /Prosjekter/ }).first().click({ timeout: 10_000 })
      await page.waitForTimeout(1500)
    }
    await page.locator('[data-project]').first().waitFor({ timeout: 10_000 }).catch(() => undefined)
    const all = await page.locator('[data-project]').allInnerTexts()
    console.log(`[motion-dev] prosjekter på kontoen: ${all.length} (${all.filter((x) => x.includes('Dev-test')).length} testprosjekter)`)
    const cards = page.locator('[data-project]').filter({ hasText: 'Dev-test' })
    let n = 0
    for (let i = 0; i < 10 && (await cards.count()); i++) {
      page.once('dialog', (dd) => void dd.accept())
      await cards.first().getByRole('button', { name: 'Slett prosjekt' }).click({ timeout: 10_000 })
      await page.waitForTimeout(1500)
      n++
    }
    console.log(`[motion-dev] opprydding: ${n} testprosjekt(er) slettet, ${await cards.count()} igjen`)
  } catch (e) {
    console.log(`[motion-dev] opprydding feilet: ${e instanceof Error ? e.message.slice(0, 200) : ''}`)
  }
}

test('bare opprydding (ML_DEV_CLEANUP=1)', async ({ page }, info) => {
  test.skip(info.project.name === 'mobil' || process.env.ML_DEV_CLEANUP !== '1', 'bare ved behov')
  await signIn(page)
  await cleanup(page)
})

test('Motion Design: hele arbeidsflyten innlogget i Dev, med ekte eksport', async ({ page }, info) => {
  test.skip(info.project.name === 'mobil' || process.env.ML_DEV_CLEANUP === '1', 'kjøres én gang')
  test.setTimeout(600_000)
  const problems: string[] = []
  page.on('pageerror', (e) => problems.push(`sidefeil: ${e.message.slice(0, 200)}`))
  page.on('console', (m) => { if (m.type() === 'error' && !/DevTools|vercel\.live|onnxruntime/.test(m.text())) problems.push(`konsoll: ${m.text().slice(0, 200)}`) })
  page.on('response', (r) => { if (r.status() >= 400) problems.push(`${r.status()} ${r.request().method()} ${r.url().replace(/\?.*$/, '').replace(/^https?:\/\/[^/]+/, '')}`) })
  const shot = (n: string) => page.screenshot({ path: info.outputPath(`${n}.png`) })
  let projectName = ''
  try {
    await signIn(page)
    await page.setViewportSize({ width: 1600, height: 1000 })
    console.log(`[motion-dev] Dev-versjon: ${(await page.evaluate(async () => (await (await fetch('/app/version.json', { cache: 'no-store' })).json()) as { v: string })).v.slice(0, 7)}`)

    // navigasjon: hovedmeny → SoMe → «← Tilbake» → hovedmeny → SoMe → Motion Design
    await page.getByRole('button', { name: /SoMe/ }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'SoMe' })).toBeVisible()
    await page.getByRole('button', { name: 'Tilbake', exact: true }).click()
    await expect(page).toHaveURL(/\/app\/$/)
    await page.getByRole('button', { name: /SoMe/ }).click()
    await page.getByRole('link', { name: /Motion design/i }).click()
    await expect(page.getByRole('link', { name: /SoMe-mappen/ })).toBeVisible()

    // nytt prosjekt, Avansert
    await page.getByRole('button', { name: 'Nytt prosjekt' }).click()
    await page.locator('[data-format="wide"]').click()
    await page.locator('[data-tpl="blank"]').click()
    await expect(page.locator('[data-md-canvas]')).toBeVisible()
    projectName = `Dev-test ${Date.now()}`
    await page.getByLabel('Prosjektnavn').fill(projectName)
    if ((await page.locator('[data-adv-toggle]').getAttribute('aria-checked')) !== 'true') await page.locator('[data-adv-toggle]').click()
    await expect(page.locator('[data-md-bin]')).toBeVisible()

    // ekte video og lyd
    const vid = await recordVideo(page, 'farger.webm', ['#e01010', '#10c020', '#1030e0'])
    await importFiles(page, [vid, solid('magenta.png', [230, 20, 230]), { name: 'tone.wav', mimeType: 'audio/wav', buffer: wav(1, 0, 1, 1000, 12000) }], 3)
    await page.locator('[data-md-bin-item="farger.webm"] [data-md-to="v1"]').click()
    await main(page).first().click()
    await page.locator('[data-md-speed] [data-md-speedset="2"]').click()
    await seekTo(page, 2)
    await page.locator('[data-md-bin-item="magenta.png"] [data-md-to="v"]').click()
    await page.locator('[data-md-timing] [data-md-tm="dur"]').fill('1.5')
    await page.locator('[data-md-timing] [data-md-tm="dur"]').blur()
    await page.locator('[data-md-fx-pick]').selectOption('bw')
    await page.locator('[data-md-fx-add]').click()
    const op = page.locator('[data-md-keys] [data-md-kf="opacity"]')
    await op.locator('[data-md-kf-toggle]').click()
    await op.locator('[data-md-kfnum="opacity"]').fill('0')
    await op.locator('[data-md-kfnum="opacity"]').blur()
    await seekTo(page, 3)
    await page.locator('[data-row="ov"] [data-block="ov"]').click()
    await op.locator('[data-md-kf-toggle]').click()
    await op.locator('[data-md-kfnum="opacity"]').fill('1')
    await op.locator('[data-md-kfnum="opacity"]').blur()
    await seekTo(page, 2)
    await page.locator('[data-md-bin-item="tone.wav"] [data-md-to="a"]').click()
    await seekTo(page, 3)
    for (let i = 0; i < 15; i++) await page.keyboard.press('ArrowRight')
    await page.locator('[data-md-add-text]').click()
    await page.locator('[data-md-timing] [data-md-tm="dur"]').fill('0.5')
    await page.locator('[data-md-timing] [data-md-tm="dur"]').blur()
    await page.locator('[data-md-add-sub]').click()
    await page.locator('[data-md-field="dur"]').fill('00:00:04')
    await page.locator('[data-md-field="dur"]').press('Enter')
    await shot('1-prosjekt')

    // angre og gjør om, modusbytte (data beholdes)
    await page.keyboard.press('Control+z')
    await expect(page.locator('[data-md-field="dur"]')).toHaveValue('')
    await page.keyboard.press('Control+Shift+z')
    await expect(page.locator('[data-md-field="dur"]')).toHaveValue('00:00:04')
    await page.locator('[data-adv-toggle]').click()
    await expect(page.locator('[data-md-bin]')).toHaveCount(0)
    await expect(page.locator('[data-row="ov"] [data-block="ov"]')).toHaveCount(1)
    await page.locator('[data-adv-toggle]').click()

    // lagre og last inn
    if (await page.getByRole('button', { name: 'Lagre', exact: true }).count()) {
      await page.getByRole('button', { name: 'Lagre', exact: true }).click()
      await expect(page.getByText('Prosjektet er lagret.')).toBeVisible()
    }
    await page.reload()
    await expect(page.locator('[data-md-canvas]')).toBeVisible({ timeout: 30_000 })
    await expect(main(page)).toHaveCount(1)
    await expect(page.locator('[data-row="ov"] [data-block="ov"]')).toHaveCount(1)
    await expect(page.locator('[data-row="music"] [data-block="music"]')).toHaveCount(1)
    await expect(page.locator('[data-md-field="dur"]')).toHaveValue('00:00:04')

    // layout: ingen siderulling, topp- og bunnlinje på plass
    const lay = await page.evaluate(() => ({ sh: document.documentElement.scrollHeight, h: innerHeight, credit: !!document.querySelector('main > footer'), back: !!document.querySelector('a[class*="backPill"]') }))
    console.log(`[motion-dev] layout: ${JSON.stringify(lay)}`)
    expect(lay.sh).toBeLessThanOrEqual(lay.h)
    expect(lay.credit && lay.back).toBe(true)

    // ekte eksport (720p, 30 fps) og kontroll av filen
    await page.getByRole('button', { name: 'Eksporter', exact: true }).click()
    await page.locator('[data-md-exp-res="720"]').click()
    await page.locator('[data-md-exp-fps="30"]').click()
    const codec = await page.locator('[data-md-exp-codec]').getAttribute('data-md-exp-codec')
    const dl = page.waitForEvent('download', { timeout: 240_000 })
    await page.getByRole('button', { name: 'Eksporter MP4' }).click()
    const d = await dl
    const buf = fs.readFileSync(await d.path())
    const m = readMp4(buf)
    console.log(`[motion-dev] kodek i nettleseren: ${codec}; fil: ${d.suggestedFilename()} ${JSON.stringify(m)}`)
    const v = m.tracks.find((t) => t.type === 'vide')
    expect([v?.width, v?.height]).toEqual([1280, 720])
    expect(v?.samples).toBe(120)
    expect(m.tracks.some((t) => t.type === 'soun')).toBe(true)
    await shot('2-eksportert')
  } finally {
    console.log(`\n[motion-dev] problemer:\n${problems.join('\n') || '(ingen)'}`)
    await cleanup(page)
  }
})
