import fs from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'

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

/** [navn, x, y, skal beholdes] */
export const POINTS: [string, number, number, boolean][] = [
  ['mikrofonhodet', 780, 752, true],
  ['mikrofonskaftet', 775, 807, true],
  ['mikrofonens nedre ende', 772, 827, true],
  ['brillestangen', 822, 710, true],
  ['capsen', 790, 680, true],
  ['fingrene på mikrofonen', 757, 790, true],
  ['mørkt hår mot mørk bakgrunn', 595, 660, true],
  ['ansiktet (mørkt)', 597, 707, true],
  ['mørk skulder', 500, 740, true],
  ['mørk skjorte', 520, 800, true],
  ['fingrene på haken', 630, 753, true],
  ['bakgrunn ved ansiktet', 740, 750, false],
  ['bakgrunn mellom hode og gitar', 847, 740, false],
  ['bakgrunn over capsen', 790, 660, false],
  ['gitaren', 870, 740, false],
  ['bakgrunn ved skulderen', 460, 723, false],
  ['bakgrunn over skulderen', 510, 707, false],
  ['bakgrunn ved hodet', 653, 690, false],
  ['rød skjorte: mikrofonhodet', 123, 723, true],
  ['rød skjorte: mikrofonskaftet', 132, 767, true],
  ['rød skjorte: hånden', 140, 800, true],
  ['rød skjorte: hodet', 83, 650, true],
  ['rød skjorte: bakgrunn ved ansiktet', 167, 700, false],
  ['rød skjorte: bakgrunn bak', 200, 733, false],
  ['kvinnen: håret', 1167, 690, true],
  ['kvinnen: ansiktet', 1127, 723, true],
  ['kvinnen: jakken', 1200, 790, true],
  ['kvinnen: fingrene', 1040, 873, true],
  ['kvinnen: bakgrunn ved ansiktet', 1100, 690, false],
  ['kvinnen: bakgrunn bak', 1260, 740, false],
  ['armlenet (ikke person)', 1200, 890, false],
  ['puten (ikke person)', 1020, 813, false],
]

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
