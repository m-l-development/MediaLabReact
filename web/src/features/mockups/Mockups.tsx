import { useEffect, useRef, useState, type CSSProperties, type DragEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { useServices } from '../../app/services'
import { TOOLS, type ToolProps } from '../../app/tools'
import { useWorkspace } from '../../app/workspace-factory'
import type { Asset } from '../../domain/asset'
import type { AssetId } from '../../domain/ids'
import { readMockupSettings, writeMockupSettings } from '../../infrastructure/legacy-import/mockups'
import { useT } from '../../shared/i18n/i18n'
import { toolTitleKey, type MessageKey } from '../../shared/i18n/messages'
import { Button } from '../../shared/ui/Button'
import { AssetPicker } from '../media-library/AssetPicker'
import type { MockupCategory, MockupEntry } from './engine/catalog'
import { clamp, type Quad } from './engine/geometry'
import { DEFAULT_SETTINGS, detect, render, type MockupSettings } from './engine/render'
import styles from './Mockups.module.css'
import { useMockupLibrary } from './useMockupLibrary'

const CATS: readonly ('all' | MockupCategory)[] = ['all', 'phone', 'laptop', 'screen', 'print', 'other', 'collab']
const CORNER_KEYS: readonly MessageKey[] = ['mockups.corner.tl', 'mockups.corner.tr', 'mockups.corner.br', 'mockups.corner.bl']

interface Design { img: HTMLImageElement; url: string; name: string; assetId: AssetId | null; blob: Blob }

type DesignResult = { ok: true; design: Design } | { ok: false; error: MessageKey }

/** Leser et bilde til et design (samme filtyper og grense som i dag). */
function readDesign(blob: Blob, name: string, assetId: AssetId | null): Promise<DesignResult> {
  if (!/^image\/(png|jpeg|webp|gif)$/.test(blob.type)) return Promise.resolve({ ok: false, error: 'mockups.toast.badType' })
  if (blob.size > 60e6) return Promise.resolve({ ok: false, error: 'mockups.toast.tooBig' })
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => resolve({ ok: true, design: { img, url, name: name.slice(0, 80), assetId, blob } })
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve({ ok: false, error: 'mockups.toast.unreadable' })
    }
    img.src = url
  })
}

