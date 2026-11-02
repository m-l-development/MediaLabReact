'use no memo'
// Komponentene leser fra kontrolleren (c.selL(), c.s …); kompilatorens mellomlagring ville gitt utdaterte verdier.
import { useRef, type PointerEvent as ReactPointerEvent } from 'react'
import type { ToolId } from '../../domain/tool'
import { useLang } from '../../shared/i18n/i18n'
import { MaskEditor } from '../../shared/mask/MaskEditor'
import { ContextMenu as Menu } from '../../shared/ui/ContextMenu'
import { type CropBox, type PanelKey, type State, type ThumbController } from './controller'
import { COMBOS } from './engine/colors'
import type { ImageCache } from './engine/images'
import { MAX_TPL } from './engine/model'
import type { Phrase, Tx } from './texts'
import s from './ThumbnailStudio.module.css'

const mb = (n: number, en: boolean) => {
  const v = (n / 1048576).toFixed(1)
  return `${en ? v : v.replace('.', ',')} MB`
}

function Modal({ label, onClose, wide, children }: { label: string; onClose: () => void; wide?: 'sm' | 'md' | 'lg'; children: React.ReactNode }) {
  return (
    <div className={s.modalBack} onClick={onClose}>
      <div className={wide === 'sm' ? s.modalSm : wide === 'md' ? s.modalMd : s.modal} role="dialog" aria-modal="true" aria-label={label} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}

/** «Ny mal» og «Bytt oppsett»: kategoriens grunnoppsett og standardoppsettene, med fargevalg. */
export function NewDialog({ c, S, tx }: { c: ThumbController; S: State; tx: Tx }) {
  const cat = c.cat()
  if (!cat) return null
  const list = c.newList(cat)
  const cur = COMBOS.find((x) => x.k === S.newPal) ?? COMBOS[0]
  const items = list.map((o) => {
    const img = o.k === 'blank' ? '' : c.previewOf(cat, o.k)
    return (
      <button key={o.k} type="button" className={s.layoutCard} data-layout={o.k} onClick={() => c.pickNew(cat, o)}>
        <span className={s.layoutThumb}>
          {img && <img src={img} alt="" />}
          {o.k !== 'blank' && img == null && <span>{tx('Lager skisse …')}</span>}
        </span>
        <span className={s.layoutText}>
          <b>{o.translate ? tx(o.name as Phrase) : o.name}</b>
          <span>{tx(o.desc as Phrase)}</span>
        </span>
      </button>
    )
  })
  const top = items.slice(0, c.layoutsOf(cat).length + 1)
  return (
    <Modal label={tx(S.newMode === 'apply' ? 'Bytt oppsett' : 'Ny mal')} onClose={() => c.closeNew()}>
      <div className={s.modalHead}>
        <div>
          <span className={s.modalTitle}>{tx(S.newMode === 'apply' ? 'Bytt oppsett' : 'Ny mal')}</span>
          <span className={s.modalLead}>{tx(S.newMode === 'apply' ? 'Velg et nytt oppsett. Personbilde, navn, tema og egne bilder blir med over. Du kan angre etterpå.' : 'Velg hvordan den nye malen skal starte.')}</span>
        </div>
        <div className={s.rel}>
          <button type="button" className={s.palBtn} aria-expanded={S.palOpen} onClick={() => c.togglePal()}>
            <span className={s.palSw}>{cur?.sw.map((x, i) => <i key={i} style={{ background: x }} />)}</span>
            <span>{tx('Velg farge')}</span>
            <span className={s.dim}>{cur ? tx(cur.name as Phrase) : ''}</span>
          </button>
          {S.palOpen && (
            <div className={s.palMenu}>
              {COMBOS.map((x) => (
                <button key={x.k} type="button" aria-pressed={x.k === S.newPal} onClick={() => c.setPal(x.k)}>
                  <span className={s.palSw}>{x.sw.map((col, i) => <i key={i} style={{ background: col }} />)}</span>
                  <span>{tx(x.name as Phrase)}</span>
                  <span aria-hidden="true" style={{ opacity: x.k === S.newPal ? 1 : 0 }}>✓</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className={s.layoutGrid}>{top}</div>
      <div className={s.layoutGrid}>{items.slice(top.length)}</div>
      <div className={s.modalFoot}>
        <button type="button" className={s.pillSm} onClick={() => c.closeNew()}>{tx('Avbryt')}</button>
      </div>
    </Modal>
  )
}

export function ExportDialog({ c, S, tx, onDownload, onCopy, onSaveMedia, sendTo = [] }: { c: ThumbController; S: State; tx: Tx; onDownload: () => void; onCopy: () => void; onSaveMedia: (to?: ToolId) => void; sendTo?: { id: ToolId; label: string }[] }) {
  const en = useLang() === 'en'
  const tooBig = S.expSize != null && S.expSize > 2 * 1024 * 1024
  return (
    <Modal label={tx('Eksporter')} onClose={() => c.closeExport()} wide="md">
      <span className={s.modalTitle}>{tx('Eksporter thumbnail')}</span>
      <div className={s.ctrl}>
        <span className={s.ctrlLabel}>{tx('Oppløsning')}</span>
        <div className={s.segLg}>
          <button type="button" aria-pressed={S.expRes === '1080'} onClick={() => c.setExport({ expRes: '1080' })}>1080p · 1920 × 1080</button>
          <button type="button" aria-pressed={S.expRes === '4k'} onClick={() => c.setExport({ expRes: '4k' })}>4K · 3840 × 2160</button>
        </div>
      </div>
      <div className={s.ctrl}>
        <span className={s.ctrlLabel}>{tx('Format')}</span>
        <div className={s.segLg}>
          <button type="button" aria-pressed={S.expFmt === 'png'} onClick={() => c.setExport({ expFmt: 'png' })}>PNG</button>
          <button type="button" aria-pressed={S.expFmt === 'jpg'} onClick={() => c.setExport({ expFmt: 'jpg' })}>JPG</button>
        </div>
      </div>
      {S.expFmt === 'png' && (
        <label className={s.checkTop}>
          <input type="checkbox" checked={S.expT} onChange={(e) => c.setExport({ expT: e.target.checked })} />
          <span><span>{tx('Gjennomsiktig bakgrunn')}</span><span className={s.dimSm}>{tx('Bakgrunn og vignett tas bort. Bare lagene blir med.')}</span></span>
        </label>
      )}
      <div className={s.advice}>
        <span className={s.eyebrowSm}>{tx('Hva passer best?')}</span>
        {([['YouTube', 'JPG i 1080p. Liten fil, og alltid under grensen på 2 MB.'], ['Appen og nettsiden', 'PNG i 1080p. Skarpest tekst og logoer.'], ['Gjennomsiktig bakgrunn', 'Bare PNG. Bruk det når bildet skal ligge oppå en video eller et annet bilde.'], ['Storskjerm og trykk', 'PNG i 4K. Størst fil og mest detaljer.']] as [Phrase, Phrase][]).map(([a, b]) => (
          <div key={a}><b>{tx(a)}</b><span>{tx(b)}</span></div>
        ))}
      </div>
      <div className={s.ctrl}>
        <span className={s.sizeText}>{S.expSize == null ? tx('Beregner filstørrelse …') : tx('Filstørrelse: {size}', { size: mb(S.expSize, en) })}</span>
        {tooBig && (
          <div className={s.warnRow}>
            <span>{tx('Filen er over 2 MB. Det er for stort for YouTube, men fungerer fint i appen.')}</span>
            {!(S.expFmt === 'jpg' && S.expRes === '1080') && (
              <button type="button" className={s.btnOn} onClick={() => c.setExport(S.expFmt === 'png' ? { expFmt: 'jpg' } : { expRes: '1080' })}>{tx(S.expFmt === 'png' ? 'Bytt til JPG' : 'Bytt til 1080p')}</button>
            )}
          </div>
        )}
      </div>
      <div className={s.modalFootRight}>
        <button type="button" className={s.textBtn} onClick={() => c.closeExport()}>{tx('Avbryt')}</button>
        <button type="button" className={s.pillSm} disabled={S.expBusy} onClick={onCopy}>{tx('Kopier')}</button>
        <button type="button" className={s.pillSm} disabled={S.expBusy} onClick={() => onSaveMedia()}>{tx('Lagre i Dine medier')}</button>
        {/* «Bruk i …» (SHR-02): lagres i Dine medier og åpnes i det andre verktøyet */}
        {sendTo.map((x) => <button key={x.id} type="button" className={s.pillSm} disabled={S.expBusy} onClick={() => onSaveMedia(x.id)}>{x.label}</button>)}
        <button type="button" className={s.pillPrimary} disabled={S.expBusy} onClick={onDownload}>
          {S.expBusy ? tx('Lager bildet …') : S.expSize != null ? `${tx('Last ned')} · ${mb(S.expSize, en)}` : tx('Last ned')}
        </button>
      </div>
    </Modal>
  )
}

export function SaveDialog({ c, S, tx }: { c: ThumbController; S: State; tx: Tx }) {
  const cat = c.cat()
  const list = c.tplsOf(S.catId)
  const full = list.length >= MAX_TPL
  const btns: [Phrase, () => void, boolean, boolean][] = S.tplId
    ? [['Lagre endringer', () => void c.doSave('over'), true, false], ['Lagre som ny', () => void c.doSave('new'), false, full]]
    : [['Lagre som ny mal', () => void c.doSave('new'), true, full]]
  return (
    <Modal label={tx('Lagre mal')} onClose={() => c.ui({ save: false })} wide="sm">
      <span className={s.modalTitle}>{tx('Lagre mal')}</span>
      <label className={s.ctrl}>
        <span className={s.ctrlLabel}>{tx('Navn')}</span>
        <input className={s.input} value={S.tplName} placeholder={tx('Navn på malen')} onChange={(e) => c.setTplName(e.target.value)} />
      </label>
      <span className={s.note}>{S.tplId ? tx('Lagre endringene i denne malen, eller lagre som en ny mal. {n} av 5 maler brukt.', { n: list.length }) : tx('{n} av 5 maler brukt i {cat}.', { n: list.length, cat: cat?.name ?? '' })}</span>
      <div className={s.btns}>
        {btns.map(([label, on, primary, dis]) => <button key={label} type="button" className={primary ? s.pillPrimarySm : s.pillSm} disabled={dis} onClick={on}>{tx(label)}</button>)}
      </div>
      {full && !S.tplId && (
        <div className={s.overList}>
          <span className={s.ctrlLabel}>{tx('Kategorien er full (5 maler). Overskriv en av disse:')}</span>
          {list.map((t) => <button key={t.id} type="button" onClick={() => void c.doSave(t.id)}>{tx('Overskriv «{name}»', { name: t.name })}</button>)}
        </div>
      )}
    </Modal>
  )
}

const CROP_HANDLES: [string, number, number, string][] = [['tl', 0, 0, 'nwse-resize'], ['t', 50, 0, 'ns-resize'], ['tr', 100, 0, 'nesw-resize'], ['r', 100, 50, 'ew-resize'], ['br', 100, 100, 'nwse-resize'], ['b', 50, 100, 'ns-resize'], ['bl', 0, 100, 'nesw-resize'], ['l', 0, 50, 'ew-resize']]

export function CropDialog({ c, S, tx, images }: { c: ThumbController; S: State; tx: Tx; images: ImageCache }) {
  const box = useRef<HTMLDivElement>(null)
  const l = c.layer(S.cropId)
  const en = l?.type === 'image' ? images.get(l.src) : null
  if (!l || !en) return null
  const nw = en.img.naturalWidth
  const nh = en.img.naturalHeight
  const k = Math.min(Math.min(900, window.innerWidth - 72) / nw, (window.innerHeight * 0.62) / nh)
  const b = S.cropBox
  const P = (v: number) => `${v * 100}%`
  const down = (e: ReactPointerEvent) => {
    if (e.button) return
    e.preventDefault()
    e.stopPropagation()
    const el = box.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const h = (e.target as HTMLElement).dataset.h ?? 'm'
    const x0 = e.clientX
    const y0 = e.clientY
    const b0: CropBox = { ...S.cropBox }
    const M = 0.05
    const cl = (v: number, a: number, z: number) => Math.max(a, Math.min(z, v))
    const move = (ev: PointerEvent) => {
      const dx = (ev.clientX - x0) / r.width
      const dy = (ev.clientY - y0) / r.height
      const n = { ...b0 }
      if (h === 'm') {
        n.cL = cl(b0.cL + dx, 0, b0.cL + b0.cR)
        n.cR = b0.cR - (n.cL - b0.cL)
        n.cT = cl(b0.cT + dy, 0, b0.cT + b0.cB)
        n.cB = b0.cB - (n.cT - b0.cT)
      } else {
        if (h.includes('l')) n.cL = cl(b0.cL + dx, 0, 1 - b0.cR - M)
        if (h.includes('r')) n.cR = cl(b0.cR - dx, 0, 1 - b0.cL - M)
        if (h.includes('t')) n.cT = cl(b0.cT + dy, 0, 1 - b0.cB - M)
        if (h.includes('b')) n.cB = cl(b0.cB - dy, 0, 1 - b0.cT - M)
      }
      c.setCropBox(n)
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }
  return (
    <div className={s.cropBack} role="dialog" aria-modal="true" aria-label={tx('Beskjær bildet')}>
      <div className={s.cropHead}>
        <span className={s.modalTitle}>{tx('Beskjær bildet')}</span>
        <span className={s.modalLead}>{tx('Dra i kantene eller hjørnene. Dra inne i rammen for å flytte den.')}</span>
      </div>
      <div ref={box} className={s.cropArea} style={{ width: Math.round(nw * k), height: Math.round(nh * k) }}>
        <img src={en.url} alt="" draggable={false} />
        <div className={s.cropShade} style={{ left: 0, right: 0, top: 0, height: P(b.cT) }} />
        <div className={s.cropShade} style={{ left: 0, right: 0, bottom: 0, height: P(b.cB) }} />
        <div className={s.cropShade} style={{ left: 0, top: P(b.cT), width: P(b.cL), height: P(1 - b.cT - b.cB) }} />
        <div className={s.cropShade} style={{ right: 0, top: P(b.cT), width: P(b.cR), height: P(1 - b.cT - b.cB) }} />
        <div className={s.cropFrame} data-h="m" onPointerDown={down} style={{ left: P(b.cL), top: P(b.cT), width: P(1 - b.cL - b.cR), height: P(1 - b.cT - b.cB) }}>
          <i style={{ left: '33.33%', top: 0, bottom: 0, width: 1 }} />
          <i style={{ left: '66.66%', top: 0, bottom: 0, width: 1 }} />
          <i style={{ top: '33.33%', left: 0, right: 0, height: 1 }} />
          <i style={{ top: '66.66%', left: 0, right: 0, height: 1 }} />
          {CROP_HANDLES.map(([h, x, y, cur]) => <b key={h} data-h={h} style={{ left: `${x}%`, top: `${y}%`, cursor: cur }} />)}
        </div>
      </div>
      <div className={s.cropBtns}>
        <button type="button" className={s.pillSm} onClick={() => c.cropTrim()}>{tx('Fjern tomme kanter')}</button>
        <button type="button" className={s.pillSm} onClick={() => c.setCropBox({ cL: 0, cT: 0, cR: 0, cB: 0 })}>{tx('Vis hele bildet')}</button>
        <span style={{ width: 12 }} />
        <button type="button" className={s.textBtn} onClick={() => c.closeCrop(false)}>{tx('Avbryt')}</button>
        <button type="button" className={s.pillPrimary} onClick={() => c.closeCrop(true)}>{tx('Bruk')}</button>
      </div>
    </div>
  )
}

const PANEL_NAMES: Record<PanelKey, Phrase> = { add: 'Legg til', layers: 'Lag', canvas: 'Lerret', props: 'Egenskaper' }
const PRESET_NAMES: [string, Phrase][] = [['std', 'Standard'], ['cols', 'Egen lagkolonne'], ['tabs', 'Faner'], ['right', 'Lerret til venstre'], ['mirror', 'Speilet'], ['side', 'Ett sidepanel']]

/** Bare under et drag i «Egen visning». */
let lcDrag: PanelKey | null = null

export function LayoutDialog({ c, S, tx }: { c: ThumbController; S: State; tx: Tx }) {
  const d = S.lcDraft
  if (!d) return null
  const close = () => c.ui({ lcOpen: false, lcDraft: null })
  const H: Record<PanelKey, number> = { canvas: 150, props: 96, add: 70, layers: 70 }
  return (
    <Modal label={tx('Egen visning')} onClose={close}>
      <div>
        <span className={s.modalTitle}>{tx('Egen visning')}</span>
        <span className={s.modalLead}>{tx('Dra fanene til den kolonnen du vil. Slipp en fane oppå en annen for å legge dem etter hverandre, og dra dem for å endre rekkefølgen. Tomme kolonner blir ikke vist.')}</span>
      </div>
      <div className={s.btns}>
        <span className={s.dimSm}>{tx('Start fra:')}</span>
        {PRESET_NAMES.map(([k, label]) => <button key={k} type="button" className={s.btnSmall} onClick={() => c.lcFrom(k)}>{tx(label)}</button>)}
      </div>
      <div className={s.lcGrid}>
        {d.cols.map((col, si) => (
          <div key={si} className={s.lcSlot} onDragOver={(e) => e.preventDefault()} onDrop={(e) => {
            e.preventDefault()
            if (lcDrag) c.lcMove(lcDrag, si, null)
            lcDrag = null
          }}>
            <span className={s.eyebrowSm}>{tx('Kolonne')} {si + 1}</span>
            {col.map((k, i) => (
              <div key={k} className={k === 'canvas' ? s.lcItemCanvas : s.lcItem} style={{ minHeight: H[k] }} draggable
                onDragStart={(e) => {
                  lcDrag = k
                  try {
                    e.dataTransfer.setData('text/plain', 'ts-panel')
                  } catch {
                    // eldre nettlesere
                  }
                }}
                onDragEnd={() => {
                  lcDrag = null
                }}
                onDragOver={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  const src = lcDrag
                  lcDrag = null
                  if (src && src !== k) c.lcMove(src, si, k)
                }}>
                <span className={s.lcName}><i aria-hidden="true">⋮⋮</i>{tx(PANEL_NAMES[k])}</span>
                <span className={s.lcMoves}>
                  <button type="button" disabled={si === 0} title={tx('Flytt til venstre kolonne')} aria-label={tx('Flytt til venstre kolonne')} onClick={() => c.lcShift(k, 'left')}>←</button>
                  <button type="button" disabled={i === 0} title={tx('Flytt opp')} aria-label={tx('Flytt opp')} onClick={() => c.lcShift(k, 'up')}>↑</button>
                  <button type="button" disabled={i === col.length - 1} title={tx('Flytt ned')} aria-label={tx('Flytt ned')} onClick={() => c.lcShift(k, 'down')}>↓</button>
                  <button type="button" disabled={si === 4} title={tx('Flytt til høyre kolonne')} aria-label={tx('Flytt til høyre kolonne')} onClick={() => c.lcShift(k, 'right')}>→</button>
                </span>
              </div>
            ))}
            {!col.length && <span className={s.lcEmpty}>{tx('Slipp en fane her')}</span>}
            {col.length > 1 && (
              <label className={s.lcTabs}>
                <input type="checkbox" checked={!!d.tabs[si]} onChange={(e) => c.lcTabs(si, e.target.checked)} />
                <span>{tx('Vis som faner')}</span>
              </label>
            )}
          </div>
        ))}
      </div>
      <div className={s.modalFootSplit}>
        <button type="button" className={s.textBtn} onClick={() => c.lcFrom('std')}>{tx('Tilbakestill til grunnoppsett')}</button>
        <div className={s.btns}>
          <button type="button" className={s.pillSm} onClick={close}>{tx('Avbryt')}</button>
          <button type="button" className={s.pillPrimarySm} onClick={() => c.lcApply()}>{tx('Bruk visningen')}</button>
        </div>
      </div>
    </Modal>
  )
}

export function ContextMenu({ c, S, tx }: { c: ThumbController; S: State; tx: Tx }) {
  const m = S.ctx
  if (!m) return null
  const has = m.on || c.selIds().length > 0
  const clip = c.getClip().length > 0
  const mod = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent) ? '⌘' : 'Ctrl+'
  const items: [Phrase, string, () => void, boolean][] = [
    ['Kopier', `${mod}C`, () => c.copyLayers(false), has],
    ['Klipp ut', `${mod}X`, () => c.copyLayers(true), has],
    ['Lim inn', `${mod}V`, () => c.pasteLayers(null), clip],
    ['Lim inn her', '', () => c.pasteLayers(m.p), clip],
    ['Speil vannrett', 'Shift+H', () => c.flipSel('x'), has],
    ['Speil loddrett', 'Shift+V', () => c.flipSel('y'), has],
    ['Dupliser', `${mod}D`, () => S.sel && c.dupLayer(S.sel), has && c.selIds().length === 1],
    ['Flytt fram', '', () => S.sel && c.moveZ(S.sel, 1), has && c.selIds().length === 1],
    ['Flytt bak', '', () => S.sel && c.moveZ(S.sel, -1), has && c.selIds().length === 1],
    ['Slett', 'Del', () => (S.multi.length > 1 ? c.delGroup() : S.sel && c.delLayer(S.sel)), has],
  ]
  // felles meny (shared/ui/ContextMenu): tastatur (piltaster, Enter, Escape), fokus tilbake, innenfor vinduet
  return (
    <Menu x={m.x} y={m.y} label={tx('Lagmeny')} onClose={() => c.ui({ ctx: null })} items={[
      ...items.map(([label, sc, fn, en]) => ({ label: tx(label), keys: sc, disabled: !en, onSelect: fn })),
      { label: tx('Angre'), keys: `${mod}Z`, separator: true, onSelect: () => c.undo() },
      { label: tx('Gjør om'), keys: `${mod}Shift+Z`, onSelect: () => c.redo() },
      { label: tx('Zoom inn'), keys: '+', separator: true, disabled: S.zoom >= 4, onSelect: () => c.zoomIn() },
      { label: tx('Zoom ut'), keys: '−', disabled: S.zoom <= 1, onSelect: () => c.zoomOut() },
      { label: '100 %', keys: '0 · Shift+1', disabled: S.zoom === 1, onSelect: () => c.setZoom(1) },
      { label: tx('Zoom til markering'), keys: 'Shift+2', disabled: !has, onSelect: () => c.viewSel() },
      { label: tx('Forrige visning'), keys: mod === '⌘' ? '⌥0' : 'Alt+0', onSelect: () => c.viewBack() },
    ]} />
  )
}

/**
 * «Finjuster utklippet»: den felles maskeredigeringen (samme som Isolate Subject) på originalbildet, med masken fra
 * utklippet. «Bruk» lagrer en ny versjon i Dine medier og bruker den i laget; originalen tas vare på.
 */
export function MaskDialog({ c, S, tx }: { c: ThumbController; S: State; tx: Tx }) {
  const e = S.maskEdit
  if (!e) return null
  return (
    <div className={s.maskBack} role="dialog" aria-modal="true" aria-label={tx('Finjuster utklippet')} data-ts-mask="">
      <div className={s.cropHead}>
        <span className={s.modalTitle}>{tx('Finjuster utklippet')}</span>
        <span className={s.modalLead}>{tx('Behold eller fjern deler av bildet med pensel, former eller «Velg objekt». Originalen tas vare på.')}</span>
      </div>
      <div className={s.maskBody}>
        <MaskEditor image={e.image} mask={e.mask} onChange={() => undefined} selectObject={(x, y) => c.selectInMask(x, y)} />
      </div>
      <div className={s.cropBtns}>
        <button type="button" className={s.pillSm} disabled={e.busy} onClick={() => c.closeMaskEdit()}>{tx('Avbryt')}</button>
        <button type="button" className={s.pillSm} data-ts-mask-apply="" disabled={e.busy} onClick={() => void c.applyMaskEdit()}>{tx(e.busy ? 'Lagrer …' : 'Bruk')}</button>
      </div>
    </div>
  )
}
