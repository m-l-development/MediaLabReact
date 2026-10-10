import { useEffect, useRef, useState } from 'react'
import { useServices } from '../../app/services'
import type { ToolProps } from '../../app/tools'
import { useWorkspace } from '../../app/workspace-factory'
import type { AssetId } from '../../domain/ids'
import { SharedSetup } from '../../services/shared-setup'
import { useLang, useT } from '../../shared/i18n/i18n'
import { localStore } from '../../shared/lib/storage'
import { useStore } from '../../shared/lib/store'
import { fitUpload } from '../../shared/media/upload-fit'
import { CloudPicker } from '../cloud-picker/CloudPicker'
import { AssetPicker } from '../media-library/AssetPicker'
import { ThumbController, type AddTarget } from './controller'
import { ContextMenu, CropDialog, ExportDialog, LayoutDialog, NewDialog, SaveDialog } from './Dialogs'
import { Editor } from './Editor'
import { backup, restore } from './engine/backup'
import { Cutout } from './engine/cutout'
import { ImageCache } from './engine/images'
import { Renderer } from './engine/render'
import { importLegacyThumb } from './legacy'
import { CategoryView, Home } from './Pages'
import { ThumbRepo } from './repo'
import { tr, useTx, type Phrase, type Vars } from './texts'
import s from './ThumbnailStudio.module.css'

const IMAGE_TYPES = 'image/png,image/jpeg,image/webp,image/avif,image/gif,image/bmp'
const M_ID = (src: string) => src.slice(2) as AssetId

function download(b: Blob, name: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(b)
  a.download = name
  document.body.appendChild(a)
  a.click()
  setTimeout(() => {
    URL.revokeObjectURL(a.href)
    a.remove()
  }, 60000)
}

