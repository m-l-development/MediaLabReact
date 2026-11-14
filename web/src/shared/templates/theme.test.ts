import { describe, expect, it } from 'vitest'
import { filterTemplates } from './filter'
import { cleanTheme, luma, mapColor, paletteFrom, paletteOfTheme, THEMES, themeFromParam, themeToParam } from './theme'
import { themeContent } from '../../features/motion-design/engine/theme'
import { colorClip, create, TEMPLATES, text } from '../../features/motion-design/engine/model'

describe('felles fargetemaer', () => {
  it('ti ferdige temaer med full palett; Standard = null', () => {
    expect(THEMES).toHaveLength(10)
    for (const t of THEMES) expect(Object.values(t.p).every((c) => /^#[0-9a-f]{6}$/i.test(c))).toBe(true)
    expect(paletteOfTheme(null)).toBeNull()
    expect(paletteOfTheme({ k: 'wbl' })?.bg).toBe('#0b4fd6')
  })

  it('egne farger: lesbar tekst også når brukeren velger for lik tekstfarge', () => {
    const p = paletteFrom(['#202020', '#262626', '#ff0000'])
    expect(Math.abs(luma(p.fg) - luma(p.bg))).toBeGreaterThan(90)
    expect(p.acc).toBe('#ff0000')
    expect(paletteFrom(['#ffffff', '#111111', '#0000ff']).fg).toBe('#111111')
  })

  it('lagring og adresse: ugyldig → Standard; egne farger tur/retur', () => {
    expect(cleanTheme({ k: 'finnes-ikke' })).toBeNull()
    expect(cleanTheme({ k: 'custom', c: ['#000000', 'rød', '#ffffff'] })).toBeNull()
    const v = { k: 'custom', c: ['#1b2a4a', '#ffffff', '#f5b82c'] as [string, string, string] }
    expect(themeFromParam(themeToParam(v))).toEqual(v)
    expect(themeFromParam('wg')).toEqual({ k: 'wg' })
    expect(themeToParam(null)).toBe('')
  })

  it('omfarging per rolle: mørk flate → bakgrunn, lys tekst → tekstfarge, mettet → aksent', () => {
    const P = THEMES.find((t) => t.k === 'wbl')!.p
    expect(mapColor('#0f1b3d', 'bg', P)).toBe(P.bg2)
    expect(mapColor('#ffffff', 'text', P)).toBe(P.fg)
    expect(mapColor('#f5b82c', 'acc', P)).toBe(P.acc)
  })
})

describe('Motion-maler med fargetema', () => {
  it('Standard er uendret; tema endrer bare farger (tekst, tid og animasjon beholdes)', () => {
    const fmt = { k: 'sq', w: 1080, h: 1080 }
    for (const tp of TEMPLATES) {
      const a = create(fmt, tp.k)
      const b = create(fmt, tp.k, undefined, THEMES[8]!.p)
      expect(b.texts.map((t) => [t.text, t.start, t.dur, t.anim, t.x, t.y, t.size])).toEqual(a.texts.map((t) => [t.text, t.start, t.dur, t.anim, t.x, t.y, t.size]))
      expect(b.clips.length).toBe(a.clips.length)
    }
  })

  it('teksten er lesbar på bakgrunnen og i boksen i alle temaer', () => {
    const c = { clips: [colorClip({ c1: '#f5b82c', c2: '#ff8a00' })], texts: [text({ color: '#111111' }), text({ color: '#111111', box: 'block', bg: '#ffffff' })] }
    for (const t of THEMES) {
      const r = themeContent(c, t.p)
      const bg = r.clips[0]!.kind === 'color' ? r.clips[0]!.c1 : '#000000'
      expect(Math.abs(luma(r.texts[0]!.color) - luma(bg)), t.k).toBeGreaterThanOrEqual(70)
      expect(Math.abs(luma(r.texts[1]!.color) - luma(r.texts[1]!.bg)), t.k).toBeGreaterThanOrEqual(70)
    }
  })
})

describe('malbibliotek: filtrering, søk og sortering', () => {
  const items = [
    { id: 'b', name: 'Bølge', cat: 'B', order: 2, desc: 'sommer' },
    { id: 'a', name: 'Aften', cat: 'A', order: 1 },
    { id: 'c', name: 'Ært', cat: 'A', order: 3 },
  ]
  const cats = ['A', 'B']
  it('alle, kategori, søk i navn/beskrivelse', () => {
    expect(filterTemplates(items, { cat: '*', q: '', sort: 'std', cats }).map((x) => x.id)).toEqual(['b', 'a', 'c'])
    expect(filterTemplates(items, { cat: 'A', q: '', sort: 'std', cats }).map((x) => x.id)).toEqual(['a', 'c'])
    expect(filterTemplates(items, { cat: '*', q: 'SOMMER', sort: 'std', cats }).map((x) => x.id)).toEqual(['b'])
  })
  it('sortering: navn (norsk), kategori, nyeste', () => {
    expect(filterTemplates(items, { cat: '*', q: '', sort: 'name', cats }).map((x) => x.id)).toEqual(['a', 'b', 'c'])
    expect(filterTemplates(items, { cat: '*', q: '', sort: 'cat', cats }).map((x) => x.id)).toEqual(['a', 'c', 'b'])
    expect(filterTemplates(items, { cat: '*', q: '', sort: 'new', cats }).map((x) => x.id)).toEqual(['c', 'b', 'a'])
  })
})
