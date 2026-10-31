/**
 * Bildet i en innliming (Ctrl/Cmd + V) som et verktøy kan ta imot som nytt bilde – eller null når innlimingen hører til
 * noe annet. Verktøyene lytter på hele vinduet; uten denne sperren erstattet et skjermbilde som ble limt inn i
 * tilbakemeldingsskjemaet, et tekstfelt eller en dialog, stille bildet brukeren arbeidet med (Isolate Subject fikk
 * «Screenshot … 704 × 1468» i stedet for originalen, med en bit av hinteksten i bildepikslene).
 */
const ELSEWHERE = [
  'input', 'textarea', 'select', '[contenteditable=""]', '[contenteditable="true"]', '[contenteditable="plaintext-only"]',
  'dialog', '[role="dialog"]', '[role="alertdialog"]',
  '[data-chfb]', // tilbakemeldingen (knappelinje, skjema, markering)
].join(', ')

export function pastedImage(e: ClipboardEvent): File | null {
  if (e.defaultPrevented) return null
  const target = e.target instanceof Element ? e.target : null
  if (target?.closest(ELSEWHERE)) return null
  const active = document.activeElement
  if (active instanceof Element && active !== document.body && active.closest(ELSEWHERE)) return null
  return [...(e.clipboardData?.items ?? [])].find((i) => i.kind === 'file' && i.type.startsWith('image/'))?.getAsFile() ?? null
}
