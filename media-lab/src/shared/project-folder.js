/* Prosjektmapper på brukerens egen PC (File System Access API, Chrome/Edge). Video og andre mediefiler skrives til
   <mappe>/media/, og prosjektet til <mappe>/prosjekt.motion.json. INGENTING sendes over nett.
   Utvider VF.store i Motion Design uten å endre motoren: mediefiler i en prosjektmappe lagres i IndexedDB bare som en
   henvisning ({ path, pid }) – selve filen leses fra mappen. Gamle prosjekter i nettleseren virker som før.
   «Kopier til prosjektmappe» kopierer og kontrollerer filene, men sletter aldri kopien i nettleseren; det er et eget,
   bekreftet valg («Frigjør plass i nettleseren»), og bare for filer som er kontrollert i mappen. */

export const supported = () => typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function';
const DB = 'mlfolders', JSON_NAME = 'prosjekt.motion.json';

let dbp = null;
function db() {
  return dbp || (dbp = new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore('h');
    r.onsuccess = () => res(r.result); r.onerror = () => { dbp = null; rej(r.error); };
  }));
}
const tx = (mode, fn) => db().then(d => new Promise((res, rej) => { const t = d.transaction('h', mode), q = fn(t.objectStore('h')); let out; if (q) q.onsuccess = () => { out = q.result; }; t.oncomplete = () => res(out); t.onerror = () => rej(t.error); }));
const key = (app, pid) => app + ':' + pid;
export const getFolder = (app, pid) => tx('readonly', s => s.get(key(app, pid))).then(r => r || null).catch(() => null);
const setFolder = (app, pid, handle) => tx('readwrite', s => s.put({ handle, name: handle.name, at: Date.now() }, key(app, pid)));
export const forgetFolder = (app, pid) => tx('readwrite', s => s.delete(key(app, pid))).catch(() => {});

/* Tilgang til mappen. ask=true ber om tilgang (krever et klikk fra brukeren). */
export async function access(handle, ask) {
  if (!handle) return false;
  const o = { mode: 'readwrite' };
  try { if ((await handle.queryPermission(o)) === 'granted') return true; if (ask && (await handle.requestPermission(o)) === 'granted') return true; } catch (e) {}
  return false;
}

export const safeName = s => String(s || 'fil').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '_').replace(/^\.+/, '_').slice(0, 120) || 'fil';
async function resolve(dir, path) {
  const parts = String(path).split('/'); let d = dir;
  for (const p of parts.slice(0, -1)) d = await d.getDirectoryHandle(p);
  return d.getFileHandle(parts[parts.length - 1]);
}
async function writeFile(dir, sub, name, blob) {
  const d = await dir.getDirectoryHandle(sub, { create: true }), fh = await d.getFileHandle(name, { create: true });
  const w = await fh.createWritable(); await w.write(blob); await w.close();
  return sub + '/' + name;
}
async function verify(dir, path, size) { try { const f = await (await resolve(dir, path)).getFile(); return f.size === size; } catch (e) { return false; } }

