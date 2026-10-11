import fs from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { png } from './png'

/* Flere funksjoner i Loop Studio, testet i ekte nettleser (PC). Hver test sjekker et synlig eller lagret resultat. */
test.beforeEach(() => test.skip(test.info().project.name === 'mobil', 'Testes på PC'))

async function errorsOf(page: Page) {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  return errors
}
const cards = (page: Page) => page.locator('[data-loop-card]')
const program = (page: Page) => page.getByPlaceholder('Tirsdag 25. aug kl 19:00 Kveldsmat i kafeen')

async function openTpl(page: Page, name: RegExp) {
  await page.goto('/app/loop-studio')
  await page.getByRole('link', { name }).click()
  await expect(page.locator('[data-loop-canvas]')).toBeVisible()
}
async function week(page: Page, text: string) {
  await openTpl(page, /Ukeprogram/)
  await program(page).fill(text)
  await page.getByRole('button', { name: 'Oppdater videoen' }).click()
}
/** Fargen i ett punkt av forhåndsvisningen (andeler av bredde og høyde). */
const pixel = (page: Page, fx: number, fy: number) =>
  page.locator('[data-loop-canvas]').evaluate((c: HTMLCanvasElement, [x, y]) => Array.from(c.getContext('2d')?.getImageData(Math.round(c.width * x), Math.round(c.height * y), 1, 1).data ?? []), [fx, fy] as const)

/** Kort WebM med lyd, laget i nettleseren. → base64 */
async function webm(page: Page, secs: number): Promise<Buffer> {
  const b64 = await page.evaluate(async (s) => {
    const c = document.createElement('canvas')
    c.width = 320
    c.height = 180
    const g = c.getContext('2d')
    const ac = new AudioContext(), osc = ac.createOscillator(), dst = ac.createMediaStreamDestination()
    osc.connect(dst)
    osc.start()
    const stream = c.captureStream(30)
    for (const t of dst.stream.getAudioTracks()) stream.addTrack(t)
    const rec = new MediaRecorder(stream, { mimeType: 'video/webm' })
    const chunks: Blob[] = []
    rec.ondataavailable = (e) => chunks.push(e.data)
    const done = new Promise((r) => (rec.onstop = r))
    rec.start(100)
    const t0 = performance.now()
    await new Promise<void>((r) => {
      const draw = () => {
        const t = (performance.now() - t0) / 1000
        if (g) { g.fillStyle = `hsl(${(t * 120) % 360}, 80%, 50%)`; g.fillRect(0, 0, 320, 180) }
        if (t < s) requestAnimationFrame(draw)
        else r()
      }
      draw()
    })
    rec.stop()
    await done
    osc.stop()
    void ac.close()
    const buf = new Uint8Array(await new Blob(chunks).arrayBuffer())
    let bin = ''
    for (const x of buf) bin += String.fromCharCode(x)
    return btoa(bin)
  }, secs)
  return Buffer.from(b64, 'base64')
}

test('Disk: favoritt og sletting; malkort flyttes, fjernes og tilbakestilles', async ({ page }) => {
  const errors = await errorsOf(page)
  page.on('dialog', (d) => void d.accept())
  await week(page, 'Tirsdag kl 19 Kveldsmat')
  await page.getByRole('button', { name: /Lagre på Disk/ }).click()
  await page.getByPlaceholder('F.eks. Påskemøte 2026').fill('Favoritten')
  await page.getByRole('button', { name: 'Lagre', exact: true }).click()
  await expect(page.getByText('Lagret som «Favoritten»')).toBeVisible()
  await page.getByRole('link', { name: 'Tilbake til malene' }).first().click()
  await page.getByRole('button', { name: /Disk/ }).click()
  const fav = page.getByRole('button', { name: 'Favoritt – slettes aldri automatisk' })
  await fav.click()
  await expect(page.getByRole('button', { name: 'Fjern fra favoritter' })).toHaveAttribute('aria-pressed', 'true')
  await page.reload()
  await page.getByRole('button', { name: /Disk/ }).click()
  await expect(page.getByRole('button', { name: 'Fjern fra favoritter' })).toBeVisible()
  await page.getByRole('button', { name: 'Slett fra Disk' }).click()
  await expect(page.getByRole('button', { name: /Disk/ })).toContainText('0/10')

  const titles = () => page.locator('main a[href*="id="]').evaluateAll((as) => as.map((a) => a.textContent ?? ''))
  await page.getByRole('button', { name: 'Rediger maler' }).click()
  await page.getByRole('button', { name: 'Flytt til høyre' }).first().click()
  await page.getByRole('button', { name: 'Fjern mal' }).last().click()
  await page.getByRole('button', { name: 'Ferdig' }).click()
  const t1 = await titles()
  expect(t1).toHaveLength(3)
  expect(t1[0]).toMatch(/Søndagsmøte/)
  expect(t1[1]).toMatch(/Ukeprogram/)
  await page.getByRole('button', { name: 'Rediger maler' }).click()
  await page.getByRole('button', { name: 'Tilbakestill' }).click()
  await page.getByRole('button', { name: 'Ferdig' }).click()
  const t2 = await titles()
  expect(t2).toHaveLength(4)
  expect(t2[0]).toMatch(/Ukeprogram/)
  expect(errors).toEqual([])
})

