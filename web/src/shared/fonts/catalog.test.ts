import { describe, expect, it } from 'vitest'
import rows from '../../../../docs/fontkatalog.json'
import { fallbackOf, FONT_CATALOG, fontByName, hasSnitt, weightsOf } from './catalog'

describe('det felles fontbiblioteket', () => {
  it('har bare fonter med åpen lisens (ingen av de røde i fontbiblioteket)', () => {
    const blocked = new Set((rows as { name: string; lic: string; src: string }[]).filter((r) => r.lic !== 'ok' || r.src === 'x').map((r) => r.name))
    expect(FONT_CATALOG.length).toBeGreaterThan(190)
    expect(FONT_CATALOG.filter((f) => blocked.has(f.name))).toEqual([])
    // lisensen er den fontpakken oppgir (OFL for de fleste; Apache-2.0 for fire Google-fonter; CC0/Unlicense for to åpne)
    expect(FONT_CATALOG.filter((f) => !['OFL-1.1', 'Apache-2.0', 'CC0-1.0', 'Unlicense'].includes(f.license) || !f.css.startsWith('/fonts/') || !f.css.endsWith('.css'))).toEqual([])
    expect(FONT_CATALOG.filter((f) => f.license === 'Apache-2.0').map((f) => f.name).sort()).toEqual(['Permanent Marker', 'Satisfy', 'Syncopate', 'Ultra'])
    expect(FONT_CATALOG.filter((f) => f.source === 'open').map((f) => f.name).sort()).toEqual(['Aileron', 'Apfel Grotezk', 'Bagnard', 'Bagnard Sans', 'Bluu Next', 'Cooper Hewitt', 'Junction', 'Metropolis', 'Ostrich Sans', 'Pretendard', 'Uncut Sans'])
  })
  it('har alle fontene malene og appene bruker', () => {
    for (const n of ['Archivo', 'Montserrat', 'Bebas Neue', 'Anton', 'Oswald', 'League Spartan', 'Playfair Display', 'DM Serif Display', 'Space Grotesk', 'Fraunces', 'Six Caps', 'Pinyon Script', 'Bricolage Grotesque', 'UnifrakturMaguntia', 'Rubik Dirt']) {
      expect(fontByName(n)?.name, n).toBe(n)
    }
  })
  it('ekte snitt og vekter: B/I bare når fonten har dem; ukjente fonter som før', () => {
    expect(hasSnitt('Bebas Neue', 'b')).toBe(false)
    expect(hasSnitt('Bebas Neue', 'i')).toBe(false)
    expect(hasSnitt('Playfair Display', 'i')).toBe(true)
    expect(hasSnitt('Montserrat', 'b')).toBe(true)
    expect(weightsOf('Anton')).toEqual([400])
    expect(weightsOf('Montserrat')).toContain(900)
    expect(hasSnitt('Ukjent font', 'b')).toBe(true)
    expect(weightsOf('Ukjent font')).toBeNull()
    expect(fontByName('bebas neue')?.name).toBe('Bebas Neue')
  })
  it('reservefont etter stil', () => {
    expect(fallbackOf('Playfair Display')).toContain('serif')
    expect(fallbackOf('Space Mono')).toContain('monospace')
    expect(fallbackOf('Ukjent')).toContain('sans-serif')
  })
})

describe('Motion Design godtar fontene i biblioteket', () => {
  it('prosjekter beholder bibliotekets font; ukjente fonter blir Archivo som før', async () => {
    const { normalize } = await import('../../features/motion-design/engine/model')
    const p = normalize({ texts: [{ id: 't1', text: 'Hei', font: 'Fraunces' }, { id: 't2', text: 'Hei', font: 'Comic Ukjent' }, { id: 't3', text: 'Hei', font: 'Bebas Neue' }], subStyle: { font: 'Six Caps' } })
    expect(p.texts.map((x) => x.font)).toEqual(['Fraunces', 'Archivo', 'Bebas Neue'])
    expect(p.subStyle.font).toBe('Six Caps')
  })
})
