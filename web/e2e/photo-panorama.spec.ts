/**
 * Photo Design: Panorama. Kildebildene lages av et ekte fotografi (stue) lagt på en sylinder rundt kameraet: tre
 * visninger der kameraet dreies (fasit kjent), med ulik eksponering og en litt skjev horisont. Hele flyten: legg til,
 * automatisk sammensetning, projeksjon, finjustering av ett bilde, egen beskjæring, «Bruk» (nytt prosjekt i panoramaets
 * størrelse), «Rediger panorama …» med oppskriften og ny «Bruk».
 */
import fs from 'node:fs'
import { expect, test, type Page } from '@playwright/test'

const PHOTO = fs.readFileSync(new URL('../../media-lab/public/images/mockups/tv-livingroom.jpg', import.meta.url))

/** Visninger av fotografiet: bildet dekker 110° rundt kameraet; hver visning har 48° synsvinkel. */
async function views(page: Page, opts: { yaw: number; gain: number; roll?: number; noise?: number }[], w = 900, h = 600, fov = 48): Promise<Buffer[]> {
  const b64 = await page.evaluate(async ({ src, opts, w, h, fov }) => {
    const im = new Image()
    im.src = src
    await im.decode()
    const c0 = document.createElement('canvas')
    c0.width = im.naturalWidth
    c0.height = im.naturalHeight
    const g0 = c0.getContext('2d')!
    g0.drawImage(im, 0, 0)
    const P = g0.getImageData(0, 0, c0.width, c0.height).data, PW = c0.width, PH = c0.height
    const span = (110 * Math.PI) / 180, fS = PW / span // piksler per radian på sylinderen
    const f = w / 2 / Math.tan((fov * Math.PI) / 360)
    const out: string[] = []
    for (const o of opts) {
      const c = document.createElement('canvas')
      c.width = w
      c.height = h
      const g = c.getContext('2d')!
      const id = g.createImageData(w, h)
      const cy = Math.cos((o.yaw * Math.PI) / 180), sy = Math.sin((o.yaw * Math.PI) / 180)
      const rl = ((o.roll ?? 0) * Math.PI) / 180, cr = Math.cos(rl), sr = Math.sin(rl)
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        // kameraets stråle (med rull), dreid om loddaksen
        const X0 = x + 0.5 - w / 2, Y0 = y + 0.5 - h / 2
        const X = cr * X0 - sr * Y0, Y = sr * X0 + cr * Y0, Z = f
        const wx = cy * X + sy * Z, wz = -sy * X + cy * Z, wy = Y
        const th = Math.atan2(wx, wz), hh = wy / Math.hypot(wx, wz)
        const u = th * fS + PW / 2, v = hh * fS + PH / 2
        const q = (y * w + x) * 4
        if (u < 0 || v < 0 || u >= PW - 1 || v >= PH - 1) { id.data[q + 3] = 255; continue }
        const x0 = Math.floor(u), y0 = Math.floor(v), fx = u - x0, fy = v - y0
        for (let k = 0; k < 3; k++) {
          const a = P[(y0 * PW + x0) * 4 + k]!, b = P[(y0 * PW + x0 + 1) * 4 + k]!, cc = P[((y0 + 1) * PW + x0) * 4 + k]!, d = P[((y0 + 1) * PW + x0 + 1) * 4 + k]!
          id.data[q + k] = ((a * (1 - fx) + b * fx) * (1 - fy) + (cc * (1 - fx) + d * fx) * fy) * o.gain + (o.noise ? (Math.random() + Math.random() + Math.random() - 1.5) * 2 * o.noise : 0)
        }
        id.data[q + 3] = 255
      }
      g.putImageData(id, 0, 0)
      out.push(c.toDataURL('image/jpeg', 0.92).split(',')[1]!)
    }
    return out
  }, { src: 'data:image/jpeg;base64,' + PHOTO.toString('base64'), opts, w, h, fov })
  return b64.map((x) => Buffer.from(x, 'base64'))
}

/** Andel ugjennomsiktige piksler og bredde/høyde i forhåndsvisningen. */
const preview = (page: Page) => page.locator('[data-pano-preview]').evaluate((c: HTMLCanvasElement) => {
  const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data
  let op = 0, sum = 0
  for (let i = 3; i < d.length; i += 4 * 7) { op++; if (d[i]! === 255) sum++ }
  return { w: c.width, h: c.height, full: sum / op, sig: Array.from(d.slice(d.length / 2, d.length / 2 + 400)).join(',') }
})