test('møteskjema, standarduke, program fra fil og slidehandlinger', async ({ page }) => {
  const errors = await errorsOf(page)
  await openTpl(page, /Ukeprogram/)
  // «Legg til møte»
  const form = page.locator('label', { hasText: 'Ukedag' }).locator('select')
  await form.selectOption('Onsdag')
  await page.getByPlaceholder('Kveldsmat i kafeen', { exact: true }).fill('Bibelgruppe')
  await page.locator('input[type="time"]').fill('18:30')
  await page.getByRole('button', { name: '+ Legg til', exact: true }).first().click()
  await expect(program(page)).toHaveValue('Onsdag kl 18:30 Bibelgruppe')
  await expect(cards(page)).toHaveCount(1)
  await expect(cards(page).first()).toContainText('Bibelgruppe')

  // standarduken: lagre, tøm, hent
  await page.getByRole('button', { name: 'Lagre som standard uke' }).click()
  await expect(page.getByText('Teksten er lagret som ny standarduke.')).toBeVisible()
  await page.getByRole('button', { name: 'Tøm' }).click()
  await expect(program(page)).toHaveValue('')
  await page.getByRole('button', { name: /Standard uke\s*Fast oppsett/ }).click()
  await expect(program(page)).toHaveValue('Onsdag kl 18:30 Bibelgruppe')

  // fra fil (.txt)
  const ch = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: /Fra fil/ }).click()
  await (await ch).setFiles({ name: 'uke.txt', mimeType: 'text/plain', buffer: Buffer.from('Fredag kl 20:00 Konsert\nSøndag 11 Gudstjeneste') })
  await expect(cards(page)).toHaveCount(2)
  await expect(cards(page).first()).toContainText('Konsert')

  // slides: tekst, dupliser, flytt, endre tekst
  await cards(page).first().click()
  await page.getByRole('button', { name: '+ Tekst', exact: true }).click()
  await expect(cards(page)).toHaveCount(3)
  await expect(cards(page).nth(1)).toContainText('Skriv teksten her.')
  await page.getByRole('button', { name: 'Dupliser' }).click()
  await expect(cards(page)).toHaveCount(4)
  await page.getByRole('button', { name: 'Flytt →' }).click()
  await page.locator('textarea[style*="min-height: 120px"]').first().fill('Velkommen alle')
  await expect(cards(page).nth(3)).toContainText('Velkommen alle')

  // kontakt med QR: koden tegnes og lenken kan endres
  await page.getByRole('button', { name: '+ Kontakt med QR' }).click()
  await expect(cards(page)).toHaveCount(5)
  await page.getByPlaceholder('https://… eller mailto:…').fill('https://example.org/påmelding')
  await expect(page.locator('[style*="data:image/gif"]').first()).toBeVisible()
  expect(errors).toEqual([])
})

