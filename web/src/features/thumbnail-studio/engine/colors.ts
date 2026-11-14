import type { Doc } from './model'

import { HEX, isColorValue, mapAny, paletteOfTheme, THEMES, type Palette, type ThemeValue } from '../../../shared/templates/theme'

export { hexRgb, ink, luma, type Palette } from '../../../shared/templates/theme'
export { rgba } from '../../../shared/templates/rgba'

/** Fargekombinasjoner for «Ny mal» → «Velg farge»: Standard + de ti felles temaene (shared/templates/theme.ts). */
export interface Combo { k: string; name: string; sw: string[]; p?: Palette }

export const COMBOS: readonly Combo[] = [
  { k: 'default', name: 'Standard', sw: ['#000000', '#f5b800', '#ffffff'] },
  ...THEMES.map((t) => ({ k: t.k, name: t.name, p: t.p, sw: [t.p.bg, t.p.fill, t.p.fg] })),
]

/** Fargelegger et oppsett med en kombinasjon, et tema eller en palett (endrer dokumentet og returnerer det). */
export function recolor(doc: Doc, key: string | ThemeValue | Palette): Doc {
  const P = typeof key === 'string' ? COMBOS.find((c) => c.k === key)?.p : key && 'bg2' in key ? key : paletteOfTheme(key)
  if (!P) return doc
  const bg = doc.bg as unknown as Record<string, unknown>
  for (const k of ['color', 'c1', 'c2']) if (isColorValue(bg[k])) bg[k] = mapAny(bg[k], 'bg', P)
  for (const l of doc.layers) {
    const o = l as unknown as Record<string, unknown>
    for (const k of Object.keys(o)) {
      const v = o[k]
      if (!isColorValue(v) || k === 'id' || k === 'src') continue
      const use = /fill|^barColor$/.test(k) ? 'fill' : l.type === 'glow' || /stroke|border|tint/i.test(k) ? 'acc' : 'text'
      o[k] = mapAny(v, use, P)
    }
  }
  return doc
}

/** Fargene og fontene i et grunnoppsett («profilen»), brukt først i fargevelgere og fontlisten. */
export function profileOf(d: Doc): { colors: string[]; fonts: string[] } {
  const cs: string[] = []
  const fs: string[] = []
  const add = (v: unknown) => {
    if (typeof v === 'string' && HEX.test(v)) {
      const x = v.toLowerCase()
      if (!cs.includes(x)) cs.push(x)
    }
  }
  if (d.bg.type === 'color') add(d.bg.color)
  else if (d.bg.type === 'gradient') {
    add(d.bg.c1)
    add(d.bg.c2)
  }
  for (const l of d.layers) {
    if (l.type === 'text') {
      add(l.color)
      if (l.bar) add(l.barColor)
      if (!fs.includes(l.font)) fs.push(l.font)
    } else if (l.type === 'shape') {
      add(l.fill)
      add(l.fill2)
      if (l.stroke > 0) add(l.strokeColor)
    } else if (l.type === 'image') {
      add(l.tint)
      if (l.border > 0) add(l.borderColor)
    } else add(l.color)
  }
  return { colors: cs.slice(0, 10), fonts: fs }
}
