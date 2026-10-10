import { isToolId, type ToolId } from '../domain/tool'
import { createStore, type Store } from '../shared/lib/store'

/**
 * Liten, typet ruter over History API (ADR-3 i docs/architecture.md).
 * Adresser: /app/ (oversikt), /app/<verktøy>[?asset=…&project=…].
 */
export type Route =
  | { name: 'hub' }
  | { name: 'library' }
  | { name: 'tool'; tool: ToolId; query: Readonly<Record<string, string>> }
  | { name: 'not-found'; path: string }

export const DEFAULT_BASE = '/app/'
/** «Dine medier» (felles mediebibliotek). */
export const LIBRARY_PATH = 'medier'

function normalizeBase(base: string): string {
  return `/${base.replace(/^\/+|\/+$/g, '')}/`.replace(/^\/\/$/, '/')
}

export function parseLocation(pathname: string, search: string, base = DEFAULT_BASE): Route {
  const b = normalizeBase(base)
  const path = pathname.endsWith('/') ? pathname : `${pathname}/`
  if (!path.startsWith(b)) return { name: 'not-found', path: pathname }
  const rest = path.slice(b.length).replace(/\/+$/, '')
  if (rest === '') return { name: 'hub' }
  if (rest === LIBRARY_PATH) return { name: 'library' }
  if (isToolId(rest)) {
    const query: Record<string, string> = {}
    for (const [k, v] of new URLSearchParams(search)) query[k] = v
    return { name: 'tool', tool: rest, query }
  }
  return { name: 'not-found', path: pathname }
}

export function hrefFor(route: Route, base = DEFAULT_BASE): string {
  const b = normalizeBase(base)
  switch (route.name) {
    case 'hub':
      return b
    case 'library':
      return `${b}${LIBRARY_PATH}`
    case 'tool': {
      const qs = new URLSearchParams(route.query).toString()
      return `${b}${route.tool}${qs ? `?${qs}` : ''}`
    }
    case 'not-found':
      return route.path
  }
}

export const sameRoute = (a: Route, b: Route): boolean => hrefFor(a) === hrefFor(b)

export interface Router {
  route: Store<Route>
  navigate(target: Route, opts?: { replace?: boolean }): void
  /** Kalles før navigering; returner false for å stoppe (f.eks. ulagrede endringer). */
  setGuard(guard: ((next: Route) => boolean | Promise<boolean>) | null): void
  dispose(): void
}

export function createRouter(base = DEFAULT_BASE, win: Window = window): Router {
  const read = () => parseLocation(win.location.pathname, win.location.search, base)
  const route = createStore<Route>(read())
  let guard: ((next: Route) => boolean | Promise<boolean>) | null = null

  const onPop = () => route.set(read())
  win.addEventListener('popstate', onPop)

  return {
    route,
    async navigate(target, opts = {}) {
      if (sameRoute(target, route.get())) return
      if (guard && !(await guard(target))) return
      const href = hrefFor(target, base)
      if (opts.replace) win.history.replaceState(null, '', href)
      else win.history.pushState(null, '', href)
      route.set(target)
      win.scrollTo?.(0, 0)
    },
    setGuard(next) {
      guard = next
    },
    dispose() {
      win.removeEventListener('popstate', onPop)
    },
  }
}
