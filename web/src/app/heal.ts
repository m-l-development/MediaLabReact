import { sessionStore } from '../shared/lib/storage'
import { isChunkLoadError } from './chunk-error'

/**
 * Selvreparasjon (PLT-05), som i dagens app: feiler en programfil (f.eks. like etter en publisering, når en gammel fil
 * er husket i nettleseren), hentes sidens filer forbi hurtigbufferen og siden lastes én gang til. Flagget
 * `medialab.heal` (samme som dagens app) hindrer en løkke; det fjernes når appen har startet (main.tsx).
 * Feil i selve oppstartsfilen fanges av det innebygde skriptet fra dagens app (lagt inn ved bygging, vite.config.ts).
 */
export const HEAL_KEY = 'medialab.heal'

export interface HealDeps {
  urls(): string[]
  refetch(url: string): Promise<unknown>
  reload(): void
}

const browser: HealDeps = {
  urls: () =>
    Array.from(document.querySelectorAll<HTMLScriptElement | HTMLLinkElement>('script[type=module][src],link[rel=modulepreload][href],link[rel=stylesheet][href*="/assets/"]')).map((e) =>
      'src' in e && e.src ? e.src : (e as HTMLLinkElement).href,
    ),
  refetch: (u) => fetch(u, { cache: 'reload', credentials: 'same-origin' }).catch(() => undefined),
  reload: () => location.reload(),
}

/** Prøver å reparere etter en feil ved lasting av et verktøy. → true når siden lastes på nytt. */
export function healChunk(error: Error, d: HealDeps = browser): boolean {
  if (!isChunkLoadError(error)) return false
  if (sessionStore.get(HEAL_KEY)) return false
  sessionStore.set(HEAL_KEY, '1')
  const failed = /(https?:\/\/\S+)/.exec(error.message)?.[1]
  const urls = [...new Set([...(failed ? [failed] : []), ...d.urls()])]
  void Promise.all(urls.map((u) => d.refetch(u))).then(() => d.reload())
  return true
}

/** Appen har startet: selvreparasjonen kan brukes igjen ved neste feil (samme som dagens app, etter 3 s). */
export function healDone(): void {
  setTimeout(() => sessionStore.remove(HEAL_KEY), 3000)
}
