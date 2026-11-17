import fs from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { png } from './png'

/**
 * Isolate Subject: fanene «Hva skal beholdes» / «Hva skal fjernes», flervalg og «Gjennomfør isolering» (én samlet
 * operasjon), og «Fyll med omgivelser» / «Gjennomsiktig» / «Farge» ved fjerning – også i «Finjuster masken».
 * Uten AI-nedlasting (Hugging Face stengt ute): logo/tekst på ensfarget bakgrunn (fargenøkkel), firkanter uten AI og
 * innholdsbevisst utfylling. Person, Objekt og Bakgrunn med ekte modeller: e2e-real/isolate-combine.spec.ts.
 * Bildet (300 × 200): hvit bakgrunn, rødt kvadrat (40–100 × 60–140) og blått kvadrat (200–260 × 60–140).
 */
const W = 300
const H = 200
const inRed = (x: number, y: number) => x >= 40 && x < 100 && y >= 60 && y < 140
const inBlue = (x: number, y: number) => x >= 200 && x < 260 && y >= 60 && y < 140
const IMG = png(W, H, (x, y) => (inRed(x, y) ? [220, 30, 30, 255] : inBlue(x, y) ? [30, 60, 220, 255] : [255, 255, 255, 255]))
const RED = [70, 100] as const
const BLUE = [230, 100] as const
const BG = [150, 30] as const

async function open(page: Page) {
  await page.route(/huggingface\.co|hf\.co/, (r) => r.abort())
  await page.goto('/app/isolate-subject')
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: /Slipp et bilde her/ }).click()
  await (await chooser).setFiles({ name: 'former.png', mimeType: 'image/png', buffer: IMG })
  await page.getByRole('button', { name: 'Hopp over' }).click()
}

/** RGBA i den eksporterte PNG-en ved bildepunktene. */
async function exported(page: Page, file: string, pts: readonly (readonly [number, number])[]): Promise<number[][]> {
  const dl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Last ned PNG' }).click()
  await (await dl).saveAs(file)
  const nei = page.getByRole('button', { name: 'Nei takk' })
  await nei.click({ timeout: 3000 }).catch(() => {})
  return page.evaluate(async ([b64, list]) => {
    const bmp = await createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob())
    const c = Object.assign(document.createElement('canvas'), { width: bmp.width, height: bmp.height })
    const g = c.getContext('2d') as CanvasRenderingContext2D
    g.drawImage(bmp, 0, 0)
    return list.map(([x, y]) => [...g.getImageData(x, y, 1, 1).data])
  }, [fs.readFileSync(file).toString('base64'), pts] as const)
}

const near = (a: number[] | undefined, b: number[], tol = 40) => !!a && b.every((v, i) => Math.abs((a[i] ?? -1) - v) <= tol)
const tab = (page: Page, k: 'keep' | 'remove') => page.locator(`[data-tab="${k}"]`).click()
const pick = (page: Page, k: string) => page.locator(`[data-target="${k}"]`).click()
const method = (page: Page, name: string, where = 'mark') => page.locator(`[data-fill-mode="${where}"]`).getByRole('button', { name, exact: true }).click()
const run = async (page: Page) => {
  await page.locator('[data-run]').click()
  await expect(page.locator('[data-run]')).toHaveText('Gjennomfør isolering', { timeout: 60_000 })
}

/** Firkant i bildet (bildepiksler) på arbeidsflaten. */
async function dragBox(page: Page, x0: number, y0: number, x1: number, y1: number) {
  const canvas = page.locator('main canvas').first()
  await canvas.scrollIntoViewIfNeeded()
  const b = (await canvas.boundingBox())!
  await page.mouse.move(b.x + (b.width * x0) / W, b.y + (b.height * y0) / H)
  await page.mouse.down()
  await page.mouse.move(b.x + (b.width * (x0 + x1)) / 2 / W, b.y + (b.height * (y0 + y1)) / 2 / H, { steps: 4 })
  await page.mouse.move(b.x + (b.width * x1) / W, b.y + (b.height * y1) / H, { steps: 4 })
  await page.mouse.up()
}

