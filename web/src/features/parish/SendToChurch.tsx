import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useServices } from '../../app/services'
import { ServiceError } from '../../services/errors'
import { INBOX_MAX_FILES, inboxAccept, sendProblem, type ParishTarget } from '../../services/parish'
import { useT } from '../../shared/i18n/i18n'
import { POPUP_ATTR } from '../../shared/lib/popup'
import { Button } from '../../shared/ui/Button'
import s from './Parish.module.css'

export type SendFile = Blob & { name: string }
const mb = (n: number) => (n / 1048576).toFixed(1).replace('.', ',') + ' MB'

/**
 * «Send til menighet»: velg menighet (dine menigheter med en Menighetsbruker), legg til én eller flere filer og send.
 * Filene havner i menighetens innboks. Brukes fra innboks-siden, Dine medier og eksporten i Thumbnail Studio.
 * `files` = filer som allerede er valgt (f.eks. plakaten fra Thumbnail Studio), eller en funksjon som lager dem.
 */
export function SendToChurch({ files: initial, onClose }: { files?: SendFile[] | (() => Promise<SendFile[]>); onClose: () => void }) {
  const t = useT()
  const { parish } = useServices()
  const [targets, setTargets] = useState<ParishTarget[] | null>(null)
  const [church, setChurch] = useState('')
  const [files, setFiles] = useState<SendFile[]>(Array.isArray(initial) ? initial : [])
  const [busy, setBusy] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<{ n: number; church: string } | null>(null)
  const [over, setOver] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let live = true
    parish?.targets().then((l) => { if (live) { setTargets(l); setChurch(l[0]?.church_id ?? '') } }, () => { if (live) setTargets([]) })
    if (typeof initial === 'function') initial().then((f) => { if (live) setFiles(f) }, (e: unknown) => { if (live) setError(String(e instanceof Error ? e.message : e)) })
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- lastes én gang ved åpning
  }, [parish])
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    box.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && busy === null) onClose() }
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); prev?.focus?.() }
  }, [busy, onClose])

  const add = (list: FileList | File[] | null) => {
    if (!list) return
    setError(null)
    setDone(null)
    const next = [...files]
    for (const f of Array.from(list)) {
      const p = sendProblem(f)
      if (p) { setError(t(p === 'type' ? 'send.err.type' : 'send.err.size', { name: f.name })); continue }
      if (next.length >= INBOX_MAX_FILES) { setError(t('send.err.count')); break }
      next.push(f)
    }
    setFiles(next)
  }
  const target = targets?.find((x) => x.church_id === church)
  async function send() {
    if (!parish || !target || !files.length) return
    for (const f of files) { const p = sendProblem(f); if (p) { setError(t(p === 'type' ? 'send.err.type' : 'send.err.size', { name: f.name })); return } }
    setBusy(0)
    setError(null)
    try {
      const n = await parish.send(target.church_id, files, (i) => setBusy(i))
      setDone({ n, church: target.church_name })
      setFiles([])
    } catch (e) {
      const code = e instanceof ServiceError ? e.code : 'unknown'
      setError(code === 'quota_exceeded' || code === 'rate_limited' ? t('send.err.quota') : code === 'type_not_allowed' ? t('send.err.type', { name: '' }) : t('send.err.generic', { code }))
    } finally {
      setBusy(null)
    }
  }

  return createPortal(
    <div className={s.back} {...{ [POPUP_ATTR]: '' }} data-ch-send="" onClick={() => { if (busy === null) onClose() }}>
      <div className={s.dialog} role="dialog" aria-modal="true" aria-labelledby="send-title" tabIndex={-1} ref={box} onClick={(e) => e.stopPropagation()}
        onDragOver={(e) => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); add(e.dataTransfer.files) }}>
        <h2 id="send-title" className={s.title}>{t('send.title')}</h2>
        <p className={s.lead}>{t('send.lead')}</p>
        {targets === null ? <p className={s.small}>…</p> : targets.length === 0 ? (
          <p className={s.error} data-ch-send-none="">{t('send.none')}</p>
        ) : (
          <>
            <label className={s.label}>
              {t('send.church')}
              <select className={s.select} value={church} onChange={(e) => setChurch(e.target.value)} data-ch-send-church="">
                {targets.map((x) => <option key={x.church_id} value={x.church_id}>{x.church_name}</option>)}
              </select>
            </label>
            {target && <p className={s.small} data-ch-send-to="">{t('send.to', { name: target.church_name })} <span className={s.badge}>{t('parish.badge')}</span></p>}
            <div className={s.drop} data-over={over}>
              <span className={s.small}>{t('send.drop')}</span>
              <Button onClick={() => input.current?.click()} disabled={busy !== null}>{t('send.pick')}</Button>
              <input ref={input} type="file" multiple hidden accept={inboxAccept} data-ch-send-input="" onChange={(e) => { add(e.target.files); e.target.value = '' }} />
            </div>
            {files.length > 0 && (
              <ul className={s.files}>
                {files.map((f, i) => (
                  <li key={i + f.name} className={s.file}>
                    <b title={f.name}>{f.name}</b><span className={s.small}>{mb(f.size)}</span>
                    <button type="button" className={s.linkBtn} disabled={busy !== null} onClick={() => setFiles(files.filter((_, j) => j !== i))}>{t('send.remove')}</button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
        {error && <p className={s.error} role="alert">{error}</p>}
        {done && <p className={s.ok} role="status" data-ch-send-done="">{t('send.done', { n: done.n, church: done.church })}</p>}
        <div className={s.row}>
          <Button onClick={onClose} disabled={busy !== null}>{done ? t('send.close') : t('send.cancel')}</Button>
          {!!targets?.length && (
            <Button variant="primary" disabled={busy !== null || !files.length || !target} onClick={() => void send()} data-ch-send-go="">
              {busy !== null ? t('send.sending', { i: Math.min(busy + 1, files.length), n: files.length }) : t('send.send', { n: files.length })}
            </Button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
