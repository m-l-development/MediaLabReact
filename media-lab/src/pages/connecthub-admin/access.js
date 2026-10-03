/* Hvilke admin-seksjoner hver rolle ser (speiler tilgangsreglene i databasen). */
export const NAV = [
  ['oversikt', 'Oversikt'], ['brukere', 'Brukere'], ['menigheter', 'Menigheter'], ['invitasjoner', 'Invitasjoner'],
  ['filer', 'Filer'], ['samarbeid', 'Samarbeid'], ['abonnement', 'Abonnement'], ['tilbakemeldinger', 'Tilbakemeldinger'],
  ['opprydning', 'Opprydning'], ['foresporsler', 'Forespørsler'], ['mail', 'Mail'], ['logg', 'Logg'],
];
/* Hvilke seksjoner rollen ser – eksplisitt per rolle, ingen arv. Grensesnittet speiler databasen
   (migreringene 20261004100000_moderator_access.sql og 20261006100000_dev_collab_cleanup_roles.sql):
   - Developer: systemadministrasjon (brukere, menigheter, invitasjoner, filer, abonnement, tilbakemeldinger, opprydning,
     Mail (e-postmaler og logo), logg) og Samarbeid (koblinger mellom menigheter, som Moderator). Filer vises bare i menigheter der Developer er medlem (A1).
     I tillegg (ikke en meny): utviklerkortet / «Åpne ConnectHub Dev» og å gi/fjerne/invitere Developer og Moderator.
   - Moderator: den samme systemadministrasjonen og Samarbeid. Filer som Developer (A1/A2).
   - Admin: brukere, menigheter, invitasjoner, filer (inkl. Samarbeidsfiler), abonnement og logg i egen menighet.
   - User: egne menigheter og filer (inkl. Samarbeidsfiler i koblinger menigheten er med i).
   Rettighetene håndheves uansett av RLS og serveren. */
const SYSTEM = ['oversikt', 'brukere', 'menigheter', 'invitasjoner', 'filer', 'samarbeid', 'abonnement', 'tilbakemeldinger', 'opprydning', 'foresporsler', 'mail', 'logg'];
export const SECTIONS = {
  developer: SYSTEM,
  moderator: SYSTEM,
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
