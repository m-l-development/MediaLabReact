/* Felles byggeklosser og tekster for ConnectHub-admin. Stil i admin.css. */
import React from 'react';

export const T = s => (window.MLI18N && window.MLI18N.t ? window.MLI18N.t(s) : s);
const ERR = {
  forbidden: 'Du har ikke tilgang til dette.', conflict: 'Finnes allerede (eller menigheten har allerede en admin).',
  invalid: 'Ugyldige opplysninger.', rate_limited: 'For mange forsøk. Vent litt.', network: 'Ingen forbindelse. Prøv igjen.',
  unauthorized: 'Økten er utløpt. Last siden på nytt.', not_found: 'Fant ikke det du lette etter.',
  video_not_allowed: 'Video kan aldri lastes opp. Videoer skal ligge i prosjektmappen på PC-en.', type_not_allowed: 'Bare bilder (PNG, JPG, WebP eller GIF) kan lastes opp.',
  too_large: 'Filen er for stor (maks 4 MB).', http_413: 'Filen er for stor (maks 4 MB).',
};
const CONFIG = { publishable_key_missing: 'Serveren mangler den offentlige nøkkelen.', secret_key_missing: 'Serveren mangler den hemmelige nøkkelen.' };
export const errText = e => {
  if (e && e.code === 'not_configured') return T('Serveren er ikke satt opp for dette.') + (CONFIG[e.message] ? ' ' + T(CONFIG[e.message]) : '');
  return T(ERR[e && e.code] || 'Noe gikk galt. Prøv igjen.');
};
export const ROLE = { user: 'Bruker', church_admin: 'Admin', moderator: 'Moderator', developer: 'Developer' };
export const STATUS = { active: 'Aktiv', disabled: 'Deaktivert', pending: 'Venter', accepted: 'Godtatt', revoked: 'Trukket tilbake', expired: 'Utløpt', invited: 'Invitert', left: 'Har forlatt', declined: 'Avslått', approved: 'Godkjent', rejected: 'Avslått', withdrawn: 'Trukket tilbake', cancelled: 'Avsluttet', temporarily_disabled: 'Midlertidig deaktivert', pending_deletion: 'Venter på sletting', deleted: 'Slettet' };
const TONE = { active: 'ok', accepted: 'ok', approved: 'ok', pending: 'warn', invited: 'warn', temporarily_disabled: 'warn', pending_deletion: 'bad', disabled: 'bad', revoked: '', expired: '', rejected: 'bad', declined: '', left: '', withdrawn: '' };
export const fmt = d => d ? new Date(d).toLocaleString(document.documentElement.lang === 'en' ? 'en-GB' : 'nb-NO', { dateStyle: 'short', timeStyle: 'short' }) : '';
export const fmtDate = d => d ? new Date(d).toLocaleDateString(document.documentElement.lang === 'en' ? 'en-GB' : 'nb-NO', { dateStyle: 'medium' }) : '';
export const mb = n => (Number(n || 0) / 1048576).toFixed(1) + ' MB';
export const initials = s => String(s || '?').trim().split(/[\s@.]+/).filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();
export const norm = s => String(s || '').toLowerCase();

export const Btn = ({ kind, small, children, ...p }) => <button type="button" className={'ch-btn' + (kind ? ' ' + kind : '') + (small ? ' small' : '')} {...p}>{children}</button>;
export const Badge = ({ tone, children }) => <span className={'ch-badge' + (tone ? ' ' + tone : '')}>{children}</span>;
export const StatusBadge = ({ s }) => <Badge tone={TONE[s]}>{T(STATUS[s] || s)}</Badge>;
export const RoleBadge = ({ r, church }) => <Badge tone="role">{T(ROLE[r] || r)}{church ? ' · ' + church : ''}</Badge>;
export const Avatar = ({ name }) => <span className="ch-avatar" aria-hidden="true">{initials(name)}</span>;
export const Card = ({ title, sub, actions, children }) => <section className="ch-card">
  {(title || actions) && <div className="ch-row">{title && <h2>{T(title)}{sub != null && <small>{sub}</small>}</h2>}{actions && <div className="ch-row" style={{ marginLeft: 'auto' }}>{actions}</div>}</div>}
  {children}
</section>;
export const Empty = ({ children }) => <div className="ch-empty">{children}</div>;
export const Field = ({ label, children }) => <label className="ch-field"><span>{T(label)}</span>{children}</label>;
export const Search = ({ value, onChange, placeholder }) => <input className="ch-input ch-search" type="search" value={value} onChange={e => onChange(e.target.value)} placeholder={T(placeholder || 'Søk …')} aria-label={T(placeholder || 'Søk')} />;
export const Select = ({ value, onChange, options, label }) => <select className="ch-select" value={value} onChange={e => onChange(e.target.value)} aria-label={label ? T(label) : undefined}>
  {options.map(([v, l]) => <option key={v} value={v}>{T(l)}</option>)}</select>;

/* Liste: kolonnemaler som CSS-grid; på mobil blir hver rad et kort. */
export function List({ cols, head, rows, empty, onRow }) {
  if (!rows.length) return <div className="ch-list"><Empty>{T(empty || 'Ingen ennå.')}</Empty></div>;
  return <div className="ch-list" style={{ '--cols': cols }} role="table">
    {head && <div className="ch-li head" role="row">{head.map((h, i) => <span key={i} role="columnheader">{T(h)}</span>)}</div>}
    {rows.map((r, i) => <div key={r.key || i} role="row" className={'ch-li' + (onRow ? ' click' : '')}
      onClick={onRow ? (e => { if (!e.target.closest('button,a,select,input')) onRow(r, i); }) : undefined}
      tabIndex={onRow ? 0 : undefined} onKeyDown={onRow ? (e => { if (e.key === 'Enter') onRow(r, i); }) : undefined}>
      {r.cells.map((c, j) => <div key={j} role="cell">{c}</div>)}
    </div>)}
  </div>;
}

export function Drawer({ title, sub, onClose, children }) {
  React.useEffect(() => { const k = e => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);
  return <div className="ch-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
    <aside className="ch-drawer" role="dialog" aria-modal="true" aria-label={title}>
      <header><div><h2>{title}</h2>{sub && <p className="ch-muted">{sub}</p>}</div><button className="ch-x" onClick={onClose} aria-label={T('Lukk')}>✕</button></header>
      {children}
    </aside>
  </div>;
}

export function Dialog({ title, onClose, children }) {
  React.useEffect(() => { const k = e => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);
  return <div className="ch-overlay center" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="ch-dialog" role="dialog" aria-modal="true" aria-label={title}>
      <header><h2>{title}</h2><button className="ch-x" onClick={onClose} aria-label={T('Lukk')}>✕</button></header>
      {children}
    </div>
  </div>;
}

/* Liten ruter på adressens #-del: #/brukere/<id>, #/menigheter/<id>/<fane> */
export function useRoute() {
  const read = () => (location.hash.replace(/^#\/?/, '') || 'oversikt').split('/').map(decodeURIComponent);
  const [r, setR] = React.useState(read);
  React.useEffect(() => { const f = () => setR(read()); window.addEventListener('hashchange', f); return () => window.removeEventListener('hashchange', f); }, []);
  return r;
}
export const go = (...parts) => { location.hash = '#/' + parts.filter(Boolean).map(encodeURIComponent).join('/'); };
export const href = (...parts) => '#/' + parts.filter(Boolean).map(encodeURIComponent).join('/');