/** Mockups (MK-01–MK-13): ett design vises i alle mockupene; velg én for å justere og eksportere. */
export default function Mockups({ query, registerLifecycle }: ToolProps) {
  const t = useT()
  const { router } = useServices()
  const { assets, userId } = useWorkspace()
  const lib = useMockupLibrary()
  const [cat, setCat] = useState<'all' | MockupCategory>('all')
  const [design, setDesign] = useState<Design | null>(null)
  const [all, setAll] = useState<Record<string, Partial<MockupSettings>>>(() => readMockupSettings(userId) as Record<string, Partial<MockupSettings>>)
  const [toast, setToast] = useState<string | null>(null)
  const [picking, setPicking] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const ownInput = useRef<HTMLInputElement>(null)
  const selId = query.mockup ?? null

  useEffect(() => {
    registerLifecycle({ dispose: () => undefined })
  }, [registerLifecycle])

  // Frigjør designets object-URL når det byttes eller verktøyet lukkes.
  const designUrl = design?.url
  useEffect(() => () => {
    if (designUrl) URL.revokeObjectURL(designUrl)
  }, [designUrl])

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 2600)
    return () => clearTimeout(id)
  }, [toast])

  function applyDesign(blob: Blob, name: string, assetId: AssetId | null) {
    void readDesign(blob, name, assetId).then((r) => {
      if (!r.ok) return setToast(t(r.error))
      setDesign(r.design)
      setToast(t(selId ? 'mockups.toast.designSwitched' : 'mockups.toast.designAll'))
    })
  }

  // «Åpne i Mockups» fra Dine medier (?asset=…)
  const assetParam = query.asset
  useEffect(() => {
    if (!assetParam) return
    let live = true
    const id = assetParam as AssetId
    Promise.all([assets.get(id), assets.open(id)])
      .then(([a, blob]) => (a ? readDesign(blob, a.name, a.id) : null))
      .then((r) => {
        if (live && r?.ok) setDesign(r.design)
      }, () => undefined)
    return () => {
      live = false
    }
  }, [assetParam, assets])

  // Lim inn bilde som design
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const file = [...(e.clipboardData?.items ?? [])].find((i) => i.type.startsWith('image/'))?.getAsFile()
      if (file) {
        e.preventDefault()
        applyDesign(file, file.name, null)
      }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  })

  const settingsOf = (m: MockupEntry): MockupSettings => {
    const s = { ...DEFAULT_SETTINGS, ...(all[m.id] ?? {}) }
    if (!s.corners) s.corners = m.corners ?? lib.auto.get(m.id) ?? null
    return s
  }

  function patch(id: string, p: Partial<MockupSettings>) {
    setAll((prev) => {
      const next = { ...prev, [id]: { ...(prev[id] ?? {}), ...p } }
      writeMockupSettings(userId, next)
      return next
    })
  }

  const entries = lib.entries ?? []
  const visible = cat === 'all' ? entries : entries.filter((m) => m.cat === cat)
  const selected = entries.find((m) => m.id === selId) ?? null

  const open = (id: string | null) => {
    const q: Record<string, string> = {}
    if (id) q.mockup = id
    void router.navigate({ name: 'tool', tool: 'mockups', query: q }, { replace: !!selId && !!id })
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) applyDesign(f, f.name, null)
  }

  return (
    <div
      className={styles.tool}
      onDragOver={(e) => {
        if (![...e.dataTransfer.types].includes('Files')) return
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false)
      }}
      onDrop={onDrop}
    >
      <input ref={fileInput} type="file" hidden accept="image/png,image/jpeg,image/webp,image/gif" onChange={(e) => {
        const f = e.currentTarget.files?.[0]
        e.currentTarget.value = ''
        if (f) applyDesign(f, f.name, null)
      }} />
      <input ref={ownInput} type="file" hidden multiple accept="image/png,image/jpeg,image/webp" onChange={(e) => {
        const fs = [...(e.currentTarget.files ?? [])]
        e.currentTarget.value = ''
        void lib.addOwn(fs).then((r) => setToast(r.added ? t('mockups.toast.ownAdded', { count: r.added }) : t('mockups.toast.ownBad')))
      }} />

      {!selected && (
        <Gallery
          entries={visible}
          allEntries={entries}
          loading={!lib.entries}
          cat={cat}
          setCat={setCat}
          lib={lib}
          design={design}
          settingsOf={settingsOf}
          onOpen={open}
          onUpload={() => fileInput.current?.click()}
          onPick={() => setPicking(true)}
          onClearDesign={() => setDesign(null)}
          onAddOwn={() => ownInput.current?.click()}
          onToast={setToast}
        />
      )}

      {selected && (
        <Editor
          key={selected.id}
          mockup={selected}
          list={visible.length ? visible : entries}
          image={lib.images.get(selected.id) ?? null}
          design={design}
          settings={settingsOf(selected)}
          onPatch={(p) => patch(selected.id, p)}
          onOpen={open}
          onUpload={() => fileInput.current?.click()}
          onPick={() => setPicking(true)}
          onToast={setToast}
          onDesignAsset={(assetId) => setDesign((d) => (d ? { ...d, assetId } : d))}
          dragOver={dragOver}
        />
      )}

      {toast && <div className={styles.toast} role="status">{toast}</div>}
      {picking && <AssetPicker kinds={['image']} onPick={(a: Asset) => void assets.open(a.id).then((b) => applyDesign(b, a.name, a.id))} onClose={() => setPicking(false)} />}
    </div>
  )
}

interface GalleryProps {
  entries: MockupEntry[]
  allEntries: MockupEntry[]
  loading: boolean
  cat: 'all' | MockupCategory
  setCat: (c: 'all' | MockupCategory) => void
  lib: ReturnType<typeof useMockupLibrary>
  design: Design | null
  settingsOf: (m: MockupEntry) => MockupSettings
  onOpen: (id: string) => void
  onUpload: () => void
  onPick: () => void
  onClearDesign: () => void
  onAddOwn: () => void
  onToast: (s: string) => void
}

