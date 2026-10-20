import fs from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { png } from './png'

/**
 * «Flytt og skaler design» i Mockups: flytt ved å dra, proporsjonal skalering fra et hjørne, slider, tilbakestilling,
 * dobbeltklikk (hele designet, også utenfor objektet) og klikk utenfor. Logoen flyttes ikke med, og eksporten gir samme
 * plassering som forhåndsvisningen. Testes på et kort, en telefon og en skjerm.
 * Designet: 320×200, rødt med et blått felt i øvre venstre hjørne.
 */
const design = () => png(320, 200, (x, y) => (x < 80 && y < 60 ? [20, 40, 230, 255] : [230, 20, 20, 255]))
const LOGO = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#00ff00"/></svg>'

/** Tyngdepunkt (andeler) for blått og rødt i et PNG (base64) eller i forhåndsvisningen. */
const centroids = (page: Page, b64: string | null) => page.evaluate(async (data) => {
  let W: number, H: number, d: Uint8ClampedArray
  if (data) {
    const bmp = await createImageBitmap(await (await fetch(`data:image/png;base64,${data}`)).blob())
    const c = new OffscreenCanvas(bmp.width, bmp.height), g = c.getContext('2d') as OffscreenCanvasRenderingContext2D
    g.drawImage(bmp, 0, 0); W = bmp.width; H = bmp.height; d = g.getImageData(0, 0, W, H).data
  } else {
    const c = document.querySelector('[class*="stageCanvas"]') as HTMLCanvasElement
    W = c.width; H = c.height; d = (c.getContext('2d') as CanvasRenderingContext2D).getImageData(0, 0, W, H).data
  }
  const acc = { blue: [0, 0, 0], red: [0, 0, 0] }
  const step = Math.max(1, Math.round(W / 500))
  for (let y = 0; y < H; y += step) for (let x = 0; x < W; x += step) {
    const i = (y * W + x) * 4, r = d[i] ?? 0, g = d[i + 1] ?? 0, b = d[i + 2] ?? 0
    const k = b > 140 && r < 90 && g < 120 ? 'blue' : r > 140 && g < 90 && b < 90 ? 'red' : null
    if (k) { const a = acc[k]; a[0]! += x / W; a[1]! += y / H; a[2]!++ }
  }
  const f = (a: number[]) => ({ x: a[0]! / (a[2] || 1), y: a[1]! / (a[2] || 1), n: a[2]! })
  return { blue: f(acc.blue), red: f(acc.red) }
}, b64)

const saved = (page: Page, id: string) => page.evaluate((k) => JSON.parse(localStorage.getItem('mockups.settings') ?? '{}')[k] ?? {}, id)

