import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Me } from '../domain/account'
import { ServiceError } from '../services/errors'
import { elementInfo, technical } from '../shared/feedback/context'
import { pageLayout } from '../shared/feedback/layout'
import { currentView, VIEWS } from '../shared/feedback/views'
import { appOf, cleanPath, cleanView, KINDS, scrubDeep, scrubText, type FeedbackKind } from '../shared/feedback/feedback-core'
import { buildFeedback, FIELDS, LEVELS } from '../shared/feedback/form'
import { useT, type Translate } from '../shared/i18n/i18n'
import type { MessageKey } from '../shared/i18n/messages'
import { useServices } from './services'
import styles from './Feedback.module.css'

/**
 * Tilbakemeldingsknappen i knappefeltet (PLT-21), portert fra media-lab/src/shared/feedback-widget.js: fire kategorier
 * med egne spørsmål, beskrivelse (påkrevd), «Marker et område på skjermen», teknisk kontekst med de siste feilene og
 * rensing av hemmeligheter før sending. Databasen (`submit_feedback`) kontrollerer innlogging og grensen per døgn.
 */
const ERR: Record<string, MessageKey> = { rate_limited: 'fb.err.rate', invalid: 'fb.err.invalid', forbidden: 'fb.err.forbidden', unauthorized: 'fb.err.session', network: 'fb.err.network', timeout: 'fb.err.timeout' }

interface Marked {
  mode: 'area' | 'element'
  rect: { x: number; y: number; w: number; h: number }
  px: { x: number; y: number; w: number; h: number }
  viewport: string
  scroll: { x: number; y: number }
  element: ReturnType<typeof elementInfo>
  /** trygt omriss av siden (shared/feedback/layout), vises i innboksen med markeringen */
  layout?: string[]
}

/**
 * Global markering (TB-ED697B): Alt+Shift+M starter markeringen over det som vises akkurat nå – også en åpen kontomeny,
 * innstillinger eller admin – uten å åpne skjemaet først. Etter valget åpnes skjemaet med markeringen. Ingen egne knapper.
 */
export const START_MARK = 'chfb:mark'
export const startMarking = () => window.dispatchEvent(new Event(START_MARK))
/** Alt+Shift+M (e.code, så tasten virker også der Alt gir et spesialtegn, f.eks. på Mac). */
export const isMarkKey = (e: KeyboardEvent) => e.altKey && e.shiftKey && !e.ctrlKey && !e.metaKey && e.code === 'KeyM'
interface Form { kind: FeedbackKind | null; vals: Record<string, string>; marked: Marked | null }
const EMPTY: Form = { kind: null, vals: {}, marked: null }

/**
 * Markering av element (trykk) eller område (dra), over hele siden. Skjemaet kan vises under markeringen (formOn), så
 * også felt og knapper i selve skjemaet kan markeres. Instruksjonen er liten og kan flyttes med håndtaket.
 */
