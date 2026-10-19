'use no memo'
// Komponentene leser fra kontrolleren (c.selL(), c.s …); kompilatorens mellomlagring ville gitt utdaterte verdier.
import { useEffect, useRef, useState, type PointerEvent as RPE } from 'react'
import type { ToolId } from '../../domain/tool'
import { FillEditor } from '../../shared/fill/FillEditor'
import * as FX from '../../shared/fx/fx'
import { ColorBar } from './Colors'
import { PAL, type Interaction, type PhotoController, type PState, type Pt } from './controller'
import { BLEED, dims, SHAPES, type PdDoc, type PdLayer } from './engine/model'
import { applyScheme, liveScheme } from './engine/palette'
import { hit, render, shapePath } from './engine/render'
import { Props } from './Props'
import { Range } from './Ui'
import type { Phrase, Tx } from './texts'
import s from './PhotoDesign.module.css'

interface EditorProps {
  c: PhotoController
  S: PState
  tx: Tx
  pickFile: (replace?: string) => void
  onExport: (kind: 'download' | 'copy' | 'media', to?: ToolId) => void
  /** «Bruk i …» (SHR-02): verktøy som kan ta imot bildet. */
  sendTo?: { id: ToolId; label: string }[]
}

/** Følger én peker til den slippes (flytt, ramme, håndtak, pensel). */
function track(id: number, toPt: (e: PointerEvent) => Pt, it: Interaction | null) {
  if (!it) return
  const m = (ev: PointerEvent) => {
    if (ev.pointerId === id) it.move(toPt(ev), ev)
  }
  const u = (ev: PointerEvent) => {
    if (ev.pointerId !== id) return
    window.removeEventListener('pointermove', m)
    window.removeEventListener('pointerup', u)
    window.removeEventListener('pointercancel', u)
    it.up()
  }
  window.addEventListener('pointermove', m)
  window.addEventListener('pointerup', u)
  window.addEventListener('pointercancel', u)
}

const shapeIcons = new Map<string, string>()
const SHAPE_AR: Record<string, number> = { rect: 0.625, rounded: 0.625, arrow: 0.625, parallelogram: 0.6, trapezoid: 0.65, bubble: 0.8, half: 0.5 }

/** Forhåndsvisning av formene i «Former», tegnet med samme motor som lerretet. */
function shapeIcon(kind: string): string {
  const have = shapeIcons.get(kind)
  if (have) return have
  const c = document.createElement('canvas')
  const S = 96
  c.width = S
  c.height = S
  const g = c.getContext('2d')
  if (!g) return ''
  const ar = kind === 'line' ? 0.08 : (SHAPE_AR[kind] ?? 1)
  const w = S * 0.72
  const h = w * ar
  g.translate(S / 2, S / 2)
  shapePath(g, kind === 'rounded' ? 'rect' : kind, w, h, kind === 'rounded' ? S * 0.12 : 0)
  g.fillStyle = '#e9e7e2'
  g.fill(kind === 'ring' ? 'evenodd' : 'nonzero')
  const u = c.toDataURL('image/png')
  shapeIcons.set(kind, u)
  return u
}

function Toggle({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} className={s.toggle} onClick={onClick}>
      <span>{label}</span>
      <i aria-hidden="true" />
    </button>
  )
}

