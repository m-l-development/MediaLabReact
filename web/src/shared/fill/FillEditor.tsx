import { defaultRepeat, FILL_MODE_LABELS, fillCss, fillStops, harmonyColors, type Fill, type FillMode, type FillStop } from './fill'
import s from './FillEditor.module.css'

/** Tekstene i editoren (verktøyet oversetter dem). */
export type FillPhrase =
  | 'Bakgrunnsfarge' | 'Type' | 'Ingen' | 'Farge' | 'Lineær' | 'Speilet' | 'Rund' | 'Oval' | 'Vinkel' | 'Vinkel gjentatt' | 'Vinkel speilet'
  | 'Vinkel fra hjørne' | 'Stråler' | 'Myk blanding' | 'Striper' | 'Bølger' | 'Fra hjørne' | 'Spotlys' | 'Glød' | 'Trykk på fargen for å endre den'
  | 'Tilfeldige farger som passer' | 'Gradientfarger' | 'Flytt opp i rekkefølgen' | 'Flytt fargen opp' | 'Flytt ned i rekkefølgen' | 'Flytt fargen ned'
  | 'Farge {n}' | 'Posisjon for farge {n}' | 'Fjern farge' | 'Mengde' | 'Mengde av farge {n}' | 'Skarp eller myk overgang til neste farge'
  | 'Skarp kant til neste' | '+ Legg til farge' | '⇄ Snu' | 'Fordel jevnt' | 'Retning' | 'Overgang' | 'Standard' | 'Skarp kant' | 'Myk, diffus'
  | 'Skarphet' | 'Myke overganger' | 'Skarpe kanter' | 'Antall gjentakelser' | 'Bakgrunnen dekker hele bildet under alle lag.' | 'Midtstill' | '{n} farger'

interface Props {
  fill: Fill
  /** Endrer fyllet (med nøkkel for sammenslått angre-steg). */
  onChange: (patch: Partial<Fill>) => void
  open: boolean
  onToggle: () => void
  tx: (p: FillPhrase, v?: Record<string, string | number>) => string
  note?: FillPhrase
}

const ANGLED: readonly FillMode[] = ['linear', 'mirror', 'conic', 'stripes', 'wave', 'corner', 'glow', 'conicRep', 'conicMirror', 'rays', 'conicCorner']
const REPEAT: readonly FillMode[] = ['stripes', 'wave', 'conicRep', 'conicMirror', 'rays']
const NO_POS: readonly FillMode[] = ['mesh', 'stripes', 'glow', 'rays']

function Dice() {
  return (
    <span className={s.dice} aria-hidden="true">
      <i style={{ background: '#e76f51' }} />
      <i style={{ background: '#e9c46a' }} />
      <i style={{ background: '#2a9d8f' }} />
      <i style={{ background: '#f4a261' }} />
    </span>
  )
}

