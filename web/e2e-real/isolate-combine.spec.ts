import fs from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'

/**
 * Isolate Subject, kombinasjoner med ekte modeller (MODNet, ormbg, SlimSAM, LaMa) på et ekte scenebilde
 * (media-lab/public/images/fredag.jpeg) med en gul «logo» med tekst lagt oppå bakgrunnen øverst til høyre.
 * Hver kombinasjon er én «Gjennomfør isolering». Alfa og farge leses i den nedlastede PNG-en.
 */
const PHOTO = fs.readFileSync(path.join(import.meta.dirname, '..', '..', 'media-lab', 'public', 'images', 'fredag.jpeg'))
const LOGO = { x0: 1150, y0: 80, x1: 1390, y1: 200 }
const P = { person: [1127, 723], bg: [1260, 740], logo: [1270, 140], logoEdge: [1160, 90] } as const
type Pt = keyof typeof P

let IMG: Buffer | null = null
async function image(page: Page): Promise<Buffer> {
  if (IMG) return IMG
  await page.goto('/app/')
  const b64 = await page.evaluate(async ({ data, box }) => {
    const bmp = await createImageBitmap(await (await fetch(`data:image/jpeg;base64,${data}`)).blob())
    const c = Object.assign(document.createElement('canvas'), { width: bmp.width, height: bmp.height })
    const g = c.getContext('2d') as CanvasRenderingContext2D
    g.drawImage(bmp, 0, 0)
    g.fillStyle = '#f5c518'
    g.fillRect(box.x0, box.y0, box.x1 - box.x0, box.y1 - box.y0)
    g.fillStyle = '#111'
    g.font = 'bold 64px sans-serif'
    g.fillText('LOGO', box.x0 + 40, box.y0 + 85)
    const o = [...g.getImageData(1127, 723, 1, 1).data].slice(0, 3)
    return [c.toDataURL('image/png').split(',')[1] as string, o] as const
  }, { data: PHOTO.toString('base64'), box: LOGO })
  IMG = Buffer.from(b64[0], 'base64')
  ORIG_PERSON.splice(0, 3, ...b64[1])
  return IMG
}

async function open(page: Page) {
  const buf = await image(page)
  await page.goto('/app/isolate-subject')
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: /Slipp et bilde her/ }).click()
  await (await chooser).setFiles({ name: 'fredag-logo.png', mimeType: 'image/png', buffer: buf })
  await page.getByRole('button', { name: 'Hopp over' }).click()
}

async function choose(page: Page, keep: string[], remove: string[], markLogo: boolean, method?: string) {
  for (const k of keep) await page.locator(`[data-target="${k}"]`).click()
  await page.locator('[data-tab="remove"]').click()
  for (const k of remove) await page.locator(`[data-target="${k}"]`).click()
  if (method) await page.locator('[data-fill-mode="mark"]').getByRole('button', { name: method, exact: true }).click()
  if (markLogo) {
    await page.getByRole('button', { name: /^Merk i bildet/ }).click()
    const b = (await page.locator('main canvas').first().boundingBox())!
    const fx = (x: number) => b.x + (b.width * x) / 1440
    const fy = (y: number) => b.y + (b.height * y) / 1800
    await page.mouse.move(fx(LOGO.x0 - 15), fy(LOGO.y0 - 15))
    await page.mouse.down()
    await page.mouse.move(fx(1270), fy(140), { steps: 5 })
    await page.mouse.move(fx(LOGO.x1 + 15), fy(LOGO.y1 + 15), { steps: 5 })
    await page.mouse.up()
  }
  await page.locator('[data-run]').click()
  await expect(page.locator('[data-run]')).toHaveText('Gjennomfør isolering', { timeout: 480_000 })
  const err = page.locator('aside [role="alert"]')
  if (await err.count()) throw new Error(`feil: ${await err.first().textContent()}`)
  const apply = page.locator('[data-effect-apply]')
  if (await apply.isVisible()) await apply.click()
}

