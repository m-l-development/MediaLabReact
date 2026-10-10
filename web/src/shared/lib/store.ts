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
