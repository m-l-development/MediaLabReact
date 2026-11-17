import { expect, test, type Locator, type Page } from '@playwright/test'
import { png } from './png'
import { dock } from './dock'
import { diffScaled, expectOnTop, fileUrl, pop, settled, share, watchErrors } from './fontpopup-kit'

/**
 * Kontrakten for fontpopupen i hver editor (samme komponent og tegnemotor overalt; hele popupen testes i
 * fontpopup-thumbnail.spec.ts). Her testes bare koblingen i editoren: popupen ligger øverst og er hel, endringer vises
 * på lerretet, forhåndsvisningen går tilbake, stilen kommer tilbake etter lagring og innlasting (også Bildefyll fra
 * appens lagring), og eksportert bilde er likt lerretet (Bildefyll, Slitt + Ordsky).
 */
interface Editor {
  name: string
  canvas: string
  /** Åpner editoren med ett tekstlag valgt (panelet med Font-feltet vises). */
  open(page: Page, text: string): Promise<void>
  /** Velger tekstlaget igjen (etter Esc, eksport eller innlasting). */
  select(page: Page): Promise<void>
  /** Lagrer og laster siden på nytt; tekstlaget er valgt etterpå. */
  saveReload(page: Page): Promise<void>
  /** Eksporterer et bilde og gir det som data-URL. */
  exportImage(page: Page, file: string): Promise<string>
}

const EDITORS: Editor[] = [
  {
    name: 'Thumbnail Studio',
    canvas: '[data-ts-canvas]',
    async open(page, text) {
      await page.goto('/app/thumbnail-studio')
      await page.getByRole('button', { name: /Ungdomsmøte/ }).click()
      await page.getByRole('button', { name: /Ny mal/ }).click()
      await page.getByRole('dialog', { name: 'Ny mal' }).locator('[data-layout="blank"]').click()
      await dock(page, 'edit')
      const hex = page.getByRole('textbox', { name: 'Egen farge' }).first()
      await hex.fill('#6a6a6a')
      await hex.press('Enter')
      await dock(page, 'add')
      await page.getByRole('button', { name: 'Tekst', exact: true }).click()
      await dock(page, 'edit')
      await page.getByRole('textbox', { name: 'Tekst', exact: true }).fill(text)
      const n = page.locator('input[type=number]')
      for (const [i, v] of [[2, '1400'], [3, '700'], [0, '260'], [1, '190']] as const) {
        await n.nth(i).fill(v)
        await n.nth(i).press('Enter')
      }
    },
    async select(page) {
      if (await page.locator('[data-fontpop] .fp-trigger').count()) return
      await dock(page, 'layers')
      await page.locator('[data-layer]').first().click()
      await dock(page, 'edit')
    },
    async saveReload(page) {
      await page.getByRole('button', { name: 'Lagre mal' }).click()
      await page.getByRole('dialog', { name: 'Lagre mal' }).getByRole('button', { name: 'Lagre som ny mal' }).click()
      await expect(page.getByText('Malen er lagret.')).toBeVisible()
      await page.reload()
      await expect(page.locator('[data-ts-canvas]')).toBeVisible()
      await this.select(page)
    },
    async exportImage(page, file) {
      await page.getByRole('button', { name: 'Eksporter', exact: true }).click()
      const exp = page.getByRole('dialog', { name: 'Eksporter' })
      await expect(exp.getByText(/Filstørrelse:/)).toBeVisible({ timeout: 60000 })
      const dl = page.waitForEvent('download')
      await exp.getByRole('button', { name: /^Last ned/ }).click()
      await (await dl).saveAs(file)
      await page.keyboard.press('Escape')
      return fileUrl(file)
    },
  },
  {
    name: 'Photo Design',
    canvas: '[data-pd-view="edit"] canvas',
    async open(page, text) {
      await page.goto('/app/photo-design')
      await page.locator('[data-tpl="blank"]').click()
      await dock(page, 'add')
      await page.getByRole('button', { name: 'Tekst', exact: true }).click()
      await dock(page, 'edit')
      await page.locator('textarea[data-pd-text]').fill(text)
    },
    async select(page) {
      if (await page.locator('[data-fontpop] .fp-trigger').count()) return
      await dock(page, 'layers')
      await page.locator('[data-layer]').first().click()
      await dock(page, 'edit')
    },
    async saveReload(page) {
      await page.getByRole('button', { name: 'Lagre', exact: true }).click()
      await expect(page.getByText('Prosjektet er lagret.')).toBeVisible()
      await page.reload()
      if (!(await page.locator('[data-pd-view="edit"]').count())) {
        await page.locator('[data-project]').first().click()
      }
      await expect(page.locator('[data-pd-view="edit"] canvas').first()).toBeVisible()
      await this.select(page)
    },
    async exportImage(page, file) {
      await page.getByRole('button', { name: 'Eksporter', exact: true }).click()
      await page.getByRole('button', { name: 'PNG', exact: true }).click().catch(() => {})
      const dl = page.waitForEvent('download')
      await page.getByRole('button', { name: 'Last ned', exact: true }).click()
      await (await dl).saveAs(file)
      await page.keyboard.press('Escape')
      return fileUrl(file)
    },
  },
]

