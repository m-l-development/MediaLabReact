import fs from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { png } from './png'

async function errorsOf(page: Page) {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  return errors
}

/** Andel piksler i forhåndsvisningen som ikke er svarte. */
const drawn = (page: Page, sel = '[data-loop-canvas]') =>
  page.locator(sel).evaluate((c: HTMLCanvasElement) => {
    const g = c.getContext('2d')
    if (!g || !c.width) return 0
    const d = g.getImageData(0, 0, c.width, c.height).data
    let n = 0
    for (let i = 0; i < d.length; i += 40) if ((d[i] ?? 0) + (d[i + 1] ?? 0) + (d[i + 2] ?? 0) > 60) n++
    return n / (d.length / 40)
  })

/** Lyd med et klikk hvert halve sekund (120 BPM), 16-bit mono WAV. */
function wav(seconds: number, sr = 22050): Buffer {
  const n = Math.floor(seconds * sr)
  const data = Buffer.alloc(n * 2)
  for (let i = 0; i < n; i++) {
    const t = i / sr, ph = t % 0.5
    const v = (ph < 0.03 ? Math.sin(2 * Math.PI * 80 * t) * (1 - ph / 0.03) : 0) * 0.9 + Math.sin(2 * Math.PI * 440 * t) * 0.05
    data.writeInt16LE(Math.round(v * 32767), i * 2)
  }
  const h = Buffer.alloc(44)
  h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8); h.write('fmt ', 12)
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(sr, 24); h.writeUInt32LE(sr * 2, 28)
  h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(data.length, 40)
  return Buffer.concat([h, data])
}

async function openWeek(page: Page) {
  await page.goto('/app/loop-studio')
  await page.getByRole('link', { name: /Ukeprogram/ }).click()
  await expect(page.locator('[data-loop-canvas]')).toBeVisible()
}

test('startsiden: maler, redigering av malkort og demo', async ({ page }) => {
  const errors = await errorsOf(page)
  await page.goto('/app/loop-studio')
  await expect(page.getByRole('heading', { level: 1, name: 'Loop Studio' })).toBeVisible()
  for (const n of ['Ukeprogram', 'Søndagsmøte', 'Ungdomsmøte', 'Tom mal']) await expect(page.getByRole('link', { name: new RegExp(n) })).toBeVisible()
  await expect(page.getByRole('button', { name: /Disk/ })).toContainText('0/10')

  // Rediger: ny mal og ny sidetittel, huskes etter omlasting
  await page.getByRole('button', { name: 'Rediger maler' }).click()
  await page.getByLabel('Sidetittel').fill('Våre looper')
  await page.getByRole('button', { name: /Ny mal/ }).click()
  await page.getByLabel('Navn på mal').last().fill('Påske')
  await page.getByRole('button', { name: 'Ferdig' }).click()
  await page.reload()
  await expect(page.getByRole('heading', { level: 1, name: 'Våre looper' })).toBeVisible()
  await expect(page.getByRole('link', { name: /Påske/ })).toBeVisible()

  // Demo: genererte bakgrunner, tydelig merket, lagres ikke
  await page.getByRole('link', { name: /Se demo/ }).click()
  await expect(page.locator('[data-ch-demo-banner]')).toBeVisible()
  await expect.poll(() => drawn(page), { timeout: 15000 }).toBeGreaterThan(0.3)
  await expect(page.locator('[data-loop-card]')).toHaveCount(7)
  await page.locator('[data-ch-demo-exit]').click()
  await expect(page.locator('[data-ch-demo-banner]')).toHaveCount(0)
  await expect(page.locator('[data-loop-card]')).toHaveCount(0)
  expect(errors).toEqual([])
})

