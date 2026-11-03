import { expect, test, type Download, type Page } from '@playwright/test'
import fs from 'node:fs'
import { png } from './png'

/**
 * Alle eksport- og importknapper i alle verktøyene, på PC og mobil: knappen finnes og kan trykkes, importen tar imot
 * filen, og eksporten gir en ikke-tom fil av riktig type. (Isolate dekkes på begge enheter i isolate-subject.spec.ts.)
 */
test.describe.configure({ timeout: 300000 })

const IMG = png(320, 200, (x, y) => [40 + (x % 160), 120, 60 + (y % 120), 255])
const mobile = () => test.info().project.name === 'mobil'

async function errorsOf(page: Page) {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('dialog', (d) => void d.accept())
  return errors
}
/** Trykk (mobil) eller klikk (PC). */
async function press(_page: Page, l: ReturnType<Page["locator"]>) {
  await l.scrollIntoViewIfNeeded()
  if (mobile()) await l.tap()
  else await l.click()
}
/** Filen fra en nedlasting: størrelse og de første bytene. */
async function fileOf(d: Download): Promise<{ name: string; size: number; head: Buffer }> {
  const p = (await d.path())!
  const b = fs.readFileSync(p)
  return { name: d.suggestedFilename(), size: b.length, head: b.subarray(0, 12) }
}
async function download(page: Page, l: ReturnType<Page['locator']>, timeout = 60000) {
  const dl = page.waitForEvent('download', { timeout })
  await press(page, l)
  return fileOf(await dl)
}
async function upload(page: Page, l: ReturnType<Page['locator']>, file: { name: string; mimeType: string; buffer: Buffer }) {
  const ch = page.waitForEvent('filechooser')
  await press(page, l)
  await (await ch).setFiles(file)
}
const isPng = (h: Buffer) => h[0] === 0x89 && h.subarray(1, 4).toString() === 'PNG'
const isJpg = (h: Buffer) => h[0] === 0xff && h[1] === 0xd8
const isPdf = (h: Buffer) => h.subarray(0, 4).toString() === '%PDF'
const isMp4 = (h: Buffer) => h.subarray(4, 8).toString() === 'ftyp'

test('Photo Design: sikkerhetskopi, gjenoppretting, bildeimport og eksport (PNG, JPG, PDF)', async ({ page }) => {
  const errors = await errorsOf(page)
  await page.goto('/app/photo-design')
  const bk = await download(page, page.getByRole('button', { name: 'Last ned sikkerhetskopi' }))
  expect(bk.size).toBeGreaterThan(20)
  await page.locator('[data-tpl="blank"]').click()
  await expect(page.locator('[data-pd-view="edit"]')).toBeVisible()
  if (mobile()) await page.locator('[data-dock-tab="add"]').tap()
  await upload(page, page.getByRole('button', { name: 'Bilde', exact: true }).first(), { name: 'b.png', mimeType: 'image/png', buffer: IMG })
  if (mobile()) await page.locator('[data-dock-tab="layers"]').tap()
  await expect(page.locator('[data-layer]').first()).toBeAttached()
  await press(page, page.getByRole('button', { name: 'Eksporter', exact: true }).first())
  const a = await download(page, page.getByRole('button', { name: 'Last ned', exact: true }))
  expect(isPng(a.head), a.name).toBe(true)
  await press(page, page.getByRole('button', { name: 'JPG', exact: true }))
  const b = await download(page, page.getByRole('button', { name: 'Last ned', exact: true }))
  expect(isJpg(b.head), b.name).toBe(true)
  await press(page, page.getByRole('button', { name: 'PDF trykk' }))
  const c = await download(page, page.getByRole('button', { name: 'Last ned', exact: true }))
  expect(isPdf(c.head), c.name).toBe(true)
  expect(errors).toEqual([])
})

