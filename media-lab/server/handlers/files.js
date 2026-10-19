/* Filhandlinger (P7): opplasting (bare bilder; også direkte til Samarbeidsmappen), signerte visningslenker og sletting.
   Rekkefølge ved opplasting: innlogging → størrelse → innholdskontroll (video avvises) → rettighet og kvote i databasen
   med brukerens token → lagring → registrering (ny kontroll med lås) → ved feil fjernes den lagrede filen igjen. */
import { json, fail, UUID } from '../lib/http.js';
import { checkUpload, cleanName, isVideoName } from '../lib/sniff.js';

/* Opplasting GJENNOM serveren (eldre klienter): Vercel tar imot høyst 4,5 MB per forespørsel. Større filer lastes opp
   direkte til lagringen (upload.start → nettleseren → upload.finish) med grensene under (samme som i databasen). */
export const MAX_BYTES = 4 * 1024 * 1024;
export const FILE_LIMIT = 30 * 1024 * 1024, LOGO_LIMIT = 10 * 1024 * 1024;
const limitFor = folder => (folder === 'logoer' ? LOGO_LIMIT : FILE_LIMIT);
const FOLDERS = ['bilder', 'logoer', 'bakgrunner', 'mockups', 'faste'];
const KINDS = ['file', 'link', 'church_logo'];
const EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' };
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');

async function readBody(request) {
  const len = Number(request.headers.get('content-length') || 0);
  if (len > MAX_BYTES) throw { status: 413, error: 'too_large' };
  const buf = new Uint8Array(await request.arrayBuffer());
  if (buf.length > MAX_BYTES) throw { status: 413, error: 'too_large' };
  return buf;
}

/* Opprydning: henter lagringsnøklene for kø-oppføringene (bare serveren), fjerner filene fra lagringen og registrerer
   resultatet for hver fil. En feil stopper ikke de andre; feilede oppføringer kan prøves igjen (file.cleanup_retry). */
async function drainCleanup(ctx, ids) {
  if (!ids || !ids.length) return { done: 0, failed: 0 };
  const rows = (await ctx.backend.rpcAsServer('cleanup_queue_claim', { p_ids: ids })) || [];
  let done = 0, failed = 0;
  for (const r of rows) {
    try {
      await ctx.backend.storageDelete([r.storage_key]);
      await ctx.backend.rpcAsServer('cleanup_queue_done', { p_id: r.id, p_ok: true }); done++;
    } catch (e) {
      failed++;
      await ctx.backend.rpcAsServer('cleanup_queue_done', { p_id: r.id, p_ok: false, p_error: String((e && (e.code || e.message)) || 'storage_error').slice(0, 200) }).catch(() => {});
    }
  }
  return { done, failed };
}

/* Påbegynte opplastinger som aldri ble fullført (eller ble avvist), slettes fra lagringen; registrerte filer røres ikke. */
async function sweepExpired(ctx) {
  try {
    const keys = (await ctx.backend.rpcAsServer('upload_expired_take', { p_limit: 20 })) || [];
    if (keys.length) await ctx.backend.storageDelete(keys);
  } catch (e) { /* prøves igjen ved neste opplasting */ }
}

