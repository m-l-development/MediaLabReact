/* Hvilke admin-seksjoner hver rolle ser (speiler tilgangsreglene i databasen). */
export const NAV = [
  ['oversikt', 'Oversikt'], ['brukere', 'Brukere'], ['menigheter', 'Menigheter'], ['invitasjoner', 'Invitasjoner'],
  ['filer', 'Filer'], ['samarbeid', 'Samarbeid'], ['abonnement', 'Abonnement'], ['logg', 'Logg'],
];
/* Hvilke seksjoner rollen ser. Grensesnittet speiler databasen: Developer = alt; Admin = brukere, menigheter,
   invitasjoner, filer, abonnement og logg (ikke samarbeid); Moderator = samarbeid; User = egne menigheter, filer og
   samarbeid som Moderator har gjort tilgjengelig. Rettighetene håndheves uansett av RLS og serveren. */
export function sectionsFor({ dev, collab, adminOf, churches }) {
  const s = new Set(['oversikt']);
  if (dev) NAV.forEach(([k]) => s.add(k));
  if (adminOf.length) ['brukere', 'menigheter', 'invitasjoner', 'filer', 'abonnement', 'logg'].forEach(k => s.add(k));
  if (collab) s.add('samarbeid');
  if (churches.length) ['menigheter', 'filer'].forEach(k => s.add(k));
  if (churches.some(c => !adminOf.includes(c.id))) s.add('samarbeid');
  return s;
}