test('stilpakke, logo, vignett, overlegg og egen farge', async ({ page }) => {
  const errors = await errorsOf(page)
  await openTpl(page, /Tom mal/)
  await page.getByRole('button', { name: /Tekst\s*Etikett, tekst og undertekst/ }).click()
  await expect(cards(page)).toHaveCount(1)
  // stilpakke «Promo»: overgang, skrift og fargepaneler
  await page.getByRole('button', { name: /Promo\s*Fargepaneler/ }).click()
  await page.getByRole('button', { name: 'Stil', exact: true }).click()
  await expect(page.locator('select').filter({ has: page.locator('option[value="Oswald"]') })).toHaveValue('Oswald')

  // logo: grønn, nederst til høyre
  const ch = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Legg til logo…' }).click()
  await (await ch).setFiles({ name: 'logo.png', mimeType: 'image/png', buffer: png(120, 90, () => [30, 210, 60, 255]) })
  await page.getByRole('button', { name: 'Bruk hele bildet' }).click()
  await expect(page.getByRole('checkbox', { name: 'Vis logoen i videoen' })).toBeChecked()
  await expect.poll(async () => { const d = await pixel(page, 0.93, 0.85); return (d[1] ?? 0) - (d[0] ?? 0) }, { timeout: 10000 }).toBeGreaterThan(80)
  await page.getByRole('checkbox', { name: 'Vis logoen i videoen' }).uncheck()
  await expect.poll(async () => { const d = await pixel(page, 0.93, 0.85); return (d[1] ?? 0) - (d[0] ?? 0) }).toBeLessThan(40)

  // vignett: type «Oval»
  await page.getByRole('button', { name: 'Slides', exact: true }).click()
  await page.getByRole('button', { name: /Rediger vignett…/ }).click()
  await expect(page.getByText('Dra punktet i bildet for å flytte vignetten.')).toBeVisible()
  await page.getByRole('button', { name: 'Oval', exact: true }).click()
  await page.getByRole('button', { name: /^Ferdig/ }).first().click()
  await expect(page.getByText(/^Oval/).first()).toBeVisible()

  // overlegg: «Snø» på sliden
  await page.getByRole('button', { name: /Rediger overlegg…/ }).click()
  await page.getByRole('button', { name: 'Snø', exact: true }).click()
  await page.getByRole('button', { name: /^Ferdig/ }).first().click()
  await expect(page.getByText(/^Snø · egne innstillinger/)).toBeVisible()

  // egen aksentfarge via fargevelgeren (hex)
  await page.getByRole('button', { name: 'Stil', exact: true }).click()
  await page.locator('input[type="color"]').first().click()
  await page.getByLabel('Hex-kode').fill('#00AAFF')
  await page.getByLabel('Hex-kode').press('Enter')
  await expect(page.locator('input[type="color"]').first()).toHaveValue('#00aaff')
  expect(errors).toEqual([])
})

test('video på slide, grunnvideo og lydbibliotek (lagres bare lokalt)', async ({ page }) => {
  test.setTimeout(120000)
  const errors = await errorsOf(page)
  await week(page, 'Tirsdag kl 19 Kveldsmat')
  const clip = await webm(page, 2)
  await cards(page).first().click()
  let ch = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Legg til video…' }).click()
  await (await ch).setFiles({ name: 'klipp.webm', mimeType: 'video/webm', buffer: clip })
  await expect(page.getByText(/· sliden varer like lenge/)).toBeVisible({ timeout: 15000 })
  await expect(cards(page).first()).toContainText('VIDEO')
  await page.getByRole('button', { name: 'Av', exact: true }).first().click()
  await expect(page.getByText(/Videoen er dempet|Stille: både videolyden/)).toBeVisible()

  await page.getByRole('button', { name: 'Stil', exact: true }).click()
  ch = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Velg video…' }).click()
  await (await ch).setFiles({ name: 'bakgrunn.webm', mimeType: 'video/webm', buffer: clip })
  await expect(page.getByText('bakgrunn.webm')).toBeVisible()

  ch = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: '+ Legg til lyder' }).click()
  const tone = (hz: number) => {
    const sr = 8000, n = sr * 5, d = Buffer.alloc(n * 2)
    for (let i = 0; i < n; i++) d.writeInt16LE(Math.round(Math.sin((2 * Math.PI * hz * i) / sr) * 8000), i * 2)
    const h = Buffer.alloc(44)
    h.write('RIFF', 0); h.writeUInt32LE(36 + d.length, 4); h.write('WAVE', 8); h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22)
    h.writeUInt32LE(sr, 24); h.writeUInt32LE(sr * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(d.length, 40)
    return Buffer.concat([h, d])
  }
  await (await ch).setFiles([{ name: 'a.wav', mimeType: 'audio/wav', buffer: tone(440) }, { name: 'b.wav', mimeType: 'audio/wav', buffer: tone(660) }])
  await expect(page.getByText('0:05').first()).toBeVisible()
  await page.getByRole('button', { name: /b\.wav/ }).first().click()
  await expect(page.getByText('b.wav').first()).toBeVisible()

  // etter omlasting er video og lyd fortsatt der (i «Dine medier» på enheten)
  await page.waitForTimeout(1200)
  await page.reload()
  await page.getByRole('button', { name: 'Stil', exact: true }).click()
  await expect(page.getByText('bakgrunn.webm')).toBeVisible()
  await expect(page.getByText('b.wav').first()).toBeVisible()
  await expect(cards(page).first()).toContainText('VIDEO')
  expect(errors).toEqual([])
})

