import { callAnonymous, callServer } from '../infrastructure/api/server'
import type { DataAdapter } from './auth/types'
import { ServiceError } from './errors'

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

/** Innboksen «Forespørsler» (ADM-06): bare Developer og Moderator med MFA – databasefunksjonene avgjør. */
export interface AccountRequestRow {
  id: string; name: string; phone: string | null; email: string | null; church_text: string | null; status: string; created_at: string
  resubmits: number; anonymized: boolean; existing_user_id: string | null; existing_user_name: string | null
  decided_at: string | null; decided_by_name: string | null; decision_note: string | null
}
export interface RequestEvent { kind: string; old_status?: string; new_status?: string; text?: string | null; created_at: string; actor_name?: string | null }
export interface Approval { mode: 'new' | 'existing' | 'none'; churchName: string; churchId: string; role: string }

export function createRequestInbox(d: DataAdapter | null, token: () => Promise<string | null>, server: typeof callServer = callServer) {
  const data = () => {
    if (!d) throw new ServiceError('unavailable')
    return d
  }
  return {
    list: async () => data().rpc<AccountRequestRow[]>('account_requests_list'),
    events: async (id: string) => data().rpc<RequestEvent[]>('account_request_events_for', { p_id: id }),
    setStatus: async (id: string, status: string) => data().rpc('set_account_request_status', { p_id: id, p_status: status }),
    addNote: async (id: string, note: string) => data().rpc('add_account_request_note', { p_id: id, p_note: note }),
    reject: async (id: string, reason: string) => data().rpc('reject_account_request', { p_id: id, p_reason: reason }),
    remove: async (id: string) => data().rpc('delete_account_request', { p_id: id }),
    /** Velkomstmailen sendes av serveren. mode: new | existing | none. */
    approve: async (id: string, a: Approval) => server<{ invitation?: unknown; email_sent?: boolean }>(await token(), 'request.approve', { id, mode: a.mode, church_name: a.churchName || null, church_id: a.churchId || null, role: a.role }),
    /** Mail-fanen: ekstra varslingsadresser (høyst 3). */
    setNotifyExtra: async (emails: string[]) => data().rpc('set_mail_notify_extra', { p_emails: emails }),
  }
}
export type RequestInbox = ReturnType<typeof createRequestInbox>
