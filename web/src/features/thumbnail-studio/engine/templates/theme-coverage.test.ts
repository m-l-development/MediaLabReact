import { describe, expect, it } from 'vitest'
import { colorsIn, paletteOfTheme, THEMES, type Palette, type ThemeValue } from '../../../../shared/templates/theme'
import { recolor } from '../colors'
import { LAYOUT_LIST } from '../library'
import { layout } from '../layouts'
import type { Doc } from '../model'
import { loadLibrary } from '.'

/**
 * Fargetemaet skal gjelde hele malen: etter omfarging finnes bare palettens farger (bakgrunn, tekst, flater, linjer,
 * dekor, skygger med farge …). Bare nøytrale (svarte/grå) skygger beholdes. Gjelder alle ferdige maler og alle temaer.
 */
const norm = (c: string) => c.toLowerCase()
const palSet = (P: Palette) => new Set(Object.values(P).map(norm))
const ODD = /^(#[0-9a-f]{4}|#[0-9a-f]{5}|#[0-9a-f]{7,8}|hsla?\(.*|(white|black|red|blue|green|yellow|orange|gray|grey))$/i

function strings(x: unknown, out: string[] = []): string[] {
  if (typeof x === 'string') out.push(x)
  else if (Array.isArray(x)) x.forEach((y) => strings(y, out))
  else if (x && typeof x === 'object') Object.values(x).forEach((y) => strings(y, out))
  return out
}

async function all(): Promise<[string, () => Doc][]> {
  const lib = await loadLibrary()
  return [
    ...LAYOUT_LIST.filter((o) => o.k !== 'blank').map((o) => [o.k, () => layout(o.k)] as [string, () => Doc]),
    ...lib.map((t) => [t.code, () => JSON.parse(JSON.stringify(t.doc)) as Doc] as [string, () => Doc]),
  ]
}

describe('fargetema på alle ferdige Thumbnail-maler', () => {
  it('ingen farger i formater motoren ikke forstår', async () => {
    for (const [k, mk] of await all()) {
      const odd = strings(mk()).filter((s) => ODD.test(s.trim()))
      expect(odd, k).toEqual([])
    }
  })

  const themes: [string, ThemeValue][] = [...THEMES.map((t) => [t.k, { k: t.k }] as [string, ThemeValue]), ['custom', { k: 'custom', c: ['#20123a', '#fff4e0', '#19c37d'] }]]
  for (const [tk, tv] of themes) {
    it(`tema ${tk}: bare palettens farger igjen (unntatt nøytrale skygger)`, async () => {
      const P = paletteOfTheme(tv)!
      const ok = palSet(P)
      const bad: string[] = []
      for (const [k, mk] of await all()) {
        const d = recolor(mk(), tv)
        for (const { path, c } of colorsIn({ bg: d.bg, layers: d.layers })) {
          if (ok.has(c)) continue
          if (/shadow/i.test(path)) continue
          bad.push(`${k}:${path}=${c}`)
        }
      }
      expect(bad.slice(0, 20)).toEqual([])
    })
  }

  it('Standard endrer ingenting', async () => {
    for (const [k, mk] of (await all()).slice(0, 40)) { const d = mk(); expect(recolor(JSON.parse(JSON.stringify(d)) as Doc, null), k).toEqual(d) }
  })
})
