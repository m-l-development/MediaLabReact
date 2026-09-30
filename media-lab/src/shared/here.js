/* Husker hvor man er i en app (visning/prosjekt) i sessionStorage.
   Gjenopprettes bare når siden lastes på nytt (F5) eller man går tilbake/fram i historikken.
   Ny fane, lukket fane eller vanlig navigering inn i appen starter på første side. */
const K = 'medialab.here.';

function resumed() {
  try {
    const n = performance.getEntriesByType('navigation')[0];
    if (n) return n.type === 'reload' || n.type === 'back_forward';
    return !!performance.navigation && (performance.navigation.type === 1 || performance.navigation.type === 2);
  } catch (e) { return false; }
}

export function hereSet(app, v) {
  try { if (v == null) sessionStorage.removeItem(K + app); else sessionStorage.setItem(K + app, JSON.stringify(v)); } catch (e) {}
}

export function hereGet(app) {
  if (!resumed()) { hereSet(app, null); return null; }
  try { const v = JSON.parse(sessionStorage.getItem(K + app)); return v && typeof v === 'object' ? v : null; } catch (e) { return null; }
}
