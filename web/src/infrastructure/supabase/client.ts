import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { BackendConfig } from '../config'

/**
 * Eneste sted i den nye appen som importerer Supabase. Samme oppsett som dagens app
 * (media-lab/src/services/adapters/supabase/client.js): økten ligger under nøkkelen `ch.auth`, så en innlogging i
 * dagens app gjelder også i den nye (samme domene), og omvendt.
 */
let client: SupabaseClient | null = null

export function getClient(config: BackendConfig): SupabaseClient {
  client ??= createClient(config.url, config.publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, flowType: 'pkce', storageKey: 'ch.auth' },
  })
  return client
}
