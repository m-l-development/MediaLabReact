import { isBaseKey, type BaseKey } from './layouts'
import { ASSETS, emptyDoc, L, MAX_TPL, refsOf, uid, type Doc, type Layer, type LayerType } from './model'

/** Kategori (felles for menigheten når ConnectHub er tilgjengelig): navn, standardoppsett og grunnoppsett. */
export interface Category {
  id: string
  name: string
  desc: string
  base: BaseKey
  baseDoc?: Doc | null
  baseName?: string
  defaultLayout?: string
  layouts?: { id: string; name: string; doc: Doc }[]
}

/** Personlig mal (maks 5 per kategori). */
export interface Template {
  id: string
  catId: string
  name: string
  doc: Doc
  thumb: string
  updated: number
}

export const DEFAULT_CATS: readonly Category[] = [
  { id: 'sunday', name: 'Søndagsmøte', desc: 'Svart bakgrunn med gult scenelys og stort navn.', base: 'sunday' },
  { id: 'kbs', name: 'Kveldsbibelskole', desc: 'Blå bakgrunn, bilde i bue og navnet i en hvit boks.', base: 'kbs' },
  { id: 'youth', name: 'Ungdomsmøte', desc: 'Mørk lilla med skrå fargeblokk og stor tittel.', base: 'youth' },
]

const isRec = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)

/** Kopierer bare kjente felt med riktig type (som dagens app). */
function cleanObj<T extends object>(dst: T, src: unknown): T {
  if (!isRec(src)) return dst
  const d = dst as Record<string, unknown>
  for (const k of Object.keys(d)) {
    const dv = d[k]
    const v = src[k]
    if (v === undefined || k === 'id') continue
    if (typeof v === 'number' && !Number.isFinite(v)) continue
    if (dv === null ? v === null || typeof v === 'string' : typeof v === typeof dv) d[k] = typeof v === 'string' ? v.slice(0, 2000) : v
  }
  return dst
}

const CH_REF = /^ch:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const M_REF = /^m:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Bildekilde etter kontroll. `local` gjør om lokale kilder (`db:`/`m:`) til nye (eller null når bildet ikke finnes).
 * Fellesmappe-referanser og gamle innebygde logoer beholdes.
 */
export type LocalMap = (src: string) => string | null

function cleanSrc(v: unknown, local: LocalMap): string | null {
  if (typeof v !== 'string') return null
  if (v.startsWith('asset:')) return ASSETS[v.slice(6)] ? v : null
  if (CH_REF.test(v)) return v
  if (v.startsWith('db:') || M_REF.test(v)) return local(v)
  return null
}

const LAYER_TYPES: readonly LayerType[] = ['text', 'image', 'shape', 'glow']

/** Kontrollerer et dokument fra fil, database eller menigheten. → null når det ikke er et dokument. */
export function cleanDoc(doc: unknown, local: LocalMap): Doc | null {
  if (!isRec(doc) || !Array.isArray(doc.layers) || !isRec(doc.bg)) return null
  const d = emptyDoc()
  cleanObj(d.bg, doc.bg)
  cleanObj(d.vig, doc.vig)
  if (typeof doc.lay === 'string' && /^[a-z]{1,20}$/.test(doc.lay)) d.lay = doc.lay
  if (!['color', 'gradient', 'image'].includes(d.bg.type)) d.bg.type = 'color'
  d.bg.src = cleanSrc(d.bg.src, local)
  d.bg.orig = null
  const layers = (doc.layers as unknown[]).filter((l): l is Record<string, unknown> => isRec(l) && LAYER_TYPES.includes(l.type as LayerType)).slice(0, 60)
  d.layers = layers.map((l) => {
    const n = cleanObj(L(l.type as LayerType), l) as Layer
    n.id = typeof l.id === 'string' && /^[a-z0-9]{1,40}$/i.test(l.id) ? l.id : uid()
    if (typeof l.link === 'string' && /^[a-z0-9]{1,40}$/i.test(l.link)) n.link = l.link
    if (n.type === 'text') {
      if (typeof l.barW === 'number' && Number.isFinite(l.barW)) n.barW = l.barW
      if (typeof l.barGap === 'number' && Number.isFinite(l.barGap)) n.barGap = l.barGap
    }
    if (n.type === 'image') {
      n.src = cleanSrc(n.src, local)
      n.orig = cleanSrc(n.orig, local)
    }
    return n
  })
  return d
}

export function cleanCategory(c: unknown, local: LocalMap): Category | null {
  if (!isRec(c) || typeof c.id !== 'string') return null
  const out: Category = {
    id: c.id.slice(0, 40),
    name: String(c.name ?? 'Kategori').slice(0, 40),
    desc: String(c.desc ?? '').slice(0, 200),
    base: isBaseKey(c.base) ? c.base : 'blank',
    baseDoc: c.baseDoc ? cleanDoc(c.baseDoc, local) : null,
  }
  if (typeof c.baseName === 'string' && c.baseName) out.baseName = c.baseName.slice(0, 40)
  if (typeof c.defaultLayout === 'string' && c.defaultLayout) out.defaultLayout = c.defaultLayout.slice(0, 40)
  if (Array.isArray(c.layouts)) {
    out.layouts = c.layouts.slice(0, 4).flatMap((l: unknown) => {
      if (!isRec(l) || typeof l.id !== 'string') return []
      const doc = cleanDoc(l.doc, local)
      return doc ? [{ id: l.id.slice(0, 40), name: String(l.name ?? 'Grunnoppsett').slice(0, 40), doc }] : []
    })
  }
  return out
}

