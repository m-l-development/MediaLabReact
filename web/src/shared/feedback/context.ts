import { BRANCH, BUILD, COMMIT } from '../../infrastructure/build'
import { backend } from '../../infrastructure/config'
import { recentErrors } from './errors'
import { browserOf, deviceOf, scrubDeep, scrubText } from './feedback-core'

/** Trygg, grov teknisk kontekst (aldri innhold fra skjemafelt). */
export function technical(): Record<string, unknown> {
  const { browser, os } = browserOf(navigator.userAgent)
  let tz = ''
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '' } catch { /* ingen tidssone */ }
  const coarse = !!window.matchMedia?.('(pointer: coarse)').matches
  return scrubDeep({
    env: backend?.target ?? 'local', build: BUILD, commit: COMMIT, branch: BRANCH, browser, os, device: deviceOf(innerWidth, coarse),
    screen: screen.width + '×' + screen.height, viewport: innerWidth + '×' + innerHeight, dpr: Math.round((devicePixelRatio || 1) * 100) / 100,
    lang: document.documentElement.lang || navigator.language || '', tz, online: navigator.onLine, errors: recentErrors(),
  })
}

const TEXT_OK = (el: Element) => /^(button|a|h[1-6]|label|th|summary|legend|option)$/i.test(el.tagName) || /^(button|tab|link|menuitem|heading|checkbox|radio|switch)$/.test(el.getAttribute('role') || '')
/** Elementet som er markert: type, rolle, synlig etikett og plassering – aldri feltverdier. */
export function elementInfo(n0: Element | null) {
  if (!n0 || n0.nodeType !== 1) return null
  const n = n0.closest('button,a,[role=button],[role=tab],[role=link],[role=menuitem],[role=checkbox],[role=radio],h1,h2,h3,h4,label,summary,input,select,textarea') ?? n0
  const tag = n.tagName.toLowerCase()
  const role = n.getAttribute('role') ?? ({ a: 'link', button: 'button', input: 'textbox', select: 'combobox', textarea: 'textbox', h1: 'heading', h2: 'heading', h3: 'heading' } as Record<string, string>)[tag] ?? null
  const field = /^(input|textarea|select)$/.test(tag) || (n as HTMLElement).isContentEditable
  let label = n.getAttribute('aria-label') || n.getAttribute('title') || ''
  if (!label && !field && TEXT_OK(n)) label = ((n as HTMLElement).innerText || n.textContent || '').trim().replace(/\s+/g, ' ')
  const attrs: Record<string, string> = {}
  for (const a of Array.from(n.attributes)) if (/^data-(ch|ml|loop|md)-/.test(a.name) && Object.keys(attrs).length < 6) attrs[a.name] = (a.value || '').slice(0, 40)
  if (n.id && n.id.length <= 40 && !/[0-9a-f]{8}-/.test(n.id)) attrs.id = n.id
  if (field) {
    const f = n as HTMLInputElement
    if (f.name) attrs.name = String(f.name).slice(0, 40)
    if (f.type) attrs.type = String(f.type).slice(0, 20)
  }
  const seg = (e: Element) => {
    const cls = [...e.classList].filter((c) => c.length < 30 && !/\d{3}/.test(c)).slice(0, 2)
    return e.tagName.toLowerCase() + (cls.length ? '.' + cls.join('.') : '')
  }
  const path: string[] = []
  for (let e: Element | null = n, i = 0; e && e !== document.body && i < 5; e = e.parentElement, i++) path.unshift(seg(e))
  return scrubDeep({ tag, role, label: scrubText(label).slice(0, 80) || null, path: path.join(' > ').slice(0, 200), attrs })
}