/** «Bakgrunnsfarge»: type, fargestopp med posisjon og mengde, retning, overgang, skarphet og gjentakelser. */
export function FillEditor({ fill, onChange, open, onToggle, tx, note = 'Bakgrunnen dekker hele bildet under alle lag.' }: Props) {
  const mode = FILL_MODE_LABELS.some(([m]) => m === fill.mode) ? fill.mode : 'none'
  const stops = fillStops(fill)
  const ang = fill.angle == null ? 135 : fill.angle
  const put = (p: Partial<Fill>) => onChange(p)
  const setStop = (i: number, p: Partial<FillStop>) => put({ stops: stops.map((q, j) => (j === i ? { ...q, ...p } : q)) })
  const ord = stops.map((q, i) => ({ q, i })).sort((a, b) => a.q.p - b.q.p)
  const swap = (a: number, b: number) => {
    const l = stops.slice()
    const qa = l[a] as FillStop
    const qb = l[b] as FillStop
    l[a] = { ...qa, c: qb.c }
    l[b] = { ...qb, c: qa.c }
    put({ stops: l })
  }
  const summary = mode === 'none' ? tx('Ingen') : `${tx((FILL_MODE_LABELS.find(([m]) => m === mode)?.[1] ?? 'Ingen') as FillPhrase)}${mode !== 'solid' ? ` · ${tx('{n} farger', { n: stops.length })}` : ''}`
  const preview = fillCss({ ...fill, mode })
  const on = mode !== 'none'
  const multi = on && mode !== 'solid'
  const moved = fill.x != null && (Math.abs(fill.x - 0.5) > 0.005 || Math.abs((fill.y == null ? 0.5 : fill.y) - 0.5) > 0.005)
  const first = stops[0] as FillStop
  return (
    <div className={s.box}>
      <button type="button" className={s.head} aria-expanded={open} onClick={onToggle}>
        <span className={s.headL}>
          <span className={s.chip} style={{ background: preview }} />
          <span className={s.title}>{tx('Bakgrunnsfarge')}</span>
          <span className={s.summary}>{summary}</span>
        </span>
        <span className={s.arrow}>{open ? '▴' : '▾'}</span>
      </button>
      {open && (
        <>
          <span className={s.label}>{tx('Type')}</span>
          <div className={s.modes}>
            {FILL_MODE_LABELS.map(([m, l]) => (
              <button key={m} type="button" aria-pressed={mode === m} onClick={() => put({ mode: m })}>{tx(l as FillPhrase)}</button>
            ))}
          </div>
          {on && (
            <>
              <div className={s.preview} style={{ background: preview }} />
              {mode === 'solid' && (
                <div className={s.solid}>
                  <label className={s.swatch} style={{ background: first.c }} title={tx('Farge')}>
                    <input type="color" value={first.c} aria-label={tx('Farge')} onChange={(e) => /^#[0-9a-f]{6}$/i.test(e.target.value) && setStop(0, { c: e.target.value })} />
                  </label>
                  <span className={s.hint}>{tx('Trykk på fargen for å endre den')}</span>
                  <button type="button" className={s.round} title={tx('Tilfeldige farger som passer')} aria-label={tx('Tilfeldige farger som passer')} onClick={() => setStop(0, { c: harmonyColors(1)[0] ?? first.c })}><Dice /></button>
                </div>
              )}
              {multi && (
                <div className={s.stops}>
                  <span className={s.label}>{tx('Gradientfarger')}</span>
                  {ord.map(({ q, i }, k) => (
                    <div key={i}>
                      <div className={s.stopRow}>
                        <div className={s.updown}>
                          <button type="button" disabled={k === 0} title={tx('Flytt opp i rekkefølgen')} aria-label={tx('Flytt fargen opp')} onClick={() => swap(i, (ord[k - 1] as { i: number }).i)}>▲</button>
                          <button type="button" disabled={k === ord.length - 1} title={tx('Flytt ned i rekkefølgen')} aria-label={tx('Flytt fargen ned')} onClick={() => swap(i, (ord[k + 1] as { i: number }).i)}>▼</button>
                        </div>
                        <label className={s.swatch} style={{ background: q.c }} title={tx('Farge {n}', { n: k + 1 })}>
                          <input type="color" value={q.c} aria-label={tx('Farge {n}', { n: k + 1 })} onChange={(e) => /^#[0-9a-f]{6}$/i.test(e.target.value) && setStop(i, { c: e.target.value })} />
                        </label>
                        {!NO_POS.includes(mode) ? (
                          <input type="range" min={0} max={100} step={1} value={Math.round(q.p * 100)} aria-label={tx('Posisjon for farge {n}', { n: k + 1 })} onChange={(e) => setStop(i, { p: Number(e.target.value) / 100 })} />
                        ) : <span />}
                        <span className={s.num}>{Math.round(q.p * 100)}%</span>
                        {stops.length > 2 ? <button type="button" className={s.del} title={tx('Fjern farge')} aria-label={tx('Fjern farge')} onClick={() => put({ stops: stops.filter((_, j) => j !== i) })}>×</button> : <span />}
                      </div>
                      <div className={s.amount}>
                        <span>{tx('Mengde')}</span>
                        <input type="range" min={0} max={100} step={1} value={Math.round((q.w ?? 0) * 100)} aria-label={tx('Mengde av farge {n}', { n: k + 1 })} onChange={(e) => setStop(i, { w: Number(e.target.value) / 100 })} />
                        <span className={s.num}>{Math.round((q.w ?? 0) * 100)}%</span>
                        <span />
                      </div>
                      {k < ord.length - 1 && (
                        <div className={s.hardRow}>
                          <button type="button" aria-pressed={!!q.hard} title={tx('Skarp eller myk overgang til neste farge')} onClick={() => setStop(i, { hard: !q.hard })}>{tx('Skarp kant til neste')}</button>
                        </div>
                      )}
                    </div>
                  ))}
                  <div className={s.actions}>
                    {stops.length < 6 && (
                      <button type="button" className={s.add} onClick={() => {
                        const ss = stops.slice().sort((a, b) => a.p - b.p)
                        const l = ss.map((q, j) => ({ ...q, p: j / ss.length }))
                        l.push({ c: (ss[ss.length - 1] as FillStop).c, p: 1 })
                        put({ stops: l })
                      }}>{tx('+ Legg til farge')}</button>
                    )}
                    <button type="button" className={s.round} title={tx('Tilfeldige farger som passer')} aria-label={tx('Tilfeldige farger som passer')} onClick={() => {
                      const cols = harmonyColors(stops.length)
                      put({ stops: stops.map((q, i) => ({ ...q, c: cols[i] ?? q.c })) })
                    }}><Dice /></button>
                    <button type="button" className={s.btn} onClick={() => put({ stops: stops.map((q) => ({ ...q, p: 1 - q.p })) })}>{tx('⇄ Snu')}</button>
                    <button type="button" className={s.btn} onClick={() => put({ stops: stops.slice().sort((a, b) => a.p - b.p).map((q, j, a) => ({ ...q, p: a.length > 1 ? j / (a.length - 1) : 0 })) })}>{tx('Fordel jevnt')}</button>
                  </div>
                </div>
              )}
              {ANGLED.includes(mode) && (
                <label className={s.range}>
                  <span><b>{tx('Retning')}</b><span>{Math.round(ang)}°</span></span>
                  <input type="range" min={0} max={360} step={1} value={Math.round(ang)} aria-label={tx('Retning')} onChange={(e) => put({ angle: Number(e.target.value) })} />
                </label>
              )}
              {multi && (
                <>
                  <div className={s.range}>
                    <span><b>{tx('Overgang')}</b><span>{Math.round((fill.soft == null ? 0.5 : fill.soft) * 100)} % <button type="button" className={s.link} onClick={() => put({ soft: 0.5 })}>{tx('Standard')}</button></span></span>
                    <input type="range" min={0} max={100} step={1} value={Math.round((fill.soft == null ? 0.5 : fill.soft) * 100)} aria-label={tx('Overgang')} onChange={(e) => put({ soft: Number(e.target.value) / 100 })} />
                    <span className={s.ends}><span>{tx('Skarp kant')}</span><span>{tx('Myk, diffus')}</span></span>
                  </div>
                  <div className={s.range}>
                    <span><b>{tx('Skarphet')}</b><span>{Math.round((Number(fill.sharp) || 0) * 100)} % <button type="button" className={s.link} onClick={() => put({ sharp: 0 })}>0 %</button></span></span>
                    <input type="range" min={0} max={100} step={1} value={Math.round((Number(fill.sharp) || 0) * 100)} aria-label={tx('Skarphet')} onChange={(e) => put({ sharp: Number(e.target.value) / 100 })} />
                    <span className={s.ends}><span>{tx('Myke overganger')}</span><span>{tx('Skarpe kanter')}</span></span>
                  </div>
                  {REPEAT.includes(mode) && (
                    <label className={s.range}>
                      <span><b>{tx('Antall gjentakelser')}</b><span>{Math.round(fill.repeat || defaultRepeat(mode))}</span></span>
                      <input type="range" min={1} max={20} step={1} value={Math.round(fill.repeat || defaultRepeat(mode))} aria-label={tx('Antall gjentakelser')} onChange={(e) => put({ repeat: Number(e.target.value) })} />
                    </label>
                  )}
                </>
              )}
              <div className={s.foot}>
                <span>{tx(note)}</span>
                {moved && <button type="button" className={s.link} onClick={() => put({ x: 0.5, y: 0.5 })}>{tx('Midtstill')}</button>}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
