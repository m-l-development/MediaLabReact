import { COMBOS, luma, type Combo } from '../../thumbnail-studio/engine/colors'
import { newDoc, type PdDoc, type PdLayer, type Scheme, type TplColors } from './model'

/**
 * Farger i malene: tre farger (`c`) og hvilken av dem som er bakgrunn, tekst og støttefarge (`r`). null = malens egne
 * farger («Standard»). Ferdige kombinasjoner er de samme som «Velg farge» i Thumbnail Studio (bakgrunn, tekst, aksent).
 *
 * Hvert lag husker malens opprinnelige farger (`tc`), og dokumentet bakgrunnen (`bg0`). Fargene regnes alltid ut fra
 * dem, så du kan bytte farger og rekkefølge så ofte du vil uten at noe forskyves – og en farge du har endret selv på
 * et lag, røres ikke.
 */
export const PALETTES: readonly Combo[] = COMBOS
export const ROLES = ['bg', 'text', 'off'] as const
export type Role = (typeof ROLES)[number]

const HEX = /^#[0-9a-f]{6}$/i
/** Minste forskjell i lyshet (0–255) mellom tekst og det den står på; under dette byttes tekstfargen. */
export const MIN_CONTRAST = 70

export const paletteOf = (k: string | null | undefined): Combo => PALETTES.find((p) => p.k === k) ?? (PALETTES[0] as Combo)

/** Ferdig kombinasjon → tre farger (bakgrunn, tekst, støtte). «Standard» → null (malens egne farger). */
export function schemeOfPreset(k: string): Scheme | null {
  const p = paletteOf(k).p
  return p ? { k: paletteOf(k).k, c: [p.bg, p.fg, p.acc], r: [0, 1, 2] } : null
}

/** Startfargene når du lager egne farger fra «Standard»: rød, hvit og rosa. */
export const STARTER: Scheme = { k: 'custom', c: ['#d7191f', '#ffffff', '#f6c1c7'], r: [0, 1, 2] }

export function validScheme(v: unknown): v is Scheme {
  const s = v as Scheme
  return !!s && Array.isArray(s.c) && s.c.length === 3 && s.c.every((x) => typeof x === 'string' && HEX.test(x))
    && Array.isArray(s.r) && s.r.length === 3 && s.r.every((i) => i === 0 || i === 1 || i === 2)
}

export function rolesOf(s: Scheme): Record<Role, string> {
  return { bg: s.c[s.r[0]] as string, text: s.c[s.r[1]] as string, off: s.c[s.r[2]] as string }
}

/** Alle seks rekkefølgene av de tre fargene (hurtigvalg). */
export const ORDERS: readonly [number, number, number][] = [[0, 1, 2], [1, 0, 2], [2, 0, 1], [0, 2, 1], [1, 2, 0], [2, 1, 0]]

/** Ny rolle: fargen `ci` til rollen `role`. Brukes fargen allerede i en annen rolle, bytter de to plass (ingen dobbel). */
export function assignRole(s: Scheme, role: Role, ci: number): Scheme {
  const ri = ROLES.indexOf(role)
  const r = [...s.r] as Scheme['r']
  const other = r.indexOf(ci)
  if (other >= 0 && other !== ri) r[other] = r[ri] as number
  r[ri] = ci
  return { ...s, k: 'custom', r }
}

function hexRgb(h: string): [number, number, number] {
  const n = parseInt(h.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
function mix(a: string, b: string, t: number): string {
  const A = hexRgb(a), B = hexRgb(b)
  return '#' + A.map((v, i) => Math.round(v + ((B[i] as number) - v) * t).toString(16).padStart(2, '0')).join('')
}
function sat(h: string): number {
  const [r, g, b] = hexRgb(h).map((v) => v / 255) as [number, number, number]
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn
  return d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1))
}

const colorsOf = (L: PdLayer): TplColors =>
  L.type === 'text' ? { color: L.color, strokeC: L.strokeC } : L.type === 'shape' ? { fill: L.fill, fill2: L.fill2, strokeC: L.strokeC } : L.type === 'glow' ? { color: L.color } : {}

