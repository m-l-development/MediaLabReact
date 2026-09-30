/* Konvertert fra den gamle dc-siden admin.dc.html. Dette er nå kilden – rediger direkte. */
import React from 'react';
import { DCLogic } from '../../shared/dc.jsx';
const FOLD = [['mockups', 'Mockups', 'img'], ['faste', 'Faste bilder', 'img'], ['logoer', 'Logoer', 'img'], ['bakgrunner', 'Bakgrunner og maler', 'img'], ['lyd', 'Lydbibliotek', 'audio']];
const ROLE = { dev: 'Utvikler', admin: 'Admin', user: 'Bruker' }, ROLEBG = { dev: '#f5b82c', admin: '#8fd3a8', user: '#c9c5bc' };
const LOGCOL = { client: '#ff8f7d', server: '#ff5a36', audit: '#8fb4ff' }, LOGL = { client: 'Nettleser', server: 'Server', audit: 'Handling' };
const T = s => window.MLI18N && window.MLI18N.t ? window.MLI18N.t(s) : s;
const fmtSize = n => n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
const fmtDate = t => { if (!t) return '–'; const d = new Date(t); return isNaN(d) ? '–' : d.toLocaleString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); };
const chip = (on) => ({ bg: on ? '#e9e7e2' : '#121212', fg: on ? '#000000' : '#f3f1ec', border: on ? '#e9e7e2' : '#2b2b2b' });

class Component extends DCLogic {
  state = { phase: 'load', cfg: null, needCode: false, me: null, tab: 'files', scope: '', folder: 'mockups', cloud: [], builtin: [], hidden: [], canWrite: false, users: [], orgs: [], logs: [], logTotal: 0, logType: '', sys: null, busy: false, err: '', toast: '', dragOver: false,
    fName: '', fPw: '', fPw2: '', fCode: '', uName: '', uPw: '', uRole: 'user', uOrg: '', oName: '', aOld: '', aNew: '' };
  fileRef = React.createRef(); bi = {};
  componentDidMount() { this.alive = true; this.boot(); }
  componentWillUnmount() { this.alive = false; clearTimeout(this._tt); }
  api(a, o) { return window.MLCloud.api(a, o); }
  flash(t) { this.setState({ toast: T(t) }); clearTimeout(this._tt); this._tt = setTimeout(() => this.alive && this.setState({ toast: '' }), 3000); }
  fail(e) { if (e && e.status === 401) { this.setState({ phase: 'login', me: null }); } this.flash((e && e.message) || 'Noe gikk galt.'); }

  boot = async () => {
    for (let i = 0; i < 100 && !window.MLCloud; i++) await new Promise(r => setTimeout(r, 40));
    this.setState({ phase: 'load', err: '' });
    try { const d = await this.api('status'); if (d.setup) this.setState({ phase: 'setup', needCode: !!d.needCode }); else if (d.me) this.enter(d.me); else this.setState({ phase: 'login' }); }
    catch (e) { if (e.status === 503 && e.data && e.data.error === 'config') this.setState({ phase: 'config', cfg: e.data.missing || [] }); else this.setState({ phase: 'offline' }); }
  };
  enter(me) {
    const scope = me.role === 'dev' ? 'global' : me.org ? 'org/' + me.org : '';
    this.setState({ phase: 'panel', me, fPw: '', fPw2: '', fCode: '', tab: me.role === 'user' ? 'acct' : 'files', scope, uOrg: me.org || '' }, () => { if (me.role !== 'user') { this.loadFiles(); this.loadOrgs(); } });
  }
  submitAuth = async e => {
    e.preventDefault(); const S = this.state; if (S.busy) return;
    if (S.phase === 'setup' && S.fPw !== S.fPw2) { this.setState({ err: T('Passordene er ikke like.') }); return; }
    this.setState({ busy: true, err: '' });
    try { const d = await this.api(S.phase === 'setup' ? 'setup' : 'login', { method: 'POST', body: { name: S.fName, pw: S.fPw, code: S.fCode } }); this.enter(d.me); }
    catch (er) { this.setState({ err: T(er.offline ? 'Serveren svarer ikke.' : er.message) }); }
    finally { this.setState({ busy: false }); }
  };
  logout = async () => { try { await this.api('logout', { method: 'POST' }); } catch (e) {} this.setState({ phase: 'login', me: null, fPw: '' }); };

