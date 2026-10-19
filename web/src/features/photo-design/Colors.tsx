'use no memo'
import { useEffect, useRef, useState } from 'react'
import { assignRole, lowContrast, ORDERS, PALETTES, paletteOf, ROLES, rolesOf, STARTER, schemeOfPreset, type Role } from './engine/palette'
import type { Scheme } from './engine/model'
import type { Phrase, Tx } from './texts'
import s from './PhotoDesign.module.css'

const ROLE_NAME: Record<Role, Phrase> = { bg: 'Bakgrunn', text: 'Tekst', off: 'Støttefarge' }
const HEX = /^#[0-9a-f]{6}$/i

/** Lukker når du klikker utenfor eller trykker Escape. */
function useDismiss(open: boolean, ref: React.RefObject<HTMLElement | null>, close: () => void) {
  useEffect(() => {
    if (!open) return
    const out = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close()
    }
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('pointerdown', out)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('pointerdown', out)
      document.removeEventListener('keydown', esc)
    }
  }, [open, ref, close])
}

/** Heksadesimal verdi. Startes på nytt (key = fargen) når fargen endres utenfra; ellers holdes det du skriver. */
function HexInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [txt, setTxt] = useState(value)
  return (
    <input
      type="text"
      value={txt}
      aria-label={`${label} (hex)`}
      maxLength={7}
      spellCheck={false}
      onChange={(e) => {
        const v = e.target.value.trim()
        setTxt(v)
        const h = v.startsWith('#') ? v : `#${v}`
        if (HEX.test(h)) onChange(h.toLowerCase())
      }}
    />
  )
}

/** Hvor ofte (ms) en farge sendes videre mens du drar i fargevelgeren. */
const DRAG_MS = 120

/**
 * Fargefelt med vanlig fargevelger og heksadesimal verdi. Mens du drar, vises fargen med en gang i feltet selv, men den
 * sendes videre (malene fargelegges og tegnes) høyst hvert DRAG_MS – og alltid til slutt. Før ble hele fargevalget
 * regnet ut og alle forhåndsvisningene tegnet for hvert steg, så fargevelgeren hakket.
 */
function ColorField({ label, value, onChange, testId }: { label: string; value: string; onChange: (v: string) => void; testId: string }) {
  const [drag, setDrag] = useState<string | null>(null)
  const q = useRef<{ last: number; timer: number | undefined; pending: string | null; cb: (v: string) => void }>({ last: 0, timer: undefined, pending: null, cb: onChange })
  useEffect(() => {
    q.current.cb = onChange
  })
  const flush = () => {
    const t = q.current
    if (t.timer !== undefined) window.clearTimeout(t.timer)
    t.timer = undefined
    t.last = performance.now()
    const v = t.pending
    t.pending = null
    if (v) t.cb(v)
    setDrag(null)
  }
  const push = (v: string) => {
    const t = q.current
    t.pending = v
    setDrag(v)
    const wait = DRAG_MS - (performance.now() - t.last)
    if (wait <= 0) flush()
    else if (t.timer === undefined) t.timer = window.setTimeout(flush, wait)
  }
  // ved lukking: send det siste valget
  useEffect(() => () => {
    const t = q.current
    if (t.timer !== undefined) window.clearTimeout(t.timer)
    if (t.pending) t.cb(t.pending)
  }, [])
  return (
    <div className={s.schemeColor}>
      <input type="color" value={drag ?? value} aria-label={label} data-pd-color={testId} onChange={(e) => push(e.target.value)} onBlur={() => { if (q.current.pending) flush() }} />
      <HexInput key={value} label={label} value={value} onChange={onChange} />
    </div>
  )
}

/**
 * Malfarger: ferdige kombinasjoner («Velg farge», som i Thumbnail Studio) og tre egne farger. Et klikk på de tre
 * fargene åpner en liten popup der du velger fargene og hvilken som er bakgrunn, tekst og støttefarge (eller tar et
 * hurtigvalg for rekkefølgen). Endringene vises med en gang. `value` null = malens egne farger.
 */
