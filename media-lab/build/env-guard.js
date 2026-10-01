/* ConnectHub: sikker lesing av offentlige backend-verdier ved bygging.
   Bare to navngitte verdier (URL og publiseringsnøkkel) kan nå nettleseren – aldri via prefiks.
   Rene funksjoner uten sideeffekter, så de kan testes (build/env-guard.test.js). Se docs/architecture-and-portability.md. */

/* Prosjekt-ID-er er offentlige (de står i URL-en som uansett sendes til nettleseren). */
export const REFS = { preview: 'uatpdmhnwwjgzlxaucsx', production: 'cmuienhheklcgtfmpvbe' };

/* Hvilke miljøvariabler som leses per mål. Vercel-integrasjonen setter databasens navn foran variabelnavnet.
   Lokalt (og hos en annen vert) brukes nøytrale navn i .env.local. Bytte av vert = bytte av denne tabellen. */
export const ENV_NAMES = {
  production: { url: 'connecthubSUPABASE_URL', key: 'connecthubSUPABASE_PUBLISHABLE_KEY' },
  preview: { url: 'connecthub-devSUPABASE_URL', key: 'connecthub-devSUPABASE_PUBLISHABLE_KEY' },
  local: { url: 'CONNECTHUB_SUPABASE_URL', key: 'CONNECTHUB_SUPABASE_PUBLISHABLE_KEY' },
};

/* Lokalt skal aldri peke mot produksjon. */
const EXPECTED = { production: REFS.production, preview: REFS.preview, local: REFS.preview };

export function targetOf(env) {
  const v = String(env.VERCEL_ENV || '').toLowerCase();
  return v === 'production' ? 'production' : v === 'preview' ? 'preview' : 'local';
}

export function refFromUrl(url) {
  const m = /^https:\/\/([a-z0-9]{20})\.supabase\.co\/?$/.exec(String(url || '').trim());
  return m ? m[1] : null;
}

function jwtPayload(token) {
  const p = String(token).split('.');
  if (p.length !== 3) return null;
  try { return JSON.parse(Buffer.from(p[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')); } catch { return null; }
}

/* 'publishable' | 'secret' | 'service_role' | 'anon' | 'unknown' */
export function classifyKey(key) {
  const k = String(key || '').trim();
  if (/^sb_publishable_[A-Za-z0-9_-]{10,}$/.test(k)) return 'publishable';
  if (/^sb_secret_/.test(k)) return 'secret';
  const p = /^eyJ[\w-]+\.eyJ[\w-]+\.[\w-]+$/.test(k) ? jwtPayload(k) : null;
  if (p && p.role === 'service_role') return 'service_role';
  if (p && p.role === 'anon') return 'anon';
  return 'unknown';
}

/* Returnerer { target, public, warnings }. Kaster Error ved alt som ikke er trygt.
   Feilmeldinger nevner aldri selve nøkkelen. */
export function resolveSupabaseEnv(env) {
  const target = targetOf(env), names = ENV_NAMES[target], onVercel = target !== 'local';
  const url = String(env[names.url] || '').trim(), key = String(env[names.key] || '').trim();
  if (!url || !key) {
    const missing = [!url && names.url, !key && names.key].filter(Boolean).join(', ');
    if (onVercel) throw new Error(`ConnectHub: mangler miljøvariabel for ${target}: ${missing}. Bygget stoppes.`);
    return { target, public: null, warnings: [`ConnectHub-backend er ikke konfigurert lokalt (${missing}). Appen bygges uten backend.`] };
  }
  const ref = refFromUrl(url);
  if (!ref) throw new Error(`ConnectHub: ${names.url} er ikke en gyldig Supabase-URL (https://<prosjekt-id>.supabase.co).`);
  if (ref !== EXPECTED[target]) throw new Error(`ConnectHub: ${target} peker til prosjekt ${ref}, forventet ${EXPECTED[target]}. Bygget stoppes.`);
  const kind = classifyKey(key);
  if (kind !== 'publishable') {
    const why = kind === 'secret' || kind === 'service_role' ? 'er en HEMMELIG nøkkel' : kind === 'anon' ? 'er en eldre anon-nøkkel (bruk publiseringsnøkkelen)' : 'har ukjent format';
    throw new Error(`ConnectHub: ${names.key} ${why}. Bare publiseringsnøkler (sb_publishable_…) er tillatt i nettleseren. Bygget stoppes.`);
  }
  return { target, public: { url, key, ref, target }, warnings: [] };
}

/* Søk etter hemmeligheter i ferdig bygget tekst. Returnerer liste med funn (uten selve verdiene).
   Begrensning: finner bare kjente mønstre, ikke vilkårlige hemmeligheter. */
export function scanText(text, { target } = {}) {
  const t = String(text), found = [];
  if (/sb_secret_[A-Za-z0-9_-]{10,}/.test(t)) found.push('sb_secret_-nøkkel');
  if (/postgres(?:ql)?:\/\/[^\s:'"`/@]+:[^\s@'"`]+@/i.test(t)) found.push('PostgreSQL-URL med passord');
  for (const n of ['SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_JWT_SECRET', 'SUPABASE_SECRET_KEY', 'POSTGRES_PASSWORD']) if (t.includes(n)) found.push('variabelnavn ' + n);
  for (const m of t.matchAll(/eyJ[\w-]{8,}\.eyJ[\w-]{8,}\.[\w-]{8,}/g)) { const p = jwtPayload(m[0]); if (p && p.role === 'service_role') { found.push('JWT med service_role'); break; } }
  if (target === 'preview' && t.includes(REFS.production)) found.push('produksjonens prosjekt-ID i et Preview-bygg');
  if (target === 'production' && t.includes(REFS.preview)) found.push('utviklingsprosjektets ID i et produksjonsbygg');
  return found;
}

export const SCAN_EXT = /\.(m?js|cjs|html|css|json|map|txt|svg|webmanifest|xml)$/i;