  async loadBuiltin(folder) {
    if (this.bi[folder]) return this.bi[folder];
    try { const r = await fetch('images/' + folder + '/index.json', { cache: 'no-cache' }); if (!r.ok) throw 0; const j = await r.json(); return (this.bi[folder] = (j.files || j).filter(f => typeof f === 'string' && /\.(jpe?g|png|webp|gif)$/i.test(f)).map(f => ({ src: f.indexOf('/') >= 0 ? f : 'images/' + folder + '/' + f, key: f.split('/').pop() }))); }
    catch (e) { return (this.bi[folder] = []); }
  }
  loadFiles = async () => {
    const S = this.state; if (!S.scope) return;
    try { const [d, b] = await Promise.all([this.api('files', { q: { folder: S.folder, scope: S.scope } }), this.loadBuiltin(S.folder)]); if (!this.alive) return; this.setState({ cloud: d.files || [], hidden: d.hidden || [], canWrite: !!d.canWrite, builtin: b }); }
    catch (e) { this.fail(e); }
  };
  loadUsers = async () => { try { const d = await this.api('users'); this.setState({ users: d.users || [] }); } catch (e) { this.fail(e); } };
  loadOrgs = async () => { try { const d = await this.api('orgs'); this.setState({ orgs: d.orgs || [] }); } catch (e) { this.fail(e); } };
  loadLogs = async () => { try { const d = await this.api('logs', { q: { type: this.state.logType || null } }); this.setState({ logs: d.logs || [], logTotal: d.total || 0 }); } catch (e) { this.fail(e); } };
  loadSys = async () => { try { const d = await this.api('sys'); this.setState({ sys: d }); } catch (e) { this.fail(e); } };
  setTab(t) { this.setState({ tab: t }); if (t === 'files') this.loadFiles(); if (t === 'users') { this.loadUsers(); this.loadOrgs(); } if (t === 'orgs') this.loadOrgs(); if (t === 'logs') this.loadLogs(); if (t === 'sys') this.loadSys(); }