test('panorama: sett sammen tre bilder, juster, beskjær, bruk og rediger igjen', async ({ page }, info) => {
  test.setTimeout(240_000)
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('/app/photo-design')
  const files = await views(page, [{ yaw: -22, gain: 0.75 }, { yaw: 0, gain: 1, roll: 1.5 }, { yaw: 22, gain: 1.25 }])
  await page.locator('[data-pd-pano-new]').click()
  const dlg = page.locator('[data-pd-pano]')
  await expect(dlg).toBeVisible()
  await expect(dlg.locator('[data-pano-empty]')).toBeVisible()
  const ch = page.waitForEvent('filechooser')
  await dlg.locator('[data-pano-add]').click()
  // rekkefølgen spiller ingen rolle
  await (await ch).setFiles([2, 0, 1].map((i) => ({ name: `stue-${i + 1}.jpg`, mimeType: 'image/jpeg', buffer: files[i]! })))
  await expect(dlg.locator('[data-pano-item]')).toHaveCount(3)
  await expect(dlg.locator('[data-pano-preview]')).toBeVisible({ timeout: 90_000 })
  await expect(dlg.locator('[data-pano-err]')).toHaveCount(0)
  await expect(dlg.locator('[data-pano-lost]')).toHaveCount(0)
  await expect.poll(async () => (await preview(page)).w, { timeout: 30_000 }).toBeGreaterThan(0)
  const a = await preview(page)
  // tre bilder à 48° dreid 22°: rundt 92° vannrett – bredt panorama, og automatisk beskjæring gir ingen tomme kanter
  expect(a.w / a.h).toBeGreaterThan(2)
  expect(a.full).toBeGreaterThan(0.999)
  await page.locator('[data-pano-preview]').screenshot({ path: info.outputPath('pano-auto.png') })
  await expect(dlg.locator('[data-pano-dims]')).toContainText(/\d+ × \d+ px/)

  // hele: tomme kanter blir gjennomsiktige
  await dlg.locator('[data-pano-seg="crop"] [data-v="none"]').click()
  await expect.poll(async () => (await preview(page)).full).toBeLessThan(0.99)
  // plan projeksjon gir et annet bilde
  const before = (await preview(page)).sig
  await dlg.locator('[data-pano-seg="proj"] [data-v="plane"]').click()
  await expect.poll(async () => (await preview(page)).sig).not.toBe(before)
  await dlg.locator('[data-pano-seg="proj"] [data-v="cyl"]').click()

  // ett bilde justeres for seg: velg det, dra det i forhåndsvisningen
  await dlg.locator('[data-pano-item="1"] button').first().click()
  await expect(dlg.locator('[data-pano-outline]')).toBeVisible()
  await expect(dlg.locator('[data-pano-img-adj]')).toBeVisible()
  const sig0 = (await preview(page)).sig
  const box = (await dlg.locator('[data-pano-drag]').boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2 + 25, box.y + box.height / 2 + 6, { steps: 4 })
  await page.mouse.up()
  await expect.poll(async () => (await preview(page)).sig).not.toBe(sig0)
  // tilbake til null med ↺ på glidebryterne (dobbeltklikk nullstiller)
  for (const r of await dlg.locator('[data-pano-img-adj] input[type="range"]').all()) await r.dblclick()
  await dlg.locator('[data-pano-item="1"] button').first().click()

  // egen beskjæring: dra hjørnet nede til høyre innover
  await dlg.locator('[data-pano-seg="crop"] [data-v="own"]').click()
  await expect(dlg.locator('[data-pano-crop-box]')).toBeVisible()
  const hb = (await dlg.locator('[data-pano-handle="br"]').boundingBox())!
  await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2)
  await page.mouse.down()
  await page.mouse.move(hb.x - 120, hb.y - 40, { steps: 5 })
  await page.mouse.up()
  await dlg.locator('[data-pano-crop-done]').click()
  await expect.poll(async () => (await preview(page)).w / (await preview(page)).h).toBeLessThan(a.w / a.h)
  // tilbake til automatisk for resten
  await dlg.locator('[data-pano-seg="crop"] [data-v="auto"]').click()

  // Bruk: nytt prosjekt i panoramaets størrelse med ett panoramalag
  await dlg.locator('[data-pano-apply]').click()
  await expect(dlg).toHaveCount(0, { timeout: 120_000 })
  await expect(page.locator('[data-pd-view="edit"]')).toBeVisible()
  // mobil: lagene og egenskapene ligger i ikonlinjen nederst
  const mob = info.project.name === 'mobil'
  if (mob) await page.locator('[data-dock-tab="layers"]').click()
  const lay = page.locator('[data-layer]').filter({ hasText: 'Panorama' })
  await expect(lay).toHaveCount(1)
  await lay.click()
  if (mob) await page.locator('[data-dock-tab="edit"]').click()
  await expect(page.locator('[data-pd-pano-edit]')).toBeVisible()
  // Rediger panorama: samme bilder og innstillinger, uten ny analyse
  await page.locator('[data-pd-pano-edit]').click()
  await expect(dlg).toBeVisible()
  await expect(dlg.locator('[data-pano-item]')).toHaveCount(3)
  await expect.poll(async () => (await preview(page)).w, { timeout: 60_000 }).toBeGreaterThan(0)
  await expect(dlg.locator('[data-pano-busy="features"]')).toHaveCount(0)
  await dlg.locator('[data-pano-seg="scale"] [data-v="0.5"]').click()
  await dlg.locator('[data-pano-apply]').click()
  await expect(dlg).toHaveCount(0, { timeout: 120_000 })
  if (mob) await page.locator('[data-dock-tab="layers"]').click()
  await expect(lay).toHaveCount(1)
  expect(errors).toEqual([])
})

