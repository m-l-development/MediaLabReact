/**
 * Lengden på videoen (forlenge og forkorte en mal) uten at designet går tapt.
 *
 * Montasjemaler (intro – montasje – slutt):
 * - Forlenge: nye klipp settes inn før slutten ved å gå gjennom montasjens klipp i rekkefølge (gjentakelse med
 *   variasjon: rekkefølgen forskyves for hver runde). Plassholderne får nye numre – nye medieplasser for eget innhold –
 *   med samme farger, overganger, effekter og keyframes. Tekster, rammer og overlegg som hører til slutten, flyttes med
 *   til den nye slutten; montasjens egne høydepunkter står der de står.
 * - Forkorte: de minst viktige montasjeklippene tas ut først (klipp der en ramme/bilde-i-bilde eller tekst starter, og
 *   klippene rett etter introen og før slutten, beholdes lengst); intro og slutt beholdes alltid. Elementer i et klipp som
 *   tas ut, flyttes til nabogrensen (ingenting slettes).
 * Scenemaler (høyst tre klipp, f.eks. sitat, nedtelling, plakat): hele forløpet strekkes jevnt (rolige scener blir lengre),
 * med alle keyframes og animasjoner i samme forhold.
 *
 * Prosjektet får nøyaktig valgt lengde (`dur`); musikken gjentas når den er kortere, og tones ut på slutten. Music Sync
 * kan etterpå kjøres på den nye lengden.
 */
import { clipDur, layout, totalDur, uid, type Clip, type Project } from './model'
import type { Keys } from './kf'

const scaleKf = (k: Keys, f: number): Keys => Object.fromEntries(Object.entries(k).map(([n, l]) => [n, l.map((q) => ({ ...q, t: q.t * f }))]))

/** Hele forløpet skaleres jevnt med f (scenemaler; reserve når en montasje ikke kan forkortes mer). */
export function scaleAll(p: Project, f: number): Project {
  const sv = <T extends { in: number; out: number; speed?: number }>(c: T, nd: number) => ({ speed: Math.max(0.1, Math.min(8, (c.out - c.in) / nd)) })
  return {
    ...p,
    clips: p.clips.map((c) => {
      const nd = clipDur(c) * f
      const base = { ...c, trans: { ...c.trans, dur: c.trans.dur * f }, ...(c.kf ? { kf: scaleKf(c.kf, f) } : {}) }
      return c.kind === 'video' ? { ...base, ...sv(c, nd) } : { ...base, dur: nd }
    }) as Clip[],
    texts: p.texts.map((x) => ({ ...x, start: x.start * f, dur: x.dur * f, ...(x.kf ? { kf: scaleKf(x.kf, f) } : {}), ...(x.cdDur !== undefined ? { cdDur: x.cdDur * f } : {}) })),
    ov: p.ov.map((o) => ({
      ...o, start: o.start * f, dur: o.dur * f, fadeIn: o.fadeIn * f, fadeOut: o.fadeOut * f,
      ...(o.kind === 'video' && !o.shape ? sv(o, (o.out - o.in) / (o.speed || 1) * f) : {}),
      ...(o.kf ? { kf: scaleKf(o.kf, f) } : {}),
      ...(o.matte?.brush ? { matte: { ...o.matte, brush: { ...o.matte.brush, t0: o.matte.brush.t0 * f, dur: o.matte.brush.dur * f } } } : {}),
    })),
    subs: p.subs.map((s) => ({ ...s, start: s.start * f, end: s.end * f })),
    markers: p.markers.filter((m) => m.label !== 'Takt').map((m) => ({ ...m, t: m.t * f })),
  }
}

/** Neste ledige plassholdernummer («Klipp N»). */
function nextPh(p: Project): number {
  let n = 0
  for (const x of [...p.clips, ...p.ov]) {
    const m = /(\d+)/.exec((x as { ph?: string }).ph ?? '')
    if (m) n = Math.max(n, Number(m[1]))
  }
  return n + 1
}

/**
 * Ny lengde (s) for prosjektet. `minClip`: korteste lengde nye montasjeklipp skal ha (f.eks. fra Music Sync-profilen),
 * så antall nye medieplasser passer til rytmen musikken vil gi.
 */