  async upload(list) {
    const S = this.state, kind = (FOLD.find(f => f[0] === S.folder) || [])[2]; if (!S.canWrite) { this.flash('Du har ikke tilgang til å endre denne mappen.'); return; }
    const files = [...list].filter(f => kind === 'audio' ? /^audio\//.test(f.type) : /^image\/(png|jpeg|webp|gif)$/.test(f.type));
    if (!files.length) { this.flash(kind === 'audio' ? 'Bruk MP3, WAV, M4A eller OGG.' : 'Bruk PNG, JPG, WebP eller GIF.'); return; }
    this.setState({ busy: true }); let ok = 0, last = '';
    for (const f of files) {
      if (f.size > 4.4 * 1048576) { last = 'Filen er for stor (maks 4,4 MB).'; continue; }
      try { await this.api('upload', { method: 'POST', raw: f, q: { scope: S.scope, folder: S.folder, name: f.name } }); ok++; } catch (e) { last = e.message; }
    }
    this.setState({ busy: false }); await this.loadFiles();
    this.flash(ok ? (ok === 1 ? 'Filen er lastet opp.' : ok + ' ' + T('filer er lastet opp.')) : last || 'Opplastingen feilet.');
  }
  onFile = e => { const f = e.target.files; if (f && f.length) this.upload(f); e.target.value = ''; };
  onDragOver = e => { if (![...(e.dataTransfer.types || [])].includes('Files')) return; e.preventDefault(); if (!this.state.dragOver) this.setState({ dragOver: true }); };
  onDragLeave = e => { if (e.currentTarget.contains(e.relatedTarget)) return; this.setState({ dragOver: false }); };
  onDrop = e => { e.preventDefault(); this.setState({ dragOver: false }); if (e.dataTransfer.files.length) this.upload(e.dataTransfer.files); };
  async delFile(f) { if (!window.confirm(T('Slette filen for godt?') + '\n' + f.name)) return; try { await this.api('delfile', { method: 'POST', body: { path: f.path } }); this.flash('Filen er slettet.'); this.loadFiles(); } catch (e) { this.fail(e); } }
  async toggleHide(key, hide) { try { const d = await this.api('hide', { method: 'POST', body: { scope: this.state.scope, folder: this.state.folder, key, hide } }); this.setState({ hidden: d.hidden || [] }); } catch (e) { this.fail(e); } }

  addUser = async e => {
    e.preventDefault(); const S = this.state; this.setState({ busy: true });
    try { await this.api('adduser', { method: 'POST', body: { name: S.uName, pw: S.uPw, role: S.uRole, org: S.uOrg } }); this.setState({ uName: '', uPw: '' }); this.flash('Brukeren er lagt til.'); this.loadUsers(); this.loadOrgs(); }
    catch (er) { this.fail(er); } finally { this.setState({ busy: false }); }
  };
  async resetPw(u) { const pw = window.prompt(T('Nytt passord for') + ' ' + u.name + ' ' + T('(minst 10 tegn)')); if (!pw) return; try { await this.api('resetpw', { method: 'POST', body: { id: u.id, pw } }); this.flash('Passordet er endret. Brukeren må logge inn på nytt.'); } catch (e) { this.fail(e); } }
  async delUser(u) { if (!window.confirm(T('Slette brukeren?') + '\n' + u.name)) return; try { await this.api('deluser', { method: 'POST', body: { id: u.id } }); this.flash('Brukeren er slettet.'); this.loadUsers(); } catch (e) { this.fail(e); } }
  async setRole(u, role) { try { await this.api('setrole', { method: 'POST', body: { id: u.id, role } }); this.flash('Rollen er endret.'); this.loadUsers(); } catch (e) { this.fail(e); this.loadUsers(); } }
  addOrg = async e => { e.preventDefault(); try { await this.api('addorg', { method: 'POST', body: { name: this.state.oName } }); this.setState({ oName: '' }); this.flash('Menigheten er lagt til.'); this.loadOrgs(); } catch (er) { this.fail(er); } };
  async renameOrg(o) { const n = window.prompt(T('Nytt navn'), o.name); if (!n || n === o.name) return; try { await this.api('renameorg', { method: 'POST', body: { id: o.id, name: n } }); this.loadOrgs(); } catch (e) { this.fail(e); } }
  async delOrg(o) {
    const w = T('Dette sletter menigheten, alle brukerne og alle filene dens. Skriv navnet for å bekrefte:'); if (window.prompt(w + '\n' + o.name) !== o.name) return;
    try { const d = await this.api('delorg', { method: 'POST', body: { id: o.id } }); this.flash(T('Menigheten er slettet.') + ' (' + (d.files || 0) + ')'); this.loadOrgs(); if (this.state.scope === 'org/' + o.id) this.setState({ scope: 'global' }); } catch (e) { this.fail(e); }
  }
  clearLogs = async () => { if (!window.confirm(T('Tømme hele loggen?'))) return; try { await this.api('clearlogs', { method: 'POST' }); this.loadLogs(); } catch (e) { this.fail(e); } };
  changePw = async e => {
    e.preventDefault(); const S = this.state; this.setState({ busy: true });
    try { await this.api('password', { method: 'POST', body: { old: S.aOld, pw: S.aNew } }); this.setState({ aOld: '', aNew: '' }); this.flash('Passordet er endret.'); } catch (er) { this.fail(er); } finally { this.setState({ busy: false }); }
  };
  inp(k) { return this['_i' + k] || (this['_i' + k] = e => this.setState({ [k]: e.target.value })); }

  renderVals() {
    const S = this.state, me = S.me, dev = !!me && me.role === 'dev', deploy = /^[a-z0-9-]+\.dc\.html$/.test(decodeURIComponent(location.pathname.split('/').pop() || ''));
    const AUTH = { load: ['Kobler til …', 'Et øyeblikk.'], offline: ['Ikke tilgjengelig her', 'Admin krever serveren på den publiserte siden (Vercel). Åpne Media Lab via nettadressen, ikke som lokal fil.'],
      config: ['Serveren mangler oppsett', 'Koble en privat Blob-butikk til prosjektet i Vercel og legg inn miljøvariabelen AUTH_SECRET (minst 32 tilfeldige tegn). Deploy på nytt etterpå.'],
      setup: ['Opprett utviklerkonto', 'Ingen kontoer finnes ennå. Den første kontoen blir utvikler og får tilgang til alt.'], login: ['Logg inn', 'For administratorer og utviklere.'] }[S.phase] || ['', ''];
    const tabs = !me ? [] : (me.role === 'user' ? [['acct', 'Min konto']] : [['files', 'Filer'], ['users', 'Brukere']].concat(dev ? [['orgs', 'Menigheter'], ['logs', 'Logg'], ['sys', 'System']] : []).concat([['acct', 'Min konto']]));
    const fo = FOLD.find(f => f[0] === S.folder) || FOLD[0], hid = new Set(S.hidden), orgName = id => { const o = S.orgs.find(x => x.id === id); return o ? o.name : ''; };
    const roleChoices = (dev ? ['user', 'admin', 'dev'] : ['user', 'admin']).map(v => ({ v, l: ROLE[v] }));
    const st = S.sys;
    return {
      homeHref: deploy ? 'media-lab.dc.html' : 'media-lab.dc.html',
      isAuth: S.phase !== 'panel', isPanel: S.phase === 'panel', authTitle: AUTH[0], authText: AUTH[1],
      showForm: S.phase === 'setup' || S.phase === 'login', isSetup: S.phase === 'setup', needCode: S.needCode, showRetry: S.phase === 'offline' || S.phase === 'config', boot: this.boot,
      fName: S.fName, fPw: S.fPw, fPw2: S.fPw2, fCode: S.fCode, onFName: this.inp('fName'), onFPw: this.inp('fPw'), onFPw2: this.inp('fPw2'), onFCode: this.inp('fCode'),
      pwAuto: S.phase === 'setup' ? 'new-password' : 'current-password', submitAuth: this.submitAuth, submitLabel: S.busy ? 'Vent …' : S.phase === 'setup' ? 'Opprett konto' : 'Logg inn',
      hasErr: !!S.err, err: S.err, busy: S.busy, busyOp: S.busy ? 0.5 : 1,
      meName: me ? me.name : '', meRole: me ? ROLE[me.role] : '', roleBg: me ? ROLEBG[me.role] : '#c9c5bc', hasOrg: !!(me && me.orgName), meOrg: me ? me.orgName || '' : '', logout: this.logout, isDev: dev,
      tabs: tabs.map(([k, l]) => ({ l, ...chip(S.tab === k), click: () => this.setTab(k) })),
      tabFiles: S.tab === 'files', tabUsers: S.tab === 'users', tabOrgs: S.tab === 'orgs', tabLogs: S.tab === 'logs', tabSys: S.tab === 'sys', tabAcct: S.tab === 'acct',
      scope: S.scope, onScope: e => this.setState({ scope: e.target.value }, this.loadFiles), scopeOpts: [{ v: 'global', l: T('Felles for alle menigheter') }].concat(S.orgs.map(o => ({ v: 'org/' + o.id, l: o.name }))),
      folders: FOLD.map(([k, l]) => ({ l, ...chip(S.folder === k), click: () => this.setState({ folder: k }, this.loadFiles) })),
      fileRef: this.fileRef, onFile: this.onFile, accept: fo[2] === 'audio' ? 'audio/mpeg,audio/wav,audio/mp4,audio/x-m4a,audio/ogg' : 'image/png,image/jpeg,image/webp,image/gif',
      pickFiles: () => { if (!S.canWrite) { this.flash('Du har ikke tilgang til å endre denne mappen.'); return; } this.fileRef.current && this.fileRef.current.click(); }, uploadLabel: S.busy ? 'Laster opp …' : 'Last opp',
      folderHint: T(fo[2] === 'audio' ? 'MP3, WAV, M4A eller OGG. Maks 4,4 MB per fil.' : 'PNG, JPG, WebP eller GIF. Maks 4,4 MB per fil.') + ' ' + T(S.scope === 'global' ? 'Filer her vises for alle menigheter.' : 'Filer her vises bare for denne menigheten.'),
      onDragOver: this.onDragOver, onDragLeave: this.onDragLeave, onDrop: this.onDrop, dragOver: S.dragOver, dropStyle: S.dragOver ? 'dashed' : 'solid', dropBorder: S.dragOver ? '#e9e7e2' : '#1c1c1c',
      cloudCount: String(S.cloud.length), cloudEmpty: !S.cloud.length,
      cloud: S.cloud.map(f => ({ name: f.name, url: f.url, isImg: fo[2] !== 'audio', isAudio: fo[2] === 'audio', meta: fmtSize(f.size || 0) + ' · ' + fmtDate(f.at), canDel: S.canWrite, del: () => this.delFile(f) })),
      hasBuiltin: S.builtin.length > 0, canWrite: S.canWrite,
      builtin: S.builtin.map(b => { const h = hid.has(b.key); return { src: b.src, name: b.key, op: h ? 0.35 : 1, tl: h ? 'Vis' : 'Skjul', toggle: () => this.toggleHide(b.key, !h) }; }),
      uName: S.uName, uPw: S.uPw, uRole: S.uRole, uOrg: S.uOrg, onUName: this.inp('uName'), onUPw: this.inp('uPw'), onURole: this.inp('uRole'), onUOrg: this.inp('uOrg'), addUser: this.addUser,
      roleOpts: roleChoices, showOrgPick: dev && S.uRole !== 'dev', orgOpts: S.orgs.map(o => ({ v: o.id, l: o.name })),
      users: S.users.map(u => ({ name: u.name, org: u.role === 'dev' ? T('Alle menigheter') : u.orgName || orgName(u.org) || '–', last: fmtDate(u.last), locked: !!u.locked, canManage: !!u.canManage, fixed: !u.canManage, role: u.role, roleL: ROLE[u.role], roleBg: ROLEBG[u.role],
        roles: roleChoices.some(r => r.v === u.role) ? roleChoices : roleChoices.concat([{ v: u.role, l: ROLE[u.role] }]), setRole: e => this.setRole(u, e.target.value), reset: () => this.resetPw(u), del: () => this.delUser(u) })),
      oName: S.oName, onOName: this.inp('oName'), addOrg: this.addOrg, orgsEmpty: !S.orgs.length,
      orgs: S.orgs.map(o => ({ name: o.name, users: String(o.users || 0), files: () => this.setState({ scope: 'org/' + o.id, tab: 'files' }, this.loadFiles), rename: () => this.renameOrg(o), del: () => this.delOrg(o) })),
      logFilters: [['', 'Alle'], ['client', 'Feil i nettleser'], ['server', 'Serverfeil'], ['audit', 'Handlinger']].map(([k, l]) => ({ l, ...chip(S.logType === k), click: () => this.setState({ logType: k }, this.loadLogs) })),
      logTotal: S.logTotal ? S.logTotal + ' ' + T('totalt') : '', loadLogs: this.loadLogs, clearLogs: this.clearLogs, logsEmpty: !S.logs.length,
      logs: S.logs.map(l => ({ type: T(LOGL[l.type] || l.type || '?'), col: LOGCOL[l.type] || '#c9c5bc', at: fmtDate(l.at), msg: l.type === 'audit' ? (l.action || '') + ' ' + (l.detail || '') : l.msg || '', who: l.user || l.page || '',
        detail: Object.entries(l).filter(([k]) => k !== 'path').map(([k, v]) => k + ': ' + (typeof v === 'string' ? v : JSON.stringify(v))).join('\n') })),
      loadSys: this.loadSys,
      sysChecks: st ? [['AUTH_SECRET', st.env.AUTH_SECRET], ['Blob-butikk', st.env.BLOB], ['SETUP_CODE', st.env.SETUP_CODE]].map(([l, ok]) => ({ l, v: ok ? 'OK' : T('Mangler'), col: ok ? '#8fd3a8' : '#f5b82c' })).concat([{ l: T('Brukere'), v: String(st.users), col: '#e9e7e2' }, { l: T('Miljø'), v: st.env.env || '–', col: '#e9e7e2' }]) : [],
      sysStore: st ? Object.entries(st.storage).map(([k, v]) => ({ l: k === 'global' ? T('Felles') : k === 'logs' ? T('Logg') : k === 'sys' ? T('System') : (k.startsWith('org/') ? (st.orgs.find(o => 'org/' + o.id === k) || {}).name || k : k), v: v.n + ' · ' + fmtSize(v.size) })) : [],
      aOld: S.aOld, aNew: S.aNew, onAOld: this.inp('aOld'), onANew: this.inp('aNew'), changePw: this.changePw,
      hasToast: !!S.toast, toast: S.toast
    };
  }
}

export default Component;
