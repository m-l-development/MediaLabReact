/**
 * Venter til nettleseren er ledig (eller høyst `timeout` ms). Brukes mellom tunge bakgrunnsjobber (skisser av maler),
 * så klikk og tasting behandles før neste jobb starter i stedet for å vente bak den.
 */
export function idle(timeout = 120): Promise<void> {
  return new Promise((ok) => {
    const w = globalThis as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }
    if (typeof w.requestIdleCallback === 'function') w.requestIdleCallback(() => ok(), { timeout })
    else setTimeout(ok, 0)
  })
}
