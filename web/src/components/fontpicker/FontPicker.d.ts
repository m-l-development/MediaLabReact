// Typer for FontPicker.jsx (kopiert uendret fra fontpopup/src). Bare typer – ingen kode.
import type { ReactElement } from 'react'
import type { TextStyle } from './TextStyle.jsx'

/** Én font i fonts.json (formatet fra fontpopup/eksempel/fonts.eksempel.json). */
export interface FontEntry {
  id: string
  navn: string
  familie: string
  status: string
  kategorier: string[]
  stiler: { regular: boolean; bold: boolean; italic: boolean; boldItalic: boolean }
  css?: string
  stil?: string
  anbefalt?: boolean
  iMalene?: boolean
  sok?: string
  lignerPa?: string
  bredde?: number
  harAeOeAa?: boolean
  [k: string]: unknown
}

export interface FontPickerProps {
  fonts: FontEntry[]
  categories?: string[]
  value?: string | null | undefined
  onChange?: (font: FontEntry) => void
  onPreview?: (font: FontEntry | null) => void
  previewText?: string
  base?: string
  label?: string
  textStyle?: Partial<TextStyle> | null | undefined
  onTextStyleChange?: (ts: TextStyle) => void
  textColor?: string
  onTextColorChange?: (c: string) => void
  palette?: string[]
  backgroundImage?: string | null | undefined
  baseSize?: number
}
export default function FontPicker(props: FontPickerProps): ReactElement
export function ensureFontCss(font: FontEntry | null | undefined, base?: string): void
export function loadFont(font: FontEntry, weight?: number, style?: string, base?: string): Promise<string>
export function hasStyle(font: FontEntry | null | undefined, stil: 'regular' | 'bold' | 'italic' | 'boldItalic'): boolean
