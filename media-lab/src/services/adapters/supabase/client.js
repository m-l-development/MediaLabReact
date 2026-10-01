/* Eneste sted i appen som importerer Supabase. Bytte av leverandør = ny adapter ved siden av denne.
   Økten lagres i nettleseren (nøkkel ch.auth) med PKCE-flyt; auth.js speiler tilgangstokenet til en kortlivet cookie
   som sperren på serveren (middleware.js) kontrollerer. */
import { createClient } from '@supabase/supabase-js';
import { backend } from '../../config.js';

let client = null;

export function getClient() {
  if (!backend) throw new Error('ConnectHub-backend er ikke konfigurert for dette bygget.');
  if (!client) client = createClient(backend.url, backend.publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, flowType: 'pkce', storageKey: 'ch.auth' },
  });
  return client;
}
