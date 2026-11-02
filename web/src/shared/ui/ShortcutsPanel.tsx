import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLang, useT } from '../i18n/i18n'
import { isTypingTarget } from '../lib/workspace-nav'
import { formatKeys, pick, SHORTCUTS } from './shortcuts'
import { ContextMenu } from './ContextMenu'
import styles from './ShortcutsPanel.module.css'

/**
 * Søkbart snarveipanel for appen som er åpen (som Figmas «Keyboard shortcuts» og Premières oversikt per panel).
 * Åpnes med «?» eller Ctrl/⌘+Shift+? (ikke i tekstfelt), eller med knappen nederst til høyre. Escape lukker, og
 * fokus går tilbake dit det var.
 */
export function ShortcutsButton({ tool, fabClass }: { tool: string; fabClass: string }) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const groups = SHORTCUTS[tool]
  const close = useCallback(() => setOpen(false), [])
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null)
  useEffect(() => {
    if (!groups) return
    const key = (e: KeyboardEvent) => {
      if (e.defaultPrevented || isTypingTarget(e.target) || document.querySelector('[data-ctx-menu]')) return
      if (e.key === '?' || ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === '?' || e.code === 'Slash'))) {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    // Høyreklikk der appen ikke har en egen meny: Media Labs meny i stedet for nettleserens. Tekstfelt, lenker og
    // markert tekst beholder nettleserens meny (kopier, lim inn, åpne lenke).
    const ctx = (e: MouseEvent) => {
      if (e.defaultPrevented) return
      const t = e.target as Element | null
      if (isTypingTarget(t) || t?.closest?.('a[href], [data-native-menu]')) return
      const sel = window.getSelection?.()
      if (sel && String(sel) && t && sel.containsNode(t, true)) return
      e.preventDefault()
      setMenu({ x: e.clientX, y: e.clientY })
    }
    window.addEventListener('keydown', key)
    window.addEventListener('contextmenu', ctx)
    return () => {
      window.removeEventListener('keydown', key)
      window.removeEventListener('contextmenu', ctx)
    }
  }, [groups])
  if (!groups) return null
  return (
    <>
      <button type="button" className={fabClass} data-ml-shortcuts="" aria-haspopup="dialog" aria-expanded={open}
        title={`${t('shortcuts.title')} (?)`} aria-label={t('shortcuts.title')} onClick={() => setOpen((v) => !v)}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <rect x="2.5" y="6" width="19" height="12" rx="2.5" />
          <path d="M6 10h1M9.5 10h1M13 10h1M16.5 10h1M7 14h10" />
        </svg>
      </button>
      {open && <Panel tool={tool} onClose={close} />}
      {menu && (
        <ContextMenu x={menu.x} y={menu.y} label={t('ctx.app')} onClose={() => setMenu(null)} items={() => [
          { label: t('shortcuts.title') + ' …', keys: '?', onSelect: () => setOpen(true) },
          document.fullscreenElement
            ? { label: t('ctx.fullscreenOff'), keys: 'Esc', onSelect: () => void document.exitFullscreen?.() }
            : { label: t('ctx.fullscreen'), onSelect: () => void document.documentElement.requestFullscreen?.().catch(() => undefined) },
        ]} />
      )}
    </>
  )
}

function Panel({ tool, onClose }: { tool: string; onClose: () => void }) {
  const t = useT()
  const lang = useLang()
  const [q, setQ] = useState('')
  const box = useRef<HTMLDivElement>(null)
  const back = useRef<Element | null>(document.activeElement)
  const groups = useMemo(() => {
    const n = q.trim().toLowerCase()
    return (SHORTCUTS[tool] ?? [])
      .map((gr) => ({ title: pick(gr.title, lang), items: gr.items.filter((it) => !n || (pick(it.label, lang) + ' ' + it.keys + ' ' + formatKeys(it.keys)).toLowerCase().includes(n)) }))
      .filter((gr) => gr.items.length)
  }, [q, tool, lang])

  const search = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const prev = back.current
    search.current?.focus()
    // Escape lukker også når fokus er utenfor panelet (f.eks. rett etter klikk på knappen)
    const esc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      e.stopPropagation()
      onClose()
    }
    window.addEventListener('keydown', esc, true)
    return () => {
      window.removeEventListener('keydown', esc, true)
      if (prev instanceof HTMLElement && prev.isConnected) prev.focus()
    }
  }, [onClose])

  return createPortal(
    <div className={styles.scrim} onPointerDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div ref={box} className={styles.panel} role="dialog" aria-modal="true" aria-labelledby="ml-sc-title" data-ml-shortcuts-panel=""
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault()
            e.stopPropagation()
            onClose()
          } else if (e.key === 'Tab') {
            // fokus blir i panelet
            const f = [...(box.current?.querySelectorAll<HTMLElement>('input,button') ?? [])]
            const i = f.indexOf(document.activeElement as HTMLElement)
            if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1]?.focus() }
            else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0]?.focus() }
          }
          e.stopPropagation() // appens snarveier reagerer ikke mens panelet er åpent
        }}>
        <div className={styles.head}>
          <h2 id="ml-sc-title">{t('shortcuts.title')}</h2>
          <button type="button" className={styles.close} aria-label={t('shortcuts.close')} onClick={onClose}>×</button>
        </div>
        <input ref={search} className={styles.search} type="search" value={q} placeholder={t('shortcuts.search')} aria-label={t('shortcuts.search')} onChange={(e) => setQ(e.target.value)} />
        <div className={styles.body} data-scroll-native="">
          {groups.length === 0 && <p className={styles.none}>{t('shortcuts.none')}</p>}
          {groups.map((gr) => (
            <section key={gr.title}>
              <h3>{gr.title}</h3>
              <dl>
                {gr.items.map((it) => (
                  <div key={it.keys + it.label[0]} className={styles.row}>
                    <dt>{pick(it.label, lang)}</dt>
                    <dd><kbd>{formatKeys(it.keys)}</kbd></dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
        <p className={styles.foot}>{t('shortcuts.foot')}</p>
      </div>
    </div>,
    document.body,
  )
}
