import { useAdmin } from './context'
import { initials } from './lib'
import { Select } from './ui'

/** Menighetsvelger for seksjoner som gjelder én menighet. onlyMine (Filer): bare menigheter brukeren er medlem av. */
export function ChurchPicker({ onlyMine }: { onlyMine?: boolean }) {
  const { d, me, adminOf, ctxChurch, setCtxChurch } = useAdmin()
  const mine = new Set([...me.churches.map((c) => c.id), ...adminOf])
  const list = d.churches.filter((c) => c.status === 'active' && (!onlyMine || mine.has(c.id)))
  if (list.length < 2) return null
  return <Select label="Menighet" value={(list.some((c) => c.id === ctxChurch) ? ctxChurch : list[0]?.id) || ''} onChange={setCtxChurch} options={list.map((c) => [c.id, c.name] as const)} />
}

export function ChurchLogo({ url, name, size = 40 }: { url: string | null | undefined; name: string; size?: number }) {
  const s = { width: size, height: size, borderRadius: Math.round(size / 4), flex: '0 0 auto' }
  return url
    ? <img src={url} alt="" data-ch-logo="" style={{ ...s, objectFit: 'contain', background: '#fff', border: '1px solid var(--line)' }} />
    : <span className="ch-avatar" aria-hidden="true" data-ch-logo-fallback="" style={{ ...s, display: 'grid', placeItems: 'center', fontSize: Math.round(size / 2.8) }}>{initials(name)}</span>
}

export function Head({ title, sub, right, crumb }: { title: string; sub?: string | undefined; right?: React.ReactNode; crumb?: React.ReactNode }) {
  const { t } = useAdmin()
  return (
    <div className="ch-head">
      <div>{crumb && <div className="ch-crumb">{crumb}</div>}<h1>{t(title)}</h1>{sub && <div className="ch-sub">{t(sub)}</div>}</div>
      {right && <div className="ch-actions">{right}</div>}
    </div>
  )
}
