/**
 * Lyst tema i Loop Studio, som i dagens app (media-lab/src/legacy/theme.js): sidene er bygget med mørke, innebygde
 * farger, og i lyst tema regnes nøytrale farger om per egenskap (tekst med kurve for god kontrast, flater og kanter litt
 * mørkere enn lineært). Mettede farger, bilder, video og lerreter røres ikke, heller ikke elementer i [data-keep-color].
 * Forskjell fra dagens app: bare Loop Studio-siden og dens egne stilark endres (ikke hele dokumentet).
 */
const cl = (v: number) => Math.max(0, Math.min(255, Math.round(v)))

export function mapRGB(r: number, g: number, b: number, a: number, prop: string): [number, number, number, number] | null {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), avg = (r + g + b) / 3
  if (mx - mn <= 28) {
    if (/shadow/.test(prop) && avg < 80) return null
    if (/^background/.test(prop) && a < 0.3 && avg > 150) return null
    const t = avg / 255, txt = /^(color|caret-color|fill|stroke|-webkit-text-fill-color|text-decoration-color)$/.test(prop)
    const G = txt ? 18 + 210 * Math.pow(1 - t, 1.6) : 228 - 208 * Math.pow(t, 0.85)
    let dr = r - avg, dg = g - avg, db = b - avg
    if (Math.abs(dr) < 2 && Math.abs(dg) < 2 && Math.abs(db) < 2) {
      const k = G / 228
      dr = 1.5 * k
      dg = 0
      db = -4.5 * k
    }
    return [cl(G + dr), cl(G + dg), cl(G + db), a]
  }
  if (prop === 'color' || prop === 'caret-color') {
    const L = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    if (L > 0.5) {
      const f = 0.36 / L
      return [cl(r * f), cl(g * f), cl(b * f), a]
    }
  }
  return null
}

const cache = new Map<string, string>()
export function mapValue(v: string, prop: string): string {
  if (!v || (v.includes('url(') && !/gradient/.test(v))) return v
  const key = prop + '|' + v, hit = cache.get(key)
  if (hit !== undefined) return hit
  const out = v.replace(/rgba?\(\s*(\d+(?:\.\d+)?)[\s,]+(\d+(?:\.\d+)?)[\s,]+(\d+(?:\.\d+)?)(?:\s*[,/]\s*([\d.]+%?))?\s*\)|\b(white|black)\b/g, (m: string, r?: string, g?: string, b?: string, a?: string, named?: string) => {
    let R = Number(r), Gc = Number(g), B = Number(b)
    if (named) R = Gc = B = named === 'white' ? 255 : 0
    const al = a == null ? 1 : a.endsWith('%') ? parseFloat(a) / 100 : parseFloat(a)
    const res = mapRGB(R, Gc, B, al, prop)
    if (!res) return m
    return res[3] >= 1 ? `rgb(${res[0]}, ${res[1]}, ${res[2]})` : `rgba(${res[0]}, ${res[1]}, ${res[2]}, ${res[3]})`
  })
  if (cache.size > 6000) cache.clear()
  cache.set(key, out)
  return out
}

type Rec = Record<string, { o: string; m: string }>

/**
 * Slår på lyst tema for `root` og stilarkreglene som nevner en av `classes` (CSS-modulenes klassenavn).
 * Gir en funksjon som setter alt tilbake.
 */
export function applyLight(root: HTMLElement, classes: string[]): () => void {
  const EL = new WeakMap<Element, Rec>()
  const touched = new Set<HTMLElement>()
  const skip = (el: Element) => {
    if (el.closest('[data-keep-color]')) return true
    for (let e: Element | null = el; e && e !== root.parentElement; e = e.parentElement) {
      const bi = (e as HTMLElement).style?.backgroundImage
      if (bi && bi.includes('url(')) return true
    }
    return false
  }
  const doEl = (el: Element) => {
    const st = (el as HTMLElement).style
    if (!st || !st.length || skip(el)) return
    let rec = EL.get(el)
    if (!rec) EL.set(el, (rec = {}))
    for (let i = 0; i < st.length; i++) {
      const p = st[i] ?? '', v = st.getPropertyValue(p)
      if (!/rgb|white|black/.test(v)) continue
      const r = rec[p]
      if (r && v === r.m) continue
      const m = mapValue(v, p)
      if (m === v) { rec[p] = { o: v, m: v }; continue }
      st.setProperty(p, m, st.getPropertyPriority(p))
      rec[p] = { o: v, m: st.getPropertyValue(p) }
      touched.add(el as HTMLElement)
    }
  }
  const walk = (n: Node) => {
    if (n.nodeType !== 1) return
    doEl(n as Element)
    ;(n as Element).querySelectorAll('[style]').forEach(doEl)
  }
  const RU = new Map<CSSStyleRule, Record<string, [string, string]>>()
  const doSheets = () => {
    for (const sh of Array.from(document.styleSheets)) {
      let rules: CSSRuleList
      try { rules = sh.cssRules } catch { continue }
      const visit = (list: CSSRuleList) => {
        for (const ru of Array.from(list)) {
          if ('cssRules' in ru && (ru as CSSGroupingRule).cssRules && !(ru instanceof CSSStyleRule)) { visit((ru as CSSGroupingRule).cssRules); continue }
          if (!(ru instanceof CSSStyleRule) || RU.has(ru) || !classes.some((c) => ru.selectorText.includes(c))) continue
          const o: Record<string, [string, string]> = {}
          for (let j = 0; j < ru.style.length; j++) {
            const p = ru.style[j] ?? '', v = ru.style.getPropertyValue(p)
            if (!/rgb|white|black|#/.test(v)) continue
            const m = mapValue(hexToRgb(v), p)
            if (m !== hexToRgb(v)) { o[p] = [v, ru.style.getPropertyPriority(p)]; ru.style.setProperty(p, m, o[p][1]) }
          }
          RU.set(ru, o)
        }
      }
      visit(rules)
    }
  }
  const mo = new MutationObserver((list) => {
    for (const m of list) {
      if (m.type === 'attributes') doEl(m.target as Element)
      else m.addedNodes.forEach(walk)
    }
  })
  root.setAttribute('data-ml-mode', 'light')
  walk(root)
  doSheets()
  mo.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ['style'] })
  const timer = setInterval(doSheets, 700)
  return () => {
    mo.disconnect()
    clearInterval(timer)
    root.removeAttribute('data-ml-mode')
    for (const el of touched) {
      const rec = EL.get(el)
      if (!rec) continue
      for (const [p, r] of Object.entries(rec)) if (el.style.getPropertyValue(p) === r.m && r.m !== r.o) el.style.setProperty(p, r.o, el.style.getPropertyPriority(p))
    }
    for (const [ru, o] of RU) for (const [p, [v, pr]] of Object.entries(o)) ru.style.setProperty(p, v, pr)
  }
}

/** Stilark skrevet med #rrggbb (CSS-modulene) gjøres om til rgb() før omregningen; nettleseren gir ellers rgb(). */
function hexToRgb(v: string): string {
  return v.replace(/#([0-9a-f]{3}|[0-9a-f]{6})\b/gi, (_, h: string) => {
    const x = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
    return `rgb(${parseInt(x.slice(0, 2), 16)}, ${parseInt(x.slice(2, 4), 16)}, ${parseInt(x.slice(4, 6), 16)})`
  })
}
