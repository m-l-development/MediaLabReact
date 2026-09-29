/* Media Lab API: innlogging, roller (utvikler > admin > bruker), menigheter, filer og logg.
   Krever en PRIVAT Vercel Blob-butikk koblet til prosjektet og miljøvariabelen AUTH_SECRET (minst 32 tegn).
   Valgfritt: SETUP_CODE – må oppgis ved første oppsett av utviklerkontoen. */
import { put, get, del, list } from '@vercel/blob';
import crypto from 'node:crypto';

const DB = 'sys/db.json';
const FOLDERS = { mockups: 'img', faste: 'img', logoer: 'img', bakgrunner: 'img', lyd: 'audio' };
const MAXF = Math.floor(4.4 * 1024 * 1024);
const ROLES = ['user', 'admin', 'dev'];
const rank = r => ROLES.indexOf(r);
const SESSION_H = 12;
const COOKIE = 'ml_s';
const ipHits = new Map();

const H = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' };
const json = (d, s = 200, h = {}) => new Response(JSON.stringify(d), { status: s, headers: { ...H, ...h } });
const err = (m, s = 400) => json({ error: m }, s);
const secret = () => { const s = process.env.AUTH_SECRET || ''; return s.length >= 32 ? s : null; };
const now = () => Date.now();
const rid = (n = 9) => crypto.randomBytes(n).toString('base64url').replace(/[^a-zA-Z0-9]/g, '').slice(0, n);
const str = (v, n = 200) => (typeof v === 'string' ? v : '').slice(0, n);