test('ukeprogram fra tekst, angre, lagre på Disk og åpne igjen', async ({ page }, info) => {
  test.skip(info.project.name === 'mobil', 'Tastatursnarveier er for PC')
  test.slow()
  const errors = await errorsOf(page)
  await openWeek(page)
  await page.getByPlaceholder('Tirsdag 25. aug kl 19:00 Kveldsmat i kafeen').fill('Tirsdag kl 19:00 Kveldsmat i kafeen\nTorsdag 11 Bønn – Kapellet\nEkstra: Dugnad kl 10')
  await page.getByRole('button', { name: 'Oppdater videoen' }).click()
  await expect(page.getByText(/Fant 2 møter på 2 dager og 1 ekstra utenom uka/)).toBeVisible()
  await expect(page.locator('[data-loop-card]')).toHaveCount(3)
  await expect.poll(() => drawn(page)).toBeGreaterThan(0.01)

  // Angre og gjør om (Ctrl+Z / Ctrl+Y) – historikken starter etter oppstarten
  await page.waitForTimeout(2600)
  await page.locator('[data-loop-card="03"]').click()
  await page.getByRole('button', { name: 'Slett', exact: true }).click()
  await expect(page.locator('[data-loop-card]')).toHaveCount(2)
  await page.locator('[data-loop-canvas]').hover()
  await page.keyboard.press('Control+z')
  await expect(page.locator('[data-loop-card]')).toHaveCount(3)
  await page.keyboard.press('Control+y')
  await expect(page.locator('[data-loop-card]')).toHaveCount(2)
  // arbeidskopien lagres 0,7 s etter siste endring (som i dagens app)
  await page.waitForTimeout(1200)

  // Lagre på Disk
  await page.getByRole('button', { name: /Lagre på Disk/ }).click()
  await page.getByPlaceholder('F.eks. Påskemøte 2026').fill('Uke 41')
  await page.getByRole('button', { name: 'Lagre', exact: true }).click()
  await expect(page.getByText('Lagret som «Uke 41»')).toBeVisible()
  await expect(page).toHaveURL(/disk=d-/)

  // Tilbake: Disk viser loopen, som kan åpnes igjen
  await page.getByRole('link', { name: 'Tilbake til malene' }).first().click()
  await expect(page.getByRole('button', { name: /Disk/ })).toContainText('1/10')
  await page.getByRole('button', { name: /Disk/ }).click()
  await page.getByRole('link', { name: /Uke 41/ }).click()
  await expect(page.locator('[data-loop-card]')).toHaveCount(2)
  await expect(page.getByText('Ukeprogram-loop')).toHaveCount(0)
  await expect(page.getByText('Uke 41').first()).toBeVisible()

  // Arbeidskopien av malen ble også husket etter omlasting
  await page.goto('/app/loop-studio?mal=week')
  await expect(page.locator('[data-loop-card]')).toHaveCount(2)
  expect(errors).toEqual([])
})

