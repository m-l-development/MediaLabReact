import { expect, test, type Page } from '@playwright/test'
import { png } from './png'
import { center, isColor, isGray, solid } from './motion-helpers'

/**
 * Funksjoner som ikke hadde egen nettlesertest (funksjonsregisteret, docs/feature-parity.md): hver kontroll må gi et
 * synlig resultat på lerretet (fingeravtrykk av pikslene), ikke bare kunne trykkes. PC (mobil: egne mobiltester).
 */
test.beforeEach(() => test.skip(test.info().project.name === 'mobil', 'kontrollene i egenskapspanelet testes på PC; mobil: mobile-workflows.spec.ts'))

const errorsOf = (page: Page) => {
  const e: string[] = []
  page.on('pageerror', (x) => e.push(x.message))
  return e
}
/** Grovt fingeravtrykk av et lerret. */
const print = (page: Page, sel: string) => page.locator(sel).first().evaluate((c: HTMLCanvasElement) => {
  const g = c.getContext('2d')!
  const d = g.getImageData(0, 0, c.width, c.height).data
  let h = 0
  for (let i = 0; i < d.length; i += 4 * 97) h = (h * 31 + d[i]! * 3 + d[i + 1]! * 5 + d[i + 2]! * 7 + d[i + 3]!) | 0
  return h
})
/** Én piksel i lerretet (andeler av bredde/høyde). */
const pixel = (page: Page, sel: string, fx: number, fy: number) => page.locator(sel).first().evaluate((c: HTMLCanvasElement, [x, y]) => [...c.getContext('2d')!.getImageData(Math.floor(c.width * x), Math.floor(c.height * y), 1, 1).data].slice(0, 3), [fx, fy] as [number, number])
const settle = (page: Page) => page.waitForTimeout(300)

test('Photo Design: kontur, skygge og understrek på tekst, speil og tomme kanter på bilde, koblede farger', async ({ page }) => {
  const errors = errorsOf(page)
  const C = '[data-pd-wrap] canvas'
  await page.goto('/app/photo-design')
  await page.locator('[data-tpl="blank"]').click()
  // tekst: kontur, skygge og understrek endrer hver for seg det som tegnes
  await page.getByRole('button', { name: 'Tekst', exact: true }).first().click()
  await expect(page.locator('[data-pd-selbox]')).toBeVisible()
  let p = await print(page, C)
  for (const [name, v] of [['Kontur', '8'], ['Skygge', '20']] as const) {
    const sl = page.getByRole('slider', { name, exact: true }).first()
    await sl.fill(v)
    await settle(page)
    const q = await print(page, C)
    expect(q, name).not.toBe(p)
    p = q
  }
  await page.getByRole('switch', { name: 'Understrek' }).or(page.getByRole('button', { name: 'Understrek', exact: true })).first().click()
  await settle(page)
  expect(await print(page, C), 'Understrek').not.toBe(p)

  // bilde: venstre halvdel rød, høyre blå, med gjennomsiktig kant – Speil bytter sidene, «Fjern tomme kanter» beskjærer
  await page.keyboard.press('Escape')
  const img = png(200, 100, (x, y) => (x < 20 || x >= 180 || y < 20 || y >= 80 ? [0, 0, 0, 0] : x < 100 ? [220, 20, 20, 255] : [20, 40, 220, 255]))
  const ch = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Bilde', exact: true }).first().click()
  await (await ch).setFiles({ name: 'rb.png', mimeType: 'image/png', buffer: img })
  const sel = page.locator('[data-pd-selbox]')
  await expect(sel).toBeVisible()
  const b0 = (await sel.boundingBox())!
  const at = async (fx: number) => {
    const w = (await page.locator(C).boundingBox())!
    const b = (await sel.boundingBox())!
    return pixel(page, C, (b.x + b.width * fx - w.x) / w.width, (b.y + b.height / 2 - w.y) / w.height)
  }
  const l0 = await at(0.35)
  expect(l0[0]!, 'venstre del rød før Speil').toBeGreaterThan(150)
  await page.getByRole('button', { name: 'Speil', exact: true }).click()
  await settle(page)
  expect((await at(0.35))[2]!, 'venstre del blå etter Speil').toBeGreaterThan(150)
  await page.getByRole('button', { name: 'Fjern tomme kanter' }).click()
  await expect.poll(async () => Math.round((await sel.boundingBox())!.width)).toBeLessThan(Math.round(b0.width * 0.95))
  await page.getByRole('button', { name: 'Vis hele bildet' }).click()
  await settle(page)

  // koblede farger: to former med samme farge; endres den ene, følger den andre
  await page.keyboard.press('Escape')
  for (let i = 0; i < 2; i++) {
    await page.getByRole('button', { name: 'Rektangel', exact: true }).first().click()
    await expect(sel).toBeVisible()
    if (i === 1) for (let k = 0; k < 15; k++) await page.keyboard.press('Shift+ArrowRight')
  }
  await page.getByRole('button', { name: 'Stil', exact: true }).first().click()
  await page.getByRole('switch', { name: 'Koblede farger' }).or(page.getByRole('button', { name: 'Koblede farger' })).first().click()
  await page.getByRole('button', { name: 'Lag', exact: true }).first().click()
  // velg den andre formen (øverst i laglisten) og endre fyllfargen
  await page.locator('[data-layer]').first().click()
  await page.locator('input[type=color][aria-label="Fyllfarge"]').first().fill('#00ff00')
  await settle(page)
  // det første rektangelet (ikke valgt) har også fått fargen: punktet ligger bare på det (det andre er flyttet til høyre)
  const first = await pixel(page, C, 0.34, 0.5)
  expect(first[1]! > 200 && first[0]! < 60 && first[2]! < 60, 'det andre rektangelet fikk samme farge (koblede farger): ' + first.join(',')).toBe(true)
  expect(errors).toEqual([])
})

