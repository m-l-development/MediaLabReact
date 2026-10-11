'use no memo'
// Visningen leser fra kontrollerne (c.state …); kompilatorens mellomlagring ville gitt utdaterte verdier.
import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { hrefFor } from '../../app/router'
import { useServices } from '../../app/services'
import type { ToolProps } from '../../app/tools'
import { useWorkspace } from '../../app/workspace-factory'
import type { AssetId } from '../../domain/ids'
import { activeChurch, SharedSetup } from '../../services/shared-setup'
import { useLang, useT } from '../../shared/i18n/i18n'
import { localStore } from '../../shared/lib/storage'
import { useStore } from '../../shared/lib/store'
import { fitUpload } from '../../shared/media/upload-fit'
import { useTheme } from '../../shared/theme/theme'
import { CloudPicker, type CloudArea, type CloudPick } from '../cloud-picker/CloudPicker'
import { AssetPicker } from '../media-library/AssetPicker'
import { centralBases, personalBases, type KV } from './bases'
import { LoopController, type LoopDeps } from './controller'
import { EditorView } from './EditorView'
import { HomeController } from './home-controller'
import { HomeView } from './HomeView'
import { LoopMediaStore, LoopRepo } from './store'
import { trLoop } from './texts'
import { importLegacyLoop } from './transfer'
import H from './Home.module.css'
import { applyLight } from './light-theme'
import LS from './LoopStudio.module.css'
import L from './Page.module.css'

function download(b: Blob, name: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(b)
  a.download = name
  document.body.appendChild(a)
  a.click()
  setTimeout(() => {
    URL.revokeObjectURL(a.href)
    a.remove()
  }, 120000)
}
const EDITOR_KEYS = ['mal', 'disk', 'grunn', 'demo', 'id'] as const
const isEditor = (q: Readonly<Record<string, string>>) => EDITOR_KEYS.some((k) => !!q[k])