const fxTile = (P: Locator, name: RegExp) => P.locator('.fp-fx:not(.fp-presets-grid):not(.fp-shapes) > button').filter({ has: P.page().locator('small', { hasText: name }) })

for (const E of EDITORS) {
  test(`fontpopupen i ${E.name}: vises øverst, endrer lerretet, lagres og eksporteres likt`, async ({ page }, info) => {
    test.setTimeout(900000)
    const errors = watchErrors(page)
    const P = pop(page)
    const open = async () => {
      await E.select(page)
      if (!(await P.count())) await page.locator('[data-fontpop] .fp-trigger').click()
      await expect(P).toBeVisible()
    }
    const changes = async (what: string, act: () => Promise<unknown>) => {
      const before = await settled(page, E.canvas)
      await act()
      const after = await settled(page, E.canvas, before)
      expect(await diffScaled(page, before, after, 480, 30), `${what} endret ikke lerretet`).toBeGreaterThan(0.0002)
      return after
    }

    await E.open(page, 'SOL sol hav SOMMER')
    await open()
    await expectOnTop(page)

    // statisk font (WebKit på Windows tegner variable fonter i grunnvekten), valgt i popupen
    await P.getByRole('tab', { name: 'Font', exact: true }).click()
    await P.getByRole('tab', { name: 'Alle' }).click()
    await P.getByPlaceholder(/Søk/).fill('anton')
    await P.locator('.fp-row', { hasText: 'Anton' }).first().click()
    await expect(page.locator('[data-fontpop] .fp-trigger')).toContainText('Anton')

    // forhåndsvisning: lerretet viser fonten musen er over, og valgt font igjen etter Esc
    await open()
    const base0 = await settled(page, E.canvas)
    await P.getByPlaceholder(/Søk/).fill('pacifico')
    await P.locator('.fp-row', { hasText: 'Pacifico' }).first().hover()
    const hov = await settled(page, E.canvas, base0)
    expect(await diffScaled(page, base0, hov, 480, 30)).toBeGreaterThan(0.0005)
    await page.keyboard.press('Escape')
    const back = await settled(page, E.canvas, hov)
    expect(await diffScaled(page, base0, back, 480, 30)).toBeLessThan(0.0005)
    await expect(page.locator('[data-fontpop] .fp-trigger')).toContainText('Anton')

    // verktøylinjen, Stil og Effekter virker på lerretet
    await open()
    await changes('Større tekst', () => P.locator('.fp-top').getByRole('button', { name: 'Større tekst' }).click())
    await P.getByRole('tab', { name: 'Stil', exact: true }).click()
    await changes('Form Bue', () => P.locator('.fp-shapes button', { hasText: /^Bue$/ }).click())
    await P.locator('.fp-shapes button', { hasText: /^Ingen$/ }).click()

    // Bildefyll: opplastet bilde lagres i appens lagring (overlever innlasting)
    await P.getByRole('tab', { name: 'Effekter', exact: true }).click()
    await fxTile(P, /^Bildefyll$/).click()
    await P.locator('.fp-upload input[type=file]').setInputFiles({ name: 'fyll.png', mimeType: 'image/png', buffer: png(64, 64, (x) => (x < 32 ? [230, 20, 20, 255] : [20, 40, 230, 255])) })
    await page.waitForTimeout(1500)
    const cvFill = await settled(page, E.canvas)
    expect(await share(page, cvFill, [230, 20, 20])).toBeGreaterThan(0.001)
    expect(await share(page, cvFill, [20, 40, 230])).toBeGreaterThan(0.001)
    await page.keyboard.press('Escape')
    const outFill = await E.exportImage(page, info.outputPath('bildefyll.png'))
    expect(await diffScaled(page, cvFill, outFill), 'eksport ≠ lerret (Bildefyll)').toBeLessThan(0.02)
    await E.saveReload(page)
    const re = await settled(page, E.canvas)
    expect(await share(page, re, [230, 20, 20]), 'Bildefyll kom ikke tilbake etter innlasting').toBeGreaterThan(0.001)
    expect(await diffScaled(page, cvFill, re), 'lerretet er ikke likt etter innlasting').toBeLessThan(0.01)

    // Slitt + Ordsky: eksporten er lik lerretet
    await open()
    await P.getByRole('tab', { name: 'Effekter', exact: true }).click()
    await changes('Slitt', () => fxTile(P, /^Slitt$/).click())
    await P.getByRole('tab', { name: 'Stil', exact: true }).click()
    await changes('Ordsky', () => P.locator('.fp-shapes button', { hasText: /^Ordsky$/ }).click())
    await expect(P.locator('.fp-word', { hasText: '×2' })).toHaveCount(1)
    await page.keyboard.press('Escape')
    const cv = await settled(page, E.canvas)
    const out = await E.exportImage(page, info.outputPath('ordsky-slitt.png'))
    expect(await diffScaled(page, cv, out), 'eksport ≠ lerret (Slitt + Ordsky)').toBeLessThan(0.02)

    expect(errors, errors.join('\n')).toEqual([])
  })
}
