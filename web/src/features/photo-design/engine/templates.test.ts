import { describe, expect, it } from 'vitest'
import { luma } from '../../thumbnail-studio/engine/colors'
import { PhotoController, type PDeps } from '../controller'
import { emptySlot, FORMATS, imageLayer, newDoc, targetSlot, TEMPLATES, textBox, type PdDoc, type PdLayer, type Scheme, type TextLayer } from './model'
import { applyScheme, assignRole, lowContrast, ORDERS, PALETTES, rolesOf, schemeOfPreset, STARTER, tplDoc } from './palette'

/** Malene i Photo Design: de eksisterende, de 10 nye, bildeplassen og fargepalettene. */
const NEW = ['split', 'verse', 'series', 'countdown', 'news', 'poster', 'thanks', 'facts', 'staff', 'minimal']
const ALL_FORMATS = [...FORMATS, { k: 'custom', l: 'Egendefinert', w: 1200, h: 800 }, { k: 'tall', l: 'Høy', w: 800, h: 2000 }, { k: 'pano', l: 'Bred', w: 2400, h: 700 }]

const boxOf = (L: TextLayer) => {
  const b = textBox(L)
  return { x0: L.x - b.w / 2, x1: L.x + b.w / 2, y0: L.y - b.h / 2, y1: L.y + b.h / 2 }
}
const texts = (d: PdDoc) => d.layers.filter((L): L is TextLayer => L.type === 'text')

describe('Photo Design – malene', () => {
  it('de 9 eksisterende og 10 nye malene finnes, med unike nøkler og navn', () => {
    expect(TEMPLATES).toHaveLength(19)
    expect(TEMPLATES.map((t) => t.k)).toEqual(expect.arrayContaining(['blank', 'card2', 'photo', 'quote', 'event', 'week', 'day', 'weekday', 'bold', ...NEW]))
    expect(new Set(TEMPLATES.map((t) => t.k)).size).toBe(19)
    expect(new Set(TEMPLATES.map((t) => t.l)).size).toBe(19)
  })

  it.each(TEMPLATES.filter((t) => t.k !== 'blank').map((t) => t.k))('%s: tekst innenfor bildet og uten overlapp i alle formater', (k) => {
    for (const f of ALL_FORMATS) {
      const d = newDoc(f.w, f.h, k)
      expect(d.layers.length, `${k}/${f.k}`).toBeGreaterThan(0)
      const bs = texts(d).map(boxOf)
      for (const b of bs) {
        expect(b.x0, `${k}/${f.k} venstre`).toBeGreaterThanOrEqual(-1)
        expect(b.y0, `${k}/${f.k} topp`).toBeGreaterThanOrEqual(-1)
        expect(b.x1, `${k}/${f.k} høyre`).toBeLessThanOrEqual(d.w + 1)
        expect(b.y1, `${k}/${f.k} bunn`).toBeLessThanOrEqual(d.h + 1)
      }
      for (let i = 0; i < bs.length; i++) {
        for (let j = i + 1; j < bs.length; j++) {
          const a = bs[i]!, b = bs[j]!
          const ox = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0), oy = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0)
          expect(ox > 2 && oy > 2, `${k}/${f.k}: tekst ${i} og ${j} overlapper`).toBe(false)
        }
      }
    }
  })

  it('«Arrangement»: datoen ligger over tittelen (ikke oppå), også i 1:1 og 16:9', () => {
    for (const f of FORMATS.filter((x) => x.k === 'sq' || x.k === 'wide' || x.k === 'card')) {
      const d = newDoc(f.w, f.h, 'event')
      const [date, title] = ['Dato', 'Tittel'].map((n) => texts(d).find((L) => L.name === n) as TextLayer)
      expect(boxOf(date as TextLayer).y1).toBeLessThanOrEqual(boxOf(title as TextLayer).y0)
    }
  })

  it('de nye malene med bilde har en tom bildeplass som et nytt bilde havner i', () => {
    for (const k of ['split', 'verse', 'series', 'poster', 'staff', 'photo', 'event']) expect(emptySlot(newDoc(1080, 1080, k))?.type, k).toBe('image')
    for (const k of ['countdown', 'news', 'thanks', 'facts', 'minimal']) expect(emptySlot(newDoc(1080, 1080, k)), k).toBeNull()
  })

  it('nytt bilde: bytte, slipp på bildeplass, valgt tom plass, ellers malens tomme plass – en logo blir alltid et eget lag', () => {
    const d = newDoc(1080, 1080, 'photo')
    const slot = emptySlot(d)
    const title = d.layers.find((L) => L.type === 'text') ?? null
    expect(targetSlot(d, { at: false })?.id).toBe(slot?.id)
    expect(targetSlot(d, { at: false, logo: true })).toBeNull() // Logo → Fellesmappe fyller ikke bakgrunnsbildet
    expect(targetSlot(d, { at: false, logo: true, replace: slot ?? undefined })?.id).toBe(slot?.id) // bytte gjelder fortsatt
    expect(targetSlot(d, { at: true, hit: slot })?.id).toBe(slot?.id)
    expect(targetSlot(d, { at: true, hit: title })).toBeNull() // sluppet på tekst: nytt lag
    expect(targetSlot(d, { at: false, replace: title ?? undefined })).toBeNull()
    const full = imageLayer({ name: 'Fylt', src: 'm:1' })
    expect(targetSlot({ layers: [full] }, { at: false, sel: full })).toBeNull()
  })

  it('bildeplassen: første tomme, synlige og ulåste bildelag – ikke et som allerede har bilde', () => {
    const full = imageLayer({ name: 'A', src: 'm:1' })
    const hidden = imageLayer({ name: 'B', hidden: true })
    const locked = imageLayer({ name: 'C', locked: true })
    const free = imageLayer({ name: 'D' })
    expect(emptySlot({ layers: [full, hidden, locked, free] })?.name).toBe('D')
    expect(emptySlot({ layers: [full] })).toBeNull()
  })
})

