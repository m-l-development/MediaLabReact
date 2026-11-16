import { expect, test, type Page } from '@playwright/test'

/**
 * Motion på mobil (meldt fra iPhone):
 * 1) Prosjektkortet var et stort svart felt: miniatyren ble tatt ved spillehodet (ofte et svart bilde – mange maler
 *    starter på svart, og på iPhone er videoene ikke dekodet før de spilles), og prosjekter uten miniatyr fikk svart
 *    bakgrunn. Nå: et bilde med innhold velges, og kortet viser en reserve når miniatyren mangler eller er mørk
 *    (også for eldre prosjekter).
 * 2) Fullskjerm gjorde ingenting på iPhone: Safari på iPhone har ikke Fullscreen API for andre elementer enn video
 *    (requestFullscreen finnes ikke). Nå: «Fyll skjermen» – forhåndsvisningen over hele skjermflaten (100dvh, safe
 *    areas) med avspillingslinjen og «Lukk visningen». Testen fjerner API-et slik iPhone Safari faktisk mangler det.
 * Kjøres på PC, mobil (Chrome-emulering) og iPhone (WebKit, playwright.iphone.config.ts) – emulering, ikke ekte enhet.
 */
test.use(process.env.ML_WEBKIT ? {} : { channel: 'chrome' })

async function newProject(page: Page, tpl: string, fmt = 'wide') {
  await page.goto('/app/motion-design')
  await page.locator('[data-md-new]').click()
  await page.locator(`[data-format="${fmt}"]`).click()
  await page.locator(`[data-tpl-lib] [data-tpl="${tpl}"], [data-tpl="${tpl}"]`).first().click()
  await expect(page.locator('[data-md-canvas]')).toBeVisible()
}
async function saveAndHome(page: Page) {
  await page.getByRole('button', { name: 'Lagre', exact: true }).click()
  await expect(page.getByText('Prosjektet er lagret.')).toBeVisible()
  await page.goto('/app/motion-design')
  await expect(page.locator('[data-project]').first()).toBeVisible({ timeout: 20_000 })
}
/** Snitt-lyshet og spredning i kortets bilde (bakgrunnsbildet tegnes på et lite lerret). */
const cardLook = (page: Page) => page.locator('[data-project] [data-thumb]').first().evaluate(async (el: HTMLElement) => {
  const m = /url\("?(.+?)"?\)$/.exec(getComputedStyle(el).backgroundImage)
  if (!m) return { kind: el.dataset.thumb, mean: -1, sd: -1 }
  const im = new Image()
  im.src = m[1]!
  await im.decode()
  const c = document.createElement('canvas')
  c.width = 24
  c.height = 24
  const g = c.getContext('2d')!
  g.drawImage(im, 0, 0, 24, 24)
  const d = g.getImageData(0, 0, 24, 24).data
  let s = 0, s2 = 0
  for (let i = 0; i < d.length; i += 4) { const l = (d[i]! + d[i + 1]! + d[i + 2]!) / 3; s += l; s2 += l * l }
  const n = d.length / 4, mean = s / n
  return { kind: el.dataset.thumb, mean, sd: Math.sqrt(Math.max(0, s2 / n - mean * mean)) }
})

test('prosjektkortet: en mal som starter på svart får en miniatyr med innhold (ikke et svart felt)', async ({ page }) => {
  test.setTimeout(120_000)
  // «THE END» starter med svart (bokstaver i video), spillehodet står på 0 når det lagres
  await newProject(page, 'theend')
  await saveAndHome(page)
  await expect(page.locator('[data-project] [data-thumb]').first()).toHaveAttribute('data-thumb', 'image', { timeout: 15_000 })
  const L = await cardLook(page)
  expect(L.mean > 28 || L.sd > 10, `kortet har innhold (${JSON.stringify(L)})`).toBe(true)
})

