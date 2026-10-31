/**
 * Avansert tidslinje: rene redigeringsfunksjoner (trim til spillehodet, deling, flytting mellom spor, tidskode).
 * Bygger på den eksisterende modellen: hovedsporet (`clips`, sammenhengende), videospor over det (`ov`, lag), lydspor
 * (`music`, lag), tekst og undertekst. Alle funksjoner returnerer et nytt prosjekt eller en feilmelding.
 */
import { clipDur, layout, ovDur, uid, type Clip, type Music, type Overlay, type Project, type Sub, type TextItem } from './model'

export type EditKind = 'clip' | 'text' | 'sub' | 'music' | 'ov'
export type EditErr = { err: 'outside' | 'locked' | 'busy' | 'none' }
export type EditResult = { p: Project; id?: string } | EditErr

/** Bilder per sekund i tidskoden (samme som eksporten på 30 fps). */
export const FPS = 30
const MIN = 0.1

/** Tidskode tt:mm:ss:bb (bb = bilde 0–29). */
export function fmtTC(sec: number, fps = FPS): string {
  const f = Math.max(0, Math.round((sec || 0) * fps))
  const fr = f % fps
  const s = Math.floor(f / fps)
  const p2 = (n: number) => String(n).padStart(2, '0')
  return `${p2(Math.floor(s / 3600))}:${p2(Math.floor(s / 60) % 60)}:${p2(s % 60)}:${p2(fr)}`
}

/** Start, slutt og varighet på tidslinjen for et element. */
export function spanOf(p: Project, kind: EditKind, id: string): { start: number; end: number; dur: number } | null {
  if (kind === 'clip') {
    const l = layout(p).find((x) => x.c.id === id)
    return l ? { start: l.start, end: l.end, dur: l.dur } : null
  }
  if (kind === 'ov') {
    const o = p.ov.find((x) => x.id === id)
    return o ? { start: o.start, end: o.start + ovDur(o), dur: ovDur(o) } : null
  }
  if (kind === 'music') {
    const m = p.music.find((x) => x.id === id)
    return m ? { start: m.start, end: m.start + (m.out - m.in), dur: m.out - m.in } : null
  }
  if (kind === 'text') {
    const t = p.texts.find((x) => x.id === id)
    return t ? { start: t.start, end: t.start + t.dur, dur: t.dur } : null
  }
  const s = p.subs.find((x) => x.id === id)
  return s ? { start: s.start, end: s.end, dur: s.end - s.start } : null
}

const inside = (sp: { start: number; end: number }, t: number) => t > sp.start + MIN / 2 && t < sp.end - MIN / 2

/**
 * Trimmer starten (`l`) eller slutten (`r`) av et element til tidspunktet `t`. Hovedsporet er sammenhengende: når
 * starten trimmes, beholder klippet plassen sin og resten av sporet flytter seg (ripple), som i dagens dra-trimming.
 */
export function trimAt(p: Project, kind: EditKind, id: string, t: number, edge: 'l' | 'r'): EditResult {
  const sp = spanOf(p, kind, id)
  if (!sp) return { err: 'none' }
  if (!inside(sp, t)) return { err: 'outside' }
  const off = t - sp.start
  if (kind === 'clip') {
    const map = (c: Clip): Clip => {
      if (c.id !== id) return c
      if (c.kind === 'video') {
        const so = off * (c.speed || 1)
        if (edge === 'l') return c.rev ? { ...c, out: c.out - so } : { ...c, in: c.in + so }
        return c.rev ? { ...c, in: c.out - so } : { ...c, out: c.in + so }
      }
      return { ...c, dur: edge === 'l' ? clipDur(c) - off : off }
    }
    return { p: { ...p, clips: p.clips.map(map) } }
  }
  if (kind === 'ov') {
    const map = (o: Overlay): Overlay => {
      if (o.id !== id) return o
      if (o.kind === 'video') {
        const so = off * (o.speed || 1)
        if (edge === 'l') return o.rev ? { ...o, out: o.out - so, start: t } : { ...o, in: o.in + so, start: t }
        return o.rev ? { ...o, in: o.out - so } : { ...o, out: o.in + so }
      }
      return edge === 'l' ? { ...o, start: t, dur: ovDur(o) - off } : { ...o, dur: off }
    }
    return { p: { ...p, ov: p.ov.map(map) } }
  }
  if (kind === 'music') {
    const map = (m: Music): Music => (m.id !== id ? m : edge === 'l' ? { ...m, in: m.in + off, start: t, loop: false } : { ...m, out: m.in + off, loop: false })
    return { p: { ...p, music: p.music.map(map) } }
  }
  if (kind === 'text') {
    const map = (x: TextItem): TextItem => (x.id !== id ? x : edge === 'l' ? { ...x, start: t, dur: x.dur - off } : { ...x, dur: off })
    return { p: { ...p, texts: p.texts.map(map) } }
  }
  const map = (x: Sub): Sub => (x.id !== id ? x : edge === 'l' ? { ...x, start: t } : { ...x, end: t })
  return { p: { ...p, subs: p.subs.map(map) } }
}

