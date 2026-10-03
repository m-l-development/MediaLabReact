/* Snarveier fra forsiden til ConnectHub-mappene: «Fellesmappe» for alle som er medlem av en menighet, og «Samarbeidsmappe»
   bare når en av brukerens menigheter er aktivt medlem av en aktiv samarbeidsgruppe (databasen gir bare egne grupper).
   Knappene er bare snarveier – tilgangen kontrolleres av databasen og serveren. Tekstene oversettes av i18n.js som resten av siden. */
import React from 'react';
import { links as LK } from '../../services/community.js';

const PATH = 'M3 6.5A1.5 1.5 0 0 1 4.5 5h4.2l2 2.2h8.8A1.5 1.5 0 0 1 21 8.7v9.8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z';
const Icon = ({ collab }) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
  <path d={PATH} />{collab && <><circle cx="9.6" cy="12.6" r="1.7" /><circle cx="14.4" cy="12.6" r="1.7" /><path d="M7 17.2c.5-1.2 1.4-1.8 2.6-1.8s2.1.6 2.4 1.4c.3-.8 1.2-1.4 2.4-1.4s2.1.6 2.6 1.8" /></>}</svg>;
const pill = color => ({ display: 'inline-flex', alignItems: 'center', gap: '10px', height: '44px', padding: '0 20px', border: '1px solid var(--ml-line, rgba(255,255,255,0.16))',
  borderLeft: '3px solid ' + color, borderRadius: '999px', background: 'var(--ml-card, rgba(12,12,12,0.55))', backdropFilter: 'blur(14px)', color: 'var(--ml-fg, #f3f1ec)',
  fontSize: '12.5px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', textDecoration: 'none' });

export default function FolderLinks() {
  const me = window.CH && window.CH.me;
  const member = !!(me && (me.churches || []).length);
  const [collab, setCollab] = React.useState(false);
  React.useEffect(() => {
    if (!member) return undefined;
    let live = true;
    LK.mine().then(l => { if (live) setCollab((l || []).some(g => g.status === 'active' && g.my_church)); }, () => {});
    return () => { live = false; };
  }, [member]);
  if (!member) return null;
  return <nav aria-label="Mapper" data-ch-home-folders style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '12px', width: '100%', maxWidth: '1000px' }}>
    <a href="connecthub-admin.dc.html#/filer/felles" data-ch-folder="felles" style={pill('#e0a43a')}><Icon />Fellesmappe</a>
    {collab && <a href="connecthub-admin.dc.html#/filer/samarbeid" data-ch-folder="samarbeid" style={pill('#3fb8a8')}><Icon collab />Samarbeidsmappe</a>}
  </nav>;
}
