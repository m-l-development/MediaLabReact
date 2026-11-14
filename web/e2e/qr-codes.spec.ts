import fs from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { dock } from './dock'

/**
 * QR-koder i Photo Design, Thumbnail Studio og Motion Design – samme løsning som i Loop Studio (shared/qr).
 * Koden lages, tilpasses og eksporteres; i eksporten leses hver modul og sammenlignes med koden generatoren lager for
 * innholdet (samme generator som Loop). En eksakt lik modulmatrise kan skannes.
 */
const URL = 'www.kirken.no/arrangement'
const FULL = 'https://' + URL

/** Forventet kode (rader) fra den felles generatoren. */
const expected = (page: Page, url: string) => page.evaluate(async (u) => {
  // modulen hentes fra utviklingsserveren (samme generator som appen)
  const path = '/app/src/shared/qr/qr.ts'
  const m = (await import(/* @vite-ignore */ path)) as { qrRows: (u: string) => Promise<string[] | null> }
  return m.qrRows(u)
}, url)

/** Leser modulene i et PNG-bilde (base64) innenfor (x, y, størrelse) og sammenligner med radene. */
const matches = (page: Page, b64: string, rows: string[], box: [number, number, number]) => page.evaluate(async ({ b64, rows, box }) => {
  const bmp = await createImageBitmap(await (await fetch('data:image/png;base64,' + b64)).blob())
  const c = new OffscreenCanvas(bmp.width, bmp.height)
  const g = c.getContext('2d') as OffscreenCanvasRenderingContext2D
  g.drawImage(bmp, 0, 0)
  const [x, y, s] = box
  const n = rows.length
  const cell = s / (n + 4)
  let bad = 0
  for (let r = 0; r < n; r++) {
    for (let k = 0; k < n; k++) {
      const d = g.getImageData(Math.floor(x + (k + 2.5) * cell), Math.floor(y + (r + 2.5) * cell), 1, 1).data
      const dark = (d[0] ?? 0) + (d[1] ?? 0) + (d[2] ?? 0) < 380
      if (dark !== (rows[r]?.[k] === '1')) bad++
    }
  }
  return { bad, n, w: bmp.width, h: bmp.height }
}, { b64, rows, box })

test('Thumbnail Studio: QR-kode – lages, tilpasses, lagres og er riktig i eksporten', async ({ page }, info) => {
  test.slow()
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  if (info.project.name !== 'mobil') await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/app/thumbnail-studio')
  await page.getByRole('button', { name: /Ungdomsmøte/ }).click()
  await page.getByRole('button', { name: /Ny mal/ }).click()
  await page.getByRole('dialog', { name: 'Ny mal' }).locator('[data-layout="blank"]').click()
  await dock(page, 'add')
  await page.getByRole('button', { name: 'QR-kode', exact: true }).first().click()
  await dock(page, 'edit')
  await expect(page.locator('[data-qr-fields]')).toBeVisible()
  // samme typer som i Loop Studio
  for (const k of ['Nettside', 'E-post', 'Telefon', 'SMS', 'Tekst']) await expect(page.locator('[data-qr-fields]').getByRole('button', { name: k, exact: true })).toBeVisible()
  await page.locator('[data-qr-val]').fill(URL)
  await expect(page.locator('[data-qr-fields]')).toContainText('Åpner nettsiden')
  await page.getByRole('button', { name: 'Lagre mal' }).click()
  await page.getByRole('dialog', { name: 'Lagre mal' }).getByRole('button', { name: 'Lagre som ny mal' }).click()
  await expect(page.getByText('Malen er lagret.')).toBeVisible()
  await page.reload()
  await expect(page.locator('[data-ts-view="edit"]')).toBeVisible()
  await page.getByRole('button', { name: 'Eksporter', exact: true }).click()
  const exp = page.getByRole('dialog', { name: 'Eksporter' })
  await expect(exp.getByText(/Filstørrelse:/)).toBeVisible({ timeout: 30_000 })
  const dl = page.waitForEvent('download')
  await exp.getByRole('button', { name: /^Last ned/ }).click()
  const file = info.outputPath('qr.png')
  await (await dl).saveAs(file)
  const rows = await expected(page, FULL)
  expect(rows?.length).toBeGreaterThan(20)
  // standardplassering: (1500, 660), 340 × 340 i 1920 × 1080
  const r = await matches(page, fs.readFileSync(file).toString('base64'), rows ?? [], [1500, 660, 340])
  expect([r.w, r.h]).toEqual([1920, 1080])
  expect(r.bad, 'moduler som avviker').toBe(0)
  expect(errors).toEqual([])
})

