import type { ReactNode } from 'react'
import { useT } from '../i18n/i18n'
import styles from './MobileDock.module.css'

export interface DockTab {
  key: string
  label: string
  icon: ReactNode
  content: () => ReactNode
}

/**
 * Mobiloppsettet i editorene: en fast ikonlinje nederst og et halvhøyt panel som glir opp over den. Arbeidsflaten
 * står over panelet og krymper slik at den hele tiden vises i sin helhet, så man ser endringene mens man gjør dem.
 * Trykk på aktiv fane eller × lukker panelet. Brukes bare på smal skjerm (appene viser sine vanlige paneler på PC).
 *
 * `bar`: en liten handlingslinje over ikonlinjen (f.eks. for det valgte objektet) når panelet er lukket.
 */
export function MobileDock({ tabs, open, onOpen, label, bar }: { tabs: DockTab[]; open: string | null; onOpen: (k: string | null) => void; label: string; bar?: ReactNode }) {
  const t = useT()
  const cur = tabs.find((x) => x.key === open) ?? null
  return (
    <>
      {cur ? (
        <section className={styles.sheet} aria-label={cur.label} data-dock-sheet={cur.key}>
          <div className={styles.sheetHead}>
            <b>{cur.label}</b>
            <button type="button" className={styles.close} aria-label={t('dock.close')} onClick={() => onOpen(null)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
            </button>
          </div>
          <div className={styles.sheetBody}>{cur.content()}</div>
        </section>
      ) : bar ? <div className={styles.bar} data-dock-bar="">{bar}</div> : null}
      <nav className={styles.dock} aria-label={label} data-dock="">
        {tabs.map((x) => (
          <button key={x.key} type="button" className={styles.tab} aria-pressed={open === x.key} data-dock-tab={x.key} onClick={() => onOpen(open === x.key ? null : x.key)}>
            <span className={styles.icon} aria-hidden="true">{x.icon}</span>
            <span>{x.label}</span>
          </button>
        ))}
      </nav>
    </>
  )
}

/** Enkle strek-ikoner (24 × 24) til ikonlinjen. */
export const DockIcons = {
  add: <path d="M12 5v14M5 12h14" />,
  layers: <path d="M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5" />,
  edit: <path d="M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4" />,
  style: <path d="M12 3a9 9 0 1 0 0 18c1.5 0 2-1 2-2s-1-2 0-3 3 0 4-1 2-2 2-4a9 9 0 0 0-8-8zM7.5 11.5h.01M10 7.5h.01M15 7.5h.01" />,
  fx: <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />,
  more: <path d="M5 12h.01M12 12h.01M19 12h.01" />,
  media: <path d="M4 5h16v14H4zM10 9l5 3-5 3z" />,
  text: <path d="M5 5h14M12 5v14" />,
  image: <path d="M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4" />,
  view: <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />,
} as const

export function DockIcon({ d }: { d: keyof typeof DockIcons }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{DockIcons[d]}</svg>
}
