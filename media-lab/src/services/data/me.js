/* «Hvem er jeg» – egen bruker, aktive roller og menigheter (public.whoami() i databasen). null = ikke koblet/deaktivert. */
import { data } from '../port.js';

export async function whoami() {
  const r = await data().rpc('whoami');
  return r || null;
}

export const hasRole = (me, role, churchId) => !!me && (me.roles || []).some(r => r.role === role && (churchId == null || r.church_id === churchId));
export const isStaff = me => hasRole(me, 'developer') || hasRole(me, 'moderator');
export const isChurchAdmin = (me, churchId) => hasRole(me, 'church_admin', churchId);
/* Viser admin-inngangen: stab eller admin i minst én menighet. (Rettighetene håndheves uansett av databasen.) */
export const canAdmin = me => isStaff(me) || hasRole(me, 'church_admin');
