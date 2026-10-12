import { callAnonymous } from '../infrastructure/api/server'

/**
 * Forespørsel om brukerkonto før innlogging (AUTH-07), som media-lab/src/services/requests.js: skjemanøkkel når skjemaet
 * åpnes, så innsending. Ingen konto opprettes; Developer/Moderator behandler forespørselen. Svaret er det samme uansett om
 * adressen finnes. Vern på serveren: signert skjemanøkkel, felle-felt og grenser.
 */
export interface AccountRequest { name: string; phone: string; email: string; church: string; website: string }

export const REQUEST_EMAIL = /^[^@\s,;<>"]{1,64}@[^@\s,;<>"]+\.[A-Za-z]{2,}$/

/** Første feil i skjemaet (samme rekkefølge og regler som i dag), eller null. */
export function requestProblem(f: AccountRequest): 'name' | 'phone' | 'email' | 'church' | null {
  if (f.name.trim().length < 2) return 'name'
  if (!/^[0-9+ ()-]{8,20}$/.test(f.phone.trim())) return 'phone'
  if (!REQUEST_EMAIL.test(f.email.trim())) return 'email'
  if (f.church.trim().length < 2) return 'church'
  return null
}

export function createRequestService(call: typeof callAnonymous = callAnonymous) {
  return {
    formToken: async () => (await call<{ token: string }>('request.form')).token,
    submit: async (f: AccountRequest & { token: string | null }) => void (await call('request.submit', f)),
  }
}
export type RequestService = ReturnType<typeof createRequestService>