/** Toning over et bilde (delvis gjennomsiktig eller som går over til gjennomsiktig): beholder malens farge. */
function isToning(layers: PdLayer[], i: number): boolean {
  const L = layers[i] as PdLayer
  if (L.type !== 'shape') return false
  const onImage = layers.slice(0, i).some((q) => q.type === 'image' && Math.abs(L.x - q.x) <= q.w / 2 && Math.abs(L.y - q.y) <= q.h / 2)
  return onImage && ((L.op ?? 1) < 0.9 || !HEX.test(L.fill))
}

/** Fargen under punktet (x, y): øverste fylte form under laget `below`, ellers bakgrunnen. null = et bilde. */
function under(layers: PdLayer[], cols: Map<string, TplColors>, below: number, bg: string | null, x: number, y: number): string | null {
  for (let i = below - 1; i >= 0; i--) {
    const L = layers[i] as PdLayer
    if (L.hidden || L.type === 'text' || L.type === 'glow' || L.type === 'fx') continue
    if (Math.abs(x - L.x) > L.w / 2 || Math.abs(y - L.y) > L.h / 2) continue
    if (L.type === 'image') return null
    if (L.type === 'shape') {
      const c = cols.get(L.id) ?? {}
      const fill = c.fill ?? L.fill, fill2 = c.fill2 === undefined ? L.fill2 : c.fill2
      const f = HEX.test(fill) ? fill : fill2 && HEX.test(fill2) ? fill2 : null
      if (f && ((L.op ?? 1) >= 0.5 || !HEX.test(fill))) return f
    }
  }
  return bg && HEX.test(bg) ? bg : null
}

/**
 * Fargene en side får med fargevalget `s` (regnet ut fra malens opprinnelige farger): bakgrunnen → bakgrunnsfarge,
 * aksenter (mettede farger, strek, lys) → støttefarge, nøytrale flater og tekst som skiller seg fra bakgrunnen → tekstfarge,
 * dempet tekst → en blanding av tekst og bakgrunn. Til slutt sikres lesbar tekst mot flaten den står på.
 */
function sideColors(layers: PdLayer[], bg0: string | null, s: Scheme | null): { bg: string | null; cols: Map<string, TplColors> } {
  const cols = new Map<string, TplColors>()
  for (const L of layers) cols.set(L.id, { ...(L.tc ?? colorsOf(L)) })
  if (!s) return { bg: bg0, cols }
  const R = rolesOf(s)
  const mid = mix(R.text, R.bg, 0.35)
  const tB = bg0 && HEX.test(bg0) ? bg0 : '#ffffff'
  const map = (h: string | null | undefined, kind: 'text' | 'fill' | 'accent'): string | null | undefined => {
    if (typeof h !== 'string' || !HEX.test(h)) return h
    const dl = Math.abs(luma(h) - luma(tB))
    if (kind === 'accent') return sat(h) >= 0.25 ? R.off : dl < 40 ? R.bg : R.text
    if (sat(h) >= 0.25) return R.off
    if (dl < 40) return R.bg
    // dempet (grå mellomtone) tekst, f.eks. undertekster: en blanding av tekst- og bakgrunnsfargen
    if (kind === 'text' && luma(h) > 55 && luma(h) < 205) return mid
    return R.text
  }
  layers.forEach((L, i) => {
    if (isToning(layers, i)) return
    const o = cols.get(L.id) as TplColors
    if (L.type === 'text') {
      o.color = map(o.color, 'text') as string
      o.strokeC = map(o.strokeC, 'accent') as string
    } else if (L.type === 'shape') {
      o.fill = map(o.fill, 'fill') as string
      o.fill2 = map(o.fill2, 'fill') ?? null
      o.strokeC = map(o.strokeC, 'accent') as string
    } else if (L.type === 'glow') o.color = map(o.color, 'accent') as string
  })
  const bg = HEX.test(bg0 ?? '') ? R.bg : bg0
  // lesbar tekst: står teksten på en flate i nesten samme lyshet, brukes den av fargene som skiller seg mest
  const cand = [R.bg, R.text, R.off, mid, '#ffffff', '#111111']
  const pick = (base: string) => cand.reduce((a, b) => (Math.abs(luma(b) - luma(base)) > Math.abs(luma(a) - luma(base)) ? b : a))
  layers.forEach((L, i) => {
    const o = cols.get(L.id) as TplColors
    if (L.type === 'text' && o.color && HEX.test(o.color)) {
      const b = under(layers, cols, i, bg, L.x, L.y)
      if (b && Math.abs(luma(o.color) - luma(b)) < MIN_CONTRAST) o.color = pick(b)
    } else if (L.type === 'shape' && L.strokeW > 0 && o.strokeC && HEX.test(o.strokeC) && !HEX.test(o.fill ?? '')) {
      const b = under(layers, cols, i, bg, L.x, L.y)
      if (b && Math.abs(luma(o.strokeC) - luma(b)) < MIN_CONTRAST) o.strokeC = pick(b)
    }
  })
  return { bg, cols }
}

