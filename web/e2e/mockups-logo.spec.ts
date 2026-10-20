import fs from 'node:fs'
import { expect, test, type Page } from '@playwright/test'

/**
 * Logo oppå mockupen: SVG beholdes som vektor i redigeringen, flyttes og skaleres proporsjonalt, holder plassen ved
 * endret vindusstørrelse, og er med (skarp, gjennomsiktig der den skal) i eksporten i full oppløsning – uten håndtak.
 * Logoen: 200×100, venstre halvdel rød, høyre halvdel gjennomsiktig.
 */
const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100"><rect x="0" y="0" width="100" height="100" fill="#e01010"/></svg>'

const rel = async (page: Page) => page.evaluate(() => {
  const w = document.querySelector('[data-mk-logo]')?.parentElement?.getBoundingClientRect()
  const l = document.querySelector('[data-mk-logo]')?.getBoundingClientRect()
  if (!w || !l) return null
  return { x: (l.left - w.left) / w.width, y: (l.top - w.top) / w.height, w: l.width / w.width, aspectPx: l.width / l.height }
})

test('logo på mockup: SVG som vektor, flytt, skaler, zoom og eksport', async ({ page }, info) => {
  test.skip(info.project.name === 'mobil', 'pekerdraging testes på desktop')
  test.slow()
  await page.goto('/app/mockups?mockup=tv-wall')
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 30_000 })
  await expect(page.getByRole('button', { name: 'Last ned', exact: true }).last()).toBeEnabled({ timeout: 60_000 }) // fotografiet er lastet

  // 1. Legg til logo fra enheten (SVG)
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Legg til logo' }).click()
  await (await chooser).setFiles({ name: 'logo.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(SVG) })
  const logo = page.locator('[data-mk-logo]')
  await expect(logo).toBeVisible()
  await expect(page.getByRole('button', { name: 'Bytt logo' })).toBeVisible()

  // SVG-en vises som SVG (vektor), ikke som en omgjort bitmap
  const src = await logo.locator('img').getAttribute('src')
  const served = await page.evaluate(async (u) => { const r = await fetch(u as string); return { type: (await r.blob()).type, text: await (await fetch(u as string)).text() } }, src)
  expect(served.type).toBe('image/svg+xml')
  expect(served.text).toContain('<rect')

  // standard: 5 % fra toppen og 5 % fra høyre kant, med logoens proporsjoner (2:1)
  const p0 = await rel(page)
  expect(p0!.y).toBeCloseTo(0.05, 2)
  expect(p0!.x + p0!.w).toBeCloseTo(0.95, 2)
  expect(p0!.aspectPx).toBeCloseTo(2, 1)

  // 2. Flytt (dra flaten)
  const b = (await logo.boundingBox())!
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2)
  await page.mouse.down()
  await page.mouse.move(b.x + b.width / 2 - 200, b.y + b.height / 2 + 120, { steps: 8 })
  await page.mouse.up()
  const p1 = await rel(page)
  expect(p1!.x).toBeLessThan(p0!.x - 0.05)
  expect(p1!.y).toBeGreaterThan(p0!.y + 0.05)

  // 3. Skaler proporsjonalt fra nedre høyre hjørne
  const h = (await logo.locator('[data-c="2"]').boundingBox())!
  await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2)
  await page.mouse.down()
  await page.mouse.move(h.x + h.width / 2 + 120, h.y + h.height / 2 + 10, { steps: 8 })
  await page.mouse.up()
  const p2 = await rel(page)
  expect(p2!.w).toBeGreaterThan(p1!.w * 1.3)
  expect(p2!.aspectPx).toBeCloseTo(2, 1)
  expect(p2!.x).toBeCloseTo(p1!.x, 3) // øvre venstre hjørne står fast
  expect(p2!.y).toBeCloseTo(p1!.y, 3)

  // lagret per mockup som andeler av bildet
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('mockups.settings') ?? '{}')['tv-wall']?.logo)
  expect(saved.w).toBeCloseTo(p2!.w, 2)

  // 4. Endret vindusstørrelse: samme plassering i bildet
  await page.setViewportSize({ width: 1000, height: 700 })
  await page.waitForTimeout(400)
  const p3 = await rel(page)
  expect(p3!.x).toBeCloseTo(p2!.x, 2)
  expect(p3!.y).toBeCloseTo(p2!.y, 2)
  expect(p3!.w).toBeCloseTo(p2!.w, 2)

  // 5. Eksport i full oppløsning (logoen er valgt, så håndtakene vises – de skal ikke være med)
  await logo.click()
  await expect(logo.locator('[data-c="0"]')).toBeVisible()
  const dl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Last ned', exact: true }).last().click()
  const file = info.outputPath('mockup-logo.png')
  await (await dl).saveAs(file)
  const r = await page.evaluate(async ({ data, p }) => {
    const bmp = await createImageBitmap(await (await fetch(`data:image/png;base64,${data}`)).blob())
    const c = new OffscreenCanvas(bmp.width, bmp.height)
    const g = c.getContext('2d') as OffscreenCanvasRenderingContext2D
    g.drawImage(bmp, 0, 0)
    const W = bmp.width, H = bmp.height
    const lw = p.w * W, lh = lw / 2, lx = p.x * W, ly = p.y * H
    const at = (x: number, y: number) => Array.from(g.getImageData(Math.round(x), Math.round(y), 1, 1).data)
    const red = (q: number[]) => (q[0] ?? 0) > 180 && (q[1] ?? 0) < 60 && (q[2] ?? 0) < 60
    // skarp kant midt i logoen (rød → gjennomsiktig): antall overgangspiksler langs en rad
    const row = g.getImageData(Math.round(lx + lw * 0.3), Math.round(ly + lh / 2), Math.round(lw * 0.4), 1).data
    let mixed = 0
    for (let i = 0; i < row.length; i += 4) { const rr = row[i] ?? 0, gg = row[i + 1] ?? 0; if (rr > 120 && rr < 200 && gg < 120) mixed++ }
    // håndtakfargen (#f5b82c) rundt logoens hjørner
    let amber = 0
    for (const [cx, cy] of [[lx, ly], [lx + lw, ly], [lx + lw, ly + lh], [lx, ly + lh]]) {
      const d = g.getImageData(Math.round(cx) - 8, Math.round(cy) - 8, 16, 16).data
      for (let i = 0; i < d.length; i += 4) if (Math.abs((d[i] ?? 0) - 245) < 12 && Math.abs((d[i + 1] ?? 0) - 184) < 14 && Math.abs((d[i + 2] ?? 0) - 44) < 20) amber++
    }
    return { W, H, lw: Math.round(lw), leftRed: red(at(lx + lw * 0.25, ly + lh / 2)), rightRed: red(at(lx + lw * 0.75, ly + lh / 2)), mixed, amber }
  }, { data: fs.readFileSync(file).toString('base64'), p: p3! })
  console.log('eksport', JSON.stringify(r))
  expect(r.W).toBeGreaterThan(1000)
  expect(r.leftRed).toBe(true) // logoen er med i filen
  expect(r.rightRed).toBe(false) // gjennomsiktig halvdel viser bildet under
  expect(r.mixed).toBeLessThanOrEqual(2) // skarp vektor-kant i eksportoppløsningen (ikke oppskalert bitmap)
  expect(r.amber).toBe(0) // ingen håndtak eller markering i eksporten

  // 6. Fjern logoen
  await page.getByRole('button', { name: 'Fjern logo' }).click()
  await expect(logo).toHaveCount(0)
})
