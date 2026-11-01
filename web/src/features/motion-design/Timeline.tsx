'use no memo'
// Komponentene leser fra kontrolleren (c.s …); kompilatorens mellomlagring ville gitt utdaterte verdier.
import { LANEH, linkColor, tlEnd, type Kind, type MotionController, type MState } from './controller'
import { TlTools } from './Advanced'
import { fmtTC, trackName } from './engine/edit'
import type { Keys } from './engine/kf'
import { fmtD, fmtT, layout, ovDur, totalDur, type Project, type TrackKey } from './engine/model'
import type { Phrase, Tx } from './texts'
import s from './MotionDesign.module.css'

const css = (u: string) => (u ? `url("${u.replace(/["\\\n]/g, '')}")` : 'none')

function lanesOf(items: readonly { id: string; lane: number }[], n0: number) {
  let n = Math.max(1, n0 || 1)
  for (const x of items) n = Math.max(n, (x.lane || 0) + 1)
  return n
}

interface BlockProps {
  c: MotionController
  kind: Kind
  id: string
  cls: string | undefined
  sel: boolean
  link: string
  style: React.CSSProperties
  children?: React.ReactNode
}
function Block({ c, kind, id, cls, sel, link, style, children }: BlockProps) {
  return (
    <div className={`${s.blk} ${cls} ${sel ? s.blkSel : ''}`} style={style} data-block={kind}
      onPointerDown={(e) => c.startDrag(e, kind, id)} onContextMenu={(e) => c.ctxFor(kind, id, e)}>
      {link && <div className={s.linkBar} style={{ background: linkColor(link) }} />}
      {children}
      <div className={`${s.edge} ${s.edgeL}`} onPointerDown={(e) => c.startDrag(e, kind, id, 'l')} />
      <div className={`${s.edge} ${s.edgeR}`} onPointerDown={(e) => c.startDrag(e, kind, id, 'r')} />
    </div>
  )
}

/** Demp lydsporet (Avansert): klippene beholdes, men høres ikke i avspilling eller eksport. */
function MuteBtn({ c, p, tx, lane }: { c: MotionController; p: Project; tx: Tx; lane: number }) {
  const on = !!p.muteA?.includes(lane)
  return (
    <button type="button" className={`${s.ico} ${on ? s.icoOn : ''}`} aria-pressed={on} data-md-mute={lane} title={tx(on ? 'Slå på lyden i sporet' : 'Demp sporet')} aria-label={tx(on ? 'Slå på lyden i sporet' : 'Demp sporet')} onClick={() => c.toggleMuteA(lane)}>
      {on ? '🔇' : '🔊'}
    </button>
  )
}

