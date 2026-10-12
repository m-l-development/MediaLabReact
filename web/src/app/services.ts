import { createContext, use } from 'react'
import { backend } from '../infrastructure/config'
import { createSupabaseAuthAdapter } from '../infrastructure/supabase/auth-adapter'
import { getClient } from '../infrastructure/supabase/client'
import { createSupabaseDataAdapter } from '../infrastructure/supabase/data-adapter'
import { createAuthService, type AuthService } from '../services/auth/auth-service'
import { createCommunityService, type CommunityService } from '../services/community'
import { createFilesService, type FilesService } from '../services/files'
import { createChurchSettings, type ChurchSettingsService } from '../services/shared-setup'
import { createFeedbackService, type FeedbackService } from '../services/feedback'
import { createAccountService, type AccountService } from '../services/account'
import { createRequestService, type RequestService } from '../services/requests'
import type { Router } from './router'
import { presentTestRole } from './test-role'

/**
 * Sammenkoblingen av tjenester og adaptere (eneste sted som kjenner begge). Verktøy og komponenter får tjenestene
 * via `useServices()` og kjenner aldri leverandøren.
 */
export interface Services {
  auth: AuthService
  community: CommunityService
  files: FilesService
  /** Menighetens felles grunnoppsett (church_settings). */
  churchSettings: ChurchSettingsService
  /** Tilbakemeldinger (PLT-21). */
  feedback: FeedbackService
  /** Kontomenyen: varsler, e-postvarsler, passord, eksport og sletting (AUTH-05, AUTH-08). */
  account: AccountService
  /** Forespørsel om konto før innlogging (AUTH-07). */
  requests: RequestService
  router: Router
}

export function createServices(router: Router): Services {
  const client = backend ? getClient(backend) : null
  const data = client ? createSupabaseDataAdapter(client) : null
  const authAdapter = client ? createSupabaseAuthAdapter(client) : null
  const auth = createAuthService({
    auth: authAdapter,
    data,
    dev: import.meta.env.DEV,
    present: (me) => presentTestRole(me),
  })
  return { auth, community: createCommunityService(data), files: createFilesService(data, () => auth.accessToken()), churchSettings: createChurchSettings(data), feedback: createFeedbackService(data), account: createAccountService({ auth: authAdapter, data, token: () => auth.accessToken() }), requests: createRequestService(), router }
}

export const ServicesContext = createContext<Services | null>(null)

export function useServices(): Services {
  const services = use(ServicesContext)
  if (!services) throw new Error('useServices() må brukes inne i <ServicesContext>')
  return services
}