async function pixels(page: Page, file: string): Promise<Record<Pt, number[]>> {
  await expect(page.getByRole('button', { name: 'Last ned PNG' })).toBeEnabled()
  const dl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Last ned PNG' }).click()
  await (await dl).saveAs(file)
  await page.getByRole('button', { name: 'Nei takk' }).click({ timeout: 3000 }).catch(() => {})
  const b64 = fs.readFileSync(file).toString('base64')
  return page.evaluate(async ({ data, pts }) => {
    const bmp = await createImageBitmap(await (await fetch(`data:image/png;base64,${data}`)).blob())
    const c = new OffscreenCanvas(bmp.width, bmp.height)
    const g = c.getContext('2d') as OffscreenCanvasRenderingContext2D
    g.drawImage(bmp, 0, 0)
    return Object.fromEntries(Object.entries(pts).map(([k, [x, y]]) => [k, [...g.getImageData(x, y, 1, 1).data]])) as Record<string, number[]>
  }, { data: b64, pts: P }) as Promise<Record<Pt, number[]>>
}

/** Personens farge i originalen (ansiktet skal ikke fylles eller farges). */
const ORIG_PERSON = [0, 0, 0]
const same = (a: number[], b: number[]) => b.every((v, i) => Math.abs((a[i] ?? -1) - v) <= 12)
const yellow = (p: number[]) => (p[0] ?? 0) > 200 && (p[1] ?? 0) > 160 && (p[2] ?? 255) < 90 && (p[3] ?? 0) > 128
const log = (name: string, r: Record<Pt, number[]>) => console.log(`[${name}] ${Object.entries(r).map(([k, v]) => `${k}=${v.join(',')}`).join('  ')}`)

test('1/2: behold person og bakgrunn, fjern logo/tekst (merket) med Fyll med omgivelser', async ({ page }, info) => {
  await open(page)
  await choose(page, ['person', 'background'], ['logo', 'text'], true)
  const r = await pixels(page, info.outputPath('1.png'))
  log('behold person+bakgrunn, fjern logo', r)
  expect(r.person[3], 'personen beholdes').toBeGreaterThan(200)
  expect(same(r.person, ORIG_PERSON), `personen er uendret (${ORIG_PERSON.join(',')})`).toBe(true)
  expect(r.bg[3], 'bakgrunnen beholdes (ikke gjennomsiktig)').toBeGreaterThan(200)
  expect(r.logo[3], 'logoområdet er fylt, ikke gjennomsiktig').toBeGreaterThan(200)
  expect(yellow(r.logo), 'logoen er borte').toBe(false)
  expect(yellow(r.logoEdge), 'logokanten er borte').toBe(false)
})

test('3: behold person, fjern logo og tekst: bakgrunnen og logoen blir gjennomsiktige', async ({ page }, info) => {
  await open(page)
  await choose(page, ['person'], ['logo', 'text'], true)
  const r = await pixels(page, info.outputPath('3.png'))
  log('behold person, fjern logo+tekst', r)
  expect(r.person[3]).toBeGreaterThan(200)
  expect(same(r.person, ORIG_PERSON), 'personen er uendret').toBe(true)
  expect(r.bg[3]).toBeLessThan(40)
  expect(r.logo[3]).toBeLessThan(40)
})

test('4: behold objekt, fjern person og bakgrunn', async ({ page }, info) => {
  await open(page)
  await choose(page, ['object'], ['person', 'background'], false)
  const r = await pixels(page, info.outputPath('4.png'))
  log('behold objekt, fjern person+bakgrunn', r)
  expect(r.person[3], 'personen er fjernet').toBeLessThan(40)
  expect(r.bg[3], 'bakgrunnen er fjernet').toBeLessThan(40)
})

test('5: fjern bakgrunn og logo samtidig (Gjennomsiktig), behold resten', async ({ page }, info) => {
  await open(page)
  await choose(page, [], ['background'], true, 'Gjennomsiktig')
  const r = await pixels(page, info.outputPath('5.png'))
  log('fjern bakgrunn+logo', r)
  expect(r.person[3]).toBeGreaterThan(200)
  expect(same(r.person, ORIG_PERSON)).toBe(true)
  expect(r.bg[3]).toBeLessThan(40)
  expect(r.logo[3]).toBeLessThan(40)
})

test('fjern logo i et foto uten å merke den: ingenting feil fjernes, brukeren bes merke logoen', async ({ page }) => {
  await open(page)
  await page.locator('[data-tab="remove"]').click()
  await page.locator('[data-target="logo"]').click()
  await page.locator('[data-run]').click()
  await expect(page.locator('aside [role="alert"]')).toContainText('Dra en firkant rundt dem', { timeout: 120_000 })
  await expect(page.getByRole('button', { name: 'Last ned PNG' })).toBeDisabled()
})

