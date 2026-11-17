/**
 * Typografien til et tekstlag, slik tekstfeltet (live-visning) og redigering på lerretet viser den: font, tykkelse,
 * kursiv, justering, linje- og bokstavavstand og størrelse – uten effekter (skygge, glød, kontur, filtre). Felles for
 * alle editorene; bygget av lagets egne verdier og fontpopupens stil (textStyle) når laget har en.
 */
import { hasStyle } from '../fontpicker/FontPicker.jsx'
import { fontEntry, stretchCss } from '../fontpicker/app-fonts'
import { normalizeStyle, wOf, type TextStyle } from '../fontpicker/TextStyle.jsx'

export interface Typo {
  family: string
  stretch?: string | undefined
  weight: number
  italic: boolean
  alignH: 'left' | 'center' | 'right'
  /** Linjeavstand (gange tekststørrelsen). */
  lineHeight: number
  /** Bokstavavstand i em. */
  tracking: number
  /** Tekststørrelsen i lagets px. */
  size: number
  /** Tekstboksens bredde i lagets px (teksten brytes likt når størrelsen skaleres med samme forhold). */
  boxWidth: number
  color: string
  upper?: boolean | undefined
}

export interface TypoInput {
  font: string
  stretch?: number | null | undefined
  size: number
  color: string
  boxWidth: number
  upper?: boolean | undefined
  textStyle?: Partial<TextStyle> | null | undefined
  /** Eldre lag uten textStyle: lagets egne verdier. */
  legacy?: { align?: string | undefined; lh?: number | undefined; ls?: number | undefined; weight?: number | undefined; italic?: boolean | undefined } | undefined
}

export function typoOf(i: TypoInput): Typo {
  const f = fontEntry(i.font, i.stretch)
  const base = { family: f.familie, stretch: stretchCss(f, i.stretch), color: i.color, boxWidth: Math.max(1, i.boxWidth), upper: i.upper }
  if (i.textStyle) {
    const st = normalizeStyle(i.textStyle)
    return {
      ...base,
      weight: wOf({ ...st, bold: !!st.bold && hasStyle(f, 'bold') }),
      italic: !!st.italic && hasStyle(f, 'italic'),
      alignH: st.alignH,
      lineHeight: st.lineHeight || 1.1,
      tracking: (st.tracking || 0) / 1000,
      size: st.size || i.size,
    }
  }
  const l = i.legacy ?? {}
  const a = l.align === 'left' || l.align === 'right' ? l.align : 'center'
  return { ...base, weight: l.weight ?? 400, italic: !!l.italic, alignH: a, lineHeight: l.lh && l.lh > 0 ? l.lh : 1.1, tracking: l.ls ?? 0, size: i.size }
}

/** Lys eller mørk bakgrunn bak teksten, så den alltid er lesbar (tekstfargen beholdes). */
export function backdropFor(color: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(color.trim())
  if (!m) return '#1b1b1b'
  const n = parseInt(m[1] ?? '000000', 16)
  const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255
  return lum > 0.55 ? '#1b1b1b' : '#f2f1ec'
}