test('Motion: grønnskjerm på overlegg fjerner nøkkelfargen, «Kopier farge og lyd» / «Lim inn farge» overfører fargejusteringen', async ({ page }) => {
  const errors = errorsOf(page)
  await page.goto('/app/motion-design')
  await page.getByRole('button', { name: 'Nytt prosjekt' }).click()
  await page.locator('[data-format="wide"]').click()
  await page.locator('[data-tpl="blank"]').click()
  const ch = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: '+ Last opp video, bilder eller lyd' }).click()
  await (await ch).setFiles([solid('rod.png', [230, 20, 20], 320, 180), solid('blaa.png', [20, 40, 230], 320, 180), solid('gronn.png', [0, 255, 0], 320, 180)])
  const card = (n: string) => page.locator('[data-media="image"]').filter({ hasText: n })
  await expect(page.locator('[data-media="image"]')).toHaveCount(3)
  await card('rod.png').getByRole('button', { name: 'Legg til' }).click()
  await card('blaa.png').getByRole('button', { name: 'Legg til' }).click()
  await expect(page.locator('[data-block="clip"]')).toHaveCount(2)
  await card('gronn.png').getByRole('button', { name: 'Overlegg' }).click()
  await expect(page.locator('[data-block="ov"]')).toHaveCount(1)
  // overlegget dekker midten
  await page.locator('[data-block="ov"]').click()
  await page.getByText('Plassering og størrelse', { exact: true }).click()
  await page.getByRole('slider', { name: 'Størrelse' }).first().fill('1.5')
  await page.getByRole('slider', { name: 'Vannrett' }).first().fill('0.5')
  await page.getByRole('slider', { name: 'Loddrett' }).first().fill('0.5')
  // spillehodet litt inn i overlegget (standardanimasjonen toner det inn fra 0 s)
  await page.getByRole('button', { name: 'Spill av', exact: true }).click()
  await page.waitForTimeout(1300)
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  await expect.poll(async () => isColor(await center(page), 1)).toBe(true)
  await page.getByText('Grønnskjerm', { exact: true }).click()
  await page.getByRole('switch', { name: 'Fjern bakgrunnsfarge' }).click()
  await expect.poll(async () => isColor(await center(page), 0), { message: 'det grønne er fjernet, det røde under vises' }).toBe(true)

  // farge: metning -100 på det røde klippet, kopier, lim inn på det blå: begge blir grå
  await page.locator('[data-block="ov"]').click()
  await page.keyboard.press('Delete')
  await expect(page.locator('[data-block="ov"]')).toHaveCount(0)
  await page.locator('[data-block="clip"]').first().click({ position: { x: 10, y: 10 } })
  const sec = page.getByText('Farge og lys', { exact: true })
  if (!(await page.getByRole('slider', { name: /^Metning/ }).first().isVisible())) await sec.click()
  await page.getByRole('slider', { name: /^Metning/ }).first().fill('-1')
  await expect.poll(async () => isGray(await center(page)), { message: 'metning -100 gjør det røde grått' }).toBe(true)
  await page.getByRole('button', { name: 'Kopier farge og lyd' }).first().click()
  await page.locator('[data-block="clip"]').nth(1).click() // midt på (venstre kant dekkes av trimhåndtaket til klippet foran)
  if (!(await page.getByRole('slider', { name: /^Metning/ }).first().isVisible())) await sec.click()
  await expect(page.getByRole('slider', { name: /^Metning/ }).first()).toHaveValue('0')
  await page.getByRole('button', { name: 'Lim inn farge' }).first().click()
  await expect(page.getByRole('slider', { name: /^Metning/ }).first(), 'det blå klippet fikk samme fargejustering').toHaveValue('-1')
  expect(errors).toEqual([])
})