export function resizeProject(p0: Project, T: number, opt: { minClip?: number } = {}): Project {
  const T0 = totalDur(p0)
  if (!(T > 0.5) || !(T0 > 0.2)) return p0
  const N = p0.clips.length
  let p: Project = { ...p0, markers: p0.markers.filter((m) => m.label !== 'Takt' && !m.id.startsWith('sync-')) }
  // scenemaler (og prosjekter uten montasje): jevn strekning
  if (N <= 3) return finish(scaleAll(p, T / T0), T)
  const L = layout(p)
  const outroStart = L[N - 1]?.start ?? T0
  const delta = T - T0
  if (Math.abs(delta) < 0.05) return finish(p, T)
  // tidskart fra gamle klippgrenser til nye (klipp som tas ut, får lengde 0; nye klipp legges inn før slutten)
  const oldB = L.map((x) => x.start)
  if (delta > 0) {
    // forlenge: montasjens klipp gjentas (forskjøvet rekkefølge hver runde), nye plassholdernumre
    const mont = p.clips.slice(1, N - 1)
    const add: Clip[] = []
    let need = delta, round = 0, ph = nextPh(p)
    while (need > 0.05 && mont.length) {
      const off = (round * 3) % mont.length
      for (let j = 0; j < mont.length && need > 0.05; j++) {
        const src = mont[(j + off) % mont.length] as Clip
        const d = Math.max(clipDur(src), opt.minClip ?? 0)
        const nd = need < d * 1.5 ? need : d
        const id = uid('c')
        const c = { ...src, id, ...(src.kind === 'color' && src.ph ? { ph: `Klipp ${ph++}` } : {}), ...(src.kind === 'video' ? { out: src.in + nd * (src.speed || 1) } : { dur: nd }), ...(src.kf ? { kf: scaleKf(src.kf, nd / clipDur(src)) } : {}) } as Clip
        delete (c as { link?: string }).link
        delete (c as { fix?: boolean }).fix
        // ikke samme farge som klippet før (nye medieplasser skal synes som egne klipp før innholdet byttes)
        const prev = (add.at(-1) ?? p.clips[N - 2]) as Clip | undefined
        const same = (a: Clip | undefined, b: Clip) => a?.kind === 'color' && b.kind === 'color' && a.c1 === b.c1
        if (same(prev, c) || (add.length === 0 ? false : same(c, p.clips[N - 1] as Clip) && need - nd <= 0.05)) {
          const alt = mont.find((x) => x.kind === 'color' && !same(prev, x) && !same(x, p.clips[N - 1] as Clip))
          if (alt && alt.kind === 'color' && c.kind === 'color') Object.assign(c, { c1: alt.c1, c2: alt.c2, grad: alt.grad, ang: alt.ang })
        }
        add.push(c)
        need -= nd
      }
      round++
    }
    const clips = [...p.clips.slice(0, N - 1), ...add, p.clips[N - 1] as Clip]
    // alt som hører til slutten (starter fra sluttklippet), flyttes like mye som det som er satt inn; det som varer til
    // slutten (f.eks. rulletekst over hele montasjen), strekkes med (keyframes i samme forhold)
    const ins = add.reduce((s, c) => s + clipDur(c), 0)
    const sh = (t: number) => (t >= outroStart - 0.01 ? t + ins : t)
    const toEnd = <X extends { start: number; dur: number; kf?: Keys }>(x: X): X => {
      if (x.start >= outroStart - 0.01) return { ...x, start: x.start + ins }
      if (x.start + x.dur < T0 - 0.4) return x
      const nd = x.dur + ins
      return { ...x, dur: nd, ...(x.kf ? { kf: scaleKf(x.kf, nd / x.dur) } : {}) }
    }
    p = {
      ...p, clips,
      texts: p.texts.map(toEnd),
      ov: p.ov.map(toEnd),
      subs: p.subs.map((s) => ({ ...s, start: sh(s.start), end: s.start >= outroStart - 0.01 ? s.end + ins : s.end })),
      markers: p.markers.map((m) => ({ ...m, t: sh(m.t) })),
    }
    return finish(p, T)
  }
  // forkorte: de minst viktige montasjeklippene tas ut først
  const startsIn = (t0: number, t1: number) => [...p.texts.map((x) => x.start), ...p.ov.map((o) => o.start)].filter((t) => t >= t0 - 0.01 && t < t1 - 0.01).length
  const score = L.map((x, i) => {
    if (i === 0 || i === N - 1) return Infinity
    let s = startsIn(x.start, x.end) * 3
    // klippene rett etter introen og før slutten bærer rytmen inn og ut
    if (i <= 2 || i >= N - 3) s += 2
    // tidlig i montasjen er litt viktigere enn sent (historien bygges opp)
    s += (1 - i / N) * 0.5
    return s
  })
  const order = L.map((_, i) => i).filter((i) => i > 0 && i < N - 1).sort((a, b) => (score[a] as number) - (score[b] as number) || b - a)
  const drop = new Set<number>()
  let cur = T0
  for (const i of order) {
    if (cur <= T + 0.05) break
    // minst to klipp igjen i montasjen
    if (N - 2 - drop.size <= 2) break
    const d = (L[i] as { dur: number }).dur - (L[i] as { tr: number }).tr
    if (cur - d < T - 0.6 * d && cur - T < d * 0.5) break
    drop.add(i)
    cur -= d
  }
  // tidskart: et uttatt klipp krymper til et punkt; alt etter flyttes tilsvarende
  const removed = [...drop].sort((a, b) => a - b).map((i) => ({ a: oldB[i] as number, b: (oldB[i + 1] ?? T0) as number }))
  const M = (t: number) => {
    let s = 0
    for (const r of removed) {
      if (t >= r.b) s += r.b - r.a
      else if (t > r.a) s += t - r.a
    }
    return t - s
  }
  p = {
    ...p,
    clips: p.clips.filter((_, i) => !drop.has(i)),
    texts: p.texts.map((x) => { const s = M(x.start); return { ...x, start: s, dur: Math.max(0.2, M(x.start + x.dur) - s) } }),
    ov: p.ov.map((o) => { const s = M(o.start); return { ...o, start: s, dur: Math.max(0.2, M(o.start + o.dur) - s) } }),
    subs: p.subs.map((x) => ({ ...x, start: M(x.start), end: Math.max(M(x.start) + 0.2, M(x.end)) })),
    markers: p.markers.map((m) => ({ ...m, t: M(m.t) })),
  }
  // fortsatt for lang (få klipp å ta av): jevn krymping av resten
  const T1 = totalDur({ ...p, dur: null })
  if (T1 > T + 0.05) p = scaleAll(p, Math.max(0.3, T / T1))
  return finish(p, T)
}

