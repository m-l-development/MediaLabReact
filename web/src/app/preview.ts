/**
 * Skrivebeskyttet forhåndsvisning for tilbakemeldingsinnboksen: innboksen viser den ekte siden (appens egne komponenter,
 * ikoner og design) i en ramme med `?ch-preview=<rolle>`. Må lastes før alt annet (første import i main.tsx), så ingen
 * modul rekker å lese ekte lagring.
 *
 * - Bare inne i en ramme fra samme opphav (innboksen); ellers ingen virkning.
 * - Ingen brukerdata: ingen backend (preview-services.ts gir tomme tjenester og nøytrale plassholdere).
 * - Rører aldri den innloggedes data: localStorage/sessionStorage ligger bare i minnet, IndexedDB får egne midlertidige
 *   databaser (slettes når rammen lukkes), og bare lesing av appens egne filer slipper gjennom til nettverket.
 * - Rammen tar ikke imot klikk eller tastatur (innboksen legger den bak en flate), så ingenting kan endres.
 */
const q = new URLSearchParams(location.search)
let embedded = false
try {
  embedded = window.parent !== window && window.parent.location.origin === location.origin
} catch {
  embedded = false
}
const ROLES = ['developer', 'moderator', 'admin', 'user']

/** null = vanlig app. */
export const preview: { role: string } | null = q.has('ch-preview') && embedded ? { role: ROLES.includes(q.get('ch-preview') ?? '') ? (q.get('ch-preview') as string) : 'user' } : null

function memoryStorage(): Storage {
  const m = new Map<string, string>()
  return {
    get length() { return m.size },
    key: (i: number) => [...m.keys()][i] ?? null,
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => { m.set(k, String(v)) },
    removeItem: (k: string) => { m.delete(k) },
    clear: () => m.clear(),
  }
}

if (preview) {
  Object.defineProperty(window, 'localStorage', { configurable: true, value: memoryStorage() })
  Object.defineProperty(window, 'sessionStorage', { configurable: true, value: memoryStorage() })
  const real = window.indexedDB
  if (real) {
    const P = 'ch-preview:'
    const clean = () => void real.databases?.().then((l) => l.forEach((d) => { if (d.name?.startsWith(P)) real.deleteDatabase(d.name) }), () => undefined)
    clean()
    addEventListener('pagehide', clean)
    const fake: IDBFactory = {
      open: (n: string, v?: number) => (v === undefined ? real.open(P + n) : real.open(P + n, v)),
      deleteDatabase: (n: string) => real.deleteDatabase(P + n),
      cmp: (a: unknown, b: unknown) => real.cmp(a, b),
      databases: async () => (await real.databases()).filter((d) => d.name?.startsWith(P)).map((d) => ({ ...d, name: d.name?.slice(P.length) ?? '' })),
    }
    Object.defineProperty(window, 'indexedDB', { configurable: true, value: fake })
  }
  const f = window.fetch.bind(window)
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : String(input), location.href)
    const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase()
    if (url.origin !== location.origin || method !== 'GET' || url.pathname.startsWith('/api/')) return Promise.reject(new TypeError('Ikke tillatt i forhåndsvisningen'))
    return f(input, init)
  }
  navigator.sendBeacon = () => false
  window.open = () => null
}
