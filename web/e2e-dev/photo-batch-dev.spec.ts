import fs from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { png } from '../e2e/png'

/**
 * Bildeserie (batchredigering) i Photo Design – den faktiske brukerreisen innlogget mot connecthub-dev: startsiden,
 * «Ny bildeserie», import av flere bilder, egne innstillinger per bilde, bytte, ZIP-eksport. Bruker genererte testbilder
 * og den syntetiske testkontoen; serien slettes til slutt. Skriver ut feil og mislykkede kall – aldri innhold.
 */
const EMAIL = process.env.ML_DEV_EMAIL ?? ''
const PASSWORD = process.env.ML_DEV_PASSWORD ?? ''
test.skip(!EMAIL || !PASSWORD, 'ML_DEV_EMAIL og ML_DEV_PASSWORD må være satt i terminalen')

async function signIn(page: Page) {
  await page.goto('/app/')
  await page.getByLabel('E-post').fill(EMAIL)
  await page.getByLabel('Passord', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Logg inn', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Media Lab' })).toBeVisible({ timeout: 30_000 })
}

function unzip(buf: Buffer): { name: string; data: Buffer }[] {
  const out: { name: string; data: Buffer }[] = []
  let o = 0
  while (o + 4 <= buf.length && buf.readUInt32LE(o) === 0x04034b50) {
    const size = buf.readUInt32LE(o + 18)
    const nl = buf.readUInt16LE(o + 26)
    const xl = buf.readUInt16LE(o + 28)
    out.push({ name: buf.subarray(o + 30, o + 30 + nl).toString('utf8'), data: buf.subarray(o + 30 + nl + xl, o + 30 + nl + xl + size) })
    o += 30 + nl + xl + size
  }
  return out
}

async function avg(page: Page, data: Buffer): Promise<number[]> {
  return page.evaluate(async (b64) => {
    const bmp = await createImageBitmap(await (await fetch(`data:image/jpeg;base64,${b64}`)).blob())
    const c = new OffscreenCanvas(bmp.width, bmp.height)
    const g = c.getContext('2d') as OffscreenCanvasRenderingContext2D
    g.drawImage(bmp, 0, 0)
    const d = g.getImageData(0, 0, bmp.width, bmp.height).data
    const s = [0, 0, 0]
    for (let i = 0; i < d.length; i += 4) for (let k = 0; k < 3; k++) s[k] = (s[k] ?? 0) + (d[i + k] ?? 0)
    return s.map((x) => Math.round(x / (d.length / 4)))
  }, data.toString('base64'))
}

