/* Filhandlinger (P7): opplasting (bare bilder), signerte visningslenker og sletting.
   Rekkefølge ved opplasting: innlogging → størrelse → innholdskontroll (video avvises) → rettighet og kvote i databasen
   med brukerens token → lagring → registrering (ny kontroll med lås) → ved feil fjernes den lagrede filen igjen. */
import { json, fail, UUID } from '../lib/http.js';
import { checkUpload, cleanName } from '../lib/sniff.js';

export const MAX_BYTES = 4 * 1024 * 1024;
const FOLDERS = ['bilder', 'logoer', 'bakgrunner', 'mockups', 'faste'];
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

export const routes = {
  async 'file.upload'(ctx) {
    const q = new URL(ctx.request.url).searchParams;
    const church = q.get('church') || '', folder = q.get('folder') || 'bilder', priv = q.get('private') === '1', name = String(q.get('name') || '').slice(0, 200);
    if (!UUID.test(church) || !FOLDERS.includes(folder)) return fail('invalid');
    const bytes = await readBody(ctx.request);
    const chk = checkUpload(bytes, name);
    if (!chk.ok) return fail(chk.error, 415);
    await ctx.backend.rpcAsUser(ctx.token, 'can_upload', { p_church: church, p_folder: folder, p_private: priv, p_size: bytes.length });
    const key = 'c/' + church + '/' + crypto.randomUUID() + '.' + chk.ext;
    const sha = hex(await crypto.subtle.digest('SHA-256', bytes));
    await ctx.backend.storagePut(key, bytes, chk.mime);
    try {
      const f = await ctx.backend.rpcAsServer('register_file', { p_issuer: ctx.claims.iss, p_subject: ctx.claims.sub, p_church: church, p_folder: folder,
        p_private: priv, p_key: key, p_name: cleanName(name, chk.ext), p_mime: chk.mime, p_size: bytes.length, p_sha256: sha });
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
  async 'file.delete'(ctx) {
    const id = String(ctx.body.id || ''); if (!UUID.test(id)) return fail('invalid');
    const key = await ctx.backend.rpcAsUser(ctx.token, 'delete_file', { p_id: id });
    await ctx.backend.storageDelete([key]).catch(() => {});   /* raden er slettet; eventuell foreldreløs fil ryddes av drift */
    return json({ ok: true });
  },
};
routes['file.upload'].raw = true;
