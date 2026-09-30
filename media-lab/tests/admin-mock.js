// Falskt API for Admin-testene: samme kontrakt som api/ml.js (?a=…), med tilstand i minnet.
const T0 = Date.parse('2026-09-20T10:00:00Z');

/* Falskt API med tilstand. Svarer som api/ml.js på ?a=… */
export function mockApi({ needCode = false, code = '', users = [] } = {}) {
  const db = { users: users.map(u => ({ ...u })), orgs: [{ id: 'o1', name: 'Filadelfia' }], files: {}, hidden: {}, logs: [
    { type: 'client', at: T0, msg: 'TypeError: x is undefined', page: '/photo-design.dc.html', path: 'logs/a' },
    { type: 'audit', at: T0 + 1000, action: 'login', detail: 'dev', user: 'kristen', path: 'logs/b' },
  ], me: null, n: 0 };
  const pub = u => ({ id: u.id, name: u.name, role: u.role, org: u.org || '', orgName: (db.orgs.find(o => o.id === u.org) || {}).name || '' });
  const json = (route, status, body) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  return async route => {
    const req = route.request(), url = new URL(req.url()), a = url.searchParams.get('a'), q = k => url.searchParams.get(k);
    let b = {}; try { b = req.postDataJSON() || {}; } catch (e) {}
    const key = () => q('scope') + '/' + q('folder');
    switch (a) {
      case 'status': return json(route, 200, db.users.length ? { me: db.me && pub(db.me) } : { setup: true, needCode });
      case 'setup': { if (needCode && b.code !== code) return json(route, 403, { error: 'Feil oppsettkode.' }); const u = { id: 'u' + ++db.n, name: b.name, pw: b.pw, role: 'dev', last: T0 }; db.users.push(u); db.me = u; return json(route, 200, { me: pub(u) }); }
      case 'login': { const u = db.users.find(x => x.name === b.name && x.pw === b.pw); if (!u) return json(route, 401, { error: 'Feil brukernavn eller passord.' }); db.me = u; return json(route, 200, { me: pub(u) }); }
      case 'logout': db.me = null; return json(route, 200, { ok: true });
      case 'password': if (b.old !== db.me.pw) return json(route, 400, { error: 'Feil passord.' }); db.me.pw = b.pw; return json(route, 200, { ok: true });
      case 'users': return json(route, 200, { users: db.users.map(u => ({ ...pub(u), last: u.last || null, locked: false, canManage: u.id !== db.me.id })) });
      case 'adduser': { if (!b.name || (b.pw || '').length < 10) return json(route, 400, { error: 'Passordet må ha minst 10 tegn.' }); db.users.push({ id: 'u' + ++db.n, name: b.name, pw: b.pw, role: b.role, org: b.org }); return json(route, 200, { ok: true }); }
      case 'deluser': db.users = db.users.filter(u => u.id !== b.id); return json(route, 200, { ok: true });
      case 'setrole': db.users.find(u => u.id === b.id).role = b.role; return json(route, 200, { ok: true });
      case 'resetpw': db.users.find(u => u.id === b.id).pw = b.pw; return json(route, 200, { ok: true });
      case 'orgs': return json(route, 200, { orgs: db.orgs.map(o => ({ ...o, users: db.users.filter(u => u.org === o.id).length })) });
      case 'addorg': db.orgs.push({ id: 'o' + ++db.n, name: b.name }); return json(route, 200, { ok: true });
      case 'renameorg': db.orgs.find(o => o.id === b.id).name = b.name; return json(route, 200, { ok: true });
      case 'delorg': db.orgs = db.orgs.filter(o => o.id !== b.id); return json(route, 200, { files: 2 });
      case 'files': return json(route, 200, { files: db.files[key()] || [], hidden: db.hidden[key()] || [], canWrite: true });
      case 'upload': { const k = key(); (db.files[k] = db.files[k] || []).push({ name: q('name'), url: '/images/sondag.jpeg', size: 1055150, at: T0, path: k + '/' + q('name') }); return json(route, 200, { ok: true }); }
      case 'delfile': for (const k in db.files) db.files[k] = db.files[k].filter(f => f.path !== b.path); return json(route, 200, { ok: true });
      case 'hide': { const k = b.scope + '/' + b.folder, s = new Set(db.hidden[k] || []); b.hide ? s.add(b.key) : s.delete(b.key); db.hidden[k] = [...s]; return json(route, 200, { hidden: db.hidden[k] }); }
      case 'logs': { const l = db.logs.filter(x => !q('type') || x.type === q('type')); return json(route, 200, { logs: l, total: l.length }); }
      case 'clearlogs': db.logs = []; return json(route, 200, { ok: true });
      case 'sys': return json(route, 200, { env: { AUTH_SECRET: true, BLOB: true, SETUP_CODE: false, env: 'preview' }, users: db.users.length, orgs: db.orgs, storage: { global: { n: 3, size: 3000000 }, 'org/o1': { n: 1, size: 20000 }, logs: { n: 2, size: 900 } } });
      case 'log': return json(route, 200, { ok: true });
      default: return json(route, 404, { error: 'ukjent: ' + a });
    }
  };
}
