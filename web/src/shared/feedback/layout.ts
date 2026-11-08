/**
 * Trygt omriss av siden rundt en markering (TB-53E3CF): bare plassering og type for knapper, felt, overskrifter, paneler,
 * mediefelt og tekstlinjer, så innboksen kan vise siden med markeringen. Aldri innhold: bilder, video og lerret blir tomme
 * felt, feltverdier og vanlig tekst blir grå streker, og bare korte etiketter på knapper, faner, overskrifter og ledetekster
 * tas med (og bare når de ikke ser ut som navn, e-post, tall eller filnavn, eller står i lister/rader med brukerinnhold).
 *
 * Formatet er kompakt fordi markeringen har en øvre grense i databasen (submit_feedback: 4000 byte): hvert element er
 * «type x y b h[|etikett]» med koordinater i promille av vinduet. Typer: n sidens ramme (topplinje, sidemeny, navigasjon),
 * p panel/kort, r tabellrad/listerad (uten innhold), b knapp, i felt, h overskrift, l ledetekst, m medier, t tekst.
 */
export type LayoutKind = 'n' | 'p' | 'r' | 'b' | 'i' | 'h' | 'l' | 'm' | 't'
export interface LayoutItem { k: LayoutKind; x: number; y: number; w: number; h: number; label?: string }

const BUDGET = 3000
const MAX_LABEL = 24
const BTN = 'button,a[href],summary,[role=button],[role=tab],[role=menuitem],[role=link],[role=switch],[role=checkbox],[role=radio]'
const PRIVATE = '[data-fb-private],[contenteditable=""],[contenteditable=true],li,tr,[role=row],[role=listitem],[role=option],[role=gridcell]'

/** Etiketter som kan være brukerinnhold, tas ikke med. */
export function safeLabel(s: string): string {
  const v = s.replace(/\s+/g, ' ').trim()
  if (!v || v.length > 40) return ''
  if (/@|\d{3,}|\.[a-z0-9]{2,4}$|https?:|www\./i.test(v)) return ''
  return v.slice(0, MAX_LABEL)
}

export function encodeLayout(items: LayoutItem[]): string[] {
  return items.map((i) => `${i.k} ${i.x} ${i.y} ${i.w} ${i.h}` + (i.label ? '|' + i.label.replace(/\|/g, '/') : ''))
}

export function decodeLayout(rows: unknown): LayoutItem[] {
  if (!Array.isArray(rows)) return []
  const out: LayoutItem[] = []
  for (const r of rows) {
    if (typeof r !== 'string') continue
    const [head = '', label] = r.split('|')
    const [k, ...n] = head.split(' ')
    const [x, y, w, h] = n.map(Number)
    if (!k || !/^[nprbihlmt]$/.test(k) || [x, y, w, h].some((v) => v === undefined || !Number.isFinite(v))) continue
    out.push({ k: k as LayoutKind, x: x as number, y: y as number, w: w as number, h: h as number, ...(label ? { label } : {}) })
  }
  return out
}

// + ett tegn per rad: databasen lagrer jsonb med mellomrom etter komma
const bytes = (s: string[]) => new TextEncoder().encode(JSON.stringify(s)).length + s.length

