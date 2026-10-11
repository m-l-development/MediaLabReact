'use no memo'
// Komponentene leser fra kontrolleren (c.selL(), c.s …); kompilatorens mellomlagring ville gitt utdaterte verdier.
import { useEffect, useRef, useState } from 'react'
import type { ToolProps } from '../../app/tools'
import { useWorkspace } from '../../app/workspace-factory'
import type { AssetId } from '../../domain/ids'
import { localStore } from '../../shared/lib/storage'
import { useStore } from '../../shared/lib/store'
import { CloudPicker } from '../cloud-picker/CloudPicker'
import { AssetPicker } from '../media-library/AssetPicker'
import { PhotoController, type Pt } from './controller'
import { Editor } from './Editor'
import { PhotoCutout } from './engine/cutout'
import { Home } from './Home'
import { PdRepo } from './repo'
import { tr, useTx, type Phrase, type Vars } from './texts'
import { backupPhoto, importLegacyPhoto, restorePhoto } from './transfer'
import { useLang } from '../../shared/i18n/i18n'
import s from './PhotoDesign.module.css'

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
  }, 4000)
}

/** Photo Design (PD-01–PD-17): bilder for sosiale medier og trykk. */
export default function PhotoDesign({ query, registerLifecycle }: ToolProps) {
  const tx = useTx()
  const lang = useLang()
  const { assets, projects, userId } = useWorkspace()
  const langRef = useRef(lang)
  useEffect(() => {
    langRef.current = lang
  }, [lang])
  const fileInput = useRef<HTMLInputElement>(null)
  const restoreInput = useRef<HTMLInputElement>(null)
  const replaceRef = useRef<string | undefined>(undefined)

  const [parts] = useState(() => {
    const repo = new PdRepo(projects)
    const cutout = new PhotoCutout()
    const say = (p: Phrase, v?: Vars) => tr(langRef.current, p, v)
    const c = new PhotoController({
      repo,
      openMedia: (src) => (src.startsWith('m:') ? assets.open(M_ID(src)).catch(() => null) : Promise.resolve(null)),
      async putImage(blob, name) {
        const a = await assets.register(blob, { name })
        return `m:${a.id}`
      },
      cutout: (src, kind, onProgress) => cutout.run(src, kind, onProgress),
      storage: { get: (k) => localStore.get(k), set: (k, v) => void localStore.set(k, v), remove: (k) => localStore.remove(k) },
      confirm: (p, v) => window.confirm(say(p, v)),
      prompt: (p, def) => window.prompt(say(p), def),
      t: say,
    })
    return { c, repo, cutout }
  })
  const { c, repo } = parts
  const S = useStore(c.state)

  const started = useRef(false)
  useEffect(() => {
    if (started.current) return
    started.current = true
    void (async () => {
      const n = await importLegacyPhoto(userId, assets, repo).catch(() => 0)
      await c.refresh()
      if (n) c.flash('{n} prosjekter er hentet fra forrige versjon av Photo design.', { n })
    })()
  }, [c, repo, userId, assets])

  useEffect(() => {
    registerLifecycle({
      save: async () => {
        if (c.s.view === 'edit' && c.s.doc && c.dirty) await c.saveNow()
      },
      isBusy: () => !!c.s.busy,
      dispose: () => {
        c.dispose()
        parts.cutout.dispose()
      },
    })
  }, [registerLifecycle, c, parts])

  // «Åpne i Photo Design» fra Dine medier (?asset=…)
  const assetParam = query.asset
  useEffect(() => {
    if (!assetParam) return
    let live = true
    Promise.all([assets.get(assetParam as AssetId), assets.open(assetParam as AssetId)]).then(([a, b]) => {
      if (!live) return
      if (c.s.view === 'edit') void c.addBlob(b, a?.name ?? 'bilde', null, `m:${assetParam}`)
      else {
        c.create('blank')
        setTimeout(() => void c.addBlob(b, a?.name ?? 'bilde', null, `m:${assetParam}`), 60)
      }
    }, () => undefined)
    return () => {
      live = false
    }
  }, [assetParam, assets, c])

  // Smal skjerm: arbeidsflaten øverst, panelene under
  useEffect(() => {
    const on = () => c.ui({ narrow: window.innerWidth < 980 })
    on()
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [c])

  useEffect(() => {
    const before = (e: BeforeUnloadEvent) => {
      if (c.dirty && c.s.view === 'edit') {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', before)
    return () => window.removeEventListener('beforeunload', before)
  }, [c])

  // Tastatur og innliming
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (c.s.view !== 'edit' || c.s.picker) return
      const t = e.target as HTMLElement | null
      const typing = !!t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)
      const mod = e.ctrlKey || e.metaKey
      const k = e.key.toLowerCase()
      if (mod && k === 's') {
        e.preventDefault()
        void c.saveNow().then(() => !c.dirty && c.flash('Prosjektet er lagret.'))
        return
      }
      if (typing && (t as HTMLInputElement).type !== 'range') return
      if (mod && k === 'z') {
        e.preventDefault()
        if (e.shiftKey) c.redo()
        else c.undo()
        return
      }
      if (mod && k === 'y') {
        e.preventDefault()
        c.redo()
        return
      }
      if (mod && k === 'd') {
        e.preventDefault()
        c.dup()
        return
      }
      if (k === 'escape') {
        c.ui({ sel: null, multi: [], tool: 'move', expOpen: false })
        return
      }
      if (mod && k === 'a') {
        e.preventDefault()
        c.selectAll()
        return
      }
      if (mod && k === 'g') {
        e.preventDefault()
        if (e.shiftKey) c.ungroup()
        else c.group()
        return
      }
      if (!c.selIds().length) return
      if (k === 'delete' || k === 'backspace') {
        e.preventDefault()
        c.del()
        return
      }
      if (k.startsWith('arrow')) {
        e.preventDefault()
        const st = e.shiftKey ? 10 : 1
        c.nudge(k === 'arrowleft' ? -st : k === 'arrowright' ? st : 0, k === 'arrowup' ? -st : k === 'arrowdown' ? st : 0)
        return
      }
      const L = c.selL()
      if (L?.type === 'image' && L.src && !mod) {
        if (k === 'b') c.ui({ tool: c.s.tool === 'brush' ? 'move' : 'brush', tab: 'cut' })
        if (k === 'c') c.ui({ tool: c.s.tool === 'crop' ? 'move' : 'crop', tab: 'layer' })
        if (k === 'v') c.ui({ tool: 'move' })
      }
    }
    const paste = (e: ClipboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && /^(INPUT|TEXTAREA)$/.test(t.tagName)) return
      const file = [...(e.clipboardData?.items ?? [])].find((i) => i.type.startsWith('image/'))?.getAsFile()
      if (file) {
        e.preventDefault()
        c.receive(file, file.name)
      }
    }
    window.addEventListener('keydown', key)
    window.addEventListener('paste', paste)
    return () => {
      window.removeEventListener('keydown', key)
      window.removeEventListener('paste', paste)
    }
  }, [c])

  const pickFile = (replace?: string) => {
    replaceRef.current = replace
    const f = fileInput.current
    if (f) {
      f.value = ''
      f.click()
    }
  }

  async function onExport(kind: 'download' | 'copy' | 'media') {
    if (c.s.busy) return
    if (kind === 'download' && c.s.exp.fmt === 'pdf') {
      c.ui({})
      c.set({ busy: 'exp' })
      try {
        const b = await c.printPdf()
        if (b) {
          download(b, c.fname().replace(/\.\w+$/, '') + '-trykk.pdf')
          c.flash(c.s.doc?.bleed ? 'PDF til trykk er lastet ned (CMYK, 300 dpi, 3 mm utfallende).' : 'PDF er lastet ned (CMYK, 300 dpi). Slå på utfallende hvis trykkeriet krever det.')
        }
      } catch {
        c.flash('Kunne ikke lage PDF.')
      } finally {
        c.set({ busy: '' })
      }
      return
    }
    c.set({ busy: 'exp' })
    try {
      const b = await c.outBlob()
      if (!b) return
      if (kind === 'download') download(b, c.fname())
      else if (kind === 'copy') {
        try {
          await navigator.clipboard.write([new ClipboardItem({ [b.type]: b })])
          c.flash('Bildet er kopiert. Lim inn med Ctrl+V.')
        } catch {
          c.flash('Nettleseren tillot ikke kopiering.')
        }
      } else {
        await assets.register(b, { name: c.fname(), origin: { type: 'generated', tool: 'photo-design' } })
        c.flash('Bildet er lagret i Dine medier.')
      }
    } catch {
      c.flash('Eksporten feilet.')
    } finally {
      c.set({ busy: '' })
    }
  }

  const picker = S.picker
  const pt = (e: { clientX: number; clientY: number }): Pt | null => {
    const w = document.querySelector<HTMLElement>('[data-pd-wrap]')
    if (!w) return null
    const r = w.getBoundingClientRect()
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return null
    return [(e.clientX - r.left) / c.sc(), (e.clientY - r.top) / c.sc()]
  }
  return (
    <div className={s.tool} data-pd-view={S.ready ? S.view : 'loading'}
      onDragOver={(e) => {
        if (![...(e.dataTransfer.types || [])].includes('Files')) return
        e.preventDefault()
        if (!S.dragOver) c.ui({ dragOver: true })
      }}
      onDragLeave={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return
        c.ui({ dragOver: false })
      }}
      onDrop={(e) => {
        e.preventDefault()
        c.ui({ dragOver: false })
        const f = [...(e.dataTransfer.files || [])].filter((x) => /^image\//.test(x.type))
        if (!f.length) return
        if (c.s.view !== 'edit') {
          c.create('blank')
          setTimeout(() => f.forEach((x) => void c.addBlob(x, x.name)), 60)
          return
        }
        const at = pt(e)
        f.forEach((x, i) => void c.addBlob(x, x.name, i === 0 ? at : null))
      }}>
      {!S.ready && <div className={s.loading}>{tx('LASTER …')}</div>}
      {S.ready && S.view === 'home' && (
        <Home c={c} S={S} tx={tx}
          onBackup={async () => {
            c.flash('Lager sikkerhetskopi …')
            try {
              download(await backupPhoto(repo, assets), `photo-design-sikkerhetskopi-${new Date().toISOString().slice(0, 10)}.json`)
              c.flash('Sikkerhetskopien er lastet ned.')
            } catch {
              c.flash('Kunne ikke lage sikkerhetskopi.')
            }
          }}
          onRestore={() => restoreInput.current?.click()} />
      )}
      {S.view === 'edit' && S.doc && <Editor c={c} S={S} tx={tx} pickFile={pickFile} onExport={(k) => void onExport(k)} />}
      {picker?.kind === 'media' && (
        <AssetPicker kinds={['image']} onClose={() => c.closePicker()} onPick={(a) => {
          c.closePicker()
          void assets.open(a.id).then((b) => c.addBlob(b, a.name, null, `m:${a.id}`, picker.target.replace))
        }} />
      )}
      {picker?.kind === 'cloud' && (
        <CloudPicker title={picker.target.logo ? 'cloud.pickLogo' : 'cloud.pickImage'} start={picker.start === 'samarbeid' ? 'felles' : (picker.start ?? 'faste')}
          onClose={() => c.closePicker()} onPick={(p) => {
            c.closePicker()
            void c.addBlob(p.blob, p.name, null, undefined, picker.target.replace)
          }} />
      )}
      {S.toast && <div className={s.toast} role="status">{tx(S.toast.p, S.toast.v)}</div>}
      <input ref={fileInput} type="file" hidden multiple accept="image/png,image/jpeg,image/webp,image/gif" onChange={(e) => {
        const files = [...(e.target.files ?? [])]
        e.target.value = ''
        const rep = replaceRef.current
        replaceRef.current = undefined
        files.forEach((x, i) => void c.addBlob(x, x.name, null, undefined, i === 0 ? rep : undefined))
      }} />
      <input ref={restoreInput} type="file" hidden accept=".json,application/json" onChange={async (e) => {
        const f = e.target.files?.[0]
        e.target.value = ''
        if (!f) return
        try {
          const n = await restorePhoto(f, repo, assets)
          c.flash('Gjenopprettet: {n}', { n })
          void c.refresh()
        } catch (er) {
          const m = er instanceof Error ? er.message : ''
          c.flash(m === 'file' ? 'Velg en sikkerhetskopi (JSON).' : m === 'read' ? 'Filen kunne ikke leses.' : m === 'format' ? 'Filen er ikke en sikkerhetskopi fra Photo design.' : 'Kunne ikke gjenopprette. Nettleseren kan være full.')
        }
      }} />
    </div>
  )
}
