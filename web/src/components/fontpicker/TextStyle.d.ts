// Typer for TextStyle.jsx (kopiert uendret fra fontpopup/src). Bare typer – ingen kode.
import type { CSSProperties, ReactElement } from 'react'

export interface TextShape {
  type: string
  amount?: number
  color?: string
  seed?: number
  p?: Record<string, unknown>
  words?: Record<string, unknown>
  cloud?: Record<string, unknown>
  [k: string]: unknown
}
export interface TextEffect {
  type: string
  color?: string
  color2?: string
  strength?: number
  p?: Record<string, unknown>
  image?: string
  colors?: string[]
  [k: string]: unknown
}
export interface TextStyle {
  bold: boolean
  italic: boolean
  strike: boolean
  underline: string
  alignH: 'left' | 'center' | 'right'
  alignV: 'top' | 'middle' | 'bottom'
  direction: string
  size: number | null
  lineHeight: number
  tracking: number
  weight: number | null
  flipH: boolean
  flipV: boolean
  rotate: number
  shape: TextShape
  effect: TextEffect
  [k: string]: unknown
}
export interface ShapeDef { type: string; navn: string; kind: string; [k: string]: unknown }
export interface EffectDef { type: string; navn: string; [k: string]: unknown }

export const DEFAULT_TEXT_STYLE: TextStyle
export const SHAPES: ShapeDef[]
export const EFFECTS: EffectDef[]
export const PRESETS: Record<string, unknown>[]
export const SHAPE_SETTINGS: Record<string, unknown>
export const EFFECT_SETTINGS: Record<string, unknown>
export const LAYER_FX: string[]
export const CLOUD_SETTINGS: unknown[]
export const CLOUD_SIZES: [string, number][]
export function shapeParams(shape?: Partial<TextShape>): Record<string, number | string>
export function fxParams(effect?: Partial<TextEffect>): Record<string, number | string>
export function wOf(st: Partial<TextStyle>): number
export function retroColorsOf(fx: Partial<TextEffect>): string[]
export function stripeColorsOf(fx: Partial<TextEffect>): { up: string[]; down: string[] }
export function effectCss(effect?: Partial<TextEffect>, filterId?: string, textColor?: string): CSSProperties
export function textStyleCss(st?: Partial<TextStyle>, color?: string): CSSProperties
export function boxCss(st?: Partial<TextStyle>): CSSProperties
export function normalizeStyle(textStyle?: Partial<TextStyle> | Record<string, unknown>): TextStyle
export function cloudWords(text?: string, merge?: boolean): { w: string; key: string; count: number; index: number; max: number }[]
export function cloudParams(shape?: Partial<TextShape>): Record<string, number | string>
export function cloudPalette(shape?: Partial<TextShape>, palette?: string[], color?: string): string[]
export function stretchOf(font: { bredde?: number } | null | undefined): string | undefined

export interface StyledTextProps {
  text: string
  fontFamily: string
  fontSize?: number
  color?: string
  textStyle?: Partial<TextStyle> | null
  width?: number
  height?: number
  palette?: string[]
  fontStretch?: string | undefined
}
export function StyledText(props: StyledTextProps): ReactElement
