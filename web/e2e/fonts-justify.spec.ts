import fs from 'node:fs'
import { expect, test, type Page } from '@playwright/test'

/**
 * Verifisering (2026-11-14): fonter uten Æ, Ø og Å sier det tydelig også i et lagret prosjekt, og ÆØÅ tegnes (i en
 * reservefont) både på lerretet og i eksporten. Blokkjustering i Photo-malene 061, 062 og 100: bryteren endrer
 * tegningen og kan slås på igjen, og eksporten er lik forhåndsvisningen.
 */
test.beforeEach(() => test.skip(test.info().project.name === 'mobil', 'PC'))

const C = '[data-pd-wrap] canvas'

/** Lerretet og en eksportert PNG skalert til samme lille størrelse, og gjennomsnittlig avvik (0–255). */
async function diffToExport(page: Page, file: string): Promise<number> {
  return page.evaluate(async ({ b64, sel }) => {
    const cv = document.querySelector(sel) as HTMLCanvasElement
    const bmp = await createImageBitmap(await (await fetch('data:image/png;base64,' + b64)).blob())
    const W = 240
    const H = Math.round((W * bmp.height) / bmp.width)
    const a = (typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(W, H) : Object.assign(document.createElement('canvas'), { width: W, height: H })).getContext('2d') as OffscreenCanvasRenderingContext2D
    const b = (typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(W, H) : Object.assign(document.createElement('canvas'), { width: W, height: H })).getContext('2d') as OffscreenCanvasRenderingContext2D
    a.drawImage(bmp, 0, 0, W, H)
    b.drawImage(cv, 0, 0, W, H)
    const A = a.getImageData(0, 0, W, H).data
    const B = b.getImageData(0, 0, W, H).data
    let s = 0
    for (let i = 0; i < A.length; i += 4) s += (Math.abs((A[i] ?? 0) - (B[i] ?? 0)) + Math.abs((A[i + 1] ?? 0) - (B[i + 1] ?? 0)) + Math.abs((A[i + 2] ?? 0) - (B[i + 2] ?? 0))) / 3
    return s / (A.length / 4)
  }, { b64: fs.readFileSync(file).toString('base64'), sel: C })
}

const print = (page: Page) => page.locator(C).first().evaluate((c: HTMLCanvasElement) => {
  const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data
  let h = 0
  for (let i = 0; i < d.length; i += 4 * 97) h = (h * 31 + d[i]! * 3 + d[i + 1]! * 5 + d[i + 2]! * 7 + d[i + 3]!) | 0
  return h
})

async function exportPng(page: Page, path: string) {
  await page.getByRole('button', { name: 'Eksporter', exact: true }).click()
  const dl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Last ned', exact: true }).click()
  await (await dl).saveAs(path)
  // eksportpanelet lukkes, så redigeringspanelet er tilgjengelig igjen
  await page.keyboard.press('Escape')
  const close = page.getByRole('button', { name: /^(Lukk|Ferdig|Avbryt)$/ }).filter({ visible: true })
  if (await page.getByRole('button', { name: 'Last ned', exact: true }).filter({ visible: true }).count()) await close.first().click().catch(() => undefined)
  await expect(page.getByRole('button', { name: 'Last ned', exact: true }).filter({ visible: true })).toHaveCount(0)
}

