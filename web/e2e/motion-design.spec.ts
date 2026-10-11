import fs from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { png } from './png'

async function errorsOf(page: Page) {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  return errors
}

async function newProject(page: Page, fmt = 'wide', tpl = 'blank') {
  await page.goto('/app/motion-design')
  await page.getByRole('button', { name: 'Nytt prosjekt' }).click()
  await page.locator(`[data-format="${fmt}"]`).click()
  await page.locator(`[data-tpl="${tpl}"]`).click()
  await expect(page.locator('[data-md-canvas]')).toBeVisible()
}

/** Andel piksler i forhåndsvisningen som ikke er svarte (er noe tegnet?). */
const drawn = (page: Page) => page.locator('[data-md-canvas]').evaluate((c: HTMLCanvasElement) => {
  const g = c.getContext('2d')
  if (!g) return 0
  const d = g.getImageData(0, 0, c.width, c.height).data
  let n = 0
  for (let i = 0; i < d.length; i += 40) if ((d[i] ?? 0) + (d[i + 1] ?? 0) + (d[i + 2] ?? 0) > 60) n++
  return n / (d.length / 40)
})

test('startsiden, formater og maler, og nettleserens tilbake går ett steg opp', async ({ page }) => {
  const errors = await errorsOf(page)
  await page.goto('/app/motion-design')
  await expect(page.getByRole('heading', { level: 1, name: 'Motion design' })).toBeVisible()
  await page.getByRole('button', { name: 'Nytt prosjekt' }).click()
  await expect(page.locator('[data-format]')).toHaveCount(5)
  await page.getByLabel('Bredde').fill('100')
  await page.getByRole('button', { name: 'Bruk størrelsen' }).click()
  await expect(page.getByText('Bredde og høyde må være mellom 240 og 4096.').first()).toBeVisible()
  await page.locator('[data-format="story"]').click()
  await expect(page.locator('[data-tpl]')).toHaveCount(8)
  await expect(page).toHaveURL(/v=tpl&f=story/)
  await page.goBack()
  await expect(page.locator('[data-format]')).toHaveCount(5)
  await page.goBack()
  await expect(page.getByRole('heading', { level: 1, name: 'Motion design' })).toBeVisible()
  expect(errors).toEqual([])
})

test('nytt prosjekt fra mal: tekst, angre, del, markør, lagre og åpne igjen', async ({ page }, info) => {
  test.skip(info.project.name === 'mobil', 'Tastatursnarveier er for PC')
  test.slow()
  const errors = await errorsOf(page)
  await newProject(page, 'wide', 'meet')
  await expect.poll(() => drawn(page)).toBeGreaterThan(0.5)
  const texts = page.locator('[data-block="text"]')
  const clips = page.locator('[data-block="clip"]')
  await expect(texts).toHaveCount(5)
  await expect(clips).toHaveCount(2)

  // Ny tekst, angre og gjør om
  await page.getByRole('tab', { name: 'Tekst', exact: true }).click()
  await page.getByRole('button', { name: /^Tittel/ }).click()
  await expect(texts).toHaveCount(6)
  await expect(page.locator('[data-md-props] textarea')).toHaveValue('Tittel')
  await page.locator('[data-md-canvas]').click({ position: { x: 5, y: 5 } })
  await page.keyboard.press('Control+z')
  await expect(texts).toHaveCount(5)
  await page.keyboard.press('Control+Shift+z')
  await expect(texts).toHaveCount(6)

  // Del klippet ved spillehodet (S) og sett en markør (M)
  await page.locator('[data-row="video"]').click({ position: { x: 300, y: 2 } })
  await clips.first().click({ position: { x: 20, y: 20 } })
  await page.keyboard.press('s')
  await expect(clips).toHaveCount(3)
  await page.keyboard.press('m')
  await expect(page.getByText(/^Markør lagt til ved/)).toBeVisible()

  // Lagre (autolagring er av som standard) og åpne igjen etter omlasting
  await page.getByRole('button', { name: 'Lagre', exact: true }).click()
  await expect(page.getByText('Prosjektet er lagret.')).toBeVisible()
  await page.reload()
  await expect(clips).toHaveCount(3)
  await expect(texts).toHaveCount(6)
  await page.getByRole('button', { name: /Prosjekter/ }).first().click()
  await expect(page.locator('[data-project]')).toHaveCount(1)
  expect(errors).toEqual([])
})