function Gallery({ entries, allEntries, loading, cat, setCat, lib, design, settingsOf, onOpen, onUpload, onPick, onClearDesign, onAddOwn, onToast }: GalleryProps) {
  const t = useT()
  const count = (c: 'all' | MockupCategory) => (c === 'all' ? allEntries.length : allEntries.filter((m) => m.cat === c).length)
  return (
    <section className={styles.gallery}>
      <h1 className={styles.title}>{t('tool.mockups.title')}</h1>
      <p className={styles.lead}>{t('mockups.lead')}</p>
      <div className={styles.row}>
        <Button variant="primary" onClick={onUpload}>{design ? t('mockups.replace') : t('mockups.upload')}</Button>
        <Button variant="ghost" onClick={onPick}>{t('mockups.fromMedia')}</Button>
        {design && (
          <span className={styles.designChip}>
            <span className={styles.designThumb} style={{ backgroundImage: `url("${design.url}")` }} />
            {design.name}
            <button type="button" onClick={onClearDesign} aria-label={t('mockups.removeDesign')} title={t('mockups.removeDesign')}>×</button>
          </span>
        )}
      </div>
      <p className={styles.hint}>{t('mockups.dropHint')}</p>

      {lib.legacyCount > 0 && (
        <div className={styles.banner}>
          <span>{t('mockups.importLegacy', { count: lib.legacyCount })}</span>
          <Button size="small" onClick={() => void lib.importLegacy().then((n) => onToast(t('mockups.toast.ownAdded', { count: n })))}>{t('mockups.importLegacy.run')}</Button>
        </div>
      )}

      <div className={styles.cats} role="group">
        {CATS.filter((c) => c === 'all' || count(c)).map((c) => (
          <button key={c} type="button" aria-pressed={cat === c} onClick={() => setCat(c)}>
            {t(`mockups.cat.${c}`)} <span>{count(c)}</span>
          </button>
        ))}
        <button type="button" className={styles.addOwn} onClick={onAddOwn} title={t('mockups.addOwnHint')}>{t('mockups.addOwn')}</button>
      </div>

      {!loading && allEntries.length === 0 && <p className={styles.hint}>{t('mockups.empty')}</p>}

      <ul className={styles.cards}>
        {entries.map((m) => (
          <li key={m.id} className={styles.cardItem}>
            <button type="button" className={styles.card} onClick={() => onOpen(m.id)}>
              <CardPreview mockup={m} image={lib.images.get(m.id) ?? null} design={design} settings={settingsOf(m)} />
              <span className={styles.cardName}>{m.name}<small>{t(`mockups.cat.${m.cat}`)}</small></span>
            </button>
            {m.source === 'own' && (
              <button type="button" className={styles.delete} aria-label={t('mockups.deleteOwn')} title={t('mockups.deleteOwn')} onClick={() => {
                if (confirm(t('mockups.confirmDeleteOwn'))) void lib.removeOwn(m.id)
              }}>×</button>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Forhåndsvisning i galleriet (480 px), tegnet på nytt når design, innstillinger eller bilde endres. */
function CardPreview({ mockup, image, design, settings }: { mockup: MockupEntry; image: HTMLImageElement | null; design: Design | null; settings: MockupSettings }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const key = JSON.stringify(settings)
  useEffect(() => {
    const c = canvas.current
    if (!c || !image) return
    // Én forhåndsvisning om gangen per bilde, i neste ledige øyeblikk, så galleriet ikke fryser.
    const id = setTimeout(() => {
      const W = 480
      const H = Math.round((W * image.naturalHeight) / image.naturalWidth)
      c.width = W
      c.height = H
      const g = c.getContext('2d')
      if (g) {
        try {
          render(g, W, H, image, design?.img ?? null, mockup, JSON.parse(key) as MockupSettings, { N: 8 })
        } catch {
          // en mockup som ikke kan tegnes, vises uten design
        }
      }
    }, 0)
    return () => clearTimeout(id)
  }, [image, design, mockup, key])
  const ratio = image ? `${image.naturalWidth} / ${image.naturalHeight}` : '3 / 2'
  return <canvas ref={canvas} className={styles.cardCanvas} style={{ aspectRatio: ratio } as CSSProperties} width={480} height={320} />
}

interface EditorProps {
  mockup: MockupEntry
  list: MockupEntry[]
  image: HTMLImageElement | null
  design: Design | null
  settings: MockupSettings
  onPatch: (p: Partial<MockupSettings>) => void
  onOpen: (id: string | null) => void
  onUpload: () => void
  onPick: () => void
  onToast: (s: string) => void
  onDesignAsset: (id: AssetId) => void
  dragOver: boolean
}

function Editor({ mockup, list, image, design, settings: st, onPatch, onOpen, onUpload, onPick, onToast, onDesignAsset, dragOver }: EditorProps) {
  const t = useT()
  const { router } = useServices()
  const { assets } = useWorkspace()
  const stage = useRef<HTMLElement>(null)
  const wrap = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [box, setBox] = useState({ w: 600, h: 400 })
  const [adj, setAdj] = useState(false)
  const [fmt, setFmt] = useState<'png' | 'jpg'>('png')
  const [busy, setBusy] = useState(false)
  const [dragging, setDragging] = useState(false)

  const step = (d: number) => {
    if (!list.length) return
    const i = list.findIndex((m) => m.id === mockup.id)
    onOpen(list[(i + d + list.length) % list.length]?.id ?? null)
  }

  // Tastatur: piltaster bytter bilde, Esc lukker hjørnejustering eller går til galleriet.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) && (el as HTMLInputElement).type !== 'range') return
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        step(-1)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        step(1)
      } else if (e.key === 'Escape') {
        if (adj) setAdj(false)
        else onOpen(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // Tilpass lerretet til scenen.
  useEffect(() => {
    const el = stage.current
    if (!el || !image) return
    const measure = () => {
      const aw = Math.max(80, el.clientWidth - 48)
      const ah = Math.max(80, el.clientHeight - 48)
      const r = image.naturalWidth / image.naturalHeight
      let w = aw
      let h = aw / r
      if (h > ah) {
        h = ah
        w = ah * r
      }
      setBox((b) => (Math.abs(b.w - w) > 0.5 || Math.abs(b.h - h) > 0.5 ? { w, h } : b))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [image])

  const settingsKey = JSON.stringify(st)
  useEffect(() => {
    const c = canvas.current
    if (!c || !image) return
    const raf = requestAnimationFrame(() => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const W = Math.max(2, Math.round(Math.min(image.naturalWidth, box.w * dpr)))
      const H = Math.max(2, Math.round((W * image.naturalHeight) / image.naturalWidth))
      if (c.width !== W || c.height !== H) {
        c.width = W
        c.height = H
      }
      const g = c.getContext('2d')
      if (g) render(g, W, H, image, design?.img ?? null, mockup, JSON.parse(settingsKey) as MockupSettings, { N: dragging ? 10 : 20 })
    })
    return () => cancelAnimationFrame(raf)
  }, [image, design, mockup, settingsKey, box, dragging])

  async function exportBlob(): Promise<Blob | null> {
    if (!image) return null
    const W = image.naturalWidth
    const H = image.naturalHeight
    const c = document.createElement('canvas')
    c.width = W
    c.height = H
    const g = c.getContext('2d')
    if (!g) return null
    render(g, W, H, image, design?.img ?? null, mockup, st, { N: 28 })
    return new Promise((res) => c.toBlob(res, fmt === 'jpg' ? 'image/jpeg' : 'image/png', 0.92))
  }

  const fileName = `mockup-${mockup.id}.${fmt === 'jpg' ? 'jpg' : 'png'}`

  async function download() {
    if (busy) return
    setBusy(true)
    try {
      const b = await exportBlob()
      if (!b) return
      const a = document.createElement('a')
      a.href = URL.createObjectURL(b)
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      setTimeout(() => {
        URL.revokeObjectURL(a.href)
        a.remove()
      }, 60000)
    } finally {
      setBusy(false)
    }
  }

  async function copy() {
    const b = await exportBlob()
    if (!b) return
    try {
      const png = b.type === 'image/png' ? b : await (async () => {
        const bmp = await createImageBitmap(b)
        const c = new OffscreenCanvas(bmp.width, bmp.height)
        c.getContext('2d')?.drawImage(bmp, 0, 0)
        return c.convertToBlob({ type: 'image/png' })
      })()
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })])
      onToast(t('mockups.toast.copied'))
    } catch {
      onToast(t('mockups.toast.copyFailed'))
    }
  }

  /** Lagres som ny versjon av designet (kobling til originalen), eller som generert bilde uten design-asset. */
  async function saveToMedia(): Promise<AssetId | null> {
    const b = await exportBlob()
    if (!b) return null
    const op = { name: 'mockup', params: { mockup: mockup.id } }
    let created: Asset
    if (design) {
      const from = design.assetId ?? (await assets.register(design.blob, { name: design.name })).id
      if (!design.assetId) onDesignAsset(from)
      created = await assets.derive(from, b, op, 'mockups', fileName)
    } else {
      created = await assets.register(b, { name: fileName, origin: { type: 'generated', tool: 'mockups' } })
    }
    onToast(t('mockups.saved'))
    return created.id
  }

  function dragCorner(e: ReactPointerEvent, i: number) {
    e.preventDefault()
    e.stopPropagation()
    const el = wrap.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const base: Quad = (st.corners ?? [[0.3, 0.3], [0.7, 0.3], [0.7, 0.7], [0.3, 0.7]]).map((p) => [...p]) as Quad
    setDragging(true)
    const move = (ev: PointerEvent) => {
      const q = base.map((p) => [...p]) as Quad
      q[i as 0 | 1 | 2 | 3] = [clamp((ev.clientX - r.left) / r.width, 0, 1), clamp((ev.clientY - r.top) / r.height, 0, 1)]
      onPatch({ corners: q })
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      setDragging(false)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }

  const pct = (v: number) => `${Math.round(v * 100)} %`
  const range = (label: MessageKey, k: 'zoom' | 'ox' | 'oy' | 'shade' | 'gloss', min: number, max: number, stepV: number, def: number) => (
    <label key={k} className={styles.range}>
      <span>{t(label)} <em>{pct(st[k])}</em></span>
      <input type="range" min={min} max={max} step={stepV} value={st[k]} onChange={(e) => onPatch({ [k]: Number(e.target.value) })} onDoubleClick={() => onPatch({ [k]: def })} />
    </label>
  )
  const q = st.corners ?? []
  const targets = TOOLS.filter((tool) => tool.id !== 'mockups' && tool.load && tool.accepts.includes('image'))

  return (
    <div className={styles.editor}>
      <header className={styles.editorBar}>
        <Button size="small" variant="ghost" onClick={() => onOpen(null)}>← {t('mockups.allMockups')}</Button>
        <span className={styles.selName}>{mockup.name}<small>{t(`mockups.cat.${mockup.cat}`)}</small></span>
        <Button size="small" variant="ghost" iconOnly onClick={() => step(-1)} title={t('mockups.prev')} aria-label={t('mockups.prev')}>‹</Button>
        <Button size="small" variant="ghost" iconOnly onClick={() => step(1)} title={t('mockups.next')} aria-label={t('mockups.next')}>›</Button>
        <Button size="small" variant="primary" onClick={() => void download()}>{busy ? t('mockups.downloading') : t('mockups.download')}</Button>
      </header>

      <div className={styles.editorBody}>
        <section ref={stage} className={styles.stage}>
          <div ref={wrap} className={styles.wrap} style={{ width: box.w, height: box.h }}>
            <canvas ref={canvas} className={styles.stageCanvas} />
            {adj && q.length === 4 && (
              <>
                <svg className={styles.quad} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                  <polygon points={q.map((p) => `${(p[0] * 100).toFixed(2)},${(p[1] * 100).toFixed(2)}`).join(' ')} />
                </svg>
                {q.map((p, i) => (
                  <button key={i} type="button" className={styles.handle} style={{ left: `${p[0] * 100}%`, top: `${p[1] * 100}%` }}
                    aria-label={t(CORNER_KEYS[i] as MessageKey)} title={t(CORNER_KEYS[i] as MessageKey)} onPointerDown={(e) => dragCorner(e, i)} />
                ))}
              </>
            )}
          </div>
          {dragOver && <div className={styles.dropOverlay}>{t('mockups.dropDesign')}</div>}
        </section>

        <aside className={styles.panel}>
          <h2 className={styles.section}>{t('mockups.section.design')}</h2>
          <p className={styles.designName}>{design ? design.name : t('mockups.noDesign')}</p>
          <div className={styles.row}>
            <Button size="small" onClick={onUpload}>{design ? t('mockups.replace') : t('mockups.upload')}</Button>
            <Button size="small" variant="ghost" onClick={onPick}>{t('mockups.fromMedia')}</Button>
          </div>

          <h2 className={styles.section}>{t('mockups.section.placement')}</h2>
          <div className={styles.segmented} role="group">
            {(['cover', 'contain'] as const).map((f) => (
              <button key={f} type="button" aria-pressed={st.fit === f} onClick={() => onPatch({ fit: f })}>{t(`mockups.fit.${f}`)}</button>
            ))}
          </div>
          {range('mockups.zoom', 'zoom', 0.5, 3, 0.01, 1)}
          {range('mockups.offsetX', 'ox', -0.5, 0.5, 0.005, 0)}
          {range('mockups.offsetY', 'oy', -0.5, 0.5, 0.005, 0)}
          <label className={styles.color}>
            {t('mockups.background')}
            <input type="color" value={st.bg} onChange={(e) => onPatch({ bg: e.target.value })} />
          </label>

          <h2 className={styles.section}>{t('mockups.section.realism')}</h2>
          {range('mockups.shade', 'shade', 0, 1, 0.01, 0.6)}
          {range('mockups.gloss', 'gloss', 0, 1, 0.01, 0.35)}
          {mockup.occl !== false && (
            <button type="button" role="switch" aria-checked={st.occl !== false} className={styles.switch} onClick={() => onPatch({ occl: st.occl === false })}>
              {t('mockups.occl')}<i aria-hidden="true" />
            </button>
          )}

          <h2 className={styles.section}>{t('mockups.section.screen')}</h2>
          <Button size="small" variant={adj ? 'primary' : 'default'} onClick={() => setAdj((v) => !v)}>{adj ? t('mockups.adjustDone') : t('mockups.adjust')}</Button>
          {adj && <p className={styles.hint}>{t('mockups.adjustHint')}</p>}
          <div className={styles.row}>
            <Button size="small" variant="ghost" onClick={() => {
              const d = image ? (() => { try { return detect(image) } catch { return null } })() : null
              if (d) {
                onPatch({ corners: d })
                onToast(t('mockups.toast.found'))
              } else onToast(t('mockups.toast.notFound'))
            }}>{t('mockups.detect')}</Button>
            <Button size="small" variant="ghost" onClick={() => onPatch({ corners: null })}>{t('mockups.reset')}</Button>
          </div>

          <h2 className={styles.section}>{t('mockups.section.export')}</h2>
          <div className={styles.row}>
            <div className={styles.segmented} role="group">
              {(['png', 'jpg'] as const).map((f) => (
                <button key={f} type="button" aria-pressed={fmt === f} onClick={() => setFmt(f)}>{f.toUpperCase()}</button>
              ))}
            </div>
            <span className={styles.hint}>{image ? `${image.naturalWidth} × ${image.naturalHeight} px` : ''}</span>
          </div>
          <Button variant="primary" block onClick={() => void download()}>{busy ? t('mockups.downloading') : t('mockups.download')}</Button>
          <div className={styles.row}>
            <Button size="small" onClick={() => void copy()}>{t('mockups.copy')}</Button>
            <Button size="small" onClick={() => void saveToMedia()}>{t('mockups.saveMedia')}</Button>
            {targets.map((tool) => (
              <Button key={tool.id} size="small" onClick={() => void saveToMedia().then((id) => id && router.navigate({ name: 'tool', tool: tool.id, query: { asset: id } }))}>
                {t('mockups.useIn', { tool: t(toolTitleKey(tool.id)) })}
              </Button>
            ))}
          </div>
          <p className={styles.hint}>{t('mockups.keysHint')}</p>
        </aside>
      </div>
    </div>
  )
}
