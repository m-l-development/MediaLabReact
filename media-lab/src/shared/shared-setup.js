/* Felles grunnoppsett for menigheten i verktøyene (Loop Studio, Thumbnail Studio …).
   - Ett oppsett per menighet og område (scope), lagret sentralt (church_settings). Lokale kopier brukes bare til visning
     før svaret kommer, aldri som egen versjon.
   - Lagring skjer med versjonsnummer. Har noen andre lagret i mellomtiden (settings_conflict), hentes nyeste versjon og
     endringene slås sammen felt for felt (merge3): felt bare jeg har endret, får min verdi; felt bare de andre har endret,
     får deres; felt begge har endret ulikt, får den nyeste lagrede verdien (deres), og det meldes fra. En eldre versjon kan
     derfor aldri overskrive en nyere.
   - Felt som bare Admin kan endre (admin_keys, f.eks. Faste bilder i Loop Studio), sendes aldri endret fra andre roller.
   - Nyere versjoner hentes når fanen blir synlig og hvert 30. sekund, og vises når det ikke ligger ulagrede endringer. */
import { churchSettings as CS } from '../services/church-settings.js';

const same = (a, b) => JSON.stringify(a === undefined ? null : a) === JSON.stringify(b === undefined ? null : b);

/* Tre-veis sammenslåing på toppnivå. → { data, conflicts: [nøkler] } */
export function merge3(base, mine, theirs) {
  const b = base || {}, m = mine || {}, t = theirs || {}, out = {}, conflicts = [];
  for (const k of new Set([...Object.keys(b), ...Object.keys(m), ...Object.keys(t)])) {
    const mineChanged = !same(m[k], b[k]), theirsChanged = !same(t[k], b[k]);
    const v = !mineChanged ? t[k] : !theirsChanged ? m[k] : same(m[k], t[k]) ? t[k] : (conflicts.push(k), t[k]);
    if (v !== undefined) out[k] = v;
  }
  return { data: out, conflicts };
}

/* Menigheten verktøyene arbeider i: valgt menighet (ch.activeChurch) hvis brukeren er medlem der, ellers den første. */
export function activeChurch(me = window.CH && window.CH.me) {
  const list = (me && me.churches) || [];
  let pick = null; try { pick = localStorage.getItem('ch.activeChurch'); } catch (e) {}
  return (list.find(c => c.id === pick) || list[0] || null);
}

export class SharedSetup {
  /* scope: f.eks. 'loopstudio:week'. onRemote(data, info) kalles når en nyere versjon er hentet (ikke egne lagringer).
     onStatus({ state: 'saving'|'saved'|'error'|'merged'|'conflict', text }) for tilbakemelding i grensesnittet. */
  constructor(scope, { onRemote, onStatus, church } = {}) {
    this.scope = scope; this.onRemote = onRemote || (() => {}); this.onStatus = onStatus || (() => {});
    this.church = church || activeChurch(); this.version = 0; this.base = null; this.canAdmin = false; this.adminKeys = [];
    this.pending = null; this.saving = null; this.exists = false;
  }
  get available() { return !!this.church; }
  async load() {
    if (!this.church) return null;
    const r = await CS.get(this.church.id, this.scope);
    this.exists = !!r; this.version = r ? r.version : 0; this.base = r ? r.data : null;
    this.canAdmin = !!(r ? r.can_admin : (window.CH && window.CH.me && (window.CH.me.roles || []).some(x => x.role === 'church_admin' && x.church_id === this.church.id)));
    this.adminKeys = r ? r.admin_keys || [] : (this.scope.startsWith('loopstudio:') ? ['imgRules'] : []);
    this.info = r ? { by: r.updated_by_name, at: r.updated_at } : null;
    return r ? r.data : null;
  }
  /* Holder tilbake endringer i felt brukeren ikke har lov til å endre. */
  guard(next) {
    if (this.canAdmin || !this.adminKeys.length) return next;
    const out = { ...next }, base = this.base || {};
    for (const k of this.adminKeys) { if (k in base) out[k] = base[k]; else delete out[k]; }
    return out;
  }
  /* Lagrer (med kort forsinkelse, så raske endringer samles). Returnerer et løfte som løses når lagringen er ferdig. */
  save(next, delay = 800) {
    if (!this.church) return Promise.resolve(false);
    this.pending = this.guard(next);
    clearTimeout(this._t);
    return new Promise(res => { this._t = setTimeout(() => res(this.flush()), delay); });
  }
  async flush() {
    if (this.saving) { await this.saving.catch(() => {}); }
    if (!this.pending) return true;
    const want = this.pending; this.pending = null;
    if (this.base && same(want, this.base)) return true;
    this.onStatus({ state: 'saving', text: 'Lagrer grunnoppsettet …' });
    this.saving = this._save(want);
    try { return await this.saving; } finally { this.saving = null; }
  }
  async _save(want, tries = 0) {
    try {
      const r = await CS.save(this.church.id, this.scope, want, this.version);
      this.version = r.version; this.base = want; this.exists = true;
      this.onStatus({ state: 'saved', text: 'Grunnoppsettet er lagret for hele menigheten.' });
      return true;
    } catch (e) {
      if (e && e.code === 'settings_conflict' && tries < 3) {
        const base = this.base, theirs = await this.load();
        const { data, conflicts } = merge3(base, want, theirs);
        const merged = this.guard(data);
        this.onRemote(merged, { merged: true, conflicts });
        this.onStatus({ state: conflicts.length ? 'conflict' : 'merged', text: conflicts.length
          ? 'Noen andre endret det samme i grunnoppsettet samtidig. Den nyeste lagrede versjonen er beholdt for: ' + conflicts.join(', ') + '.'
          : 'Grunnoppsettet var endret av en annen bruker. Endringene er slått sammen.' });
        return this._save(merged, tries + 1);
      }
      this.pending = this.pending || want;   // prøv igjen ved neste endring
      this.onStatus({ state: 'error', text: e && e.code === 'forbidden' ? 'Du har ikke tilgang til å endre dette i grunnoppsettet.' : 'Grunnoppsettet kunne ikke lagres. Prøv igjen.' });
      return false;
    }
  }
  /* Henter nyere versjon fra andre brukere (ingen ulagrede endringer her). */
  async refresh() {
    if (!this.church || this.pending || this.saving) return false;
    const before = this.version, d = await this.load().catch(() => undefined);
    if (d === undefined || this.version === before || !d) return false;
    this.onRemote(d, { merged: false, by: this.info && this.info.by });
    return true;
  }
  watch(ms = 30000) {
    const tick = () => { if (document.visibilityState === 'visible') this.refresh().catch(() => {}); };
    this._iv = setInterval(tick, ms); this._vis = tick; document.addEventListener('visibilitychange', tick);
    return () => this.stop();
  }
  stop() { clearInterval(this._iv); if (this._vis) document.removeEventListener('visibilitychange', this._vis); clearTimeout(this._t); }
}
