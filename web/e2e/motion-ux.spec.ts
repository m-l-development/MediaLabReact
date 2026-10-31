import { expect, test, type Locator, type Page } from '@playwright/test'
import { centerIs, importFiles, insp, isColor, leftTab, main, newAdvProject, recordVideo, seekTo, solid } from './motion-helpers'

/**
 * Motion Design – UX-revisjon: menyer og kategorier, riktig panel for valgt element, ingen dupliserte verktøy, dialoger
 * (Escape, fokus, klikk utenfor), høyreklikkmeny med tastatur, popup-er innenfor skjermen og over tidslinjen, og at
 * endringene faktisk virker i prosjektet og forhåndsvisningen. Standard modus kontrolleres for å være uendret.
 */

const props = (page: Page) => page.locator('[data-md-props]')
const tabsOf = async (page: Page) => page.locator('[data-md-insp-tab]').evaluateAll((els) => els.map((e) => e.getAttribute('data-md-insp-tab')))
/** Hvor mange synlige knapper i inspektøren som har denne teksten. */
const btnCount = (page: Page, name: string) => props(page).getByRole('button', { name, exact: true }).count()
/** Elementet er helt innenfor vinduet, og det som ligger øverst midt i det er elementet selv (ikke skjult bak noe). */
async function onTop(page: Page, loc: Locator) {
  const r = await loc.boundingBox()
  const vp = page.viewportSize()
  expect(r && vp).toBeTruthy()
  expect(r!.x).toBeGreaterThanOrEqual(0)
  expect(r!.y).toBeGreaterThanOrEqual(0)
  expect(r!.x + r!.width).toBeLessThanOrEqual(vp!.width + 0.5)
  expect(r!.y + r!.height).toBeLessThanOrEqual(vp!.height + 0.5)
  expect(await loc.evaluate((el) => {
    const b = el.getBoundingClientRect()
    const hit = document.elementFromPoint(b.x + b.width / 2, b.y + Math.min(b.height / 2, 20))
    return !!hit && el.contains(hit)
  })).toBe(true)
}

