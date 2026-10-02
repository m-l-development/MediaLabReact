/* Hvilke admin-seksjoner hver rolle ser (speiler tilgangsreglene i databasen). */
export const NAV = [
  ['oversikt', 'Oversikt'], ['brukere', 'Brukere'], ['menigheter', 'Menigheter'], ['invitasjoner', 'Invitasjoner'],
  ['filer', 'Filer'], ['samarbeid', 'Samarbeid'], ['abonnement', 'Abonnement'], ['tilbakemeldinger', 'Tilbakemeldinger'], ['logg', 'Logg'],
];
/* Hvilke seksjoner rollen ser. Grensesnittet speiler databasen (trinn 18):
   - Developer: systemadministrasjon (brukere, menigheter, invitasjoner, filer, abonnement, logg) – ikke Samarbeid
     (koblinger administreres bare av Moderator). Filer vises bare i menigheter der Developer er medlem (A1).
   - Moderator: Samarbeid (koblinger mellom to menigheter, bare metadata for filer) og Tilbakemeldinger.
   - Tilbakemeldinger (innboksen): bare Developer og Moderator. Alle innloggede kan SENDE inn (knappen på alle sider).
   - Admin: brukere, menigheter, invitasjoner, filer (inkl. Samarbeidsfiler), abonnement og logg i egen menighet.
   - User: egne menigheter og filer (inkl. Samarbeidsfiler i koblinger menigheten er med i).
   Rettighetene håndheves uansett av RLS og serveren. */
export function sectionsFor({ dev, collab, adminOf, churches }) {
  const s = new Set(['oversikt']);
  if (dev) NAV.forEach(([k]) => { if (k !== 'samarbeid') s.add(k); });
  if (adminOf.length) ['brukere', 'menigheter', 'invitasjoner', 'filer', 'abonnement', 'logg'].forEach(k => s.add(k));
  if (collab) { s.add('samarbeid'); s.add('tilbakemeldinger'); }
  if (churches.length) ['menigheter', 'filer'].forEach(k => s.add(k));
  return s;
}
