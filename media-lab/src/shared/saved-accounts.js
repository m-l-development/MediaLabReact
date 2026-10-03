/* Kontovelger på innloggingssiden: lagrede kontoer på denne enheten (valgfritt, «Husk denne kontoen»).
   Lagrer BARE e-post, navn og initialer (localStorage ch.accounts, høyst 5). Aldri passord, tokens, roller eller annet –
   innloggingen går alltid gjennom vanlig passord (og MFA). Feil i lagringen (privat modus o.l.) ignoreres. */
const KEY = 'ch.accounts', MAX = 5;
const read = () => { try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v.filter(a => a && typeof a.email === 'string') : []; } catch (e) { return []; } };
const write = list => { try { localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX))); } catch (e) {} };
export const initialsOf = s => String(s || '?').trim().split(/[\s@.]+/).filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';

export function savedAccounts() { return read().sort((a, b) => (b.last || 0) - (a.last || 0)); }
export function rememberAccount({ email, name }) {
  const e = String(email || '').trim().toLowerCase(); if (!e) return;
  const n = String(name || '').trim().slice(0, 80) || e;
  write([{ email: e, name: n, initials: initialsOf(n), last: Date.now() }, ...read().filter(a => a.email !== e)]);
}
export function forgetAccount(email) { const e = String(email || '').toLowerCase(); write(read().filter(a => a.email !== e)); }
