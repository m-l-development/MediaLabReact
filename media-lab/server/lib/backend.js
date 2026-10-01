/* Offentlige opplysninger om backend per miljø (prosjekt-ID-er står uansett i URL-en som sendes til nettleseren).
   Brukes av serverkoden; byggekoden har tilsvarende tabell i build/env-guard.js. */
export const REFS = { production: 'cmuienhheklcgtfmpvbe', preview: 'uatpdmhnwwjgzlxaucsx' };

export function targetOf(env) {
  const v = String((env && env.VERCEL_ENV) || '').toLowerCase();
  return v === 'production' ? 'production' : 'preview';   /* alt som ikke er produksjon, går mot utvikling */
}
export const supabaseUrl = target => `https://${REFS[target]}.supabase.co`;
export const issuerOf = target => supabaseUrl(target) + '/auth/v1';