for (const id of ['card-white-hand', 'iphone-hand', 'tv-wall']) {
  test(`flytt og skaler design: ${id}`, async ({ page }, info) => {
    test.skip(info.project.name === 'mobil', 'pekerdraging testes på desktop')
    test.setTimeout(180_000)
    await page.goto(`/app/mockups?mockup=${id}`)
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 30_000 })
    await expect(page.getByRole('button', { name: 'Last ned', exact: true }).last()).toBeEnabled({ timeout: 60_000 }) // fotografiet er lastet
    await expect(page.locator('[data-mk-design-edit]')).toBeDisabled() // uten design
    const ch = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: /Last opp design|Bytt design/ }).first().click()
    await (await ch).setFiles({ name: 'design.png', mimeType: 'image/png', buffer: design() })
    const lc = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: 'Legg til logo' }).click()
    await (await lc).setFiles({ name: 'logo.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(LOGO) })
    const logo = page.locator('[data-mk-logo]')
    await expect(logo).toBeVisible()
    const logo0 = await logo.boundingBox()
    await page.getByRole('button', { name: 'Vis hele' }).click() // hele designet synlig på objektet
    await page.waitForTimeout(500)

    // modus på: ramme og håndtak
    await page.locator('[data-mk-design-edit]').click()
    await expect(page.locator('[data-mk-design]')).toBeVisible()
    const handles = page.locator('[class*="designHandle"]')
    await expect(handles).toHaveCount(8) // 4 hjørner + 4 sider

    // 1. flytt: dra fra midten av designet
    const c0 = await centroids(page, null)
    const wrap = (await page.locator('[data-mk-wrap]').boundingBox())!
    const h = await handles.evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2] }))
    const mid = [h.reduce((s, p) => s + p[0]!, 0) / h.length, h.reduce((s, p) => s + p[1]!, 0) / h.length]
    await page.mouse.move(mid[0]!, mid[1]!)
    await page.mouse.down()
    await page.mouse.move(mid[0]! + wrap.width * 0.02, mid[1]! + wrap.height * 0.01, { steps: 2 })
    const firstStep = await saved(page, id) // ingen hopp ved start av dragingen
    await page.mouse.move(mid[0]! + wrap.width * 0.06, mid[1]! + wrap.height * 0.04, { steps: 6 })
    await page.mouse.up()
    await page.waitForTimeout(400)
    const s1 = await saved(page, id)
    const c1 = await centroids(page, null)
    expect(Math.abs(firstStep.ox ?? 0)).toBeLessThan(Math.abs(s1.ox))
    expect(c1.red.x).toBeGreaterThan(c0.red.x) // designet fulgte pekeren mot høyre og ned
    expect(c1.red.y).toBeGreaterThan(c0.red.y - 0.002)
    const l1 = await logo.boundingBox()
    expect(Math.abs(l1!.x - logo0!.x) + Math.abs(l1!.y - logo0!.y)).toBeLessThan(1) // logoen ligger i ro

    // 2. skaler fra nedre høyre hjørne, utover
    const hb = (await handles.nth(2).boundingBox())!
    await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2)
    await page.mouse.down()
    await page.mouse.move(hb.x + hb.width / 2 + wrap.width * 0.05, hb.y + hb.height / 2 + wrap.height * 0.05, { steps: 6 })
    await page.mouse.up()
    const s2 = await saved(page, id)
    expect(s2.zoom).toBeGreaterThan(1.05)
    expect(s2.ox).toBeCloseTo(s1.ox, 6) // skaleringen er rundt midtpunktet (plasseringen beholdes)

    // 3. slider og prosentvisning
    await page.getByRole('slider', { name: /Zoom/ }).fill('0.8')
    await expect(page.getByText('80 %').first()).toBeVisible()

    // 4. forhåndsvisning og eksport samsvarer
    await page.waitForTimeout(500)
    const pre = await centroids(page, null)
    const dl = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Last ned', exact: true }).last().click()
    const ex = await centroids(page, fs.readFileSync(await (await dl).path()).toString('base64'))
    expect(Math.abs(ex.red.x - pre.red.x)).toBeLessThan(0.01)
    expect(Math.abs(ex.red.y - pre.red.y)).toBeLessThan(0.01)
    expect(Math.abs(ex.blue.x - pre.blue.x)).toBeLessThan(0.015)

    // 5. dobbeltklikk: hele designet også utenfor objektet; klikk utenfor avslutter
    await page.locator('[data-mk-design-edit]').click() // modus av
    await expect(page.locator('[data-mk-design]')).toHaveCount(0)
    await page.getByRole('slider', { name: /Zoom/ }).fill('2.5') // større enn objektet
    await page.waitForTimeout(300)
    await page.locator('[data-mk-wrap]').dblclick({ position: { x: mid[0]! - wrap.x, y: mid[1]! - wrap.y } })
    await expect(page.locator('section[data-mk-full]')).toBeVisible()
    const ghost = await page.evaluate(() => { const c = document.querySelector('[class*="fullLayer"]') as HTMLCanvasElement, d = (c.getContext('2d') as CanvasRenderingContext2D).getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 16) if ((d[i] ?? 0) > 60) n++; return n })
    expect(ghost).toBeGreaterThan(100) // deler av designet utenfor objektet er synlige
    // bakgrunnen i scenen utenfor mockupen
    const sb = (await page.locator('section[data-mk-full]').boundingBox())!, wb = (await page.locator('[data-mk-wrap]').boundingBox())!
    const bx = wb.x - sb.x > 8 ? (sb.x + wb.x) / 2 : wb.x + wb.width / 2, by = wb.x - sb.x > 8 ? wb.y + wb.height / 2 : (sb.y + wb.y) / 2
    await page.mouse.click(bx, by)
    await expect(page.locator('section[data-mk-full]')).toHaveCount(0, { timeout: 3000 })
    await expect(page.locator('[data-mk-design]')).toHaveCount(0)
    const cleared = await page.evaluate(() => { const c = document.querySelector('[class*="fullLayer"]') as HTMLCanvasElement, d = (c.getContext('2d') as CanvasRenderingContext2D).getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 16) if ((d[i] ?? 0) > 0) n++; return n })
    expect(cleared).toBe(0)

    // 6. tilbakestill plassering og størrelse
    await page.getByRole('button', { name: 'Tilbakestill plassering og størrelse' }).click()
    const s3 = await saved(page, id)
    expect([s3.zoom, s3.ox, s3.oy]).toEqual([1, 0, 0])
  })
}