test('Loop Studio: effektbryterne i «Bygg» (Ken Burns, lysstripe, duotone, boks-etikett, fargepaneler, tidslinje) endrer bildet', async ({ page }) => {
  const errors = errorsOf(page)
  await page.goto('/app/loop-studio?mal=blank')
  await expect(page.locator('[data-loop-canvas]')).toBeVisible({ timeout: 60000 })
  const tab = (n: string) => page.getByRole('button', { name: new RegExp('^' + n) }).first()
  await tab('Bygg').click()
  for (const k of ['Stor tittel', 'Arrangement']) await page.getByRole('button', { name: '+ ' + k }).first().click()
  await tab('Slides').click()
  const ch = page.waitForEvent('filechooser')
  await page.locator('[data-ch-shared-bg]').locator('xpath=preceding-sibling::button[1]').click()
  await (await ch).setFiles({ name: 'b.png', mimeType: 'image/png', buffer: png(640, 360, (x, y) => [40 + (x % 200), 90 + (y % 120), 150, 255]) })
  await page.getByRole('dialog').filter({ has: page.locator('[data-loop-cropbox]') }).getByRole('button', { name: 'Bruk hele bildet' }).click()
  // stopp på sliden med bildet (arrangementet: etikett, tidslinje og bilde vises der)
  const pz = page.getByRole('button', { name: 'Pause' }).first()
  if (await pz.isVisible()) await pz.click()
  await page.locator('[data-loop-card]').nth(1).click()
  await page.waitForTimeout(800)
  await tab('Bygg').click()
  const C = '[data-loop-canvas]'
  const bg = (n: string) => page.getByRole('button', { name: n, exact: true }).first().evaluate((e) => getComputedStyle(e).backgroundColor)
  /** Trykker bryteren: tilstanden skifter alltid; visual = bildet endres også (stillbilde ved samme tid). */
  const flip = async (name: string, visual: boolean) => {
    await page.waitForTimeout(300)
    const a = await print(page, C)
    const s0 = await bg(name)
    await page.getByRole('button', { name, exact: true }).first().click()
    await page.waitForTimeout(500)
    expect(await bg(name), name + ': tilstanden skifter').not.toBe(s0)
    if (visual) expect(await print(page, C), name + ': bildet endres').not.toBe(a)
  }
  // sliden med bildet (arrangement): zoom, duotone og etikett vises
  await flip('Ken Burns-zoom', true)
  await flip('Duotone', true)
  await flip('Boks-etikett', true)
  // lysstripen vises bare ved skifte, tidslinjen bare for dagslides fra ukeprogrammet: her bare tilstanden
  await flip('Lysstripe', false)
  await flip('Tidslinje nederst', false)
  // fargepanelene bak teksten vises på tittelsliden
  await tab('Slides').click()
  await page.locator('[data-loop-card]').nth(0).click()
  await page.waitForTimeout(800)
  await tab('Bygg').click()
  await flip('Fargepaneler bak', true)
  expect(errors).toEqual([])
})

test('Thumbnail Studio: «Fjern tomme kanter» beskjærer gjennomsiktige kanter, «Vis hele bildet» tar dem tilbake', async ({ page }) => {
  const errors = errorsOf(page)
  await page.goto('/app/thumbnail-studio')
  await page.getByRole('button', { name: /Ungdomsmøte/ }).click()
  await page.getByRole('button', { name: /Ny mal/ }).click()
  await page.getByRole('dialog', { name: 'Ny mal' }).locator('[data-layout="blank"]').click()
  const ch = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Bilde', exact: true }).first().click()
  await (await ch).setFiles({ name: 'kant.png', mimeType: 'image/png', buffer: png(200, 200, (x, y) => (x < 50 || x >= 150 || y < 50 || y >= 150 ? [0, 0, 0, 0] : [220, 30, 30, 255])) })
  const sel = page.locator('[data-ts-sel]')
  await expect(sel).toBeVisible()
  // andelen rødt langs midten av laget: halvparten med de tomme kantene, nesten alt etter «Fjern tomme kanter»
  const red = async () => {
    const b = (await sel.boundingBox())!
    return page.evaluate(([x0, x1, y]) => {
      // lerretet som ligger under laget (siden har flere lerreter)
      const c = document.elementsFromPoint((x0 + x1) / 2, y).find((e) => e instanceof HTMLCanvasElement) as HTMLCanvasElement | undefined
      if (!c) return -1
      const r = c.getBoundingClientRect()
      const g = c.getContext('2d')!
      const sx = c.width / r.width
      const row = g.getImageData(Math.round((x0 - r.left) * sx), Math.round((y - r.top) * (c.height / r.height)), Math.max(1, Math.round((x1 - x0) * sx)), 1).data
      let n = 0
      for (let i = 0; i < row.length; i += 4) if (row[i]! > 180 && row[i + 1]! < 80) n++
      return n / (row.length / 4)
    }, [b.x + 3, b.x + b.width - 3, b.y + b.height / 2] as [number, number, number])
  }
  const r0 = await red()
  expect(r0, 'tomme kanter før').toBeLessThan(0.7)
  await page.getByRole('button', { name: 'Fjern tomme kanter' }).click()
  await expect.poll(red, { message: 'rødt fyller laget etter «Fjern tomme kanter»' }).toBeGreaterThan(0.9)
  await page.getByRole('button', { name: 'Vis hele bildet' }).first().click()
  await expect.poll(red, { message: 'kantene er tilbake etter «Vis hele bildet»' }).toBeLessThan(0.7)
  expect(errors).toEqual([])
})
