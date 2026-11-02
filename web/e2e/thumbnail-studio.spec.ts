import fs from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { dock } from './dock'
import { png } from './png'

async function errorsOf(page: Page) {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  return errors
}

/** Størrelse og andel av en farge i et nedlastet bilde. */
async function inspect(page: Page, file: string, color: [number, number, number]): Promise<{ w: number; h: number; share: number }> {
  const b64 = fs.readFileSync(file).toString('base64')
  const mime = file.endsWith('.jpg') ? 'image/jpeg' : 'image/png'
  return page.evaluate(async ({ data, kind, rgb }) => {
    const bmp = await createImageBitmap(await (await fetch(`data:${kind};base64,${data}`)).blob())
    const c = new OffscreenCanvas(bmp.width, bmp.height)
    const g = c.getContext('2d') as OffscreenCanvasRenderingContext2D
    g.drawImage(bmp, 0, 0)
    const d = g.getImageData(0, 0, bmp.width, bmp.height).data
    let n = 0
    for (let i = 0; i < d.length; i += 64) if (Math.abs((d[i] ?? 0) - rgb[0]) < 40 && Math.abs((d[i + 1] ?? 0) - rgb[1]) < 40 && Math.abs((d[i + 2] ?? 0) - rgb[2]) < 40) n++
    return { w: bmp.width, h: bmp.height, share: n / (d.length / 64) }
  }, { data: b64, kind: mime, rgb: color })
}

test('startsiden har kategoriene, «Rediger kategorier» og sikkerhetskopi', async ({ page }) => {
  const errors = await errorsOf(page)
  await page.goto('/app/thumbnail-studio')
  await expect(page.getByRole('heading', { level: 1, name: 'Thumbnail Studio' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Søndagsmøte/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Kveldsbibelskole/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Ungdomsmøte/ })).toBeVisible()
  await expect(page.getByText('0 av 5 maler').first()).toBeVisible()

  await page.getByRole('button', { name: 'Rediger kategorier' }).click()
  await page.getByRole('button', { name: /Ny kategori/ }).click()
  await expect(page.getByRole('textbox', { name: 'Navn på kategori' })).toHaveCount(4)
  await page.getByRole('textbox', { name: 'Navn på kategori' }).last().fill('Konferanse')
  await page.getByRole('button', { name: 'Ferdig' }).click()
  await expect(page.getByRole('button', { name: /Konferanse/ })).toBeVisible()

  // Sikkerhetskopien er i dagens format
  const dl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Last ned sikkerhetskopi' }).click()
  const file = await (await dl).path()
  const j = JSON.parse(fs.readFileSync(file, 'utf8')) as { app: string; v: number; cats: { name: string }[] }
  expect(j.app).toBe('thumbstudio')
  expect(j.v).toBe(1)
  expect(j.cats.map((c) => c.name)).toContain('Konferanse')
  expect(errors).toEqual([])
})

