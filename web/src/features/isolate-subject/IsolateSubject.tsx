import { useEffect, useRef, useState, type DragEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { useServices } from '../../app/services'
import { TOOLS, type ToolProps } from '../../app/tools'
import { useWorkspace } from '../../app/workspace-factory'
import type { Asset } from '../../domain/asset'
import type { AssetId } from '../../domain/ids'
import { useT } from '../../shared/i18n/i18n'
import { toolTitleKey, type MessageKey } from '../../shared/i18n/messages'
import { pastedImage } from '../../shared/lib/paste'
import { useStore } from '../../shared/lib/store'
import { Button } from '../../shared/ui/Button'
import { NumField } from '../../shared/ui/NumField'
import { AssetPicker } from '../media-library/AssetPicker'
import { MaskEditor } from '../../shared/mask/MaskEditor'
import { COLORS, IsolateController, type Aspect, type CropRect, type FillMode, type ImagePoint, type Target, type UiState } from './controller'
import { aiCapable } from './engine/fill'
import styles from './IsolateSubject.module.css'
import { copyImage } from '../../shared/lib/clipboard'

const TARGETS: readonly Target[] = ['person', 'object', 'logo', 'text', 'background']
const ASPECTS: readonly { value: Aspect; label: string | MessageKey }[] = [
  { value: 'free', label: 'isolate.crop.free' }, { value: 'orig', label: 'isolate.crop.original' },
  { value: 1, label: '1:1' }, { value: 4 / 5, label: '4:5' }, { value: 16 / 9, label: '16:9' }, { value: 9 / 16, label: '9:16' },
]
const isKey = (s: string): s is MessageKey => s.includes('.')

/**
 * Isolate Subject brukt inne i en annen editor («Isoler motiv»-popupen, IsolatePopup.tsx): bildet kommer fra editoren,
 * og «Ferdig – sett inn» gir resultatet tilbake (PNG i full oppløsning, med gjennomsiktighet eller valgt bakgrunn).
 * Alle verktøyets funksjoner er med; bare «Bruk i …» (som forlater editoren) og «Nytt bilde» er borte.
 */
export interface IsolateEmbed {
  blob: Blob
  name: string
  onInsert: (png: Blob, name: string) => void
  onCancel: () => void
}

/** Isolate Subject (IS-01–IS-12). Se controller.ts for logikken. */
export default function IsolateSubject({ query, registerLifecycle, embed }: ToolProps & { embed?: IsolateEmbed }) {
  const t = useT()
  const { router } = useServices()
  const { assets } = useWorkspace()
  const [ctl] = useState(() => new IsolateController())
  const s = useStore(ctl.state)
  const [picking, setPicking] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [savedId, setSavedId] = useState<AssetId | null>(null)
  const source = useRef<{ blob: Blob; name: string; assetId: AssetId | null } | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    registerLifecycle({ dispose: () => ctl.dispose(), isBusy: () => !!ctl.state.get().busy })
  }, [ctl, registerLifecycle])

  // popupen: bildet fra editoren lastes straks (én gang)
  const embedded = useRef(false)
  useEffect(() => {
    if (!embed || embedded.current) return
    embedded.current = true
    source.current = { blob: embed.blob, name: embed.name, assetId: null }
    void ctl.load(embed.blob, embed.name)
  }, [embed, ctl])

  async function insert() {
    // en forhåndsvisning (fyll/farge/uskarp) som vises, brukes
    if (s.pending) ctl.acceptEffect()
    const png = await ctl.exportPng()
    if (png && embed) embed.onInsert(png, `${s.name || embed.name}-isolert.png`)
  }

  function cancel() {
    if (!embed || s.busy) return
    if (s.historySize > 0 && !window.confirm(t('isolate.embed.discard'))) return
    embed.onCancel()
  }

  // «Åpne i Isolate Subject» fra Dine medier: ?asset=<id>
  const assetParam = query.asset
  useEffect(() => {
    if (!assetParam) return
    let live = true
    const id = assetParam as AssetId
    Promise.all([assets.get(id), assets.open(id)]).then(([a, blob]) => {
      if (!live || !a) return
      source.current = { blob, name: a.name, assetId: a.id }
      void ctl.load(blob, a.name)
    }, () => undefined)
    return () => {
      live = false
    }
  }, [assetParam, assets, ctl])

  // Lim inn bilde (Ctrl/Cmd + V) – ikke når innlimingen hører til et felt, en dialog eller tilbakemeldingen
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const file = pastedImage(e)
      if (file) {
        e.preventDefault()
        loadFile(file, true)
      }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  })

  /** `ask`: innliming og slipp spør før et åpent bilde erstattes (masken og endringene forsvinner). */
  function loadFile(file: File, ask = false) {
    const cur = ctl.state.get()
    if (ask && cur.phase !== 'empty' && !window.confirm(t('isolate.replace', { from: cur.name, to: file.name || 'bilde' }))) return
    source.current = { blob: file, name: file.name, assetId: null }
    setSavedId(null)
    setMessage(null)
    void ctl.load(file, file.name)
  }

  function pickAsset(a: Asset) {
    void assets.open(a.id).then((blob) => {
      source.current = { blob, name: a.name, assetId: a.id }
      setSavedId(null)
      void ctl.load(blob, a.name)
    })
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) loadFile(f, true)
  }

  /** Lagrer resultatet som ny versjon av originalen i Dine medier (originalen registreres først om nødvendig). */
  async function saveToMedia(): Promise<AssetId | null> {
    if (savedId) return savedId
    const png = await ctl.exportPng()
    const src = source.current
    if (!png || !src) return null
    const originalId = src.assetId ?? (await assets.register(src.blob, { name: src.name })).id
    src.assetId = originalId
    const derived = await assets.derive(originalId, png, { name: 'isolate', params: { mode: s.mode, bg: s.bgType === 'color' ? s.bg : 'none' } }, 'isolate-subject', `${s.name}-isolert.png`)
    setSavedId(derived.id)
    setMessage(t('isolate.saved'))
    return derived.id
  }

  async function download() {
    const png = await ctl.exportPng()
    if (!png) return
    const a = document.createElement('a')
    a.href = URL.createObjectURL(png)
    a.download = `${s.name}-isolert.png`
    document.body.appendChild(a)
    a.click()
    setTimeout(() => {
      URL.revokeObjectURL(a.href)
      a.remove()
    }, 60000)
    ctl.setOption({ done: true })
  }

  async function copy() {
    // utklippstavlen skrives straks i trykket (Safari), bildet lages mens den venter (shared/lib/clipboard)
    const r = await copyImage(() => ctl.exportPng())
    if (r === 'ok') setMessage(t('isolate.copied'))
    else if (r === 'denied') setMessage(t('isolate.copyFailed'))
  }

  const targets = embed ? [] : TOOLS.filter((tool) => tool.id !== 'isolate-subject' && tool.load && tool.accepts.includes('image'))
  const busyLabel = s.busy === 'model' ? t('isolate.busy.model', { pct: s.pct })
    : s.busy === 'analyze' ? t('isolate.busy.analyze') : s.busy === 'fill' ? t('isolate.busy.fill')
      : s.busy === 'seg' ? t('isolate.busy.seg') : t('isolate.busy.run')

  return (
    <div className={styles.tool} onDragOver={(e) => { e.preventDefault(); setDragOver(true) }} onDragLeave={() => setDragOver(false)} onDrop={onDrop}>
      <input ref={fileInput} type="file" hidden accept="image/png,image/jpeg,image/webp,image/avif,image/gif,image/bmp" onChange={(e) => {
        const f = e.currentTarget.files?.[0]
        e.currentTarget.value = ''
        if (f) loadFile(f)
      }} />

      {embed && (
        <div className={styles.embedBar} data-isolate-embed="">
          <h2>{t('isolate.embed.title')}</h2>
          <Button variant="ghost" disabled={!!s.busy} onClick={cancel} data-embed-cancel="">{t('isolate.embed.cancel')}</Button>
          <Button variant="primary" disabled={!s.ready || !!s.busy || s.editing} onClick={() => void insert()} data-embed-insert="">{t('isolate.embed.insert')}</Button>
        </div>
      )}
      {!embed && s.phase !== 'empty' && (
        <div className={styles.topActions}>
          <Button onClick={() => { ctl.reset(); source.current = null; setSavedId(null) }}>{t('isolate.newImage')}</Button>
        </div>
      )}

      {s.phase === 'empty' && (
        <section className={styles.empty}>
          <h1 className={styles.title} data-ml-title="">{t('tool.isolate-subject.title')}</h1>
          <button type="button" className={styles.drop} data-active={dragOver} onClick={() => fileInput.current?.click()}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5M4 20h16" /></svg>
            <span className={styles.dropTitle}>{t('isolate.drop')}</span>
            <span className={styles.dropHint}>{t('isolate.dropHint')}</span>
            <span className={styles.dropButton}>{t('isolate.choose')}</span>
          </button>
          <Button variant="ghost" onClick={() => setPicking(true)}>{t('isolate.fromMedia')}</Button>
          {s.error && <p className={styles.error} role="alert">{t(s.error)}</p>}
          <p className={styles.privacy}>{t('isolate.privacy')}</p>
        </section>
      )}

      {s.phase === 'crop' && <CropStep ctl={ctl} />}

      {s.phase === 'work' && (
        <div className={styles.work}>
          <section className={styles.stageCol} aria-label={s.name}>
            {s.editing ? <EditStage ctl={ctl} busyLabel={busyLabel} /> : <WorkStage ctl={ctl} busyLabel={busyLabel} />}
            <div className={styles.row}>
              <Button size="small" variant="ghost" disabled={!!s.busy} onClick={() => ctl.recrop()} title={t('isolate.recrop.title')}>{t('isolate.recrop')}</Button>
              <Button size="small" variant="ghost" disabled={!s.historySize || !!s.busy} onClick={() => ctl.undo()} title={t('isolate.undo.title')}>{t('isolate.undo')}</Button>
              <Button size="small" variant="ghost" disabled={!s.redoSize || !!s.busy} onClick={() => ctl.redo()} title={t('isolate.redo.title')} data-redo="">{t('isolate.redo')}</Button>
              <Button size="small" variant="ghost" disabled={!ctl.canRestore()} onClick={() => ctl.restore()} title={t('isolate.restore.title')}>{t('isolate.restore')}</Button>
            </div>
            {s.ready && !s.editing && (
              <label className={styles.compare}>
                <span>{t('isolate.after')}</span>
                <input type="range" min={0} max={100} step={1} value={s.cmp} aria-label={t('isolate.compare')} onChange={(e) => ctl.setOption({ cmp: Number(e.target.value) })} />
                <span>{t('isolate.before')}</span>
              </label>
            )}
          </section>

          <aside className={styles.panel}>
            <p className={styles.meta}>{s.name} · {s.dims}</p>

            {/* to faner: hva som skal beholdes og hva som skal fjernes; flervalg i begge, ett valg står bare i én fane */}
            <div className={styles.tabs} role="tablist" aria-label={t('isolate.step1')}>
              {(['keep', 'remove'] as const).map((k) => (
                <button key={k} type="button" role="tab" aria-selected={s.tab === k} data-tab={k} onClick={() => ctl.setTab(k)}>{t(`isolate.tab.${k}`)}</button>
              ))}
            </div>
            <div className={styles.kinds} role="tabpanel" data-panel={s.tab}>
              {TARGETS.map((k) => {
                const on = (s.tab === 'keep' ? s.keepSet : s.removeSet).includes(k)
                const other = (s.tab === 'keep' ? s.removeSet : s.keepSet).includes(k)
                return (
                  <button key={k} type="button" className={`${styles.kind} ${k === 'background' ? styles.kindWide : ''}`} aria-pressed={on} data-target={k} data-other={other ? (s.tab === 'keep' ? 'remove' : 'keep') : undefined} disabled={!!s.busy} onClick={() => ctl.toggle(k)}>
                    <strong>{t(`isolate.kind.${k}`)}</strong>
                    <span>{other ? t(s.tab === 'keep' ? 'isolate.tag.inRemove' : 'isolate.tag.inKeep') : t(`isolate.kind.${k}.desc`)}</span>
                  </button>
                )
              })}
              <button type="button" className={`${styles.kind} ${styles.kindWide}`} aria-pressed={s.mode === 'point'} data-mark-open="" disabled={!!s.busy} onClick={() => ctl.startMarking()}>
                <strong>{t('isolate.mark')}</strong>
                <span>{t('isolate.mark.desc')}</span>
              </button>
              {/* felles maskeredigering: pensel, former og «Velg objekt» med Behold/Fjern, på den faktiske masken */}
              <button type="button" className={`${styles.kind} ${styles.kindWide}`} aria-pressed={s.editing} data-mask-open="" disabled={!!s.busy} onClick={() => (s.editing ? ctl.endEdit() : ctl.startEdit())}>
                <strong>{t(s.editing ? 'mask.done' : 'mask.open')}</strong>
                <span>{t('mask.open.desc')}</span>
              </button>
            </div>
            {s.mode === 'point' && (
              <div className={styles.markBox}>
                <div className={styles.segmented} role="group">
                  <button type="button" aria-pressed={!s.markKeep} onClick={() => ctl.setMarkKeep(false)}><i style={{ background: '#ff5a5a' }} />{t('isolate.mark.remove')}</button>
                  <button type="button" aria-pressed={s.markKeep} onClick={() => ctl.setMarkKeep(true)}><i style={{ background: '#3ddc84' }} />{t('isolate.mark.keep')}</button>
                </div>
                <p className={styles.help}>{t(s.markKeep ? 'isolate.mark.helpKeep' : 'isolate.mark.help')}</p>
                <div className={styles.row}>
                  <Button size="small" variant="ghost" disabled={!s.marks.length || !!s.busy} onClick={() => ctl.clearMarks()}>{t('isolate.mark.clear')}</Button>
                </div>
              </div>
            )}
            {(s.tab === 'remove' || s.removeSet.length > 0 || s.marks.some((m) => !m.keep)) && (
              <div className={styles.markBox}>
                <p className={styles.sub}>{t('isolate.mark.after')}</p>
                <FillChoice name="mark" value={s.fillMode} modes={['fill', 'blur', 'clear', 'color']} color={s.fillColor} onMode={(m) => ctl.setOption({ fillMode: m })} onColor={(c) => ctl.setFillColor(c)} />
              </div>
            )}
            {(s.keepSet.length > 0 || s.removeSet.length > 0 || s.marks.length > 0) && <RunSummary s={s} />}
            <Button variant="primary" block disabled={!ctl.canRun()} onClick={() => void ctl.run()} data-run="">{t(s.busy ? 'isolate.run.busy' : 'isolate.run')}</Button>
            {s.busy && <p className={styles.sub} role="status" data-run-status="">{busyLabel}</p>}
            {s.pending && (
              <div className={styles.markBox} data-effect={s.pending}>
                <p className={styles.help}>{t(`isolate.fill.result.${s.pending}`)}</p>
                {s.pending === 'color' && <Swatches value={s.fillColor} onPick={(c) => ctl.setFillColor(c)} />}
                <div className={styles.sliders}>
                  {s.pending === 'blur' && (
                    <div className={styles.sliderRow}>
                      <span className={styles.sliderHead}><span>{t('isolate.fill.strength')}</span><NumField value={s.blur} min={1} max={100} step={1} label={t('isolate.fill.strength')} onCommit={(v) => ctl.adjustEffect({ blur: v })} /></span>
                      <input type="range" min={1} max={100} step={1} value={s.blur} aria-label={t('isolate.fill.strength')} data-blur-strength="" onChange={(e) => ctl.adjustEffect({ blur: Number(e.target.value) })} />
                    </div>
                  )}
                  <div className={styles.sliderRow}>
                    <span className={styles.sliderHead}><span>{t('isolate.fill.edge')}</span><NumField value={s.edge} min={0} max={40} step={1} label={t('isolate.fill.edge')} onCommit={(v) => ctl.adjustEffect({ edge: v }, s.pending !== 'fill')} /></span>
                    {/* fyll lages på nytt først når brukeren slipper (AI tar tid), uskarp og farge straks */}
                    <input type="range" min={0} max={40} step={1} value={s.edge} aria-label={t('isolate.fill.edge')} disabled={!!s.busy} onChange={(e) => ctl.adjustEffect({ edge: Number(e.target.value) }, s.pending !== 'fill')} />
                  </div>
                </div>
                <div className={styles.row}>
                  <Button size="small" variant="ghost" disabled={!!s.busy} onClick={() => ctl.cancelEffect()} data-effect-cancel="">{t('isolate.fill.cancel')}</Button>
                  {s.pending === 'fill' && <Button size="small" variant="ghost" disabled={!!s.busy} onClick={() => ctl.adjustEffect({})} data-effect-retry="">{t('isolate.fill.retry')}</Button>}
                  <Button size="small" variant="primary" disabled={!!s.busy} onClick={() => ctl.acceptEffect()} data-effect-apply="">{t('isolate.fill.apply')}</Button>
                </div>
              </div>
            )}
            {s.mode && s.mode !== 'point' && <p className={styles.note}>{t(`isolate.kind.${s.mode}.note`)}</p>}
            {s.note && <p className={styles.note} role="status" data-run-note="">{t(s.note)}</p>}
            {s.error && <p className={styles.error} role="alert">{t(s.error)}</p>}

            <h2 className={styles.step}>{t('isolate.step2')}</h2>
            <div className={styles.segmented} role="group">
              <button type="button" aria-pressed={s.bgType === 'none'} onClick={() => ctl.setOption({ bgType: 'none' })}>{t('isolate.bg.none')}</button>
              <button type="button" aria-pressed={s.bgType === 'color'} onClick={() => ctl.setOption({ bgType: 'color' })}>{t('isolate.bg.color')}</button>
            </div>
            {s.bgType === 'color' && <Swatches value={s.bg} onPick={(bg) => ctl.setOption({ bg })} />}
            <p className={styles.sub}>{s.bgType === 'none' ? t('isolate.bg.noneNote') : t('isolate.bg.colorNote')}</p>

            <h2 className={styles.step}>{t('isolate.step3')}</h2>
            <button type="button" className={styles.toggle} aria-pressed={s.cropToSubject} onClick={() => ctl.setOption({ cropToSubject: !s.cropToSubject })}>
              <span><strong>{t('isolate.cropSubject')}</strong><small>{t('isolate.cropSubject.desc')}</small></span>
              <i aria-hidden="true" />
            </button>
            <button type="button" className={styles.more} aria-expanded={s.adv} onClick={() => ctl.setOption({ adv: !s.adv })}>{s.adv ? '−' : '+'} {t('isolate.advanced')}</button>
            {s.adv && (
              <div className={styles.sliders}>
                {([['soft', 'isolate.soft', 6], ['tight', 'isolate.tight', 8]] as const).map(([k, key, max]) => (
                  <div key={k} className={styles.sliderRow}>
                    <span className={styles.sliderHead}><span>{t(key)}</span><NumField value={s[k]} min={0} max={max} step={0.5} label={t(key)} onCommit={(v) => ctl.setOption({ [k]: v })} /></span>
                    <input type="range" min={0} max={max} step={0.5} value={s[k]} aria-label={t(key)} onChange={(e) => ctl.setOption({ [k]: Number(e.target.value) })} />
                  </div>
                ))}
              </div>
            )}

            <h2 className={styles.step}>{t('isolate.step4')}</h2>
            <Button variant="primary" block disabled={!s.ready} onClick={() => void download()}>{t('isolate.download')}</Button>
            <div className={styles.row}>
              <Button size="small" disabled={!s.ready} onClick={() => void copy()}>{t('isolate.copy')}</Button>
              <Button size="small" disabled={!s.ready} onClick={() => void saveToMedia()}>{t('isolate.saveMedia')}</Button>
              {targets.map((tool) => (
                <Button key={tool.id} size="small" disabled={!s.ready} onClick={() => void saveToMedia().then((id) => id && router.navigate({ name: 'tool', tool: tool.id, query: { asset: id } }))}>
                  {t('isolate.sendTo', { tool: t(toolTitleKey(tool.id)) })}
                </Button>
              ))}
            </div>
            <p className={styles.sub}>{!s.ready ? t('isolate.dl.notReady') : s.bgType === 'none' ? t('isolate.dl.transparent') : t('isolate.dl.color')}</p>
            {message && <p className={styles.note} role="status">{message}</p>}
          </aside>
        </div>
      )}

      {s.done && (
        <div className={styles.doneScrim} onClick={() => ctl.setOption({ done: false })}>
          <div className={styles.done} role="dialog" aria-modal="true" aria-labelledby="done-title" onClick={(e) => e.stopPropagation()}>
            <h2 id="done-title">{t('isolate.done.title')}</h2>
            <p>{t('isolate.done.body')}</p>
            <div className={styles.row}>
              <Button variant="primary" onClick={() => { ctl.reset(); setSavedId(null); setTimeout(() => fileInput.current?.click(), 50) }}>{t('isolate.newImage')}</Button>
              <Button onClick={() => { ctl.againSame(); setSavedId(null) }}>{t('isolate.done.same')}</Button>
              <Button variant="ghost" onClick={() => ctl.setOption({ done: false })}>{t('isolate.done.no')}</Button>
            </div>
          </div>
        </div>
      )}

      {picking && <AssetPicker kinds={['image']} onPick={pickAsset} onClose={() => setPicking(false)} />}
    </div>
  )
}

