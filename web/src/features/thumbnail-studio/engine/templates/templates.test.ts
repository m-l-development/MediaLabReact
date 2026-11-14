import { describe, expect, it } from 'vitest'
import katalog from '../../../../../../docs/maler-katalog.json'
import { fontByName } from '../../../../shared/fonts/catalog'
import { cleanDoc } from '../backup'
import { countImgs, emptyDoc, imgLimit, MAX_IMG, refsOf, srcsOf, type Doc } from '../model'
import { LIB_CATS, loadLibrary } from '.'

const cat = (katalog as { thumbs: { code: string; cat: string; name: string; spec: Record<string, string> }[] }).thumbs

describe('ferdige Thumbnail-maler fra designsamlingen (fase 3)', () => {
  it('alle 151 maler, med kode, navn og kategori fra materialet', async () => {
    const lib = await loadLibrary()
    expect(lib).toHaveLength(151)
    expect(new Set(lib.map((t) => t.code)).size).toBe(151)
    for (const t of lib) {
      const m = cat.find((x) => x.code === t.code)
      expect(m, t.code).toBeTruthy()
      expect(t.name).toBe(m?.name)
      expect(t.cat).toBe(m?.cat)
      expect(LIB_CATS).toContain(t.cat)
    }
  })
  it('malene består av ekte lag (ikke flate bilder), og overlever lagring og åpning uendret', async () => {
    for (const t of await loadLibrary()) {
      expect(t.doc.layers.length, t.code).toBeGreaterThan(1)
      expect(t.doc.layers.some((l) => l.type === 'text'), t.code).toBe(true)
      // ingen bilder er bakt inn: bildefeltene er tomme til brukeren velger et bilde
      expect(srcsOf(t.doc), t.code).toEqual([])
      const back = cleanDoc(JSON.parse(JSON.stringify(t.doc)), () => null)
      expect(back, t.code).toEqual(t.doc)
    }
  })
  it('bildefelt der materialet har bilde', async () => {
    for (const t of await loadLibrary()) {
      const spec = cat.find((x) => x.code === t.code)?.spec.Bilde ?? ''
      const fields = t.doc.layers.filter((l) => l.type === 'image').length + t.doc.layers.filter((l) => l.type === 'text' && 'fillSrc' in l).length
      // «Ingen» = ingen bilde (tsr-21: papirflaten kan valgfritt være et foto)
      if (/^ingen/i.test(spec.trim()) && t.code !== 'tsr-21') expect(fields, t.code).toBe(0)
      else expect(fields, `${t.code}: ${spec}`).toBeGreaterThan(0)
    }
  })
  it('bare fonter fra biblioteket (åpen lisens), og bare snitt fonten har', async () => {
    for (const t of await loadLibrary()) {
      for (const l of t.doc.layers) {
        if (l.type !== 'text') continue
        const f = fontByName(l.font)
        expect(f?.name, `${t.code}: ${l.font}`).toBe(l.font)
        if (l.italic) expect(!!f && (f.italic || f.snitt.i), `${t.code}: ${l.font} kursiv`).toBe(true)
      }
    }
  })
  it('grensen for egne bilder: 5, eller antall bildefelt i en ferdig mal med flere (trl-22: 12); lagres og kontrolleres', async () => {
    expect(imgLimit(emptyDoc())).toBe(MAX_IMG)
    expect(imgLimit({ slots: 3 })).toBe(MAX_IMG)
    expect(imgLimit({ slots: 12 })).toBe(12)
    expect(imgLimit({ slots: 999 })).toBe(24)
    const t = (await loadLibrary()).find((x) => x.code === 'trl-22')
    expect(t?.doc.layers.filter((l) => l.type === 'image')).toHaveLength(12)
    const d = { ...emptyDoc(), slots: 12 }
    expect(cleanDoc(JSON.parse(JSON.stringify(d)), () => null)?.slots).toBe(12)
    expect(cleanDoc(JSON.parse(JSON.stringify({ ...emptyDoc(), slots: 2 })), () => null)?.slots).toBeUndefined()
  })
  it('bilde i teksten følger med i referansene (sikkerhetskopi, deling og bildegrensen)', () => {
    const d = { v: 1, bg: { type: 'color', color: '#000', c1: '#000', c2: '#000', angle: 0, radial: false, src: null, zoom: 1, px: 0.5, py: 0.5, blur: 0, dim: 0 }, vig: { on: false, amt: 0, size: 0, color: '#000', top: false }, layers: [{ id: 'a', type: 'text', text: 'HÅP', fillSrc: 'm:11111111-1111-1111-1111-111111111111' }] } as unknown as Doc
    expect(srcsOf(d)).toEqual(['m:11111111-1111-1111-1111-111111111111'])
    expect(refsOf(d)).toEqual(['m:11111111-1111-1111-1111-111111111111'])
    expect(countImgs(d)).toBe(1)
  })
})
