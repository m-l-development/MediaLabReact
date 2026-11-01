import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import styles from './ContextMenu.module.css'

/**
 * Felles høyreklikkmeny for arbeidsflatene (mønster fra Motion Designs meny): første aktive valg får fokus, piltaster,
 * Home/End, Enter/mellomrom velger, Escape/Tab eller klikk utenfor lukker, og fokus går tilbake dit det var. Menyen
 * holdes innenfor vinduet. Snarveier vises til høyre (som i Figmas og Premières menyer). Brukes bare der området har
 * egne handlinger – i tekstfelt og andre steder får nettleseren sin vanlige meny.
 */
export interface MenuItem {
  label: string
  /** Snarvei som vises (f.eks. «Ctrl+Z», «0»). */
  keys?: string
  disabled?: boolean
  /** Avkrysset/valgt (verktøy, modus). */
  checked?: boolean
  onSelect?: () => void
  /** Skillelinje før dette valget. */
  separator?: boolean
}

export function ContextMenu({ x, y, items: itemsIn, label, onClose }: { x: number; y: number; items: MenuItem[] | (() => MenuItem[]); label: string; onClose: () => void }) {
  // valgene kan hentes når menyen vises (en funksjon), så kalleren ikke leser tilstand under sin egen rendering
  const [items] = useState(() => (typeof itemsIn === 'function' ? itemsIn() : itemsIn))
  const ref = useRef<HTMLDivElement>(null)
  const back = useRef<Element | null>(typeof document === 'undefined' ? null : document.activeElement)
  const [pos, setPos] = useState({ left: x, top: y })

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setPos({ left: Math.max(4, Math.min(x, innerWidth - r.width - 4)), top: Math.max(4, Math.min(y, innerHeight - r.height - 4)) })
  }, [x, y])

  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('[role^="menuitem"]:not([aria-disabled="true"])')?.focus()
    const prev = back.current
    return () => {
      if (prev instanceof HTMLElement && prev.isConnected) prev.focus()
    }
  }, [])

  const close = () => onClose()
  const pick = (it: MenuItem) => {
    if (it.disabled) return
    close()
    it.onSelect?.()
  }

  return createPortal(
    <>
      <div className={styles.back} data-ctx-back="" onPointerDown={(e) => { e.preventDefault(); close() }} onContextMenu={(e) => { e.preventDefault(); close() }} />
      <div ref={ref} role="menu" aria-label={label} className={styles.menu} style={pos} data-ctx-menu=""
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={(e) => {
          const list = [...(ref.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]:not([aria-disabled="true"])') ?? [])]
          const i = list.indexOf(document.activeElement as HTMLElement)
          const go = (n: number) => list[(n + list.length) % list.length]?.focus()
          if (e.key === 'ArrowDown') go(i + 1)
          else if (e.key === 'ArrowUp') go(i - 1)
          else if (e.key === 'Home') go(0)
          else if (e.key === 'End') go(list.length - 1)
          else if (e.key === 'Escape' || e.key === 'Tab') close()
          else return
          e.preventDefault()
          e.stopPropagation()
        }}>
        {items.map((it, i) => (
          <div key={`${it.label}-${i}`} className={styles.row}>
            {it.separator && i > 0 && <div className={styles.sep} role="separator" />}
            <button type="button" role={it.checked === undefined ? 'menuitem' : 'menuitemradio'} aria-checked={it.checked} aria-disabled={it.disabled || undefined}
              className={styles.item} data-ctx-item={it.label} tabIndex={-1}
              onClick={() => pick(it)}>
              <span className={styles.mark} aria-hidden="true">{it.checked ? '●' : ''}</span>
              <span className={styles.label}>{it.label}</span>
              {it.keys && <kbd className={styles.keys}>{it.keys}</kbd>}
            </button>
          </div>
        ))}
      </div>
    </>,
    document.body,
  )
}
