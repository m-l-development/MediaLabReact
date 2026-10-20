import fs from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { png } from './png'

/**
 * Retning på designet i Mockups: 90° høyre/venstre, vend vannrett/loddrett, tilbakestill, fri vinkel, «Vis hele» med
 * stående resultat, lagring per mockup, logoen urørt, og eksporten lik forhåndsvisningen.
 * Designet er 320×200 med fire felt: øverst rødt | blått, nederst grønt | gult.
 */
const quad = () => png(320, 200, (x, y) => (y < 100 ? (x < 160 ? [230, 20, 20, 255] : [20, 40, 230, 255]) : (x < 160 ? [20, 200, 40, 255] : [240, 220, 20, 255])))
const LOGO = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#ff00ff"/></svg>'

type C = { x: number; y: number; n: number }
/** Tyngdepunkt (andeler av bildet) for hver farge, og rammen rundt de fargede feltene. */
async function analyse(page: Page, src: { canvas: true } | { file: string }) {
  const data = 'file' in src ? fs.readFileSync(src.file).toString('base64') : null
  return page.evaluate(async (d) => {
    let W: number, H: number, px: Uint8ClampedArray
    if (d) {
      const bmp = await createImageBitmap(await (await fetch(`data:image/png;base64,${d}`)).blob())
      const c = new OffscreenCanvas(bmp.width, bmp.height)
      const g = c.getContext('2d') as OffscreenCanvasRenderingContext2D
      g.drawImage(bmp, 0, 0)
      W = bmp.width; H = bmp.height; px = g.getImageData(0, 0, W, H).data
    } else {
      const c = document.querySelector('[class*="stageCanvas"]') as HTMLCanvasElement
      W = c.width; H = c.height; px = (c.getContext('2d') as CanvasRenderingContext2D).getImageData(0, 0, W, H).data
    }
    const acc: Record<string, { x: number; y: number; n: number }> = { red: { x: 0, y: 0, n: 0 }, blue: { x: 0, y: 0, n: 0 }, green: { x: 0, y: 0, n: 0 }, yellow: { x: 0, y: 0, n: 0 }, magenta: { x: 0, y: 0, n: 0 } }
    let x0 = W, x1 = 0, y0 = H, y1 = 0
    const step = Math.max(1, Math.round(W / 600))
    for (let y = 0; y < H; y += step) for (let x = 0; x < W; x += step) {
      const i = (y * W + x) * 4, r = px[i] ?? 0, gg = px[i + 1] ?? 0, b = px[i + 2] ?? 0
      const k = r > 150 && gg < 80 && b > 150 ? 'magenta' : r > 140 && gg < 90 && b < 90 ? 'red' : b > 140 && r < 90 && gg < 120 ? 'blue' : gg > 120 && r < 110 && b < 110 ? 'green' : r > 150 && gg > 140 && b < 90 ? 'yellow' : null
      if (!k) continue
      const a = acc[k] as { x: number; y: number; n: number }
      a.x += x / W; a.y += y / H; a.n++
      if (k === 'blue' || k === 'green') { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y) }
    }
    const out: Record<string, { x: number; y: number; n: number }> = {}
    for (const [k, a] of Object.entries(acc)) out[k] = a.n ? { x: a.x / a.n, y: a.y / a.n, n: a.n } : { x: NaN, y: NaN, n: 0 }
    return { W, H, c: out, box: { w: (x1 - x0) / W, h: (y1 - y0) / H, ratio: ((x1 - x0) * 1) / Math.max(1, y1 - y0) } }
  }, data)
}
/** Hvilken farge ligger i hvert hjørne (øverst venstre, øverst høyre, nederst venstre, nederst høyre). */
const layout = (c: Record<string, C>) => {
  const k = ['red', 'blue', 'green', 'yellow'].filter((n) => (c[n]?.n ?? 0) > 0)
  const top = [...k].sort((a, b) => c[a]!.y - c[b]!.y).slice(0, 2).sort((a, b) => c[a]!.x - c[b]!.x)
  const bot = k.filter((n) => !top.includes(n)).sort((a, b) => c[a]!.x - c[b]!.x)
  return [...top, ...bot].join(' ')
}

