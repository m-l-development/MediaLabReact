'use no memo'
// Komponentene leser fra kontrolleren (c.s …); kompilatorens mellomlagring ville gitt utdaterte verdier.
import { useEffect, useRef, useState } from 'react'
import { sendTargets } from '../../app/send-targets'
import { useServices } from '../../app/services'
import type { ToolProps } from '../../app/tools'
import { useWorkspace } from '../../app/workspace-factory'
import type { AssetId } from '../../domain/ids'
import { foldersSupported, pickDirectory } from '../../infrastructure/fs/project-folders'
import { useLang, useT } from '../../shared/i18n/i18n'
import { toolTitleKey } from '../../shared/i18n/messages'
import { userStore } from '../../infrastructure/local-user'
import { useStore } from '../../shared/lib/store'
import { CloudPicker } from '../cloud-picker/CloudPicker'
import { AssetPicker } from '../media-library/AssetPicker'
import { MotionController, type FileMode, type Loc } from './controller'
import { Editor } from './Editor'
import { FONTS } from './engine/model'
import { MotionFiles } from './files'
import { Home } from './Home'
import { mediaIdOf, MdRepo } from './repo'
import { tr, useTx, type Phrase, type Vars } from './texts'
import { grantLegacyFolders, importLegacyMotion } from './transfer'
import s from './MotionDesign.module.css'

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

