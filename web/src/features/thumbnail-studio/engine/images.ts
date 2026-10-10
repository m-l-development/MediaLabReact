import { ASSETS, srcsOf, type Doc } from './model'

/** Henter en kilde (`m:`, `ch:`, `db:` …) som Blob. `null` = finnes ikke eller ingen tilgang. */
export type SrcResolver = (src: string) => Promise<Blob | null>

export interface LoadedImage { img: HTMLImageElement; url: string }

interface Entry { p: Promise<LoadedImage | null>; img?: HTMLImageElement; url?: string; own?: string; ok?: boolean; fail?: boolean }

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
    const urlP: Promise<string | null> = src.startsWith('asset:')
      ? Promise.resolve(ASSETS[src.slice(6)]?.url ?? null)
      : this.resolve(src).then((b) => (b ? (e.own = URL.createObjectURL(b)) : null), () => null)
    e.p = urlP.then((url) => new Promise<LoadedImage | null>((res) => {
      if (!url) {
        e.fail = true
        return res(null)
      }
      const im = new Image()
      im.decoding = 'async'
      im.onload = () => {
        e.img = im
        e.url = url
        e.ok = true
        this.notify()
        res({ img: im, url })
      }
      im.onerror = () => {
        e.fail = true
        res(null)
      }
      im.src = url
    }))
    return e.p
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
    if (this.tints.size > 40) this.tints.clear()
    this.tints.set(key, c)
    return c
  }

  /** Glemmer en kilde (f.eks. etter gjenoppretting) så den lastes på nytt neste gang. */
  forget(src: string): void {
    const e = this.entries.get(src)
    if (e?.own) URL.revokeObjectURL(e.own)
    this.entries.delete(src)
  }

  dispose(): void {
    for (const e of this.entries.values()) if (e.own) URL.revokeObjectURL(e.own)
    this.entries.clear()
    this.tints.clear()
    this.listeners.clear()
  }
}
