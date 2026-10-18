import type { FilesService } from '../../services/files'
import { localStore } from '../lib/storage'

/**
 * Menighetslogoen på forsiden, raskt og uten ny nedlasting ved hvert besøk. Før ble logoen hentet på nytt hver gang
 * forsiden ble vist (nytt serverkall for en signert adresse + nedlasting i full størrelse; den signerte adressen er ny
 * hver gang, så nettleserens hurtigbuffer traff aldri).
 * - I minnet: retur til forsiden i appen bruker samme bilde (ingen kall).
 * - I nettleseren: en nedskalert kopi (høyst 128 px, nok for 32 px på skjermer med høy tetthet) under brukerens eget
 *   prefiks «ml2:<bruker>:», som «Slett lokale data» allerede fjerner. Nøkkelen er fil-id-en: en ny logo har ny id og
 *   hentes med en gang; den gamle kopien fjernes.
 * Tilgangen er uendret: filen hentes bare via den vanlige filtilgangen, og logoen vises bare for menigheter i whoami.
 */
const MAX = 128
const LIMIT = 60_000 // tegn i data-adressen; større kopier lagres bare i minnet
const mem = new Map<string, Promise<string | null>>()
const done = new Map<string, string>()
const key = (uid: string, id: string) => `ml2:${uid}:logo.${id}`

/** Nedskalert kopi (høyst `max` px); null hvis bildet ikke kan leses. */
export async function logoThumb(b: Blob, max = MAX): Promise<string | null> {
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') return null
  const bmp = await createImageBitmap(b)
  try {
    const s = Math.min(1, max / Math.max(bmp.width, bmp.height))
    const c = document.createElement('canvas')
    c.width = Math.max(1, Math.round(bmp.width * s))
    c.height = Math.max(1, Math.round(bmp.height * s))
    const g = c.getContext('2d')
    if (!g) return null
    g.imageSmoothingQuality = 'high'
    g.drawImage(bmp, 0, 0, c.width, c.height)
    // PNG (tapsfri); blir den for stor for lagring (fotologo), WebP i høy kvalitet – begge beholder gjennomsiktighet
    const png = c.toDataURL('image/png')
    if (png.length <= LIMIT) return png
    const webp = c.toDataURL('image/webp', 0.92)
    return webp.startsWith('data:image/webp') && webp.length < png.length ? webp : png
  } finally {
    bmp.close?.()
  }
}

const asDataUrl = (b: Blob) => new Promise<string>((res, rej) => {
  const r = new FileReader()
  r.onload = () => res(String(r.result))
  r.onerror = () => rej(r.error)
  r.readAsDataURL(b)
})

function forgetOthers(uid: string, keep: string) {
  try {
    const pre = `ml2:${uid}:logo.`
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i)
      if (k && k.startsWith(pre) && k !== keep) localStore.remove(k)
    }
  } catch {
    // utilgjengelig lagring: bare minnet brukes
  }
}

/** Logoen hvis den allerede er hentet eller lagret – uten venting, så den vises i første opptegning. */
export function cachedChurchLogo(uid: string, id: string): string | null {
  const k = key(uid, id)
  const v = done.get(k) ?? localStore.get(k)
  return v?.startsWith('data:image/') ? v : null
}

/** Logoen som bildeadresse (data:), eller null uten tilgang/ved feil. */
export function churchLogo(files: FilesService, uid: string, id: string): Promise<string | null> {
  const k = key(uid, id)
  const hit = mem.get(k)
  if (hit) return hit
  const saved = localStore.get(k)
  const p = saved?.startsWith('data:image/')
    ? Promise.resolve(saved)
    : (async () => {
        const b = await files.blob(id)
        if (!b) return null
        // små filer og GIF (kan være animert) beholdes som de er; ellers den nedskalerte kopien hvis den er mindre
        const thumb = b.size > 8_000 && b.type !== 'image/gif' ? await logoThumb(b).catch(() => null) : null
        const small = thumb && thumb.length < b.size * 1.34 ? thumb : await asDataUrl(b)
        if (small.length <= LIMIT && localStore.set(k, small)) forgetOthers(uid, k)
        return small
      })()
  mem.set(k, p)
  // en feil skal ikke huskes: neste visning prøver igjen
  p.then((v) => { if (v) done.set(k, v); else mem.delete(k) }, () => mem.delete(k))
  return p
}

/** Bare for tester. */
export const resetLogoCacheForTests = () => { mem.clear(); done.clear() }
