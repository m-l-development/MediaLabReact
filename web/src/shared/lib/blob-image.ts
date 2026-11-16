/**
 * Bilde fra en Blob uten minnevekst i Chromium.
 *
 * Målt (`e2e-mem/bisect.spec.ts`): Chromium beholder de kodede bytene (≈ filstørrelsen) for hvert bilde som lastes i et
 * `<img>` fra en ny blob:-adresse – også etter `revokeObjectURL`, GC og minnepress – til siden lastes på nytt. Med
 * `createImageBitmap` blir ingenting liggende. Her dekodes derfor bildet som `ImageBitmap` i Chromium (samme piksler:
 * EXIF-retning fra bildet, nettleserens vanlige fargekonvertering), med `naturalWidth`/`naturalHeight` som et `<img>`.
 *
 * Safari/iPhone og andre nettlesere, SVG og bilder `createImageBitmap` ikke klarer: vanlig `<img>` som før (et
 * ImageBitmap holder hele det dekodede bildet i minnet, og veksten er bare målt i Chromium).
 */

export type BitmapPic = ImageBitmap & { naturalWidth: number; naturalHeight: number }
export type Pic = HTMLImageElement | BitmapPic

/** Chromium på PC/Android (ikke iOS, der alle nettlesere er WebKit). */
export function bitmapImages(ua = typeof navigator === 'undefined' ? '' : navigator.userAgent): boolean {
  return typeof createImageBitmap === 'function' && /\bChrom(e|ium)\//.test(ua) && !/iPhone|iPad|iPod/.test(ua)
}

/** ImageBitmap med `<img>`-målene; `null` = ikke mulig (SVG, ukjent format, ikke Chromium). */
export async function blobBitmap(b: Blob): Promise<BitmapPic | null> {
  if (!bitmapImages() || /svg/i.test(b.type)) return null
  try {
    const bm = await createImageBitmap(b, { imageOrientation: 'from-image' })
    return Object.assign(bm, { naturalWidth: bm.width, naturalHeight: bm.height })
  } catch {
    return null
  }
}

/** Lukker et ImageBitmap (frigjør pikslene straks); gjør ingenting for `<img>`. */
export function closePic(p: Pic | null | undefined): void {
  if (p && typeof ImageBitmap !== 'undefined' && p instanceof ImageBitmap) p.close()
}