test('Photo Design: gjenopprett fra sikkerhetskopi', async ({ page }) => {
  const errors = await errorsOf(page)
  await page.goto('/app/photo-design')
  const dl = page.waitForEvent('download')
  await press(page, page.getByRole('button', { name: 'Last ned sikkerhetskopi' }))
  const f = test.info().outputPath('photo-backup.json')
  await (await dl).saveAs(f)
  const ch = page.waitForEvent('filechooser')
  await press(page, page.getByRole('button', { name: 'Gjenopprett fra fil' }))
  await (await ch).setFiles(f)
  await page.waitForTimeout(600)
  expect(errors).toEqual([])
})

test('Thumbnail Studio: sikkerhetskopi og gjenoppretting, bildeimport og eksport', async ({ page }) => {
  const errors = await errorsOf(page)
  await page.goto('/app/thumbnail-studio')
  const dl = page.waitForEvent('download')
  await press(page, page.getByRole('button', { name: 'Last ned sikkerhetskopi' }))
  const f = test.info().outputPath('thumb-backup.json')
  await (await dl).saveAs(f)
  expect(fs.statSync(f).size).toBeGreaterThan(20)
  const ch = page.waitForEvent('filechooser')
  await press(page, page.getByRole('button', { name: 'Gjenopprett fra fil' }))
  await (await ch).setFiles(f)
  await page.waitForTimeout(600)
  await press(page, page.getByRole('button', { name: /Ungdomsmøte/ }).first())
  await press(page, page.getByRole('button', { name: /Ny mal/ }))
  await press(page, page.getByRole('dialog', { name: 'Ny mal' }).locator('[data-layout="blank"]'))
  await upload(page, page.getByRole('button', { name: 'Bilde', exact: true }).first(), { name: 'b.png', mimeType: 'image/png', buffer: IMG })
  await press(page, page.getByRole('button', { name: 'Eksporter', exact: true }).first())
  const exp = page.getByRole('dialog', { name: 'Eksporter' })
  await expect(exp.getByText(/Filstørrelse:/)).toBeVisible({ timeout: 30000 })
  const a = await download(page, exp.getByRole('button', { name: /^Last ned/ }))
  expect(isPng(a.head) || isJpg(a.head), a.name).toBe(true)
  expect(a.size).toBeGreaterThan(1000)
  expect(errors).toEqual([])
})

test('Motion Design: medieimport, prosjektfil lagre/åpne og MP4-eksport', async ({ page }) => {
  const errors = await errorsOf(page)
  await page.goto('/app/motion-design')
  await press(page, page.getByRole('button', { name: 'Nytt prosjekt' }))
  await press(page, page.locator('[data-format="wide"]'))
  await press(page, page.locator('[data-tpl="blank"]'))
  await upload(page, page.getByRole('button', { name: /Last opp video, bilder eller lyd/ }).first(), { name: 'rod.png', mimeType: 'image/png', buffer: png(64, 64, () => [230, 20, 20, 255]) })
  await page.waitForTimeout(800)
  const dl = page.waitForEvent('download')
  await press(page, page.getByRole('button', { name: 'Lagre prosjektfil' }).first())
  const f = test.info().outputPath('prosjekt.mdproj')
  await (await dl).saveAs(f)
  expect(fs.statSync(f).size).toBeGreaterThan(50)
  const open = page.getByRole('button', { name: 'Åpne prosjektfil' })
  if (await open.count()) {
    const ch = page.waitForEvent('filechooser')
    await press(page, open.first())
    await (await ch).setFiles(f)
    await page.waitForTimeout(800)
  }
  await press(page, page.getByRole('button', { name: 'Eksporter', exact: true }).first())
  const v = await download(page, page.getByRole('button', { name: 'Eksporter MP4' }), 240000)
  expect(isMp4(v.head), v.name).toBe(true)
  expect(errors).toEqual([])
})

