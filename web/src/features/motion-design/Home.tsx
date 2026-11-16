'use no memo'
// Komponentene leser fra kontrolleren (c.s …); kompilatorens mellomlagring ville gitt utdaterte verdier.
import { useEffect, useState } from 'react'
import type { MotionController, MState } from './controller'
import { fmtD, FORMATS, TEMPLATES, TPL_CAT, TPL_CATS } from './engine/model'
import { TemplateLibrary } from '../../shared/templates/TemplateLibrary'
import { ThemePicker } from '../../shared/templates/ThemePicker'
import type { Tx } from './texts'
import s from './MotionDesign.module.css'

const css = (u: string) => (u ? `url("${u.replace(/["\\\n]/g, '')}")` : 'none')

/** Er miniatyren (data-URL) nesten helt mørk/ensfarget? Eldre prosjekter kan ha en svart miniatyr (f.eks. lagret på iPhone). */
const darkMemo = new Map<string, boolean>()
function useDarkThumb(u: string): boolean | null {
  const [v, setV] = useState<{ u: string; dark: boolean } | null>(() => (darkMemo.has(u) ? { u, dark: darkMemo.get(u) as boolean } : null))
  useEffect(() => {
    if (!u || darkMemo.has(u)) return
    let live = true
    const im = new Image()
    im.onload = () => {
      const c = document.createElement('canvas')
      c.width = 24
      c.height = 24
      const g = c.getContext('2d', { willReadFrequently: true })
      let dark = false
      if (g) {
        g.drawImage(im, 0, 0, 24, 24)
        const d = g.getImageData(0, 0, 24, 24).data
        let sum = 0, sum2 = 0
        for (let i = 0; i < d.length; i += 4) { const l = 0.2126 * (d[i] ?? 0) + 0.7152 * (d[i + 1] ?? 0) + 0.0722 * (d[i + 2] ?? 0); sum += l; sum2 += l * l }
        const n = d.length / 4, mean = sum / n
        dark = !(mean > 28 || Math.sqrt(Math.max(0, sum2 / n - mean * mean)) > 10)
      }
      darkMemo.set(u, dark)
      if (live) setV({ u, dark })
    }
    im.onerror = () => { darkMemo.set(u, true); if (live) setV({ u, dark: true }) }
    im.src = u
    return () => { live = false }
  }, [u])
  if (!u) return true
  return v && v.u === u ? v.dark : (darkMemo.get(u) ?? null)
}

/** Prosjektkortets bilde: miniatyren, eller en tydelig reserve (format og varighet) når den mangler eller er mørk. */
function CardThumb({ thumb, label, ratio, dur, onOpen }: { thumb: string; label: string; ratio: string; dur: string; onOpen: () => void }) {
  const dark = useDarkThumb(thumb)
  if (dark) {
    return (
      <button type="button" className={`${s.cardThumb} ${s.cardFallback}`} aria-label={label} data-thumb="fallback" onClick={onOpen}>
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="M10 9.5v5l4.5-2.5z" fill="currentColor" stroke="none" /></svg>
        <span>{ratio} · {dur}</span>
      </button>
    )
  }
  return <button type="button" className={s.cardThumb} aria-label={label} data-thumb={dark === false ? 'image' : 'loading'} style={{ backgroundImage: css(thumb) }} onClick={onOpen} />
}

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
        {/* «Ny mal»: tomt prosjekt står for seg; alle ferdige maler i biblioteket under */}
        <button type="button" className={s.bigLight} style={{ alignSelf: 'flex-start', padding: '0 22px' }} data-tpl="blank" data-md-blank="" onClick={() => void c.pickTpl('blank')}>+ {tx('Tom')} · {tx('Start med tom tidslinje')}</button>
        {/* det felles malbiblioteket (alle ferdige maler, kategorier, søk, sortering) med felles fargevelger */}
        <TemplateLibrary attr="data-tpl" aspect={`${f.w} / ${f.h}`} minW={f.w / f.h < 0.9 ? 170 : 240}
          items={TEMPLATES.filter((tp) => tp.k !== 'blank').map((tp, i) => ({ id: tp.k, name: tx(tp.name), desc: tx(tp.desc), cat: TPL_CAT[tp.k] ?? 'Tekst og budskap', order: i }))}
          cats={TPL_CATS.filter((k) => k !== 'Start')} catLabel={(k) => tx(k as Parameters<typeof tx>[0])}
          head={<ThemePicker value={S.tplTheme} onChange={(v) => c.setTplTheme(v)} />}
          preview={(x) => S.tplThumbs[x.id] ? <img src={S.tplThumbs[x.id]} alt="" /> : null}
          onPick={(x) => void c.pickTpl(x.id)} />
      </div>
    )
  }
  return (
    <div className={s.menu}>
      <div className={s.homeHead}>
        <h1 className={s.title} data-ml-title="">Motion design</h1>
        <p className={s.lead}>{tx('Lag promovideoer og innhold til Instagram og Facebook med klipp, tekst, musikk og overganger.')}</p>
        <div className={s.homeBtns}>
          <button type="button" className={s.pillLight} data-md-new="" onClick={() => c.newProject()}>{tx('Nytt prosjekt')}</button>
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
                  <CardThumb thumb={p.thumb} label={tx('Åpne prosjekt')} ratio={f ? f.ratio : `${p.w}×${p.h}`} dur={fmtD(p.dur)} onOpen={() => void c.openEntry(p)} />
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
