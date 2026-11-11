import fs from 'node:fs'
import { expect, test, type Page } from '@playwright/test'

/**
 * Photo Design: fargekurve-gradienten med egne farger. Én modell: fargeeditoren og fordelingskurven endrer den samme
 * gradienten (farger i editoren vises i kurven; kurven flytter overgangene og beholder fargene). Ingen gradient lages av
 * å åpne panelet eller bevege en glider. Resultatet leses fra lerretet og fra eksporten (hvit bakgrunn under).
 */
type RGB = [number, number, number]

async function rgbAt(page: Page, pts: [number, number][]): Promise<RGB[]> {
  return page.locator('[data-pd-wrap] canvas').first().evaluate((c: HTMLCanvasElement, p) => {
    const g = c.getContext('2d') as CanvasRenderingContext2D
    return p.map(([x, y]) => { const d = g.getImageData(Math.floor(x * (c.width - 1)), Math.floor(y * (c.height - 1)), 1, 1).data; return [d[0] ?? 0, d[1] ?? 0, d[2] ?? 0] as RGB })
  }, pts)
}
const ROW: [number, number][] = [[0.04, 0.5], [0.2, 0.5], [0.5, 0.5], [0.8, 0.5], [0.96, 0.5]]
const row = (page: Page) => rgbAt(page, ROW)
const settle = (page: Page) => page.waitForTimeout(250)
const near = (a: RGB | undefined, b: RGB, tol = 12) => !!a && a.every((v, i) => Math.abs(v - (b[i] ?? 0)) <= tol)
const WHITE: RGB = [255, 255, 255]
const BLUE: RGB = [77, 107, 255]
const MAGENTA: RGB = [255, 0, 255]

async function open(page: Page) {
  await page.goto('/app/photo-design')
  await page.locator('[data-tpl="blank"]').click()
  if (test.info().project.name === 'mobil') await page.getByRole('button', { name: 'Rediger' }).last().click()
  const box = page.locator('[data-curve-gradient]')
  await expect(box).toHaveAttribute('data-cg-state', 'none')
  return box
}

/** Drar et punkt i fordelingskurven fra (x, y) til (x, y2) (0–1 i ruten, y opp). */
async function dragCurve(page: Page, x: number, y: number, y2: number) {
  const svg = page.locator('[data-curve-gradient] [data-cg-svg]')
  await svg.scrollIntoViewIfNeeded()
  const b = await svg.boundingBox()
  if (!b) throw new Error('kurven')
  const at = (u: number, v: number) => [b.x + ((3 + u * 100) / 106) * b.width, b.y + ((3 + (1 - v) * 100) / 106) * b.height] as const
  await page.mouse.move(...at(x, y))
  await page.mouse.down()
  await page.mouse.move(...at(x, (y + y2) / 2), { steps: 4 })
  await page.mouse.move(...at(x, y2), { steps: 4 })
  await page.mouse.up()
}

