/* Miniatyrbilder i filvisningene.
   - Hentes først når de nærmer seg skjermen, og lenkene hentes samlet (ett serverkall per bunke).
   - Skaleres ned til små bilder i nettleseren, så rulling og maling går raskt også på mobil, og minnet ikke fylles av
     originaler på flere MB.
   - Huskes for resten av besøket: å bytte mappe eller fane fram og tilbake laster ikke bildene på nytt.
   Nedlasting henter alltid originalen. */
import React from 'react';
import { files as FS } from '../../services/files.js';

const SIZE = 360, MAX = 800;
const cache = new Map();     // id → blob:-adresse til miniatyr
const waiting = new Map();   // id → [resolve]
let queue = new Set(), timer = 0;

async function shrink(blob) {
  if (typeof createImageBitmap !== 'function') return null;
  const bmp = await createImageBitmap(blob);
  try {
    const k = Math.min(1, SIZE / Math.max(bmp.width, bmp.height)), w = Math.max(1, Math.round(bmp.width * k)), h = Math.max(1, Math.round(bmp.height * k));
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    c.getContext('2d').drawImage(bmp, 0, 0, w, h);
    return await new Promise(r => c.toBlob(r, 'image/webp', 0.82));   /* nettlesere uten WebP-koding gir PNG (beholder gjennomsiktighet) */
  } finally { bmp.close && bmp.close(); }
}

async function fetchThumb(url) {
  const r = await fetch(url, { signal: AbortSignal.timeout(20000) }); if (!r.ok) return null;
  const b = await r.blob();
  let small = null; try { small = b.size > 60000 ? await shrink(b) : null; } catch (e) {}
  return URL.createObjectURL(small || b);
}

function done(id, u) {
  if (u) { cache.set(id, u); while (cache.size > MAX) { const [k, old] = cache.entries().next().value; URL.revokeObjectURL(old); cache.delete(k); } }
  (waiting.get(id) || []).forEach(f => f(u)); waiting.delete(id);
}

function flush() {
  timer = 0; const ids = [...queue]; queue = new Set();
  for (let i = 0; i < ids.length; i += 60) {
    const part = ids.slice(i, i + 60);
    FS.urls(part).then(urls => part.forEach(id => (urls[id] ? fetchThumb(urls[id]) : Promise.resolve(null)).then(u => done(id, u), () => done(id, null))),
      () => part.forEach(id => done(id, null)));
  }
}

export const peekThumb = id => cache.get(id) || null;
export function thumbUrl(id) {
  if (cache.has(id)) return Promise.resolve(cache.get(id));
  return new Promise(res => {
    const w = waiting.get(id); if (w) { w.push(res); return; }
    waiting.set(id, [res]); queue.add(id); if (!timer) timer = setTimeout(flush, 30);
  });
}

/* Original til nedlasting (ny lenke hver gang, så den aldri er utløpt). */
export async function downloadOriginal(id, name) {
  const urls = await FS.urls([id]); if (!urls[id]) throw Object.assign(new Error(), { code: 'not_found' });
  const r = await fetch(urls[id], { signal: AbortSignal.timeout(60000) }); if (!r.ok) throw Object.assign(new Error(), { code: 'network' });
  const u = URL.createObjectURL(await r.blob());
  const a = document.createElement('a'); a.href = u; a.download = name || 'bilde'; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 30000);
}

export function Thumb({ id }) {
  const ref = React.useRef(null), [u, setU] = React.useState(() => peekThumb(id));
  React.useEffect(() => {
    if (u) return undefined;
    let live = true; const go = () => thumbUrl(id).then(x => { if (live && x) setU(x); });
    if (typeof IntersectionObserver !== 'function') { go(); return () => { live = false; }; }
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); go(); } }, { rootMargin: '400px' });
    io.observe(ref.current);
    return () => { live = false; io.disconnect(); };
  }, [id]);
  return <div ref={ref} className="ch-img" style={{ backgroundImage: u ? 'url(' + u + ')' : 'none' }} />;
}
