/**
 * QR-koder i Photo Design, Thumbnail Studio og Motion Design – samme løsning som i Loop Studio: samme generator
 * (qrcode-generator, selvdrevet og låst, features/loop-studio/engine/vendor.ts), samme typer (nettside, e-post, telefon,
 * SMS, tekst), samme adresseregler og samme feilrettingsnivå (M). Koden lagres som rader (1 = mørk modul), så den
 * tegnes som skarpe ruter i enhver størrelse – også i eksport og trykk – og kan skannes.
 */
import { loadQr, type QrFactory } from '../../features/loop-studio/engine/vendor'

export type QrKind = 'url' | 'email' | 'tel' | 'sms' | 'text'

/** Innstillingene for en QR-kode (lagres på laget). `rows` er den ferdige koden. */
export interface QrSpec {
  kind: QrKind
  /** Det brukeren skriver (adresse, nummer, tekst). */
  val: string
  /** Emne (e-post) eller ferdig tekst (SMS). */
  extra?: string
  /** Innholdet i koden (bygget av kind/val/extra). */
  url: string
  rows: string[] | null
  /** Farge på modulene og bakgrunnen (bakgrunn null = gjennomsiktig). */
  fg: string
  bg: string | null
}

/** Typene, med de samme tekstene som i Loop Studio: navn, felt, eksempel, inndatatype, forklaring. */
export const QR_KINDS: Record<QrKind, [string, string, string, string, string]> = {
  url: ['Nettside', 'Nettadresse', 'www.dinside.no', 'url', 'Åpner nettsiden når noen skanner koden.'],
  email: ['E-post', 'E-postadresse', 'navn@eksempel.no', 'email', 'Åpner en ny e-post til adressen. Emnet fylles inn automatisk hvis du skriver det.'],
  tel: ['Telefon', 'Telefonnummer', '+47 900 00 000', 'tel', 'Ringer nummeret når noen skanner koden.'],
  sms: ['SMS', 'Mobilnummer', '+47 900 00 000', 'tel', 'Åpner en ny SMS til nummeret, eventuelt med ferdig tekst.'],
  text: ['Tekst', 'Tekst i koden', 'F.eks. Vipps 123456', 'text', 'Viser teksten på telefonen når noen skanner koden.'],
}

/** Innholdet i koden ut fra typen (samme regler som i Loop Studio). Tomt felt = tom kode. */
export function buildQrUrl(kind: string, v0: string, x0 = ''): string {
  const v = String(v0 || '').trim()
  const x = String(x0 || '').trim()
  if (!v) return ''
  if (kind === 'email') return 'mailto:' + v.replace(/\s+/g, '') + (x ? '?subject=' + encodeURIComponent(x) : '')
  if (kind === 'tel') return 'tel:' + v.replace(/[^\d+]/g, '')
  if (kind === 'sms') return 'sms:' + v.replace(/[^\d+]/g, '') + (x ? '?body=' + encodeURIComponent(x) : '')
  if (kind === 'text') return v
  return (/^[a-z][a-z0-9+.-]*:/i.test(v) ? v : 'https://' + v).slice(0, 600)
}

let lib: Promise<QrFactory | null> | null = null
const cache = new Map<string, string[]>()

/** Radene i koden for innholdet (null = tomt eller for langt). Biblioteket lastes første gang. */
export async function qrRows(url: string): Promise<string[] | null> {
  if (!url || /^https?:\/\/$/.test(url)) return null
  const hit = cache.get(url)
  if (hit) return hit
  lib ??= loadQr().catch(() => null)
  const Q = await lib
  if (!Q) return null
  try {
    const utf8 = Q.stringToBytesFuncs?.['UTF-8']
    if (utf8) Q.stringToBytes = utf8
    const q = Q(0, 'M')
    q.addData(url)
    q.make()
    const n = q.getModuleCount()
    const rows: string[] = []
    for (let r = 0; r < n; r++) {
      let s = ''
      for (let c = 0; c < n; c++) s += q.isDark(r, c) ? '1' : '0'
      rows.push(s)
    }
    cache.set(url, rows)
    return rows
  } catch {
    return null
  }
}

