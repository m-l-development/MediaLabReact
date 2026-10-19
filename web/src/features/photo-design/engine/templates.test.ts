import { describe, expect, it } from 'vitest'
import { luma } from '../../thumbnail-studio/engine/colors'
import { PhotoController, type PDeps } from '../controller'
import { emptySlot, FORMATS, imageLayer, newDoc, TEMPLATES, textBox, type PdDoc, type TextLayer } from './model'
import { applyPalette, PALETTES, paletteOf, tplDoc } from './palette'

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

  it('bildeplassen: første tomme, synlige og ulåste bildelag – ikke et som allerede har bilde', () => {
    const full = imageLayer({ name: 'A', src: 'm:1' })
    const hidden = imageLayer({ name: 'B', hidden: true })
    const locked = imageLayer({ name: 'C', locked: true })
    const free = imageLayer({ name: 'D' })
    expect(emptySlot({ layers: [full, hidden, locked, free] })?.name).toBe('D')
    expect(emptySlot({ layers: [full] })).toBeNull()
  })
})

describe('Photo Design – fargepaletter (samme som Thumbnail Studio)', () => {
  it('«Standard» lar malens farger være; «Tomt» er alltid hvitt', () => {
    expect(tplDoc(1080, 1080, 'quote', 'default').bg).toBe(newDoc(1080, 1080, 'quote').bg)
    expect(tplDoc(1080, 1080, 'blank', 'wbl').bg).toBe('#ffffff')
    expect(paletteOf('finnes-ikke').k).toBe('default')
    expect(PALETTES.length).toBeGreaterThan(5)
  })

  it.each(PALETTES.filter((p) => p.p).map((p) => p.k))('%s: farger byttes, og tekst på flater er lesbar i alle malene', (pk) => {
    const P = paletteOf(pk).p as NonNullable<ReturnType<typeof paletteOf>['p']>
    const cols = new Set([P.bg, P.bg2, P.fg, P.fill, P.acc, P.mid].map((c) => c.toLowerCase()))
    for (const t of TEMPLATES.filter((x) => x.k !== 'blank')) {
      const d = tplDoc(1080, 1350, t.k, pk)
      if (d.bg?.startsWith('#')) expect(cols.has(d.bg.toLowerCase()), `${pk}/${t.k}: bakgrunn fra paletten`).toBe(true)
      d.layers.forEach((L, i) => {
        if (L.type !== 'text') return
        // flaten under teksten: fylt form med hel farge, ellers bakgrunnen (bilder og toning hoppes over)
        let under: string | null = d.bg
        for (let j = i - 1; j >= 0; j--) {
          const S = d.layers[j]!
          if (S.type === 'text' || Math.abs(L.x - S.x) > S.w / 2 || Math.abs(L.y - S.y) > S.h / 2) continue
          under = S.type === 'shape' && /^#[0-9a-f]{6}$/i.test(S.fill) && (S.op ?? 1) >= 0.5 ? S.fill : S.type === 'image' || S.type === 'shape' ? null : under
          break
        }
        if (under) expect(Math.abs(luma(L.color) - luma(under)), `${pk}/${t.k}: «${L.name}» lesbar`).toBeGreaterThanOrEqual(70)
      })
    }
  })

  it('toning over bildet beholder den mørke fargen (bildet vaskes ikke ut av en lys palett)', () => {
    const before = newDoc(1080, 1080, 'photo').layers.find((L) => L.name === 'Toning')
    const after = applyPalette(newDoc(1080, 1080, 'photo'), 'bw').layers.find((L) => L.name === 'Toning')
    expect(after).toEqual({ ...before, id: after?.id })
  })

  it('valgt palett lagres, beholdes når du bytter mal, og brukes på den nye malen', () => {
    const m = new Map<string, string>()
    const storage = { get: (k: string) => m.get(k) ?? null, set: (k: string, v: string) => void m.set(k, v), remove: (k: string) => void m.delete(k) }
    const deps = { storage, t: (p: string) => p, confirm: () => true, repo: { save: async () => 'p1', list: async () => [] } } as unknown as PDeps
    const c = new PhotoController(deps)
    expect(c.s.pal).toBe('default')
    c.togglePal()
    expect(c.s.palOpen).toBe(true)
    c.setPal('wbl')
    expect([c.s.pal, c.s.palOpen, m.get('photodesign.palette')]).toEqual(['wbl', false, 'wbl'])
    c.create('bold')
    expect(c.s.doc?.bg).toBe(tplDoc(1080, 1080, 'bold', 'wbl').bg)
    c.create('quote')
    expect(c.s.doc?.bg).toBe(tplDoc(1080, 1080, 'quote', 'wbl').bg)
    expect(c.s.pal).toBe('wbl')
    expect(new PhotoController(deps).s.pal).toBe('wbl') // også neste gang verktøyet åpnes
  })
})
