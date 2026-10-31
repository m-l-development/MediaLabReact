import { useEffect, useMemo, useState } from 'react'
import { useServices } from '../../app/services'
import { useWorkspace } from '../../app/workspace-factory'
import type { AssetId } from '../../domain/ids'
import { readLegacyMockups } from '../../infrastructure/legacy-import/mockups'
import { categoryOf, loadBuiltin, niceName, type MockupEntry } from './engine/catalog'
import type { Quad } from './engine/geometry'
import { detect } from './engine/render'

export const OWN_KEY = 'mockups.own'

/** Forhåndsvisningen (960 px) av et innebygd foto, i undermappen thumbs/. Andre mockups har ingen. */
const thumbOf = (m: MockupEntry): string | null => (m.source === 'builtin' && /^\/images\/mockups\/[^/]+$/.test(m.src) ? m.src.replace('/images/mockups/', '/images/mockups/thumbs/') : null)
const LEGACY_KEY = 'mockups.legacyImported'

export interface MockupLibrary {
  /** null mens katalogen lastes. */
  entries: MockupEntry[] | null
  /** Fotografiene til galleriet per mockup-ID (innebygde: forhåndsvisning på 960 px, ellers originalen). */
  images: ReadonlyMap<string, HTMLImageElement>
  /** Fotografiene i full oppløsning (editoren og nedlastingen), lastet ved behov med `loadFull`. */
  full: ReadonlyMap<string, HTMLImageElement>
  /** Henter fotografiet i full oppløsning (én gang); `version` øker når det er klart. */
  loadFull(id: string): void
  /** Automatisk funnede skjermhjørner (for mockups uten hjørner i config.json). */
  auto: ReadonlyMap<string, Quad | null>
  /** Øker når et bilde er lastet. */
  version: number
  addOwn(files: File[]): Promise<{ added: number; skipped: number }>
  removeOwn(id: string): Promise<void>
  legacyCount: number
  importLegacy(): Promise<number>
}

/**
 * Henter alle mockups (MK-01–MK-04): innebygde, brukerens mappe (/mockups), egne (lagret i Dine medier),
 * menighetens mappe «mockups» og Samarbeidsfiler. Lokale vises med en gang; skyen blokkerer aldri galleriet (MK-13).
 */
