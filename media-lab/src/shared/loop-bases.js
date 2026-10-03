/* Lagrede grunnoppsett i Loop Studio (bevisst lagret, f.eks. fra demoen med «Lagre som grunnoppsett»).
   - Personlig: bare for brukeren, i nettleseren (localStorage «loopstudio.bases.v1», knyttet til brukeren av local-user.js).
   - Felles for menigheten: i menighetens grunnoppsett (church_settings «loopstudio:bases»). Bare medlemmer leser og skriver;
     databasen kontrollerer medlemskap, versjon og at bildereferanser («ch:<id>») er menighetens egne filer.
   Et grunnoppsett er et utgangspunkt: nye serier fra det er egne prosjekter (ukeloop.custom.g<p|f>-<id>), så endringer i en
   serie aldri endrer grunnoppsettet. Lagring legger alltid til et nytt grunnoppsett (ny ID) og overskriver aldri andre.
   Samtidige endringer i felleslisten: endringen gjøres på nytt på nyeste versjon (ingen blir borte). */
import { churchSettings as CS } from '../services/church-settings.js';
import { activeChurch } from './shared-setup.js';

const LK = 'loopstudio.bases.v1', SCOPE = 'loopstudio:bases', MAX = 20;
export const BASE_TPLS = ['week', 'sunday', 'youth', 'blank'];
export const newId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const okId = id => typeof id === 'string' && /^[a-z0-9]{4,16}$/.test(id);
const clean = e => e && okId(e.id) && typeof e.name === 'string' && e.data && Array.isArray(e.data.slides);

/* Felles grunnoppsett kan bare referere til menighetens filer (ch:) eller genererte bakgrunner (gen:). Lokale bilder
   (img-), gamle innebygde bilder og midlertidige adresser fjernes, så andre ikke får ødelagte referanser. */
export function forChurch(v) {
  if (typeof v === 'string') return /^(img-|images\/|blob:|data:|demo-)/.test(v) ? null : v;
  if (Array.isArray(v)) return v.map(forChurch);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, forChurch(x)]));
  return v;
}
export function entryOf({ name, base, programText, slides, cfg }) {
  const s = (slides || []).map(x => { const { qr, ...rest } = x; return rest; });
  return { id: newId(), name: String(name || '').trim().slice(0, 60) || 'Grunnoppsett', base: BASE_TPLS.includes(base) ? base : 'blank',
    data: { programText: String(programText || ''), slides: s, cfg: cfg || {} }, savedAt: Date.now() };
}

export const personal = {
  list() { try { const l = JSON.parse(localStorage.getItem(LK) || '[]'); return Array.isArray(l) ? l.filter(clean) : []; } catch (e) { return []; } },
  write(l) { localStorage.setItem(LK, JSON.stringify(l)); },
  get(id) { return this.list().find(e => e.id === id) || null; },
  add(e) { const l = this.list(); if (l.length >= MAX) throw Object.assign(new Error(), { code: 'full' }); this.write([...l, e]); return e; },
  update(id, data) { this.write(this.list().map(e => e.id === id ? { ...e, data, savedAt: Date.now() } : e)); },
  remove(id) { this.write(this.list().filter(e => e.id !== id)); },
};

export const central = {
  church: () => activeChurch(),
  async list() { const c = activeChurch(); if (!c) return []; const r = await CS.get(c.id, SCOPE); return r && Array.isArray(r.data.bases) ? r.data.bases.filter(clean) : []; },
  async get(id) { return (await this.list()).find(e => e.id === id) || null; },
  /* fn(liste) → ny liste, på nyeste versjon; prøver igjen ved samtidig endring. */
  async mutate(fn) {
    const c = activeChurch(); if (!c) throw Object.assign(new Error(), { code: 'forbidden' });
    for (let i = 0; i < 4; i++) {
      const r = await CS.get(c.id, SCOPE), cur = r && Array.isArray(r.data.bases) ? r.data.bases : [];
      const next = fn(cur);
      try { await CS.save(c.id, SCOPE, { bases: next }, r ? r.version : 0); return next; }
      catch (e) { if (!e || e.code !== 'settings_conflict') throw e; }
    }
    throw Object.assign(new Error(), { code: 'settings_conflict' });
  },
  add(e) { const x = forChurch(e); return this.mutate(l => { if (l.length >= MAX) throw Object.assign(new Error(), { code: 'full' }); return [...l, x]; }).then(() => x); },
  update(id, data) { const d = forChurch(data); return this.mutate(l => l.map(e => e.id === id ? { ...e, data: d, savedAt: Date.now() } : e)); },
  remove(id) { return this.mutate(l => l.filter(e => e.id !== id)); },
};