test('bred undertekst fjernes med Fyll med omgivelser uten at området blir uskarpt (ekte LaMa)', async ({ page }, info) => {
  await page.goto('/app/')
  const TXT = { x0: 220, y0: 770, x1: 1220, y1: 930 }
  const [withText, sharpOrig] = await page.evaluate(async ({ data, box }) => {
    const bmp = await createImageBitmap(await (await fetch(`data:image/jpeg;base64,${data}`)).blob())
    const c = Object.assign(document.createElement('canvas'), { width: bmp.width, height: bmp.height })
    const g = c.getContext('2d') as CanvasRenderingContext2D
    g.drawImage(bmp, 0, 0)
    const lap = (d: ImageData) => { let s = 0, n = 0; for (let y = 1; y < d.height - 1; y++) for (let x = 1; x < d.width - 1; x++) { const i = (y * d.width + x) * 4; s += Math.abs(4 * (d.data[i] as number) - (d.data[i - 4] as number) - (d.data[i + 4] as number) - (d.data[i - d.width * 4] as number) - (d.data[i + d.width * 4] as number)); n++ } return s / n }
    const orig = lap(g.getImageData(box.x0, box.y0, box.x1 - box.x0, box.y1 - box.y0))
    g.fillStyle = '#fff'
    g.font = 'bold 60px sans-serif'
    g.textAlign = 'center'
    g.fillText('Menigheten', 720, 830)
    g.fillText('Verdens lys og jordens salt', 720, 905)
    return [c.toDataURL('image/png').split(',')[1] as string, orig] as const
  }, { data: PHOTO.toString('base64'), box: TXT })
  await page.goto('/app/isolate-subject')
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: /Slipp et bilde her/ }).click()
  await (await chooser).setFiles({ name: 'undertekst.png', mimeType: 'image/png', buffer: Buffer.from(withText, 'base64') })
  await page.getByRole('button', { name: 'Hopp over' }).click()
  await page.locator('[data-tab="remove"]').click()
  await page.locator('[data-target="text"]').click()
  await page.getByRole('button', { name: /^Merk i bildet/ }).click()
  const b = (await page.locator('main canvas').first().boundingBox())!
  await page.mouse.move(b.x + (b.width * TXT.x0) / 1440, b.y + (b.height * TXT.y0) / 1800)
  await page.mouse.down()
  await page.mouse.move(b.x + (b.width * 720) / 1440, b.y + (b.height * 850) / 1800, { steps: 5 })
  await page.mouse.move(b.x + (b.width * TXT.x1) / 1440, b.y + (b.height * TXT.y1) / 1800, { steps: 5 })
  await page.mouse.up()
  await page.locator('[data-run]').click()
  await expect(page.locator('[data-effect="fill"]')).toBeVisible({ timeout: 480_000 })
  await page.locator('[data-effect-apply]').click()
  const dl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Last ned PNG' }).click()
  const file = info.outputPath('undertekst.png')
  await (await dl).saveAs(file)
  const r = await page.evaluate(async ({ data, box }) => {
    const bmp = await createImageBitmap(await (await fetch(`data:image/png;base64,${data}`)).blob())
    const c = new OffscreenCanvas(bmp.width, bmp.height)
    const g = c.getContext('2d') as OffscreenCanvasRenderingContext2D
    g.drawImage(bmp, 0, 0)
    const d = g.getImageData(box.x0, box.y0, box.x1 - box.x0, box.y1 - box.y0)
    let s = 0, n = 0, white = 0
    for (let y = 1; y < d.height - 1; y++) for (let x = 1; x < d.width - 1; x++) { const i = (y * d.width + x) * 4; s += Math.abs(4 * (d.data[i] as number) - (d.data[i - 4] as number) - (d.data[i + 4] as number) - (d.data[i - d.width * 4] as number) - (d.data[i + d.width * 4] as number)); n++; if ((d.data[i] as number) > 235 && (d.data[i + 1] as number) > 235 && (d.data[i + 2] as number) > 235) white++ }
    return { sharp: s / n, white: white / n }
  }, { data: fs.readFileSync(file).toString('base64'), box: TXT })
  console.log(`[undertekst] skarphet original=${sharpOrig.toFixed(2)} resultat=${r.sharp.toFixed(2)} hvitt=${(r.white * 100).toFixed(2)} %`)
  expect(r.white, 'teksten er borte').toBeLessThan(0.01)
  expect(r.sharp, 'skarpt (før: 0,39 av originalen, nedskalert og uskarpt)').toBeGreaterThan(sharpOrig * 0.5)
})
