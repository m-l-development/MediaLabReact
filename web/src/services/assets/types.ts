import type { Asset } from '../../domain/asset'
import type { AssetId, ContentHash, ProjectId } from '../../domain/ids'

/** Lagringsgrensesnittet for assets og innhold (implementert i infrastructure/idb/media-db.ts). */
export interface AssetRepository {
  putAsset(asset: Asset): Promise<void>
  getAsset(id: AssetId): Promise<Asset | undefined>
  listAssets(): Promise<Asset[]>
  findByHash(hash: ContentHash): Promise<Asset[]>
  deleteAsset(id: AssetId): Promise<void>
  putBlob(hash: ContentHash, blob: Blob): Promise<void>
  getBlob(hash: ContentHash): Promise<Blob | undefined>
  deleteBlob(hash: ContentHash): Promise<void>
}

/** Gir hvilke prosjekter (eller bibliotekselementer) som bruker et asset – brukes før sletting. */
export interface AssetReferences {
  usedBy(id: AssetId): Promise<ProjectId[]>
}

/** Leser metadata og lager miniatyr i nettleseren (infrastructure/media-probe.ts). Injiseres, så tjenesten kan testes. */
export interface MediaProbe {
  probe(blob: Blob, kind: Asset['kind']): Promise<{ meta: Asset['meta']; thumb?: Blob }>
}
