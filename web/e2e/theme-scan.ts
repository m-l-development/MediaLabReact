import type { Page } from '@playwright/test'

/**
 * Skanner det som vises i lys modus: tekst med for lav kontrast mot den faktiske bakgrunnen (WCAG AA 4,5:1, stor tekst 3:1)
 * og store mørke flater. Lerret, bilder og elementer med bakgrunnsbilde er unntatt. Brukes lokalt og i Dev (TB-905D74).
 */
/** Tekst med for lav kontrast og store mørke flater i det som vises nå. */
export const scan = (page: Page) => page.evaluate(() => {
  const parse = (s: string): number[] => {
    const m = /color\(srgb ([\d.e-]+) ([\d.e-]+) ([\d.e-]+)(?: \/ ([\d.e-]+))?\)/.exec(s)
    if (m) return [+m[1]! * 255, +m[2]! * 255, +m[3]! * 255, m[4] ? +m[4] : 1]
    const r = /rgba?\(([\d.]+),? ([\d.]+),? ([\d.]+)(?:,? \/? ?([\d.]+))?\)/.exec(s)
    return r ? [+r[1]!, +r[2]!, +r[3]!, r[4] ? +r[4] : 1] : [0, 0, 0, 0]
  }
  const over = (a: number[], b: number[]) => [0, 1, 2].map((i) => a[i]! * a[3]! + b[i]! * (1 - a[3]!)).concat(1)
  const lum = (c: number[]) => {
    const f = (v: number) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4 }
    return 0.2126 * f(c[0]!) + 0.7152 * f(c[1]!) + 0.0722 * f(c[2]!)
  }
  const ratio = (a: number[], b: number[]) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) }
  // et element med bakgrunnsbilde/lerret/video bak teksten kan ikke måles fra CSS: hoppes over
  const bgOf = (el: Element): number[] | null => {
    const chain: number[][] = []
    for (let e: Element | null = el; e; e = e.parentElement) {
      const cs = getComputedStyle(e)
      if (cs.backgroundImage !== 'none' && !/gradient/.test(cs.backgroundImage)) return null
      const c = parse(cs.backgroundColor)
      if (c[3]! > 0) chain.push(c)
      if (c[3]! > 0.99) break
    }
    let bg = [255, 255, 255, 1]
    for (let i = chain.length - 1; i >= 0; i--) bg = over(chain[i]!, bg)
    return bg
  }
  const vis = (el: Element) => {
    const r = el.getBoundingClientRect()
    if (r.width < 2 || r.height < 2 || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) return false
    const cs = getComputedStyle(el)
    return cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.05
  }
  const skip = (el: Element) => !!el.closest('canvas, [data-pd-wrap], [data-keep-color], svg, [aria-hidden="true"]')
  const low: string[] = []
  for (const el of document.querySelectorAll('main *')) {
    if (skip(el) || !vis(el)) continue
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && (n.textContent ?? '').trim().length > 1)
    if (!own) continue
    const cs = getComputedStyle(el)
    // nedtonet med vilje (deaktivert knapp)
    if ((el as HTMLButtonElement).disabled || el.closest('[disabled], [aria-disabled="true"]')) continue
    const bg = bgOf(el)
    if (!bg) continue
    let op = 1
    for (let e: Element | null = el; e; e = e.parentElement) op *= +getComputedStyle(e).opacity
    const fg = over([...parse(cs.color).slice(0, 3), parse(cs.color)[3]! * op], bg)
    const r = ratio(fg, bg)
    const big = parseFloat(cs.fontSize) >= 24 || (parseFloat(cs.fontSize) >= 18.6 && +cs.fontWeight >= 700)
    if (r < (big ? 3 : 4.5)) low.push(`${r.toFixed(2)} «${(el.textContent ?? '').trim().slice(0, 30)}» <${el.tagName.toLowerCase()} class="${String((el as HTMLElement).className).slice(0, 40)}">`)
  }
  // store flater (≥ 120 × 60) som er mørke i lys modus
  const dark: string[] = []
  for (const el of document.querySelectorAll('main *')) {
    if (skip(el) || !vis(el)) continue
    const r = el.getBoundingClientRect()
    if (r.width < 120 || r.height < 60) continue
    const c = parse(getComputedStyle(el).backgroundColor)
    if (c[3]! > 0.5 && lum(c) < 0.15) dark.push(`<${el.tagName.toLowerCase()} class="${String((el as HTMLElement).className).slice(0, 40)}"> ${Math.round(r.width)}×${Math.round(r.height)}`)
  }
  return { low: [...new Set(low)], dark: [...new Set(dark)] }
})

export async function check(page: Page, where: string, problems: string[]) {
  await page.waitForTimeout(250)
  const r = await scan(page)
  for (const x of r.low) problems.push(`${where}: lav kontrast ${x}`)
  for (const x of r.dark) problems.push(`${where}: mørk flate ${x}`)
}

