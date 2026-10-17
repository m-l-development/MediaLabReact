import type { Me } from '../domain/account'
import { effectiveMe, realView, switcherAllowed, TEST_ROLE_KEY, type View } from '../domain/test-role'
import { backend, devRef } from '../infrastructure/config'
import { sessionStore } from '../shared/lib/storage'

/** Rollebytteren er bare med i bygg mot utviklingsprosjektet (lokalt og Preview), aldri i produksjon. */
export const testRoleAllowed = switcherAllowed(backend, devRef)

/** Valgt visning gjelder fanen (sessionStorage), som i dagens app. */
export function presentTestRole(me: Me, allowed = testRoleAllowed): { me: Me; testRole: string | null } {
  if (!allowed) return { me, testRole: null }
  const view = sessionStore.get(TEST_ROLE_KEY)
  const eff = effectiveMe(me, view)
  return { me: eff, testRole: eff !== me ? view : null }
}

/** Bytter visning og laster siden på nytt, så alle verktøy starter med samme visning. */
export function setTestRole(view: View | null, realMe: Me, reload: () => void = () => location.reload()): void {
  if (!view || view === realView(realMe)) sessionStore.remove(TEST_ROLE_KEY)
  else sessionStore.set(TEST_ROLE_KEY, view)
  reload()
}
