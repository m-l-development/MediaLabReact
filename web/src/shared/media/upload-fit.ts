/**
 * Gjør et bilde klart for opplasting til ConnectHub: høyst 30 MB og PNG/JPEG/WebP/GIF. Større bilder skaleres ned
 * (lengste side 3200 px) og lagres som JPEG. Samme regler som media-lab/src/shared/upload-fit.js.
 */
export async function fitUpload(b: Blob, name: string): Promise<File> {
  const noControl = [...String(name || 'bilde')].map((c) => (c.charCodeAt(0) < 32 ? '_' : c)).join('')
  const safe = noControl.replace(/[\\/:*?"<>|]/g, '_').slice(0, 120) || 'bilde'
  if (b.size <= 30 * 1048576 && /^image\/(png|jpeg|webp|gif)$/.test(b.type)) return new File([b], safe, { type: b.type })
  const bmp = await createImageBitmap(b)
  const k = Math.min(1, 3200 / Math.max(bmp.width, bmp.height))
  const c = document.createElement('canvas')
  c.width = Math.round(bmp.width * k)
  c.height = Math.round(bmp.height * k)
  c.getContext('2d')?.drawImage(bmp, 0, 0, c.width, c.height)
  bmp.close()
  const enc = (q: number) => new Promise<Blob | null>((r) => c.toBlob(r, 'image/jpeg', q))
  let q = 0.88
  let out = await enc(q)
  while (out && out.size > 30 * 1048576 && q > 0.5) {
    q -= 0.12
    out = await enc(q)
  }
  if (!out) throw new Error('encode')
  return new File([out], safe.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' })
}
