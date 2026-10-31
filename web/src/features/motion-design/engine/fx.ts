/**
 * Effekter (Avansert): en ordnet liste per klipp (hovedspor og videospor/overlegg), lagret i prosjektet. Fargeeffektene
 * blir en del av den eksisterende filterkjeden i render.ts (canvas-filter, eller pikseloperasjoner der nettleseren ikke
 * har canvas-filter), i listens rekkefølge; opasitet og fade virker på gjennomsiktigheten. Forhåndsvisning og eksport
 * tegner med de samme funksjonene, så effektene blir like i begge.
 */

export type FxKind = 'bri' | 'con' | 'sat' | 'hue' | 'bw' | 'sepia' | 'blur' | 'opacity' | 'fade'

export interface Effect {
  id: string
  kind: FxKind
  /** Av = effekten tegnes ikke, men innstillingene beholdes. */
  on: boolean
  v: number
  /** Andre verdi (fade: sekunder ut; v = sekunder inn). */
  v2?: number
}

export interface FxDef { l: string; min: number; max: number; step: number; def: number; unit: string; l2?: string; def2?: number }

/** Effektene som finnes (alle har virkning i forhåndsvisning og eksport). */
export const FX_DEFS: Record<FxKind, FxDef> = {
  bri: { l: 'Lysstyrke', min: -1, max: 1, step: 0.01, def: 0.2, unit: '%' },
  con: { l: 'Kontrast', min: -1, max: 1, step: 0.01, def: 0.2, unit: '%' },
  sat: { l: 'Metning', min: -1, max: 1, step: 0.01, def: 0.3, unit: '%' },
  hue: { l: 'Fargetone', min: -180, max: 180, step: 1, def: 30, unit: '°' },
  bw: { l: 'Svart-hvitt', min: 0, max: 1, step: 0.01, def: 1, unit: '%' },
  sepia: { l: 'Sepia', min: 0, max: 1, step: 0.01, def: 0.8, unit: '%' },
  blur: { l: 'Uskarphet', min: 0, max: 40, step: 0.5, def: 6, unit: 'px' },
  opacity: { l: 'Opasitet', min: 0, max: 1, step: 0.01, def: 0.6, unit: '%' },
  fade: { l: 'Fade inn', min: 0, max: 10, step: 0.1, def: 1, unit: 's', l2: 'Fade ut', def2: 1 },
}
export const FX_KINDS = Object.keys(FX_DEFS) as FxKind[]

const isRec = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const cl = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v)

/** Kontroll av lagrede effekter (ukjente typer og ugyldige verdier fjernes). undefined = ingen. */
export function cleanEffects(v: unknown): Effect[] | undefined {
  if (!Array.isArray(v)) return undefined
  const out: Effect[] = []
  const seen = new Set<string>()
  for (const x of v.slice(0, 24)) {
    if (!isRec(x) || typeof x.kind !== 'string' || !(x.kind in FX_DEFS)) continue
    const k = x.kind as FxKind
    const d = FX_DEFS[k]
    const id = typeof x.id === 'string' && x.id && !seen.has(x.id) ? x.id.slice(0, 40) : `e-${out.length}-${k}`
    seen.add(id)
    const n = Number(x.v)
    const e: Effect = { id, kind: k, on: x.on !== false, v: cl(Number.isFinite(n) ? n : d.def, d.min, d.max) }
    if (d.l2) {
      const n2 = Number(x.v2)
      e.v2 = cl(Number.isFinite(n2) ? n2 : (d.def2 ?? 0), d.min, d.max)
    }
    out.push(e)
  }
  return out.length ? out : undefined
}

/** Ny effekt med standardverdier. */
export function newEffect(kind: FxKind, id: string): Effect {
  const d = FX_DEFS[kind]
  return d.l2 ? { id, kind, on: true, v: d.def, v2: d.def2 ?? 0 } : { id, kind, on: true, v: d.def }
}

const f3 = (n: number) => n.toFixed(3)

/** Fargeeffektene som canvas-filter, i listens rekkefølge (uskarphet er med i blur-summen, se fxBlur). */
export function fxFilter(list: readonly Effect[] | undefined, val: (e: Effect) => number = (e) => e.v): string {
  if (!list?.length) return ''
  const f: string[] = []
  for (const e of list) {
    if (!e.on) continue
    const v = val(e)
    if (e.kind === 'bri' && v) f.push(`brightness(${f3(1 + v)})`)
    else if (e.kind === 'con' && v) f.push(`contrast(${f3(1 + v)})`)
    else if (e.kind === 'sat' && v) f.push(`saturate(${f3(1 + v)})`)
    else if (e.kind === 'hue' && v) f.push(`hue-rotate(${v.toFixed(1)}deg)`)
    else if (e.kind === 'bw' && v > 0) f.push(`grayscale(${f3(v)})`)
    else if (e.kind === 'sepia' && v > 0) f.push(`sepia(${f3(v)})`)
  }
  return f.join(' ')
}

/** Samlet uskarphet (px) fra effektene som er på. */
export function fxBlur(list: readonly Effect[] | undefined, val: (e: Effect) => number = (e) => e.v): number {
  let b = 0
  for (const e of list ?? []) if (e.on && e.kind === 'blur') b += Math.max(0, val(e))
  return b
}

/** Gjennomsiktighet fra opasitet og fade (lt = tid i klippet, dur = klippets lengde på tidslinjen). */
export function fxAlpha(list: readonly Effect[] | undefined, lt: number, dur: number, val: (e: Effect) => number = (e) => e.v): number {
  let a = 1
  for (const e of list ?? []) {
    if (!e.on) continue
    if (e.kind === 'opacity') a *= cl(val(e), 0, 1)
    else if (e.kind === 'fade') {
      const fi = Math.max(0, e.v)
      const fo = Math.max(0, e.v2 ?? 0)
      if (fi > 0) a *= cl(lt / fi, 0, 1)
      if (fo > 0) a *= cl((dur - lt) / fo, 0, 1)
    }
  }
  return a
}