describe('Photo Design – malfarger (tre farger og roller)', () => {
  const RED: Scheme = { k: 'custom', c: ['#d7191f', '#ffffff', '#f6c1c7'], r: [0, 1, 2] }
  const textCols = (d: PdDoc) => texts(d).map((L) => L.color.toLowerCase())
  const HEXRE = /^#[0-9a-f]{6}$/i

  /** Flaten under teksten (fylt form med hel farge, ellers bakgrunnen; bilder og toning hoppes over). */
  const underOf = (d: PdDoc, i: number, L: TextLayer): string | null => {
    for (let j = i - 1; j >= 0; j--) {
      const S = d.layers[j] as PdLayer
      if (S.type === 'text' || S.type === 'glow' || S.type === 'fx' || Math.abs(L.x - S.x) > S.w / 2 || Math.abs(L.y - S.y) > S.h / 2) continue
      if (S.type === 'image') return null
      if (S.type === 'shape') {
        const f = HEXRE.test(S.fill) ? S.fill : S.fill2 && HEXRE.test(S.fill2) ? S.fill2 : null
        if (f && ((S.op ?? 1) >= 0.5 || !HEXRE.test(S.fill))) return f
      }
    }
    return d.bg
  }

  it('«Standard» og «Tomt» beholder malens egne farger', () => {
    expect(tplDoc(1080, 1080, 'quote', null).bg).toBe(newDoc(1080, 1080, 'quote').bg)
    expect(tplDoc(1080, 1080, 'blank', RED).bg).toBe('#ffffff')
    expect(schemeOfPreset('default')).toBeNull()
    expect(schemeOfPreset('wbl')).toEqual({ k: 'wbl', c: ['#0b4fd6', '#ffffff', '#cfe0ff'], r: [0, 1, 2] })
  })

  it('fargene brukes i malens design: bakgrunn, tekst og støttefarge', () => {
    const d = tplDoc(1080, 1080, 'countdown', RED)
    expect(d.bg).toBe('#d7191f')
    expect(textCols(d)).toContain('#ffffff')
    expect(textCols(d)).toContain('#f6c1c7')
    const ring = d.layers.find((L) => L.name === 'Ring')
    expect(ring?.type === 'shape' && ring.strokeC).toBe('#f6c1c7')
  })

  it('rekkefølgen kan byttes fritt: hvit bakgrunn med rød tekst, rosa bakgrunn med rød tekst', () => {
    const white = tplDoc(1080, 1080, 'thanks', { ...RED, r: [1, 0, 2] })
    expect(white.bg).toBe('#ffffff')
    expect(textCols(white)).toContain('#d7191f')
    const pink = tplDoc(1080, 1080, 'thanks', { ...RED, r: [2, 0, 1] })
    expect(pink.bg).toBe('#f6c1c7')
    expect(textCols(pink)).toContain('#d7191f')
  })

  it('rollebytte uten doble farger, og seks hurtigvalg for rekkefølgen', () => {
    expect(assignRole(RED, 'bg', 1).r).toEqual([1, 0, 2])
    expect(assignRole(RED, 'off', 0).r).toEqual([2, 1, 0])
    expect(new Set(ORDERS.map((o) => o.join(''))).size).toBe(6)
    for (const o of ORDERS) expect(new Set(o).size).toBe(3)
    expect(rolesOf({ ...RED, r: [2, 0, 1] })).toEqual({ bg: '#f6c1c7', text: '#d7191f', off: '#ffffff' })
    expect(lowContrast({ k: 'custom', c: ['#ffffff', '#f6c1c7', '#d7191f'], r: [0, 1, 2] })).toBe(true)
    expect(lowContrast(RED)).toBe(false)
  })

  it.each([...PALETTES.filter((p) => p.p).map((p) => p.k), 'red', 'white', 'pink'])('%s: tekst på flater er lesbar i alle malene', (k) => {
    const sc = k === 'red' ? RED : k === 'white' ? { ...RED, r: [1, 0, 2] as Scheme['r'] } : k === 'pink' ? { ...RED, r: [2, 0, 1] as Scheme['r'] } : schemeOfPreset(k)
    for (const t of TEMPLATES.filter((x) => x.k !== 'blank')) {
      const d = tplDoc(1080, 1350, t.k, sc)
      d.layers.forEach((L, i) => {
        if (L.type !== 'text') return
        const u = underOf(d, i, L)
        if (u && HEXRE.test(u)) expect(Math.abs(luma(L.color) - luma(u)), `${k}/${t.k}: «${L.name}» lesbar`).toBeGreaterThanOrEqual(70)
      })
    }
  })

  it('bytte farger flere ganger gir samme resultat som å bruke dem direkte, og «Standard» gir malen tilbake', () => {
    const base = newDoc(1080, 1350, 'split')
    const cols = (d: PdDoc) => d.layers.map((L) => (L.type === 'text' ? L.color : L.type === 'shape' ? L.fill : ''))
    const once = applyScheme(base, RED)
    const many = applyScheme(applyScheme(applyScheme(base, schemeOfPreset('wbl')), STARTER), RED)
    expect(cols(many)).toEqual(cols(once))
    const back = applyScheme(many, null)
    expect(back.bg).toBe(base.bg)
    expect(cols(back)).toEqual(cols(base))
  })

  it('en farge du har endret selv på et lag, røres ikke når du bytter malfarger', () => {
    const d = applyScheme(newDoc(1080, 1080, 'quote'), RED)
    const edited = { ...d, layers: d.layers.map((L) => (L.type === 'text' && L.name === 'Kilde' ? { ...L, color: '#123456' } : L)) }
    const next = applyScheme(edited, schemeOfPreset('wg'))
    expect(texts(next).find((L) => L.name === 'Kilde')?.color).toBe('#123456')
    expect(next.scheme?.k).toBe('wg')
  })

  it('toning over bildet beholder den mørke fargen', () => {
    const before = newDoc(1080, 1080, 'photo').layers.find((L) => L.name === 'Toning')
    const after = applyScheme(newDoc(1080, 1080, 'photo'), { ...RED, r: [1, 0, 2] }).layers.find((L) => L.name === 'Toning')
    expect(after?.type === 'shape' && [after.fill, after.fill2]).toEqual(before?.type === 'shape' && [before.fill, before.fill2])
  })

  it('fellesfarger, egne farger per mal, prosjektets farger i dokumentet og huskes for malen', () => {
    const m = new Map<string, string>()
    const storage = { get: (k: string) => m.get(k) ?? null, set: (k: string, v: string) => void m.set(k, v), remove: (k: string) => void m.delete(k) }
    const deps = { storage, t: (p: string) => p, confirm: () => true, repo: { save: async () => 'p1', list: async () => [] } } as unknown as PDeps
    const c = new PhotoController(deps)
    expect(c.s.scheme).toBeNull()
    c.setScheme(schemeOfPreset('wbl'))
    c.create('bold')
    expect(c.s.doc?.bg).toBe('#0b4fd6')
    expect(c.s.doc?.tplK).toBe('bold')
    c.setDocScheme({ ...RED, r: [2, 0, 1] })
    expect(c.s.doc?.bg).toBe('#f6c1c7')
    expect(c.s.doc?.scheme).toEqual({ ...RED, r: [2, 0, 1] })
    expect(c.schemeFor('bold')).toEqual({ ...RED, r: [2, 0, 1] })
    c.create('quote')
    expect(c.s.doc?.bg).toBe('#0b4fd6')
    c.create('bold')
    expect(c.s.doc?.bg).toBe('#f6c1c7')
    c.setDocScheme(RED)
    expect(c.s.doc?.bg).toBe('#d7191f')
    c.undo()
    expect(c.s.doc?.bg).toBe('#f6c1c7')
    const c2 = new PhotoController(deps)
    expect(c2.s.scheme?.k).toBe('wbl')
    expect(c2.schemeFor('bold')).toEqual(RED)
    c2.forgetTplScheme('bold')
    expect(c2.schemeFor('bold')?.k).toBe('wbl')
  })

  it('eldre lagret palett («photodesign.palette») blir til fellesfarger', () => {
    const m = new Map<string, string>([['photodesign.palette', 'wg']])
    const storage = { get: (k: string) => m.get(k) ?? null, set: (k: string, v: string) => void m.set(k, v), remove: (k: string) => void m.delete(k) }
    expect(new PhotoController({ storage, t: (p: string) => p } as unknown as PDeps).s.scheme?.k).toBe('wg')
  })
})
