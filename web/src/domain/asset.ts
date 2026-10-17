import { isContentHash, isUuid, type AssetId, type ContentHash, type UserId } from './ids'
import { isToolId, type ToolId } from './tool'
import {
  array, boolean, isRecord, literal, number, object, optional, refine, string, unknownValue,
  type Validation, type Validator,
} from './validation'

/** Se docs/media-model.md. */
export const ASSET_KINDS = ['image', 'video', 'audio'] as const
export type AssetKind = (typeof ASSET_KINDS)[number]

export interface DerivationOp {
  /** F.eks. 'isolate', 'crop', 'export', 'mockup'. */
  name: string
  params?: Record<string, unknown>
}

export type AssetOrigin =
  | { type: 'upload' }
  | { type: 'generated'; tool: ToolId }
  | { type: 'derived'; tool: ToolId; from: AssetId; operation: DerivationOp }
  | { type: 'cloud'; fileId: string }
  | { type: 'builtin'; path: string }

export type StorageLocation =
  | { type: 'local' }
  | { type: 'project-folder'; folderId: string; path: string }
  | { type: 'cloud'; fileId: string }
  | { type: 'url'; url: string }

export interface AssetContent {
  hash: ContentHash
  mime: string
  size: number
}

export interface AssetMeta {
  width?: number
  height?: number
  /** Sekunder (video og lyd). */
  duration?: number
  hasAlpha?: boolean
}

export interface Asset {
  id: AssetId
  kind: AssetKind
  name: string
  content: AssetContent
  meta: AssetMeta
  origin: AssetOrigin
  locations: StorageLocation[]
  ownerId: UserId | null
  createdAt: number
  /** Sist åpnet eller brukt (for «nylig brukt»). */
  lastUsedAt?: number
  thumb?: ContentHash
  /** Kilde ved import fra dagens app, f.eks. { source: 'medialab-share', id: 's-…' }. */
  legacy?: { source: string; id: string }
}

export function kindOfMime(mime: string): AssetKind | null {
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('audio/')) return 'audio'
  return null
}

/** Regel fra prosjektkravene (SHR-08): video og lyd lagres aldri i skyen. */
export function canStoreInCloud(kind: AssetKind): boolean {
  return kind === 'image'
}

const assetId: Validator<AssetId> = (input, path = '') =>
  isUuid(input) ? { ok: true, value: input as AssetId } : { ok: false, errors: [`${path}: ugyldig ID`] }

const contentHash: Validator<ContentHash> = (input, path = '') =>
  isContentHash(input) ? { ok: true, value: input } : { ok: false, errors: [`${path}: ugyldig innholds-hash`] }

const toolId: Validator<ToolId> = (input, path = '') =>
  isToolId(input) ? { ok: true, value: input } : { ok: false, errors: [`${path}: ukjent verktøy`] }

const nonNegative = (v: Validator<number>) => refine(v, (n) => n >= 0, 'kan ikke være negativ')

const derivationOp = object({
  name: string,
  params: optional((input, path = '') =>
    isRecord(input) ? { ok: true, value: input } : { ok: false, errors: [`${path}: forventet objekt`] }),
})

const origin: Validator<AssetOrigin> = (input, path = '') => {
  if (!isRecord(input)) return { ok: false, errors: [`${path}: forventet objekt`] }
  switch (input.type) {
    case 'upload':
      return { ok: true, value: { type: 'upload' } }
    case 'generated':
      return object({ type: literal('generated'), tool: toolId })(input, path)
    case 'derived':
      return object({ type: literal('derived'), tool: toolId, from: assetId, operation: derivationOp })(input, path) as Validation<AssetOrigin>
    case 'cloud':
      return object({ type: literal('cloud'), fileId: string })(input, path)
    case 'builtin':
      return object({ type: literal('builtin'), path: string })(input, path)
    default:
      return { ok: false, errors: [`${path}.type: ukjent opphav`] }
  }
}

const location: Validator<StorageLocation> = (input, path = '') => {
  if (!isRecord(input)) return { ok: false, errors: [`${path}: forventet objekt`] }
  switch (input.type) {
    case 'local':
      return { ok: true, value: { type: 'local' } }
    case 'project-folder':
      return object({ type: literal('project-folder'), folderId: string, path: string })(input, path)
    case 'cloud':
      return object({ type: literal('cloud'), fileId: string })(input, path)
    case 'url':
      return object({ type: literal('url'), url: string })(input, path)
    default:
      return { ok: false, errors: [`${path}.type: ukjent lagringssted`] }
  }
}

const baseAsset = object({
  id: assetId,
  kind: literal(...ASSET_KINDS),
  name: string,
  content: object({ hash: contentHash, mime: string, size: nonNegative(number) }),
  meta: object({
    width: optional(nonNegative(number)),
    height: optional(nonNegative(number)),
    duration: optional(nonNegative(number)),
    hasAlpha: optional(boolean),
  }),
  origin,
  locations: array(location),
  ownerId: unknownValue,
  createdAt: number,
  lastUsedAt: optional(number),
  thumb: optional(contentHash),
  legacy: optional(object({ source: string, id: string })),
})

/** Validerer et asset fra lagring eller import, inkludert reglene i docs/media-model.md §3. */
export function validateAsset(input: unknown): Validation<Asset> {
  const r = baseAsset(input, 'asset')
  if (!r.ok) return r
  const a = r.value
  const errors: string[] = []
  if (a.ownerId !== null && typeof a.ownerId !== 'string') errors.push('asset.ownerId: forventet tekst eller null')
  if (!canStoreInCloud(a.kind) && a.locations.some((l) => l.type === 'cloud')) {
    errors.push('asset.locations: video og lyd kan ikke lagres i skyen')
  }
  if (a.origin.type === 'derived' && a.origin.from === a.id) errors.push('asset.origin.from: kan ikke være avledet av seg selv')
  if (a.locations.length === 0) errors.push('asset.locations: mangler lagringssted')
  return errors.length ? { ok: false, errors } : { ok: true, value: a as Asset }
}
