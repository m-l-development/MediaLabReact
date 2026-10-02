/* Menighetslogoer: hentes som lokale blob:-adresser via den vanlige filtilgangen (bare medlemmer og Admin ser filen –
   databasen avgjør). Uten logo, eller uten tilgang, vises menighetens forbokstaver som reserve. */
import React from 'react';
import { files as FS } from '../../services/files.js';
import { initials } from './ui.jsx';

const cache = new Map();   // fil-ID → blob:-adresse (eller null når filen ikke kunne hentes)
export function useLogos(ids) {
  const key = (ids || []).filter(Boolean).sort().join(',');
  const [, bump] = React.useState(0);
  React.useEffect(() => {
    const missing = (ids || []).filter(id => id && !cache.has(id));
    if (!missing.length) return;
    let alive = true;
    FS.objectUrls(missing).then(urls => { for (const id of missing) cache.set(id, urls[id] || null); if (alive) bump(n => n + 1); })
      .catch(() => { for (const id of missing) cache.set(id, null); if (alive) bump(n => n + 1); });
    return () => { alive = false; };
  }, [key]);
  return Object.fromEntries((ids || []).filter(Boolean).map(id => [id, cache.get(id) || null]));
}
export const forgetLogo = id => { if (id) cache.delete(id); };

export function ChurchLogo({ url, name, size = 40 }) {
  const s = { width: size, height: size, borderRadius: Math.round(size / 4), flex: '0 0 auto' };
  return url
    ? <img src={url} alt="" data-ch-logo style={{ ...s, objectFit: 'contain', background: '#fff', border: '1px solid var(--line)' }} />
    : <span className="ch-avatar" aria-hidden="true" data-ch-logo-fallback style={{ ...s, display: 'grid', placeItems: 'center', fontSize: Math.round(size / 2.8) }}>{initials(name)}</span>;
}
