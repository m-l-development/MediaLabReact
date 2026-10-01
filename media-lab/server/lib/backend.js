/* Offentlige opplysninger om backend per miljø (prosjekt-ID-er står uansett i URL-en som sendes til nettleseren).
   Brukes av serverkoden; byggekoden har tilsvarende tabell i build/env-guard.js. */
export const REFS = { production: 'cmuienhheklcgtfmpvbe', preview: 'uatpdmhnwwjgzlxaucsx' };

export function targetOf(env) {
  const v = String((env && env.VERCEL_ENV) || '').toLowerCase();
  return v === 'production' ? 'production' : 'preview';   /* alt som ikke er produksjon, går mot utvikling */
}
export const supabaseUrl = target => `https://${REFS[target]}.supabase.co`;
export const issuerOf = target => supabaseUrl(target) + '/auth/v1';

/* Fast offentlig adresse per miljø for lenker i e-post (må stå i Auth sin liste over tillatte adresser).
   Preview-deployments har ellers egne adresser per commit, som ikke er tillatt. Produksjon settes i P11.
   Lokalt (uten VERCEL_ENV) brukes forespørselens adresse, men bare localhost. */
export const SITE = { production: null, preview: 'https://media-lab-react-vyef-git-connecthub-media-lab3.vercel.app' };
export function publicOrigin(env, requestUrl) {
  if (env && env.VERCEL_ENV) return SITE[targetOf(env)];
  const u = new URL(requestUrl);
  return /^(localhost|127\.0\.0\.1)$/.test(u.hostname) ? u.origin : null;
}

/* Servernøkler. Leses bare her, bare på serveren, og sjekkes før bruk. Lokalt kommer den hemmelige nøkkelen bare fra
   skallets miljø (aldri fra filer i prosjektet). Navnene følger Vercel-integrasjonen (prefiks per prosjekt). */
const PREFIX = { production: 'connecthub', preview: 'connecthub-dev' };
/* Manuelt opprettede variabler kan ikke ha bindestrek i Vercel; derfor godtas også dette navnet på Preview. */
const MANUAL_SECRET = { preview: 'connecthub_devSUPABASE_SECRET_KEY' };
export function serverConfig(env) {
  const target = targetOf(env), p = env.VERCEL_ENV ? PREFIX[target] : 'CONNECTHUB_';
  const publishableKey = String(env[p + 'SUPABASE_PUBLISHABLE_KEY'] || '').trim();
  const manual = env.VERCEL_ENV && MANUAL_SECRET[target] ? env[MANUAL_SECRET[target]] : '';
  const secretKey = String(env[p + 'SUPABASE_SECRET_KEY'] || env[p + 'SUPABASE_SERVICE_ROLE_KEY'] || manual || '').trim();
  if (!/^sb_publishable_[A-Za-z0-9_-]{10,}$/.test(publishableKey)) return { error: 'publishable_key_missing' };
  if (!secretKey) return { error: 'secret_key_missing' };
  if (!/^sb_secret_[A-Za-z0-9_-]{10,}$/.test(secretKey)) {
    /* Eldre service_role-JWT: må gjelde riktig prosjekt. */
    try {
      const b = JSON.parse(atob(secretKey.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      if (b.role !== 'service_role' || b.ref !== REFS[target]) return { error: 'secret_key_wrong_project' };
    } catch (e) { return { error: 'secret_key_invalid' }; }
  }
  return { target, url: supabaseUrl(target), issuer: issuerOf(target), publishableKey, secretKey };
}
