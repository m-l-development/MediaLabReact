/**
 * Dataformatet i Loop Studio, likt dagens app (media-lab/src/pages/studio-editor/logic.js). Alt er valgfritt fordi
 * lagrede prosjekter fra alle tidligere versjoner skal kunne åpnes; motoren tåler manglende felt.
 */
export type SlideType = 'day' | 'text' | 'contact' | 'outro'
export type Hex = string

export interface Panel { color: Hex; alpha: number }
export interface FillStop { c: Hex; p: number; w?: number; hard?: boolean }
export interface BgFill {
  mode: string
  stops?: FillStop[] | undefined
  angle?: number | undefined
  soft?: number | null | undefined
  sharp?: number | undefined
  repeat?: number | null | undefined
  x?: number | null | undefined
  y?: number | null | undefined
  c1?: string | undefined
  c2?: string | undefined
}
export interface VigLayer {
  type?: string | undefined
  x?: number | undefined
  y?: number | undefined
  rot?: number | undefined
  open?: number | undefined
  amt?: number | undefined
  size?: number | undefined
  alpha?: number | undefined
  soft?: number | undefined
  color?: Hex | undefined
}
export interface Pip { src: string; x?: number; y?: number; w?: number; r?: number; op?: number; border?: boolean; borderColor?: Hex | null; shadow?: boolean }
export interface FText { text?: string; x?: number; y?: number; size?: number; color?: Hex; bold?: boolean; upper?: boolean; box?: boolean; boxColor?: Hex | null }
export interface FQr {
  url?: string
  kind?: string | undefined
  val?: string | undefined
  extra?: string | undefined
  qr?: string[] | null
  x?: number
  y?: number
  size?: number
  caption?: string
  contact?: string
  color?: Hex | null
}
export interface XY { x: number; y: number }
/** Overstyring av stil per slide. */
export interface SlideOv { transFx?: string; textFx?: string; overlayFx?: string; style?: string; kickerStyle?: string; kenBurns?: boolean; sweep?: boolean }

export interface Slide {
  id: string
  type: SlideType
  extra?: boolean | undefined
  dayKey?: string | undefined
  dayBase?: string | undefined
  day?: string | undefined
  date?: string | undefined
  time?: string | undefined
  title?: string | undefined
  place?: string | undefined
  kicker?: string | undefined
  pill?: string | undefined
  body?: string | undefined
  sub?: string | undefined
  headline?: string | undefined
  text?: string | undefined
  email?: string | undefined
  phone?: string | undefined
  qrUrl?: string | undefined
  qr?: string[] | null | undefined
  bg?: string | null | undefined
  bgPort?: string | null | undefined
  ruleId?: string | null | undefined
  bgOpacity?: number | null | undefined
  vig?: number | null | undefined
  vigColor?: Hex | null | undefined
  vigType?: string | null | undefined
  vigRot?: number | null | undefined
  vigSoft?: number | null | undefined
  vigSize?: number | null | undefined
  vigAmt?: number | null | undefined
  vigAlpha?: number | null | undefined
  vigOff?: boolean | undefined
  vigs?: VigLayer[] | null | undefined
  fx?: number | null | undefined
  fy?: number | null | undefined
  panX?: number | null | undefined
  panY?: number | null | undefined
  noLogo?: boolean | undefined
  tintMode?: string | undefined
  tint?: Hex | null | undefined
  tintAmt?: number | null | undefined
  ov?: SlideOv | null | undefined
  ovLast?: string | undefined
  tcol?: Record<string, Hex> | null | undefined
  dateLink?: boolean | undefined
  tsc?: Record<string, number> | null | undefined
  toff?: Record<string, XY> | null | undefined
  pips?: Pip[] | null | undefined
  ftexts?: FText[] | null | undefined
  fqr?: FQr | null | undefined
  panels?: Panel[] | null | undefined
  panelBg?: Hex | null | undefined
  qrX?: number | null | undefined
  qrY?: number | null | undefined
  qrSize?: number | null | undefined
  dur?: number | null | undefined
  hidden?: boolean | undefined
  bgFill?: BgFill | null | undefined
  oAmt?: number | null | undefined
  oSpeed?: number | null | undefined
  oAlpha?: number | null | undefined
  oColor?: Hex | null | undefined
  vid?: string | null | undefined
  vidName?: string | undefined
  vidLen?: number | undefined
  vidSound?: boolean | undefined
  vidMusic?: boolean | undefined
  vidVol?: number | null | undefined
}