test('bilde fra PC-en: bibliotek, klipp og overlegg; eksport til MP4', async ({ page }, info) => {
  test.skip(info.project.name === 'mobil', 'Eksport testes på PC')
  test.slow()
  const errors = await errorsOf(page)
  await newProject(page, 'sq', 'blank')
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: '+ Last opp video, bilder eller lyd' }).click()
  await (await chooser).setFiles({ name: 'rod.png', mimeType: 'image/png', buffer: png(64, 64, () => [230, 20, 20, 255]) })
  await expect(page.locator('[data-media="image"]')).toHaveCount(1)
  await page.locator('[data-media="image"]').getByRole('button', { name: 'Legg til' }).click()
  await expect(page.locator('[data-block="clip"]')).toHaveCount(1)
  await page.locator('[data-media="image"]').getByRole('button', { name: 'Overlegg' }).click()
  await expect(page.locator('[data-block="ov"]')).toHaveCount(1)

  // Klippet blir 1 sekund langt, så eksporten går raskt
  await page.locator('[data-block="clip"]').click({ position: { x: 10, y: 10 } })
  await page.getByLabel('Varighet (s)').fill('1')
  await page.locator('[data-block="ov"]').click({ position: { x: 10, y: 10 } })
  await page.getByRole('button', { name: 'Slett', exact: true }).click()
  await expect(page.locator('[data-block="ov"]')).toHaveCount(0)

  await page.getByRole('button', { name: 'Eksporter', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Eksporter video' })).toBeVisible()
  await expect(page.getByRole('button', { name: /1080p · 30 fps/ })).toContainText('1080 × 1080')
  const dl = page.waitForEvent('download', { timeout: 120000 })
  await page.getByRole('button', { name: 'Eksporter MP4' }).click()
  const d = await dl
  expect(d.suggestedFilename()).toMatch(/^Nytt-prosjekt-1080p30\.(mp4|webm)$/)
  const buf = fs.readFileSync(await d.path())
  expect(buf.length).toBeGreaterThan(1024)
  if (d.suggestedFilename().endsWith('.mp4')) expect(buf.subarray(4, 8).toString('latin1')).toBe('ftyp')
  await expect(page.getByText(/^Ferdig på/)).toBeVisible()
  expect(errors).toEqual([])
})

test('undertekster (.srt) og prosjektfil (.motion) fram og tilbake', async ({ page }, info) => {
  test.slow()
  const errors = await errorsOf(page)
  await newProject(page, 'wide', 'worship')
  await expect(page.locator('[data-block="sub"]')).toHaveCount(3)
  await page.getByRole('tab', { name: 'Undertekst' }).click()
  let dl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Last ned .srt' }).click()
  const srt = fs.readFileSync(await (await dl).path(), 'utf8')
  expect(srt).toContain('00:00:01,500 --> 00:00:05,000')
  expect(srt).toContain('Første linje av sangteksten')

  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Importer .srt' }).click()
  await (await chooser).setFiles({ name: 'tekst.srt', mimeType: 'text/plain', buffer: Buffer.from('1\n00:00:00,500 --> 00:00:02,000\nHei\n\n2\n00:00:02,500 --> 00:00:04,000\nVerden\n') })
  await expect(page.getByText('2 undertekster er importert.')).toBeVisible()
  await expect(page.locator('[data-block="sub"]')).toHaveCount(2)

  dl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Lagre prosjektfil' }).click()
  const file = info.outputPath('lovsang.motion')
  await (await dl).saveAs(file)
  const head = fs.readFileSync(file).subarray(0, 4).toString('latin1')
  expect(head).toBe('VFY1')

  await page.getByRole('button', { name: /Prosjekter/ }).first().click()
  const pick = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Åpne prosjektfil' }).click()
  await (await pick).setFiles(file)
  await expect(page.locator('[data-block="sub"]')).toHaveCount(2)
  await expect(page.locator('[data-md-canvas]')).toBeVisible()
  expect(errors).toEqual([])
})

