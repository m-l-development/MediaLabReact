/* Små Web-standard hjelpere for serverfunksjonene (Request → Response). */
const H = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' };

export const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: H });
export const fail = (error, status = 400) => json({ ok: false, error }, status);

/* Leser JSON med størrelsesgrense. Kaster { status, error } ved feil. */
export async function readJson(request, maxBytes = 16384) {
  if (!/^application\/json\b/i.test(request.headers.get('content-type') || '')) throw { status: 415, error: 'content_type' };
  const len = Number(request.headers.get('content-length') || 0);
  if (len > maxBytes) throw { status: 413, error: 'too_large' };
  const text = await request.text();
  if (text.length > maxBytes) throw { status: 413, error: 'too_large' };
  try { const v = JSON.parse(text); if (!v || typeof v !== 'object' || Array.isArray(v)) throw 0; return v; }
  catch (e) { throw { status: 400, error: 'bad_json' }; }
}

export const bearer = request => {
  const m = /^Bearer\s+([A-Za-z0-9_.-]+)$/.exec(request.headers.get('authorization') || '');
  return m ? m[1] : null;
};

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const EMAIL = /^[^@\s]{1,64}@[^@\s]+\.[^@\s]{2,}$/;

/* Kvotesperrene i databasen (app.upload_check) bruker samme SQLSTATE som hastighetsgrensene (54000), så meldingen skiller dem:
   «Menighetens lagringskvote er brukt opp» og «Din private kvote (50 MB) er brukt opp». Meldingen sendes aldri videre til nettleseren. */
export const QUOTA_MESSAGE = /kvote\b.*\bbrukt opp\b/i;

/* Databasefeil (PostgreSQL SQLSTATE) → HTTP-status og nøytral kode. */
export function dbError(e) {
  const code = e && e.code;
  if (code === '42501') return { status: 403, error: 'forbidden' };
  if (code === '23505') return { status: 409, error: 'conflict' };
  if (code === '54000') return QUOTA_MESSAGE.test((e && e.dbMessage) || '') ? { status: 413, error: 'quota_exceeded' } : { status: 429, error: 'rate_limited' };
  if (code === '53100') return { status: 507, error: 'storage_full' };   // samlet lagringsplass i ConnectHub er brukt opp (trinn 20)
  if (code === '22023' || code === '23514' || code === '22P02') return { status: 400, error: 'invalid' };
  return { status: 502, error: 'backend_error' };
}
