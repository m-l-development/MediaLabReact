/* Lokale data per innlogget bruker (IndexedDB og localStorage i nettleseren).
   - Verktøyenes databaser og nøkler får brukerens interne ID som suffiks (photodesign → photodesign@<bruker>).
   - Data fra før innlogging («gamle prosjekter») flyttes eller kopieres ALDRI. Den første brukeren som velger å knytte dem
     til seg, blir eier: for denne brukeren pekes navnene til de eksisterende databasene/nøklene. Ingenting slettes.
   - «Fjern mine lokale data» sletter bare den innloggede brukerens egne data, etter bekreftelse.
   Begrensning: dette er et skille i appen. Den som deler samme Windows-konto/nettleserprofil, kan teknisk lese
   nettleserens lagring. Fullt skille krever egne Windows-kontoer eller nettleserprofiler. */

export const DBS = ['photodesign', 'motiondesign', 'thumbstudio', 'mockuplib', 'ukeloop', 'medialab-share'];
const LS_RE = /^(ukeloop\.|loopstudio\.|medialab\.fx\.|medialab\.advanced$|mockups\.|photodesign\.|thumbstudio\.|motiondesign\.)/;
const OWNER_KEY = 'ch.local.owner', ASKED = uid => 'ch.local.asked.' + uid;

/* Rene funksjoner (testes i local-user.test.js) */
export const isUserDb = name => DBS.includes(name);
export const isUserKey = key => LS_RE.test(String(key));
export function mapName(name, uid, owner) {
  if (!uid) return name;
  return owner === uid ? name : name + '@' + uid;
}

let uid = null, owner = null, installed = false;
const raw = { open: null, del: null, get: null, set: null, remove: null };

function readOwner() { try { return raw.get ? raw.get.call(localStorage, OWNER_KEY) : localStorage.getItem(OWNER_KEY); } catch (e) { return null; } }

/* Installeres før siden starter. Alle åpninger av verktøyenes databaser/nøkler går via brukerens navn. */
export function installLocalUser(userId) {
  uid = userId; owner = readOwner();
  if (installed || typeof indexedDB === 'undefined') return;
  installed = true;
  const F = IDBFactory.prototype, S = Storage.prototype;
  raw.open = F.open; raw.del = F.deleteDatabase; raw.get = S.getItem; raw.set = S.setItem; raw.remove = S.removeItem;
  F.open = function (name, version) { return isUserDb(name) ? raw.open.call(this, mapName(name, uid, owner), version) : (version === undefined ? raw.open.call(this, name) : raw.open.call(this, name, version)); };
  F.deleteDatabase = function (name) { return raw.del.call(this, isUserDb(name) ? mapName(name, uid, owner) : name); };
  const k = (store, key) => store === window.localStorage && isUserKey(key) ? mapName(key, uid, owner) : key;
  S.getItem = function (key) { return raw.get.call(this, k(this, key)); };
  S.setItem = function (key, v) { return raw.set.call(this, k(this, key), v); };
  S.removeItem = function (key) { return raw.remove.call(this, k(this, key)); };
}

async function existingDbs() {
  try { if (indexedDB.databases) return new Set((await indexedDB.databases()).map(d => d.name)); } catch (e) {}
  return null;
}
function legacyKeys() { const out = []; try { for (let i = 0; i < localStorage.length; i++) { const key = localStorage.key(i); if (isUserKey(key) && !key.includes('@')) out.push(key); } } catch (e) {} return out; }

/* Finnes det gamle (eierløse) data på denne PC-en som denne brukeren kan knytte til seg? */
export async function legacyStatus() {
  if (readOwner()) return { available: false, reason: 'har_eier' };
  const have = await existingDbs(), dbs = have ? DBS.filter(n => have.has(n)) : [], mine = have ? DBS.filter(n => have.has(n + '@' + uid)) : [];
  const keys = legacyKeys();
  return { available: dbs.length > 0 || keys.length > 0, dbs, keys: keys.length, conflicts: mine };
}

export function shouldAsk() { try { return !raw.get.call(localStorage, ASKED(uid)); } catch (e) { return false; } }
export function rememberAnswer(v) { try { raw.set.call(localStorage, ASKED(uid), v); } catch (e) {} }

/* Gjør innlogget bruker til eier av de gamle dataene. Ingen data røres. Krever at brukeren ikke allerede har egne
   databaser med samme navn (da ville de blitt skjult) – i så fall returneres konflikt og ingenting endres. */
export async function adoptLegacy() {
  if (readOwner()) return { ok: false, error: 'har_eier' };
  const st = await legacyStatus();
  if (!st.available) return { ok: false, error: 'ingenting' };
  if (st.conflicts.length) return { ok: false, error: 'konflikt', conflicts: st.conflicts };
  try { raw.set.call(localStorage, OWNER_KEY, uid); } catch (e) { return { ok: false, error: 'lagring' }; }
  owner = uid; rememberAnswer('adopted');
  return { ok: true, dbs: st.dbs, keys: st.keys };
}

/* Sletter BARE innlogget brukers lokale data (egne databaser og nøkler, også adopterte gamle data). */
export async function clearMyLocalData() {
  if (!uid) return { ok: false };
  const del = name => new Promise(res => { const r = raw.del.call(indexedDB, name); r.onsuccess = r.onerror = r.onblocked = () => res(); });
  for (const n of DBS) await del(mapName(n, uid, owner));
  const keys = []; try { for (let i = 0; i < localStorage.length; i++) { const key = localStorage.key(i); if (!key) continue; const base = key.replace(/@[0-9a-f-]{36}$/, ''); if (isUserKey(base) && mapName(base, uid, owner) === key) keys.push(key); } } catch (e) {}
  keys.forEach(key => { try { raw.remove.call(localStorage, key); } catch (e) {} });
  if (owner === uid) { try { raw.remove.call(localStorage, OWNER_KEY); } catch (e) {} owner = null; }
  try { raw.remove.call(localStorage, ASKED(uid)); } catch (e) {}
  return { ok: true, keys: keys.length };
}
