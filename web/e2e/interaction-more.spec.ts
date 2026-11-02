import { expect, test, type Locator, type Page } from '@playwright/test'
import { png } from './png'

/**
 * Samhandling, del 2: kontekstmenyer der nettleserens meny tidligere kom fram (lagpanel, slidekort, mediebibliotek,
 * galleri), Media Labs reservemeny i stedet for nettleserens, transformfelt, zoom til markering, visningszoom i
 * Mockups og slippmarkering i Thumbnail. Se docs/samhandling.md.
 */
test.skip(({ isMobile }) => isMobile, 'mus og tastatur testes på PC')

const box = async (loc: Locator) => (await loc.boundingBox()) as { x: number; y: number; width: number; height: number }

async function photo(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/app/photo-design')
  await page.locator('[data-tpl="photo"]').click()
  await expect(page.locator('[data-pd-view="edit"]')).toBeVisible()
}

test('Photo Design: lagpanelets meny, reservemeny utenfor lagene, tekstfelt beholder nettleserens meny, transformfelt og Shift+2', async ({ page }) => {
  await photo(page)
  // høyreklikk på en rad i lagpanelet: lagmenyen for det laget (velges)
  const row = page.locator('[data-layer]').first()
  const id = await row.getAttribute('data-layer')
  await row.click({ button: 'right' })
  const menu = page.getByRole('menu', { name: 'Lagmeny' })
  await expect(menu).toBeVisible()
  await expect(menu.getByRole('menuitem', { name: /^Kopier/ })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(row).toHaveClass(/layerOn/)
  expect(id).toBeTruthy()

  // høyreklikk på en overskrift i panelet (ingen egne handlinger): Media Labs meny, ikke nettleserens
  await page.locator('[data-pd-view="edit"] h2, [data-pd-view="edit"] h3, [data-pd-view="edit"] b').first().click({ button: 'right' })
  const app = page.getByRole('menu', { name: 'Media Lab' })
  await expect(app).toBeVisible()
  await expect(app.getByRole('menuitem', { name: /Hurtigtaster/ })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(app).toHaveCount(0)
  // i et tekstfelt: ingen Media Lab-meny (nettleserens meny med kopier/lim inn)
  await page.getByLabel('Prosjektnavn').click({ button: 'right' })
  await expect(page.getByRole('menu')).toHaveCount(0)
  await page.keyboard.press('Escape')

  // transformfelt: X og bredde skrives inn
  await page.locator('[data-layer]').filter({ hasText: 'Bakgrunnsbilde' }).click()
  const tf = page.locator('[data-pd-transform]')
  await expect(tf).toBeVisible()
  const bw = tf.getByRole('button', { name: /^B: / })
  await bw.click()
  await page.keyboard.type('500')
  await page.keyboard.press('Enter')
  await expect(tf.getByRole('button', { name: /^B: / })).toHaveText('500 px')
  await tf.getByRole('button', { name: /^H: / }).click()
  await page.keyboard.type('300')
  await page.keyboard.press('Enter')
  await expect(tf.getByRole('button', { name: /^H: / })).toHaveText('300 px')
  await tf.getByRole('button', { name: /^X: / }).click()
  await page.keyboard.type('40')
  await page.keyboard.press('Enter')
  await expect(tf.getByRole('button', { name: /^X: / })).toHaveText('40 px')
  await page.keyboard.press('Control+z')
  await expect(tf.getByRole('button', { name: /^X: / })).not.toHaveText('40 px')

  // Shift+2: zoom til det valgte laget (500 px bredt) – visningen blir større
  const wrap = page.locator('[data-pd-wrap]')
  const w0 = (await box(wrap)).width
  await page.locator('section[aria-label="Arbeidsflate"]').focus()
  await page.keyboard.press('Shift+Digit2')
  await expect.poll(async () => (await box(wrap)).width).toBeGreaterThan(w0 * 1.3)
})

test('Loop Studio: høyreklikk på et slidekort gir slidemenyen; Dupliser og Flytt virker', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/app/loop-studio?mal=week')
  await expect(page.locator('[data-loop-canvas]')).toBeVisible({ timeout: 60_000 })
  await page.getByRole('button', { name: 'Program', exact: true }).click()
  await page.getByPlaceholder('Tirsdag 25. aug kl 19:00 Kveldsmat i kafeen').fill('Mandag kl 19 Bønn\nTirsdag kl 18 Ungdom')
  await page.getByRole('button', { name: 'Oppdater videoen' }).click()
  const cards = page.locator('[data-loop-card]')
  await expect(cards).toHaveCount(2)
  await page.waitForTimeout(2600) // angrehistorikken: ny endring etter 0,7 s og etter innlastingen (controller.trackHistory)
  await cards.first().click({ button: 'right', position: { x: 60, y: 60 } })
  const menu = page.getByRole('menu', { name: 'Slide' })
  await expect(menu).toBeVisible()
  await expect(menu.getByRole('menuitem', { name: 'Flytt til venstre' })).toBeDisabled()
  await menu.getByRole('menuitem', { name: 'Dupliser' }).click()
  await expect(cards).toHaveCount(3)
  await page.waitForTimeout(300)
  // (fokus går tilbake til programfeltet, der Ctrl+Z angrer tekst) – angre med knappen
  await page.getByRole('button', { name: 'Angre' }).first().click()
  await expect(cards).toHaveCount(2)
})

test('Mockups: hjulet zoomer visningen rundt pekeren, 0 tilpasser; galleriets kort har egen meny', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/app/mockups?mockup=tv-wall')
  await expect(page.getByRole('button', { name: 'Last ned', exact: true }).last()).toBeEnabled({ timeout: 60_000 })
  const wrap = page.locator('[data-mk-wrap]')
  const b = await box(wrap)
  await page.mouse.move(b.x + b.width * 0.3, b.y + b.height * 0.4)
  await page.mouse.wheel(0, -120)
  await page.mouse.wheel(0, -120)
  await expect.poll(async () => (await box(wrap)).width).toBeGreaterThan(b.width * 1.4)
  await page.keyboard.press('0')
  await expect.poll(async () => Math.round((await box(wrap)).width)).toBe(Math.round(b.width))
  // galleriet
  await page.goto('/app/mockups')
  const card = page.locator('[class*="cardItem"]').first()
  await expect(card).toBeVisible({ timeout: 60_000 })
  await card.click({ button: 'right' })
  const menu = page.getByRole('menu', { name: 'Mockup' })
  await expect(menu.getByRole('menuitem', { name: 'Åpne' })).toBeVisible()
  await page.keyboard.press('Escape')
})

