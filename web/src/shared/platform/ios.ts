/**
 * iPhone/iPad (Safari og alle nettlesere på iOS bruker WebKit). iPadOS 13+ oppgir seg som Mac, men har berøring.
 */
export function isIOS(nav: Pick<Navigator, 'userAgent' | 'maxTouchPoints'> | undefined = typeof navigator === 'undefined' ? undefined : navigator): boolean {
  if (!nav) return false
  return /iPhone|iPad|iPod/.test(nav.userAgent) || (/Macintosh/.test(nav.userAgent) && (nav.maxTouchPoints ?? 0) > 1)
}

/**
 * iOS zoomer siden inn når et tekstfelt med skrift under 16 px får fokus, og siden blir stående forskjøvet (små
 * tallfelt og QR-felt i editorene). `maximum-scale=1` stopper den automatiske zoomen på iOS, mens brukeren fortsatt kan
 * zoome med to fingre (iOS overstyrer grensen for brukerzoom). Settes bare på iOS: på Android ville det stengt for zoom.
 */
export function iosNoFocusZoom(doc: Document = document, nav?: Pick<Navigator, 'userAgent' | 'maxTouchPoints'>): boolean {
  if (!isIOS(nav ?? (typeof navigator === 'undefined' ? undefined : navigator))) return false
  const m = doc.querySelector('meta[name="viewport"]')
  if (!m) return false
  const c = m.getAttribute('content') ?? ''
  if (!/maximum-scale/.test(c)) m.setAttribute('content', `${c}, maximum-scale=1`)
  return true
}
