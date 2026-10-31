/**
 * Keyframes (Avansert): animasjon av egenskaper over tid, per klipp (hovedspor, videospor) og tekst. Tiden i en keyframe
 * er sekunder fra elementets start på tidslinjen, så animasjonen følger klippet når det flyttes. Ved trimming av starten
 * og deling forskyves keyframes sammen med innholdet (shiftKeys); keyframes som havner utenfor klippet, beholdes (de
 * virker ikke, men vises i panelet og kan flyttes tilbake). Ved endret hastighet skaleres tidene (scaleKeys).
 * animAt gir elementet med de animerte verdiene; render.ts bruker det for både forhåndsvisning og eksport.
 */
import type { Effect } from './fx'

export type Ease = 'lin' | 'ease' | 'hold'
export interface Key { t: number; v: number; e?: Ease }
export type Keys = Record<string, Key[]>

export type KfKind = 'clip' | 'ov' | 'text'
/** [egenskap, navn, min, maks, steg]. `op` (klipp) er bare animerbar (grunnverdi 1). */
export type PropDef = readonly [string, string, number, number, number]
export const KF_PROPS: Record<KfKind, readonly PropDef[]> = {
  clip: [['x', 'Posisjon X', -1, 1, 0.01], ['y', 'Posisjon Y', -1, 1, 0.01], ['scale', 'Skalering', 0.1, 5, 0.01], ['rot', 'Rotasjon', -720, 720, 1], ['op', 'Opasitet', 0, 1, 0.01]],
  ov: [['x', 'Posisjon X', -1, 2, 0.005], ['y', 'Posisjon Y', -1, 2, 0.005], ['scale', 'Skalering', 0.02, 4, 0.01], ['rot', 'Rotasjon', -720, 720, 1], ['opacity', 'Opasitet', 0, 1, 0.01]],
  text: [['x', 'Posisjon X', -0.5, 1.5, 0.005], ['y', 'Posisjon Y', -0.5, 1.5, 0.005], ['size', 'Størrelse', 8, 600, 1], ['opacity', 'Opasitet', 0, 1, 0.01]],
}
export const EASES: readonly (readonly [Ease, string])[] = [['lin', 'Lineær'], ['ease', 'Myk'], ['hold', 'Hold']]

const PROP_RE = /^(x|y|scale|rot|op|opacity|size|fx:[\w-]{1,40})$/
const isRec = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)

/** Kontroll av lagrede keyframes (sortert, ugyldige fjernet). undefined = ingen. */
export function cleanKeys(v: unknown): Keys | undefined {
  if (!isRec(v)) return undefined
  const out: Keys = {}
  for (const [k, list] of Object.entries(v)) {
    if (!PROP_RE.test(k) || !Array.isArray(list)) continue
    const keys: Key[] = []
    for (const x of list.slice(0, 200)) {
      if (!isRec(x)) continue
      const t = Number(x.t)
      const val = Number(x.v)
      if (!Number.isFinite(t) || !Number.isFinite(val) || Math.abs(t) > 86400) continue
      keys.push(x.e === 'ease' || x.e === 'hold' ? { t, v: val, e: x.e } : { t, v: val })
    }
    if (keys.length) out[k] = keys.sort((a, b) => a.t - b.t)
  }
  return Object.keys(out).length ? out : undefined
}

/** Verdien ved tiden t (før første/etter siste keyframe: første/siste verdi). Easing gjelder fra keyframen den står på. */
export function valAt(keys: readonly Key[], t: number): number {
  const n = keys.length
  const first = keys[0]
  const last = keys[n - 1]
  if (!first || !last) return 0
  if (t <= first.t) return first.v
  if (t >= last.t) return last.v
  let i = 0
  while (i < n - 2 && (keys[i + 1] as Key).t <= t) i++
  const a = keys[i] as Key
  const b = keys[i + 1] as Key
  if (a.e === 'hold') return a.v
  let k = (t - a.t) / Math.max(1e-9, b.t - a.t)
  if (a.e === 'ease') k = k * k * (3 - 2 * k)
  return a.v + (b.v - a.v) * k
}

/** Elementet med animerte verdier ved tid lt i elementet (samme objekt når det ikke har keyframes). */
export function animAt<T extends { kf?: Keys | undefined; effects?: Effect[] | undefined }>(it: T, lt: number): T {
  const kf = it.kf
  if (!kf) return it
  const out: Record<string, unknown> = { ...it }
  let fx: Effect[] | null = null
  for (const [k, keys] of Object.entries(kf)) {
    if (!keys.length) continue
    const v = valAt(keys, lt)
    if (k.startsWith('fx:')) {
      const id = k.slice(3)
      fx ??= (it.effects ?? []).slice()
      fx = fx.map((e) => (e.id === id ? { ...e, v } : e))
    } else out[k] = v
  }
  if (fx) out.effects = fx
  return out as T
}

export function shiftKeys(kf: Keys | undefined, dt: number): Keys | undefined {
  if (!kf || !dt) return kf
  const out: Keys = {}
  for (const [k, l] of Object.entries(kf)) out[k] = l.map((x) => ({ ...x, t: x.t + dt }))
  return out
}

export function scaleKeys(kf: Keys | undefined, f: number): Keys | undefined {
  if (!kf || f === 1 || !(f > 0)) return kf
  const out: Keys = {}
  for (const [k, l] of Object.entries(kf)) out[k] = l.map((x) => ({ ...x, t: x.t * f }))
  return out
}

/** Legger inn eller oppdaterer keyframen ved t (innenfor et halvt bilde). */
export function upsertKey(list: readonly Key[] | undefined, t: number, v: number, e?: Ease): Key[] {
  const l = (list ?? []).slice()
  const i = l.findIndex((x) => Math.abs(x.t - t) < 1 / 60)
  const prev = i >= 0 ? l[i] : undefined
  const ee = e ?? prev?.e
  const k: Key = ee && ee !== 'lin' ? { t: prev ? prev.t : t, v, e: ee } : { t: prev ? prev.t : t, v }
  if (i >= 0) l[i] = k
  else l.push(k)
  return l.sort((a, b) => a.t - b.t)
}

export const keyAt = (list: readonly Key[] | undefined, t: number): number => (list ?? []).findIndex((x) => Math.abs(x.t - t) < 1 / 60)

/** Antall keyframes utenfor [0, dur] (virker ikke, men er beholdt). */
export function keysOutside(kf: Keys | undefined, dur: number): number {
  let n = 0
  for (const l of Object.values(kf ?? {})) for (const x of l) if (x.t < -1e-6 || x.t > dur + 1e-6) n++
  return n
}