/** Beskjæringssteget etter opplasting (IS-02). */
function CropStep({ ctl }: { ctl: IsolateController }) {
  const t = useT()
  const s = useStore(ctl.state)
  const canvas = useRef<HTMLCanvasElement>(null)
  const drag = useRef<{ handle: string; rect: DOMRect; start: { x: number; y: number }; c0: CropRect } | null>(null)

  const original = ctl.original
  useEffect(() => {
    const c = canvas.current
    if (!c || !original) return
    c.width = original.width
    c.height = original.height
    c.getContext('2d')?.drawImage(original, 0, 0)
  }, [original])

  const pos = (e: ReactPointerEvent, rect: DOMRect) => ({
    x: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
    y: Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)),
  })

  return (
    <section className={styles.cropStep}>
      <div className={styles.cropHead}>
        <strong>{t('isolate.crop.title')}</strong>
        <span>{t('isolate.crop.body')}</span>
      </div>
      <div
        className={styles.cropArea}
        onPointerDown={(e) => {
          if (e.button > 0) return
          const rect = e.currentTarget.getBoundingClientRect()
          const handle = (e.target as HTMLElement).closest('[data-h]')?.getAttribute('data-h') ?? 'new'
          drag.current = { handle, rect, start: pos(e, rect), c0: s.crop }
          e.currentTarget.setPointerCapture(e.pointerId)
        }}
        onPointerMove={(e) => {
          const d = drag.current
          if (d) ctl.dragCrop(d.handle, d.start, pos(e, d.rect), d.c0)
        }}
        onPointerUp={() => {
          if (drag.current) ctl.endCropDrag(drag.current.c0)
          drag.current = null
        }}
        onPointerCancel={() => (drag.current = null)}
      >
        <canvas ref={canvas} className={styles.cropCanvas} />
        <div data-h="move" className={styles.cropFrame} style={{ left: `${s.crop.x * 100}%`, top: `${s.crop.y * 100}%`, width: `${s.crop.w * 100}%`, height: `${s.crop.h * 100}%` }}>
          {['nw', 'ne', 'sw', 'se'].map((h) => <span key={h} data-h={h} className={styles.handle} data-pos={h} />)}
        </div>
      </div>
      <div className={styles.aspects} role="group">
        {ASPECTS.map((a) => (
          <button key={String(a.value)} type="button" aria-pressed={s.aspect === a.value} onClick={() => ctl.setAspect(a.value)}>
            {isKey(a.label) ? t(a.label) : a.label}
          </button>
        ))}
      </div>
      <div className={styles.row}>
        <span className={styles.sub}>{ctl.cropDims()}</span>
        <Button variant="ghost" onClick={() => ctl.cropSkip()}>{t('isolate.crop.skip')}</Button>
        <Button variant="primary" onClick={() => ctl.cropOk()}>{t('isolate.crop.ok')}</Button>
      </div>
    </section>
  )
}

