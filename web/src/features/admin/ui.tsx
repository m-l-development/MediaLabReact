import { useEffect, useRef, useState, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from 'react'
import { initials, ROLE, STATUS, TONE, useAdminT } from './lib'

/** Felles byggeklosser for ConnectHub Admin, portert fra media-lab/src/pages/connecthub-admin/ui.jsx. Stil i admin.css. */

/**
 * Knapp med straks synlig respons: returnerer klikk-handlingen et løfte, viser knappen at den jobber, og nye klikk
 * ignoreres til den er ferdig (hindrer dobbel innsending uten å låse resten av siden).
 */
export function Btn({ kind, small, children, onClick, ...p }: { kind?: string; small?: boolean; onClick?: (e: React.MouseEvent<HTMLButtonElement>) => unknown } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'>) {
  const [busy, setBusy] = useState(false)
  const live = useRef(true)
  useEffect(() => () => { live.current = false }, [])
  const click = onClick && ((e: React.MouseEvent<HTMLButtonElement>) => {
    if (busy) { e.preventDefault(); return }
    const r = onClick(e)
    if (r && typeof (r as Promise<unknown>).then === 'function') {
      setBusy(true)
      const end = () => { if (live.current) setBusy(false) }
      ;(r as Promise<unknown>).then(end, end)
    }
  })
  return <button type="button" className={'ch-btn' + (kind ? ' ' + kind : '') + (small ? ' small' : '') + (busy ? ' busy' : '')} aria-busy={busy || undefined} onClick={click} {...p}>{children}</button>
}
export const Badge = ({ tone, children }: { tone?: string | undefined; children: ReactNode }) => <span className={'ch-badge' + (tone ? ' ' + tone : '')}>{children}</span>
export function StatusBadge({ s }: { s: string }) {
  const t = useAdminT()
  return <Badge tone={TONE[s]}>{t(STATUS[s] ?? s)}</Badge>
}
export function RoleBadge({ r, church }: { r: string; church?: string }) {
  const t = useAdminT()
  return <Badge tone="role">{t(ROLE[r] ?? r)}{church ? ' · ' + church : ''}</Badge>
}
export const Avatar = ({ name }: { name: string | null }) => <span className="ch-avatar" aria-hidden="true">{initials(name)}</span>
export function Card({ title, sub, actions, children }: { title?: string; sub?: ReactNode; actions?: ReactNode; children?: ReactNode }) {
  const t = useAdminT()
  return (
    <section className="ch-card">
      {(title || actions) && (
        <div className="ch-row">
          {title && <h2>{t(title)}{sub != null && sub !== false && <small>{sub}</small>}</h2>}
          {actions && <div className="ch-row" style={{ marginLeft: 'auto' }}>{actions}</div>}
        </div>
      )}
      {children}
    </section>
  )
}
export const Empty = ({ children }: { children: ReactNode }) => <div className="ch-empty">{children}</div>
export function Field({ label, children }: { label: string; children: ReactNode }) {
  const t = useAdminT()
  return <label className="ch-field"><span>{t(label)}</span>{children}</label>
}
export function Search({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const t = useAdminT()
  return <input className="ch-input ch-search" type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={t(placeholder || 'Søk …')} aria-label={t(placeholder || 'Søk')} />
}
export function Select({ value, onChange, options, label }: { value: string; onChange: (v: string) => void; options: (readonly [string, string])[]; label?: string }) {
  const t = useAdminT()
  return (
    <select className="ch-select" value={value} onChange={(e) => onChange(e.target.value)} aria-label={label ? t(label) : undefined}>
      {options.map(([v, l]) => <option key={v} value={v}>{t(l)}</option>)}
    </select>
  )
}

export interface Row { key: string; cells: ReactNode[] }
/** Liste: kolonnemaler som CSS-grid; på mobil blir hver rad et kort. */
export function List({ cols, head, rows, empty, onRow }: { cols: string; head?: string[]; rows: Row[]; empty?: string; onRow?: (r: Row, i: number) => void }) {
  const t = useAdminT()
  if (!rows.length) return <div className="ch-list"><Empty>{t(empty || 'Ingen ennå.')}</Empty></div>
  return (
    <div className="ch-list" style={{ '--cols': cols } as CSSProperties} role="table">
      {head && <div className="ch-li head" role="row">{head.map((h, i) => <span key={i} role="columnheader">{t(h)}</span>)}</div>}
      {rows.map((r, i) => (
        <div key={r.key} role="row" className={'ch-li' + (onRow ? ' click' : '')}
          onClick={onRow ? (e) => { if (!(e.target as HTMLElement).closest('button,a,select,input')) onRow(r, i) } : undefined}
          tabIndex={onRow ? 0 : undefined} onKeyDown={onRow ? (e) => { if (e.key === 'Enter') onRow(r, i) } : undefined}>
          {r.cells.map((c, j) => <div key={j} role="cell">{c}</div>)}
        </div>
      ))}
    </div>
  )
}

function useEscape(onClose: () => void) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])
}
export function Drawer({ title, sub, onClose, children }: { title: string; sub?: string | undefined; onClose: () => void; children: ReactNode }) {
  const t = useAdminT()
  useEscape(onClose)
  return (
    <div className="ch-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <aside className="ch-drawer" role="dialog" aria-modal="true" aria-label={title}>
        <header><div><h2>{title}</h2>{sub && <p className="ch-muted">{sub}</p>}</div><button type="button" className="ch-x" onClick={onClose} aria-label={t('Lukk')}>✕</button></header>
        {children}
      </aside>
    </div>
  )
}
export function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const t = useAdminT()
  useEscape(onClose)
  return (
    <div className="ch-overlay center" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="ch-dialog" role="dialog" aria-modal="true" aria-label={title}>
        <header><h2>{title}</h2><button type="button" className="ch-x" onClick={onClose} aria-label={t('Lukk')}>✕</button></header>
        {children}
      </div>
    </div>
  )
}
