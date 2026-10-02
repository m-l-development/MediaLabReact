/* CSP per miljø fra vercel.json. Produksjonsadressen (SITE.production) får en CSP uten utviklingsprosjektet; alle andre
   verter (ConnectHub Dev, Vercel sine adresser per deployment, lokalt) får CSP-en med begge prosjektene.
   Reglene i vercel.json utelukker hverandre (has / missing på samme vert), så bare én CSP sendes per svar.
   Brukes av vite.config.js (lokal server og kontroll av inline-skript), build/static-serve.mjs og testene. */
import fs from 'node:fs';
import path from 'node:path';

const CSP_KEY = 'Content-Security-Policy';

export function readVercel(root) {
  return JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
}

/* Vertsbetingelse i en regel: { type: 'host', value: { eq } } eller value som streng. */
const hostEq = c => (c && c.type === 'host' ? (typeof c.value === 'string' ? c.value : c.value && c.value.eq) : undefined);

/* Gjelder regelen for denne verten? (bare vertsbetingelser støttes; andre betingelser gjør at regelen hoppes over) */
export function ruleApplies(rule, host) {
  for (const c of rule.has || []) { const v = hostEq(c); if (v === undefined || v !== host) return false; }
  for (const c of rule.missing || []) { const v = hostEq(c); if (v === undefined) return false; if (v === host) return false; }
  return true;
}

/* { production, other, productionHost } – CSP-en for produksjonsadressen og for alle andre verter. */
export function cspByHost(vercel) {
  const rules = vercel.headers.filter(r => r.headers.some(h => h.key === CSP_KEY));
  const prod = rules.find(r => (r.has || []).some(c => hostEq(c)));
  const other = rules.find(r => (r.missing || []).some(c => hostEq(c)));
  if (!prod || !other || rules.length !== 2) throw new Error('vercel.json: forventet nøyaktig to CSP-regler (has/missing på produksjonsverten)');
  const value = r => r.headers.find(h => h.key === CSP_KEY).value;
  return { production: value(prod), other: value(other), productionHost: hostEq(prod.has.find(c => hostEq(c))) };
}

/* Uten upgrade-insecure-requests (krever https) – for lokale servere. */
export const localCsp = csp => String(csp || '').replace(/;\s*upgrade-insecure-requests/, '');