/* ---------- kryptert database i privat Blob ---------- */
function key() { return crypto.createHash('sha256').update('ml-db|' + secret()).digest(); }
function enc(obj) { const iv = crypto.randomBytes(12), c = crypto.createCipheriv('aes-256-gcm', key(), iv), d = Buffer.concat([c.update(JSON.stringify(obj), 'utf8'), c.final()]); return JSON.stringify({ v: 1, iv: iv.toString('base64'), t: c.getAuthTag().toString('base64'), d: d.toString('base64') }); }
function dec(txt) { const o = JSON.parse(txt), dc = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(o.iv, 'base64')); dc.setAuthTag(Buffer.from(o.t, 'base64')); return JSON.parse(Buffer.concat([dc.update(Buffer.from(o.d, 'base64')), dc.final()]).toString('utf8')); }
async function readText(path, fresh) {
  try { const r = await get(path, { access: 'private', useCache: !fresh ? undefined : false }); if (!r || r.statusCode !== 200 || !r.stream) return null; return { text: await new Response(r.stream).text(), etag: r.blob && r.blob.etag }; }
  catch (e) { if (/not.?found/i.test(String(e && (e.name + e.message)))) return null; throw e; }
}
async function loadDB() {
  const r = await readText(DB, true); const base = { v: 1, users: [], orgs: [], hidden: {} };
  if (!r) return { db: base, etag: null };
  return { db: { ...base, ...dec(r.text) }, etag: r.etag || null };
}
async function saveDB(db, etag) {
  const o = { access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json', cacheControlMaxAge: 60 };
  if (etag) o.ifMatch = etag;
  await put(DB, enc(db), o);
}

/* ---------- passord og økt ---------- */
function hashPw(pw, salt) { return crypto.scryptSync(pw, salt, 64, { N: 16384, r: 8, p: 1 }).toString('base64'); }
function checkPw(u, pw) { const h = Buffer.from(hashPw(pw, u ? u.salt : 'x'.repeat(16))), t = Buffer.from(u ? u.hash : 'x'.repeat(88)); return !!u && h.length === t.length && crypto.timingSafeEqual(h, t); }
function pwOk(pw) { return typeof pw === 'string' && pw.length >= 10 && pw.length <= 200; }
function sign(p) { const s = Buffer.from(JSON.stringify(p)).toString('base64url'); return s + '.' + crypto.createHmac('sha256', secret()).update(s).digest('base64url'); }
function unsign(t) {
  if (!t || t.length > 600) return null; const [s, m] = t.split('.'); if (!s || !m) return null;
  const x = crypto.createHmac('sha256', secret()).update(s).digest('base64url'); if (x.length !== m.length || !crypto.timingSafeEqual(Buffer.from(x), Buffer.from(m))) return null;
  try { const p = JSON.parse(Buffer.from(s, 'base64url').toString()); return p && p.e > now() ? p : null; } catch (e) { return null; }
}
function cookieOf(req) { const c = req.headers.get('cookie') || ''; const m = c.match(new RegExp('(?:^|;\\s*)' + COOKIE + '=([^;]+)')); return m ? m[1] : null; }
const setCookie = t => `${COOKIE}=${t}; Path=/api; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_H * 3600}`;
const clearCookie = `${COOKIE}=; Path=/api; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
function session(req, db) { const p = unsign(cookieOf(req)); if (!p) return null; const u = db.users.find(x => x.id === p.u); return u && !u.disabled && u.ver === p.v ? u : null; }
function pub(u, db) { if (!u) return null; const o = db.orgs.find(x => x.id === u.org); return { id: u.id, name: u.name, role: u.role, org: u.org || null, orgName: o ? o.name : null, created: u.created, last: u.last || null }; }

/* ---------- tilgang ---------- */
const scopeOk = s => s === 'global' || /^org\/[a-z0-9]{4,20}$/.test(s);
const canRead = (me, s) => me.role === 'dev' || s === 'global' || s === 'org/' + me.org;
const canWrite = (me, s) => me.role === 'dev' || (me.role === 'admin' && s === 'org/' + me.org);
function canManage(me, u) { if (!u || u.id === me.id) return false; if (me.role === 'dev') return true; return me.role === 'admin' && u.org === me.org && rank(u.role) <= rank('admin'); }

/* ---------- filtype-kontroll ---------- */
function sniff(b) {
  const h = (i, n) => b.subarray(i, i + n).toString('latin1');
  if (b[0] === 0x89 && h(1, 3) === 'PNG') return ['image/png', 'png', 'img'];
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return ['image/jpeg', 'jpg', 'img'];
  if (h(0, 4) === 'RIFF' && h(8, 4) === 'WEBP') return ['image/webp', 'webp', 'img'];
  if (h(0, 4) === 'GIF8') return ['image/gif', 'gif', 'img'];
  if (h(0, 3) === 'ID3' || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0)) return ['audio/mpeg', 'mp3', 'audio'];
  if (h(0, 4) === 'RIFF' && h(8, 4) === 'WAVE') return ['audio/wav', 'wav', 'audio'];
  if (h(0, 4) === 'OggS') return ['audio/ogg', 'ogg', 'audio'];
  if (h(4, 4) === 'ftyp' && /M4A|mp42|isom|M4B/.test(h(8, 4))) return ['audio/mp4', 'm4a', 'audio'];
  return null;
}
const cleanName = n => (str(n, 80).replace(/\.[a-z0-9]{2,5}$/i, '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9 _-]+/g, '').trim().replace(/\s+/g, '-').toLowerCase() || 'fil').slice(0, 60);

async function listAll(prefix, cap = 5000) { let out = [], cursor; do { const r = await list({ prefix, cursor, limit: 1000 }); out = out.concat(r.blobs || []); cursor = r.hasMore ? r.cursor : null; } while (cursor && out.length < cap); return out; }
function fileOut(b) { const p = b.pathname, base = p.split('/').pop(), name = base.replace(/~[a-zA-Z0-9]+(\.[a-z0-9]+)$/, '$1'); return { path: p, name, size: b.size, at: b.uploadedAt, url: '/api/ml?a=file&p=' + encodeURIComponent(p) }; }

/* ---------- logg ---------- */
async function writeLog(entry) {
  const d = new Date(), day = d.toISOString().slice(0, 10);
  try { await put(`logs/${day}/${d.getTime()}-${entry.type || 'err'}-${rid(6)}.json`, JSON.stringify({ ...entry, at: d.toISOString() }).slice(0, 6000), { access: 'private', addRandomSuffix: false, contentType: 'application/json' }); } catch (e) { console.error('log', e); }
}
const audit = (me, action, detail) => writeLog({ type: 'audit', user: me ? me.name : null, role: me ? me.role : null, action, detail: str(detail, 300) });
function limited(req, n, win) {
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'x', t = now(), a = (ipHits.get(ip) || []).filter(x => t - x < win);
  a.push(t); ipHits.set(ip, a); if (ipHits.size > 5000) ipHits.clear(); return a.length > n;
}

/* ---------- ruter ---------- */
async function route(req) {
  const url = new URL(req.url), a = url.searchParams.get('a') || '', M = req.method;
  if (M === 'POST') {
    const sfs = req.headers.get('sec-fetch-site'); if (sfs && sfs !== 'same-origin') return err('Ugyldig opprinnelse', 403);
    if (a !== 'log' && req.headers.get('x-ml') !== '1') return err('Ugyldig forespørsel', 403);
  }
  if (a === 'log' && M === 'POST') {
    if (limited(req, 30, 60000)) return json({ ok: false }, 429);
    const t = await req.text(); if (t.length > 4000) return err('For stor', 413);
    let b = {}; try { b = JSON.parse(t); } catch (e) {}
    const p = secret() ? unsign(cookieOf(req)) : null;
    await writeLog({ type: 'client', level: str(b.level, 10) || 'error', msg: str(b.msg, 600), src: str(b.src, 200), line: +b.line || 0, stack: str(b.stack, 1500), page: str(b.page, 200), ua: str(req.headers.get('user-agent'), 200), uid: p ? p.u : null });
    return json({ ok: true });
  }
  if (!secret()) return json({ error: 'config', missing: ['AUTH_SECRET'] }, 503);
  let db, etag;
  try { ({ db, etag } = await loadDB()); } catch (e) { console.error(e); return json({ error: 'config', missing: ['BLOB'] }, 503); }
  const me = session(req, db), body = M === 'POST' && a !== 'upload' ? await req.json().catch(() => ({})) : {};
  const save = async () => { await saveDB(db, etag); };

  if (a === 'status') return json({ setup: !db.users.length, needCode: !!process.env.SETUP_CODE, me: pub(me, db) });

  if (a === 'setup' && M === 'POST') {
    if (db.users.length) return err('Oppsettet er allerede gjort.', 403);
    if (process.env.SETUP_CODE && str(body.code, 200) !== process.env.SETUP_CODE) return err('Feil oppsettskode.', 403);
    const name = str(body.name, 60).trim().toLowerCase(); if (!/^[a-z0-9._@-]{3,60}$/.test(name)) return err('Ugyldig brukernavn.');
    if (!pwOk(body.pw)) return err('Passordet må ha minst 10 tegn.');
    const salt = rid(16), u = { id: 'u' + rid(10), name, role: 'dev', org: null, salt, hash: hashPw(body.pw, salt), ver: 1, created: now(), last: now(), fails: 0 };
    db.users.push(u); await save(); await audit(u, 'setup', 'Utviklerkonto opprettet');
    return json({ me: pub(u, db) }, 200, { 'set-cookie': setCookie(sign({ u: u.id, v: u.ver, e: now() + SESSION_H * 3600e3 })) });
  }
  if (a === 'login' && M === 'POST') {
    if (limited(req, 20, 60000)) return err('For mange forsøk. Vent litt.', 429);
    const name = str(body.name, 60).trim().toLowerCase(), u = db.users.find(x => x.name === name);
    if (u && u.lockUntil && u.lockUntil > now()) return err('Kontoen er midlertidig låst. Prøv igjen om 15 minutter.', 429);
    const ok = checkPw(u, str(body.pw, 200));
    if (!ok || !u || u.disabled) {
      if (u) { u.fails = (u.fails || 0) + 1; if (u.fails >= 5) { u.lockUntil = now() + 15 * 60e3; u.fails = 0; } await save().catch(() => {}); }
      return err('Feil brukernavn eller passord.', 401);
    }
    u.fails = 0; u.lockUntil = 0; u.last = now(); await save().catch(() => {});
    return json({ me: pub(u, db) }, 200, { 'set-cookie': setCookie(sign({ u: u.id, v: u.ver, e: now() + SESSION_H * 3600e3 })) });
  }
  if (a === 'logout') return json({ ok: true }, 200, { 'set-cookie': clearCookie });
  if (!me) return err('Du er ikke logget inn.', 401);

  /* ---------- filer ---------- */
  if (a === 'file' && M === 'GET') {
    const p = str(url.searchParams.get('p'), 300), m = p.match(/^(global|org\/[a-z0-9]{4,20})\/([a-z]+)\/[^/]+$/);
    if (!m || !FOLDERS[m[2]] || !canRead(me, m[1])) return err('Ingen tilgang.', 403);
    const r = await get(p, { access: 'private', ifNoneMatch: req.headers.get('if-none-match') || undefined });
    if (!r) return err('Fant ikke filen.', 404);
    if (r.statusCode === 304) return new Response(null, { status: 304, headers: { etag: r.blob.etag, 'cache-control': 'private, no-cache' } });
    return new Response(r.stream, { headers: { 'content-type': r.blob.contentType || 'application/octet-stream', 'x-content-type-options': 'nosniff', 'content-disposition': 'inline', etag: r.blob.etag, 'cache-control': 'private, no-cache' } });
  }
  if (a === 'files' && M === 'GET') {
    const folder = url.searchParams.get('folder'); if (!FOLDERS[folder]) return err('Ukjent mappe.');
    const sc = url.searchParams.get('scope');
    const scopes = sc ? [sc] : ['global'].concat(me.org ? ['org/' + me.org] : []);
    if (!scopes.every(s => scopeOk(s) && canRead(me, s))) return err('Ingen tilgang.', 403);
    const files = []; for (const s of scopes) (await listAll(`${s}/${folder}/`, 2000)).forEach(b => files.push({ ...fileOut(b), scope: s }));
    const hid = new Set(); scopes.concat(sc ? [] : []).forEach(s => ((db.hidden[s] || {})[folder] || []).forEach(x => hid.add(x)));
    if (!sc) ((db.hidden.global || {})[folder] || []).forEach(x => hid.add(x));
    return json({ files: files.filter(f => sc || !hid.has(f.path)), hidden: [...hid], canWrite: scopes.length === 1 && canWrite(me, scopes[0]) });
  }
  if (a === 'upload' && M === 'POST') {
    const sc = url.searchParams.get('scope'), folder = url.searchParams.get('folder');
    if (!scopeOk(sc) || !FOLDERS[folder] || !canWrite(me, sc)) return err('Ingen tilgang.', 403);
    const len = +req.headers.get('content-length') || 0; if (len > MAXF) return err('Filen er for stor (maks 4,4 MB).', 413);
    const buf = Buffer.from(await req.arrayBuffer()); if (!buf.length || buf.length > MAXF) return err('Filen er for stor (maks 4,4 MB).', 413);
    const t = sniff(buf); if (!t || t[2] !== FOLDERS[folder]) return err(FOLDERS[folder] === 'audio' ? 'Bruk MP3, WAV, M4A eller OGG.' : 'Bruk PNG, JPG, WebP eller GIF.', 415);
    const existing = await listAll(`${sc}/`, 5001); if (existing.length >= 5000) return err('Mappen er full.', 507);
    const path = `${sc}/${folder}/${cleanName(url.searchParams.get('name'))}~${rid(6)}.${t[1]}`;
    const b = await put(path, buf, { access: 'private', addRandomSuffix: false, contentType: t[0], cacheControlMaxAge: 31536000 });
    await audit(me, 'upload', path);
    return json({ file: { ...fileOut({ pathname: b.pathname || path, size: buf.length, uploadedAt: new Date().toISOString() }), scope: sc } });
  }
  if (a === 'delfile' && M === 'POST') {
    const p = str(body.path, 300), m = p.match(/^(global|org\/[a-z0-9]{4,20})\/([a-z]+)\/[^/]+$/);
    if (!m || !FOLDERS[m[2]] || !canWrite(me, m[1])) return err('Ingen tilgang.', 403);
    await del(p); await audit(me, 'delete', p); return json({ ok: true });
  }
  if (a === 'hide' && M === 'POST') {
    const sc = str(body.scope, 40), folder = str(body.folder, 20), k = str(body.key, 300);
    if (!scopeOk(sc) || !FOLDERS[folder] || !k || !canWrite(me, sc)) return err('Ingen tilgang.', 403);
    const h = db.hidden[sc] = db.hidden[sc] || {}, arr = new Set(h[folder] || []); body.hide ? arr.add(k) : arr.delete(k); h[folder] = [...arr].slice(0, 2000);
    await save(); await audit(me, body.hide ? 'hide' : 'show', sc + ' ' + folder + ' ' + k); return json({ hidden: h[folder] });
  }

  /* ---------- konto ---------- */
  if (a === 'password' && M === 'POST') {
    if (!checkPw(me, str(body.old, 200))) return err('Nåværende passord er feil.', 403);
    if (!pwOk(body.pw)) return err('Passordet må ha minst 10 tegn.');
    me.salt = rid(16); me.hash = hashPw(body.pw, me.salt); me.ver++; await save(); await audit(me, 'password', 'Eget passord endret');
    return json({ ok: true }, 200, { 'set-cookie': setCookie(sign({ u: me.id, v: me.ver, e: now() + SESSION_H * 3600e3 })) });
  }

  /* ---------- brukere (admin og utvikler) ---------- */
  if (rank(me.role) < rank('admin')) return err('Ingen tilgang.', 403);
  if (a === 'users' && M === 'GET') return json({ users: db.users.filter(u => me.role === 'dev' || u.org === me.org).map(u => ({ ...pub(u, db), locked: !!(u.lockUntil && u.lockUntil > now()), canManage: canManage(me, u) })) });
  if (a === 'adduser' && M === 'POST') {
    const name = str(body.name, 60).trim().toLowerCase(), role = ROLES.includes(body.role) ? body.role : 'user';
    if (!/^[a-z0-9._@-]{3,60}$/.test(name)) return err('Brukernavnet må ha 3–60 tegn: bokstaver, tall, punktum, @, - eller _.');
    if (db.users.some(u => u.name === name)) return err('Brukernavnet er allerede i bruk.');
    if (!pwOk(body.pw)) return err('Passordet må ha minst 10 tegn.');
    if (me.role !== 'dev' && rank(role) > rank('admin')) return err('Ingen tilgang.', 403);
    let org = role === 'dev' ? null : (me.role === 'dev' ? str(body.org, 30) : me.org);
    if (role !== 'dev' && !db.orgs.some(o => o.id === org)) return err('Velg en menighet.');
    if (db.users.length >= 2000) return err('For mange brukere.');
    const salt = rid(16), u = { id: 'u' + rid(10), name, role, org, salt, hash: hashPw(body.pw, salt), ver: 1, created: now(), fails: 0, by: me.id };
    db.users.push(u); await save(); await audit(me, 'adduser', name + ' (' + role + ')'); return json({ user: pub(u, db) });
  }
  if (a === 'deluser' && M === 'POST') {
    const u = db.users.find(x => x.id === body.id); if (!canManage(me, u)) return err('Ingen tilgang.', 403);
    db.users = db.users.filter(x => x !== u); await save(); await audit(me, 'deluser', u.name); return json({ ok: true });
  }
  if (a === 'resetpw' && M === 'POST') {
    const u = db.users.find(x => x.id === body.id); if (!canManage(me, u)) return err('Ingen tilgang.', 403);
    if (!pwOk(body.pw)) return err('Passordet må ha minst 10 tegn.');
    u.salt = rid(16); u.hash = hashPw(body.pw, u.salt); u.ver++; u.fails = 0; u.lockUntil = 0; await save(); await audit(me, 'resetpw', u.name); return json({ ok: true });
  }
  if (a === 'setrole' && M === 'POST') {
    const u = db.users.find(x => x.id === body.id), role = body.role; if (!canManage(me, u) || !ROLES.includes(role)) return err('Ingen tilgang.', 403);
    if (me.role !== 'dev' && rank(role) > rank('admin')) return err('Ingen tilgang.', 403);
    if (role !== 'dev' && !u.org) return err('Brukeren må høre til en menighet.');
    u.role = role; if (role === 'dev') u.org = null; u.ver++; await save(); await audit(me, 'setrole', u.name + ' → ' + role); return json({ ok: true });
  }
  if (a === 'orgs' && M === 'GET') return json({ orgs: db.orgs.filter(o => me.role === 'dev' || o.id === me.org).map(o => ({ id: o.id, name: o.name, created: o.created, users: db.users.filter(u => u.org === o.id).length })) });

  /* ---------- utvikler ---------- */
  if (me.role !== 'dev') return err('Ingen tilgang.', 403);
  if (a === 'addorg' && M === 'POST') {
    const name = str(body.name, 80).trim(); if (name.length < 2) return err('Skriv inn et navn.');
    if (db.orgs.length >= 500) return err('For mange menigheter.');
    const o = { id: rid(10).toLowerCase().replace(/[^a-z0-9]/g, 'x'), name, created: now() }; db.orgs.push(o); await save(); await audit(me, 'addorg', name); return json({ org: o });
  }
  if (a === 'renameorg' && M === 'POST') {
    const o = db.orgs.find(x => x.id === body.id), name = str(body.name, 80).trim(); if (!o || name.length < 2) return err('Ugyldig navn.');
    o.name = name; await save(); await audit(me, 'renameorg', name); return json({ ok: true });
  }
  if (a === 'delorg' && M === 'POST') {
    const o = db.orgs.find(x => x.id === body.id); if (!o) return err('Fant ikke menigheten.', 404);
    const blobs = await listAll(`org/${o.id}/`, 20000); for (let i = 0; i < blobs.length; i += 100) await del(blobs.slice(i, i + 100).map(b => b.url));
    db.orgs = db.orgs.filter(x => x !== o); db.users = db.users.filter(u => u.org !== o.id); delete db.hidden['org/' + o.id];
    await save(); await audit(me, 'delorg', o.name + ' (' + blobs.length + ' filer)'); return json({ ok: true, files: blobs.length });
  }
  if (a === 'logs' && M === 'GET') {
    const all = (await listAll('logs/', 20000)).sort((x, y) => (x.pathname < y.pathname ? 1 : -1)), type = url.searchParams.get('type');
    const pick = all.filter(b => !type || b.pathname.includes('-' + type + '-')).slice(0, 80);
    const rows = await Promise.all(pick.map(async b => { const r = await readText(b.pathname).catch(() => null); try { return r ? { ...JSON.parse(r.text), path: b.pathname } : null; } catch (e) { return null; } }));
    return json({ total: all.length, logs: rows.filter(Boolean) });
  }
  if (a === 'clearlogs' && M === 'POST') {
    const all = await listAll('logs/', 20000); for (let i = 0; i < all.length; i += 100) await del(all.slice(i, i + 100).map(b => b.url));
    await audit(me, 'clearlogs', all.length + ' oppføringer'); return json({ ok: true, n: all.length });
  }
  if (a === 'sys' && M === 'GET') {
    const all = await listAll('', 20000), by = {};
    all.forEach(b => { const m = b.pathname.match(/^(global|org\/[a-z0-9]+|logs|sys)\//); const k = m ? m[1] : 'annet'; by[k] = by[k] || { n: 0, size: 0 }; by[k].n++; by[k].size += b.size || 0; });
    return json({ env: { AUTH_SECRET: true, SETUP_CODE: !!process.env.SETUP_CODE, BLOB: true, region: process.env.VERCEL_REGION || null, env: process.env.VERCEL_ENV || null }, users: db.users.length, orgs: db.orgs.map(o => ({ id: o.id, name: o.name })), storage: by, total: all.length, truncated: all.length >= 20000 });
  }
  return err('Ukjent handling.', 404);
}

export default async function handler(req) {
  try { return await route(req); }
  catch (e) {
    console.error(e);
    const pre = e && /precondition/i.test(String(e.name + e.message));
    if (!pre) writeLog({ type: 'server', level: 'error', msg: str(e && e.message, 600), stack: str(e && e.stack, 1500) });
    return err(pre ? 'Noen andre endret samtidig. Prøv igjen.' : 'Serverfeil. Se loggen.', pre ? 409 : 500);
  }
}
