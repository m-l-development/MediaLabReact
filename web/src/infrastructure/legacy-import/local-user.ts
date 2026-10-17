import { localStore } from '../../shared/lib/storage'

/**
 * Navnene på dagens apps lokale databaser per bruker (samme regel som media-lab/src/shared/local-user.js):
 * - Eieren av de gamle, eierløse dataene (`ch.local.owner`) bruker de opprinnelige navnene.
 * - Alle andre brukere har `<navn>@<bruker-id>`.
 * - Uten innlogging (lokal utvikling) brukes de opprinnelige navnene.
 */
export const LOCAL_OWNER_KEY = 'ch.local.owner'

export function legacyName(name: string, userId: string | null, owner: string | null = localStore.get(LOCAL_OWNER_KEY)): string {
  if (!userId) return name
  return owner === userId ? name : `${name}@${userId}`
}
