import { useEffect, useState } from 'react'
import type { Asset } from '../../domain/asset'
import type { AssetService } from '../../services/assets/asset-service'

/**
 * Kortlevd object-URL for et asset (miniatyr eller hele filen). URL-en frigjøres når komponenten forsvinner eller
 * assetet byttes, så ingen binærdata blir liggende i minnet (docs/media-model.md §3.7).
 */
export function useAssetUrl(assets: AssetService, asset: Asset | null | undefined, variant: 'thumb' | 'full' = 'thumb'): string | null {
  const id = asset?.id
  const thumb = asset?.thumb
  const key = id ? `${id}|${variant}|${thumb ?? ''}` : null
  const [loaded, setLoaded] = useState<{ key: string; url: string } | null>(null)

  useEffect(() => {
    if (!id || !key) return
    let live = true
    let created: string | null = null
    const load = variant === 'thumb' && thumb ? assets.openThumb(thumb) : assets.open(id)
    load.then(
      (blob) => {
        if (!live || !blob) return
        created = URL.createObjectURL(blob)
        setLoaded({ key, url: created })
      },
      () => {
        // filen mangler: komponenten viser plassholder
      },
    )
    return () => {
      live = false
      if (created) URL.revokeObjectURL(created)
    }
  }, [assets, id, thumb, variant, key])

  // En URL for et annet asset enn det som vises nå, brukes aldri.
  return loaded && loaded.key === key ? loaded.url : null
}