export const routes = {
  async 'file.upload'(ctx) {
    const q = new URL(ctx.request.url).searchParams;
    const church = q.get('church') || '', folder = q.get('folder') || 'bilder', name = String(q.get('name') || '').slice(0, 200);
    if (!UUID.test(church) || !FOLDERS.includes(folder)) return fail('invalid');
    /* Nye private opplastinger er stengt (Fellesmappe uten «Privat (bare meg)»). Databasen avviser dem også
       (app.upload_check); eksisterende private bilder er urørt og fortsatt bare synlige for eieren. */
    if (q.has('private') && q.get('private') !== '0') return fail('private_not_allowed', 403);
    const bytes = await readBody(ctx.request);
    const chk = checkUpload(bytes, name);
    if (!chk.ok) return fail(chk.error, 415);
    await ctx.backend.rpcAsUser(ctx.token, 'can_upload', { p_church: church, p_folder: folder, p_private: false, p_size: bytes.length });
    const key = 'c/' + church + '/' + crypto.randomUUID() + '.' + chk.ext;
    const sha = hex(await crypto.subtle.digest('SHA-256', bytes));
    await ctx.backend.storagePut(key, bytes, chk.mime);
    try {
      const f = await ctx.backend.rpcAsServer('register_file', { p_issuer: ctx.claims.iss, p_subject: ctx.claims.sub, p_church: church, p_folder: folder,
        p_private: false, p_key: key, p_name: cleanName(name, chk.ext), p_mime: chk.mime, p_size: bytes.length, p_sha256: sha });
      return json({ ok: true, file: f });
    } catch (e) {
      await ctx.backend.storageDelete([key]).catch(() => {});
      throw e;
    }
  },
  /* Ny menighet med logo (Developer/Moderator med MFA). Logoen kontrolleres som ved file.upload (bare bilder, magiske
     bytes, 4 MB), rettigheten sjekkes med brukerens token før noe lagres, og menigheten og logoen opprettes i én
     transaksjon i databasen (create_church_with_logo, aal fra det verifiserte tokenet). Den som oppretter blir verken
     medlem eller Admin. Feiler registreringen, fjernes den lagrede filen igjen. */
  async 'church.create_with_logo'(ctx) {
    const q = new URL(ctx.request.url).searchParams;
    const name = String(q.get('name') || '').trim().slice(0, 120), file = String(q.get('file') || '').slice(0, 200);
    if (name.length < 2) return fail('invalid');
    const bytes = await readBody(ctx.request);
    const chk = checkUpload(bytes, file);
    if (!chk.ok) return fail(chk.error, 415);
    await ctx.backend.rpcAsUser(ctx.token, 'can_create_church', {});
    const church = crypto.randomUUID();
    const key = 'c/' + church + '/' + crypto.randomUUID() + '.' + chk.ext;
    const sha = hex(await crypto.subtle.digest('SHA-256', bytes));
    await ctx.backend.storagePut(key, bytes, chk.mime);
    try {
      const c = await ctx.backend.rpcAsServer('create_church_with_logo', { p_issuer: ctx.claims.iss, p_subject: ctx.claims.sub, p_aal: ctx.claims.aal || 'aal1',
        p_church: church, p_name: name, p_key: key, p_file_name: cleanName(file, chk.ext), p_mime: chk.mime, p_size: bytes.length, p_sha256: sha });
      return json({ ok: true, church: c });
    } catch (e) {
      await ctx.backend.storageDelete([key]).catch(() => {});
      throw e;
    }
  },
  /* Store filer, steg 1 av 2 (bilder og filer høyst 30 MB, logoer 10 MB): oppgitt navn, type og størrelse kontrolleres,
     rettighet og kvote sjekkes med brukerens token (som ved opplasting gjennom serveren), den påbegynte opplastingen
     registreres (bare serveren), og svaret er en kortlivet signert lenke for opplasting av ÉN fil til én nøkkel.
     Innholdet kontrolleres i steg 2 (upload.finish) før filen registreres. */
  async 'upload.start'(ctx) {
    const b = ctx.body || {}, kind = String(b.kind || 'file'), name = String(b.name || '').slice(0, 200), mime = String(b.mime || ''), size = Number(b.size);
    if (!KINDS.includes(kind) || !Number.isSafeInteger(size) || size <= 0) return fail('invalid');
    if (/^video\//i.test(mime) || isVideoName(name)) return fail('video_not_allowed', 415);
    const ext = EXT[mime];
    if (!ext) return fail('type_not_allowed', 415);
    let church, folder = null, link = null;
    if (kind === 'church_logo') {
      if (String(b.church_name || '').trim().length < 2) return fail('invalid');
      if (size > LOGO_LIMIT) return fail('logo_too_large', 413);
      await ctx.backend.rpcAsUser(ctx.token, 'can_create_church', {});
      church = crypto.randomUUID();
    } else {
      church = String(b.church || '');
      if (!UUID.test(church)) return fail('invalid');
      if (kind === 'file') {
        folder = String(b.folder || 'bilder');
        if (!FOLDERS.includes(folder)) return fail('invalid');
        if (b.private) return fail('private_not_allowed', 403);
        if (size > limitFor(folder)) return fail(folder === 'logoer' ? 'logo_too_large' : 'too_large', 413);
        await ctx.backend.rpcAsUser(ctx.token, 'can_upload', { p_church: church, p_folder: folder, p_private: false, p_size: size });
      } else {
        link = String(b.link || '');
        if (!UUID.test(link)) return fail('invalid');
        if (size > FILE_LIMIT) return fail('too_large', 413);
        await ctx.backend.rpcAsUser(ctx.token, 'can_upload_link', { p_link: link, p_church: church, p_size: size });
      }
    }
    await sweepExpired(ctx);
    const key = 'c/' + church + '/' + crypto.randomUUID() + '.' + ext;
    const id = await ctx.backend.rpcAsServer('upload_begin', { p_issuer: ctx.claims.iss, p_subject: ctx.claims.sub, p_kind: kind, p_church: church,
      p_folder: folder, p_link: link, p_key: key, p_name: name || 'bilde', p_mime: mime, p_size: size });
    const url = await ctx.backend.storageSignUpload(key);
    return json({ ok: true, id, url, mime });
  },
  /* Store filer, steg 2 av 2: den påbegynte opplastingen tas (bare egen, bare én gang), filen hentes fra lagringen og
     kontrolleres som ved opplasting gjennom serveren (magiske bytes, video avvises), og størrelse og type må være som
     oppgitt i steg 1. Deretter registreres den med de vanlige funksjonene (ny kontroll av rettighet og kvote med lås).
     Avvises eller feiler noe, slettes filen. Ny menighet med logo: navnet sendes med her. */
  async 'upload.finish'(ctx) {
    const b = ctx.body || {}, id = String(b.id || '');
    if (!UUID.test(id)) return fail('invalid');
    const p = await ctx.backend.rpcAsServer('upload_take', { p_id: id, p_issuer: ctx.claims.iss, p_subject: ctx.claims.sub });
    if (!p || !p.storage_key) return fail('upload_expired', 410);
    const key = p.storage_key, drop = () => ctx.backend.storageDelete([key]).catch(() => {});
    let bytes;
    try { bytes = await ctx.backend.storageGet(key); } catch (e) { await drop(); return fail('upload_missing', 409); }
    const chk = checkUpload(bytes, p.file_name);
    if (!chk.ok) { await drop(); return fail(chk.error, 415); }
    if (bytes.length !== Number(p.file_size) || chk.mime !== p.mime_type) { await drop(); return fail('upload_mismatch', 422); }
    const sha = hex(await crypto.subtle.digest('SHA-256', bytes));
    const fileName = cleanName(p.file_name, chk.ext);
    try {
      if (p.kind === 'church_logo') {
        const name = String(b.church_name || '').trim().slice(0, 120);
        const c = await ctx.backend.rpcAsServer('create_church_with_logo', { p_issuer: ctx.claims.iss, p_subject: ctx.claims.sub, p_aal: ctx.claims.aal || 'aal1',
          p_church: p.church_id, p_name: name, p_key: key, p_file_name: fileName, p_mime: chk.mime, p_size: bytes.length, p_sha256: sha });
        return json({ ok: true, church: c });
      }
      const f = p.kind === 'link'
        ? await ctx.backend.rpcAsServer('register_link_upload', { p_issuer: ctx.claims.iss, p_subject: ctx.claims.sub, p_link: p.link_id, p_church: p.church_id,
            p_key: key, p_name: fileName, p_mime: chk.mime, p_size: bytes.length, p_sha256: sha })
        : await ctx.backend.rpcAsServer('register_file', { p_issuer: ctx.claims.iss, p_subject: ctx.claims.sub, p_church: p.church_id, p_folder: p.folder,
            p_private: false, p_key: key, p_name: fileName, p_mime: chk.mime, p_size: bytes.length, p_sha256: sha });
      return json({ ok: true, file: f });
    } catch (e) {
      await drop();
      throw e;
    }
  },
  /* Direkte opplasting til en samarbeidsgruppes Samarbeidsmappe (bare bilder, samme kontroller som file.upload). Filen
     tilhører menigheten som bidro (kvote og samlet grense). Databasen avgjør tilgang med brukerens token (can_upload_link:
     aktivt medlem av menigheten, menigheten aktivt medlem av en AKTIV gruppe) og på nytt ved registreringen (med lås). */
  async 'file.upload_link'(ctx) {
    const q = new URL(ctx.request.url).searchParams;
    const link = q.get('link') || '', church = q.get('church') || '', name = String(q.get('name') || '').slice(0, 200);
    if (!UUID.test(link) || !UUID.test(church)) return fail('invalid');
    const bytes = await readBody(ctx.request);
    const chk = checkUpload(bytes, name);
    if (!chk.ok) return fail(chk.error, 415);
    await ctx.backend.rpcAsUser(ctx.token, 'can_upload_link', { p_link: link, p_church: church, p_size: bytes.length });
    const key = 'c/' + church + '/' + crypto.randomUUID() + '.' + chk.ext;
    const sha = hex(await crypto.subtle.digest('SHA-256', bytes));
    await ctx.backend.storagePut(key, bytes, chk.mime);
    try {
      const f = await ctx.backend.rpcAsServer('register_link_upload', { p_issuer: ctx.claims.iss, p_subject: ctx.claims.sub, p_link: link, p_church: church,
        p_key: key, p_name: cleanName(name, chk.ext), p_mime: chk.mime, p_size: bytes.length, p_sha256: sha });
      return json({ ok: true, file: f });
    } catch (e) {
      await ctx.backend.storageDelete([key]).catch(() => {});
      throw e;
    }
  },
  /* Signerte lenker (10 min) for filer brukeren kan se. Synlighet avgjøres av databasen med brukerens token. */
  async 'file.urls'(ctx) {
    const ids = Array.isArray(ctx.body.ids) ? ctx.body.ids.filter(x => UUID.test(String(x))).slice(0, 100) : [];
    if (!ids.length) return json({ ok: true, urls: {} });
    const rows = await ctx.backend.rpcAsUser(ctx.token, 'file_keys', { p_ids: ids });
    const signed = rows && rows.length ? await ctx.backend.storageSign(rows.map(r => r.storage_key), 600) : {};
    const urls = {}; for (const r of rows || []) if (signed[r.storage_key]) urls[r.id] = signed[r.storage_key];
    return json({ ok: true, urls, expires_in: 600 });
  },
  /* Overføring til Samarbeidsfiler: en KOPI av en fellesfil legges i koblingens mappe. Originalen røres aldri.
     Tilgang avgjøres av databasen med brukerens token (can_transfer) og på nytt ved registrering (med lås og kvote).
     Kopien kontrolleres mot originalens SHA-256; ved avvik eller feil i registreringen slettes kopien igjen. */
  async 'file.copy_to_link'(ctx) {
    const file = String(ctx.body.file_id || ''), link = String(ctx.body.link_id || '');
    if (!UUID.test(file) || !UUID.test(link)) return fail('invalid');
    const src = await ctx.backend.rpcAsUser(ctx.token, 'can_transfer', { p_file: file, p_link: link });
    if (!src || !src.storage_key || !UUID.test(String(src.church_id || ''))) return fail('not_found', 404);
    const ext = (String(src.storage_key).match(/\.(png|jpg|webp|gif)$/) || [])[1] || 'bin';
    const key = 'c/' + src.church_id + '/' + crypto.randomUUID() + '.' + ext;
    await ctx.backend.storageCopy(src.storage_key, key);
    try {
      if (src.sha256) {
        const sha = hex(await crypto.subtle.digest('SHA-256', await ctx.backend.storageGet(key)));
        if (sha !== src.sha256) throw { status: 502, error: 'copy_mismatch' };
      }
      const f = await ctx.backend.rpcAsServer('register_link_copy', { p_issuer: ctx.claims.iss, p_subject: ctx.claims.sub, p_file: file, p_link: link, p_key: key });
      return json({ ok: true, file: f });
    } catch (e) {
      await ctx.backend.storageDelete([key]).catch(() => {});
      throw e;
    }
  },
  /* Opprydning av private filer fra fjernede medlemmer (Developer/Moderator som er medlem av menigheten). Databasen
     kontrollerer alt på nytt med lås – også at antall og samlet størrelse stemmer med det som ble bekreftet – og sletter
     radene og legger nøklene i køen i én transaksjon. Ingen nøkler eller lenker sendes til nettleseren. */
  async 'file.cleanup'(ctx) {
    const b = ctx.body, church = String(b.church_id || '');
    const ids = Array.isArray(b.ids) ? b.ids.map(String) : [];
    if (!UUID.test(church) || !ids.length || ids.length > 200 || !ids.every(x => UUID.test(x))) return fail('invalid');
    const count = Number(b.expected_count), bytes = Number(b.expected_bytes);
    if (!Number.isInteger(count) || !Number.isInteger(bytes) || count < 1 || bytes < 0) return fail('invalid');
    const r = await ctx.backend.rpcAsUser(ctx.token, 'cleanup_private_files', { p_church: church, p_ids: ids, p_expected_count: count, p_expected_bytes: bytes });
    const s = await drainCleanup(ctx, (r && r.queue) || []);
    return json({ ok: true, count: r.count, bytes: r.bytes, storage_done: s.done, storage_failed: s.failed });
  },
  async 'file.cleanup_retry'(ctx) {
    const church = ctx.body.church_id ? String(ctx.body.church_id) : null;
    if (church !== null && !UUID.test(church)) return fail('invalid');
    const ids = await ctx.backend.rpcAsUser(ctx.token, 'cleanup_retry_ids', { p_church: church });
    const s = await drainCleanup(ctx, ids || []);
    return json({ ok: true, storage_done: s.done, storage_failed: s.failed });
  },
  /* Sletting av en avsluttet samarbeidskobling (Developer/Moderator). Databasen sletter koblingen og kopiene og legger
     lagringsnøklene i køen i én transaksjon; originalene i menighetene røres ikke. */
  async 'link.delete'(ctx) {
    const link = String(ctx.body.link_id || ''); if (!UUID.test(link)) return fail('invalid');
    const r = await ctx.backend.rpcAsUser(ctx.token, 'delete_link', { p_link: link });
    const s = await drainCleanup(ctx, (r && r.queue) || []);
    return json({ ok: true, copies: r.copies, bytes: r.bytes, storage_done: s.done, storage_failed: s.failed });
  },
  async 'file.delete'(ctx) {
    const id = String(ctx.body.id || ''); if (!UUID.test(id)) return fail('invalid');
    const key = await ctx.backend.rpcAsUser(ctx.token, 'delete_file', { p_id: id });
    await ctx.backend.storageDelete([key]).catch(() => {});   /* raden er slettet; eventuell foreldreløs fil ryddes av drift */
    return json({ ok: true });
  },
};
routes['file.upload'].raw = true;
routes['file.upload_link'].raw = true;
routes['church.create_with_logo'].raw = true;
