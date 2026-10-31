import fs from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { POINTS } from './fredag-points'

/**
 * Isolate Subject «Person» med ekte modell på et ekte scenebilde fra prosjektet (media-lab/public/images/fredag.jpeg):
 * smale detaljer som hører til personen (mikrofonen i hånden, brillestangen, fingrene, mørke klær mot mørk bakgrunn)
 * skal beholdes, bakgrunnen og gjenstander som ikke er personen (gitaren) skal fjernes. Alfa leses i den nedlastede
 * PNG-en i punktene under (bildekoordinater, 1440 × 1800).
 */
const PHOTO = fs.readFileSync(path.join(import.meta.dirname, '..', '..', 'media-lab', 'public', 'images', 'fredag.jpeg'))
const W = 1440
const H = 1800

/** Punkter modellen ikke klarer på dette bildet (målt 2026-10-31): mannen i midten og personen i mørke klær finnes ikke av
 * MODNet; ormbg finner ikke den mørke personen og gir svak nedre del av mikrofonen. */
const KNOWN: Record<'Person' | 'Objekt', string[]> = {
  Person: ['mikrofon', 'brille', 'capsen', 'fingrene på mikrofonen', 'mørk', 'ansiktet (mørkt)', 'fingrene på haken', 'rød skjorte: mikrofonhodet'],
  Objekt: ['mikrofonens nedre ende', 'mørk', 'ansiktet (mørkt)', 'fingrene på haken', 'rød skjorte', 'puten', 'armlenet'],
}

async function alphaAt(page: Page, file: string) {
  const b64 = fs.readFileSync(file).toString('base64')
  return page.evaluate(async ({ data, pts, w, h }) => {
    const bmp = await createImageBitmap(await (await fetch(`data:image/png;base64,${data}`)).blob())
    if (bmp.width !== w || bmp.height !== h) throw new Error(`feil størrelse ${bmp.width}×${bmp.height}`)
    const c = new OffscreenCanvas(w, h)
    const g = c.getContext('2d') as OffscreenCanvasRenderingContext2D
    g.drawImage(bmp, 0, 0)
    return pts.map(([, x, y]) => g.getImageData(x, y, 1, 1).data[3] ?? 0)
  }, { data: b64, pts: POINTS, w: W, h: H })
}

for (const kind of ['Person', 'Objekt'] as const)
test(`${kind}: smale detaljer beholdes, bakgrunnen fjernes (ekte modell, ekte bilde)`, async ({ page }, info) => {
  await page.goto('/app/isolate-subject')
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: /Slipp et bilde her/ }).click()
  await (await chooser).setFiles({ name: 'fredag.jpg', mimeType: 'image/jpeg', buffer: PHOTO })
  await page.getByRole('button', { name: 'Hopp over' }).click()
  // ML_RAW=1: uten etterbehandling (stram inn og myke kanter = 0), for å skille modellen fra etterbehandlingen
  if (process.env.ML_RAW === '1') {
    await page.getByRole('button', { name: '+ Mer', exact: true }).click()
    for (const l of ['Myke kanter', 'Stram inn kantene']) await page.getByLabel(l).fill('0')
  }
  await page.getByRole('button', { name: new RegExp(`^${kind}`) }).click()
  await expect(page.getByRole('button', { name: 'Last ned PNG' })).toBeEnabled({ timeout: 240_000 })
  const dl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Last ned PNG' }).click()
  const file = info.outputPath(`${kind.toLowerCase()}.png`)
  await (await dl).saveAs(file)
  const a = await alphaAt(page, file)
  const rows = POINTS.map(([n, x, y, keep], i) => `${(a[i] ?? 0) >= 128 === keep ? 'OK  ' : 'FEIL'} ${keep ? 'behold' : 'fjern '} alfa ${String(a[i]).padStart(3)}  ${n} (${x},${y})`)
  console.log(`\n[${kind}]\n${rows.join('\n')}\n`)
  await info.attach('alfa', { body: rows.join('\n'), contentType: 'text/plain' })
  // Kjente begrensninger i de automatiske modellene på dette scenebildet (rettes med verktøyene, se isolate-tools): de
  // skal ikke telle som feil, men alt annet må være riktig (det som virker i dag, skal fortsette å virke).
  const wrong = POINTS.filter(([n, , , keep], i) => (a[i] ?? 0) >= 128 !== keep && !KNOWN[kind].some((k) => n.startsWith(k))).map(([n]) => n)
  expect(wrong, 'punkter med feil resultat').toEqual([])
})
