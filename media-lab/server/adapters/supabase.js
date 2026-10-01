/* Serveradapter for Supabase (REST via fetch). ENESTE serverfil som kjenner Supabase sine endepunkter.
   Ved bytte av leverandør: ny adapter med samme metoder (se docs/architecture-and-portability.md).
   Den hemmelige nøkkelen brukes bare her og sendes bare til leverandøren. */
export function supabaseServer(cfg, fetchFn = fetch) {
  const asServer = { apikey: cfg.secretKey, authorization: 'Bearer ' + cfg.secretKey };
  const asUser = token => ({ apikey: cfg.publishableKey, authorization: 'Bearer ' + token });
  const call = async (path, { method = 'GET', headers = {}, body, raw } = {}) => {
    const r = await fetchFn(cfg.url + path, { method, headers: { ...(body !== undefined && !raw ? { 'content-type': 'application/json' } : {}), ...headers }, body: raw ? body : body !== undefined ? JSON.stringify(body) : undefined });
    const text = await r.text(); let data = null; try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }
    if (!r.ok) { const e = new Error('backend ' + r.status); e.status = r.status; e.code = data && (data.code || data.error_code || data.error); throw e; }
    return data;
  };
  return {
    /* Databasefunksjon som innlogget bruker (RLS og rettigheter gjelder). */
    rpcAsUser: (token, fn, args) => call('/rest/v1/rpc/' + fn, { method: 'POST', headers: asUser(token), body: args || {} }),
    /* Databasefunksjon som server (bare funksjoner som er gitt til serverrollen). */
    rpcAsServer: (fn, args) => call('/rest/v1/rpc/' + fn, { method: 'POST', headers: asServer, body: args || {} }),
    /* Innloggingskonto: { id, email, emailConfirmed }. */
    async getAuthUser(id) {
      const u = await call('/auth/v1/admin/users/' + encodeURIComponent(id), { headers: asServer });
      return { id: u.id, email: u.email || null, emailConfirmed: !!u.email_confirmed_at };
    },
    /* Sender invitasjon (ny konto) eller innloggingslenke (eksisterende konto) til adressen. E-posten beviser eierskap. */
    async sendInvite(email, redirectTo) {
      const q = '?redirect_to=' + encodeURIComponent(redirectTo);
      try { await call('/auth/v1/invite' + q, { method: 'POST', headers: asServer, body: { email } }); return { kind: 'invite' }; }
      catch (e) {
        if (e.status !== 422 && e.code !== 'email_exists') throw e;
        await call('/auth/v1/otp' + q, { method: 'POST', headers: { apikey: cfg.publishableKey }, body: { email, create_user: false } });
        return { kind: 'magiclink' };
      }
    },
    _call: call, _asServer: asServer, _asUser: asUser,
  };
}
