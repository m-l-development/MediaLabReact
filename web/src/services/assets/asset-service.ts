import { canStoreInCloud, kindOfMime, type Asset, type AssetKind, type AssetOrigin, type DerivationOp, type StorageLocation } from '../../domain/asset'
import { newId, type AssetId, type ContentHash, type UserId } from '../../domain/ids'
import type { ToolId } from '../../domain/tool'
import { createStore, type Store } from '../../shared/lib/store'
import { ServiceError } from '../errors'
import { sha256 } from './hash'
import type { AssetReferences, AssetRepository, MediaProbe } from './types'

/**
 * Felles mediebibliotek for alle verktøy (docs/media-model.md). Regler:
 * - Originaler endres aldri; nye versjoner registreres med `derive` og peker på originalen.
 * - Samme innhold lagres én gang (SHA-256). Samme opplastede fil gir samme asset.
 * - Sletting bare når ingen prosjekter bruker assetet.
 * - Video og lyd lagres aldri i skyen.
 */

/** Samme filtyper som dagens delte mappe (media-lab/src/legacy/ml-share.js) og Motion design. */
export const ACCEPTED_MIME =
  /^(image\/(png|jpeg|webp|gif|avif|bmp)|video\/(mp4|webm|quicktime|x-m4v)|audio\/(mpeg|mp3|wav|x-wav|wave|mp4|x-m4a|aac|ogg|webm|flac|x-flac))$/
/** Grense per fil: 2 GB som i dagens delte mappe, men video opp til 4 GB som i Motion design. */
export const MAX_FILE_BYTES = 2e9
export const MAX_VIDEO_BYTES = 4e9

export interface AssetQuery {
  kinds?: readonly AssetKind[]
  origins?: readonly AssetOrigin['type'][]
  text?: string
  limit?: number
  /** 'recent' = sist brukt først (standard), 'created' = nyeste først. */
  order?: 'recent' | 'created'
}

export interface AssetService {
  /** Versjon som øker ved hver endring – komponenter kan abonnere og hente på nytt. */
  revision: Store<number>
  register(input: Blob, opts?: { name?: string; origin?: AssetOrigin; legacy?: Asset['legacy']; createdAt?: number }): Promise<Asset>
  derive(from: AssetId, result: Blob, operation: DerivationOp, tool: ToolId, name?: string): Promise<Asset>
  get(id: AssetId): Promise<Asset | undefined>
  query(q?: AssetQuery): Promise<Asset[]>
  open(id: AssetId): Promise<Blob>
  openThumb(thumb: ContentHash): Promise<Blob | undefined>
  /** Kjeden fra originalen til dette assetet (originalen først). */
  lineage(id: AssetId): Promise<Asset[]>
  touch(id: AssetId): Promise<void>
  rename(id: AssetId, name: string): Promise<void>
  release(id: AssetId): Promise<'deleted' | 'in-use'>
  /**
   * Registrerer en fil som allerede ligger et annet sted enn i nettleseren (f.eks. en prosjektmappe på PC-en).
   * Bare miniatyren lagres i nettleseren. Finnes innholdet fra før, får det eksisterende assetet stedet i tillegg.
   */
  registerAt(input: Blob, location: StorageLocation, opts?: { name?: string; legacy?: Asset['legacy'] }): Promise<Asset>
  /** Legger til et sted der innholdet også ligger (f.eks. etter kopiering til en prosjektmappe). */
  addLocation(id: AssetId, location: StorageLocation): Promise<void>
  /** Om innholdet ligger i nettleseren. */
  hasLocalCopy(id: AssetId): Promise<boolean>
  /**
   * Fjerner kopien i nettleseren når innholdet også ligger et annet sted (f.eks. i prosjektmappen).
   * Gjør ingenting hvis assetet ikke har noe annet sted. → om kopien ble fjernet.
   */
  dropLocalCopy(id: AssetId): Promise<boolean>
}

/** Leser innhold som ligger utenfor nettleseren (prosjektmappe). */
export interface ExternalReader {
  read(location: StorageLocation): Promise<Blob | undefined>
}

export interface AssetServiceDeps {
  repo: AssetRepository
  refs: AssetReferences
  probe: MediaProbe
  ownerId: UserId | null
  now?: () => number
  external?: ExternalReader
}

const sameLocation = (a: StorageLocation, b: StorageLocation) => JSON.stringify(a) === JSON.stringify(b)