/** «Finjuster masken»: den felles maskeredigeringen på den faktiske masken (forhåndsvisning og eksport bruker den). */
function EditStage({ ctl, busyLabel }: { ctl: IsolateController; busyLabel: string }) {
  const t = useT()
  const s = useStore(ctl.state)
  const target = ctl.editTarget()
  if (!target) return null
  return (
    <div className={styles.editStage} data-isolate-edit="">
      <MaskEditor key={`${target.image.width}x${target.image.height}-${s.historySize}`} image={target.image} mask={target.mask} onChange={() => ctl.maskChanged()} selectObject={(x, y) => ctl.selectObject(x, y)} />
      {s.busy && <div className={styles.busy} role="status"><span>{busyLabel}</span>{s.busy === 'model' && <div className={styles.bar}><div style={{ width: `${s.pct}%` }} /></div>}</div>}
      {/* det som fjernes i redigeringen: fyll med omgivelser (standard), gjennomsiktig eller farge – brukes ved «Ferdig» */}
      <div className={styles.markBox} data-edit-fill="">
        <p className={styles.sub}>{t('isolate.edit.after')}</p>
        <FillChoice name="edit" value={s.editFill} modes={['fill', 'clear', 'color']} color={s.fillColor} onMode={(m) => ctl.setOption({ editFill: m === 'blur' ? 'fill' : m })} onColor={(c) => ctl.setFillColor(c)} />
      </div>
      <div className={styles.row}>
        <Button size="small" variant="primary" data-mask-done="" onClick={() => ctl.endEdit()}>{t('mask.done')}</Button>
      </div>
    </div>
  )
}

