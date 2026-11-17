import { expect, test, type Locator, type Page } from '@playwright/test'
import { png } from './png'
import { canvasUrl, diff, expectOnTop, fileUrl, pop, settled, share, watchErrors } from './fontpopup-kit'
import { dock } from './dock'

/**
 * Fontpopupen i Thumbnail Studio (components/fontpicker, kopiert uendret): alle funksjonene i popupen virker og vises
 * på lerretet, stilen lagres per tekstlag og kommer tilbake etter lagring og innlasting, og eksportert bilde er likt
 * lerretet – også for Slitt, Spray, Støv, Bildefyll, Ordsky og en bred font.
 */
const CV = '[data-ts-canvas]'

async function blankWithText(page: Page, text: string) {
  await page.goto('/app/thumbnail-studio')
  await page.getByRole('button', { name: /Ungdomsmøte/ }).click()
  await page.getByRole('button', { name: /Ny mal/ }).click()
  await page.getByRole('dialog', { name: 'Ny mal' }).locator('[data-layout="blank"]').click()
  // grå bakgrunn, så mørke effekter (Skygge, Løftet) syns på lerretet
  await dock(page, 'edit')
  const hex = page.getByRole('textbox', { name: 'Egen farge' }).first()
  await hex.fill('#6a6a6a')
  await hex.press('Enter')
  await dock(page, 'add')
  await page.getByRole('button', { name: 'Tekst', exact: true }).click()
  await dock(page, 'edit')
  await page.getByRole('textbox', { name: 'Tekst', exact: true }).fill(text)
  // større tekstboks, så former og ordsky har plass (Plassering: X, Y, B, H)
  const nums = page.locator('[data-ts-props] input[type=number], aside input[type=number]')
  const xywh = (await nums.count()) >= 4 ? nums : page.locator('input[type=number]')
  for (const [i, v] of [[2, '1400'], [3, '700'], [0, '260'], [1, '190']] as const) {
    await xywh.nth(i).fill(v)
    await xywh.nth(i).press('Enter')
  }
}

/** Effektruten med navnet (ruten har også forhåndsvisningen «Aa»). */
const fxTile = (P: Locator, name: RegExp) => P.locator('.fp-fx:not(.fp-presets-grid):not(.fp-shapes) > button').filter({ has: P.page().locator('small', { hasText: name }) })

async function open(page: Page) {
  if (!(await page.locator('[data-fontpop] .fp-trigger').count())) {
    // tekstlaget er ikke valgt (Esc etter eksport): velg det igjen
    await dock(page, 'layers')
    await page.locator('[data-layer]').first().click()
    await dock(page, 'edit')
  }
  if (!(await pop(page).count())) await page.locator('[data-fontpop] .fp-trigger').click()
  await expect(pop(page)).toBeVisible()
}
async function tab(page: Page, name: 'Font' | 'Stil' | 'Effekter') {
  await open(page)
  await pop(page).getByRole('tab', { name, exact: true }).click()
}

/** Klikker og venter til lerretet er endret; gir det nye bildet. */
async function changes(page: Page, act: () => Promise<unknown>, what: string): Promise<string> {
  const before = await settled(page, CV)
  await act()
  const after = await settled(page, CV, before)
  expect(await diff(page, before, after), `${what} endret ikke lerretet`).toBeGreaterThan(0.00005)
  return after
}

async function exportPng(page: Page, file: string): Promise<string> {
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Eksporter', exact: true }).click()
  const exp = page.getByRole('dialog', { name: 'Eksporter' })
  await exp.getByRole('button', { name: /1080/ }).first().click().catch(() => {})
  await exp.getByRole('button', { name: 'PNG' }).click().catch(() => {})
  await expect(exp.getByText(/Filstørrelse:/)).toBeVisible({ timeout: 60000 })
  const dl = page.waitForEvent('download')
  await exp.getByRole('button', { name: /^Last ned/ }).click()
  await (await dl).saveAs(file)
  await page.keyboard.press('Escape')
  return fileUrl(file)
}