/** Fast bilde: møtenavn (nøkkelord) → bakgrunnsbilde. */
export interface ImgRule { id: string; kw?: string; bg?: string | null; bgPort?: string | null }

export interface Cfg {
  accent?: Hex
  header?: string
  topLabel?: string
  headerX?: number | null
  headerY?: number | null
  topLabelX?: number | null
  topLabelY?: number | null
  headerScale?: number
  topLabelScale?: number
  overlay?: number
  rail?: boolean
  defDur?: number
  res?: string
  orient?: string
  logoSrc?: string | null
  logoOn?: boolean
  logoSize?: number
  logoX?: number | null
  logoY?: number | null
  logoOpacity?: number
  transFx?: string
  textFx?: string
  overlayFx?: string
  ovLast?: string
  fxAmount?: number
  ovSpeed?: number
  ovAlpha?: number
  ovColor?: Hex | null
  overlaySync?: boolean
  fxSpeed?: number
  kenBurns?: boolean
  sweep?: boolean
  font?: string
  titleScale?: number
  textScale?: number
  style?: string | null
  duotone?: boolean
  kickerStyle?: string | null
  kickerLine?: boolean | string
  palette?: Hex[] | null
  panels?: Panel[] | null
  panelsRotate?: boolean
  panelBg?: Hex | null
  tintColor?: Hex | null
  tintAmt?: number
  tintBlend?: string
  vigOn?: boolean
  vigColor?: Hex | null
  vigType?: string
  vigRot?: number
  vigOpen?: number
  vigX?: number
  vigY?: number
  vigSize?: number
  vigAmt?: number
  vigAlpha?: number
  vigSoft?: number
  vigs?: VigLayer[] | null
  beatPulse?: number
  beatText?: boolean
  beatNudge?: number
  bpm?: number | null
  beatExtras?: string[]
  beatReframe?: boolean
  beatPolish?: boolean
  beatLevel?: number
  beatEvery?: number
  beatBars?: number
  energyAdaptive?: boolean
  genre?: string
  audioMode?: string
  audioOffset?: number
  audioFadeIn?: number
  audioFadeOut?: number
  audioVol?: number
  exportAudio?: boolean
  autoSave?: boolean
  standard?: string
  imgRules?: ImgRule[]
}

/** Det motoren tegner: aktive slides (renset) og stilen. */
export interface PayloadCfg extends Record<string, unknown> {
  accent?: Hex | undefined
  font?: string | undefined
  beat?: number | null
  beatNudge?: number
}
export interface LoopData { cfg: PayloadCfg; slides: Slide[] }

export interface Box { x: number; y: number; w: number; h: number }
export interface TextRect extends Box { id: string; field: string }
export interface ItemRect extends Box { kind: 'pip' | 'ftext' | 'fqr'; id: string; i: number }
/** Områdene motoren tegnet sist (for klikk og dra i forhåndsvisningen). */
export interface Rects {
  texts: TextRect[]
  pips?: ItemRect[]
  fitems?: ItemRect[]
  qr?: Box & { id: string }
  header?: Box
  topLabel?: Box
  logo?: Box | null
}
/** Hjelpelinje mens noe dras: loddrett (v) eller vannrett (h) i piksler. */
export interface Guide { t: 'v' | 'h'; v: number }

export interface LoopMedia {
  images: Record<string, HTMLImageElement>
  video: HTMLVideoElement | null
  vids?: Record<string, HTMLVideoElement>
  guides?: Guide[] | null
  lastRects?: Rects | null
  lastLogoRect?: Box | null
}

/** Hvor i loopen et tidspunkt er (slide i og tid i sliden lt). */
export interface Loc { i: number; lt: number; total: number }
