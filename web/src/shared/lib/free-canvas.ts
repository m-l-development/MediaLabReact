/**
 * Frigjør et lerret straks (bredde/høyde 0). Safari/iOS (og Safari på Mac, der lerreter ligger i GPU-minne) gir
 * lerretsminnet tilbake først når lerretet er ryddet bort av søppeltømmingen; midlertidige lerreter som lages ved hver
 * tegning hoper seg da opp (målt i e2e-mem/thumbnail-session.spec.ts). Over grensen for samlet lerretsminne blir nye
 * lerreter dessuten tomme («hvitt bilde»). En nullstilt størrelse frigjør minnet med en gang.
 * Bare for lerreter ingen andre bruker lenger (innholdet er alt kopiert med drawImage/createPattern/toBlob).
 */
export function freeCanvas(c: HTMLCanvasElement | OffscreenCanvas | null | undefined): void {
  if (c && c.width * c.height > 1) {
    c.width = 0
    c.height = 0
  }
}
