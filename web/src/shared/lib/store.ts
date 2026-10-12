import { useSyncExternalStore } from 'react'

/**
 * Minimal observerbar verdi for tjenester utenfor React. Komponenter leser den med `useStore`,
 * så bare komponentene som bruker verdien, tegnes på nytt.
 */
export interface Store<T> {
  get(): T
  set(next: T | ((prev: T) => T)): void
  subscribe(listener: () => void): () => void
}

export function createStore<T>(initial: T): Store<T> {
  let value = initial
  const listeners = new Set<() => void>()
  return {
    get: () => value,
    set(next) {
      const resolved = typeof next === 'function' ? (next as (prev: T) => T)(value) : next
      if (Object.is(resolved, value)) return
      value = resolved
      for (const l of [...listeners]) l()
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

export function useStore<T>(store: Pick<Store<T>, 'get' | 'subscribe'>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.get)
}

/**
 * Som `subscribe`, men mange endringer rett etter hverandre gir ett kall (etter `ms` uten nye endringer).
 * Brukes der hver endring utløser tung henting, f.eks. Dine medier under opplasting av mange filer.
 */
export function subscribeSettled(store: Pick<Store<unknown>, 'subscribe'>, listener: () => void, ms = 150): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined
  const unsubscribe = store.subscribe(() => {
    clearTimeout(timer)
    timer = setTimeout(listener, ms)
  })
  return () => {
    clearTimeout(timer)
    unsubscribe()
  }
}
