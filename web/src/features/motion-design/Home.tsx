'use no memo'
// Komponentene leser fra kontrolleren (c.s …); kompilatorens mellomlagring ville gitt utdaterte verdier.
import type { MotionController, MState } from './controller'
import { fmtD, FORMATS, TEMPLATES } from './engine/model'
import type { Tx } from './texts'
import s from './MotionDesign.module.css'

const css = (u: string) => (u ? `url("${u.replace(/["\\\n]/g, '')}")` : 'none')

export function Home({ c, S, tx, folders, onOpenFile, onGrantWaiting }: { c: MotionController; S: MState; tx: Tx; folders: boolean; onOpenFile: () => void; onGrantWaiting: () => void }) {
  const lang = tx('nb-NO')
  if (S.view === 'format') {
    return (
      <div className={s.menu}>
        <button type="button" className={s.stepBack} onClick={() => c.goBack()}><span>←</span><span>{tx('Prosjekter')}</span></button>
        <div className={s.stepHead}>
          <span className={s.eyebrow}>{tx('Steg 1 av 2')}</span>
          <h2 className={s.h2}>{tx('Velg format')}</h2>
        </div>
        <div className={s.formatGrid}>
          {FORMATS.map((f) => {
            const r = f.w / f.h
            return (
              <button key={f.k} type="button" className={s.formatCard} data-format={f.k} onClick={() => c.pickFormat(f)}>
                <span className={s.formatBox}><span className={s.formatShape} style={{ width: r >= 1 ? 96 : Math.round(96 * r), height: r >= 1 ? Math.round(96 / r) : 96 }} /></span>
                <span className={s.formatName}>{tx(f.name)}</span>
                <span className={s.formatSize}>{f.ratio} · {f.w} × {f.h}</span>
              </button>
            )
          })}
          <div className={s.customCard}>
            <span className={s.formatName}>{tx('Egendefinert størrelse')}</span>
            <div className={s.customRow}>
              <input className={s.customInput} inputMode="numeric" aria-label={tx('Bredde')} value={S.cw} onChange={(e) => c.set({ cw: e.target.value.replace(/\D/g, '').slice(0, 4) })} />
              <span>×</span>
              <input className={s.customInput} inputMode="numeric" aria-label={tx('Høyde')} value={S.ch} onChange={(e) => c.set({ ch: e.target.value.replace(/\D/g, '').slice(0, 4) })} />
            </div>
            <span className={s.formatSize}>{tx('240–4096 piksler')}</span>
            <button type="button" className={s.smallLight} onClick={() => c.applyCustom()}>{tx('Bruk størrelsen')}</button>
          </div>
        </div>
      </div>
    )
  }
  if (S.view === 'tpl' && S.fmt) {
    const f = S.fmt
    return (
      <div className={s.menu}>
        <button type="button" className={s.stepBack} onClick={() => c.goBack()}><span>←</span><span>{tx('Format')}</span></button>
        <div className={s.stepHead}>
          <span className={s.eyebrow}>{tx('Steg 2 av 2 · {fmt}', { fmt: `${tx(f.name)} · ${f.ratio}` })}</span>
          <h2 className={s.h2}>{tx('Velg mal')}</h2>
        </div>
        <div className={s.tplGrid} style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${f.w / f.h < 0.9 ? 170 : 240}px, 1fr))` }}>
          {TEMPLATES.map((tp) => (
            <button key={tp.k} type="button" className={s.tplCard} data-tpl={tp.k} onClick={() => void c.pickTpl(tp.k)}>
              <span className={s.tplImg} style={{ aspectRatio: `${f.w} / ${f.h}`, backgroundImage: css(S.tplThumbs[tp.k] ?? '') }} />
              <span className={s.tplText}>
                <span className={s.formatName}>{tx(tp.name)}</span>
                <span className={s.tplDesc}>{tx(tp.desc)}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    )
  }
  return (
    <div className={s.menu}>
      <div className={s.homeHead}>
        <h1 className={s.title}>Motion design</h1>
        <p className={s.lead}>{tx('Lag promovideoer og innhold til Instagram og Facebook med klipp, tekst, musikk og overganger.')}</p>
        <div className={s.homeBtns}>
          <button type="button" className={s.pillLight} onClick={() => c.newProject()}>{tx('Nytt prosjekt')}</button>
          <button type="button" className={s.pillGhost} onClick={onOpenFile}>{tx('Åpne prosjektfil')}</button>
          {folders && <button type="button" className={s.pillGhost} title={tx('Åpne et prosjekt fra en mappe på PC-en (også fra en annen PC)')} onClick={() => void c.openFolder()}>{tx('Åpne prosjektmappe')}</button>}
        </div>
        {S.msg && <span className={s.homeMsg} role="status">{tx(S.msg.p, S.msg.v)}</span>}
        {S.waiting.length > 0 && (
          <div className={s.waiting}>
            <span>{tx('{n} prosjekter fra forrige versjon ligger i prosjektmapper. Gi tilgang for å hente dem.', { n: S.waiting.length })}</span>
            <button type="button" className={s.smallLight} onClick={onGrantWaiting}>{tx('Gi tilgang')}</button>
          </div>
        )}
      </div>
      {S.entries.length > 0 && (
        <div className={s.section}>
          <span className={s.eyebrow}>{tx('Dine prosjekter')}</span>
          <div className={s.projGrid}>
            {S.entries.map((p) => {
              const f = FORMATS.find((x) => x.k === p.fmt)
              const meta = `${f ? f.ratio : `${p.w}×${p.h}`} · ${fmtD(p.dur)} · ${new Date(p.updated).toLocaleDateString(lang, { day: 'numeric', month: 'short' })}`
              return (
                <div key={p.id} className={s.card} data-project={p.id}>
                  <button type="button" className={s.cardThumb} aria-label={tx('Åpne prosjekt')} style={{ backgroundImage: css(p.thumb) }} onClick={() => void c.openEntry(p)} />
                  <div className={s.cardRow}>
                    <div className={s.cardText}>
                      <span className={s.cardName}>{p.name}</span>
                      <span className={s.cardMeta}>{meta}</span>
                    </div>
                    <button type="button" className={s.openBtn} onClick={() => void c.openEntry(p)}>{tx('Åpne')}</button>
                    <button type="button" className={s.delBtn} title={tx('Slett prosjekt')} aria-label={tx('Slett prosjekt')} onClick={() => void c.delProject(p)}>×</button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
      {S.ready && !S.entries.length && <p className={s.emptyNote}>{tx('Prosjektene lagres i denne nettleseren, eller i en prosjektmappe på PC-en hvis du velger det. Videoer lastes aldri opp.')}</p>}
    </div>
  )
}
