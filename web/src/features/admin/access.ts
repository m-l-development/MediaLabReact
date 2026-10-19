/**
 * Hvilke admin-seksjoner hver rolle ser (speiler tilgangsreglene i databasen), samme regler som
 * media-lab/src/pages/connecthub-admin/access.js. Rettighetene håndheves uansett av RLS og serveren.
 * - Developer: systemadministrasjon og Samarbeid; i tillegg utviklerkortet og å gi/fjerne/invitere Developer og Moderator.
 * - Moderator: den samme systemadministrasjonen og Samarbeid.
 * - Admin: brukere, menigheter, Admin-tilgang (forespørsler fra Developer/Moderator), invitasjoner, filer, abonnement og logg i egen menighet.
 * - User: egne menigheter og filer.
 */
export const NAV = [
  ['oversikt', 'Oversikt'], ['brukere', 'Brukere'], ['menigheter', 'Menigheter'], ['tilgang', 'Admin-tilgang'], ['invitasjoner', 'Invitasjoner'],
  ['filer', 'Filer'], ['samarbeid', 'Samarbeid'], ['abonnement', 'Abonnement'], ['tilbakemeldinger', 'Tilbakemeldinger'],
  ['opprydning', 'Opprydning'], ['foresporsler', 'Forespørsler'], ['mail', 'Mail'], ['logg', 'Logg'],
] as const
export type Section = (typeof NAV)[number][0]
export const isSection = (s: string): s is Section => NAV.some(([k]) => k === s)

const SYSTEM: Section[] = ['oversikt', 'brukere', 'menigheter', 'tilgang', 'invitasjoner', 'filer', 'samarbeid', 'abonnement', 'tilbakemeldinger', 'opprydning', 'foresporsler', 'mail', 'logg']
export const SECTIONS: Record<'developer' | 'moderator' | 'admin' | 'member', Section[]> = {
  developer: SYSTEM,
  moderator: SYSTEM,
  admin: ['oversikt', 'brukere', 'menigheter', 'tilgang', 'invitasjoner', 'filer', 'abonnement', 'logg'],
  member: ['oversikt', 'menigheter', 'filer'],
}

export function sectionsFor(o: { dev: boolean; collab: boolean; adminOf: string[]; churches: unknown[] }): Set<Section> {
  const s = new Set<Section>(['oversikt'])
  const add = (k: keyof typeof SECTIONS) => SECTIONS[k].forEach((x) => s.add(x))
  if (o.dev) add('developer')
  if (o.collab) add('moderator')
  if (o.adminOf.length) add('admin')
  if (o.churches.length) add('member')
  return s
}

export type Kind = 'developer' | 'moderator' | 'admin' | 'user'
const BRAND: Record<Kind, string> = { developer: 'DEVELOPER', moderator: 'MODERATOR', admin: 'ADMIN', user: 'BRUKER' }
/** Tittelen i toppfeltet viser den innloggede (effektive) rollen. Ukjent rolle viser aldri mer enn Bruker. */
export const brandOf = (kind: string | undefined): string => 'CONNECTHUB · ' + (BRAND[kind as Kind] ?? BRAND.user)
