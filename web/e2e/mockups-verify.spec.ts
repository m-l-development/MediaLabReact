import { expect, test, type Page } from '@playwright/test'
import { png } from './png'

/**
 * «Kopier» og «Lagre i Dine medier» gir samme bilde som «Last ned»: samme størrelse, rotasjon og logoplassering.
 * Uten innlogging (lokal database i nettleseren); utklippstavlen leses bare i Chrome på desktop.
 */
const quad = () => png(320, 200, (x, y) => (y < 100 ? (x < 160 ? [230, 20, 20, 255] : [20, 40, 230, 255]) : (x < 160 ? [20, 200, 40, 255] : [240, 220, 20, 255])))
const LOGO = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#ff00ff"/></svg>'

/** Analyse av et PNG-bilde (som base64): fargefeltenes rekkefølge og logoens midtpunkt. */
const analyse = (page: Page, b64: string) => page.evaluate(async (data) => {
  const bmp = await createImageBitmap(await (await fetch(`data:image/png;base64,${data}`)).blob())
  const c = new OffscreenCanvas(bmp.width, bmp.height)
  const g = c.getContext('2d') as OffscreenCanvasRenderingContext2D
  g.drawImage(bmp, 0, 0)
  const W = bmp.width, H = bmp.height, px = g.getImageData(0, 0, W, H).data
  const acc: Record<string, number[]> = { red: [0, 0, 0], blue: [0, 0, 0], green: [0, 0, 0], yellow: [0, 0, 0], magenta: [0, 0, 0] }
  for (let y = 0; y < H; y += 3) for (let x = 0; x < W; x += 3) {
    const i = (y * W + x) * 4, r = px[i] ?? 0, gg = px[i + 1] ?? 0, b = px[i + 2] ?? 0
    const k = r > 150 && gg < 80 && b > 150 ? 'magenta' : r > 140 && gg < 90 && b < 90 ? 'red' : b > 140 && r < 90 && gg < 120 ? 'blue' : gg > 120 && r < 110 && b < 110 ? 'green' : r > 150 && gg > 140 && b < 90 ? 'yellow' : null
    if (k) { const a = acc[k]!; a[0]! += x / W; a[1]! += y / H; a[2]!++ }
  }
  const c2: Record<string, { x: number; y: number; n: number }> = {}
  for (const [k, a] of Object.entries(acc)) c2[k] = { x: a[0]! / (a[2] || 1), y: a[1]! / (a[2] || 1), n: a[2]! }
  const k = ['red', 'blue', 'green', 'yellow'].filter((n) => c2[n]!.n > 50)
  const top = [...k].sort((a, b) => c2[a]!.y - c2[b]!.y).slice(0, 2).sort((a, b) => c2[a]!.x - c2[b]!.x)
  const bot = k.filter((n) => !top.includes(n)).sort((a, b) => c2[a]!.x - c2[b]!.x)
  return { W, H, layout: [...top, ...bot].join(' '), logo: c2.magenta }
}, b64)

test('Kopier og Lagre i Dine medier: samme resultat som Last ned (design, rotasjon, logo)', async ({ page, context, browserName }, info) => {
  test.skip(info.project.name === 'mobil' || browserName !== 'chromium', 'utklippstavle i Chrome desktop')
  test.setTimeout(180_000)
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/app/mockups?mockup=tv-wall')
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 30_000 })
  const ch = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: /Last opp design|Bytt design/ }).first().click()
  await (await ch).setFiles({ name: 'design.png', mimeType: 'image/png', buffer: quad() })
  const lc = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Legg til logo' }).click()
  await (await lc).setFiles({ name: 'logo.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(LOGO) })
  await page.getByRole('button', { name: 'Roter 90° mot høyre' }).click()
  await page.waitForTimeout(600)

  // fasit: «Last ned»
  const dl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Last ned', exact: true }).last().click()
  const fileB64 = (await import('node:fs')).readFileSync(await (await dl).path()).toString('base64')
  const ref = await analyse(page, fileB64)

  // «Kopier» → les bildet tilbake fra utklippstavlen
  await page.getByRole('button', { name: 'Kopier bilde' }).click()
  await expect(page.getByText(/kopiert/i)).toBeVisible({ timeout: 20_000 })
  const clip = await page.evaluate(async () => {
    const items = await navigator.clipboard.read()
    const it = items.find((i) => i.types.includes('image/png'))
    if (!it) return null
    const b = await it.getType('image/png')
    const u = new Uint8Array(await b.arrayBuffer()); let s = ''; for (const v of u) s += String.fromCharCode(v); return btoa(s)
  })
  expect(clip).not.toBeNull()
  const cp = await analyse(page, clip as string)

  // «Lagre i Dine medier» → hent det nyeste store PNG-bildet fra appens lokale database
  await page.getByRole('button', { name: 'Lagre i Dine medier' }).click()
  await expect(page.getByText('Mockupen er lagret i Dine medier.')).toBeVisible({ timeout: 20_000 })
  const stored = await page.evaluate(async () => {
    const found: Blob[] = []
    const walk = (v: unknown, d = 0) => { if (d > 3 || !v) return; if (v instanceof Blob) { if (v.type === 'image/png' && v.size > 100_000) found.push(v); return } if (typeof v === 'object') for (const x of Object.values(v as object)) walk(x, d + 1) }
    for (const dbi of await indexedDB.databases()) {
      if (!dbi.name) continue
      const db = await new Promise<IDBDatabase>((res, rej) => { const r = indexedDB.open(dbi.name as string); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error) })
      for (const store of Array.from(db.objectStoreNames)) {
        const all = await new Promise<unknown[]>((res) => { const r = db.transaction(store).objectStore(store).getAll(); r.onsuccess = () => res(r.result); r.onerror = () => res([]) })
        all.forEach((v) => walk(v))
      }
      db.close()
    }
    const big = found.sort((a, b) => b.size - a.size)
    const b = big[0]
    if (!b) return null
    const u = new Uint8Array(await b.arrayBuffer()); let s = ''; for (const v of u) s += String.fromCharCode(v); return { b64: btoa(s), n: big.length }
  })
  expect(stored).not.toBeNull()
  const sv = await analyse(page, stored!.b64)

  console.log('\nLast ned:', JSON.stringify(ref), '\nKopier:  ', JSON.stringify(cp), '\nDine medier:', JSON.stringify(sv))
  expect(ref.layout).toBe('green red yellow blue') // 90° høyre
  expect(ref.logo!.n).toBeGreaterThan(50)
  for (const r of [cp, sv]) {
    expect([r.W, r.H]).toEqual([ref.W, ref.H])
    expect(r.layout).toBe(ref.layout)
    expect(Math.abs(r.logo!.x - ref.logo!.x)).toBeLessThan(0.005)
    expect(Math.abs(r.logo!.y - ref.logo!.y)).toBeLessThan(0.005)
  }
})