test('Motion Design: høyreklikk på en fil i biblioteket legger den på hovedsporet; Shift+F10 i tidslinjen', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.goto('/app/motion-design')
  await page.getByRole('button', { name: 'Nytt prosjekt' }).click()
  await page.locator('[data-format="wide"]').click()
  await page.locator('[data-tpl="blank"]').click()
  await page.locator('[data-adv-toggle]').click()
  const chooser = page.waitForEvent('filechooser')
  await page.locator('[data-md-bin-import]').click()
  await (await chooser).setFiles([{ name: 'rod.png', mimeType: 'image/png', buffer: png(160, 90, () => [230, 20, 20, 255]) }])
  const item = page.locator('[data-md-bin-item="rod.png"]')
  await expect(item).toBeVisible({ timeout: 20_000 })
  await item.click({ button: 'right' })
  await page.getByRole('menu').getByRole('menuitem', { name: 'Legg på hovedsporet (V1)' }).click()
  await expect(page.locator('[data-row="video"] > *').first()).toBeVisible()
  // tidslinjen med fokus: Shift+F10 gir klippets meny
  await page.locator('[data-row="video"] > *').first().click()
  await page.locator('[aria-label="Tidslinje"]').focus()
  await page.keyboard.press('Shift+F10')
  await expect(page.getByRole('menu').getByRole('menuitem', { name: /Del ved spillehodet/ })).toBeVisible()
  await page.keyboard.press('Escape')
})