/** Arbeidsflaten: resultatet, merking med trykk/firkant (høyreklikk = motsatt) og fremdrift. */
function WorkStage({ ctl, busyLabel }: { ctl: IsolateController; busyLabel: string }) {
  const t = useT()
  const s = useStore(ctl.state)
  const view = useRef<HTMLCanvasElement>(null)
  const geom = useRef<{ ox: number; oy: number; cw: number; ch: number } | null>(null)
  const drag = useRef<{ start: ImagePoint; end: ImagePoint; sx: number; sy: number; big: boolean; right: boolean } | null>(null)
  const raf = useRef(0)

  const paint = () => {
    cancelAnimationFrame(raf.current)
    raf.current = requestAnimationFrame(() => {
      const c = view.current
      if (!c) return
      const d = drag.current
      const keep = d ? (d.right ? !(s.mode === 'point' && s.markKeep) : s.mode === 'point' && s.markKeep) : false
      geom.current = ctl.compose(c, d && d.big ? { x0: Math.min(d.start.x, d.end.x), y0: Math.min(d.start.y, d.end.y), x1: Math.max(d.start.x, d.end.x), y1: Math.max(d.start.y, d.end.y), keep } : null)
    })
  }

  useEffect(() => {
    paint()
    return () => cancelAnimationFrame(raf.current)
  })

  const toImage = (e: ReactPointerEvent): ImagePoint | null => {
    const c = view.current
    const g = geom.current
    const src = ctl.source
    if (!c || !g || !src) return null
    const r = c.getBoundingClientRect()
    const fx = (e.clientX - r.left) / r.width
    const fy = (e.clientY - r.top) / r.height
    const cl = (n: number) => Math.min(1, Math.max(0, n))
    return { x: cl((g.ox + fx * g.cw) / src.width), y: cl((g.oy + fy * g.ch) / src.height), inside: fx >= 0 && fx <= 1 && fy >= 0 && fy <= 1 }
  }

  return (
    <>
    <div className={styles.stage}>
      <div className={styles.checker}>
        <canvas
          ref={view}
          className={styles.view}
          onContextMenu={(e) => e.preventDefault()}
          onPointerDown={(e) => {
            if (s.busy || e.button > 2) return
            const p = toImage(e)
            if (!p || !p.inside) return
            drag.current = { start: p, end: p, sx: e.clientX, sy: e.clientY, big: false, right: e.button === 2 }
            e.currentTarget.setPointerCapture(e.pointerId)
          }}
          onPointerMove={(e) => {
            const d = drag.current
            const p = d && toImage(e)
            if (!d || !p) return
            d.end = p
            if (Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 8) d.big = true
            if (d.big) paint()
          }}
          onPointerUp={() => {
            const d = drag.current
            drag.current = null
            const g = geom.current
            if (!d || !g) return
            ctl.mark(d.start, d.end, d.big, d.right, Math.max(5, Math.max(g.cw, g.ch) / 110) * 1.8)
          }}
          onPointerCancel={() => {
            drag.current = null
            paint()
          }}
        />
      </div>
      {s.busy && (
        <div className={styles.busy} role="status">
          <span>{busyLabel}</span>
          {(s.busy === 'model' || (s.busy === 'fill' && s.pct > 0)) && <div className={styles.bar}><div style={{ width: `${s.pct}%` }} /></div>}
          {/* AI-utfyllingen gir ingen fremdrift underveis: en stripe som går viser at bildet behandles */}
          {s.busy === 'fill' && !s.pct && <div className={`${styles.bar} ${styles.barRun}`}><div /></div>}
          <small>{s.busy === 'model' ? t('isolate.busy.modelNote') : s.busy === 'fill' ? t('isolate.busy.fillNote') : t('isolate.busy.note')}</small>
        </div>
      )}
    </div>
    {/* hintet står under bildet, ikke oppå det */}
    {!s.mode && !s.busy && <p className={styles.hint}>{t('isolate.hint')}</p>}
    </>
  )
}

