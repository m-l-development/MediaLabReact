/**
 * Fast topplinje (PLT-09), portert fra media-lab/src/shared/sticky-title.js: tilbakeknappen står fast. Når den store
 * tittelen ([data-ml-title]) er rullet inn under topplinjen ([data-ml-bar]), tones den ut og vises i liten størrelse ved
 * siden av tilbakeknappen (uten felt bak). Visninger uten stor tittel får et tett felt bak linjen så snart siden er
 * rullet. Øverst på siden ser alt ut som før. Elementene legges i <body> og tar ikke imot klikk.
 */
export function stickyTitle(root: HTMLElement): () => void {
  const band = document.createElement('div'), title = document.createElement('div')
  for (const el of [band, title]) {
    el.setAttribute('data-keep-color', '1')
    el.setAttribute('aria-hidden', 'true')
  }
  title.setAttribute('data-ml-small-title', '')
  Object.assign(band.style, { position: 'fixed', left: '0', right: '0', top: '0', zIndex: '49', pointerEvents: 'none', opacity: '0', transition: 'opacity .22s ease', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)' })
  Object.assign(title.style, { position: 'fixed', zIndex: '51', pointerEvents: 'none', opacity: '0', transform: 'translateY(6px)', transition: 'opacity .22s ease, transform .22s ease', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: '1' })
  document.body.append(band, title)

  const visible = (el: Element | null | undefined): el is HTMLElement => !!el && el.isConnected && el.getClientRects().length > 0
  const light = () => document.documentElement.dataset.theme === 'light'
  let shown = false, raf = 0
  let faded: HTMLElement | null = null
  const update = () => {
    raf = 0
    // den siste synlige linjen: et verktøy med egen linje (Loop Studio) ligger over rammens
    const bar = [...root.querySelectorAll('[data-ml-bar]')].filter(visible).pop() ?? null
    const h1 = [...root.querySelectorAll<HTMLElement>('[data-ml-title]')].find(visible) ?? null
    if (faded && faded !== h1) { faded.style.opacity = ''; faded = null }
    // hvor langt den store tittelen har glidd inn under linjen (0–1): den tones ut i samme takt, og den lille
    // tittelen kommer når den er mer enn halvveis under
    const hb = h1 && bar ? h1.getBoundingClientRect() : null
    const prog = hb && bar ? Math.max(0, Math.min(1, (bar.getBoundingClientRect().bottom - hb.top) / Math.max(1, hb.height))) : 0
    if (h1) { h1.style.opacity = prog > 0 ? String(1 - prog) : ''; faded = h1 }
    const show = prog > 0.55
    // startsidene (med stor tittel) får aldri noe felt bak linjen; visninger uten stor tittel får det så snart siden er rullet
    const bandOn = !h1 && !!bar && (document.scrollingElement ?? document.documentElement).scrollTop > 4
    if (bandOn && bar) {
      Object.assign(band.style, {
        height: Math.round(bar.getBoundingClientRect().bottom) + 'px',
        background: light() ? 'rgba(228,225,218,0.94)' : 'rgba(0,0,0,0.92)',
        borderBottom: '1px solid ' + (light() ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)'),
      })
    }
    const kids = bar ? [...bar.children].filter(visible) : []
    if (show && h1 && kids[0]) {
      const bk = kids[0].getBoundingClientRect()
      const right = kids.slice(1).map((k) => k.getBoundingClientRect().left).filter((x) => x > bk.right)
      const cs = getComputedStyle(h1), small = innerWidth < 600, left = bk.right + (small ? 12 : 18)
      Object.assign(title.style, {
        left: left + 'px', top: bk.top + bk.height / 2 + 'px',
        maxWidth: Math.max(0, (right.length ? Math.min(...right) : innerWidth) - left - 16) + 'px',
        fontSize: small ? '14px' : '18px', fontFamily: cs.fontFamily, fontWeight: cs.fontWeight, fontStretch: cs.fontStretch,
        letterSpacing: small ? '0.06em' : '0.08em', textTransform: cs.textTransform, color: cs.color,
        // svak skygge rundt bokstavene (ingen boks), så tittelen kan leses over bilder
        textShadow: light() ? '0 0 10px rgba(228,225,218,0.9)' : '0 1px 10px rgba(0,0,0,0.75)',
      })
      const t = (h1.textContent ?? '').trim()
      if (title.textContent !== t) title.textContent = t
      // krymp ned til 11 px før teksten forkortes med … (smale skjermer med knapper til høyre)
      for (let fs = small ? 14 : 18; fs > 11 && title.scrollWidth > title.clientWidth; fs--) {
        title.style.fontSize = fs - 1 + 'px'
        title.style.letterSpacing = '0.04em'
      }
      title.style.marginTop = -parseFloat(title.style.fontSize) / 2 + 'px'
    }
    const on = show && !!kids[0]
    band.style.opacity = bandOn ? '1' : '0'
    if (on !== shown) {
      shown = on
      title.style.opacity = on ? '1' : '0'
      title.style.transform = on ? 'none' : 'translateY(6px)'
    }
  }
  const later = () => { if (!raf) raf = requestAnimationFrame(update) }
  addEventListener('scroll', later, { passive: true, capture: true })
  addEventListener('resize', later)
  // visningen byttes (f.eks. start → kategori), språk eller lys/mørk endres
  const mo = new MutationObserver(later)
  mo.observe(root, { childList: true, subtree: true, characterData: true })
  const mt = new MutationObserver(later)
  mt.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  later()
  return () => {
    removeEventListener('scroll', later, { capture: true })
    removeEventListener('resize', later)
    mo.disconnect()
    mt.disconnect()
    cancelAnimationFrame(raf)
    if (faded) faded.style.opacity = ''
    band.remove()
    title.remove()
  }
}