function Picker({ t, done, formOn, setFormOn }: { t: Translate; done: (m: Marked | null) => void; formOn: boolean; setFormOn: (v: boolean) => void }) {
  const [box, setBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const [sel, setSel] = useState<{ mode: 'area' | 'element'; r: { x: number; y: number; w: number; h: number }; node: Element | null } | null>(null)
  const start = useRef<{ x: number; y: number } | null>(null)
  const drag = useRef(false)
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const move = useRef<{ dx: number; dy: number } | null>(null)
  // markeringsverktøyet selv (og skjermen bak skjemaet) er aldri en del av det som markeres; selve skjemaet kan markeres
  const tool = (n: Element) => !!n.closest('[data-chfb-tool],[data-chfb-backdrop]')
  // elementet under pekeren, i alle lag (portaler, menyer, dialoger): elementsFromPoint ser forbi markeringsflaten. Fremheving
  // og valg bruker samme element som registreres (nærmeste knapp, lenke, bryter eller felt; ellers det innerste elementet).
  const under = (x: number, y: number) => {
    const n = document.elementsFromPoint(x, y).find((e) => !tool(e) && e !== document.documentElement && e !== document.body) ?? null
    return n?.closest('button,a[href],summary,label,input,select,textarea,[role=button],[role=tab],[role=link],[role=menuitem],[role=switch],[role=checkbox],[role=radio],[role=option]') ?? n
  }
  const rectOf = (n: Element) => { const r = n.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height } }
  /**
   * TB-7D30CC: markeringsflaten ligger over hele vinduet (også over skjemaet), så musehjul og fingre traff den i stedet for
   * skjemaet – og flaten scroller ikke. Scrolling sendes derfor videre til den nærmeste scrollbare beholderen under pekeren
   * (skjemaet, et panel eller siden). Markeringen virker som før.
   */
  const scroller = (n: Element | null): Element | null => {
    for (let e = n; e && e !== document.body && e !== document.documentElement; e = e.parentElement) {
      const cs = getComputedStyle(e)
      if ((/(auto|scroll|overlay)/.test(cs.overflowY) && e.scrollHeight > e.clientHeight + 1) || (/(auto|scroll|overlay)/.test(cs.overflowX) && e.scrollWidth > e.clientWidth + 1)) return e
    }
    return document.scrollingElement
  }
  /** Etter scrolling flyttes rammen med elementet (valgt element) eller viser det som nå er under pekeren. */
  const follow = (x: number, y: number) => {
    if (sel?.mode === 'element' && sel.node?.isConnected) { const r = rectOf(sel.node); setSel({ ...sel, r }); setBox(r) } else if (!sel) { const n = under(x, y); if (n) setBox(rectOf(n)) }
  }
  // berøring som startet i skjemaet: loddrett sveip scroller skjemaet, et trykk markerer som før
  const tscroll = useRef<{ el: Element; y: number; x0: number; y0: number; on: boolean } | null>(null)
  const inForm = (n: Element | null) => !!n?.closest('[data-chfb][role="dialog"]')
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); done(null) } }
    document.addEventListener('keydown', key, true)
    return () => document.removeEventListener('keydown', key, true)
  }, [done])
  const confirm = () => {
    if (!sel) return
    const W = innerWidth, H = innerHeight, p = (v: number) => Math.round(v * 1000) / 10
    // visningen i appen (f.eks. «edit»), så innboksen kan vise den ekte siden i samme visning (shared/feedback/views.ts)
    // '' = startvisningen (eldre saker uten feltet prøves i begge visningene)
    const appId = appOf(location.pathname, location.search).id
    const ui = VIEWS[appId] ? (currentView(appId) ?? '') : undefined
    const base = { ...(ui !== undefined ? { ui } : {}), mode: sel.mode, rect: { x: p(sel.r.x / W), y: p(sel.r.y / H), w: p(sel.r.w / W), h: p(sel.r.h / H) }, px: { x: Math.round(sel.r.x), y: Math.round(sel.r.y), w: Math.round(sel.r.w), h: Math.round(sel.r.h) }, viewport: W + '×' + H, scroll: { x: Math.round(scrollX), y: Math.round(scrollY) }, element: elementInfo(sel.node) }
    // skjemaet og knappene for tilbakemelding hører ikke til siden i omrisset, med mindre det er skjemaet som markeres
    const own = inForm(sel.node ?? under(sel.r.x + sel.r.w / 2, sel.r.y + sel.r.h / 2)) ? tool : (n: Element) => tool(n) || !!n.closest('[data-chfb]')
    // innboksen viser den ekte siden; omrisset er bare reserve (f.eks. åpne menyer), så det holdes lite. Markeringen har
    // en grense i databasen (submit_feedback: 4000 byte); omrisset får aldri mer enn plassen som er igjen
    const budget = Math.min(1500, 3700 - Math.ceil(new TextEncoder().encode(JSON.stringify(base)).length * 1.15))
    let layout: string[] = []
    try { layout = pageLayout(own, document.body, budget) } catch { /* omrisset er valgfritt */ }
    done({ ...base, layout })
  }
  return createPortal(
    <>
      <div
        className={styles.pick}
        data-chfb=""
        data-chfb-tool=""
        role="application"
        aria-label={t('fb.mark')}
        onWheel={(e) => {
          const k = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? innerHeight : 1
          const sc = scroller(under(e.clientX, e.clientY))
          if (!sc) return
          sc.scrollBy({ left: e.deltaX * k, top: e.deltaY * k })
          requestAnimationFrame(() => follow(e.clientX, e.clientY))
        }}
        onPointerDown={(e) => {
          e.preventDefault()
          e.stopPropagation()
          start.current = { x: e.clientX, y: e.clientY }
          drag.current = false
          const n = e.pointerType === 'mouse' ? null : under(e.clientX, e.clientY)
          const sc = n && inForm(n) ? scroller(n) : null
          tscroll.current = sc ? { el: sc, y: e.clientY, x0: e.clientX, y0: e.clientY, on: false } : null
          try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* ingenting */ }
        }}
        onPointerMove={(e) => {
          const ts = tscroll.current
          if (ts && start.current) {
            if (!ts.on && Math.abs(e.clientY - ts.y0) > 8 && Math.abs(e.clientY - ts.y0) > Math.abs(e.clientX - ts.x0)) ts.on = true
            if (ts.on) {
              ts.el.scrollTop -= e.clientY - ts.y
              ts.y = e.clientY
              return
            }
          }
          const s = start.current
          if (s) {
            const dx = e.clientX - s.x, dy = e.clientY - s.y
            if (Math.hypot(dx, dy) > 8) drag.current = true
            if (drag.current) setBox({ x: Math.min(s.x, e.clientX), y: Math.min(s.y, e.clientY), w: Math.abs(dx), h: Math.abs(dy) })
            return
          }
          if (!sel && e.pointerType === 'mouse') { const n = under(e.clientX, e.clientY); if (n) setBox(rectOf(n)) }
        }}
        onPointerUp={(e) => {
          const s = start.current
          if (!s) return
          if (tscroll.current?.on) {
            tscroll.current = null
            start.current = null
            drag.current = false
            follow(e.clientX, e.clientY)
            return
          }
          tscroll.current = null
          if (drag.current) {
            const r = { x: Math.min(s.x, e.clientX), y: Math.min(s.y, e.clientY), w: Math.abs(e.clientX - s.x), h: Math.abs(e.clientY - s.y) }
            setSel({ mode: 'area', r, node: under(r.x + r.w / 2, r.y + r.h / 2) })
            setBox(r)
          } else {
            const n = under(e.clientX, e.clientY)
            if (n) { const r = rectOf(n); setSel({ mode: 'element', r, node: n }); setBox(r) }
          }
          start.current = null
          drag.current = false
        }}
      />
      {box && <div className={styles.box} data-chfb="" data-chfb-tool="" style={{ left: box.x, top: box.y, width: box.w, height: box.h }} />}
      <div className={styles.bar} data-chfb="" data-chfb-tool="" role="toolbar" aria-label={t('fb.mark')} style={pos ? { left: pos.x, top: pos.y, transform: 'none' } : undefined}>
        <span
          className={styles.grip}
          data-chfb-grip=""
          role="button"
          tabIndex={0}
          title={t('fb.markMove')}
          aria-label={t('fb.markMove')}
          onPointerDown={(e) => {
            e.preventDefault()
            const r = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect()
            move.current = { dx: e.clientX - r.left, dy: e.clientY - r.top }
            try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* ingenting */ }
          }}
          onPointerMove={(e) => {
            const m = move.current
            if (!m) return
            const el = e.currentTarget.parentElement as HTMLElement
            setPos({ x: Math.min(Math.max(0, e.clientX - m.dx), innerWidth - el.offsetWidth), y: Math.min(Math.max(0, e.clientY - m.dy), innerHeight - el.offsetHeight) })
          }}
          onPointerUp={() => { move.current = null }}
          onKeyDown={(e) => {
            const d = ({ ArrowLeft: [-20, 0], ArrowRight: [20, 0], ArrowUp: [0, -20], ArrowDown: [0, 20] } as Record<string, [number, number]>)[e.key]
            if (!d) return
            e.preventDefault()
            const r = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect()
            setPos({ x: Math.max(0, r.left + d[0]), y: Math.max(0, r.top + d[1]) })
          }}
        >⠿</span>
        <span className={styles.barText}>{t(sel ? 'fb.markRight' : 'fb.markHint')}</span>
        {sel && <button type="button" onClick={confirm}>{t('fb.markConfirm')}</button>}
        {sel && <button type="button" className={styles.barLight} onClick={() => { setSel(null); setBox(null) }}>{t('fb.markAgain')}</button>}
        <button type="button" className={styles.barLight} aria-pressed={formOn} data-chfb-formtoggle="" onClick={() => setFormOn(!formOn)}>{t(formOn ? 'fb.markHideForm' : 'fb.markShowForm')}</button>
        <button type="button" className={styles.barLight} onClick={() => done(null)}>{t('fb.cancel')}</button>
      </div>
    </>,
    document.body,
  )
}

