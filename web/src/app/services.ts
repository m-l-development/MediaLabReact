import { createContext, use } from 'react'
import { backend } from '../infrastructure/config'
import { createSupabaseAuthAdapter } from '../infrastructure/supabase/auth-adapter'
import { getClient } from '../infrastructure/supabase/client'
import { createSupabaseDataAdapter } from '../infrastructure/supabase/data-adapter'
import { createAuthService, type AuthService } from '../services/auth/auth-service'
import { createCommunityService, type CommunityService } from '../services/community'
import type { Router } from './router'

/**
 * Sammenkoblingen av tjenester og adaptere (eneste sted som kjenner begge). Verktøy og komponenter får tjenestene
 * via `useServices()` og kjenner aldri leverandøren.
 */
export interface Services {
  auth: AuthService
  community: CommunityService
  router: Router
}

export function createServices(router: Router): Services {
  const client = backend ? getClient(backend) : null
  const data = client ? createSupabaseDataAdapter(client) : null
  const auth = createAuthService({
    auth: client ? createSupabaseAuthAdapter(client) : null,
    data,
    dev: import.meta.env.DEV,
  })
  return { auth, community: createCommunityService(data), router }
}

export const ServicesContext = createContext<Services | null>(null)

export function useServices(): Services {
  const services = use(ServicesContext)
  if (!services) throw new Error('useServices() må brukes inne i <ServicesContext>')
  return services
}
