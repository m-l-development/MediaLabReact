import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/** TB-95F738: statusmerkenes tekst er lesbar (WCAG AA, 4,5:1) mot merkets tonede bakgrunn i både mørk og lys modus. */
const css = fs.readFileSync(path.join(import.meta.dirname, 'admin.css'), 'utf8')
function vars(block: string): Record<string, string> {
  const m = new RegExp(block.replace(/[[\]().*"=]/g, (c) => `\\${c}`) + '\\s*\\{([^}]*)\\}').exec(css)
  if (!m) throw new Error(`fant ikke ${block}`)
  return Object.fromEntries([...m[1]!.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((x) => [x[1]!, x[2]!.trim()]))
}
const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
const lum = (c: number[]) => { const f = (v: number) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4 }; return 0.2126 * f(c[0]!) + 0.7152 * f(c[1]!) + 0.0722 * f(c[2]!) }
const mix = (a: number[], b: number[], k: number) => a.map((v, i) => v * k + b[i]! * (1 - k))
const ratio = (a: number[], b: number[]) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) }
const tint = (variant: string) => Number(new RegExp(`\\.ch-badge\\.${variant} \\{[^}]*color-mix\\(in srgb, var\\(--[\\w-]+\\) (\\d+)%`).exec(css)?.[1] ?? 0) / 100

describe('statusmerker i Admin', () => {
  const dark = vars('[data-ml-theme="admin"]')
  const light = { ...dark, ...vars(':root[data-theme="light"] [data-ml-theme="admin"]') }
  for (const [theme, v] of [['mørk', dark], ['lys', light]] as const) {
    for (const [variant, fill, text] of [['ok', 'ok', 'ok-text'], ['warn', 'warn', 'warn-text'], ['bad', 'accent', 'accent-text']] as const) {
      it(`${variant} i ${theme} modus`, () => {
        expect(tint(variant), 'merket har tonet bakgrunn').toBeGreaterThan(0)
        for (const under of ['panel', 'panel2', 'bg']) {
          const bg = mix(hex(v[fill]!), hex(v[under]!), tint(variant))
          expect(ratio(hex(v[text]!), bg), `${variant}-tekst på ${under}`).toBeGreaterThanOrEqual(4.5)
        }
      })
    }
  }
})
