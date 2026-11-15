import { ink, luma, mapColor, recolorDeep, type Palette } from '../../../shared/templates/theme'
import type { Clip, SubStyle, TextItem } from './model'

/**
 * Fargetema på en Motion-mal (shared/templates/theme.ts): ALLE farger i malen følger paletten – bakgrunnsklipp
 * (farge/gradient), tekst, tekstbokser, omriss, tekstmaske, skygger/glød, effekter og undertekststil – via den felles
 * dype omfargingen (recolorDeep). Rollen bestemmes av hvor fargen står; her overstyres det som er spesielt for Motion
 * (tekstboks = aksent, omriss/maske = scenefarge), og teksten sikres lesbar mot det den står på.
 * Tekst, plassering, tid, animasjoner og overganger røres ikke.
 */
export function themeContent<T extends { clips: Clip[]; texts: TextItem[]; subStyle?: SubStyle }>(c: T, P: Palette): T {
  const deep = recolorDeep({ clips: c.clips, texts: c.texts, subStyle: c.subStyle }, P, (path) => {
    const top = path[0], last = path[path.length - 1] ?? ''
    if (top === 'clips' && (last === 'c1' || last === 'c2') && path.length === 3) return 'bg'
    if (top === 'texts' && path.length === 3) {
      if (last === 'bg') return 'acc'
      if (last === 'strokeColor' || last === 'knockColor') return 'bg'
      if (last === 'color2') return 'acc'
    }
    if (top === 'subStyle' && path.length === 2) return last === 'hl' ? 'acc' : last === 'bg' ? 'bg' : last === 'color' ? 'text' : undefined
    return undefined
  })
  const clips = deep.clips
  // lesbarhet: teksten må skille seg fra det den står på (bakgrunnen eller boksen)
  const base = clips.find((x) => x.kind === 'color')
  const under = base && base.kind === 'color' ? base.c1 : P.bg
  const legible = (fg: string, on: string) => (Math.abs(luma(fg) - luma(on)) >= 70 ? fg : Math.abs(luma(P.fg) - luma(on)) >= 70 ? P.fg : ink(on))
  const texts = deep.texts.map((t, i) => {
    const o = c.texts[i] as TextItem
    const boxed = t.box !== 'none'
    return { ...t, color: legible(mapColor(o.color, 'text', P), boxed ? t.bg : under) }
  })
  return { ...c, clips, texts, ...(deep.subStyle ? { subStyle: deep.subStyle } : {}) }
}