test('Photo Design: bildeserie fra startsiden til ZIP (innlogget, Dev)', async ({ page }, info) => {
  test.skip(info.project.name === 'mobil', 'kjøres én gang')
  test.setTimeout(240_000)
  const problems: string[] = []
  page.on('pageerror', (e) => problems.push(`sidefeil: ${e.message.slice(0, 200)}`))
  page.on('console', (m) => { if (m.type() === 'error' && !/onnxruntime|DevTools|vercel\.live/.test(m.text())) problems.push(`konsoll: ${m.text().slice(0, 200)}`) })
  page.on('response', (r) => { if (r.status() >= 400) problems.push(`${r.status()} ${r.request().method()} ${r.url().replace(/\?.*$/, '').replace(/^https?:\/\/[^/]+/, '')}`) })
  const shot = (n: string) => page.screenshot({ path: info.outputPath(`${n}.png`), fullPage: true })
  const report = () => console.log(`\n[photo-batch-dev] versjon og problemer:\n${problems.join('\n') || '(ingen)'}`)

  try {
    await signIn(page)
    const ver = await page.evaluate(async () => (await (await fetch('/app/version.json', { cache: 'no-store' })).json()) as { v: string })
    console.log(`[photo-batch-dev] Dev-versjon: ${ver.v.slice(0, 7)}`)

    // 1. startsiden: finnes «Ny bildeserie», og ses den uten å lete?
    await page.goto('/app/photo-design')
    await expect(page.locator('[data-pd-view="home"]')).toBeVisible({ timeout: 30_000 })
    await shot('1-startside')
    const btn = page.locator('[data-pd-batch-new]')
    const n = await btn.count()
    const box = n ? await btn.boundingBox() : null
    const vh = page.viewportSize()?.height ?? 0
    console.log(`[photo-batch-dev] «Ny bildeserie»: ${n} knapp(er), y=${box ? Math.round(box.y) : '–'} (vindu ${vh} px høyt) – ${box && box.y < vh ? 'synlig uten å rulle' : 'må rulles fram / mangler'}`)
    expect(n, '«Ny bildeserie» finnes på startsiden').toBe(1)
    if (process.env.ML_DEV_STRICT_TOP !== '0') expect(box && box.y < vh, '«Ny bildeserie» ses uten å rulle').toBe(true)

    // 2. ny serie, import av fire bilder
    await btn.click()
    await expect(page.locator('[data-pd-batch-strip]')).toBeVisible()
    await shot('2-tom-serie')
    const colors: [number, number, number][] = [[70, 120, 190], [190, 120, 70], [120, 160, 90], [90, 90, 160]]
    const chooser = page.waitForEvent('filechooser')
    await page.locator('[data-pd-batch-add]').click()
    await (await chooser).setFiles(colors.map((c, i) => ({ name: `dev-test-${i + 1}.png`, mimeType: 'image/png', buffer: png(320, 200, () => [...c, 255]) })))
    await expect(page.locator('[data-pd-batch-count]')).toHaveText('4 bilder · 0 redigert · 4 uendret', { timeout: 120_000 })
    await shot('3-importert')

    // 3. bilde 1: Auto + eksponering; bilde 2: forhåndsvalg
    const props = page.locator('[data-pd-batch-props]')
    await props.locator('[data-pd-auto-std]').click()
    await props.locator('label', { hasText: 'Eksponering' }).locator('input[type="range"]').first().fill('50')
    await page.locator('[data-pd-batch-next]').click()
    await expect(page.locator('[data-pd-batch-pos]')).toHaveText('Bilde 2 av 4')
    await props.getByRole('button', { name: 'Svart-hvitt', exact: true }).click()
    await page.locator('[data-pd-batch-pos]').click()
    await page.keyboard.press('ArrowLeft')
    await expect(page.locator('[data-pd-batch-pos]')).toHaveText('Bilde 1 av 4')
    await expect(props.locator('label', { hasText: 'Eksponering' }).locator('input[type="range"]').first()).toHaveValue('50')
    await page.keyboard.press('ArrowRight')
    await expect(props.getByRole('button', { name: 'Svart-hvitt', exact: true })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('[data-pd-batch-count]')).toHaveText('4 bilder · 2 redigert · 2 uendret')
    await shot('4-redigert')

    // slett bilde 4 (valgt) – det skal ikke være med i ZIP-en
    await page.locator('[data-pd-batch-item]').nth(3).locator('input[type="checkbox"]').check()
    await expect(page.locator('[data-pd-batch-del]')).toHaveText('Slett valgte (1)')
    page.once('dialog', (d) => void d.accept())
    await page.locator('[data-pd-batch-del]').click()
    await expect(page.locator('[data-pd-batch-count]')).toHaveText('3 bilder · 2 redigert · 1 uendret')

    // 4. ZIP (JPEG)
    const dl = page.waitForEvent('download', { timeout: 120_000 })
    await page.locator('[data-pd-batch-zip]').click()
    const zip = unzip(fs.readFileSync(await (await dl).path()))
    expect(zip.map((f) => f.name)).toEqual(['dev-test-1.jpg', 'dev-test-2.jpg', 'dev-test-3.jpg'])
    const px = await Promise.all(zip.map((f) => avg(page, f.data)))
    console.log(`[photo-batch-dev] snittfarger i ZIP: ${px.map((c) => c.join('/')).join('  ')}`)
    const sum = (c: number[]) => c.reduce((a, b) => a + b, 0)
    expect(sum(px[0]!), 'bilde 1 lysere').toBeGreaterThan(sum(colors[0]!) + 30)
    expect(Math.max(...px[1]!) - Math.min(...px[1]!), 'bilde 2 svart-hvitt').toBeLessThan(6)
    expect(px[2]!.every((v, k) => Math.abs(v - colors[2]![k]!) <= 4), 'bilde 3 uendret').toBe(true)
    await shot('5-eksportert')
  } finally {
    report()
    // opprydding: serien slettes fra testkontoen
    try {
      if (await page.locator('[data-pd-view="edit"]').count()) {
        page.once('dialog', (d) => void d.dismiss())
        await page.getByRole('button', { name: /Prosjekter/ }).click()
      }
      const card = page.locator('[data-project="Bildeserie"]')
      for (let i = 0; i < 5 && (await card.count()); i++) {
        page.once('dialog', (d) => void d.accept())
        await card.first().locator('button[aria-label="Slett prosjekt"]').click()
        await page.waitForTimeout(800)
      }
    } catch {
      // opprydding er best mulig
    }
  }
})