test('eksport: stående 1080p, 4K og opptak i sanntid', async ({ page }, info) => {
  test.setTimeout(300000)
  const errors = await errorsOf(page)
  await openTpl(page, /Tom mal/)
  await page.getByRole('button', { name: /Tekst\s*Etikett, tekst og undertekst/ }).click()
  await page.getByRole('button', { name: 'Slides', exact: true }).click()
  await page.locator('label', { hasText: 'Varighet' }).locator('input[type="range"]').fill('2')
  await page.getByRole('button', { name: 'Stående', exact: true }).click()
  await page.getByRole('button', { name: 'Eksport', exact: true }).click()

  let dl = page.waitForEvent('download', { timeout: 180000 })
  await page.getByRole('button', { name: '1080p', exact: true }).click()
  let d = await dl
  expect(d.suggestedFilename()).toMatch(/-staende-1080p\.mp4$/)
  let buf = fs.readFileSync(await d.path())
  expect(buf.subarray(4, 8).toString('latin1')).toBe('ftyp')
  // bildestørrelsen i filen er 1080 × 1920
  const playable = async (b: Buffer) => {
    const f = info.outputPath('v.mp4')
    fs.writeFileSync(f, b)
    const p2 = await page.context().newPage()
    await p2.goto('file:///' + f.replace(/\\/g, '/'))
    const wh = await p2.evaluate(async () => { const v = document.querySelector('video'); if (!v) return [0, 0]; if (!v.videoWidth) await new Promise((r) => v.addEventListener('loadedmetadata', r, { once: true })); return [v.videoWidth, v.videoHeight] })
    await p2.close()
    return wh
  }
  expect(await playable(buf)).toEqual([1080, 1920])

  dl = page.waitForEvent('download', { timeout: 240000 })
  await page.getByRole('button', { name: 'Lag MP4 i 4K' }).click()
  d = await dl
  buf = fs.readFileSync(await d.path())
  expect(d.suggestedFilename()).toMatch(/-4k\.mp4$/)
  expect(await playable(buf)).toEqual([2160, 3840])

  dl = page.waitForEvent('download', { timeout: 60000 })
  await page.getByRole('button', { name: 'Ta opp video' }).click()
  d = await dl
  expect(d.suggestedFilename()).toMatch(/\.(mp4|webm|mkv)$/)
  expect(fs.statSync(await d.path()).size).toBeGreaterThan(2000)
  expect(errors).toEqual([])
})