test('Thumbnail Studio: en fil som dras inn viser om den legges til eller bytter bildet', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/app/thumbnail-studio')
  await page.getByRole('button', { name: /Søndagsmøte/ }).click()
  await page.getByRole('button', { name: /Ny mal/ }).click()
  await page.getByRole('dialog', { name: 'Ny mal' }).locator('[data-layout="base:main"]').click()
  await expect(page.locator('[data-ts-view="edit"]')).toBeVisible()
  const inner = page.locator('[data-ts-overlay]').locator('xpath=..')
  const drag = (type: string) => inner.evaluate((el, ty) => {
    const dt = new DataTransfer()
    dt.items.add(new File([new Uint8Array([1, 2, 3])], 'x.png', { type: 'image/png' }))
    el.dispatchEvent(new DragEvent(ty, { bubbles: true, cancelable: true, dataTransfer: dt }))
  }, type)
  await page.keyboard.press('Escape') // ingenting valgt
  await drag('dragover')
  await expect(page.locator('[data-ts-drop="add"]')).toHaveText('Slipp for å legge til bildet')
  await inner.evaluate((el) => el.dispatchEvent(new DragEvent('dragleave', { bubbles: true, relatedTarget: document.body })))
  await expect(page.locator('[data-ts-drop]')).toHaveCount(0)
})

test('flere kontekstmenyer: keyframe (Motion), bildelag (Photo), forhåndsvisning (Loop)', async ({ page }) => {
  // Motion: keyframe-menyen for en egenskap og for én keyframe (interpolering)
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.goto('/app/motion-design')
  await page.getByRole('button', { name: 'Nytt prosjekt' }).click()
  await page.locator('[data-format="wide"]').click()
  await page.locator('[data-tpl="blank"]').click()
  await page.locator('[data-adv-toggle]').click()
  const chooser = page.waitForEvent('filechooser')
  await page.locator('[data-md-bin-import]').click()
  await (await chooser).setFiles([{ name: 'rod.png', mimeType: 'image/png', buffer: png(160, 90, () => [230, 20, 20, 255]) }])
  await page.locator('[data-md-bin-item="rod.png"] [data-md-to="v1"]').click()
  await page.locator('[data-row="video"] > *').first().click()
  await page.locator('[data-md-insp-tab="anim"]').click()
  const prop = page.locator('[data-md-kf]').first()
  await expect(prop).toBeVisible({ timeout: 20_000 })
  await prop.locator('[class*="kfLbl"]').click({ button: 'right' })
  const menu = page.getByRole('menu')
  await menu.getByRole('menuitem', { name: 'Keyframe her' }).click()
  await expect(prop.locator('[data-md-key]')).toHaveCount(1)
  // høyreklikk på raden (ikke i tallfeltene, der nettleserens meny gjelder)
  await prop.locator('[data-md-key]').first().evaluate((el) => { const r = el.getBoundingClientRect(); el.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: r.left + 2, clientY: r.top + 2, button: 2 })) })
  await menu.getByRole('menuitem', { name: /^Hold/ }).click()
  await expect(prop.locator('[data-md-kf-ease]').first()).toHaveValue('hold')
  // keyframe-prikken i tidslinjen har samme valg
  await page.locator('[data-row="video"] [data-md-kfdot]').first().click({ button: 'right' })
  await menu.getByRole('menuitem', { name: /^Myk/ }).click()
  await expect(prop.locator('[data-md-kf-ease]').first()).toHaveValue('ease')

  // Photo: bildelaget har bildehandlingene og «Til fremst»
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/app/photo-design')
  await page.locator('[data-tpl="photo"]').click()
  await page.locator('[data-layer]').filter({ hasText: 'Bakgrunnsbilde' }).click({ button: 'right' })
  const lm = page.getByRole('menu', { name: 'Lagmeny' })
  await expect(lm.getByRole('menuitem', { name: 'Bytt bilde' })).toBeVisible()
  await expect(lm.getByRole('menuitem', { name: 'Til fremst' })).toBeVisible()
  await page.keyboard.press('Escape')

  // Loop: forhåndsvisningen har avspilling og fullskjerm
  await page.goto('/app/loop-studio?mal=week')
  const cv = page.locator('[data-loop-canvas]')
  await expect(cv).toBeVisible({ timeout: 60_000 })
  await cv.click({ button: 'right' })
  const pm = page.getByRole('menu', { name: 'Forhåndsvisning' })
  await expect(pm.getByRole('menuitem', { name: /Spill av|Pause/ })).toBeVisible()
  await expect(pm.getByRole('menuitem', { name: 'Fullskjerm' })).toBeVisible()
  await page.keyboard.press('Escape')
})
