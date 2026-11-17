/**
 * Popuper som legges over en hel editor (f.eks. «Isoler motiv», som viser hele Isolate Subject). Mens en slik popup er
 * åpen, skal editoren under ikke reagere på hurtigtaster, innliming eller slipp: Delete skal ikke slette et lag, og
 * Ctrl+V skal ikke legge et bilde inn i editoren bak. Editorens tastatur- og innlimingsbehandlere spør derfor
 * `popupOpen()` først. `own` = elementet behandleren hører til: ligger det i popupen, gjelder den likevel.
 */
export const POPUP_ATTR = 'data-ml-popup'

export function popupOpen(own?: Element | null): boolean {
  if (typeof document === 'undefined') return false
  const p = document.querySelector(`[${POPUP_ATTR}]`)
  return !!p && !(own && p.contains(own))
}
