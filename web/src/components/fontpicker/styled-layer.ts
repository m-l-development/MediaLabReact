/**
 * Felles for verktøyene: fra et tekstlags lagrede verdier til en <StyledText>-spesifikasjon (styled-raster), og fra
 * eldre tekstlag (uten textStyle) til et textStyle som gir samme oppsett når laget redigeres i fontpopupen første gang.
 */
import { hasStyle, type FontEntry } from './FontPicker.jsx'
import { DEFAULT_TEXT_STYLE, normalizeStyle, type TextEffect, type TextStyle } from './TextStyle.jsx'
import { fontEntry, stretchCss } from './app-fonts'
import { withImageUrl } from './images'
import type { StyledSpec } from './styled-raster'

export interface StyledInput {
  text: string
  /** Lagets font (navn) og bredde (prosent). */
  font: string
  stretch?: number | null | undefined
  /** Lagets tekststørrelse i px (textStyle.size overstyrer). */
  size: number
  color: string
  textStyle: Partial<TextStyle> | null | undefined
  width: number
  height: number
  upper?: boolean | undefined
  fit?: boolean | undefined
  palette?: string[] | null | undefined
  /** Fonten som forhåndsvises (holdes over i popupen) – lagres aldri. */
  preview?: FontEntry | null | undefined
  resolveImage?: ((ref: string) => string | null) | undefined
}

export function styledSpec(i: StyledInput): StyledSpec {
  const f = i.preview ?? fontEntry(i.font, i.stretch)
  const st = normalizeStyle(withImageUrl(i.textStyle, i.resolveImage) ?? {})
  const style: TextStyle = { ...st, bold: !!st.bold && hasStyle(f, 'bold'), italic: !!st.italic && hasStyle(f, 'italic') }
  const text = i.upper ? String(i.text || '').toLocaleUpperCase('nb-NO') : String(i.text || '')
  return {
    text,
    font: f,
    size: i.size,
    color: i.color,
    style,
    width: Math.max(1, Math.round(i.width)),
    height: Math.max(1, Math.round(i.height)),
    ...(i.palette?.length ? { palette: i.palette } : {}),
    // forhåndsvist font: oppføringens egen bredde; ellers lagets bredde
    stretch: i.preview ? stretchCss(i.preview, null) : stretchCss(f, i.stretch),
    fit: !!i.fit,
  }
}

/** Fontene og vektene en liste med tekstlag trenger (til lasting før eksport). */
export function weightOf(st: Partial<TextStyle> | null | undefined): number {
  const s = normalizeStyle(st ?? {})
  return s.weight || (s.bold ? 700 : 400)
}

export interface LegacyText {
  align?: string | undefined
  valign?: string | undefined
  lh?: number | undefined
  /** Bokstavavstand i em (andel av størrelsen). */
  ls?: number | undefined
  weight?: number | undefined
  italic?: boolean | undefined
  effect?: Partial<TextEffect> | null | undefined
}

/** textStyle for et eldre tekstlag: samme justering, linje- og bokstavavstand, tykkelse og kursiv. */
export function legacyTextStyle(l: LegacyText): TextStyle {
  const d = normalizeStyle(DEFAULT_TEXT_STYLE)
  const w = l.weight ?? 400
  const alignH = l.align === 'left' || l.align === 'right' || l.align === 'center' ? l.align : d.alignH
  const alignV = l.valign === 'top' || l.valign === 'bottom' || l.valign === 'middle' ? l.valign : d.alignV
  return normalizeStyle({
    ...d,
    alignH,
    alignV,
    lineHeight: l.lh && l.lh > 0 ? Math.round(l.lh * 100) / 100 : d.lineHeight,
    tracking: Math.round((l.ls ?? 0) * 1000),
    // 400/700 = Fet av/på i popupen; andre tykkelser (f.eks. 800) beholdes, så laget ser ut som før
    weight: w === 400 || w === 700 ? null : w,
    bold: w >= 600,
    italic: !!l.italic,
    ...(l.effect ? { effect: { ...d.effect, ...l.effect } as TextEffect } : {}),
  })
}

/** Vinkel (CSS linear-gradient, grader) for en gradient fra (x1, y1) til (x2, y2). */
export function cssAngle(x1: number, y1: number, x2: number, y2: number): number {
  const a = (Math.atan2(x2 - x1, -(y2 - y1)) * 180) / Math.PI
  return Math.round((a + 360) % 360)
}

/** Konturbredde i px → fontpopupens «Tykkelse» (0–100) for effekten Kontur. */
export function outlineWidth(px: number, size: number): number {
  return Math.max(1, Math.min(100, Math.round(((px / Math.max(1, size)) / 0.15) * 100)))
}
