import { useEffect, useRef, useState } from 'react'
import { useServices } from '../../app/services'
import type { CloudFile, CloudFolder } from '../../services/files'
import { activeChurch } from '../../services/shared-setup'
import { ServiceError } from '../../services/errors'
import { useT } from '../../shared/i18n/i18n'
import type { MessageKey } from '../../shared/i18n/messages'
import { useStore } from '../../shared/lib/store'
import { Button } from '../../shared/ui/Button'
import styles from './CloudPicker.module.css'

export type CloudArea = 'faste' | 'ressurser' | 'felles'

const AREAS: readonly [CloudArea, MessageKey, CloudFolder[], MessageKey][] = [
  ['faste', 'cloud.area.faste', ['faste'], 'cloud.empty.faste'],
  ['ressurser', 'cloud.area.ressurser', ['logoer', 'bakgrunner'], 'cloud.empty.ressurser'],
  ['felles', 'cloud.area.felles', ['bilder'], 'cloud.empty.felles'],
]

const UPLOAD_ERRORS: Record<string, MessageKey> = {
  video_not_allowed: 'cloud.error.video', type_not_allowed: 'cloud.error.type', too_large: 'cloud.error.tooLarge',
  quota_exceeded: 'cloud.error.quota', storage_full: 'cloud.error.full', forbidden: 'cloud.error.forbidden',
}

export interface CloudPick { ref: string; id: string; name: string; blob: Blob; uploaded?: boolean }

interface Props {
  title: MessageKey
  start?: CloudArea
  onPick: (pick: CloudPick) => void
  onClose: () => void
}

/**
 * Bildevelgeren «Fellesmappe» (samme som media-lab/src/shared/ch-picker.js): Faste bilder, Felles ressurser og
 * Fellesmappe i brukerens aktive menighet. Valg gir en referanse `ch:<fil-id>` til originalen (ingen kopi).
 * «Last opp» legger nye bilder i Fellesmappe. Tilgangen avgjøres av serveren og databasen.
 */
export function CloudPicker({ title, start = 'faste', onPick, onClose }: Props) {
  const t = useT()
  const { files, auth } = useServices()
  const state = useStore(auth.state)
  const me = state.status === 'ready' ? state.me : null
  const church = activeChurch(me)
  const dialog = useRef<HTMLDialogElement>(null)
  const [area, setArea] = useState<CloudArea>(start)
  const [list, setList] = useState<{ file: CloudFile; url: string }[] | null>(null)
  const [msg, setMsg] = useState<MessageKey | null>('app.loading')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    dialog.current?.showModal?.()
  }, [])

  const churchId = church?.id ?? null
  useEffect(() => {
    if (!churchId || !files.available()) return
    let live = true
    const urls: string[] = []
    const folders = AREAS.find((a) => a[0] === area)?.[2] ?? []
    void (async () => {
      try {
        const lists = await Promise.all(folders.map((f) => files.list(f, churchId)))
        const rows = lists.flat().filter((f) => f.visibility === 'church' && f.church_id === churchId).slice(0, 200)
        const signed: Record<string, string> = {}
        for (let i = 0; i < rows.length; i += 100) Object.assign(signed, await files.urls(rows.slice(i, i + 100).map((f) => f.id)))
        const out: { file: CloudFile; url: string }[] = []
        await Promise.all(rows.map(async (f) => {
          const u = signed[f.id]
          if (!u) return
          try {
            const r = await fetch(u, { signal: AbortSignal.timeout(20000) })
            if (!r.ok) return
            const url = URL.createObjectURL(await r.blob())
            urls.push(url)
            out.push({ file: f, url })
          } catch {
            // et bilde som ikke kan hentes, vises ikke
          }
        }))
        if (!live) return
        out.sort((a, b) => rows.indexOf(a.file) - rows.indexOf(b.file))
        setList(out)
        setMsg(out.length ? null : (AREAS.find((a) => a[0] === area)?.[3] ?? null))
      } catch {
        if (live) setMsg('cloud.error.load')
      }
    })()
    return () => {
      live = false
      for (const u of urls) URL.revokeObjectURL(u)
    }
  }, [area, churchId, files])

  async function choose(f: CloudFile, url: string) {
    try {
      const blob = await (await fetch(url)).blob()
      onPick({ ref: `ch:${f.id}`, id: f.id, name: f.file_name, blob })
      dialog.current?.close()
    } catch {
      setMsg('cloud.error.fetch')
    }
  }

  async function upload(file: File) {
    if (!churchId) return
    setBusy(true)
    setMsg('cloud.uploading')
    try {
      const f = await files.upload(file, { churchId, folder: 'bilder' })
      onPick({ ref: `ch:${f.id}`, id: f.id, name: f.file_name || file.name, blob: file, uploaded: true })
      dialog.current?.close()
    } catch (e) {
      setMsg(UPLOAD_ERRORS[e instanceof ServiceError ? e.code : ''] ?? 'cloud.error.upload')
    } finally {
      setBusy(false)
    }
  }

  const noChurch = !church || !files.available()
  return (
    <dialog ref={dialog} className={styles.dialog} onClose={onClose} aria-labelledby="cloud-title" data-ch-picker="1">
      <header className={styles.head}>
        <h2 id="cloud-title">{t(title)}</h2>
        <Button size="small" onClick={() => dialog.current?.close()}>{t('picker.cancel')}</Button>
      </header>
      {noChurch ? (
        <p className={styles.msg} role="status">{t(files.available() ? 'cloud.noChurch' : 'cloud.offline')}</p>
      ) : (
        <>
          <div className={styles.tabs} role="tablist">
            {AREAS.map(([k, label]) => (
              <button key={k} type="button" role="tab" aria-selected={area === k} className={styles.tab} onClick={() => {
                if (area === k) return
                setList(null)
                setMsg('app.loading')
                setArea(k)
              }}>{t(label)}</button>
            ))}
          </div>
          <div className={styles.bar}>
            <p className={styles.msg} role="status" data-ch-picker-msg="1">
              {msg ? t(msg) : t('cloud.count', { n: list?.length ?? 0 })}
            </p>
            <label className={styles.upload} data-ch-picker-upload="1" aria-disabled={busy}>
              {t('cloud.upload')}
              <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" disabled={busy} onChange={(e) => {
                const f = e.target.files?.[0]
                e.target.value = ''
                if (f) void upload(f)
              }} />
            </label>
          </div>
          <ul className={styles.grid}>
            {list?.map(({ file, url }) => (
              <li key={file.id}>
                <button type="button" className={styles.item} title={file.file_name} data-ch-picker-file={file.file_name} onClick={() => void choose(file, url)}>
                  <span className={styles.thumb} style={{ backgroundImage: `url("${url}")` }} />
                  <span className={styles.name}>{file.file_name}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </dialog>
  )
}