/** Fargene (samme som under «Bakgrunn») og egen farge. */
function Swatches({ value, onPick }: { value: string; onPick: (hex: string) => void }) {
  const t = useT()
  return (
    <div className={styles.swatches}>
      {COLORS.map((c) => (
        <button key={c.hex} type="button" className={styles.swatch} style={{ background: c.hex }} aria-pressed={value === c.hex} title={t(c.label)} aria-label={t(c.label)} onClick={() => onPick(c.hex)} />
      ))}
      <label className={styles.swatch} data-custom="true" aria-pressed={!COLORS.some((c) => c.hex === value)} title={t('isolate.bg.custom')}>
        <input type="color" value={value} aria-label={t('isolate.bg.custom')} onChange={(e) => onPick(e.target.value)} />
      </label>
    </div>
  )
}

/** Hva som skjer med det som fjernes: fyll med omgivelser (AI), uskarpt, gjennomsiktig eller farge. */
function FillChoice({ name, value, modes, color, onMode, onColor }: { name: string; value: FillMode; modes: readonly FillMode[]; color: string; onMode: (m: FillMode) => void; onColor: (hex: string) => void }) {
  const t = useT()
  return (
    <>
      <div className={styles.segmented} role="group" data-fill-mode={name}>
        {modes.map((m) => (
          <button key={m} type="button" aria-pressed={value === m} onClick={() => onMode(m)}>{t(`isolate.fill.${m}`)}</button>
        ))}
      </div>
      {value === 'color' && <Swatches value={color} onPick={onColor} />}
      <p className={styles.help}>{t(value === 'fill' && !aiCapable() ? 'isolate.fill.help.fillLite' : `isolate.fill.help.${value}`)}</p>
    </>
  )
}

/** Kort oppsummering av hva «Gjennomfør isolering» gjør med valgene. */
function RunSummary({ s }: { s: UiState }) {
  const t = useT()
  const list = (ts: readonly Target[]) => ts.map((k) => t(`isolate.kind.${k}`).toLowerCase()).join(', ')
  const green = s.marks.some((m) => m.keep)
  const red = s.marks.some((m) => !m.keep)
  const kept = [list(s.keepSet), green ? t('isolate.sum.marked') : ''].filter(Boolean).join(', ')
  const removed = [list(s.removeSet), red ? t('isolate.sum.marked') : ''].filter(Boolean).join(', ')
  const isolating = s.keepSet.length > 0 || (green && !removed)
  return (
    <p className={styles.sub} data-run-summary="">
      {t('isolate.sum.keep', { list: kept || t('isolate.sum.rest') })}
      {removed && <><br />{t('isolate.sum.remove', { list: removed, how: t(`isolate.fill.${s.fillMode}`).toLowerCase() })}</>}
      {isolating && !s.keepSet.includes('background') && <><br />{t('isolate.sum.isolate')}</>}
    </p>
  )
}