/** Loop Studio (LS-*, LE-*): ukeprogram og andre looper som video eller fullskjerm-spiller. Video lastes aldri opp. */
export default function LoopStudio({ query, registerLifecycle }: ToolProps) {
  const lang = useLang()
  const t = useT()
  const theme = useTheme()
  const services = useServices()
  const { router, files, churchSettings, auth } = services
  const authState = useStore(auth.state)
  const me = authState.status === 'ready' ? authState.me : null
  const { assets, projects, userId } = useWorkspace()
  const langRef = useRef(lang)
  const themeRef = useRef(theme)
  useEffect(() => {
    langRef.current = lang
    themeRef.current = theme
  }, [lang, theme])
  const tx = useMemo(() => (s: unknown) => trLoop(lang, s), [lang])

  const [base] = useState(() => {
    const repo = new LoopRepo(projects)
    const media = new LoopMediaStore(assets)
    /* egne nøkler per bruker, så dagens app aldri får endret sine innstillinger (de kopieres ved første åpning) */
    const P = 'ml2:' + (userId ?? 'local') + ':'
    const kv: KV = { get: (k) => localStore.get(P + k), set: (k, v) => localStore.set(P + k, v), remove: (k) => localStore.remove(P + k) }
    return { repo, media, kv }
  })
  const [ready, setReady] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const toastT = useRef<ReturnType<typeof setTimeout>>(undefined)
  const showToast = (m: string) => {
    setToast(m)
    clearTimeout(toastT.current)
    toastT.current = setTimeout(() => setToast(null), 4200)
  }
  const [picker, setPicker] = useState<null | { kind: 'cloud'; start: CloudArea; logo: boolean; done: (p: CloudPick | null) => void } | { kind: 'media'; done: (f: File | null) => void }>(null)

  // Oppstart: prosjektene i minnet og looper fra forrige versjon av Loop Studio (kopi, dagens data endres aldri)
  useEffect(() => {
    let live = true
    void (async () => {
      await base.repo.load().catch(() => undefined)
      const r = await importLegacyLoop(userId, base.media, base.repo, base.kv).catch(() => ({ added: 0 }))
      if (r.added) await base.repo.load().catch(() => undefined)
      if (!live) return
      if (r.added) {
        setToast(trLoop(langRef.current, r.added === 1 ? '1 loop er hentet fra forrige versjon av Loop Studio.' : r.added + ' looper er hentet fra forrige versjon av Loop Studio.'))
        setTimeout(() => setToast(null), 6000)
      }
      setReady(true)
    })()
    return () => {
      live = false
    }
  }, [base, userId])

  const churchId = () => activeChurch(me)?.id ?? null
  const bases = useMemo(() => ({ personal: personalBases(base.kv), central: churchSettings.available() ? centralBases(churchSettings, () => activeChurch(me)?.id ?? null) : null }), [base.kv, churchSettings, me])
  const editorHref = (q: Record<string, string>) => hrefFor({ name: 'tool', tool: 'loop-studio', query: q })
  const [session, setSession] = useState(0)
  const openEditor = (q: Record<string, string>) => {
    router.navigate({ name: 'tool', tool: 'loop-studio', query: q })
    setSession((n) => n + 1)
  }
  const goHome = () => router.navigate({ name: 'tool', tool: 'loop-studio', query: {} })

  const cloud: LoopDeps['cloud'] = files.available()
    ? {
        async url(ref) {
          const id = ref.slice(3)
          return (await files.urls([id]))[id] ?? null
        },
        blob: (ref) => files.blob(ref.slice(3)),
        pick: (o) => new Promise((res) => setPicker({ kind: 'cloud', start: (o.start === 'ressurser' ? 'ressurser' : 'faste') as CloudArea, logo: o.start === 'ressurser', done: (p) => res(p ? { ref: p.ref, blob: p.blob } : null) })),
        async upload(file, folder) {
          const c = churchId()
          if (!c) throw new Error('church')
          const f = await files.upload(await fitUpload(file, file.name), { churchId: c, folder: folder as 'bilder' })
          return 'ch:' + f.id
        },
      }
    : null

  const editing = ready && isEditor(query)
  // Lyst tema som i dagens app: nøytrale farger regnes om på Loop-siden og i dens egne stilark
  const rootRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const root = rootRef.current
    if (!root || theme !== 'light') return
    return applyLight(root, [...Object.values(L), ...Object.values(LS), ...Object.values(H)].filter((x): x is string => !!x))
  }, [theme])
  return (
    <div data-loop-view={!ready ? 'loading' : editing ? 'edit' : 'home'} className={L.page} ref={rootRef}>
      {!ready && <div className={L.loading}>{tx('LASTER …')}</div>}
      {ready && !editing && (
        <Home
          key="home"
          kv={base.kv}
          repo={base.repo}
          tx={tx}
          lang={lang}
          light={theme === 'light'}
          hubHref={hrefFor({ name: 'hub' })}
          goHub={() => router.navigate({ name: 'hub' })}
          editorHref={editorHref}
          openEditor={openEditor}
          bases={bases}
        />
      )}
      {editing && (
        <Editor
          key={'e' + session}
          query={query}
          registerLifecycle={registerLifecycle}
          deps={{
            t: (s) => trLoop(langRef.current, s),
            lang: () => langRef.current,
            query,
            setQuery: (q) => router.navigate({ name: 'tool', tool: 'loop-studio', query: q }, { replace: true }),
            goHome,
            open: openEditor,
            repo: base.repo,
            media: base.media,
            kv: base.kv,
            me,
            bases,
            shared: (scope, opts) => {
              if (!churchSettings.available()) return null
              return new SharedSetup<Record<string, unknown>>(churchSettings, me, scope, {
                onRemote: (d) => opts.onRemote(d),
                onStatus: (st) => opts.onStatus({ state: st.state, text: t(st.text, st.fields ? { fields: st.fields } : undefined) }),
              })
            },
            cloud,
            pickLibrary: () => new Promise((res) => setPicker({ kind: 'media', done: res })),
            toast: showToast,
            alert: (m) => window.alert(m),
            confirm: (m) => window.confirm(m),
            download,
          }}
          tx={tx}
          homeHref={hrefFor({ name: 'tool', tool: 'loop-studio', query: {} })}
        />
      )}
      {picker?.kind === 'cloud' && (
        <CloudPicker title={picker.logo ? 'cloud.pickLogo' : 'cloud.pickImage'} start={picker.start} onClose={() => { picker.done(null); setPicker(null) }} onPick={(p) => { picker.done(p); setPicker(null) }} />
      )}
      {picker?.kind === 'media' && (
        <AssetPicker
          kinds={['image']}
          onClose={() => { picker.done(null); setPicker(null) }}
          onPick={(a) => {
            setPicker(null)
            void assets.open(a.id as AssetId).then((b) => picker.done(new File([b], a.name, { type: b.type })), () => picker.done(null))
          }}
        />
      )}
      {toast && (
        <div role="status" style={{ position: 'fixed', left: '50%', bottom: '22px', transform: 'translateX(-50%)', zIndex: 2147480000, maxWidth: 'calc(100% - 24px)', padding: '10px 16px', border: '1px solid #2b2b2b', borderRadius: '16px', background: '#121212', color: '#f3f1ec', font: '500 13px Archivo,system-ui,sans-serif', boxShadow: '0 10px 30px rgba(0,0,0,.5)' }}>
          {toast}
        </div>
      )}
    </div>
  )
}

