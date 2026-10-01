/* Eneste sted i appen som importerer Supabase. Bytte av leverandør = ny adapter ved siden av denne.
   Øktlagring (cookie) og innlogging settes opp i P4; til da lagres ingen økt. */
import { createClient } from '@supabase/supabase-js';
import { backend } from '../../config.js';

let client = null;

export function getClient() {
  if (!backend) throw new Error('ConnectHub-backend er ikke konfigurert for dette bygget.');
  if (!client) client = createClient(backend.url, backend.publishableKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  return client;
}