test('retning på designet: roter, vend, tilbakestill, fri vinkel, logo og eksport', async ({ page }, info) => {
  test.skip(info.project.name === 'mobil', 'kjøres én gang')
  test.setTimeout(180_000)
  await page.goto('/app/mockups?mockup=tv-wall')
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 30_000 })
  await expect(page.getByRole('button', { name: 'Last ned', exact: true }).last()).toBeEnabled({ timeout: 60_000 }) // fotografiet er lastet
  await expect(page.getByRole('button', { name: 'Roter 90° mot høyre' })).toBeDisabled() // uten design
  const ch = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: /Last opp design|Bytt design/ }).first().click()
  await (await ch).setFiles({ name: 'design.png', mimeType: 'image/png', buffer: quad() })
  const lc = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Legg til logo' }).click()
  await (await lc).setFiles({ name: 'logo.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(LOGO) })
  const logo = page.locator('[data-mk-logo]')
  await expect(logo).toBeVisible()
  const logoBox0 = await logo.boundingBox()

  const rows: string[] = []
  const settle = () => page.waitForTimeout(500)
  const seen = async (label: string) => { await settle(); const a = await analyse(page, { canvas: true }); rows.push(`${label}: ${layout(a.c)} (ramme ${a.box.ratio.toFixed(2)})`); return a }

  expect(layout((await seen('start')).c)).toBe('red blue green yellow')
  await page.getByRole('button', { name: 'Roter 90° mot høyre' }).click()
  expect(layout((await seen('90° høyre')).c)).toBe('green red yellow blue')
  await page.getByRole('button', { name: 'Vend vannrett' }).click()
  expect(layout((await seen('+ vend vannrett')).c)).toBe('red green blue yellow')
  await page.getByRole('button', { name: 'Tilbakestill retning' }).click()
  expect(layout((await seen('tilbakestilt')).c)).toBe('red blue green yellow')
  await page.getByRole('button', { name: 'Vend loddrett' }).click()
  expect(layout((await seen('vend loddrett')).c)).toBe('green yellow red blue')
  await page.getByRole('button', { name: 'Tilbakestill retning' }).click()
  await page.getByRole('button', { name: 'Roter 90° mot venstre' }).click()
  expect(layout((await seen('90° venstre')).c)).toBe('blue yellow red green')

  // «Vis hele» etter 270°: det liggende designet står nå, med riktige proporsjoner
  await page.getByRole('button', { name: 'Vis hele' }).click()
  const contain = await seen('vis hele, 270°')
  await page.getByRole('button', { name: 'Tilbakestill retning' }).click()
  const flat = await seen('vis hele, 0°')
  // samme skjerm og perspektiv: rotert/urotert = (200/320)/(320/200) ≈ 0,39 → ikke strukket
  const q = contain.box.ratio / flat.box.ratio
  rows.push('forhold rotert/urotert: ' + q.toFixed(3))
  expect(q).toBeGreaterThan(0.33)
  expect(q).toBeLessThan(0.45)
  await page.getByRole('button', { name: 'Fyll skjermen' }).click()

  // fri vinkel med glidebryteren
  const slider = page.getByRole('slider', { name: /Rotasjon/ })
  await slider.fill('45')
  await expect(page.getByText('45°')).toBeVisible()

  // lagret per mockup, og gjenopprettet ved ny åpning
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('mockups.settings') ?? '{}')['tv-wall'])
  expect([saved.rot, saved.flipX, saved.flipY]).toEqual([45, false, false])
  await page.getByRole('button', { name: 'Roter 90° mot høyre' }).click() // 45 → 135
  await page.reload()
  await expect(page.getByRole('button', { name: 'Last ned', exact: true }).last()).toBeEnabled({ timeout: 60_000 }) // fotografiet er lastet
  await expect(page.getByRole('slider', { name: /Rotasjon/ })).toHaveValue('135')
  await expect(page.getByRole('button', { name: 'Roter 90° mot høyre' })).toBeDisabled() // designet huskes ikke etter ny innlasting

  // logoen er urørt av rotasjonen (samme plass i bildet)
  const ch2 = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: /Last opp design|Bytt design/ }).first().click()
  await (await ch2).setFiles({ name: 'design.png', mimeType: 'image/png', buffer: quad() })
  const lc2 = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Legg til logo' }).click()
  await (await lc2).setFiles({ name: 'logo.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(LOGO) })
  await expect(logo).toBeVisible()
  await page.getByRole('button', { name: 'Tilbakestill retning' }).click()
  await page.getByRole('button', { name: 'Roter 90° mot høyre' }).click()
  const lb = await logo.boundingBox()
  expect(Math.abs(lb!.x - logoBox0!.x)).toBeLessThan(2)
  expect(Math.abs(lb!.width - logoBox0!.width)).toBeLessThan(2)
  expect(Math.abs(lb!.width - lb!.height)).toBeLessThan(2) // kvadratisk logo forblir kvadratisk

  // eksporten samsvarer med forhåndsvisningen (samme retning, logoen på samme sted)
  const pre = await seen('forhåndsvisning før eksport')
  const dl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Last ned', exact: true }).last().click()
  const file = info.outputPath('rotert.png')
  await (await dl).saveAs(file)
  const ex = await analyse(page, { file })
  rows.push(`eksport ${ex.W}×${ex.H}: ${layout(ex.c)}`)
  expect(layout(ex.c)).toBe(layout(pre.c))
  expect(ex.c.magenta!.n).toBeGreaterThan(0)
  // logoen ligger i eget lag over forhåndsvisningen: midtpunktet i eksporten = midtpunktet i laget (andeler av bildet)
  const mid = await page.evaluate(() => { const l = document.querySelector('[data-mk-logo]')!.getBoundingClientRect(), w = document.querySelector('[data-mk-logo]')!.parentElement!.getBoundingClientRect(); return { x: (l.left + l.width / 2 - w.left) / w.width, y: (l.top + l.height / 2 - w.top) / w.height } })
  rows.push('logo midt eksport/lag: ' + ex.c.magenta!.x.toFixed(3) + ',' + ex.c.magenta!.y.toFixed(3) + ' / ' + mid.x.toFixed(3) + ',' + mid.y.toFixed(3))
  expect(Math.abs(ex.c.magenta!.x - mid.x)).toBeLessThan(0.01)
  expect(Math.abs(ex.c.magenta!.y - mid.y)).toBeLessThan(0.01)
  console.log('\n' + rows.join('\n'))
})