test('Photo Design: QR-kode – lages, tilpasses (e-post), og er riktig i eksporten', async ({ page }, info) => {
  test.skip(info.project.name === 'mobil', 'PC (samme panel på mobil; se Thumbnail-testen)')
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/app/photo-design')
  await page.locator('[data-tpl="blank"]').click()
  await page.getByRole('button', { name: 'QR-kode', exact: true }).first().click()
  await expect(page.locator('[data-qr-fields]')).toBeVisible()
  await page.locator('[data-qr-fields]').getByRole('button', { name: 'E-post', exact: true }).click()
  await page.locator('[data-qr-val]').fill('post@kirken.no')
  await expect(page.locator('[data-qr-fields]')).toContainText('Åpner en ny e-post')
  await page.getByRole('button', { name: 'Lagre', exact: true }).first().click()
  await expect(page.getByText('Ikke lagret')).toHaveCount(0)
  await page.getByRole('button', { name: 'Eksporter', exact: true }).click()
  const dl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Last ned', exact: true }).click()
  const file = info.outputPath('qr.png')
  await (await dl).saveAs(file)
  const rows = await expected(page, 'mailto:post@kirken.no')
  const b64 = fs.readFileSync(file).toString('base64')
  // standard: midt på, 28 % av den korteste siden
  const size = await page.evaluate(async (b) => {
    const bmp = await createImageBitmap(await (await fetch('data:image/png;base64,' + b)).blob())
    return [bmp.width, bmp.height]
  }, b64)
  const m = Math.round(Math.min(size[0] ?? 0, size[1] ?? 0) * 0.28)
  const r = await matches(page, b64, rows ?? [], [(size[0] ?? 0) / 2 - m / 2, (size[1] ?? 0) / 2 - m / 2, m])
  expect(r.bad, 'moduler som avviker').toBe(0)
  expect(errors).toEqual([])
})

test('Motion Design: QR-kode som overlegg – bildet i videoen har riktig kode', async ({ page }, info) => {
  test.skip(info.project.name === 'mobil', 'PC')
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/app/motion-design')
  await page.getByRole('button', { name: 'Nytt prosjekt' }).click()
  await page.locator('[data-format="wide"]').click()
  await page.locator('[data-tpl="blank"]').click()
  await expect(page.locator('[data-md-canvas]')).toBeVisible()
  await page.locator('[data-md-add-qr]').first().click()
  await expect(page.locator('[data-qr-fields]')).toBeVisible()
  await page.locator('[data-qr-fields]').getByRole('button', { name: 'Telefon', exact: true }).click()
  await page.locator('[data-qr-val]').fill('+47 900 00 000')
  const rows = await expected(page, 'tel:+4790000000')
  // det nye bildet av koden (laget når du slutter å skrive) ligger i biblioteket og brukes av overlegget
  await expect.poll(async () => {
    const src = await page.locator('[data-media="image"] img').last().getAttribute('src').catch(() => null)
    if (!src) return -1
    const b64 = await page.evaluate(async (u) => {
      const b = await (await fetch(u)).blob()
      return await new Promise<string>((res) => {
        const fr = new FileReader()
        fr.onload = () => res(String(fr.result).split(',')[1] ?? '')
        fr.readAsDataURL(b)
      })
    }, src)
    const n = (rows ?? []).length
    const cell = Math.max(4, Math.floor(1200 / (n + 4)))
    const r = await matches(page, b64, rows ?? [], [0, 0, cell * (n + 4)])
    return r.bad
  }, { timeout: 20_000 }).toBe(0)
  expect(errors).toEqual([])
})
