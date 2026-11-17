import fs0 from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { leftTab, newAdvProject, saveAndReload, seekTo } from './motion-helpers'
import { canvasUrl, diffScaled, pop, settled, watchErrors } from './fontpopup-kit'

/**
 * Fontpopupen i Motion Design: teksten tegnes med <StyledText> (samme tegnemotor som de andre verktøyene), og alle
 * animasjonene virker fortsatt – også bokstav for bokstav og ord for ord (bokstavbiter av tekstbildet). Stilen lagres,
 * og bildet i den eksporterte MP4-filen er likt lerretet.
 */
test.use(process.env.ML_WEBKIT ? {} : { channel: 'chrome' })

const CV = '[data-md-canvas]'

/** Andel lyse piksler (teksten er hvit på svart). */
function ink(page: Page, url: string): Promise<number> {
  return page.evaluate(async (u) => {
    const bmp = await createImageBitmap(await (await fetch(u)).blob())
    const c = document.createElement('canvas')
    c.width = bmp.width
    c.height = bmp.height
    const g = c.getContext('2d')!
    g.drawImage(bmp, 0, 0)
    const d = g.getImageData(0, 0, c.width, c.height).data
    let n = 0
    for (let i = 0; i < d.length; i += 4) if (d[i]! + d[i + 1]! + d[i + 2]! > 300) n++
    return n / (d.length / 4)
  }, url)
}

/** Bildet i videoen ved tiden t (data-URL). */
function frameAt(page: Page, file: Buffer, t: number): Promise<string> {
  return page.evaluate(async ({ b64, t }) => {
    const bin = Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0))
    const v = document.createElement('video')
    v.muted = true
    v.src = URL.createObjectURL(new Blob([bin], { type: 'video/mp4' }))
    await new Promise((r, j) => { v.onloadeddata = r; v.onerror = () => j(new Error('video kan ikke spilles')) })
    v.currentTime = t
    await new Promise((r) => { v.onseeked = r })
    const c = document.createElement('canvas')
    c.width = v.videoWidth
    c.height = v.videoHeight
    c.getContext('2d')!.drawImage(v, 0, 0)
    return c.toDataURL('image/png')
  }, { b64: file.toString('base64'), t })
}

async function openPop(page: Page) {
  if (!(await pop(page).count())) await page.locator('[data-fontpop] .fp-trigger').first().click()
  await expect(pop(page)).toBeVisible()
}

test('fontpopupen i Motion: stil på lerretet, animasjoner bokstav for bokstav, lagring og MP4 lik lerretet', async ({ page }, info) => {
  test.skip(info.project.name === 'mobil', 'eksport testes på PC')
  test.setTimeout(600_000)
  const errors = watchErrors(page)
  await newAdvProject(page, 1600, 1000)
  await leftTab(page, 'text')
  await page.locator('[data-md-add-text]').click()
  await page.locator('[data-md-timing] [data-md-tm="dur"]').fill('4')
  await page.locator('[data-md-timing] [data-md-tm="dur"]').blur()
  const props = page.locator('[data-md-props]')
  await props.locator('textarea').first().fill('SOL OG SOMMER')
  await seekTo(page, 3)

  // popupen: statisk font, form og effekt vises på lerretet
  await openPop(page)
  const P = pop(page)
  await P.getByRole('tab', { name: 'Alle' }).click()
  await P.getByPlaceholder(/Søk/).fill('anton')
  await P.locator('.fp-row', { hasText: 'Anton' }).first().click()
  await openPop(page)
  const a0 = await settled(page, CV)
  await P.getByRole('tab', { name: 'Stil', exact: true }).click()
  await P.locator('.fp-shapes button', { hasText: /^Bue$/ }).click()
  const a1 = await settled(page, CV, a0)
  expect(await diffScaled(page, a0, a1, 480, 30), 'Bue endret ikke lerretet').toBeGreaterThan(0.0005)
  await P.getByRole('tab', { name: 'Effekter', exact: true }).click()
  await P.locator('.fp-fx:not(.fp-presets-grid) > button').filter({ has: page.locator('small', { hasText: /^Glød$/ }) }).click()
  const a2 = await settled(page, CV, a1)
  expect(await diffScaled(page, a1, a2, 480, 30), 'Glød endret ikke lerretet').toBeGreaterThan(0.0005)

  // forhåndsvisning og Esc
  await P.getByRole('tab', { name: 'Font', exact: true }).click()
  await P.getByPlaceholder(/Søk/).fill('pacifico')
  await P.locator('.fp-row', { hasText: 'Pacifico' }).first().hover()
  const hov = await settled(page, CV, a2)
  expect(await diffScaled(page, a2, hov, 480, 30)).toBeGreaterThan(0.0005)
  await page.keyboard.press('Escape')
  const back = await settled(page, CV, hov)
  expect(await diffScaled(page, a2, back, 480, 30)).toBeLessThan(0.002)

  // animasjonene bokstav for bokstav og ord for ord: delvis tekst midt i, hele teksten til slutt
  for (const an of ['letters', 'words', 'type', 'bounce', 'scatter']) {
    await props.locator('select').filter({ has: page.locator(`option[value="${an}"]`) }).first().selectOption(an)
    // tidlig i animasjonen: 4 bilder (0,13 s) inn
    await seekTo(page, 0)
    for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowRight')
    const mid = await settled(page, CV)
    await seekTo(page, 3)
    const end = await settled(page, CV)
    const im = await ink(page, mid)
    const ie = await ink(page, end)
    expect(ie, `${an}: teksten vises ikke til slutt`).toBeGreaterThan(0.002)
    expect(im, `${an}: animasjonen viser ikke delvis tekst midt i`).toBeLessThan(ie * 0.9)
    expect(await diffScaled(page, end, back, 480, 30), `${an}: sluttbildet er ikke teksten`).toBeLessThan(0.01)
  }

  // lagring og innlasting: stilen kommer tilbake
  await seekTo(page, 3)
  const before = await settled(page, CV)
  await saveAndReload(page)
  await seekTo(page, 3)
  const after = await settled(page, CV)
  fs0.writeFileSync(info.outputPath('for.png'), Buffer.from(before.split(',')[1]!, 'base64'))
  fs0.writeFileSync(info.outputPath('etter.png'), Buffer.from(after.split(',')[1]!, 'base64'))
  expect(await diffScaled(page, before, after, 480, 30, 0.12), 'teksten er ikke lik etter innlasting').toBeLessThan(0.01)

  // MP4: bildet ved 3 s er likt lerretet
  const dl = page.waitForEvent('download', { timeout: 300_000 })
  if (!(await page.getByRole('button', { name: 'Eksporter MP4' }).count())) await page.getByRole('button', { name: 'Eksporter', exact: true }).click()
  await page.getByRole('button', { name: 'Eksporter MP4' }).click()
  const d = await dl
  const fs = await import('node:fs')
  const buf = fs.readFileSync(await d.path())
  const fr = await frameAt(page, buf, 3)
  fs0.writeFileSync(info.outputPath('mp4.png'), Buffer.from(fr.split(',')[1]!, 'base64'))
  fs0.writeFileSync(info.outputPath('lerret.png'), Buffer.from((await canvasUrl(page, CV)).split(',')[1]!, 'base64'))
  expect(await diffScaled(page, fr, await canvasUrl(page, CV), 480, 60, 0.12), 'MP4-bildet er ikke likt lerretet').toBeLessThan(0.01)

  expect(errors, errors.join('\n')).toEqual([])
})
