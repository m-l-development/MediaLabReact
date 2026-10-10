import { describe, expect, it } from 'vitest'
import { format, LANG_KEY, langStore, setLang, translate } from './i18n'
import { en, no } from './messages'

describe('i18n', () => {
  it('har engelsk tekst for hver norsk nøkkel, og ingen tomme tekster', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(no).sort())
    for (const [key, value] of Object.entries(en)) expect(value, key).not.toBe('')
  })

  it('har samme plassholdere på begge språk', () => {
    const vars = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()
    for (const key of Object.keys(no) as (keyof typeof no)[]) expect(vars(en[key]), key).toEqual(vars(no[key]))
  })

  it('fyller inn plassholdere', () => {
    expect(format('Hei, {name}', { name: 'Kari' })).toBe('Hei, Kari')
    expect(format('{x} og {y}', { x: 1 })).toBe('1 og {y}')
    expect(translate('en', 'hub.greeting', { name: 'Kari' })).toBe('Hi, Kari')
  })

  it('lagrer språket under samme nøkkel som dagens app', () => {
    setLang('en')
    expect(localStorage.getItem(LANG_KEY)).toBe('en')
    expect(langStore.get()).toBe('en')
    expect(document.documentElement.lang).toBe('en')
    setLang('no')
    expect(localStorage.getItem('medialab.lang')).toBe('no')
  })
})
