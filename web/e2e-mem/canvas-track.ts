/** Felles for minnemålingene: prosessminne (Windows), topp under en økt og lerretsregnskap (alle nettlesere). */
import { exec, execSync } from 'node:child_process'
import type { Page } from '@playwright/test'

/** Topp under økten: prosessminnet måles hvert sekund i bakgrunnen. */
const S = { top: 0, on: false }
/** Starter (on = true) eller stopper målingen av toppen; gir toppen så langt. */
export function sampleTop(on: boolean): number {
  if (on && !S.on) { S.top = 0; S.on = true; sample() }
  if (!on) S.on = false
  return S.top
}
function sample(): void {
  if (!S.on) return
  exec(`powershell -NoProfile -Command "(Get-CimInstance Win32_Process | Where-Object { $_.ExecutablePath -like '*ms-playwright*' } | Measure-Object -Property PrivatePageCount -Sum).Sum"`, (_e, out) => {
    const mb = Math.round(Number(String(out).trim()) / 1048576)
    if (Number.isFinite(mb)) S.top = Math.max(S.top, mb)
    setTimeout(sample, 1000)
  })
}

export function procMB(): number {
  try {
    const out = execSync(`powershell -NoProfile -Command "(Get-CimInstance Win32_Process | Where-Object { $_.ExecutablePath -like '*ms-playwright*' } | Measure-Object -Property PrivatePageCount -Sum).Sum"`, { encoding: 'utf8' })
    return Math.round(Number(out.trim()) / 1048576)
  } catch {
    return -1
  }
}

/**
 * Lerretsregnskap (uavhengig av operativsystem): alle lerreter som lages registreres svakt (WeakRef). «Venter» = lerreter
 * som ikke er i dokumentet, fortsatt lever og ikke er nullstilt – det minnet Safari først gir tilbake ved søppeltømming
 * (på Mac som GPU-minne). «Laget» = samlet lerretsminne som er laget i økten.
 */
export function trackCanvases() {
  type T = { refs: WeakRef<HTMLCanvasElement | OffscreenCanvas>[]; made: number }
  const w = window as unknown as { __cv?: T }
  const t: T = (w.__cv = { refs: [], made: 0 })
  const where = new WeakMap<object, string>()
  ;(window as unknown as { __cvWhere: WeakMap<object, string> }).__cvWhere = where
  // hvor lerretet ble laget (MEM_CV_DEBUG=1 skriver det ut for lerreter som venter)
  const track = (c: HTMLCanvasElement | OffscreenCanvas) => {
    t.refs.push(new WeakRef(c))
    where.set(c, (new Error().stack ?? '').split('\n').slice(2, 5).map((x) => x.trim().replace(/https?:\/\/[^/]+\//, '').slice(0, 90)).join(' < '))
    return c
  }
  const ce = Document.prototype.createElement
  Document.prototype.createElement = function (this: Document, tag: string, o?: ElementCreationOptions) {
    const el = ce.call(this, tag, o)
    return tag.toLowerCase() === 'canvas' ? track(el as HTMLCanvasElement) : el
  } as typeof Document.prototype.createElement
  for (const C of [HTMLCanvasElement, typeof OffscreenCanvas === 'undefined' ? null : OffscreenCanvas]) {
    if (!C) continue
    for (const k of ['width', 'height'] as const) {
      const d = Object.getOwnPropertyDescriptor(C.prototype, k)
      if (!d?.set || !d.get) continue
      Object.defineProperty(C.prototype, k, { ...d, set(this: HTMLCanvasElement, v: number) {
        const before = d.get!.call(this) as number
        d.set!.call(this, v)
        const other = k === 'width' ? this.height : this.width
        if (v > before) t.made += (v - before) * other * 4
      } })
    }
  }
  if (typeof OffscreenCanvas !== 'undefined') {
    const O = OffscreenCanvas
    ;(window as unknown as { OffscreenCanvas: unknown }).OffscreenCanvas = class extends O {
      constructor(a: number, b: number) { super(a, b); t.made += a * b * 4; track(this) }
    }
  }
}
export async function canvasMB(page: Page): Promise<{ waiting: number; made: number; count: number }> {
  return page.evaluate(() => {
    const t = (window as unknown as { __cv: { refs: WeakRef<HTMLCanvasElement | OffscreenCanvas>[]; made: number } }).__cv
    let waiting = 0, count = 0
    t.refs = t.refs.filter((r) => {
      const c = r.deref()
      if (!c) return false
      if (c instanceof HTMLCanvasElement && c.isConnected) return true
      if (c.width * c.height > 1) { waiting += c.width * c.height * 4; count++; if ((window as unknown as { __cvDbg?: boolean }).__cvDbg !== false) console.log(`CV ${c.width}x${c.height} ${(window as unknown as { __cvWhere: WeakMap<object, string> }).__cvWhere.get(c)}`) }
      return true
    })
    const made = t.made
    t.made = 0
    return { waiting: Math.round(waiting / 1048576), made: Math.round(made / 1048576), count }
  })
}