test('meny og kategorier: én fanerad til venstre, riktig inspektør per element, ingen duplikater', async ({ page }, info) => {
  test.skip(info.project.name === 'mobil', 'PC')
  test.slow()
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await newAdvProject(page, 1366, 768)

  // venstre panel: én fanerad (ikke «Mediebibliotek | Verktøy» over fanene), Media = mediebiblioteket
  await expect(page.locator('[data-md-left-tabs]')).toHaveCount(1)
  await expect(page.locator('[data-md-left-tabs] [role="tab"]')).toHaveText(['Media', 'Tekst', 'Undertekst', 'Lyd', 'Logo', 'Overganger'])
  await expect(page.getByRole('tab', { name: 'Verktøy' })).toHaveCount(0)
  await expect(page.locator('[data-md-bin]')).toBeVisible()
  await expect(page.locator('[data-md-add-color]')).toBeVisible()
  // hver fane åpner sitt panel
  await leftTab(page, 'text')
  await expect(page.locator('[data-md-add-text]')).toBeVisible()
  await expect(page.getByRole('button', { name: /^Tittel/ })).toBeVisible()
  await leftTab(page, 'subs')
  await expect(page.locator('[data-md-add-sub]')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Importer .srt' })).toBeVisible()
  await leftTab(page, 'audio')
  await expect(page.getByRole('button', { name: '+ Last opp musikk' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Ta opp voiceover' })).toBeVisible()
  await leftTab(page, 'logo')
  await expect(page.getByRole('button', { name: 'Ingen logo' })).toBeVisible()
  await leftTab(page, 'trans')
  await expect(page.locator('[data-trans]').first()).toBeVisible()
  await leftTab(page, 'media')
  await expect(page.locator('[data-md-bin]')).toBeVisible()

  // ingenting valgt: forklaring, ingen kategorier
  await expect(props(page)).toContainText('Velg et klipp, en tekst eller et lydspor')
  await expect(page.locator('[data-md-insp]')).toHaveCount(0)

  const vid = await recordVideo(page, 'farger.webm', ['#e01010', '#10c020', '#1030e0'])
  await importFiles(page, [vid, solid('rod.png', [220, 30, 30])], 2)
  await page.locator('[data-md-bin-item="farger.webm"] [data-md-to="v1"]').click()
  await page.locator('[data-md-bin-item="rod.png"] [data-md-to="v1"]').click()

  // videoklipp: fem kategorier; hver viser sitt panel og ikke de andres
  await main(page).first().click()
  expect(await tabsOf(page)).toEqual(['clip', 'fx', 'anim', 'speed', 'audio'])
  await expect(page.locator('[data-md-insp-tab="clip"]')).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator('[data-md-timing]')).toBeVisible()
  // handlingene finnes én gang (ikke både i tidsinspektøren og i listen under)
  for (const n of ['Del ved spillehodet', 'Slett']) expect(await btnCount(page, n), n).toBe(1)
  await expect(props(page).locator('[data-md-tm="start"]')).toHaveCount(1)
  await insp(page, 'fx')
  await expect(page.locator('[data-md-effects]')).toBeVisible()
  await expect(page.locator('[data-md-timing], [data-md-keys], [data-md-speed]')).toHaveCount(0)
  await expect(props(page).getByRole('button', { name: /Farge og lys/ })).toBeVisible()
  await expect(props(page).getByRole('button', { name: /Hastighet/ })).toHaveCount(0)
  await insp(page, 'anim')
  await expect(page.locator('[data-md-keys]')).toBeVisible()
  await expect(page.locator('[data-md-effects], [data-md-timing]')).toHaveCount(0)
  await insp(page, 'speed')
  await expect(page.locator('[data-md-speed]')).toBeVisible()
  // hastigheten finnes bare her (ikke også som felt i inspektøren)
  await expect(props(page).getByText('Egendefinert fart')).toHaveCount(0)
  await insp(page, 'audio')
  await expect(props(page).getByText('Demp lyden')).toBeVisible()
  await expect(props(page).getByText('Volum')).toBeVisible()

  // tastatur: piltastene flytter mellom kategoriene
  await page.locator('[data-md-insp-tab="audio"]').focus()
  await page.keyboard.press('Home')
  await expect(page.locator('[data-md-insp-tab="clip"]')).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator('[data-md-insp-tab="clip"]')).toBeFocused()
  await page.keyboard.press('ArrowRight')
  await expect(page.locator('[data-md-insp-tab="fx"]')).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator('[data-md-insp-tab="fx"]')).toBeFocused()

  // bilde: ingen Hastighet/Lyd; kategorien (Effekter) beholdes mellom klipp
  await main(page).nth(1).click()
  expect(await tabsOf(page)).toEqual(['clip', 'fx', 'anim'])
  await expect(page.locator('[data-md-insp-tab="fx"]')).toHaveAttribute('aria-selected', 'true')

  // ny tekst: starter på Tekst (ikke kategorien fra klippet), med tidsinspektør og plassering
  await leftTab(page, 'text')
  await page.locator('[data-md-add-text]').click()
  expect(await tabsOf(page)).toEqual(['clip', 'anim'])
  await expect(page.locator('[data-md-insp-tab="clip"]')).toHaveText('Tekst')
  await expect(page.locator('[data-md-insp-tab="clip"]')).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator('[data-md-timing] [data-md-track]')).toHaveText('T1')
  await expect(page.locator('[data-md-textplace]')).toBeVisible()
  await expect(props(page).getByLabel('Tekstfarge')).toBeVisible()
  expect(await btnCount(page, 'Del ved spillehodet')).toBe(1)

  // undertekst og flere valgt: ingen kategorier
  await leftTab(page, 'subs')
  await page.locator('[data-md-add-sub]').click()
  await expect(page.locator('[data-md-timing] [data-md-track]')).toHaveText('UT')
  await expect(page.locator('[data-md-insp]')).toHaveCount(0)
  await main(page).first().click()
  await main(page).nth(1).click({ modifiers: ['Shift'] })
  await expect(props(page)).toContainText('2 valgt')
  await expect(page.locator('[data-md-insp]')).toHaveCount(0)

  // kategorifanene får plass i inspektøren uten vannrett rulling (1366 × 768)
  await page.keyboard.press('Escape')
  await main(page).first().click()
  await expect(page.locator('[data-md-insp-tab]')).toHaveCount(5)
  const over = await page.locator('[data-md-insp]').evaluate((el) => el.scrollWidth - el.clientWidth)
  expect(over).toBeLessThanOrEqual(1)
  expect(errors).toEqual([])
})

