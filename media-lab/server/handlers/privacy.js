/* Personvern og menighetens livsløp (P10). Rettigheter sjekkes alltid først i databasen med brukerens token; deretter
   gjør serveren det som krever servernøkkel (filer i lagringen, innloggingskontoen) og fullfører i databasen. */
import { json, fail, UUID } from '../lib/http.js';

const chunks = (a, n) => { const out = []; for (let i = 0; i < a.length; i += n) out.push(a.slice(i, i + n)); return out; };

export const routes = {
  /* Slett egen konto: private filer, ConnectHub-brukeren og innloggingskontoen. Krever bekreftelse «SLETT». */
  async 'privacy.delete_me'(ctx) {
    if (ctx.body.confirm !== 'SLETT') return fail('confirm_required');
    const keys = await ctx.backend.rpcAsUser(ctx.token, 'prepare_account_deletion', {});
    for (const part of chunks(keys || [], 100)) await ctx.backend.storageDelete(part);
    await ctx.backend.rpcAsServer('delete_account', { p_issuer: ctx.claims.iss, p_subject: ctx.claims.sub });
    await ctx.backend.deleteAuthUser(ctx.claims.sub);
    return json({ ok: true });
  },
  /* Eksport av en menighet (admin i menigheten eller stab), med signerte lenker til filene (gyldige 1 time). */
  async 'church.export'(ctx) {
    const church = String(ctx.body.church_id || ''); if (!UUID.test(church)) return fail('invalid');
    const data = await ctx.backend.rpcAsUser(ctx.token, 'export_church', { p_church: church });
    const ids = (data.files || []).map(f => f.id), urls = {};
    for (const part of chunks(ids, 100)) {
      const rows = await ctx.backend.rpcAsUser(ctx.token, 'file_keys', { p_ids: part });
      const signed = rows && rows.length ? await ctx.backend.storageSign(rows.map(r => r.storage_key), 3600) : {};
      for (const r of rows || []) if (signed[r.storage_key]) urls[r.id] = signed[r.storage_key];
    }
    data.files = (data.files || []).map(f => ({ ...f, download_url: urls[f.id] || null }));
    data.note = 'Lenkene til filene virker i 1 time. Videoer finnes ikke i ConnectHub; de ligger i prosjektmappene på brukernes PC-er.';
    return json({ ok: true, export: data });
  },
  /* Endelig sletting av en menighet som står til sletting. Stab med MFA, og navnet må bekreftes. */
  async 'church.purge'(ctx) {
    const church = String(ctx.body.church_id || ''); if (!UUID.test(church)) return fail('invalid');
    const keys = await ctx.backend.rpcAsUser(ctx.token, 'prepare_church_purge', { p_church: church, p_confirm_name: String(ctx.body.confirm_name || '') });
    for (const part of chunks(keys || [], 100)) await ctx.backend.storageDelete(part);
    const r = await ctx.backend.rpcAsServer('purge_church', { p_church: church, p_issuer: ctx.claims.iss, p_subject: ctx.claims.sub, p_aal: ctx.claims.aal || 'aal1' });
    return json({ ok: true, result: r });
  },
};