export function Editor(p: EditorProps) {
  const { c, S, tx, onExport } = p
  const d = S.doc
  if (!d) return null
  const saved = S.saved?.kind === 'unsaved' ? tx('Ikke lagret') : S.saved?.kind === 'saved' ? `${tx('Lagret')} ${new Date(S.saved.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''
  return (
    <div className={s.editor}>
      <header className={s.bar}>
        <button type="button" className={s.barBtn} onClick={() => void c.leave()}><span aria-hidden="true">←</span> {tx('Prosjekter')}</button>
        <input className={s.docName} value={d.name} aria-label={tx('Prosjektnavn')} onChange={(e) => c.setDocName(e.target.value)} />
        <div className={s.barGroup}>
          <button type="button" className={s.barRound} disabled={!c.canUndo} title={tx('Angre (Ctrl+Z)')} aria-label={tx('Angre')} onClick={() => c.undo()}>↶</button>
          <button type="button" className={s.barRound} disabled={!c.canRedo} title={tx('Gjør om (Ctrl+Shift+Z)')} aria-label={tx('Gjør om')} onClick={() => c.redo()}>↷</button>
        </div>
        <div className={s.zoom}>
          <button type="button" aria-label={tx('Zoom ut')} onClick={() => c.ui({ zoom: Math.max(0.1, S.zoom / 1.25) })}>−</button>
          <button type="button" className={s.zoomLabel} title={tx('Tilpass til vinduet')} onClick={() => c.ui({ zoom: 1 })}>{Math.round(c.sc() * 100)} %</button>
          <button type="button" aria-label={tx('Zoom inn')} onClick={() => c.ui({ zoom: Math.min(8, S.zoom * 1.25) })}>+</button>
        </div>
        {d.back && (
          <div className={s.seg}>
            {(['front', 'back'] as const).map((k) => <button key={k} type="button" aria-pressed={(d.side ?? 'front') === k} onClick={() => c.showSide(k)}>{tx(k === 'front' ? 'Forside' : 'Bakside')}</button>)}
          </div>
        )}
        <span className={s.flex} />
        <span className={S.saved?.kind === 'unsaved' ? s.savedWarn : s.saved}>{saved}</span>
        {!S.autosave && <button type="button" className={s.barBtn} title={tx('Lagre i nettleseren (Ctrl+S)')} onClick={() => void c.saveNow().then(() => !c.dirty && c.flash('Prosjektet er lagret.'))}>{tx('Lagre')}</button>}
        <button type="button" role="switch" aria-checked={S.autosave} className={s.autoBtn} title={tx('Lagre endringer automatisk i nettleseren')} onClick={() => c.toggleAutosave()}>
          <i aria-hidden="true" /><span>{tx('Autolagring')}</span>
        </button>
        <button type="button" className={s.exportBtn} aria-expanded={S.expOpen} onClick={() => c.ui({ expOpen: !S.expOpen })}>{tx('Eksporter')}</button>
        {S.expOpen && (
          <div className={s.expMenu}>
            <div className={s.seg}>
              {([['png', 'PNG'], ['jpg', 'JPG'], ['pdf', 'PDF trykk']] as const).map(([k, l]) => <button key={k} type="button" aria-pressed={S.exp.fmt === k} onClick={() => c.ui({ exp: { ...S.exp, fmt: k } })}>{tx(l)}</button>)}
            </div>
            {S.exp.fmt === 'pdf' ? (
              <>
                <span className={s.expNote}>{tx(d.bleed ? 'CMYK · 300 dpi · 3 mm utfallende' : 'CMYK · 300 dpi · uten utfallende')}{d.back ? ` · ${tx('2 sider')}` : ''}</span>
                <span className={s.note}>{tx('Fil klar for trykkeriet. Utfallende slås av og på under Dokument.')}</span>
              </>
            ) : (
              <div className={s.seg}>
                {([1, 2] as const).map((k) => <button key={k} type="button" aria-pressed={S.exp.scale === k} onClick={() => c.ui({ exp: { ...S.exp, scale: k } })}>{k}× · {d.w * k} × {d.h * k}</button>)}
              </div>
            )}
            {S.exp.fmt === 'png' && <Toggle label={tx('Gjennomsiktig bakgrunn')} on={S.exp.t} onClick={() => c.ui({ exp: { ...S.exp, t: !S.exp.t } })} />}
            <button type="button" className={s.primary} disabled={S.busy === 'exp'} onClick={() => onExport('download')}>{tx(S.busy === 'exp' ? 'Lager …' : 'Last ned')}</button>
            {S.exp.fmt !== 'pdf' && (
              <div className={s.row2}>
                <button type="button" className={s.pillDark} onClick={() => onExport('copy')}>{tx('Kopier bilde')}</button>
                <button type="button" className={s.pillDark} onClick={() => onExport('media')}>{tx('Lagre i Dine medier')}</button>
              </div>
            )}
            {S.exp.fmt !== 'pdf' && !!p.sendTo?.length && (
              <div className={s.row2}>
                {p.sendTo.map((x) => <button key={x.id} type="button" className={s.pillDark} disabled={S.busy === 'exp'} onClick={() => onExport('media', x.id)}>{x.label}</button>)}
              </div>
            )}
          </div>
        )}
      </header>
      <div className={s.work} data-narrow={S.narrow ? '1' : undefined}>
        <aside className={s.left}>
          <div className={s.leftScroll}>
            <div className={s.seg}>
              {([['lag', 'Lag'], ['stil', 'Stil'], ['fx', 'Effekter']] as const).map(([k, l]) => <button key={k} type="button" aria-pressed={S.ltab === k} onClick={() => c.ui({ ltab: k })}>{tx(l)}</button>)}
            </div>
            {S.ltab === 'lag' && <AddPanel {...p} />}
            {S.ltab === 'stil' && <StylePanel {...p} />}
            {S.ltab === 'fx' && <FxLibrary {...p} />}
          </div>
          <LayerList {...p} />
        </aside>
        <Stage {...p} />
        <aside className={s.right}>
          <Props c={c} S={S} tx={tx} pickFile={p.pickFile} />
        </aside>
      </div>
    </div>
  )
}

function AddPanel({ c, S, tx, pickFile }: EditorProps) {
  const btns: [Phrase, () => void, boolean?][] = [
    ['Bilde', () => pickFile()], ['Tekst', () => c.addText()], ['Form', () => c.addShape('rect')], ['Sirkel', () => c.addShape('ellipse')],
    ['Former', () => c.ui({ shapesOpen: !S.shapesOpen }), S.shapesOpen], ['Toning', () => c.addGrad()], ['Lys', () => c.addGlow()],
    ['Logo', () => c.ui({ logoOpen: !S.logoOpen }), S.logoOpen], ['Dine medier', () => c.openPicker('media')], ['Bibliotek', () => c.openPicker('cloud', {}, 'ressurser')],
  ]
  return (
    <>
      <span className={s.eyebrowSm}>{tx('Legg til')}</span>
      <div className={s.addGrid}>
        {btns.map(([l, on, active]) => <button key={l} type="button" aria-pressed={!!active} onClick={on}>{tx(l)}</button>)}
      </div>
      {S.shapesOpen && (
        <div className={s.shapeGrid}>
          {['rect', 'rounded', ...SHAPES.map((x) => x[0]).filter((k) => k !== 'rect')].map((k) => {
            const name = tx((k === 'rounded' ? 'Avrundet rektangel' : (SHAPES.find((x) => x[0] === k)?.[1] ?? k)) as Phrase)
            return <button key={k} type="button" title={name} aria-label={name} style={{ backgroundImage: `url("${shapeIcon(k)}")` }} onClick={() => c.addShape(k)} />
          })}
        </div>
      )}
      {S.logoOpen && (
        <div className={s.logoBox}>
          <button type="button" className={s.pillDark} data-ch-felles-logo="1" onClick={() => c.openPicker('cloud', { logo: true }, 'ressurser')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" aria-hidden="true"><path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4.2l2 2.2h8.8A1.5 1.5 0 0 1 21 8.7v9.8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z" /></svg>
            {tx('Fellesmappe')}
          </button>
        </div>
      )}
    </>
  )
}

function StylePanel({ c, S, tx }: EditorProps) {
  const d = S.doc
  if (!d) return null
  const v = { on: false, amt: 0.6, size: 0.55, color: '#000000', top: false, ...(d.vig ?? {}) }
  const fill = c.fillOf(d)
  return (
    <div className={s.stack}>
      <span className={s.eyebrowSm}>{tx('Malfarger')}</span>
      <ColorBar value={d.scheme ?? null} onChange={(sc) => c.setDocScheme(sc)} tx={tx} scope="doc" />
      <div className={s.hr} />
      <span className={s.eyebrowSm}>{tx('Farge på nye elementer')}</span>
      <div className={s.swatches}>
        <button type="button" className={s.autoChip} aria-pressed={!S.newCol} onClick={() => c.setNewCol(null)}>{tx('Auto')}</button>
        {PAL.slice(0, 11).map((v2) => <button key={v2} type="button" className={s.sw22} style={{ background: v2 }} aria-label={v2} aria-pressed={(S.newCol ?? '') === v2} onClick={() => c.setNewCol(v2)} />)}
      </div>
      <Toggle label={tx('Koblede farger')} on={S.linkCol} onClick={() => c.ui({ linkCol: !S.linkCol })} />
      <span className={s.note}>{tx('Når koblede farger er på, endres alle lag med samme farge samtidig.')}</span>
      <div className={s.hr} />
      <span className={s.eyebrowSm}>{tx('Bakgrunn og vignett')}</span>
      <FillEditor fill={fill} open={S.fillOpen} onToggle={() => c.ui({ fillOpen: !S.fillOpen })} onChange={(p) => c.putFill(p)} tx={tx} />
      <Toggle label={tx('Vignett')} on={v.on} onClick={() => c.setVig({ on: !v.on })} />
      {v.on && <Toggle label={tx('Over tekst')} on={v.top} onClick={() => c.setVig({ top: !v.top })} />}
      {v.on && (
        <>
          <label className={s.colorRow}><span>{tx('Vignettfarge')}</span><input type="color" value={v.color} onChange={(e) => c.setVig({ color: e.target.value }, 'vigc')} /></label>
          <Range label={tx('Styrke')} min={0} max={1} step={0.01} val={v.amt} show={`${Math.round(v.amt * 100)} %`} on={(x) => c.setVig({ amt: x }, 'viga')} />
          <Range label={tx('Størrelse')} min={0} max={1} step={0.01} val={v.size} show={`${Math.round(v.size * 100)} %`} on={(x) => c.setVig({ size: x }, 'vigs')} />
        </>
      )}
      <div className={s.hr} />
      <span className={s.eyebrowSm}>{tx('Maler')}</span>
      <div className={s.catRow}>
        <select value={c.catNow()} aria-label={tx('Kategori')} onChange={(e) => c.setTplCat(e.target.value)}>
          {S.cats.map((cc) => <option key={cc} value={cc}>{cc}</option>)}
        </select>
        <button type="button" title={tx('Ny kategori')} aria-label={tx('Ny kategori')} onClick={() => c.newCat()}>+</button>
      </div>
      <button type="button" className={s.primary} onClick={() => void c.saveTpl()}>{tx('Lagre som mal')}</button>
      <span className={s.note}>{tx('Maks 5 maler per kategori. Malene finner du på startsiden.')}</span>
    </div>
  )
}


/** Effektbiblioteket (Avansert modus): 1920 forhåndsvalg, favoritter, nylig brukt og egne. */
function FxLibrary({ c, S, tx }: EditorProps) {
  const [, setTick] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)
  const on = S.adv
  const cat = S.fxCat || 'all'
  const q = S.fxQ.trim().toLowerCase()
  const favs = new Set(on ? FX.favs() : [])
  const nm = (pr: FX.Preset) => (pr.custom ? pr.name : cat === 'fav' || cat === 'recent' ? `${tx(pr.look as Phrase)} · ${tx(pr.pal as Phrase)} · ${tx(pr.str as Phrase)}` : tx(pr.look as Phrase))
  let list: FX.Preset[] = []
  if (on) {
    if (cat === 'fav') list = FX.favs().map((id) => FX.byId(id)).filter((x): x is FX.Preset => !!x)
    else if (cat === 'recent') list = FX.recent().map((id) => FX.byId(id)).filter((x): x is FX.Preset => !!x)
    else if (cat === 'custom') list = FX.custom()
    else {
      const sfx = `-${S.fxPal}-${S.fxStr}`
      const base = FX.presets().filter((pr) => pr.id.endsWith(sfx))
      list = cat === 'all' ? [...FX.custom(), ...base] : base.filter((pr) => pr.fx === cat)
    }
    if (q) list = list.filter((pr) => `${nm(pr)} ${pr.name} ${tx((FX.KINDS[pr.fx]?.l ?? '') as Phrase)} ${FX.KINDS[pr.fx]?.l ?? ''}`.toLowerCase().includes(q))
  }
  const shown = list.slice(0, S.fxN)
  const keyOf = (pr: FX.Preset) => pr.id + (pr.custom ? JSON.stringify(pr.p) + pr.seed : '')

  const cats: [string, string][] = [['all', 'Alle'], ['fav', 'Favoritter'], ['recent', 'Nylig brukt'], ['custom', 'Egne'], ...Object.keys(FX.KINDS).map((k) => [k, FX.KINDS[k]?.l ?? k] as [string, string])]
  const vis = cat !== 'fav' && cat !== 'recent' && cat !== 'custom'
  return (
    <div className={s.stack}>
      <Toggle label={tx('Avansert modus')} on={on} onClick={() => c.toggleAdv()} />
      {!on && <span className={s.note}>{tx('Lås opp avanserte kreative pensler, filmatisk lys, bildemanipulasjon og profesjonell komposisjon.')}</span>}
      {on && (
        <>
          <input className={s.search} value={S.fxQ} placeholder={tx('Søk i effekter …')} aria-label={tx('Søk i effekter')} onChange={(e) => c.ui({ fxQ: e.target.value.slice(0, 60), fxN: 24 })} />
          <div className={s.fxCats}>
            {cats.map(([k, l]) => <button key={k} type="button" aria-pressed={cat === k} onClick={() => c.ui({ fxCat: k, fxN: 24 })}>{tx(l as Phrase)}</button>)}
          </div>
          {vis && (
            <>
              <div className={s.swatches}>
                {FX.PAL.map((pl, i) => <button key={pl[0]} type="button" className={s.palDot} title={tx(pl[0] as Phrase)} aria-label={tx(pl[0] as Phrase)} aria-pressed={i === S.fxPal} style={{ background: `linear-gradient(135deg,${pl[1]} 50%,${pl[2]} 50%)` }} onClick={() => c.ui({ fxPal: i })} />)}
              </div>
              <div className={s.fxStr}>
                {FX.STR.map((st, i) => <button key={st[0]} type="button" aria-pressed={i === S.fxStr} onClick={() => c.ui({ fxStr: i })}>{tx(st[0] as Phrase)}</button>)}
              </div>
            </>
          )}
          <span className={s.dimSm}>{list.length.toLocaleString()} {tx('forhåndsvalg')}</span>
          {!list.length && <span className={s.note}>{tx('Ingen effekter her ennå.')}</span>}
          <div className={s.fxGrid}>
            {shown.map((pr) => {
              return (
                <div key={keyOf(pr)} className={s.fxItem}>
                  <button type="button" title={nm(pr)} data-fx={pr.id} onClick={() => c.addFx(pr)}
                    onContextMenu={(e) => {
                      if (!pr.custom) return
                      e.preventDefault()
                      if (window.confirm(tx('Slette forhåndsvalget?'))) {
                        FX.delCustom(pr.id)
                        setTick((n) => n + 1)
                      }
                    }}
                    onDoubleClick={(e) => {
                      if (!pr.custom) return
                      e.preventDefault()
                      const v = window.prompt(tx('Nytt navn'), pr.name)
                      if (v) {
                        FX.renameCustom(pr.id, v)
                        setTick((n) => n + 1)
                      }
                    }}>
                    <FxThumb pr={pr} k={keyOf(pr)} />
                  </button>
                  <button type="button" className={s.fav} aria-label={tx('Favoritt')} title={tx('Favoritt')} style={{ color: favs.has(pr.id) ? '#f5b82c' : '#8a867e' }} onClick={(e) => {
                    e.stopPropagation()
                    FX.toggleFav(pr.id)
                    setTick((n) => n + 1)
                  }}>★</button>
                  <span>{nm(pr)}</span>
                </div>
              )
            })}
          </div>
          {list.length > S.fxN && <button type="button" className={s.pillDark} onClick={() => c.ui({ fxN: S.fxN + 24 })}>{tx('Vis flere')}</button>}
          <div className={s.row2}>
            <button type="button" className={s.smallBtn} title={tx('Importer egne forhåndsvalg (JSON)')} onClick={() => fileRef.current?.click()}>{tx('Importer')}</button>
            <button type="button" className={s.smallBtn} title={tx('Eksporter egne forhåndsvalg (JSON)')} onClick={() => {
              if (!FX.custom().length) {
                c.flash('Du har ingen egne forhåndsvalg ennå.')
                return
              }
              const a = document.createElement('a')
              a.href = URL.createObjectURL(new Blob([FX.exportJSON()], { type: 'application/json' }))
              a.download = 'medialab-effekter.json'
              a.click()
              setTimeout(() => URL.revokeObjectURL(a.href), 2000)
            }}>{tx('Eksporter egne')}</button>
          </div>
          <input ref={fileRef} type="file" hidden accept=".json,application/json" onChange={async (e) => {
            const f = e.target.files?.[0]
            e.target.value = ''
            if (!f) return
            if (f.size > 1e6 || !/\.json$/i.test(f.name)) {
              c.flash('Velg en JSON-fil under 1 MB.')
              return
            }
            try {
              const n = FX.importJSON(await f.text())
              c.flash(n ? 'Forhåndsvalgene er importert.' : 'Fant ingen gyldige forhåndsvalg.')
              c.ui({ fxCat: 'custom', fxN: 24 })
            } catch {
              c.flash('Kunne ikke lese filen.')
            }
          }} />
          <span className={s.note}>{tx('Hver effekt blir et eget lag som kan flyttes, skaleres og endres senere. Høyreklikk på egne forhåndsvalg for å slette, dobbeltklikk for å gi nytt navn. Bakgrunn, retusj og fargegradering finner du under Motiv og Farge på et bildelag.')}</span>
        </>
      )}
    </div>
  )
}

/** Miniatyrene lages én om gangen i en felles kø, så panelet ikke henger. */
const fxThumbs = new Map<string, string>()
const fxQueue: { k: string; pr: FX.Preset; done: (src: string) => void }[] = []
let fxRaf = 0
function runFxQueue() {
  fxRaf = 0
  const t0 = performance.now()
  while (fxQueue.length && performance.now() - t0 < 28) {
    const job = fxQueue.shift() as (typeof fxQueue)[number]
    let src = fxThumbs.get(job.k)
    if (src === undefined) {
      try {
        src = FX.thumb(job.pr)
      } catch {
        src = ''
      }
      fxThumbs.set(job.k, src)
    }
    job.done(src)
  }
  if (fxQueue.length) fxRaf = requestAnimationFrame(runFxQueue)
}

function FxThumb({ pr, k }: { pr: FX.Preset; k: string }) {
  const [src, setSrc] = useState<string | undefined>(() => fxThumbs.get(k))
  useEffect(() => {
    if (fxThumbs.has(k)) return
    let live = true
    fxQueue.push({ k, pr, done: (v) => live && setSrc(v) })
    if (!fxRaf) fxRaf = requestAnimationFrame(runFxQueue)
    return () => {
      live = false
    }
  }, [k, pr])
  const shown = src ?? fxThumbs.get(k)
  return shown ? <img src={shown} alt="" /> : null
}

/** Bare under et drag i laglisten. */
let lagDrag: string | null = null

function LayerList({ c, S, tx }: EditorProps) {
  const d = S.doc
  if (!d) return null
  const ids = new Set(c.selIds())
  return (
    <div className={s.layers}>
      <div className={s.layersHead}><span className={s.eyebrowSm}>{tx('Lag')}</span><span className={s.dimSm}>{d.layers.length || ''}</span></div>
      <div className={s.layersList}>
        {!d.layers.length && <span className={s.note}>{tx('Ingen lag ennå. Legg til et bilde, en tekst eller en form.')}</span>}
        {d.layers.slice().reverse().map((q) => {
          const txt = q.type === 'text' ? String(q.upper ? q.text.toUpperCase() : q.text).replace(/\s+/g, ' ').trim().slice(0, 40) : ''
          const label = txt && txt.toLowerCase() !== String(q.name || '').toLowerCase() ? `${q.name || tx('Tekst')} – ${txt}` : q.name
          const grpC = q.grp ? `hsl(${[...q.grp].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) % 360, 7)},70%,60%)` : 'transparent'
          return (
            <div key={q.id} data-layer={q.id} className={[s.layerRow, ids.has(q.id) ? s.layerOn : '', q.hidden ? s.layerHidden : ''].join(' ')} title={tx('Dra for å endre rekkefølge')} draggable
              onClick={(e) => c.clickLayer(q.id, e.shiftKey || e.ctrlKey || e.metaKey)}
              onDragStart={(e) => {
                lagDrag = q.id
                try {
                  e.dataTransfer.effectAllowed = 'move'
                  e.dataTransfer.setData('text/plain', q.id)
                } catch {
                  // eldre nettlesere
                }
              }}
              onDragOver={(e) => lagDrag && e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                const from = lagDrag
                lagDrag = null
                if (from) c.reorder(from, q.id)
              }}>
              <span className={s.layerIcon}>{q.type === 'image' ? 'B' : q.type === 'text' ? 'T' : q.type === 'fx' ? '✦' : q.type === 'glow' ? '☼' : '◼'}</span>
              {q.grp && <span className={s.grpDot} title={tx('Gruppe')} aria-label={tx('Gruppe')} style={{ background: grpC }} />}
              <LayerName value={q.name} display={label} tx={tx} onRename={(v) => v && c.patchL(q.id, { name: v })} />
              <button type="button" className={s.layerBtn} style={{ color: q.hidden ? '#555555' : '#c9c5bc' }} title={tx(q.hidden ? 'Vis' : 'Skjul')} aria-label={tx(q.hidden ? 'Vis' : 'Skjul')} onClick={(e) => {
                e.stopPropagation()
                c.patchL(q.id, { hidden: !q.hidden })
              }}>◉</button>
              <button type="button" className={s.layerBtn} style={{ color: q.locked ? '#f5b82c' : '#555555' }} title={tx(q.locked ? 'Lås opp' : 'Lås')} aria-label={tx(q.locked ? 'Lås opp' : 'Lås')} onClick={(e) => {
                e.stopPropagation()
                c.patchL(q.id, { locked: !q.locked })
              }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
              </button>
              <button type="button" className={s.layerDel} title={tx('Slett lag')} aria-label={tx('Slett lag')} onClick={(e) => {
                e.stopPropagation()
                c.delLayer(q.id)
              }}>×</button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** Lagnavn: dobbeltklikk for å gi nytt navn (Enter lagrer, Esc avbryter). */
function LayerName({ value, display, onRename, tx }: { value: string; display: string; onRename: (v: string) => void; tx: Tx }) {
  const [edit, setEdit] = useState(false)
  if (edit) {
    return (
      <input className={s.layerNameInput} autoFocus defaultValue={value} maxLength={60} aria-label={tx('Lagnavn')}
        onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          e.stopPropagation()
          if (e.key === 'Enter') e.currentTarget.blur()
          else if (e.key === 'Escape') {
            e.currentTarget.value = value
            e.currentTarget.blur()
          }
        }}
        onBlur={(e) => {
          setEdit(false)
          const v = e.currentTarget.value.trim().slice(0, 60)
          if (v !== value) onRename(v)
        }} />
    )
  }
  return <span className={s.layerName} title={tx('Dobbeltklikk for å gi nytt navn')} onDoubleClick={(e) => {
    e.stopPropagation()
    setEdit(true)
  }}>{display}</span>
}

const H = (kind: 'corner' | 'edgeX' | 'edgeY' | 'rot', sx: number, sy: number, left: string, top: string, cursor: string, label: Phrase) => ({ kind, sx, sy, left, top, cursor, label })

function Stage({ c, S, tx }: EditorProps) {
  const stage = useRef<HTMLElement>(null)
  const wrap = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const d = S.doc as NonNullable<PState['doc']>
  const sc = c.sc()

  // Tilpass til vinduet
  useEffect(() => {
    const el = stage.current
    if (!el) return
    const measure = () => {
      c.setFit(Math.max(0.02, Math.min((el.clientWidth - 60) / d.w, (el.clientHeight - 60) / d.h)))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [c, d.w, d.h])

  // Tegn lerretet (også når bare en maske er endret: hist)
  const hist = S.hist
  useEffect(() => {
    const cv = canvas.current
    if (!cv || hist < 0) return
    // Én tegning som alltid setter lerretets størrelse først. Før satte bare den første tegningen størrelsen; når
    // skriftene allerede var lastet (fonts.ready løst med en gang, f.eks. ved mal nummer to), ble den avbrutt av
    // tegningen etter fonts.ready, og lerretet ble stående på 10 × 10 – malen så tom ut (bare bakgrunnsfargen).
    // `doc`: mens du drar i fargevelgeren tegnes lerretet direkte med de foreløpige fargene (liveScheme), uten setDoc
    const draw = (doc: PdDoc = d) => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const k = Math.min(dpr * sc, 3200 / Math.max(doc.w, doc.h))
      const W = Math.max(1, Math.round(doc.w * k))
      const Hh = Math.max(1, Math.round(doc.h * k))
      if (cv.width !== W || cv.height !== Hh) {
        cv.width = W
        cv.height = Hh
      }
      const g = cv.getContext('2d')
      try {
        if (g) render(g, doc, k, c.M, { preview: 2000, phText: tx('Dra inn et bilde') })
      } catch (e) {
        console.warn(e)
      }
    }
    let raf = requestAnimationFrame(() => draw())
    let live = true
    void document.fonts?.ready.then(() => {
      if (!live) return
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => draw())
    })
    const off = liveScheme.sub((scope, scheme) => {
      if (scope !== 'doc' || scheme === undefined) return
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => draw(applyScheme(d, scheme)))
    })
    return () => {
      live = false
      off()
      cancelAnimationFrame(raf)
    }
  }, [c, d, sc, hist, tx])

  const pt = (e: { clientX: number; clientY: number }): Pt => {
    const r = (wrap.current as HTMLDivElement).getBoundingClientRect()
    return [(e.clientX - r.left) / sc, (e.clientY - r.top) / sc]
  }
  const L = c.selL()
  const dm = L ? dims(L) : null
  const ids = c.selIds()
  const isMulti = !L && ids.length > 1
  const mLs = isMulti ? d.layers.filter((q) => ids.includes(q.id)) : []
  const mGrp = isMulti && !!mLs[0]?.grp && mLs.every((q) => q.grp === mLs[0]?.grp)
  let box: { left: number; top: number; w: number; h: number; rot: number; col: string; line: string } | null = null
  if (L && dm && !L.hidden) box = { left: (L.x - dm.w / 2) * sc, top: (L.y - dm.h / 2) * sc, w: dm.w * sc, h: dm.h * sc, rot: L.rot || 0, col: S.tool === 'crop' ? '#f5b82c' : S.tool === 'brush' ? '#ff5a36' : '#3d8bff', line: S.tool === 'crop' ? 'dashed' : 'solid' }
  if (isMulti) {
    const b = c.boundsOf(ids)
    box = { left: b.x0 * sc, top: b.y0 * sc, w: (b.x1 - b.x0) * sc, h: (b.y1 - b.y0) * sc, rot: 0, col: '#3d8bff', line: mGrp ? 'solid' : 'dashed' }
  }
  const singleHandles = !L || L.locked || S.tool === 'brush' ? [] : [
    H('corner', -1, -1, '0%', '0%', 'nwse-resize', 'Skaler'), H('corner', 1, -1, '100%', '0%', 'nesw-resize', 'Skaler'), H('corner', 1, 1, '100%', '100%', 'nwse-resize', 'Skaler'), H('corner', -1, 1, '0%', '100%', 'nesw-resize', 'Skaler'),
    H('edgeX', -1, 0, '0%', '50%', 'ew-resize', 'Bredde'), H('edgeX', 1, 0, '100%', '50%', 'ew-resize', 'Bredde'), H('edgeY', 0, -1, '50%', '0%', 'ns-resize', 'Høyde'), H('edgeY', 0, 1, '50%', '100%', 'ns-resize', 'Høyde'),
    ...(S.tool === 'crop' ? [] : [H('rot', 0, 0, '50%', '-26px', 'grab', 'Roter')]),
  ]
  const multiHandles: [number, number, string, string, string][] = isMulti ? [[-1, -1, '0%', '0%', 'nwse-resize'], [1, -1, '100%', '0%', 'nesw-resize'], [1, 1, '100%', '100%', 'nwse-resize'], [-1, 1, '0%', '100%', 'nesw-resize'], [0, -1, '50%', '0%', 'ns-resize'], [1, 0, '100%', '50%', 'ew-resize'], [0, 1, '50%', '100%', 'ns-resize'], [-1, 0, '0%', '50%', 'ew-resize']] : []
  const down = (e: RPE, it: Interaction | null) => {
    if (!it) return
    e.preventDefault()
    track(e.pointerId, pt, it)
  }
  return (
    <section ref={stage} className={s.stage}
      onPointerDown={(e) => {
        if (e.target !== stage.current || e.button !== 0) return
        if (e.pointerType !== 'touch') e.preventDefault()
        const it = c.stageDown(pt(e), e.shiftKey || e.ctrlKey || e.metaKey, e.pointerType === 'touch')
        if (it) track(e.pointerId, pt, it)
      }}>
      <div ref={wrap} className={s.wrap} data-pd-wrap="1" style={{ width: d.w * sc, height: d.h * sc, cursor: S.tool === 'brush' ? 'none' : S.tool === 'crop' ? 'move' : 'default' }}
        onPointerDown={(e) => {
          if (e.button !== 0) return
          e.preventDefault()
          down(e, c.wrapDown(pt(e), e.shiftKey || e.ctrlKey || e.metaKey, e.altKey))
        }}
        onPointerMove={(e) => S.tool === 'brush' && c.ui({ brushXY: pt(e) })}
        onPointerLeave={() => S.brushXY && c.ui({ brushXY: null })}
        onDoubleClick={(e) => {
          const p = pt(e)
          const hitL = c.s.doc ? hit(c.s.doc, p[0], p[1]) : null
          if (!hitL) return
          if (hitL.type === 'text') {
            c.ui({ sel: hitL.id, multi: [] })
            setTimeout(() => {
              const t = document.querySelector<HTMLTextAreaElement>('textarea[data-pd-text]')
              t?.focus()
              t?.select()
            }, 30)
          } else if (hitL.type === 'image') c.ui({ sel: hitL.id, multi: [], tool: S.tool === 'crop' ? 'move' : 'crop', tab: 'layer' })
        }}>
        <canvas ref={canvas} width={10} height={10} className={s.canvas} />
        {d.bleed && <div className={s.safe} style={{ inset: BLEED * sc }} />}
        {S.guides?.lines.map(([x1, y1, x2, y2], i) => (
          <div key={`gl${i}`} className={s.guide} style={{ left: Math.min(x1, x2) * sc, top: Math.min(y1, y2) * sc, width: x1 === x2 ? 1 : Math.abs(x2 - x1) * sc, height: y1 === y2 ? 1 : Math.abs(y2 - y1) * sc }} />
        ))}
        {S.guides?.marks.map(([x1, y1, x2, y2, g], i) => {
          const v = x1 === x2
          return (
            <div key={`gm${i}`}>
              <div className={s.guide} style={{ left: Math.min(x1, x2) * sc, top: Math.min(y1, y2) * sc, width: v ? 1 : Math.abs(x2 - x1) * sc, height: v ? Math.abs(y2 - y1) * sc : 1 }} />
              <span className={s.guideLabel} style={{ left: ((x1 + x2) / 2) * sc, top: ((y1 + y2) / 2) * sc }}>{g}</span>
            </div>
          )
        })}
        {box && (
          <div className={s.selBox} style={{ left: box.left, top: box.top, width: box.w, height: box.h, transform: `rotate(${box.rot}deg)`, outline: `1.5px ${box.line} ${box.col}` }}>
            {singleHandles.map((h) => (
              <button key={`${h.kind}${h.left}${h.top}`} type="button" aria-label={tx(h.label)} className={h.kind === 'rot' ? s.handleRot : s.handle} style={{ left: h.left, top: h.top, cursor: h.cursor, borderColor: box?.col }}
                onPointerDown={(e) => {
                  e.stopPropagation()
                  down(e, c.handleDown(h.kind, h.sx, h.sy))
                }} />
            ))}
            {multiHandles.map(([sx, sy, left, top, cur]) => (
              <button key={`${left}${top}`} type="button" aria-label={tx(sx && sy ? 'Skaler alle' : 'Strekk')} className={s.handle} style={{ left, top, cursor: cur, borderColor: box?.col }}
                onPointerDown={(e) => {
                  e.stopPropagation()
                  down(e, c.groupScaleDown(sx, sy))
                }} />
            ))}
          </div>
        )}
        {d.layers.filter((q): q is Extract<PdLayer, { type: 'fx' }> => q.type === 'fx' && !q.hidden && !q.locked).map((q) => {
          const on = q.id === S.sel
          return (
            <div key={`pin${q.id}`} className={s.pin} style={{ left: `${(q.x / d.w) * 100}%`, top: `${(q.y / d.h) * 100}%` }}>
              <button type="button" className={on ? s.pinOn : s.pinBtn} title={tx('Dra for å flytte effekten')} aria-label={tx('Flytt effekt')} onPointerDown={(e) => {
                if (e.button !== 0) return
                e.stopPropagation()
                down(e, c.fxPinDown(q.id, pt(e)))
              }}>✦</button>
              {on && <button type="button" className={s.pinDel} title={tx('Fjern effekt')} aria-label={tx('Fjern effekt')} onPointerDown={(e) => {
                e.preventDefault()
                e.stopPropagation()
                c.delLayer(q.id)
              }}>×</button>}
            </div>
          )
        })}
        {S.tool === 'brush' && S.brushXY && <div className={s.brush} style={{ left: S.brushXY[0] * sc, top: S.brushXY[1] * sc, width: S.brush.size * sc, height: S.brush.size * sc }} />}
        {mLs.map((q) => {
          const m = dims(q)
          return <div key={`mb${q.id}`} className={s.multiBox} style={{ left: (q.x - m.w / 2) * sc, top: (q.y - m.h / 2) * sc, width: m.w * sc, height: m.h * sc, transform: `rotate(${q.rot || 0}deg)` }} />
        })}
        {S.marq && <div className={s.marq} style={{ left: Math.min(S.marq[0], S.marq[2]) * sc, top: Math.min(S.marq[1], S.marq[3]) * sc, width: Math.abs(S.marq[2] - S.marq[0]) * sc, height: Math.abs(S.marq[3] - S.marq[1]) * sc }} />}
      </div>
      {S.dragOver && <div className={s.dropOv}>{tx('Slipp bildet her')}</div>}
      {S.busy && S.busy !== 'exp' && (
        <div className={s.busy} role="status">
          <span>{tx(S.busy === 'model' ? 'Laster ned AI-modell …' : S.busy === 'run' ? 'Klipper ut motivet …' : 'Åpner …')}</span>
          {S.busy === 'model' && S.pct > 0 && <span className={s.dimSm}>{S.pct} %</span>}
        </div>
      )}
    </section>
  )
}

