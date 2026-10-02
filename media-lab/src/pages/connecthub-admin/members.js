/* Medlemskap i ConnectHub Admin: felles regler, tekster og bekreftelser for brukersiden og menighetens medlemsliste.
   Rettighetene avgjøres uansett av databasen (én menighet om gangen for User/Admin, remove_membership, RLS). */
import { admin } from '../../services/admin.js';

const tr = s => (typeof window !== 'undefined' && window.MLI18N && window.MLI18N.t ? window.MLI18N.t(s) : s);
/* Hele setninger med plassholdere ({name}, {church}) – så oversettelsen aldri består av løsrevne ordbiter. */
export const fill = (t, v) => String(t).replace(/\{(\w+)\}/g, (m, k) => (k in v ? v[k] : m));
const cancelled = () => Object.assign(new Error('cancel'), { code: 'cancel' });
const ask = text => { if (typeof confirm === 'function' && !confirm(text)) throw cancelled(); };

/* Developer og Moderator kan være medlem av flere menigheter; alle andre bare én om gangen. */
export const isGlobal = roles => (roles || []).some(r => !r.church_id && (r.role === 'developer' || r.role === 'moderator') && !r.revoked_at);
export const activeOf = (memberships, userId) => (memberships || []).filter(m => m.user_id === userId && m.status === 'active');

/* Kort rolleoppsummering for én bruker: «Developer», «Moderator», «Admin i X», ellers «Bruker». */
export function roleSummary(roles, churchName) {
  const rs = (roles || []).filter(r => !r.revoked_at);
  const parts = [];
  if (rs.some(r => r.role === 'developer' && !r.church_id)) parts.push(tr('Developer'));
  if (rs.some(r => r.role === 'moderator' && !r.church_id)) parts.push(tr('Moderator'));
  rs.filter(r => r.role === 'church_admin').forEach(r => parts.push(fill(tr('Admin i {church}'), { church: churchName(r.church_id) })));
  return parts.length ? parts.join(', ') : tr('Bruker');
}

/* Kan brukeren legges til i en ny menighet? { ok, reason } – reason forklarer hvorfor ikke. */
export function canJoinAnother(roles, memberships, userId, churchName) {
  if (isGlobal(roles)) return { ok: true };
  const act = activeOf(memberships, userId);
  if (!act.length) return { ok: true };
  return { ok: false, reason: fill(tr('En bruker kan bare være medlem av én menighet om gangen. Fjern brukeren fra {church} først.'), { church: churchName(act[0].church_id) }) };
}

/* Kan den globale rollen r fjernes? Ikke hvis det er brukerens siste globale rolle og brukeren har mer enn ett aktivt
   medlemskap (som User/Admin er grensen én menighet). Databasen håndhever det samme (CH004). */
export const roleBlocked = (globalRoles, r, activeCount) =>
  !(globalRoles || []).some(g => g.id !== r.id && !g.revoked_at && (g.role === 'developer' || g.role === 'moderator')) && activeCount > 1;

/* Fornavn/etternavn til skjemaet: de lagrede feltene, ellers et forslag ut fra visningsnavnet (siste ord = etternavn). */
export function splitName(u) {
  if (!u) return { first: '', last: '' };
  if (u.first_name || u.last_name) return { first: u.first_name || '', last: u.last_name || '' };
  const parts = String(u.full_name || '').trim().split(/\s+/).filter(Boolean);
  return parts.length > 1 ? { first: parts.slice(0, -1).join(' '), last: parts[parts.length - 1] } : { first: parts[0] || '', last: '' };
}
/* Samme regler som databasen (set_user_name): minst ett av feltene, høyst 60 tegn, ingen kontrolltegn eller < >. */
export function nameError(first, last) {
  const f = String(first || '').trim(), l = String(last || '').trim();
  if (!f && !l) return 'Skriv fornavn eller etternavn.';
  if (f.length > 60 || l.length > 60) return 'Navnet er for langt (maks 60 tegn).';
  if (/[\u0000-\u001f\u007f<>]/.test(f + l)) return 'Navnet inneholder ugyldige tegn.';
  return null;
}
/* «Velkommen, …»: fornavn + etternavn, ellers visningsnavnet, ellers delen av e-posten før @. */
export function welcomeName(me) {
  if (!me) return '';
  const fl = [me.first_name, me.last_name].map(x => String(x || '').trim()).filter(Boolean).join(' ');
  return fl || String(me.full_name || '').trim() || String(me.email || '').split('@')[0];
}
/* Hovedrollen til visning: Developer > Moderator > Admin > Bruker. */
export function mainRole(roles) {
  const rs = (roles || []).filter(r => !r.revoked_at);
  return rs.some(r => r.role === 'developer') ? 'Developer' : rs.some(r => r.role === 'moderator') ? 'Moderator' : rs.some(r => r.role === 'church_admin') ? 'Admin' : 'Bruker';
}

export function removeConfirmText({ name, church, isAdmin }) {
  const lines = [fill(tr('Fjerne {name} fra {church}?'), { name, church }), '',
    tr('Brukeren mister med en gang tilgang til menighetens filer, data og funksjoner. Kontoen slettes ikke, og historikken beholdes. Brukeren kan inviteres på nytt senere.')];
  if (isAdmin) lines.push('', fill(tr('{name} er Admin i {church}. Admin-rollen fjernes også, og menigheten står uten Admin til Developer eller Moderator utnevner en ny.'), { name, church }));
  return lines.join('\n');
}

/* Handlinger med bekreftelse. Returnerer meldingen som skal vises når handlingen er lagret. */
export const memberActions = {
  async remove({ userId, churchId, name, church, isAdmin }) {
    ask(removeConfirmText({ name, church, isAdmin }));
    const r = await admin.removeMembership(userId, churchId, 'Fjernet i ConnectHub Admin', isAdmin);
    return fill(tr('{name} er fjernet fra {church}.'), { name, church }) +
      (r && r.admin_role_revoked ? ' ' + tr('Menigheten har nå ingen Admin.') : '') +
      (r && r.active_memberships_left === 0 ? ' ' + tr('Brukeren har nå ingen aktiv menighet.') : '');
  },
  async disable({ userId, churchId, name, church }) {
    ask(fill(tr('Deaktivere {name} midlertidig i {church}?'), { name, church }) + '\n\n' + tr('Brukeren mister tilgang til menigheten til medlemskapet aktiveres igjen. Ingenting slettes.'));
    await admin.setMembershipStatus(userId, churchId, 'disabled');
    return tr('Medlemskapet er deaktivert.');
  },
  async revokeAdmin({ roleId, name, church }) {
    ask(fill(tr('Fjerne Admin-rollen fra {name} i {church}?'), { name, church }) + '\n\n' + tr('Brukeren blir vanlig medlem. Menigheten står uten Admin til en ny utnevnes.'));
    await admin.revokeRole(roleId, 'Admin-siden');
    return tr('Admin-rollen er fjernet.');
  },
};
