/**
 * Bildeserie (batchredigering): mange separate bilder i ett Photo Design-prosjekt – ikke lag i samme lerret. Hvert bilde
 * har egne justeringer (Adj), look og avansert framkalling (Dev). Bildet som er åpent, vises som ett låst bildelag; når du
 * bytter bilde, skrives lagets innstillinger tilbake til bildet (syncBatch) og neste bilde lastes inn.
 */
import { ADJ, imageLayer, uid, type Adj, type ImageLayer, type PdDoc } from './model'
import { cleanDev, devNeutral, type Dev } from './develop'

export interface BatchItem {
  id: string
  /** Originalen i Dine medier (`m:<id>`). */
  src: string
  /** Filnavnet ved import (med endelse). */
  name: string
  w: number
  h: number
  adj: Adj
  look: string
  dev: Dev | null
  /** Liten JPEG av originalen (data-URL) til filmstripen. */
  thumb: string
}

export interface Batch {
  items: BatchItem[]
  /** Indeksen til bildet som er åpent. */
  active: number
  /** Bilder som er valgt for batchhandlinger (ID-er). */
  sel: string[]
}

/** Største bildeserie (miniatyrene lagres i prosjektet). */
export const BATCH_MAX = 500
/** Lengste side på miniatyrene i filmstripen. */
export const THUMB = 200
/** Lengste side på et bilde i serien (lerretsgrense i nettleserne). */
const MAX_SIDE = 8000

const isRec = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const ident = (c: unknown) => !Array.isArray(c) || c.every((p) => Array.isArray(p) && Math.abs(Number(p[0]) - Number(p[1])) < 1e-3)

/** Er bildet endret (look, justeringer, kurver eller framkalling)? */
export function isEdited(it: Pick<BatchItem, 'adj' | 'look' | 'dev'>): boolean {
  if ((it.look || 'none') !== 'none') return true
  const a = { ...ADJ, ...it.adj }
  for (const k of Object.keys(ADJ) as (keyof Adj)[]) if (k !== 'curve' && Number(a[k] ?? 0) !== Number(ADJ[k] ?? 0)) return true
  if (!ident(a.curve) || !ident(a.curveR) || !ident(a.curveB) || !ident(a.curveG)) return true
  return !devNeutral(it.dev)
}

/** Bildets mål i serien (begrenset til MAX_SIDE, samme sideforhold). */
export function fitSide(w: number, h: number): [number, number] {
  const k = Math.min(1, MAX_SIDE / Math.max(w, h, 1))
  return [Math.max(1, Math.round(w * k)), Math.max(1, Math.round(h * k))]
}

function cleanAdj(v: unknown): Adj {
  const out: Adj = { ...ADJ }
  if (!isRec(v)) return out
  for (const k of Object.keys(ADJ) as (keyof Adj)[]) if (k !== 'curve' && Number.isFinite(Number(v[k]))) (out as unknown as Record<string, number>)[k] = Number(v[k])
  for (const k of ['curve', 'curveR', 'curveG', 'curveB'] as const) {
    const c = v[k]
    if (Array.isArray(c) && c.length >= 2 && c.length <= 16 && c.every((p) => Array.isArray(p) && p.length === 2 && p.every((x) => Number.isFinite(Number(x))))) {
      out[k] = c.map((p) => [Number(p[0]), Number(p[1])] as [number, number])
    }
  }
  return out
}

/** Kontroll av en lagret bildeserie (ukjente felt og ugyldige bilder fjernes). null = ingen serie. */
export function cleanBatch(v: unknown): Batch | null {
  if (!isRec(v) || !Array.isArray(v.items)) return null
  const items: BatchItem[] = []
  const seen = new Set<string>()
  for (const x of v.items.slice(0, BATCH_MAX)) {
    if (!isRec(x) || typeof x.id !== 'string' || seen.has(x.id) || typeof x.src !== 'string' || !(Number(x.w) > 0) || !(Number(x.h) > 0)) continue
    seen.add(x.id)
    items.push({
      id: x.id.slice(0, 40), src: x.src.slice(0, 200), name: typeof x.name === 'string' ? x.name.slice(0, 180) : 'bilde', w: Math.round(Number(x.w)), h: Math.round(Number(x.h)),
      adj: cleanAdj(x.adj), look: typeof x.look === 'string' ? x.look.slice(0, 20) : 'none', dev: cleanDev(x.dev),
      thumb: typeof x.thumb === 'string' && /^data:image\/(jpeg|png);base64,/.test(x.thumb) ? x.thumb : '',
    })
  }
  const ids = new Set(items.map((x) => x.id))
  const active = Math.max(0, Math.min(items.length - 1, Math.round(Number(v.active) || 0)))
  return { items, active: items.length ? active : 0, sel: Array.isArray(v.sel) ? v.sel.filter((x): x is string => typeof x === 'string' && ids.has(x)) : [] }
}

/** Bildelaget for et bilde i serien: fyller hele lerretet og er låst (det er ett bilde, ikke et oppsett). */
export function batchLayer(it: BatchItem): ImageLayer {
  return imageLayer({ id: uid('i'), name: it.name.replace(/\.[a-z0-9]+$/i, '').slice(0, 40) || 'Bilde', src: it.src, x: it.w / 2, y: it.h / 2, w: it.w, h: it.h, adj: { ...ADJ, ...it.adj }, look: it.look || 'none', dev: it.dev ? { ...it.dev } : null, locked: true })
}

/** Skriver innstillingene fra det åpne bildelaget tilbake til bildet i serien. */
export function syncBatch(d: PdDoc): PdDoc {
  const b = d.batch
  const it = b?.items[b.active]
  const L = d.layers.find((q): q is ImageLayer => q.type === 'image')
  if (!b || !it || !L || L.src !== it.src) return d
  const items = b.items.slice()
  items[b.active] = { ...it, adj: { ...ADJ, ...L.adj }, look: L.look || 'none', dev: cleanDev(L.dev) }
  return { ...d, batch: { ...b, items } }
}

/** Filnavnene i ZIP-arkivet: originalnavnet med ny endelse (unike navn ordnes av ZIP-skriveren). */
export function exportName(name: string, fmt: 'jpg' | 'png'): string {
  const base = name.replace(/\.[a-z0-9]{1,5}$/i, '').trim() || 'bilde'
  return `${base}.${fmt}`
}

/** Ny, tom bildeserie som eget prosjekt. */
export function batchDoc(name: string, now: number): PdDoc {
  return { id: uid('p'), name, w: 1080, h: 1080, bg: null, layers: [], created: now, updated: now, batch: { items: [], active: 0, sel: [] } }
}
