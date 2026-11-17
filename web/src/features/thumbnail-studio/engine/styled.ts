/**
 * Tekstlag med fontpopupens stil (textStyle) i Thumbnail Studio: tegnet med <StyledText> (components/fontpicker) og
 * lagt inn i lerretet som bilde – samme bilde i visning og eksport (se styled-raster.tsx).
 *
 * Eldre tekstlag uten textStyle tegnes som før (render.ts). Når et slikt lag redigeres i popupen første gang, får det
 * et textStyle med lagets egne verdier (`thumbTextStyle`), så oppsettet er det samme.
 */
import type { FontEntry } from '../../../components/fontpicker/FontPicker.jsx'
import { DEFAULT_PALETTE } from '../../../components/fontpicker/app-fonts'
import { cssAngle, legacyTextStyle, outlineWidth, styledSpec } from '../../../components/fontpicker/styled-layer'
import { StyledLayers, type StyledImage, type StyledSpec } from '../../../components/fontpicker/styled-raster'
import type { TextStyle } from '../../../components/fontpicker/TextStyle.jsx'
import type { TextLayer } from './model'
import { bakeList } from './text-list'

/** Tekstlagene i Thumbnail Studio (felles for visning, skisser og eksport). */
export const styledLayers = new StyledLayers()

/** Siste kjente tekststørrelse og bilde per lag (til «Tilpass til boksen»-merknaden og strek under). */
export function lastStyled(id: string): { size: number; img: StyledImage } | null {
  const img = styledLayers.lastOf(id)
  return img ? { size: img.size, img } : null
}

export interface StyledOpts {
  preview?: FontEntry | null | undefined
  resolve?: ((ref: string) => string | null) | undefined
  palette?: string[] | null | undefined
}

export function thumbSpec(l: TextLayer, o: StyledOpts = {}): StyledSpec {
  return styledSpec({
    text: bakeList(String(l.text || ''), l.list),
    font: l.font,
    stretch: l.stretch,
    size: l.size,
    color: l.color,
    textStyle: l.textStyle,
    width: l.w,
    height: l.h,
    upper: l.upper,
    fit: l.fit,
    palette: o.palette?.length ? o.palette : DEFAULT_PALETTE,
    preview: o.preview,
    resolveImage: o.resolve,
  })
}

/** textStyle for laget: lagret stil, eller (eldre lag) en stil med lagets egne verdier. */
export function thumbTextStyle(l: TextLayer): TextStyle {
  if (l.textStyle) return l.textStyle
  let effect: Partial<TextStyle['effect']> | null = null
  if (l.fillSrc) effect = { type: 'imagefill', image: l.fillSrc }
  else if (l.paint?.length) {
    const p = l.paint.find((x) => x.k === 'lin' || x.k === 'rad' || x.k === 'con')
    const st = p && 'st' in p ? p.st : null
    if (st?.length) {
      const a = p?.k === 'lin' ? cssAngle(p.x1, p.y1, p.x2, p.y2) : 180
      effect = { type: 'gradient', color: st[0]?.[1] ?? l.color, color2: st[st.length - 1]?.[1] ?? l.color, p: { angle: a } }
    }
  } else if ((l.stroke ?? 0) > 0) effect = { type: 'outline', color: l.strokeColor || '#000000', p: { width: outlineWidth(l.stroke ?? 0, l.size), position: 'center' } }
  return legacyTextStyle({ align: l.align, valign: l.valign, lh: l.lh, ls: l.ls, weight: l.weight, italic: l.italic, effect })
}

/** Endringer laget får første gang popupen gir det et textStyle: verdiene som nå ligger i stilen, tas bort fra laget. */
export function legacyClear(l: TextLayer): Partial<TextLayer> {
  if (l.textStyle) return {}
  const out: Partial<TextLayer> = {}
  if ((l.stroke ?? 0) > 0) out.stroke = 0
  if (l.paint?.length) out.paint = null
  if (l.fillSrc) out.fillSrc = null
  return out
}