function safeName(name: string | undefined, fallback: string): string {
  // Kontrolltegn og tegn som ikke er lov i filnavn byttes med mellomrom (samme regel som dagens delte mappe).
  const noControl = [...String(name ?? '')].map((c) => (c.charCodeAt(0) < 32 ? ' ' : c)).join('')
  const clean = noControl.replace(/[<>:"/\\|?*]+/g, ' ').trim().slice(0, 120)
  return clean || fallback
}

export function createAssetService(deps: AssetServiceDeps): AssetService {
  const { repo, refs, probe, ownerId } = deps
  const now = deps.now ?? Date.now
  const revision = createStore(0)
  const bump = () => revision.set((n) => n + 1)

  async function store(blob: Blob, kind: AssetKind, keepContent = true) {
    const hash = await sha256(blob)
    if (keepContent && !(await repo.getBlob(hash))) await repo.putBlob(hash, blob)
    const { meta, thumb } = await probe.probe(blob, kind).catch(() => ({ meta: {}, thumb: undefined }))
    let thumbHash
    if (thumb) {
      thumbHash = await sha256(thumb)
      if (!(await repo.getBlob(thumbHash))) await repo.putBlob(thumbHash, thumb)
    }
    return { hash, meta, thumbHash }
  }

  function validateInput(input: Blob): AssetKind {
    if (!ACCEPTED_MIME.test(input.type)) throw new ServiceError('unsupported_type', `Filtypen støttes ikke: ${input.type || 'ukjent'}`)
    const kind = kindOfMime(input.type)
    if (!kind) throw new ServiceError('unsupported_type')
    if (input.size > (kind === 'video' ? MAX_VIDEO_BYTES : MAX_FILE_BYTES)) {
      throw new ServiceError('too_large', kind === 'video' ? 'Filen er for stor (maks 4 GB).' : 'Filen er for stor (maks 2 GB).')
    }
    return kind
  }

  async function register(input: Blob, opts: Parameters<AssetService['register']>[1] = {}): Promise<Asset> {
    const kind = validateInput(input)
    const origin: AssetOrigin = opts.origin ?? { type: 'upload' }
    if (origin.type === 'cloud' && !canStoreInCloud(kind)) {
      throw new ServiceError('cloud_video_forbidden', 'Video og lyd lagres aldri i skyen.')
    }
    const { hash, meta, thumbHash } = await store(input, kind)
    // Samme opplastede fil to ganger gir samme asset (ingen duplikater i biblioteket).
    if (origin.type === 'upload') {
      const existing = (await repo.findByHash(hash)).find((a) => a.origin.type === 'upload')
      if (existing) {
        // Innholdet ligger nå i nettleseren igjen (også om kopien var fjernet til fordel for en prosjektmappe).
        const local = existing.locations.some((l) => l.type === 'local')
        const touched: Asset = { ...existing, lastUsedAt: now(), locations: local ? existing.locations : [{ type: 'local' }, ...existing.locations] }
        await repo.putAsset(touched)
        bump()
        return touched
      }
    }
    const fileName = input instanceof File ? input.name : undefined
    const asset: Asset = {
      id: newId<AssetId>(),
      kind,
      name: safeName(opts.name ?? fileName, kind === 'image' ? 'Bilde' : kind === 'video' ? 'Video' : 'Lyd'),
      content: { hash, mime: input.type, size: input.size },
      meta,
      origin,
      locations: [{ type: 'local' }],
      ownerId,
      createdAt: opts.createdAt ?? now(),
      lastUsedAt: now(),
      ...(thumbHash ? { thumb: thumbHash } : {}),
      ...(opts.legacy ? { legacy: opts.legacy } : {}),
    }
    await repo.putAsset(asset)
    bump()
    return asset
  }

  return {
    revision,
    register,

    async derive(from, result, operation, tool, name) {
      const original = await repo.getAsset(from)
      if (!original) throw new ServiceError('not_found', 'Originalen finnes ikke.')
      return register(result, {
        name: name ?? `${original.name.replace(/\.[^.]+$/, '')} (${operation.name})`,
        origin: { type: 'derived', tool, from, operation },
      })
    },

    get: (id) => repo.getAsset(id),

    async query(q = {}) {
      const text = q.text?.trim().toLowerCase()
      const order = q.order ?? 'recent'
      const rows = (await repo.listAssets())
        .filter((a) => !q.kinds || q.kinds.includes(a.kind))
        .filter((a) => !q.origins || q.origins.includes(a.origin.type))
        .filter((a) => !text || a.name.toLowerCase().includes(text))
        .sort((a, b) => order === 'created' ? b.createdAt - a.createdAt : (b.lastUsedAt ?? b.createdAt) - (a.lastUsedAt ?? a.createdAt))
      return q.limit ? rows.slice(0, q.limit) : rows
    },

    async open(id) {
      const asset = await repo.getAsset(id)
      if (!asset) throw new ServiceError('not_found')
      let blob = await repo.getBlob(asset.content.hash)
      // Ligger filen bare i en prosjektmappe, leses den derfra (krever at brukeren har gitt tilgang til mappen).
      for (const loc of asset.locations) {
        if (blob || loc.type !== 'project-folder' || !deps.external) continue
        blob = await deps.external.read(loc).catch(() => undefined)
      }
      if (!blob) {
        const inFolder = asset.locations.some((l) => l.type === 'project-folder')
        throw new ServiceError('content_missing', inFolder ? 'Filen ligger i en prosjektmappe som nettleseren ikke har tilgang til nå.' : 'Innholdet til filen mangler i nettleseren.')
      }
      return blob.type ? blob : new Blob([blob], { type: asset.content.mime })
    },

    async registerAt(input, location, opts = {}) {
      const kind = validateInput(input)
      const { hash, meta, thumbHash } = await store(input, kind, false)
      const existing = (await repo.findByHash(hash))[0]
      if (existing) {
        if (!existing.locations.some((l) => sameLocation(l, location))) {
          await repo.putAsset({ ...existing, locations: [...existing.locations, location], lastUsedAt: now() })
          bump()
        }
        return (await repo.getAsset(existing.id)) ?? existing
      }
      const fileName = input instanceof File ? input.name : undefined
      const asset: Asset = {
        id: newId<AssetId>(),
        kind,
        name: safeName(opts.name ?? fileName, kind === 'image' ? 'Bilde' : kind === 'video' ? 'Video' : 'Lyd'),
        content: { hash, mime: input.type, size: input.size },
        meta,
        origin: { type: 'upload' },
        locations: [location],
        ownerId,
        createdAt: now(),
        lastUsedAt: now(),
        ...(thumbHash ? { thumb: thumbHash } : {}),
        ...(opts.legacy ? { legacy: opts.legacy } : {}),
      }
      await repo.putAsset(asset)
      bump()
      return asset
    },

    async addLocation(id, location) {
      const asset = await repo.getAsset(id)
      if (!asset) throw new ServiceError('not_found')
      if (asset.kind !== 'image' && location.type === 'cloud') throw new ServiceError('cloud_video_forbidden', 'Video og lyd lagres aldri i skyen.')
      if (asset.locations.some((l) => sameLocation(l, location))) return
      await repo.putAsset({ ...asset, locations: [...asset.locations, location] })
      bump()
    },

    async hasLocalCopy(id) {
      const asset = await repo.getAsset(id)
      return !!asset && !!(await repo.getBlob(asset.content.hash))
    },

    async dropLocalCopy(id) {
      const asset = await repo.getAsset(id)
      if (!asset || !asset.locations.some((l) => l.type !== 'local' && l.type !== 'url')) return false
      await repo.putAsset({ ...asset, locations: asset.locations.filter((l) => l.type !== 'local') })
      // Innholdet slettes bare når ingen andre assets fortsatt har det i nettleseren.
      const others = (await repo.findByHash(asset.content.hash)).some((a) => a.id !== id && a.locations.some((l) => l.type === 'local'))
      if (!others) await repo.deleteBlob(asset.content.hash)
      bump()
      return true
    },

    openThumb: (thumb) => repo.getBlob(thumb),

    async lineage(id) {
      const chain: Asset[] = []
      const seen = new Set<string>()
      let current = await repo.getAsset(id)
      while (current && !seen.has(current.id)) {
        seen.add(current.id)
        chain.unshift(current)
        current = current.origin.type === 'derived' ? await repo.getAsset(current.origin.from) : undefined
      }
      return chain
    },

    async touch(id) {
      const asset = await repo.getAsset(id)
      if (!asset) return
      await repo.putAsset({ ...asset, lastUsedAt: now() })
      bump()
    },

    async rename(id, name) {
      const asset = await repo.getAsset(id)
      if (!asset) throw new ServiceError('not_found')
      await repo.putAsset({ ...asset, name: safeName(name, asset.name) })
      bump()
    },

    async release(id) {
      const asset = await repo.getAsset(id)
      if (!asset) return 'deleted'
      if ((await refs.usedBy(id)).length > 0) return 'in-use'
      // Avledede versjoner beholder sin egen kopi av innholdet; referansen til originalen blir bare stående.
      await repo.deleteAsset(id)
      for (const hash of [asset.content.hash, asset.thumb]) {
        if (!hash) continue
        const others = (await repo.listAssets()).some((a) => a.content.hash === hash || a.thumb === hash)
        if (!others) await repo.deleteBlob(hash)
      }
      bump()
      return 'deleted'
    },
  }
}