test('fontpopupen: verktøylinjen, fanene Font, Stil og Effekter virker og vises på lerretet', async ({ page }, info) => {
  test.setTimeout(1200000)
  const errors = watchErrors(page)
  await blankWithText(page, 'Sol sol sommer\nferie SOL hav bad')
  await open(page)
  await expectOnTop(page)
  // samme deler og tekster som skjermbildene: verktøylinje, faner, søk, Anbefalt/Alle/Favoritter, kategorier
  const P = pop(page)
  for (const t of ['Font', 'Stil', 'Effekter']) await expect(P.getByRole('tab', { name: t, exact: true })).toBeVisible()
  await expect(P.getByRole('tab', { name: 'Anbefalt' })).toBeVisible()
  await expect(P.getByRole('tab', { name: 'Alle' })).toBeVisible()
  await expect(P.getByRole('tab', { name: '★ Favoritter' })).toBeVisible()
  await expect(P.getByPlaceholder('Søk: bebas, tittel, elegant, håndskrift …')).toBeVisible()
  for (const c of ['Titler', 'Brødtekst', 'Logo', 'Elegant', 'Sitat', 'Håndskrift', 'Retro', 'Effekt', 'Moro', 'Teknisk', 'Skilt', 'Bred og kvadratisk']) await expect(P.locator('.fp-cats button', { hasText: c })).toHaveCount(1)

  // --- Font: søk på navn og norske søkeord, kategorier, Alle
  await P.getByRole('tab', { name: 'Alle' }).click()
  await P.getByPlaceholder(/Søk/).fill('håndskrift')
  await expect(P.locator('.fp-row').first()).toBeVisible()
  const hand = await P.locator('.fp-foot span').innerText()
  expect(Number(hand.split(' ')[0])).toBeGreaterThan(3)
  await P.getByPlaceholder(/Søk/).fill('bebas')
  await expect(P.locator('.fp-row', { hasText: 'Bebas Neue' })).toBeVisible()
  await P.getByPlaceholder(/Søk/).fill('')
  await P.locator('.fp-cats button', { hasText: 'Bred og kvadratisk' }).click()
  await expect(P.locator('.fp-row', { hasText: 'Expanded' }).first()).toBeVisible()
  await P.locator('.fp-cats button', { hasText: 'Bred og kvadratisk' }).click()

  // forhåndsvisning: lerretet viser fonten musen holdes over, og valgt font igjen når popupen lukkes
  const base0 = await settled(page, CV)
  await P.getByPlaceholder(/Søk/).fill('bebas neue')
  await P.locator('.fp-row', { hasText: 'Bebas Neue' }).first().hover()
  const prev = await settled(page, CV, base0)
  expect(await diff(page, base0, prev)).toBeGreaterThan(0.001)
  await page.keyboard.press('Escape')
  await expect(P).toHaveCount(0)
  const back = await settled(page, CV, prev)
  expect(await diff(page, base0, back)).toBeLessThan(0.0005)
  await expect(page.locator('[data-fontpop] .fp-trigger')).toContainText('Montserrat')

  // tastatur: ↓ forhåndsviser, Enter velger
  await open(page)
  await P.getByPlaceholder(/Søk/).fill('anton')
  await P.getByPlaceholder(/Søk/).press('ArrowDown')
  await P.getByPlaceholder(/Søk/).press('ArrowUp')
  await P.getByPlaceholder(/Søk/).press('Enter')
  await expect(page.locator('[data-fontpop] .fp-trigger')).toContainText('Anton')
  // favoritter og nylig brukt (localStorage)
  await open(page)
  await P.getByPlaceholder(/Søk/).fill('')
  await expect(P.getByText('Nylig brukt')).toBeVisible()
  await P.locator('.fp-row', { hasText: 'Anton' }).first().locator('.fp-star').click()
  await P.getByRole('tab', { name: '★ Favoritter' }).click()
  await expect(P.locator('.fp-row', { hasText: 'Anton' })).toHaveCount(1)
  expect(await page.evaluate(() => localStorage.getItem('fontpicker:favoritter'))).toContain('anton')
  expect(await page.evaluate(() => localStorage.getItem('fontpicker:nylig'))).toContain('anton')
  await P.getByRole('tab', { name: 'Alle' }).click()
  // velg en font med ekte fet og kursiv
  await P.getByPlaceholder(/Søk/).fill('montserrat')
  await P.locator('.fp-row', { hasText: 'Montserrat' }).first().click()
  await open(page)

  // --- verktøylinjen
  const T = P.locator('.fp-top')
  await changes(page, () => T.getByTitle('Kursiv').click(), 'Kursiv')
  await changes(page, () => T.getByTitle('Fet').click(), 'Fet')
  await changes(page, async () => {
    await T.getByRole('button', { name: 'Velg understrek' }).click()
    await P.getByRole('menuitemradio', { name: 'Bølget' }).click()
  }, 'Understrek')
  await changes(page, () => T.getByTitle('Gjennomstreking').click(), 'Gjennomstreking')
  await changes(page, () => T.getByRole('button', { name: 'Mindre tekst' }).click(), 'Mindre tekst')
  await changes(page, async () => {
    await T.getByTitle('Velg størrelse').click()
    await P.getByRole('button', { name: '72 px' }).click()
  }, 'Størrelse fra listen')
  await changes(page, async () => {
    await T.getByTitle('Linjeavstand').click()
    await P.getByRole('button', { name: '2,0', exact: true }).click()
  }, 'Linjeavstand')
  await changes(page, async () => {
    await T.getByTitle('Linjeavstand').click()
    await P.getByRole('slider', { name: 'Linjeavstand egendefinert' }).fill('1.3')
    await T.getByTitle('Linjeavstand').click()
  }, 'Linjeavstand egendefinert')
  await changes(page, async () => {
    await T.getByTitle('Bokstavavstand (tetthet)').click()
    await P.locator('.fp-menu button').nth(5).click()
  }, 'Bokstavavstand')

  // --- Stil
  await tab(page, 'Stil')
  await changes(page, () => P.getByRole('radio', { name: 'bunn høyre' }).click(), 'Plassering')
  await changes(page, () => P.locator('.fp-dirs button', { hasText: 'Stablet' }).click(), 'Tekstretning')
  await P.locator('.fp-dirs button', { hasText: 'Vannrett' }).first().click()
  await changes(page, () => P.locator('.fp-rotq button', { hasText: '+15°' }).click(), 'Roter')
  await changes(page, () => P.getByRole('slider', { name: 'Roter' }).fill('-30'), 'Roter glidebryter')
  await P.locator('.fp-reset', { hasText: '0°' }).click()
  await changes(page, () => P.locator('.fp-flip button', { hasText: 'Vannrett' }).click(), 'Speilvend')
  await P.locator('.fp-flip button', { hasText: 'Vannrett' }).click()
  await P.getByRole('radio', { name: 'midt midt' }).click()
  const shapes = ['Bue', 'Bølge', 'Sirkel', 'Spiral', 'Bånd', 'Buede linjer', 'Flagg', 'Bule', 'Klem', 'Perspektiv', 'Skjev', 'Mønster', 'Ordsky']
  for (const sh of shapes) {
    await changes(page, () => P.locator('.fp-shapes button', { hasText: new RegExp(`^${sh}$`) }).click(), `Form ${sh}`)
    if (sh !== 'Ordsky') {
      // eget innstillingspanel med Tilbakestill (og Snu der formen har det)
      await expect(P.getByRole('button', { name: 'Tilbakestill' }).first()).toBeVisible()
      const slider = P.locator('.fp-pane input[type=range]:not([aria-label="Roter"])').first()
      if (await slider.count()) {
        const lo = Number((await slider.getAttribute('min')) ?? 0)
        const hi = Number((await slider.getAttribute('max')) ?? 100)
        await changes(page, () => slider.fill(String(Math.round(lo + (hi - lo) * 0.85))), `Innstilling for ${sh}`)
      }
      const snu = P.getByRole('button', { name: 'Snu' })
      if (await snu.count() && await snu.first().isEnabled()) await changes(page, () => snu.first().click(), `Snu ${sh}`)
      const reset = P.getByRole('button', { name: 'Tilbakestill' }).first()
      if (await reset.isEnabled()) await reset.click()
    }
  }
  // ordsky: like ord slås sammen uansett store/små bokstaver og vises som ×3
  await expect(P.locator('.fp-word', { hasText: '×3' })).toHaveCount(1)
  await expect(P.locator('.fp-word-name', { hasText: /^sol×3$/i })).toHaveCount(1)
  await changes(page, () => P.getByRole('radiogroup', { name: 'Størrelse på ferie' }).getByRole('radio').nth(0).click(), 'Ordstørrelse')

  // --- Effekter (med Ingen form, så alle effektene er tilgjengelige)
  await P.locator('.fp-shapes button', { hasText: /^Ingen$/ }).click()
  await tab(page, 'Effekter')
  const fx = P.locator('.fp-fx:not(.fp-shapes):not(.fp-presets-grid) > button')
  const n = await fx.count()
  expect(n).toBeGreaterThan(15)
  for (let i = 1; i < n; i++) {
    const name = (await fx.nth(i).innerText()).trim()
    if (/Bildefyll/.test(name)) continue
    await changes(page, async () => {
      await fx.nth(i).click()
      await expect(fx.nth(i)).toHaveClass('on')
    }, `Effekt ${name}`)
    await expect(P.getByRole('button', { name: 'Tilbakestill' }).first()).toBeVisible()
  }
  // farge på effekten
  await changes(page, () => P.locator('.fp-sw button:not(.on)').nth(1).click(), 'Effektfarge')
  // ferdige oppsett
  const presets = P.locator('.fp-presets-grid > button')
  expect(await presets.count()).toBeGreaterThan(3)
  await changes(page, () => presets.nth(1).click(), 'Ferdig oppsett')
  await changes(page, () => presets.nth(2).click(), 'Ferdig oppsett 2')

  await page.keyboard.press('Escape')
  await expect(pop(page)).toHaveCount(0)
  expect(errors, errors.join('\n')).toEqual([])
  void info
})

