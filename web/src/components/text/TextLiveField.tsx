/**
 * Tekstfeltet i Rediger-panelet, felles for alle editorene. To visninger av det SAMME feltet (samme element, verdi og
 * hendelser – derfor alltid samme tekst og state):
 * - Live-visning (standard): teksten i lagets font, tykkelse, kursiv, justering, linje- og bokstavavstand, og en
 *   størrelse skalert så linjene brytes som i tekstboksen på lerretet – uten effekter.
 * - «Vis tekstboks»: dagens tekstboks, helt uendret.
 * Valget huskes (localStorage) og gjelder alle editorene.
 */
import { cloneElement, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactElement } from 'react'
import { backdropFor, type Typo } from './typo'
import './text-live.css'

const KEY = 'medialab.textbox'
const read = () => {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}
const listeners = new Set<(v: boolean) => void>()

/** «Vis tekstboks» (på = dagens tekstboks), felles for alle tekstfeltene. */
function useBoxMode(): [boolean, (v: boolean) => void] {
  const [v, setV] = useState(read)
  useEffect(() => {
    listeners.add(setV)
    return () => {
      listeners.delete(setV)
    }
  }, [])
  const set = (n: boolean) => {
    try {
      localStorage.setItem(KEY, n ? '1' : '0')
    } catch {
      /* huskes ikke */
    }
    for (const f of listeners) f(n)
  }
  return [v, set]
}

export interface TextLiveFieldProps {
  typo: Typo
  /** Dagens tekstboks (textarea) – vises uendret med «Vis tekstboks», og med live-stil ellers. */
  children: ReactElement<{ className?: string; style?: CSSProperties }>
}

export default function TextLiveField({ typo, children }: TextLiveFieldProps) {
  const [box, setBox] = useBoxMode()
  const wrap = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(0)
  useLayoutEffect(() => {
    const el = wrap.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => setW(el.clientWidth))
    ro.observe(el)
    setW(el.clientWidth)
    return () => ro.disconnect()
  }, [])
  // høyden følger teksten (flere linjer uten rullefelt)
  useLayoutEffect(() => {
    if (box) return
    const t = wrap.current?.querySelector('textarea')
    if (!t) return
    t.style.height = 'auto'
    t.style.height = `${t.scrollHeight + 2}px`
  })
  const pad = 12
  const inner = Math.max(40, w - pad * 2)
  // samme forhold mellom størrelse og bredde som på lerretet (så linjene brytes likt), innenfor det som er lesbart
  const fs = Math.max(11, Math.min(64, (typo.size * inner) / typo.boxWidth))
  const live: CSSProperties = {
    fontFamily: typo.family,
    fontStretch: typo.stretch,
    fontWeight: typo.weight,
    fontStyle: typo.italic ? 'italic' : 'normal',
    fontSynthesis: 'none',
    textAlign: typo.alignH,
    lineHeight: typo.lineHeight,
    letterSpacing: `${typo.tracking}em`,
    fontSize: `${fs}px`,
    color: typo.color,
    background: backdropFor(typo.color),
    textTransform: typo.upper ? 'uppercase' : 'none',
    padding: `${pad}px`,
  }
  const cls = children.props.className ?? ''
  // kortformen font (noen felt har den) ville kollidert med live-visningens fontegenskaper
  const { font: _font, ...own } = (children.props.style ?? {}) as CSSProperties & { font?: string }
  void _font
  return (
    <div ref={wrap} className="ml-tf" data-text-mode={box ? 'box' : 'live'}>
      {/* nøkkelen gjør at feltet tegnes på nytt ved bytte (ingen blanding av gamle og nye stilegenskaper) */}
      {box ? cloneElement(children, { key: 'box' }) : cloneElement(children, { key: 'live', 'data-keep-color': '', className: `${cls} ml-tf-live`.trim(), style: { ...own, ...live } } as Record<string, unknown>)}
      <label className="ml-tf-toggle">
        <input type="checkbox" checked={box} onChange={(e) => setBox(e.target.checked)} />
        <span>Vis tekstboks</span>
      </label>
    </div>
  )
}
