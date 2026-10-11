'use no memo'
// Komponentene leser fra kontrolleren (c.selL(), c.s …); kompilatorens mellomlagring ville gitt utdaterte verdier.
import { useEffect, useRef } from 'react'
import type { PhotoController, PState } from './controller'
import { FORMATS, newDoc, TEMPLATES, type Format } from './engine/model'
import { render } from './engine/render'
import type { Phrase, Tx } from './texts'
import s from './PhotoDesign.module.css'

/** Miniatyr av en mal i valgt format (tegnet med samme motor som lerretet). */
function TplPreview({ k, w, h, tx }: { k: string; w: number; h: number; tx: Tx }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current
    if (!c) return
    let live = true
    const draw = () => {
      if (!live) return
      const d = newDoc(w, h, k)
      const sc = Math.min(160 / d.w, 160 / d.h)
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      c.width = Math.round(d.w * sc * dpr)
      c.height = Math.round(d.h * sc * dpr)
      c.style.width = `${Math.round(d.w * sc)}px`
      c.style.height = `${Math.round(d.h * sc)}px`
      const g = c.getContext('2d')
      if (g) render(g, d, sc * dpr, { media: new Map(), masks: new Map() }, { phText: tx('Bilde') })
    }
    draw()
    void document.fonts?.ready.then(draw)
    return () => {
      live = false
    }
  }, [k, w, h, tx])
  return <canvas ref={ref} width={10} height={10} className={s.tplCanvas} />
}

export function Home({ c, S, tx, onBackup, onRestore }: { c: PhotoController; S: PState; tx: Tx; onBackup: () => void; onRestore: () => void }) {
  const [w, h] = c.fmtWH()
  const fm: Format[] = [...FORMATS, { k: 'custom', l: 'Egendefinert', w: +S.cw || 1200, h: +S.ch || 800 }]
  const cat = c.catNow()
  const mine = S.entries.filter((p) => p.tpl && p.cat === cat)
  const projects = S.entries.filter((p) => !p.tpl)
  const lang = tx('nb-NO')
  return (
    <div className={s.home}>
      <div className={s.homeHead}>
        <h1 className={s.title} data-ml-title="">Photo design</h1>
        <p className={s.lead}>{tx('Lag bilder for sosiale medier og trykk. Velg format og mal, og juster farger, tekst og motiv.')}</p>
      </div>
      <section className={s.section}>
        <span className={s.eyebrow}>{tx('1 · Format')}</span>
        <div className={s.formats}>
          {fm.map((f) => {
            const k = 18 / Math.max(f.w, f.h)
            return (
              <button key={f.k} type="button" className={s.format} aria-pressed={S.fmt === f.k} onClick={() => c.ui({ fmt: f.k })}>
                <span className={s.formatIcon} style={{ width: Math.max(6, f.w * k), height: Math.max(6, f.h * k) }} />
                <span className={s.formatText}>
                  <span>{tx(f.l as Phrase)}</span>
                  <span>{f.w} × {f.h}</span>
                </span>
              </button>
            )
          })}
        </div>
        {S.fmt === 'custom' && (
          <div className={s.custom}>
            <label><span>{tx('Bredde')}</span><input type="number" min={64} max={8000} value={S.cw} onChange={(e) => c.ui({ cw: e.target.value })} /></label>
            <label><span>{tx('Høyde')}</span><input type="number" min={64} max={8000} value={S.ch} onChange={(e) => c.ui({ ch: e.target.value })} /></label>
            <span className={s.dim}>{tx('piksler')}</span>
          </div>
        )}
      </section>
      <section className={s.section}>
        <span className={s.eyebrow}>{tx('2 · Mal')}</span>
        <div className={s.tplGrid}>
          {TEMPLATES.map((t) => (
            <button key={t.k} type="button" className={s.tplCard} data-tpl={t.k} onClick={() => c.create(t.k)}>
              <div className={s.tplBox}><TplPreview k={t.k} w={w} h={h} tx={tx} /></div>
              <span className={s.tplName}>{tx(t.l as Phrase)}</span>
            </button>
          ))}
        </div>
      </section>
      <section className={s.section}>
        <div className={s.rowBetween}>
          <span className={s.eyebrow}>{tx('Egne maler')}</span>
          <div className={s.chips}>
            {S.cats.map((cc) => {
              const n = S.entries.filter((p) => p.tpl && p.cat === cc).length
              return <button key={cc} type="button" className={s.chip} aria-pressed={cc === cat} onClick={() => c.setTplCat(cc)}>{cc}{n ? ` · ${n}` : ''}</button>
            })}
            <button type="button" className={s.chipAdd} onClick={() => c.newCat()}>{tx('+ Ny kategori')}</button>
          </div>
        </div>
        {!mine.length && <span className={s.note}>{tx('Ingen maler i denne kategorien ennå. Åpne et prosjekt og trykk «Lagre som mal» under Stil.')}</span>}
        <div className={s.tplGrid}>
          {mine.map((p) => (
            <div key={p.id} className={s.projCard}>
              <button type="button" className={s.projThumb} style={{ backgroundImage: p.thumb ? `url("${p.thumb}")` : 'none' }} aria-label={p.name} onClick={() => void c.open(p.id)} />
              <div className={s.projText}><span>{p.name}</span><span>{p.w} × {p.h}</span></div>
              <button type="button" className={s.projDel} title={tx('Slett mal')} aria-label={tx('Slett mal')} onClick={() => void c.delProject(p)}>×</button>
            </div>
          ))}
        </div>
      </section>
      {projects.length > 0 && (
        <section className={s.section}>
          <span className={s.eyebrow}>{tx('Mine prosjekter')}</span>
          <div className={s.tplGrid}>
            {projects.map((p) => (
              <div key={p.id} className={s.projCard} data-project={p.name}>
                <button type="button" className={s.projThumb} style={{ backgroundImage: p.thumb ? `url("${p.thumb}")` : 'none' }} aria-label={p.name} onClick={() => void c.open(p.id)} />
                <div className={s.projText}><span>{p.name}</span><span>{p.w} × {p.h} · {new Date(p.updated).toLocaleDateString(lang)}</span></div>
                <button type="button" className={s.projDel} title={tx('Slett prosjekt')} aria-label={tx('Slett prosjekt')} onClick={() => void c.delProject(p)}>×</button>
              </div>
            ))}
          </div>
        </section>
      )}
      <section className={s.backupRow}>
        <span className={s.eyebrow}>{tx('Sikkerhetskopi')}</span>
        <button type="button" className={s.pillDark} onClick={onBackup}>{tx('Last ned sikkerhetskopi')}</button>
        <button type="button" className={s.pillDark} onClick={onRestore}>{tx('Gjenopprett fra fil')}</button>
      </section>
    </div>
  )
}
