import fs from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { IMAGES } from './image-points'

/**
 * Måling (ekte modeller, flere bilder): «Person» og «Objekt» i Isolate Subject på prosjektets egne bilder. Skriver en
 * tabell per bilde og modell og lagrer resultatet; selve kravene står i isolate-person og isolate-tools.
 */
const DIR = path.join(import.meta.dirname, '..', '..', 'media-lab', 'public', 'images')

async function run(page: Page, file: string, mime: string, kind: string, out: string) {
  await page.goto('/app/isolate-subject')
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: /Slipp et bilde her/ }).click()
  await (await chooser).setFiles({ name: file, mimeType: mime, buffer: fs.readFileSync(path.join(DIR, file)) })
  await page.getByRole('button', { name: 'Hopp over' }).click()
  await page.getByRole('button', { name: new RegExp(`^${kind}`) }).click()
  await expect(page.getByRole('button', { name: 'Last ned PNG' })).toBeEnabled({ timeout: 240_000 })
  const dl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Last ned PNG' }).click()
  await (await dl).saveAs(out)
}

for (const img of IMAGES) {
  for (const kind of ['Person', 'Objekt'] as const) {
    test(`${img.file}: ${kind}`, async ({ page }, info) => {
      test.setTimeout(400_000)
      const out = info.outputPath('resultat.png')
      await run(page, img.file, img.mime, kind, out)
      const b64 = fs.readFileSync(out).toString('base64')
      const a = await page.evaluate(async ({ data, pts }) => {
        const bmp = await createImageBitmap(await (await fetch(`data:image/png;base64,${data}`)).blob())
        const c = new OffscreenCanvas(bmp.width, bmp.height)
        const g = c.getContext('2d') as OffscreenCanvasRenderingContext2D
        g.drawImage(bmp, 0, 0)
        return pts.map(([, x, y]) => g.getImageData(x, y, 1, 1).data[3] ?? 0)
      }, { data: b64, pts: img.points })
      const ok = img.points.filter(([, , , keep], i) => (a[i] ?? 0) >= 128 === keep).length
      const rows = img.points.map(([n, x, y, keep], i) => `${(a[i] ?? 0) >= 128 === keep ? 'OK  ' : 'FEIL'} ${keep ? 'behold' : 'fjern '} ${String(a[i]).padStart(3)}  ${n} (${x},${y})`)
      console.log(`\n[${img.file} · ${kind}] ${ok}/${img.points.length} riktige\n${rows.join('\n')}\n`)
      await info.attach('alfa', { body: rows.join('\n'), contentType: 'text/plain' })
    })
  }
}
