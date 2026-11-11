import { fontByName } from './catalog'

/**
 * Laster fonter fra biblioteket når de trengs (valgt i velgeren, brukt i et prosjekt, en mal eller i eksporten).
 * Stilarket (/fonts/<id>.css) legges inn én gang per font; nettleseren henter bare snittene som faktisk tegnes.
 * Fontene som alltid lastes (fonts.css) og fonter utenfor biblioteket trenger ingen stilark.
 * Canvas tegner bare med fonter som er ferdig lastet, så tegning venter på `loadFont` / `loadFonts`.
 */
const sheets = new Map<string, Promise<void>>()
const ready = new Map<string, Promise<boolean>>()

/** Fontene i /fonts/fonts.css (lastes på alle sider fra før). */
const CORE = new Set(['space grotesk', 'bebas neue', 'anton', 'dm serif display', 'archivo', 'montserrat', 'league spartan', 'oswald', 'playfair display'])

function sheet(name: string): Promise<void> {
  const f = fontByName(name)
  if (!f || CORE.has(name.toLowerCase()) || typeof document === 'undefined') return Promise.resolve()
  let p = sheets.get(f.id)
  if (!p) {
    p = new Promise<void>((resolve) => {
      const l = document.createElement('link')
      l.rel = 'stylesheet'
      l.href = f.css
      l.dataset.font = f.id
      l.onload = () => resolve()
      // fonten mangler: reservefonten brukes (prosjektet åpnes likevel)
      l.onerror = () => { sheets.delete(f.id); resolve() }
      document.head.appendChild(l)
    })
    sheets.set(f.id, p)
  }
  return p
}

/** Laster et snitt av fonten (æ, ø og å med). Gir true når fonten er klar, false når den ikke kunne lastes. */
export function loadFont(name: string, weight: number | string = 400, italic = false): Promise<boolean> {
  if (!name || typeof document === 'undefined' || !document.fonts?.load) return Promise.resolve(false)
  const k = `${italic ? 'italic ' : ''}${weight} 40px "${name}"`
  let p = ready.get(k)
  if (!p) {
    p = sheet(name)
      .then(() => document.fonts.load(k, 'ÆØÅ æøå Hg'))
      .then((l) => l.length > 0)
      .catch(() => false)
    ready.set(k, p)
  }
  return p
}

/** Laster flere snitt på en gang (f.eks. alle tekstlagene i et dokument før tegning eller eksport). */
export function loadFonts(list: readonly { font: string; weight?: number | string; italic?: boolean }[]): Promise<unknown> {
  const seen = new Set<string>()
  const ps: Promise<boolean>[] = []
  for (const x of list) {
    if (!x.font) continue
    const k = `${x.font}|${x.weight ?? 400}|${x.italic ? 1 : 0}`
    if (seen.has(k)) continue
    seen.add(k)
    ps.push(loadFont(x.font, x.weight ?? 400, !!x.italic))
  }
  return Promise.all(ps)
}

/** Er stilarket for fonten lagt inn (til forhåndsvisning i velgeren uten å vente)? */
export function fontRequested(name: string): boolean {
  const f = fontByName(name)
  return !f || CORE.has(name.toLowerCase()) || sheets.has(f.id)
}

/** Bare for forhåndsvisningen i velgeren: legger inn stilarket uten å vente. */
export function preloadSheet(name: string): void {
  void sheet(name)
}