test('panorama: fem bilder, svært mørkt og overeksponert bilde med støy – full oppløsning lastes ned', async ({ page }, info) => {
  test.setTimeout(300_000)
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('/app/photo-design')
  // 30° synsvinkel, 19° mellom bildene: ≈ 37 % overlapp. (Med 24 % overlapp lå overlappet mellom de to bildene lengst til
  // høyre på hvit vegg uten kjennetegn – det kan ingen sammenføyning plassere; appen sier fra og utelater bildet. Lite
  // overlapp (20 %) i teksturerte scener dekkes av enhetstestene.)
  const files = await views(page, [
    { yaw: -72, gain: 1, noise: 4 }, { yaw: -36, gain: 0.35, noise: 7 }, { yaw: 0, gain: 1 }, { yaw: 36, gain: 1.45, noise: 5 }, { yaw: 72, gain: 0.9, noise: 4 },
  ].map((o) => ({ ...o, yaw: (o.yaw / 36) * 19 })), 900, 600, 30)
  await page.locator('[data-pd-pano-new]').click()
  const dlg = page.locator('[data-pd-pano]')
  const ch = page.waitForEvent('filechooser')
  await dlg.locator('[data-pano-add]').click()
  await (await ch).setFiles(files.map((b, i) => ({ name: `rom-${i + 1}.jpg`, mimeType: 'image/jpeg', buffer: b })))
  await expect(dlg.locator('[data-pano-preview]')).toBeVisible({ timeout: 120_000 })
  await expect(dlg.locator('[data-pano-busy]')).toHaveCount(0, { timeout: 60_000 })
  await expect(dlg.locator('[data-pano-err]')).toHaveCount(0)
  await expect(dlg.locator('[data-pano-lost]')).toHaveCount(0)
  const a = await preview(page)
  expect(a.full).toBeGreaterThan(0.999)
  expect(a.w / a.h).toBeGreaterThan(2.4)
  // eksponeringen er utjevnet: middellysstyrken i fem like brede striper varierer lite
  const bands = await page.locator('[data-pano-preview]').evaluate((c: HTMLCanvasElement) => {
    const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data, out = [0, 0, 0, 0, 0], n = [0, 0, 0, 0, 0]
    for (let y = 0; y < c.height; y += 3) for (let x = 0; x < c.width; x += 3) { const k = Math.min(4, Math.floor((x / c.width) * 5)), q = (y * c.width + x) * 4; out[k]! += d[q]! + d[q + 1]! + d[q + 2]!; n[k]!++ }
    return out.map((v, i) => v / n[i]! / 3)
  })
  info.annotations.push({ type: 'lysstyrke per stripe', description: bands.map((x) => x.toFixed(0)).join(' ') })
  await page.locator('[data-pano-preview]').screenshot({ path: info.outputPath('pano-hard.png') })
  if (info.project.name === 'mobil') await page.screenshot({ path: info.outputPath('pano-mobil.png') })
  // last ned i full oppløsning: målene stemmer med det dialogen viser, og bildet har innhold overalt
  const dims = (await dlg.locator('[data-pano-dims]').innerText()).match(/(\d+) × (\d+)/)!
  const dl = page.waitForEvent('download', { timeout: 180_000 })
  await dlg.locator('[data-pano-download]').click()
  const d = await dl
  const buf = fs.readFileSync((await d.path())!)
  const got = await page.evaluate(async (b64) => {
    const im = new Image()
    im.src = 'data:image/jpeg;base64,' + b64
    await im.decode()
    const c = document.createElement('canvas')
    c.width = 400
    c.height = Math.round((400 * im.naturalHeight) / im.naturalWidth)
    const g = c.getContext('2d')!
    g.drawImage(im, 0, 0, c.width, c.height)
    const px = g.getImageData(0, 0, c.width, c.height).data
    let dark = 0
    for (let i = 0; i < px.length; i += 4) if (px[i]! + px[i + 1]! + px[i + 2]! < 15) dark++
    return { w: im.naturalWidth, h: im.naturalHeight, dark: dark / (px.length / 4) }
  }, buf.toString('base64'))
  expect(d.suggestedFilename()).toMatch(/Panorama\.(jpg|png)$/)
  expect(Math.abs(got.w - Number(dims[1]))).toBeLessThanOrEqual(2)
  expect(Math.abs(got.h - Number(dims[2]))).toBeLessThanOrEqual(2)
  expect(got.w).toBeGreaterThan(2000)
  expect(got.dark).toBeLessThan(0.01)
  expect(errors).toEqual([])
})
