import { clamp, type Quad } from './geometry'
import type { MockupInfo } from './render'

export type MockupCategory = 'phone' | 'laptop' | 'screen' | 'print' | 'other' | 'collab'

export interface MockupEntry extends MockupInfo {
  /** Bildeadresse (innebygd fil, object-URL eller skyadresse). */
  src: string
  name: string
  cat: MockupCategory
  /** Hvor mockupen kommer fra: innebygd, mappen /mockups, egen (Dine medier), Fellesmappe eller Samarbeidsfiler. */
  source: 'builtin' | 'folder' | 'own' | 'cloud' | 'collab'
}

const CATS: readonly [MockupCategory, RegExp][] = [
  ['phone', /^(iphone|phone|mobil|android)/],
  ['laptop', /^(macbook|laptop)/],
  ['screen', /^(imac|tv|monitor|skjerm|screen)/],
  ['print', /^(card|paper|poster|kort|papir|flyer|book)/],
]

export function categoryOf(fileName: string): MockupCategory {
  const n = fileName.toLowerCase()
  return CATS.find(([, re]) => re.test(n))?.[0] ?? 'other'
}

/** «iphone-hand.jpg» → «Iphone Hand» (som i dag). */
export function niceName(fileName: string): string {
  return fileName.replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

/** De innebygde bildene er kjente, så galleriet virker selv om index.json mangler på serveren. */
const BUILTIN_FALLBACK = ['card-black-hand', 'card-white-hand', 'imac-desk', 'imac-white', 'iphone-angled', 'iphone-desk', 'iphone-hand', 'macbook-air', 'macbook-pro', 'paper-marble', 'tv-livingroom', 'tv-wall']

interface ConfigEntry { name?: unknown; cat?: unknown; corners?: unknown; aspect?: unknown; keepHoles?: unknown; occl?: unknown; shadowMin?: unknown; lit?: unknown }

function parseCorners(v: unknown): Quad | null {
  if (!Array.isArray(v) || v.length !== 4) return null
  const ok = v.every((p) => Array.isArray(p) && p.length === 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]))
  return ok ? (v.map((p: number[]) => [clamp(Number(p[0]), 0, 1), clamp(Number(p[1]), 0, 1)]) as Quad) : null
}

async function json(url: string): Promise<unknown> {
  try {
    const r = await fetch(url, { cache: 'no-cache' })
    return r.ok ? await r.json() : null
  } catch {
    return null
  }
}

/** Leser en mappe med mockup-bilder: `index.json` (filliste) og valgfri `config.json` (hjørner m.m.). */
export async function loadFolder(root: string, source: 'builtin' | 'folder'): Promise<MockupEntry[]> {
  const idx = await json(`${root}index.json`)
  const list = Array.isArray(idx) ? idx : Array.isArray((idx as { files?: unknown } | null)?.files) ? (idx as { files: unknown[] }).files : []
  let files = list.filter((f): f is string => typeof f === 'string' && /\.(jpe?g|png|webp)$/i.test(f))
  if (!files.length && source === 'builtin') files = BUILTIN_FALLBACK.map((n) => `${root}${n}.jpg`)
  const cfg = ((await json(`${root}config.json`)) ?? {}) as Record<string, ConfigEntry>
  return files.map((f) => {
    const file = f.split('/').pop() ?? f
    const c = cfg[file] ?? {}
    const id = file.replace(/\.[a-z0-9]+$/i, '')
    const aspect = Number(c.aspect)
    return {
      id: source === 'folder' ? `dir-${id}` : id,
      src: f.startsWith('/') ? f : `/${f.includes('/') ? f : root.replace(/^\//, '') + f}`,
      name: typeof c.name === 'string' ? c.name.slice(0, 60) : niceName(file),
      cat: typeof c.cat === 'string' ? (c.cat as MockupCategory) : categoryOf(file),
      corners: parseCorners(c.corners),
      aspect: Number.isFinite(aspect) && aspect > 0.1 && aspect < 10 ? aspect : null,
      keepHoles: !!c.keepHoles,
      ...(c.lit === false ? { lit: false } : {}),
      ...(Number(c.shadowMin) > 0 && Number(c.shadowMin) < 1 ? { shadowMin: Number(c.shadowMin) } : {}),
      occl: c.occl !== false,
      source,
    }
  })
}

/** Innebygde (/images/mockups/) + brukerens mappe (/mockups/), uten duplikater (samme filnavn). */
export async function loadBuiltin(): Promise<MockupEntry[]> {
  const [builtin, folder] = await Promise.all([loadFolder('/images/mockups/', 'builtin'), loadFolder('/mockups/', 'folder')])
  const seen = new Set(builtin.map((m) => m.src.split('/').pop()))
  return [...builtin, ...folder.filter((m) => !seen.has(m.src.split('/').pop()))]
}
