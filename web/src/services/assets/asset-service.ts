import { canStoreInCloud, kindOfMime, type Asset, type AssetKind, type AssetOrigin, type DerivationOp } from '../../domain/asset'
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

/** Samme filtyper og grense som dagens delte mappe (media-lab/src/legacy/ml-share.js). */
export const ACCEPTED_MIME =
  /^(image\/(png|jpeg|webp|gif|avif|bmp)|video\/(mp4|webm|quicktime|x-m4v)|audio\/(mpeg|mp3|wav|x-wav|wave|mp4|x-m4a|aac|ogg|webm|flac))$/
export const MAX_FILE_BYTES = 2e9

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
}

export interface AssetServiceDeps {
  repo: AssetRepository
  refs: AssetReferences
  probe: MediaProbe
  ownerId: UserId | null
  now?: () => number
}

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

  async function store(blob: Blob, kind: AssetKind) {
    const hash = await sha256(blob)
    if (!(await repo.getBlob(hash))) await repo.putBlob(hash, blob)
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
    if (input.size > MAX_FILE_BYTES) throw new ServiceError('too_large', 'Filen er for stor (maks 2 GB).')
    const kind = kindOfMime(input.type)
    if (!kind) throw new ServiceError('unsupported_type')
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
        const touched = { ...existing, lastUsedAt: now() }
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
      const blob = await repo.getBlob(asset.content.hash)
      if (!blob) throw new ServiceError('content_missing', 'Innholdet til filen mangler i nettleseren.')
      return blob.type ? blob : new Blob([blob], { type: asset.content.mime })
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
