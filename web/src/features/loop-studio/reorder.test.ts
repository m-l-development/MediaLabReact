import { describe, expect, it } from 'vitest'
import type { Slide } from './engine/types'
import { daySlides, mergeDaySlides, moveSlideTo } from './model'
import { parse } from './engine/program.js'

/** TB-2CD75B: flytting av slides og «Oppdater videoen» beholder brukerens rekkefølge og ukedagene. */
const days = (text: string, old: Slide[] = []) => daySlides(parse(text).days, old, () => null, () => null)
const ids = (a: Slide[]) => a.map((s) => s.id)
const text = (id: string): Slide => ({ id, type: 'text', kicker: 'Info', body: id, dur: 5 } as Slide)

describe('flytting av slides', () => {
  const week = days('Mandag kl 19 Bønn\nTirsdag kl 18 Ungdom\nOnsdag kl 20 Kor')

  it('flytter en slide mellom mandag og tirsdag uten å endre ukedag, dato eller innhold', () => {
    const a = [...week, text('info')]
    const b = moveSlideTo(a, 'info', 1)
    expect(b.map((s) => s.type === 'day' ? s.day : s.id)).toEqual(['Mandag', 'info', 'Tirsdag', 'Onsdag'])
    expect(b.find((s) => s.id === week[1]!.id)).toBe(week[1]) // samme objekt: ingenting endret
  })

  it('først/sist og ugyldige verdier', () => {
    const a = [...week, text('info')]
    expect(ids(moveSlideTo(a, 'info', 0))[0]).toBe('info')
    expect(ids(moveSlideTo(a, week[0]!.id, 99)).at(-1)).toBe(week[0]!.id)
    expect(moveSlideTo(a, 'finnes-ikke', 0)).toBe(a)
    expect(moveSlideTo(a, 'info', 3)).toBe(a) // samme plass
  })
})

describe('«Oppdater videoen» fletter inn i brukerens rekkefølge', () => {
  const week = days('Mandag kl 19 Bønn\nTirsdag kl 18 Ungdom\nOnsdag kl 20 Kor')

  it('en egen slide mellom mandag og tirsdag blir der den er, og tirsdag forblir tirsdag', () => {
    const cur = moveSlideTo([...week, text('info')], 'info', 1)
    const next = mergeDaySlides(cur, days('Mandag kl 19 Bønn\nTirsdag kl 18 Ungdom\nOnsdag kl 20 Kor', cur))
    expect(next.map((s) => s.type === 'day' ? s.day : s.id)).toEqual(['Mandag', 'info', 'Tirsdag', 'Onsdag'])
  })

  it('manuelt flyttede ukedagsslider beholder plassen sin', () => {
    const cur = moveSlideTo(week, week[2]!.id, 0) // onsdag først
    const next = mergeDaySlides(cur, days('Mandag kl 19 Bønn\nTirsdag kl 18 Ungdom\nOnsdag kl 20 Kor', cur))
    expect(next.map((s) => s.day)).toEqual(['Onsdag', 'Mandag', 'Tirsdag'])
  })

  it('nytt møte legges etter sin egen dag; fjernet møte forsvinner; endret tittel beholder plassen', () => {
    const cur = [...week, text('info')]
    const next = mergeDaySlides(cur, days('Mandag kl 19 Bønnemøte\nTirsdag kl 18 Ungdom\nTirsdag kl 20 Lovsang', cur))
    expect(next.map((s) => s.type === 'day' ? `${s.day} ${s.title}` : s.id)).toEqual(['Mandag Bønnemøte', 'Tirsdag Ungdom', 'Tirsdag Lovsang', 'info'])
  })

  it('første gang (ingen ukedagsslider): som før – blokken først, i programmets rekkefølge', () => {
    const next = mergeDaySlides([text('a'), text('b')], week)
    expect(ids(next)).toEqual([...ids(week), 'a', 'b'])
  })

  it('et duplikat av en ukedagsslide (også i programmet) overlever oppdateringen på samme plass', () => {
    const dup = { ...week[0]!, id: week[0]!.id + '-k1' }
    const cur = [week[0]!, dup, week[1]!, week[2]!]
    const next = mergeDaySlides(cur, days('Mandag kl 19 Bønn\nMandag kl 19 Bønn\nTirsdag kl 18 Ungdom\nOnsdag kl 20 Kor', cur))
    expect(next.map((s) => s.day)).toEqual(['Mandag', 'Mandag', 'Tirsdag', 'Onsdag'])
    expect(next).toHaveLength(4)
  })
})
