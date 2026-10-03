/* Konvertert fra den gamle dc-siden thumbnail-studio.dc.html. Dette er nå kilden – rediger direkte. */
import React from 'react';
import { DCLogic } from '../../shared/dc.jsx';
import { SharedSetup } from '../../shared/shared-setup.js';
import { files as CHF } from '../../services/files.js';
import { fitUpload } from '../../shared/upload-fit.js';
import { onUpdate } from '../../shared/ml-update.js';
import { hereGet, hereSet } from '../../shared/here.js';
class Component extends DCLogic {
  state = { zoom: 1, cropId: null, cropBox: null, multi: [], narrow: false, expT: false, expSize: null, backupBusy: false, ready: false, view: 'home', cats: [], tpls: [], catId: null, editCats: false, doc: null, tplId: null, tplName: '', dirty: false, sel: null, hist: [], fut: [], gx: [], gy: [], msg: '', ai: null, exp: false, expRes: '1080', expFmt: 'png', expBusy: false, save: false, logoOpen: false, busyImg: false, tick: 0, numEd: null, barSel: null, shapeOpen: false, addColor: null, autoAt: '', autoSave: (() => { try { return localStorage.getItem('thumbstudio.autosave') === '1'; } catch (e) { return false; } })() };
  canvasRef = React.createRef(); zoomRef = React.createRef(); ovRef = React.createRef(); fileRef = React.createRef(); taRef = React.createRef(); restoreRef = React.createRef(); cropRef = React.createRef();
  WN = { 400: 'Vanlig', 500: 'Medium', 600: 'Halvfet', 700: 'Fet', 800: 'Ekstra fet', 900: 'Svart' };
  /* ---------- Felles grunnoppsett for menigheten (ConnectHub) ----------
     Kategoriene og grunnoppsettet deres (navn, beskrivelse, standard og lagret grunnoppsett) er felles for menigheten
     (church_settings «thumbstudio:cats»). Malene (maks 5 per kategori) er personlige som før. Lokale bilder i et delt
     grunnoppsett lastes opp til Fellesmappe og erstattes med referanser («ch:<id>»); gamle innebygde logoer tas ikke med. */
  initShared = async () => {
    if (!window.CH || !window.CH.me) return;
    const sh = new SharedSetup('thumbstudio:cats', { onRemote: d => this.applyShared(d, false), onStatus: st => { if (st.state !== 'saving' && st.state !== 'saved') this.flash(st.text); } });
    if (!sh.available) return;
    this.shared = sh;
    try { const d = await sh.load(); if (d) this.applyShared(d, true); this._sharedAt = Date.now(); this.setState({ sharedReady: true, sharedExists: !!d }); sh.watch(); }
    catch (e) { this.flash('Menighetens grunnoppsett kunne ikke hentes. Du ser ditt eget oppsett på denne enheten.'); }
  };
  applyShared(d, initial) {
    this._sharedAt = Date.now();
    const sharedCats = Array.isArray(d.cats) ? d.cats.filter(c => c && typeof c.id === 'string').slice(0, 30) : [];
    const ids = new Set(sharedCats.map(c => c.id));
    /* Egne kategorier som har maler, men ikke finnes i det felles oppsettet, beholdes (de deles ved neste endring). */
    const keep = this.state.cats.filter(c => !ids.has(c.id) && this.state.tpls.some(t => t.catId === c.id));
    const cats = sharedCats.concat(keep);
    cats.forEach(c => { if (c.baseDoc) TS.loadAll(c.baseDoc).catch(() => {}); });
    this.setState({ cats }, () => TS.saveCats(cats).catch(() => {}));
    if (!initial) this.flash('Grunnoppsettet er oppdatert med endringer fra menigheten.');
  }
  sharedDoc(doc) {
    if (!doc) return null;
    const ok = v => typeof v === 'string' && v.indexOf('ch:') === 0 ? v : null;
    const d = TS.clone(doc);
    d.layers = d.layers.filter(l => !(l.src && l.src.indexOf('asset:') === 0)).map(l => l.src || l.orig ? Object.assign({}, l, { src: ok(l.src), orig: null }) : l);
    if (d.bg) d.bg = Object.assign({}, d.bg, { src: ok(d.bg.src), orig: null });
    return d;
  }
  sharedData(cats) { return { cats: cats.map(c => ({ id: c.id, name: c.name, desc: c.desc || '', base: c.base, baseDoc: this.sharedDoc(c.baseDoc) })) }; }
  async uploadLocalRefs(cats) {
    const map = this._refMap || (this._refMap = {}), sh = this.shared;
    const conv = async v => {
      if (!v || v.indexOf('db:') !== 0) return v;
      if (map[v]) return map[v];
      const b = await TS.blobOf(v); if (!b) return v;
      const f = await CHF.upload(await fitUpload(b, 'Grunnoppsett' + (b.type === 'image/png' ? '.png' : '.jpg')), { churchId: sh.church.id, folder: 'bilder' });
      map[v] = 'ch:' + f.id; await TS.loadSrc(map[v]).catch(() => {}); return map[v];
    };
    let changed = false;
    const out = [];
    for (const c of cats) {
      if (!c.baseDoc) { out.push(c); continue; }
      const d = TS.clone(c.baseDoc);
      for (const l of d.layers) { if (l.src && l.src.indexOf('db:') === 0) { const n = await conv(l.src); if (n !== l.src) { l.src = n; l.orig = null; changed = true; } } }
      if (d.bg && d.bg.src && d.bg.src.indexOf('db:') === 0) { const n = await conv(d.bg.src); if (n !== d.bg.src) { d.bg = Object.assign({}, d.bg, { src: n, orig: null }); changed = true; } }
      out.push(Object.assign({}, c, { baseDoc: d }));
    }
    if (changed) { this.setState({ cats: out }); await TS.saveCats(out).catch(() => {}); }
    return out;
  }
  queueShared() {
    const sh = this.shared; if (!sh || !this.state.sharedReady || Date.now() - (this._sharedAt || 0) < 800) return;
    clearTimeout(this._shT);
    this._shT = setTimeout(async () => {
      let cats = this.state.cats;
      try { cats = await this.uploadLocalRefs(cats); } catch (e) { this.flash('Et bilde i grunnoppsettet kunne ikke deles. Det vises bare på denne enheten.'); }
      const first = !sh.exists, ok = await sh.save(this.sharedData(cats), 0);
      if (ok && first && sh.exists) { this.setState({ sharedExists: true }); this.flash('Grunnoppsettet er nå felles for menigheten. Andre i menigheten ser endringene.'); }
    }, 900);
  }
  /* Bilde eller logo fra «Fellesmappe» (referanse til originalen i ConnectHub, ingen kopi). */
  pickFelles = async (t = { mode: 'add' }) => {
    if (!window.MLCloud || !window.MLCloud.pick) return;
    this.setState({ logoOpen: false });
    const r = await window.MLCloud.pick({ start: 'ressurser', title: t.logo ? 'Velg logo fra Fellesmappe' : 'Velg bilde fra Fellesmappe' }); if (!r || !this.alive) return;
    const probe = TS.clone(this.state.doc);
    if (t.mode === 'add' && TS.countImgs(probe) >= TS.MAX_IMG) { this.flash('Maks 5 bilder per mal. Fjern et bilde først.'); return; }
    await TS.loadSrc(r.ref); if (!this.alive) return;
    this.placeSrc(r.ref, t);
  };
  placeSrc(src, t) {
    if (t.mode === 'add') {
      const en = TS.getImg(src), iw = en ? en.img.naturalWidth : 4, ih = en ? en.img.naturalHeight : 3, k = Math.min((t.logo ? 520 : 900) / iw, (t.logo ? 300 : 700) / ih), w = Math.round(iw * k), h = Math.round(ih * k);
      this.addLayer(TS.L('image', { src, x: Math.round(960 - w / 2), y: Math.round(540 - h / 2), w, h, fit: t.logo ? 'contain' : 'cover' }));
    } else if (t.mode === 'replace') this.setL(t.id, { src, orig: null });
    else this.setBg({ src, orig: null, type: 'image' });
  }
  componentDidMount() {
    onUpdate({ save: () => this.saveForUpdate() });
    this.alive = true;
    { const _ws = (fn, n = 0) => { if (window.MLShare) fn(); else if (n < 120) setTimeout(() => _ws(fn, n + 1), 50); }; _ws(() => { this._unr = window.MLShare.receive((b, n) => this.takeShared(b, n), { accept: ['image'], when: () => !((this.getClip && this.getClip()) || []).length }); }); }
    try { const lm = localStorage.getItem(this.LAYOUT_KEY), cl = this.loadCustom(); this.setState({ layoutMode: lm === 'custom' && !cl ? 'std' : (lm || 'std'), customLayout: cl }); } catch (e) {}
    if (window.matchMedia) { this.mq = window.matchMedia('(max-width: 760px)'); this.onMq = () => this.setState({ narrow: this.mq.matches, sel: null, multi: [] }); if (this.mq.addEventListener) this.mq.addEventListener('change', this.onMq); if (this.mq.matches) this.setState({ narrow: true }); }
    this.onKey = e => this.key(e); window.addEventListener('keydown', this.onKey);
    this.onBefore = e => { if (this.state.view === 'edit' && this.state.dirty) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', this.onBefore);
    this.onLang = () => this.forceUpdate(); window.addEventListener('medialab-lang', this.onLang);
    this._here = hereGet('thumb');
    this.init();
  }
  componentWillUnmount() {
    this.alive = false; cancelAnimationFrame(this._raf); if (this.offImg) this.offImg();
    window.removeEventListener('keydown', this.onKey); window.removeEventListener('beforeunload', this.onBefore); window.removeEventListener('medialab-lang', this.onLang); if (this.mq && this.mq.removeEventListener) this.mq.removeEventListener('change', this.onMq); this.stopDrag(); this.cropUp();
  }
  restoreHere() {
    const h = this._here; this._here = null; if (!h || !this.alive) return;
    const c = this.state.cats.find(x => x.id === h.cat); if (!c) return;
    this.setState({ view: 'cat', catId: c.id });
    if (h.v !== 'edit') return;
    if (h.base) { this.enterEdit(this.catBase(c), null, '', true); return; }
    const t = h.tpl && this.state.tpls.find(x => x.id === h.tpl && x.catId === c.id); if (t) this.enterEdit(TS.clone(t.doc), t.id, t.name);
  }
  /* ny versjon publisert: lagre det som er åpent. Ny mal i full kategori kan ikke lagres (false) */
  async saveForUpdate() {
    const S = this.state; if (S.view !== 'edit' || !S.doc || !S.dirty) return null;
    if (S.baseEdit) { await this.saveBase(true); return true; }
    if (S.tplId) { await this.doSave('over', true); return true; }
    if (this.tplsOf(S.catId).length < TS.MAX_TPL) { await this.doSave('new', true); return true; }
    return false;
  }
  saveHere() {
    const S = this.state; if (!S.ready) return;
    const v = S.view === 'edit' ? { v: 'edit', cat: S.catId, tpl: S.tplId || null, base: !!S.baseEdit } : S.view === 'cat' ? { v: 'cat', cat: S.catId } : null, k = JSON.stringify(v);
    if (k !== this._hk) { this._hk = k; hereSet('thumb', v); }
  }
  componentDidUpdate() { this.saveHere(); if (this.state.view === 'edit') { this.sched(); this.autoTick(); if (this._pendImg && this.state.doc) { const f = this._pendImg; this._pendImg = null; this.useFile(f, { mode: 'add' }); } } }
  toFile = (b, n) => new File([b], n || 'bilde.png', { type: b.type });
  takeShared(b, n) { const f = this.toFile(b, n); if (this.state.view === 'edit' && this.state.doc) this.useFile(f, { mode: 'add' }); else { this._pendImg = f; this.flash('Velg en mal, så legges bildet inn.'); } }
  pickShared() { if (window.MLShare) window.MLShare.pick((b, n) => this.takeShared(b, n), { accept: ['image'] }); }
  async expBlob() { const S = this.state, scale = S.expRes === '4k' ? 2 : 1, type = S.expFmt === 'jpg' ? 'image/jpeg' : 'image/png', tr = !!S.expT && S.expFmt === 'png'; return await TS.exportBlob(S.doc, scale, type, { transparent: tr }); }
  async sendExp() { const S = this.state; try { const b = await this.expBlob(); if (b && window.MLShare) window.MLShare.send(b, this.slug(S.tplName || (this.cat() || {}).name) + '.' + (S.expFmt === 'jpg' ? 'jpg' : 'png'), 'thumb'); } catch (e) { this.flash('Eksporten feilet. Prøv 1080p eller JPG.'); } }
  async copyExp() { try { const b = await this.expBlob(); this.flash(b && window.MLShare && await window.MLShare.copy(b) ? 'Bildet er kopiert. Lim inn med Ctrl+V.' : 'Nettleseren tillot ikke kopiering.'); } catch (e) {} }
  autoOk() { const S = this.state; return S.view === 'edit' && !!S.doc && (S.baseEdit || !!S.tplId || this.tplsOf(S.catId).length < TS.MAX_TPL); }
  autoTick() {
    const S = this.state; clearTimeout(this._as);
    if (!S.autoSave || !S.dirty || S.save || S.exp || S.cropId || this._asBusy) return;
    this._as = setTimeout(() => this.autoRun(), 1500);
  }
  async autoRun() {
    const S = this.state; if (!this.alive || !S.autoSave || !S.dirty || this._asBusy) return;
    if (!this.autoOk()) { if (!this._asWarn) { this._asWarn = true; this.flash('Autolagring venter: kategorien har 5 maler. Slett en mal eller lagre over en eksisterende.'); } return; }
    this._asBusy = true;
    try { if (S.baseEdit) await this.saveBase(true); else await this.doSave(S.tplId ? 'over' : 'new', true); }
    catch (e) {} finally { this._asBusy = false; }
    if (this.alive) { const t = new Date(); this.setState({ autoAt: String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0') }); }
  }
  toggleAuto = () => {
    const on = !this.state.autoSave; try { localStorage.setItem('thumbstudio.autosave', on ? '1' : '0'); } catch (e) {}
    this._asWarn = false; this.setState({ autoSave: on, autoAt: '' });
    if (on) this.flash(this.state.baseEdit ? 'Autolagring er på. Grunnoppsettet lagres automatisk.' : 'Autolagring er på. Malen lagres automatisk mens du jobber.');
  };
  async init() {
    await new Promise(r => { const t0 = Date.now(), f = () => (window.TS || Date.now() - t0 > 15000) ? r() : setTimeout(f, 40); f(); });
    if (!this.alive) return;
    if (!window.TS) { this.setState({ ready: true, msg: 'Klarte ikke å laste Thumbnail Studio. Last siden på nytt.' }); return; }
    this.offImg = TS.onImage(() => { this.sched(); clearTimeout(this._bt); this._bt = setTimeout(() => this.alive && this.setState(s => ({ tick: s.tick + 1 })), 80); });
    const st = await TS.loadState();
    if (!this.alive) return;
    this.setState({ ready: true, cats: st.cats, tpls: st.tpls }, () => { this.gcAll(); this.restoreHere(); this.initShared(); });
    if (st.noDb) this.flash('Nettleseren tillater ikke lagring her, så maler blir ikke lagret.');
  }
  sched() { cancelAnimationFrame(this._raf); this._raf = requestAnimationFrame(() => this.draw()); }
  draw() {
    const c = this.canvasRef.current, d = this.state.doc; if (!c || !d || !window.TS) return;
    TS.render(c.getContext('2d'), d, { s: c.width / TS.W, edit: true });
    const k = d.layers.filter(l => l.type === 'text').map(l => l.font + l.weight).join('|');
    if (k !== this._fk) { this._fk = k; TS.ensureFonts(d).then(() => this.sched()); }
  }
  flash(msg) { this.setState({ msg }); clearTimeout(this._mt); this._mt = setTimeout(() => this.alive && this.setState({ msg: '' }), 4200); }
  cat() { return this.state.cats.find(c => c.id === this.state.catId) || null; }
  tplsOf(id) { return this.state.tpls.filter(t => t.catId === id); }
  persistCats(cats) { this.setState({ cats }, () => this.queueShared()); return TS.saveCats(cats).catch(() => this.flash('Klarte ikke å lagre.')); }
  persistTpls(tpls) { this.setState({ tpls }); return TS.saveTpls(tpls).catch(() => this.flash('Klarte ikke å lagre. Lagringsplassen kan være full.')); }
  gcAll() {
    if (!window.TS) return; const keep = new Set(), add = d => TS.refs(d).forEach(k => keep.add(k));
    this.state.tpls.forEach(t => add(t.doc)); this.state.cats.forEach(c => { if (c.baseDoc) add(c.baseDoc); }); if (this.state.doc) add(this.state.doc); { const cl = this.getClip(); if (cl.length) add({ bg: {}, layers: cl }); } this.state.hist.forEach(h => add(JSON.parse(h))); this.state.fut.forEach(h => add(JSON.parse(h)));
    TS.gc(keep);
  }
  /* ----- categories & templates ----- */
  openCat(id) { this.setState({ view: 'cat', catId: id, editCats: false }); window.scrollTo(0, 0); }
  catBase(c) { return c && c.baseDoc ? TS.clone(c.baseDoc) : TS.base(c ? c.base : 'blank'); }
  editBase = () => { const c = this.cat(); if (c) this.enterEdit(this.catBase(c), null, '', true); };
  resetBase = () => {
    const c = this.cat(); if (!c || !confirm('Tilbakestille grunnoppsettet til standard?')) return;
    this.setState({ cats: this.state.cats.map(x => x.id === c.id ? Object.assign({}, x, { baseDoc: null }) : x) }, () => { TS.saveCats(this.state.cats).catch(() => this.flash('Klarte ikke å lagre.')); this.gcAll(); this.queueShared(); });
  };
  async saveBase(quiet) {
    const c = this.cat(); if (!c) return;
    const ref = this.state.doc, doc = TS.clone(ref);
    await this.persistCats(this.state.cats.map(x => x.id === c.id ? Object.assign({}, x, { baseDoc: doc }) : x));
    if (!this.alive) return;
    if (this.state.doc === ref) this.setState({ dirty: false });
    if (!quiet) this.flash('Grunnoppsettet er lagret. Nye maler starter herfra.');
  }
  setCat(id, patch) { this.persistCats(this.state.cats.map(c => c.id === id ? Object.assign({}, c, patch) : c)); }
  addCat = () => { const c = { id: TS.uid(), name: 'Ny kategori', desc: '', base: 'blank' }; this.persistCats(this.state.cats.concat([c])); this.setState({ editCats: true }); };
  delCat(c) {
    const n = this.tplsOf(c.id).length;
    if (!confirm('Slette kategorien «' + c.name + '»?' + (n ? '\nMalene i kategorien slettes også (' + n + ').' : ''))) return;
    this.persistCats(this.state.cats.filter(x => x.id !== c.id));
    this.persistTpls(this.state.tpls.filter(t => t.catId !== c.id)).then(() => this.gcAll());
  }
  enterEdit(doc, tplId, name, baseEdit) {
    this.setState({ view: 'edit', baseEdit: !!baseEdit, doc, tplId, tplName: name, dirty: false, sel: null, multi: [], hist: [], fut: [], ai: null, exp: false, save: false, logoOpen: false });
    this._fk = null; window.scrollTo(0, 0);
  }
  newFromBase = () => { const c = this.cat(); if (c && this.tplsOf(c.id).length >= TS.MAX_TPL) { this.flash('Maks 5 maler per kategori. Slett en mal for å lage en ny.'); return; } if (c) { this.setState({ newOpen: true, newMode: 'new', newPal: 'default', palOpen: false }, () => this.genPrev(c)); } };
  newList(c) {
    const lay = k => () => { const d = TS.layout(k); d.layers.forEach(l => { if (l.type === 'text' && String(l.text).indexOf('Kategori') === 0) l.text = c.name + l.text.slice(8); }); return d; };
    const pal = this.state.newPal || 'default';
    return [
      { k: 'base', name: 'Grunnoppsett', desc: 'Kategoriens eget oppsett', doc: () => this.catBase(c) },
      { k: 'blank', name: 'Blank', desc: 'Helt tom flate', doc: lay('blank') },
      { k: 'shorthook', name: 'Stor krok', desc: 'Stor tekst på en gul stripe over personen', doc: lay('shorthook') },
      { k: 'shortsplit', name: 'Delt i høyden', desc: 'Bilde øverst, farget tekstfelt nederst', doc: lay('shortsplit') },
      { k: 'shorttip', name: 'Nummerert tips', desc: 'Nummer i en sirkel, overskrift og person', doc: lay('shorttip') },
      { k: 'interview', name: 'To personer', desc: 'To bilder side om side med navneskilt', doc: lay('interview') },
      { k: 'interviewquote', name: 'Sitat og person', desc: 'Personen til venstre, sitat til høyre', doc: lay('interviewquote') },
      { k: 'interviewlower', name: 'Navneskilt', desc: 'Helbilde med navn og rolle nederst', doc: lay('interviewlower') },
      { k: 'panelthree', name: 'Tre i panel', desc: 'Tre runde portretter med navn', doc: lay('panelthree') },
      { k: 'panelfour', name: 'Fire i panel', desc: 'Fire portretter på rad under temaet', doc: lay('panelfour') },
      { k: 'panelvs', name: 'Ansikt til ansikt', desc: 'To personer på hver sin farge', doc: lay('panelvs') },
      { k: 'podcast', name: 'Episode', desc: 'Episodenummer, tittel og vertens bilde', doc: lay('podcast') },
      { k: 'podcastwave', name: 'Lydbølge', desc: 'To verter og en lydbølge i midten', doc: lay('podcastwave') },
      { k: 'podcastguest', name: 'Gjest', desc: 'Gjesten i midten, navn i et lyst felt', doc: lay('podcastguest') },
      { k: 'event', name: 'Plakat', desc: 'Bilde i bakgrunnen, dato, tittel og sted', doc: lay('event') },
      { k: 'eventdate', name: 'Stor dato', desc: 'Datoen i et fargefelt, bilde til høyre', doc: lay('eventdate') },
      { k: 'eventticket', name: 'Infobokser', desc: 'Tittel og tre bokser for dato, tid og sted', doc: lay('eventticket') },
      { k: 'speaker', name: 'Person og tittel', desc: 'Personen til høyre, stor tittel til venstre', doc: lay('speaker') },
      { k: 'sermon', name: 'Tittel i midten', desc: 'Tittelen i midten over et dempet bilde', doc: lay('sermon') },
      { k: 'sundayverse', name: 'Bibelvers', desc: 'Et vers eller budskap i midten på varm bakgrunn', doc: lay('sundayverse') },
      { k: 'promo', name: 'Skrå fargeflate', desc: 'Merkelapp, stor overskrift og bilde', doc: lay('promo') },
      { k: 'promocenter', name: 'Sterk farge', desc: 'Stor overskrift og en «Se videoen»-knapp', doc: lay('promocenter') },
      { k: 'promoframe', name: 'Bilde med ramme', desc: 'Bilde i hvit ramme, tekstfelt og rundt merke', doc: lay('promoframe') },
      { k: 'music', name: 'Film', desc: 'Helbilde med svarte kanter, artist og låt', doc: lay('music') },
      { k: 'musiccover', name: 'Cover', desc: 'Kvadratisk cover med låttittel og artist', doc: lay('musiccover') },
      { k: 'musiclive', name: 'Live', desc: 'Helbilde med fargetone, live-merke og låttittel', doc: lay('musiclive') },
      { k: 'playlisttracks', name: 'Sangliste', desc: 'Navn på listen, nummererte sanger og et cover', doc: lay('playlisttracks') },
      { k: 'playlistvinyl', name: 'Vinyl', desc: 'Cover med en vinylplate bak og navn på listen', doc: lay('playlistvinyl') },
      { k: 'playlisttop', name: 'Toppliste', desc: 'Stort tall og navn på listen', doc: lay('playlisttop') }
    ].map(o => { const f = o.doc; return Object.assign(o, { doc: () => { const d = f(); return pal === 'default' || o.k === 'blank' ? d : TS.recolor(d, pal); } }); });
  }
  pvKey(c, k) { return (k === 'base' ? 'base:' + c.id : k + ':' + c.name) + '|' + (this.state.newPal || 'default'); }
  setPal(k) { const c = this.cat(); this.setState({ newPal: k }, () => { if (c) this.genPrev(c); }); }
  async genPrev(c) {
    this._pv = this._pv || {}; const pal = this.state.newPal || 'default';
    for (const o of this.newList(c)) {
      if (o.k === 'blank') continue; const key = this.pvKey(c, o.k);
      if (o.k !== 'base' && this._pv[key]) continue;
      try { this._pv[key] = await TS.snapshot(o.doc(), 480, true); } catch (e) { this._pv[key] = ''; }
      if (!this.alive || !this.state.newOpen || (this.state.newPal || 'default') !== pal) return; this.forceUpdate();
    }
  }
  newVals(c) {
    const S = this.state, all = S.newOpen && c ? this.newList(c).map(o => { const img = o.k === 'blank' ? '' : (this._pv || {})[this.pvKey(c, o.k)]; return { name: o.name, desc: o.desc, img: img || '', hasImg: !!img, loading: o.k !== 'blank' && img == null, onClick: () => this.pickNew(c, o) }; }) : [];
    const pk = S.newPal || 'default', cmb = (window.TS && TS.COMBOS) || [], cur = cmb.find(x => x.k === pk) || cmb[0];
    const pv = { palOpen: !!S.palOpen, togglePal: () => this.setState(s => ({ palOpen: !s.palOpen })), palCurSw: cur ? cur.sw : [], palCurName: cur ? this.t(cur.name) : '',
      palList: cmb.map(x => ({ name: this.t(x.name), sw: x.sw, chk: x.k === pk ? 1 : 0, bg: x.k === pk ? 'rgba(255,255,255,0.1)' : 'transparent', onClick: () => this.setPal(x.k) })) };
    return { ...pv, newOpen: !!S.newOpen, newApply: S.newMode === 'apply', newNotApply: S.newMode !== 'apply', newTop: all.slice(0, 2), newStd: all.slice(2) };
  }
  openLayouts = () => { const c = this.cat(); if (!c || !this.state.doc) return; this.setState({ newOpen: true, newMode: 'apply', newPal: 'default', palOpen: false, logoOpen: false, shapeOpen: false }, () => this.genPrev(c)); };
  applyLayout(nd) {
    const cur = this.state.doc; if (!cur) return;
    const role = (d, r) => d.layers.find(l => l.role === r);
    const oP = role(cur, 'person'), nP = role(nd, 'person');
    if (oP && nP && oP.type === 'image' && nP.type === 'image' && oP.src) Object.assign(nP, { src: oP.src, orig: oP.orig || null, cT: oP.cT || 0, cB: oP.cB || 0, cL: oP.cL || 0, cR: oP.cR || 0 });
    ['name', 'theme'].forEach(r => { const a = role(cur, r), b = role(nd, r); if (a && b && a.type === 'text' && b.type === 'text' && String(a.text || '').trim()) b.text = a.text; });
    const own = cur.layers.filter(l => l.type === 'image' && !l.role && l.src && l.src.indexOf('asset:') !== 0), slots = nd.layers.filter(l => l.type === 'image' && !l.role && !l.src);
    slots.forEach((l, i) => { if (own[i]) Object.assign(l, { src: own[i].src, orig: own[i].orig || null }); });
    this.edit(d => { d.bg = nd.bg; d.vig = nd.vig; d.layers = nd.layers; if (nd.lay) d.lay = nd.lay; else delete d.lay; });
    this._bmC = null; this.setState({ sel: null, multi: [], barSel: null }); this.flash('Oppsettet er byttet. Trykk angre for å gå tilbake.');
  }
  pickNew(c, o) {
    if (this.state.newMode === 'apply') { this.setState({ newOpen: false }); this.applyLayout(o.doc()); return; } const n = this.tplsOf(c.id).length + 1; this.setState({ newOpen: false }); this.enterEdit(o.doc(), null, c.name + ' ' + n); }
  closeNew = () => this.setState({ newOpen: false, palOpen: false });
  leaveEdit = async () => {
    clearTimeout(this._as);
    if (this.state.dirty && this.state.autoSave && this.autoOk() && !this._asBusy) await this.autoRun();
    if (!this.alive) return;
    if (this.state.dirty && !confirm('Du har endringer som ikke er lagret. Gå tilbake likevel?')) return;
    this.setState({ view: 'cat', baseEdit: false, doc: null, hist: [], fut: [], sel: null, dirty: false, exp: false, save: false }, () => this.gcAll());

  };
  dupTpl(t) {
    if (this.tplsOf(t.catId).length >= TS.MAX_TPL) { this.flash('Maks 5 maler per kategori.'); return; }
    const n = Object.assign(TS.clone(t), { id: TS.uid(), name: t.name + ' (kopi)', updated: Date.now() });
    const i = this.state.tpls.findIndex(x => x.id === t.id), list = this.state.tpls.slice(); list.splice(i + 1, 0, n); this.persistTpls(list);
  }
  delTpl(t) { if (!confirm('Slette malen «' + t.name + '»?')) return; this.persistTpls(this.state.tpls.filter(x => x.id !== t.id)).then(() => this.gcAll()); }
  async doSave(mode, quiet) {
    const S = this.state, ref = S.doc, name = String(S.tplName || '').trim().slice(0, 60) || 'Uten navn';
    const thumb = await TS.snapshot(S.doc, 480, false).catch(() => '');
    let tpls = this.state.tpls.slice(), id;
    if (mode === 'new') {
      if (this.tplsOf(S.catId).length >= TS.MAX_TPL) { if (!quiet) this.flash('Maks 5 maler per kategori.'); return; }
      id = TS.uid(); tpls.push({ id, catId: S.catId, name, doc: TS.clone(ref), thumb, updated: Date.now() });
    } else {
      id = mode === 'over' ? S.tplId : mode;
      tpls = this.state.tpls.map(t => t.id === id ? Object.assign({}, t, { name, doc: TS.clone(ref), thumb, updated: Date.now() }) : t);
    }
    await this.persistTpls(tpls);
    if (this.alive) { this.setState(s => ({ tplId: id, tplName: name, dirty: s.doc === ref ? false : s.dirty, save: quiet ? s.save : false })); if (!quiet) this.flash('Malen er lagret.'); }
  }
  /* ----- editing ----- */
  edit(fn, key) {
    const now = Date.now(), co = !!key && key === this._lk && now - this._lt < 900; this._lk = key || null; this._lt = now;
    this.setState(s => { const d = TS.clone(s.doc); fn(d); return { doc: d, hist: co ? s.hist : s.hist.concat([JSON.stringify(s.doc)]).slice(-60), fut: co ? s.fut : [], dirty: true }; });
  }
  setL(id, patch, key) { this.edit(d => { const l = d.layers.find(x => x.id === id); if (!l) return; const dx = patch.x != null ? patch.x - l.x : 0, dy = patch.y != null ? patch.y - l.y : 0; Object.assign(l, patch); if (dx || dy) d.layers.forEach(k => { if (k.link === id && k.id !== id) { k.x += dx; k.y += dy; } }); }, key || id + ':' + Object.keys(patch).join(',')); }
  setBg(patch) { this.edit(d => Object.assign(d.bg, patch), 'bg:' + Object.keys(patch).join(',')); }
  setVig(patch) { this.edit(d => Object.assign(d.vig, patch), 'vig:' + Object.keys(patch).join(',')); }
  undo = () => { this._lk = null; this.setState(s => s.hist.length ? { doc: JSON.parse(s.hist[s.hist.length - 1]), hist: s.hist.slice(0, -1), fut: [JSON.stringify(s.doc)].concat(s.fut).slice(0, 60), dirty: true } : null); };
  redo = () => { this._lk = null; this.setState(s => s.fut.length ? { doc: JSON.parse(s.fut[0]), fut: s.fut.slice(1), hist: s.hist.concat([JSON.stringify(s.doc)]).slice(-60), dirty: true } : null); };
  rootOf(id) { const d = this.state.doc, l = d.layers.find(x => x.id === id); if (!l) return null; const p = l.link && d.layers.find(x => x.id === l.link); return p || l; }
  addLayer(l) {
    const pid = this._pendLink; this._pendLink = null; const P = pid ? this.rootOf(pid) : null;
    if (P) {
      l.link = P.id;
      const line = l.type === 'shape' && l.kind === 'line', back = (l.type === 'shape' && !line) || l.type === 'glow';
      if (l.type === 'text' || line) { l.x = P.x; l.w = P.w; l.y = Math.round(P.y + P.h + (line ? 12 : 16)); }
      else if (l.w && l.h) { l.x = Math.round(P.x + P.w / 2 - l.w / 2); l.y = Math.round(P.y + P.h / 2 - l.h / 2); }
      this.edit(d => { const i = d.layers.findIndex(x => x.id === P.id); d.layers.splice(i < 0 ? d.layers.length : (back ? i : i + 1), 0, l); });
    } else this.edit(d => { d.layers.push(l); });
    this.setState({ sel: l.id, multi: [], logoOpen: false, shapeOpen: false, barSel: null });
  }
  addText() { this.addLayer(TS.L('text', { text: 'Ny tekst', x: 660, y: 460, w: 600, h: 160 })); setTimeout(() => { const t = this.taRef.current; if (t) { t.focus(); t.select(); } }, 60); }
  addLinked(kind, pid) {
    this._pendLink = pid;
    if (kind === 'text') this.addText();
    else if (kind === 'image') this.pick({ mode: 'add' });
    else if (kind === 'line') this.addShape('line');
    else if (kind === 'glow') this.addLayer(TS.L('glow', { color: '#f5b800' }));
    else if (kind === 'shape') this.setState({ shapeOpen: true, logoOpen: false });
    else if (kind === 'logo') this.setState({ logoOpen: true, shapeOpen: false });
  }
  linkTo(cid, tid) {
    if (cid === tid) return; const P = this.rootOf(tid); if (!P) return;
    if (P.id === cid) { this.flash('Et lag kan ikke kobles til sitt eget underlag.'); return; }
    this.edit(d => d.layers.forEach(x => { if (x.id === cid || x.link === cid) x.link = P.id; }));
    this.setState({ sel: cid, multi: [], barSel: null }); this.flash('Lagene er koblet sammen.');
  }
  unlink(id) { this.setL(id, { link: null }); this.flash('Laget er koblet fra.'); }
  linkNote(l) {
    const d = this.state.doc, P = l.link && d.layers.find(x => x.id === l.link), n = d.layers.filter(x => x.link === l.id && x.id !== l.id).length;
    if (P) return [this.NT(this.t('Koblet til') + ' «' + this.lname(P) + '» ' + this.t('og flytter seg sammen med det.')), this.BT([['Koble fra', () => this.unlink(l.id)]])];
    if (n) return [this.NT(n + ' ' + this.t('lag er koblet til dette laget og flytter seg sammen med det.'))];
    return [];
  }
  rowOrder(d) {
    const rev = d.layers.slice().reverse(), kid = l => !!l.link && l.link !== l.id && d.layers.some(p => p.id === l.link && !p.link), out = [];
    rev.forEach(l => { if (kid(l)) return; out.push([l, false]); rev.forEach(k => { if (k.link === l.id && kid(k)) out.push([k, true]); }); });
    return out;
  }
  dndStart(g, e) { this._dnd = g; try { e.dataTransfer.setData('text/plain', 'ts-layer'); e.dataTransfer.effectAllowed = 'move'; } catch (x) {} }
  dndEnd = () => { this._dnd = null; if (this.state.dropOn) this.setState({ dropOn: null }); };
  ZS = [1, 1.25, 1.5, 2, 3, 4];
  setZoom = z => {
    z = Math.max(1, Math.min(4, z)); const el = this.zoomRef.current, z0 = this.state.zoom; let fx = 0.5, fy = 0.5;
    if (el && z0 > 1) { fx = (el.scrollLeft + el.clientWidth / 2) / el.scrollWidth; fy = (el.scrollTop + el.clientHeight / 2) / el.scrollHeight; }
    this.setState({ zoom: z }, () => { const e2 = this.zoomRef.current; if (e2 && z > 1) { e2.scrollLeft = fx * e2.scrollWidth - e2.clientWidth / 2; e2.scrollTop = fy * e2.scrollHeight - e2.clientHeight / 2; } });
  };
  zoomIn = () => { const z = this.state.zoom; this.setZoom(this.ZS.find(x => x > z + 0.001) || 4); };
  zoomOut = () => { const z = this.state.zoom; this.setZoom(this.ZS.slice().reverse().find(x => x < z - 0.001) || 1); };
  zoomReset = () => this.setZoom(1);
  ink(c) { const h = String(c || '').replace('#', ''); if (h.length !== 6) return '#111111'; const n = parseInt(h, 16), r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255; return (0.299 * r + 0.587 * g + 0.114 * b) > 150 ? '#111111' : '#ffffff'; }
  libDefs() {
    const T = (p) => ['text', Object.assign({ font: 'Montserrat', weight: 700, size: 60, color: '#ffffff', align: 'center', valign: 'middle' }, p)];
    const R = (p) => ['shape', Object.assign({ kind: 'rect', radius: 0 }, p)];
    const I = (p) => ['image', Object.assign({ fit: 'cover', px: 0.5, py: 0.5 }, p)];
    const A = (p) => T(Object.assign({ font: 'Anton', weight: 400, upper: true }, p));
    return [
      { title: 'Overskrifter', items: [
        ['hbig', 'Stor overskrift', (a) => [A({ text: 'Stor overskrift', x: 260, y: 380, w: 1400, h: 300, size: 220 })]],
        ['hnarrow', 'Smal overskrift', (a) => [A({ text: 'Smal overskrift', font: 'Bebas Neue', x: 260, y: 380, w: 1400, h: 320, size: 280, lh: 0.9 })]],
        ['hsub', 'Undertittel', (a) => [T({ text: 'Undertittel', x: 460, y: 500, w: 1000, h: 80, weight: 600, size: 56, color: '#e5e5e5' })]],
        ['hlabel', 'Liten etikett', (a) => [T({ text: 'Etikett', x: 560, y: 510, w: 800, h: 60, size: 38, color: a, upper: true, ls: 0.2 })]],
        ['hquote', 'Sitat', (a) => [T({ text: 'Et kort sitat som fanger oppmerksomheten', x: 360, y: 420, w: 1200, h: 320, weight: 800, size: 88, lh: 1.12, align: 'left' }), T({ text: '\u201C', x: 360, y: 150, w: 300, h: 300, weight: 800, size: 400, color: a, align: 'left', valign: 'top', fit: false })]],
        ['hnum', 'Stort tall', (a) => [A({ text: '5', x: 710, y: 190, w: 500, h: 700, size: 700, color: a, upper: false })]],
        ['hlist', 'Nummerert liste', (a) => [T({ text: '1. Første punkt\n2. Andre punkt\n  a. Underpunkt\n3. Tredje punkt', x: 560, y: 330, w: 800, h: 420, size: 64, lh: 1.55, align: 'left', valign: 'top' })]],
        ['hbullet', 'Punktliste', (a) => [T({ text: '\u2022 Første punkt\n\u2022 Andre punkt\n  \u25E6 Underpunkt\n\u2022 Tredje punkt', x: 560, y: 330, w: 800, h: 420, size: 64, lh: 1.55, align: 'left', valign: 'top' })]]
      ] },
      { title: 'Bokser og merker', items: [
        ['bpill', 'Merkelapp', (a, k) => [R({ x: 810, y: 500, w: 300, h: 80, kind: 'rounded', radius: 40, fill: a }), T({ text: 'Nyhet', x: 810, y: 500, w: 300, h: 80, weight: 800, size: 36, color: k, upper: true, ls: 0.12 })]],
        ['bbox', 'Tekst i boks', (a, k) => [R({ x: 460, y: 430, w: 1000, h: 220, fill: a }), A({ text: 'Tekst i boks', x: 480, y: 440, w: 960, h: 200, size: 150, color: k })]],
        ['btilt', 'Skrå tekstboks', (a, k) => [R({ x: 460, y: 430, w: 1000, h: 220, rot: -3, kind: 'rounded', radius: 20, fill: a }), A({ text: 'Skrå tekstboks', x: 480, y: 445, w: 960, h: 190, rot: -3, size: 140, color: k })]],
        ['blower', 'Navneskilt', (a, k) => [R({ x: 100, y: 790, w: 1000, h: 120, fill: '#ffffff' }), T({ text: 'Fornavn Etternavn', x: 140, y: 790, w: 940, h: 120, weight: 800, size: 64, color: '#111111', align: 'left' }), R({ x: 100, y: 910, w: 1000, h: 80, fill: a }), T({ text: 'Tittel eller rolle', x: 140, y: 910, w: 940, h: 80, weight: 600, size: 40, color: k, align: 'left', upper: true, ls: 0.08 })]],
        ['bbadge', 'Rundt merke', (a, k) => [R({ x: 830, y: 410, w: 260, h: 260, kind: 'ellipse', fill: a }), A({ text: 'Ny!', x: 830, y: 410, w: 260, h: 260, rot: -10, size: 110, color: k })]],
        ['bbutton', 'Knapp', (a, k) => [R({ x: 710, y: 485, w: 500, h: 110, kind: 'rounded', radius: 55, fill: a }), T({ text: 'Se videoen', x: 710, y: 485, w: 500, h: 110, weight: 800, size: 40, color: k, upper: true, ls: 0.06 })]],
        ['bdate', 'Datoboks', (a, k) => [R({ x: 740, y: 492, w: 440, h: 96, kind: 'rounded', radius: 48, fill: a }), T({ text: '12. oktober', x: 740, y: 492, w: 440, h: 96, weight: 800, size: 44, color: k, upper: true, ls: 0.06 })]],
        ['binfo', 'Infoboks', (a, k) => [R({ x: 700, y: 415, w: 520, h: 250, kind: 'rounded', radius: 24, fill: a }), T({ text: 'Dato', x: 700, y: 450, w: 520, h: 50, size: 32, color: k, upper: true, ls: 0.2, valign: 'top' }), A({ text: '12. okt', x: 720, y: 510, w: 480, h: 120, size: 100, color: k })]],
        ['bnum', 'Nummer i sirkel', (a, k) => [R({ x: 840, y: 420, w: 240, h: 240, kind: 'ellipse', fill: a }), A({ text: '#3', x: 840, y: 420, w: 240, h: 240, size: 130, color: k, upper: false })]]
      ] },
      { title: 'Former og felt', items: [
        ['srect', 'Firkant', null, 'rect'], ['srounded', 'Avrundet', null, 'rounded'], ['sellipse', 'Sirkel', null, 'ellipse'], ['sline', 'Strek', null, 'line'],
        ['sstripe', 'Skrå stripe', (a) => [R({ x: 250, y: 440, w: 1420, h: 200, rot: -2, fill: a })]],
        ['spanel', 'Halvt fargefelt', (a) => [R({ x: 0, y: 0, w: 960, h: 1080, fill: a })], 'back'],
        ['sdiag', 'Skrå fargeblokk', (a) => [R({ x: -300, y: -200, w: 1350, h: 1500, rot: 12, fill: a })], 'back'],
        ['sband', 'Mørkt felt nederst', (a) => [R({ x: 0, y: 700, w: 1920, h: 380, fill: '#000000', op: 0.55 })]],
        ['soverlay', 'Fargetone over alt', (a) => [R({ x: 0, y: 0, w: 1920, h: 1080, fill: a, op: 0.45 })]],
        ['sbars', 'Svarte kanter', (a) => [R({ x: 0, y: 0, w: 1920, h: 110, fill: '#000000' }), R({ x: 0, y: 970, w: 1920, h: 110, fill: '#000000' })]],
        ['sdivider', 'Midtstrek', (a) => [R({ x: 952, y: 0, w: 16, h: 1080, fill: a })]],
        ['swave', 'Lydbølge', (a) => [80, 160, 240, 120, 300, 200, 360, 260, 360, 200, 300, 120, 240, 160, 80].map((h, i) => R({ x: 600 + i * 48, y: 540 - h / 2, w: 28, h: h, kind: 'rounded', radius: 14, fill: a }))],
        ['sprogress', 'Avspillingslinje', (a) => [R({ x: 530, y: 535, w: 860, h: 10, kind: 'rounded', radius: 5, fill: '#ffffff', op: 0.3 }), R({ x: 530, y: 535, w: 300, h: 10, kind: 'rounded', radius: 5, fill: a })]],
        ['svinyl', 'Vinylplate', (a) => [R({ x: 610, y: 190, w: 700, h: 700, kind: 'ellipse', fill: '#111111' }), R({ x: 860, y: 440, w: 200, h: 200, kind: 'ellipse', fill: a }), R({ x: 945, y: 525, w: 30, h: 30, kind: 'ellipse', fill: '#111111' })]]
      ] },
      { title: 'Bildefelt', items: [
        ['irect', 'Bildefelt', (a) => [I({ x: 560, y: 240, w: 800, h: 600 })]],
        ['irounded', 'Avrundet bilde', (a) => [I({ x: 660, y: 240, w: 600, h: 600, shape: 'rounded', radius: 28 })]],
        ['iround', 'Rundt bilde', (a) => [I({ x: 660, y: 240, w: 600, h: 600, shape: 'ellipse', py: 0.3 })]],
        ['iringed', 'Rundt bilde med ring', (a) => [R({ x: 645, y: 225, w: 630, h: 630, kind: 'ellipse', fill: a }), I({ x: 660, y: 240, w: 600, h: 600, shape: 'ellipse', py: 0.3 })]],
        ['iperson', 'Personutklipp', (a) => [I({ x: 510, y: 120, w: 900, h: 960, fit: 'contain', py: 1 })]],
        ['ifull', 'Helbilde', (a) => [I({ x: 0, y: 0, w: 1920, h: 1080, py: 0.4 })], 'back'],
        ['ihalf', 'Halvt bilde', (a) => [I({ x: 960, y: 0, w: 960, h: 1080, py: 0.4 })], 'back'],
        ['igrid', 'Rutenett 2 × 2', (a) => [[510, 90], [970, 90], [510, 550], [970, 550]].map(p => I({ x: p[0], y: p[1], w: 440, h: 440, shape: 'rounded', radius: 20 }))]
      ] }
    ];
  }
  presetCol() {
    if (this.state.addColor) return this.state.addColor;
    const d = this.state.doc, bg = d && d.bg ? (d.bg.type === 'gradient' ? d.bg.c1 : d.bg.color) : '#111111';
    const lum = c => { const h = String(c || '').replace('#', ''); if (h.length !== 6) return 0; const n = parseInt(h, 16); return 0.299 * (n >> 16 & 255) + 0.587 * (n >> 8 & 255) + 0.114 * (n & 255); };
    const lb = lum(bg), ok = c => /^#[0-9a-f]{6}$/i.test(c) && Math.abs(lum(c) - lb) > 70 && ['#ffffff', '#000000'].indexOf(c.toLowerCase()) < 0;
    return this.profile().colors.find(ok) || (lb > 150 ? '#2563eb' : '#f5b800');
  }
  addPreset(it) {
    this._pendLink = null;
    if (it[3] && it[3] !== 'back') { this.addShape(it[3]); return; }
    const a = this.presetCol(), ls = it[2](a, this.ink(a)).map(p => TS.L(p[0], p[1])), root = ls[0];
    ls.slice(1).forEach(l => { l.link = root.id; });
    this.edit(d => { if (it[3] === 'back') d.layers.splice(0, 0, ...ls); else d.layers.push(...ls); });
    this.setState({ sel: root.id, multi: [], logoOpen: false, shapeOpen: false, barSel: null });
  }
  LS_RE = /^([ \t]*)(\u2022|\u25E6|\u25AA|[-*]|\d+[.)]|[a-z][.)])[ \u2002]+(.*)$/i;
  noop = () => {};
  lsParse(line) { const m = this.LS_RE.exec(line); if (!m || (/^[a-z]/i.test(m[2]) && !m[1].length)) return null; return { lvl: Math.min(3, Math.floor(m[1].replace(/\t/g, '  ').length / 2)), num: /^[0-9a-z]/i.test(m[2]), body: m[3] }; }
  lsMk(num, lvl, n) { return num ? (lvl === 1 ? String.fromCharCode(97 + ((n - 1) % 26)) : String(n)) + '.' : ['\u2022', '\u25E6', '\u25AA', '\u2022'][lvl]; }
  lsFix(text) {
    let cnt = [0, 0, 0, 0];
    return text.split('\n').map(line => {
      const p = this.lsParse(line); if (!p) { if (line.trim()) cnt = [0, 0, 0, 0]; return line; }
      for (let k = p.lvl + 1; k < 4; k++) cnt[k] = 0; if (p.num) cnt[p.lvl]++;
      return '  '.repeat(p.lvl) + this.lsMk(p.num, p.lvl, cnt[p.lvl]) + ' ' + p.body;
    }).join('\n');
  }
  lsBake(l) { const t = String(l.text || ''); if (l.list !== 'num' && l.list !== 'bullet') return t; return this.lsFix(t.split('\n').map(x => x.trim() && !this.lsParse(x) ? (l.list === 'num' ? '1. ' : '\u2022 ') + x.trim() : x).join('\n')); }
  lsStart(text, li) { return text.split('\n').slice(0, li).reduce((n, x) => n + x.length + 1, 0); }
  caret(s, e) { setTimeout(() => { const t = this.taRef.current; if (t) { t.focus(); try { t.setSelectionRange(s, e == null ? s : e); } catch (x) {} } }, 30); }
  listAct(l, act) {
    const ta = this.taRef.current, text = this.lsBake(l), lines = text.split('\n');
    const s0 = ta ? ta.selectionStart : 0, s1 = ta ? ta.selectionEnd : text.length, lineAt = p => text.slice(0, p).split('\n').length - 1;
    const a = lineAt(s0), b = lineAt(Math.max(s0, s1)), rng = lines.slice(a, b + 1).map(x => this.lsParse(x));
    const allType = t => rng.every(p => p && (t === 'num' ? p.num : !p.num));
    for (let i = a; i <= b; i++) {
      const p = this.lsParse(lines[i]); let it = p ? { lvl: p.lvl, num: p.num } : null; const body = p ? p.body : lines[i].replace(/^\s+/, '');
      if (act === 'plain') it = null;
      else if (act === 'bullet' || act === 'num') it = allType(act) ? null : { lvl: it ? it.lvl : 0, num: act === 'num' };
      else if (act === 'in') it = it ? { lvl: Math.min(3, it.lvl + 1), num: it.num } : { lvl: 0, num: false };
      else if (act === 'out') it = it && it.lvl > 0 ? { lvl: it.lvl - 1, num: it.num } : null;
      lines[i] = it ? '  '.repeat(it.lvl) + (it.num ? '1.' : '\u2022') + ' ' + body : body;
    }
    const out = this.lsFix(lines.join('\n')), ol = out.split('\n'), st = this.lsStart(out, a), en = st + ol.slice(a, b + 1).join('\n').length;
    this.setL(l.id, { text: out, list: '' }); this.caret(a === b ? en : st, en);
  }
  listKey(l, e) {
    if (e.key !== 'Enter' && e.key !== 'Tab') return;
    const ta = e.target, text = this.lsBake(l), pos = ta.selectionStart;
    const ls0 = text.lastIndexOf('\n', pos - 1) + 1, le0 = text.indexOf('\n', pos), le = le0 < 0 ? text.length : le0, p = this.lsParse(text.slice(ls0, le)), li = text.slice(0, ls0).split('\n').length - 1;
    if (e.key === 'Tab') { if (!p) return; e.preventDefault(); this.listAct(l, e.shiftKey ? 'out' : 'in'); return; }
    if (e.shiftKey || !p || ta.selectionStart !== ta.selectionEnd) return;
    e.preventDefault();
    if (!p.body.trim()) {
      const nl = p.lvl > 0 ? '  '.repeat(p.lvl - 1) + (p.num ? '1.' : '\u2022') + ' ' : '';
      const out = this.lsFix(text.slice(0, ls0) + nl + text.slice(le)); this.setL(l.id, { text: out, list: '' }); this.caret(this.lsStart(out, li) + out.split('\n')[li].length); return;
    }
    const rest = text.slice(pos, le), out = this.lsFix(text.slice(0, pos) + '\n' + '  '.repeat(p.lvl) + (p.num ? '1.' : '\u2022') + ' ' + text.slice(pos));
    this.setL(l.id, { text: out, list: '' }); this.caret(this.lsStart(out, li + 1) + out.split('\n')[li + 1].length - rest.length);
  }
  listTools(l) {
    return [['Tekst', 'plain', 'Vanlig tekst'], ['\u2022 Punkt', 'bullet', 'Punktliste'], ['1. Nummer', 'num', 'Nummerert liste'], ['\u21E4', 'out', 'Mindre innrykk'], ['\u21E5', 'in', 'Underpunkt']]
      .map(t => ({ label: t[0], title: t[2], onDown: e => { e.preventDefault(); this.listAct(l, t[1]); } }));
  }
  addShape(kind) {
    const c = this.addCol(), p = { kind, fill: c };
    if (kind === 'line') Object.assign(p, { x: 660, y: 536, w: 600, h: 8, radius: 0 });
    else if (kind === 'ellipse') Object.assign(p, { x: 800, y: 380, w: 320, h: 320 });
    else Object.assign(p, { x: 760, y: 390, w: 400, h: 300, radius: kind === 'rounded' ? 40 : 0 });
    this.addLayer(TS.L('shape', p));
  }
  addCol() { const S = this.state; return S.addColor || this.profile().colors[0] || '#ffffff'; }
  detachBar(id) {
    const l = this.state.doc.layers.find(x => x.id === id), b = l && TS.barBox(l); if (!b) return;
    const nl = TS.L('shape', { kind: 'line', x: b.x, y: b.y, w: b.w, h: b.h, rot: b.rot, radius: 0, fill: l.barColor, op: l.op });
    this.edit(d => { const i = d.layers.findIndex(x => x.id === id); if (i < 0) return; d.layers[i].bar = false; d.layers.splice(i + 1, 0, nl); });
    this.setState({ sel: nl.id, multi: [], barSel: null });
    this.flash('Understreken er nå et eget lag og følger ikke lenger teksten.');
  }
  barCtrls(l, set) {
    return [this.CO('Strekfarge', l.barColor, v => set({ barColor: v })),
      this.SL('Strektykkelse', l.barH, 1, 120, 1, v => set({ barH: v }), v => v + ' px', { key: 'ts.barH', lim: [1, 400] }),
      this.SL('Strekbredde (av teksten)', Math.round((l.barW == null ? 1 : l.barW) * 100), 5, 300, 1, v => set({ barW: v / 100 }), v => v + ' %'),
      this.SL('Avstand til teksten', Math.round((l.barGap == null ? 1 : l.barGap) * 100), 0, 600, 5, v => set({ barGap: v / 100 }), v => v + ' %'),
      this.BT([['Koble fra teksten', () => this.detachBar(l.id)], ['Fjern understrek', () => { set({ bar: false }); this.setState({ barSel: null }); }]])];
  }
  ctrlsBar(l) {
    const set = p => this.setL(l.id, p);
    return [this.NT(this.t('Understreken er koblet til teksten') + ' «' + this.lname(l) + '» ' + this.t('og flytter seg sammen med den.'))].concat(this.barCtrls(l, set), [this.BT([['← Rediger teksten', () => this.setState({ barSel: null })]])]);
  }
  delLayer(id) { this.edit(d => { d.layers = d.layers.filter(x => x.id !== id); d.layers.forEach(x => { if (x.link === id) x.link = null; }); }); this.setState({ sel: null, multi: [] }); }
  dupLayer(id) {
    const nid = TS.uid();
    this.edit(d => { const i = d.layers.findIndex(x => x.id === id); if (i < 0) return; const c = TS.clone(d.layers[i]); c.id = nid; c.x += 40; c.y += 40; c.role = null; d.layers.splice(i + 1, 0, c); });
    this.setState({ sel: nid });
  }
  moveZ(id, dir) { this.edit(d => { const i = d.layers.findIndex(x => x.id === id), j = i + dir; if (i < 0 || j < 0 || j >= d.layers.length) return; const t = d.layers[i]; d.layers[i] = d.layers[j]; d.layers[j] = t; }); }
  CLIP_KEY = 'thumbstudio.clip';
  getClip() {
    let c = null; try { c = JSON.parse(localStorage.getItem(this.CLIP_KEY) || 'null'); } catch (e) {}
    if (!c || !Array.isArray(c.layers)) c = this._clip || null;
    return c && Array.isArray(c.layers) ? c.layers.filter(l => l && ['text', 'image', 'shape', 'glow'].indexOf(l.type) >= 0).slice(0, 60) : [];
  }
  selIds() { const S = this.state, m = S.multi || []; return m.length > 1 ? m.slice() : S.sel ? [S.sel] : []; }
  copyLayers(cut) {
    const d = this.state.doc, ids = this.selIds(); if (!d || !ids.length) return false;
    const pick = d.layers.filter(l => ids.indexOf(l.id) >= 0 || (l.link && ids.indexOf(l.link) >= 0));
    const clip = { v: 1, t: Date.now(), layers: TS.clone(pick) }; this._clip = clip;
    try { localStorage.setItem(this.CLIP_KEY, JSON.stringify(clip)); } catch (e) {}
    if (cut) { const gone = pick.map(l => l.id); this.edit(dd => { dd.layers = dd.layers.filter(x => gone.indexOf(x.id) < 0); dd.layers.forEach(x => { if (gone.indexOf(x.link) >= 0) x.link = null; }); }); this.setState({ sel: null, multi: [], barSel: null }); this.flash(pick.length > 1 ? 'Lagene er klippet ut.' : 'Laget er klippet ut.'); }
    else this.flash(pick.length > 1 ? 'Lagene er kopiert. Lim inn med Ctrl/Cmd + V på hvilken som helst side.' : 'Laget er kopiert. Lim inn med Ctrl/Cmd + V på hvilken som helst side.');
    return true;
  }
  pasteLayers(at) {
    const d = this.state.doc, src = this.getClip(); if (!d || !src.length) { this.flash('Ingenting å lime inn. Kopier et lag først.'); return; }
    const map = {}; src.forEach(l => { map[l.id] = TS.uid(); });
    const b = this.gbox(src), same = src.some(l => d.layers.some(x => x.id === l.id));
    let dx = same ? 40 : 0, dy = same ? 40 : 0;
    if (at) { dx = Math.round(at.x - (b.x + b.w / 2)); dy = Math.round(at.y - (b.y + b.h / 2)); }
    const roles = new Set(d.layers.map(l => l.role).filter(Boolean));
    const add = src.map(l => { const c = TS.clone(l); c.id = map[l.id]; c.link = l.link && map[l.link] ? map[l.link] : null; c.x = Math.round(c.x + dx); c.y = Math.round(c.y + dy); if (c.role && roles.has(c.role)) c.role = null; return c; });
    const pending = add.filter(l => l.type === 'image' && l.src).map(l => TS.loadSrc(l.src).catch(() => {}));
    this.edit(dd => { dd.layers.push(...add); });
    const top = add.filter(l => !l.link || !map[Object.keys(map).find(k => map[k] === l.link)]).map(l => l.id);
    this.setState(top.length > 1 ? { sel: top[0], multi: top, barSel: null, ctx: null } : { sel: top[0] || add[0].id, multi: [], barSel: null, ctx: null });
    Promise.all(pending).then(() => this.alive && this.sched && this.sched());
    this.flash(add.length > 1 ? 'Lagene er limt inn.' : 'Laget er limt inn.');
  }
  onCtx = e => {
    if (this.state.narrow) return; e.preventDefault();
    const p = this.pt(e), d = this.state.doc, m = this.state.multi || [], t = TS.hit(d, p);
    if (t && !(m.length > 1 && m.indexOf(t.id) >= 0)) this.setState({ sel: t.id, multi: [], barSel: null });
    const vw = window.innerWidth, vh = window.innerHeight;
    this.setState({ ctx: { x: Math.min(e.clientX, vw - 220), y: Math.min(e.clientY, vh - 260), p: { x: p.x, y: p.y }, on: !!t || this.selIds().length > 0 } });
  };
  closeCtx = () => { if (this.state.ctx) this.setState({ ctx: null }); };
  ctxVals() {
    const c = this.state.ctx, has = !!c && (c.on || this.selIds().length > 0), clip = !!c && this.getClip().length > 0, mod = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent) ? '\u2318' : 'Ctrl+';
    const it = (label, sc, fn, en) => ({ label, sc, onClick: () => { this.setState({ ctx: null }); if (en) fn(); }, op: en ? 1 : 0.4, cur: en ? 'pointer' : 'default' });
    return {
      ctxOpen: !!c, ctxL: c ? c.x + 'px' : '0px', ctxT: c ? c.y + 'px' : '0px', closeCtx: this.closeCtx, stopCtx: e => e.preventDefault(),
      ctxItems: c ? [
        it('Kopier', mod + 'C', () => this.copyLayers(false), has), it('Klipp ut', mod + 'X', () => this.copyLayers(true), has),
        it('Lim inn', mod + 'V', () => this.pasteLayers(null), clip), it('Lim inn her', '', () => this.pasteLayers(c.p), clip),
        it('Speil vannrett', 'Shift+H', () => this.flipSel('x'), has), it('Speil loddrett', 'Shift+V', () => this.flipSel('y'), has),
        it('Dupliser', mod + 'D', () => { const id = this.state.sel; if (id) this.dupLayer(id); }, has && this.selIds().length === 1),
        it('Slett', 'Del', () => { if ((this.state.multi || []).length > 1) this.delGroup(); else if (this.state.sel) this.delLayer(this.state.sel); }, has)
      ] : []
    };
  }
  flipSel(axis) {
    const ids = this.selIds(); if (!ids.length) return; const k = axis === 'y' ? 'flipY' : 'flipX';
    this.edit(d => d.layers.forEach(l => { if (ids.indexOf(l.id) < 0) return; if (k === 'flipX' && l.type === 'image') l.flip = !l.flip; else l[k] = !l[k]; }));
  }
  LAYOUT_KEY = 'thumbstudio.layout';
  CUSTOM_KEY = 'thumbstudio.layoutCustom';
  PANELS = ['add', 'layers', 'canvas', 'props'];
  PRESETS = {
    std: { cols: [['add', 'layers'], ['canvas'], ['props']], tabs: [0, 0, 0] },
    cols: { cols: [['add'], ['layers'], ['canvas'], ['props']], tabs: [0, 0, 0, 0] },
    tabs: { cols: [['add', 'layers'], ['canvas'], ['props']], tabs: [1, 0, 0] },
    right: { cols: [['canvas'], ['add', 'layers'], ['props']], tabs: [0, 1, 0] },
    mirror: { cols: [['props'], ['canvas'], ['add', 'layers']], tabs: [0, 0, 0] },
    side: { cols: [['canvas'], ['add', 'layers', 'props']], tabs: [0, 1] }
  };
  pname(k) { return { add: 'Legg til', layers: 'Lag', canvas: 'Lerret', props: 'Egenskaper' }[k]; }
  validLayout(L) {
    if (!L || !Array.isArray(L.cols)) return null;
    const cols = L.cols.slice(0, 5).map(c => Array.isArray(c) ? c.filter(k => this.PANELS.indexOf(k) >= 0) : []), all = [].concat.apply([], cols);
    if (all.length !== 4 || this.PANELS.some(k => all.indexOf(k) < 0)) return null;
    return { cols, tabs: cols.map((c, i) => !!(L.tabs && L.tabs[i])) };
  }
  loadCustom() { try { return this.validLayout(JSON.parse(localStorage.getItem(this.CUSTOM_KEY) || 'null')); } catch (e) { return null; } }
  layoutOf(m) { if (m === 'custom') return this.state.customLayout || this.loadCustom() || this.PRESETS.std; return this.PRESETS[m] || this.PRESETS.std; }
  setLayout(m) { try { localStorage.setItem(this.LAYOUT_KEY, m); } catch (e) {} this.setState({ layoutMode: m, viewMenu: false }); }
  openLc = () => {
    const cur = this.layoutOf(this.state.layoutMode || 'std'), cols = [0, 1, 2, 3, 4].map(i => (cur.cols[i] || []).slice()), tabs = [0, 1, 2, 3, 4].map(i => !!cur.tabs[i]);
    this.setState({ viewMenu: false, lcOpen: true, lcDraft: { cols, tabs }, lcHover: null });
  };
  lcMove(key, slot, before) {
    this.setState(s => {
      const d = { cols: s.lcDraft.cols.map(c => c.filter(k => k !== key)), tabs: s.lcDraft.tabs.slice() }, col = d.cols[slot];
      const at = before ? col.indexOf(before) : -1; if (at >= 0) col.splice(at, 0, key); else col.push(key);
      return { lcDraft: d, lcHover: null };
    });
  }
  lcShift(key, dir) {
    const d = this.state.lcDraft, si = d.cols.findIndex(c => c.indexOf(key) >= 0), col = d.cols[si], i = col.indexOf(key);
    if (dir === 'left' || dir === 'right') { const t = si + (dir === 'left' ? -1 : 1); if (t < 0 || t > 4) return; this.lcMove(key, t, null); return; }
    const j = i + (dir === 'up' ? -1 : 1); if (j < 0 || j >= col.length) return;
    this.setState(s => { const c = s.lcDraft.cols.map(x => x.slice()); const cc = c[si]; const tmp = cc[i]; cc[i] = cc[j]; cc[j] = tmp; return { lcDraft: { cols: c, tabs: s.lcDraft.tabs } }; });
  }
  lcApply = () => {
    const d = this.state.lcDraft, keep = d.cols.map((c, i) => [c, d.tabs[i] && c.length > 1]).filter(x => x[0].length), L = this.validLayout({ cols: keep.map(x => x[0]), tabs: keep.map(x => x[1]) });
    if (!L) return; try { localStorage.setItem(this.CUSTOM_KEY, JSON.stringify(L)); localStorage.setItem(this.LAYOUT_KEY, 'custom'); } catch (e) {}
    this.setState({ customLayout: L, layoutMode: 'custom', lcOpen: false, lcDraft: null }); this.flash('Din egen visning er lagret og brukes neste gang også.');
  };
  lcVals() {
    const S = this.state, d = S.lcDraft;
    if (!S.lcOpen || !d) return { lcOpen: false, lcSlots: [], lcPresets: [] };
    const H = { canvas: '150px', props: '96px', add: '70px', layers: '70px' };
    return {
      lcOpen: true, closeLc: () => this.setState({ lcOpen: false, lcDraft: null }), lcApply: this.lcApply,
      lcReset: () => this.setState({ lcDraft: { cols: [0, 1, 2, 3, 4].map(i => (this.PRESETS.std.cols[i] || []).slice()), tabs: [false, false, false, false, false] } }),
      lcPresets: [['std', 'Standard'], ['cols', 'Egen lagkolonne'], ['tabs', 'Faner'], ['right', 'Lerret til venstre'], ['mirror', 'Speilet'], ['side', 'Ett sidepanel']].map(p => ({ label: p[1], onClick: () => { const P = this.PRESETS[p[0]]; this.setState({ lcDraft: { cols: [0, 1, 2, 3, 4].map(i => (P.cols[i] || []).slice()), tabs: [0, 1, 2, 3, 4].map(i => !!P.tabs[i]) } }); } })),
      lcSlots: d.cols.map((c, si) => ({
        title: this.t('Kolonne') + ' ' + (si + 1), empty: !c.length, border: S.lcHover === si ? '#f3f1ec' : 'rgba(255,255,255,0.22)', bg: S.lcHover === si ? 'rgba(255,255,255,0.06)' : 'transparent',
        canTabs: c.length > 1, tabsOn: !!d.tabs[si], onTabs: e => { const on = e.target.checked; this.setState(s => { const t = s.lcDraft.tabs.slice(); t[si] = on; return { lcDraft: { cols: s.lcDraft.cols, tabs: t } }; }); },
        onOver: e => { e.preventDefault(); if (S.lcHover !== si) this.setState({ lcHover: si }); }, onLeave: () => { if (this.state.lcHover === si) this.setState({ lcHover: null }); },
        onDrop: e => { e.preventDefault(); if (this._lcDrag) this.lcMove(this._lcDrag, si, null); this._lcDrag = null; },
        items: c.map((k, i) => ({
          name: this.t(this.pname(k)), h: H[k], bg: k === 'canvas' ? 'rgba(243,241,236,0.16)' : 'rgba(255,255,255,0.05)', border: k === 'canvas' ? 'rgba(243,241,236,0.5)' : 'rgba(255,255,255,0.18)',
          onStart: e => { this._lcDrag = k; try { e.dataTransfer.setData('text/plain', 'ts-panel'); e.dataTransfer.effectAllowed = 'move'; } catch (x) {} },
          onEnd: () => { this._lcDrag = null; if (this.state.lcHover != null) this.setState({ lcHover: null }); },
          onOver: e => { e.preventDefault(); e.stopPropagation(); if (S.lcHover !== si) this.setState({ lcHover: si }); },
          onDrop: e => { e.preventDefault(); e.stopPropagation(); const src = this._lcDrag; this._lcDrag = null; if (src && src !== k) this.lcMove(src, si, k); },
          canL: si > 0, canR: si < 4, canU: i > 0, canD: i < c.length - 1,
          onL: () => this.lcShift(k, 'left'), onR: () => this.lcShift(k, 'right'), onU: () => this.lcShift(k, 'up'), onD: () => this.lcShift(k, 'down'),
          opL: si > 0 ? 1 : 0.3, opR: si < 4 ? 1 : 0.3, opU: i > 0 ? 1 : 0.3, opD: i < c.length - 1 ? 1 : 0.3
        }))
      }))
    };
  }
  viewVals() {
    const S = this.state, modes = ['std', 'cols', 'tabs', 'right', 'mirror', 'side', 'custom'], LM = modes.indexOf(S.layoutMode) >= 0 ? S.layoutMode : 'std';
    const L = S.narrow ? { cols: [['canvas', 'props']], tabs: [false] } : this.layoutOf(LM), n = S.doc ? S.doc.layers.length : 0, sel = S.colTab || {};
    const layCols = L.cols.filter(c => c.length).map((c, ci) => {
      const tabs = !!L.tabs[ci] && c.length > 1, act = tabs ? (c.indexOf(sel[ci]) >= 0 ? sel[ci] : c[0]) : null, hasC = c.indexOf('canvas') >= 0, hasP = c.indexOf('props') >= 0;
      const o = {}; c.forEach((k, i) => { o[k] = i; });
      const show = k => c.indexOf(k) >= 0 && (!tabs || act === k);
      return {
        flex: hasC ? '1 1 560px' : hasP ? '0 1 330px' : '0 1 270px', min: hasC ? '0px' : hasP ? '280px' : '250px',
        hasTabs: tabs, tabs: tabs ? c.map(k => ({ label: this.t(this.pname(k)) + (k === 'layers' ? ' (' + n + ')' : ''), sel: act === k, bg: act === k ? '#f3f1ec' : 'transparent', color: act === k ? '#000000' : '#b3afa6', onClick: () => this.setState(s => ({ colTab: Object.assign({}, s.colTab, { [ci]: k }) })) })) : [],
        showAdd: show('add'), showLayers: show('layers'), showCanvas: show('canvas'), showProps: show('props'),
        oAdd: o.add || 0, oLayers: o.layers || 0, oCanvas: o.canvas || 0, oProps: o.props || 0
      };
    });
    const T = '#6f6b64', C = '#f3f1ec', mini = Lx => Lx.cols.filter(c => c.length).map(c => [c.indexOf('canvas') >= 0 ? 5 : c.indexOf('props') >= 0 ? 2 : 1.6, c.indexOf('canvas') >= 0 ? C : T]);
    const opts = [
      ['std', 'Standard', 'Legg til og lag til venstre, egenskaper til høyre'],
      ['cols', 'Egen lagkolonne', 'Lag i en egen kolonne ved siden av «Legg til»'],
      ['tabs', 'Faner', 'Legg til og lag som faner, så lerretet blir større'],
      ['right', 'Lerret til venstre', 'Lerretet først, verktøy og egenskaper til høyre'],
      ['mirror', 'Speilet', 'Egenskaper til venstre, legg til og lag til høyre'],
      ['side', 'Ett sidepanel', 'Stort lerret og alt annet i faner til høyre'],
      ['custom', 'Egen visning', 'Sett opp kolonnene selv med dra og slipp']
    ];
    return {
      layCols,
      viewMenu: !!S.viewMenu, toggleViewMenu: () => this.setState({ viewMenu: !S.viewMenu }), closeViewMenu: () => this.setState({ viewMenu: false }),
      viewOpts: opts.map(o => ({ name: o[1], desc: o[2], sel: LM === o[0], bg: LM === o[0] ? 'rgba(255,255,255,0.08)' : 'transparent', border: LM === o[0] ? 'rgba(255,255,255,0.45)' : 'transparent',
        boxes: mini(this.layoutOf(o[0])).map(b => ({ f: b[0], bg: b[1] })), onClick: () => o[0] === 'custom' ? this.openLc() : this.setLayout(o[0]) }))
    };
  }
  key(e) {
    if (this.state.view !== 'edit') return;
    const t = e.target, typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable), mod = e.metaKey || e.ctrlKey, k = e.key;
    if (mod && (k === 'z' || k === 'Z')) { if (typing) return; e.preventDefault(); if (e.shiftKey) this.redo(); else this.undo(); return; }
    if (mod && k === 'y') { if (typing) return; e.preventDefault(); this.redo(); return; }
    if (this.state.cropId) { if (k === 'Escape') this.setState({ cropId: null }); else if (k === 'Enter') { e.preventDefault(); this.applyCropTo(this.state.cropId, this.state.cropBox); this.setState({ cropId: null }); } return; }
    if (typing || this.state.exp || this.state.save) return;
    if (k === 'Escape' && (this.state.ctx || this.state.viewMenu || this.state.lcOpen)) { this.setState({ ctx: null, viewMenu: false, lcOpen: false, lcDraft: null }); return; }
    if (mod && !e.altKey && (k === 'c' || k === 'C' || k === 'x' || k === 'X')) { const sel = window.getSelection && String(window.getSelection() || ''); if (sel) return; if (this.copyLayers(k === 'x' || k === 'X')) e.preventDefault(); return; }
    if (mod && !e.altKey && (k === 'v' || k === 'V')) { if (this.getClip().length) { e.preventDefault(); this.pasteLayers(null); } return; }
    const id = this.state.sel; if (!id) return;
    if (e.shiftKey && !mod && !e.altKey && (k === 'H' || k === 'h' || k === 'V' || k === 'v')) { e.preventDefault(); this.flipSel(k === 'V' || k === 'v' ? 'y' : 'x'); return; }
    const l = this.state.doc.layers.find(x => x.id === id); if (!l) return;
    const grp = (this.state.multi || []).length > 1 ? this.state.multi : null;
    if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); if (grp) this.delGroup(); else if (this.state.barSel === id && l.bar) { this.setL(id, { bar: false }); this.setState({ barSel: null }); } else this.delLayer(id); }
    else if (k === 'Escape') this.setState({ sel: null, multi: [] });
    else if (mod && (k === 'd' || k === 'D')) { e.preventDefault(); this.dupLayer(id); }
    else if (/^Arrow/.test(k) && !l.lock) {
      e.preventDefault(); const st = e.shiftKey ? 10 : 1, dx = k === 'ArrowLeft' ? -st : k === 'ArrowRight' ? st : 0, dy = k === 'ArrowUp' ? -st : k === 'ArrowDown' ? st : 0;
      if (grp) this.moveGroup(dx, dy); else this.setL(id, { x: l.x + dx, y: l.y + dy }, 'nudge:' + id);
    }
  }
  /* ----- canvas interaction ----- */
  pt(e) { const r = this.ovRef.current.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * TS.W, y: (e.clientY - r.top) / r.height * TS.H, k: TS.W / Math.max(1, r.width) }; }
  onDown = e => {
    if (e.button || this.state.narrow) return;
    const p = this.pt(e), d = this.state.doc, cur = d.layers.find(x => x.id === this.state.sel), m = this.state.multi || [];
    if (e.shiftKey) { const t = TS.hit(d, p); if (t) { e.preventDefault(); this.toggleMulti(t.id); } return; }
    const gm = m.length > 1 ? TS.hit({ layers: d.layers.filter(x => m.indexOf(x.id) >= 0) }, p) : null;
    const target = gm || (cur && !cur.lock && !cur.hidden && TS.hit({ layers: [cur] }, p) ? cur : TS.hit(d, p));
    if (!target) { this.setState({ sel: null, multi: [], logoOpen: false, shapeOpen: false, barSel: null }); return; }
    this.begin(e, 'move', target, p, null);
  };
  onHandle = e => {
    e.stopPropagation(); if (e.button) return;
    const l = this.state.doc.layers.find(x => x.id === this.state.sel); if (!l || l.lock) return;
    this.begin(e, 'resize', l, this.pt(e), e.currentTarget.getAttribute('data-h'));
  };
  begin(e, mode, l, p, h) {
    e.preventDefault();
    const m = this.state.multi || [], inG = mode === 'move' && m.length > 1 && m.indexOf(l.id) >= 0;
    const gl = inG ? this.state.doc.layers.filter(x => m.indexOf(x.id) >= 0 && !x.lock) : null, gb = inG && gl.length ? this.gbox(gl) : null;
    const mv = gb ? gl.map(x => x.id) : [l.id], kids = mode === 'move' ? this.state.doc.layers.filter(x => x.link && mv.indexOf(x.link) >= 0 && mv.indexOf(x.id) < 0 && !x.lock).map(x => ({ id: x.id, x: x.x, y: x.y })) : [];
    this.drag = { kids, mode, id: l.id, p0: p, l0: gb ? { x: gb.x, y: gb.y, w: gb.w, h: gb.h, rot: 0 } : { x: l.x, y: l.y, w: l.w, h: l.h, rot: l.rot || 0 }, group: gb ? gl.map(x => ({ id: x.id, x: x.x, y: x.y })) : null, h, keep: l.type === 'image', moved: false, snap: JSON.stringify(this.state.doc) };
    if (!inG && (this.state.sel !== l.id || m.length)) this.setState({ sel: l.id, multi: [], logoOpen: false, shapeOpen: false, barSel: null });
    window.addEventListener('pointermove', this.onMove); window.addEventListener('pointerup', this.onUp); window.addEventListener('pointercancel', this.onUp);
  }
  stopDrag() { window.removeEventListener('pointermove', this.onMove); window.removeEventListener('pointerup', this.onUp); window.removeEventListener('pointercancel', this.onUp); this.drag = null; }
  onMove = e => {
    const g = this.drag; if (!g || !this.ovRef.current) return;
    const p = this.pt(e), dx = p.x - g.p0.x, dy = p.y - g.p0.y, L0 = g.l0;
    if (!g.moved && Math.hypot(dx, dy) < 3 * p.k) return;
    if (!g.moved) { g.moved = true; const snap = g.snap; this._lk = null; this.setState(s => ({ hist: s.hist.concat([snap]).slice(-60), fut: [], dirty: true })); }
    let patch, gx = [], gy = [];
    if (g.mode === 'move') {
      let x = L0.x + dx, y = L0.y + dy; const th = 8 * p.k;
      if (!e.altKey) {
        const xs = [0, TS.W / 2, TS.W], ys = [0, TS.H / 2, TS.H];
        this.state.doc.layers.forEach(o => { if (o.id === g.id || (g.group && g.group.some(q => q.id === o.id)) || g.kids.some(q => q.id === o.id) || o.hidden || o.type === 'glow') return; xs.push(o.x, o.x + o.w / 2, o.x + o.w); ys.push(o.y, o.y + o.h / 2, o.y + o.h); });
        const offs = s => [0, s / 2, s];
        const snap = (pos, size, cs) => { let b = null; offs(size).forEach(f => cs.forEach(c => { const d = c - (pos + f); if (Math.abs(d) < th && (b === null || Math.abs(d) < Math.abs(b))) b = d; })); return b; };
        const hits = (pos, size, cs, lim) => { const out = []; offs(size).forEach(f => cs.forEach(c => { if (Math.abs(c - (pos + f)) < 0.5 && c > 0 && c < lim && out.indexOf(c) < 0) out.push(c); })); return out; };
        const bx = snap(x, L0.w, xs); if (bx !== null) x += bx;
        const by = snap(y, L0.h, ys); if (by !== null) y += by;
        gx = hits(x, L0.w, xs, TS.W); gy = hits(y, L0.h, ys, TS.H);
      }
      patch = { x: Math.round(x), y: Math.round(y) };
    } else {
      const sx = g.h[1] === 'l' ? -1 : 1, sy = g.h[0] === 't' ? -1 : 1, a = -L0.rot * Math.PI / 180;
      const ldx = dx * Math.cos(a) - dy * Math.sin(a), ldy = dx * Math.sin(a) + dy * Math.cos(a);
      const mn = L0.type === 'shape' ? 1 : 20; let w = Math.max(mn, L0.w + sx * ldx), h = Math.max(mn, L0.h + sy * ldy);
      if (g.keep !== !!e.shiftKey) { const r = L0.w / L0.h; if (w / h > r) h = w / r; else w = h * r; }
      const b = L0.rot * Math.PI / 180, ox = sx * (w - L0.w) / 2, oy = sy * (h - L0.h) / 2;
      const cx = L0.x + L0.w / 2 + ox * Math.cos(b) - oy * Math.sin(b), cy = L0.y + L0.h / 2 + ox * Math.sin(b) + oy * Math.cos(b);
      patch = { x: Math.round(cx - w / 2), y: Math.round(cy - h / 2), w: Math.round(w), h: Math.round(h) };
    }
    this.setState(s => {
      const d = TS.clone(s.doc);
      if (g.group) { const ox = patch.x - L0.x, oy = patch.y - L0.y; g.group.forEach(q => { const l = d.layers.find(x => x.id === q.id); if (l) { l.x = q.x + ox; l.y = q.y + oy; } }); }
      else { const l = d.layers.find(x => x.id === g.id); if (l) Object.assign(l, patch); }
      if (g.kids.length) { const ox = patch.x - L0.x, oy = patch.y - L0.y; g.kids.forEach(q => { const k = d.layers.find(x => x.id === q.id); if (k) { k.x = q.x + ox; k.y = q.y + oy; } }); }
      return { doc: d, gx, gy };
    });
  };
  onUp = () => { this.stopDrag(); this._lk = null; if ((this.state.gx || []).length || (this.state.gy || []).length) this.setState({ gx: [], gy: [] }); };
  onDbl = () => { const l = this.state.doc.layers.find(x => x.id === this.state.sel); if (l && l.type === 'image' && l.src) { this.openCrop(l.id); return; } if (l && l.type === 'text') setTimeout(() => { const t = this.taRef.current; if (t) { t.focus(); t.select(); } }, 30); };
  /* ----- images ----- */
  pick(target) { this._ft = target; const f = this.fileRef.current; if (f) { f.value = ''; f.click(); } }
  onFile = e => { const f = e.target.files && e.target.files[0]; if (e.target.value !== undefined) e.target.value = ''; if (f) this.useFile(f, this._ft || { mode: 'add' }); };
  async useFile(f, t) {
    if (!TS.okFile(f)) { this.flash('Velg et bilde (JPG, PNG eller WebP, maks 40 MB).'); return; }
    const probe = TS.clone(this.state.doc);
    if (t.mode === 'replace') { const l = probe.layers.find(x => x.id === t.id); if (l) l.src = null; }
    if (t.mode === 'bg') probe.bg.src = null;
    if (TS.countImgs(probe) >= TS.MAX_IMG) { this.flash('Maks 5 bilder per mal. Fjern et bilde først.'); return; }
    this.setState({ busyImg: true });
    let src; try { src = await TS.putImage(f); await TS.loadSrc(src); } catch (err) { this.setState({ busyImg: false }); this.flash('Klarte ikke å lese bildet. Prøv JPG eller PNG.'); return; }
    if (!this.alive) return; this.setState({ busyImg: false });
    this.placeSrc(src, t);
  }
  onDragOver = e => { e.preventDefault(); };
  onDrop = e => {
    e.preventDefault(); const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if (!f) return;
    const l = this.state.doc.layers.find(x => x.id === this.state.sel);
    this.useFile(f, l && l.type === 'image' ? { mode: 'replace', id: l.id } : { mode: 'add' });
  };
  async runAI(id, kind) {
    if (this.state.ai) return;
    const l = this.state.doc.layers.find(x => x.id === id); if (!l || !l.src || l.src.indexOf('db:') !== 0) return;
    const blob = await TS.blobOf(l.src); if (!blob) return;
    this.setState({ ai: { id, phase: 'model', pct: 0 } });
    try {
      const src = await TS.cutout(blob, kind, (phase, pct) => this.alive && this.setState({ ai: { id, phase, pct } }));
      await TS.loadSrc(src); if (!this.alive) return;
      const cur = this.state.doc.layers.find(x => x.id === id);
      this.setL(id, { src, orig: (cur && cur.orig) || l.src }); this.setState({ ai: null }); this.flash('Bakgrunnen er fjernet. Under «Beskjær» kan du kutte bildet.');
    } catch (err) {
      if (this.alive) { this.setState({ ai: null }); this.flash(navigator.onLine === false ? 'Du er frakoblet. Første gang må AI-modellen lastes ned.' : 'Klarte ikke å fjerne bakgrunnen. Prøv et annet bilde eller en nyere nettleser.'); }
    }
  }
  async doExport() {
    const S = this.state; this.setState({ expBusy: true });
    try {
      const scale = S.expRes === '4k' ? 2 : 1, type = S.expFmt === 'jpg' ? 'image/jpeg' : 'image/png', tr = !!S.expT && S.expFmt === 'png', key = S.expRes + '|' + S.expFmt + '|' + (tr ? 1 : 0);
      const b = this._eb && this._eb.key === key && this._eb.doc === S.doc ? this._eb.b : await TS.exportBlob(S.doc, scale, type, { transparent: tr });
      if (!b) throw new Error('blob');
      const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = this.slug(S.tplName || (this.cat() || {}).name) + '-' + (S.expRes === '4k' ? '4k' : '1080p') + '.' + S.expFmt;
      document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 60000);
      if (this.alive) { this.setState({ expBusy: false, exp: false }); this.flash(this.t('Lastet ned') + ' · ' + this.mb(b.size)); }
    } catch (err) { if (this.alive) { this.setState({ expBusy: false }); this.flash('Eksporten feilet. Prøv 1080p eller JPG.'); } }
  }
  slug(s) { return String(s || '').toLowerCase().replace(/æ/g, 'ae').replace(/ø/g, 'o').replace(/å/g, 'a').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'thumbnail'; }
  /* ----- control builders ----- */
  H(label) { return { isH: true, label }; }
  SL(label, val, min, max, step, set, fmt, o) {
    o = o || {};
    const u0 = fmt ? String(fmt(0)).replace(/^-?0\s*/, '') : '', units = o.units || [{ u: u0, k: 1 }];
    const rnd = v => step >= 1 ? Math.round(v) : Math.round(v / step) * step;
    return Object.assign({ isSlider: true, label, val, min, max, step, disp: fmt ? fmt(val) : String(val), onChange: e => set(+e.target.value) },
      this.numF(o.key || 'ts.' + label, val, units, v => set(rnd(v)), o.lim || [min, max]));
  }
  /* number field with clickable unit (px / % / pt …); units: [{u, k: display per base, d: decimals, t: title}] */
  numF(key, base, units, set, lim) {
    const pref = this._up || (this._up = (() => { try { return JSON.parse(localStorage.getItem('medialab.units') || '{}') || {}; } catch (e) { return {}; } })());
    const ui = Math.max(0, units.findIndex(x => x.u === pref[key])), U = units[ui], multi = units.length > 1;
    const shown = String(+(Number(base) * U.k).toFixed(U.d == null ? 0 : U.d)).replace('.', window.MLI18N && MLI18N.lang === 'en' ? '.' : ',');
    const ed = this.state.numEd && this.state.numEd.k === key ? this.state.numEd.t : null;
    const commit = t => { const n = parseFloat(String(t).replace(',', '.')); this.setState({ numEd: null }); if (isFinite(n)) set(Math.max(lim[0], Math.min(lim[1], n / U.k))); };
    return {
      numVal: ed != null ? ed : shown, unit: U.u, hasUnit: !!U.u,
      unitTitle: multi ? this.t('Trykk for å bytte enhet') + ': ' + units.map(x => x.u + (x.t ? ' (' + this.t(x.t) + ')' : '')).join(' / ') : '',
      unitBg: multi ? 'rgba(255,255,255,0.07)' : 'transparent', unitCur: multi ? 'pointer' : 'default',
      onNum: e => this.setState({ numEd: { k: key, t: e.target.value.slice(0, 12) } }),
      onNumFocus: e => { try { e.target.select(); } catch (err) {} },
      onNumBlur: e => { if (this.state.numEd && this.state.numEd.k === key) commit(e.target.value); },
      onNumKey: e => {
        if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); }
        else if (e.key === 'Escape') { this.setState({ numEd: null }); }
        else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); const cur = parseFloat(String(e.target.value).replace(',', '.')); const stp = (e.shiftKey ? 10 : 1) * (U.d ? Math.pow(10, -U.d) * (U.u === '%' ? 10 : 1) : 1); if (isFinite(cur)) { const n = cur + (e.key === 'ArrowUp' ? stp : -stp); this.setState({ numEd: null }); set(Math.max(lim[0], Math.min(lim[1], n / U.k))); } }
      },
      cycleUnit: () => { if (!multi) return; pref[key] = units[(ui + 1) % units.length].u; try { localStorage.setItem('medialab.units', JSON.stringify(pref)); } catch (e) {} this.setState({ numEd: null }); this.forceUpdate(); }
    };
  }
  CO(label, val, set) {
    const v = String(val || '').toLowerCase(), ring = '0 0 0 2px #0c0c0c, 0 0 0 4px #f3f1ec', pc = this.profile().colors, rest = TS.PALETTE.filter(c => pc.indexOf(c) < 0), mk = c => ({ bg: c, ring: c === v ? ring : 'none', onClick: () => set(c) });
    return { isColor: true, label, hex: /^#[0-9a-f]{6}$/.test(v) ? v : '#ffffff', ringCustom: pc.indexOf(v) < 0 && TS.PALETTE.indexOf(v) < 0 ? ring : 'none', onPick: e => { if (/^#[0-9a-f]{6}$/i.test(e.target.value)) set(e.target.value); }, hasP: pc.length > 0, psw: pc.map(mk), sw: rest.map(mk) };
  }
  profile() {
    const c = this.cat(); if (!c) return { colors: [], fonts: [] };
    if (this._pfC !== c) {
      this._pfC = c; const d = this.catBase(c), cs = [], fs = [], add = v => { if (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v)) { v = v.toLowerCase(); if (cs.indexOf(v) < 0) cs.push(v); } };
      if (d.bg.type === 'color') add(d.bg.color); else if (d.bg.type === 'gradient') { add(d.bg.c1); add(d.bg.c2); }
      d.layers.forEach(l => { add(l.color); add(l.fill); add(l.fill2); if (l.bar) add(l.barColor); add(l.tint); if (l.border > 0) add(l.borderColor); if (l.stroke > 0) add(l.strokeColor); if (l.type === 'text' && fs.indexOf(l.font) < 0) fs.push(l.font); });
      this._pf = { colors: cs.slice(0, 10), fonts: fs };
    }
    return this._pf;
  }
  gbox(ls) { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; ls.forEach(l => { x0 = Math.min(x0, l.x); y0 = Math.min(y0, l.y); x1 = Math.max(x1, l.x + l.w); y1 = Math.max(y1, l.y + l.h); }); return isFinite(x0) ? { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } : { x: 0, y: 0, w: 0, h: 0 }; }
  toggleMulti(id) {
    this.setState(s => { const m = s.multi.length > 1 ? s.multi.slice() : (s.sel ? [s.sel] : []), i = m.indexOf(id); if (i >= 0) m.splice(i, 1); else m.push(id); return { multi: m.length > 1 ? m : [], sel: m.length ? m[m.length - 1] : null, logoOpen: false }; });
  }
  moveGroup(dx, dy) { const ids = this.state.multi; if (!dx && !dy) return; this.edit(d => d.layers.forEach(l => { if ((ids.indexOf(l.id) >= 0 || (l.link && ids.indexOf(l.link) >= 0 && ids.indexOf(l.id) < 0)) && !l.lock) { l.x += dx; l.y += dy; } }), 'gmove'); }
  delGroup() { const ids = this.state.multi; this.edit(d => { d.layers = d.layers.filter(l => ids.indexOf(l.id) < 0); d.layers.forEach(x => { if (x.link && ids.indexOf(x.link) >= 0) x.link = null; }); }); this.setState({ sel: null, multi: [] }); }
  scaleGroup(k) {
    const ids = this.state.multi, b = this.gbox(this.state.doc.layers.filter(l => ids.indexOf(l.id) >= 0)), cx = b.x + b.w / 2, cy = b.y + b.h / 2, r = v => Math.round(v * 100) / 100;
    this.edit(d => d.layers.forEach(l => {
      if (ids.indexOf(l.id) < 0) return;
      const nw = l.w * k, nh = l.h * k, ncx = cx + (l.x + l.w / 2 - cx) * k, ncy = cy + (l.y + l.h / 2 - cy) * k;
      l.x = Math.round(ncx - nw / 2); l.y = Math.round(ncy - nh / 2); l.w = Math.round(nw); l.h = Math.round(nh);
      if (l.type === 'text') { l.size = Math.max(6, Math.round(l.size * k)); l.barH = Math.max(1, r(l.barH * k)); }
      if (l.type === 'image') { l.radius = r(l.radius * k); l.border = r(l.border * k); }
      if (l.type === 'shape') { l.radius = r(l.radius * k); l.stroke = r(l.stroke * k); }
    }), 'gscale');
  }
  ctrlsGroup(gl) {
    const b = this.gbox(gl);
    return [this.NT(gl.length + ' lag er valgt. Dra i ett av dem for å flytte alle. Shift-klikk for å legge til eller fjerne lag.'),
      this.H('Skaler sammen'), this.BT([['−10 %', () => this.scaleGroup(0.9)], ['−5 %', () => this.scaleGroup(0.95)], ['+5 %', () => this.scaleGroup(1.05)], ['+10 %', () => this.scaleGroup(1.1)]]),
      this.H('Plassering'), this.BT([['Midtstill vannrett', () => this.moveGroup(Math.round(960 - (b.x + b.w / 2)), 0)], ['Midtstill loddrett', () => this.moveGroup(0, Math.round(540 - (b.y + b.h / 2)))]]),
      this.BT([['Opphev gruppe', () => this.setState({ multi: [], sel: null })], ['Slett alle', () => this.delGroup(), 'd']])];
  }
  cropVals(d) {
    const S = this.state, l = S.cropId && d.layers.find(x => x.id === S.cropId), en = l && TS.getImg(l.src);
    if (!l || !en) return { cropOpen: false };
    const nw = en.img.naturalWidth, nh = en.img.naturalHeight, k = Math.min(Math.min(900, window.innerWidth - 72) / nw, (window.innerHeight * 0.62) / nh), b = S.cropBox, P = v => (v * 100) + '%';
    return {
      cropOpen: true, cropRef: this.cropRef, cropUrl: en.url, cropW: Math.round(nw * k) + 'px', cropH: Math.round(nh * k) + 'px',
      cbL: P(b.cL), cbT: P(b.cT), cbR: P(b.cR), cbB: P(b.cB), cbW: P(1 - b.cL - b.cR), cbH: P(1 - b.cT - b.cB), cropDown: this.cropDown,
      cropTrim: () => { const t = TS.alphaBox(l.src); if (t) this.setState({ cropBox: t }); else this.flash('Bildet har ingen gjennomsiktige kanter å fjerne.'); },
      cropReset: () => this.setState({ cropBox: { cL: 0, cT: 0, cR: 0, cB: 0 } }),
      cropCancel: () => this.setState({ cropId: null }),
      cropApply: () => { this.applyCropTo(l.id, b); this.setState({ cropId: null }); }
    };
  }
  mb(n) { const s = (n / 1048576).toFixed(1); return (window.MLI18N && MLI18N.lang === 'en' ? s : s.replace('.', ',')) + ' MB'; }
  async calcSize() {
    const S = this.state; if (!S.doc) return;
    const tr = !!S.expT && S.expFmt === 'png', key = S.expRes + '|' + S.expFmt + '|' + (tr ? 1 : 0), doc = S.doc; this._sk = key; this.setState({ expSize: null });
    try { const b = await TS.exportBlob(doc, S.expRes === '4k' ? 2 : 1, S.expFmt === 'jpg' ? 'image/jpeg' : 'image/png', { transparent: tr }); if (!this.alive || this._sk !== key || !b) return; this._eb = { key, b, doc }; this.setState({ expSize: b.size }); } catch (err) {}
  }
  async doBackup() {
    if (this.state.backupBusy) return; this.setState({ backupBusy: true });
    try {
      const b = await TS.backup(this.state.cats, this.state.tpls), a = document.createElement('a');
      a.href = URL.createObjectURL(b); a.download = 'thumbnail-studio-' + new Date().toISOString().slice(0, 10) + '.json';
      document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 60000);
      this.flash('Sikkerhetskopien er lastet ned.');
    } catch (err) { this.flash('Klarte ikke å lage sikkerhetskopien.'); }
    if (this.alive) this.setState({ backupBusy: false });
  }
  onRestore = async e => {
    const f = e.target.files && e.target.files[0]; e.target.value = ''; if (!f) return;
    if (!confirm('Gjenopprette fra filen? Kategoriene og malene i denne nettleseren blir erstattet.')) return;
    try {
      const r = await TS.restore(f); if (!this.alive) return;
      await Promise.all([TS.saveCats(r.cats), TS.saveTpls(r.tpls)]);
      this.setState({ cats: r.cats, tpls: r.tpls }, () => { this.gcAll(); this.queueShared(); });
      this.flash('Gjenopprettet: ' + r.cats.length + ' kategorier og ' + r.tpls.length + ' maler.');
    } catch (err) { this.flash('Filen kunne ikke leses. Velg en sikkerhetskopi fra Thumbnail Studio.'); }
  };
  SG(label, val, opts, set) { return { isSeg: true, label, opts: opts.map(o => ({ label: o[1], bg: o[0] === val ? '#f3f1ec' : 'transparent', color: o[0] === val ? '#000000' : '#b3afa6', onClick: () => set(o[0]) })) }; }
  CK(label, val, set) { return { isCheck: true, label, checked: !!val, onChange: e => set(e.target.checked) }; }
  AR(label, val, set, rows, ref, ph, ex) { ex = ex || {}; return { isArea: true, label, val: val || '', rows: rows || 2, ref: ref || null, ph: ph || '', onChange: e => set(e.target.value), hasTools: !!ex.tools, tools: ex.tools || [], onKey: ex.onKey || this.noop }; }
  SE(label, val, opts, set) { return { isSelect: true, label, val: String(val), opts, onChange: e => set(e.target.value) }; }
  NT(text) { return { isNote: true, text }; }
  NU(items) { return { isNums: true, items: items.map(i => ({ label: i[0], val: Math.round(i[1]), onChange: e => { const n = Number(e.target.value); if (isFinite(n)) i[2](Math.round(n)); } })) }; }
  BT(items) {
    return { isBtns: true, items: items.map(i => { const k = i[2], dis = !!i[3]; return { label: i[0], onClick: i[1], disabled: dis, op: dis ? 0.4 : 1, bg: k === 'p' ? '#f3f1ec' : 'transparent', color: k === 'p' ? '#000000' : k === 'd' ? '#ff8f8f' : '#f3f1ec', border: k === 'p' ? '#f3f1ec' : k === 'd' ? 'rgba(255,120,120,0.45)' : 'rgba(255,255,255,0.22)' }; }) };
  }
  IM(l, label) {
    const ai = this.state.ai, busy = !!ai && ai.id === l.id, own = !!l.src && l.src.indexOf('db:') === 0, u = TS.url(l.src);
    return {
      isImg: true, label, hasThumb: !!u, thumb: u, hasSrc: !!l.src, pickLabel: l.src ? 'Bytt bilde' : 'Velg bilde',
      onPick: () => this.pick({ mode: 'replace', id: l.id }), onClear: () => this.setL(l.id, { src: null, orig: null }),
      canAI: own && !busy && !this.state.ai, busy, aiLabel: busy ? (ai.phase === 'model' ? 'Laster ned AI-modellen … ' + ai.pct + ' %' : 'Fjerner bakgrunnen …') : '', aiW: (busy ? (ai.phase === 'model' ? ai.pct : 100) : 0) + '%',
      aiPerson: () => this.runAI(l.id, 'person'), aiObject: () => this.runAI(l.id, 'object'),
      hasOrig: !!l.orig && !busy, onOrig: () => this.setL(l.id, { src: l.orig, orig: null })
    };
  }
  weights(font) { const f = TS.FONTS.find(x => x[0] === font); return f ? f[1] : [400, 700]; }
  baseMap() {
    const c = this.cat(); if (!c || (this.state.doc && this.state.doc.lay)) return {};
    if (this._bmC !== c) { this._bmC = c; const m = {}; this.catBase(c).layers.forEach(b => { m[b.id] = b; }); this._bm = m; }
    return this._bm;
  }
  baseFor(l) {
    const m = this.baseMap(); if (m[l.id]) return m[l.id];
    const d = this.state.doc; if (!d) return null;
    const same = d.layers.filter(x => x.type === l.type && !m[x.id]), i = same.indexOf(l), bs = Object.values(m).filter(b => b.type === l.type && !d.layers.some(x => x.id === b.id));
    return i >= 0 && i < bs.length ? bs[i] : null;
  }
  movedFromBase(l) { const b = this.baseFor(l); return !!b && ['x', 'y', 'w', 'h', 'rot'].some(k => Math.round(b[k] || 0) !== Math.round(l[k] || 0)); }
  cropCtrls(l) {
    const has = ['cT', 'cB', 'cL', 'cR'].some(k => (l[k] || 0) > 0);
    return [this.H('Beskjær'), this.NT('Kutt bort deler av bildet, for eksempel alt under livet, eller tomme kanter etter at bakgrunnen er fjernet. Du kan også dobbeltklikke på bildet.'),
      this.BT([['Beskjær bildet …', () => this.openCrop(l.id), 'p'], ['Fjern tomme kanter', () => this.trim(l.id)], ['Vis hele bildet', () => this.applyCropTo(l.id, { cT: 0, cB: 0, cL: 0, cR: 0 }), '', !has]])];
  }
  trim(id) {
    const l = this.state.doc.layers.find(x => x.id === id); if (!l || !l.src) return;
    const b = TS.alphaBox(l.src);
    if (!b) { this.flash('Bildet har ingen gjennomsiktige kanter å fjerne.'); return; }
    this.applyCropTo(id, b); this.flash('Tomme kanter er fjernet.');
  }
  applyCropTo(id, n) {
    const l = this.state.doc.layers.find(x => x.id === id), en = l && TS.getImg(l.src); if (!l) return;
    n = { cL: n.cL || 0, cT: n.cT || 0, cR: n.cR || 0, cB: n.cB || 0 };
    let patch = n;
    if (en && l.fit === 'contain' && !l.rot) {
      const nw = en.img.naturalWidth, nh = en.img.naturalHeight, o = { cL: l.cL || 0, cT: l.cT || 0, cR: l.cR || 0, cB: l.cB || 0 };
      const iwO = nw * (1 - o.cL - o.cR), ihO = nh * (1 - o.cT - o.cB), sc = Math.min(l.w / iwO, l.h / ihO) * (l.zoom || 1);
      const fx = l.x + (l.w - iwO * sc) * l.px - nw * o.cL * sc, fy = l.y + (l.h - ihO * sc) * l.py - nh * o.cT * sc;
      patch = Object.assign({}, n, { x: Math.round(fx + nw * n.cL * sc), y: Math.round(fy + nh * n.cT * sc), w: Math.max(10, Math.round(nw * (1 - n.cL - n.cR) * sc)), h: Math.max(10, Math.round(nh * (1 - n.cT - n.cB) * sc)), zoom: 1 });
    }
    this.setL(id, patch, 'crop:' + id + ':' + Date.now());
  }
  openCrop(id) {
    const l = this.state.doc.layers.find(x => x.id === id); if (!l || !l.src || !TS.getImg(l.src)) return;
    this.setState({ cropId: id, cropBox: { cL: l.cL || 0, cT: l.cT || 0, cR: l.cR || 0, cB: l.cB || 0 }, sel: id, multi: [] });
  }
  cropDown = e => {
    if (e.button) return; e.preventDefault(); e.stopPropagation();
    const r = this.cropRef.current.getBoundingClientRect();
    this.cd = { h: e.target.getAttribute('data-h') || 'm', x0: e.clientX, y0: e.clientY, b0: Object.assign({}, this.state.cropBox), W: r.width, H: r.height };
    window.addEventListener('pointermove', this.cropMove); window.addEventListener('pointerup', this.cropUp); window.addEventListener('pointercancel', this.cropUp);
  };
  cropMove = e => {
    const c = this.cd; if (!c) return;
    const dx = (e.clientX - c.x0) / c.W, dy = (e.clientY - c.y0) / c.H, b0 = c.b0, b = Object.assign({}, b0), M = 0.05, cl = (v, a, z) => Math.max(a, Math.min(z, v));
    if (c.h === 'm') {
      b.cL = cl(b0.cL + dx, 0, b0.cL + b0.cR); b.cR = b0.cR - (b.cL - b0.cL);
      b.cT = cl(b0.cT + dy, 0, b0.cT + b0.cB); b.cB = b0.cB - (b.cT - b0.cT);
    } else {
      if (c.h.indexOf('l') >= 0) b.cL = cl(b0.cL + dx, 0, 1 - b0.cR - M);
      if (c.h.indexOf('r') >= 0) b.cR = cl(b0.cR - dx, 0, 1 - b0.cL - M);
      if (c.h.indexOf('t') >= 0) b.cT = cl(b0.cT + dy, 0, 1 - b0.cB - M);
      if (c.h.indexOf('b') >= 0) b.cB = cl(b0.cB - dy, 0, 1 - b0.cT - M);
    }
    this.setState({ cropBox: b });
  };
  cropUp = () => { this.cd = null; window.removeEventListener('pointermove', this.cropMove); window.removeEventListener('pointerup', this.cropUp); window.removeEventListener('pointercancel', this.cropUp); };
  resetPos(id) { const l = this.state.doc.layers.find(x => x.id === id), b = l && this.baseFor(l); if (b) { this.setL(id, { x: b.x, y: b.y, w: b.w, h: b.h, rot: b.rot || 0 }, 'reset:' + id); this.flash('Laget er flyttet tilbake til grunnoppsettet.'); } }
  common(l, glow) {
    const set = p => this.setL(l.id, p), id = l.id, d = this.state.doc, i = d.layers.findIndex(x => x.id === id);
    const out = [this.H('Plassering'), this.NU([['X', l.x, v => set({ x: v })], ['Y', l.y, v => set({ y: v })], ['B', l.w, v => set({ w: Math.max(l.type === 'shape' ? 1 : 10, v) })], ['H', l.h, v => set({ h: Math.max(l.type === 'shape' ? 1 : 10, v) })]]),
      this.SL('Rotasjon', l.rot || 0, -180, 180, 1, v => set({ rot: v }), v => v + '°'),
      this.BT([['\u21C6 Speil vannrett', () => this.flipSel('x'), (l.type === 'image' ? l.flip : l.flipX) ? 'p' : ''], ['\u21C5 Speil loddrett', () => this.flipSel('y'), l.flipY ? 'p' : '']])];
    if (!glow) out.push(this.SL('Synlighet', Math.round(l.op * 100), 0, 100, 1, v => set({ op: v / 100 }), v => v + ' %'), this.SL('Skygge', Math.round(l.shadow * 100), 0, 100, 1, v => set({ shadow: v / 100 }), v => v + ' %'));
    if (this.movedFromBase(l)) out.push(this.BT([['↺ Tilbake til grunnoppsettets plassering', () => this.resetPos(id)]]));
    out.push(this.CK('Lås (kan ikke flyttes i bildet)', l.lock, v => set({ lock: v })),
      this.BT([['Frem', () => this.moveZ(id, 1), '', i >= d.layers.length - 1], ['Bak', () => this.moveZ(id, -1), '', i <= 0], ['Dupliser', () => this.dupLayer(id)], ['Slett', () => this.delLayer(id), 'd']]));
    return out;
  }
  ctrlsFor(l) {
    const set = p => this.setL(l.id, p), C = [];
    if (l.type === 'text') {
      const ws = this.weights(l.font);
      C.push(this.AR('Tekst', this.lsBake(l), v => set({ text: v, list: '' }), 4, this.taRef, 'Skriv tekst', { tools: this.listTools(l), onKey: e => this.listKey(l, e) }),
        this.SE('Font', l.font, (() => { const pf = this.profile().fonts; return pf.map(f => ({ v: f, label: f + ' (grunnoppsett)' })).concat(TS.FONTS.filter(f => pf.indexOf(f[0]) < 0).map(f => ({ v: f[0], label: f[0] }))); })(), v => { const w2 = this.weights(v); set({ font: v, weight: w2.indexOf(l.weight) >= 0 ? l.weight : w2[Math.min(3, w2.length - 1)] }); }),
        this.SE('Tykkelse', l.weight, ws.map(w => ({ v: String(w), label: this.WN[w] || String(w) })), v => set({ weight: +v })),
        this.SL(l.fit ? 'Maks størrelse' : 'Størrelse', l.size, 8, 1000, 1, v => set({ size: v }), v => v + ' px', { key: 'ts.textSize', lim: [4, 3000], units: [{ u: 'px', k: 1 }, { u: '%', k: 100 / TS.H, d: 1, t: 'av bildehøyden' }, { u: 'pt', k: 0.75 }] }),
        ...(() => { const fs = l.fit && TS.fitSize ? TS.fitSize(l) : l.size; return fs < l.size - 0.5 ? [this.NT(this.t('Vises i') + ' ' + Math.round(fs) + ' px ' + this.t('fordi teksten må passe i boksen. Gjør boksen større eller slå av «Tilpass til boksen» for større tekst.')), this.BT([['Gjør boksen større', () => { const k = Math.min(4, l.size / Math.max(1, fs)); set({ w: Math.round(l.w * k), h: Math.round(l.h * k) }); }]])] : []; })(),
        this.CK('Tilpass til boksen', l.fit, v => set({ fit: v })),
        this.CO('Farge', l.color, v => set({ color: v })),
        this.SG('Justering', l.align, [['left', 'Venstre'], ['center', 'Midt'], ['right', 'Høyre']], v => set({ align: v })),
        this.SG('Loddrett', l.valign, [['top', 'Topp'], ['middle', 'Midt'], ['bottom', 'Bunn']], v => set({ valign: v })),
        this.SL('Linjeavstand', Math.round(l.lh * 100), 70, 180, 1, v => set({ lh: v / 100 }), v => v + ' %'),
        this.SL('Bokstavavstand', Math.round(l.ls * 100), -5, 50, 1, v => set({ ls: v / 100 })),
        this.CK('Store bokstaver', l.upper, v => set({ upper: v })),
        this.CK('Strek under', l.bar, v => set({ bar: v })));
      if (l.bar) C.push.apply(C, this.barCtrls(l, set));
    } else if (l.type === 'image') {
      C.push(this.IM(l, l.role === 'person' ? 'Person' : 'Bilde'));
      if (l.src) C.push.apply(C, this.cropCtrls(l));
      C.push(this.H('Form og tilpasning'),
        this.SG('Form', l.shape, [['rect', 'Firkant'], ['rounded', 'Avrundet'], ['ellipse', 'Sirkel']], v => set({ shape: v })));
      if (l.shape === 'rounded') C.push(this.SL('Hjørner', l.radius, 0, 400, 1, v => set({ radius: v }), v => v + ' px'));
      if (l.shape === 'ellipse' && l.w !== l.h) C.push(this.BT([['Gjør helt rund', () => { const s = Math.min(l.w, l.h); set({ w: s, h: s, x: Math.round(l.x + (l.w - s) / 2), y: Math.round(l.y + (l.h - s) / 2) }); }]]));
      C.push(this.SG('Tilpasning', l.fit, [['cover', 'Fyll formen'], ['contain', 'Vis hele']], v => set({ fit: v })),
        this.SL('Zoom', Math.round(l.zoom * 100), 50, 400, 1, v => set({ zoom: v / 100 }), v => v + ' %'),
        this.SL('Utsnitt vannrett', Math.round(l.px * 100), 0, 100, 1, v => set({ px: v / 100 }), v => v + ' %'),
        this.SL('Utsnitt loddrett', Math.round(l.py * 100), 0, 100, 1, v => set({ py: v / 100 }), v => v + ' %'),
        this.SL('Kant', l.border, 0, 40, 1, v => set({ border: v }), v => v + ' px'));
      if (l.border > 0) C.push(this.CO('Kantfarge', l.borderColor, v => set({ borderColor: v })));
      C.push(this.CK('Ensfarget (for logoer)', !!l.tint, v => set({ tint: v ? '#ffffff' : null })));
      if (l.tint) C.push(this.CO('Logofarge', l.tint, v => set({ tint: v })));
    } else if (l.type === 'shape') {
      C.push(this.SG('Form', l.kind, [['rect', 'Firkant'], ['rounded', 'Avrundet'], ['ellipse', 'Sirkel'], ['line', 'Strek']], v => {
        if (v === l.kind) return;
        if (v === 'line') set({ kind: v, h: 8, y: Math.round(l.y + l.h / 2 - 4), radius: 0 });
        else if (l.kind === 'line') { const h = Math.max(l.h, 200); set({ kind: v, h, y: Math.round(l.y + l.h / 2 - h / 2), radius: 40 }); }
        else set({ kind: v });
      }));
      if (l.kind === 'line') {
        C.push(this.CO(l.fill2 ? 'Farge 1' : 'Farge', l.fill, v => set({ fill: v })), this.CK('Gradient', !!l.fill2, v => set({ fill2: v ? '#000000' : null })));
        if (l.fill2) C.push(this.CO('Farge 2', l.fill2, v => set({ fill2: v })), this.SL('Vinkel', l.angle, 0, 360, 1, v => set({ angle: v }), v => v + '°'));
        C.push(this.SL('Tykkelse', Math.round(l.h), 1, 200, 1, v => set({ h: v, y: Math.round(l.y + (l.h - v) / 2) }), v => v + ' px', { key: 'ts.lineH', lim: [1, 1080] }),
          this.SL('Lengde', Math.round(l.w), 10, 1920, 1, v => set({ w: v, x: Math.round(l.x + (l.w - v) / 2) }), v => v + ' px', { key: 'ts.lineW', lim: [2, 4000], units: [{ u: 'px', k: 1 }, { u: '%', k: 100 / TS.W, d: 1, t: 'av bildebredden' }] }),
          this.CK('Runde ender', l.radius > 0, v => set({ radius: v ? 999 : 0 })),
          this.BT([['Vannrett', () => set({ rot: 0 })], ['Loddrett', () => set({ rot: 90 })]]));
      } else {
        if (l.kind === 'rounded') C.push(this.SL('Hjørner', l.radius, 0, 400, 1, v => set({ radius: v }), v => v + ' px'));
        C.push(this.CO(l.fill2 ? 'Farge 1' : 'Farge', l.fill, v => set({ fill: v })), this.CK('Gradient', !!l.fill2, v => set({ fill2: v ? '#000000' : null })));
        if (l.fill2) C.push(this.CO('Farge 2', l.fill2, v => set({ fill2: v })), this.SL('Vinkel', l.angle, 0, 360, 1, v => set({ angle: v }), v => v + '°'));
        C.push(this.SL('Kant', l.stroke, 0, 40, 1, v => set({ stroke: v }), v => v + ' px'));
        if (l.stroke > 0) C.push(this.CO('Kantfarge', l.strokeColor, v => set({ strokeColor: v })));
      }
    } else if (l.type === 'glow') {
      C.push(this.CO('Farge', l.color, v => set({ color: v })),
        this.SL('Styrke', Math.round(l.op * 100), 0, 100, 1, v => set({ op: v / 100 }), v => v + ' %'),
        this.SL('Mykhet', Math.round(l.soft * 100), 0, 100, 1, v => set({ soft: v / 100 }), v => v + ' %'));
    }
    return C.concat(this.common(l, l.type === 'glow'));
  }
  ctrlsMal(d) {
    const C = [], b = d.bg, v = d.vig, roles = d.layers.filter(l => l.role);
    C.push(this.NT('Bytt person, navn og tema her. Vil du endre noe annet, klikker du på det i bildet eller i laglisten.'));
    roles.filter(l => l.role === 'person').forEach(l => { C.push(this.IM(l, 'Person')); if (l.src && !this.state.narrow) C.push(this.BT([['Fjern tomme kanter', () => this.trim(l.id)], ['Beskjær …', () => this.openCrop(l.id)]])); });
    roles.filter(l => l.role === 'name').forEach(l => C.push(this.AR('Navn', l.text, t => this.setL(l.id, { text: t }), 2, null, 'Fornavn Etternavn')));
    roles.filter(l => l.role === 'theme').forEach(l => C.push(this.AR('Tema', l.text, t => this.setL(l.id, { text: t }), 2, null, 'Tema eller overskrift')));
    C.push(this.NT('Bilder i malen: ' + TS.countImgs(d) + ' av 5. Logoene teller ikke.'));
    C.push(this.H('Bakgrunn'), this.SG('Type', b.type, [['color', 'Farge'], ['gradient', 'Gradient'], ['image', 'Bilde']], t => this.setBg({ type: t })));
    if (b.type === 'color') C.push(this.CO('Farge', b.color, c => this.setBg({ color: c })));
    else if (b.type === 'gradient') {
      C.push(this.CO('Farge 1', b.c1, c => this.setBg({ c1: c })), this.CO('Farge 2', b.c2, c => this.setBg({ c2: c })), this.CK('Sirkulær', b.radial, x => this.setBg({ radial: x })));
      if (!b.radial) C.push(this.SL('Vinkel', b.angle, 0, 360, 1, x => this.setBg({ angle: x }), x => x + '°'));
    } else {
      const u = TS.url(b.src);
      C.push({ isImg: true, label: 'Bakgrunnsbilde', hasThumb: !!u, thumb: u, hasSrc: !!b.src, pickLabel: b.src ? 'Bytt bilde' : 'Velg bilde', onPick: () => this.pick({ mode: 'bg' }), onClear: () => this.setBg({ src: null }) },
        this.SL('Zoom', Math.round(b.zoom * 100), 100, 300, 1, x => this.setBg({ zoom: x / 100 }), x => x + ' %'),
        this.SL('Utsnitt vannrett', Math.round(b.px * 100), 0, 100, 1, x => this.setBg({ px: x / 100 }), x => x + ' %'),
        this.SL('Utsnitt loddrett', Math.round(b.py * 100), 0, 100, 1, x => this.setBg({ py: x / 100 }), x => x + ' %'),
        this.SL('Uskarphet', b.blur, 0, 40, 1, x => this.setBg({ blur: x })),
        this.SL('Mørklegg', Math.round(b.dim * 100), 0, 90, 1, x => this.setBg({ dim: x / 100 }), x => x + ' %'));
    }
    C.push(this.H('Vignett'), this.CK('Vignett', v.on, x => this.setVig({ on: x })));
    if (v.on) C.push(this.SL('Styrke', Math.round(v.amt * 100), 0, 100, 1, x => this.setVig({ amt: x / 100 }), x => x + ' %'),
      this.SL('Størrelse på lyst felt', Math.round(v.size * 100), 0, 100, 1, x => this.setVig({ size: x / 100 }), x => x + ' %'),
      this.CO('Farge', v.color, c => this.setVig({ color: c })), this.CK('Over alle lag', v.top, x => this.setVig({ top: x })));
    return C;
  }
  t(s) { return window.MLI18N ? MLI18N.t(s) : s; }
  lname(l) {
    const auto = this.autoName(l);
    if (!l.name) return auto;
    return l.type === 'text' && String(l.text || '').trim() && auto.toLowerCase() !== l.name.toLowerCase() ? l.name + ' – ' + auto : l.name;
  }
  autoName(l) {
    if (l.type === 'text') return (String(l.text || '').split('\n').join(' ').trim().slice(0, 28)) || this.t('Tekst');
    if (l.type === 'image') { if (l.role === 'person') return this.t('Person'); const a = l.src && l.src.indexOf('asset:') === 0 && TS.ASSETS[l.src.slice(6)]; return this.t(a ? a.label : 'Bilde'); }
    return this.t(l.type === 'shape' ? (l.kind === 'line' ? 'Strek' : 'Form') : 'Lys');
  }
  renderVals() {
    const S = this.state, ready = S.ready && !!window.TS, view = ready ? S.view : '', c = ready ? this.cat() : null, on = (a, b) => ({ bg: a === b ? '#f3f1ec' : 'transparent', color: a === b ? '#000000' : '#b3afa6' });
    const v = {
      loading: !ready, isHome: view === 'home', isCat: view === 'cat', isEdit: view === 'edit',
      hasMsg: !!S.msg, msg: S.msg, stop: e => e.stopPropagation(), fileRef: this.fileRef, onFile: this.onFile,
      editCats: S.editCats, notEditCats: !S.editCats, toggleEditCats: () => this.setState({ editCats: !S.editCats }),
      editCatsLabel: S.editCats ? 'Ferdig' : 'Rediger kategorier', editCatsBg: S.editCats ? '#f3f1ec' : 'transparent', editCatsColor: S.editCats ? '#000000' : '#f3f1ec', editCatsBorder: S.editCats ? '#f3f1ec' : 'rgba(255,255,255,0.22)',
      doBackup: () => this.doBackup(), backupLabel: S.backupBusy ? 'Lager fil …' : 'Last ned sikkerhetskopi', restoreRef: this.restoreRef, onRestore: this.onRestore,
      pickRestore: () => { const f = this.restoreRef.current; if (f) { f.value = ''; f.click(); } },
      addCat: this.addCat, goHome: () => this.setState({ view: 'home' }), lcOpen: false, lcSlots: [], lcPresets: [], ctxOpen: false, ctxItems: [], ctxL: '0px', ctxT: '0px', closeCtx: this.closeCtx, stopCtx: this.noop, newOpen: false, newApply: false, newNotApply: true, newTop: [], newStd: [], closeNew: this.closeNew, openLayouts: this.openLayouts,
      baseOpts: ['sunday', 'kbs', 'youth', 'blank'].map(k => ({ v: k, label: ready ? TS.BASE_LABELS[k] : k })),
      catName: c ? c.name : '', catDesc: c ? c.desc : ''
    };
    if (!ready) return v;
    v.catCards = S.cats.map(k => ({
      name: k.name, desc: k.desc, base: k.base, count: this.tplsOf(k.id).length + ' av 5 maler',
      open: () => this.openCat(k.id), onName: e => this.setCat(k.id, { name: e.target.value.slice(0, 40) }), onDesc: e => this.setCat(k.id, { desc: e.target.value.slice(0, 200) }),
      onBase: e => { const val = e.target.value; if (k.baseDoc && !confirm('Bytte grunnoppsett? Ditt lagrede grunnoppsett for kategorien blir erstattet.')) { this.forceUpdate(); return; } this.setCat(k.id, { base: val, baseDoc: null }); }, onDel: () => this.delCat(k)
    }));
    if (view === 'cat' && c) {
      const list = this.tplsOf(c.id), full = list.length >= TS.MAX_TPL;
      Object.assign(v, {
        catCount: list.length + ' av 5 maler', catFull: full, newSub: full ? 'Full (5 av 5). Slett en mal først.' : 'Velg grunnoppsett, standard eller blank', newFromBase: this.newFromBase, ...this.newVals(c), editBase: this.editBase, resetBase: this.resetBase, hasCustomBase: !!c.baseDoc,
        baseSub: c.baseDoc ? 'Nye maler starter fra ditt lagrede oppsett.' : 'Farger, bakgrunn, fonter og plassering som alle nye maler starter med.',
        tplCards: list.map(t => ({ name: t.name, thumb: t.thumb || '', date: 'Endret ' + new Date(t.updated).toLocaleDateString(window.MLI18N && MLI18N.lang === 'en' ? 'en-GB' : 'nb-NO', { day: 'numeric', month: 'short', year: 'numeric' }), open: () => this.enterEdit(TS.clone(t.doc), t.id, t.name), dup: () => this.dupTpl(t), dupOp: full ? 0.4 : 1, dupDis: full, del: () => this.delTpl(t) }))
      });
    }
    if (view === 'edit' && S.doc) {
      const d = S.doc, multi = S.multi || [], isGroup = multi.length > 1, gl = isGroup ? d.layers.filter(l => multi.indexOf(l.id) >= 0) : [], gb = isGroup ? this.gbox(gl) : null, sl = isGroup || S.narrow ? null : (d.layers.find(l => l.id === S.sel) || null), P = (v, t) => (v / t * 100) + '%', list = c ? this.tplsOf(c.id) : [], full = list.length >= TS.MAX_TPL, TAG = { text: 'Tekst', image: 'Bilde', shape: 'Form', glow: 'Lys' };
      Object.assign(v, this.newVals(c), this.ctxVals(), this.viewVals(), this.lcVals(), {
        onCtx: this.onCtx, zoomRef: this.zoomRef, zoomW: Math.round(S.zoom * 100) + '%', zoomOv: S.zoom > 1 ? 'auto' : 'visible', zoomLabel: Math.round(S.zoom * 100) + ' %', zoomIn: this.zoomIn, zoomOut: this.zoomOut, zoomReset: this.zoomReset, zoomInDis: S.zoom >= 4, zoomOutDis: S.zoom <= 1, zoomResetDis: S.zoom === 1, zoomInOp: S.zoom >= 4 ? 0.35 : 1, zoomOutOp: S.zoom <= 1 ? 0.35 : 1, zoomResetOp: S.zoom === 1 ? 0.45 : 1,
        tplName: S.tplName, onTplName: e => this.setState({ tplName: e.target.value.slice(0, 60), dirty: true }), dirty: S.dirty, leaveEdit: this.leaveEdit,
        toggleAuto: this.toggleAuto, autoAria: S.autoSave ? 'true' : 'false', autoTrack: S.autoSave ? '#e9e7e2' : '#2b2b2b', autoKnob: S.autoSave ? '#000' : '#8a867e', autoKnobX: S.autoSave ? '16px' : '2px',
        autoTextColor: S.autoSave ? '#f3f1ec' : '#9d998f', hasAutoAt: !!S.autoSave && !!S.autoAt, autoAtLabel: S.autoAt ? this.t('lagret') + ' ' + S.autoAt : '',
        undo: this.undo, redo: this.redo, noUndo: !S.hist.length, noRedo: !S.fut.length, undoOp: S.hist.length ? 1 : 0.35, redoOp: S.fut.length ? 1 : 0.35,
        baseEdit: !!S.baseEdit, notBaseEdit: !S.baseEdit, saveLabel: S.baseEdit ? 'Lagre grunnoppsett' : 'Lagre mal',
        openSave: () => S.baseEdit ? this.saveBase() : this.setState({ save: true }), closeSave: () => this.setState({ save: false }), save: S.save,
        openExp: () => this.setState({ exp: true, sel: null, multi: [] }, () => this.calcSize()), closeExp: () => { if (!S.expBusy) this.setState({ exp: false }); }, exp: S.exp, copyExp: () => this.copyExp(), sendExp: () => this.sendExp(), doExport: () => this.doExport(),
        canvasRef: this.canvasRef, ovRef: this.ovRef, onDown: this.onDown, onHandle: this.onHandle, onDbl: this.onDbl, onDragOver: this.onDragOver, onDrop: this.onDrop,
        isGroup, showDone: !!sl || isGroup, narrow: !!S.narrow, notNarrow: !S.narrow,
        gbL: gb ? P(gb.x, TS.W) : '0%', gbT: gb ? P(gb.y, TS.H) : '0%', gbW: gb ? P(gb.w, TS.W) : '0%', gbH: gb ? P(gb.h, TS.H) : '0%',
        groupBoxes: gl.map(l => ({ l: P(l.x, TS.W), t: P(l.y, TS.H), w: P(l.w, TS.W), h: P(l.h, TS.H), r: (l.rot || 0) + 'deg' })),
        ...this.cropVals(d),
        guideV: (S.gx || []).map(v => ({ pos: (v / TS.W * 100) + '%' })), guideH: (S.gy || []).map(v => ({ pos: (v / TS.H * 100) + '%' })), busyImg: S.busyImg, hasSel: !!sl, selMovable: !!sl && !sl.lock,
        selL: sl ? (sl.x / TS.W * 100) + '%' : '0%', selT: sl ? (sl.y / TS.H * 100) + '%' : '0%', selW: sl ? (sl.w / TS.W * 100) + '%' : '0%', selH: sl ? (sl.h / TS.H * 100) + '%' : '0%', selR: (sl ? sl.rot || 0 : 0) + 'deg',
        selBg: () => this.setState({ sel: null, multi: [], barSel: null }), bgRowBg: (sl || isGroup) ? 'transparent' : 'rgba(255,255,255,0.12)', bgRowBorder: (sl || isGroup) ? 'transparent' : 'rgba(255,255,255,0.4)',
        addBtns: [
          { k: 'text', label: 'Tekst', onClick: () => this.addText() },
          { k: 'image', label: 'Bilde', onClick: () => this.pick({ mode: 'add' }) },
          { k: 'felles', label: 'Fellesmappe', onClick: () => this.pickFelles({ mode: 'add' }) },
          { k: 'shared', label: 'Delt mappe', onClick: () => this.pickShared() },
          { k: 'shape', label: 'Form', onClick: () => this.setState({ shapeOpen: !S.shapeOpen, logoOpen: false, libOpen: false }) },
          { k: 'line', label: 'Strek', onClick: () => this.addShape('line') },
          { k: 'glow', label: 'Lys', onClick: () => this.addLayer(TS.L('glow', { color: '#f5b800' })) },
          { k: 'logo', label: 'Logo', onClick: () => this.setState({ logoOpen: !S.logoOpen, shapeOpen: false, libOpen: false }) },
          { k: 'lib', label: 'Flere elementer', onClick: () => this.setState({ libOpen: !S.libOpen, logoOpen: false, shapeOpen: false }) }
        ].map(b => Object.assign({}, b, { onClick: () => { this._pendLink = null; b.onClick(); }, onDragStart: e => this.dndStart({ add: b.k }, e), onDragEnd: this.dndEnd })),
        logoOpen: S.logoOpen, shapeOpen: S.shapeOpen, libOpen: !!S.libOpen,
        libGroups: S.libOpen ? this.libDefs().map(g => ({ title: g.title, items: g.items.map(it => ({ label: it[1], onClick: () => this.addPreset(it) })) })) : [],
        ...(() => {
          const ac = this.addCol().toLowerCase(), ring = '0 0 0 2px #0c0c0c, 0 0 0 4px #f3f1ec', pc = this.profile().colors.map(x => x.toLowerCase());
          const sw = pc.concat(['#ffffff', '#000000'].concat(TS.PALETTE.map(x => x.toLowerCase())).filter(x => pc.indexOf(x) < 0)).filter((x, i, a) => a.indexOf(x) === i).slice(0, 12);
          return {
            shapeOpts: [['rect', 'Firkant', '16px', '12px', '2px'], ['rounded', 'Avrundet', '16px', '12px', '4px'], ['ellipse', 'Sirkel', '14px', '14px', '999px'], ['line', 'Strek', '18px', '3px', '1px']]
              .map(o => ({ label: o[1], iw: o[2], ih: o[3], ir: o[4], color: ac, onClick: () => this.addShape(o[0]) })),
            addSw: sw.map(c => ({ bg: c, ring: c === ac ? ring : 'none', onClick: () => this.setState({ addColor: c }) })),
            addHex: /^#[0-9a-f]{6}$/.test(ac) ? ac : '#ffffff', addRingCustom: sw.indexOf(ac) < 0 ? ring : 'none',
            onAddPick: e => { const v = e.target.value; if (/^#[0-9a-f]{6}$/i.test(v)) this.setState({ addColor: v.toLowerCase() }); }
          };
        })(),
        logoOpts: [{ label: 'Fra Fellesmappe …', onClick: () => this.pickFelles({ mode: 'add', logo: true }) }]
          .concat([{ label: 'Last opp egen logo …', onClick: () => { this.setState({ logoOpen: false }); this.pick({ mode: 'add', logo: true }); } }]),
        layerRows: [].concat.apply([], this.rowOrder(d).map(([l, isKid]) => {
          const act = l.id === S.sel || multi.indexOf(l.id) >= 0, logo = l.type === 'image' && l.src && l.src.indexOf('asset:') === 0;
          const row = {
            indent: isKid ? '18px' : '0px', isLinked: isKid, onUnlink: e => { e.stopPropagation(); this.unlink(l.id); },
            onDragStart: e => this.dndStart({ id: l.id }, e), onDragEnd: this.dndEnd,
            onDragOver: e => { const g = this._dnd; if (!g || g.id === l.id) return; e.preventDefault(); try { e.dataTransfer.dropEffect = 'move'; } catch (x) {} if (this.state.dropOn !== l.id) this.setState({ dropOn: l.id }); },
            onDragLeave: e => { if (e.currentTarget.contains(e.relatedTarget)) return; if (this.state.dropOn === l.id) this.setState({ dropOn: null }); },
            onDrop: e => { e.preventDefault(); e.stopPropagation(); const g = this._dnd; this._dnd = null; this.setState({ dropOn: null }); if (!g) return; if (g.add) this.addLinked(g.add, l.id); else this.linkTo(g.id, l.id); },
            isMain: true, isChild: false, label: this.lname(l), nameV: l.name || this.autoName(l), onRename: v => this.setL(l.id, { name: v === this.autoName(l) ? '' : v }), tag: logo ? 'Logo' : l.type === 'shape' && l.kind === 'line' ? 'Strek' : TAG[l.type], bg: act ? 'rgba(255,255,255,0.12)' : 'transparent', border: act ? 'rgba(255,255,255,0.4)' : 'transparent', op: l.hidden ? 0.45 : 1,
            onClick: e => { if (e.shiftKey) this.toggleMulti(l.id); else this.setState({ sel: l.id, multi: [], barSel: null }); },
            hasBase: !!this.baseFor(l), resetDis: !this.movedFromBase(l), resetColor: this.movedFromBase(l) ? '#f5b800' : '#5a5750', resetTitle: this.movedFromBase(l) ? 'Tilbake til grunnoppsettets plassering' : 'Står på grunnoppsettets plassering', onReset: e => { e.stopPropagation(); this.resetPos(l.id); },
            eyeTitle: l.hidden ? 'Vis laget' : 'Skjul laget', eyeColor: l.hidden ? '#5a5750' : '#b3afa6', onEye: e => { e.stopPropagation(); this.setL(l.id, { hidden: !l.hidden }); },
            onDel: e => { e.stopPropagation(); this.delLayer(l.id); },
            lockTitle: l.lock ? 'Lås opp' : 'Lås', lockColor: l.lock ? '#f3f1ec' : '#5a5750', onLock: e => { e.stopPropagation(); this.setL(l.id, { lock: !l.lock }); }
          };
          const actBar = l.id === S.sel && S.barSel === l.id, actMain = act && !actBar;
          row.bg = actMain ? 'rgba(255,255,255,0.12)' : 'transparent'; row.border = actMain ? 'rgba(255,255,255,0.4)' : 'transparent';
          if (S.dropOn === l.id) { row.bg = 'rgba(77,163,255,0.16)'; row.border = '#4da3ff'; }
          if (!(l.type === 'text' && l.bar)) return [row];
          return [row, { isChild: true, isMain: false, swatch: l.barColor, op: l.hidden ? 0.45 : 1, bg: actBar ? 'rgba(255,255,255,0.12)' : 'transparent', border: actBar ? 'rgba(255,255,255,0.4)' : 'transparent',
            onClick: () => this.setState({ sel: l.id, multi: [], barSel: l.id }), onDel: e => { e.stopPropagation(); this.setL(l.id, { bar: false }); if (S.barSel === l.id) this.setState({ barSel: null }); } }];
        })),
        panelTitle: isGroup ? 'Gruppe' : sl && S.barSel === sl.id && sl.bar ? 'Understrek' : sl ? (sl.type === 'image' && sl.src && sl.src.indexOf('asset:') === 0 ? 'Logo' : sl.type === 'shape' && sl.kind === 'line' ? 'Strek' : TAG[sl.type]) : 'Mal',
        ctrls: isGroup ? this.ctrlsGroup(gl) : sl ? (S.barSel === sl.id && sl.bar ? this.ctrlsBar(sl) : this.linkNote(sl).concat(this.ctrlsFor(sl))) : this.ctrlsMal(d),
        resOpts: [['1080', '1080p · 1920 × 1080'], ['4k', '4K · 3840 × 2160']].map(o => Object.assign({ label: o[1], onClick: () => this.setState({ expRes: o[0] }, () => this.calcSize()) }, on(S.expRes, o[0]))),
        fmtOpts: [['png', 'PNG'], ['jpg', 'JPG']].map(o => Object.assign({ label: o[1], onClick: () => this.setState({ expFmt: o[0], expT: o[0] === 'png' && !!S.expT }, () => this.calcSize()) }, on(S.expFmt, o[0]))),
        isPng: S.expFmt === 'png', expT: !!S.expT, onExpT: e => this.setState({ expT: e.target.checked }, () => this.calcSize()),
        sizeText: S.expSize == null ? 'Beregner filstørrelse …' : 'Filstørrelse: ' + this.mb(S.expSize),
        tooBig: S.expSize != null && S.expSize > 2 * 1024 * 1024, hasFix: !(S.expFmt === 'jpg' && S.expRes === '1080'), fixLabel: S.expFmt === 'png' ? 'Bytt til JPG' : 'Bytt til 1080p',
        fixBig: () => S.expFmt === 'png' ? this.setState({ expFmt: 'jpg', expT: false }, () => this.calcSize()) : this.setState({ expRes: '1080' }, () => this.calcSize()),
        expBusy: S.expBusy, expOp: S.expBusy ? 0.5 : 1, expBtn: S.expBusy ? 'Lager bildet …' : S.expSize != null ? this.t('Last ned') + ' · ' + this.mb(S.expSize) : 'Last ned',
        saveNote: S.tplId ? 'Lagre endringene i denne malen, eller lagre som en ny mal. ' + list.length + ' av 5 maler brukt.' : list.length + ' av 5 maler brukt i ' + (c ? c.name : '') + '.',
        saveBtns: (S.tplId ? [['Lagre endringer', () => this.doSave('over'), 'p', false], ['Lagre som ny', () => this.doSave('new'), '', full]] : [['Lagre som ny mal', () => this.doSave('new'), 'p', full]])
          .map(i => ({ label: i[0], onClick: i[1], disabled: i[3], op: i[3] ? 0.4 : 1, bg: i[2] === 'p' ? '#f3f1ec' : 'transparent', color: i[2] === 'p' ? '#000000' : '#f3f1ec', border: i[2] === 'p' ? '#f3f1ec' : 'rgba(255,255,255,0.3)' })),
        showOver: full && !S.tplId, overList: list.map(t => ({ label: this.t('Overskriv') + ' «' + t.name + '»', onClick: () => this.doSave(t.id) }))
      });
    }
    return v;
  }
}

export default Component;