/** Motion design (MD-01–MD-19): video med klipp, tekst, undertekster, musikk og overganger. Video lastes aldri opp. */
export default function MotionDesign({ query, registerLifecycle }: ToolProps) {
  const tx = useTx()
  const tApp = useT()
  // «Bruk i …» (SHR-02) for stillbildet og den siste eksporterte videoen
  const targetsFor = (kind: 'image' | 'video', suffix: string) => sendTargets('motion-design', kind).map((tool) => ({ id: tool.id, label: tApp('share.useIn', { tool: tApp(toolTitleKey(tool.id)) }) + suffix }))
  const sendTo = { image: targetsFor('image', ''), video: targetsFor('video', ' (video)') }
  const lang = useLang()
  const { router } = useServices()
  const { assets, projects, folders, userId } = useWorkspace()
  const langRef = useRef(lang)
  useEffect(() => {
    langRef.current = lang
  }, [lang])
  const mediaInput = useRef<HTMLInputElement>(null)
  const projInput = useRef<HTMLInputElement>(null)
  const srtInput = useRef<HTMLInputElement>(null)
  const modeRef = useRef<FileMode>('lib')
  const pendingAsset = useRef<string | null>(null)
  const [canFolders] = useState(foldersSupported)

  const [parts] = useState(() => {
    const repo = new MdRepo(projects)
    const files = new MotionFiles(assets, folders)
    const say = (p: Phrase, v?: Vars) => tr(langRef.current, p, v)
    const c = new MotionController({
      repo,
      files,
      storage: { get: (k) => userStore.get(k), set: (k, v) => void userStore.set(k, v) },
      confirm: (p, v) => window.confirm(say(p, v)),
      t: say,
      pickFile(mode, accept) {
        modeRef.current = mode
        const el = mediaInput.current
        if (!el) return
        el.accept = accept
        el.value = ''
        el.click()
      },
      pickSrt: () => srtInput.current?.click(),
      pickProject: () => projInput.current?.click(),
      pickDirectory: (o) => pickDirectory(o),
      foldersSupported,
      download,
      async toMedia(blob, name) {
        return (await assets.register(blob, { name, origin: { type: 'generated', tool: 'motion-design' } })).id
      },
      openIn: (tool, id) => void router.navigate({ name: 'tool', tool, query: { asset: id } }),
      onLocation: (loc: Loc, replace) => void router.navigate({ name: 'tool', tool: 'motion-design', query: { ...loc } as Record<string, string> }, { replace }),
    })
    return { c, repo }
  })
  const { c, repo } = parts
  const S = useStore(c.state)

  // Oppstart: tegnesløyfe, skrifter, prosjekter fra forrige versjon og visningen i adressen
  const start = useRef<Loc>({ ...(query.p ? { p: query.p } : {}), ...(query.v ? { v: query.v } : {}), ...(query.f ? { f: query.f } : {}) })
  useEffect(() => {
    c.mount()
    if (document.fonts) for (const f of FONTS) for (const w of ['700', '400']) void document.fonts.load(`${w} 40px "${f}"`).catch(() => undefined)
    let live = true
    void (async () => {
      let failed = false
      const r = await importLegacyMotion(userId, assets, folders, repo).catch(() => {
        failed = true
        return { added: 0, waiting: [] }
      })
      if (!live) return
      if (failed) c.flash('Prosjektene fra forrige versjon kunne ikke hentes nå. De ligger urørt og prøves igjen neste gang du åpner verktøyet.')
      await c.refresh()
      c.set({ waiting: r.waiting })
      if (r.added) c.flash('{n} prosjekter er hentet fra forrige versjon av Motion design.', { n: r.added })
      await c.followLocation(start.current)
    })()
    return () => {
      live = false
      c.dispose()
    }
  }, [c, repo, userId, assets, folders])

  // Nettleserens tilbake/fram
  const qp = query.p
  const qv = query.v
  const qf = query.f
  useEffect(() => {
    void c.followLocation({ ...(qp ? { p: qp } : {}), ...(qv ? { v: qv } : {}), ...(qf ? { f: qf } : {}) })
  }, [c, qp, qv, qf])

  useEffect(() => {
    registerLifecycle({
      save: async () => {
        if (c.s.view === 'edit' && c.s.proj && c.dirty) await c.saveNow()
      },
      isBusy: () => c.isBusy,
      dispose: () => c.dispose(),
    })
  }, [registerLifecycle, c])

  // «Åpne i Motion design» fra Dine medier (?asset=…): legges i prosjektet som er åpent, eller i det neste som åpnes
  const assetParam = query.asset
  useEffect(() => {
    if (!assetParam) return
    pendingAsset.current = assetParam
    if (c.s.view !== 'edit') c.flash('Åpne et prosjekt, så legges filen inn.')
  }, [assetParam, c])
  const editing = S.view === 'edit' && !!S.proj
  useEffect(() => {
    const id = pendingAsset.current
    if (!editing || !id) return
    pendingAsset.current = null
    void Promise.all([assets.get(id as AssetId), assets.open(id as AssetId)]).then(([a, b]) => c.addAsset(mediaIdOf(id as AssetId), b, a?.name ?? 'fil', 'lib'), () => c.flash('Filen kunne ikke brukes.'))
  }, [editing, assets, c])

  // Tastatur, aktivitet (for tegnefrekvens) og ulagrede endringer
  useEffect(() => {
    const key = (e: KeyboardEvent) => c.onKey(e)
    const poke = () => c.poke()
    const hide = () => {
      if (c.dirty && c.s.autosave) void c.saveNow()
    }
    const before = (e: BeforeUnloadEvent) => {
      if (c.dirty && c.s.view === 'edit') {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    const evs = ['pointerdown', 'pointermove', 'pointerup', 'wheel', 'keydown', 'input', 'touchstart', 'drop'] as const
    const full = () => c.fullChanged()
    document.addEventListener('fullscreenchange', full)
    window.addEventListener('keydown', key)
    window.addEventListener('pagehide', hide)
    window.addEventListener('beforeunload', before)
    for (const ev of evs) window.addEventListener(ev, poke, { capture: true, passive: true })
    return () => {
      document.removeEventListener('fullscreenchange', full)
      window.removeEventListener('keydown', key)
      window.removeEventListener('pagehide', hide)
      window.removeEventListener('beforeunload', before)
      for (const ev of evs) window.removeEventListener(ev, poke, { capture: true })
    }
  }, [c])

  const picker = S.picker
  return (
    <div className={s.tool} data-md-view={S.ready ? S.view : 'loading'}>
      {!S.ready && <div className={s.loading}>{tx('LASTER …')}</div>}
      {S.ready && S.view !== 'edit' && (
        <Home c={c} S={S} tx={tx} folders={canFolders} onOpenFile={() => projInput.current?.click()}
          onGrantWaiting={() => {
            void grantLegacyFolders(userId, S.waiting.map((w) => w.pid)).then(async () => {
              const r = await importLegacyMotion(userId, assets, folders, repo).catch(() => ({ added: 0, waiting: S.waiting }))
              c.set({ waiting: r.waiting })
              await c.refresh()
              if (r.added) c.flash('{n} prosjekter er hentet fra forrige versjon av Motion design.', { n: r.added })
            })
          }} />
      )}
      {editing && S.proj && (
        <Editor c={c} S={S} p={S.proj} tx={tx} folders={canFolders} sendTo={sendTo}
          onShared={() => c.set({ picker: { kind: 'media', mode: S.replaceFor ? 'replace' : 'lib' } })}
          onLogoCloud={() => c.set({ picker: { kind: 'cloud', mode: 'logo' } })} />
      )}
      {picker?.kind === 'media' && (
        <AssetPicker kinds={picker.mode === 'replace' ? ['image', 'video'] : ['image', 'video', 'audio']} onClose={() => c.set({ picker: null })} onPick={(a) => {
          c.set({ picker: null })
          void assets.open(a.id).then((b) => c.addAsset(mediaIdOf(a.id), b, a.name, picker.mode), () => c.flash('Filen kunne ikke brukes.'))
        }} />
      )}
      {picker?.kind === 'cloud' && (
        <CloudPicker title="cloud.pickLogo" start="ressurser" onClose={() => c.set({ picker: null })} onPick={(pk) => {
          c.set({ picker: null })
          void c.addFiles([new File([pk.blob], pk.name || 'logo.png', { type: pk.blob.type || 'image/png' })], 'logo')
        }} />
      )}
      {S.toast && <div className={s.toast} role="status">{tx(S.toast.p, S.toast.v)}</div>}
      <input ref={mediaInput} type="file" hidden multiple onChange={(e) => {
        const files = [...(e.target.files ?? [])]
        e.target.value = ''
        if (files.length) void c.addFiles(files, modeRef.current)
      }} />
      <input ref={projInput} type="file" hidden accept=".motion" onChange={(e) => {
        const f = e.target.files?.[0]
        e.target.value = ''
        if (f) void c.openProjectFile(f)
      }} />
      <input ref={srtInput} type="file" hidden accept=".srt,text/plain" onChange={(e) => {
        const f = e.target.files?.[0]
        e.target.value = ''
        if (f) void c.importSrt(f)
      }} />
    </div>
  )
}