/** Ny QR-kode (nettside, tom adresse til brukeren skriver den). */
export function newQr(o: Partial<QrSpec> = {}): QrSpec {
  return { kind: 'url', val: '', url: '', rows: null, fg: '#111111', bg: '#ffffff', ...o }
}

/** Oppdaterer innstillingene og lager koden på nytt når innholdet endres. */
export async function updateQr(q: QrSpec, patch: Partial<QrSpec>): Promise<QrSpec> {
  const n = { ...q, ...patch }
  n.url = buildQrUrl(n.kind, n.val, n.extra ?? '')
  n.rows = n.url === q.url && q.rows ? q.rows : await qrRows(n.url)
  return n
}

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D

/**
 * Tegner koden i (x, y, w, h): bakgrunn med stille sone (2 moduler, som i Loop) og skarpe moduler. Uten kode: en
 * plassholder (stiplet ramme) i redigering, ingenting i eksport.
 */
export function drawQr(g: Ctx, q: QrSpec | null | undefined, x: number, y: number, w: number, h: number, edit = false) {
  const rows = q?.rows
  if (!rows?.length) {
    if (!edit) return
    g.save()
    g.fillStyle = 'rgba(255,255,255,0.08)'
    g.fillRect(x, y, w, h)
    g.strokeStyle = 'rgba(255,255,255,0.5)'
    g.lineWidth = Math.max(2, Math.min(w, h) * 0.01)
    g.setLineDash([Math.min(w, h) * 0.05, Math.min(w, h) * 0.04])
    g.strokeRect(x, y, w, h)
    g.restore()
    return
  }
  const n = rows.length
  const s = Math.min(w, h)
  const cell = s / (n + 4)
  const ox = x + (w - s) / 2
  const oy = y + (h - s) / 2
  g.save()
  if (q?.bg) {
    g.fillStyle = q.bg
    g.fillRect(ox, oy, s, s)
  }
  g.fillStyle = q?.fg || '#111111'
  g.beginPath()
  for (let r = 0; r < n; r++) {
    const row = rows[r] ?? ''
    for (let c = 0; c < n; c++) {
      if (row.charCodeAt(c) !== 49) continue
      // litt overlapp, så det ikke blir hårstreker mellom modulene når koden skaleres
      g.rect(ox + (c + 2) * cell, oy + (r + 2) * cell, cell + 0.02 * cell, cell + 0.02 * cell)
    }
  }
  g.fill()
  g.restore()
}

/** Koden som PNG (Motion Design: overlegg), `px` = bredde i piksler (moduler i hele piksler, så den er skarp). */
export async function qrPng(q: QrSpec, px = 1200): Promise<Blob | null> {
  const rows = q.rows
  if (!rows?.length) return null
  const cell = Math.max(4, Math.floor(px / (rows.length + 4)))
  const size = cell * (rows.length + 4)
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const g = c.getContext('2d')
  if (!g) return null
  drawQr(g, q, 0, 0, size, size)
  return new Promise((res) => c.toBlob((b) => res(b), 'image/png'))
}

const HEX = /^#[0-9a-f]{6}$/i
/** QR-innstillinger fra lagret fil, kontrollert. */
export function cleanQr(v: unknown): QrSpec | null {
  if (!v || typeof v !== 'object') return null
  const o = v as Record<string, unknown>
  const kind = (Object.keys(QR_KINDS) as QrKind[]).includes(o.kind as QrKind) ? (o.kind as QrKind) : 'url'
  const val = typeof o.val === 'string' ? o.val.slice(0, 600) : ''
  const extra = typeof o.extra === 'string' ? o.extra.slice(0, 300) : ''
  const rr: unknown[] = Array.isArray(o.rows) ? o.rows : []
  const rows = rr.length >= 21 && rr.length <= 177 && rr.every((r) => typeof r === 'string' && /^[01]+$/.test(r) && r.length === rr.length) ? (rr as string[]) : null
  return { kind, val, ...(extra ? { extra } : {}), url: buildQrUrl(kind, val, extra), rows, fg: typeof o.fg === 'string' && HEX.test(o.fg) ? o.fg : '#111111', bg: o.bg === null ? null : typeof o.bg === 'string' && HEX.test(o.bg) ? o.bg : '#ffffff' }
}
