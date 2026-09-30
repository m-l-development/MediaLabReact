/* Fast topplinje: tilbakeknappen står allerede fast (sticky). Når den store tittelen ([data-ml-title]) er rullet
   inn under topplinjen ([data-ml-bar]), tones den ut og vises i liten størrelse ved siden av tilbakeknappen
   (uten noe felt bak). Visninger uten stor tittel (editorene) får et tett felt bak linjen så snart siden er rullet.
   Øverst på siden ser alt ut som før.
   Elementene legges i <body> (ikke i React-treet) og tar ikke imot klikk. */
export function stickyTitle(root) {
  const band = document.createElement('div'), title = document.createElement('div');
  band.setAttribute('data-keep-color', '1'); title.setAttribute('data-keep-color', '1');
  band.setAttribute('aria-hidden', 'true'); title.setAttribute('aria-hidden', 'true');
  Object.assign(band.style, { position: 'fixed', left: '0', right: '0', top: '0', zIndex: '49', pointerEvents: 'none', opacity: '0', transition: 'opacity .22s ease', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)' });
  Object.assign(title.style, { position: 'fixed', zIndex: '51', pointerEvents: 'none', opacity: '0', transform: 'translateY(6px)', transition: 'opacity .22s ease, transform .22s ease', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: '1' });
  document.body.append(band, title);

  const visible = el => el && el.isConnected && el.getClientRects().length > 0;
  let shown = false, raf = 0;
  const update = () => {
    raf = 0;
    const bar = root.querySelector('[data-ml-bar]'), h1 = [...root.querySelectorAll('[data-ml-title]')].find(visible);
    /* hvor langt den store tittelen har glidd inn under linjen (0–1): den tones ut i samme takt, feltet kommer
       og den lille tittelen kommer når den er mer enn halvveis under */
    const hb = h1 && visible(bar) ? h1.getBoundingClientRect() : null;
    const prog = hb ? Math.max(0, Math.min(1, (bar.getBoundingClientRect().bottom - hb.top) / Math.max(1, hb.height))) : 0;
    if (h1) h1.style.opacity = prog > 0 ? String(1 - prog) : '';
    const show = prog > 0.55;
    /* startsidene (med stor tittel) får aldri noe felt bak linjen. Editorene (uten stor tittel) får det så snart
       siden er rullet, ellers ligger knappene gjennomsiktig oppå innholdet */
    const bandOn = !h1 && visible(bar) && (document.scrollingElement || document.documentElement).scrollTop > 4;
    if (bandOn) {
      const light = document.documentElement.getAttribute('data-ml-mode') === 'light';
      Object.assign(band.style, {
        height: Math.round(bar.getBoundingClientRect().bottom) + 'px',
        background: light ? 'rgba(228,225,218,0.94)' : 'rgba(0,0,0,0.92)',
        borderBottom: '1px solid ' + (light ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)'),
      });
    }
    if (show) {
      const kids = [...bar.children].filter(visible), bk = kids[0].getBoundingClientRect();
      const right = kids.slice(1).map(k => k.getBoundingClientRect().left).filter(x => x > bk.right);
      const cs = getComputedStyle(h1), small = window.innerWidth < 600, left = bk.right + (small ? 12 : 18);
      Object.assign(title.style, {
        left: left + 'px', top: (bk.top + bk.height / 2) + 'px',
        maxWidth: Math.max(0, (right.length ? Math.min(...right) : window.innerWidth) - left - 16) + 'px',
        fontSize: small ? '14px' : '18px', fontFamily: cs.fontFamily, fontWeight: cs.fontWeight, fontStretch: cs.fontStretch,
        letterSpacing: small ? '0.06em' : '0.08em', textTransform: cs.textTransform, color: cs.color,
        /* svak skygge rundt bokstavene (ingen boks), så tittelen kan leses over bilder */
        textShadow: document.documentElement.getAttribute('data-ml-mode') === 'light' ? '0 0 10px rgba(228,225,218,0.9)' : '0 1px 10px rgba(0,0,0,0.75)',
      });
      const t = h1.value != null ? h1.value : h1.textContent.trim();
      if (title.textContent !== t) title.textContent = t;
      /* krymp ned til 11 px før teksten forkortes med … (smale skjermer med knapper til høyre) */
      for (let fs = small ? 14 : 18; fs > 11 && title.scrollWidth > title.clientWidth; fs--) { title.style.fontSize = fs - 1 + 'px'; title.style.letterSpacing = '0.04em'; }
      title.style.marginTop = -parseFloat(title.style.fontSize) / 2 + 'px';
    }
    band.style.opacity = bandOn ? '1' : '0';
    if (show !== shown) {
      shown = show;
      title.style.opacity = show ? '1' : '0';
      title.style.transform = show ? 'none' : 'translateY(6px)';
    }
  };
  const later = () => { if (!raf) raf = requestAnimationFrame(update); };
  addEventListener('scroll', later, { passive: true, capture: true });
  addEventListener('resize', later);
  /* visningen byttes (f.eks. start → kategori), språk eller lys/mørk endres */
  new MutationObserver(later).observe(root, { childList: true, subtree: true, characterData: true });
  new MutationObserver(later).observe(document.documentElement, { attributes: true, attributeFilter: ['data-ml-mode'] });
  later();
}
