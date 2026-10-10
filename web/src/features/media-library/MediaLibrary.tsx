import { useEffect, useRef, useState, type DragEvent } from 'react'
import { useServices } from '../../app/services'
import { TOOLS } from '../../app/tools'
import { useWorkspace } from '../../app/workspace-factory'
import { describe } from './format'
import type { Asset, AssetKind } from '../../domain/asset'
import { ServiceError } from '../../services/errors'
import type { ImportResult } from '../../services/legacy-import/share-import'
import { useT } from '../../shared/i18n/i18n'
import { toolTitleKey, type MessageKey } from '../../shared/i18n/messages'
import type { ToolId } from '../../domain/tool'
import { useAssetUrl } from '../../shared/media/useAssetUrl'
import { Button } from '../../shared/ui/Button'
import { Icon } from '../../shared/ui/Icon'
import styles from './MediaLibrary.module.css'

type Filter = 'all' | AssetKind
const FILTERS: readonly Filter[] = ['all', 'image', 'video', 'audio']
const KIND_KEY: Record<Filter, MessageKey> = { all: 'media.kind.all', image: 'media.kind.image', video: 'media.kind.video', audio: 'media.kind.audio' }

/**
 * «Dine medier» – det felles biblioteket alle verktøyene bruker (SHR-01, SHR-02). Opplasting, filtrering, sletting
 * (bare når ingen prosjekter bruker filen), «Åpne i …» og import fra dagens delte mappe.
 */
export function MediaLibrary() {
  const t = useT()
  const { router } = useServices()
  const { assets, shareImport } = useWorkspace()
  const [filter, setFilter] = useState<Filter>('all')
  const [text, setText] = useState('')
  const [items, setItems] = useState<Asset[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [pending, setPending] = useState(0)
  const fileInput = useRef<HTMLInputElement>(null)

  // Henter på nytt når filteret endres og når biblioteket endres (assets.revision).
  useEffect(() => {
    let live = true
    const load = () => {
      assets.query({ ...(filter === 'all' ? {} : { kinds: [filter] }), text }).then((rows) => live && setItems(rows))
    }
    load()
    const unsubscribe = assets.revision.subscribe(load)
    return () => {
      live = false
      unsubscribe()
    }
  }, [assets, filter, text])

  useEffect(() => {
    let live = true
    const load = () => {
      shareImport.pending().then((n) => live && setPending(n), () => live && setPending(0))
    }
    load()
    const unsubscribe = assets.revision.subscribe(load)
    return () => {
      live = false
      unsubscribe()
    }
  }, [assets, shareImport])

  async function upload(files: File[]) {
    if (!files.length) return
    setBusy(true)
    let added = 0
    const failed: string[] = []
    for (const f of files) {
      try {
        await assets.register(f)
        added++
      } catch (e) {
        failed.push(`${f.name}: ${e instanceof ServiceError ? e.message : t('media.error.read')}`)
      }
    }
    setBusy(false)
    setMessage(failed.length ? `${t('media.uploaded', { count: added })} ${failed.join(' · ')}` : t('media.uploaded', { count: added }))
  }

  async function runImport() {
    setBusy(true)
    const r: ImportResult = await shareImport.run()
    setBusy(false)
    setMessage(t('media.import.done', { imported: r.imported, failed: r.failed.length }))
  }

  async function remove(a: Asset) {
    if (!confirm(t('media.confirmDelete', { name: a.name }))) return
    const r = await assets.release(a.id)
    setMessage(r === 'in-use' ? t('media.inUse', { name: a.name }) : t('media.deleted', { name: a.name }))
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    void upload(Array.from(e.dataTransfer.files))
  }

  const targets = (a: Asset) => TOOLS.filter((tool) => tool.load && tool.accepts.includes(a.kind))

  return (
    <section
      className={styles.library}
      aria-labelledby="media-title"
      data-dragging={dragging}
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <header className={styles.head}>
        <div>
          <h2 id="media-title" className={styles.title}>{t('media.title')}</h2>
          <p className={styles.lead}>{t('media.lead')}</p>
        </div>
        <Button onClick={() => fileInput.current?.click()} disabled={busy}>{t('media.upload')}</Button>
        <input
          ref={fileInput}
          type="file"
          multiple
          hidden
          accept="image/*,video/*,audio/*"
          onChange={(e) => {
            const files = Array.from(e.currentTarget.files ?? [])
            e.currentTarget.value = ''
            void upload(files)
          }}
        />
      </header>

      {pending > 0 && (
        <div className={styles.banner}>
          <span>{t('media.import.offer', { count: pending })}</span>
          <Button size="small" onClick={() => void runImport()} disabled={busy}>{t('media.import.run')}</Button>
        </div>
      )}

      <div className={styles.toolbar}>
        <div className={styles.filters} role="group" aria-label={t('media.filter')}>
          {FILTERS.map((f) => (
            <button key={f} type="button" className={styles.chip} aria-pressed={filter === f} onClick={() => setFilter(f)}>
              {t(KIND_KEY[f])}
            </button>
          ))}
        </div>
        <input className={styles.search} type="search" value={text} placeholder={t('media.search')} aria-label={t('media.search')} onChange={(e) => setText(e.target.value)} />
      </div>

      {message && <p className={styles.message} role="status">{message}</p>}

      {items.length === 0 ? (
        <p className={styles.empty}>{t('media.empty')}</p>
      ) : (
        <ul className={styles.grid}>
          {items.map((a) => (
            <AssetCard
              key={a.id}
              asset={a}
              targets={targets(a).map((tool) => tool.id)}
              onOpenIn={(tool) => {
                void assets.touch(a.id)
                void router.navigate({ name: 'tool', tool, query: { asset: a.id } })
              }}
              onRemove={() => void remove(a)}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

function AssetCard({ asset, targets, onOpenIn, onRemove }: {
  asset: Asset
  targets: readonly ToolId[]
  onOpenIn: (tool: ToolId) => void
  onRemove: () => void
}) {
  const t = useT()
  const { assets } = useWorkspace()
  const url = useAssetUrl(assets, asset)
  return (
    <li className={styles.card}>
      <div className={styles.preview}>
        {url && asset.thumb ? <img src={url} alt="" loading="lazy" /> : <span className={styles.kind}>{t(KIND_KEY[asset.kind])}</span>}
        {asset.origin.type === 'derived' && <span className={styles.badge}>{t('media.derived')}</span>}
      </div>
      <div className={styles.body}>
        <strong className={styles.name} title={asset.name}>{asset.name}</strong>
        <span className={styles.meta}>{describe(asset)}</span>
        <div className={styles.actions}>
          {targets.map((id) => {
            const label = t('media.openIn', { tool: t(toolTitleKey(id)) })
            return (
              <button key={id} type="button" className={styles.action} onClick={() => onOpenIn(id)} title={label}>
                <Icon name={id} size={16} />
                <span className="visually-hidden">{label}</span>
              </button>
            )
          })}
          <button type="button" className={styles.action} onClick={onRemove} title={t('media.delete')}>
            <Icon name="close" size={16} />
            <span className="visually-hidden">{t('media.delete')}</span>
          </button>
        </div>
      </div>
    </li>
  )
}