function kindOf(el: Element, cs: CSSStyleDeclaration, r: DOMRect, W: number, H: number): LayoutKind | null {
  const tag = el.tagName.toLowerCase()
  if (/^(img|video|canvas|picture|iframe)$/.test(tag)) return 'm'
  if (tag === 'svg') return r.width >= 48 && r.height >= 48 ? 'm' : null
  if (/^(input|select|textarea)$/.test(tag)) return (el as HTMLInputElement).type === 'hidden' ? null : 'i'
  if (el.matches(BTN)) return 'b'
  if (/^h[1-4]$/.test(tag) || el.getAttribute('role') === 'heading') return 'h'
  if (/^(label|legend|th)$/.test(tag)) return 'l'
  // sidens ramme: topplinje, sidemeny og navigasjon (også uten egen bakgrunn)
  if (/^(header|nav|aside)$/.test(tag) || /^(banner|navigation|complementary)$/.test(el.getAttribute('role') || '')) return r.width >= 24 && r.height >= 16 ? 'n' : null
  // rader i tabeller og lister: bare plassen, aldri innholdet
  if (tag === 'tr' || el.getAttribute('role') === 'row') return 'r'
  const big = r.width >= W * 0.08 && r.height >= H * 0.06
  const filled = !/rgba\(0, 0, 0, 0\)|transparent/.test(cs.backgroundColor) || cs.backgroundImage !== 'none'
  const framed = parseFloat(cs.borderTopWidth) > 0 || parseFloat(cs.borderLeftWidth) > 0 || cs.boxShadow !== 'none'
  if (big && (filled || framed) && r.width < W * 0.995) return 'p'
  // tekst: element med egen, synlig tekst (vises som strek)
  for (const n of Array.from(el.childNodes)) if (n.nodeType === 3 && (n.textContent ?? '').trim().length > 1) return 't'
  return null
}

/**
 * Omrisset av det som vises i vinduet nå. skip = elementer som ikke er en del av siden (markeringsverktøyet).
 * Elementer som ligger bak andre (f.eks. under et åpent skjema) tas med i den rekkefølgen de står i siden.
 */
export function pageLayout(skip: (el: Element) => boolean = () => false, root: Element = document.body, budget = BUDGET): string[] {
  const W = innerWidth, H = innerHeight
  if (!W || !H) return []
  const items: { it: LayoutItem; rank: number }[] = []
  const walk = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT)
  for (let el = walk.nextNode() as Element | null; el && items.length < 600; el = walk.nextNode() as Element | null) {
    if (skip(el) || /^(script|style|noscript|template|head|meta|link|option)$/i.test(el.tagName)) continue
    const r = el.getBoundingClientRect()
    if (r.width < 4 || r.height < 4 || r.right <= 0 || r.bottom <= 0 || r.left >= W || r.top >= H) continue
    const cs = getComputedStyle(el)
    if (cs.visibility === 'hidden' || cs.display === 'none' || (cs.opacity !== '' && Number(cs.opacity) < 0.05)) continue
    const k = kindOf(el, cs, r, W, H)
    if (!k) continue
    // dekorasjon (f.eks. den bevegelige bakgrunnen) hører ikke til sidens innhold
    if ((k === 'm' || k === 'p') && (el.closest('[aria-hidden="true"]') || cs.pointerEvents === 'none')) continue
    const x0 = Math.max(0, r.left), y0 = Math.max(0, r.top), x1 = Math.min(W, r.right), y1 = Math.min(H, r.bottom)
    const it: LayoutItem = { k, x: Math.round((x0 / W) * 1000), y: Math.round((y0 / H) * 1000), w: Math.max(1, Math.round(((x1 - x0) / W) * 1000)), h: Math.max(1, Math.round(((y1 - y0) / H) * 1000)) }
    if ((k === 'b' || k === 'h' || k === 'l') && !el.closest(PRIVATE)) {
      const label = safeLabel(el.getAttribute('aria-label') || (el as HTMLElement).innerText || el.textContent || '')
      if (label) it.label = label
    }
    items.push({ it, rank: ({ n: 0, p: 0, h: 1, b: 1, r: 2, i: 2, l: 2, m: 3, t: 4 } as const)[k] })
  }
  // innenfor grensen: viktigst først (paneler, knapper og overskrifter), tekststreker sist; sidens rekkefølge beholdes
  const order = items.map((x, i) => ({ ...x, i })).sort((a, b) => a.rank - b.rank || a.i - b.i)
  const keep = new Set<number>()
  let rows: string[] = []
  for (const o of order) {
    const next = encodeLayout([o.it])
    if (bytes(rows.concat(next)) > budget) break
    rows = rows.concat(next)
    keep.add(o.i)
  }
  return encodeLayout(items.filter((_, i) => keep.has(i)).map((x) => x.it))
}
