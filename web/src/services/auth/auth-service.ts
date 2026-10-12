import { isStaff, parseMe, type Me } from '../../domain/account'
import { createStore, type Store } from '../../shared/lib/store'
import type { MessageKey } from '../../shared/i18n/messages'
import { ServiceError, withTimeout } from '../errors'
import { callAnonymous } from '../../infrastructure/api/server'
import { clearMe, readMe, sameMe, writeMe } from './me-cache'
import type { AuthAdapter, AuthState, DataAdapter, Session } from './types'

/** Cookien som sperren på serveren (media-lab/middleware.js) kontrollerer. Samme navn og regler som dagens app. */
export const AUTH_COOKIE = 'ch_at'

export interface AuthServiceDeps {
  /** null = bygget har ingen backend (bare tillatt i lokal utvikling). */
  auth: AuthAdapter | null
  data: DataAdapter | null
  dev: boolean
  writeCookie?: (session: Session | null) => void
  reload?: () => void
  timeoutMs?: number
  /** «Glemt passord» via ConnectHub-serveren (auth.recover); fallback = bruk leverandørens e-post. */
  recover?: (email: string) => Promise<{ fallback: boolean }>
  origin?: string
  /** Testrolle (PLT-16): hvordan grensesnittet skal se brukeren. Uten denne er visningen den ekte brukeren. */
  present?: (me: Me) => { me: Me; testRole: string | null }
}

export interface AuthService {
  state: Store<AuthState>
  start(): Promise<void>
  signIn(email: string, password: string): Promise<void>
  verifyMfa(code: string): Promise<void>
  startMfaSetup(): Promise<void>
  signOut(): Promise<void>
  /** Gjeldende tilgangstoken (for kall til /api/ch). */
  accessToken(): Promise<string | null>
  /**
   * «Glemt passord» (AUTH-04): svarer alltid likt utad, så det ikke avsløres om e-posten finnes. ConnectHub sender selv
   * (lenke som virker i alle nettlesere) når e-postsystemet er satt opp; ellers, eller hvis serveren ikke svarer, brukes
   * leverandørens e-post som før. Lenken går til dagens innloggingsside (RECOVERY_PATH), som er tillatt hos leverandøren.
   */
  requestPasswordReset(email: string): Promise<void>
}

/** Dagens offentlige innloggingsside, der lenkene i e-postene lander (uendret til publiseringstrinnet er godkjent). */
export const RECOVERY_PATH = '/login.dc.html'

const defaultRecover = async (email: string) => ({ fallback: !!(await callAnonymous<{ fallback?: boolean }>('auth.recover', { email }, fetch, 15000)).fallback })

export function browserCookieWriter(session: Session | null): void {
  const secs = session ? Math.max(0, Math.floor(session.expiresAt - Date.now() / 1000)) : 0
  const secure = location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = secs > 0
    ? `${AUTH_COOKIE}=${session?.accessToken}; Path=/; Max-Age=${secs}; SameSite=Lax${secure}`
    : `${AUTH_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${secure}`
}

const AUTH_ERRORS: Record<string, MessageKey> = {
  invalid_credentials: 'auth.error.invalid',
  over_request_rate_limit: 'auth.error.rateLimited',
  network: 'auth.error.network',
  timeout: 'auth.error.network',
  mfa_verification_failed: 'auth.mfa.wrong',
}

/** Oversetter en adapterfeil til en meldingsnøkkel (se shared/i18n/messages.ts). */
export const authErrorKey = (code: string): MessageKey => AUTH_ERRORS[code] ?? 'auth.error.unknown'

/**
 * Innloggingsflyten, lik dagens innloggingsside og port (media-lab/src/pages/login, src/shared/auth-gate.js):
 * økt → (MFA-kode hvis faktor finnes og nivået ikke er aal2) → whoami → (MFA-oppsett for stab uten faktor) → klar.
 */
