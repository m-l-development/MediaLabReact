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
import { AssetPicker } from '../media-library/AssetPicker'
import { MaskEditor } from '../../shared/mask/MaskEditor'
import { COLORS, IsolateController, type Aspect, type CropRect, type ImagePoint, type Kind } from './controller'
import styles from './IsolateSubject.module.css'

const KINDS: readonly Kind[] = ['person', 'object', 'logo', 'text']
const ASPECTS: readonly { value: Aspect; label: string | MessageKey }[] = [
  { value: 'free', label: 'isolate.crop.free' }, { value: 'orig', label: 'isolate.crop.original' },
  { value: 1, label: '1:1' }, { value: 4 / 5, label: '4:5' }, { value: 16 / 9, label: '16:9' }, { value: 9 / 16, label: '9:16' },
]
const isKey = (s: string): s is MessageKey => s.includes('.')

/** Isolate Subject (IS-01–IS-12). Se controller.ts for logikken. */
export default function IsolateSubject({ query, registerLifecycle }: ToolProps) {
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
    const png = await ctl.exportPng()
    if (!png) return
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })])
      setMessage(t('isolate.copied'))
    } catch {
      setMessage(t('isolate.copyFailed'))
    }
  }

  const targets = TOOLS.filter((tool) => tool.id !== 'isolate-subject' && tool.load && tool.accepts.includes('image'))
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

      {s.phase !== 'empty' && (
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

            <h2 className={styles.step}>{t('isolate.step1')}</h2>
            <div className={styles.kinds}>
              {KINDS.map((k) => (
                <button key={k} type="button" className={styles.kind} aria-pressed={s.mode === k} disabled={!!s.busy} onClick={() => ctl.choose(k)}>
                  <strong>{t(`isolate.kind.${k}`)}</strong>
                  <span>{t(`isolate.kind.${k}.desc`)}</span>
                </button>
              ))}
              <button type="button" className={`${styles.kind} ${styles.kindWide}`} aria-pressed={s.mode === 'point'} disabled={!!s.busy} onClick={() => ctl.startMarking()}>
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
                <p className={styles.help}>{t('isolate.mark.help')}</p>
                <p className={styles.sub}>{t('isolate.mark.after')}</p>
                <div className={styles.segmented} role="group">
                  <button type="button" aria-pressed={s.fillMode === 'fill'} onClick={() => ctl.setOption({ fillMode: 'fill' })}>{t('isolate.fill.fill')}</button>
                  <button type="button" aria-pressed={s.fillMode === 'clear'} onClick={() => ctl.setOption({ fillMode: 'clear' })}>{t('isolate.fill.clear')}</button>
                </div>
                <div className={styles.row}>
                  <Button size="small" variant="ghost" disabled={!s.marks.length || !!s.busy} onClick={() => ctl.clearMarks()}>{t('isolate.mark.clear')}</Button>
                  <Button size="small" variant="primary" disabled={!ctl.canApply()} onClick={() => void ctl.apply()}>{t('isolate.mark.remove')}</Button>
                </div>
              </div>
            )}
            {(s.note || (s.mode && s.mode !== 'point')) && (
              <p className={styles.note}>{s.note ? t(s.note) : s.mode && s.mode !== 'point' ? t(`isolate.kind.${s.mode}.note`) : ''}</p>
            )}
            {s.error && <p className={styles.error} role="alert">{t(s.error)}</p>}

            <h2 className={styles.step}>{t('isolate.step2')}</h2>
            <div className={styles.segmented} role="group">
              <button type="button" aria-pressed={s.bgType === 'none'} onClick={() => ctl.setOption({ bgType: 'none' })}>{t('isolate.bg.none')}</button>
              <button type="button" aria-pressed={s.bgType === 'color'} onClick={() => ctl.setOption({ bgType: 'color' })}>{t('isolate.bg.color')}</button>
            </div>
            {s.bgType === 'color' && (
              <div className={styles.swatches}>
                {COLORS.map((c) => (
                  <button key={c.hex} type="button" className={styles.swatch} style={{ background: c.hex }} aria-pressed={s.bg === c.hex} title={t(c.label)} aria-label={t(c.label)} onClick={() => ctl.setOption({ bg: c.hex })} />
                ))}
                <label className={styles.swatch} data-custom="true" aria-pressed={!COLORS.some((c) => c.hex === s.bg)} title={t('isolate.bg.custom')}>
                  <input type="color" value={s.bg} aria-label={t('isolate.bg.custom')} onChange={(e) => ctl.setOption({ bg: e.target.value })} />
                </label>
              </div>
            )}
            <p className={styles.sub}>{s.bgType === 'none' ? t('isolate.bg.noneNote') : t('isolate.bg.colorNote')}</p>

            <h2 className={styles.step}>{t('isolate.step3')}</h2>
            <button type="button" className={styles.toggle} aria-pressed={s.cropToSubject} onClick={() => ctl.setOption({ cropToSubject: !s.cropToSubject })}>
              <span><strong>{t('isolate.cropSubject')}</strong><small>{t('isolate.cropSubject.desc')}</small></span>
              <i aria-hidden="true" />
            </button>
            <button type="button" className={styles.more} aria-expanded={s.adv} onClick={() => ctl.setOption({ adv: !s.adv })}>{s.adv ? '−' : '+'} {t('isolate.advanced')}</button>
            {s.adv && (
              <div className={styles.sliders}>
                <label>{t('isolate.soft')}<input type="range" min={0} max={6} step={0.5} value={s.soft} onChange={(e) => ctl.setOption({ soft: Number(e.target.value) })} /></label>
                <label>{t('isolate.tight')}<input type="range" min={0} max={8} step={0.5} value={s.tight} onChange={(e) => ctl.setOption({ tight: Number(e.target.value) })} /></label>
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
      {!s.mode && !s.busy && <div className={styles.hint}>{t('isolate.hint')}</div>}
      {s.busy && (
        <div className={styles.busy} role="status">
          <span>{busyLabel}</span>
          {s.busy === 'model' && <div className={styles.bar}><div style={{ width: `${s.pct}%` }} /></div>}
          <small>{s.busy === 'model' ? t('isolate.busy.modelNote') : t('isolate.busy.note')}</small>
        </div>
      )}
    </div>
  )
}
