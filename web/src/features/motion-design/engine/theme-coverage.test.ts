import { describe, expect, it } from 'vitest'
import { colorsIn, paletteOfTheme, THEMES, type ThemeValue } from '../../../shared/templates/theme'
import { create, TEMPLATES } from './model'

/** Fargetemaet gjelder hele Motion-malen: etter omfarging finnes bare palettens farger (+ svart/hvit for lesbar tekst). */
const fmt = { k: 'wide', w: 1920, h: 1080 }
const themes: [string, ThemeValue][] = [...THEMES.map((t) => [t.k, { k: t.k }] as [string, ThemeValue]), ['custom', { k: 'custom', c: ['#20123a', '#fff4e0', '#19c37d'] }]]

describe('fargetema på alle Motion-maler', () => {
  for (const [k, tv] of themes) {
    it(`tema ${k}: ingen av malens egne farger blir igjen`, () => {
      const P = paletteOfTheme(tv)!
      const ok = new Set([...Object.values(P), '#111111', '#ffffff', '#000000'].map((x) => x.toLowerCase()))
      const bad: string[] = []
      for (const t of TEMPLATES) {
        if (t.k === 'blank') continue
        const p = create(fmt, t.k, undefined, P)
        for (const { path, c } of colorsIn({ clips: p.clips, texts: p.texts, subStyle: p.subStyle })) {
          if (ok.has(c) || /shadow/i.test(path)) continue
          bad.push(`${t.k}:${path}=${c}`)
        }
      }
      expect(bad.slice(0, 20)).toEqual([])
    })
  }
  it('Standard beholder malens farger', () => {
    for (const t of TEMPLATES) {
      const a = create(fmt, t.k), b = create(fmt, t.k, undefined, null)
      expect(colorsIn({ c: b.clips, t: b.texts }).map((x) => x.c), t.k).toEqual(colorsIn({ c: a.clips, t: a.texts }).map((x) => x.c))
    }
  })
})