test('overganger, kobling og høyreklikkmeny', async ({ page }, info) => {
  test.skip(info.project.name === 'mobil', 'Mus og tastatur')
  await newProject(page, 'wide', 'meet')
  const clips = page.locator('[data-block="clip"]')
  await clips.nth(1).click({ position: { x: 30, y: 20 } })
  await page.getByRole('tab', { name: 'Overganger' }).click()
  await page.locator('[data-trans="iris"]').click()
  await expect(page.getByText('Sirkel lagt til mellom klippene.')).toBeVisible()
  await clips.nth(1).click({ button: 'right', position: { x: 30, y: 20 } })
  await expect(page.getByRole('menu')).toBeVisible()
  await page.getByRole('menuitem', { name: /Fjern overgang/ }).click()
  await expect(page.getByRole('menu')).toHaveCount(0)

  // Shift-klikk to elementer og koble dem sammen
  await page.locator('[data-block="text"]').first().click({ position: { x: 10, y: 10 } })
  await page.locator('[data-block="text"]').nth(3).click({ position: { x: 10, y: 10 }, modifiers: ['Shift'] })
  await expect(page.getByText('2 valgt')).toBeVisible()
  await page.keyboard.press('Control+l')
  await expect(page.getByText('Koblet sammen. Flytt ett av dem for å flytte alle.')).toBeVisible()
})

/** Lager en kort WebM med bilde og lyd i nettleseren (MediaRecorder) og slipper den inn i editoren. */
async function dropVideo(page: Page, seconds: number) {
  await page.evaluate(async (secs) => {
    const c = document.createElement('canvas')
    c.width = 320
    c.height = 180
    const g = c.getContext('2d')
    const ac = new AudioContext()
    const osc = ac.createOscillator()
    const dst = ac.createMediaStreamDestination()
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
        if (g) {
          g.fillStyle = `hsl(${(t * 120) % 360}, 80%, 50%)`
          g.fillRect(0, 0, 320, 180)
        }
        if (t < secs) requestAnimationFrame(draw)
        else r()
      }
      draw()
    })
    rec.stop()
    await done
    osc.stop()
    void ac.close()
    const file = new File(chunks, 'klipp.webm', { type: 'video/webm' })
    const dt = new DataTransfer()
    dt.items.add(file)
    const ed = document.querySelector('[data-md-editor]')
    ed?.dispatchEvent(new DragEvent('dragover', { dataTransfer: dt, bubbles: true, cancelable: true }))
    ed?.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }))
  }, seconds)
}

test('video: dra inn, bølgeform, frys bilde og eksport med lyd', async ({ page }, info) => {
  test.skip(info.project.name === 'mobil', 'Eksport testes på PC')
  test.slow()
  const errors = await errorsOf(page)
  await newProject(page, 'wide', 'blank')
  await dropVideo(page, 2)
  const clip = page.locator('[data-block="clip"]')
  await expect(clip).toHaveCount(1)
  await expect(page.locator('[data-media="video"]')).toHaveCount(1)
  await expect(clip.locator('[class*="wave"]')).toHaveCount(1)
  await expect.poll(() => drawn(page), { timeout: 15000 }).toBeGreaterThan(0.5)

  // Frys bildet midt i klippet: klippet deles i tre (før, stillbilde, etter)
  await clip.click({ position: { x: 20, y: 20 } })
  await page.locator('[data-row="video"]').click({ position: { x: 60, y: 2 } })
  await clip.first().click({ position: { x: 10, y: 20 } })
  await page.getByRole('button', { name: 'Frys bilde' }).click()
  await expect(clip).toHaveCount(3)

  await page.getByRole('button', { name: 'Eksporter', exact: true }).click()
  const dl = page.waitForEvent('download', { timeout: 120000 })
  await page.getByRole('button', { name: 'Eksporter MP4' }).click()
  const d = await dl
  const buf = fs.readFileSync(await d.path())
  expect(buf.length).toBeGreaterThan(2048)
  await expect(page.getByText(/^Ferdig på/)).toBeVisible()
  await expect(page.getByText(/uten lyd/)).toHaveCount(0)
  expect(errors).toEqual([])
})

test('engelsk: tekstene oversettes', async ({ page }) => {
  await page.goto('/app/motion-design')
  await page.evaluate(() => localStorage.setItem('medialab.lang', 'en'))
  await page.reload()
  await expect(page.getByRole('button', { name: 'New project' })).toBeVisible()
  await page.getByRole('button', { name: 'New project' }).click()
  await expect(page.getByText('Choose format')).toBeVisible()
  await page.locator('[data-format="sq"]').click()
  await expect(page.getByText('Choose template')).toBeVisible()
  await page.locator('[data-tpl="blank"]').click()
  await expect(page.getByRole('button', { name: 'Export', exact: true })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Transitions' })).toBeVisible()
  await expect(page.getByRole('button', { name: '+ Upload video, images or audio' })).toBeVisible()
})
