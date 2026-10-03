/* Lagrede grunnoppsett på Loop Studio-startsiden: personlige og felles for menigheten. «Ny serie» lager et eget prosjekt fra
   grunnoppsettet (grunnoppsettet endres ikke). Sletting krever bekreftelse; et felles grunnoppsett slettes for hele menigheten. */
import React from 'react';
import { personal, central } from '../../shared/loop-bases.js';

const T = s => (window.MLI18N && window.MLI18N.t ? window.MLI18N.t(s) : s);
const NAMES = { week: 'Ukeprogram', sunday: 'Søndagsmøte', youth: 'Ungdomsmøte', blank: 'Tom mal' };
const card = { display: 'flex', flexDirection: 'column', gap: '8px', padding: '18px 20px', border: '1px solid var(--ml-line, rgba(255,255,255,0.16))', borderRadius: '18px', background: 'var(--ml-card, rgba(12,12,12,0.55))', backdropFilter: 'blur(14px)' };
const pill = { display: 'inline-flex', alignItems: 'center', height: '34px', padding: '0 16px', border: '1px solid var(--ml-fg, #f3f1ec)', borderRadius: '999px', color: 'var(--ml-fg, #f3f1ec)', fontSize: '12px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', textDecoration: 'none', background: 'transparent', cursor: 'pointer', font: 'inherit' };

export default function LoopBases() {
  const [s, setS] = React.useState({ mine: personal.list(), church: [], loading: true, err: '' });
  const load = () => central.list().then(church => setS(x => ({ ...x, church, loading: false })), () => setS(x => ({ ...x, loading: false, err: T('Menighetens grunnoppsett kunne ikke hentes.') })));
  React.useEffect(() => { load(); }, []);
  const del = async (e, kind) => {
    if (!confirm(T('Slette grunnoppsettet') + ' «' + e.name + '»?\n\n' + T(kind === 'f' ? 'Det slettes for hele menigheten. Serier som allerede er laget fra det, beholdes.' : 'Serier som allerede er laget fra det, beholdes.'))) return;
    try { if (kind === 'f') { await central.remove(e.id); await load(); } else { personal.remove(e.id); setS(x => ({ ...x, mine: personal.list() })); } }
    catch (x) { setS(y => ({ ...y, err: T('Grunnoppsettet kunne ikke slettes. Prøv igjen.') })); }
  };
  const all = [...s.church.map(e => ['f', e]), ...s.mine.map(e => ['p', e])];
  return <section data-ch-loop-bases="1" style={{ width: '100%', maxWidth: '860px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
    <div style={{ fontSize: '11.5px', fontWeight: 600, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--ml-label, #9d998f)' }}>{T('Lagrede grunnoppsett')}</div>
    {s.err ? <p role="alert" style={{ margin: 0, color: '#ff8f7d', fontSize: '13px' }}>{s.err}</p> : null}
    {!all.length ? <p data-ch-loop-bases-empty="1" style={{ margin: 0, fontSize: '13.5px', color: 'var(--ml-muted, #b3afa6)' }}>{T(s.loading ? 'Laster …' : 'Ingen lagrede grunnoppsett ennå. Åpne demoen og trykk «Lagre som grunnoppsett», eller start med en tom mal over.')}</p>
      : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
        {all.map(([k, e]) => <div key={k + e.id} data-ch-loop-base={e.name} style={card}>
          <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase', color: k === 'f' ? '#8fe3cf' : 'var(--ml-label, #9d998f)' }}>{T(k === 'f' ? 'Felles for menigheten' : 'Personlig')} · {T(NAMES[e.base] || 'Egen')}</span>
          <b style={{ fontSize: '17px' }}>{e.name}</b>
          <span style={{ fontSize: '12.5px', color: 'var(--ml-muted, #b3afa6)' }}>{e.data.slides.length} slides</span>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
            <a href={'/loopeditor?mal=' + encodeURIComponent(e.base) + '&grunn=' + k + '-' + e.id} data-ch-loop-base-open="1" style={pill}>{T('Ny serie fra dette')}</a>
            <button type="button" onClick={() => del(e, k)} style={{ ...pill, border: '0', color: '#ff8f7d' }}>{T('Slett')}</button>
          </div>
        </div>)}
      </div>}
  </section>;
}
