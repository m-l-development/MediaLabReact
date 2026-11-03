import type { Page } from '@playwright/test'

/**
 * Berøring i testene. Chromium: ekte berøringshendelser via CDP (Input.dispatchTouchEvent). WebKit (iPhone-emulering):
 * CDP finnes ikke, så pekerhendelser av typen «touch» sendes til elementet under fingeren, slik nettleseren gjør –
 * appen bruker pekerhendelser, så det er de samme kodeveiene. Ingen av delene er en ekte telefon.
 */
type Pt = { x: number; y: number }

async function cdp(page: Page) {
  return page.context().newCDPSession(page)
}

/** Pekerhendelser av typen touch i siden (WebKit). `seq` = rekke av [type, punkter]. */
async function pointers(page: Page, seq: [string, (Pt & { id: number })[]][]) {
  await page.evaluate(async (s) => {
    const down = new Map<number, Element>()
    for (const [type, pts] of s) {
      for (const p of pts) {
        const target = type === 'pointerdown' ? document.elementFromPoint(p.x, p.y) : down.get(p.id) ?? document.elementFromPoint(p.x, p.y)
        if (!target) continue
        if (type === 'pointerdown') down.set(p.id, target)
        target.dispatchEvent(new PointerEvent(type, { pointerId: 10 + p.id, pointerType: 'touch', isPrimary: p.id === 1, clientX: p.x, clientY: p.y, bubbles: true, cancelable: true, composed: true, buttons: type === 'pointerup' ? 0 : 1, button: 0 }))
        if (type === 'pointerup') down.delete(p.id)
      }
      await new Promise((r) => requestAnimationFrame(() => r(0)))
    }
  }, seq)
}

/** Én finger fra `from`, flyttet (dx, dy) i `steps` steg. `holdMs` = hold før draget (langt trykk). */
export async function fingerDrag(page: Page, from: Pt, dx: number, dy: number, o: { steps?: number; holdMs?: number } = {}) {
  const steps = o.steps ?? 8
  const browser = page.context().browser()?.browserType().name()
  if (browser === 'chromium') {
    const s = await cdp(page)
    await s.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...from, id: 1 }] })
    if (o.holdMs) await page.waitForTimeout(o.holdMs)
    for (let i = 1; i <= steps; i++) await s.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: from.x + (dx * i) / steps, y: from.y + (dy * i) / steps, id: 1 }] })
    await s.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    return
  }
  await pointers(page, [['pointerdown', [{ ...from, id: 1 }]]])
  if (o.holdMs) await page.waitForTimeout(o.holdMs)
  const seq: [string, (Pt & { id: number })[]][] = []
  for (let i = 1; i <= steps; i++) seq.push(['pointermove', [{ x: from.x + (dx * i) / steps, y: from.y + (dy * i) / steps, id: 1 }]])
  seq.push(['pointerup', [{ x: from.x + dx, y: from.y + dy, id: 1 }]])
  await pointers(page, seq)
}

/** To fingre som glir fra hverandre rundt `c` (knip for å zoome inn). */
export async function pinchOut(page: Page, c: Pt) {
  const pts = (d: number) => [{ x: c.x - d, y: c.y, id: 1 }, { x: c.x + d, y: c.y, id: 2 }]
  const browser = page.context().browser()?.browserType().name()
  if (browser === 'chromium') {
    const s = await cdp(page)
    await s.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pts(30) })
    for (const d of [45, 60, 80, 100]) await s.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pts(d) })
    await s.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    return
  }
  await pointers(page, [['pointerdown', pts(30)], ...[45, 60, 80, 100].map((d) => ['pointermove', pts(d)] as [string, (Pt & { id: number })[]]), ['pointerup', pts(100)]])
}
