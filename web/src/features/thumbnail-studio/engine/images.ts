import { blobBitmap, closePic, type Pic } from '../../../shared/lib/blob-image'
import { freeCanvas } from '../../../shared/lib/free-canvas'
import { releaseAdjusted } from '../../photo-design/engine/render'
import { ASSETS, srcsOf, type Doc } from './model'

/** Henter en kilde (`m:`, `ch:`, `db:` …) som Blob. `null` = finnes ikke eller ingen tilgang. */
export type SrcResolver = (src: string) => Promise<Blob | null>

export interface LoadedImage { img: Pic; url: string }

interface Entry { p: Promise<LoadedImage | null>; img?: Pic; url?: string; own?: string; ok?: boolean; fail?: boolean }

/** Vanlig <img> (Safari/iPhone, SVG, innebygde ressurser). */
function imgOf(url: string): Promise<LoadedImage | null> {
  return new Promise((res) => {
    const im = new Image()
    im.decoding = 'async'
    im.onload = () => res({ img: im, url })
    im.onerror = () => res(null)
    im.src = url
  })
}

/**
 * Bildene et dokument bruker, lastet én gang per kilde. Blob-adresser frigjøres med `dispose()` når verktøyet lukkes.
 * `onLoad` varsler når et bilde er klart, så lerretet kan tegnes på nytt.
 */
export class ImageCache {
  private entries = new Map<string, Entry>()
  private listeners = new Set<() => void>()
  private tints = new Map<string, HTMLCanvasElement>()

  private resolve: SrcResolver

  constructor(resolve: SrcResolver) {
    this.resolve = resolve
  }

  onLoad(f: () => void): () => void {
    this.listeners.add(f)
    return () => this.listeners.delete(f)
  }

  private notify() {
    for (const f of [...this.listeners]) {
      try {
        f()
      } catch {
        // en lytter som feiler, stopper ikke de andre
      }
    }
  }

  load(src: string | null | undefined): Promise<LoadedImage | null> {
    if (!src) return Promise.resolve(null)
    const have = this.entries.get(src)
    if (have) return have.p
    const e: Entry = { p: Promise.resolve(null) }
    this.entries.set(src, e)
    e.p = this.fetch(src, e).then((r) => {
      if (r && this.entries.get(src) === e) {
        e.img = r.img
        e.url = r.url
        e.ok = true
        this.notify()
        return r
      }
      if (r) closePic(r.img)
      e.fail = true
      return null
    })
    return e.p
  }

  private async fetch(src: string, e: Entry): Promise<LoadedImage | null> {
    if (src.startsWith('asset:')) {
      const url = ASSETS[src.slice(6)]?.url
      return url ? imgOf(url) : null
    }
    const b = await this.resolve(src).catch(() => null)
    if (!b) return null
    const url = (e.own = URL.createObjectURL(b))
    // Chromium: dekodes som ImageBitmap – et <img> fra blob:-adresse ble liggende i minnet (≈ filstørrelsen per bilde)
    const bm = await blobBitmap(b)
    return bm ? { img: bm, url } : imgOf(url)
  }

  /** Bildet hvis det er lastet; ellers startes lastingen og `null` returneres. */
  get(src: string | null | undefined): LoadedImage | null {
    if (!src) return null
    const e = this.entries.get(src)
    if (!e) {
      void this.load(src)
      return null
    }
    return e.ok && e.img && e.url ? { img: e.img, url: e.url } : null
  }

  failed(src: string): boolean {
    return !!this.entries.get(src)?.fail
  }

  url(src: string | null | undefined): string {
    return this.get(src)?.url ?? ''
  }

  loadAll(doc: Doc): Promise<unknown> {
    return Promise.all(srcsOf(doc).map((s) => this.load(s)))
  }

  /** Bildet i én farge (logoer). */
  tinted(e: LoadedImage, color: string): HTMLCanvasElement {
    const key = `${e.url}|${color}`
    const have = this.tints.get(key)
    if (have) return have
    const c = document.createElement('canvas')
    c.width = e.img.naturalWidth
    c.height = e.img.naturalHeight
    const g = c.getContext('2d')
    if (g) {
      g.drawImage(e.img, 0, 0)
      g.globalCompositeOperation = 'source-in'
      g.fillStyle = color
      g.fillRect(0, 0, c.width, c.height)
    }
    if (this.tints.size > 40) this.clearTints()
    this.tints.set(key, c)
    return c
  }

  /** Fargede kopier i bildets fulle størrelse: frigjøres straks (ikke først ved søppeltømming i Safari). */
  private clearTints(): void {
    for (const c of this.tints.values()) freeCanvas(c)
    this.tints.clear()
  }

  /** Glemmer en kilde (f.eks. etter gjenoppretting) så den lastes på nytt neste gang. */
  forget(src: string): void {
    const e = this.entries.get(src)
    if (e?.own) URL.revokeObjectURL(e.own)
    releaseAdjusted(e?.img)
    closePic(e?.img)
    this.entries.delete(src)
  }

  dispose(): void {
    for (const e of this.entries.values()) {
      if (e.own) URL.revokeObjectURL(e.own)
      // justerte kopier (Avansert modus) frigjøres sammen med bildet når editoren lukkes
      releaseAdjusted(e.img)
      closePic(e.img)
    }
    this.entries.clear()
    this.clearTints()
    this.listeners.clear()
  }
}
