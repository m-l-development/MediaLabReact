'use no memo'
// Komponentene leser fra kontrolleren (c.selL(), c.s …); kompilatorens mellomlagring ville gitt utdaterte verdier.
import { useEffect, useRef, useState } from 'react'
import { fontReady } from '../../shared/fonts/loader'
import { TemplatePicker } from '../../shared/templates/TemplatePicker'
import type { PhotoController, PState } from './controller'
import { ColorBar } from './Colors'
import { FORMATS, TEMPLATES, type Format, type PdDoc, type Scheme } from './engine/model'
import { applyScheme, liveScheme, tplDoc } from './engine/palette'
import { docFonts, render } from './engine/render'
import type { Phrase, Tx } from './texts'
import { LIB_CATS, TPL_CAT, type LibPhoto } from './engine/templates'
import s from './PhotoDesign.module.css'

/**
 * Kø for miniatyrene: tegnes noen få om gangen per bilde (et lite tidsbudsjett), ikke alle 19 samtidig, så siden og
 * fargevelgeren ikke hakker når fargene endres. Miniatyrer som er utdatert før de tegnes, hoppes over.
 */
const drawQueue: (() => void)[] = []
let drawRaf = 0
// miniatyrene tegnes i egne korte oppgaver ETTER at bildet er vist (ikke i requestAnimationFrame før tegningen): et klikk
// (fargebytte, meny) vises straks, og miniatyrene følger fortløpende uten å holde igjen skjermen
const post = (() => {
  if (typeof MessageChannel === 'undefined') return (f: () => void) => void setTimeout(f, 0)
  const ch = new MessageChannel()
  let cb: (() => void) | null = null
  ch.port1.onmessage = () => { const f = cb; cb = null; f?.() }
  return (f: () => void) => { cb = f; ch.port2.postMessage(0) }
})()
function queueDraw(fn: () => void) {
  drawQueue.push(fn)
  if (!drawRaf) { drawRaf = 1; requestAnimationFrame(() => post(runDraws)) }
}
function runDraws() {
  const t0 = performance.now()
  while (drawQueue.length && performance.now() - t0 < 8) (drawQueue.shift() as () => void)()
  if (drawQueue.length) post(runDraws)
  else drawRaf = 0
}

/** Maler (og designsamlingens maler) der skriftene er lastet og tegningen gjort på nytt én gang. */
const fontsDone = new Set<string>()

const finalDocs = new Set<string>()
function fontsLoaded(d: PdDoc): boolean {
  try {
    return [...d.layers, ...(d.back?.layers ?? [])].every((l) => l.type !== 'text' || fontReady(l.font, l.weight, !!l.italic))
  } catch {
    return false
  }
}

