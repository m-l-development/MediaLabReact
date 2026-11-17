import { expect, test, type Locator, type Page } from '@playwright/test'
import { dock } from './dock'
import { diff, diffScaled, settled, watchErrors } from './fontpopup-kit'

/**
 * Tekstredigering i alle editorene (components/text): tekstfeltet i panelet har live-visning (lagets font og
 * typografi, uten effekter) som standard og «Vis tekstboks» (dagens tekstboks) – samme felt og samme tekst. Dobbeltklikk
 * på teksten på lerretet gir redigering der den står: endringene går rett til laget, Esc setter teksten tilbake, klikk
 * utenfor beholder den.
 */
interface Ed {
  name: string
  canvas: string
  open(page: Page): Promise<void>
  field(page: Page): Locator
  /** Punktet midt på tekstlaget (for dobbeltklikk). */
  textAt(page: Page): Promise<{ x: number; y: number } | null>
  /** Lagrer, laster siden på nytt og viser tekstfeltet igjen. */
  saveReload(page: Page): Promise<void>
}

/** Redigeringsfeltet på lerretet (felles komponent, og Loops egen). */
const inlineEd = (page: Page) => page.locator('textarea[aria-label="Rediger tekst"]')

/** Loop på mobil: forhåndsvisningen («Forhåndsvis») og panelet («Rediger») vises hver for seg. */
async function loopView(page: Page, v: 'canvas' | 'panel') {
  if (test.info().project.name !== 'mobil' || !page.url().includes('loop-studio')) return
  const b = page.getByRole('button', { name: v === 'canvas' ? 'Forhåndsvis' : 'Rediger', exact: true })
  if (await b.isVisible().catch(() => false)) await b.click()
}

/** Tekstfeltet i panelet som har verdien (eller det første). */
async function fieldWith(page: Page, v: string): Promise<Locator> {
  const all = page.locator('[data-text-mode] textarea')
  const i = await all.evaluateAll((ts, val) => ts.findIndex((t) => (t as HTMLTextAreaElement).value === val), v)
  return all.nth(Math.max(0, i))
}

const center = async (l: Locator) => {
  const b = await l.boundingBox()
  return b ? { x: b.x + b.width / 2, y: b.y + b.height / 2 } : null
}