test('presis redigering: Shift + hjørne/side (perspektiv), hjelpelinjer, magnetisk justering og eksport', async ({ page }, info) => {
  test.skip(info.project.name === 'mobil', 'pekerdraging testes på desktop')
  test.setTimeout(180_000)
  const id = 'tv-wall'
  await page.goto(`/app/mockups?mockup=${id}`)
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 30_000 })
  await expect(page.getByRole('button', { name: 'Last ned', exact: true }).last()).toBeEnabled({ timeout: 60_000 }) // fotografiet er lastet
  const ch = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: /Last opp design|Bytt design/ }).first().click()
  await (await ch).setFiles({ name: 'design.png', mimeType: 'image/png', buffer: design() })
  await page.getByRole('button', { name: 'Vis hele' }).click()
  await page.getByRole('slider', { name: /Zoom/ }).fill('0.6')
  await page.locator('[data-mk-design-edit]').click()
  const corner = (i: number) => page.locator(`[class*="designHandle"][data-c="${i}"]`)
  const side = (i: number) => page.locator(`[class*="designHandle"][data-s="${i}"]`)
  await expect(side(0)).toBeVisible()
  const center = async (l: ReturnType<typeof corner>) => { const b = (await l.boundingBox())!; return [b.x + b.width / 2, b.y + b.height / 2] as const }
  const wrap = (await page.locator('[data-mk-wrap]').boundingBox())!

  // 1. hjelpelinjer + magnetisk: flytt designet nesten til midten → fester seg på midtlinjen, linjen vises mens det dras
  const s0 = await saved(page, id)
  expect(s0.ox ?? 0).toBe(0)
  const mid = await center(side(0))
  await page.mouse.move(mid[0], mid[1] + 30)
  await page.mouse.down()
  await page.mouse.move(mid[0] + wrap.width * 0.05, mid[1] + 30, { steps: 4 }) // bort fra midten
  await page.mouse.move(mid[0] + 2, mid[1] + 30, { steps: 4 }) // nesten tilbake (2 px): fest
  await expect(page.locator('[data-mk-guide="u0.5"]')).toHaveCount(1)
  await page.mouse.up()
  await expect(page.locator('[data-mk-guide]')).toHaveCount(0) // forsvinner når du slipper
  expect((await saved(page, id)).ox).toBeCloseTo(0, 9)

  // 2. Alt: fri plassering uten feste (samme 2 px blir stående)
  await page.mouse.move(mid[0], mid[1] + 30)
  await page.keyboard.down('Alt')
  await page.mouse.down()
  await page.mouse.move(mid[0] + 2, mid[1] + 30, { steps: 3 })
  await page.mouse.up()
  await page.keyboard.up('Alt')
  const s2 = await saved(page, id)
  expect(Math.abs(s2.ox)).toBeGreaterThan(0.0005)
  await page.getByRole('button', { name: 'Tilbakestill plassering og størrelse' }).click()
  await page.locator('[data-mk-design]').click({ position: { x: wrap.width / 2, y: wrap.height * 0.38 } }).catch(() => undefined)
  if (!(await side(0).isVisible())) await page.locator('[data-mk-design-edit]').click()

  // 3. Shift + hjørne: hjørnet flyttes alene (perspektiv), lagres som fri form
  const c1 = await center(corner(1))
  const c3a = await center(corner(3))
  await page.keyboard.down('Shift')
  await page.mouse.move(c1[0], c1[1])
  await page.mouse.down()
  await page.mouse.move(c1[0] + 25, c1[1] - 30, { steps: 6 })
  await page.mouse.up()
  await page.keyboard.up('Shift')
  const s3 = await saved(page, id)
  expect(Array.isArray(s3.dq)).toBe(true)
  const c3b = await center(corner(3))
  expect(Math.hypot(c3b[0] - c3a[0], c3b[1] - c3a[1])).toBeLessThan(1) // motsatt hjørne står i ro
  const c1b = await center(corner(1))
  expect(Math.hypot(c1b[0] - c1[0] - 25, c1b[1] - c1[1] + 30)).toBeLessThan(3) // hjørnet fulgte pekeren

  // 4. Shift + side: hele siden flyttes (begge hjørnene på siden), de to andre står
  const c0a = await center(corner(0)), c2a = await center(corner(2)), c3c = await center(corner(3))
  const s1 = await center(side(1)) // høyre side (hjørne 1–2)
  await page.keyboard.down('Shift')
  await page.mouse.move(s1[0], s1[1])
  await page.mouse.down()
  await page.mouse.move(s1[0] + 40, s1[1] + 5, { steps: 6 })
  await page.mouse.up()
  await page.keyboard.up('Shift')
  const c2b = await center(corner(2)), c0b = await center(corner(0)), c3d = await center(corner(3))
  expect(c2b[0] - c2a[0]).toBeGreaterThan(30)
  expect(Math.hypot(c0b[0] - c0a[0], c0b[1] - c0a[1])).toBeLessThan(1)
  expect(Math.hypot(c3d[0] - c3c[0], c3d[1] - c3c[1])).toBeLessThan(1)

  // 5. vanlig skalering (uten Shift) beholder formen: forholdet mellom sidene er det samme
  const len = (a: readonly number[], b: readonly number[]) => Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!)
  const before = [await center(corner(0)), await center(corner(1)), await center(corner(2)), await center(corner(3))]
  const c2 = before[2]!
  await page.mouse.move(c2[0], c2[1])
  await page.mouse.down()
  await page.mouse.move(c2[0] - 30, c2[1] - 20, { steps: 6 })
  await page.mouse.up()
  const after = [await center(corner(0)), await center(corner(1)), await center(corner(2)), await center(corner(3))]
  const r0 = len(before[0]!, before[1]!) / len(before[1]!, before[2]!), r1 = len(after[0]!, after[1]!) / len(after[1]!, after[2]!)
  expect(Math.abs(r1 - r0) / r0).toBeLessThan(0.03)
  expect(len(after[0]!, after[1]!)).toBeLessThan(len(before[0]!, before[1]!))

  // 6. forhåndsvisning = eksport, og ingen hjelpelinjer/håndtak i eksporten (rosa/gult finnes ikke i designet)
  await page.waitForTimeout(500)
  const pre = await centroids(page, null)
  const dl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Last ned', exact: true }).last().click()
  const b64 = fs.readFileSync(await (await dl).path()).toString('base64')
  const ex = await centroids(page, b64)
  expect(Math.abs(ex.red.x - pre.red.x)).toBeLessThan(0.01)
  expect(Math.abs(ex.red.y - pre.red.y)).toBeLessThan(0.01)
  const marks = await page.evaluate(async (data) => {
    const bmp = await createImageBitmap(await (await fetch(`data:image/png;base64,${data}`)).blob())
    const c = new OffscreenCanvas(bmp.width, bmp.height), g = c.getContext('2d') as OffscreenCanvasRenderingContext2D
    g.drawImage(bmp, 0, 0)
    const d = g.getImageData(0, 0, bmp.width, bmp.height).data
    let n = 0
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i] ?? 0, gg = d[i + 1] ?? 0, b = d[i + 2] ?? 0
      if ((r > 230 && gg < 90 && b > 140) || (r > 230 && gg > 160 && gg < 200 && b < 70)) n++
    }
    return n
  }, b64)
  expect(marks).toBe(0)
})

