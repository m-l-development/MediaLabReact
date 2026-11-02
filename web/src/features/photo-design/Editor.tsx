'use no memo'
// Komponentene leser fra kontrolleren (c.selL(), c.s …); kompilatorens mellomlagring ville gitt utdaterte verdier.
import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as RPE } from 'react'
import { setSnap, snapPref } from '../../shared/lib/snap'
import { useStageNav } from '../../shared/lib/useStageNav'
import { NumField } from '../../shared/ui/NumField'
import { formatKeys } from '../../shared/ui/shortcuts'
import { ContextMenu, type MenuItem } from '../../shared/ui/ContextMenu'
import { useStore } from '../../shared/lib/store'
import type { ToolId } from '../../domain/tool'
import { FillEditor } from '../../shared/fill/FillEditor'
import { MaskEditor } from '../../shared/mask/MaskEditor'
import * as FX from '../../shared/fx/fx'
import { ColorBar } from './Colors'
import { PAL, type Interaction, type PhotoController, type PState, type Pt } from './controller'
import { isEdited } from './engine/batch'
import { BLEED, dims, LOOKS, SHAPES, type PdDoc, type PdLayer } from './engine/model'
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
  /** Bildeserie: ZIP-filen er klar til nedlasting. */
  onZip?: (zip: Blob) => void
}

/** Følger én peker til den slippes (flytt, ramme, håndtak, pensel). */
/**
 * Følger en draing til pekeren slippes. Escape underveis avbryter: draingen avsluttes og dokumentet går tilbake til
 * slik det var før (som i Photoshop, Figma og Premiere), uten at noe havner i angrehistorikken.
 */