test('ukeprogram fra bilde (tekstgjenkjenning i nettleseren)', async ({ page }) => {
  test.setTimeout(180000)
  const errors = await errorsOf(page)
  await openTpl(page, /Ukeprogram/)
  const b64 = await page.evaluate(() => {
    const c = document.createElement('canvas')
    c.width = 1400
    c.height = 360
    const g = c.getContext('2d')
    if (!g) return ''
    g.fillStyle = '#fff'
    g.fillRect(0, 0, c.width, c.height)
    g.fillStyle = '#000'
    g.font = '64px Arial'
    g.fillText('Tirsdag kl 19:00 Kveldsmat', 40, 120)
    g.fillText('Torsdag kl 11:00 Bønn', 40, 240)
    return c.toDataURL('image/png').split(',')[1] ?? ''
  })
  const ch = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: /Fra bilde/ }).click()
  await (await ch).setFiles({ name: 'program.png', mimeType: 'image/png', buffer: Buffer.from(b64, 'base64') })
  await expect(page.getByText(/Se over teksten – bildegjenkjenning kan gjøre små feil/)).toBeVisible({ timeout: 150000 })
  await expect(cards(page)).toHaveCount(2)
  await expect(cards(page).first()).toContainText(/Kveldsmat/i)
  expect(errors).toEqual([])
})

test('bare én fane spiller lyd om gangen', async ({ page, context }) => {
  await page.goto('/app/loop-studio?mal=week&demo=1')
  await expect(page.locator('[data-loop-card]')).toHaveCount(7)
  await expect(page.getByText(/^Spiller slide/)).toBeVisible()
  const p2 = await context.newPage()
  await p2.goto('/app/loop-studio?mal=week&demo=1')
  await expect(p2.getByText(/^Spiller slide/)).toBeVisible()
  await expect(page.getByText(/^Pause/)).toBeVisible({ timeout: 5000 })
  await p2.close()
})

test('gammelt eksempelinnhold legges til side og kan hentes tilbake', async ({ page }) => {
  await page.goto('/app/')
  await page.evaluate(() => {
    const slides = [
      ['ev-tirsdag-kveldsmat-i-kafeen', 'tirsdag', 'Tirsdag', 'kl 19:00', 'Kveldsmat i kafeen'],
      ['ev-torsdag-bonn', 'torsdag', 'Torsdag', 'kl 11:00', 'Bønn'],
      ['ev-fredag-ungdomsmote', 'fredag', 'Fredag', 'kl 19:00', 'Ungdomsmøte'],
      ['ev-sondag-sondagsmote', 'sondag', 'Søndag', 'kl 11:00', 'Søndagsmøte'],
    ].map(([id, k, day, time, title]) => ({ id, type: 'day', dayKey: k, dayBase: k, day, date: '', time, title, place: '', bg: 'images/gammel.jpg' }))
    slides.push(
      { id: 'txt-velkommen', type: 'text', kicker: 'Velkommen', pill: 'Søndag kl 11', body: 'Vi ønsker deg hjertelig velkommen til å ta del i fellesskapet, enten du følger oss på nett eller tar turen innom. Abonner gjerne på YouTube-kanalen og følg Facebook-siden!', sub: 'Vi sender møtet direkte hver søndag kl 11' } as never,
      { id: 'kontakt-teknisk', type: 'contact', kicker: 'Teknisk team', pill: '', headline: 'Ønsker du å være en del av teknisk team?', text: 'Ta kontakt – skann koden eller send e-post til', email: 'post@kirken.no', phone: '', qrUrl: 'mailto:post@kirken.no' } as never,
      { id: 'outro', type: 'outro', title: 'Ukentlige møter', sub: 'Alle er velkommen' } as never,
    )
    localStorage.setItem('ukeloop.v2', JSON.stringify({ programText: 'Tirsdag kl 19:00 Kveldsmat i kafeen\nTorsdag kl 11:00 Bønn\nFredag kl 19:00 Ungdomsmøte\nSøndag kl 11:00 Søndagsmøte', slides, cfg: {} }))
  })
  await page.goto('/app/loop-studio?mal=week')
  await expect(page.locator('[data-ch-legacy-notice]')).toBeVisible({ timeout: 15000 })
  await expect(cards(page)).toHaveCount(0)
  await page.locator('[data-ch-legacy-restore]').click()
  await expect(cards(page)).toHaveCount(7)
  await page.reload()
  await expect(cards(page)).toHaveCount(7)
  await expect(page.locator('[data-ch-legacy-notice]')).toHaveCount(0)
})
