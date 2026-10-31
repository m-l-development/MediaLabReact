'use no memo'
// Komponentene leser fra kontrolleren (c.selL(), c.s …); kompilatorens mellomlagring ville gitt utdaterte verdier.
import { useEffect, useRef } from 'react'
import type { PhotoController, PState } from './controller'
import { ColorBar } from './Colors'
import { FORMATS, TEMPLATES, type Format, type PdDoc, type Scheme } from './engine/model'
import { applyScheme, liveScheme, tplDoc } from './engine/palette'
import { render } from './engine/render'
import type { Phrase, Tx } from './texts'
import s from './PhotoDesign.module.css'

/**
 * Kø for miniatyrene: tegnes noen få om gangen per bilde (et lite tidsbudsjett), ikke alle 19 samtidig, så siden og
 * fargevelgeren ikke hakker når fargene endres. Miniatyrer som er utdatert før de tegnes, hoppes over.
 */
const drawQueue: (() => void)[] = []
let drawRaf = 0
function queueDraw(fn: () => void) {
  drawQueue.push(fn)
  if (!drawRaf) drawRaf = requestAnimationFrame(runDraws)
}
function runDraws() {
  drawRaf = 0
  const t0 = performance.now()
  while (drawQueue.length && performance.now() - t0 < 8) (drawQueue.shift() as () => void)()
  if (drawQueue.length) drawRaf = requestAnimationFrame(runDraws)
}

/** Malene uten farger per format (oppsettet med tekstmåling lages én gang; fargene legges på ved hver tegning). */
const baseDocs = new Map<string, PdDoc>()
function baseDoc(k: string, w: number, h: number): PdDoc {
  const id = `${k}|${w}|${h}`
  let d = baseDocs.get(id)
  if (!d) {
    d = tplDoc(w, h, k, null)
    baseDocs.set(id, d)
  }
  return d
}

/**
 * Miniatyr av en mal i valgt format og med malens farger (tegnet med samme motor som lerretet). Mens du drar i
 * fargevelgeren (liveScheme), tegnes miniatyren på nytt direkte – uten at startsiden rendres på nytt.
 */
function TplPreview({ k, w, h, scheme, own, tx }: { k: string; w: number; h: number; scheme: Scheme | null; own: boolean; tx: Tx }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const key = JSON.stringify(scheme)
  useEffect(() => {
    const c = ref.current
    if (!c) return
    let ver = 0
    const draw = (sc: Scheme | null) => {
      const v = ++ver
      queueDraw(() => {
        if (v !== ver) return // utdatert (en nyere tegning er bestilt)
        const base = baseDoc(k, w, h)
        const d = k === 'blank' || !sc ? base : applyScheme(base, sc)
        const z = Math.min(160 / d.w, 160 / d.h)
        const dpr = Math.min(2, window.devicePixelRatio || 1)
        const W = Math.round(d.w * z * dpr), H = Math.round(d.h * z * dpr)
        if (c.width !== W || c.height !== H) {
          c.width = W
          c.height = H
          c.style.width = `${Math.round(d.w * z)}px`
          c.style.height = `${Math.round(d.h * z)}px`
        }
        const g = c.getContext('2d')
        if (g) render(g, d, z * dpr, { media: new Map(), masks: new Map() }, { phText: tx('Bilde') })
      })
    }
    const saved = JSON.parse(key) as Scheme | null
    draw(saved)
    void document.fonts?.ready.then(() => {
      baseDocs.clear() // tekstmålene med de riktige skriftene
      if (ver >= 0) draw(saved)
    })
    const off = own ? () => undefined : liveScheme.sub((scope, sc) => {
      if (scope === 'home' && sc !== undefined) draw(sc)
    })
    return () => {
      ver = -1e9
      off()
    }
  }, [k, w, h, key, own, tx])
  return <canvas ref={ref} width={10} height={10} className={s.tplCanvas} />
}

export function Home({ c, S, tx, onBackup, onRestore, onBatch }: { c: PhotoController; S: PState; tx: Tx; onBackup: () => void; onRestore: () => void; onBatch: () => void }) {
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
      <section className={s.section} data-pd-batch-home="">
        <span className={s.eyebrow}>{tx('Mange bilder')}</span>
        <div className={s.rowBetween}>
          <span className={s.note}>{tx('Rediger mange separate bilder i én serie: hvert bilde får egne justeringer, og alle kan eksporteres samlet som ZIP.')}</span>
          <button type="button" className={s.pillDark} data-pd-batch-new="" onClick={onBatch}>{tx('Ny bildeserie')}</button>
        </div>
      </section>
      <section className={s.section}>
        <div className={s.rowBetween}>
          <span className={s.eyebrow}>{tx('2 · Mal')}</span>
          <ColorBar value={S.scheme} onChange={(v) => c.setScheme(v)} tx={tx} scope="home" />
        </div>
        <span className={s.note}>{tx('Fargene gjelder alle malene. En mal du har gitt egne farger i editoren, beholder dem.')}</span>
        <div className={s.tplGrid}>
          {TEMPLATES.map((t) => {
            const own = Object.prototype.hasOwnProperty.call(S.tplSchemes, t.k)
            return (
              <div key={t.k} className={s.tplItem}>
                <button type="button" className={s.tplCard} data-tpl={t.k} onClick={() => c.create(t.k)}>
                  <div className={s.tplBox}><TplPreview k={t.k} w={w} h={h} scheme={c.schemeFor(t.k)} own={own} tx={tx} /></div>
                  <span className={s.tplName}>{tx(t.l as Phrase)}</span>
                  {own && <span className={s.tplOwn} data-tpl-own={t.k}>{tx('Egne farger for malen')}</span>}
                </button>
                {own && <button type="button" className={s.tplReset} onClick={() => c.forgetTplScheme(t.k)}>{tx('Bruk fellesfargene')}</button>}
              </div>
            )
          })}
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
                <div className={s.projText}><span>{p.name}</span><span>{p.batch != null ? tx('Bildeserie · {n} bilder', { n: p.batch }) : `${p.w} × ${p.h}`} · {new Date(p.updated).toLocaleDateString(lang)}</span></div>
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