test('bakgrunnsbilde, lydspor med takt, HTML-spiller og MP4 med lyd', async ({ page }, info) => {
  test.skip(info.project.name === 'mobil', 'Eksporten testes på PC')
  test.setTimeout(240000)
  const errors = await errorsOf(page)
  await openWeek(page)
  await page.getByPlaceholder('Tirsdag 25. aug kl 19:00 Kveldsmat i kafeen').fill('Tirsdag kl 19:00 Kveldsmat')
  await page.getByRole('button', { name: 'Oppdater videoen' }).click()
  await expect(page.locator('[data-loop-card]')).toHaveCount(1)

  // Bilde på sliden: beskjæringsdialogen, «Bruk hele bildet»
  await page.locator('[data-loop-card="01"]').click()
  const ch = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: /Bytt bilde/ }).first().click()
  await (await ch).setFiles({ name: 'rod.png', mimeType: 'image/png', buffer: png(320, 180, () => [220, 30, 30, 255]) })
  await page.getByRole('button', { name: 'Bruk hele bildet' }).click()
  await expect.poll(() => page.locator('[data-loop-canvas]').evaluate((c: HTMLCanvasElement) => {
    const d = c.getContext('2d')?.getImageData(Math.round(c.width * 0.75), Math.round(c.height * 0.5), 1, 1).data
    return d ? (d[0] ?? 0) - (d[2] ?? 0) : 0
  }), { timeout: 15000 }).toBeGreaterThan(40)

  // Lydspor: takten finnes, og loopen kan følge den
  await page.getByRole('button', { name: 'Stil', exact: true }).click()
  const ach = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Velg lyd…' }).click()
  await (await ach).setFiles({ name: 'takt.wav', mimeType: 'audio/wav', buffer: wav(8) })
  await expect(page.getByText('takt.wav').first()).toBeVisible()
  await page.getByRole('button', { name: 'Følg takten' }).click()
  await expect(page.getByText(/1[12]\d(,\d)? BPM/).first()).toBeVisible({ timeout: 20000 })

  // HTML-spiller: én fil som spiller av for seg selv
  await page.getByRole('button', { name: 'Eksport', exact: true }).click()
  let dl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Last ned HTML-spiller' }).click()
  const html = fs.readFileSync(await (await dl).path(), 'utf8')
  expect(html).toContain("default-src 'none'")
  expect(html).toContain('data:audio/')
  expect(html).toContain('data:image/')
  const file = info.outputPath('spiller.html')
  fs.writeFileSync(file, html)
  const player = await page.context().newPage()
  const perr: string[] = []
  player.on('pageerror', (e) => perr.push(e.message))
  await player.goto('file:///' + file.replace(/\\/g, '/'))
  await expect.poll(() => drawn(player, '#c'), { timeout: 15000 }).toBeGreaterThan(0.2)
  expect(perr).toEqual([])
  await player.close()

  // Rask MP4-eksport (1080p) med lydspor
  dl = page.waitForEvent('download', { timeout: 180000 })
  await page.getByRole('button', { name: '1080p', exact: true }).click()
  const d = await dl
  expect(d.suggestedFilename()).toMatch(/^ukentlig-program-\d{4}-\d\d-\d\d-1080p\.mp4$/)
  const buf = fs.readFileSync(await d.path())
  expect(buf.subarray(4, 8).toString('latin1')).toBe('ftyp')
  expect(buf.includes(Buffer.from('mp4a')) || buf.includes(Buffer.from('Opus'))).toBe(true)
  await expect(page.getByText(/^Ferdig på/)).toBeVisible()
  expect(errors).toEqual([])
})

