import type { Doc } from './model'

/** Fargekombinasjoner for «Ny mal» → «Velg farge» (samme som dagens app). */
export interface Palette { bg: string; bg2: string; fg: string; fill: string; acc: string; mid: string }
export interface Combo { k: string; name: string; sw: string[]; p?: Palette }

const RAW: { k: string; name: string; sw?: string[]; p?: Palette }[] = [
  { k: 'default', name: 'Standard', sw: ['#000000', '#f5b800', '#ffffff'] },
  { k: 'bw', name: 'Svart på hvit', p: { bg: '#ffffff', bg2: '#ececec', fg: '#111111', fill: '#dcdcdc', acc: '#5f5f5f', mid: '#9a9a9a' } },
  { k: 'wb', name: 'Hvit og svart', p: { bg: '#0d0d0d', bg2: '#000000', fg: '#ffffff', fill: '#2c2c2c', acc: '#c4c4c4', mid: '#7a7a7a' } },
  { k: 'by', name: 'Svart og gul', p: { bg: '#0d0d0d', bg2: '#000000', fg: '#ffd21f', fill: '#2e2a14', acc: '#ffd21f', mid: '#8a7a30' } },
  { k: 'ow', name: 'Oransje og hvit', p: { bg: '#ff6a13', bg2: '#d9500a', fg: '#ffffff', fill: '#a83a00', acc: '#1a1a1a', mid: '#ffb07a' } },
  { k: 'wr', name: 'Hvit og rød', p: { bg: '#ffffff', bg2: '#f2f2f2', fg: '#d7191f', fill: '#fde0e0', acc: '#d7191f', mid: '#ef9a9c' } },
  { k: 'guest', name: 'Gjest-farger', p: { bg: '#13315c', bg2: '#0b1d3a', fg: '#fff7ed', fill: '#ff6b4a', acc: '#ffb4a2', mid: '#c2410c' } },
  { k: 'violet', name: 'Hvit på mørk lilla/blå', p: { bg: '#2a1f6b', bg2: '#140f3d', fg: '#ffffff', fill: '#5b3fd1', acc: '#b9a8ff', mid: '#6d5fb0' } },
  { k: 'grr', name: 'Grå, rød og svart', p: { bg: '#3a3a3a', bg2: '#121212', fg: '#ffffff', fill: '#c8102e', acc: '#ff5a67', mid: '#8c8c8c' } },
  { k: 'wbl', name: 'Hvit og blå', p: { bg: '#0b4fd6', bg2: '#083a9e', fg: '#ffffff', fill: '#062c78', acc: '#cfe0ff', mid: '#6f9cf0' } },
  { k: 'wg', name: 'Hvit på grønn', p: { bg: '#0f6b3f', bg2: '#07472a', fg: '#ffffff', fill: '#0b5132', acc: '#b8f5cf', mid: '#5fb488' } },
]

export const COMBOS: readonly Combo[] = RAW.map((c) => ({ ...c, sw: c.p ? [c.p.bg, c.p.fill, c.p.fg] : (c.sw ?? []) }))

const HEX = /^#[0-9a-f]{6}$/i

export function hexRgb(c: string | null | undefined): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(c ?? '')
  const n = m?.[1] ? parseInt(m[1], 16) : 0
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function rgba(c: string, a: number): string {
  const [r, g, b] = hexRgb(c)
  return `rgba(${r},${g},${b},${a})`
}

/** Opplevd lyshet 0–255 (samme formel som dagens app). */
export function luma(c: string | null | undefined): number {
  if (!c || !HEX.test(c)) return 0
  const [r, g, b] = hexRgb(c)
  return 0.299 * r + 0.587 * g + 0.114 * b
}

/** Tekstfarge som syns på fargen. */
export const ink = (c: string): string => (HEX.test(c) && luma(c) > 150 ? '#111111' : HEX.test(c) ? '#ffffff' : '#111111')

function hsl(h: string): { l: number; s: number } | null {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(h || '')
  if (!m?.[1]) return null
  let s = m[1]
  if (s.length === 3) s = s.replace(/./g, '$&$&')
  const r = parseInt(s.slice(0, 2), 16) / 255
  const g = parseInt(s.slice(2, 4), 16) / 255
  const b = parseInt(s.slice(4, 6), 16) / 255
  const mx = Math.max(r, g, b)
  const mn = Math.min(r, g, b)
  const l = (mx + mn) / 2
  const d = mx - mn
  return { l, s: d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1)) }
}

export function mapCol(h: string, use: 'bg' | 'fill' | 'acc' | 'text', P: Palette): string {
  const c = hsl(h)
  if (!c) return h
  const neu = c.s < 0.2
  const dark = c.l < (neu ? 0.35 : 0.3)
  const light = c.l > (neu ? 0.7 : 0.8)
  if (use === 'bg') return light ? P.fg : c.l < 0.2 ? P.bg2 : P.bg
  if (dark) return use === 'fill' ? P.bg2 : P.bg
  if (light) return P.fg
  if (neu) return P.mid
  return use === 'fill' ? P.fill : P.acc
}

/** Fargelegger et oppsett med en kombinasjon (endrer dokumentet og returnerer det). */
export function recolor(doc: Doc, key: string): Doc {
  const P = COMBOS.find((c) => c.k === key)?.p
  if (!P) return doc
  const bg = doc.bg as unknown as Record<string, unknown>
  for (const k of ['color', 'c1', 'c2']) if (typeof bg[k] === 'string') bg[k] = mapCol(bg[k], 'bg', P)
  for (const l of doc.layers) {
    const o = l as unknown as Record<string, unknown>
    for (const k of Object.keys(o)) {
      const v = o[k]
      if (typeof v !== 'string' || v[0] !== '#' || k === 'id' || k === 'src') continue
      const use = /fill|^barColor$/.test(k) ? 'fill' : l.type === 'glow' || /stroke|border|tint/i.test(k) ? 'acc' : 'text'
      o[k] = mapCol(v, use, P)
    }
  }
  return doc
}

/** Fargene og fontene i et grunnoppsett («profilen»), brukt først i fargevelgere og fontlisten. */
export function profileOf(d: Doc): { colors: string[]; fonts: string[] } {
  const cs: string[] = []
  const fs: string[] = []
  const add = (v: unknown) => {
    if (typeof v === 'string' && HEX.test(v)) {
      const x = v.toLowerCase()
      if (!cs.includes(x)) cs.push(x)
    }
  }
  if (d.bg.type === 'color') add(d.bg.color)
  else if (d.bg.type === 'gradient') {
    add(d.bg.c1)
    add(d.bg.c2)
  }
  for (const l of d.layers) {
    if (l.type === 'text') {
      add(l.color)
      if (l.bar) add(l.barColor)
      if (!fs.includes(l.font)) fs.push(l.font)
    } else if (l.type === 'shape') {
      add(l.fill)
      add(l.fill2)
      if (l.stroke > 0) add(l.strokeColor)
    } else if (l.type === 'image') {
      add(l.tint)
      if (l.border > 0) add(l.borderColor)
    } else add(l.color)
  }
  return { colors: cs.slice(0, 10), fonts: fs }
}
