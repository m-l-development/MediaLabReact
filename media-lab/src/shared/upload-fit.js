/* Gjør et bilde klart for opplasting til ConnectHub: høyst 4 MB og PNG/JPEG/WebP/GIF. Større bilder skaleres ned
   (lengste side 3200 px) og lagres som JPEG. Brukes når verktøyene deler lokale bilder i menighetens grunnoppsett. */
export async function fitUpload(b, name) {
  const safe = String(name || 'bilde').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').slice(0, 120) || 'bilde';
  if (b.size <= 4 * 1048576 && /^image\/(png|jpeg|webp|gif)$/.test(b.type)) return new File([b], safe, { type: b.type });
  const bmp = await createImageBitmap(b), k = Math.min(1, 3200 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height); if (bmp.close) bmp.close();
  let q = 0.88, out = await new Promise(r => c.toBlob(r, 'image/jpeg', q));
  while (out && out.size > 4 * 1048576 && q > 0.5) { q -= 0.12; out = await new Promise(r => c.toBlob(r, 'image/jpeg', q)); }
  return new File([out], safe.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
}
