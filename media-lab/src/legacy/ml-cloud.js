/* Sky-klient: filer fra admin (Vercel Blob) + feillogg. Stille når API mangler (lokal forhåndsvisning). */
(function () {
  if (window.MLCloud) return;
  var API = '/api/ml', cache = {}, me = null, meP = null, off = false;
  function q(a, o) { var s = API + '?a=' + a; o = o || {}; Object.keys(o).forEach(function (k) { if (o[k] != null) s += '&' + k + '=' + encodeURIComponent(o[k]); }); return s; }
  async function api(a, opt) {
    opt = opt || {}; var m = opt.method || 'GET', h = {};
    if (m === 'POST') { h['x-ml'] = '1'; h['content-type'] = opt.raw ? (opt.raw.type || 'application/octet-stream') : 'application/json'; }
    /* Tidsgrense: serveren skal aldri kunne holde siden i «Kobler til …» (10 s, opplasting 60 s). */
    var ac = new AbortController(), tm = setTimeout(function () { ac.abort(); }, opt.raw ? 60000 : 10000), r;
    try { r = await fetch(q(a, opt.q), { method: m, credentials: 'same-origin', headers: h, body: opt.raw || (opt.body ? JSON.stringify(opt.body) : undefined), signal: ac.signal }); }
    catch (e0) { var et = new Error(ac.signal.aborted ? 'timeout' : 'offline'); et.offline = true; et.timeout = ac.signal.aborted; throw et; }
    finally { clearTimeout(tm); }
    var ct = r.headers.get('content-type') || '', d = null; if (ct.indexOf('json') >= 0) { try { d = await r.json(); } catch (e) {} }
    if (!d && !r.ok) { var e0 = new Error('offline'); e0.status = r.status; e0.offline = true; throw e0; }
    if (!r.ok) { var e1 = new Error((d && d.error) || ('HTTP ' + r.status)); e1.status = r.status; e1.data = d; throw e1; }
    return d;
  }
  function status() { if (off) return Promise.resolve(null); if (!meP) meP = api('status').then(function (d) { me = d && d.me; return d; }).catch(function () { off = true; return null; }); return meP; }
  async function files(folder) {
    var empty = { files: [], hidden: new Set() }; if (cache[folder]) return cache[folder];
    var st = await status(); if (!st || !st.me) return empty;
    try { var d = await api('files', { q: { folder: folder } }); return (cache[folder] = { files: d.files || [], hidden: new Set(d.hidden || []) }); } catch (e) { return empty; }
  }
  /* feillogg */
  var sent = 0, seen = {};
  function report(level, msg, src, line, stack) {
    if (sent >= 8 || off || location.protocol !== 'https:' || /claudeusercontent|localhost|127\.0\.0\.1/.test(location.hostname)) return;
    if (/ViewTransition|Transition was aborted/i.test(String(msg))) return;   /* nettleserens sideoverganger – ufarlig */
    var k = String(msg).slice(0, 120); if (seen[k]) return; seen[k] = 1; sent++;
    try { fetch(API + '?a=log', { method: 'POST', keepalive: true, signal: AbortSignal.timeout ? AbortSignal.timeout(8000) : undefined, credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ level: level, msg: String(msg || '').slice(0, 600), src: String(src || '').slice(0, 200), line: line || 0, stack: String(stack || '').slice(0, 1500), page: location.pathname.slice(0, 200) }) }).catch(function () {}); } catch (e) {}
  }
  window.addEventListener('error', function (e) { if (e && e.message) report('error', e.message, e.filename, e.lineno, e.error && e.error.stack); });
  window.addEventListener('unhandledrejection', function (e) { var r = e && e.reason; report('error', (r && r.message) || String(r), '', 0, r && r.stack); });
  window.MLCloud = { api: api, status: status, files: files, report: report, get me() { return me; } };
})();