test('verktøyene virker: baklengs, bytt media i Avansert, modusbytte og Standard uendret', async ({ page }, info) => {
  test.skip(info.project.name === 'mobil', 'PC')
  test.slow()
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await newAdvProject(page)
  const vid = await recordVideo(page, 'farger.webm', ['#e01010', '#10c020', '#1030e0'])
  await importFiles(page, [vid, solid('blaa.png', [30, 50, 220])], 2)
  await page.locator('[data-md-bin-item="farger.webm"] [data-md-to="v1"]').click()
  await centerIs(page, (c) => isColor(c, 0), 'start: rødt')

  // «Spill baklengs» under Hastighet: ved start vises slutten av kilden (blått); angre gir rødt igjen
  await main(page).first().click()
  await insp(page, 'speed')
  await page.locator('[data-md-rev]').check()
  await seekTo(page, 0)
  await centerIs(page, (c) => isColor(c, 2), 'baklengs: blått ved start')
  await page.keyboard.press('Control+z')
  await expect(page.locator('[data-md-rev]')).not.toBeChecked()
  await centerIs(page, (c) => isColor(c, 0), 'angret: rødt ved start')

  // «Bytt media» virker i Avansert: biblioteket viser «Bruk her»
  await insp(page, 'clip')
  await props(page).getByRole('button', { name: 'Bytt media', exact: true }).click()
  await expect(page.locator('[data-md-replace]')).toBeVisible()
  await expect(page.locator('[data-md-bin-item="farger.webm"] [data-md-to]')).toHaveCount(0)
  await page.locator('[data-md-bin-item="blaa.png"] [data-md-use]').click()
  await expect(page.locator('[data-md-replace]')).toHaveCount(0)
  await centerIs(page, (c) => isColor(c, 2), 'byttet til det blå bildet')
  await expect(main(page)).toHaveCount(1)

  // modusbytte: Standard har de vanlige fanene (Musikk), mediefliser og ingen kategorier; data beholdes
  await page.locator('[data-adv-toggle]').click()
  await expect(page.locator('[data-md-left-tabs] [role="tab"]')).toHaveText(['Media', 'Tekst', 'Undertekst', 'Musikk', 'Logo', 'Overganger'])
  await expect(page.locator('[data-md-bin]')).toHaveCount(0)
  await expect(page.locator('[data-media]').first()).toBeVisible()
  await main(page).first().click()
  await expect(page.locator('[data-md-insp]')).toHaveCount(0)
  await expect(page.locator('[data-md-timing]')).toHaveCount(0)
  // Standard: handlingene som før (del, flytt, slett) og alle feltseksjonene i én liste
  for (const n of ['Del ved spillehodet', '← Flytt', 'Flytt →', 'Slett']) expect(await btnCount(page, n), n).toBe(1)
  await expect(props(page).getByRole('button', { name: /Farge og lys/ })).toBeVisible()
  await leftTab(page, 'text')
  await expect(page.locator('[data-md-add-text]')).toHaveCount(0)
  await page.locator('[data-adv-toggle]').click()
  await expect(main(page)).toHaveCount(1)
  await centerIs(page, (c) => isColor(c, 2), 'fortsatt det blå bildet')
  expect(errors).toEqual([])
})

