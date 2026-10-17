import { callServer } from '../infrastructure/api/server'
import type { AuthAdapter, DataAdapter } from './auth/types'
import { ServiceError } from './errors'

/**
 * Kontomenyens tjenester (AUTH-05, AUTH-08), samme kall og regler som dagens app (media-lab/src/services/community.js,
 * auth.js og account-menu.js). Databasen og serveren avgjør alle rettigheter; ingenting her gir tilgang.
 */
export interface Notification {
  id: string
  kind: string | null
  title: string
  body: string | null
  link: string | null
  church_id: string | null
  read_at: string | null
  created_at: string
}
export interface EmailPrefs { on: boolean; notify_email: string | null; account_email: string }

/** Passordkravene (samme som dagens passwordChecks/passwordProblem og Supabase Auth). */
export function passwordChecks(pw: string, pw2: string): { key: 'len' | 'mix' | 'same'; ok: boolean }[] {
  return [
    { key: 'len', ok: pw.length >= 10 },
    { key: 'mix', ok: /[A-Za-zÆØÅæøå]/.test(pw) && /\d/.test(pw) },
    { key: 'same', ok: pw.length > 0 && pw === pw2 },
  ]
}
export function passwordProblem(pw: string): 'short' | 'mix' | null {
  if (pw.length < 10) return 'short'
  if (!/[A-Za-zÆØÅæøå]/.test(pw) || !/\d/.test(pw)) return 'mix'
  return null
}
export const validNotifyEmail = (v: string): boolean => /^[^@\s,;<>"]{1,64}@[a-z0-9.-]{1,253}\.[a-z]{2,}$/.test(v)

/** Resultat av «Bytt passord»: en kode som grensesnittet oversetter. */
export type PasswordResult =
  | { ok: true }
  | { ok: false; error: 'old_missing' | 'short' | 'mix' | 'not_same' | 'code_missing' | 'invalid_credentials' | 'wrong_code' | 'same_password' | 'weak_password' | 'over_request_rate_limit' | 'network' | 'unknown' }

const KNOWN = ['invalid_credentials', 'same_password', 'weak_password', 'over_request_rate_limit', 'network'] as const
const known = (e: string) => ((KNOWN as readonly string[]).includes(e) ? (e as (typeof KNOWN)[number]) : 'unknown')

export interface AccountDeps {
  auth: AuthAdapter | null
  data: DataAdapter | null
  token: () => Promise<string | null>
  server?: typeof callServer
}

export function createAccountService(d: AccountDeps) {
  const data = () => {
    if (!d.data) throw new ServiceError('unavailable')
    return d.data
  }
  const auth = () => {
    if (!d.auth) throw new ServiceError('unavailable')
    return d.auth
  }
  const server = d.server ?? callServer
  return {
    available: () => !!d.data && !!d.auth,

    notifications: {
      list: async () => data().select<Notification>('notifications', { columns: 'id, kind, title, body, link, church_id, read_at, created_at', order: 'created_at', desc: true, limit: 50 }),
      markRead: async (id: string) => data().update('notifications', { id }, { read_at: new Date().toISOString() }),
      async markAllRead(list: Notification[]) {
        for (const n of list.filter((x) => !x.read_at)) await data().update('notifications', { id: n.id }, { read_at: new Date().toISOString() })
      },
    },

    /** E-postvarsler: bare Developer og Moderator med MFA (databasen avviser andre). */
    emailPrefs: {
      get: async () => data().rpc<EmailPrefs>('my_email_prefs'),
      /** Tom = kontoens adresse. Innloggingsadressen endres aldri. */
      setAddress: async (email: string | null) => data().rpc<string>('set_my_notify_email', { p_email: email || null }),
      set: async (on: boolean) => data().rpc<boolean>('set_my_email_optional', { p_on: on }),
    },

    /** «Last ned mine data»: det ConnectHub har om brukeren (JSON). Prosjekter og videoer ligger bare lokalt. */
    exportMine: async () => data().rpc<Record<string, unknown>>('export_my_data'),

    /**
     * «Slett kontoen min»: serveren kontrollerer innloggingen (token) og bekreftelsen, databasen stopper den siste
     * Developer (prepare_account_deletion), og serveren sletter private filer, ConnectHub-brukeren og innloggingskontoen.
     */
    async deleteMe(): Promise<void> {
      await server(await d.token(), 'privacy.delete_me', { confirm: 'SLETT' })
    },

    /**
     * «Bytt passord»: det gamle passordet kontrolleres med en ny innlogging (også leverandørens krav om fersk
     * innlogging), kode fra autentiseringsappen når kontoen har MFA (aal2), og andre økter logges ut etterpå.
     */
    async changePassword(i: { email: string; old: string; next: string; confirm: string; code: string; factorId: string | null }): Promise<PasswordResult> {
      if (!i.old) return { ok: false, error: 'old_missing' }
      const p = passwordProblem(i.next)
      if (p) return { ok: false, error: p }
      if (i.next !== i.confirm) return { ok: false, error: 'not_same' }
      const code = i.code.replace(/\s/g, '')
      if (i.factorId && !/^\d{6}$/.test(code)) return { ok: false, error: 'code_missing' }
      const a = auth()
      const r = await a.signIn(i.email, i.old)
      if (!r.ok) return { ok: false, error: known(r.error) }
      if (i.factorId) {
        const v = await a.mfaVerify(i.factorId, code)
        if (!v.ok) return { ok: false, error: 'wrong_code' }
      }
      const u = await a.setPassword(i.next)
      if (!u.ok) return { ok: false, error: known(u.error) }
      await a.signOutOthers().catch(() => undefined)
      return { ok: true }
    },

    /** Første MFA-faktor (for kodefeltet i «Bytt passord»), eller null. */
    async mfaFactor(): Promise<string | null> {
      try {
        return (await auth().mfaStatus()).factors[0]?.id ?? null
      } catch {
        return null
      }
    },
  }
}
export type AccountService = ReturnType<typeof createAccountService>

/** Laster ned et objekt som JSON-fil (som downloadJson i dagens app). */
export function downloadJson(obj: unknown, name: string): void {
  const a = document.createElement('a')
  const u = URL.createObjectURL(new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' }))
  a.href = u
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(u), 30000)
}