function Home(p: {
  kv: KV
  repo: LoopRepo
  tx: (s: unknown) => string
  lang: 'no' | 'en'
  light: boolean
  hubHref: string
  goHub: () => void
  editorHref: (q: Record<string, string>) => string
  openEditor: (q: Record<string, string>) => void
  bases: { personal: ReturnType<typeof personalBases>; central: ReturnType<typeof centralBases> | null }
}) {
  const [, tick] = useReducer((n: number) => n + 1, 0)
  const [c] = useState(() => new HomeController({ kv: p.kv, repo: p.repo, confirm: (m) => window.confirm(m), t: p.tx, lang: () => p.lang, light: () => p.light, editorHref: p.editorHref, openEditor: p.openEditor, hubHref: p.hubHref, goHub: p.goHub }))
  // språk, tema og navigering kan endre seg mens siden er åpen
  useEffect(() => {
    c.setDeps({ t: p.tx, lang: () => p.lang, light: () => p.light, openEditor: p.openEditor, goHub: p.goHub })
  })
  useEffect(() => {
    c.attach(tick)
    c.mount()
    return () => c.unmount()
  }, [c])
  useEffect(() => {
    c.didUpdate()
  })
  useEffect(() => {
    c.themeChanged(p.light)
  }, [c, p.light])
  const v = { ...c.vals(), bases: { personal: p.bases.personal, central: p.bases.central, editorHref: p.editorHref, open: p.openEditor, confirm: (m: string) => window.confirm(m) } }
  return <HomeView v={v} tx={p.tx} />
}

function Editor({ deps, tx, homeHref, registerLifecycle }: { deps: LoopDeps; tx: (s: unknown) => string; homeHref: string; query: Readonly<Record<string, string>>; registerLifecycle: ToolProps['registerLifecycle'] }) {
  const [, tick] = useReducer((n: number) => n + 1, 0)
  const pending = useRef<(() => void)[]>([])
  const [c] = useState(() => new LoopController(deps))
  useEffect(() => {
    c.attach((cb) => {
      if (cb) pending.current.push(cb)
      tick()
    })
    c.mount()
    registerLifecycle({
      save: async () => {
        c.saveNow()
        await deps.repo.flush()
      },
      isBusy: () => c.isBusy(),
      dispose: () => c.unmount(),
    })
    return () => c.unmount()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- kontrolleren lages én gang per åpning
  }, [c])
  // etter hver oppdatering: tilbakekall fra setState (som componentDidUpdate i dagens app)
  useEffect(() => {
    const cbs = pending.current.splice(0)
    cbs.forEach((f) => f())
    c.didUpdate()
  })
  const v = c.viewAll()
  const goHome = (e: { preventDefault(): void; button?: number; metaKey?: boolean; ctrlKey?: boolean }) => {
    if ((e.button ?? 0) !== 0 || e.metaKey || e.ctrlKey) return
    e.preventDefault()
    c.saveNow()
    deps.goHome()
  }
  return (
    <div data-loop-editor="1" className={L.editor}>
      <EditorView v={{ ...v, homeHref, goHome }} tx={tx} />
      <Banners c={c} tx={tx} />
    </div>
  )
}

