import { ink, luma, mapColor, type Palette } from '../../../shared/templates/theme'
import type { Clip, SubStyle, TextItem } from './model'

/**
 * Fargetema på en Motion-mal (shared/templates/theme.ts): bakgrunnsklipp (farge/gradient), tekstfarger, tekstbokser,
 * omriss og undertekststil får farger fra paletten ut fra rollen og hvor lyse/mettede de er. Tekst, plassering,
 * tid, animasjoner og overganger røres ikke. Lys tekst på mørk bakgrunn i malen blir tekstfarge på bakgrunnsfarge osv.
 */
export function themeContent<T extends { clips: Clip[]; texts: TextItem[]; subStyle?: SubStyle }>(c: T, P: Palette): T {
  const clips = c.clips.map((x) => (x.kind === 'color' ? { ...x, c1: mapColor(x.c1, 'bg', P), c2: mapColor(x.c2, 'bg', P) } : x))
  // lesbarhet: teksten må skille seg fra det den står på (bakgrunnen eller boksen)
  const base = clips.find((x) => x.kind === 'color')
  const under = base && base.kind === 'color' ? base.c1 : P.bg
  const legible = (fg: string, on: string) => (Math.abs(luma(fg) - luma(on)) >= 70 ? fg : Math.abs(luma(P.fg) - luma(on)) >= 70 ? P.fg : ink(on))
  const texts = c.texts.map((t) => {
    const boxed = t.box !== 'none'
    // tekst i en farget boks: boksen får aksent/flate, teksten en farge som syns på den
    const bg = boxed ? mapColor(t.bg, 'acc', P) : t.bg
    const color = legible(mapColor(t.color, 'text', P), boxed ? bg : under)
    return { ...t, color, bg, strokeColor: mapColor(t.strokeColor, 'bg', P), color2: mapColor(t.color2, 'acc', P) }
  })
  const subStyle = c.subStyle ? { ...c.subStyle, hl: mapColor(c.subStyle.hl, 'acc', P), color: mapColor(c.subStyle.color, 'text', P), bg: mapColor(c.subStyle.bg, 'bg', P) } : undefined
  return { ...c, clips, texts, ...(subStyle ? { subStyle } : {}) }
}
