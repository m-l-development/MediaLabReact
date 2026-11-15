import { describe, expect, it } from 'vitest'
import { colorsIn, paletteOfTheme, themeToParam, THEMES, type ThemeValue } from '../../shared/templates/theme'
import { themeSeries } from './controller'
import { sampleData } from './model'

/** Fargetemaet gjelder hele Loop-serien (oppsett og lysbilder), ikke bare aksent og paneler. */
const themes: ThemeValue[] = [...THEMES.map((t) => ({ k: t.k })), { k: 'custom', c: ['#20123a', '#fff4e0', '#19c37d'] }]

describe('fargetema på alle Loop-maler', () => {
  for (const tv of themes) {
    it(`tema ${tv?.k}: ingen av malens egne farger blir igjen`, () => {
      const P = paletteOfTheme(tv)!
      const ok = new Set(Object.values(P).map((x) => x.toLowerCase()))
      const bad: string[] = []
      for (const tpl of ['week', 'sunday', 'youth']) {
        const d = sampleData(tpl)
        const out = themeSeries(d.cfg, d.slides, themeToParam(tv))
        for (const { path, c } of colorsIn(out)) if (!ok.has(c) && !/shadow/i.test(path)) bad.push(`${tpl}:${path}=${c}`)
      }
      expect(bad.slice(0, 20)).toEqual([])
    })
  }
  it('Standard endrer ingenting', () => {
    for (const tpl of ['week', 'sunday', 'youth']) {
      const d = sampleData(tpl)
      expect(themeSeries(d.cfg, d.slides, '')).toEqual({ cfg: d.cfg, slides: d.slides })
    }
  })
})