test('fontpopupen: textStyle lagres per lag, Bildefyll lastes opp til appens lagring, og eksporten er lik lerretet', async ({ page }, info) => {
  test.setTimeout(420000)
  const errors = watchErrors(page)
  await blankWithText(page, 'BILDE FYLL tekst')
  const P = pop(page)
  // statisk font (WebKit på Windows tegner variable fonter i grunnvekten)
  await tab(page, 'Font')
  await P.getByPlaceholder(/Søk/).fill('anton')
  await P.locator('.fp-row', { hasText: 'Anton' }).first().click()
  await tab(page, 'Effekter')
  // Bildefyll med et opplastet bilde (rødt/blått): lagres i Dine medier, ikke som blob:-adresse
  await fxTile(P, /^Bildefyll$/).first().click()
  await P.locator('.fp-upload input[type=file]').setInputFiles({ name: 'fyll.png', mimeType: 'image/png', buffer: png(64, 64, (x) => (x < 32 ? [230, 20, 20, 255] : [20, 40, 230, 255])) })
  await page.waitForTimeout(1500)
  const cvFill = await settled(page, CV)
  expect(await share(page, cvFill, [230, 20, 20])).toBeGreaterThan(0.002)
  expect(await share(page, cvFill, [20, 40, 230])).toBeGreaterThan(0.002)
  await page.keyboard.press('Escape')

  // lagre, last inn på nytt: stilen og bildet kommer tilbake (en blob:-adresse ville ikke overlevd)
  await page.getByRole('button', { name: 'Lagre mal' }).click()
  await page.getByRole('dialog', { name: 'Lagre mal' }).getByRole('button', { name: 'Lagre som ny mal' }).click()
  await expect(page.getByText('Malen er lagret.')).toBeVisible()
  await page.reload()
  await expect(page.locator(CV)).toBeVisible()
  await dock(page, 'layers')
  await expect(page.locator('[data-layer]').first()).toBeVisible()
  const re = await settled(page, CV)
  expect(await diff(page, cvFill, re)).toBeLessThan(0.002)
  const file0 = await exportPng(page, info.outputPath('bildefyll.png'))
  expect(await diff(page, re, file0)).toBeLessThan(0.002)

  // samme stil i popupen etter innlasting
  await dock(page, 'layers')
  await page.locator('[data-layer]').first().click()
  await dock(page, 'edit')
  await tab(page, 'Effekter')
  await expect(fxTile(P, /^Bildefyll$/).and(P.locator('button.on'))).toHaveCount(1)

  // eksporten er lik lerretet: Slitt, Spray, Støv, Ordsky og en bred font
  const cases: [string, () => Promise<void>][] = [
    ['slitt', () => fxTile(P, /^Slitt$/).click()],
    ['spray', () => fxTile(P, /^Spray$/).click()],
    ['stov', () => fxTile(P, /^Støv$/).click()],
    ['ordsky', async () => {
      await P.getByRole('tab', { name: 'Effekter', exact: true }).click()
      await fxTile(P, /^Ingen$/).first().click()
      await P.getByRole('tab', { name: 'Stil', exact: true }).click()
      await P.locator('.fp-shapes button', { hasText: /^Ordsky$/ }).click()
    }],
    ['bred', async () => {
      await P.getByRole('tab', { name: 'Stil', exact: true }).click()
      await P.locator('.fp-shapes button', { hasText: /^Ingen$/ }).click()
      await P.getByRole('tab', { name: 'Font', exact: true }).click()
      await P.getByRole('tab', { name: 'Alle' }).click()
      await P.getByPlaceholder(/Søk/).fill('archivo expanded')
      await P.locator('.fp-row', { hasText: 'Bred – Expanded' }).first().click()
    }],
  ]
  for (const [name, act] of cases) {
    await open(page)
    if (name !== 'ordsky' && name !== 'bred') await P.getByRole('tab', { name: 'Effekter', exact: true }).click()
    const before = await settled(page, CV)
    await act()
    const cv = await settled(page, CV, before)
    expect(await diff(page, before, cv), `${name} endret ikke lerretet`).toBeGreaterThan(0.0005)
    const out = await exportPng(page, info.outputPath(`${name}.png`))
    const d = await diff(page, cv, out)
    expect(d, `eksport ≠ lerret for ${name} (${(d * 100).toFixed(2)} %)`).toBeLessThan(0.002)
  }
  expect(errors, errors.join('\n')).toEqual([])
})
