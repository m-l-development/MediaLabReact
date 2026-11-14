import { describe, expect, it } from 'vitest'
import katalog from '../../../../../../docs/maler-katalog.json'
import { fontByName } from '../../../../shared/fonts/catalog'
import { PROJECT_SCHEMA } from '../../repo'
import { LIB_CATS, loadLibrary } from '.'

const cat = (katalog as { photo: { id: string; name: string; cat: string; format: string; spec: Record<string, string> }[] }).photo

describe('ferdige Photo Design-maler fra designsamlingen (fase 5)', () => {
  it('alle 100, med nummer, navn, kategori og format fra materialet', async () => {
    const lib = await loadLibrary()
    expect(lib).toHaveLength(100)
    for (const t of lib) {
      const m = cat.find((x) => x.id === t.id)
      expect(m, t.id).toBeTruthy()
      expect([t.name, t.cat]).toEqual([m?.name, m?.cat])
      expect(LIB_CATS).toContain(t.cat)
      // formatet i materialet («Instagram 4:5 · 1080×1350») er malens størrelse
      const wh = /(\d+)×(\d+)/.exec(m?.format ?? '')
      expect([t.doc.w, t.doc.h], t.id).toEqual([Number(wh?.[1]), Number(wh?.[2])])
    }
    for (const k of LIB_CATS) expect(lib.filter((t) => t.cat === k)).toHaveLength(20)
  })
  it('ekte lag (ikke flate bilder), tomme bildefelt, og prosjektformatet godtar dem uendret', async () => {
    for (const t of await loadLibrary()) {
      expect(t.doc.layers.some((l) => l.type === 'text'), t.id).toBe(true)
      expect(t.doc.layers.every((l) => l.type !== 'image' || l.src == null), t.id).toBe(true)
      const v = PROJECT_SCHEMA.validate({ doc: t.doc, masks: {}, thumb: '', tpl: null })
      expect(v.ok, t.id).toBe(true)
      if (v.ok) expect(v.value.doc).toEqual(t.doc)
    }
  })
  it('bildefelt der materialet har bilde', async () => {
    for (const t of await loadLibrary()) {
      const spec = cat.find((x) => x.id === t.id)?.spec.Bildefelt ?? ''
      const n = t.doc.layers.filter((l) => l.type === 'image').length
      // «valgfritt» (017, 066): designet har en gradient som standard, bildet legges inn ved behov
      if (/valgfritt/i.test(spec)) continue
      if (/^ingen/i.test(spec.trim())) expect(n, `${t.id}: ${spec}`).toBe(0)
      else expect(n, `${t.id}: ${spec}`).toBeGreaterThan(0)
    }
  })
  it('bare fonter fra biblioteket, og kursiv bare der fonten har den', async () => {
    for (const t of await loadLibrary()) {
      for (const l of t.doc.layers) {
        if (l.type !== 'text') continue
        const f = fontByName(l.font)
        expect(f?.name, `${t.id}: ${l.font}`).toBe(l.font)
        if (l.italic) expect(!!f && (f.italic || f.snitt.i), `${t.id}: ${l.font} kursiv`).toBe(true)
      }
    }
  })
})