test('faner og flervalg: valg kan kombineres, et valg står bare i én fane, oppsummeringen viser hva som skjer', async ({ page }) => {
  await open(page)
  await expect(page.getByRole('tab', { name: 'Hva skal beholdes' })).toHaveAttribute('aria-selected', 'true')
  await pick(page, 'person')
  await pick(page, 'background')
  await expect(page.locator('[data-target="person"]')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('[data-target="background"]')).toHaveAttribute('aria-pressed', 'true')
  await tab(page, 'remove')
  await pick(page, 'logo')
  await pick(page, 'text')
  await expect(page.locator('[data-target="logo"]')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('[data-target="person"]')).toHaveAttribute('data-other', 'keep')
  // standard ved fjerning: «Fyll med omgivelser»
  await expect(page.locator('[data-fill-mode="mark"]').getByRole('button', { name: 'Fyll med omgivelser' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('[data-run-summary]')).toContainText('Beholdes: person, bakgrunn.')
  await expect(page.locator('[data-run-summary]')).toContainText('Fjernes: logo, tekst (fyll med omgivelser).')
  // motstrid: Person valgt under Fjern flyttes fra Behold (siste valg gjelder), og det sies tydelig
  await pick(page, 'person')
  await expect(page.locator('[data-run-note]')).toContainText('Flyttet fra «Hva skal beholdes» til «Hva skal fjernes»')
  await tab(page, 'keep')
  await expect(page.locator('[data-target="person"]')).toHaveAttribute('aria-pressed', 'false')
  await expect(page.locator('[data-target="person"]')).toHaveAttribute('data-other', 'remove')
  await expect(page.locator('[data-run]')).toBeEnabled()
})

test('fjern logo (ensfarget bakgrunn): Gjennomsiktig, Farge og Fyll med omgivelser; bakgrunnen beholdes og blir ikke gjennomsiktig', async ({ page }, info) => {
  await open(page)
  await tab(page, 'remove')
  await pick(page, 'logo')
  await method(page, 'Gjennomsiktig')
  await run(page)
  await expect(page.locator('[data-run-note]')).toContainText('Ferdig')
  let px = await exported(page, info.outputPath('gjennomsiktig.png'), [RED, BLUE, BG])
  expect(px[0]?.[3], 'logoen er fjernet').toBe(0)
  expect(px[1]?.[3]).toBe(0)
  expect(near(px[2], [255, 255, 255, 255]), 'bakgrunnen er beholdt').toBe(true)

  // nytt valg rett etter: starter fra bildet før forrige forsøk (ikke oppå det gjennomsiktige)
  await method(page, 'Farge')
  await page.getByRole('button', { name: 'Svart' }).first().click()
  await run(page)
  await expect(page.locator('[data-effect="color"]')).toBeVisible()
  await page.locator('[data-effect-apply]').click()
  px = await exported(page, info.outputPath('farge.png'), [RED, BLUE, BG])
  expect(near(px[0], [0, 0, 0, 255]), 'logoen er svart').toBe(true)
  expect(near(px[1], [0, 0, 0, 255])).toBe(true)
  expect(near(px[2], [255, 255, 255, 255])).toBe(true)

  // Fyll med omgivelser fra originalen
  await method(page, 'Fyll med omgivelser')
  await page.getByRole('button', { name: 'Tilbakestill', exact: true }).click()
  await run(page)
  await expect(page.locator('[data-effect="fill"]')).toBeVisible({ timeout: 60_000 })
  await page.locator('[data-effect-apply]').click()
  px = await exported(page, info.outputPath('fyll.png'), [RED, BLUE, BG])
  expect(near(px[0], [255, 255, 255, 255], 60), 'rødt erstattet av omgivelsene (hvitt)').toBe(true)
  expect(near(px[1], [255, 255, 255, 255], 60), 'blått erstattet av omgivelsene (hvitt)').toBe(true)
  expect(near(px[2], [255, 255, 255, 255])).toBe(true)
})

test('flere elementer i én operasjon: to røde firkanter fjernes samtidig med Farge; Behold logo isolerer som før', async ({ page }, info) => {
  await open(page)
  await tab(page, 'remove')
  await page.getByRole('button', { name: /^Merk i bildet/ }).click()
  await dragBox(page, 30, 50, 110, 150)
  await dragBox(page, 190, 50, 270, 150)
  await expect(page.locator('[data-run-summary]')).toContainText('Fjernes: det merkede')
  await method(page, 'Farge')
  await run(page)
  await page.locator('[data-effect-apply]').click()
  let px = await exported(page, info.outputPath('to.png'), [RED, BLUE, BG])
  expect(near(px[0], [255, 255, 255, 255]), 'rødt fylt med hvitt').toBe(true)
  expect(near(px[1], [255, 255, 255, 255]), 'blått fylt med hvitt').toBe(true)
  expect(near(px[2], [255, 255, 255, 255])).toBe(true)

  // «Behold logo» alene gir samme utklipp som før (bakgrunnen gjennomsiktig)
  await page.getByRole('button', { name: 'Tilbakestill', exact: true }).click()
  await tab(page, 'keep')
  await pick(page, 'logo')
  await run(page)
  await expect(page.getByText('Fjerner bakgrunnsfargen. Ingen AI-modell trengs.')).toBeVisible()
  px = await exported(page, info.outputPath('behold.png'), [RED, BLUE, BG])
  expect(near(px[0], [220, 30, 30, 255])).toBe(true)
  expect(near(px[1], [30, 60, 220, 255])).toBe(true)
  expect(px[2]?.[3], 'bakgrunnen er gjennomsiktig').toBe(0)
})

test('logo på bakgrunn som ikke er ensfarget: brukeren bes merke den i stedet for at noe feil fjernes', async ({ page }) => {
  await page.route(/huggingface\.co|hf\.co/, (r) => r.abort())
  await page.goto('/app/isolate-subject')
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: /Slipp et bilde her/ }).click()
  await (await chooser).setFiles({ name: 'striper.png', mimeType: 'image/png', buffer: png(W, H, (x, y) => (inRed(x, y) ? [250, 210, 20, 255] : (x >> 3) % 2 ? [150, 150, 150, 255] : [40, 90, 40, 255])) })
  await page.getByRole('button', { name: 'Hopp over' }).click()
  await tab(page, 'remove')
  await pick(page, 'logo')
  await run(page)
  await expect(page.getByRole('alert')).toContainText('Dra en firkant rundt dem i bildet')
  await expect(page.getByRole('button', { name: /^Merk i bildet/ })).toHaveAttribute('aria-pressed', 'true')
})