test('egne farger, toveis med kurven, retning, plassering, styrke, transparens, av/på, lagring, eksport og angre', async ({ page }, info) => {
  test.skip(info.project.name === 'mobil', 'mobil: egen test under')
  test.setTimeout(120_000)
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.setViewportSize({ width: 1440, height: 900 })
  const box = await open(page)
  await settle(page)
  expect((await row(page)).every((v) => near(v, WHITE, 0))).toBe(true)
  await expect(box.locator('[data-cg-angle]')).toHaveCount(0)

  // 1. lages bare med knappen: fra bakgrunnsfargen (hvit) til blå, ikke svart
  await box.locator('[data-cg-create]').click()
  await expect(box).toHaveAttribute('data-cg-state', 'on')
  await settle(page)
  let r = await row(page)
  expect(near(r[0], WHITE, 20) && near(r[4], BLUE, 20)).toBe(true)

  // 2. en farge til (midt i), valgt med fargevelgeren → på lerretet og i kurven
  await box.locator('[data-cg-stop-add]').click()
  await expect(box.locator('[data-cg-stop]')).toHaveCount(3)
  await box.locator('[data-cg-color]').fill('#ff00ff')
  await settle(page)
  r = await row(page)
  expect(near(r[2], MAGENTA, 25)).toBe(true)
  await expect(box.locator('[data-cg-stopline]')).toHaveCount(3)
  await expect(box.locator('[data-cg-stopline="1"] circle')).toHaveAttribute('fill', '#ff00ff')

  // 3. flytt fargen (tastatur på merket): magenta havner til venstre
  await box.locator('[data-cg-stop="2"]').focus()
  for (let i = 0; i < 3; i++) await page.keyboard.press('Shift+ArrowLeft')
  await settle(page)
  r = await row(page)
  expect(near(r[1], MAGENTA, 30)).toBe(true)
  expect(near(r[2], MAGENTA, 30)).toBe(false)

  // 4. kurven: midt på flaten → nesten slutten av fargerekken (blå); fargene beholdes
  const markBefore = await box.locator('[data-cg-result] i').nth(1).evaluate((e) => (e as HTMLElement).style.left)
  await dragCurve(page, 0.5, 0.5, 0.92)
  await settle(page)
  r = await row(page)
  expect(near(r[2], BLUE, 40)).toBe(true)
  await expect(box.locator('[data-cg-stop]')).toHaveCount(3)
  await expect(box.locator('[data-cg-color]')).toHaveValue('#ff00ff')
  // editoren viser den nye fordelingen: magenta havner et annet sted
  expect(await box.locator('[data-cg-result] i').nth(1).evaluate((e) => (e as HTMLElement).style.left)).not.toBe(markBefore)
  // og en fargeendring etter kurven: kurven og lerretet følger, kurven er urørt
  await box.locator('[data-cg-color]').fill('#00ff00')
  await expect(box.locator('[data-cg-stopline="1"] circle')).toHaveAttribute('fill', '#00ff00')
  await settle(page)
  // der editoren viser at fargen havner (etter kurven), er lerretet grønt
  const land = parseFloat(await box.locator('[data-cg-result] i').nth(1).evaluate((e) => (e as HTMLElement).style.left)) / 100
  expect(near((await rgbAt(page, [[land, 0.5]]))[0], [0, 255, 0], 40)).toBe(true)
  await expect(box.locator('[data-cg-dist-reset]')).toBeEnabled()

  // 5. retning: 180° = loddrett (venstre og høyre like)
  await box.locator('[data-cg-angle]').fill('180')
  await settle(page)
  r = await row(page)
  expect(near(r[0], r[4] as RGB, 4)).toBe(true)
  await box.locator('[data-cg-angle]').fill('90')

  // 6. plassering: midten mot venstre endrer midtpunktet
  await settle(page)
  const mid0 = (await row(page))[2]
  await box.locator('[data-cg-pos="x"]').fill('20')
  await settle(page)
  expect(near((await row(page))[2], mid0 as RGB, 10)).toBe(false)
  await box.locator('[data-cg-pos="x"]').fill('50')

  // 7. fargestyrke 0 = flat; transparens 100 = bakgrunnen (hvit) vises
  await box.locator('[data-cg-int]').fill('0')
  await settle(page)
  r = await row(page)
  expect(r.every((v) => near(v, r[0] as RGB, 4))).toBe(true)
  await box.locator('[data-cg-int]').fill('100')
  await box.locator('[data-cg-transp]').fill('100')
  await settle(page)
  expect((await row(page)).every((v) => near(v, WHITE, 2))).toBe(true)
  await box.locator('[data-cg-transp]').fill('40')
  await settle(page)
  const shown = await row(page)

  // 8. eksporten er lik forhåndsvisningen
  await page.getByRole('button', { name: 'Eksporter', exact: true }).click()
  const dl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Last ned', exact: true }).click()
  const file = info.outputPath('gradient.png')
  await (await dl).saveAs(file)
  const out = await page.evaluate(async ({ b64, pts }) => {
    const bmp = await createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob())
    const c = Object.assign(document.createElement('canvas'), { width: bmp.width, height: bmp.height })
    const g = c.getContext('2d') as CanvasRenderingContext2D
    g.drawImage(bmp, 0, 0)
    return pts.map(([x, y]) => [...g.getImageData(Math.floor(x * (bmp.width - 1)), Math.floor(y * (bmp.height - 1)), 1, 1).data].slice(0, 3))
  }, { b64: fs.readFileSync(file).toString('base64'), pts: ROW })
  out.forEach((v, i) => expect(near(v as RGB, shown[i] as RGB, 8), `eksport punkt ${i}`).toBe(true))
  await page.keyboard.press('Escape')

  // 9. av: hvit bakgrunn, ◎ borte; lagring og omlasting beholder alt; på: samme gradient
  await box.locator('[data-cg-toggle]').click()
  await expect(box).toHaveAttribute('data-cg-state', 'off')
  await settle(page)
  expect((await row(page)).every((v) => near(v, WHITE, 0))).toBe(true)
  await expect(page.locator('[data-pd-fillpin]')).toHaveCount(0)
  await page.getByRole('button', { name: 'Lagre', exact: true }).first().click()
  await expect(page.getByText('Ikke lagret')).toHaveCount(0)
  await page.getByRole('button', { name: /Prosjekter/ }).click()
  await page.reload()
  await page.locator('[data-project]').first().click()
  await expect(box).toHaveAttribute('data-cg-state', 'off')
  await box.locator('[data-cg-toggle]').click()
  await expect(box.locator('[data-cg-stop]')).toHaveCount(3)
  await settle(page)
  expect((await row(page)).every((v, i) => near(v, shown[i] as RGB, 3))).toBe(true)

  // 10. tilbakestill: retning/plassering/styrke/transparens; «alt» gir også standardfargene
  await box.locator('[data-cg-angle]').fill('30')
  await box.locator('[data-cg-reset]').click()
  await expect(box.locator('[data-cg-angle]')).toHaveValue('90')
  await expect(box.locator('[data-cg-transp]')).toHaveValue('0')
  await expect(box.locator('[data-cg-stop]')).toHaveCount(3)
  await box.locator('[data-cg-reset-all]').click()
  await expect(box.locator('[data-cg-stop]')).toHaveCount(2)

  // 11. fjern: borte straks; Angre gir den tilbake, Gjør om fjerner den igjen
  await box.locator('[data-cg-remove]').click()
  await expect(box).toHaveAttribute('data-cg-state', 'none')
  await settle(page)
  expect((await row(page)).every((v) => near(v, WHITE, 0))).toBe(true)
  await page.getByRole('button', { name: 'Angre', exact: true }).click()
  await expect(box).toHaveAttribute('data-cg-state', 'on')
  await page.getByRole('button', { name: 'Gjør om', exact: true }).click()
  await expect(box).toHaveAttribute('data-cg-state', 'none')
  expect(errors).toEqual([])
})