/* Kobler Motion Design-lagringen til prosjektmapper. Kalles én gang når VF er lastet. */
export function installMotionFolders(VF) {
  if (!VF || VF.store._folders) return;
  const S = VF.store, base = { getMedia: S.getMedia, putMedia: S.putMedia, put: S.put };
  const dirFor = async pid => { const f = await getFolder('motion', pid); return f && (await access(f.handle, false)) ? f.handle : null; };

  S._folders = true;
  S.getMedia = async id => {
    const r = await base.getMedia(id);
    if (!r || !r.path) return r;
    try { const dir = await dirFor(r.pid); if (dir) return { ...r, blob: await (await resolve(dir, r.path)).getFile() }; } catch (e) {}
    return r.blob ? r : { ...r, blob: null, missing: true };
  };
  /* Ny fil i et prosjekt: i mappen hvis prosjektet har mappe, ellers i nettleseren som før. */
  S.putMediaIn = async (pid, id, rec) => {
    const dir = await dirFor(pid);
    if (!dir || !rec.blob) return base.putMedia(id, rec);
    const path = await writeFile(dir, 'media', id + '-' + safeName(rec.name), rec.blob);
    if (!(await verify(dir, path, rec.blob.size))) throw new Error('Filen kunne ikke lagres i prosjektmappen.');
    return base.putMedia(id, { name: rec.name, type: rec.type || rec.blob.type, size: rec.blob.size, path, pid });
  };
  /* Lagring: som før, og i tillegg prosjektfilen i mappen (uten miniatyr). */
  S.put = async p => {
    await base.put(p);
    const dir = await dirFor(p.id).catch(() => null); if (!dir) return;
    const files = [];
    for (const m of p.media || []) { const r = await base.getMedia(m.id).catch(() => null); if (r && r.path) files.push({ id: m.id, path: r.path, name: r.name, type: r.type, size: r.size }); }
    const { thumb, ...proj } = p;
    try { const fh = await dir.getFileHandle(JSON_NAME, { create: true }), w = await fh.createWritable(); await w.write(JSON.stringify({ v: 1, app: 'motiondesign', saved: new Date().toISOString(), project: proj, files }, null, 1)); await w.close(); } catch (e) {}
  };

  /* Status for et prosjekt: { folder: navn|null, access: bool, inBrowser: antall filer som også ligger i nettleseren } */
  S.folderStatus = async p => {
    const f = await getFolder('motion', p.id); if (!f) return { folder: null };
    const ok = await access(f.handle, false); let inBrowser = 0, missing = 0;
    for (const m of p.media || []) { const r = await base.getMedia(m.id).catch(() => null); if (r && r.blob) inBrowser++; if (r && !r.path) missing++; }
    return { folder: f.name, access: ok, inBrowser, notCopied: missing };
  };
  S.requestAccess = async pid => { const f = await getFolder('motion', pid); return access(f && f.handle, true); };

  /* Kopierer alle filer i et prosjekt til en (ny) prosjektmappe. Kopien i nettleseren beholdes. */
  S.copyToFolder = async (p, dir, onStep) => {
    if (!(await access(dir, true))) throw new Error('Ingen tilgang til mappen.');
    let n = 0;
    for (const m of p.media || []) {
      const r = await base.getMedia(m.id); if (!r) continue;
      if (r.path && r.pid === p.id && (await verify(dir, r.path, r.size || (r.blob && r.blob.size)))) { n++; continue; }
      const blob = r.blob || (r.path ? await S.getMedia(m.id).then(x => x && x.blob) : null);
      if (!blob) throw new Error('Filen «' + (r.name || m.id) + '» finnes ikke og kan ikke kopieres.');
      const path = await writeFile(dir, 'media', m.id + '-' + safeName(r.name || m.name), blob);
      if (!(await verify(dir, path, blob.size))) throw new Error('Kontrollen av «' + (r.name || m.id) + '» i mappen feilet. Ingenting er slettet.');
      await base.putMedia(m.id, { ...r, ...(r.blob ? { blob: r.blob } : {}), size: blob.size, path, pid: p.id });
      if (onStep) onStep(++n, p.media.length);
    }
    await setFolder('motion', p.id, dir);
    await S.put(p);
  };

  /* Fjerner kopiene i nettleseren for filer som er kontrollert i mappen. Returnerer antall frigjorte filer. */
  S.freeBrowserCopies = async p => {
    const dir = await dirFor(p.id); if (!dir) throw new Error('Ingen tilgang til prosjektmappen.');
    let n = 0;
    for (const m of p.media || []) {
      const r = await base.getMedia(m.id); if (!r || !r.blob || !r.path) continue;
      if (!(await verify(dir, r.path, r.blob.size))) continue;
      const { blob, ...rest } = r; await base.putMedia(m.id, { ...rest, size: blob.size }); n++;
    }
    return n;
  };

  /* Åpner et prosjekt fra en mappe (f.eks. på en annen PC). Returnerer prosjektet (lagret i nettleseren som henvisninger). */
  S.openFromFolder = async dir => {
    if (!(await access(dir, true))) throw new Error('Ingen tilgang til mappen.');
    let meta;
    try { meta = JSON.parse(await (await (await dir.getFileHandle(JSON_NAME)).getFile()).text()); } catch (e) { throw new Error('Mappen inneholder ikke et Motion design-prosjekt (' + JSON_NAME + ').'); }
    if (!meta || meta.app !== 'motiondesign' || !meta.project || !Array.isArray(meta.files)) throw new Error('Prosjektfilen i mappen er skadet.');
    const p = VF.normalize(meta.project);
    for (const f of meta.files) {
      if (typeof f.id !== 'string' || typeof f.path !== 'string' || !/^media\/[^/\\]+$/.test(f.path)) continue;
      let size = 0; try { size = (await (await resolve(dir, f.path)).getFile()).size; } catch (e) { continue; }
      const old = await base.getMedia(f.id).catch(() => null);
      await base.putMedia(f.id, { ...(old && old.blob ? { blob: old.blob } : {}), name: String(f.name || 'Fil').slice(0, 200), type: String(f.type || ''), size, path: f.path, pid: p.id });
    }
    p.updated = Date.now();
    await setFolder('motion', p.id, dir);
    await base.put(p);
    return p;
  };
  S.forgetFolder = pid => forgetFolder('motion', pid);
}
