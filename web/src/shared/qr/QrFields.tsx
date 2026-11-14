import { useT } from '../i18n/i18n'
import type { MessageKey } from '../i18n/messages'
import { QR_KINDS, type QrKind, type QrSpec } from './qr'
import s from './QrFields.module.css'

const KEYS: Record<QrKind, [MessageKey, MessageKey, MessageKey]> = {
  url: ['qr.k.url', 'qr.f.url', 'qr.h.url'],
  email: ['qr.k.email', 'qr.f.email', 'qr.h.email'],
  tel: ['qr.k.tel', 'qr.f.tel', 'qr.h.tel'],
  sms: ['qr.k.sms', 'qr.f.sms', 'qr.h.sms'],
  text: ['qr.k.text', 'qr.f.text', 'qr.h.text'],
}

/**
 * QR-kode: type, innhold, emne/tekst og farger – samme valg og tekster som «QR-kode og kontakt» i Loop Studio.
 * Brukes i Photo Design, Thumbnail Studio og Motion Design. `onChange` får endringene; koden lages av studioet.
 */
export function QrFields({ value, onChange }: { value: QrSpec; onChange: (p: Partial<QrSpec>) => void }) {
  const t = useT()
  const k = KEYS[value.kind] ?? KEYS.url
  const def = QR_KINDS[value.kind] ?? QR_KINDS.url
  const hasExtra = value.kind === 'email' || value.kind === 'sms'
  return (
    <div className={s.box} data-qr-fields="">
      <div className={s.kinds} role="group" aria-label={t('qr.kind')}>
        {(Object.keys(QR_KINDS) as QrKind[]).map((q) => (
          <button key={q} type="button" aria-pressed={value.kind === q} onClick={() => onChange({ kind: q })}>{t(KEYS[q][0])}</button>
        ))}
      </div>
      <label className={s.field}>
        <span>{t(k[1])}</span>
        <input value={value.val} placeholder={def[2]} inputMode={def[3] === 'tel' ? 'tel' : def[3] === 'email' ? 'email' : def[3] === 'url' ? 'url' : 'text'} data-qr-val="" onChange={(e) => onChange({ val: e.target.value.slice(0, 600) })} />
      </label>
      {hasExtra && (
        <label className={s.field}>
          <span>{t(value.kind === 'email' ? 'qr.subject' : 'qr.body')}</span>
          <input value={value.extra ?? ''} onChange={(e) => onChange({ extra: e.target.value.slice(0, 300) })} />
        </label>
      )}
      <span className={s.hint}>{value.val.trim() ? t(k[2]) : t('qr.empty')}</span>
      {value.val.trim() && !value.rows && <span className={s.warn}>{t('qr.tooLong')}</span>}
      <div className={s.colors}>
        <label><span>{t('qr.fg')}</span><input type="color" value={value.fg} onChange={(e) => onChange({ fg: e.target.value })} /></label>
        <label><span>{t('qr.bg')}</span><input type="color" value={value.bg ?? '#ffffff'} disabled={value.bg == null} onChange={(e) => onChange({ bg: e.target.value })} /></label>
        <label className={s.check}><input type="checkbox" checked={value.bg == null} onChange={(e) => onChange({ bg: e.target.checked ? null : '#ffffff' })} /><span>{t('qr.noBg')}</span></label>
      </div>
      <span className={s.hint}>{t('qr.scan')}</span>
    </div>
  )
}