function markText(t: Translate, m: Marked): string {
  const e = m.element
  return t(m.mode === 'area' ? 'fb.area' : 'fb.element') + (e?.tag ? ' <' + e.tag + '>' : '') + (e?.label ? ' «' + e.label + '»' : '') + ` – x ${m.rect.x} %, y ${m.rect.y} %, ${m.rect.w} × ${m.rect.h} %`
}

export function FeedbackButton({ me, open, onOpen, fabClass }: { me: Me; open: boolean; onOpen: (v: boolean) => void; fabClass: string | undefined }) {
  const t = useT()
  const { feedback } = useServices()
  const [f, setF] = useState<Form>(EMPTY)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState<string | null>(null)
  const [error, setError] = useState<MessageKey | null>(null)
  const [showTech, setShowTech] = useState(false)
  const [picking, setPicking] = useState(false)
  // skjemaet vises under markeringen, så felt og knapper i skjemaet også kan markeres
  const [formOn, setFormOn] = useState(false)
  const startPick = (withForm = false) => { setFormOn(withForm); setPicking(true) }
  const [bad, setBad] = useState<Record<string, boolean>>({})
  const btn = useRef<HTMLButtonElement>(null)
  const typed = () => Object.values(f.vals).join('').trim().length + (f.marked ? 1 : 0)
  const reset = () => { setF(EMPTY); setSent(null); setError(null); setBad({}) }
  const setVal = (k: string, v: string) => {
    setF((x) => ({ ...x, vals: { ...x.vals, [k]: v } }))
    if (bad[k] && v.trim().length >= 3) setBad((b) => ({ ...b, [k]: false }))
  }
  const close = (force = false) => {
    if (!force && !sent && typed() > 0 && !window.confirm(t('fb.discard'))) return
    onOpen(false)
    if (sent || force) reset()
    btn.current?.focus()
  }
  useEffect(() => {
    if (!open || picking) return
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); close() } }
    document.addEventListener('keydown', key, true)
    return () => document.removeEventListener('keydown', key, true)
  })
  // Alt+Shift+M (overalt): markeringen legger seg over det som er åpent; skjemaet åpnes først når noe er valgt.
  // Fanges før verktøyenes egne hurtigtaster (capture), og gjør ingenting når markeringen ikke er aktiv.
  useEffect(() => {
    const go = () => { setFormOn(false); setPicking(true) }
    const key = (e: KeyboardEvent) => { if (isMarkKey(e) && !e.repeat) { e.preventDefault(); e.stopPropagation(); go() } }
    window.addEventListener(START_MARK, go)
    window.addEventListener('keydown', key, true)
    return () => { window.removeEventListener(START_MARK, go); window.removeEventListener('keydown', key, true) }
  }, [])
  const here = () => { const a = appOf(location.pathname, location.search); return { app: a.id, appName: a.name, page: cleanPath(location.pathname), view: cleanView(location.search, location.hash) } }
  const submit = async () => {
    if (sending || !f.kind) return
    // påkrevde felt (minst 3 tegn): markeres hver for seg, og det første får fokus
    const missing = FIELDS[f.kind].filter((x) => x.req && (f.vals[x.key] ?? '').trim().length < 3).map((x) => x.key)
    if (missing.length) {
      setBad(Object.fromEntries(missing.map((k) => [k, true])))
      setError('fb.err.fields')
      document.getElementById(`chfb-${missing[0]}`)?.focus()
      return
    }
    setBad({})
    setSending(true)
    setError(null)
    const h = here()
    const b = buildFeedback(f.kind, f.vals, t)
    try {
      const r = await feedback.submit({
        kind: f.kind, title: scrubText(b.title).slice(0, 140), description: scrubText(b.description).slice(0, 4000), answers: b.answers,
        app: h.app, appName: h.appName, page: h.page, view: h.view, marked: f.marked ? scrubDeep(f.marked) : null, context: technical(),
        churchId: me.churches.length === 1 ? (me.churches[0]?.id ?? null) : null,
      })
      setSent(r.ref)
    } catch (e) {
      setError(ERR[e instanceof ServiceError ? e.code : ''] ?? 'fb.err.generic')
    }
    setSending(false)
  }
  const h = open ? here() : null
  const tech = open && showTech ? technical() : null
  return (
    <>
      <button ref={btn} type="button" className={fabClass} data-ch-feedback="" data-chfb="" title={t('fb.send')} aria-label={t('fb.send')} aria-expanded={open} onClick={() => (open ? close() : onOpen(true))} style={{ visibility: picking ? 'hidden' : undefined }}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-5 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" />
          <path d="M12 8v4M12 15h.01" />
        </svg>
      </button>
      {open && (!picking || formOn) && createPortal(
        <>
          <div className={styles.backdrop} data-chfb="" data-chfb-backdrop="" aria-hidden="true" onPointerDown={(e) => { (e.currentTarget as HTMLElement).dataset.down = e.target === e.currentTarget ? '1' : '' }} onClick={(e) => { if (e.target === e.currentTarget && (e.currentTarget as HTMLElement).dataset.down === '1') close() }} />
          <div className={styles.panel} data-chfb="" role="dialog" aria-modal="true" aria-labelledby="chfb-title">
            <div className={styles.head}>
              <h2 id="chfb-title">{t('fb.send')}</h2>
              <button type="button" className={styles.x} title={t('fb.close')} aria-label={t('fb.close')} onClick={() => close()}><span aria-hidden="true">×</span></button>
            </div>
            {sent ? (
              <>
                <p className={styles.ok}>{t('fb.thanks')}</p>
                <p>{t('fb.ref')}: <strong data-chfb-ref="">{sent}</strong></p>
                <p className={styles.note}>{t('fb.refHint')}</p>
                <div className={styles.row}><button type="button" className={styles.btn} onClick={() => close(true)}>{t('fb.close')}</button></div>
              </>
            ) : (
              <>
                <div className={styles.cats} role="radiogroup" aria-label={t('fb.category')}>
                  {KINDS.map((k) => (
                    <button key={k} type="button" className={styles.cat} role="radio" aria-checked={f.kind === k} data-kind={k} onClick={() => { setF((x) => ({ ...x, kind: k })); setError(null); setBad({}); setTimeout(() => document.getElementById('chfb-main')?.focus(), 0) }}>
                      {t(`fb.kind.${k}`)}
                    </button>
                  ))}
                </div>
                {/* applikasjonen med navn (siden og versjonen følger med i den tekniske informasjonen) */}
                <p className={styles.note} data-chfb-app="">{t('fb.concerns')}: {h?.appName ?? ''}</p>
                {!f.kind ? (
                  <p className={styles.note}>{t('fb.chooseKind')}</p>
                ) : (
                  <>
                    <p className={styles.note} data-chfb-example="">{t(`fb.ex.${f.kind}`)}</p>
                    {FIELDS[f.kind].map((fd) => {
                      const id = `chfb-${fd.key}`
                      const helpId = fd.help ? `${id}-help` : ''
                      const errId = bad[fd.key] ? `${id}-err` : ''
                      const described = [helpId, errId].filter(Boolean).join(' ') || undefined
                      const label = `${t(fd.label)}${fd.req ? ' *' : ` (${t('fb.optional')})`}`
                      const common = { id, name: fd.key, 'aria-describedby': described, 'aria-invalid': bad[fd.key] || undefined, 'aria-required': fd.req || undefined, value: f.vals[fd.key] ?? '' }
                      return (
                        <div key={fd.key} className={styles.field} data-chfb-field={fd.key}>
                          <label htmlFor={id}>{label}</label>
                          {fd.type === 'sev' || fd.type === 'imp' ? (
                            <select {...common} onChange={(e) => setVal(fd.key, e.target.value)}>
                              {LEVELS[fd.type].map(([v, l]) => <option key={v} value={v}>{t(l)}</option>)}
                            </select>
                          ) : fd.type === 'line' ? (
                            <input {...common} maxLength={140} autoComplete="off" onChange={(e) => setVal(fd.key, e.target.value)} />
                          ) : (
                            <textarea {...common} rows={fd.req ? 4 : 2} maxLength={fd.key === 'main' || fd.key === 'what' ? 4000 : 2000} onChange={(e) => setVal(fd.key, e.target.value)} />
                          )}
                          {fd.help && <span id={helpId} className={styles.help}>{t(fd.help)}</span>}
                          {bad[fd.key] && <span id={errId} className={styles.fieldErr} role="alert">{t('fb.err.required')}</span>}
                        </div>
                      )
                    })}
                    {Object.entries(f.vals).some(([k, v]) => v.trim() && !FIELDS[f.kind as FeedbackKind].some((x) => x.key === k)) && <p className={styles.note} data-chfb-kept="">{t('fb.kept')}</p>}
                    <div className={styles.row}>
                      {f.marked ? (
                        <>
                          <div className={styles.mark} data-chfb-marked="">{t('fb.marked')}: {markText(t, f.marked)}</div>
                          <button type="button" className={`${styles.btn} ${styles.light}`} onClick={() => startPick(innerWidth > 600)}>{t('fb.markAgainShort')}</button>
                          <button type="button" className={`${styles.btn} ${styles.light}`} onClick={() => setF((x) => ({ ...x, marked: null }))}>{t('fb.markRemove')}</button>
                        </>
                      ) : (
                        <button type="button" className={`${styles.btn} ${styles.light}`} data-chfb-pick="" title={t('fb.markKey')} onClick={() => startPick(innerWidth > 600)}>{t('fb.mark')}</button>
                      )}
                    </div>
                    <p className={styles.note}>
                      {t('fb.techInfo')}{' '}
                      <button type="button" className={`${styles.btn} ${styles.light} ${styles.tiny}`} onClick={() => setShowTech((v) => !v)}>{t(showTech ? 'fb.hide' : 'fb.show')}</button>
                    </p>
                    {tech && <div className={styles.tech}>{Object.entries(tech).map(([k, v]) => k + ': ' + (Array.isArray(v) ? `${v.length} ${t('fb.errors')}` : String(v))).join('\n')}</div>}
                    <p className={styles.warn}>{t('fb.noSecrets')}</p>
                    {error && <p className={styles.err} role="alert">{t(error)}</p>}
                    <div className={styles.row}>
                      <button type="button" className={styles.btn} data-chfb-send="" disabled={sending} onClick={() => void submit()}>{t(sending ? 'fb.sending' : 'fb.submit')}</button>
                      <button type="button" className={`${styles.btn} ${styles.light}`} onClick={() => close()}>{t('fb.cancel')}</button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </>,
        document.body,
      )}
      {picking && <Picker t={t} formOn={formOn} setFormOn={setFormOn} done={(m) => { setPicking(false); setFormOn(false); if (m) { setF((x) => ({ ...x, marked: m })); onOpen(true) } }} />}
    </>
  )
}
