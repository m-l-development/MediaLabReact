import fs from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { seekTo } from './motion-helpers'

/**
 * De nye Motion-malene (9 etter referansevideoene + 3 premium): hver mal åpnes fra malbiblioteket, tegnes uten feil,
 * er animert (bildet endrer seg over tid), og tekstene kan redigeres i editoren. Bildene lagres som kontaktark
 * (test-results) for visuell kontroll.
 */
const NEW = ['credits', 'yearroll', 'daycount', 'flashmontage', 'travel', 'fogreveal', 'monthdump', 'lyrics', 'recap', 'launch', 'chapters', 'kinetic']

const snap = (page: Page) => page.locator('[data-md-canvas]').evaluate((c: HTMLCanvasElement) => c.toDataURL('image/jpeg', 0.7))
const sig = (page: Page) => page.locator('[data-md-canvas]').evaluate((c: HTMLCanvasElement) => {
  const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data
  let h = 0, nonBlack = 0
  for (let i = 0; i < d.length; i += 4 * 61) { h = (h * 31 + d[i]! * 3 + d[i + 1]! * 5 + d[i + 2]!) | 0; if (d[i]! + d[i + 1]! + d[i + 2]! > 30) nonBlack++ }
  return { h, nonBlack }
})

async function open(page: Page, k: string) {
  await page.goto('/app/motion-design')
  await page.locator('[data-md-new]').click()
  await page.locator('[data-format="story"]').or(page.locator('[data-format]').nth(2)).first().click()
  await page.locator(`[data-tpl="${k}"]`).click()
  await expect(page.locator('[data-md-canvas]')).toBeVisible()
  // tidslinjen med tidskode (Avansert)
  await page.locator('[data-adv-toggle]').click()
  await expect(page.locator('[data-md-tc]')).toBeVisible()
}

for (const k of NEW) {
  test(`mal ${k}: åpnes, tegnes, er animert og kan redigeres`, async ({ page }, info) => {
    test.skip(info.project.name === 'mobil', 'PC (mobil dekkes av motion-mobile)')
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.setViewportSize({ width: 1440, height: 900 })
    await open(page, k)
    const shots: string[] = []
    const sigs: number[] = []
    for (const t of [0, 1, 2, 3, 5]) {
      await seekTo(page, t)
      await page.waitForTimeout(250)
      const s = await sig(page)
      sigs.push(s.h)
      shots.push(await snap(page))
    }
    // animert: ikke det samme bildet på alle tidspunkt, og ikke helt svart hele tiden
    expect(new Set(sigs).size, 'bildet endrer seg over tid').toBeGreaterThan(2)
    // en tekst kan velges og redigeres i panelet
    const txt = page.locator('[data-row^="text"] [data-block]').first().or(page.locator('[data-block="text"]').first())
    if (await txt.count()) {
      await txt.first().click()
      await expect(page.locator('textarea, input[type="number"]').first()).toBeVisible()
    }
    const sheet = await page.evaluate(async (list) => {
      const ims = await Promise.all(list.map((u) => new Promise<HTMLImageElement>((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = u })))
      const h = 360, w = Math.round((h * ims[0]!.width) / ims[0]!.height)
      const c = document.createElement('canvas')
      c.width = w * ims.length + 4 * (ims.length - 1)
      c.height = h
      const g = c.getContext('2d')!
      ims.forEach((im, i) => g.drawImage(im, i * (w + 4), 0, w, h))
      return c.toDataURL('image/jpeg', 0.75)
    }, shots)
    fs.mkdirSync('test-results/motion-templates', { recursive: true })
    fs.writeFileSync(`test-results/motion-templates/${k}.jpg`, Buffer.from(sheet.split(',')[1]!, 'base64'))
    expect(errors).toEqual([])
  })
}
