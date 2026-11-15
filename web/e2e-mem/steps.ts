/** Stegene i minnemålingene: hver editor åpnes og brukes med store bilder (navigering i appen, ingen omlasting). */
import { expect, type Page } from '@playwright/test'
import { png } from '../e2e/png'

export const BIG = png(4000, 3000, (x, y) => [(x * 7 + y) & 255, (y * 5) & 255, ((x ^ y) * 3) & 255, 255])
export const TALL = png(2400, 3600, (x, y) => [(x * 3) & 255, (x + y * 2) & 255, (y * 7) & 255, 255])

type FileSpec = { name: string; mimeType: string; buffer: Buffer }

/**
 * Filopplasting i målingene. Playwrights filvelger og setInputFiles (DevTools-protokollen) holder filfeltet med et globalt
 * håndtak («DevTools console»), og det holder hele det lukkede verktøyet – lerreter og bilder – i minnet. Det er et
 * måleartefakt (en bruker som velger eller slipper en fil, påvirkes ikke; påvist med e2e-mem/retain.spec.ts og
 * MEM_DROP=1). Derfor leveres filen her inne på siden: knappen klikkes som vanlig, og filfeltets click() får filen i
 * stedet for å åpne velgeren. MEM_CDP_FILES=1 = den gamle måten (Playwrights filvelger).
 */
async function pick(page: Page, trigger: import('@playwright/test').Locator, file: FileSpec) {
  if (process.env.MEM_CDP_FILES) {
    const ch = page.waitForEvent('filechooser')
    await trigger.click()
    await (await ch).setFiles(file)
    return
  }
  await page.evaluate((f) => {
    type W = { __memNext?: typeof f | null; __memPatched?: boolean }
    const w = window as unknown as W
    w.__memNext = f
    if (w.__memPatched) return
    w.__memPatched = true
    const deliver = (el: HTMLInputElement): boolean => {
      const n = w.__memNext
      if (el.type !== 'file' || !n) return false
      w.__memNext = null
      const bin = atob(n.b64)
      const u = new Uint8Array(bin.length)
      for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i)
      const dt = new DataTransfer()
      dt.items.add(new File([u], n.name, { type: n.type }))
      el.files = dt.files
      el.dispatchEvent(new Event('input', { bubbles: true }))
      el.dispatchEvent(new Event('change', { bubbles: true }))
      return true
    }
    const click = HTMLInputElement.prototype.click
    HTMLInputElement.prototype.click = function (this: HTMLInputElement) { if (!deliver(this)) click.call(this) }
    const sp = HTMLInputElement.prototype.showPicker
    if (sp) HTMLInputElement.prototype.showPicker = function (this: HTMLInputElement) { if (!deliver(this)) sp.call(this) }
  }, { b64: file.buffer.toString('base64'), name: file.name, type: file.mimeType })
  await trigger.click()
}

/** Navigerer i appen som en lenke gjør (ingen omlasting). */
export async function nav(page: Page, path: string) {
  await page.evaluate((p) => { history.pushState(null, '', p); dispatchEvent(new PopStateEvent('popstate')) }, path)
  await page.waitForTimeout(300)
}

export async function photo(page: Page) {
  await nav(page, '/app/photo-design')
  // malene åpnes fra den felles malpopupen («Ny mal …»)
  await page.locator('[data-pd-lib-open]').click()
  await page.locator('[data-tpl-picker] [data-tpl="photo"]').click()
  await expect(page.locator('[data-pd-view="edit"]')).toBeVisible()
  await page.locator('[data-layer]').filter({ hasText: 'Bakgrunnsbilde' }).click()
  await pick(page, page.getByRole('button', { name: 'Bytt bilde' }), { name: 'stort.png', mimeType: 'image/png', buffer: BIG })
  await expect(page.locator('[data-layer]').filter({ hasText: 'stort' })).toBeVisible({ timeout: 30_000 })
  // flere lag og en gradient, og mange angre/gjør om
  for (let i = 0; i < 4; i++) await page.locator('[data-shape]').first().click().catch(() => undefined)
  await page.keyboard.press('Escape')
  await page.locator('[data-cg-create]').click().catch(() => undefined)
  for (let i = 0; i < 10; i++) await page.getByRole('button', { name: 'Angre', exact: true }).click().catch(() => undefined)
  for (let i = 0; i < 10; i++) await page.getByRole('button', { name: 'Gjør om', exact: true }).click().catch(() => undefined)
}

