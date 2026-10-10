import { useEffect, useState } from 'react'
import type { Asset } from '../../domain/asset'
import type { AssetService } from '../../services/assets/asset-service'

/**
 * Kortlevd object-URL for et asset (miniatyr eller hele filen). URL-en frigjøres når komponenten forsvinner eller
 * assetet byttes, så ingen binærdata blir liggende i minnet (docs/media-model.md §3.7).
 */
export function useAssetUrl(assets: AssetService, asset: Asset | null | undefined, variant: 'thumb' | 'full' = 'thumb'): string | null {
  const [url, setUrl] = useState<string | null>(null)
  const id = asset?.id
  const thumb = asset?.thumb

  useEffect(() => {
    if (!id) {
      setUrl(null)
      return
    }
    let live = true
    let created: string | null = null
    const load = variant === 'thumb' && thumb ? assets.openThumb(thumb) : assets.open(id)
    load.then(
      (blob) => {
        if (!live || !blob) return
        created = URL.createObjectURL(blob)
        setUrl(created)
      },
      () => live && setUrl(null),
    )
    return () => {
      live = false
      if (created) URL.revokeObjectURL(created)
    }
  }, [assets, id, thumb, variant])

  return url
}