export function useMockupLibrary(): MockupLibrary {
  const { files, community } = useServices()
  const { assets, settings, userId } = useWorkspace()
  const [base, setBase] = useState<MockupEntry[] | null>(null)
  const [cloud, setCloud] = useState<MockupEntry[]>([])
  const [ownIds, setOwnIds] = useState<AssetId[] | null>(null)
  const [own, setOwn] = useState<MockupEntry[]>([])
  const [version, setVersion] = useState(0)
  const [legacyCount, setLegacyCount] = useState(0)
  // Stabile kart (samme objekt hele tiden); `version` øker når de endres.
  const [images] = useState(() => new Map<string, HTMLImageElement>())
  const [auto] = useState(() => new Map<string, Quad | null>())
  const [pending] = useState(() => new Set<string>())
  const [full] = useState(() => new Map<string, HTMLImageElement>())
  const [fullPending] = useState(() => new Set<string>())
  // galleriet bruker forhåndsvisningen der den finnes (TB-4416C4: 0,7 MB i stedet for 7,6 MB for de innebygde)
  const [thumbed] = useState(() => new Set<string>())

  // Innebygde mockups, listen over egne og tilbud om import fra dagens app
  useEffect(() => {
    let live = true
    void loadBuiltin().then((list) => live && setBase(list))
    void settings.get<AssetId[]>(OWN_KEY).then((ids) => live && setOwnIds(ids ?? []))
    void (async () => {
      const legacy = await readLegacyMockups(userId).catch(() => [])
      const done = new Set((await settings.get<string[]>(LEGACY_KEY)) ?? [])
      if (live) setLegacyCount(legacy.filter((m) => !done.has(m.id)).length)
    })()
    return () => {
      live = false
    }
  }, [settings, userId])

  // Egne mockup-bilder fra Dine medier
  useEffect(() => {
    if (!ownIds) return
    let live = true
    const urls: string[] = []
    void (async () => {
      const list: MockupEntry[] = []
      for (const id of ownIds) {
        const a = await assets.get(id)
        if (!a) continue
        const url = URL.createObjectURL(await assets.open(id))
        urls.push(url)
        list.push({ id: `own-${id}`, src: url, name: niceName(a.name).slice(0, 60), cat: categoryOf(a.name), corners: null, aspect: null, keepHoles: false, occl: true, source: 'own' })
      }
      if (live) setOwn(list)
    })()
    return () => {
      live = false
      for (const u of urls) URL.revokeObjectURL(u)
    }
  }, [assets, ownIds])

  // Menighetens mappe «mockups» og Samarbeidsfiler (valgfritt; feil gir bare ingen skymockups)
  useEffect(() => {
    if (!files.available()) return
    let live = true
    const urls: string[] = []
    void (async () => {
      try {
        const [mine, collab, groups] = await Promise.all([files.list('mockups'), files.listCollab(), community.myGroups()])
        const all = [...mine.slice(0, 100), ...collab.filter((f) => f.source_folder === 'mockups').slice(0, 100)]
        const signed = await files.urls(all.map((f) => f.id))
        const list: MockupEntry[] = []
        await Promise.all(all.map(async (f) => {
          const u = signed[f.id]
          if (!u) return
          try {
            const r = await fetch(u, { signal: AbortSignal.timeout(20000) })
            if (!r.ok) return
            const url = URL.createObjectURL(await r.blob())
            urls.push(url)
            const isCollab = f.folder === 'samarbeid'
            const group = f.link_id ? groups.find((g) => g.id === f.link_id) : undefined
            list.push({
              id: `${isCollab ? 'collab' : 'cloud'}-${f.id}`, src: url, name: niceName(f.file_name) + (group ? ` · ${group.name}` : ''),
              cat: isCollab ? 'collab' : categoryOf(f.file_name), corners: null, aspect: null, keepHoles: false, occl: true, source: isCollab ? 'collab' : 'cloud',
            })
          } catch {
            // en fil som ikke kan hentes, hoppes over
          }
        }))
        if (live) setCloud(list)
      } catch {
        // skyen er valgfri
      }
    })()
    return () => {
      live = false
      for (const u of urls) URL.revokeObjectURL(u)
    }
  }, [files, community])

  const entries = useMemo(() => (base ? [...base, ...own, ...cloud] : null), [base, own, cloud])

  // Laster fotografiene og finner skjermen automatisk der config.json ikke har hjørner.
  useEffect(() => {
    if (!entries) return
    for (const m of entries) {
      if (images.has(m.id) || pending.has(m.id)) continue
      pending.add(m.id)
      const im = new Image()
      im.decoding = 'async'
      const th = thumbOf(m)
      im.onerror = () => {
        // mangler forhåndsvisningen: originalen
        if (th && im.src.endsWith(th)) im.src = m.src
        else pending.delete(m.id)
      }
      im.onload = () => {
        pending.delete(m.id)
        images.set(m.id, im)
        if (th && im.src.endsWith(th)) thumbed.add(m.id)
        else full.set(m.id, im)
        if (!m.corners) {
          try {
            auto.set(m.id, detect(im, m.inset))
          } catch {
            auto.set(m.id, null)
          }
        }
        setVersion((v) => v + 1)
      }
      im.src = th ?? m.src
    }
  }, [entries, images, auto, pending, full, thumbed])

  /** Full oppløsning for editoren; skjermen finnes på nytt i originalen (mer presist enn i forhåndsvisningen). */
  function loadFull(id: string) {
    if (full.has(id) || fullPending.has(id)) return
    const m = entries?.find((x) => x.id === id)
    if (!m) return
    // ikke lastet ennå, eller galleriet har originalen allerede
    const g = images.get(id)
    if (g && !thumbed.has(id)) {
      full.set(id, g)
      setVersion((v) => v + 1)
      return
    }
    fullPending.add(id)
    const im = new Image()
    im.decoding = 'async'
    im.onerror = () => fullPending.delete(id)
    im.onload = () => {
      fullPending.delete(id)
      full.set(id, im)
      if (!m.corners) {
        try {
          auto.set(id, detect(im, m.inset))
        } catch {
          // beholder det som ble funnet i forhåndsvisningen
        }
      }
      setVersion((v) => v + 1)
    }
    im.src = m.src
  }

  async function addOwn(list: File[]) {
    let added = 0
    let skipped = 0
    const ids = [...(ownIds ?? [])]
    for (const f of list) {
      if (!/^image\/(png|jpeg|webp)$/.test(f.type) || f.size > 25 * 1048576) {
        skipped++
        continue
      }
      const a = await assets.register(f)
      if (!ids.includes(a.id)) ids.push(a.id)
      added++
    }
    await settings.set(OWN_KEY, ids)
    setOwnIds(ids)
    return { added, skipped }
  }

  async function removeOwn(id: string) {
    const ids = (ownIds ?? []).filter((x) => `own-${x}` !== id)
    await settings.set(OWN_KEY, ids)
    images.delete(id)
    full.delete(id)
    setOwnIds(ids)
  }

  async function importLegacy() {
    const legacy = await readLegacyMockups(userId)
    const done = new Set((await settings.get<string[]>(LEGACY_KEY)) ?? [])
    const ids = [...(ownIds ?? [])]
    let n = 0
    for (const m of legacy) {
      if (done.has(m.id)) continue
      try {
        const a = await assets.register(m.blob, { name: m.file || m.name, createdAt: m.t, legacy: { source: 'mockuplib', id: m.id } })
        if (!ids.includes(a.id)) ids.push(a.id)
        done.add(m.id)
        n++
      } catch {
        // filen kan ikke leses; resten importeres
      }
    }
    await settings.set(OWN_KEY, ids)
    await settings.set(LEGACY_KEY, [...done])
    setLegacyCount(0)
    setOwnIds(ids)
    return n
  }

  return { entries, images, full, loadFull, auto, version, addOwn, removeOwn, legacyCount, importLegacy }
}
