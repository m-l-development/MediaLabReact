'use no memo'
/* Lagrede grunnoppsett på startsiden (media-lab/src/pages/loop-studio/bases.jsx): personlige og felles for menigheten.
   «Ny serie fra dette» lager et eget prosjekt fra grunnoppsettet (grunnoppsettet endres ikke). Sletting krever bekreftelse;
   et felles grunnoppsett slettes for hele menigheten. */
import { useEffect, useState, type CSSProperties } from 'react'
import type { BaseEntry } from './bases'
import type { HomeVals } from './home-controller'

const NAMES: Record<string, string> = { week: 'Ukeprogram', sunday: 'Søndagsmøte', youth: 'Ungdomsmøte', blank: 'Tom mal' }
const card: CSSProperties = { display: 'flex', flexDirection: 'column', gap: '8px', padding: '18px 20px', border: '1px solid var(--ml-line, rgba(255,255,255,0.16))', borderRadius: '18px', background: 'var(--ml-card, rgba(12,12,12,0.55))', backdropFilter: 'blur(14px)' }
const pill: CSSProperties = { display: 'inline-flex', alignItems: 'center', height: '34px', padding: '0 16px', border: '1px solid var(--ml-fg, #f3f1ec)', borderRadius: '999px', color: 'var(--ml-fg, #f3f1ec)', fontSize: '12px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', textDecoration: 'none', background: 'transparent', cursor: 'pointer', font: 'inherit' }

export function LoopBases({ v, tx }: { v: HomeVals; tx: (s: unknown) => string }) {
  const B = v.bases
  const [s, setS] = useState<{ mine: BaseEntry[]; church: BaseEntry[]; loading: boolean; err: string }>(() => ({ mine: B.personal.list(), church: [], loading: !!B.central?.available(), err: '' }))
  const load = () => {
    if (!B.central?.available()) { setS((x) => ({ ...x, loading: false })); return }
    B.central.list().then(
      (church) => setS((x) => ({ ...x, church, loading: false })),
      () => setS((x) => ({ ...x, loading: false, err: 'Menighetens grunnoppsett kunne ikke hentes.' })),
    )
  }
  // hentes når siden åpnes, og på nytt når fanen blir synlig og hvert 30. sekund (TB-596FE4: grunnoppsett som andre
  // i menigheten lagret mens siden var åpen, kom ikke fram før siden ble åpnet på nytt) – som felles grunnoppsett ellers
  useEffect(() => {
    load()
    const tick = () => { if (document.visibilityState === 'visible') load() }
    const t = setInterval(tick, 30_000)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(t)
      document.removeEventListener('visibilitychange', tick)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- load bruker bare stabile tjenester
  }, [])
  const del = async (e: BaseEntry, kind: 'f' | 'p') => {
    if (!B.confirm(tx('Slette grunnoppsettet') + ' «' + e.name + '»?\n\n' + tx(kind === 'f' ? 'Det slettes for hele menigheten. Serier som allerede er laget fra det, beholdes.' : 'Serier som allerede er laget fra det, beholdes.'))) return
    try {
      if (kind === 'f' && B.central) { await B.central.remove(e.id); load() }
      else { B.personal.remove(e.id); setS((x) => ({ ...x, mine: B.personal.list() })) }
    } catch {
      setS((y) => ({ ...y, err: 'Grunnoppsettet kunne ikke slettes. Prøv igjen.' }))
    }
  }
  const all: ['f' | 'p', BaseEntry][] = [...s.church.map((e) => ['f', e] as ['f', BaseEntry]), ...s.mine.map((e) => ['p', e] as ['p', BaseEntry])]
  return (
    <section data-ch-loop-bases="1" style={{ width: '100%', maxWidth: '860px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ fontSize: '11.5px', fontWeight: 600, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--ml-label, #9d998f)' }}>{tx('Lagrede grunnoppsett')}</div>
      {s.err ? <p role="alert" style={{ margin: 0, color: '#ff8f7d', fontSize: '13px' }}>{tx(s.err)}</p> : null}
      {!all.length ? (
        <p data-ch-loop-bases-empty="1" style={{ margin: 0, fontSize: '13.5px', color: 'var(--ml-muted, #b3afa6)' }}>
          {tx(s.loading ? 'Laster …' : 'Ingen lagrede grunnoppsett ennå. Åpne demoen og trykk «Lagre som grunnoppsett», eller start med en tom mal over.')}
        </p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
          {all.map(([k, e]) => {
            const q = { mal: e.base, grunn: k + '-' + e.id }
            return (
              <div key={k + e.id} data-ch-loop-base={e.name} style={card}>
                <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase', color: k === 'f' ? '#8fe3cf' : 'var(--ml-label, #9d998f)' }}>
                  {tx(k === 'f' ? 'Felles for menigheten' : 'Personlig')} · {tx(NAMES[e.base] ?? 'Egen')}
                </span>
                <b style={{ fontSize: '17px' }}>{e.name}</b>
                <span style={{ fontSize: '12.5px', color: 'var(--ml-muted, #b3afa6)' }}>{e.data.slides.length} slides</span>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                  <a
                    href={B.editorHref(q)}
                    data-ch-loop-base-open="1"
                    style={pill}
                    onClick={(ev) => {
                      if (ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return
                      ev.preventDefault()
                      B.open(q)
                    }}
                  >
                    {tx('Ny serie fra dette')}
                  </a>
                  <button type="button" onClick={() => void del(e, k)} style={{ ...pill, border: '0', color: '#ff8f7d' }}>{tx('Slett')}</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
