import { useEffect, useRef, useState } from 'react'
import { useWorkspace } from '../../app/workspace-factory'
import type { Asset, AssetKind } from '../../domain/asset'
import { useT } from '../../shared/i18n/i18n'
import { useAssetUrl } from '../../shared/media/useAssetUrl'
import { Button } from '../../shared/ui/Button'
import styles from './AssetPicker.module.css'
import { describe } from './format'

interface AssetPickerProps {
  kinds: readonly AssetKind[]
  onPick: (asset: Asset) => void
  onClose: () => void
}

/**
 * Velger fra «Dine medier» (SHR-02): alle verktøy henter medier herfra uten ny opplasting.
 * Vises som en modal dialog (<dialog>), lukkes med Esc eller «Avbryt».
 */
export function AssetPicker({ kinds, onPick, onClose }: AssetPickerProps) {
  const t = useT()
  const { assets } = useWorkspace()
  const dialog = useRef<HTMLDialogElement>(null)
  const [items, setItems] = useState<Asset[] | null>(null)

  useEffect(() => {
    dialog.current?.showModal?.()
    let live = true
    assets.query({ kinds }).then((rows) => live && setItems(rows))
    return () => {
      live = false
    }
  }, [assets, kinds])

  return (
    <dialog ref={dialog} className={styles.dialog} onClose={onClose} aria-labelledby="picker-title">
      <header className={styles.head}>
        <h2 id="picker-title">{t('media.title')}</h2>
        <Button size="small" onClick={() => dialog.current?.close()}>{t('picker.cancel')}</Button>
      </header>
      {items && items.length === 0 && <p className={styles.empty}>{t('picker.empty')}</p>}
      <ul className={styles.grid}>
        {items?.map((a) => (
          <li key={a.id}>
            <PickItem asset={a} onPick={() => {
              void assets.touch(a.id)
              onPick(a)
              dialog.current?.close()
            }} />
          </li>
        ))}
      </ul>
    </dialog>
  )
}

function PickItem({ asset, onPick }: { asset: Asset; onPick: () => void }) {
  const { assets } = useWorkspace()
  const url = useAssetUrl(assets, asset)
  return (
    <button type="button" className={styles.item} onClick={onPick}>
      <span className={styles.thumb}>{url && <img src={url} alt="" />}</span>
      <span className={styles.name}>{asset.name}</span>
      <span className={styles.meta}>{describe(asset)}</span>
    </button>
  )
}
