'use no memo'
// Komponentene leser fra kontrolleren (c.s …); kompilatorens mellomlagring ville gitt utdaterte verdier.
import { useRef } from 'react'
import { IMAGE_ACCEPT, PRESETS, TRSTD, type MotionController, type MState, type Tab } from './controller'
import { fmtD, fmtT, totalDur, usedMedia, type Media, type Project } from './engine/model'
import { WHISPER_MODELS } from './engine/transcribe'
import { logoFields, subStyleFields } from './fields'
import { Fields } from './Props'
import { AdvBin } from './Advanced'
import type { Phrase, Tx } from './texts'
import s from './MotionDesign.module.css'

const css = (u: string) => (u ? `url("${u.replace(/["\\\n]/g, '')}")` : 'none')

const ICONS: Record<Tab, React.ReactNode> = {
  media: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M10 9.5v5l4-2.5z" fill="currentColor" /></svg>,
  text: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 6V4h14v2M12 4v16M9 20h6" /></svg>,
  subs: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M7 14h4M13 14h4M7 10.5h10" /></svg>,
  audio: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>,
  logo: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" /></svg>,
  trans: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2.5" y="6" width="11" height="12" rx="1.5" /><rect x="10.5" y="6" width="11" height="12" rx="1.5" fill="currentColor" fillOpacity="0.35" /></svg>,
}
const TABS: [Tab, Phrase][] = [['media', 'Media'], ['text', 'Tekst'], ['subs', 'Undertekst'], ['audio', 'Musikk'], ['logo', 'Logo'], ['trans', 'Overganger']]

/** Et medium i biblioteket: miniatyr, video spilles uten lyd når musen er over den. */
function MediaTile({ c, m, p, replace, tx }: { c: MotionController; m: Media; p: Project; replace: string | null; tx: Tx }) {
  const vref = useRef<HTMLVideoElement>(null)
  const url = c.urls[m.id] ?? ''
  const t0 = Math.min(1, (m.dur || 2) / 4)
  const used = usedMedia(p).has(m.id)
  return (
    <div className={`${s.med} ${replace ? s.medReplace : ''}`} data-media={m.kind} onPointerDown={(e) => c.medDown(e, m)}>
      <div className={s.medThumb} style={{ backgroundImage: css(m.thumb), backgroundSize: m.kind === 'image' ? 'contain' : 'cover' }}
        onPointerEnter={(e) => {
          const v = vref.current
          if (v && e.pointerType !== 'touch') {
            v.muted = true
            v.play().catch(() => undefined)
          }
        }}
        onPointerLeave={() => {
          const v = vref.current
          if (!v) return
          v.pause()
          try {
            v.currentTime = t0
          } catch {
            // ikke klar ennå
          }
        }}>
        {m.kind === 'image' && url && <img className={s.medFill} src={url} alt="" draggable={false} style={{ objectFit: 'contain' }} />}
        {m.kind === 'video' && url && <video ref={vref} className={s.medFill} src={`${url}#t=${t0.toFixed(2)}`} preload="metadata" playsInline muted loop style={{ objectFit: 'cover', background: '#000' }} />}
        <span className={s.medMeta}>{m.kind === 'video' ? fmtD(m.dur) : tx('Bilde')}</span>
        <button type="button" className={s.medDel} title={tx('Fjern fra biblioteket')} aria-label={tx('Fjern fra biblioteket')} onClick={() => (used ? c.flash('Filen er i bruk. Fjern klippene som bruker den først.') : c.removeMedia(m))}>×</button>
      </div>
      <div className={s.medBody}>
        <span className={s.medName}>{m.name}</span>
        <div className={s.medBtns}>
          <button type="button" className={s.mini} onClick={() => (replace ? c.replaceClip(replace, m) : c.insertClip(m))}>{tx(replace ? 'Bruk her' : 'Legg til')}</button>
          {!replace && <button type="button" className={s.mini} title={tx('Legg over hovedvideoen (bilde-i-bilde)')} onClick={() => c.addOverlay(m)}>{tx('Overlegg')}</button>}
        </div>
      </div>
    </div>
  )
}

