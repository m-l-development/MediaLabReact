import { describe, expect, it } from 'vitest'
import { THEMES } from '../../../../shared/templates/theme'
import { TEMPLATES, type PdDoc, type PdLayer, type Scheme } from '../model'
import { applyScheme, rolesOf, schemeOfPreset, tplDoc } from '../palette'
import { loadLibrary } from '.'

/**
 * Fargevalget skal gjelde hele malen i Photo: tekst, flater, streker, markering bak tekst, toning på bilder, fargede
 * skygger og bakgrunnen (også gradientens andre farge). Alle malene (grunnmalene og designsamlingen), alle temaene.
 */
const HEX = /^#[0-9a-f]{6}$/i
const lum = (h: string) => { const n = parseInt(h.slice(1), 16); return 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) }
const sat = (h: string) => {
  const n = parseInt(h.slice(1), 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255) as [number, number, number]
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn
  return d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1))
}
void lum

/** Farger på et lag som skal følge fargevalget (toningsflater over bilder og nøytrale skygger er unntatt). */
function themedColors(L: PdLayer, layers: PdLayer[]): [string, string][] {
  const out: [string, string][] = []
  const add = (k: string, v: unknown) => { if (typeof v === 'string' && HEX.test(v)) out.push([k, v.toLowerCase()]) }
  if (L.type === 'text') { add('color', L.color); if (L.strokeW > 0) add('strokeC', L.strokeC); if (L.bar) add('barColor', L.barColor) }
  if (L.type === 'shape') {
    const i = layers.indexOf(L)
    const toning = layers.slice(0, i).some((q) => q.type === 'image' && Math.abs(L.x - q.x) <= q.w / 2 && Math.abs(L.y - q.y) <= q.h / 2) && ((L.op ?? 1) < 0.9 || !HEX.test(L.fill))
    if (!toning) { add('fill', L.fill); add('fill2', L.fill2); if (L.strokeW > 0) add('strokeC', L.strokeC) }
  }
  if (L.type === 'glow') add('color', L.color)
  if (L.type === 'image') add('tint', L.tint)
  for (const s of L.shadows ?? []) if (HEX.test(s.c) && sat(s.c) >= 0.15) add('shadow', s.c)
  return out
}

async function docs(): Promise<[string, (s: Scheme | null) => PdDoc][]> {
  const lib = await loadLibrary()
  return [
    ...TEMPLATES.filter((t) => t.k !== 'blank').map((t) => [t.k, (s: Scheme | null) => tplDoc(1080, 1080, t.k, s, 1)] as [string, (s: Scheme | null) => PdDoc]),
    ...lib.map((t) => [t.id, (s: Scheme | null) => applyScheme(JSON.parse(JSON.stringify(t.doc)) as PdDoc, s)] as [string, (s: Scheme | null) => PdDoc]),
  ]
}

const schemes: [string, Scheme][] = [...THEMES.map((t) => [t.k, schemeOfPreset(t.k)!] as [string, Scheme]), ['custom', { k: 'custom', c: ['#20123a', '#fff4e0', '#19c37d'], r: [0, 1, 2] }]]

describe('fargevalg på alle ferdige Photo-maler', () => {
  for (const [k, sc] of schemes) {
    it(`tema ${k}: ingen av malens egne farger blir igjen`, async () => {
      const R = rolesOf(sc)
      const bad: string[] = []
      for (const [id, mk] of await docs()) {
        const orig = mk(null)
        const d = mk(sc)
        // originalfarger som ikke også er en av temaets farger, skal ikke finnes etter omfargingen
        const own = new Set<string>()
        for (const side of [orig, ...(orig.back ? [orig.back] : [])]) for (const L of side.layers) for (const [, c] of themedColors(L, side.layers)) own.add(c)
        const pal = new Set([R.bg, R.text, R.off].map((x) => x.toLowerCase()))
        for (const side of [d, ...(d.back ? [d.back] : [])]) {
          for (const L of side.layers) for (const [f, c] of themedColors(L, side.layers)) if (own.has(c) && !pal.has(c) && c !== '#ffffff' && c !== '#111111') bad.push(`${id}:${L.type}.${f}=${c}`)
          if (side.bg && HEX.test(side.bg) && orig.bg && side.bg.toLowerCase() === orig.bg.toLowerCase() && !pal.has(side.bg.toLowerCase())) bad.push(`${id}:bg=${side.bg}`)
        }
        if (d.bg2 && orig.bg2 && d.bg2.toLowerCase() === orig.bg2.toLowerCase()) bad.push(`${id}:bg2=${d.bg2}`)
      }
      expect(bad.slice(0, 25)).toEqual([])
    })
  }

  it('Standard gir malens egne farger tilbake, også etter et tema', async () => {
    for (const [id, mk] of (await docs()).slice(0, 60)) {
      const orig = mk(null)
      const back = applyScheme(applyScheme(orig, schemes[0]![1]), null)
      const strip = (d: PdDoc) => JSON.stringify(d.layers.map((L) => themedColors(L, d.layers))) + d.bg + (d.bg2 ?? '')
      expect(strip(back), id).toBe(strip(orig))
    }
  })
})

describe('felles fargevelger ↔ Photos fargevalg (roller beholdes)', () => {
  it('ferdig tema, Standard og egne farger går begge veier', async () => {
    const { themeOf, schemeOfTheme } = await import('../palette')
    expect(themeOf(null)).toBeNull()
    expect(schemeOfTheme(null, null)).toBeNull()
    expect(schemeOfTheme({ k: 'wbl' }, null)).toEqual(schemeOfPreset('wbl'))
    expect(themeOf(schemeOfPreset('wbl'))).toEqual({ k: 'wbl' })
    // egne farger med byttet rekkefølge: den felles velgeren viser [bakgrunn, tekst, støtte]
    const mine: Scheme = { k: 'custom', c: ['#111111', '#eeeeee', '#ff0000'], r: [2, 0, 1] }
    expect(themeOf(mine)).toEqual({ k: 'custom', c: ['#ff0000', '#111111', '#eeeeee'] })
    // ny bakgrunnsfarge fra velgeren: rollene (rekkefølgen) er de samme, bare bakgrunnsfargen er byttet
    const next = schemeOfTheme({ k: 'custom', c: ['#00aa00', '#111111', '#eeeeee'] }, mine)!
    expect(next.r).toEqual([2, 0, 1])
    expect(rolesOf(next)).toEqual({ bg: '#00aa00', text: '#111111', off: '#eeeeee' })
  })
})