/** Malene uten farger per format (oppsettet med tekstmåling lages én gang; fargene legges på ved hver tegning). */
const baseDocs = new Map<string, PdDoc>()
function baseDoc(k: string, w: number, h: number): PdDoc {
  const id = `${k}|${w}|${h}`
  let d = baseDocs.get(id)
  if (!d) {
    d = tplDoc(w, h, k, null)
    baseDocs.set(id, d)
    // bygd med alle skriftene på plass: tekstmålene er riktige og trenger ikke lages på nytt når skriftene meldes klare
    if (fontsLoaded(d)) finalDocs.add(id)
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
    // fonter fra biblioteket lastes ved bruk: tegnes på nytt når malens fonter er klare – bare første gang per mal
    // (før ble alle tekstmål kastet og alle miniatyrene tegnet to ganger ved hvert fargebytte)
    // malen bygges (med tekstmåling) i den tidsdelte tegnekøen, ikke for alle miniatyrene på én gang i effekten
    if (!fontsDone.has('t:' + k)) queueDraw(() => {
      if (ver < 0) return
      void Promise.all([document.fonts?.ready, docFonts(baseDoc(k, w, h))]).then(() => {
        if (fontsDone.has('t:' + k) || ver < 0) return
        fontsDone.add('t:' + k)
        let stale = false
        for (const id of [...baseDocs.keys()]) if (id.startsWith(k + '|') && !finalDocs.has(id)) { baseDocs.delete(id); stale = true } // tekstmålene med de riktige skriftene
        if (stale) draw(saved)
      })
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

/** Miniatyr av en ferdig mal fra designsamlingen, med fargevalget på startsiden. */
function LibPreview({ t, scheme, tx }: { t: LibPhoto; scheme: Scheme | null; tx: Tx }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const key = JSON.stringify(scheme)
  useEffect(() => {
    const c = ref.current
    if (!c) return
    let ver = 0
    const draw = (sc: Scheme | null) => {
      const v = ++ver
      queueDraw(() => {
        if (v !== ver) return
        const d = sc ? applyScheme(t.doc, sc) : t.doc
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
    if (!fontsDone.has('l:' + t.id)) {
      void Promise.all([document.fonts?.ready, docFonts(t.doc)]).then(() => {
        if (fontsDone.has('l:' + t.id) || ver < 0) return
        fontsDone.add('l:' + t.id)
        if (ver >= 0) draw(saved)
      })
    }
    const off = liveScheme.sub((scope, sc) => {
      if (scope === 'home' && sc !== undefined) draw(sc)
    })
    return () => {
      ver = -1e9
      off()
    }
  }, [t, key, tx])
  return <canvas ref={ref} />
}

export function Home({ c, S, tx, onBackup, onRestore, onBatch }: { c: PhotoController; S: PState; tx: Tx; onBackup: () => void; onRestore: () => void; onBatch: () => void }) {
  const [w, h] = c.fmtWH()
  const [libOpen, setLibOpen] = useState(false)
  useEffect(() => {
    void c.loadLib()
  }, [c])
  const fm: Format[] = [...FORMATS, { k: 'custom', l: 'Egendefinert', w: +S.cw || 1200, h: +S.ch || 800 }]
  const cat = c.catNow()
  const mine = S.entries.filter((p) => p.tpl && p.cat === cat)
  const projects = S.entries.filter((p) => !p.tpl)
  const shownProjects = S.projCat == null ? projects : S.projCat === '' ? projects.filter((p) => !p.cat || !S.cats.includes(p.cat)) : projects.filter((p) => p.cat === S.projCat)
  const lang = tx('nb-NO')
  // ett malbibliotek: Photos egne ferdige maler og designsamlingen i de samme kategoriene («Tomt» står for seg)
  const libItems = [
    ...TEMPLATES.filter((t) => t.k !== 'blank').map((t, i) => ({ id: t.k, name: tx(t.l as Phrase), cat: TPL_CAT[t.k] ?? 'Hverdag, kafé, info og sosiale medier', order: i, lib: null as LibPhoto | null })),
    ...(S.lib ?? []).map((t, i) => ({ id: t.id, name: `${t.id} ${t.name}`, cat: t.cat, order: 1000 + i, lib: t as LibPhoto | null })),
  ]
  const ownTpls = TEMPLATES.filter((t) => Object.prototype.hasOwnProperty.call(S.tplSchemes, t.k))
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
          {/* samme flyt som Thumbnail Studio: «Ny mal …» åpner den felles malpopupen (fargevelgeren står i popupen) */}
          <button type="button" className={s.pillDark} data-pd-lib-open="" onClick={() => setLibOpen(true)}>{tx('Ny mal …')}</button>
        </div>
        <span className={s.note}>{tx('Velg en ferdig mal i «Ny mal …» (alle maler, kategorier, søk og farger), eller start med en tom side.')}</span>
        {/* «Ny mal»: tom side (egne maler står under «Mine maler») */}
        <div className={s.tplGrid} data-pd-new="">
          <div className={s.tplItem}>
            <button type="button" className={s.tplCard} data-tpl="blank" onClick={() => c.create('blank')}>
              <div className={s.tplBox}><TplPreview k="blank" w={w} h={h} scheme={c.schemeFor('blank')} own={false} tx={tx} /></div>
              <span className={s.tplName}>{tx('Tomt')}</span>
            </button>
          </div>
          <div className={s.tplItem}>
            <button type="button" className={s.tplCard} data-pd-pano-new="" onClick={() => c.openPano()} title={tx('Sett sammen flere bilder til ett panorama')}>
              <div className={s.tplBox} style={{ display: 'grid', placeItems: 'center' }}>
                <svg width="64" height="32" viewBox="0 0 64 32" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M2 6c20 6 40 6 60 0v20c-20-6-40-6-60 0z" /><path d="M10 22l10-9 8 7 6-5 12 9" /></svg>
              </div>
              <span className={s.tplName}>{tx('Panorama')}</span>
            </button>
          </div>
        </div>
        {ownTpls.length > 0 && (
          <div className={s.rowBetween} data-pd-own-list="">
            <span className={s.note}>{tx('Egne farger for malen')}: {ownTpls.map((t) => tx(t.l as Phrase)).join(', ')}</span>
            {ownTpls.map((t) => <button key={t.k} type="button" className={s.tplReset} data-tpl-own={t.k} onClick={() => c.forgetTplScheme(t.k)}>{tx('Bruk fellesfargene')} · {tx(t.l as Phrase)}</button>)}
          </div>
        )}
      </section>
      {libOpen && (
        <TemplatePicker title={tx('Ny mal')} lead={tx('Velg hvordan den nye malen skal starte.')} onClose={() => setLibOpen(false)}
          head={<ColorBar value={S.scheme} onChange={(v) => c.setScheme(v)} tx={tx} scope="home" />}
          startLabel={tx('Start fra')} startAspect="1 / 1" startAttr="data-tpl"
          start={[{ id: 'blank', name: tx('Tomt'), desc: tx('Helt tom side i valgt format'), onPick: () => { setLibOpen(false); c.create('blank') }, preview: <TplPreview k="blank" w={w} h={h} scheme={c.schemeFor('blank')} own={false} tx={tx} /> }]}
          libLabel={tx('Ferdige maler')} libNote={tx('Alle ferdige maler samlet. Alt er vanlige lag: bytt tekst, bilder og farger. Fargene øverst gjelder alle malene; en mal du har gitt egne farger i editoren, beholder dem.')} cancelLabel={tx('Avbryt')}
          lib={{
            items: libItems, cats: LIB_CATS, catLabel: (k) => tx(k as Phrase), loading: S.lib == null, aspect: '1 / 1', attr: 'data-tpl',
            preview: (x) => x.lib ? <LibPreview t={x.lib} scheme={S.scheme} tx={tx} /> : <TplPreview k={x.id} w={w} h={h} scheme={c.schemeFor(x.id)} own={Object.prototype.hasOwnProperty.call(S.tplSchemes, x.id)} tx={tx} />,
            onPick: (x) => { setLibOpen(false); if (x.lib) c.createLib(x.lib); else c.create(x.id) },
          }} />
      )}
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
              {c.sharedOn() && <button type="button" className={s.chip} data-pd-publish="" disabled={S.busy === 'share'} title={tx('Del en kopi med menigheten. Din mal forblir privat.')} onClick={() => void c.publishTpl(p)}>{tx('Del med menigheten')}</button>}
            </div>
          ))}
        </div>
      </section>
      {c.sharedOn() && (
        <section className={s.section} data-pd-shared-tpls="">
          <span className={s.eyebrow}>{tx('Menighetens maler · delt av medlemmene')}</span>
          {!(S.sharedTpls ?? []).length && <span className={s.note}>{tx(S.sharedTpls ? 'Ingen delte maler ennå. Trykk «Del med menigheten» på en av dine maler.' : 'Laster …')}</span>}
          <div className={s.tplGrid}>
            {(S.sharedTpls ?? []).map((e) => (
              <div key={e.id} className={s.projCard} data-pd-shared-tpl={e.name}>
                <button type="button" className={s.projThumb} style={{ backgroundImage: e.thumb ? `url("${e.thumb}")` : 'none' }} aria-label={tx('Bruk «{name}»', { name: e.name })} onClick={() => void c.useSharedTpl(e)} />
                <div className={s.projText}><span>{e.name}</span><span>{e.w} × {e.h}{e.by ? ' · ' + tx('delt av {name}', { name: e.by }) : ''}</span></div>
                <button type="button" className={s.projDel} title={tx('Slett for menigheten')} aria-label={tx('Slett for menigheten')} onClick={() => void c.delSharedTpl(e)}>×</button>
              </div>
            ))}
          </div>
        </section>
      )}
      {projects.length > 0 && (
        <section className={s.section} data-pd-projects="">
          {/* kategorier for prosjektene (TB-8E2793): filter, nye prosjekter havner i valgt kategori, flytt fra kortet */}
          <div className={s.rowBetween}>
            <span className={s.eyebrow}>{tx('Mine prosjekter')}</span>
            <div className={s.chips} role="group" aria-label={tx('Kategori')}>
              <button type="button" className={s.chip} data-pd-projcat="*" aria-pressed={S.projCat == null} onClick={() => c.setProjCat(null)}>{tx('Alle')} · {projects.length}</button>
              {S.cats.map((cc) => {
                const n = projects.filter((p) => p.cat === cc).length
                return <button key={cc} type="button" className={s.chip} data-pd-projcat={cc} aria-pressed={S.projCat === cc} onClick={() => c.setProjCat(cc)}>{cc}{n ? ` · ${n}` : ''}</button>
              })}
              {projects.some((p) => !p.cat || !S.cats.includes(p.cat)) && <button type="button" className={s.chip} data-pd-projcat="" aria-pressed={S.projCat === ''} onClick={() => c.setProjCat('')}>{tx('Uten kategori')}</button>}
              <button type="button" className={s.chipAdd} data-pd-projcat-new="" onClick={() => c.newCat('proj')}>{tx('+ Ny kategori')}</button>
            </div>
          </div>
          {S.projCat && S.cats.includes(S.projCat) && <span className={s.note}>{tx('Nye prosjekter lagres i «{name}».', { name: S.projCat })}</span>}
          {!shownProjects.length && <span className={s.note} data-pd-projcat-empty="">{tx('Ingen prosjekter i denne kategorien ennå. Velg en kategori på et prosjektkort, eller lag et nytt prosjekt mens kategorien er valgt.')}</span>}
          <div className={s.tplGrid}>
            {shownProjects.map((p) => (
              <div key={p.id} className={s.projCard} data-project={p.name}>
                <button type="button" className={s.projThumb} style={{ backgroundImage: p.thumb ? `url("${p.thumb}")` : 'none' }} aria-label={p.name} onClick={() => void c.open(p.id)} />
                <div className={s.projText}><span>{p.name}</span><span>{p.batch != null ? tx('Bildeserie · {n} bilder', { n: p.batch }) : `${p.w} × ${p.h}`} · {new Date(p.updated).toLocaleDateString(lang)}</span></div>
                <select className={s.projCatSel} aria-label={tx('Kategori for {name}', { name: p.name })} data-pd-proj-cat="" value={p.cat && S.cats.includes(p.cat) ? p.cat : ''} onChange={(e) => void c.moveProject(p, e.target.value || null)}>
                  <option value="">{tx('Uten kategori')}</option>
                  {S.cats.map((cc) => <option key={cc} value={cc}>{cc}</option>)}
                </select>
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