export function createAuthService(deps: AuthServiceDeps): AuthService {
  const { auth, data, dev } = deps
  const writeCookie = deps.writeCookie ?? browserCookieWriter
  const reload = deps.reload ?? (() => location.reload())
  const timeoutMs = deps.timeoutMs ?? 20000
  const state = createStore<AuthState>({ status: 'checking' })
  const ready = (me: Me) => {
    const v = deps.present ? deps.present(me) : { me, testRole: null }
    state.set({ status: 'ready', me: v.me, realMe: me, testRole: v.testRole })
  }
  let watching = false

  async function whoami(): Promise<Me | null> {
    if (!data) return null
    const raw = await withTimeout(data.rpc('whoami'), timeoutMs)
    const parsed = parseMe(raw)
    if (!parsed.ok) throw new ServiceError('invalid', parsed.errors.join('; '))
    return parsed.value
  }

  async function session(): Promise<Session | null> {
    if (!auth) return null
    if (!watching) {
      watching = true
      auth.onChange((s) => {
        writeCookie(s)
        if (!s && state.get().status === 'ready') state.set({ status: 'signed-out' })
      })
    }
    const s = await withTimeout(auth.getSession(), timeoutMs)
    writeCookie(s)
    return s
  }

  async function proceed(): Promise<void> {
    if (!auth) return
    const mfa = await auth.mfaStatus().catch(() => null)
    const factor = mfa?.factors[0]
    if (mfa && factor && mfa.next === 'aal2' && mfa.current !== 'aal2') {
      state.set({ status: 'mfa-verify', factorId: factor.id })
      return
    }
    let me: Me | null
    try {
      me = await whoami()
    } catch {
      state.set({ status: 'offline' })
      return
    }
    if (!me) {
      clearMe()
      state.set({ status: 'not-linked' })
      return
    }
    writeMe(await session().catch(() => null), me)
    if (isStaff(me) && mfa && mfa.factors.length === 0) {
      state.set({ status: 'mfa-setup' })
      return
    }
    ready(me)
  }

  return {
    state,

    async start() {
      if (!auth || !data) {
        state.set({ status: 'no-backend', dev })
        if (dev) state.set({ status: 'ready', me: null })
        return
      }
      let s: Session | null
      try {
        s = await session()
      } catch {
        state.set({ status: 'offline' })
        return
      }
      if (!s) {
        state.set({ status: 'signed-out' })
        return
      }
      // Kjent innlogging: vis straks med forrige svar, og kontroller mot databasen like etter.
      const cached = readMe(s)
      if (cached) {
        ready(cached)
        whoami().then(
          (fresh) => {
            if (!fresh) {
              clearMe()
              state.set({ status: 'not-linked' })
              return
            }
            writeMe(s, fresh)
            if (!sameMe(fresh, cached)) reload()
          },
          () => {
            // nettfeil: appen fortsetter; data og handlinger kontrolleres uansett av databasen
          },
        )
        return
      }
      await proceed()
    },

    async signIn(email, password) {
      if (!auth) return
      const r = await auth.signIn(email.trim(), password)
      if (!r.ok) {
        state.set({ status: 'signed-out', error: authErrorKey(r.error) })
        return
      }
      await proceed()
    },

    async verifyMfa(code) {
      if (!auth) return
      const current = state.get()
      const factorId =
        current.status === 'mfa-verify' ? current.factorId
          : current.status === 'mfa-setup' ? current.enrollment?.factorId
            : undefined
      if (!factorId) return
      const r = await auth.mfaVerify(factorId, code.replace(/\s/g, ''))
      if (!r.ok) {
        const error: MessageKey = r.error === 'invalid_credentials' ? 'auth.mfa.wrong' : authErrorKey(r.error)
        if (current.status === 'mfa-verify' || current.status === 'mfa-setup') state.set({ ...current, error })
        return
      }
      await proceed()
    },

    async startMfaSetup() {
      if (!auth) return
      const r = await auth.mfaEnroll()
      if (!r.ok) {
        state.set({ status: 'mfa-setup', error: authErrorKey(r.error) })
        return
      }
      state.set({ status: 'mfa-setup', enrollment: { factorId: r.factorId, qr: r.qr, secret: r.secret } })
    },

    async signOut() {
      clearMe()
      if (auth) await auth.signOut()
      writeCookie(null)
      state.set({ status: 'signed-out' })
    },

    async requestPasswordReset(email) {
      const e = email.trim()
      let fallback = true
      try {
        fallback = (await (deps.recover ?? defaultRecover)(e)).fallback
      } catch {
        fallback = true
      }
      if (fallback && auth) await auth.requestPasswordReset(e, (deps.origin ?? location.origin) + RECOVERY_PATH + '?flow=recovery').catch(() => undefined)
    },

    async accessToken() {
      const s = await session().catch(() => null)
      return s?.accessToken ?? null
    },
  }
}
