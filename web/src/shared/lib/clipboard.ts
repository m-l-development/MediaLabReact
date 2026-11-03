/**
 * Kopierer et bilde til utklippstavlen som PNG.
 *
 * `navigator.clipboard.write` kalles straks (i samme trykk som startet kopieringen) med et løfte om bildet. Safari avviser
 * kopiering som skjer etter en `await` (brukerhandlingen regnes da som brukt opp), og bildet må ofte lages først.
 * Nettlesere som ikke tar imot et løfte i ClipboardItem, får det ferdige bildet som før.
 *
 * Svar: 'ok' (kopiert), 'empty' (ingen bilde, f.eks. for stort – kalleren har gitt beskjed) eller 'denied'.
 */
export async function copyImage(make: () => Promise<Blob | null>): Promise<'ok' | 'empty' | 'denied'> {
  let empty = false
  const png = make().then(async (b) => {
    if (!b) {
      empty = true
      throw new Error('tomt')
    }
    return b.type === 'image/png' ? b : toPng(b)
  })
  png.catch(() => undefined)
  if (typeof navigator === 'undefined' || !navigator.clipboard?.write || typeof ClipboardItem === 'undefined') return 'denied'
  let item: ClipboardItem | null = null
  try {
    item = new ClipboardItem({ 'image/png': png })
  } catch {
    // ingen støtte for løfter: vent på bildet og kopier som før
  }
  try {
    if (item) await navigator.clipboard.write([item])
    else await navigator.clipboard.write([new ClipboardItem({ 'image/png': await png })])
    return 'ok'
  } catch {
    try {
      await png
    } catch {
      if (empty) return 'empty'
    }
    return 'denied'
  }
}

async function toPng(b: Blob): Promise<Blob> {
  const bmp = await createImageBitmap(b)
  const c = document.createElement('canvas')
  c.width = bmp.width
  c.height = bmp.height
  c.getContext('2d')?.drawImage(bmp, 0, 0)
  bmp.close()
  return new Promise<Blob>((res, rej) => c.toBlob((x) => (x ? res(x) : rej(new Error('png'))), 'image/png'))
}
