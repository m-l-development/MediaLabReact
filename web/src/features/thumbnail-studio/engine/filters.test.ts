import { describe, expect, it } from 'vitest'
import { EN } from '../texts'
import { cleanDoc } from './backup'
import { activeFilters, blurScale, cleanFilters, FILTERS, newFilter, pixelFilter } from './filters'
import { emptyDoc, L } from './model'

describe('bildefiltre F01–F13', () => {
  it('har alle 13 filtrene fra materialet, med tekster på engelsk', () => {
    expect(FILTERS.map((f) => f.id)).toEqual(['F01', 'F02', 'F03', 'F04', 'F05', 'F06', 'F07', 'F08', 'F09', 'F10', 'F11', 'F12', 'F13'])
    const en = EN as Record<string, string>
    for (const f of FILTERS) {
      for (const t of [f.name, f.use, ...f.params.map((p) => p.label), ...f.params.flatMap((p) => (p.t === 'seg' ? p.opts.map((o) => o[1]) : []))]) expect(en[t], t).toBeTruthy()
    }
  })
  it('nytt filter får standardverdiene fra materialet', () => {
    expect(newFilter('F01')).toEqual({ id: 'F01', on: true, p: { str: 1, start: 0.4, color: '#000000' } })
    expect(newFilter('F10').p).toEqual({ str: 0.35, blend: 'overlay' })
    expect(newFilter('F04', { color: '#123456' }).p.color).toBe('#123456')
  })
  it('rydder lagrede filtre: ukjente filtre og verdier utenfor området', () => {
    expect(cleanFilters(null)).toBeUndefined()
    const fs = cleanFilters([{ id: 'F99' }, { id: 'F06', p: { con: 9, bri: 'x' } }, { id: 'F04', on: false, p: { color: 'red', blend: 'evil' } }])
    expect(fs).toEqual([{ id: 'F06', on: true, p: { con: 1.4, bri: 1 } }, { id: 'F04', on: false, p: { color: '#f5b800', blend: 'color', str: 0.5 } }])
    expect(activeFilters(fs).map((f) => f.id)).toEqual(['F06'])
  })
  it('pikselfiltrene i rekkefølge; uskarphet skaleres med dokumentet og lerretet', () => {
    const fs = [newFilter('F06'), newFilter('F07', { blur: 8 })]
    expect(pixelFilter(fs, 1.5, 0.5)).toBe('grayscale(1) contrast(1.1) brightness(1) blur(6.00px) brightness(0.9)')
    expect(blurScale(fs)).toBe(1.06)
    expect(blurScale([newFilter('F07', { blur: 0 })])).toBe(1)
    expect(pixelFilter([newFilter('F01')], 1.5, 1)).toBe('')
  })
  it('filtrene overlever lagring og åpning; eldre prosjekter uten filtre er uendret', () => {
    const d = emptyDoc()
    d.layers = [L('image', { id: 'a1', filters: [newFilter('F03'), newFilter('F10', { blend: 'multiply' })] }), L('image', { id: 'a2' })]
    const back = cleanDoc(JSON.parse(JSON.stringify(d)), () => null)
    const [a, b] = back?.layers ?? []
    expect(a?.type === 'image' && a.filters?.map((f) => [f.id, f.p.blend])).toEqual([['F03', undefined], ['F10', 'multiply']])
    expect(b?.type === 'image' && b.filters).toBeUndefined()
  })
})