test('ny mal fra grunnoppsettet: bytt navn og person, lagre, og eksporter 1080p og 4K', async ({ page }, info) => {
  test.slow()
  const errors = await errorsOf(page)
  await page.goto('/app/thumbnail-studio')
  await page.getByRole('button', { name: /Søndagsmøte/ }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Søndagsmøte' })).toBeVisible()
  await expect(page).toHaveURL(/cat=sunday/)
  await page.getByRole('button', { name: /Ny mal/ }).click()
  const dialog = page.getByRole('dialog', { name: 'Ny mal' })
  await expect(dialog).toBeVisible()
  await expect(dialog.locator('[data-layout]')).toHaveCount(29)
  await dialog.locator('[data-layout="base:main"]').click()

  // Panelet «Mal»: navn og person
  await expect(page.locator('[data-ts-view="edit"]')).toBeVisible()
  await dock(page, 'edit')
  await page.getByRole('textbox', { name: 'Navn', exact: true }).fill('Ola\nNordmann')
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Velg bilde' }).first().click()
  await (await chooser).setFiles({ name: 'person.png', mimeType: 'image/png', buffer: png(200, 300, () => [20, 200, 40, 255]) })
  await expect(page.getByRole('button', { name: 'Bytt bilde' }).first()).toBeVisible()
  await expect(page.getByText('Ikke lagret')).toBeVisible()

  // Lagre som ny mal
  await page.getByRole('button', { name: 'Lagre mal' }).click()
  await page.getByRole('dialog', { name: 'Lagre mal' }).getByRole('button', { name: 'Lagre som ny mal' }).click()
  await expect(page.getByText('Malen er lagret.')).toBeVisible()
  await expect(page.getByText('Ikke lagret')).toHaveCount(0)
  await expect(page).toHaveURL(/tpl=/)

  // Eksport 1080p PNG: personen (grønn) er med
  await page.getByRole('button', { name: 'Eksporter', exact: true }).click()
  const exp = page.getByRole('dialog', { name: 'Eksporter' })
  await expect(exp.getByText(/Filstørrelse:/)).toBeVisible({ timeout: 30000 })
  let dl = page.waitForEvent('download')
  await exp.getByRole('button', { name: /^Last ned/ }).click()
  let file = info.outputPath('thumb.png')
  await (await dl).saveAs(file)
  let r = await inspect(page, file, [20, 200, 40])
  expect([r.w, r.h]).toEqual([1920, 1080])
  expect(r.share).toBeGreaterThan(0.05)

  // 4K JPG
  await page.getByRole('button', { name: 'Eksporter', exact: true }).click()
  await exp.getByRole('button', { name: /4K/ }).click()
  await exp.getByRole('button', { name: 'JPG' }).click()
  await expect(exp.getByText(/Filstørrelse:/)).toBeVisible({ timeout: 30000 })
  dl = page.waitForEvent('download')
  await exp.getByRole('button', { name: /^Last ned/ }).click()
  file = info.outputPath('thumb.jpg')
  await (await dl).saveAs(file)
  r = await inspect(page, file, [20, 200, 40])
  expect([r.w, r.h]).toEqual([3840, 2160])

  // Tilbake til kategorien: malen er der, og den overlever en omlasting
  await page.getByRole('button', { name: /Søndagsmøte/ }).first().click()
  await expect(page.getByText('1 av 5 maler')).toBeVisible()
  await page.reload()
  await expect(page.getByText('1 av 5 maler')).toBeVisible()
  expect(errors).toEqual([])
})

test('lag: legg til tekst, angre, kopier og lim inn, og dra på lerretet', async ({ page }, info) => {
  test.skip(info.project.name === 'mobil', 'Mobil har enkel visning uten lagverktøy (som i dag)')
  const errors = await errorsOf(page)
  await page.goto('/app/thumbnail-studio')
  await page.getByRole('button', { name: /Ungdomsmøte/ }).click()
  await page.getByRole('button', { name: /Ny mal/ }).click()
  await page.getByRole('dialog', { name: 'Ny mal' }).locator('[data-layout="blank"]').click()
  const layers = page.locator('[data-layer]')
  await expect(layers).toHaveCount(0)
  await page.getByRole('button', { name: 'Tekst', exact: true }).click()
  await expect(layers).toHaveCount(1)
  await expect(page.locator('[data-ts-sel]')).toBeVisible()

  // Dra laget 200 skjermpunkter til høyre
  const sel = page.locator('[data-ts-sel]')
  const before = await sel.boundingBox()
  if (!before) throw new Error('ingen markering')
  await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2)
  await page.mouse.down()
  await page.mouse.move(before.x + before.width / 2 + 100, before.y + before.height / 2, { steps: 6 })
  await page.mouse.up()
  const after = await sel.boundingBox()
  expect((after?.x ?? 0) - before.x).toBeGreaterThan(60)

  // Kopier og lim inn med tastaturet
  await page.locator('[data-ts-overlay]').click({ position: { x: 5, y: 5 } })
  await layers.first().click()
  await page.keyboard.press('Control+c')
  await page.keyboard.press('Control+v')
  await expect(layers).toHaveCount(2)
  await page.keyboard.press('Control+z')
  await expect(layers).toHaveCount(1)
  await layers.first().click()
  await page.keyboard.press('Delete')
  await expect(layers).toHaveCount(0)
  expect(errors).toEqual([])
})

test('mobil: lerretet øverst, egenskaper og lag i panelene over ikonlinjen', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobil', 'Bare på smal skjerm')
  await page.goto('/app/thumbnail-studio?cat=kbs')
  await page.getByRole('button', { name: /Ny mal/ }).click()
  await page.getByRole('dialog', { name: 'Ny mal' }).locator('[data-layout="base:main"]').click()
  await expect(page.getByText('Redigering på mobil')).toBeVisible()
  await page.locator('[data-dock-tab="edit"]').click()
  await expect(page.getByRole('textbox', { name: 'Navn', exact: true })).toBeVisible()
  await page.locator('[data-dock-tab="layers"]').click()
  await expect(page.locator('[data-layer]').first()).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 2)).toBe(true) // siden blar ikke
})

test('engelsk: tekstene oversettes', async ({ page }) => {
  await page.goto('/app/thumbnail-studio')
  await page.evaluate(() => localStorage.setItem('medialab.lang', 'en'))
  await page.reload()
  await expect(page.getByRole('button', { name: 'Edit categories' })).toBeVisible()
  await expect(page.getByText('0 of 5 templates').first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Download backup' })).toBeVisible()
})

test('tilbake: pillen går til forsiden, nettleserens tilbake går ett nivå opp', async ({ page }) => {
  // Først en annen app, så Thumbnail Studio: tilbake skal ikke ende i den andre appen
  await page.goto('/app/mockups')
  await page.goto('/app/thumbnail-studio')
  await page.getByRole('button', { name: /Søndagsmøte/ }).click()
  await page.getByRole('button', { name: /Ny mal/ }).click()
  await page.getByRole('dialog', { name: 'Ny mal' }).locator('[data-layout="base:main"]').click()
  await page.getByRole('button', { name: 'Lagre mal' }).click()
  await page.getByRole('dialog', { name: 'Lagre mal' }).getByRole('button', { name: 'Lagre som ny mal' }).click()
  await expect(page).toHaveURL(/tpl=/)

  await page.goBack()
  await expect(page.getByRole('heading', { level: 1, name: 'Søndagsmøte' })).toBeVisible()
  await page.goBack()
  await expect(page.getByRole('heading', { level: 1, name: 'Thumbnail Studio' })).toBeVisible()

  await page.getByRole('link', { name: /Media Lab/ }).click()
  await expect(page).toHaveURL(/\/app\/$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Media Lab' })).toBeVisible()
})