test('Bagnard (uten ÆØÅ): varsel i velgeren også i et lagret prosjekt, og ÆØÅ tegnes i eksporten', async ({ page }, info) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/app/photo-design')
  await page.locator('[data-tpl="blank"]').click()
  await page.getByRole('button', { name: 'Tekst', exact: true }).click()
  await page.locator('[data-pd-text]').fill('ÆØÅ')
  // fontpopupen: Bagnard er merket «Uten ÆØÅ»
  const P = page.getByRole('dialog', { name: 'Velg font' })
  const bag = P.locator('.fp-row').filter({ has: page.locator('.fp-sample', { hasText: /^Bagnard$/ }) }).first()
  const find = async () => {
    await page.locator('[data-fontpop] .fp-trigger').first().click()
    await P.getByRole('tab', { name: 'Alle' }).click()
    await P.getByPlaceholder(/Søk/).fill('Bagnard')
  }
  await find()
  await expect(bag.locator('.fp-warn')).toBeVisible()
  await bag.click()
  await page.getByRole('button', { name: 'Lagre', exact: true }).first().click()
  await expect(page.getByText('Ikke lagret')).toHaveCount(0)
  await page.getByRole('button', { name: /Prosjekter/ }).click()
  await page.reload()
  await page.locator('[data-project]').first().click()
  await page.locator('[data-layer]').filter({ hasText: /ÆØÅ/ }).first().click().catch(() => undefined)
  // eksisterende prosjekt: fonten er fortsatt Bagnard, og varselet står der
  await expect(page.locator('[data-fontpop] .fp-trigger').first()).toContainText('Bagnard')
  await find()
  await expect(bag.locator('.fp-warn')).toBeVisible()
  await page.keyboard.press('Escape')
  // ÆØÅ tegnes (i reservefonten): mørke piksler midt på, både på lerretet og i eksporten
  const file = info.outputPath('aeoa.png')
  await exportPng(page, file)
  const ink = await page.evaluate(async (b64) => {
    const bmp = await createImageBitmap(await (await fetch('data:image/png;base64,' + b64)).blob())
    const c = (typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(bmp.width, bmp.height) : Object.assign(document.createElement('canvas'), { width: bmp.width, height: bmp.height }))
    const g = c.getContext('2d') as OffscreenCanvasRenderingContext2D
    g.drawImage(bmp, 0, 0)
    const d = g.getImageData(bmp.width * 0.3, bmp.height * 0.4, bmp.width * 0.4, bmp.height * 0.2).data
    let n = 0
    for (let i = 0; i < d.length; i += 4) if ((d[i] ?? 0) + (d[i + 1] ?? 0) + (d[i + 2] ?? 0) < 600) n++
    return n / (d.length / 4)
  }, fs.readFileSync(file).toString('base64'))
  expect(ink).toBeGreaterThan(0.02)
  expect(await diffToExport(page, file)).toBeLessThan(6)
  expect(errors).toEqual([])
})

for (const id of ['061', '062', '100']) {
  test(`Photo-mal ${id}: blokkjustert, bryteren virker, eksporten er lik forhåndsvisningen`, async ({ page }, info) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/app/photo-design')
    await page.locator('[data-pd-lib-open]').click()
  const lib = page.locator('[data-tpl-picker] [data-tpl-lib]')
    const cat = id === '100' ? 'Hverdag, kafé, info og sosiale medier' : 'Bibelvers, sitat og typografi'
    await lib.locator('[data-tpl-cats] button', { hasText: cat }).click()
    await lib.locator(`[data-tpl-item="${id}"]`).click()
    await expect(page.locator('[data-pd-view="edit"]')).toBeVisible()
    await page.waitForTimeout(800)
    // forhåndsvisning og eksport er like (blokkjusteringen kommer med)
    const file = info.outputPath(`${id}.png`)
    await exportPng(page, file)
    expect(await diffToExport(page, file)).toBeLessThan(6)
    // velg det blokkjusterte tekstlaget: «Blokkjuster» står på (vises også i Enkel modus fordi laget bruker den)
    // radene klikkes helt til venstre (knappene for synlighet og lås ligger til høyre)
    const rows = page.locator('[data-layer]')
    const n = await rows.count()
    let found = false
    for (let i = 0; i < n && !found; i++) {
      await rows.nth(i).click({ position: { x: 6, y: 6 } })
      found = (await page.getByRole('switch', { name: 'Blokkjuster' }).count()) > 0
    }
    expect(found, 'blokkjustert tekstlag').toBe(true)
    await expect(page.locator('[data-pd-locked]')).toHaveCount(0)
    const sw = page.getByRole('switch', { name: 'Blokkjuster' })
    await expect(sw).toHaveAttribute('aria-checked', 'true')
    const on = await print(page)
    await sw.click()
    await page.waitForTimeout(350)
    expect(await print(page), 'av: annen tegning').not.toBe(on)
    await sw.click()
    await page.waitForTimeout(350)
    expect(await print(page), 'på igjen: samme tegning').toBe(on)
    expect(errors).toEqual([])
  })
}

test('Enkel modus: en funksjon laget bruker (stiplet kant) kan slås av og på igjen', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/app/photo-design')
  await page.locator('[data-tpl="blank"]').click()
  await page.locator('[data-pd-shapes] [data-shape="rect"]').click()
  // stiplet kant slås på i Avansert modus, så tilbake til Enkel modus (tekstens glød er nå en effekt i fontpopupen)
  await page.locator('[data-adv-toggle]').click()
  await page.getByRole('switch', { name: 'Stiplet kant' }).click()
  await page.locator('[data-adv-toggle]').click()
  const sw = page.getByRole('switch', { name: 'Stiplet kant' })
  await expect(sw).toHaveAttribute('aria-checked', 'true')
  await sw.click()
  await expect(sw).toHaveAttribute('aria-checked', 'false')
  await sw.click()
  await expect(sw).toHaveAttribute('aria-checked', 'true')
})