test('mobil: egne farger, kurven følger, transparens, av/på og fjern i Rediger-skuffen', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobil', 'PC: testen over')
  const box = await open(page)
  await box.locator('[data-cg-create]').click()
  await box.locator('[data-cg-stop-add]').click()
  await box.locator('[data-cg-color]').fill('#ff00ff')
  await expect(box.locator('[data-cg-stopline="1"] circle')).toHaveAttribute('fill', '#ff00ff')
  await settle(page)
  expect(near((await row(page))[2], MAGENTA, 25)).toBe(true)
  await box.locator('[data-cg-transp]').fill('100')
  await settle(page)
  expect((await row(page)).every((v) => near(v, WHITE, 2))).toBe(true)
  await box.locator('[data-cg-transp]').fill('0')
  await box.locator('[data-cg-toggle]').click()
  await expect(box).toHaveAttribute('data-cg-state', 'off')
  await settle(page)
  expect((await row(page)).every((v) => near(v, WHITE, 0))).toBe(true)
  await box.locator('[data-cg-toggle]').click()
  await box.locator('[data-cg-remove]').click()
  await expect(box).toHaveAttribute('data-cg-state', 'none')
  await settle(page)
  expect((await row(page)).every((v) => near(v, WHITE, 0))).toBe(true)
})
