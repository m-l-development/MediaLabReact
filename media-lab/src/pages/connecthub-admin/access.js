/* Hvilke admin-seksjoner hver rolle ser (speiler tilgangsreglene i databasen). */
export const NAV = [
  ['oversikt', 'Oversikt'], ['brukere', 'Brukere'], ['menigheter', 'Menigheter'], ['invitasjoner', 'Invitasjoner'],
  ['filer', 'Filer'], ['samarbeid', 'Samarbeid'], ['abonnement', 'Abonnement'], ['tilbakemeldinger', 'Tilbakemeldinger'], ['logg', 'Logg'],
];
/* Hvilke seksjoner rollen ser – eksplisitt per rolle, ingen arv. Grensesnittet speiler databasen
   (migrering 20261004100000_moderator_access.sql):
   - Developer: systemadministrasjon (brukere, menigheter, invitasjoner, filer, abonnement, tilbakemeldinger, logg) –
     ikke Samarbeid (koblinger administreres av Moderator). Filer vises bare i menigheter der Developer er medlem (A1).
   - Moderator: den samme systemadministrasjonen OG Samarbeid. Ikke utviklerkortet / «Åpne ConnectHub Dev», og kan ikke
     gi, fjerne eller invitere Developer/Moderator (håndheves i databasen). Filer som Developer (A1/A2).
   - Admin: brukere, menigheter, invitasjoner, filer (inkl. Samarbeidsfiler), abonnement og logg i egen menighet.
   - User: egne menigheter og filer (inkl. Samarbeidsfiler i koblinger menigheten er med i).
   Rettighetene håndheves uansett av RLS og serveren. */
const SYSTEM = ['oversikt', 'brukere', 'menigheter', 'invitasjoner', 'filer', 'abonnement', 'tilbakemeldinger', 'logg'];
export const SECTIONS = {
  developer: SYSTEM,
  moderator: [...SYSTEM, 'samarbeid'],
  admin: ['oversikt', 'brukere', 'menigheter', 'invitasjoner', 'filer', 'abonnement', 'logg'],
  member: ['oversikt', 'menigheter', 'filer'],
};
export function sectionsFor({ dev, collab, adminOf, churches }) {
  const s = new Set(['oversikt']), add = k => SECTIONS[k].forEach(x => s.add(x));
  if (dev) add('developer');
  if (collab) add('moderator');
  if (adminOf.length) add('admin');
  if (churches.length) add('member');
  return s;
}

/* Tittelen i toppfeltet viser den innloggede rollen (den effektive rollen, så rollebytteren i dev vises også). */
const BRAND = { developer: 'DEVELOPER', moderator: 'MODERATOR', admin: 'ADMIN', user: 'BRUKER' };
export const brandOf = kind => 'CONNECTHUB · ' + (BRAND[kind] || BRAND.user);