/** Thumbnail Studio (TS-01–TS-19): kategorier, maler, editor, eksport og sikkerhetskopi. */
export default function ThumbnailStudio({ query, registerLifecycle }: ToolProps) {
  const tx = useTx()
  const t = useT()
  const lang = useLang()
  const services = useServices()
  const { files, auth, churchSettings, router } = services
  const ws = useWorkspace()
  const { assets, projects, settings, userId } = ws
  const authState = useStore(auth.state)
  const me = authState.status === 'ready' ? authState.me : null
  const langRef = useRef(lang)
  useEffect(() => {
    langRef.current = lang
  }, [lang])

  const fileTarget = useRef<AddTarget>({ mode: 'add' })
  const fileInput = useRef<HTMLInputElement>(null)
  const [parts] = useState(() => {
    const images = new ImageCache(async (src) => {
      if (src.startsWith('m:')) return assets.open(M_ID(src)).catch(() => null)
      if (src.startsWith('ch:')) return files.blob(src.slice(3)).catch(() => null)
      return null
    })
    const renderer = new Renderer(images)
    const repo = new ThumbRepo(projects, settings)
    const cutout = new Cutout()
    const say = (p: Phrase, v?: Vars) => tr(langRef.current, p, v)
    let shared: SharedSetup<{ cats: unknown[] }> | null = null
    const c: ThumbController = new ThumbController({
      images, renderer, repo,
      pickFile(target) {
        fileTarget.current = target
        const f = fileInput.current
        if (f) {
          f.value = ''
          f.click()
        }
      },
      async putImage(file, name) {
        const a = await assets.register(file, { name })
        return `m:${a.id}`
      },
      async cutout(src, kind, onProgress) {
        const id = M_ID(src)
        const [a, blob] = await Promise.all([assets.get(id), assets.open(id)])
        const png = await cutout.run(blob, kind, onProgress)
        const d = await assets.derive(id, png, { name: 'cutout', params: { kind } }, 'thumbnail-studio', `${(a?.name ?? 'bilde').replace(/\.[^.]+$/, '')}-utklipp.png`)
        return `m:${d.id}`
      },
      get shared() {
        return shared
      },
      async shareImage(src) {
        const church = shared?.church
        if (!church) throw new Error('church')
        const blob = await assets.open(M_ID(src))
        const f = await files.upload(await fitUpload(blob, `Grunnoppsett${blob.type === 'image/png' ? '.png' : '.jpg'}`), { churchId: church.id, folder: 'bilder' })
        return `ch:${f.id}`
      },
      storage: { get: (k) => localStore.get(k), set: (k, v) => void localStore.set(k, v) },
      confirm: (p, v) => window.confirm(say(p, v)),
      prompt: (p, def) => window.prompt(say(p), def),
      t: say,
      onLocation: (loc, replace) => void router.navigate({ name: 'tool', tool: 'thumbnail-studio', query: { ...loc } }, { replace }),
    })
    const makeShared = (m: typeof me) => {
      if (!churchSettings.available() || shared) return
      shared = new SharedSetup<{ cats: unknown[] }>(churchSettings, m, 'thumbstudio:cats', {
        onRemote: (d) => c.applyShared(d, false),
        onStatus: (st) => {
          if (st.state !== 'saving' && st.state !== 'saved') c.flashRaw(t(st.text, st.fields ? { fields: st.fields } : undefined))
        },
      })
    }
    return { images, renderer, cutout, c, makeShared }
  })
  const { c, images, renderer } = parts
  const S = useStore(c.state)
  const restoreInput = useRef<HTMLInputElement>(null)

  // Oppstart: kategorier, maler, import fra dagens app og menighetens grunnoppsett
  const [loc] = useState(() => ({ ...(query.cat ? { cat: query.cat } : {}), ...(query.tpl ? { tpl: query.tpl } : {}), ...(query.base ? { base: query.base } : {}) }))
  const started = useRef(false)
  useEffect(() => {
    if (started.current) return
    started.current = true
    parts.makeShared(me)
    void c.init(loc, () => importLegacyThumb(userId, assets, new ThumbRepo(projects, settings), settings))
  }, [parts, c, loc, me, userId, assets, projects, settings])

  useEffect(() => {
    registerLifecycle({
      save: async () => {
        await c.saveForUpdate()
      },
      isBusy: () => !!c.s.ai || c.s.expBusy,
      dispose: () => {
        c.dispose()
        parts.cutout.dispose()
        images.dispose()
      },
    })
  }, [registerLifecycle, c, parts, images])

  // Nettleserens tilbake/fram mellom start, kategori og mal
  const qCat = query.cat
  const qTpl = query.tpl
  const qBase = query.base
  useEffect(() => {
    void c.followLocation({ ...(qCat ? { cat: qCat } : {}), ...(qTpl ? { tpl: qTpl } : {}), ...(qBase ? { base: qBase } : {}) })
  }, [c, qCat, qTpl, qBase])

  // «Åpne i Thumbnail Studio» fra Dine medier (?asset=…)
  const assetParam = query.asset
  useEffect(() => {
    if (!assetParam) return
    let live = true
    assets.open(assetParam as AssetId).then((b) => live && c.receive(b), () => undefined)
    return () => {
      live = false
    }
  }, [assetParam, assets, c])

  // Smal skjerm: enkel visning (bytte person, navn, tema og bakgrunn)
  useEffect(() => {
    const mq = window.matchMedia?.('(max-width: 760px)')
    if (!mq) return
    const on = () => c.ui({ narrow: mq.matches, sel: null, multi: [] })
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [c])

  // Varsle før siden lukkes med ulagrede endringer
  useEffect(() => {
    const before = (e: BeforeUnloadEvent) => {
      if (c.s.view === 'edit' && c.s.dirty) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', before)
    return () => window.removeEventListener('beforeunload', before)
  }, [c])

  // Tastatur (samme snarveier som dagens app) og innliming av bilder
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const st = c.s
      if (st.view !== 'edit') return
      const tg = e.target as HTMLElement | null
      const typing = !!tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.tagName === 'SELECT' || tg.isContentEditable)
      const mod = e.metaKey || e.ctrlKey
      const k = e.key
      if (mod && (k === 'z' || k === 'Z')) {
        if (typing) return
        e.preventDefault()
        if (e.shiftKey) c.redo()
        else c.undo()
        return
      }
      if (mod && k === 'y') {
        if (typing) return
        e.preventDefault()
        c.redo()
        return
      }
      if (st.cropId) {
        if (k === 'Escape') c.closeCrop(false)
        else if (k === 'Enter') {
          e.preventDefault()
          c.closeCrop(true)
        }
        return
      }
      if (typing || st.exp || st.save || st.newOpen || st.picker) return
      if (k === 'Escape' && (st.ctx || st.viewMenu || st.lcOpen)) {
        c.ui({ ctx: null, viewMenu: false, lcOpen: false, lcDraft: null })
        return
      }
      if (mod && !e.altKey && (k === 'c' || k === 'C' || k === 'x' || k === 'X')) {
        if (String(window.getSelection?.() ?? '')) return
        if (c.copyLayers(k === 'x' || k === 'X')) e.preventDefault()
        return
      }
      if (mod && !e.altKey && (k === 'v' || k === 'V')) {
        if (c.getClip().length) {
          e.preventDefault()
          c.pasteLayers(null)
        }
        return
      }
      const id = st.sel
      if (!id) return
      if (e.shiftKey && !mod && !e.altKey && /^[hHvV]$/.test(k)) {
        e.preventDefault()
        c.flipSel(k === 'V' || k === 'v' ? 'y' : 'x')
        return
      }
      const l = c.layer(id)
      if (!l) return
      const grp = st.multi.length > 1
      if (k === 'Delete' || k === 'Backspace') {
        e.preventDefault()
        if (grp) c.delGroup()
        else if (st.barSel === id && l.type === 'text' && l.bar) {
          c.setL(id, { bar: false })
          c.ui({ barSel: null })
        } else c.delLayer(id)
      } else if (k === 'Escape') c.ui({ sel: null, multi: [] })
      else if (mod && (k === 'd' || k === 'D')) {
        e.preventDefault()
        c.dupLayer(id)
      } else if (/^Arrow/.test(k) && !l.lock) {
        e.preventDefault()
        const step = e.shiftKey ? 10 : 1
        const dx = k === 'ArrowLeft' ? -step : k === 'ArrowRight' ? step : 0
        const dy = k === 'ArrowUp' ? -step : k === 'ArrowDown' ? step : 0
        if (grp) c.moveGroup(dx, dy)
        else c.setL(id, { x: l.x + dx, y: l.y + dy }, `nudge:${id}`)
      }
    }
    const paste = (e: ClipboardEvent) => {
      const tg = e.target as HTMLElement | null
      if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA')) return
      const file = [...(e.clipboardData?.items ?? [])].find((i) => i.type.startsWith('image/'))?.getAsFile()
      if (file) {
        e.preventDefault()
        c.receive(file)
      }
    }
    window.addEventListener('keydown', key)
    window.addEventListener('paste', paste)
    return () => {
      window.removeEventListener('keydown', key)
      window.removeEventListener('paste', paste)
    }
  }, [c])

  const pickFile = (target: AddTarget) => {
    c.openPicker('file', target)
  }

  async function doBackup() {
    if (c.s.backupBusy) return
    c.setBackupBusy(true)
    try {
      const b = await backup(c.s.cats, c.s.tpls, (src) => (src.startsWith('m:') ? assets.open(M_ID(src)) : Promise.resolve(null)))
      download(b, `thumbnail-studio-${new Date().toISOString().slice(0, 10)}.json`)
      c.flash('Sikkerhetskopien er lastet ned.')
    } catch {
      c.flash('Klarte ikke å lage sikkerhetskopien.')
    }
    c.setBackupBusy(false)
  }

  async function doRestore(f: File) {
    if (!window.confirm(tx('Gjenopprette fra filen? Kategoriene og malene i denne nettleseren blir erstattet.'))) return
    try {
      const r = await restore(f, async (blob, key) => {
        const a = await assets.register(blob, { name: `thumbnail-${key}` })
        return `m:${a.id}`
      })
      await c.replaceAll(r.cats, r.tpls)
      c.flash('Gjenopprettet: {cats} kategorier og {tpls} maler.', { cats: r.cats.length, tpls: r.tpls.length })
    } catch {
      c.flash('Filen kunne ikke leses. Velg en sikkerhetskopi fra Thumbnail Studio.')
    }
  }

  async function doExport() {
    c.setExpBusy(true)
    try {
      const b = await c.exportBlob()
      download(b, c.exportName())
      c.setExpBusy(false)
      c.closeExport()
      c.flash('Lastet ned · {size}', { size: `${(b.size / 1048576).toFixed(1).replace('.', lang === 'en' ? '.' : ',')} MB` })
    } catch {
      c.setExpBusy(false)
      c.flash('Eksporten feilet. Prøv 1080p eller JPG.')
    }
  }

  async function copyExport() {
    try {
      let b = await c.exportBlob()
      if (b.type !== 'image/png') {
        const bmp = await createImageBitmap(b)
        const cv = document.createElement('canvas')
        cv.width = bmp.width
        cv.height = bmp.height
        cv.getContext('2d')?.drawImage(bmp, 0, 0)
        bmp.close()
        b = await new Promise<Blob>((res, rej) => cv.toBlob((x) => (x ? res(x) : rej(new Error('png'))), 'image/png'))
      }
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': b })])
      c.flash('Bildet er kopiert. Lim inn med Ctrl+V.')
    } catch {
      c.flash('Nettleseren tillot ikke kopiering.')
    }
  }

  async function saveExportToMedia() {
    try {
      const b = await c.exportBlob()
      await assets.register(b, { name: c.exportName(), origin: { type: 'generated', tool: 'thumbnail-studio' } })
      c.flash('Bildet er lagret i Dine medier.')
    } catch {
      c.flash('Eksporten feilet. Prøv 1080p eller JPG.')
    }
  }

  const picker = S.picker
  return (
    <div className={s.tool} data-ts-view={S.ready ? S.view : 'loading'}>
      {!S.ready && <div className={s.loading}>{tx('LASTER …')}</div>}
      {S.ready && S.view === 'home' && <Home c={c} S={S} tx={tx} onBackup={() => void doBackup()} onRestore={() => restoreInput.current?.click()} />}
      {S.ready && S.view === 'cat' && <CategoryView c={c} tx={tx} />}
      {S.ready && S.view === 'edit' && S.doc && <Editor c={c} S={S} tx={tx} images={images} renderer={renderer} pickFile={pickFile} />}

      {S.newOpen && <NewDialog c={c} S={S} tx={tx} />}
      {S.exp && <ExportDialog c={c} S={S} tx={tx} onDownload={() => void doExport()} onCopy={() => void copyExport()} onSaveMedia={() => void saveExportToMedia()} />}
      {S.save && <SaveDialog c={c} S={S} tx={tx} />}
      {S.cropId && <CropDialog c={c} S={S} tx={tx} images={images} />}
      {S.lcOpen && <LayoutDialog c={c} S={S} tx={tx} />}
      {S.ctx && <ContextMenu c={c} S={S} tx={tx} />}
      {picker?.kind === 'media' && (
        <AssetPicker kinds={['image']} onClose={() => c.closePicker()} onPick={(a) => void c.placeExisting(`m:${a.id}`, picker.target)} />
      )}
      {picker?.kind === 'cloud' && (
        <CloudPicker title={picker.target.mode === 'add' && picker.target.logo ? 'cloud.pickLogo' : 'cloud.pickImage'} start={picker.target.mode === 'add' && picker.target.logo ? 'ressurser' : 'faste'}
          onClose={() => c.closePicker()} onPick={(p) => void c.placeExisting(p.ref, picker.target)} />
      )}
      {S.msg && <div className={s.toast} role="status">{S.msg.raw ? S.msg.p : tx(S.msg.p, S.msg.v)}</div>}
      <input ref={fileInput} type="file" hidden accept={IMAGE_TYPES} onChange={(e) => {
        const f = e.target.files?.[0]
        e.target.value = ''
        if (f) void c.addFile(f, fileTarget.current)
        else c.clearPendingLink()
      }} />
      <input ref={restoreInput} type="file" hidden accept=".json,application/json" onChange={(e) => {
        const f = e.target.files?.[0]
        e.target.value = ''
        if (f) void doRestore(f)
      }} />
    </div>
  )
}