/** Nøyaktig lengde: siste montasjeklipp tar opp resten, alt holdes innenfor; musikken gjentas/tones ut. */
function finish(p: Project, T: number): Project {
  let clips = [...p.clips]
  // (noen runder: en endret lengde kan endre overlappen til en naboovergang)
  for (let it = 0; it < 4; it++) {
  // ny liste hver runde (layout() hurtigbufres per liste)
  clips = [...clips]
  const L = layout({ clips })
  const end = L.at(-1)?.end ?? 0
  const diff = T - end
  if (clips.length && Math.abs(diff) > 0.005) {
    // forskjellen tas av / legges til klippene bakfra (sluttklippet sist), så korte rytmeklipp i starten beholdes
    let rest = diff
    const order = clips.length > 1 ? [clips.length - 2, clips.length - 1, ...Array.from({ length: clips.length - 2 }, (_, k) => clips.length - 3 - k)] : [0]
    for (const i of order) {
      if (Math.abs(rest) < 0.005 || i < 0) break
      const c = clips[i] as Clip
      const d = clipDur(c)
      const nd = Math.max(0.4, d + rest)
      if (Math.abs(nd - d) < 1e-6) continue
      rest -= nd - d
      clips[i] = (c.kind === 'video' ? { ...c, speed: Math.max(0.1, Math.min(8, (c.out - c.in) / nd)) } : { ...c, dur: nd }) as Clip
    }
  }
  }
  const lim = <X extends { start: number; dur: number }>(x: X): X => {
    const s = Math.min(x.start, Math.max(0, T - 0.2))
    return { ...x, start: s, dur: Math.max(0.2, Math.min(x.dur, T - s)) }
  }
  const music = p.music.map((m, i) => {
    if (i) return m
    const len = m.out - m.in
    return { ...m, loop: m.loop || len + m.start < T - 0.05, fadeOut: Math.max(m.fadeOut, Math.min(2, T / 8)) }
  })
  return {
    ...p, clips, dur: T,
    texts: p.texts.map(lim),
    ov: p.ov.map(lim),
    subs: p.subs.filter((s) => s.start < T).map((s) => ({ ...s, end: Math.min(s.end, T) })),
    markers: p.markers.filter((m) => m.t <= T),
    music,
  }
}
