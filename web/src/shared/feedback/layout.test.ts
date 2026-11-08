import { afterEach, describe, expect, it } from 'vitest'
import { decodeLayout, encodeLayout, pageLayout, safeLabel } from './layout'

/** TB-53E3CF: omrisset av siden tar bare med generelle elementer, aldri innhold, og holder seg under grensen. */
afterEach(() => { document.body.innerHTML = '' })

const place = (el: HTMLElement, x: number, y: number, w: number, h: number) => {
  el.getBoundingClientRect = () => ({ left: x, top: y, right: x + w, bottom: y + h, width: w, height: h, x, y, toJSON: () => ({}) }) as DOMRect
  return el
}

describe('feedback layout', () => {
  it('etiketter som kan være brukerinnhold, droppes', () => {
    expect(safeLabel('Kopier alle saker')).toBe('Kopier alle saker')
    expect(safeLabel('ola@example.com')).toBe('')
    expect(safeLabel('Bilde 2026.png')).toBe('')
    expect(safeLabel('Faktura 123456')).toBe('')
  })
  it('koder og leser tilbake; ugyldige rader hoppes over', () => {
    const rows = encodeLayout([{ k: 'b', x: 10, y: 20, w: 30, h: 40, label: 'A|B' }, { k: 'm', x: 0, y: 0, w: 5, h: 5 }])
    expect(rows).toEqual(['b 10 20 30 40|A/B', 'm 0 0 5 5'])
    expect(decodeLayout([...rows, 'x 1 2 3 4', 'b 1 2', 7])).toEqual([{ k: 'b', x: 10, y: 20, w: 30, h: 40, label: 'A/B' }, { k: 'm', x: 0, y: 0, w: 5, h: 5 }])
  })
  it('knapper får etikett, bilder og feltverdier blir tomme felt, lister gir ingen etiketter', () => {
    document.body.innerHTML = '<button id="b">Kopier alle saker</button><img id="i" alt="Ola privat"><input id="f" value="hemmelig"><ul><li><button id="l">Mitt prosjekt</button></li></ul>'
    place(document.getElementById('b') as HTMLElement, 10, 10, 100, 30)
    place(document.getElementById('i') as HTMLElement, 10, 50, 200, 100)
    place(document.getElementById('f') as HTMLElement, 10, 160, 200, 30)
    place(document.getElementById('l') as HTMLElement, 10, 200, 100, 30)
    const rows = pageLayout()
    const all = rows.join('\n')
    expect(rows.some((r) => r.startsWith('b ') && r.endsWith('|Kopier alle saker'))).toBe(true)
    expect(rows.some((r) => r.startsWith('m '))).toBe(true)
    expect(rows.some((r) => r.startsWith('i '))).toBe(true)
    expect(all).not.toMatch(/Ola|hemmelig|Mitt prosjekt/)
  })
  it('holder seg under grensen i databasen (4000 byte for hele markeringen)', () => {
    for (let i = 0; i < 400; i++) {
      const b = document.createElement('button')
      b.textContent = 'Knapp nummer ' + String.fromCharCode(65 + (i % 26)) + 'æøå'
      document.body.appendChild(place(b, (i * 7) % 1000, (i * 3) % 700, 60, 20))
    }
    const rows = pageLayout()
    expect(rows.length).toBeGreaterThan(20)
    expect(new TextEncoder().encode(JSON.stringify(rows)).length).toBeLessThanOrEqual(3000)
  })
})

describe('feedback layout: sidens ramme og tabeller (TB-53E3CF)', () => {
  it('topplinje/sidemeny blir ramme, tabellrader blir rader uten innhold', () => {
    document.body.innerHTML = '<header id="h"></header><aside id="a"></aside><table><tbody><tr id="r"><td>Ola Nordmann</td></tr></tbody></table>'
    place(document.getElementById('h') as HTMLElement, 0, 0, 1000, 50)
    place(document.getElementById('a') as HTMLElement, 0, 50, 200, 700)
    place(document.getElementById('r') as HTMLElement, 220, 100, 700, 30)
    const rows = pageLayout()
    expect(rows.filter((r) => r.startsWith('n ')).length).toBe(2)
    expect(rows.some((r) => r.startsWith('r '))).toBe(true)
    expect(rows.join('\n')).not.toContain('Ola')
    expect(decodeLayout(rows).map((x) => x.k)).toContain('r')
  })
})
