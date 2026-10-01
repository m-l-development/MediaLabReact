/* «Hvem er jeg» – egen bruker, aktive roller og menigheter (public.whoami() i databasen). null = ikke koblet/deaktivert. */
import { getClient } from '../adapters/supabase/client.js';

export async function whoami() {
  const { data, error } = await getClient().rpc('whoami');
  if (error) throw new Error('whoami: ' + (error.code || error.message));
  return data || null;
}

export const hasRole = (me, role, churchId) => !!me && (me.roles || []).some(r => r.role === role && (churchId == null || r.church_id === churchId));
export const isStaff = me => hasRole(me, 'developer') || hasRole(me, 'moderator');