export async function thumbnail(page: Page) {
  await nav(page, '/app/thumbnail-studio?cat=sunday')
  await page.getByRole('button', { name: /Ny mal/ }).click()
  await page.getByRole('dialog', { name: 'Ny mal' }).locator('[data-layout="base:main"]').click()
  await expect(page.locator('[data-ts-view="edit"]')).toBeVisible()
  await pick(page, page.getByRole('button', { name: 'Velg bilde' }).first(), { name: 'person.png', mimeType: 'image/png', buffer: TALL })
  await expect(page.getByRole('button', { name: 'Bytt bilde' }).first()).toBeVisible({ timeout: 30_000 })
}

export async function motion(page: Page) {
  await nav(page, '/app/motion-design')
  await page.getByRole('button', { name: 'Nytt prosjekt' }).click()
  await page.locator('[data-format="wide"]').click()
  await page.locator('[data-tpl="blank"]').click()
  await expect(page.locator('[data-md-canvas]')).toBeVisible()
  // Avansert modus huskes mellom åpningene: slås bare på når mediebiblioteket ikke vises
  if (!(await page.locator('[data-md-bin-import]').isVisible())) await page.locator('[data-adv-toggle]').click()
  await pick(page, page.locator('[data-md-bin-import]'), { name: 'stort.png', mimeType: 'image/png', buffer: BIG })
  await expect(page.locator('[data-md-bin-item]')).not.toHaveCount(0, { timeout: 30_000 })
  // avspilling og stopp
  await page.locator('[data-md-canvas]').click()
  await page.keyboard.press('Space')
  await page.waitForTimeout(1500)
  await page.keyboard.press('Space')
}

export async function loop(page: Page) {
  await nav(page, '/app/loop-studio?mal=week&demo=1')
  await expect(page.locator('[data-loop-canvas]')).toBeVisible({ timeout: 30_000 })
  await page.waitForTimeout(2500)
}

export async function isolate(page: Page) {
  await nav(page, '/app/isolate-subject')
  // MEM_DIRECT_INPUT=1: filen settes rett på <input type=file> (uten filvelger-håndtaket Playwright holder)
  if (process.env.MEM_DIRECT_INPUT) await page.locator('input[type=file]').first().setInputFiles({ name: 'stort.png', mimeType: 'image/png', buffer: BIG })
  // MEM_DROP=1: bildet slippes som en bruker gjør (fil laget på siden + drop-hendelse), uten DevTools-filfunksjoner
  else if (process.env.MEM_DROP) {
    await page.getByRole('button', { name: /Slipp et bilde her/ }).evaluate(async (el) => {
      const c = document.createElement('canvas')
      c.width = 4000
      c.height = 3000
      const g = c.getContext('2d')!
      const gr = g.createLinearGradient(0, 0, 4000, 3000)
      gr.addColorStop(0, '#2a6'); gr.addColorStop(1, '#a26')
      g.fillStyle = gr
      g.fillRect(0, 0, 4000, 3000)
      const b = await new Promise<Blob>((r) => c.toBlob((x) => r(x!), 'image/png'))
      c.width = 0
      const dt = new DataTransfer()
      dt.items.add(new File([b], 'stort.png', { type: 'image/png' }))
      for (const t of ['dragenter', 'dragover', 'drop']) el.dispatchEvent(new DragEvent(t, { dataTransfer: dt, bubbles: true, cancelable: true }))
    })
  }
  else {
    await pick(page, page.getByRole('button', { name: /Slipp et bilde her/ }), { name: 'stort.png', mimeType: 'image/png', buffer: BIG })
  }
  await page.getByRole('button', { name: 'Hopp over' }).click()
  await page.getByRole('button', { name: /^Merk i bildet/ }).click()
  await page.locator('[data-fill-mode]').getByRole('button', { name: 'Gjør uskarp', exact: true }).click()
  const b = await page.locator('main canvas').first().boundingBox()
  if (!b) throw new Error('lerret')
  await page.mouse.move(b.x + b.width * 0.3, b.y + b.height * 0.3)
  await page.mouse.down()
  await page.mouse.move(b.x + b.width * 0.6, b.y + b.height * 0.6, { steps: 6 })
  await page.mouse.up()
  await page.locator('[data-mark-apply]').click()
  await expect(page.locator('[data-effect="blur"]')).toBeVisible({ timeout: 30_000 })
  await page.locator('[data-effect-apply]').click()
}