test('looper fra forrige versjon hentes (kopi) med bilder, og gamle data røres ikke', async ({ page }) => {
  const errors = await errorsOf(page)
  await page.goto('/app/')
  const legacy = {
    programText: 'Tirsdag kl 19:00 Gammel kveldsmat',
    slides: [{ id: 'ev-tirsdag-gammel-kveldsmat', type: 'day', dayKey: 'tirsdag', day: 'Tirsdag', time: 'kl 19:00', title: 'Gammel kveldsmat', bg: 'img-old1', bgOpacity: 1 }],
    cfg: { accent: '#ff0000', imgRules: [{ id: 'r-1', kw: 'kveldsmat', bg: 'img-old1' }] },
    videoName: '', audioName: '',
  }
  const disk = [{ id: 'd-abcd1234', name: 'Gammel loop', base: 'week', savedAt: 1700000000000, fav: true, count: 1, data: { programText: '', slides: legacy.slides, cfg: legacy.cfg } }]
  const img = png(64, 36, () => [20, 200, 40, 255]).toString('base64')
  await page.evaluate(async ({ legacy, disk, img }) => {
    localStorage.setItem('ukeloop.v2', JSON.stringify(legacy))
    localStorage.setItem('loopstudio.disk.v1', JSON.stringify(disk))
    const bin = Uint8Array.from(atob(img), (c) => c.charCodeAt(0))
    await new Promise<void>((res, rej) => {
      const r = indexedDB.open('ukeloop', 1)
      r.onupgradeneeded = () => r.result.createObjectStore('media')
      r.onerror = () => rej(r.error)
      r.onsuccess = () => {
        const tx = r.result.transaction('media', 'readwrite')
        tx.objectStore('media').put(new Blob([bin], { type: 'image/png' }), 'img-old1')
        tx.oncomplete = () => { r.result.close(); res() }
      }
    })
  }, { legacy, disk, img })

  await page.goto('/app/loop-studio')
  await expect(page.getByText(/looper er hentet fra forrige versjon/)).toBeVisible({ timeout: 15000 })
  await expect(page.getByRole('button', { name: /Disk/ })).toContainText('1/10')
  await page.getByRole('link', { name: /Ukeprogram/ }).click()
  await expect(page.locator('[data-loop-card]')).toHaveCount(1)
  await expect(page.locator('[data-loop-card="01"]')).toContainText('Gammel kveldsmat')
  // bildet (grønt) er kopiert til «Dine medier» og vises
  await expect.poll(() => page.locator('[data-loop-canvas]').evaluate((c: HTMLCanvasElement) => {
    const d = c.getContext('2d')?.getImageData(Math.round(c.width * 0.8), Math.round(c.height * 0.5), 1, 1).data
    return d ? (d[1] ?? 0) - (d[0] ?? 0) : 0
  }), { timeout: 15000 }).toBeGreaterThan(30)

  // dagens data er uendret, og importen kjøres ikke to ganger
  expect(await page.evaluate(() => localStorage.getItem('ukeloop.v2'))).toBe(JSON.stringify(legacy))
  await page.goto('/app/loop-studio')
  await expect(page.getByRole('button', { name: /Disk/ })).toContainText('1/10')
  await expect(page.getByText(/hentet fra forrige versjon/)).toHaveCount(0)
  expect(errors).toEqual([])
})

test('mobil: forhåndsvis og rediger, og engelsk', async ({ page }) => {
  const errors = await errorsOf(page)
  await page.goto('/app/')
  await page.evaluate(() => localStorage.setItem('medialab.lang', 'en'))
  await page.goto('/app/loop-studio')
  await expect(page.getByRole('link', { name: /View demo \(not saved\)/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /Weekly programme/ })).toBeVisible()
  await page.getByRole('link', { name: /Weekly programme/ }).click()
  await expect(page.locator('[data-loop-canvas]')).toBeVisible()
  if ((page.viewportSize()?.width ?? 1000) <= 820) {
    await page.getByRole('button', { name: 'Edit', exact: true }).click()
  }
  await expect(page.getByRole('button', { name: 'Update the video' })).toBeVisible()
  expect(errors).toEqual([])
})

test('lyst tema som i dagens app, og tilbake til mørkt', async ({ page }) => {
  const errors = await errorsOf(page)
  await page.goto('/app/')
  await page.evaluate(() => localStorage.setItem('medialab.theme', 'light'))
  await page.goto('/app/loop-studio')
  const title = page.getByRole('heading', { level: 1, name: 'Loop Studio' })
  await expect(page.locator('[data-loop-view]')).toHaveAttribute('data-ml-mode', 'light')
  const lum = () => title.evaluate((h) => { const m = getComputedStyle(h).color.match(/\d+/g) ?? ['0']; return Number(m[0]) })
  await expect.poll(lum).toBeLessThan(80)
  const bg = await page.locator('[data-loop-view]').evaluate((e) => getComputedStyle(e).backgroundColor)
  expect(bg).not.toBe('rgb(0, 0, 0)')
  // demoen: forhåndsvisningen (lerretet) beholder sine farger
  await page.getByRole('link', { name: /Se demo/ }).click()
  await expect.poll(() => drawn(page), { timeout: 15000 }).toBeGreaterThan(0.3)
  await page.evaluate(() => localStorage.setItem('medialab.theme', 'dark'))
  await page.reload()
  await expect(page.locator('[data-loop-view]')).not.toHaveAttribute('data-ml-mode', 'light')
  expect(errors).toEqual([])
})
