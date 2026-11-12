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

// ---- bredde (font-stretch) på lerretet ----
// Canvas kan bare velge bredde med nøkkelord (condensed = 75 % …), mens malene bruker eksakte prosenter (f.eks. Archivo
// 78 %). Fonter med bredde-akse får derfor en egen familie per bredde: samme fontfiler, men med fast bredde i
// @font-face (nettleseren setter da aksen til akkurat den verdien).
const cssText = new Map<string, Promise<string>>()
const stretched = new Map<string, Promise<boolean>>()

/** Familienavnet for fonten i en gitt bredde (prosent). 100 % = fonten selv. */
export function stretchFamily(name: string, pct: number | undefined): string {
  const p = Math.round((pct ?? 100) * 10) / 10
  return !p || p === 100 ? name : `${name} wdth${p}`
}

const stretchOk = new Set<string>()
/** Er fonten lastet i denne bredden? Ellers tegnes den i vanlig bredde (aldri med en reservefont). */
export function stretchReady(name: string, pct: number | undefined): boolean {
  const fam = stretchFamily(name, pct)
  return fam === name || stretchOk.has(fam)
}

/** Laster fonten i bredden `pct` (en egen familie, se `stretchFamily`). Gir false når fonten ikke har bredde-akse. */
export function loadStretch(name: string, pct: number, weight: number | string = 400, italic = false): Promise<boolean> {
  const fam = stretchFamily(name, pct)
  if (fam === name) return loadFont(name, weight, italic)
  const f = fontByName(name)
  if (!f || typeof document === 'undefined' || typeof FontFace === 'undefined') return Promise.resolve(false)
  let p = stretched.get(fam)
  if (!p) {
    let css = cssText.get(f.css)
    if (!css) {
      css = fetch(f.css).then((r) => (r.ok ? r.text() : '')).catch(() => '')
      cssText.set(f.css, css)
    }
    p = css.then((text) => {
      let n = 0
      for (const b of text.match(/@font-face\s*{[^}]*}/g) ?? []) {
        if (!/font-stretch\s*:\s*[\d.]+%\s+[\d.]+%/.test(b)) continue
        // siste egenskap i blokken har ofte ikke semikolon
        const src = /src\s*:\s*([^;}]+)/.exec(b)?.[1]
        if (!src) continue
        // relative adresser i stilarket gjelder fra stilarkets mappe
        const abs = src.replace(/url\((['"]?)([^'")]+)\1\)/g, (_m, _q, u: string) => `url("${new URL(u, new URL(f.css, location.href)).href}")`)
        const desc: FontFaceDescriptors = { stretch: `${pct}%` }
        const st = /font-style\s*:\s*([^;}]+)/.exec(b)?.[1]?.trim()
        const wt = /font-weight\s*:\s*([^;}]+)/.exec(b)?.[1]?.trim()
        const ur = /unicode-range\s*:\s*([^;}]+)/.exec(b)?.[1]?.trim()
        if (st) desc.style = st
        if (wt) desc.weight = wt
        if (ur) desc.unicodeRange = ur
        document.fonts.add(new FontFace(fam, abs, desc))
        n++
      }
      return n > 0
    })
    stretched.set(fam, p)
  }
  return p
    .then((ok) => (ok ? document.fonts.load(`${italic ? 'italic ' : ''}${weight} 40px "${fam}"`, 'ÆØÅ æøå Hg').then((l) => l.length > 0) : false))
    .then((ok) => {
      if (ok) stretchOk.add(fam)
      return ok
    })
    .catch(() => false)
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
