import { COMBOS, luma, mapCol, type Combo, type Palette } from '../../thumbnail-studio/engine/colors'
import { newDoc, type PdDoc, type PdLayer } from './model'

/**
 * Fargepaletter for malene: samme kombinasjoner og samme fargeregler som «Velg farge» i Thumbnail Studio
 * (lyse flater får palettens lyse farge, mørke den mørke, aksenter aksentfargen). «Standard» = malens egne farger.
 */
export const PALETTES: readonly Combo[] = COMBOS
export const DEFAULT_PALETTE = 'default'

export const paletteOf = (k: string | null | undefined): Combo => PALETTES.find((p) => p.k === k) ?? (PALETTES[0] as Combo)

const HEX = /^#[0-9a-f]{6}$/i
/** Minste forskjell i lyshet (0–255) mellom tekst og det den står på. */
const MIN_CONTRAST = 70

function recolorLayer(L: PdLayer, P: Palette): void {
  const m = (v: string | null | undefined, use: 'bg' | 'fill' | 'acc' | 'text') => (typeof v === 'string' && v[0] === '#' ? mapCol(v, use, P) : v)
  if (L.type === 'text') {
    L.color = m(L.color, 'text') as string
    L.strokeC = m(L.strokeC, 'acc') as string
  } else if (L.type === 'shape') {
    L.fill = m(L.fill, 'fill') as string
    L.fill2 = m(L.fill2, 'fill') ?? null
    L.strokeC = m(L.strokeC, 'acc') as string
  } else if (L.type === 'glow') L.color = m(L.color, 'acc') as string
}

/** Fargen under punktet (x, y): øverste fylte form med hel farge under laget `below`, ellers bakgrunnen. null = et bilde. */
function under(layers: PdLayer[], below: number, bg: string | null, x: number, y: number): string | null {
  for (let i = below - 1; i >= 0; i--) {
    const L = layers[i] as PdLayer
    if (L.hidden || L.type === 'text' || L.type === 'glow' || L.type === 'fx') continue
    if (Math.abs(x - L.x) > L.w / 2 || Math.abs(y - L.y) > L.h / 2) continue
    if (L.type === 'image') return null
    if (L.type === 'shape') {
      // toning som går over til gjennomsiktig (fill uten farge, fill2 med farge): teksten står på fill2-fargen
      const f = HEX.test(L.fill) ? L.fill : L.fill2 && HEX.test(L.fill2) ? L.fill2 : null
      if (f && ((L.op ?? 1) >= 0.5 || !HEX.test(L.fill))) return f
    }
  }
  return bg && HEX.test(bg) ? bg : null
}

/**
 * Kontrast etter fargeleggingen: kombinasjonsreglene kan gi tekst i samme farge som flaten den står på (f.eks. mørk
 * tekst på en gul flate som begge blir palettens mørke farge). Da brukes den av palettens farger som skiller seg mest.
 */
function ensureContrast(layers: PdLayer[], bg: string | null, P: Palette): void {
  const pick = (base: string) => [P.fg, P.bg2, P.bg, P.acc].reduce((a, b) => (Math.abs(luma(b) - luma(base)) > Math.abs(luma(a) - luma(base)) ? b : a))
  layers.forEach((L, i) => {
    if (L.type === 'text' && HEX.test(L.color)) {
      const b = under(layers, i, bg, L.x, L.y)
      if (b && Math.abs(luma(L.color) - luma(b)) < MIN_CONTRAST) L.color = pick(b)
    } else if (L.type === 'shape' && L.strokeW > 0 && HEX.test(L.strokeC) && !HEX.test(L.fill)) {
      const b = under(layers, i, bg, L.x, L.y)
      if (b && Math.abs(luma(L.strokeC) - luma(b)) < MIN_CONTRAST) L.strokeC = pick(b)
    }
  })
}

/** Fargelegger et nytt dokument fra en mal med paletten `key` (begge sider). Endrer og returnerer dokumentet. */
export function applyPalette(d: PdDoc, key: string | null | undefined): PdDoc {
  const P = paletteOf(key).p
  if (!P) return d
  const bg = (v: string | null | undefined) => (typeof v === 'string' && v[0] === '#' ? mapCol(v, 'bg', P) : v ?? null)
  const side = (layers: PdLayer[], b: string | null) => {
    // toning over et bilde (delvis gjennomsiktig eller som går over til gjennomsiktig) beholder fargen: den skal gjøre
    // bildet mørkere så teksten kan leses, ikke vaske det ut med en lys palettfarge
    const toning = layers.map((L, i) => L.type === 'shape' && under(layers, i, null, L.x, L.y) === null && layers.slice(0, i).some((q) => q.type === 'image') && ((L.op ?? 1) < 0.9 || !HEX.test(L.fill)))
    layers.forEach((L, i) => {
      if (!toning[i]) recolorLayer(L, P)
    })
    ensureContrast(layers, b, P)
  }
  d.bg = bg(d.bg)
  if (d.bg2) d.bg2 = bg(d.bg2)
  side(d.layers, d.bg)
  if (d.back) {
    d.back.bg = bg(d.back.bg)
    side(d.back.layers, d.back.bg)
  }
  return d
}

/** Nytt dokument fra malen `tpl` i paletten `pal` (forhåndsvisning og «Ny fra mal» bruker samme). «Tomt» er alltid hvitt. */
export function tplDoc(w: number, h: number, tpl: string, pal: string | null | undefined, now?: number): PdDoc {
  const d = newDoc(w, h, tpl, now)
  return tpl === 'blank' ? d : applyPalette(d, pal)
}