function applySide(layers: PdLayer[], bgNow: string | null, bg0: string | null, prev: Scheme | null, next: Scheme | null): { layers: PdLayer[]; bg: string | null } {
  // malens opprinnelige farger tas vare på første gang (også for prosjekter som ble laget før fargevalget fantes)
  const base = layers.map((L) => (L.tc ? L : ({ ...L, tc: colorsOf(L) } as PdLayer)))
  const was = sideColors(base, bg0, prev)
  const now = sideColors(base, bg0, next)
  const out = base.map((L) => {
    const a = was.cols.get(L.id) ?? {}, b = now.cols.get(L.id) ?? {}
    const o: Record<string, unknown> = { ...L }
    for (const k of ['color', 'fill', 'fill2', 'strokeC'] as const) {
      if (!(k in b)) continue
      // bare felt som fortsatt har fargen det forrige valget ga (ellers har du endret det selv)
      if ((L as unknown as Record<string, unknown>)[k] === (a as Record<string, unknown>)[k]) o[k] = (b as Record<string, unknown>)[k]
    }
    return o as unknown as PdLayer
  })
  return { layers: out, bg: bgNow === was.bg ? now.bg : bgNow }
}

/** Bruker fargevalget `s` (null = malens egne farger) på dokumentet (begge sider). Returnerer et nytt dokument. */
export function applyScheme(d: PdDoc, s: Scheme | null): PdDoc {
  const prev = d.scheme ?? null
  const bg0 = d.bg0 === undefined ? d.bg : d.bg0
  const front = applySide(d.layers, d.bg, bg0, prev, s)
  const out: PdDoc = { ...d, bg: front.bg, bg0, layers: front.layers, scheme: s }
  if (d.back) {
    const b0 = d.back.bg0 === undefined ? d.back.bg : d.back.bg0
    const back = applySide(d.back.layers, d.back.bg, b0, prev, s)
    out.back = { ...d.back, bg: back.bg, bg0: b0, layers: back.layers }
  }
  return out
}

/** Nytt dokument fra malen `tpl` med fargevalget `s` (forhåndsvisning og «Ny fra mal»). «Tomt» får ingen farger. */
export function tplDoc(w: number, h: number, tpl: string, s: Scheme | null, now?: number): PdDoc {
  const d = { ...newDoc(w, h, tpl, now), tplK: tpl }
  return tpl === 'blank' || !s ? d : applyScheme(d, s)
}

/**
 * Fargene mens du drar i fargevelgeren: sendes rett til lerretene (miniatyrene på startsiden, editorens lerret), uten
 * React-oppdatering, tilstand eller lagring. `undefined` = dragningen er slutt (lerretene bruker det lagrede valget igjen).
 * Profilen viste at hver dragbevegelse ellers rendret hele startsiden/editoren og alle miniatyrene på nytt.
 */
type LiveFn = (scope: 'home' | 'doc', s: Scheme | null | undefined) => void
const liveSubs = new Set<LiveFn>()
export const liveScheme = {
  set(scope: 'home' | 'doc', s: Scheme | null | undefined): void {
    for (const f of liveSubs) f(scope, s)
  },
  sub(f: LiveFn): () => void {
    liveSubs.add(f)
    return () => {
      liveSubs.delete(f)
    }
  },
}

/** Lav kontrast mellom tekst og bakgrunn i valget (vises som et varsel; teksten justeres automatisk der det trengs). */
export const lowContrast = (s: Scheme): boolean => Math.abs(luma(rolesOf(s).text) - luma(rolesOf(s).bg)) < MIN_CONTRAST