test('Loop Studio: bildeimport, HTML-spiller og MP4-eksport', async ({ page }) => {
  const errors = await errorsOf(page)
  await page.goto('/app/loop-studio')
  await press(page, page.getByRole('link', { name: /Ukeprogram/ }))
  await expect(page.locator('[data-loop-canvas]')).toBeVisible()
  if (mobile()) await press(page, page.getByRole('button', { name: 'Rediger', exact: true }))
  await press(page, page.getByRole('button', { name: 'Program', exact: true }))
  await page.getByPlaceholder('Tirsdag 25. aug kl 19:00 Kveldsmat i kafeen').fill('Søndag kl 11 Gudstjeneste\nOnsdag kl 19 Bønnemøte')
  await press(page, page.getByRole('button', { name: 'Oppdater videoen' }))
  await page.waitForTimeout(500)
  await press(page, page.getByRole('button', { name: /^Slides/ }).first())
  await upload(page, page.locator('[data-ch-shared-bg]').locator('xpath=preceding-sibling::button[1]'), { name: 'b.png', mimeType: 'image/png', buffer: IMG })
  const crop = page.getByRole('dialog').filter({ has: page.locator('[data-loop-cropbox]') })
  await press(page, crop.getByRole('button', { name: 'Bruk hele bildet' }))
  await expect(crop).toBeHidden()
  await press(page, page.getByRole('button', { name: /^Eksport(er)?$/ }).first())
  const h = await download(page, page.getByRole('button', { name: 'Last ned HTML-spiller' }))
  expect(h.name).toMatch(/\.html$/)
  expect(h.size).toBeGreaterThan(5000)
  const v = await download(page, page.getByRole('button', { name: '1080p', exact: true }), 240000)
  expect(isMp4(v.head), v.name).toBe(true)
  expect(errors).toEqual([])
})

test('Mockups: designimport, egne mockup-bilder og nedlasting', async ({ page }) => {
  const errors = await errorsOf(page)
  await page.goto('/app/mockups')
  await upload(page, page.getByRole('button', { name: /Last opp design|Bytt design/ }).first(), { name: 'design.png', mimeType: 'image/png', buffer: png(400, 300, () => [220, 30, 30, 255]) })
  await upload(page, page.getByRole('button', { name: /Legg til egne mockup-bilder/ }).first(), { name: 'mock.png', mimeType: 'image/png', buffer: png(300, 200, (x, y) => (x > 80 && x < 220 && y > 40 && y < 160 ? [250, 250, 250, 255] : [90, 90, 90, 255])) })
  await page.waitForTimeout(500)
  await press(page, page.getByRole('button', { name: /Imac Desk|iMac på skrivebord/ }).first())
  const d = await download(page, page.getByRole('button', { name: 'Last ned', exact: true }).last())
  expect(isPng(d.head) || isJpg(d.head), d.name).toBe(true)
  expect(errors).toEqual([])
})

test('Photo Design: «Kopier bilde» gir et PNG på utklippstavlen, «Bruk i …» åpner bildet i mottakeren', async ({ page, context }) => {
  const errors = await errorsOf(page)
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/app/photo-design')
  await press(page, page.locator('[data-tpl="photo"]'))
  await press(page, page.getByRole('button', { name: 'Eksporter', exact: true }).first())
  await press(page, page.getByRole('button', { name: 'Kopier bilde' }))
  await expect(page.getByText('Bildet er kopiert.', { exact: false })).toBeVisible()
  const clip = await page.evaluate(async () => {
    const it = (await navigator.clipboard.read())[0]
    if (!it?.types.includes('image/png')) return 0
    const b = await it.getType('image/png')
    const bmp = await createImageBitmap(b)
    return bmp.width
  })
  expect(clip, 'PNG med innhold på utklippstavlen').toBeGreaterThan(100)
  const use = page.getByRole('button', { name: 'Bruk i Isolate Subject' })
  if (!(await use.isVisible())) await press(page, page.getByRole('button', { name: 'Eksporter', exact: true }).first())
  await press(page, use)
  await expect(page).toHaveURL(/isolate-subject\?asset=/, { timeout: 30000 })
  await expect(page.getByRole('button', { name: 'Hopp over' }).or(page.locator('[data-mask-open]')).first()).toBeVisible({ timeout: 30000 })
  expect(errors).toEqual([])
})