/** Deler et videospor-klipp (overlegg) ved `t`: to klipp som til sammen spiller det samme. → ID-en til den nye delen. */
export function splitOv(p: Project, id: string, t: number): EditResult {
  const o = p.ov.find((x) => x.id === id)
  if (!o) return { err: 'none' }
  const sp = spanOf(p, 'ov', id) as { start: number; end: number }
  if (!inside(sp, t)) return { err: 'outside' }
  const off = t - o.start
  let a: Overlay
  let b: Overlay
  if (o.kind === 'video') {
    const so = off * (o.speed || 1)
    a = o.rev ? { ...o, in: o.out - so, fadeOut: 0 } : { ...o, out: o.in + so, fadeOut: 0 }
    b = o.rev ? { ...o, id: uid('o'), out: o.out - so, start: t, fadeIn: 0, anim: 'none' } : { ...o, id: uid('o'), in: o.in + so, start: t, fadeIn: 0, anim: 'none' }
  } else {
    a = { ...o, dur: off, fadeOut: 0 }
    b = { ...o, id: uid('o'), start: t, dur: ovDur(o) - off, fadeIn: 0, anim: 'none' }
  }
  const arr = p.ov.flatMap((x) => (x.id === id ? [a, b] : [x]))
  return { p: { ...p, ov: arr }, id: b.id }
}

/** Deler en undertekst ved `t`. */
export function splitSub(p: Project, id: string, t: number): EditResult {
  const s = p.subs.find((x) => x.id === id)
  if (!s) return { err: 'none' }
  if (!inside(s, t)) return { err: 'outside' }
  const b: Sub = { ...s, id: uid('s'), start: t }
  return { p: { ...p, subs: p.subs.flatMap((x) => (x.id === id ? [{ ...x, end: t }, b] : [x])) }, id: b.id }
}

type LaneK = 'ov' | 'music' | 'text'
const ARR = { ov: 'ov', music: 'music', text: 'texts' } as const
const endOf = (k: LaneK, x: Overlay | Music | TextItem) => (k === 'ov' ? x.start + ovDur(x as Overlay) : k === 'music' ? ((x as Music).loop ? 1e9 : x.start + (x as Music).out - (x as Music).in) : x.start + (x as TextItem).dur)

/**
 * Flytter et element ett spor opp (−1) eller ned (+1). Lag 0 er øverst (tegnes over de andre). Øverst eller nederst
 * lages et nytt spor. Er sporet opptatt på samme tid, settes et nytt spor inn der, så elementet havner over (opp) eller
 * under (ned) det som ligger der; de andre elementenes rekkefølge er uendret.
 */
export function moveLane(p: Project, k: LaneK, id: string, dl: -1 | 1): EditResult {
  const arr = p[ARR[k]] as (Overlay | Music | TextItem)[]
  const it = arr.find((x) => x.id === id)
  if (!it) return { err: 'none' }
  const n = Math.max(p.lanes[k] || 1, ...arr.map((x) => (x.lane || 0) + 1))
  const to = (it.lane || 0) + dl
  if (to < 0) {
    // nytt spor øverst: de andre flyttes ett ned (rekkefølgen mellom dem er uendret)
    const next = arr.map((x) => (x.id === id ? { ...x, lane: 0 } : { ...x, lane: (x.lane || 0) + 1 }))
    return { p: { ...p, [ARR[k]]: next, lanes: { ...p.lanes, [k]: n + 1 } } }
  }
  if (to > 49) return { err: 'busy' }
  const s = it.start
  const e = endOf(k, it)
  if (arr.some((x) => x.id !== id && (x.lane || 0) === to && s < endOf(k, x) - 0.001 && e > x.start + 0.001)) {
    // opptatt: nytt spor på `at` (opp: der det opptatte ligger; ned: rett under det); sporene fra `at` flyttes ett ned
    const at = dl < 0 ? to : to + 1
    if (at > 49) return { err: 'busy' }
    const next = arr.map((x) => (x.id === id ? { ...x, lane: at } : (x.lane || 0) >= at ? { ...x, lane: (x.lane || 0) + 1 } : x))
    return { p: { ...p, [ARR[k]]: next, lanes: { ...p.lanes, [k]: Math.max(n + 1, at + 1) } } }
  }
  const next = arr.map((x) => (x.id === id ? { ...x, lane: to } : x))
  return { p: { ...p, [ARR[k]]: next, lanes: { ...p.lanes, [k]: Math.max(n, to + 1) } } }
}

/** Navnet på sporet i Avansert: V1 = hovedsporet, V2 … = videospor over det (lag 0 øverst), A1 … = lydspor. */
export function trackName(p: Project, kind: EditKind, lane = 0): string {
  if (kind === 'clip') return 'V1'
  if (kind === 'ov') {
    const n = Math.max(p.lanes.ov || 1, ...p.ov.map((x) => (x.lane || 0) + 1))
    return `V${n - lane + 1}`
  }
  if (kind === 'music') return `A${lane + 1}`
  return kind === 'text' ? `T${lane + 1}` : 'UT'
}

/** Tid fra tekst: «HH:MM:SS», «MM:SS» eller sekunder, med desimaler (punktum eller komma). null = ugyldig. */
export function parseTime(s: string): number | null {
  const t = s.trim().replace(',', '.')
  if (!/^\d+(\.\d+)?$|^\d+:\d{1,2}(\.\d+)?$|^\d+:\d{1,2}:\d{1,2}(\.\d+)?$/.test(t)) return null
  const parts = t.split(':').map(Number)
  if (parts.slice(1).some((x) => x >= 60)) return null
  return parts.reduce((a, x) => a * 60 + x, 0)
}

/** HH:MM:SS (med to desimaler når tiden ikke er et helt sekund). */
export function fmtHMS(sec: number): string {
  const v = Math.max(0, Math.round((sec || 0) * 100) / 100)
  const h = Math.floor(v / 3600)
  const m = Math.floor(v / 60) % 60
  const s = v - h * 3600 - m * 60
  const p2 = (n: number) => String(n).padStart(2, '0')
  const ss = Number.isInteger(s) ? p2(s) : s.toFixed(2).padStart(5, '0')
  return `${p2(h)}:${p2(m)}:${ss}`
}
