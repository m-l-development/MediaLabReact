/**
 * Appens fontliste til fontpopupen (fonts.json, generert av web/tools/fontpopup-fonts.mjs fra fontene appen har) og
 * oppslag mellom tekstlagenes lagrede font (navn + bredde) og fontlistens oppføringer.
 *
 * Tekstlagene lagrer fortsatt fontens navn (`font: 'Montserrat'`) som før; en «Expanded»-oppføring (bredde 125) er
 * samme font med `stretch: 125` på laget. Fonter utenfor listen (eldre prosjekter, egne navn) får en oppføring uten
 * stilark, så teksten fortsatt tegnes med navnet.
 */
import data from './fonts.json'
import type { FontEntry } from './FontPicker.jsx'

export const FONT_BASE = '/'
export const FONT_DATA = data as unknown as { versjon: number; kategorier: string[]; fonter: FontEntry[] }
export const FONT_LIST: FontEntry[] = FONT_DATA.fonter
export const FONT_CATEGORIES: string[] = FONT_DATA.kategorier

const byId = new Map(FONT_LIST.map((f) => [f.id, f]))
const byName = new Map<string, FontEntry>()
for (const f of FONT_LIST) if (!f.bredde && !byName.has(f.navn.toLowerCase())) byName.set(f.navn.toLowerCase(), f)
const wide = new Map<string, FontEntry>()
for (const f of FONT_LIST) if (f.bredde) wide.set(`${f.navn.toLowerCase()}|${f.bredde}`, f)
const extra = new Map<string, FontEntry>()

/** Oppføringen for et lagret fontnavn (og bredde). Ukjente navn får en egen oppføring uten stilark. */
export function fontEntry(name: string | null | undefined, stretch?: number | null): FontEntry {
  const n = String(name || 'Archivo')
  const k = n.toLowerCase()
  if (stretch && stretch !== 100) {
    const w = wide.get(`${k}|${Math.round(stretch)}`)
    if (w) return w
  }
  const f = byName.get(k) ?? byId.get(n)
  if (f) return f
  let e = extra.get(k)
  if (!e) {
    e = { id: n, navn: n, familie: `'${n.replace(/'/g, '')}', sans-serif`, status: 'klar', kategorier: [], stiler: { regular: true, bold: true, italic: true, boldItalic: true } }
    extra.set(k, e)
  }
  return e
}

/** Oppføringen med denne id-en (fra popupen). */
export function fontById(id: string | null | undefined): FontEntry | null {
  return (id && byId.get(id)) || null
}

/** Verdien popupen viser som valgt (id). */
export function fontValue(name: string | null | undefined, stretch?: number | null): string {
  return fontEntry(name, stretch).id
}

/** Lagets nye font og bredde når en font velges i popupen. */
export function fontPatch(f: FontEntry, curStretch?: number | null): { font: string; stretch?: number } {
  if (f.bredde) return { font: f.navn, stretch: f.bredde }
  // vanlig oppføring: en eksakt bredde fra «Bredde»-kontrollen beholdes, men ikke Expanded-bredden fra forrige valg
  const keep = curStretch && curStretch !== 100 && !wide.has(`${f.navn.toLowerCase()}|${Math.round(curStretch)}`) ? curStretch : undefined
  return keep ? { font: f.navn, stretch: keep } : { font: f.navn, stretch: 100 }
}

/** CSS font-stretch for laget: lagets egen bredde (prosent), ellers oppføringens. */
export function stretchCss(f: FontEntry, stretch?: number | null): string | undefined {
  if (stretch && stretch !== 100) return `${stretch}%`
  return f.bredde ? `${f.bredde}%` : undefined
}

/** Fargene som runde knapper i popupen når verktøyet ikke har egne (popupens egne standardfarger). */
export const DEFAULT_PALETTE = ['#ffffff', '#f4b53f', '#000000', '#2b2b2b', '#3b8fd4', '#2ea8a0', '#7b55e8', '#e04f9a', '#e8603c']
