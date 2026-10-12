import type { Session as SupabaseSession, SupabaseClient } from '@supabase/supabase-js'
import type { AuthAdapter, AuthResult, Session } from '../../services/auth/types'

/** sessionId/aal fra tokenet (uverifisert – brukes bare som nøkkel for hurtigbufferen, aldri til tilgang). */
function claims(token: string): { session_id?: string; aal?: string } {
  try {
    const part = token.split('.')[1] ?? ''
    return JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/'))) as { session_id?: string; aal?: string }
  } catch {
    return {}
  }
}

export function toSession(s: SupabaseSession | null): Session | null {
  if (!s) return null
  const c = claims(s.access_token)
  return {
    accessToken: s.access_token,
    expiresAt: s.expires_at ?? 0,
    userId: s.user.id,
    email: s.user.email ?? null,
    sessionId: c.session_id ?? null,
    aal: c.aal ?? null,
  }
}

/** Nettverksfeil får egen kode, så brukeren kan få «prøv igjen». */
export function toFailure(e: unknown): { ok: false; error: string } {
  const err = e as { name?: string; status?: number; code?: string; message?: string } | null
  if (err && (err.name === 'AuthRetryableFetchError' || err.status === 0 || e instanceof TypeError)) {
    return { ok: false, error: 'network' }
  }
  return { ok: false, error: err?.code || err?.message || 'unknown' }
}

const done = (error: unknown): AuthResult => (error ? toFailure(error) : { ok: true })

export function createSupabaseAuthAdapter(client: SupabaseClient): AuthAdapter {
  const a = client.auth
  return {
    async getSession() {
      const { data } = await a.getSession()
      return toSession(data.session)
    },
    onChange(listener) {
      const { data } = a.onAuthStateChange((_event, s) => listener(toSession(s)))
      return () => data.subscription.unsubscribe()
    },
    async signIn(email, password) {
      try {
        const { error } = await a.signInWithPassword({ email, password })
        return done(error)
      } catch (e) {
        return toFailure(e)
      }
    },
    async signOut() {
      const { error } = await a.signOut({ scope: 'global' })
      if (error) await a.signOut({ scope: 'local' })
      return { ok: true }
    },
    async mfaStatus() {
      const [{ data: level }, { data: factors }] = await Promise.all([a.mfa.getAuthenticatorAssuranceLevel(), a.mfa.listFactors()])
      return {
        current: level?.currentLevel ?? null,
        next: level?.nextLevel ?? null,
        factors: (factors?.totp ?? [])
          .filter((f) => f.status === 'verified')
          .map((f) => ({ id: f.id, name: f.friendly_name || 'Autentiseringsapp' })),
      }
    },
    async mfaEnroll() {
      try {
        const { data: list } = await a.mfa.listFactors()
        for (const f of list?.all ?? []) {
          if (f.factor_type === 'totp' && f.status !== 'verified') await a.mfa.unenroll({ factorId: f.id })
        }
        const { data, error } = await a.mfa.enroll({ factorType: 'totp', friendlyName: 'ConnectHub' })
        if (error || !data) return toFailure(error)
        return { ok: true, factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret }
      } catch (e) {
        return toFailure(e)
      }
    },
    async mfaVerify(factorId, code) {
      try {
        const challenge = await a.mfa.challenge({ factorId })
        if (challenge.error) return toFailure(challenge.error)
        const { error } = await a.mfa.verify({ factorId, challengeId: challenge.data.id, code })
        return done(error)
      } catch (e) {
        return toFailure(e)
      }
    },
    async setPassword(password) {
      try {
        const { error } = await a.updateUser({ password })
        return done(error)
      } catch (e) {
        return toFailure(e)
      }
    },
    async requestPasswordReset(email, redirectTo) {
      try {
        const { error } = await a.resetPasswordForEmail(email, { redirectTo })
        return done(error)
      } catch (e) {
        return toFailure(e)
      }
    },
    async signOutOthers() {
      try {
        const { error } = await a.signOut({ scope: 'others' })
        return done(error)
      } catch (e) {
        return toFailure(e)
      }
    },
  }
}