const EDS: Ed[] = [
  {
    name: 'Thumbnail Studio',
    canvas: '[data-ts-canvas]',
    async open(page) {
      await page.goto('/app/thumbnail-studio')
      await page.getByRole('button', { name: /Ungdomsmøte/ }).click()
      await page.getByRole('button', { name: /Ny mal/ }).click()
      await page.getByRole('dialog', { name: 'Ny mal' }).locator('[data-layout="blank"]').click()
      await dock(page, 'add')
      await page.getByRole('button', { name: 'Tekst', exact: true }).first().click()
      await dock(page, 'edit')
    },
    field: (page) => page.locator('textarea[data-ts-text]'),
    textAt: (page) => center(page.locator('[data-ts-sel]').first()),
    async saveReload(page) {
      await page.getByRole('button', { name: 'Lagre mal' }).click()
      await page.getByRole('dialog', { name: 'Lagre mal' }).getByRole('button', { name: 'Lagre som ny mal' }).click()
      await expect(page.getByText('Malen er lagret.')).toBeVisible()
      await page.reload()
      await expect(page.locator('[data-ts-canvas]')).toBeVisible()
      await dock(page, 'layers')
      await page.locator('[data-layer]').first().click()
      await dock(page, 'edit')
    },
  },
  {
    name: 'Photo Design',
    canvas: '[data-pd-view="edit"] canvas',
    async open(page) {
      await page.goto('/app/photo-design')
      await page.locator('[data-tpl="blank"]').click()
      await dock(page, 'add')
      await page.getByRole('button', { name: 'Tekst', exact: true }).first().click()
      await dock(page, 'edit')
    },
    field: (page) => page.locator('textarea[data-pd-text]'),
    textAt: (page) => center(page.locator('[data-pd-selbox]').first()),
    async saveReload(page) {
      await page.getByRole('button', { name: 'Lagre', exact: true }).first().click()
      await expect(page.getByText('Prosjektet er lagret.')).toBeVisible()
      await page.reload()
      if (!(await page.locator('[data-pd-view="edit"]').count())) await page.locator('[data-project]').first().click()
      await dock(page, 'layers')
      await page.locator('[data-layer]').first().click()
      await dock(page, 'edit')
    },
  },
  {
    name: 'Motion Design',
    canvas: '[data-md-canvas]',
    async open(page) {
      await page.goto('/app/motion-design')
      await page.getByRole('button', { name: 'Nytt prosjekt' }).click()
      await page.locator('[data-format="wide"]').click()
      await page.locator('[data-tpl="blank"]').click()
      await expect(page.locator('[data-md-canvas]')).toBeVisible()
      await page.locator('[data-adv-toggle]').click()
      await page.locator('[data-md-tab="text"]').click()
      await page.locator('[data-md-add-text]').click()
      // mobil: egenskapene ligger bak «Egenskaper»
      const eg = page.getByRole('button', { name: 'Egenskaper', exact: true })
      if (await eg.isVisible().catch(() => false)) await eg.click()
    },
    field: (page) => page.locator('[data-md-props] textarea').first(),
    textAt: (page) => center(page.locator('[data-md-canvas]')),
    async saveReload(page) {
      await page.getByRole('button', { name: 'Lagre', exact: true }).click()
      await expect(page.getByText('Prosjektet er lagret.')).toBeVisible()
      await page.reload()
      await expect(page.locator('[data-md-canvas]')).toBeVisible()
      await page.locator('[data-row="text"] [data-block="text"]').first().click()
      const eg = page.getByRole('button', { name: 'Egenskaper', exact: true })
      if (await eg.isVisible().catch(() => false)) await eg.click()
    },
  },
  {
    name: 'Loop Studio',
    canvas: '[data-loop-canvas]',
    async open(page) {
      await page.goto('/app/loop-studio')
      await page.getByRole('link', { name: /Ukeprogram/ }).click()
      await expect(page.locator('[data-loop-canvas]')).toBeVisible()
      if (test.info().project.name === 'mobil') await page.getByRole('button', { name: 'Rediger', exact: true }).click()
      await page.getByRole('button', { name: 'Program', exact: true }).click()
      await page.getByPlaceholder('Tirsdag 25. aug kl 19:00 Kveldsmat i kafeen').fill('Søndag kl 11 Gudstjeneste')
      await page.getByRole('button', { name: 'Oppdater videoen' }).click()
      await page.getByRole('button', { name: 'Slides', exact: true }).first().click()
      await page.getByRole('button', { name: '+ Tekst', exact: true }).first().click()
    },
    field: (page) => page.locator('[data-text-mode] textarea').first(),
    async textAt(page) {
      await loopView(page, 'canvas')
      // teksten står nederst til venstre i sliden: prøv punkter der til redigeringen åpnes
      const b = (await page.locator('[data-loop-canvas]').boundingBox())!
      // et felt med flere linjer (overskrift/brødtekst; i enlinjefelt lagrer Enter, som før)
      for (const fy of [0.72, 0.66, 0.78, 0.6, 0.84, 0.54, 0.9, 0.48]) for (const fx of [0.1, 0.18, 0.26, 0.36, 0.48]) {
        await page.mouse.dblclick(b.x + b.width * fx, b.y + b.height * fy)
        if (await inlineEd(page).isVisible().catch(() => false)) {
          const multi = await page.getByText('Enter ny linje').isVisible().catch(() => false)
          await inlineEd(page).press('Escape')
          if (multi) return { x: b.x + b.width * fx, y: b.y + b.height * fy }
        }
      }
      return null
    },
    async saveReload(page) {
      await page.waitForTimeout(1500) // autolagring
      await page.reload()
      await expect(page.locator('[data-loop-canvas]')).toBeVisible()
      await loopView(page, 'panel')
      await page.getByRole('button', { name: 'Slides', exact: true }).first().click()
      // til sliden med teksten
      for (let i = 0; i < 8 && !(await page.locator('[data-text-mode] textarea').evaluateAll((ts) => ts.some((t) => (t as HTMLTextAreaElement).value.includes('Tredje')))); i++) {
        await page.getByRole('button', { name: '›', exact: true }).first().click()
      }
    },
  },
]