test('sidehåndtakene flytter sin side utover og innover – motsatt side står i ro (skjevt kort)', async ({ page }, info) => {
  test.skip(info.project.name === 'mobil', 'pekerdraging testes på desktop')
  test.setTimeout(180_000)
  const id = 'card-black-hand' // skjevt kort i perspektiv
  await page.goto(`/app/mockups?mockup=${id}`)
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 30_000 })
  await expect(page.getByRole('button', { name: 'Last ned', exact: true }).last()).toBeEnabled({ timeout: 60_000 }) // fotografiet er lastet
  const ch = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: /Last opp design|Bytt design/ }).first().click()
  await (await ch).setFiles({ name: 'design.png', mimeType: 'image/png', buffer: design() })
  await page.getByRole('slider', { name: /Zoom/ }).fill('0.6') // plass til å dra utover
  await page.locator('[data-mk-design-edit]').click()
  const at = async (sel: string) => { const b = (await page.locator(`[class*="designHandle"]${sel}`).boundingBox())!; return [b.x + b.width / 2, b.y + b.height / 2] as const }
  const corners = async () => Promise.all([0, 1, 2, 3].map((i) => at(`[data-c="${i}"]`)))
  const dist = (a: readonly number[], b: readonly number[]) => Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!)
  const rows: string[] = []
  // side i = mellom hjørne i og i + 1: 0 topp, 1 høyre, 2 bunn, 3 venstre (bildets egen retning)
  for (const [i, name] of [[0, 'topp'], [1, 'høyre'], [2, 'bunn'], [3, 'venstre']] as const) {
    for (const dir of [1, -1]) {
      const c0 = await corners()
      const s = await at(`[data-s="${i}"]`)
      // utover = bort fra midten av designet (i skjermen)
      const mid = [c0.reduce((a, p) => a + p[0], 0) / 4, c0.reduce((a, p) => a + p[1], 0) / 4]
      const ox = s[0] - mid[0]!, oy = s[1] - mid[1]!, l = Math.hypot(ox, oy)
      const dx = (ox / l) * 24 * dir, dy = (oy / l) * 24 * dir
      await page.mouse.move(s[0], s[1])
      await page.mouse.down()
      await page.mouse.move(s[0] + dx / 2, s[1] + dy / 2, { steps: 3 })
      await page.mouse.move(s[0] + dx, s[1] + dy, { steps: 3 })
      await page.mouse.up()
      const c1 = await corners()
      const moved = [i, (i + 1) % 4], still = [(i + 2) % 4, (i + 3) % 4]
      const mv = moved.map((j) => dist(c0[j]!, c1[j]!)), st = still.map((j) => dist(c0[j]!, c1[j]!))
      rows.push(`${name} ${dir > 0 ? 'ut' : 'inn'}: sidens hjørner flyttet ${mv.map((v) => v.toFixed(1)).join('/')} px, motsatt ${st.map((v) => v.toFixed(2)).join('/')} px`)
      for (const v of mv) expect(v).toBeGreaterThan(8) // sidens to hjørner fulgte med
      for (const v of st) expect(v).toBeLessThan(0.6) // motsatt side står i ro
      // riktig retning: sidens midtpunkt flyttet seg utover (dir 1) eller innover (dir −1)
      const s1 = await at(`[data-s="${i}"]`)
      expect(((s1[0] - s[0]) * ox + (s1[1] - s[1]) * oy) * dir).toBeGreaterThan(0)
    }
  }
  console.log('\n' + rows.join('\n'))
  // fri form lagret, og forhåndsvisning = eksport
  const s = await saved(page, id)
  expect(Array.isArray(s.dq)).toBe(true)
  await page.waitForTimeout(500)
  const pre = await centroids(page, null)
  const dl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Last ned', exact: true }).last().click()
  const ex = await centroids(page, fs.readFileSync(await (await dl).path()).toString('base64'))
  expect(Math.abs(ex.red.x - pre.red.x)).toBeLessThan(0.01)
  expect(Math.abs(ex.red.y - pre.red.y)).toBeLessThan(0.01)
  // Angre tar siste sideflytting tilbake (én draging = ett steg)
  const before = await corners()
  await page.locator('[data-mk-undo]').click()
  const after = await corners()
  expect(dist(before[3]!, after[3]!) + dist(before[0]!, after[0]!)).toBeGreaterThan(8) // venstre side tilbake
  expect(dist(before[1]!, after[1]!)).toBeLessThan(0.6)
})
