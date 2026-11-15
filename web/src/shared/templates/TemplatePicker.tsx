import { useEffect, type ComponentProps, type ReactNode } from 'react'
import type { TplItem } from './filter'
import { TemplateLibrary } from './TemplateLibrary'
import s from './TemplatePicker.module.css'

/** Et kort under «Start fra» (ny mal: tomt/grunnoppsett – står utenfor biblioteket med ferdige maler). */
export interface StartItem { id: string; name: string; desc?: string; preview: ReactNode; onPick: () => void }

/**
 * Felles malpopup for alle apper med ferdige maler – samme oppbygning og utforming som «Ny mal» i Thumbnail Studio:
 * tittel og forklaring med fargevelgeren til høyre, «Start fra» (ny mal), og «Ferdige maler» i det felles
 * malbiblioteket (Alle maler, kategorier, søk, sortering). Escape og klikk utenfor lukker.
 */
export function TemplatePicker<T extends TplItem>({ title, lead, head, onClose, start, startLabel, startAspect = '16 / 9', startAttr = 'data-layout', libLabel, libNote, cancelLabel, lib }: {
  title: string
  lead?: string
  /** Fargevelgeren (eller annet) øverst til høyre. */
  head?: ReactNode
  onClose: () => void
  start?: readonly StartItem[]
  startLabel?: string
  startAspect?: string
  startAttr?: string
  libLabel: string
  libNote?: string
  cancelLabel: string
  lib: ComponentProps<typeof TemplateLibrary<T>>
}) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape' && !e.defaultPrevented) onClose() }
    document.addEventListener('keydown', key)
    return () => document.removeEventListener('keydown', key)
  }, [onClose])
  return (
    <div className={s.back} onClick={onClose} data-tpl-picker="">
      <div className={s.modal} role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className={s.head}>
          <div>
            <span className={s.title}>{title}</span>
            {lead && <span className={s.lead}>{lead}</span>}
          </div>
          {head}
        </div>
        {start && start.length > 0 && (
          <>
            {startLabel && <div className={s.section} data-new-head="">{startLabel}</div>}
            <div className={s.grid} data-tpl-start="">
              {start.map((o) => (
                <button key={o.id} type="button" className={s.card} {...{ [startAttr]: o.id }} onClick={o.onPick}>
                  <span className={s.thumb} style={{ aspectRatio: startAspect }}>{o.preview}</span>
                  <span className={s.text}>
                    <b>{o.name}</b>
                    {o.desc && <span>{o.desc}</span>}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
        <div className={s.section} data-lib-head="">{libLabel}</div>
        {libNote && <span className={s.note}>{libNote}</span>}
        <TemplateLibrary<T> {...lib} />
        <div className={s.foot}>
          <button type="button" className={s.cancel} onClick={onClose}>{cancelLabel}</button>
        </div>
      </div>
    </div>
  )
}
