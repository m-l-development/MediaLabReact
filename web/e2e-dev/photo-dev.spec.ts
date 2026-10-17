import fs from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'

/**
 * Diagnose: «bildet blir hvitt» i Photo Design når man er innlogget (connecthub-dev). Legger inn et bilde via «Bytt bilde»
 * i malen «Bilde med tittel» og måler om bildeplassen faktisk viser bildet. Bruker et generert testbilde, og i tillegg
 * ditt eget bilde hvis ML_DEV_IMAGE peker på en fil (bildet blir bare i Playwrights midlertidige nettleserprofil).
 * Ingenting lastes opp eller lagres i ConnectHub. Skriver ut farger, meldinger, feil og mislykkede kall – aldri innhold.
 */
const EMAIL = process.env.ML_DEV_EMAIL ?? ''
const PASSWORD = process.env.ML_DEV_PASSWORD ?? ''
const OWN = process.env.ML_DEV_IMAGE ?? ''
test.skip(!EMAIL || !PASSWORD, 'ML_DEV_EMAIL og ML_DEV_PASSWORD må være satt i terminalen')

async function signIn(page: Page) {
  await page.goto('/app/')
  await page.getByLabel('E-post').fill(EMAIL)
  await page.getByLabel('Passord', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Logg inn', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Media Lab' })).toBeVisible({ timeout: 30_000 })
}

const MIME: Record<string, string> = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif', '.heic': 'image/heic' }

test('Photo Design: bildet vises etter «Bytt bilde» (innlogget)', async ({ page }, info) => {
  test.skip(info.project.name === 'mobil', 'kjøres én gang')
  const problems: string[] = []
  page.on('pageerror', (e) => problems.push(`sidefeil: ${e.message.slice(0, 160)}`))
  page.on('console', (m) => {
    if (m.type() === 'error' && !/onnxruntime|DevTools/.test(m.text())) problems.push(`konsoll: ${m.text().slice(0, 160)}`)
  })
  page.on('response', (r) => {
    if (r.status() >= 400) problems.push(`${r.status()} ${r.url().replace(/\?.*$/, '').replace(/^https?:\/\/[^/]+/, '')}`)
  })
  await signIn(page)

  const generated = await page.evaluate(async () => {
    const c = new OffscreenCanvas(1200, 900)
    const g = c.getContext('2d') as OffscreenCanvasRenderingContext2D
    g.fillStyle = '#c0392b'
    g.fillRect(0, 0, 1200, 900)
    g.fillStyle = '#27ae60'
    g.beginPath()
    g.arc(600, 450, 300, 0, 7)
    g.fill()
    const bl = await c.convertToBlob({ type: 'image/jpeg', quality: 0.9 })
    return await new Promise<string>((r) => {
      const fr = new FileReader()
      fr.onload = () => r(String(fr.result).split(',')[1] ?? '')
      fr.readAsDataURL(bl)
    })
  })
  const files: { label: string; name: string; mimeType: string; buffer: Buffer }[] = [{ label: 'testbilde (JPEG 1200×900)', name: 'farger.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(generated, 'base64') }]
  if (OWN && fs.existsSync(OWN)) {
    const ext = path.extname(OWN).toLowerCase()
    files.push({ label: `eget bilde (${ext || 'uten endelse'}, ${Math.round(fs.statSync(OWN).size / 1024)} KB)`, name: `eget${ext}`, mimeType: MIME[ext] ?? 'application/octet-stream', buffer: fs.readFileSync(OWN) })
  }

  const rows = ['| Bilde | Bildeplassen | Melding i appen | Problemer |', '|---|---|---|---|']
  for (const f of files) {
    const before = problems.length
    await page.goto('/app/photo-design')
    await page.locator('[data-tpl="photo"]').click()
    await expect(page.locator('[data-pd-view="edit"]')).toBeVisible()
    await page.locator('[data-layer]').filter({ hasText: 'Bakgrunnsbilde' }).click()
    const chooser = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: 'Bytt bilde' }).click()
    await (await chooser).setFiles({ name: f.name, mimeType: f.mimeType, buffer: f.buffer })
    await page.waitForTimeout(3000)
    const stat = await page.locator('[data-pd-view="edit"] canvas').first().evaluate((c: HTMLCanvasElement) => {
      const g = c.getContext('2d')
      if (!g) return 'ingen tegneflate'
      const d = g.getImageData(0, 0, c.width, c.height).data
      let white = 0, dark = 0, other = 0, n = 0
      for (let i = 0; i < d.length; i += 4 * 37) {
        n++
        const [r, gg, b] = [d[i] ?? 0, d[i + 1] ?? 0, d[i + 2] ?? 0]
        if (r > 235 && gg > 235 && b > 235) white++
        else if (r < 30 && gg < 30 && b < 30) dark++
        else other++
      }
      return `hvitt ${Math.round((100 * white) / n)} %, mørkt ${Math.round((100 * dark) / n)} %, annet ${Math.round((100 * other) / n)} %`
    })
    const flash = (await page.locator('[role="status"]').allTextContents()).join(' / ').slice(0, 100) || '–'
    const found = problems.slice(before)
    rows.push(`| ${f.label} | ${stat} | ${flash} | ${found.length ? found.join('; ').slice(0, 300) : 'ingen'} |`)
    await page.locator('[data-pd-view="edit"] canvas').first().screenshot({ path: info.outputPath(`photo-${f.name}.png`) })
  }
  if (OWN && !fs.existsSync(OWN)) rows.push(`| eget bilde | fant ikke filen i ML_DEV_IMAGE | – | – |`)
  const report = rows.join('\n')
  console.log(`\n${report}\n`)
  await info.attach('photo', { body: report, contentType: 'text/markdown' })
})
