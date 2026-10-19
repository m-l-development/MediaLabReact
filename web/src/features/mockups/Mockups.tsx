import { useEffect, useRef, useState, type CSSProperties, type DragEvent, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'
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
import { CloudPicker } from '../cloud-picker/CloudPicker'
import type { MockupCategory, MockupEntry } from './engine/catalog'
import { aspectOf, clamp, inQuad, project, type Point, type Quad } from './engine/geometry'
import { clampPlacement, defaultPlacement, drawLogo, heightOf, readLogo, resizeFrom, type Logo, type LogoPlacement } from './engine/logo'
import { centroid, clampOffset, designBox, imageCorners, moveSide, patchFreeform, sideDrag, projectQuad, scaleQuad, sideMid, snapMove, snapPoint, snapScale, toImage, translateQuad, unproject, ZOOM_MAX, ZOOM_MIN, type Guide } from './engine/place'
import { DEFAULT_SETTINGS, detect, render, validQuad, warp, type MockupSettings } from './engine/render'
import styles from './Mockups.module.css'
import { useMockupLibrary } from './useMockupLibrary'

const CATS: readonly ('all' | MockupCategory)[] = ['all', 'phone', 'laptop', 'screen', 'print', 'other', 'collab']
/** Små linjeikoner for retning (samme strekstil som ikonene ellers i appen). */
const ROT_ICONS = {
  left: 'M4 4v5h5M4.6 9A8 8 0 1 1 6 17',
  right: 'M20 4v5h-5M19.4 9A8 8 0 1 0 18 17',
  flipH: 'M12 3v18M8 7l-5 5 5 5zM16 7l5 5-5 5z',
  flipV: 'M3 12h18M7 8l5-5 5 5zM7 16l5 5 5-5z',
} as const
function RotIcon({ d }: { d: keyof typeof ROT_ICONS }) {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={ROT_ICONS[d]} /></svg>
}
const norm = (v: number) => ((Math.round(v) % 360) + 360) % 360

/** Objektets midtlinjer (vises svakt mens designet dras). */
const MID_GUIDES: readonly Guide[] = [{ axis: 'u', at: 0.5 }, { axis: 'v', at: 0.5 }]

/**
 * Tallet ved en slider: klikk for å skrive inn verdien (Enter eller klikk utenfor lagrer, Esc avbryter).
 * Vises i prosent (scale 100) eller grader (scale 1, unit «°»); verdien holdes innenfor sliderens grenser.
 */
function NumEdit({ value, min, max, onCommit, label, unit = ' %', scale = 100, disabled = false }: { value: number; min: number; max: number; onCommit: (v: number) => void; label: string; unit?: string; scale?: number; disabled?: boolean }) {
  const [text, setText] = useState<string | null>(null)
  const shown = Math.round(value * scale)
  const commit = () => {
    if (text === null) return
    const n = Number(text.replace(',', '.').replace(/[^\d.-]/g, ''))
    setText(null)
    if (text.trim() !== '' && Number.isFinite(n)) onCommit(Math.min(max, Math.max(min, n / scale)))
  }
  if (text !== null) {
    return (
      <input className={styles.numEdit} type="text" inputMode="decimal" autoFocus aria-label={label} value={text}
        onChange={(e) => setText(e.target.value)} onBlur={commit} onFocus={(e) => e.currentTarget.select()}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit() } else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setText(null) } }} />
    )
  }
  return (
    <button type="button" className={styles.numBtn} disabled={disabled} title={label} aria-label={label + ': ' + shown + unit.trim()}
      onClick={(e) => { e.preventDefault(); setText(String(shown)) }}>{shown}{unit}</button>
  )
}

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
  const { router, files } = useServices()
  const { assets, userId } = useWorkspace()
  const lib = useMockupLibrary()
  const [cat, setCat] = useState<'all' | MockupCategory>('all')
  const [design, setDesign] = useState<Design | null>(null)
  const [all, setAll] = useState<Record<string, Partial<MockupSettings>>>(() => readMockupSettings(userId) as Record<string, Partial<MockupSettings>>)
  const [toast, setToast] = useState<string | null>(null)
  const [picking, setPicking] = useState(false)
  const [logo, setLogo] = useState<Logo | null>(null)
  const [pickingLogo, setPickingLogo] = useState(false)
  const logoInput = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const ownInput = useRef<HTMLInputElement>(null)
  const selId = query.mockup ?? null

  useEffect(() => {
    registerLifecycle({ dispose: () => undefined })
  }, [registerLifecycle])

  /* ---------- Angre: øyeblikksbilder av innstillinger, design og logo ---------- */
  // Én fullført draging (design, logo, skjermhjørner, slider) er ett steg; hver annen endring (knapp, skrevet tall,
  // piltast) er ett steg. Steget lagres først når noe faktisk endres. Design og logo som kan hentes tilbake, beholder
  // sin object-URL til de faller ut av historikken.
  const hist = useRef<Snap[]>([])
  const [histN, setHistN] = useState(0)
  const gesture = useRef<'off' | 'pending' | 'saved'>('off')
  const cur = useRef<Snap>({ all, design, logo })
  useEffect(() => { cur.current = { all, design, logo } })
  const inHist = (url: string) => hist.current.some((h) => h.design?.url === url || h.logo?.url === url)
  function release(s: Snap) {
    for (const u of [s.design?.url, s.logo?.url]) {
      if (u && !inHist(u) && u !== cur.current.design?.url && u !== cur.current.logo?.url) URL.revokeObjectURL(u)
    }
  }
  function checkpoint() {
    hist.current.push({ ...cur.current })
    if (hist.current.length > 40) release(hist.current.shift() as Snap)
    setHistN(hist.current.length)
  }
  function undo() {
    const s = hist.current.pop()
    if (!s) return
    gesture.current = 'off'
    setAll(s.all)
    writeMockupSettings(userId, s.all)
    setDesign(s.design)
    setLogo(s.logo)
    setHistN(hist.current.length)
    setToast(t('mockups.undone'))
  }
  const beginGesture = () => { gesture.current = 'pending' }
  const endGesture = () => { gesture.current = 'off' }
  // fjerning med Backspace/Delete og knappene «Fjern»: kan angres
  function removeDesign() { if (!cur.current.design) return; checkpoint(); setDesign(null) }
  function removeLogo() { if (!cur.current.logo) return; checkpoint(); setLogo(null) }

  // Frigjør designets og logoens object-URL når de byttes eller verktøyet lukkes – men ikke mens de kan hentes tilbake.
  const designUrl = design?.url
  useEffect(() => () => {
    if (designUrl && !inHist(designUrl)) URL.revokeObjectURL(designUrl)
  // eslint-disable-next-line react-hooks/exhaustive-deps -- inHist leser bare historikken (ref)
  }, [designUrl])
  const logoUrl = logo?.url
  useEffect(() => () => {
    if (logoUrl && !inHist(logoUrl)) URL.revokeObjectURL(logoUrl)
  // eslint-disable-next-line react-hooks/exhaustive-deps -- inHist leser bare historikken (ref)
  }, [logoUrl])
  useEffect(() => () => {
    for (const s of hist.current) for (const u of [s.design?.url, s.logo?.url]) if (u) URL.revokeObjectURL(u)
  }, [])

  function applyLogo(blob: Blob, name: string, ref: string | null) {
    void readLogo(blob, name, ref).then((r) => {
      if (!r.ok) return setToast(t(r.error === 'type' ? 'mockups.logo.bad' : r.error === 'size' ? 'mockups.logo.tooBig' : 'mockups.logo.unreadable'))
      checkpoint()
      setLogo(r.logo)
      setToast(t('mockups.logo.added'))
    })
  }

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 2600)
    return () => clearTimeout(id)
  }, [toast])

  function applyDesign(blob: Blob, name: string, assetId: AssetId | null) {
    void readDesign(blob, name, assetId).then((r) => {
      if (!r.ok) return setToast(t(r.error))
      checkpoint()
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
    // innenfor en gest lagres bare tilstanden før første endring
    if (gesture.current !== 'saved') checkpoint()
    if (gesture.current === 'pending') gesture.current = 'saved'
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
      <input ref={logoInput} type="file" hidden accept="image/svg+xml,.svg,image/png,image/webp,image/jpeg,image/gif" data-mk-logo-input="" onChange={(e) => {
        const f = e.currentTarget.files?.[0]
        e.currentTarget.value = ''
        if (f) applyLogo(f, f.name, null)
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
          onClearDesign={removeDesign}
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
          logo={logo}
          onLogoUpload={() => logoInput.current?.click()}
          onLogoCloud={files.available() ? () => setPickingLogo(true) : null}
          onLogoRemove={removeLogo}
          onClearDesign={removeDesign}
          canUndo={histN > 0}
          onUndo={undo}
          onGesture={(on) => (on ? beginGesture() : endGesture())}
        />
      )}

      {toast && <div className={styles.toast} role="status">{toast}</div>}
      {pickingLogo && (
        <CloudPicker title="cloud.pickLogo" start="ressurser" onClose={() => setPickingLogo(false)}
          onPick={(p) => { setPickingLogo(false); applyLogo(p.blob, p.name, p.ref) }} />
      )}
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
      <h1 className={styles.title} data-ml-title="">{t('tool.mockups.title')}</h1>
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

interface Snap { all: Record<string, Partial<MockupSettings>>; design: Design | null; logo: Logo | null }

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
  logo: Logo | null
  onLogoUpload: () => void
  /** null når menighetens filer ikke er tilgjengelige (uten innlogging/menighet). */
  onLogoCloud: (() => void) | null
  onLogoRemove: () => void
  onClearDesign: () => void
  canUndo: boolean
  onUndo: () => void
  /** Start (true) og slutt (false) på en draging: alt i mellom blir ett angresteg. */
  onGesture: (on: boolean) => void
}

function Editor({ mockup, list, image, design, settings: st, onPatch, onOpen, onUpload, onPick, onToast, onDesignAsset, dragOver, logo, onLogoUpload, onLogoCloud, onLogoRemove, onClearDesign, canUndo, onUndo, onGesture }: EditorProps) {
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
  const [logoSel, setLogoSel] = useState(false)
  // «Flytt og skaler design»: redigeringsmodus (knapp eller dobbeltklikk), valgt design og visning av hele designet
  const [edit, setEdit] = useState<null | 'button' | 'dbl'>(null)
  const [full, setFull] = useState(false)
  const [designSel, setDesignSel] = useState(false)
  const [guides, setGuides] = useState<Guide[]>([])
  const overlay = useRef<HTMLCanvasElement>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const imgAspect = image ? image.naturalWidth / image.naturalHeight : 1
  // plasseringen lagres per mockup (andeler av bildet); uten lagret plassering: øvre høyre hjørne, 5 % fra kantene
  // (lagret plassering fra en logo med andre proporsjoner holdes innenfor bildet)
  const lp: LogoPlacement | null = logo ? clampPlacement(st.logo ?? defaultPlacement(logo.aspect, imgAspect), logo.aspect, imgAspect) : null

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
      // angre: Ctrl/Cmd + Z (ikke mens man skriver i et felt)
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        onUndo()
        return
      }
      if (el?.closest('[data-mk-logo]')) return // piltastene flytter logoen når den har fokus (Backspace håndteres der)
      // Backspace/Delete fjerner det valgte objektet (ikke når en slider har fokus)
      if ((e.key === 'Backspace' || e.key === 'Delete') && (el as HTMLInputElement | null)?.type !== 'range') {
        if (designSel && design) {
          e.preventDefault()
          endEdit()
          onClearDesign()
        }
        return
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        step(-1)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        step(1)
      } else if (e.key === 'Escape') {
        if (logoSel) setLogoSel(false)
        else if (edit) endEdit()
        else if (adj) setAdj(false)
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

  // logoen tegnes ikke på lerretet, så flytting av den skal ikke tegne mockupen på nytt
  const settingsKey = JSON.stringify({ ...st, logo: undefined })
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
    // logoen tegnes til slutt, i full oppløsning (SVG gjengis først her); håndtak og markering er aldri med
    if (logo && lp) await drawLogo(g, W, H, logo, lp)
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
    onGesture(true)
    const move = (ev: PointerEvent) => {
      const q = base.map((p) => [...p]) as Quad
      q[i as 0 | 1 | 2 | 3] = [clamp((ev.clientX - r.left) / r.width, 0, 1), clamp((ev.clientY - r.top) / r.height, 0, 1)]
      onPatch({ corners: q })
    }
    const up = () => {
      onGesture(false)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      setDragging(false)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }

  /** Flytter logoen (hele flaten) eller skalerer proporsjonalt fra et hjørne. Koordinater som andeler av bildet. */
  function dragLogo(e: ReactPointerEvent, corner: number | null) {
    if (!logo || !lp || e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    setLogoSel(true)
    const el = wrap.current
    if (!el) return
    ;(e.currentTarget as HTMLElement).closest<HTMLElement>('[data-mk-logo]')?.focus({ preventScroll: true })
    const r = el.getBoundingClientRect()
    const start = { ...lp }, sx = e.clientX, sy = e.clientY
    onGesture(true)
    const move = (ev: PointerEvent) => {
      const next = corner === null
        ? { ...start, x: start.x + (ev.clientX - sx) / r.width, y: start.y + (ev.clientY - sy) / r.height }
        : resizeFrom(start, corner, (ev.clientX - r.left) / r.width, (ev.clientY - r.top) / r.height, logo.aspect, imgAspect)
      onPatch({ logo: clampPlacement(next, logo.aspect, imgAspect) })
    }
    const up = () => {
      onGesture(false)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }

  function nudgeLogo(e: ReactKeyboardEvent) {
    if (!logo || !lp) return
    const d = e.shiftKey ? 0.02 : 0.005
    const k: Record<string, [number, number]> = { ArrowLeft: [-d, 0], ArrowRight: [d, 0], ArrowUp: [0, -d], ArrowDown: [0, d] }
    const v = k[e.key]
    if (v) {
      e.preventDefault()
      setLogoSel(true)
      onPatch({ logo: clampPlacement({ ...lp, x: lp.x + v[0], y: lp.y + v[1] }, logo.aspect, imgAspect) })
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setLogoSel(false)
      ;(e.currentTarget as HTMLElement).blur()
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      // fjern den valgte logoen (kan angres)
      e.preventDefault()
      setLogoSel(false)
      onLogoRemove()
    }
  }

  /* ---------- Flytt og skaler design ---------- */
  // samme hjørner og forhold som render(): designet ligger i flaten (u, v) og sendes til bildet med homografien
  const qn = (st.corners ?? mockup.corners) as Quad | null
  const flatAspect = qn && image ? mockup.aspect ?? aspectOf(qn.map((p) => [p[0] * image.naturalWidth, p[1] * image.naturalHeight] as Point)) : 1
  const H = qn ? toImage(qn) : null
  const dw = design?.img.naturalWidth ?? 1, dh = design?.img.naturalHeight ?? 1
  // designbildets fire hjørner i flaten (fritt formet dq, eller vanlig plassering med rotasjon og speiling)
  const iq: Quad | null = design && H ? imageCorners(validQuad(st.dq) ? st : { ...st, dq: null }, dw, dh, flatAspect) : null
  const dQuad = iq && H ? projectQuad(H, iq) : null
  const editing = !!edit && !!iq && !adj

  /** Endringer fra glidere og knapper: når designet er fritt formet, anvendes de på hjørnene (formen beholdes). */
  function patchDesign(p: Partial<MockupSettings>) {
    onPatch(validQuad(st.dq) ? patchFreeform(st, p, flatAspect) : p)
  }

  function endEdit() {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setDesignSel(false)
    setFull(false)
    setEdit(null)
  }
  // vanlig klikk utenfor designet: fjern markeringen; i visningen av hele designet (dobbeltklikk) avsluttes redigeringen
  // – litt forsinket, så et dobbeltklikk ikke først lukker og så åpner
  function clickOutside() {
    setDesignSel(false)
    if (!full) return
    if (closeTimer.current) clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => {
      setFull(false)
      setEdit((e) => (e === 'dbl' ? null : e))
    }, 260)
  }
  function openFull() {
    if (!design || adj || !H) return
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setEdit((e) => e ?? 'dbl')
    setFull(true)
    setDesignSel(true)
  }
  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current) }, [])

  const uvAt = (ev: { clientX: number; clientY: number }): Point | null => {
    const el = wrap.current
    if (!el || !H) return null
    const r = el.getBoundingClientRect()
    return unproject(H, (ev.clientX - r.left) / r.width, (ev.clientY - r.top) / r.height)
  }
  /** Terskel for magnetisk justering: ca. 7 skjermpiksler, regnet om til flatens enheter (u og v hver for seg). */
  const snapTol = (): [number, number] => {
    if (!H) return [0.01, 0.01]
    const d = (a: Point, b: Point) => Math.hypot((a[0] - b[0]) * box.w, (a[1] - b[1]) * box.h)
    const wpx = d(project(H, 0, 0.5), project(H, 1, 0.5)), hpx = d(project(H, 0.5, 0), project(H, 0.5, 1))
    return [7 / Math.max(1, wpx), 7 / Math.max(1, hpx)]
  }

  /**
   * Draging i designet:
   * - flaten: flytt hele designet (med eller uten Shift – alltid samme flytting);
   * - hjørne uten Shift: proporsjonal skalering rundt midtpunktet;
   * - side uten Shift: flytt siden utover/innover (vinkelrett i flaten) – motsatt side står i ro;
   * - Shift + hjørne: flytt hjørnet fritt (perspektiv); Shift + side: flytt hele siden fritt.
   * Magnetisk mot objektets kanter og midtlinjer (Alt slår det av). Koordinatene er flatens, så det følger pekeren.
   */
  function dragDesign(e: ReactPointerEvent, h: null | { k: 'c' | 's'; i: number }) {
    if (!iq || e.button !== 0) return
    const p0 = uvAt(e)
    if (!p0) return
    if (h === null && !inQuad(iq, p0[0], p0[1])) {
      clickOutside()
      return
    }
    e.preventDefault()
    e.stopPropagation()
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setDesignSel(true)
    const free = !!h && e.shiftKey
    const q0 = iq.map((p) => [p[0], p[1]] as Point) as Quad
    const isFree = validQuad(st.dq)
    const st0 = { ox: st.ox, oy: st.oy, zoom: st.zoom }
    const box0 = designBox(st, dw, dh, flatAspect)
    const [c0u, c0v] = centroid(q0)
    const grab: Point = h ? (h.k === 'c' ? q0[h.i]! : sideMid(q0, h.i)) : p0
    const d0 = Math.hypot((grab[0] - c0u) * flatAspect, grab[1] - c0v)
    let moved = false
    onGesture(true)
    const move = (ev: PointerEvent) => {
      const p = uvAt(ev)
      if (!p) return
      if (!moved) { moved = true; setDragging(true) }
      const [tu, tv] = ev.altKey ? [0, 0] : snapTol()
      const du = p[0] - p0[0], dv = p[1] - p0[1]
      if (!h) {
        // flytt
        const sn = snapMove(q0, du, dv, tu, tv)
        setGuides(sn.guides)
        if (isFree) onPatch({ dq: translateQuad(q0, sn.du, sn.dv) })
        else onPatch(clampOffset(box0, st0.ox + sn.du, st0.oy + sn.dv))
      } else if (!free && h.k === 's') {
        // siden flyttes langs sin normal; de to hjørnene følger med, motsatt side står i ro; ugyldige former avvises
        const sd = sideDrag(q0, h.i, du, dv, flatAspect, tu, tv)
        setGuides(sd.guides)
        const q = moveSide(q0, h.i, sd.t, flatAspect)
        if (validQuad(q)) onPatch({ dq: q })
      } else if (!free) {
        // proporsjonal skalering rundt midtpunktet
        const d1 = Math.hypot((grab[0] + du - c0u) * flatAspect, grab[1] + dv - c0v)
        let f = d0 > 1e-6 ? d1 / d0 : 1
        f = Math.min(Math.max(f, ZOOM_MIN / Math.max(st0.zoom, 0.01)), ZOOM_MAX / Math.max(st0.zoom, 0.01))
        const sn = snapScale(q0, f, tu, tv)
        setGuides(sn.guides)
        if (isFree) onPatch({ dq: scaleQuad(q0, sn.f) })
        else onPatch({ zoom: Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, st0.zoom * sn.f)) })
      } else {
        // fritt hjørne eller side (perspektiv); ugyldige former (kryssende/innbuktet) avvises
        const sp = snapPoint(grab[0] + du, grab[1] + dv, tu, tv)
        setGuides(sp.guides)
        const mu = sp.u - grab[0], mv = sp.v - grab[1]
        const q = q0.map((pt) => [pt[0], pt[1]] as Point) as Quad
        const idx = h.k === 'c' ? [h.i] : [h.i, (h.i + 1) % 4]
        for (const j of idx) q[j] = [q0[j]![0] + mu, q0[j]![1] + mv]
        if (validQuad(q)) onPatch({ dq: q })
      }
    }
    const up = () => {
      onGesture(false)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      setDragging(false)
      setGuides([])
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }

  /** Hjelpelinje i flaten, projisert til bildet (rett linje også i perspektiv). */
  const guideLine = (g: Guide): [Point, Point] | null => {
    if (!H) return null
    const a: Point = g.axis === 'u' ? [g.at, -0.15] : [-0.15, g.at], b: Point = g.axis === 'u' ? [g.at, 1.15] : [1.15, g.at]
    return [project(H, a[0], a[1]), project(H, b[0], b[1])]
  }
  const pts = (q: readonly Point[]) => q.map((p) => `${(p[0] * 100).toFixed(2)},${(p[1] * 100).toFixed(2)}`).join(' ')

  // hele designet (også utenfor objektet) som halvgjennomsiktig lag, med samme perspektiv; bare i redigeringen.
  // Designbildets egne hjørner projiseres til fotoet, så rotasjon, speiling og fri form følger med av seg selv.
  const fullKey = full && iq ? JSON.stringify([iq, qn, box]) : ''
  useEffect(() => {
    const c = overlay.current
    if (!c) return
    const g = c.getContext('2d')
    if (!g) return
    const W = Math.max(2, Math.round(box.w)), Hh = Math.max(2, Math.round(box.h))
    if (c.width !== W || c.height !== Hh) { c.width = W; c.height = Hh }
    g.clearRect(0, 0, W, Hh)
    if (!fullKey || !iq || !H || !design || !qn) return
    const k = Math.min(1, 1600 / Math.max(dw, dh))
    const bc = document.createElement('canvas')
    bc.width = Math.max(2, Math.round(dw * k))
    bc.height = Math.max(2, Math.round(dh * k))
    const bg = bc.getContext('2d')
    if (!bg) return
    bg.imageSmoothingQuality = 'high'
    bg.drawImage(design.img, 0, 0, bc.width, bc.height)
    g.save()
    g.globalAlpha = 0.5
    warp(g, bc, projectQuad(H, iq).map(([x, y]) => [x * W, y * Hh]) as Quad, 18)
    g.restore()
    // innenfor objektet vises den vanlige mockupen (klippet og med masker) – ikke dobbelt
    g.save()
    g.globalCompositeOperation = 'destination-out'
    g.beginPath()
    qn.forEach(([x, y], i) => (i ? g.lineTo(x * W, y * Hh) : g.moveTo(x * W, y * Hh)))
    g.closePath()
    g.fill()
    g.restore()
  // eslint-disable-next-line react-hooks/exhaustive-deps -- fullKey samler alt som påvirker tegningen
  }, [fullKey, design])

  const range = (label: MessageKey, k: 'zoom' | 'ox' | 'oy' | 'shade' | 'gloss', min: number, max: number, stepV: number, def: number) => (
    <div key={k} className={styles.range}>
      <span>{t(label)} <NumEdit value={st[k]} min={min} max={max} label={t(label)} onCommit={(v) => (k === 'zoom' || k === 'ox' || k === 'oy' ? patchDesign : onPatch)({ [k]: v })} /></span>
      <input type="range" aria-label={t(label)} min={min} max={max} step={stepV} value={st[k]} onPointerDown={() => onGesture(true)} onPointerUp={() => onGesture(false)} onPointerCancel={() => onGesture(false)} onChange={(e) => (k === 'zoom' || k === 'ox' || k === 'oy' ? patchDesign : onPatch)({ [k]: Number(e.target.value) })} onDoubleClick={() => (k === 'zoom' || k === 'ox' || k === 'oy' ? patchDesign : onPatch)({ [k]: def })} />
    </div>
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
        <Button size="small" variant="ghost" iconOnly disabled={!canUndo} onClick={onUndo} title={t('mockups.undo')} aria-label={t('mockups.undo')} data-mk-undo="">↶</Button>
        <Button size="small" variant="primary" onClick={() => void download()}>{busy ? t('mockups.downloading') : t('mockups.download')}</Button>
      </header>

      <div className={styles.editorBody}>
        <section ref={stage} className={styles.stage} data-mk-full={full || undefined}
          onPointerDown={(e) => {
            const el = e.target as HTMLElement
            if (!el.closest('[data-mk-logo]')) setLogoSel(false)
            // klikk på bakgrunnen utenfor mockupen: samme som klikk utenfor designet
            if (editing && !el.closest('[data-mk-wrap]')) clickOutside()
          }}>
          <div ref={wrap} className={styles.wrap} data-mk-wrap="" style={{ width: box.w, height: box.h }} onDoubleClick={(e) => { if (!(e.target as HTMLElement).closest('[data-mk-logo]')) openFull() }}>
            <canvas ref={canvas} className={styles.stageCanvas} />
            <canvas ref={overlay} className={styles.fullLayer} aria-hidden="true" />
            {editing && dQuad && iq && H && (
              <div className={styles.designLayer} data-mk-design="" onPointerDown={(e) => dragDesign(e, null)}>
                <svg className={styles.designFrame} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                  {full && qn && <polygon className={styles.objectEdge} points={pts(qn)} />}
                  {/* objektets midtlinjer mens det dras (rettesnor); hjelpelinjene vises bare når noe flukter */}
                  {dragging && MID_GUIDES.map((g) => { const l = guideLine(g); return l && <line key={`m${g.axis}`} className={styles.midLine} x1={l[0][0] * 100} y1={l[0][1] * 100} x2={l[1][0] * 100} y2={l[1][1] * 100} /> })}
                  {guides.map((g) => { const l = guideLine(g); return l && <line key={`${g.axis}${g.at}`} className={styles.guide} data-mk-guide={`${g.axis}${g.at}`} x1={l[0][0] * 100} y1={l[0][1] * 100} x2={l[1][0] * 100} y2={l[1][1] * 100} /> })}
                  <polygon data-selected={designSel || undefined} points={pts(dQuad)} />
                  {/* designets egne midtlinjer (rette linjer i designet) mens det dras */}
                  {dragging && [0, 1].map((i) => { const a = sideMid(iq, i + 2), b = sideMid(iq, i), pa = project(H, a[0], a[1]), pb = project(H, b[0], b[1]); return <line key={`d${i}`} className={styles.designMid} x1={pa[0] * 100} y1={pa[1] * 100} x2={pb[0] * 100} y2={pb[1] * 100} /> })}
                </svg>
                {designSel && dQuad.map((p, i) => (
                  <span key={`c${i}`} className={styles.designHandle} data-c={i} style={{ left: `${p[0] * 100}%`, top: `${p[1] * 100}%` }}
                    title={t('mockups.place.corner')} onPointerDown={(e) => dragDesign(e, { k: 'c', i })} />
                ))}
                {designSel && [0, 1, 2, 3].map((i) => { const a = sideMid(iq, i), m = project(H, a[0], a[1]); return (
                  <span key={`s${i}`} className={styles.designHandle} data-s={i} style={{ left: `${m[0] * 100}%`, top: `${m[1] * 100}%` }}
                    title={t('mockups.place.side')} onPointerDown={(e) => dragDesign(e, { k: 's', i })} />
                ) })}
              </div>
            )}
            {logo && lp && (
              <div data-mk-logo="" className={styles.logo} data-selected={logoSel || undefined} tabIndex={0} role="group" aria-label={t('mockups.logo.label')}
                style={{ left: `${lp.x * 100}%`, top: `${lp.y * 100}%`, width: `${lp.w * 100}%`, height: `${heightOf(lp, logo.aspect, imgAspect) * 100}%` }}
                onPointerDown={(e) => dragLogo(e, null)} onKeyDown={nudgeLogo} onFocus={() => setLogoSel(true)}>
                {/* SVG vises som vektor av nettleseren (ingen omgjøring til bitmap under redigeringen) */}
                <img src={logo.url} alt="" draggable={false} />
                {logoSel && [0, 1, 2, 3].map((i) => (
                  <span key={i} className={styles.logoHandle} data-c={i} title={t('mockups.logo.corner')} onPointerDown={(e) => dragLogo(e, i)} />
                ))}
              </div>
            )}
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

          <h2 className={styles.section}>{t('mockups.section.logo')}</h2>
          {logo ? (
            <div className={styles.logoRow}>
              <span className={styles.logoThumb}><img src={logo.url} alt="" /></span>
              <span className={styles.designName}>{logo.name}{logo.svg !== null ? ' · SVG' : ''}</span>
            </div>
          ) : <p className={styles.designName}>{t('mockups.logo.none')}</p>}
          <div className={styles.row}>
            <Button size="small" onClick={onLogoUpload}>{logo ? t('mockups.logo.replace') : t('mockups.logo.add')}</Button>
            {onLogoCloud && <Button size="small" variant="ghost" onClick={onLogoCloud}>{t('mockups.logo.fromCloud')}</Button>}
            {logo && <Button size="small" variant="ghost" onClick={() => { onLogoRemove(); setLogoSel(false) }}>{t('mockups.logo.remove')}</Button>}
          </div>
          {logo && <p className={styles.hint}>{t('mockups.logo.hint')}</p>}

          <h2 className={styles.section}>{t('mockups.section.placement')}</h2>
          <div className={styles.segmented} role="group">
            {(['cover', 'contain'] as const).map((f) => (
              <button key={f} type="button" aria-pressed={st.fit === f} onClick={() => patchDesign({ fit: f })}>{t(`mockups.fit.${f}`)}</button>
            ))}
          </div>
          <div className={styles.row} role="group" aria-label={t('mockups.orient.group')}>
            {([
              ['left', 'mockups.orient.left', () => patchDesign({ rot: norm(st.rot - 90) })],
              ['right', 'mockups.orient.right', () => patchDesign({ rot: norm(st.rot + 90) })],
              // speilingen er i bildets egne akser; står bildet på siden (≈90°/270°), byttes aksen så «vannrett» er vannrett på skjermen
              ['flipH', 'mockups.orient.flipH', () => (Math.round(norm(st.rot) / 90) % 2 ? patchDesign({ flipY: !st.flipY }) : patchDesign({ flipX: !st.flipX }))],
              ['flipV', 'mockups.orient.flipV', () => (Math.round(norm(st.rot) / 90) % 2 ? patchDesign({ flipX: !st.flipX }) : patchDesign({ flipY: !st.flipY }))],
            ] as const).map(([icon, label, act]) => (
              <Button key={icon} size="small" variant="ghost" iconOnly disabled={!design} title={t(label)} aria-label={t(label)} onClick={act}><RotIcon d={icon} /></Button>
            ))}
            <Button size="small" variant="ghost" disabled={!design || (!st.rot && !st.flipX && !st.flipY)} onClick={() => patchDesign({ rot: 0, flipX: false, flipY: false })}>{t('mockups.orient.reset')}</Button>
          </div>
          <div className={styles.range}>
            <span>{t('mockups.orient.angle')} <NumEdit value={norm(st.rot)} min={0} max={359} unit="°" scale={1} label={t('mockups.orient.angle')} disabled={!design} onCommit={(v) => patchDesign({ rot: norm(v) })} /></span>
            <input type="range" aria-label={t('mockups.orient.angle')} min={0} max={359} step={1} value={norm(st.rot)} disabled={!design} onPointerDown={() => onGesture(true)} onPointerUp={() => onGesture(false)} onPointerCancel={() => onGesture(false)} onChange={(e) => patchDesign({ rot: Number(e.target.value) })} onDoubleClick={() => patchDesign({ rot: 0 })} />
          </div>
          <div className={styles.row}>
            <Button size="small" variant={edit ? 'primary' : 'default'} disabled={!design} data-mk-design-edit=""
              onClick={() => { if (edit) endEdit(); else { setAdj(false); setEdit('button'); setDesignSel(true) } }}>
              {edit ? t('mockups.place.done') : t('mockups.place.edit')}
            </Button>
            <Button size="small" variant="ghost" disabled={!design || (st.zoom === 1 && !st.ox && !st.oy && !st.dq)} onClick={() => onPatch({ zoom: 1, ox: 0, oy: 0, dq: null })}>{t('mockups.place.reset')}</Button>
          </div>
          {edit && <p className={styles.hint}>{t('mockups.place.hint')}</p>}
          {range('mockups.zoom', 'zoom', ZOOM_MIN, ZOOM_MAX, 0.01, 1)}
          {range('mockups.offsetX', 'ox', -1.5, 1.5, 0.005, 0)}
          {range('mockups.offsetY', 'oy', -1.5, 1.5, 0.005, 0)}
          <label className={styles.color}>
            {t('mockups.background')}
            <input type="color" value={st.bg} onChange={(e) => onPatch({ bg: e.target.value })} />
          </label>

          <h2 className={styles.section}>{t('mockups.section.realism')}</h2>
          {/* skjermer som lyser selv (lit: false) får ikke lys fra fotoet – da har bryterne ingen virkning */}
          {mockup.lit !== false && range('mockups.shade', 'shade', 0, 1, 0.01, 0.6)}
          {mockup.lit !== false && range('mockups.gloss', 'gloss', 0, 1, 0.01, 0.35)}
          {mockup.occl !== false && (
            <button type="button" role="switch" aria-checked={st.occl !== false} className={styles.switch} onClick={() => onPatch({ occl: st.occl === false })}>
              {t('mockups.occl')}<i aria-hidden="true" />
            </button>
          )}

          <h2 className={styles.section}>{t('mockups.section.screen')}</h2>
          <Button size="small" variant={adj ? 'primary' : 'default'} onClick={() => { if (!adj) endEdit(); setAdj((v) => !v) }}>{adj ? t('mockups.adjustDone') : t('mockups.adjust')}</Button>
          {adj && <p className={styles.hint}>{t('mockups.adjustHint')}</p>}
          <div className={styles.row}>
            <Button size="small" variant="ghost" onClick={() => {
              const d = image ? (() => { try { return detect(image, mockup.inset) } catch { return null } })() : null
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