function track(id: number, toPt: (e: PointerEvent) => Pt, it: Interaction | null, c?: PhotoController) {
  if (!it) return
  const g = c?.beginGesture()
  const m = (ev: PointerEvent) => {
    if (ev.pointerId === id) it.move(toPt(ev), ev)
  }
  const end = () => {
    window.removeEventListener('pointermove', m)
    window.removeEventListener('pointerup', u)
    window.removeEventListener('pointercancel', u)
    window.removeEventListener('keydown', k, true)
    it.up()
  }
  const u = (ev: PointerEvent) => {
    if (ev.pointerId === id) end()
  }
  const k = (ev: KeyboardEvent) => {
    if (ev.key !== 'Escape' || !c || !g) return
    ev.preventDefault()
    ev.stopPropagation()
    end()
    c.cancelGesture(g)
  }
  window.addEventListener('pointermove', m)
  window.addEventListener('pointerup', u)
  window.addEventListener('pointercancel', u)
  window.addEventListener('keydown', k, true)
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
  const snapOn = useStore(snapPref)
  const d = S.doc
  if (!d) return null
  const saved = S.saved?.kind === 'unsaved' ? tx('Ikke lagret') : S.saved?.kind === 'saved' ? `${tx('Lagret')} ${new Date(S.saved.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''
  return (
    <div className={s.editor} data-ml-workspace="">
      <header className={s.bar}>
        <button type="button" className={s.barBtn} onClick={() => void c.leave()}><span aria-hidden="true">←</span> {tx('Prosjekter')}</button>
        <input className={s.docName} value={d.name} aria-label={tx('Prosjektnavn')} onChange={(e) => c.setDocName(e.target.value)} />
        <div className={s.barGroup}>
          <button type="button" className={s.barRound} disabled={!c.canUndo} title={tx('Angre (Ctrl+Z)')} aria-label={tx('Angre')} onClick={() => c.undo()}>↶</button>
          <button type="button" className={s.barRound} disabled={!c.canRedo} title={tx('Gjør om (Ctrl+Shift+Z)')} aria-label={tx('Gjør om')} onClick={() => c.redo()}>↷</button>
          <button type="button" className={s.barRound} data-snap-toggle="" aria-pressed={snapOn} aria-label={tx('Snapping')} style={{ opacity: snapOn ? 1 : 0.45 }}
            title={tx(snapOn ? 'Snapping er på: lag fester seg til kanter og midtlinjer. Trykk for fri plassering (Alt snur valget mens du drar).' : 'Snapping er av: fri plassering. Trykk for å slå på hjelpelinjer (Alt snur valget mens du drar).')}
            onClick={() => setSnap(!snapOn)}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 5v8a6 6 0 0 0 12 0V5M6 9h4M14 9h4" /></svg></button>
        </div>
        <div className={s.zoom}>
          <button type="button" aria-label={tx('Zoom ut')} onClick={() => c.ui({ zoom: Math.max(0.1, S.zoom / 1.25) })}>−</button>
          {/* zoom i prosent kan skrives inn; «Tilpass» ved siden av (også 0 / Shift+1) */}
          <NumField className={s.zoomLabel} value={S.zoom} min={0.1} max={8} step={0.01} scale={S.fit * 100} decimals={0} unit=" %" label={tx('Zoom')} onCommit={(z) => c.ui({ zoom: z })} />
          <button type="button" className={s.zoomFit} title={tx('Tilpass til vinduet')} aria-label={tx('Tilpass til vinduet')} data-pd-zoom-fit="" onClick={() => c.ui({ zoom: 1 })}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg></button>
          <button type="button" className={s.zoom100} title={tx('100 % (Shift+0)')} aria-label={tx('Vis i 100 %')} aria-pressed={Math.round(c.sc() * 100) === 100} data-pd-zoom-100="" onClick={() => c.ui({ zoom: Math.min(8, Math.max(0.1, 1 / (S.fit || 1))) })}>100%</button>
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
        <span data-autosave-row="" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'nowrap' }}>
          <button type="button" role="switch" aria-checked={S.autosave} className={s.autoBtn} title={tx('Lagre endringer automatisk i nettleseren')} onClick={() => c.toggleAutosave()}>
            <i aria-hidden="true" /><span>{tx('Autolagring')}</span>
          </button>
          <button type="button" role="switch" aria-checked={S.adv} className={s.autoBtn} data-adv-toggle="" title={tx('Lås opp avanserte kreative pensler, filmatisk lys, bildemanipulasjon og profesjonell komposisjon.')} onClick={() => c.toggleAdv()}>
            <i aria-hidden="true" /><span>{tx('Avansert modus')}</span>
          </button>
        </span>
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
      <div className={s.work} data-narrow={S.narrow ? '1' : undefined} data-batch={d.batch ? '1' : undefined}>
        {d.batch ? (
          <aside className={s.left}>
            <div className={s.leftScroll}><BatchPanel {...p} /></div>
          </aside>
        ) : (
        <aside className={s.left}>
          <div className={s.leftScroll}>
            <div className={s.seg}>
              {([['lag', 'Lag'], ['stil', 'Stil'], ['fx', 'Effekter']] as const).map(([k, l]) => <button key={k} type="button" aria-pressed={S.ltab === k} onClick={() => c.ui({ ltab: k })}>{tx(l)}</button>)}
            </div>
            {S.ltab === 'lag' && <AddPanel {...p} />}
            {S.ltab === 'stil' && <StylePanel {...p} />}
            {S.ltab === 'fx' && <FxPanel {...p} />}
            {S.fxOpen && S.adv && <FxPicker {...p} />}
            {S.maskEdit && <MaskDialog {...p} />}
          </div>
          <LayerList {...p} />
        </aside>
        )}
        <Stage {...p} />
        {/* smal skjerm: filmstripen rett under lerretet, i det rullbare området */}
        {d.batch && S.narrow && <BatchStrip {...p} />}
        <aside className={s.right}>
          <Props c={c} S={S} tx={tx} pickFile={p.pickFile} />
        </aside>
      </div>
      {d.batch && !S.narrow && <BatchStrip {...p} />}
    </div>
  )
}

/** Bildeserie: legg til bilder, velg bilder, bruk forhåndsvalg eller innstillinger på de valgte, og eksporter alle som ZIP. */
function BatchPanel({ c, S, tx, pickFile, onZip }: EditorProps) {
  const [look, setLook] = useState('warm')
  const b = S.doc?.batch
  if (!b) return null
  const items = c.batchItems()
  const n = items.length
  const edited = items.filter((it) => isEdited(it)).length
  const nSel = b.sel.length
  const j = S.bx
  const busy = S.busy === 'exp'
  return (
    <div className={s.stack} data-pd-batch-panel="">
      <span className={s.eyebrowSm}>{tx('Bildeserie')}</span>
      <button type="button" className={s.bigBtn} data-pd-batch-add="" onClick={() => pickFile()}>{tx('Legg til bilder …')}</button>
      <span className={s.note} data-pd-batch-count="">{tx('{n} bilder · {e} redigert · {u} uendret', { n, e: edited, u: n - edited })}</span>
      {j?.kind === 'import' && !j.end && (
        <div className={s.stack} role="status">
          <progress className={s.bProg} max={j.total} value={j.done} />
          <span className={s.dimSm}>{tx('Legger til {i} av {n} …', { i: Math.min(j.total, j.done + 1), n: j.total })}</span>
        </div>
      )}
      <span className={s.addHead}>{tx('Valgte bilder')}</span>
      <span className={s.dimSm} data-pd-batch-selcount="">{tx('{k} av {n} valgt', { k: nSel, n })}</span>
      <div className={s.row2}>
        <button type="button" className={s.smallBtn} data-pd-batch-all="" disabled={!n} onClick={() => c.batchSelAll(true)}>{tx('Velg alle')}</button>
        <button type="button" className={s.smallBtn} data-pd-batch-none="" disabled={!nSel} onClick={() => c.batchSelAll(false)}>{tx('Velg ingen')}</button>
      </div>
      <button type="button" className={s.smallBtnDanger} data-pd-batch-del="" disabled={!nSel || busy} onClick={() => c.batchDelSel()}>{nSel ? tx('Slett valgte ({n})', { n: nSel }) : tx('Slett valgte')}</button>
      <label className={s.field}>
        <span>{tx('Forhåndsvalg')}</span>
        <select value={look} data-pd-batch-look="" onChange={(e) => setLook(e.target.value)}>
          {LOOKS.map(([k, l]) => <option key={k} value={k}>{tx(l as Phrase)}</option>)}
        </select>
      </label>
      <button type="button" className={s.smallBtn} data-pd-batch-apply="" disabled={!nSel} onClick={() => c.batchApplyLook(look)}>{tx('Bruk på valgte')}</button>
      <button type="button" className={s.smallBtn} data-pd-batch-copy="" disabled={!nSel || !n} title={tx('Justeringer, forhåndsvalg, kurver og framkalling fra bildet som er åpent')} onClick={() => c.batchCopyToSel()}>{tx('Kopier innstillingene fra dette bildet til valgte')}</button>
      <button type="button" className={s.smallBtn} data-pd-batch-reset="" disabled={!nSel} onClick={() => c.batchResetSel()}>{tx('Nullstill valgte')}</button>
      <span className={s.dimSm}>{tx('Handlingene gjelder bare de valgte bildene.')}</span>
      <span className={s.addHead}>{tx('Eksport')}</span>
      <div className={s.seg}>
        {([['jpg', 'JPEG'], ['png', 'PNG']] as const).map(([k, l]) => <button key={k} type="button" data-pd-batch-fmt={k} aria-pressed={S.bfmt === k} onClick={() => c.ui({ bfmt: k })}>{tx(l)}</button>)}
      </div>
      <button type="button" className={s.primary} data-pd-batch-zip="" disabled={busy} onClick={() => void c.batchZip().then((z) => z && onZip?.(z))}>{tx(busy ? 'Eksporterer …' : 'Eksporter alle som ZIP')}</button>
      {j?.kind === 'export' && (
        <div className={s.stack} role="status" data-pd-batch-job={j.end ? 'done' : 'run'}>
          <progress className={s.bProg} max={j.total} value={j.done} />
          <span className={s.dimSm}>{j.end ? tx('{ok} av {n} bilder eksportert.', { ok: j.done - j.failed.length, n: j.total }) : tx('Eksporterer {i} av {n} …', { i: Math.min(j.total, j.done + 1), n: j.total })}</span>
          {j.failed.length > 0 && (
            <div className={s.warnNote} data-pd-batch-failed="">
              {tx('Feilet ({f}):', { f: j.failed.length })}
              <ul className={s.bFail}>{j.failed.slice(0, 20).map((x, i) => <li key={i}>{x}</li>)}</ul>
              {j.failed.length > 20 && tx('… og {n} til', { n: j.failed.length - 20 })}
            </div>
          )}
        </div>
      )}
      {j?.kind === 'import' && j.end && j.failed.length > 0 && (
        <div className={s.warnNote} data-pd-batch-failed="">
          {tx('Kunne ikke legges til ({f}):', { f: j.failed.length })}
          <ul className={s.bFail}>{j.failed.slice(0, 20).map((x, i) => <li key={i}>{x}</li>)}</ul>
        </div>
      )}
    </div>
  )
}

/** Filmstripen: miniatyrer med filnavn, markering av bildet som er åpent og av redigerte bilder; forrige/neste. */
function BatchStrip({ c, S, tx }: EditorProps) {
  const film = useRef<HTMLDivElement>(null)
  const b = S.doc?.batch
  const active = b?.active ?? 0
  useEffect(() => {
    film.current?.children[active]?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [active])
  if (!b) return null
  const items = c.batchItems()
  const n = items.length
  const sel = new Set(b.sel)
  return (
    <div className={s.bStrip} data-pd-batch-strip="">
      <div className={s.bNav}>
        <button type="button" className={s.smallBtn} data-pd-batch-prev="" disabled={active <= 0} onClick={() => c.batchStep(-1)}>← {tx('Forrige bilde')}</button>
        <span data-pd-batch-pos="">{n ? tx('Bilde {i} av {n}', { i: active + 1, n }) : tx('Ingen bilder ennå')}</span>
        <button type="button" className={s.smallBtn} data-pd-batch-next="" disabled={active >= n - 1} onClick={() => c.batchStep(1)}>{tx('Neste bilde')} →</button>
        <span className={s.dimSm}>{tx('Piltastene ← → bytter bilde.')}</span>
      </div>
      {!n && <span className={s.note}>{tx('Trykk «Legg til bilder …» eller dra bilder hit. Du kan legge til flere senere.')}</span>}
      <div ref={film} className={s.bFilm} role="list" aria-label={tx('Bildene i serien')}>
        {items.map((it, i) => {
          const on = i === active
          const edit = isEdited(it)
          return (
            <div key={it.id} role="listitem" className={s.bItem} data-pd-batch-item={it.name} data-active={on ? '1' : undefined} data-edited={edit ? '1' : undefined}>
              <button type="button" className={s.bThumb} aria-current={on ? 'true' : undefined} title={it.name} aria-label={tx('Åpne {name}', { name: it.name })} onClick={() => void c.batchGo(i)}>
                {it.thumb ? <img src={c.batchThumb(it)} alt="" decoding="async" loading="lazy" /> : <span />}
                {edit && <i className={s.bBadge} title={tx('Redigert')} aria-label={tx('Redigert')} />}
              </button>
              <label className={s.bName} title={it.name}>
                <input type="checkbox" checked={sel.has(it.id)} aria-label={tx('Velg {name}', { name: it.name })} onChange={() => c.batchSel(it.id)} />
                <span>{it.name}</span>
              </label>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** «Legg til»: elementer i fire grupper (Innhold, Former og grafikk, Lys og effekter, Medier) – ingen duplikater. */
function AddPanel({ c, S, tx, pickFile }: EditorProps) {
  const group = (label: Phrase, btns: [Phrase, () => void, string, (boolean | undefined)?, Phrase?][]) => (
    <div className={s.addGroup} role="group" aria-label={tx(label)}>
      <span className={s.addHead}>{tx(label)}</span>
      <div className={s.addGrid}>
        {btns.map(([l, on, icon, active, tip]) => (
          <button key={l} type="button" aria-pressed={active == null ? undefined : !!active} title={tip ? tx(tip) : undefined} onClick={on}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={icon} /></svg>
            {tx(l)}
          </button>
        ))}
      </div>
    </div>
  )
  return (
    <>
      <span className={s.eyebrowSm}>{tx('Legg til')}</span>
      {group('Innhold', [
        ['Bilde', () => pickFile(), 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15 9.5h.01', undefined, 'Velg et bilde fra enheten'],
        ['Tekst', () => c.addText(), 'M5 6h14M12 6v13M9 19h6', undefined, 'Legg til en tekst du kan skrive i'],
        ['Logo', () => c.ui({ logoOpen: !S.logoOpen }), 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z', S.logoOpen, 'Velg menighetens logo'],
      ])}
      {S.logoOpen && (
        <div className={s.logoBox}>
          <button type="button" className={s.pillDark} data-ch-felles-logo="1" onClick={() => c.openPicker('cloud', { logo: true }, 'ressurser')}>
            {tx('Fellesmappe')}
          </button>
        </div>
      )}
      <div className={s.addGroup} role="group" aria-label={tx('Former og grafikk')}>
        <span className={s.addHead}>{tx('Former og grafikk')}</span>
        <div className={s.shapeGrid} data-pd-shapes="">
          {['rect', 'rounded', ...SHAPES.map((x) => x[0]).filter((k) => k !== 'rect')].map((k) => {
            const name = tx((k === 'rounded' ? 'Avrundet rektangel' : (SHAPES.find((x) => x[0] === k)?.[1] ?? k)) as Phrase)
            return <button key={k} type="button" title={name} aria-label={name} data-shape={k} style={{ backgroundImage: `url("${shapeIcon(k)}")` }} onClick={() => c.addShape(k)} />
          })}
        </div>
      </div>
      {group('Lys og effekter', [
        ['Lys', () => c.addGlow(), 'M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z', undefined, 'Et mykt lys over bildet'],
        ['Toning', () => c.addGrad(), 'M4 4h16v16H4zM4 20 20 4', undefined, 'En fargeovergang over hele bildet'],
        ...(S.adv ? [['Effekt …', () => c.openFx(), 'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z', S.fxOpen, 'Velg en effekt, se den på bildet og legg den til som et eget lag'] as [Phrase, () => void, string, (boolean | undefined)?, Phrase?]] : []),
      ])}
      {group('Medier', [
        ['Dine medier', () => c.openPicker('media'), 'M4 7h6l2 2h8v10H4z', undefined, 'Bilder du har lagret i Media Lab'],
        ['Fellesmappe', () => c.openPicker('cloud', {}, 'ressurser'), 'M3 7h7l2 2h9v10H3zM12 13h6', undefined, 'Felles ressurser for menigheten'],
      ])}
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
      <span className={s.eyebrowSm}>{tx('Prosjektets kategori')}</span>
      <div className={s.catRow}>
        <select value={S.doc?.cat && S.cats.includes(S.doc.cat) ? S.doc.cat : ''} aria-label={tx('Prosjektets kategori')} data-pd-doc-cat="" onChange={(e) => c.setDocCat(e.target.value || null)}>
          <option value="">{tx('Uten kategori')}</option>
          {S.cats.map((cc) => <option key={cc} value={cc}>{cc}</option>)}
        </select>
        <button type="button" title={tx('Ny kategori')} aria-label={tx('Ny kategori for prosjektet')} onClick={() => {
          const nc = c.newCat('doc')
          if (nc) c.setDocCat(nc)
        }}>+</button>
      </div>
      <span className={s.note}>{tx('Prosjektet vises under denne kategorien i «Mine prosjekter» på startsiden.')}</span>
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


/** Effekter-fanen (kompakt): åpner effektvelgeren. Utforskingen skjer i popupen, ikke i sidepanelet. */
function FxPanel({ c, S, tx }: EditorProps) {
  if (!S.adv) return <div className={s.stack}><span className={s.note}>{tx('Lås opp avanserte kreative pensler, filmatisk lys, bildemanipulasjon og profesjonell komposisjon.')} {tx('Slå på «Avansert modus» ved Autolagring øverst.')}</span></div>
  return (
    <div className={s.stack}>
      <button type="button" className={s.bigBtn} data-pd-fx-open="" onClick={() => c.openFx()}>{tx('Legg til effekt …')}</button>
      <span className={s.note}>{tx('Velg en effekt, se den på bildet, og legg den til som et eget lag. Effektlag redigeres i høyrepanelet.')}</span>
    </div>
  )
}

/** «Finjuster masken»: den felles maskeredigeringen på bildelagets maske; «Bruk» skriver den tilbake med angre. */
function MaskDialog({ c, S, tx }: EditorProps) {
  const e = S.maskEdit
  if (!e) return null
  return (
    <div className={s.maskBack} role="dialog" aria-modal="true" aria-label={tx('Finjuster masken')} data-pd-mask="">
      <div className={s.maskHead}>
        <strong>{tx('Finjuster masken')}</strong>
        <span>{tx('Behold eller fjern deler av bildet med pensel, former eller «Velg objekt». Endringen kan angres i editoren.')}</span>
      </div>
      <div className={s.maskBody}>
        <MaskEditor image={e.image} mask={e.mask} onChange={() => undefined} selectObject={(x, y) => c.selectInMask(x, y)} />
      </div>
      <div className={s.row2}>
        <button type="button" className={s.smallBtn} onClick={() => c.closeMaskEdit()}>{tx('Avbryt')}</button>
        <button type="button" className={s.primary} data-pd-mask-apply="" onClick={() => c.applyMaskEdit()}>{tx('Bruk')}</button>
      </div>
    </div>
  )
}

/** Effektvelgeren (popup): søk, kategorier, favoritter, nylig brukt, egne; forhåndsvisning på bildet før «Legg til effekt». */
/** Effektbiblioteket (Avansert modus): 1920 forhåndsvalg, favoritter, nylig brukt og egne. */
function FxPicker({ c, S, tx }: EditorProps) {
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
  const pick = S.fxPick
  return (
    <div className={s.fxPop} role="dialog" aria-modal="false" aria-label={tx('Legg til effekt')} data-pd-fxpicker="" onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); c.cancelFx() } }}>
      <div className={s.fxPopHead}>
        <strong>{tx('Legg til effekt')}</strong>
        <button type="button" className={s.resetBtn} onClick={() => c.cancelFx()}>{tx('Lukk')}</button>
      </div>
      <div className={s.fxPopBody}>
      {on && (
        <>
          <input autoFocus className={s.search} value={S.fxQ} placeholder={tx('Søk i effekter …')} aria-label={tx('Søk i effekter')} onChange={(e) => c.ui({ fxQ: e.target.value.slice(0, 60), fxN: 24 })} />
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
                  <button type="button" title={nm(pr)} data-fx={pr.id} aria-pressed={S.fxPick?.preset === pr.id} onClick={() => c.previewFx(pr)}
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
      <div className={s.fxPopFoot}>
        {pick ? (
          <label className={s.fxPopOp}>
            <span>{tx('Synlighet')} {Math.round(pick.op * 100)} %</span>
            <input type="range" min={0} max={100} step={1} value={Math.round(pick.op * 100)} aria-label={tx('Synlighet')} onChange={(e) => c.setFxPickOp(Number(e.target.value) / 100)} />
          </label>
        ) : <span className={s.dimSm}>{tx('Velg en effekt for å se den på bildet.')}</span>}
        <div className={s.row2}>
          <button type="button" className={s.smallBtn} data-pd-fx-cancel="" onClick={() => c.cancelFx()}>{tx('Avbryt')}</button>
          <button type="button" className={s.bigBtn} data-pd-fx-add="" disabled={!pick} onClick={() => c.confirmFx()}>{tx('Legg til effekt')}</button>
        </div>
      </div>
    </div>
  )
}

/** Miniatyrene lages én om gangen i en felles kø, så panelet ikke henger. */
const fxThumbs = new Map<string, string>()
const fxQueue: { k: string; pr: FX.Preset; w: number; done: (src: string) => void }[] = []
let fxRaf = 0
function runFxQueue() {
  fxRaf = 0
  const t0 = performance.now()
  while (fxQueue.length && performance.now() - t0 < 28) {
    const job = fxQueue.shift() as (typeof fxQueue)[number]
    let src = fxThumbs.get(job.k)
    if (src === undefined) {
      try {
        src = FX.thumb(job.pr, job.w, Math.round((job.w * 2) / 3))
      } catch {
        src = ''
      }
      fxThumbs.set(job.k, src)
    }
    job.done(src)
  }
  if (fxQueue.length) fxRaf = requestAnimationFrame(runFxQueue)
}

/**
 * Miniatyren tegnes i kortets faktiske størrelse × devicePixelRatio (rundet opp til 32 px, maks 768), så den vises uten
 * oppskalering. Før: fast 132 × 88 JPEG, strukket ca. 3× i kortene på Retina – uskarp og pikselert.
 */
function FxThumb({ pr, k }: { pr: FX.Preset; k: string }) {
  const box = useRef<HTMLSpanElement>(null)
  const [w, setW] = useState(0)
  useLayoutEffect(() => {
    const card = box.current?.parentElement
    if (!card) return
    const measure = () => {
      const px = card.clientWidth * (window.devicePixelRatio || 1)
      if (px > 0) setW(Math.min(768, Math.max(132, Math.ceil(px / 32) * 32)))
    }
    measure()
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null
    ro?.observe(card)
    return () => ro?.disconnect()
  }, [])
  const key = `${k}@${w}`
  const [src, setSrc] = useState<{ key: string; url: string } | null>(null)
  useEffect(() => {
    if (!w || fxThumbs.has(key)) return
    let live = true
    fxQueue.push({ k: key, pr, w, done: (url) => live && setSrc({ key, url }) })
    if (!fxRaf) fxRaf = requestAnimationFrame(runFxQueue)
    return () => {
      live = false
    }
  }, [key, pr, w])
  const shown = fxThumbs.get(key) ?? (src?.key === key ? src.url : undefined)
  return <span ref={box} style={{ display: 'contents' }}>{shown ? <img src={shown} alt="" /> : null}</span>
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
              onContextMenu={(e) => {
                // samme lagmeny som på lerretet, for laget i raden (velges hvis det ikke er med i markeringen)
                e.preventDefault()
                if (!c.selIds().includes(q.id)) c.clickLayer(q.id, false)
                c.ui({ ctx: { x: e.clientX, y: e.clientY, id: q.id } })
              }}
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

function Stage({ c, S, tx, pickFile }: EditorProps) {
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
        const pick = c.s.fxPick // effektvelgerens forhåndsvisning (ikke i prosjektet)
        if (g) render(g, pick ? { ...doc, layers: [...doc.layers, pick] } : doc, k, c.M, { preview: 2000, phText: tx('Dra inn et bilde') })
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
  // arbeidsflaten: rulling/knip zoomer rundt pekeren, mellomrom/midtknapp panorerer (shared/lib/useStageNav)
  const nav = useStageNav({
    stage, content: wrap, zoom: S.zoom, setZoom: (z) => c.ui({ zoom: z }), min: 0.1, max: 8, enabled: !S.maskEdit,
    // Shift+F10 / menytasten: menyen for det valgte laget, midt på laget
    menuPoint: () => {
      const q = c.selL()
      const r = wrap.current?.getBoundingClientRect()
      return q && r ? { x: r.left + q.x * c.sc(), y: r.top + q.y * c.sc() } : null
    },
    // Shift+2: zoom til markeringen (ett eller flere lag)
    selRect: () => {
      const ids = c.selIds()
      const r = wrap.current?.getBoundingClientRect()
      if (!ids.length || !r) return null
      const b = c.boundsOf(ids)
      const k = c.sc()
      return { left: r.left + b.x0 * k, top: r.top + b.y0 * k, width: (b.x1 - b.x0) * k, height: (b.y1 - b.y0) * k }
    },
  })
  const menu = S.ctx
  const setMenu = (m: PState['ctx']) => c.ui({ ctx: m })
  // høyreklikkmeny: bare handlinger som passer det som er under pekeren (lag eller tom flate), med tastene ved siden av
  const menuItems = (id: string | null): MenuItem[] => {
    const batch = !!d.batch
    const K = (k: string) => formatKeys(k)
    const view: MenuItem[] = [
      { label: tx('Tilpass visning'), keys: '0 · ' + K('Shift+1'), separator: true, onSelect: () => c.ui({ zoom: 1 }) },
      { label: '100 %', keys: K('Shift+0'), onSelect: () => c.ui({ zoom: Math.min(8, Math.max(0.1, 1 / (c.s.fit || 1))) }) },
      { label: tx('Zoom inn'), keys: '+', onSelect: () => c.ui({ zoom: Math.min(8, c.s.zoom * 1.25) }) },
      { label: tx('Zoom ut'), keys: '−', onSelect: () => c.ui({ zoom: Math.max(0.1, c.s.zoom / 1.25) }) },
      { label: tx('Zoom til markering'), keys: K('Shift+2'), disabled: !c.selIds().length, onSelect: () => nav.toSelection() },
      { label: tx('Forrige visning'), keys: K('Alt+0'), onSelect: () => nav.back() },
    ]
    const edit: MenuItem[] = [
      { label: tx('Angre'), keys: K('Mod+Z'), disabled: !c.canUndo, separator: true, onSelect: () => c.undo() },
      { label: tx('Gjør om'), keys: K('Mod+Shift+Z'), disabled: !c.canRedo, onSelect: () => c.redo() },
    ]
    const paste: MenuItem = { label: tx('Lim inn'), keys: K('Mod+V'), disabled: !c.hasClip(), onSelect: () => c.pasteLayers() }
    if (!id || batch) return [paste, { label: tx('Velg alle'), keys: K('Mod+A'), disabled: batch, onSelect: () => c.selectAll() }, ...edit, ...view]
    const Lm = d.layers.find((q) => q.id === id)
    const many = c.selIds().length > 1
    return [
      { label: tx('Kopier'), keys: K('Mod+C'), onSelect: () => c.copyLayers(false) },
      { label: tx('Klipp ut'), keys: K('Mod+X'), onSelect: () => c.copyLayers(true) },
      paste,
      { label: tx('Dupliser'), keys: K('Mod+D'), onSelect: () => c.dup() },
      ...(many ? [{ label: tx('Grupper'), keys: K('Mod+G'), separator: true, onSelect: () => c.group() }] : Lm?.grp ? [{ label: tx('Del opp gruppen'), keys: K('Mod+G'), separator: true, onSelect: () => c.ungroup() }] : []),
      { label: tx('Flytt fram'), separator: !many && !Lm?.grp, onSelect: () => c.move(id, 1) },
      { label: tx('Flytt bak'), onSelect: () => c.move(id, -1) },
      ...(!many ? [{ label: tx('Til fremst'), onSelect: () => c.moveToEnd(id, 'front') }, { label: tx('Til bakerst'), onSelect: () => c.moveToEnd(id, 'back') }] : []),
      // bildelag: de vanligste bildehandlingene (som i Photoshops lagmeny)
      ...(Lm?.type === 'image' && !many ? [
        { label: tx('Bytt bilde'), separator: true, disabled: !!Lm.locked, onSelect: () => pickFile(id) },
        ...(Lm.src ? [
          { label: tx('Beskjær'), keys: 'C', disabled: !!Lm.locked, onSelect: () => c.ui({ tool: 'crop', tab: 'layer' }) },
          { label: tx('Speil'), disabled: !!Lm.locked, onSelect: () => c.patchL(id, { flipX: !Lm.flipX }) },
          { label: tx('Finjuster masken …'), disabled: !!Lm.locked, onSelect: () => c.openMaskEdit() },
        ] : []),
      ] : []),
      ...(Lm && !many ? [
        { label: Lm.hidden ? tx('Vis') : tx('Skjul'), onSelect: () => c.patchL(id, { hidden: !Lm.hidden }) },
        { label: Lm.locked ? tx('Lås opp') : tx('Lås'), onSelect: () => c.patchL(id, { locked: !Lm.locked }) },
      ] : []),
      { label: tx('Slett'), keys: 'Delete', onSelect: () => c.del() },
      ...edit,
      ...view,
    ]
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
    track(e.pointerId, pt, it, c)
  }
  return (
    <section ref={stage} className={s.stage} tabIndex={0} aria-label={tx('Arbeidsflate')} data-focus-region=""
      onContextMenu={(e) => {
        // tom flate rundt bildet: samme meny som for et tomt område
        if (e.target !== stage.current) return
        e.preventDefault()
        setMenu({ x: e.clientX, y: e.clientY, id: null })
      }}
      onPointerDown={(e) => {
        if (e.target !== stage.current || e.button !== 0) return
        if (e.pointerType !== 'touch') e.preventDefault()
        const it = c.stageDown(pt(e), e.shiftKey || e.ctrlKey || e.metaKey, e.pointerType === 'touch')
        if (it) track(e.pointerId, pt, it, c)
      }}>
      <div ref={wrap} className={s.wrap} data-pd-wrap="1" style={{ width: d.w * sc, height: d.h * sc, cursor: nav.panning ? 'grabbing' : nav.space ? 'grab' : S.tool === 'brush' ? 'none' : S.tool === 'crop' ? 'move' : 'default' }}
        onContextMenu={(e) => {
          // høyreklikk: handlingene for laget under pekeren (velges), eller for arbeidsflaten
          e.preventDefault()
          const p = pt(e)
          const hitL = c.s.doc && !c.s.doc.batch ? hit(c.s.doc, p[0], p[1]) : null
          if (hitL) c.ui({ sel: hitL.id, multi: [] })
          setMenu({ x: e.clientX, y: e.clientY, id: hitL?.id ?? null })
        }}
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
      {menu && <ContextMenu x={menu.x} y={menu.y} label={tx('Lagmeny')} onClose={() => setMenu(null)} items={menuItems(menu.id)} />}
    </section>
  )
}

