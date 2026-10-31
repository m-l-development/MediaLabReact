import fs from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { POINTS } from './fredag-points'

/**
 * Arbeidsflyten etter automatisk «Person» (ekte modeller, ekte scenebilde): det modellen ikke fant, rettes med den
 * felles maskeredigeringen – «Velg objekt» (SlimSAM) med Behold på mannen i midten og personen i mørke klær, og en liten
 * Behold-pensel over mikrofonhodet. Alle punktene (personer og bakgrunn) kontrolleres i den nedlastede PNG-en.
 */
const PHOTO = fs.readFileSync(path.join(import.meta.dirname, '..', '..', 'media-lab', 'public', 'images', 'fredag.jpeg'))
const W = 1440
const H = 1800

async function scr(page: Page, x: number, y: number) {
  return page.locator('[data-mask-canvas]').evaluate((c: HTMLCanvasElement, [px, py]) => {
    const r = c.getBoundingClientRect()
    const z = (c as unknown as { mlMaskView?: { s: number; ox: number; oy: number } }).mlMaskView
    if (!z) throw new Error('ingen visning')
    return { x: r.left + z.ox + px * z.s, y: r.top + z.oy + py * z.s, s: z.s }
  }, [x, y] as [number, number])
}

test('Person + «Velg objekt» og pensel: hele personene og detaljene beholdes, bakgrunnen fjernes', async ({ page }, info) => {
  test.setTimeout(600_000)
  await page.goto('/app/isolate-subject')
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: /Slipp et bilde her/ }).click()
  await (await chooser).setFiles({ name: 'fredag.jpg', mimeType: 'image/jpeg', buffer: PHOTO })
  await page.getByRole('button', { name: 'Hopp over' }).click()
  await page.getByRole('button', { name: /^Person/ }).click()
  await expect(page.getByRole('button', { name: 'Last ned PNG' })).toBeEnabled({ timeout: 240_000 })

  await page.locator('[data-mask-open]').click()
  await expect(page.locator('[data-mask-canvas]')).toBeVisible()
  // «Velg objekt» med Behold: mannen i midten (t-skjorten) og personen i mørke klær (skjorten)
  await page.locator('[data-mask-tool="select"]').click()
  await page.locator('[data-mask-keep="1"]').click()
  for (const [x, y] of [[800, 850], [520, 800]] as const) {
    const p = await scr(page, x, y)
    await page.mouse.click(p.x, p.y)
    await expect(page.getByText('Velger objektet …')).toHaveCount(0, { timeout: 240_000 })
  }
  // liten Behold-pensel over mikrofonhodet til mannen i rød skjorte (zoomet inn)
  await page.locator('[data-mask-tool="brush"]').click()
  await page.locator('[data-mask-size]').fill('14')
  const m = await scr(page, 123, 723)
  await page.mouse.move(m.x, m.y)
  await page.keyboard.down('Control')
  for (let i = 0; i < 6; i++) await page.mouse.wheel(0, -120)
  await page.keyboard.up('Control')
  const a0 = await scr(page, 121, 712)
  const a1 = await scr(page, 126, 736)
  await page.mouse.move(a0.x, a0.y)
  await page.mouse.down()
  await page.mouse.move(a1.x, a1.y, { steps: 8 })
  await page.mouse.up()
  // mørkt mot mørkt (skulder og hår): ingen modell skiller dem, så brukeren maler med Behold (vanlig pensel)
  await page.keyboard.press('0')
  // små strøk innenfor personen (ikke ut i bakgrunnen, som ga mørke klumper med store strøk)
  await page.locator('[data-mask-size]').fill('16')
  const stroke = async ([x0, y0]: readonly [number, number], [x1, y1]: readonly [number, number]) => {
    const p0 = await scr(page, x0, y0)
    const p1 = await scr(page, x1, y1)
    await page.mouse.move(p0.x, p0.y)
    await page.mouse.down()
    await page.mouse.move(p1.x, p1.y, { steps: 6 })
    await page.mouse.up()
  }
  await stroke([496, 744], [516, 737])
  await stroke([592, 668], [602, 662])
  // lilla scenelys foran ansiktet (MODNet tok det med): Fjern med «Følg kantene» fra det lilla – huden røres ikke
  await page.locator('[data-mask-keep="0"]').click()
  await page.locator('[data-mask-snap]').check()
  await page.locator('[data-mask-size]').fill('22')
  await stroke([150, 671], [168, 666])
  await stroke([146, 674], [140, 676])
  // gløden rundt har en annen (mørkere) farge: nye strøk som starter i den (kantfølgingen bruker fargen der strøket starter)
  await stroke([176, 664], [188, 662])
  await stroke([152, 686], [156, 712])
  await page.locator('[data-mask-snap]').uncheck()
  // løse flekker under personene
  await page.locator('[data-mask-clean]').click()
  await page.screenshot({ path: info.outputPath('redigering.png') })
  await page.locator('[data-mask-done]').click()

  const dl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Last ned PNG' }).click()
  const file = info.outputPath('resultat.png')
  await (await dl).saveAs(file)
  const b64 = fs.readFileSync(file).toString('base64')
  const a = await page.evaluate(async ({ data, pts, w, h }) => {
    const bmp = await createImageBitmap(await (await fetch(`data:image/png;base64,${data}`)).blob())
    if (bmp.width !== w || bmp.height !== h) throw new Error('feil størrelse')
    const c = new OffscreenCanvas(w, h)
    const g = c.getContext('2d') as OffscreenCanvasRenderingContext2D
    g.drawImage(bmp, 0, 0)
    return pts.map(([, x, y]) => g.getImageData(x, y, 1, 1).data[3] ?? 0)
  }, { data: b64, pts: POINTS, w: W, h: H })
  const rows = POINTS.map(([n, x, y, keep], i) => `${(a[i] ?? 0) >= 128 === keep ? 'OK  ' : 'FEIL'} ${keep ? 'behold' : 'fjern '} alfa ${String(a[i]).padStart(3)}  ${n} (${x},${y})`)
  console.log(`\n[Person + verktøy]\n${rows.join('\n')}\n`)
  await info.attach('alfa', { body: rows.join('\n'), contentType: 'text/plain' })
  const wrong = POINTS.filter(([, , , keep], i) => (a[i] ?? 0) >= 128 !== keep).map(([n]) => n)
  expect(wrong, 'punkter med feil resultat etter korrigering').toEqual([])
})
