import data from './catalog.json'

/**
 * Det felles fontbiblioteket (docs/maler-og-fonter.md, fase 1) for Photo Design, Thumbnail Studio, Motion Design og
 * Loop Studio. Generert av web/tools/fonts-gen.mjs fra fontbiblioteket (docs/fontkatalog.json): bare fonter med åpen
 * lisens som har fontfil i appen (selvdrevne woff2 under /fonts/, ingen kall til Google). Fonter med begrenset lisens
 * er ikke med.
 *
 * Eksisterende prosjekter lagrer fontens navn (`font: 'Montserrat'`); det er fortsatt nøkkelen.
 */
export type FontStyle = 'sans' | 'mod' | 'disp' | 'rund' | 'serif' | 'script' | 'dek' | 'retro' | 'eff' | 'tek' | 'mono'
export type FontUse = 'T' | 'L' | 'S' | 'B' | 'U' | 'V' | 'E' | 'F' | 'K' | 'R'

export interface FontEntry {
  id: string
  name: string
  style: FontStyle
  uses: FontUse[]
  /** google = Google Fonts; open = åpen font utenfor Google (Fontsource-pakke med lisensfil). */
  source: 'google' | 'open'
  /** Fonten mangler Æ, Ø og Å (tegnene vises i reservefonten). */
  noAeoa?: boolean
  note: string
  /** Vektene fonten har (normal stil). */
  weights: number[]
  italic: boolean
  /** Ekte snitt: Regular, Bold, Italic, Bold Italic. B/I i editoren er bare aktive når snittet finnes. */
  snitt: { r: boolean; b: boolean; i: boolean; bi: boolean }
  /** Stilarket med @font-face for fonten (lastes ved bruk). */
  css: string
  variable: boolean
  license: string
}

export const FONT_CATALOG = data as FontEntry[]

/** Stil og bruksområde, med samme navn som i fontbiblioteket. */
export const FONT_STYLES: Record<FontStyle, string> = {
  sans: 'Sans-serif', mod: 'Moderne / grotesk', disp: 'Display / kraftig', rund: 'Rund / vennlig', serif: 'Serif',
  script: 'Skript / håndskrift', dek: 'Dekorativ / tema', retro: 'Retro / neon', eff: 'Moderne effekt',
  tek: 'Teknisk / futuristisk', mono: 'Monospace',
}
export const FONT_USES: Record<FontUse, string> = {
  T: 'Thumbnail og titler', L: 'Logo', S: 'Skilt og plakat', B: 'Brødtekst og UI', U: 'Undertekst i video',
  V: 'Sitat og bibelvers', E: 'Elegant og invitasjon', F: 'Fest, barn og moro', K: 'Teknisk og gaming', R: 'Retro og vintage',
}

const byName = new Map(FONT_CATALOG.map((f) => [f.name.toLowerCase(), f]))

/** Fonten med dette navnet (store/små bokstaver likegyldig), eller null for fonter utenfor biblioteket. */
export function fontByName(name: string | null | undefined): FontEntry | null {
  return name ? (byName.get(name.toLowerCase()) ?? null) : null
}

/** Reservefont mens fonten lastes eller hvis den mangler (etter stil). */
export function fallbackOf(name: string): string {
  const s = fontByName(name)?.style
  return s === 'serif' ? 'Georgia, serif' : s === 'mono' ? 'ui-monospace, monospace' : s === 'script' ? 'cursive' : s === 'disp' ? 'Impact, sans-serif' : 'system-ui, sans-serif'
}

/** CSS font-family med reserve: `"Bebas Neue", Impact, sans-serif`. */
export function familyCss(name: string): string {
  return `"${name}", ${fallbackOf(name)}`
}

/**
 * Har fonten ekte fet/kursiv? Ukjente fonter (eldre prosjekter, fonter utenfor biblioteket) regnes som at de har
 * det, så knappene virker som før for dem.
 */
export function hasSnitt(name: string, s: 'b' | 'i' | 'bi'): boolean {
  const f = fontByName(name)
  return f ? f.snitt[s] : true
}

/** Vektene fonten har; ukjente fonter: null (bruk appens egen liste). */
export function weightsOf(name: string): number[] | null {
  return fontByName(name)?.weights ?? null
}