test('skjermkvalitet: ingen sømmer i forvrengningen og ingenting utenfor skjermen', async ({ page }, info) => {
  test.skip(info.project.name === 'mobil', 'kjøres én gang')
  test.setTimeout(120_000)
  await page.goto('/app/mockups?mockup=imac-desk')
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 30_000 })
  await expect(page.getByRole('button', { name: 'Last ned', exact: true }).last()).toBeEnabled({ timeout: 60_000 }) // fotografiet er lastet
  const ch = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: /Last opp design|Bytt design/ }).first().click()
  await (await ch).setFiles({ name: 'rod.png', mimeType: 'image/png', buffer: png(400, 250, () => [200, 30, 30, 255]) })
  await page.waitForTimeout(800)
  const dl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Last ned', exact: true }).last().click()
  const file = info.outputPath('imac.png')
  await (await dl).saveAs(file)
  const r = await page.evaluate(async (data) => {
    const bmp = await createImageBitmap(await (await fetch(`data:image/png;base64,${data}`)).blob())
    const c = new OffscreenCanvas(bmp.width, bmp.height)
    const g = c.getContext('2d') as OffscreenCanvasRenderingContext2D
    g.drawImage(bmp, 0, 0)
    const W = bmp.width, H = bmp.height, d = g.getImageData(0, 0, W, H).data
    const red = (i: number) => (d[i] ?? 0) > 90 && (d[i] ?? 0) > (d[i + 1] ?? 0) * 2.2 && (d[i] ?? 0) > (d[i + 2] ?? 0) * 2.2
    let x0 = W, x1 = 0, y0 = H, y1 = 0
    for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) if (red((y * W + x) * 4)) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y) }
    // innerst på skjermen (10 % fra kantene): alle piksler skal være designets røde (ingen lyse/mørke sømstriper)
    let bad = 0, n = 0
    const ix0 = x0 + (x1 - x0) * 0.1, ix1 = x1 - (x1 - x0) * 0.1, iy0 = y0 + (y1 - y0) * 0.1, iy1 = y1 - (y1 - y0) * 0.1
    for (let y = Math.round(iy0); y < iy1; y++) for (let x = Math.round(ix0); x < ix1; x++) { n++; if (!red((y * W + x) * 4)) bad++ }
    return { W, H, box: [x0 / W, y0 / H, x1 / W, y1 / H].map((v) => +v.toFixed(3)), bad, n }
  }, fs.readFileSync(file).toString('base64'))
  console.log('kvalitet', JSON.stringify(r))
  expect(r.bad).toBe(0)
})