for (const E of EDS) {
  test(`tekstfeltet og redigering på lerretet i ${E.name}`, async ({ page }) => {
    test.setTimeout(240_000)
    const errors = watchErrors(page)
    await page.addInitScript(() => localStorage.removeItem('medialab.textbox'))
    await E.open(page)
    const f = E.field(page)
    await expect(f).toBeVisible()
    const wrapOf = f.locator('xpath=ancestor::*[@data-text-mode][1]')

    // live-visning er standard: tekstfeltet har tekstens font og justering, uten ramme
    await expect(wrapOf).toHaveAttribute('data-text-mode', 'live')
    const live = await f.evaluate((t) => { const c = getComputedStyle(t); return { family: c.fontFamily, border: c.borderTopWidth, align: c.textAlign } })
    expect(live.border).toBe('0px')
    expect(live.family).not.toMatch(/^(system-ui|-apple-system|"?Inter)/)

    // flere linjer i live-visningen vises på lerretet
    const c0 = await settled(page, E.canvas)
    await f.fill('Første linje\nAndre linje')
    const c1 = await settled(page, E.canvas, c0)
    expect(await diff(page, c0, c1, 12), 'teksten fra live-visningen kom ikke på lerretet').toBeGreaterThan(0.00005)

    // «Vis tekstboks»: dagens tekstboks, samme tekst; tilbake gir live-visningen igjen
    await wrapOf.getByRole('checkbox', { name: 'Vis tekstboks' }).check()
    await expect(wrapOf).toHaveAttribute('data-text-mode', 'box')
    await expect(f).toHaveValue('Første linje\nAndre linje')
    const box = await f.evaluate((t) => getComputedStyle(t).fontFamily)
    expect(box).not.toBe(live.family)
    await f.fill('Tekstboks')
    const c2 = await settled(page, E.canvas, c1)
    expect(await diff(page, c1, c2, 12), 'teksten fra tekstboksen kom ikke på lerretet').toBeGreaterThan(0.00005)
    await wrapOf.getByRole('checkbox', { name: 'Vis tekstboks' }).uncheck()
    await expect(wrapOf).toHaveAttribute('data-text-mode', 'live')
    await expect(f).toHaveValue('Tekstboks')

    const split = test.info().project.name === 'mobil' && E.name === 'Loop Studio'
    if (split) {
      // lerret → panel: Enter gir linjeskift; panelet har teksten når det vises
      const at = await E.textAt(page)
      expect(at, 'fant ikke teksten på lerretet').not.toBeNull()
      const ed = inlineEd(page)
      await page.mouse.dblclick(at!.x, at!.y)
      await expect(ed).toBeVisible()
      const v0 = await ed.inputValue()
      await ed.press('ControlOrMeta+a')
      await ed.pressSequentially('Første')
      await ed.press('Enter')
      await ed.pressSequentially('Andre')
      await expect(ed).toBeVisible()
      // Esc: tilbake
      await ed.press('Escape')
      await expect(ed).toHaveCount(0)
      await page.mouse.dblclick(at!.x, at!.y)
      await expect(ed).toHaveValue(v0)
      await ed.press('ControlOrMeta+a')
      await ed.pressSequentially('Første')
      await ed.press('Enter')
      await ed.pressSequentially('Andre')
      await ed.press('ControlOrMeta+Enter')
      await expect(ed).toHaveCount(0)
      await loopView(page, 'panel')
      const P = await fieldWith(page, 'Første\nAndre')
      await expect(P).toHaveValue('Første\nAndre')
      // panel → lerret
      await P.press('ControlOrMeta+End')
      await P.press('Enter')
      await P.pressSequentially('Tredje')
      await expect(P).toHaveValue('Første\nAndre\nTredje')
      await loopView(page, 'canvas')
      await page.mouse.dblclick(at!.x, at!.y)
      await expect(ed).toHaveValue('Første\nAndre\nTredje')
      await ed.press('Escape')
    } else {
      // dobbeltklikk på lerretet: redigering der teksten står, i samme tekst som feltet i panelet
      const at = await E.textAt(page)
      expect(at, 'fant ikke teksten på lerretet').not.toBeNull()
      const ed = inlineEd(page)
      await page.mouse.dblclick(at!.x, at!.y)
      await expect(ed).toBeVisible()
      // panelfeltet med samme tekst (Loop: overskriften eller brødteksten som ble åpnet)
      const v0 = await ed.inputValue()
      const P = await fieldWith(page, v0)
      // lerret → panel: skriv, Enter gir linjeskift (ingen andre editorfunksjoner), panelet følger med mens man skriver
      await ed.press('ControlOrMeta+a')
      await ed.pressSequentially('Linje en')
      await ed.press('Enter')
      await ed.pressSequentially('Linje to')
      await expect(ed).toBeVisible()
      await expect(P).toHaveValue('Linje en\nLinje to')
      // Esc: teksten tilbake
      await ed.press('Escape')
      await expect(ed).toHaveCount(0)
      await expect(P).toHaveValue(v0)
      // på lerretet igjen; klikk i panelet avslutter og beholder teksten – videre redigering der
      await page.mouse.dblclick(at!.x, at!.y)
      await expect(ed).toBeVisible()
      await ed.press('ControlOrMeta+a')
      await ed.pressSequentially('Første')
      await ed.press('Enter')
      await ed.pressSequentially('Andre')
      await P.click()
      await expect(ed).toHaveCount(0)
      await expect(P).toHaveValue('Første\nAndre')
      // panel → lerret: en tredje linje i panelet, og redigeringen på lerretet viser den
      await P.press('ControlOrMeta+End')
      await P.press('Enter')
      await P.pressSequentially('Tredje')
      await expect(P).toHaveValue('Første\nAndre\nTredje')
      await page.mouse.dblclick(at!.x, at!.y)
      await expect(ed).toHaveValue('Første\nAndre\nTredje')
      await page.mouse.click(5, 5)
      await expect(ed).toHaveCount(0)

    }
    await loopView(page, 'canvas')
    const before = await settled(page, E.canvas)
    // lagring og gjenåpning: linjeskiftene er med, og lerretet er likt
    await E.saveReload(page)
    const three = 'Første\nAndre\nTredje'
    await expect.poll(async () => (await fieldWith(page, three)).inputValue()).toBe(three)
    const P2 = await fieldWith(page, three)
    await expect(P2).toHaveValue('Første\nAndre\nTredje')
    await loopView(page, 'canvas')
    const after = await settled(page, E.canvas)
    expect(await diffScaled(page, before, after, 480, 40, 0.12), 'teksten er ikke lik etter gjenåpning').toBeLessThan(0.02)
    expect(errors, errors.join('\n')).toEqual([])
  })
}
