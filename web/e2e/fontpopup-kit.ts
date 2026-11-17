import fs from 'node:fs'
import { expect, type Locator, type Page } from '@playwright/test'

/**
 * Felles for testene av fontpopupen (components/fontpicker): lerretet som bilde, sammenligning av to bilder og
 * popupens deler. Lerretet leses som PNG-data-URL; sammenligningen skjer i nettleseren.
 */
export function watchErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push('console: ' + m.text())
    if (process.env.FP_DEBUG && (m.type() === 'warning' || m.type() === 'log')) console.log('[side]', m.text())
  })
  return errors
}

/** Bildet på lerretet (data-URL). */
export function canvasUrl(page: Page, sel: string): Promise<string> {
  return page.evaluate((s) => (document.querySelector(s) as HTMLCanvasElement).toDataURL('image/png'), sel)
}

/** Andel piksler (0–1) som er ulike mellom to bilder av samme størrelse (terskel per kanal). */
export function diff(page: Page, a: string, b: string, thr = 40): Promise<number> {
  return page.evaluate(async ({ a, b, thr }) => {
    const px = async (u: string) => {
      const bmp = await createImageBitmap(await (await fetch(u)).blob())
      const c = document.createElement('canvas')
      c.width = bmp.width
      c.height = bmp.height
      const g = c.getContext('2d')!
      g.drawImage(bmp, 0, 0)
      return { w: bmp.width, h: bmp.height, d: g.getImageData(0, 0, bmp.width, bmp.height).data }
    }
    const A = await px(a)
    const B = await px(b)
    if (A.w !== B.w || A.h !== B.h) return 1
    let n = 0
    for (let i = 0; i < A.d.length; i += 4) {
      if (Math.abs(A.d[i]! - B.d[i]!) > thr || Math.abs(A.d[i + 1]! - B.d[i + 1]!) > thr || Math.abs(A.d[i + 2]! - B.d[i + 2]!) > thr) n++
    }
    return n / (A.d.length / 4)
  }, { a, b, thr })
}

/** Fil som data-URL (eksportert bilde). */
export function fileUrl(file: string, mime = 'image/png'): string {
  return `data:${mime};base64,${fs.readFileSync(file).toString('base64')}`
}

/** Andel piksler med en farge (± tol). */
export function share(page: Page, url: string, rgb: [number, number, number], tol = 50): Promise<number> {
  return page.evaluate(async ({ url, rgb, tol }) => {
    const bmp = await createImageBitmap(await (await fetch(url)).blob())
    const c = document.createElement('canvas')
    c.width = bmp.width
    c.height = bmp.height
    const g = c.getContext('2d')!
    g.drawImage(bmp, 0, 0)
    const d = g.getImageData(0, 0, bmp.width, bmp.height).data
    let n = 0
    for (let i = 0; i < d.length; i += 4) if (Math.abs(d[i]! - rgb[0]) < tol && Math.abs(d[i + 1]! - rgb[1]) < tol && Math.abs(d[i + 2]! - rgb[2]) < tol) n++
    return n / (d.length / 4)
  }, { url, rgb, tol })
}

/** Popupen (dialogen «Velg font»). */
export const pop = (page: Page): Locator => page.getByRole('dialog', { name: 'Velg font' })

/** Venter til lerretet har sluttet å endre seg (tekstbildet er ferdig) og gir bildet. */
export async function settled(page: Page, sel: string, prev?: string): Promise<string> {
  let last = await canvasUrl(page, sel)
  let same = 0
  for (let i = 0; i < 120; i++) {
    await page.waitForTimeout(150)
    const now = await canvasUrl(page, sel)
    same = now === last ? same + 1 : 0
    last = now
    // stabilt i 0,9 s (og endret, når et forrige bilde er gitt – eller etter 6 s uten endring)
    if (same >= 6 && (prev === undefined || now !== prev || i > 100)) return now
  }
  return last
}

/** Sjekker at popupen ligger helt inne i vinduet og ikke er dekket av noe annet (lerret, paneler). */
export async function expectOnTop(page: Page): Promise<void> {
  const box = await pop(page).boundingBox()
  expect(box).not.toBeNull()
  const vp = page.viewportSize()!
  expect(box!.x).toBeGreaterThanOrEqual(0)
  expect(box!.y).toBeGreaterThanOrEqual(0)
  expect(box!.x + box!.width).toBeLessThanOrEqual(vp.width + 1)
  expect(box!.y + box!.height).toBeLessThanOrEqual(vp.height + 1)
  const pts = [[0.5, 0.5], [0.1, 0.1], [0.9, 0.9], [0.1, 0.9], [0.9, 0.1]] as const
  for (const [fx, fy] of pts) {
    const inside = await page.evaluate(({ x, y }) => !!document.elementFromPoint(x, y)?.closest('.fp-pop'), { x: box!.x + box!.width * fx, y: box!.y + box!.height * fy })
    expect(inside, `punkt ${fx},${fy} i popupen er dekket`).toBe(true)
  }
}

/** Som `diff`, men begge bildene skaleres først til samme størrelse (visning og eksport har ulik oppløsning). */
export function diffScaled(page: Page, a: string, b: string, w = 480, thr = 60, crop = 0): Promise<number> {
  return page.evaluate(async ({ a, b, w, thr, crop }) => {
    const px = async (u: string) => {
      const bmp = await createImageBitmap(await (await fetch(u)).blob())
      const h = Math.round((w * bmp.height) / bmp.width)
      const c = document.createElement('canvas')
      c.width = w
      c.height = h
      const g = c.getContext('2d')!
      g.imageSmoothingQuality = 'high'
      g.drawImage(bmp, 0, 0, w, h)
      return g.getImageData(0, 0, w, h).data
    }
    const A = await px(a)
    const B = await px(b)
    if (A.length !== B.length) return 1
    const h = A.length / 4 / w
    let n = 0
    let all = 0
    for (let i = 0; i < A.length; i += 4) {
      const x = (i / 4) % w
      const y = Math.floor(i / 4 / w)
      if (x < w * crop || x > w * (1 - crop) || y < h * crop || y > h * (1 - crop)) continue
      all++
      if (Math.abs(A[i]! - B[i]!) > thr || Math.abs(A[i + 1]! - B[i + 1]!) > thr || Math.abs(A[i + 2]! - B[i + 2]!) > thr) n++
    }
    return n / Math.max(1, all)
  }, { a, b, w, thr, crop })
}