export function LeftPanel({ c, S, p, tx, onShared, onLogoCloud }: { c: MotionController; S: MState; p: Project; tx: Tx; onShared: () => void; onLogoCloud: () => void }) {
  const rep = S.replaceFor && p.clips.some((x) => x.id === S.replaceFor) ? S.replaceFor : null
  const T = totalDur(p)
  const vis = p.media.filter((m) => m.kind !== 'audio')
  const lg = p.logo
  // Avansert: samme faner, men Media er mediebiblioteket (spor, varighet, feil per fil) og Musikk heter Lyd
  const tabs = (
    <div className={s.tabs} role="tablist" aria-label={tx('Legg til')} data-md-left-tabs="">
      {TABS.map(([k, l]) => (
        <button key={k} type="button" role="tab" className={s.tab} data-md-tab={k} aria-pressed={S.tab === k} aria-selected={S.tab === k} onClick={() => c.set({ tab: k })}>
          {ICONS[k]}<span>{tx(S.adv && k === 'audio' ? 'Lyd' : l)}</span>
        </button>
      ))}
    </div>
  )
  if (S.adv && S.tab === 'media') {
    return (
      <>
        {tabs}
        <AdvBin c={c} S={S} p={p} tx={tx} onShared={onShared} />
      </>
    )
  }
  return (
    <>
      {tabs}
      <div className={s.panel}>
        {S.tab === 'media' && (
          <>
            {rep && (
              <div className={s.replace}>
                <span>{tx('Velg filen som skal erstatte det valgte klippet.')}</span>
                <button type="button" className={s.linkBtn} onClick={() => c.set({ replaceFor: null })}>{tx('Avbryt')}</button>
              </div>
            )}
            <button type="button" className={s.bigLight} onClick={() => c.pickMedia()}>{tx('+ Last opp video, bilder eller lyd')}</button>
            <button type="button" className={`${s.barBtn} ${s.small}`} onClick={onShared}>{tx('Fra Dine medier')}</button>
            <span className={s.hint}>{tx('Du kan også dra filer rett inn i vinduet. Filene blir i nettleseren og lastes aldri opp.')}</span>
            <button type="button" className={s.dashed} onClick={() => c.addColor()}>{tx('+ Fargeflate')}</button>
            {vis.length > 0 && (
              <div className={s.medGrid}>
                {vis.map((m) => <MediaTile key={m.id} c={c} m={m} p={p} replace={rep} tx={tx} />)}
              </div>
            )}
          </>
        )}
        {S.tab === 'text' && (
          <>
            <span className={s.lead2}>{tx('Legges til ved spillehodet. Dra teksten i forhåndsvisningen for å flytte den.')}</span>
            {S.adv && <button type="button" className={s.dashed} data-md-add-text="" title={tx('Ny tekst på et tekstspor fra spillehodet')} onClick={() => c.addText({})}>{tx('+ Tom tekst')}</button>}
            {PRESETS.map((pr) => (
              <button key={pr.l} type="button" className={s.preset} onClick={() => c.addText(pr.o)}>
                <span className={s.presetL}>{tx(pr.l)}</span>
                <span className={s.presetD}>{tx(pr.d)}</span>
              </button>
            ))}
          </>
        )}
        {S.tab === 'subs' && (
          <>
            <div className={s.box}>
              <span className={s.boxTitle}>{tx('Lag med AI')}</span>
              <span className={s.note}>{tx('Talen i videoklippene gjøres om til tekst i nettleseren. Første gang lastes talemodellen ned.')}</span>
              <div className={s.segs}>
                {([['norwegian', 'Norsk'], ['english', 'Engelsk']] as const).map(([k, l]) => <button key={k} type="button" className={s.seg} aria-pressed={S.ai.lang === k} onClick={() => c.set((st) => ({ ai: { ...st.ai, lang: k } }))}>{tx(l)}</button>)}
              </div>
              <div className={s.segs}>
                {WHISPER_MODELS.map(([k, l, t]) => <button key={k} type="button" className={s.seg} title={tx(t)} aria-pressed={S.ai.model === k} onClick={() => c.set((st) => ({ ai: { ...st.ai, model: k } }))}>{tx(l)}</button>)}
              </div>
              <button type="button" className={s.bigLight} style={{ height: 36, fontSize: 12.5 }} disabled={S.ai.busy} onClick={() => void c.runAI()}>{tx(S.ai.busy ? 'Jobber …' : 'Lag undertekster med AI')}</button>
              {S.ai.msg && <span className={`${s.aiMsg} ${S.ai.err ? s.aiErr : ''}`} role="status">{tx(S.ai.msg.p, S.ai.msg.v)}</span>}
            </div>
            <div className={s.row}>
              <button type="button" className={`${s.dashed} ${s.small}`} data-md-add-sub="" title={tx('Ny undertekst fra spillehodet (2,5 s)')} onClick={() => c.addSub()}>{tx('+ Ved spillehodet')}</button>
              <button type="button" className={`${s.barBtn} ${s.small}`} onClick={() => c.pickSrtFile()}>{tx('Importer .srt')}</button>
              {p.subs.length > 0 && <button type="button" className={`${s.barBtn} ${s.small}`} onClick={() => c.downloadSrt()}>{tx('Last ned .srt')}</button>}
            </div>
            {p.subs.length > 0 && (
              <div className={s.subList}>
                {p.subs.map((sb) => {
                  const pick = () => {
                    c.seek(sb.start + 0.01)
                    c.set({ sel: { type: 'sub', id: sb.id } })
                  }
                  return (
                    <div key={sb.id} className={`${s.subItem} ${S.sel?.id === sb.id ? s.subItemSel : ''}`}>
                      <button type="button" className={s.subTime} title={tx('Gå til')} onClick={pick}>{fmtT(sb.start)}</button>
                      <textarea className={s.subText} rows={2} value={sb.text} onFocus={() => S.sel?.id !== sb.id && pick()} onChange={(e) => c.patch('sub', sb.id, { text: e.target.value.slice(0, 500) })} />
                      <button type="button" className={s.x} title={tx('Slett')} aria-label={tx('Slett')} onClick={() => c.setProj((q) => ({ ...q, subs: q.subs.filter((x) => x.id !== sb.id) }))}>×</button>
                    </div>
                  )
                })}
              </div>
            )}
            <div className={s.subStyle}>
              <span className={s.eyebrowSm} style={{ paddingTop: 8 }}>{tx('Utseende')}</span>
              <Fields fields={subStyleFields(c, p)} c={c} tx={tx} />
            </div>
          </>
        )}
        {S.tab === 'audio' && (
          <>
            <button type="button" className={s.bigLight} onClick={() => c.pickFiles('music', 'audio/*')}>{tx('+ Last opp musikk')}</button>
            <button type="button" className={`${s.vo} ${S.vo ? s.voOn : ''}`} onClick={() => void c.toggleVo()}>
              <span className={s.voDot} />
              <span>{tx(S.vo ? 'Stopp opptak' : 'Ta opp voiceover')}</span>
              {S.vo && <span className={s.voTime}>{fmtD(S.vo.secs)}</span>}
            </button>
            <span className={s.hint}>{tx('Bruk hodetelefoner mens du tar opp. Opptaket starter ved spillehodet og legges på lydsporet.')}</span>
            <span className={s.hint}>{tx('Bruk bare musikk du har rett til å bruke. Lyden i videoklippene justerer du på hvert klipp.')}</span>
            {p.music.length > 0 && (
              <>
                <span className={s.eyebrowSm}>{tx('På tidslinjen')}</span>
                {p.music.map((m) => (
                  <button key={m.id} type="button" className={`${s.track} ${S.sel?.id === m.id ? s.trackSel : ''}`} onClick={() => c.set({ sel: { type: 'music', id: m.id } })}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9d998f" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flex: '0 0 auto' }}><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
                    <span className={s.trackName}>{m.name || p.media.find((x) => x.id === m.media)?.name || tx('Lydspor')}</span>
                    <span className={s.trackMeta}>{fmtD(m.start)} – {fmtD(m.start + (m.loop ? T - m.start : m.out - m.in))}</span>
                  </button>
                ))}
              </>
            )}
            {p.media.some((m) => m.kind === 'audio') && (
              <>
                <span className={s.eyebrowSm}>{tx('I biblioteket')}</span>
                {p.media.filter((m) => m.kind === 'audio').map((m) => (
                  <div key={m.id} className={s.lib} onPointerDown={(e) => c.medDown(e, m)}>
                    <span className={s.trackName} style={{ fontWeight: 400 }}>{m.name}</span>
                    <span className={s.trackMeta}>{fmtD(m.dur)}</span>
                    <button type="button" className={s.libBtn} onClick={() => c.addMusic(m)}>{tx('Legg til')}</button>
                  </div>
                ))}
              </>
            )}
          </>
        )}
        {S.tab === 'logo' && (
          <>
            <Fields fields={logoFields(c, p)} c={c} tx={tx} />
            <span className={s.eyebrowSm}>{tx('Velg logo')}</span>
            <div className={s.logoGrid}>
              <button type="button" className={`${s.logoOpt} ${s.logoNone}`} title={tx('Ingen logo')} aria-label={tx('Ingen logo')} aria-pressed={!lg.on || !lg.src} onClick={() => c.patchLogo({ on: false, src: '' })}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="8.5" /><path d="M6 18L18 6" /></svg>
                <span>{tx('Ingen')}</span>
              </button>
              {p.media.filter((m) => m.kind === 'image').map((m) => (
                <button key={m.id} type="button" className={s.logoOpt} title={m.name} aria-label={m.name} aria-pressed={lg.src === m.id && lg.on}
                  style={{ backgroundImage: css(c.urls[m.id] ?? m.thumb) }}
                  onClick={() => (lg.src === m.id && lg.on ? c.patchLogo({ on: false, src: '' }) : c.patchLogo({ src: m.id, on: true }))} />
              ))}
              <button type="button" className={s.logoAdd} data-ch-felles-logo="1" onClick={onLogoCloud}>{tx('Fellesmappe')}</button>
              <button type="button" className={s.logoAdd} onClick={() => c.pickFiles('logo', IMAGE_ACCEPT.replace(',image/gif', ''))}>{tx('+ Last opp')}</button>
            </div>
          </>
        )}
        {S.tab === 'trans' && (
          <>
            <span className={s.hint}>{tx('Dra en overgang ned på videosporet. Den fester seg mellom to klipp, i starten eller på slutten. Du kan også velge et klipp og trykke på en overgang.')}</span>
            <div className={s.trGrid}>
              {TRSTD.map(([k, l, bg]) => (
                <button key={k} type="button" className={`${s.trTile} ${S.trDrag?.type === k ? s.trTileOn : ''}`} data-trans={k} onPointerDown={(e) => c.transDown(e, k)}>
                  <span className={s.trPrev} style={{ background: bg }} />
                  <span className={s.trName}>{tx(l)}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  )
}
