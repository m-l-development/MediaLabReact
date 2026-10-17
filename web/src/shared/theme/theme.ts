import { localStore } from '../lib/storage'
import { createStore, useStore } from '../lib/store'

export type Theme = 'dark' | 'light'

/** Samme nøkkel som dagens app (media-lab/src/legacy/theme.js). Mørk er standard. */
export const THEME_KEY = 'medialab.theme'

const readTheme = (): Theme => (localStore.get(THEME_KEY) === 'light' ? 'light' : 'dark')

export const themeStore = createStore<Theme>(readTheme())

function apply(theme: Theme): void {
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
}

export function initTheme(): void {
  apply(themeStore.get())
  window.addEventListener('storage', (e) => {
    if (e.key === THEME_KEY) {
      themeStore.set(readTheme())
      apply(themeStore.get())
    }
  })
}

export function setTheme(theme: Theme): void {
  localStore.set(THEME_KEY, theme)
  themeStore.set(theme)
  apply(theme)
}

export const useTheme = (): Theme => useStore(themeStore)