export function ColorBar({ value, onChange, tx, scope }: { value: Scheme | null; onChange: (v: Scheme | null) => void; tx: Tx; scope: 'home' | 'doc' }) {
  const [menu, setMenu] = useState(false)
  const [pop, setPop] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useDismiss(menu || pop, ref, () => {
    setMenu(false)
    setPop(false)
  })
  const cur = value ?? null
  const R = cur ? rolesOf(cur) : null
  const name = !cur ? tx('Standard') : cur.k === 'custom' ? tx('Egne farger') : tx(paletteOf(cur.k).name as Phrase)
  const edit = cur ?? STARTER
  const setColor = (i: number, v: string) => {
    const c = [...edit.c] as Scheme['c']
    c[i] = v
    onChange({ ...edit, k: 'custom', c })
  }
  return (
    <div className={s.schemeBar} ref={ref} data-pd-scheme={scope}>
      <div className={s.palWrap}>
        <button type="button" className={s.palBtn} aria-expanded={menu} aria-haspopup="true" data-pd-pal-btn="" onClick={() => { setPop(false); setMenu((v) => !v) }}>
          <span className={s.palSw}>{(cur ? [R?.bg, R?.text, R?.off] : paletteOf('default').sw).map((x, i) => <i key={i} style={{ background: x }} />)}</span>
          <span>{tx('Velg farge')}</span>
          <span className={s.palName}>{name}</span>
        </button>
        {menu && (
          <div className={s.palMenu} role="group" aria-label={tx('Velg farge')}>
            {PALETTES.map((x) => {
              const on = x.p ? cur?.k === x.k : !cur
              return (
                <button key={x.k} type="button" aria-pressed={on} data-pd-pal={x.k} onClick={() => { onChange(schemeOfPreset(x.k)); setMenu(false) }}>
                  <span className={s.palSw}>{(x.p ? [x.p.bg, x.p.fg, x.p.acc] : x.sw).map((col, i) => <i key={i} style={{ background: col }} />)}</span>
                  <span>{x.p ? tx(x.name as Phrase) : tx('Standard (malens farger)')}</span>
                  <span aria-hidden="true" style={{ opacity: on ? 1 : 0 }}>✓</span>
                </button>
              )
            })}
            <button type="button" data-pd-pal="custom" aria-pressed={cur?.k === 'custom'} onClick={() => { if (!cur) onChange(STARTER); setMenu(false); setPop(true) }}>
              <span className={s.palSw}>{edit.c.map((col, i) => <i key={i} style={{ background: col }} />)}</span>
              <span>{tx('Egne farger …')}</span>
              <span aria-hidden="true" style={{ opacity: cur?.k === 'custom' ? 1 : 0 }}>✓</span>
            </button>
          </div>
        )}
      </div>
      <button type="button" className={s.schemeTrio} aria-expanded={pop} aria-haspopup="dialog" data-pd-roles-btn="" title={tx('Velg farger og rekkefølge')} onClick={() => { setMenu(false); if (!cur) onChange(STARTER); setPop((v) => !v) }}>
        {ROLES.map((r) => (
          <span key={r} className={s.schemeChip}>
            <i style={{ background: rolesOf(edit)[r] }} />
            <span>{tx(ROLE_NAME[r])}</span>
          </span>
        ))}
      </button>
      {pop && (
        <div className={s.schemePop} role="dialog" aria-label={tx('Farger i malen')} data-pd-roles="">
          <div className={s.schemeHead}>
            <span className={s.eyebrowSm}>{tx('Farger i malen')}</span>
            <button type="button" className={s.schemeX} aria-label={tx('Lukk')} onClick={() => setPop(false)}>×</button>
          </div>
          <div className={s.schemeColors}>
            {edit.c.map((col, i) => <ColorField key={i} label={tx('Farge {n}', { n: i + 1 })} value={col} testId={String(i)} onChange={(v) => setColor(i, v)} />)}
          </div>
          <div className={s.schemeRoles}>
            {ROLES.map((r) => (
              <div key={r} className={s.schemeRole} role="radiogroup" aria-label={tx(ROLE_NAME[r])}>
                <span>{tx(ROLE_NAME[r])}</span>
                <div>
                  {edit.c.map((col, i) => (
                    <button key={i} type="button" role="radio" aria-checked={rolesOf(edit)[r] === col && edit.r[ROLES.indexOf(r)] === i} aria-label={`${tx(ROLE_NAME[r])}: ${tx('Farge {n}', { n: i + 1 })}`} data-pd-role={`${r}-${i}`} style={{ background: col }} onClick={() => onChange(assignRole(edit, r, i))} />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <span className={s.eyebrowSm}>{tx('Hurtigvalg')}</span>
          <div className={s.schemeOrders}>
            {ORDERS.map((o) => {
              const on = o.every((v, i) => edit.r[i] === v)
              const [b, t, f] = o.map((i) => edit.c[i]) as [string, string, string]
              return (
                <button key={o.join('')} type="button" aria-pressed={on} data-pd-order={o.join('')} aria-label={tx('Bakgrunn {a}, tekst {b}, støtte {c}', { a: o[0] + 1, b: o[1] + 1, c: o[2] + 1 })} style={{ background: b, color: t }} onClick={() => onChange({ ...edit, k: 'custom', r: o })}>
                  <b>Aa</b>
                  <i style={{ background: f }} />
                </button>
              )
            })}
          </div>
          {lowContrast(edit) && <span className={s.schemeWarn}>{tx('Lav kontrast mellom tekst og bakgrunn. Tekst som ikke syns, får automatisk en farge som skiller seg mer ut.')}</span>}
          <div className={s.schemeFoot}>
            <button type="button" className={s.schemeBtn} onClick={() => { onChange(null); setPop(false) }}>{tx('Standard (malens farger)')}</button>
            <button type="button" className={s.schemeBtn} data-pd-roles-done="" onClick={() => setPop(false)}>{tx('Ferdig')}</button>
          </div>
          {scope === 'doc' && <span className={s.note}>{tx('Fargene lagres med prosjektet og huskes for malen.')}</span>}
        </div>
      )}
    </div>
  )
}