/** Merknader øverst (demo, serie fra grunnoppsett, gammelt eksempel lagt til side) og dialogen «Lagre som grunnoppsett». */
function Banners({ c, tx }: { c: LoopController; tx: (s: unknown) => string }) {
  const B = c.baseDialog
  const bar = { position: 'fixed', left: '50%', top: '10px', transform: 'translateX(-50%)', zIndex: 2147480000, display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', maxWidth: 'calc(100% - 24px)', borderRadius: '999px', boxShadow: '0 10px 30px rgba(0,0,0,.5)' } as const
  const openHref = B.openHref
  return (
    <>
      {c.banner === 'demo' && (
        <div data-ch-demo-banner="1" role="status" style={{ ...bar, padding: '8px 10px 8px 16px', border: '1px solid #f5b82c', background: '#1b1607', color: '#f5d38f', font: '600 13px Archivo,system-ui,sans-serif' }}>
          <span>{tx('DEMO – eksempel med genererte bakgrunner. Ingenting lagres.')}</span>
          {openHref && (
            <a data-ch-base-open="1" style={{ color: '#f5d38f' }} href="#" onClick={(e) => { e.preventDefault(); const [mal = 'week', grunn = ''] = openHref.split('|'); c.deps.open({ mal, grunn }) }}>
              {tx('Åpne grunnoppsettet')}
            </a>
          )}
          <button type="button" data-ch-demo-save="1" onClick={c.openBaseDialog} style={{ height: '30px', padding: '0 14px', border: '1px solid #f5b82c', borderRadius: '999px', background: 'transparent', color: '#f5d38f', font: 'inherit', cursor: 'pointer' }}>
            {tx('Lagre som grunnoppsett')}
          </button>
          <a href="#" data-ch-demo-exit="1" onClick={(e) => { e.preventDefault(); c.deps.open({ mal: c.state.tpl || 'week' }) }} style={{ height: '30px', display: 'inline-flex', alignItems: 'center', padding: '0 14px', borderRadius: '999px', background: '#f5b82c', color: '#111', textDecoration: 'none' }}>
            {tx('Avslutt demo')}
          </a>
        </div>
      )}
      {c.banner === 'base' && c.fromBase && (
        <div data-ch-base-banner="1" role="status" style={{ ...bar, padding: '6px 8px 6px 14px', border: '1px solid #2b2b2b', background: '#121212', color: '#f3f1ec', font: '500 12.5px Archivo,system-ui,sans-serif' }}>
          <span>{tx('Serie fra grunnoppsettet') + ' «' + c.fromBase.name + '» (' + tx(c.fromBase.kind === 'f' ? 'felles for menigheten' : 'personlig') + '). ' + tx('Endringer her endrer ikke grunnoppsettet.')}</span>
          <button type="button" data-ch-base-update="1" onClick={() => void c.updateBase()} style={{ height: '28px', padding: '0 12px', border: '1px solid #f3f1ec', borderRadius: '999px', background: 'transparent', color: '#f3f1ec', font: 'inherit', cursor: 'pointer' }}>
            {tx('Oppdater grunnoppsettet')}
          </button>
          <button type="button" aria-label={tx('Lukk')} onClick={c.closeBanner} style={{ width: '28px', height: '28px', border: 0, borderRadius: '999px', background: 'transparent', color: '#9d998f', font: 'inherit', cursor: 'pointer' }}>✕</button>
        </div>
      )}
      {c.banner === 'legacy' && (
        <div data-ch-legacy-notice="1" role="status" style={{ ...bar, top: 'auto', bottom: '22px', borderRadius: '16px', padding: '10px 12px 10px 16px', border: '1px solid #2b2b2b', background: '#121212', color: '#f3f1ec', font: '500 13px Archivo,system-ui,sans-serif' }}>
          <span>{tx('Det gamle eksempelinnholdet er lagt til side, og du starter med en tom serie.')}</span>
          <button type="button" data-ch-legacy-restore="1" onClick={() => void c.restoreArchived()} style={{ height: '30px', padding: '0 14px', border: '1px solid #f3f1ec', borderRadius: '999px', background: 'transparent', color: '#f3f1ec', font: 'inherit', fontWeight: 700, cursor: 'pointer' }}>
            {tx('Hent tilbake')}
          </button>
          <button type="button" aria-label={tx('Lukk')} onClick={c.closeBanner} style={{ width: '30px', height: '30px', border: 0, borderRadius: '999px', background: 'transparent', color: '#9d998f', font: 'inherit', cursor: 'pointer' }}>✕</button>
        </div>
      )}
      {B.open && (
        <div data-ch-base-dialog="1" style={{ position: 'fixed', inset: 0, zIndex: 2147481000, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', font: '500 14px Archivo,system-ui,sans-serif' }}>
          <form
            role="dialog"
            aria-modal="true"
            onSubmit={(e) => { e.preventDefault(); void c.saveBase() }}
            style={{ width: 'min(440px,100%)', display: 'flex', flexDirection: 'column', gap: '12px', padding: '20px', border: '1px solid #2b2b2b', borderRadius: '18px', background: '#121212', color: '#f3f1ec' }}
          >
            <b style={{ fontSize: '17px' }}>{tx('Lagre som grunnoppsett')}</b>
            <p style={{ margin: 0, fontSize: '13px', color: '#b3afa6' }}>{tx('Lagrer slidene, tekstene, stilen og de genererte bakgrunnene som et nytt grunnoppsett. Demoen og dine andre serier endres ikke.')}</p>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', fontWeight: 600 }}>
              {tx('Navn')}
              <input
                required
                maxLength={60}
                autoFocus
                data-ch-base-name="1"
                value={B.name}
                onChange={(e) => c.setBaseDialog({ name: e.target.value })}
                style={{ height: '36px', padding: '0 10px', border: '1px solid #2b2b2b', borderRadius: '10px', background: '#000', color: '#f3f1ec', font: 'inherit' }}
              />
            </label>
            <fieldset style={{ margin: 0, padding: 0, border: 0, display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
              {([['p', 'Personlig – bare for meg', false], ['f', 'Felles for menigheten – alle medlemmer kan bruke det', !c.canChurchBase()]] as const).map(([lv, text, dis]) => (
                <label key={lv} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', opacity: dis ? 0.5 : 1 }}>
                  <input type="radio" name="lvl" value={lv} checked={B.level === lv} disabled={dis} data-ch-base-level={lv} onChange={() => c.setBaseDialog({ level: lv })} />
                  <span>{tx(text)}</span>
                </label>
              ))}
            </fieldset>
            <p role="status" style={{ margin: 0, fontSize: '13px', color: B.busy ? '#b3afa6' : '#ff8f7d', minHeight: 0 }}>{B.msg ? tx(B.msg) : ''}</p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button type="submit" disabled={B.busy} style={{ height: '34px', padding: '0 16px', border: 0, borderRadius: '999px', background: '#f3f1ec', color: '#111', font: 'inherit', fontWeight: 700, cursor: 'pointer' }}>{tx('Lagre')}</button>
              <button type="button" onClick={c.closeBaseDialog} style={{ height: '34px', padding: '0 14px', border: '1px solid #2b2b2b', borderRadius: '999px', background: 'transparent', color: '#f3f1ec', font: 'inherit', cursor: 'pointer' }}>{tx('Avbryt')}</button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