test('prosjektkortet: tomt prosjekt og eldre prosjekt med svart miniatyr viser en reserve, ikke et svart felt', async ({ page }) => {
  test.setTimeout(120_000)
  await newProject(page, 'blank')
  await saveAndHome(page)
  const card = page.locator('[data-project] [data-thumb]').first()
  await expect(card, 'tomt prosjekt: reserve').toHaveAttribute('data-thumb', 'fallback', { timeout: 15_000 })
  await expect(card).toContainText('16:9')
  // eldre prosjekt: en helt svart miniatyr lagret av forrige versjon (skrives rett i lagringen)
  const black = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = 64; c.height = 36; const g = c.getContext('2d')!; g.fillStyle = '#000'; g.fillRect(0, 0, 64, 36); return c.toDataURL('image/jpeg', 0.7) })
  const n = await page.evaluate(async (thumb) => {
    let changed = 0
    const walk = (o: unknown): boolean => {
      if (!o || typeof o !== 'object') return false
      const r = o as Record<string, unknown>
      if (typeof r.fmt === 'string' && 'thumb' in r) { r.thumb = thumb; return true }
      return Object.values(r).some(walk)
    }
    for (const info of await indexedDB.databases()) {
      if (!info.name) continue
      const db = await new Promise<IDBDatabase>((ok, no) => { const q = indexedDB.open(info.name!); q.onsuccess = () => ok(q.result); q.onerror = () => no(q.error) })
      for (const st of Array.from(db.objectStoreNames)) {
        await new Promise<void>((ok) => {
          const tx = db.transaction(st, 'readwrite')
          const cur = tx.objectStore(st).openCursor()
          cur.onsuccess = () => { const c = cur.result; if (!c) return; const v = structuredClone(c.value); if (walk(v)) { c.update(v); changed++ } c.continue() }
          tx.oncomplete = () => ok()
          tx.onerror = () => ok()
        })
      }
      db.close()
    }
    return changed
  }, black)
  expect(n, 'fant prosjektet i lagringen').toBeGreaterThan(0)
  await page.reload()
  await expect(page.locator('[data-project] [data-thumb]').first(), 'eldre svart miniatyr: reserve').toHaveAttribute('data-thumb', 'fallback', { timeout: 15_000 })
})

test('«Fyll skjermen» der nettleseren mangler fullskjerm for elementer (som Safari på iPhone): portrett og landskap', async ({ page }, info) => {
  test.setTimeout(120_000)
  // som iPhone Safari: ingen requestFullscreen for vanlige elementer
  await page.addInitScript(() => {
    for (const k of ['requestFullscreen', 'webkitRequestFullscreen'] as const) Object.defineProperty(Element.prototype, k, { value: undefined, configurable: true })
    Object.defineProperty(Document.prototype, 'fullscreenEnabled', { get: () => false, configurable: true })
    Object.defineProperty(Document.prototype, 'webkitFullscreenEnabled', { get: () => false, configurable: true })
  })
  await newProject(page, 'theend')
  const btn = page.locator('[data-md-fullscreen]')
  await expect(btn).toHaveAttribute('aria-label', 'Fyll skjermen')
  await btn.click()
  const stage = page.locator('[data-md-immersive]')
  await expect(stage).toBeVisible()
  const cover = async () => {
    const vp = page.viewportSize()!
    const b = (await stage.boundingBox())!
    // dekker skjermflaten, og ingenting fra appen ligger over (punktene treffer forhåndsvisningen)
    const top = await page.evaluate(([x, y]) => !!document.elementFromPoint(x!, y!)?.closest('[data-md-immersive]'), [vp.width / 2, 4])
    const mid = await page.evaluate(([x, y]) => !!document.elementFromPoint(x!, y!)?.closest('[data-md-immersive]'), [vp.width / 2, vp.height / 2])
    return { w: Math.round(b.width) >= vp.width - 1, h: Math.round(b.height) >= vp.height - 1, top, mid }
  }
  expect(await cover(), 'portrett/stående').toEqual({ w: true, h: true, top: true, mid: true })
  // avspillingslinjen med «Lukk visningen» (ikke kalt fullskjerm)
  const exit = page.locator('[data-md-full-exit]')
  await expect(exit).toHaveAttribute('aria-label', 'Lukk visningen')
  // landskap: snu skjermen
  const vp = page.viewportSize()!
  await page.setViewportSize({ width: vp.height, height: vp.width })
  await page.waitForTimeout(300)
  expect(await cover(), 'landskap').toEqual({ w: true, h: true, top: true, mid: true })
  await page.setViewportSize(vp)
  // lukk: editoren med tidslinjen er tilbake
  await page.waitForTimeout(200)
  if (info.project.name === 'mobil') {
    // berøring: linjen skjules etter en stund; første trykk henter den fram (uten å starte avspillingen)
    await expect(page.locator('[data-md-fullbar][data-hidden]')).toHaveCount(1, { timeout: 8000 })
    const playing = await page.locator('[data-md-fullbar] button').first().getAttribute('aria-label')
    await page.touchscreen.tap(vp.width / 2, vp.height / 2)
    await expect(page.locator('[data-md-fullbar][data-hidden]')).toHaveCount(0)
    expect(await page.locator('[data-md-fullbar] button').first().getAttribute('aria-label'), 'trykket startet ikke avspillingen').toBe(playing)
  } else await page.mouse.move(vp.width / 2, vp.height / 2)
  await exit.click()
  await expect(stage).toHaveCount(0)
  await expect(page.locator('[data-md-canvas]')).toBeVisible()
  if (info.project.name !== 'mobil') {
    // PC: Escape lukker også
    await btn.click()
    await expect(stage).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(stage).toHaveCount(0)
  }
})
