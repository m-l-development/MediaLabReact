import { describe, expect, it } from 'vitest'
import { merge3, same } from '../../../services/shared-setup'
import { backupKey, cleanCategory, cleanDoc, restore } from './backup'
import { COMBOS, profileOf, recolor } from './colors'
import { base, layout, LAYOUT_KEYS } from './layouts'
import { LAYOUT_LIST, LIBRARY } from './library'
import { countImgs, emptyDoc, L } from './model'
import { applyListAction, fixList, listKey, parseItem } from './text-list'

describe('oppsett', () => {
  it('28 oppsett (med blank), alle med navn i «Ny mal»', () => {
    expect(LAYOUT_KEYS.length).toBe(28)
    expect(LAYOUT_LIST.map((o) => o.k).sort()).toEqual([...LAYOUT_KEYS].sort())
    for (const k of LAYOUT_KEYS) expect(layout(k).lay).toBe(k)
  })

  it('grunnoppsettene har faste lag-ID-er og roller for person, navn og tema', () => {
    const d = base('sunday')
    expect(d.layers.map((l) => l.id)).toEqual(['b0', 'b1', 'b2', 'b3', 'b4'])
    expect(d.layers.map((l) => l.role).filter(Boolean)).toEqual(['person', 'theme', 'name'])
    expect(base('ukjent').layers).toHaveLength(1)
  })

  it('«Flere elementer» har fire grupper', () => {
    expect(LIBRARY.map((g) => g.title)).toEqual(['Overskrifter', 'Bokser og merker', 'Former og felt', 'Bildefelt'])
  })
})

describe('farger', () => {
  it('11 kombinasjoner; fargelegging endrer bakgrunn og lag', () => {
    expect(COMBOS).toHaveLength(11)
    const d = recolor(base('sunday'), 'wr')
    expect(d.bg.color).toBe('#f2f2f2')
    const txt = d.layers.find((l) => l.role === 'name')
    expect(txt?.type === 'text' && txt.color).toBe('#d7191f')
  })

  it('profilen er grunnoppsettets farger og fonter', () => {
    const p = profileOf(base('sunday'))
    expect(p.colors).toContain('#f5b800')
    expect(p.fonts).toEqual(['Montserrat', 'Bebas Neue'])
  })
})

describe('lister i tekst', () => {
  it('kjenner punkter og nummer, og nummererer på nytt', () => {
    expect(parseItem('  a. Under')).toEqual({ lvl: 1, num: true, body: 'Under' })
    expect(parseItem('a. Ikke liste uten innrykk')).toBeNull()
    expect(fixList('1. En\n1. To\n  1. Under\n1. Tre')).toBe('1. En\n2. To\n  a. Under\n3. Tre')
  })

  it('listeknapper og Enter/Tab', () => {
    expect(applyListAction('En\nTo', 0, 5, 'bullet').text).toBe('• En\n• To')
    const r = listKey('1. En', 5, 5, 'Enter', false)
    expect(r?.text).toBe('1. En\n2. ')
    expect(listKey('1. En\n2. ', 9, 9, 'Enter', false)?.text).toBe('1. En\n')
    expect(listKey('Vanlig', 6, 6, 'Enter', false)).toBeNull()
  })
})

describe('dokumenter og sikkerhetskopi', () => {
  it('kontroll av dokument: ukjente felt og kilder fjernes, kjente beholdes', () => {
    const doc = { ...emptyDoc(), layers: [{ ...L('image', { src: 'db:uabc123', orig: 'http://x' }), id: 'a1', evil: 1 }, { type: 'script' }, { ...L('text'), link: 'a1', barW: 1.5 }] }
    const d = cleanDoc(doc, (s) => (s === 'db:uabc123' ? 'm:11111111-1111-4111-8111-111111111111' : null))
    expect(d?.layers).toHaveLength(2)
    const img = d?.layers[0]
    expect(img?.type === 'image' && img.src).toBe('m:11111111-1111-4111-8111-111111111111')
    expect(img?.type === 'image' && img.orig).toBeNull()
    expect((img as unknown as Record<string, unknown>).evil).toBeUndefined()
    expect(d?.layers[1]?.link).toBe('a1')
    expect(cleanDoc({ layers: 'nei' }, () => null)).toBeNull()
  })

  it('kategori med flere grunnoppsett', () => {
    const c = cleanCategory({ id: 'x', name: 'N', base: 'kbs', layouts: [{ id: 'l1', name: 'To', doc: base('kbs') }], defaultLayout: 'l1' }, () => null)
    expect(c?.layouts?.[0]?.id).toBe('l1')
    expect(c?.defaultLayout).toBe('l1')
    expect(cleanCategory({ id: 'y', base: 'ukjent' }, () => null)?.base).toBe('blank')
  })

  it('nøkler i sikkerhetskopien har dagens form', () => {
    expect(backupKey('m:11111111-1111-4111-8111-111111111111')).toMatch(/^u[a-z0-9]{4,40}$/i)
    expect(backupKey('db:uabc')).toBe('uabc')
  })

  it('gjenoppretter dagens format og legger bildene inn på nytt', async () => {
    const png = 'data:image/png;base64,iVBORw0KGgo='
    const doc = { ...emptyDoc(), layers: [L('image', { src: 'db:uimg01' })] }
    const json = JSON.stringify({ app: 'thumbstudio', v: 1, cats: [{ id: 'c1', name: 'K', base: 'sunday' }], tpls: Array.from({ length: 7 }, (_, i) => ({ id: `t${i}`, catId: 'c1', name: `M${i}`, doc, thumb: '', updated: 1 })), images: { uimg01: png } })
    const file = new File([json], 'kopi.json', { type: 'application/json' })
    const r = await restore(file, async () => 'm:22222222-2222-4222-8222-222222222222')
    expect(r.cats).toHaveLength(1)
    expect(r.tpls).toHaveLength(5)
    const l = r.tpls[0]?.doc.layers[0]
    expect(l?.type === 'image' && l.src).toBe('m:22222222-2222-4222-8222-222222222222')
    await expect(restore(new File(['{}'], 'x.json'), async () => null)).rejects.toThrow('format')
  })

  it('egne bilder telles (maks 5), logoer fra Fellesmappe teller ikke', () => {
    const d = { ...emptyDoc(), layers: [L('image', { src: 'm:a' }), L('image', { src: 'm:a' }), L('image', { src: 'ch:b' })] }
    expect(countImgs(d)).toBe(1)
  })
})

describe('felles grunnoppsett', () => {
  it('slår sammen felt for felt; samme felt endret av begge gir deres verdi og en konflikt', () => {
    const r = merge3({ a: 1, b: 1, c: 1 }, { a: 2, b: 1, c: 3 }, { a: 1, b: 5, c: 4 })
    expect(r.data).toEqual({ a: 2, b: 5, c: 4 })
    expect(r.conflicts).toEqual(['c'])
    expect(same({ x: 1, y: [1, { z: 2 }] }, { y: [1, { z: 2 }], x: 1 })).toBe(true)
  })
})
