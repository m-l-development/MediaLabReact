import { localStore } from '../lib/storage'
import { createStore, useStore } from '../lib/store'
import { en, no, type MessageKey, type Messages } from './messages'

export type Lang = 'no' | 'en'

/** Samme nøkkel som dagens app (media-lab/src/legacy/i18n.js), så valget følger brukeren mellom appene. */
export const LANG_KEY = 'medialab.lang'

const catalogs: Record<Lang, Messages> = { no, en }

const readLang = (): Lang => (localStore.get(LANG_KEY) === 'en' ? 'en' : 'no')

export const langStore = createStore<Lang>(readLang())

export function setLang(lang: Lang): void {
  localStore.set(LANG_KEY, lang)
  langStore.set(lang)
  document.documentElement.lang = lang === 'en' ? 'en' : 'no'
}

export type Vars = Record<string, string | number>

export function format(template: string, vars?: Vars): string {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (m, name: string) => (name in vars ? String(vars[name]) : m))
}

export function translate(lang: Lang, key: MessageKey, vars?: Vars): string {
  return format(catalogs[lang][key], vars)
}

export type Translate = (key: MessageKey, vars?: Vars) => string

/** Gir `t` for gjeldende språk. Komponenten tegnes på nytt når språket byttes. */
export function useT(): Translate {
  const lang = useStore(langStore)
  return (key, vars) => translate(lang, key, vars)
}

export function useLang(): Lang {
  return useStore(langStore)
}

// Andre faner (eller dagens app i en annen fane) kan bytte språk.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === LANG_KEY) langStore.set(readLang())
  })
}