/** Alle dokumentene i kategoriene og malene. */
export function docsOf(cats: readonly Category[], tpls: readonly Template[]): Doc[] {
  const out: Doc[] = []
  for (const c of cats) {
    if (c.baseDoc) out.push(c.baseDoc)
    for (const l of c.layouts ?? []) out.push(l.doc)
  }
  for (const t of tpls) out.push(t.doc)
  return out
}

/** Nøkkel i sikkerhetskopien for en lokal kilde (samme form som dagens app: `u` + bokstaver/tall). */
export const backupKey = (src: string): string => (src.startsWith('db:') ? src.slice(3) : 'u' + src.slice(2).replace(/-/g, ''))

function mapDocSrcs(doc: Doc, f: (src: string) => string): Doc {
  const d: Doc = JSON.parse(JSON.stringify(doc)) as Doc
  const m = (v: string | null | undefined) => (v ? f(v) : v ?? null)
  for (const l of d.layers) {
    if (l.type === 'image') {
      l.src = m(l.src)
      l.orig = m(l.orig)
    }
  }
  d.bg.src = m(d.bg.src)
  if (d.bg.orig) d.bg.orig = m(d.bg.orig)
  return d
}

/**
 * Sikkerhetskopi i dagens format (`app: 'thumbstudio', v: 1`), så den kan gjenopprettes i begge appene.
 * Lokale bilder legges ved som data-URL-er; Fellesmappe-bilder bare som referanse.
 */
export async function backup(cats: readonly Category[], tpls: readonly Template[], readBlob: (src: string) => Promise<Blob | null>, now = Date.now()): Promise<Blob> {
  const local = (s: string) => s.startsWith('m:') || s.startsWith('db:')
  const toKey = (s: string) => (local(s) ? 'db:' + backupKey(s) : s)
  const srcs = new Set<string>()
  for (const d of docsOf(cats, tpls)) for (const s of refsOf(d)) if (local(s)) srcs.add(s)
  const images: Record<string, string> = {}
  for (const s of srcs) {
    const b = await readBlob(s).catch(() => null)
    if (b) images[backupKey(s)] = await blobToData(b)
  }
  const outCats = cats.map((c) => ({
    ...c,
    baseDoc: c.baseDoc ? mapDocSrcs(c.baseDoc, toKey) : null,
    ...(c.layouts ? { layouts: c.layouts.map((l) => ({ ...l, doc: mapDocSrcs(l.doc, toKey) })) } : {}),
  }))
  const outTpls = tpls.map((t) => ({ ...t, doc: mapDocSrcs(t.doc, toKey) }))
  return new Blob([JSON.stringify({ app: 'thumbstudio', v: 1, date: now, cats: outCats, tpls: outTpls, images })], { type: 'application/json' })
}

/**
 * Leser en sikkerhetskopi. Bildene lagres med `putImage` (→ ny kilde, f.eks. `m:<id>`), og alle dokumenter kontrolleres.
 * Kaster Error('file') eller Error('format') når filen ikke kan brukes.
 */
export async function restore(file: File, putImage: (blob: Blob, key: string) => Promise<string | null>): Promise<{ cats: Category[]; tpls: Template[] }> {
  if (!file || file.size > 400 * 1024 * 1024 || !/\.json$/i.test(file.name || '')) throw new Error('file')
  let j: unknown
  try {
    j = JSON.parse(await file.text())
  } catch {
    throw new Error('format')
  }
  if (!isRec(j) || j.app !== 'thumbstudio' || !Array.isArray(j.cats) || !Array.isArray(j.tpls)) throw new Error('format')
  const images = isRec(j.images) ? j.images : {}
  const map = new Map<string, string>()
  for (const k of Object.keys(images)) {
    if (!/^u[a-z0-9]{4,40}$/i.test(k)) continue
    const b = dataToBlob(images[k])
    if (!b || b.size > 40 * 1024 * 1024) continue
    const src = await putImage(b, k)
    if (src) map.set('db:' + k, src)
  }
  const local: LocalMap = (s) => map.get(s) ?? (s.startsWith('m:') ? s : null)
  const cats = (j.cats as unknown[]).map((c) => cleanCategory(c, local)).filter((c): c is Category => !!c).slice(0, 30)
  const per = new Map<string, number>()
  const tpls: Template[] = []
  for (const t of j.tpls as unknown[]) {
    if (!isRec(t) || typeof t.id !== 'string' || typeof t.catId !== 'string' || !cats.some((c) => c.id === t.catId)) continue
    const n = (per.get(t.catId) ?? 0) + 1
    per.set(t.catId, n)
    if (n > MAX_TPL) continue
    const doc = cleanDoc(t.doc, local)
    if (!doc) continue
    tpls.push({
      id: t.id.slice(0, 40), catId: t.catId, name: String(t.name ?? 'Uten navn').slice(0, 60), doc,
      thumb: typeof t.thumb === 'string' && /^data:image\/(jpeg|png);base64,/.test(t.thumb) ? t.thumb : '',
      updated: typeof t.updated === 'number' && Number.isFinite(t.updated) ? t.updated : Date.now(),
    })
  }
  return { cats, tpls }
}

export async function blobToData(b: Blob): Promise<string> {
  const bytes = new Uint8Array(await b.arrayBuffer())
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return `data:${b.type || 'application/octet-stream'};base64,${btoa(bin)}`
}

export function dataToBlob(u: unknown): Blob | null {
  const m = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(typeof u === 'string' ? u : '')
  if (!m?.[1] || !m[2]) return null
  const bin = atob(m[2])
  const a = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i)
  return new Blob([a], { type: m[1] })
}