test('dialoger og menyer: Escape, fokus, klikk utenfor, tastatur, innenfor skjermen og over tidslinjen', async ({ page }, info) => {
  test.skip(info.project.name === 'mobil', 'PC')
  await newAdvProject(page, 1280, 720)
  await importFiles(page, [solid('rod.png', [220, 30, 30])], 1)
  await page.locator('[data-md-bin-item="rod.png"] [data-md-to="v1"]').click()

  // eksport: fokus i dialogen, Tab blir inne, klikk utenfor lukker ikke, Escape lukker og gir fokus tilbake
  const expBtn = page.getByRole('button', { name: 'Eksporter', exact: true })
  await expBtn.click()
  const dlg = page.locator('[data-md-dialog="export"]')
  await expect(dlg).toBeVisible()
  await expect(dlg).toBeFocused()
  await onTop(page, dlg)
  for (let i = 0; i < 30; i++) await page.keyboard.press('Tab')
  expect(await dlg.evaluate((el) => el.contains(document.activeElement))).toBe(true)
  await page.keyboard.press('Shift+Tab')
  expect(await dlg.evaluate((el) => el.contains(document.activeElement))).toBe(true)
  await page.mouse.click(5, 5)
  await expect(dlg).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dlg).toHaveCount(0)
  await expect(expBtn).toBeFocused()
  // «Lukk» virker også
  await expBtn.click()
  await page.getByRole('button', { name: 'Lukk', exact: true }).click()
  await expect(dlg).toHaveCount(0)
  // Escape i editoren etterpå fjerner valget som før (tastene virker igjen)
  await main(page).first().click()
  await expect(page.locator('[data-md-insp]')).toBeVisible()
  await page.locator('[data-md-canvas]').click({ position: { x: 2, y: 2 } }).catch(() => undefined)
  await main(page).first().click()
  await page.keyboard.press('Escape')
  await expect(page.locator('[data-md-insp]')).toHaveCount(0)

  // prosjektmappe: Escape lukker, klikk utenfor lukker
  await page.getByRole('button', { name: 'Prosjektmappe' }).click()
  const fd = page.locator('[data-md-dialog="folder"]')
  await expect(fd).toBeFocused()
  await onTop(page, fd)
  await page.keyboard.press('Escape')
  await expect(fd).toHaveCount(0)
  await page.getByRole('button', { name: 'Prosjektmappe' }).click()
  await page.mouse.click(5, 5)
  await expect(fd).toHaveCount(0)

  // høyreklikkmeny på et klipp nederst til høyre: innenfor skjermen, over tidslinjen, tastatur og Escape
  const blk = main(page).first()
  const b = (await blk.boundingBox())!
  await blk.click({ button: 'right', position: { x: Math.min(b.width - 2, 30), y: b.height / 2 } })
  const menu = page.locator('[role="menu"]')
  await expect(menu).toBeVisible()
  await onTop(page, menu)
  const items = menu.locator('[role="menuitem"]')
  await expect(items.first()).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(items.nth(1)).toBeFocused()
  await page.keyboard.press('ArrowUp')
  await page.keyboard.press('ArrowUp')
  await expect(items.last()).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(menu).toHaveCount(0)
  // klikk utenfor lukker menyen uten å gjøre noe annet
  await blk.click({ button: 'right' })
  await expect(menu).toBeVisible()
  await page.mouse.click(5, 5)
  await expect(menu).toHaveCount(0)
  await expect(main(page)).toHaveCount(1)

  // høyreklikk helt nederst til høyre i vinduet (på tidslinjen): menyen flyttes inn i skjermen
  const tl = page.locator('[data-row="video"]')
  const tb = (await tl.boundingBox())!
  await page.mouse.click(tb.x + tb.width - 4, tb.y + tb.height - 2, { button: 'right' })
  if (await menu.count()) {
    await onTop(page, menu)
    await page.keyboard.press('Escape')
  }
})
