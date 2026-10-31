'use no memo'
// Komponentene leser fra kontrolleren (c.selL(), c.s …); kompilatorens mellomlagring ville gitt utdaterte verdier.
import { useEffect, useRef, useState, type DragEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { setSnap, snapPref } from '../../shared/lib/snap'
import { useStore } from '../../shared/lib/store'
import { ColorRow, Controls } from './Controls'
import { autoName, ctrlsBar, ctrlsFor, ctrlsGroup, ctrlsMal, linkNote, lname } from './ctrl-defs'
import { gbox, PRESETS, rowOrder, type AddTarget, type PanelKey, type State, type ThumbController } from './controller'
import type { ImageCache } from './engine/images'
import { H, W, isLine, isLogoAsset, type Layer } from './engine/model'
import { ensureFonts, type Renderer } from './engine/render'
import type { Phrase, Tx } from './texts'
import s from './ThumbnailStudio.module.css'

interface EditorProps {
  c: ThumbController
  S: State
  tx: Tx
  images: ImageCache
  renderer: Renderer
  pickFile: (t: AddTarget) => void
}

const PANEL_NAMES: Record<PanelKey, Phrase> = { add: 'Legg til', layers: 'Lag', canvas: 'Lerret', props: 'Egenskaper' }
const TAG: Record<Layer['type'], Phrase> = { text: 'Tekst', image: 'Bilde', shape: 'Form', glow: 'Lys' }

const VIEW_OPTS: [string, Phrase, Phrase][] = [
  ['std', 'Standard', 'Legg til og lag til venstre, egenskaper til høyre'],
  ['cols', 'Egen lagkolonne', 'Lag i en egen kolonne ved siden av «Legg til»'],
  ['tabs', 'Faner', 'Legg til og lag som faner, så lerretet blir større'],
  ['right', 'Lerret til venstre', 'Lerretet først, verktøy og egenskaper til høyre'],
  ['mirror', 'Speilet', 'Egenskaper til venstre, legg til og lag til høyre'],
  ['side', 'Ett sidepanel', 'Stort lerret og alt annet i faner til høyre'],
  ['custom', 'Egen visning', 'Sett opp kolonnene selv med dra og slipp'],
]

/** Redigering av en mal eller et grunnoppsett. */
export function Editor(p: EditorProps) {
  const { c, S, tx } = p
  const snapOn = useStore(snapPref)
  const cat = c.cat()
  const modes = VIEW_OPTS.map((o) => o[0])
  const LM = modes.includes(S.layoutMode) ? S.layoutMode : 'std'
  const Lx = S.narrow ? { cols: [['canvas', 'props']] as PanelKey[][], tabs: [false] } : c.layoutOf(LM)
  const n = S.doc?.layers.length ?? 0
  return (
    <div className={s.editor} data-ml-workspace="">
      <div className={s.editBar}>
        <div className={s.editBarLeft}>
          <button type="button" className={s.pill} onClick={() => void c.leaveEdit()}>
            <span aria-hidden="true">←</span> <span>{cat?.name ?? ''}</span>
          </button>
          {S.baseEdit ? <span className={s.baseTag}>{tx('Grunnoppsett')}</span> : (
            <input className={s.nameInput} value={S.tplName} placeholder={tx('Navn på malen')} aria-label={tx('Navn på malen')} onChange={(e) => c.setTplName(e.target.value)} />
          )}
          {S.dirty && <span className={s.dim}>{tx('Ikke lagret')}</span>}
          <button type="button" role="switch" aria-checked={S.autoSave} className={s.autoSwitch} title={tx('Slå autolagring av eller på')} onClick={() => c.toggleAuto()}>
            <i aria-hidden="true" />
            <span>{tx('Autolagring')}</span>
            {S.autoSave && S.autoAt && <em>{tx('lagret {time}', { time: S.autoAt })}</em>}
          </button>
        </div>
        <div className={s.editBarRight}>
          <button type="button" className={s.round} disabled={!S.hist.length} title={tx('Angre (⌘Z)')} aria-label={tx('Angre')} onClick={() => c.undo()}>↶</button>
          <button type="button" className={s.round} disabled={!S.fut.length} title={tx('Gjør om (⇧⌘Z)')} aria-label={tx('Gjør om')} onClick={() => c.redo()}>↷</button>
          <button type="button" className={s.round} data-snap-toggle="" aria-pressed={snapOn} aria-label={tx('Snapping')} style={{ opacity: snapOn ? 1 : 0.45 }}
            title={tx(snapOn ? 'Snapping er på: lag fester seg til kanter og midtlinjer. Trykk for fri plassering (Alt snur valget mens du drar).' : 'Snapping er av: fri plassering. Trykk for å slå på hjelpelinjer (Alt snur valget mens du drar).')}
            onClick={() => setSnap(!snapOn)}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 3v8a6 6 0 0 0 12 0V3M6 7h4M14 7h4" /></svg></button>
          <div className={s.rel}>
            <button type="button" className={s.pillSm} aria-haspopup="menu" aria-expanded={S.viewMenu} onClick={() => c.ui({ viewMenu: !S.viewMenu })}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16M15 4v16" /></svg>
              <span>{tx('Visning')}</span>
            </button>
            {S.viewMenu && (
              <>
                <div className={s.scrim} onClick={() => c.ui({ viewMenu: false })} />
                <div className={s.viewMenu} role="menu" aria-label={tx('Visning')}>
                  <span className={s.eyebrowSm}>{tx('Visning av redigering')}</span>
                  {VIEW_OPTS.map(([k, name, desc]) => {
                    const lay = k === 'custom' ? c.layoutOf('custom') : (PRESETS[k] ?? c.layoutOf('std'))
                    return (
                      <button key={k} type="button" role="menuitemradio" aria-checked={LM === k} className={s.viewOpt} onClick={() => (k === 'custom' ? c.openLc() : c.setLayout(k))}>
                        <span className={s.mini}>
                          {lay.cols.filter((col) => col.length).map((col, i) => (
                            <i key={i} style={{ flex: col.includes('canvas') ? 5 : col.includes('props') ? 2 : 1.6, background: col.includes('canvas') ? '#f3f1ec' : '#6f6b64' }} />
                          ))}
                        </span>
                        <span><b>{tx(name)}</b><span>{tx(desc)}</span></span>
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </div>
          <button type="button" className={s.pillSm} onClick={() => (S.baseEdit ? void c.saveBase() : c.ui({ save: true }))}>{tx(S.baseEdit ? 'Lagre grunnoppsett' : 'Lagre mal')}</button>
          <button type="button" className={s.pillPrimary} onClick={() => c.openExport()}>{tx('Eksporter')}</button>
        </div>
      </div>
      <div className={s.columns}>
        {Lx.cols.filter((col) => col.length).map((col, ci) => {
          const tabs = !!Lx.tabs[ci] && col.length > 1
          const act = tabs ? (col.includes(S.colTab[ci] as PanelKey) ? (S.colTab[ci] as PanelKey) : col[0]) : null
          const show = (k: PanelKey) => col.includes(k) && (!tabs || act === k)
          const hasC = col.includes('canvas')
          const hasP = col.includes('props')
          return (
            <div key={ci} className={s.col} style={{ flex: hasC ? '1 1 560px' : hasP ? '0 1 330px' : '0 1 270px', minWidth: hasC ? 0 : hasP ? 280 : 250 }}>
              {tabs && (
                <div className={s.colTabs} role="tablist">
                  {col.map((k) => (
                    <button key={k} type="button" role="tab" aria-selected={act === k} onClick={() => c.ui({ colTab: { ...S.colTab, [ci]: k } })}>
                      {tx(PANEL_NAMES[k])}{k === 'layers' ? ` (${n})` : ''}
                    </button>
                  ))}
                </div>
              )}
              {col.map((k) => show(k) && (
                <div key={k} style={{ order: col.indexOf(k) }} className={s.colItem}>
                  {k === 'add' && <AddPanel {...p} />}
                  {k === 'layers' && <LayersPanel {...p} />}
                  {k === 'canvas' && <CanvasPanel {...p} />}
                  {k === 'props' && <PropsPanel {...p} />}
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function AddPanel({ c, S, tx, pickFile }: EditorProps) {
  const ac = c.addCol().toLowerCase()
  const buttons: { k: string; label: Phrase; on: () => void }[] = [
    { k: 'text', label: 'Tekst', on: () => c.addText() },
    { k: 'image', label: 'Bilde', on: () => pickFile({ mode: 'add' }) },
    { k: 'felles', label: 'Fellesmappe', on: () => c.openPicker('cloud', { mode: 'add' }) },
    { k: 'shared', label: 'Dine medier', on: () => c.openPicker('media', { mode: 'add' }) },
    { k: 'shape', label: 'Form', on: () => c.ui({ shapeOpen: !S.shapeOpen, logoOpen: false, libOpen: false }) },
    { k: 'line', label: 'Strek', on: () => c.addShape('line') },
    { k: 'glow', label: 'Lys', on: () => c.addGlow() },
    { k: 'logo', label: 'Logo', on: () => c.ui({ logoOpen: !S.logoOpen, shapeOpen: false, libOpen: false }) },
    { k: 'lib', label: 'Flere elementer', on: () => c.ui({ libOpen: !S.libOpen, logoOpen: false, shapeOpen: false }) },
  ]
  const colorPick = (label: Phrase) => (
    <ColorRow label={tx(label)} val={ac} set={(v) => c.setAddColor(v)} profile={[]} tx={tx} small />
  )
  return (
    <div className={s.panel}>
      <button type="button" className={s.layoutsBtn} onClick={() => c.openLayouts()}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
        <span>{tx('Bytt oppsett')}</span>
      </button>
      <span className={s.panelLabel}>{tx('Legg til')}</span>
      <div className={s.addGrid}>
        {buttons.map((b) => (
          <button key={b.k} type="button" draggable title={tx('Klikk for å legge til, eller dra over et lag for å koble det til')}
            onClick={() => {
              c.clearPendingLink()
              b.on()
            }}
            onDragStart={(e) => {
              dndPayload = { add: b.k }
              try {
                e.dataTransfer.setData('text/plain', 'ts-layer')
                e.dataTransfer.effectAllowed = 'move'
              } catch {
                // eldre nettlesere
              }
            }}
            onDragEnd={() => {
              dndPayload = null
              if (S.dropOn) c.ui({ dropOn: null })
            }}>{tx(b.label)}</button>
        ))}
      </div>
      {S.logoOpen && (
        <div className={s.popList}>
          <button type="button" onClick={() => c.openPicker('cloud', { mode: 'add', logo: true })}>{tx('Fra Fellesmappe …')}</button>
          <button type="button" onClick={() => pickFile({ mode: 'add', logo: true })}>{tx('Last opp egen logo …')}</button>
        </div>
      )}
      {S.libOpen && (
        <div className={s.popBox}>
          {c.library.map((g) => (
            <div key={g.title} className={s.libGroup}>
              <span className={s.eyebrowSm}>{tx(g.title as Phrase)}</span>
              <div className={s.libItems}>
                {g.items.map((it) => <button key={it.key} type="button" onClick={() => c.addPreset(it)}>{tx(it.label as Phrase)}</button>)}
              </div>
            </div>
          ))}
          {colorPick('Farge på nye elementer')}
        </div>
      )}
      {S.shapeOpen && (
        <div className={s.popBox}>
          <div className={s.libItems}>
            {([['rect', 'Firkant', 16, 12, 2], ['rounded', 'Avrundet', 16, 12, 4], ['ellipse', 'Sirkel', 14, 14, 999], ['line', 'Strek', 18, 3, 1]] as const).map(([k, label, w, h, r]) => (
              <button key={k} type="button" className={s.shapeOpt} onClick={() => c.addShape(k)}>
                <i style={{ width: w, height: h, borderRadius: r, background: ac }} />
                <span>{tx(label)}</span>
              </button>
            ))}
          </div>
          {colorPick('Farge')}
        </div>
      )}
    </div>
  )
}

/** Hva som dras i laglisten (et lag, eller en knapp fra «Legg til»). Bare under selve draget. */
let dndPayload: { id?: string; add?: string } | null = null

function LayersPanel({ c, S, tx }: EditorProps) {
  const d = S.doc
  if (!d) return null
  const multi = S.multi
  return (
    <div className={s.panel}>
      <span className={s.panelHead}>
        <span className={s.panelLabel}>{tx('Lag')}</span>
        <span className={s.hint}>{tx('Øverst i listen ligger øverst i bildet. ↺ flytter laget tilbake til grunnoppsettet. Dra et lag eller en knapp fra «Legg til» over et annet lag for å koble dem sammen.')}</span>
      </span>
      <div className={s.layerList} role="list">
        {rowOrder(d).map(([l, isKid]) => {
          const act = l.id === S.sel || multi.includes(l.id)
          const actBar = l.id === S.sel && S.barSel === l.id
          const moved = c.movedFromBase(l)
          const hasBase = !!c.baseFor(l)
          const tag: Phrase = isLogoAsset(l) ? 'Logo' : isLine(l) ? 'Strek' : TAG[l.type]
          const rowCls = [s.layerRow, act && !actBar ? s.layerOn : '', S.dropOn === l.id ? s.layerDrop : '', l.hidden ? s.layerHidden : ''].join(' ')
          return (
            <div key={l.id} role="listitem">
              <div className={rowCls} style={{ marginLeft: isKid ? 18 : 0 }} draggable data-layer={l.id}
                onClick={(e) => c.select(l.id, e.shiftKey)}
                onDragStart={(e) => {
                  dndPayload = { id: l.id }
                  try {
                    e.dataTransfer.setData('text/plain', 'ts-layer')
                    e.dataTransfer.effectAllowed = 'move'
                  } catch {
                    // eldre nettlesere
                  }
                }}
                onDragEnd={() => {
                  dndPayload = null
                  if (S.dropOn) c.ui({ dropOn: null })
                }}
                onDragOver={(e: DragEvent) => {
                  const g = dndPayload
                  if (!g || g.id === l.id) return
                  e.preventDefault()
                  if (S.dropOn !== l.id) c.ui({ dropOn: l.id })
                }}
                onDragLeave={(e) => {
                  if (e.currentTarget.contains(e.relatedTarget as Node | null)) return
                  if (S.dropOn === l.id) c.ui({ dropOn: null })
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  const g = dndPayload
                  dndPayload = null
                  c.ui({ dropOn: null })
                  if (!g) return
                  if (g.add) c.addLinked(g.add, l.id)
                  else if (g.id) c.linkTo(g.id, l.id)
                }}>
                <span className={s.layerTag}>{tx(tag)}</span>
                <LayerName value={l.name || autoName(l, tx)} display={lname(c, l, tx)} tx={tx} onRename={(v) => c.setL(l.id, { name: v === autoName(l, tx) ? '' : v })} />
                {isKid && (
                  <button type="button" className={s.linked} title={tx('Koble fra laget')} aria-label={tx('Koble fra laget')} onClick={(e) => {
                    e.stopPropagation()
                    c.unlink(l.id)
                  }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.5 1.5" /><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.5-1.5" /></svg>
                    <span>{tx('Koblet')}</span>
                  </button>
                )}
                {hasBase && (
                  <button type="button" className={s.iconBtn} disabled={!moved} style={{ color: moved ? '#f5b800' : '#5a5750' }}
                    title={tx(moved ? 'Tilbake til grunnoppsettets plassering' : 'Står på grunnoppsettets plassering')} aria-label={tx(moved ? 'Tilbake til grunnoppsettets plassering' : 'Står på grunnoppsettets plassering')}
                    onClick={(e) => {
                      e.stopPropagation()
                      c.resetPos(l.id)
                    }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /></svg>
                  </button>
                )}
                <button type="button" className={s.iconBtn} style={{ color: l.hidden ? '#5a5750' : undefined }} title={tx(l.hidden ? 'Vis laget' : 'Skjul laget')} aria-label={tx(l.hidden ? 'Vis laget' : 'Skjul laget')}
                  onClick={(e) => {
                    e.stopPropagation()
                    c.setL(l.id, { hidden: !l.hidden })
                  }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></svg>
                </button>
                <button type="button" className={s.iconBtn} style={{ color: l.lock ? undefined : '#5a5750' }} aria-pressed={l.lock} title={tx(l.lock ? 'Lås opp' : 'Lås')} aria-label={tx(l.lock ? 'Lås opp' : 'Lås')}
                  onClick={(e) => {
                    e.stopPropagation()
                    c.setL(l.id, { lock: !l.lock })
                  }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
                </button>
                <button type="button" className={s.iconDel} title={tx('Fjern laget')} aria-label={tx('Fjern laget')} onClick={(e) => {
                  e.stopPropagation()
                  c.delLayer(l.id)
                }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
                </button>
              </div>
              {l.type === 'text' && l.bar && (
                <div className={[s.layerRow, s.barRow, actBar ? s.layerOn : '', l.hidden ? s.layerHidden : ''].join(' ')} onClick={() => c.selectBar(l.id)}>
                  <span className={s.dimSm}>↳</span>
                  <i className={s.barSwatch} style={{ background: l.barColor }} />
                  <span className={s.barName}>{tx('Understrek')}</span>
                  <span className={s.layerTag} title={tx('Følger teksten når den flyttes')}>{tx('Koblet')}</span>
                  <button type="button" className={s.iconBtn} title={tx('Fjern understrek')} aria-label={tx('Fjern understrek')} onClick={(e) => {
                    e.stopPropagation()
                    c.setL(l.id, { bar: false })
                    if (S.barSel === l.id) c.ui({ barSel: null })
                  }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
                  </button>
                </div>
              )}
            </div>
          )
        })}
        <div className={[s.layerRow, s.bgRow, !S.sel && S.multi.length < 2 ? s.layerOn : ''].join(' ')} onClick={() => c.ui({ sel: null, multi: [], barSel: null })}>
          <span className={s.layerTag}>{tx('Bunn')}</span>
          <span className={s.barName}>{tx('Bakgrunn og vignett')}</span>
        </div>
      </div>
    </div>
  )
}

/** Lagnavn: dobbeltklikk gir et tekstfelt. Enter/klikk utenfor lagrer, Esc avbryter. */
function LayerName({ value, display, onRename, tx }: { value: string; display: string; onRename: (v: string) => void; tx: Tx }) {
  const [edit, setEdit] = useState(false)
  if (edit) {
    return (
      <input className={s.layerNameInput} autoFocus defaultValue={value} maxLength={60} aria-label={tx('Lagnavn')}
        onFocus={(e) => e.currentTarget.select()} onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}
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
  return (
    <span className={s.layerName} title={tx('Dobbeltklikk for å gi nytt navn')} onDoubleClick={(e) => {
      e.stopPropagation()
      setEdit(true)
    }}>{display}</span>
  )
}

const HANDLES: [string, string][] = [['tl', s.hTl ?? ''], ['tr', s.hTr ?? ''], ['bl', s.hBl ?? ''], ['br', s.hBr ?? '']]

function CanvasPanel({ c, S, tx, images, renderer, pickFile }: EditorProps) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const overlay = useRef<HTMLDivElement>(null)
  const zoomBox = useRef<HTMLDivElement>(null)
  const pendingScroll = useRef<{ fx: number; fy: number } | null>(null)
  const d = S.doc

  // Tegn lerretet når dokumentet, et bilde eller fontene endres.
  useEffect(() => {
    if (!d) return
    let raf = 0
    const draw = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const cv = canvas.current
        const g = cv?.getContext('2d')
        if (cv && g) renderer.render(g, d, { s: cv.width / W, edit: true, placeholder: (role) => tx(role === 'person' ? 'Legg til person' : 'Legg til bilde') })
      })
    }
    draw()
    const off = images.onLoad(draw)
    let live = true
    void document.fonts?.ready.then(() => live && draw())
    void ensureFonts(d).then(() => live && draw())
    return () => {
      live = false
      off()
      cancelAnimationFrame(raf)
    }
  }, [d, images, renderer, tx])

  // Behold midtpunktet når det zoomes.
  useEffect(() => {
    const el = zoomBox.current
    const p = pendingScroll.current
    pendingScroll.current = null
    if (!el || !p || S.zoom <= 1) return
    el.scrollLeft = p.fx * el.scrollWidth - el.clientWidth / 2
    el.scrollTop = p.fy * el.scrollHeight - el.clientHeight / 2
  }, [S.zoom])

  const zoom = (f: () => void) => {
    const el = zoomBox.current
    pendingScroll.current = el && S.zoom > 1 ? { fx: (el.scrollLeft + el.clientWidth / 2) / el.scrollWidth, fy: (el.scrollTop + el.clientHeight / 2) / el.scrollHeight } : { fx: 0.5, fy: 0.5 }
    f()
  }

  const pt = (e: { clientX: number; clientY: number }) => {
    const r = (overlay.current as HTMLDivElement).getBoundingClientRect()
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H, k: W / Math.max(1, r.width) }
  }
  const track = () => {
    const move = (e: PointerEvent) => {
      const p = pt(e)
      c.pointerMove(p, p.k, e.altKey, e.shiftKey)
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      c.pointerUp()
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }
  const onDown = (e: ReactPointerEvent) => {
    if (e.button || S.narrow) return
    if (c.pointerDown(pt(e), e.shiftKey)) {
      e.preventDefault()
      track()
    } else if (e.shiftKey) e.preventDefault()
  }
  const onHandle = (e: ReactPointerEvent, h: string) => {
    e.stopPropagation()
    if (e.button) return
    if (c.handleDown(pt(e), h)) {
      e.preventDefault()
      track()
    }
  }

  if (!d) return null
  const multi = S.multi
  const isGroup = multi.length > 1
  const gl = isGroup ? d.layers.filter((l) => multi.includes(l.id)) : []
  const gb = isGroup ? gbox(gl) : null
  const sl = isGroup || S.narrow ? null : c.layer(S.sel)
  const P = (v: number, t: number) => `${(v / t) * 100}%`
  return (
    <section className={s.canvasCol}>
      {S.narrow && (
        <div className={s.infoBox}>
          <b>{tx('Enkel visning på mobil')}</b>
          <span>{tx('Her kan du bytte person, navn, tema og bakgrunn, og laste ned. Vil du flytte eller endre enkeltlag, åpner du malen på en PC.')}</span>
        </div>
      )}
      {S.baseEdit && (
        <div className={s.warnBox}>
          <b>{tx('Du redigerer grunnoppsettet')}</b>
          <span>{tx('Det du lagrer her, blir startpunktet for alle nye maler i kategorien: farger, bakgrunn, fonter og plassering. Maler du allerede har lagret, endres ikke.')}</span>
        </div>
      )}
      <div className={s.stageWrap}>
        <div ref={zoomBox} className={s.stage} style={{ overflow: S.zoom > 1 ? 'auto' : 'visible' }}>
          <div className={s.stageInner} style={{ width: `${Math.round(S.zoom * 100)}%` }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              const f = e.dataTransfer?.files?.[0]
              if (!f) return
              const l = c.layer(S.sel)
              void c.addFile(f, l?.type === 'image' ? { mode: 'replace', id: l.id } : { mode: 'add' })
            }}>
            <canvas ref={canvas} width={W} height={H} className={s.canvas} aria-label={tx('Lerret')} />
            <div ref={overlay} className={s.overlay} data-ts-overlay="1" onPointerDown={onDown}
              onDoubleClick={() => {
                const l = c.layer(S.sel)
                if (l?.type === 'image' && l.src) c.openCrop(l.id)
                else if (l?.type === 'text') setTimeout(() => {
                  const t = document.querySelector<HTMLTextAreaElement>('textarea[data-ts-text]')
                  t?.focus()
                  t?.select()
                }, 30)
              }}
              onContextMenu={(e) => {
                if (S.narrow) return
                e.preventDefault()
                const p = pt(e)
                const t = c.pointerHit(p)
                c.openContext(e.clientX, e.clientY, p, t)
              }}>
              {S.gx.map((v) => <div key={`x${v}`} className={s.guideV} style={{ left: P(v, W) }} />)}
              {S.gy.map((v) => <div key={`y${v}`} className={s.guideH} style={{ top: P(v, H) }} />)}
              {gl.map((l) => <div key={l.id} className={s.groupBox} style={{ left: P(l.x, W), top: P(l.y, H), width: P(l.w, W), height: P(l.h, H), transform: `rotate(${l.rot || 0}deg)` }} />)}
              {gb && <div className={s.groupOutline} style={{ left: P(gb.x, W), top: P(gb.y, H), width: P(gb.w, W), height: P(gb.h, H) }} />}
              {sl && (
                <div className={s.selBox} data-ts-sel={sl.id} style={{ left: P(sl.x, W), top: P(sl.y, H), width: P(sl.w, W), height: P(sl.h, H), transform: `rotate(${sl.rot || 0}deg)` }}>
                  {!sl.lock && HANDLES.map(([h, cls]) => <div key={h} className={`${s.handle} ${cls}`} data-h={h} onPointerDown={(e) => onHandle(e, h)} />)}
                </div>
              )}
            </div>
            {S.busyImg && <div className={s.busy}>{tx('Leser bildet …')}</div>}
          </div>
        </div>
        <div className={s.zoomCtl}>
          <button type="button" disabled={S.zoom <= 1} title={tx('Zoom ut')} aria-label={tx('Zoom ut')} onClick={() => zoom(() => c.zoomOut())}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M5 12h14" /></svg>
          </button>
          <span>{Math.round(S.zoom * 100)} %</span>
          <button type="button" disabled={S.zoom >= 4} title={tx('Zoom inn')} aria-label={tx('Zoom inn')} onClick={() => zoom(() => c.zoomIn())}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M5 12h14M12 5v14" /></svg>
          </button>
        </div>
      </div>
      <div className={s.zoomReset}>
        <button type="button" className={s.btnSmall} disabled={S.zoom === 1} title={tx('Tilbake til standard zoom (100 %)')} onClick={() => c.setZoom(1)}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg>
          <span>{tx('Standard zoom')}</span>
        </button>
      </div>
      {!S.narrow && (
        <div className={s.tips}>
          {(['Klikk: velg et lag', 'Dobbeltklikk på et bilde: beskjær', 'Shift-klikk: velg flere lag, og flytt eller skaler dem sammen', 'Dra: flytt (hold Alt for å slå av hjelpelinjer)', 'Hjørner: endre størrelse (Shift endrer forholdet)', 'Piltaster: finjuster (Shift = 10 px)', 'Delete: slett · ⌘D: dupliser · ⌘Z: angre', 'Slipp et bilde her for å legge det til'] as Phrase[]).map((x) => <span key={x}>{tx(x)}</span>)}
        </div>
      )}
      {S.narrow && (
        <div className={s.btns}>
          <button type="button" className={s.btnSmall} onClick={() => pickFile({ mode: 'add' })}>{tx('Bilde')}</button>
        </div>
      )}
    </section>
  )
}

function PropsPanel({ c, S, tx, images }: EditorProps) {
  const d = S.doc
  if (!d) return null
  const multi = S.multi
  const isGroup = multi.length > 1
  const gl = isGroup ? d.layers.filter((l) => multi.includes(l.id)) : []
  const sl = isGroup || S.narrow ? null : c.layer(S.sel)
  const onBar = !!sl && S.barSel === sl.id && sl.type === 'text' && sl.bar
  const title: Phrase = isGroup ? 'Gruppe' : onBar ? 'Understrek' : sl ? (isLogoAsset(sl) ? 'Logo' : isLine(sl) ? 'Strek' : TAG[sl.type]) : 'Mal'
  const ctrls = isGroup ? ctrlsGroup(c, gl) : sl ? (onBar && sl.type === 'text' ? ctrlsBar(c, sl, tx) : [...linkNote(c, sl, tx), ...ctrlsFor(c, sl)]) : ctrlsMal(c, d)
  return (
    <aside className={s.props} aria-label={tx('Egenskaper')}>
      <div className={s.propsHead}>
        <span>{tx(title)}</span>
        {(sl || isGroup) && <button type="button" className={s.btnSmall} onClick={() => c.ui({ sel: null, multi: [], barSel: null })}>{tx('Ferdig')}</button>}
      </div>
      <Controls ctrls={ctrls} c={c} tx={tx} profileColors={c.profile().colors} imageUrl={(src) => images.url(src)} />
    </aside>
  )
}