export function Timeline({ c, S, p, tx, maxH, fixH }: { c: MotionController; S: MState; p: Project; tx: Tx; maxH: string; fixH?: number | undefined }) {
  const T = totalDur(p)
  const L = layout(p)
  const Z = S.zoom
  const adv = S.adv
  // Avansert: sporene heter V1 (hoved), V2 … (videospor over, øverste lag har høyest nummer), A1 … (lyd), T1 … (tekst)
  // keyframes som små ruter på klippet (klikk = spillehodet dit)
  // keyframe-prikk: velger elementet, flytter spillehodet dit og åpner Animasjon i inspektøren
  const kfDots = (kf: Keys | undefined, start: number, type: 'clip' | 'ov' | 'text', id: string) => (adv && kf ? [...new Set(Object.values(kf).flat().map((k) => k.t))].map((t) => (
    <i key={t} className={s.kfDot} style={{ left: t * Z }} data-md-kfdot="" title={tx('Keyframe – klikk for å redigere')} onPointerDown={(e) => { e.stopPropagation(); c.pickKey(type, id, start + t) }} />
  )) : null)
  const laneName = (k: TrackKey, lane: number) => (k === 'video' ? 'V1 · Hoved' : k === 'ov' ? trackName(p, 'ov', lane) : k === 'music' ? trackName(p, 'music', lane) : k === 'text' ? trackName(p, 'text', lane) : 'UT')
  const selId = S.sel?.id
  const mIds = new Set(S.multi.map((m) => m.id))
  const isSel = (id: string) => selId === id || mIds.has(id)
  const bw = (st: number, d: number): React.CSSProperties => ({ left: st * Z, width: Math.max(6, d * Z) })
  const nText = lanesOf(p.texts, p.lanes.text)
  const nOv = lanesOf(p.ov, p.lanes.ov)
  const nMus = lanesOf(p.music, p.lanes.music)
  // tidslinjens lengde: det lengste av innholdet og prosjektvarigheten, pluss omtrent én skjermbredde etter slutten
  const E = tlEnd(p)
  const V = S.tlView
  const step = [1 / 30, 0.1, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600, 7200, 14400].find((x) => x * Z >= 64) ?? 28800
  // bare merkene som er synlige (lange prosjekter på høy zoom gir ellers tusenvis av elementer)
  const ticks: { left: number; label: string }[] = []
  const t0 = Math.max(0, Math.floor((V.l - V.w) / step)) * step
  for (let i = 0, x = t0; x <= V.l + V.w * 2 && i < 400; i++, x = t0 + i * step) ticks.push({ left: x * Z, label: step < 1 ? fmtTC(x).slice(3) : fmtD(x) })
  const media = (id: string) => p.media.find((m) => m.id === id)
  const cd = S.clipDrag
  const hit = S.medDrag?.hit
  const rows: [TrackKey, Phrase, number, number][] = [['text', 'Tekst', nText * 26 + 8, nText], ['ov', 'Overlegg', nOv * 40 + 8, nOv], ['video', 'Video', 60, 0], ['subs', 'Undertekst', 34, 0], ['music', 'Musikk', nMus * 30 + 8, nMus]]
  const wave = (mediaId: string, inn: number, len: number, sp: number, rev: boolean) => {
    const u = c.waves[mediaId]
    return u ? { backgroundImage: css(u), backgroundSize: `${(len * Z) / sp}px 100%`, backgroundPosition: `${(-inn * Z) / sp}px 0`, transform: rev ? 'scaleX(-1)' : 'none' } : undefined
  }
  return (
    <section className={s.tlWrap} style={{ maxHeight: maxH, height: fixH }}>
      <div className={s.tlBar}>
        <button type="button" className={s.zBtn} title={tx('Zoom ut')} aria-label={tx('Zoom ut')} onClick={() => c.zoomBy(1 / 1.5)}>−</button>
        <button type="button" className={s.zBtn} title={tx('Zoom inn')} aria-label={tx('Zoom inn')} onClick={() => c.zoomBy(1.5)}>+</button>
        {!adv && <button type="button" className={`${s.barBtn} ${s.small}`} style={{ height: 30 }} onClick={() => c.fitZoom()}>{tx('Vis alt')}</button>}
        {adv && <TlTools c={c} S={S} p={p} tx={tx} />}
        {adv && <span className={s.tc} data-md-tc="" title={`${tx('Spillehodet (tt:mm:ss:bilde, 30 bilder per sekund)')}\n${tx('Dra for å flytte, kantene for å trimme. Q/W trimmer til spillehodet, S deler, Alt+↑/↓ bytter spor.')}`}>{fmtTC(S.t)}</span>}
        <span className={s.flex} />
        {!adv && <span className={s.keys}>{tx('Dra i kantene for å klippe. Shift-klikk for å velge flere. M: markør.')}</span>}
      </div>
      <div className={s.tlBody}>
        <div className={s.heads}>
          <div className={s.headRuler} />
          {rows.map(([k, name, h, nl]) => {
            const q = p.tracks[k]
            const lh = nl ? LANEH[k as keyof typeof LANEH] : h - 1
            return (
              <div key={k} className={s.headRow} style={{ height: h, paddingTop: nl ? 4 : 0, opacity: q.hide ? 0.5 : 1 }} data-track={k}>
                <div className={s.headLine} style={{ height: lh }}>
                  <span className={s.headName} data-md-lane={adv ? laneName(k, 0) : undefined}>{adv ? laneName(k, 0) : tx(name)}</span>
                  {nl > 0 && <button type="button" className={s.ico} title={tx('Legg til lag')} aria-label={tx('Legg til lag')} onClick={() => c.addLane(k as keyof typeof LANEH)}>+</button>}
                  {adv && k === 'music' && <MuteBtn c={c} p={p} tx={tx} lane={0} />}
                  <button type="button" className={`${s.ico} ${q.hide ? s.icoHid : ''}`} title={tx(q.hide ? 'Vis spor' : 'Skjul spor')} aria-label={tx(q.hide ? 'Vis spor' : 'Skjul spor')} aria-pressed={q.hide} onClick={() => c.toggleTrack(k, 'hide')}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>
                  </button>
                  <button type="button" className={`${s.ico} ${q.lock ? s.icoOn : ''}`} title={tx(q.lock ? 'Lås opp spor' : 'Lås spor')} aria-label={tx(q.lock ? 'Lås opp spor' : 'Lås spor')} aria-pressed={q.lock} onClick={() => c.toggleTrack(k, 'lock')}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
                  </button>
                  <button type="button" className={`${s.ico} ${s.icoDel}`} title={tx(nl > 1 ? 'Fjern lag' : 'Tøm sporet')} aria-label={tx(nl > 1 ? 'Fjern lag' : 'Tøm sporet')} onClick={() => c.clearLane0(k, nl)}>×</button>
                </div>
                {Array.from({ length: Math.max(0, nl - 1) }, (_, i) => (
                  <div key={i} className={s.lane} style={{ height: LANEH[k as keyof typeof LANEH] }}>
                    <span className={s.flex} data-md-lane={adv ? laneName(k, i + 1) : undefined}>{adv ? laneName(k, i + 1) : `${tx('Lag')} ${i + 2}`}</span>
                    {adv && k === 'music' && <MuteBtn c={c} p={p} tx={tx} lane={i + 1} />}
                    <button type="button" className={`${s.ico} ${s.icoDel}`} title={tx('Fjern lag')} aria-label={tx('Fjern lag')} onClick={() => c.delLane(k as keyof typeof LANEH, i + 1)}>×</button>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
        <div ref={c.bind('tl')} className={s.tl}>
          <div ref={c.bind('tlInner')} className={s.tlInner} style={{ width: Math.max(200, (E + Math.max(12, V.w * 0.9)) * Z) }}>
            <div className={s.ruler} data-md-ruler="" onPointerDown={(e) => c.rulerDown(e)}>
              {ticks.map((k) => <div key={k.left} className={s.tick} style={{ left: k.left }}>{k.label}</div>)}
              {p.markers.map((k) => (
                <button key={k.id} type="button" className={s.marker} style={{ left: k.t * Z, background: k.color }} title={`${k.label || tx('Markør')} · ${fmtT(k.t)}`} aria-label={`${k.label || tx('Markør')} · ${fmtT(k.t)}`}
                  onPointerDown={(e) => {
                    e.stopPropagation()
                    if (e.button === 0) c.seek(k.t)
                  }}
                  onContextMenu={(e) => c.markerMenu(e, k.id)}
                  onDoubleClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    c.delMarker(k.id)
                  }} />
              ))}
            </div>
            <div className={s.tRow} style={{ height: nText * 26 + 8 }} data-row="text" onPointerDown={(e) => c.rowDown(e)} onContextMenu={(e) => c.rowCtx(e)}>
              {p.texts.map((x) => (
                <Block key={x.id} c={c} kind="text" id={x.id} cls={s.blkText} sel={isSel(x.id)} link={x.link ?? ''} style={{ ...bw(x.start, x.dur), top: (x.lane || 0) * 26 + 5 }}>
                  <span className={s.blkLabel}>{x.countdown ? tx('Nedtelling') : (x.text || ' ').split('\n')[0]}</span>
                  {kfDots(x.kf, x.start, 'text', x.id)}
                </Block>
              ))}
            </div>
            <div ref={c.bind('ovRow')} className={s.tRow} style={{ height: nOv * 40 + 8 }} data-row="ov" onPointerDown={(e) => c.rowDown(e)} onContextMenu={(e) => c.rowCtx(e)}>
              {hit?.kind === 'ov' && <div className={s.hitLine} style={{ left: hit.t * Z }} />}
              {p.ov.map((o) => (
                <Block key={o.id} c={c} kind="ov" id={o.id} cls={s.blkOv} sel={isSel(o.id)} link={o.link ?? ''} style={{ ...bw(o.start, ovDur(o)), top: (o.lane || 0) * 40 + 5, backgroundImage: css(media(o.media)?.thumb ?? '') }}>
                  <span className={s.blkLabel} style={{ top: 4 }}>{o.name || media(o.media)?.name || tx('Overlegg')}</span>
                  {kfDots(o.kf, o.start, 'ov', o.id)}
                </Block>
              ))}
            </div>
            <div ref={c.bind('clipRow')} className={s.tRow} style={{ height: 60 }} data-row="video" onPointerDown={(e) => c.rowDown(e)} onContextMenu={(e) => c.rowCtx(e)}>
              {hit?.kind === 'clip' && <div className={s.hitLine} style={{ left: hit.t * Z }} />}
              {S.trDrag?.hit && <div className={`${s.hitLine} ${s.hitTrans}`} style={{ left: S.trDrag.hit.t * Z }} />}
              {L.map((l) => {
                const cl = l.c
                const m = cl.kind !== 'color' ? media(cl.media) : undefined
                const drag = cd?.id === cl.id
                const bg = cl.kind === 'color' ? (cl.grad === 'none' ? 'none' : `linear-gradient(90deg, ${cl.c1}, ${cl.c2})`) : css(m?.thumb ?? '')
                const hasTr = l.tr > 0 || (l.i === 0 && p.tin.type !== 'none')
                const hasTo = l.i === L.length - 1 && p.tout.type !== 'none'
                const wv = cl.kind === 'video' ? wave(cl.media, cl.in, m?.dur || cl.out, cl.speed || 1, cl.rev) : undefined
                return (
                  <Block key={cl.id} c={c} kind="clip" id={cl.id} cls={s.blkClip} sel={isSel(cl.id)} link={cl.link ?? ''}
                    style={{ ...bw(l.start, l.dur), backgroundImage: bg, backgroundColor: cl.kind === 'color' && cl.grad === 'none' ? cl.c1 : undefined, backgroundSize: cl.kind === 'color' ? '100% 100%' : 'auto 100%', transform: `translateX(${drag ? cd.dx : 0}px)`, zIndex: drag ? 5 : selId === cl.id ? 2 : 1, opacity: drag ? 0.85 : 1 }}>
                    {hasTr && <div className={s.trIn} style={{ width: (l.tr > 0 ? l.tr : Math.min(p.tin.dur, l.dur / 2)) * Z }} />}
                    {hasTo && <div className={s.trOut} style={{ width: Math.min(p.tout.dur, l.dur / 2) * Z }} />}
                    {wv && <div className={s.wave} style={wv} />}
                    <span className={s.blkLabel} style={{ left: 9, right: 9, top: 4 }}>{cl.kind === 'color' ? tx('Fargeflate') : cl.name || m?.name || ''}</span>
                    <span className={s.blkDur}>{fmtT(l.dur)}</span>
                    {kfDots(cl.kf, l.start, 'clip', cl.id)}
                  </Block>
                )
              })}
            </div>
            <div className={s.tRow} style={{ height: 34 }} data-row="subs" onPointerDown={(e) => c.rowDown(e)} onContextMenu={(e) => c.rowCtx(e)}>
              {p.subs.map((sb) => (
                <Block key={sb.id} c={c} kind="sub" id={sb.id} cls={s.blkSub} sel={isSel(sb.id)} link={sb.link ?? ''} style={bw(sb.start, sb.end - sb.start)}>
                  <span className={s.blkLabel} style={{ left: 7, right: 7, top: 4, fontWeight: 400 }}>{sb.text}</span>
                </Block>
              ))}
            </div>
            <div ref={c.bind('musicRow')} className={s.tRow} style={{ height: nMus * 30 + 8, borderBottom: 0 }} data-row="music" onPointerDown={(e) => c.rowDown(e)} onContextMenu={(e) => c.rowCtx(e)}>
              {hit?.kind === 'music' && <div className={s.hitLine} style={{ left: hit.t * Z }} />}
              {p.music.map((m) => {
                const wv = wave(m.media, m.in, m.srcDur, 1, false)
                return (
                  <Block key={m.id} c={c} kind="music" id={m.id} cls={s.blkMusic} sel={isSel(m.id)} link={m.link ?? ''} style={{ ...bw(m.start, m.loop ? T - m.start : m.out - m.in), top: (m.lane || 0) * 30 + 5 }}>
                    {wv && <div className={s.wave} style={wv} />}
                    <span className={s.blkLabel} style={{ top: 5 }}>{(m.name || media(m.media)?.name || tx('Lydspor')) + (m.loop ? ' ↻' : '')}</span>
                  </Block>
                )
              })}
            </div>
            {p.markers.map((k) => <div key={k.id} className={s.markerLine} style={{ left: k.t * Z, background: `${k.color}88` }} />)}
            {!!p.dur && <div className={s.endZone} data-md-end="" style={{ left: p.dur * Z }} title={tx('Prosjektslutt: avspilling og eksport stopper her')}><span>{tx('Slutt')}</span></div>}
            <div ref={c.bind('ph')} className={s.ph} style={{ left: S.t * Z }} />
          </div>
        </div>
      </div>
    </section>
  )
}