test('Finjuster masken: det som fjernes med firkant får Fyll (standard), Farge eller Gjennomsiktig; Avbryt og Angre virker', async ({ page, isMobile }, info) => {
  test.skip(isMobile, 'maskeredigering med mus testes på PC')
  await page.setViewportSize({ width: 1440, height: 1000 })
  await open(page)
  await page.locator('[data-mask-open]').click()
  await expect(page.locator('[data-mask-canvas]')).toBeVisible()
  await expect(page.locator('[data-fill-mode="edit"]').getByRole('button', { name: 'Fyll med omgivelser' })).toHaveAttribute('aria-pressed', 'true')
  const rect = async () => {
    await page.locator('[data-mask-tool="rect"]').click()
    await page.locator('[data-mask-keep="0"]').click()
    const v = await page.locator('[data-mask-canvas]').evaluate((c: HTMLCanvasElement & { mlMaskView?: { s: number; ox: number; oy: number } }) => {
      const r = c.getBoundingClientRect()
      return { ...c.mlMaskView!, left: r.left, top: r.top }
    })
    const at = (x: number, y: number) => ({ x: v.left + v.ox + x * v.s, y: v.top + v.oy + y * v.s })
    const a = at(30, 50)
    const b = at(110, 150)
    await page.mouse.move(a.x, a.y)
    await page.mouse.down()
    await page.mouse.move(b.x, b.y, { steps: 6 })
    await page.mouse.up()
  }
  await rect()
  await method(page, 'Farge', 'edit')
  await page.locator('[data-edit-fill]').getByRole('button', { name: 'Svart' }).click()
  await page.locator('[data-mask-done]').click()
  await expect(page.locator('[data-effect="color"]')).toBeVisible()
  await page.locator('[data-effect-apply]').click()
  let px = await exported(page, info.outputPath('finjuster-farge.png'), [RED, BLUE, BG])
  expect(near(px[0], [0, 0, 0, 255]), 'det fjernede er svart og synlig').toBe(true)
  expect(near(px[1], [30, 60, 220, 255])).toBe(true)
  expect(near(px[2], [255, 255, 255, 255])).toBe(true)

  // Angre: tilbake til redigeringen med området gjennomsiktig; én til: originalen
  await page.getByRole('button', { name: 'Tilbake', exact: true }).click()
  px = await exported(page, info.outputPath('finjuster-angre.png'), [RED])
  expect(px[0]?.[3]).toBe(0)
  await page.getByRole('button', { name: 'Tilbake', exact: true }).click()

  // Fyll med omgivelser (standard) med pensel/former, så Avbryt: området blir gjennomsiktig (det redigeringen gjorde)
  await page.locator('[data-mask-open]').click()
  await rect()
  await method(page, 'Fyll med omgivelser', 'edit')
  await page.locator('[data-mask-done]').click()
  await expect(page.locator('[data-effect="fill"]')).toBeVisible({ timeout: 60_000 })
  await page.locator('[data-effect-apply]').click()
  px = await exported(page, info.outputPath('finjuster-fyll.png'), [RED, BG])
  expect(near(px[0], [255, 255, 255, 255], 60), 'rødt erstattet av omgivelsene').toBe(true)
  expect(px[1]?.[3]).toBe(255)
})
