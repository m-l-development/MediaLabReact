import { expect, test } from '@playwright/test'
import { dock } from './dock'
import { png } from './png'

/** Verifisering av tilbakemeldingssaker som kan kontrolleres uten ConnectHub (bilder til visuell kontroll i ML_SHOT). */
const shot = async (loc: import('@playwright/test').Locator, name: string, project: string) => {
  if (process.env.ML_SHOT) await loc.screenshot({ path: `${process.env.ML_SHOT}-${name}-${project}.png` })
}

test('TB-1591A7: grunnoppsett-banneret i Loop er én lav linje som ikke dekker arbeidsflaten', async ({ page }, info) => {
  await page.goto('/app/loop-studio?mal=week&demo=1')
  await page.locator('[data-ch-demo-save]').click()
  await page.locator('[data-ch-base-name]').fill('Testoppsett')
  await page.getByRole('dialog').getByRole('button', { name: 'Lagre' }).click()
  // som brukeren: fra Loop Studio-siden, «Ny serie fra dette» på grunnoppsettet
  await page.goto('/app/loop-studio')
  await page.locator('[data-ch-loop-base="Testoppsett"] [data-ch-loop-base-open]').click()
  const banner = page.locator('[data-ch-base-banner]')
  await expect(banner).toBeVisible()
  await expect(banner).toContainText('Testoppsett')
  await expect(banner.getByRole('button', { name: 'Oppdater grunnoppsettet' })).toBeVisible()
  // varselet for lokal utvikling (finnes ikke i produksjon) skjules før bildet
  await page.evaluate(() => { for (const e of document.querySelectorAll('body *')) if (/^Lokal utvikling uten innlogging/.test((e as HTMLElement).innerText || '') && e.children.length === 0) (e.closest('[role],div') as HTMLElement).style.display = 'none' })
  await shot(page.locator('body'), 'loop-banner-top', info.project.name)
  const b = (await banner.boundingBox())!
  const vw = page.viewportSize()!.width
  // én linje: teksten er én linje høy; på mobil er knappene minst 44 px (trykkflate), ellers ≤ 30 px
  const line = await banner.locator('span').first().evaluate((e) => e.getBoundingClientRect().height)
  expect(line).toBeLessThan(20)
  expect(b.height).toBeLessThanOrEqual(info.project.name === 'mobil' ? 52 : 30)
  expect(b.width).toBeLessThanOrEqual(Math.min(vw - 20, 522))
  // dekker ingen knapper eller lenker (tilbake, Eksporter, Forhåndsvis/Rediger …)
  const hidden = await banner.evaluate((el) => {
    const r = el.getBoundingClientRect()
    return [...document.querySelectorAll('button, a[href]')].filter((x) => !el.contains(x)).filter((x) => {
      const q = x.getBoundingClientRect()
      return q.width > 0 && q.height > 0 && q.bottom > 0 && q.top < innerHeight && q.left < r.right && q.right > r.left && q.top < r.bottom && q.bottom > r.top
    }).map((x) => (x.getAttribute('aria-label') || (x as HTMLElement).innerText || x.tagName).trim().slice(0, 30))
  })
  expect(hidden).toEqual([])
  // hele forklaringen er tilgjengelig i verktøytipset
  expect(await banner.getAttribute('title')).toMatch(/Endringer her endrer ikke grunnoppsettet/)
  await shot(page.locator('body'), 'loop-banner', info.project.name)
  await banner.getByRole('button', { name: 'Lukk' }).click()
  await expect(banner).toHaveCount(0)
})

test('TB-FC418D: farge bak motivet fyller de gjennomsiktige delene av bildet, og kan tas bort', async ({ page }, info) => {
  await page.goto('/app/thumbnail-studio?cat=sunday')
  await page.getByRole('button', { name: /Ny mal/ }).click()
  await page.getByRole('dialog', { name: 'Ny mal' }).locator('[data-layout="base:main"]').click()
  await dock(page, 'edit')
  // bilde der venstre halvdel er gjennomsiktig (som et utklipp)
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Velg bilde' }).first().click()
  await (await chooser).setFiles({ name: 'utklipp.png', mimeType: 'image/png', buffer: png(200, 300, (x) => (x < 100 ? [0, 0, 0, 0] : [20, 200, 40, 255])) })
  const fill = page.locator('[data-ts-fill]').first()
  await expect(fill).toBeVisible()
  const share = async (rgb: [number, number, number]) => page.getByRole('img', { name: 'Lerret' }).or(page.locator('canvas[aria-label="Lerret"]')).first().evaluate((c: HTMLCanvasElement, col) => {
    const d = (c.getContext('2d') as CanvasRenderingContext2D).getImageData(0, 0, c.width, c.height).data
    let n = 0
    for (let i = 0; i < d.length; i += 64) if (Math.abs((d[i] ?? 0) - col[0]) < 30 && Math.abs((d[i + 1] ?? 0) - col[1]) < 30 && Math.abs((d[i + 2] ?? 0) - col[2]) < 30) n++
    return n / (d.length / 64)
  }, rgb)
  const before = await share([255, 0, 0])
  await fill.getByRole('button', { name: 'Farge' }).click()
  await fill.locator('input[type="color"]').fill('#ff0000')
  await expect.poll(() => share([255, 0, 0])).toBeGreaterThan(before + 0.005)
  expect(await share([20, 200, 40])).toBeGreaterThan(0.005) // motivet er fortsatt der, over fargen
  await shot(page.getByRole('img', { name: 'Lerret' }).or(page.locator('canvas[aria-label="Lerret"]')).first(), 'thumb-fill', info.project.name)
  await fill.getByRole('button', { name: 'Ingen' }).click()
  await expect.poll(() => share([255, 0, 0])).toBeLessThan(before + 0.002)
})

test('TB-349A3E: «Legg til» og «Overlegg» på mediekortet i Motion Design holder teksten inne i knappene', async ({ page }, info) => {
  await page.goto('/app/motion-design')
  await page.getByRole('button', { name: 'Nytt prosjekt' }).click()
  await page.locator('[data-format="wide"]').click()
  await page.locator('[data-tpl="blank"]').click()
  await expect(page.locator('[data-md-canvas]')).toBeVisible()
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: /Last opp video, bilder eller lyd/ }).first().click()
  await (await chooser).setFiles({ name: 'bilde-med-et-langt-navn.png', mimeType: 'image/png', buffer: png(320, 180, () => [200, 120, 40, 255]) })
  const tile = page.locator('[data-media="image"]').first()
  await expect(tile).toBeVisible()
  const btns = tile.locator('button', { hasText: /^(Legg til|Overlegg)$/ })
  await expect(btns).toHaveCount(2)
  const over = await btns.evaluateAll((els) => els.map((b) => {
    const r = b.getBoundingClientRect(), p = (b.closest('[data-media]') as HTMLElement).getBoundingClientRect()
    return { clip: b.scrollWidth > b.clientWidth + 1, outside: r.right > p.right + 0.5 || r.left < p.left - 0.5 }
  }))
  expect(over).toEqual([{ clip: false, outside: false }, { clip: false, outside: false }])
  await shot(tile, 'motion-tile', info.project.name)
})
