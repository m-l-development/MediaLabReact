import { expect, test, type Page } from '@playwright/test'

/**
 * Motion Studio på alle skjermstørrelser (320–1920 px): startside, format- og malvalg (malbiblioteket) og editoren med
 * en mal. Måler det som faktisk går galt på en skjerm: vannrett rulling, synlige knapper utenfor skjermen, synlige
 * knapper som dekker hverandre, og for små trykkflater på berøringsskjerm. Rapporten skrives ut og kontrolleres.
 */
const SIZES: [number, number, string][] = [[320, 640, 'mobil-s'], [375, 740, 'mobil'], [390, 844, 'mobil'], [430, 932, 'mobil-l'], [600, 900, 'mobil-xl'], [768, 1024, 'nettbrett'], [1024, 768, 'pc-s'], [1280, 800, 'pc'], [1536, 864, 'pc-l'], [1920, 1080, 'pc-xl']]

interface Issue { kind: string; what: string }

async function audit(page: Page, touch: boolean): Promise<Issue[]> {
  return page.evaluate((touch) => {
    const out: { kind: string; what: string }[] = []
    const vw = document.documentElement.clientWidth
    if (document.documentElement.scrollWidth > vw + 1) out.push({ kind: 'vannrett-rulling', what: `${document.documentElement.scrollWidth} > ${vw}` })
    const name = (el: Element) => (el.getAttribute('aria-label') || el.textContent || el.getAttribute('title') || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 40)
    const vis = (el: Element) => {
      const r = el.getBoundingClientRect()
      const st = getComputedStyle(el)
      return r.width > 0 && r.height > 0 && st.visibility !== 'hidden' && st.display !== 'none' && Number(st.opacity) > 0.05
    }
    // bare kontroller som ikke ligger i et område som skal rulle vannrett (tidslinje, fanerader)
    const inScroller = (el: Element) => {
      for (let p = el.parentElement; p; p = p.parentElement) {
        const st = getComputedStyle(p)
        if ((st.overflowX === 'auto' || st.overflowX === 'scroll') && p.scrollWidth > p.clientWidth + 1) return true
      }
      return false
    }
    const ctrls = [...document.querySelectorAll('button, a[href], input:not([type="hidden"]), select, textarea, [role="slider"], [role="switch"]')].filter((el) => vis(el) && !inScroller(el))
    for (const el of ctrls) {
      const r = el.getBoundingClientRect()
      if (r.right > vw + 1 || r.left < -1) out.push({ kind: 'utenfor-skjermen', what: name(el) })
      if (touch && (el.tagName === 'BUTTON' || el.tagName === 'A' || el.tagName === 'SELECT') && (r.height < 32 || r.width < 32) && r.width * r.height > 0) {
        // små ikonknapper teller; tekstlenker inne i avsnitt teller ikke
        if (!el.closest('p')) out.push({ kind: 'liten-trykkflate', what: `${name(el)} ${Math.round(r.width)}×${Math.round(r.height)}` })
      }
    }
    // overlapp: en synlig kontroll dekket av en annen (det som ligger øverst i midten av den er ikke den selv)
    for (const el of ctrls) {
      const r = el.getBoundingClientRect()
      if (r.right > vw || r.bottom > innerHeight || r.top < 0) continue
      // klippet bort av et panel som ruller loddrett (ligger utenfor panelets synlige del): ikke dekket, bare rullet vekk
      const cy = r.top + r.height / 2
      let clipped = false
      for (let p = el.parentElement; p; p = p.parentElement) {
        const st = getComputedStyle(p)
        if (st.overflowY !== 'visible') { const q = p.getBoundingClientRect(); if (cy < q.top || cy > q.bottom) { clipped = true; break } }
      }
      if (clipped) continue
      const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
      if (top && top !== el && !el.contains(top) && !top.contains(el) && top.closest('button, a, input, select, textarea') && top.closest('button, a, input, select, textarea') !== el) out.push({ kind: 'dekket', what: `${name(el)} ← ${name(top)}` })
    }
    return out
  }, touch)
}

const report: Record<string, Record<string, Issue[]>> = {}

for (const [w, h, label] of SIZES) {
  test(`Motion ${w}×${h} (${label})`, async ({ browser }, info) => {
    test.skip(info.project.name === 'mobil', 'egne størrelser i testen')
    const touch = w < 1024
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch && w < 768, deviceScaleFactor: 1 })
    const page = await ctx.newPage()
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    const r: Record<string, Issue[]> = {}
    await page.goto('/app/motion-design')
    await expect(page.locator('[data-md-new]')).toBeVisible()
    r.start = await audit(page, touch)
    await page.locator('[data-md-new]').click()
    await page.locator('[data-format="story"]').click()
    await expect(page.locator('[data-tpl-lib]')).toBeVisible()
    r.maler = await audit(page, touch)
    await page.locator('[data-tpl="credits"]').click()
    await expect(page.locator('[data-md-canvas]')).toBeVisible()
    await page.waitForTimeout(600)
    r.editor = await audit(page, touch)
    // innlogget har topplinjen inntil fire runde knapper (tilbakemelding, konto, snarveier, tema): tilbakeknappene skal ikke dekke dem
    await page.evaluate(() => { const d = document.querySelector('[class*="_dock_"]'); const b = d?.lastElementChild; for (let i = 0; i < 3 && b; i++) d!.prepend(b.cloneNode(true)) })
    await page.waitForTimeout(100)
    r.editor4 = (await audit(page, touch)).filter((x) => x.kind !== 'liten-trykkflate')
    report[`${w}x${h}`] = r
    console.log(`RAPPORT ${w}x${h} ${JSON.stringify(r)}`)
    expect(errors).toEqual([])
    // ingen vannrett rulling, ingen knapper utenfor skjermen og ingen dekkede knapper på noen størrelse
    for (const [k, v] of Object.entries(r)) expect(v.filter((x) => x.kind !== 'liten-trykkflate'), k).toEqual([])
    await ctx.close()
  })
}
